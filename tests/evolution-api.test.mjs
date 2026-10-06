import assert from 'node:assert/strict';
import test from 'node:test';
const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
const env={ASSETS:{fetch:async()=>new Response('',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
const headers={'content-type':'application/json','oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'test@example.invalid'};
async function call(body,auth=true){return worker.fetch(new Request('http://localhost/api/catalog/evolution',{method:'POST',headers:auth?headers:{},body:JSON.stringify(body)}),env,ctx);}
test('evolution writes preserve analyses, reject secrets, are idempotent and detect concurrent edits',async()=>{
 await call({action:'add',app_key:'app'},false);
 const original=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 process.env.SUPABASE_URL='https://supabase.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-placeholder';
 let role='admin',conflict=false,writes=0;
 let row={updated_at:'2026-10-06T08:00:00Z',metadata:{provider:'GitHub',analysis:{status:'blocked',summary:'Local inaccessible',steps:[{id:'evolution-access',status:'Geplant'}]},other:'preserve',optimizations:[]}};
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(String(input)),table=url.pathname.split('/').at(-1);
  if(table==='catalog_site_users'&&init.method!=='PATCH')return Response.json([{site_user_id:'test-owner',email:'test@example.invalid',role}]);
  if(table==='catalog_apps'){
   if(init.method==='PATCH'){writes++;assert.equal(url.searchParams.get('updated_at'),'eq.'+row.updated_at);if(conflict)return Response.json([]);row=JSON.parse(init.body);return Response.json([row]);}
   return Response.json(url.searchParams.get('app_key')==='eq.app'?[row]:[]);
  }
  return Response.json([]);
 };
 try{
  const draft={action:'add',app_key:'app',id:'44444444-4444-4444-8444-444444444444',title:'Import absichern',why:'Doppelte Imports vermeiden',acceptance:'Gleiche Datei zweimal: gleiche Anzahl',priority:'Hoch'};
  assert.equal((await call(draft,false)).status,401);role='viewer';assert.equal((await call(draft)).status,403);role='admin';
  assert.equal((await call({...draft,password:'never-store'})).status,400);assert.equal(writes,0);
  assert.equal((await call({...draft,app_key:'missing'})).status,404);
  assert.equal((await call(draft)).status,200);assert.equal((await call(draft)).status,200);
  assert.equal(row.metadata.optimizations.length,1);assert.equal(row.metadata.other,'preserve');assert.equal(row.metadata.analysis.status,'blocked');
  assert.equal((await call({action:'status',app_key:'app',id:'evolution-access',status:'Erledigt'})).status,200);
  assert.equal(row.metadata.evolution_status['evolution-access'],'Erledigt');assert.equal(row.metadata.analysis.status,'blocked');
  assert.equal((await call({action:'status',app_key:'app',id:'missing',status:'Erledigt'})).status,400);
  const before=structuredClone(row);conflict=true;
  assert.equal((await call({...draft,id:'55555555-5555-4555-8555-555555555555'})).status,409);assert.deepEqual(row,before);
 }finally{globalThis.fetch=original;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
