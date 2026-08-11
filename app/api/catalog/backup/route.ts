import { isAdmin, requireCatalogUser, supabaseRest, supabaseStorage } from "../../_lib/supabase-server";

export const dynamic = "force-dynamic";

const tables = ["catalog_apps", "catalog_chats", "catalog_documents", "app_screenshots", "app_test_runs", "device_statuses", "deployment_events", "catalog_integrations", "catalog_vault_references"];

async function checksum(content: string) {
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return { bytes, checksum: Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("") };
}

export async function POST(request: Request) {
  try {
    const { chatgpt, profile } = await requireCatalogUser();
    if (!isAdmin(profile)) return Response.json({ error: "Nur Administratorinnen und Administratoren können Sicherungen verwalten." }, { status: 403 });
    const verify = new URL(request.url).searchParams.get("verify") === "1";

    if (verify) {
      const latestResponse = await supabaseRest("catalog_backups?select=id,storage_path,checksum_sha256&order=created_at.desc&limit=1", { headers: { Accept: "application/json" } });
      const [latest] = await latestResponse.json() as Array<{ id: string; storage_path: string; checksum_sha256: string }>;
      if (!latest) return Response.json({ error: "Es liegt noch keine Sicherung vor." }, { status: 404 });
      const [bucket, ...objectParts] = latest.storage_path.split("/");
      const contentResponse = await supabaseStorage(`object/${bucket}/${objectParts.join("/")}`);
      const content = await contentResponse.text();
      const { checksum: calculatedChecksum } = await checksum(content);
      const payload = JSON.parse(content) as { tables?: Record<string, unknown[]> };
      const valid = calculatedChecksum === latest.checksum_sha256 && tables.every((table) => Array.isArray(payload.tables?.[table]));
      await supabaseRest(`catalog_backups?id=eq.${encodeURIComponent(latest.id)}`, { method: "PATCH", body: JSON.stringify({ status: valid ? "verified" : "failed", verified_at: new Date().toISOString(), detail: valid ? "Struktur und Prüfsumme erfolgreich wiederhergestellt geprüft." : "Prüfung fehlgeschlagen." }) });
      return Response.json({ verified: valid });
    }

    const rows = await Promise.all(tables.map(async (table) => [table, await (await supabaseRest(`${table}?select=*`, { headers: { Accept: "application/json" } })).json()] as const));
    const tableData = Object.fromEntries(rows) as Record<string, unknown[]>;
    const createdAt = new Date().toISOString();
    const content = JSON.stringify({ schema: "catalog-backup/v1", createdAt, tables: tableData }, null, 2);
    const { bytes, checksum: checksumSha256 } = await checksum(content);
    const objectPath = `backups/catalog-${createdAt.replace(/[:.]/g, "-")}.json`;
    await supabaseStorage(`object/catalog-exports/${objectPath}`, { method: "POST", headers: { "Content-Type": "application/json", "x-upsert": "false" }, body: bytes });
    const tableCounts = Object.fromEntries(Object.entries(tableData).map(([table, value]) => [table, value.length]));
    await supabaseRest("catalog_backups", { method: "POST", body: JSON.stringify({ storage_path: `catalog-exports/${objectPath}`, checksum_sha256: checksumSha256, byte_size: bytes.byteLength, table_counts: tableCounts, created_by: chatgpt.userId, detail: "Vollständige Metadatensicherung aus der privaten Master-App." }) });
    await supabaseRest("catalog_audit_log", { method: "POST", body: JSON.stringify({ site_user_id: chatgpt.userId, action: "backup_create", entity_type: "catalog", detail: { storage_path: `catalog-exports/${objectPath}`, table_counts: tableCounts } }) });
    return Response.json({ stored: true, tableCounts, storagePath: `catalog-exports/${objectPath}` });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Sicherung fehlgeschlagen." }, { status: 503 });
  }
}
