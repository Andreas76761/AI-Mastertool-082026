import {supabaseRest,supabaseRows} from './supabase-server';
import {contentHash} from '../../optimization-logic';
export const importProviders=['ChatGPT','Claude','Perplexity','Lovable','Vercel','Google Gemini','Google AI Studio','Microsoft Copilot','GitHub','Google Drive'] as const;
type ImportApp={remote_id:string;title:string;url?:string;description?:string;category?:string;builder?:string;version?:string;updated_at?:string;app_key?:string;};
export async function syncApps(provider:string,items:ImportApp[],actor:string|null){
 if(!importProviders.includes(provider as typeof importProviders[number])||!items.length||items.length>500)throw new Error('Bitte Anbieter und 1 bis 500 Apps wählen.');
 const seen=new Set<string>();
 for(const item of items){
  if(!item||typeof item.remote_id!=='string'||!item.remote_id||item.remote_id.length>300||typeof item.title!=='string'||!item.title.trim()||item.title.length>300||seen.has(item.remote_id))throw new Error('Bitte eindeutige Quell-IDs und App-Namen verwenden.');seen.add(item.remote_id);
  for(const field of ['description','category','builder','version','updated_at','app_key'] as const)if(item[field]!==undefined&&(typeof item[field]!=='string'||item[field]!.length>(field==='description'?10000:300)))throw new Error('Bitte gültige Importfelder verwenden.');
  if(item.url!==undefined){if(typeof item.url!=='string')throw new Error('Bitte gültige App-Links verwenden.');try{const url=new URL(item.url);if(url.protocol!=='https:'||url.username||url.password)throw new Error();}catch{throw new Error('Bitte HTTPS-App-Links ohne Zugangsdaten verwenden.');}}
  if(item.app_key!==undefined&&!/^[\w-]{1,160}$/.test(item.app_key))throw new Error('Bitte gültige Katalog-IDs verwenden.');
 }
 const existing=await supabaseRows<{remote_id:string;app_key:string;payload_hash:string}>(`catalog_source_links?provider=eq.${encodeURIComponent(provider)}&select=remote_id,app_key,payload_hash&order=remote_id`);
 let created=0,changed=0,unchanged=0;
 for(const item of items){
  const hash=await contentHash(JSON.stringify(item));
  const old=existing.find(x=>x.remote_id===item.remote_id);const key=old?.app_key??item.app_key??('import-'+(await contentHash(provider+':'+item.remote_id)).slice(0,24));
  if(!/^[\w-]{1,160}$/.test(key))throw new Error('Bitte gültige Katalog-IDs verwenden.');
  if(old?.payload_hash===hash){unchanged++;continue;}
  const known=await (await supabaseRest(`catalog_apps?app_key=eq.${key}&select=app_key,metadata,source_url,description,builder`)).json() as {app_key:string;metadata:Record<string,unknown>;source_url:string|null;description:string;builder:string}[];
  const patch={title:item.title.trim(),source_url:item.url??known[0]?.source_url??null,description:item.description??known[0]?.description??'',builder:item.builder??known[0]?.builder??provider,last_checked_on:new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin'}).format(new Date()),metadata:{...known[0]?.metadata,provider,remote_id:item.remote_id,version:item.version??known[0]?.metadata?.version??null,source_updated_at:item.updated_at??known[0]?.metadata?.source_updated_at??null,imported_at:known[0]?.metadata?.imported_at??new Date().toISOString()}};
  if(known[0]){await supabaseRest(`catalog_apps?app_key=eq.${key}`,{method:'PATCH',body:JSON.stringify(patch)});changed++;}else{await supabaseRest('catalog_apps',{method:'POST',body:JSON.stringify({...patch,app_key:key,source:'Cloud',status:'Prüfen',category:item.category??'KI',detail:'Aus '+provider+' importiert. Technische Einzelprüfung offen.',access_profile:'Konto oder Freigabe der Quellplattform erforderlich.'})});created++;}
  await supabaseRest('catalog_source_links?on_conflict=provider,remote_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({provider,remote_id:item.remote_id,app_key:key,payload_hash:hash,source_url:patch.source_url,last_synced_at:new Date().toISOString()})});
  await supabaseRest('catalog_audit_log',{method:'POST',body:JSON.stringify({site_user_id:actor,action:known[0]?'app_updated':'app_imported',entity_type:'catalog_app',entity_key:key,detail:{provider,title:item.title}})});
 }
 await supabaseRest('catalog_source_states?on_conflict=provider',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({provider,status:'imported',last_synced_at:new Date().toISOString(),item_count:items.length,detail:`${created} neu, ${changed} geändert, ${unchanged} unverändert. Kein Entfernen fehlender Einträge.`})});
 return {created,changed,unchanged};
}
