create table public.catalog_source_links (
 provider text not null, remote_id text not null, app_key text not null references public.catalog_apps(app_key),
 source_url text, payload_hash text not null, last_synced_at timestamptz not null default now(), primary key(provider,remote_id)
);
create table public.catalog_source_states (
 provider text primary key,status text not null default 'needs_login',last_synced_at timestamptz,item_count integer not null default 0,detail text not null default ''
);
create table public.catalog_budgets (
 id uuid primary key default gen_random_uuid(),account_id uuid not null references public.catalog_accounts(id),
 month text not null check(month ~ '^\d{4}-(0[1-9]|1[0-2])$'),currency text not null check(currency ~ '^[A-Z]{3}$'),amount numeric not null check(amount>0),
 updated_at timestamptz not null default now(),unique(account_id,month,currency)
);
create table public.catalog_content_sources (
 id uuid primary key default gen_random_uuid(),app_key text not null references public.catalog_apps(app_key),kind text not null check(kind in ('code','document')),
 name text not null,sha256 text not null,content text not null,created_at timestamptz not null default now(),created_by text references public.catalog_site_users(site_user_id),unique(app_key,kind,name)
);
create table public.catalog_comparisons (
 id uuid primary key default gen_random_uuid(),left_app text not null references public.catalog_apps(app_key),right_app text not null references public.catalog_apps(app_key),
 status text not null,score integer,basis text not null,differences jsonb not null default '[]',created_at timestamptz not null default now(),unique(left_app,right_app),check(left_app<right_app)
);
do $$ declare n text;begin foreach n in array array['catalog_source_links','catalog_source_states','catalog_budgets','catalog_content_sources','catalog_comparisons'] loop
 execute format('alter table public.%I enable row level security',n);
 execute format('revoke all on public.%I from anon,authenticated',n);
 execute format('grant all on public.%I to service_role',n);
end loop;end $$;
create index catalog_content_app_idx on public.catalog_content_sources(app_key);
create index catalog_source_app_idx on public.catalog_source_links(app_key);

-- Restore into isolated temporary tables in the RPC transaction. No live records change.
create function public.catalog_validate_restore(payload jsonb) returns jsonb
language plpgsql security invoker set search_path=pg_catalog,public,pg_temp as $$
declare
 names text[]:=array['catalog_site_users','catalog_apps','catalog_chats','catalog_documents','app_screenshots','app_test_runs','catalog_accounts','catalog_cost_entries','device_statuses','catalog_integrations','deployment_events','catalog_vault_references','catalog_development','catalog_source_links','catalog_source_states','catalog_budgets','catalog_content_sources','catalog_comparisons'];
 loaded text[]:=array[]::text[];n text;count_rows bigint;counts jsonb:='{}';fk record;definition text;external_count bigint:=0;
begin
 if jsonb_typeof(payload->'tables'->'catalog_apps') is distinct from 'array' then raise exception 'catalog_apps fehlt';end if;
 foreach n in array names loop
  if payload->'tables' ? n then
   if jsonb_typeof(payload->'tables'->n) is distinct from 'array' then raise exception 'Ungültige Tabelle: %',n;end if;
   execute format('create temporary table %I (like public.%I including constraints including indexes) on commit drop','restore_'||n,n);
   execute format('insert into pg_temp.%I select * from jsonb_populate_recordset(null::public.%I,$1)','restore_'||n,n) using payload->'tables'->n;
   execute format('select count(*) from pg_temp.%I','restore_'||n) into count_rows;
   if count_rows<>jsonb_array_length(payload->'tables'->n) then raise exception 'Zeilen fehlen: %',n;end if;
   counts:=counts||jsonb_build_object(n,count_rows);loaded:=array_append(loaded,n);
  end if;
 end loop;
 for fk in select c.conname,r.relname as child,p.relname as parent,pn.nspname as parent_schema,pg_get_constraintdef(c.oid) as def,c.conkey
  from pg_constraint c join pg_class r on r.oid=c.conrelid join pg_namespace rn on rn.oid=r.relnamespace
  join pg_class p on p.oid=c.confrelid join pg_namespace pn on pn.oid=p.relnamespace
  where c.contype='f' and rn.nspname='public' and r.relname=any(loaded)
 loop
  if fk.parent_schema='public' and fk.parent=any(loaded) then
   definition:=regexp_replace(fk.def,'REFERENCES[[:space:]]+[^ (]+','REFERENCES pg_temp.'||quote_ident('restore_'||fk.parent));
   execute format('alter table pg_temp.%I add constraint %I %s','restore_'||fk.child,fk.conname,definition);
  else
   -- Never copy identities from auth.users. Report non-null external dependencies.
   select a.attname into n from pg_attribute a join pg_class r on r.oid=a.attrelid join pg_namespace ns on ns.oid=r.relnamespace
    where ns.nspname='public' and r.relname=fk.child and a.attnum=fk.conkey[1];
   execute format('select count(*) from pg_temp.%I where %I is not null','restore_'||fk.child,n) into count_rows;
   external_count:=external_count+count_rows;
  end if;
 end loop;
 return jsonb_build_object('restored',external_count=0,'tableCounts',counts,'externalDependencies',external_count,'scope','Metadaten und interne Fremdschlüssel; Binärdateien und externe Identitäten separat sichern.','checkedAt',now());
end $$;
revoke all on function public.catalog_validate_restore(jsonb) from public,anon,authenticated;
grant execute on function public.catalog_validate_restore(jsonb) to service_role;
