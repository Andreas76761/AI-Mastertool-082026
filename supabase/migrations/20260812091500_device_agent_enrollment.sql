-- Einmalige, gerätebezogene Aktivierung lokaler Status-Agenten.
-- Zugangswerte werden ausschließlich als Hash gespeichert.

create table if not exists public.catalog_agent_credentials (
  agent_key text primary key references public.device_agents(agent_key) on delete cascade,
  token_hash text not null unique,
  created_by text references public.catalog_site_users(site_user_id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.catalog_agent_enrollments (
  id uuid primary key default gen_random_uuid(),
  agent_key text not null unique references public.device_agents(agent_key) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_by text references public.catalog_site_users(site_user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_catalog_agent_enrollments_active
  on public.catalog_agent_enrollments(expires_at)
  where redeemed_at is null;

alter table public.catalog_agent_credentials enable row level security;
alter table public.catalog_agent_enrollments enable row level security;
