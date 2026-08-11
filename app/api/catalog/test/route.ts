import { isEditor, requireCatalogUser, supabaseRest } from "../../_lib/supabase-server";

type TestOutcome = "available" | "login_required" | "unavailable";

function isPublicHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname);
  } catch { return false; }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireCatalogUser();
    if (!isEditor(profile)) return Response.json({ error: "Nur Editorinnen und Editoren können Tests auslösen." }, { status: 403 });
    const body = await request.json() as { appKey?: string; url?: string };
    if (!body.appKey || !body.url || !isPublicHttps(body.url)) return Response.json({ error: "App und öffentliche HTTPS-Adresse werden benötigt." }, { status: 400 });
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let status = 0;
    let outcome: TestOutcome = "unavailable";
    try {
      const response = await fetch(body.url, { method: "HEAD", redirect: "manual", signal: controller.signal });
      status = response.status;
      outcome = status >= 200 && status < 400 ? "available" : status === 401 || status === 403 ? "login_required" : "unavailable";
    } finally { clearTimeout(timeout); }
    const durationMs = Date.now() - startedAt;
    await supabaseRest("app_test_runs", { method: "POST", body: JSON.stringify({ app_key: body.appKey, outcome, http_status: status || null, duration_ms: durationMs, detail: "Manuell über den Master-Katalog ausgelöst." }) });
    return Response.json({ outcome, status, durationMs });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Test fehlgeschlagen." }, { status: 503 });
  }
}
