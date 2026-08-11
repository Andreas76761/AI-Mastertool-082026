import { requireCatalogUser, supabaseRest } from "../_lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { chatgpt, profile } = await requireCatalogUser();
    const [appsResponse, screenshotsResponse, testsResponse, devicesResponse, qualityResponse] = await Promise.all([
      supabaseRest("catalog_apps?select=app_key,title,description,source,status,category,detail,builder,local_path,source_url,archive_url,created_on,last_checked_on,performance_note,traffic_light,traffic_note,frontend,middleware,backend,database_technology,connections,models,evidence,access_profile&order=title.asc", { headers: { Accept: "application/json" } }),
      supabaseRest("app_screenshots?select=app_key,id&limit=1000", { headers: { Accept: "application/json" } }),
      supabaseRest("app_test_runs?select=outcome,checked_at&order=checked_at.desc&limit=20", { headers: { Accept: "application/json" } }),
      supabaseRest("device_statuses?select=device_key,device_name,connection_status,last_seen_at&order=device_name.asc", { headers: { Accept: "application/json" } }),
      supabaseRest("catalog_quality_issues?select=issue_type&limit=1000", { headers: { Accept: "application/json" } }),
    ]);
    const [apps, screenshots, tests, devices, quality] = await Promise.all([appsResponse.json(), screenshotsResponse.json(), testsResponse.json(), devicesResponse.json(), qualityResponse.json()]);
    return Response.json({ user: { name: chatgpt.displayName, role: profile.role }, apps, summary: { screenshots: screenshots.length, recentTests: tests.length, devices: devices.length, qualityIssues: quality.length, syncedAt: new Date().toISOString() } });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Der Katalog konnte nicht geladen werden." }, { status: 503 });
  }
}
