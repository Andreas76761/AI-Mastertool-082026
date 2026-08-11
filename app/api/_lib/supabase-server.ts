import { getChatGPTUser, type ChatGPTUser } from "../../chatgpt-auth";

type SupabaseUser = {
  site_user_id: string;
  email: string;
  display_name: string | null;
  role: "viewer" | "editor" | "admin";
};

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Die zentrale Datenverbindung ist noch nicht eingerichtet.");
  return { url: url.replace(/\/$/, ""), key };
}

export function supabaseBaseUrl() {
  return config().url;
}

export async function supabaseRest(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Zentrale Datenbank antwortet mit HTTP ${response.status}.`);
  return response;
}

export async function supabaseStorage(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(`${url}/storage/v1/${path}`, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Dateispeicher antwortet mit HTTP ${response.status}.`);
  return response;
}

export async function requireCatalogUser(): Promise<{ chatgpt: ChatGPTUser; profile: SupabaseUser }> {
  const chatgpt = await getChatGPTUser();
  if (!chatgpt) throw new Error("AUTH_REQUIRED");
  const id = encodeURIComponent(chatgpt.userId);
  const existing = await supabaseRest(`catalog_site_users?site_user_id=eq.${id}&select=site_user_id,email,display_name,role`, { headers: { Accept: "application/json" } });
  const users = await existing.json() as SupabaseUser[];
  if (users[0]) {
    const profile = users[0];
    await supabaseRest(`catalog_site_users?site_user_id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ email: chatgpt.email, display_name: chatgpt.displayName, last_seen_at: new Date().toISOString() }) });
    return { chatgpt, profile };
  }

  // Die Site ist derzeit owner-only. Der erste bestätigte Site-Besucher wird
  // deshalb einmalig Administrator; weitere Besucher starten als Viewer.
  const adminsResponse = await supabaseRest("catalog_site_users?role=eq.admin&select=site_user_id&limit=1", { headers: { Accept: "application/json" } });
  const admins = await adminsResponse.json() as Array<{ site_user_id: string }>;
  const profile: SupabaseUser = { site_user_id: chatgpt.userId, email: chatgpt.email, display_name: chatgpt.displayName, role: admins.length ? "viewer" : "admin" };
  await supabaseRest("catalog_site_users?on_conflict=site_user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(profile) });
  return { chatgpt, profile };
}

export function isEditor(profile: SupabaseUser) {
  return profile.role === "editor" || profile.role === "admin";
}

export function isAdmin(profile: SupabaseUser) {
  return profile.role === "admin";
}
