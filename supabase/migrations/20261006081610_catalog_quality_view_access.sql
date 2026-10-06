alter view public.catalog_quality_issues set (security_invoker=true);
revoke all on public.catalog_quality_issues from anon, authenticated;
grant select on public.catalog_quality_issues to service_role;
alter function public.set_catalog_updated_at() set search_path=pg_catalog,public;
