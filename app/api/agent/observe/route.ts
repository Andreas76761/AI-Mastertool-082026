import { supabaseRest } from "../../_lib/supabase-server";

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { agentKey?: string; agentName?: string; deviceKey?: string; operatingSystem?: string; appKey?: string; localPort?: number; outcome?: string; httpStatus?: number; durationMs?: number; detail?: string; screenshotPath?: string };
    if (!body.agentKey || !body.agentName || !body.deviceKey || !body.appKey) return Response.json({ error: "agentKey, agentName, deviceKey und appKey werden benötigt." }, { status: 400 });
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return Response.json({ error: "Der Status-Agent wurde noch nicht freigeschaltet." }, { status: 401 });

    const credentialResponse = await supabaseRest(`catalog_agent_credentials?agent_key=eq.${encodeURIComponent(body.agentKey)}&token_hash=eq.${await sha256(token)}&revoked_at=is.null&select=agent_key&limit=1`, { headers: { Accept: "application/json" } });
    const credentials = await credentialResponse.json() as Array<{ agent_key: string }>;
    if (!credentials[0]) return Response.json({ error: "Nicht autorisierter Status-Agent." }, { status: 401 });

    const now = new Date().toISOString();
    await Promise.all([
      supabaseRest("device_agents?on_conflict=agent_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ agent_key: body.agentKey, device_key: body.deviceKey, agent_name: body.agentName, operating_system: body.operatingSystem ?? null, state: "online", last_seen_at: now, updated_at: now }) }),
      supabaseRest(`device_statuses?device_key=eq.${encodeURIComponent(body.deviceKey)}`, { method: "PATCH", body: JSON.stringify({ connection_status: "online", last_seen_at: now, detail: "Status-Agent meldet sich." }) }),
      supabaseRest(`catalog_agent_credentials?agent_key=eq.${encodeURIComponent(body.agentKey)}`, { method: "PATCH", body: JSON.stringify({ last_used_at: now }) }),
      supabaseRest("agent_observations", { method: "POST", body: JSON.stringify({ agent_key: body.agentKey, device_key: body.deviceKey, app_key: body.appKey, local_port: body.localPort ?? null, test_outcome: body.outcome ?? "unknown", http_status: body.httpStatus ?? null, duration_ms: body.durationMs ?? null, screenshot_path: body.screenshotPath ?? null, detail: body.detail ?? null }) }),
    ]);
    return Response.json({ accepted: true, receivedAt: now });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Agentenmeldung konnte nicht gespeichert werden." }, { status: 503 });
  }
}
