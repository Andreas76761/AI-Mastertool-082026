import { isEditor, requireCatalogUser, supabaseRest } from '../../_lib/supabase-server';

export const dynamic = 'force-dynamic';
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const appKey = /^[a-zA-Z0-9_-]{1,160}$/;
function text(value: unknown, limit=300) { if (typeof value !== 'string' || value.length > limit) throw new Error('Bitte gültige, kurze Angaben verwenden.'); return value.trim(); }
function errorResponse(error: unknown) { const message=error instanceof Error?error.message:'Aktion fehlgeschlagen.'; return Response.json({error:message},{status:message==='AUTH_REQUIRED'?401:message.startsWith('Bitte')?400:503}); }
async function accountFor(id: string, user: string) { if(!uuid.test(id)) throw new Error('Bitte ein gültiges Konto wählen.'); const response=await supabaseRest(`catalog_accounts?id=eq.${id}&created_by=eq.${encodeURIComponent(user)}&select=id,provider,label`); const rows=await response.json() as {id:string;provider:string;label:string}[]; if(!rows[0]) throw new Error('Bitte ein eigenes Konto wählen.'); return rows[0]; }
async function validateApps(keys: string[]) { if(keys.length>200||keys.some(k=>!appKey.test(k))) throw new Error('Bitte gültige Apps wählen.'); if(!keys.length)return; const response=await supabaseRest(`catalog_apps?app_key=in.(${keys.join(',')})&select=app_key`); const rows=await response.json() as unknown[];if(rows.length!==new Set(keys).size)throw new Error('Bitte nur Apps aus dem Katalog wählen.'); }

export async function GET() {
 try { const {chatgpt,profile}=await requireCatalogUser();const [accounts,costs,tests,development,vaults]=await Promise.all([
  supabaseRest(`catalog_accounts?created_by=eq.${encodeURIComponent(chatgpt.userId)}&select=id,provider,label,username,login_url,plan,billing_cycle,vault_reference,app_keys&order=provider,label`),
  supabaseRest('catalog_cost_entries?select=id,app_key,account_id,provider,transaction_date,amount,currency,description,source&order=transaction_date.desc&limit=10000'),
  supabaseRest('app_test_runs?select=app_key,outcome,http_status,duration_ms,checked_at,detail&order=checked_at.desc&limit=10000'),
  supabaseRest('catalog_development?select=app_key,status,priority,next_step,updated_at'),
  supabaseRest('catalog_vault_references?select=app_key,provider,vault_label,item_label,item_url,access_scope')]);
  const [a,c,t,d,v]=await Promise.all([accounts.json(),costs.json(),tests.json(),development.json(),vaults.json()]);
  return Response.json({accounts:a,costs:c,tests:t,development:d,vaults:v,canEdit:isEditor(profile)});
 }catch(error){return errorResponse(error);}
}

export async function POST(request: Request) {
 try {const {chatgpt,profile}=await requireCatalogUser();if(!isEditor(profile))return Response.json({error:'Bearbeitungsrechte erforderlich.'},{status:403});
  const body=await request.json() as Record<string,unknown>;const action=body.action;
  if(action==='account') {
   const raw=body.account as Record<string,unknown>;const allowed=['id','provider','label','username','login_url','plan','billing_cycle','vault_reference','app_keys'];
   if(!raw||Object.keys(raw).some(k=>!allowed.includes(k)))throw new Error('Bitte nur Kontoname, Benutzerkennung und sichere Verweise erfassen.');
   const provider=text(raw.provider,120),label=text(raw.label,160);if(!provider||!label)throw new Error('Bitte Anbieter und Kontoname angeben.');
   const login_url=text(raw.login_url??'',1000);if(login_url){let url:URL;try{url=new URL(login_url);}catch{throw new Error('Bitte eine gültige HTTPS-Login-Adresse eingeben.');}if(url.protocol!=='https:'||url.username||url.password||[...url.searchParams.keys()].some(k=>/password|token|secret|key|code/i.test(k)))throw new Error('Bitte eine HTTPS-Adresse ohne Zugangsschlüssel verwenden.');}
   const app_keys=Array.isArray(raw.app_keys)?raw.app_keys as string[]:[];await validateApps(app_keys);
   const data={provider,label,username:text(raw.username??''),login_url,plan:text(raw.plan??'',160),billing_cycle:text(raw.billing_cycle??'Monatlich',60),vault_reference:text(raw.vault_reference??''),app_keys,updated_at:new Date().toISOString()};
   if(raw.id){const id=text(raw.id);await accountFor(id,chatgpt.userId);await supabaseRest(`catalog_accounts?id=eq.${id}&created_by=eq.${encodeURIComponent(chatgpt.userId)}`,{method:'PATCH',body:JSON.stringify(data)});}
   else await supabaseRest('catalog_accounts',{method:'POST',body:JSON.stringify({...data,created_by:chatgpt.userId})});
  }else if(action==='cost'){
   const account=await accountFor(text(body.account_id),chatgpt.userId);const date=text(body.date,10),currency=text(body.currency,3).toUpperCase(),amount=Number(body.amount),requestId=text(body.request_id,36);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||!Number.isFinite(amount)||Math.abs(amount)>1e8||!/^[A-Z]{3}$/.test(currency)||!uuid.test(requestId))throw new Error('Bitte Datum, Betrag und Währung prüfen.');
   const key=body.app_key?text(body.app_key,160):null;if(key)await validateApps([key]);
   await supabaseRest('catalog_cost_entries?on_conflict=import_key',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify({account_id:account.id,provider:account.provider,transaction_date:date,amount,currency,app_key:key,description:text(body.description??'',1000),source:'Manuelle Kontenabrechnung',import_key:'manual:'+requestId})});
  }else if(action==='assign'){
   const account=await accountFor(text(body.account_id),chatgpt.userId);const ids=Array.isArray(body.cost_ids)?body.cost_ids as string[]:[];
   if(!ids.length||ids.length>500||ids.some(x=>!uuid.test(x)))throw new Error('Bitte gültige Zahlungszeilen auswählen.');
   await supabaseRest(`catalog_cost_entries?id=in.(${ids.join(',')})`,{method:'PATCH',body:JSON.stringify({account_id:account.id})});
  }else if(action==='development'){
   const key=text(body.app_key,160);await validateApps([key]);const status=text(body.status),priority=text(body.priority);
   if(!['Offen','Geplant','In Arbeit','Erledigt','Pausiert'].includes(status)||!['Hoch','Mittel','Niedrig'].includes(priority))throw new Error('Bitte gültigen Status und Priorität wählen.');
   await supabaseRest('catalog_development?on_conflict=app_key',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:JSON.stringify({app_key:key,status,priority,next_step:text(body.next_step??'',2000),updated_by:chatgpt.userId,updated_at:new Date().toISOString()})});
  }else throw new Error('Bitte eine gültige Aktion wählen.');
  return Response.json({saved:true});
 }catch(error){return errorResponse(error);}
}
