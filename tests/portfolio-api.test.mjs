import assert from 'node:assert/strict';
import test from 'node:test';
const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
const ctx={waitUntil(){},passThroughOnException(){}};
const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}};
const headers={'Content-Type':'application/json','oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'test@example.invalid'};
const accountId='11111111-1111-4111-8111-111111111111';
async function call(path,body,auth=true){return worker.fetch(new Request('http://localhost'+path,{method:body?'POST':'GET',headers:auth?headers:{},...(body?{body:JSON.stringify(body)}:{})}),env,ctx);}

test('portfolio API enforces auth, stores allowed fields and scopes accounts',async()=>{
 await call('/api/catalog/portfolio',null,false);
 const previous=globalThis.fetch;const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;let role='admin';const writes=[];
 process.env.SUPABASE_URL='https://supabase.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-placeholder';
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(String(input)),table=url.pathname.split('/').at(-1);
  if(init.method==='POST'||init.method==='PATCH')writes.push({table,data:JSON.parse(init.body)});
  if(table==='catalog_site_users'&&init.method!=='PATCH')return Response.json([{site_user_id:'test-owner',email:'test@example.invalid',role}]);
  if(table==='catalog_apps')return Response.json([{app_key:'overview',source_url:'https://app.example.invalid'}]);
  if(table==='catalog_accounts'&&(!init.method||init.method==='GET')){assert.equal(url.searchParams.get('created_by'),'eq.test-owner');return Response.json([{id:accountId,provider:'ChatGPT',label:'Privat'}]);}
  return Response.json([]);
 };
 try {
  assert.equal((await call('/api/catalog/portfolio',null,false)).status,401);
  const loaded=await call('/api/catalog/portfolio');assert.equal(loaded.status,200,await loaded.text());
  role='viewer';assert.equal((await call('/api/catalog/portfolio',{action:'account',account:{provider:'ChatGPT',label:'Privat'}})).status,403);role='admin';
  assert.equal((await call('/api/catalog/portfolio',{action:'account',account:{provider:'ChatGPT',label:'Privat',password:'must-never-store'}})).status,400);
  assert.equal((await call('/api/catalog/portfolio',{action:'account',account:{provider:'ChatGPT',label:'Privat',login_url:'https://example.invalid?token=secret'}})).status,400);
  assert.equal((await call('/api/catalog/portfolio',{action:'account',account:{provider:'ChatGPT',label:'Privat',username:'test@example.invalid',login_url:'https://chatgpt.com',app_keys:['overview']}})).status,200);
  assert.equal((await call('/api/catalog/portfolio',{action:'development',app_key:'overview',status:'Geplant',priority:'Hoch',next_step:'Kernablauf testen.'})).status,200);
  assert.equal((await call('/api/catalog/portfolio',{action:'cost',account_id:accountId,date:'2026-09-01',amount:-5,currency:'EUR',request_id:'22222222-2222-4222-8222-222222222222',description:'Erstattung'})).status,200);
  const cost=writes.find(x=>x.table==='catalog_cost_entries');assert.equal(cost.data.amount,-5);assert.equal(cost.data.account_id,accountId);
  assert.equal((await call('/api/catalog/portfolio',{action:'assign',account_id:accountId,cost_ids:['33333333-3333-4333-8333-333333333333']})).status,200);
  assert.ok(writes.find(x=>x.table==='catalog_accounts').data.created_by==='test-owner');
  assert.ok(writes.find(x=>x.table==='catalog_development').data.updated_by==='test-owner');
  assert.equal(JSON.stringify(writes).includes('must-never-store'),false);
 }finally{globalThis.fetch=previous;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});

test('performance records failure and keeps login redirects out of successful benchmarks',async()=>{
 const previous=globalThis.fetch;const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;let targetMode='redirect';const runs=[];
 process.env.SUPABASE_URL='https://supabase.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-placeholder';
 globalThis.fetch=async(input,init={})=>{const url=new URL(String(input)),table=url.pathname.split('/').at(-1);
  if(url.hostname==='app.example.invalid'){if(targetMode==='failure')throw new Error('offline');return new Response('',{status:302,headers:{Location:'https://app.example.invalid/login'}});}
  if(table==='catalog_site_users'&&init.method!=='PATCH')return Response.json([{site_user_id:'test-owner',email:'test@example.invalid',role:'admin'}]);
  if(table==='catalog_apps')return Response.json([{source_url:'https://app.example.invalid'}]);
  if(table==='app_test_runs')runs.push(JSON.parse(init.body));return Response.json([]);
 };
 try{const path='/api/catalog/test',body={appKey:'overview',url:'https://app.example.invalid'};
  assert.equal((await call(path,body,false)).status,401);
  assert.equal((await call(path,{...body,url:'https://unexpected.example.invalid'})).status,400);
  const result=await (await call(path,body)).json();assert.equal(result.outcome,'login_required');assert.equal(runs[0].http_status,302);
  targetMode='failure';const failed=await (await call(path,body)).json();assert.equal(failed.outcome,'unavailable');assert.equal(runs[1].http_status,null);
 }finally{globalThis.fetch=previous;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});

test('optimization API validates whole imports, preserves known data and scopes budgets',async()=>{
 const previous=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;let role='admin';const writes=[],links=[];
 process.env.SUPABASE_URL='https://supabase.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-placeholder';
 globalThis.fetch=async(input,init={})=>{const url=new URL(String(input)),table=url.pathname.split('/').at(-1),writing=['POST','PATCH'].includes(init.method);if(writing)writes.push({table,data:JSON.parse(init.body)});
  if(table==='catalog_site_users'&&init.method!=='PATCH')return Response.json([{site_user_id:'test-owner',email:'test@example.invalid',role}]);
  if(table==='catalog_source_links'){if(writing){const row=JSON.parse(init.body);const at=links.findIndex(x=>x.remote_id===row.remote_id);if(at<0)links.push(row);else links[at]=row;return Response.json([]);}return Response.json(links);}
  if(table==='catalog_apps'&&!writing){const key=url.searchParams.get('app_key');return Response.json(key==='eq.overview'?[{app_key:'overview',source_url:'https://known.example.invalid',description:'Bestehendes Ziel',builder:'Bestehender Ersteller',metadata:{imported_at:'2020-01-01T00:00:00Z',version:'3'}}]:[]);}
  if(table==='catalog_accounts'&&!writing){assert.equal(url.searchParams.get('created_by'),'eq.test-owner');return Response.json(url.searchParams.get('id')==='eq.'+accountId?[{id:accountId}]:[]);}
  return Response.json([]);
 };
 try{const path='/api/catalog/optimizations';assert.equal((await call(path,null,false)).status,401);role='viewer';assert.equal((await call(path,{action:'workflow'})).status,403);role='admin';
  const count=()=>writes.filter(w=>w.table==='catalog_apps').length;
  const invalid=await call(path,{action:'import',provider:'Google Gemini',apps:[{remote_id:'one',title:'OK',url:'https://gemini.google.com/app/one'},{remote_id:'two',title:'Bad',url:'http://insecure.invalid'}]});assert.equal(invalid.status,400);assert.equal(count(),0);
  const apps=[{remote_id:'one',title:'App A',url:'https://gemini.google.com/app/shared'},{remote_id:'two',title:'App B',url:'https://gemini.google.com/app/shared'}];
  const added=await (await call(path,{action:'import',provider:'Google Gemini',apps})).json();assert.equal(added.created,2);const imported=writes.filter(w=>w.table==='catalog_apps');assert.notEqual(imported[0].data.app_key,imported[1].data.app_key);
  const repeated=await (await call(path,{action:'import',provider:'Google Gemini',apps})).json();assert.equal(repeated.unchanged,2);assert.equal(count(),2);
  const known=await call(path,{action:'import',provider:'Google Gemini',apps:[{remote_id:'known',app_key:'overview',title:'Neuer Titel'}]});assert.equal(known.status,200);const patch=writes.filter(w=>w.table==='catalog_apps').at(-1).data;assert.equal(patch.description,'Bestehendes Ziel');assert.equal(patch.builder,'Bestehender Ersteller');assert.equal(patch.source_url,'https://known.example.invalid');assert.equal(patch.metadata.imported_at,'2020-01-01T00:00:00Z');
  assert.equal((await call(path,{action:'content',app_key:'overview',kind:'code',name:'app.ts',content:'export const x=1;'})).status,200);assert.match(writes.find(w=>w.table==='catalog_content_sources').data.sha256,/^[a-f0-9]{64}$/);
  assert.equal((await call(path,{action:'budget',account_id:'99999999-9999-4999-8999-999999999999',month:'2026-10',currency:'EUR',amount:100})).status,400);
  assert.equal((await call(path,{action:'budget',account_id:accountId,month:'2026-10',currency:'EUR',amount:100})).status,200);
  assert.equal((await call(path,{action:'workflow',app_key:'overview',scenario:'Suchen',steps:'Suche ohne Ergebnis',outcome:'failed',duration_ms:1234})).status,200);const run=writes.find(w=>w.table==='app_test_runs').data;assert.equal(run.outcome,'unavailable');assert.equal(run.metadata.kind,'workflow');assert.equal(run.duration_ms,1234);
 }finally{globalThis.fetch=previous;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
