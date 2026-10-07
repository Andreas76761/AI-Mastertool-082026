import { requireCatalogUser, supabaseRest } from "../../_lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * This endpoint deliberately returns references and verification state only.
 * Passwords, API keys, recovery codes and payment methods never enter the
 * application database or the browser response.
 */
export async function GET() {
  try {
    await requireCatalogUser();
    const [referencesResponse, integrationsResponse, costsResponse] = await Promise.all([
      supabaseRest("catalog_vault_references?select=id,app_key,provider,vault_label,item_label,access_scope,last_verified_at&order=provider.asc,item_label.asc", { headers: { Accept: "application/json" } }),
      supabaseRest("catalog_integrations?select=id,integration_key,provider,display_name,status,writes_status,auth_reference,last_checked_at,detail&order=provider.asc,display_name.asc", { headers: { Accept: "application/json" } }),
      supabaseRest("catalog_cost_entries?select=id,app_key,provider,transaction_date,amount,currency,description,source&order=transaction_date.desc", { headers: { Accept: "application/json" } }),
    ]);
    return Response.json({
      references: await referencesResponse.json(),
      integrations: await integrationsResponse.json(),
      costs: await costsResponse.json(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Zugänge konnten nicht geladen werden." }, { status: 503 });
  }
}
