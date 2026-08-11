import { requireCatalogUser, supabaseRest } from "../../_lib/supabase-server";

export const dynamic = "force-dynamic";

type StoredScreen = {
  id: string;
  title: string | null;
  storage_path: string;
  captured_on: string | null;
};

export async function GET(request: Request) {
  try {
    await requireCatalogUser();
    const appKey = new URL(request.url).searchParams.get("appKey")?.trim();
    if (!appKey) return Response.json({ error: "App-Schlüssel fehlt." }, { status: 400 });
    const response = await supabaseRest(`app_screenshots?app_key=eq.${encodeURIComponent(appKey)}&select=id,title,storage_path,captured_on&order=created_at.desc`, { headers: { Accept: "application/json" } });
    const stored = await response.json() as StoredScreen[];
    const screens = stored.map((screen) => ({ id: screen.id, src: `/api/catalog/screen?id=${encodeURIComponent(screen.id)}`, title: screen.title || "Echter Screen", source: `Privat hinterlegt${screen.captured_on ? ` · ${screen.captured_on}` : ""}` }));
    return Response.json({ screens });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Screens konnten nicht geladen werden." }, { status: 503 });
  }
}
