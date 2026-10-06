import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const module={exports:{}};
runInNewContext(ts.transpileModule(readFileSync(new URL('../app/app-review.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,Date});
const {reviewPlan,reviewLight,nextReviewStep}=module.exports,now=Date.parse('2026-10-06T09:00:00Z');
test('review traffic light requires every evidenced current step and never treats an editor as a functional test',()=>{
 assert.equal(reviewLight({analysis:{status:'partial',summary:'Editor opened',evidence:[]}},now).color,'yellow');
 assert.equal(reviewLight({analysis:{status:'live',summary:'Dashboard opened',evidence:[]}},now).color,'yellow');
 assert.equal(reviewLight({analysis:{status:'blocked',summary:'404 NOT_FOUND',evidence:[]}},now).color,'red');
 const review={active:true,checks:Object.fromEntries(reviewPlan.map(s=>[s.id,{status:'passed',proof:'Real source and executed test results',checked_at:new Date(now).toISOString()}]))};
 assert.equal(reviewLight({review},now).color,'green');review.checks.performance.proof='';assert.equal(reviewLight({review},now).color,'yellow');review.checks.performance.proof='Measured result';
 review.checks.function.status='failed';assert.equal(reviewLight({review},now).color,'red');review.checks.function.status='passed';review.checks.access.checked_at=new Date(now-31*864e5).toISOString();
 assert.equal(reviewLight({review},now).color,'yellow');assert.equal(nextReviewStep(review,now).id,'access');
 review.checks.access.checked_at='invalid';assert.equal(reviewLight({review},now).color,'yellow');review.checks.access.checked_at=new Date(now+864e5).toISOString();assert.equal(reviewLight({review},now).color,'yellow');
});
const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
const env={ASSETS:{fetch:async()=>new Response('',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}},headers={'content-type':'application/json','oai-authenticated-user-id':'test-owner','oai-authenticated-user-email':'test@example.invalid'};
async function call(body,auth=true){return worker.fetch(new Request('http://localhost/api/catalog/review',{method:body?'POST':'GET',headers:auth?headers:{},...(body?{body:JSON.stringify(body)}:{})}),env,ctx);}
test('review API enforces permissions, field scope, nonsecret links and uses the authenticated actor',async()=>{
 await call(null,false);
 const original=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SERVICE_ROLE_KEY;process.env.SUPABASE_URL='https://supabase.example.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-placeholder';let role='admin',calls=0,fail=false;
 globalThis.fetch=async(input,init={})=>{const url=new URL(String(input)),table=url.pathname.split('/').at(-1);
  if(table==='catalog_site_users'&&init.method!=='PATCH')return Response.json([{site_user_id:'test-owner',email:'test@example.invalid',role}]);
  if(table==='catalog_apps')return Response.json([{app_key:'first',metadata:{review:{active:true,checks:{}}}}]);
  if(table==='catalog_review_action'){calls++;const body=JSON.parse(init.body);assert.equal(body.p_actor,'test-owner');return Response.json(fail?{status:409,error:'Zuerst die laufende App abschließen oder pausieren.'}:{saved:true});}return Response.json([]);};
 try{assert.equal((await call(null,false)).status,401);assert.equal((await call({action:'start',app_key:'app'},false)).status,401);role='viewer';assert.equal((await call({action:'start',app_key:'app'})).status,403);assert.equal((await(await call()).json()).canEdit,false);role='admin';
  const record={action:'record',app_key:'app',step:'access',status:'passed',proof:'Opened public app; exact source and result recorded.'};
  for(const body of [{...record,password:'secret'},{...record,proof:'ok'},{...record,fields:{backend:'invented'}},{...record,fields:{source_url:'https://example.invalid?token=abc'}},{...record,fields:{source_url:'javascript:alert(1)'}},{...record,actor:'someone-else'},{action:'start',app_key:'app',fields:{description:'bypass'}}])assert.equal((await call(body)).status,400);
  assert.equal(calls,0);assert.equal((await call({...record,fields:{source_url:'https://example.invalid/app',access_profile:'Public application'}})).status,200);fail=true;assert.equal((await call({action:'start',app_key:'second'})).status,409);
  const result=await(await call()).json();assert.equal(result.active_key,'first');assert.equal(result.reviews.first.active,true);
 }finally{globalThis.fetch=original;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=oldKey;}
});
