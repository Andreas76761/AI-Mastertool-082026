import { requireCatalogUser, supabaseBaseUrl, supabaseRest, supabaseStorage } from "../../_lib/supabase-server";

export const dynamic = "force-dynamic";

type StoredScreen = {
  id: string;
  title: string | null;
  storage_path: string;
  captured_on: string | null;
};

function encodeObjectPath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

export async function GET(request: Request) {
  try {
    await requireCatalogUser();
    const appKey = new URL(request.url).searchParams.get("appKey")?.trim();
    if (!appKey) return Response.json({ error: "App-Schlüssel fehlt." }, { status: 400 });
    const response = await supabaseRest(`app_screenshots?app_key=eq.${encodeURIComponent(appKey)}&select=id,title,storage_path,captured_on&order=created_at.desc`, { headers: { Accept: "application/json" } });
    const stored = await response.json() as StoredScreen[];
    const screens = await Promise.all(stored.map(async (screen) => {
      const [bucket, ...objectParts] = screen.storage_path.split("/");
      if (!bucket || !objectParts.length) return null;
      const signedResponse = await supabaseStorage(`object/sign/${encodeObjectPath(bucket)}/${encodeObjectPath(objectParts.join("/"))}`, {
        method: "POST",
        body: JSON.stringify({ expiresIn: 3600 }),
      });
      const signed = await signedResponse.json() as { signedURL?: string };
      if (!signed.signedURL) return null;
      const src = signed.signedURL.startsWith("http") ? signed.signedURL : `${supabaseBaseUrl()}/storage/v1${signed.signedURL}`;
      return { id: screen.id, src, title: screen.title || "Echter Screen", source: `Privat hinterlegt${screen.captured_on ? ` · ${screen.captured_on}` : ""}` };
    }));
    return Response.json({ screens: screens.filter(Boolean) });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Screens konnten nicht geladen werden." }, { status: 503 });
  }
}
