-- One active review across this private catalog. All calls use the authenticated server route.
create or replace function public.catalog_review_action(p_key text,p_action text,p_step text default '',p_status text default '',p_proof text default '',p_fields jsonb default '{}'::jsonb,p_actor text default '') returns jsonb
language plpgsql security invoker set search_path=pg_catalog,public as $$
declare row_app public.catalog_apps%rowtype; m jsonb; r jsonb; checks jsonb; active_key text; ids text[]:=array['access','data','architecture','function','performance','release']; idx int; i int; allowed text[]; k text; stamp timestamptz:=clock_timestamp(); h jsonb;
begin
 if not exists(select 1 from public.catalog_site_users where site_user_id=p_actor and role in ('admin','editor')) then return jsonb_build_object('error','Bearbeitungsrechte erforderlich.','status',403);end if;
 perform pg_advisory_xact_lock(621907,1);
 select app_key into active_key from public.catalog_apps where metadata->'review'->>'active'='true' limit 1;
 select * into row_app from public.catalog_apps where app_key=p_key for update;
 if not found then return jsonb_build_object('error','App nicht gefunden.','status',404);end if;
 m:=coalesce(row_app.metadata,'{}'::jsonb);r:=coalesce(m->'review','{}'::jsonb);checks:=coalesce(r->'checks','{}'::jsonb);
 if p_action='start' then
  if active_key is not null and active_key<>p_key then return jsonb_build_object('error','Zuerst die laufende App abschließen oder pausieren.','status',409);end if;
  foreach k in array ids loop
   if checks->k->>'status'='passed' and (nullif(checks->k->>'checked_at','') is null or (checks->k->>'checked_at')::timestamptz<stamp-interval '30 days') then checks:=jsonb_set(checks,array[k,'status'],'"open"'::jsonb);end if;
  end loop;
  r:=r||jsonb_build_object('active',true,'started_at',stamp,'finished_at',null,'checks',checks);
 elsif p_action in ('record','pause','finish') then
  if active_key is distinct from p_key then return jsonb_build_object('error','Diese App ist nicht die laufende Einzelprüfung.','status',409);end if;
  if p_action='record' then
   idx:=array_position(ids,p_step);
   if idx is null or p_status not in ('open','passed','failed') or length(p_proof)>4000 or (p_status<>'open' and length(trim(p_proof))<10) then return jsonb_build_object('error','Prüfschritt und nachvollziehbaren Nachweis angeben.','status',400);end if;
   for i in 1..idx-1 loop
    if checks->ids[i]->>'status' is distinct from 'passed' or coalesce((checks->ids[i]->>'checked_at')::timestamptz,stamp-interval '31 days')<stamp-interval '30 days' then return jsonb_build_object('error','Vorherigen Prüfschritt zuerst mit aktuellem Nachweis bestehen.','status',409);end if;
   end loop;
   allowed:=case p_step when 'access' then array['source_url','access_profile'] when 'data' then array['description','detail'] when 'architecture' then array['frontend','middleware','backend','database_technology'] else array[]::text[] end;
   if jsonb_typeof(p_fields)<>'object' then return jsonb_build_object('error','Ungültige Datenfelder.','status',400);end if;
   for k in select jsonb_object_keys(p_fields) loop
    if not k=any(allowed) or jsonb_typeof(p_fields->k)<>'string' or length(p_fields->>k)>3000 or length(trim(p_fields->>k))=0 then return jsonb_build_object('error','Nur belegte Felder dieses Prüfschritts ergänzen.','status',400);end if;
   end loop;
   checks:=jsonb_set(checks,array[p_step],jsonb_build_object('status',p_status,'proof',trim(p_proof),'checked_at',stamp),true);
   -- Any earlier correction requires renewed confirmation of the following steps.
   for i in idx+1..6 loop if checks?ids[i] then checks:=jsonb_set(checks,array[ids[i],'status'],'"open"'::jsonb);end if;end loop;
   h:=coalesce(r->'history','[]'::jsonb)||jsonb_build_array(jsonb_build_object('step',p_step,'status',p_status,'proof',trim(p_proof),'checked_at',stamp,'fields',p_fields));
   select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into h from jsonb_array_elements(h) with ordinality as e(value,ord) where ord>jsonb_array_length(h)-100;
   r:=r||jsonb_build_object('checks',checks,'history',h,'finished_at',null);
  elsif p_action='finish' then
   foreach k in array ids loop if checks->k->>'status' is distinct from 'passed' or length(trim(coalesce(checks->k->>'proof','')))<10 or coalesce((checks->k->>'checked_at')::timestamptz,stamp-interval '31 days')<stamp-interval '30 days' then return jsonb_build_object('error','Alle sechs Schritte brauchen aktuelle bestandene Nachweise.','status',409);end if;end loop;
   r:=r||jsonb_build_object('active',false,'finished_at',stamp);
  else r:=r||jsonb_build_object('active',false);end if;
 else return jsonb_build_object('error','Ungültige Aktion.','status',400);end if;
 m:=jsonb_set(m,'{review}',r,true);
 update public.catalog_apps set metadata=m,updated_at=stamp,
  source_url=coalesce(p_fields->>'source_url',source_url),access_profile=coalesce(p_fields->>'access_profile',access_profile),description=coalesce(p_fields->>'description',description),detail=coalesce(p_fields->>'detail',detail),frontend=coalesce(p_fields->>'frontend',frontend),middleware=coalesce(p_fields->>'middleware',middleware),backend=coalesce(p_fields->>'backend',backend),database_technology=coalesce(p_fields->>'database_technology',database_technology)
 where app_key=p_key;
 return jsonb_build_object('saved',true,'review',r,'active_key',case when r->>'active'='true' then p_key else null end);
end $$;
revoke all on function public.catalog_review_action(text,text,text,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.catalog_review_action(text,text,text,text,text,jsonb,text) to service_role;
