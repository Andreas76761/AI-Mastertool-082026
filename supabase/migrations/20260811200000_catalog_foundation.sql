-- Mein App-Katalog: versionierte Supabase-Grundlage
-- Diese Migration ergänzt die im Dashboard angelegte Inventur um Betrieb,
-- App-Zugriff, Integrationen, Status-Agenten und Qualitätskontrollen.

create extension if not exists pgcrypto;

create table if not exists public.catalog_site_users (
  site_user_id text primary key,
  email text not null,
  display_name text,
  role text not null default 'viewer' check (role in ('viewer', 'editor', 'admin')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.catalog_audit_log (
  id uuid primary key default gen_random_uuid(),
  site_user_id text,
  action text not null,
  entity_type text not null,
  entity_key text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_integrations (
  id uuid primary key default gen_random_uuid(),
  integration_key text not null unique,
  provider text not null,
  display_name text not null,
  repository_url text,
  project_url text,
  status text not null default 'planned',
  writes_status boolean not null default false,
  auth_reference text,
  last_checked_at timestamptz,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deployment_events (
  id uuid primary key default gen_random_uuid(),
  integration_key text references public.catalog_integrations(integration_key) on delete set null,
  app_key text references public.catalog_apps(app_key) on delete set null,
  provider text not null,
  deployment_url text,
  environment text,
  state text not null,
  commit_sha text,
  occurred_at timestamptz not null default now(),
  duration_ms integer,
  detail text,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.device_agents (
  agent_key text primary key,
  device_key text references public.device_statuses(device_key) on delete set null,
  agent_name text not null,
  operating_system text,
  agent_version text,
  state text not null default 'planned',
  last_seen_at timestamptz,
  auth_reference text,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_observations (
  id uuid primary key default gen_random_uuid(),
  agent_key text references public.device_agents(agent_key) on delete set null,
  device_key text references public.device_statuses(device_key) on delete set null,
  app_key text references public.catalog_apps(app_key) on delete set null,
  observed_at timestamptz not null default now(),
  local_port integer,
  test_outcome text,
  http_status integer,
  duration_ms integer,
  screenshot_path text,
  detail text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.app_screenshots add column if not exists mime_type text;
alter table public.app_screenshots add column if not exists file_size_bytes bigint;
alter table public.app_screenshots add column if not exists sha256 text;
alter table public.catalog_documents add column if not exists mime_type text;
alter table public.catalog_documents add column if not exists file_size_bytes bigint;
alter table public.catalog_documents add column if not exists sha256 text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-screenshots', 'catalog-screenshots', false, 10485760, array['image/png','image/jpeg','image/webp']),
  ('catalog-documents', 'catalog-documents', false, 52428800, array['application/pdf','application/json','text/plain']),
  ('catalog-exports', 'catalog-exports', false, 52428800, array['application/pdf','application/json','text/csv'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

create or replace view public.catalog_quality_issues as
select 'missing_url'::text as issue_type, app_key, title, 'App hat keine direkte URL.'::text as detail
from public.catalog_apps where source_url is null
union all
select 'missing_architecture', app_key, title, 'Technische Architektur ist noch offen.'
from public.catalog_apps where frontend is null or frontend ilike 'noch zu%'
union all
select 'unchecked', app_key, title, 'Letzter Test fehlt.'
from public.catalog_apps where last_checked_on is null;

create index if not exists idx_catalog_site_users_email on public.catalog_site_users(email);
create index if not exists idx_deployment_events_app_key on public.deployment_events(app_key, occurred_at desc);
create index if not exists idx_agent_observations_app_key on public.agent_observations(app_key, observed_at desc);

-- Die Tabellen bleiben über RLS privat. Der Worker der privaten Sites-App
-- greift mit einem ausschließlich serverseitig gespeicherten Schlüssel zu.
alter table public.catalog_site_users enable row level security;
alter table public.catalog_audit_log enable row level security;
alter table public.catalog_integrations enable row level security;
alter table public.deployment_events enable row level security;
alter table public.device_agents enable row level security;
alter table public.agent_observations enable row level security;
