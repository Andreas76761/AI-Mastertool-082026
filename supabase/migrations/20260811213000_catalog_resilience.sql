-- Betriebssicherheit: Sicherungsprotokolle, Vault-Referenzen und optionale
-- Verknuepfung zwischen dem privaten Site-Zugang und Supabase Auth.

create table if not exists public.catalog_backups (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  checksum_sha256 text not null,
  byte_size bigint not null,
  table_counts jsonb not null default '{}'::jsonb,
  status text not null default 'created' check (status in ('created', 'verified', 'failed')),
  verified_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  detail text
);

create table if not exists public.catalog_vault_references (
  id uuid primary key default gen_random_uuid(),
  app_key text references public.catalog_apps(app_key) on delete cascade,
  provider text not null,
  vault_label text not null,
  item_label text not null,
  item_url text,
  access_scope text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app_key, provider, vault_label, item_label)
);

create table if not exists public.catalog_auth_identities (
  site_user_id text primary key references public.catalog_site_users(site_user_id) on delete cascade,
  auth_user_id uuid unique,
  auth_provider text not null default 'chatgpt-site',
  enrollment_state text not null default 'site-only' check (enrollment_state in ('site-only', 'invited', 'active', 'disabled')),
  enrolled_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.catalog_backups enable row level security;
alter table public.catalog_vault_references enable row level security;
alter table public.catalog_auth_identities enable row level security;

create index if not exists idx_catalog_backups_created_at on public.catalog_backups(created_at desc);
create index if not exists idx_catalog_vault_references_app_key on public.catalog_vault_references(app_key);
