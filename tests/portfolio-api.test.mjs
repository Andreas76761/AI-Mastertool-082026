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
