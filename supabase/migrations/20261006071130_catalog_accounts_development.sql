create table public.catalog_accounts (
 id uuid primary key default gen_random_uuid(), provider text not null, label text not null,
 username text not null default '', login_url text not null default '', plan text not null default '',
 billing_cycle text not null default 'Monatlich', vault_reference text not null default '',
 app_keys text[] not null default '{}', created_by text not null references public.catalog_site_users(site_user_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.catalog_accounts enable row level security;
revoke all on public.catalog_accounts from anon, authenticated;
grant all on public.catalog_accounts to service_role;
alter table public.catalog_cost_entries add column account_id uuid references public.catalog_accounts(id);
create index catalog_cost_account_date_idx on public.catalog_cost_entries(account_id, transaction_date);
create table public.catalog_development (
 app_key text primary key references public.catalog_apps(app_key), status text not null default 'Offen' check(status in ('Offen','Geplant','In Arbeit','Erledigt','Pausiert')),
 priority text not null default 'Mittel' check(priority in ('Hoch','Mittel','Niedrig')), next_step text not null default '',
 updated_by text not null references public.catalog_site_users(site_user_id), updated_at timestamptz not null default now()
);
alter table public.catalog_development enable row level security;
revoke all on public.catalog_development from anon, authenticated;
grant all on public.catalog_development to service_role;
