import { supabaseRest } from "../../_lib/supabase-server";

export async function POST(request: Request) {
  const token = process.env.CATALOG_INTEGRATION_TOKEN;
  if (!token) return Response.json({ error: "Integrationszugang ist noch nicht freigeschaltet." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${token}`) return Response.json({ error: "Nicht autorisierte Integration." }, { status: 401 });
  try {
    const body = await request.json() as { provider?: string; integrationKey?: string; appKey?: string; state?: string; deploymentUrl?: string; environment?: string; commitSha?: string; detail?: string; metadata?: Record<string, unknown> };
    if (!body.provider || !body.integrationKey || !body.state) return Response.json({ error: "provider, integrationKey und state werden benötigt." }, { status: 400 });
    await Promise.all([
      supabaseRest("deployment_events", { method: "POST", body: JSON.stringify({ integration_key: body.integrationKey, app_key: body.appKey ?? null, provider: body.provider, deployment_url: body.deploymentUrl ?? null, environment: body.environment ?? null, state: body.state, commit_sha: body.commitSha ?? null, detail: body.detail ?? null, metadata: body.metadata ?? {} }) }),
      supabaseRest(`catalog_integrations?integration_key=eq.${encodeURIComponent(body.integrationKey)}`, { method: "PATCH", body: JSON.stringify({ status: body.state === "error" ? "error" : "connected", writes_status: true, last_checked_at: new Date().toISOString(), detail: body.detail ?? null }) }),
    ]);
    return Response.json({ accepted: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Integration konnte nicht gespeichert werden." }, { status: 503 });
  }
}
