import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const module={exports:{}};runInNewContext(ts.transpileModule(readFileSync(new URL('../app/app-access.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,Date});
const {validateLocations,localFolder}=module.exports;
test('three computer paths retain separate identities and derive file folders including UNC',()=>{
 const rows=validateLocations([{device:'pc1',device_name:'Laptop',path:'C:\\Apps\\Start.html'},{device:'pc2',device_name:'Desktop',path:'D:\\Projekte\\App'},{device:'pc3',device_name:'Linux',path:'/home/user/app'}]);assert.equal(rows.length,3);assert.equal(rows[0].folder,'C:\\Apps');assert.equal(rows[1].path,'D:\\Projekte\\App');assert.equal(localFolder('\\\\server\\share\\app.html'),'\\\\server\\share');assert.ok(rows.every(r=>r.source.includes('nicht geprüft')));
});
test('cloud URLs, ambiguous paths, duplicate devices and verification injections are rejected',()=>{
 for(const path of ['https://github.com/owner/repo','Google Drive / App','relative/path','C:\\App\nother'])assert.throws(()=>validateLocations([{device:'pc1',device_name:'PC',path}]));
 assert.throws(()=>validateLocations([{device:'pc1',device_name:'PC',path:'C:\\App',verified:true}]));assert.throws(()=>validateLocations([{device:'pc1',device_name:'PC',path:'C:\\App'},{device:'pc1',device_name:'PC',path:'D:\\App'}]));
});
const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
const env={ASSETS:{fetch:async()=>new Response('',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}},headers={'Content-Type':'application/json','oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'test@example.invalid'};
const body={app_key:'own',locations:[{device:'unassigned',device_name:'Zuordnung offen',path:'C:\\Apps\\Start.html'}]};
function call(body,auth=true){return worker.fetch(new Request('http://localhost/api/catalog/access',{method:'POST',headers:auth?headers:{},body:JSON.stringify(body)}),env,ctx)}
test('location API enforces identity, permissions and optimistic concurrency while preserving access proof',async()=>{
 await call(body,false);
 const original=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_URL='https://supabase.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-placeholder';let role='admin',conflict=false,write;
 globalThis.fetch=async(input,init={})=>{const url=new URL(String(input)),table=url.pathname.split('/').at(-1);if(table==='catalog_site_users'&&init.method!=='PATCH')return Response.json([{site_user_id:'test-owner',email:'test@example.invalid',role}]);if(table==='catalog_apps'){if(init.method==='PATCH'){write=JSON.parse(init.body);assert.equal(url.searchParams.get('updated_at'),'eq.2026-10-06T10:00:00Z');return Response.json(conflict?[]:[write]);}return Response.json([{metadata:{access_check:{status:'signed_in'},review:{active:true},evolution_status:{step:'Erledigt'}},updated_at:'2026-10-06T10:00:00Z'}]);}return Response.json([])};
 try{assert.equal((await call(body,false)).status,401);role='viewer';const denied=await call(body);assert.equal(denied.status,403,await denied.text());role='admin';assert.equal((await call({...body,password:'never'})).status,400);assert.equal((await call({...body,locations:[{device:'pc1',device_name:'PC',path:'https://bad.invalid'}]})).status,400);assert.equal((await call(body)).status,200);assert.equal(write.metadata.access_check.status,'signed_in');assert.equal(write.metadata.review.active,true);assert.equal(write.metadata.evolution_status.step,'Erledigt');assert.equal(write.metadata.local_locations[0].folder,'C:\\Apps');assert.equal(JSON.stringify(write).includes('never'),false);conflict=true;assert.equal((await call(body)).status,409);
 }finally{globalThis.fetch=original;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
