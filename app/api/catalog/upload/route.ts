import { isEditor, requireCatalogUser, supabaseRest, supabaseStorage } from "../../_lib/supabase-server";

const buckets = {
  screenshot: "catalog-screenshots",
  document: "catalog-documents",
  export: "catalog-exports",
} as const;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(-120) || "datei";
}

async function sha256(buffer: ArrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const { chatgpt, profile } = await requireCatalogUser();
    if (!isEditor(profile)) return Response.json({ error: "Nur Editorinnen und Editoren können Dateien ablegen." }, { status: 403 });
    const form = await request.formData();
    const file = form.get("file");
    const appKey = String(form.get("appKey") ?? "").trim();
    const kind = String(form.get("kind") ?? "document") as keyof typeof buckets;
    const title = String(form.get("title") ?? "").trim();
    if (!(file instanceof File) || !appKey || !(kind in buckets)) return Response.json({ error: "Datei, App und Dateityp werden benötigt." }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return Response.json({ error: "Die Datei ist größer als 50 MB." }, { status: 413 });
    const bucket = buckets[kind];
    const bytes = await file.arrayBuffer();
    const objectPath = `${appKey}/${Date.now()}-${safeFileName(file.name)}`;
    await supabaseStorage(`object/${bucket}/${objectPath}`, { method: "POST", headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }, body: bytes });
    const metadata = { app_key: appKey, title: title || file.name, storage_path: `${bucket}/${objectPath}`, mime_type: file.type || null, file_size_bytes: file.size, sha256: await sha256(bytes) };
    if (kind === "screenshot") {
      await supabaseRest("app_screenshots", { method: "POST", body: JSON.stringify({ ...metadata, is_real_capture: true, captured_on: new Date().toLocaleDateString("de-DE"), metadata: { uploaded_by: chatgpt.userId } }) });
    } else {
      await supabaseRest("catalog_documents", { method: "POST", body: JSON.stringify({ ...metadata, document_type: kind, source: "Master-App Upload", data_classification: "internal", metadata: { uploaded_by: chatgpt.userId } }) });
    }
    await supabaseRest("catalog_audit_log", { method: "POST", body: JSON.stringify({ site_user_id: chatgpt.userId, action: "upload", entity_type: kind, entity_key: appKey, detail: { storage_path: `${bucket}/${objectPath}`, file_name: file.name } }) });
    return Response.json({ stored: true, storagePath: `${bucket}/${objectPath}` });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Upload fehlgeschlagen." }, { status: 503 });
  }
}
