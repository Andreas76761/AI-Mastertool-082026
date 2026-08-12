import { isAdmin, requireCatalogUser, supabaseRest } from "../../_lib/supabase-server";

export const dynamic = "force-dynamic";

type EnrollmentBody = {
  action?: "create" | "redeem";
  agentKey?: string;
  deviceKey?: string;
  agentName?: string;
  appKey?: string;
  port?: number;
  enrollmentCode?: string;
};

function randomSecret(bytes = 24) {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values).map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

function validKey(value: string | undefined) {
  return Boolean(value && /^[a-z0-9][a-z0-9_-]{1,79}$/i.test(value));
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as EnrollmentBody;
    if (!validKey(body.agentKey)) return Response.json({ error: "Eine gültige Agentenkennung wird benötigt." }, { status: 400 });

    if (body.action === "redeem") {
      if (!body.enrollmentCode) return Response.json({ error: "Einmal-Code fehlt." }, { status: 400 });
      const codeHash = await sha256(body.enrollmentCode.trim());
      const response = await supabaseRest(`catalog_agent_enrollments?agent_key=eq.${encodeURIComponent(body.agentKey)}&code_hash=eq.${codeHash}&redeemed_at=is.null&select=id,expires_at&limit=1`, { headers: { Accept: "application/json" } });
      const [enrollment] = await response.json() as Array<{ id: string; expires_at: string }>;
      if (!enrollment || new Date(enrollment.expires_at).getTime() < Date.now()) return Response.json({ error: "Der Einmal-Code ist ungültig oder abgelaufen. Bitte im Katalog einen neuen erstellen." }, { status: 401 });

      const agentToken = randomSecret(32);
      const now = new Date().toISOString();
      await Promise.all([
        supabaseRest("catalog_agent_credentials?on_conflict=agent_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ agent_key: body.agentKey, token_hash: await sha256(agentToken), created_at: now, revoked_at: null }) }),
        supabaseRest(`catalog_agent_enrollments?id=eq.${encodeURIComponent(enrollment.id)}`, { method: "PATCH", body: JSON.stringify({ redeemed_at: now }) }),
        supabaseRest(`device_agents?agent_key=eq.${encodeURIComponent(body.agentKey)}`, { method: "PATCH", body: JSON.stringify({ state: "enrolled", auth_reference: "Gerätebezogene lokale Umgebungsvariable", updated_at: now }) }),
      ]);
      return Response.json({ token: agentToken, enrolled: true });
    }

    const { chatgpt, profile } = await requireCatalogUser();
    if (!isAdmin(profile)) return Response.json({ error: "Nur Administratorinnen und Administratoren können einen Rechner freischalten." }, { status: 403 });
    if (!validKey(body.deviceKey) || !validKey(body.appKey) || !Number.isInteger(body.port) || Number(body.port) < 1 || Number(body.port) > 65535) return Response.json({ error: "Gerät, App und lokaler Port müssen vollständig angegeben werden." }, { status: 400 });

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const enrollmentCode = `AKT-${randomSecret(8).toUpperCase()}`;
    await supabaseRest("device_statuses?on_conflict=device_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ device_key: body.deviceKey, device_name: body.agentName?.trim() || body.deviceKey, source: "Status-Agent", connection_status: "pending", detail: "Einmal-Aktivierung erstellt.", updated_at: now }) });
    await supabaseRest("device_agents?on_conflict=agent_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ agent_key: body.agentKey, device_key: body.deviceKey, agent_name: body.agentName?.trim() || body.deviceKey, state: "planned", detail: `Vorgemerkt für ${body.appKey} auf Port ${body.port}.`, updated_at: now }) });
    await Promise.all([
      supabaseRest("catalog_agent_enrollments?on_conflict=agent_key", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ agent_key: body.agentKey, code_hash: await sha256(enrollmentCode), expires_at: expiresAt, redeemed_at: null, created_by: chatgpt.userId }) }),
      supabaseRest("catalog_audit_log", { method: "POST", body: JSON.stringify({ site_user_id: chatgpt.userId, action: "agent_enrollment_created", entity_type: "device_agent", entity_key: body.agentKey, detail: { deviceKey: body.deviceKey, appKey: body.appKey, port: body.port, expiresAt } }) }),
    ]);
    const siteBypassToken = process.env.CATALOG_SITE_BYPASS_TOKEN;
    if (!siteBypassToken) return Response.json({ error: "Der technische Zugang für den Status-Agenten ist noch nicht eingerichtet." }, { status: 503 });
    return Response.json({ enrollmentCode, expiresAt, agentKey: body.agentKey, siteBypassToken });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Rechner konnte nicht freigeschaltet werden." }, { status: 503 });
  }
}
