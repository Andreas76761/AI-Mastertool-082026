import { requireCatalogUser, supabaseRest, supabaseStorage } from "../../_lib/supabase-server";

export const dynamic = "force-dynamic";

type StoredScreen = { storage_path: string; mime_type: string | null };

function encodeObjectPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function GET(request: Request) {
  try {
    await requireCatalogUser();
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return Response.json({ error: "Screen-ID fehlt." }, { status: 400 });
    const response = await supabaseRest(`app_screenshots?id=eq.${encodeURIComponent(id)}&select=storage_path,mime_type&limit=1`, { headers: { Accept: "application/json" } });
    const [screen] = await response.json() as StoredScreen[];
    if (!screen?.storage_path) return Response.json({ error: "Screen nicht gefunden." }, { status: 404 });
    const [bucket, ...objectParts] = screen.storage_path.split("/");
    if (!bucket || !objectParts.length) return Response.json({ error: "Ungültiger Speicherpfad." }, { status: 500 });
    const object = await supabaseStorage(`object/${encodeObjectPath(bucket)}/${encodeObjectPath(objectParts.join("/"))}`);
    return new Response(await object.arrayBuffer(), { headers: { "Content-Type": screen.mime_type || "image/png", "Cache-Control": "private, max-age=300" } });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Screen konnte nicht geladen werden." }, { status: 503 });
  }
}
