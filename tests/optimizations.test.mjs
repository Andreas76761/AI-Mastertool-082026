import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {renderToStaticMarkup} from 'react-dom/server';
import React from 'react';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;runInNewContext(code,{module,exports:module.exports,require:(name)=>name.startsWith('.')?load(new URL(name+(name.includes('provider-logo')?'.tsx':'.ts'),file)):require(name),console,crypto,TextEncoder,URL,Intl});cache.set(file,module.exports);return module.exports;}
const logic=load(new URL('../app/optimization-logic.ts',import.meta.url));
const providers=load(new URL('../app/source-providers.ts',import.meta.url));

test('monthly budgets isolate account and currency, including refunds',()=>{
 const budget={account_id:'own',month:'2026-10',currency:'EUR',amount:100};
 const cost=(account_id,currency,transaction_date,amount)=>({account_id,currency,transaction_date,amount});
 const result=logic.budgetUsage(budget,[cost('own','EUR','2026-10-01',110),cost('own','EUR','2026-10-02',-15),cost('other','EUR','2026-10-03',200),cost('own','USD','2026-10-03',200),cost('own','EUR','2026-09-30',200)]);
 assert.equal(result.actual,95);assert.equal(result.remaining,5);assert.equal(result.exceeded,false);
 assert.equal(logic.budgetUsage(budget,[cost('own','EUR','2026-10-03',101)]).exceeded,true);
});
test('content comparison reports evidence scope and numerical differences',async()=>{
 const left='Konto Budget Oktober 100 Euro',right='Konto Budget Oktober 200 Euro';
 const source=async(content)=>({kind:'document',sha256:await logic.contentHash(content),content});
 const a=await source(left),b=await source(right);
 assert.equal(await logic.contentHash('\uFEFFZeile\r\nCafe\u0301'),await logic.contentHash('Zeile\nCafé'));
 assert.equal(logic.compareContents([],[]).status,'missing');
 const same=logic.compareContents([a],[a]);assert.equal(same.status,'identical');assert.match(same.basis,/vollständige App-Identität/);
 const different=logic.compareContents([a],[b]);assert.notEqual(different.status,'identical');assert.ok(different.differences.includes('Nur links: 100'));assert.ok(different.differences.includes('Nur rechts: 200'));
});
test('source logos distinguish creation platform from hosting and are local',()=>{
 const app={id:'app',source:'Cloud',provider:'ChatGPT',url:'https://my-app.vercel.app'};
 assert.equal(providers.providerFor(app),'ChatGPT');assert.equal(providers.hostingFor(app),'Vercel');
 assert.equal(providers.providerFor({id:'gemini',source:'Cloud',url:'https://gemini.google.com/app/app-id'}),'Google Gemini');
 assert.equal(providers.providerFor({id:'copilot',source:'Cloud',url:'https://copilotstudio.microsoft.com/environments/abc'}),'Microsoft Copilot');
 for(const asset of Object.values(providers.providerAssets))assert.ok(existsSync(new URL('../public/logos/'+asset.file,import.meta.url)),asset.file);
});
test('every app detail has four left registers and explicit architecture fields',()=>{
 const {default:Registers,appRegisters}=load(new URL('../app/app-registers.tsx',import.meta.url));
 assert.equal(appRegisters.length,4);
 const details={frontend:'React',middleware:'HTTP API',backend:'Worker',database:'Postgres',connections:'GitHub',models:'Keine',builder:'ChatGPT',access:'Eigener Zugang',evidence:'Quellcode'};
 const html=renderToStaticMarkup(React.createElement(Registers,{app:{id:'app',title:'Demo',source:'Cloud',description:'Ziel',detail:'Funktion',category:'KI',status:'Prüfen'},details,screens:[],usage:'Test',openAccounts(){},openOptimizations(){}}));
 assert.equal((html.match(/role="tab"/g)||[]).length,4);assert.match(html,/aria-orientation="vertical"/);
 for(const name of ['Ziel &amp; Verwendung','Architektur &amp; Zugänge','Optimierungen','Sonstiges','Frontend','Middleware','Backend','Zugangsdaten'])assert.ok(html.includes(name),name);
 assert.match(html,/noch kein konkretes Konto zugeordnet/);assert.doesNotMatch(html,/type="password"/);
});

const analytics=load(new URL('../app/catalog-analytics.ts',import.meta.url));
test('browser and workflow measurements never masquerade as HTTP benchmarks',()=>{
 const app={id:'own',status:'Aktiv',source:'Cloud'},now=new Date().toISOString();
 const browser={app_key:'own',outcome:'available',duration_ms:2000,checked_at:now,metadata:{kind:'browser',lcp_ms:2000,dom_ms:1000}};
 assert.equal(analytics.performanceFor(app,[browser]).score,100);
 assert.match(analytics.performanceFor(app,[browser]).basis,/LCP/);
 const workflow={app_key:'own',outcome:'unavailable',duration_ms:2000,checked_at:now,metadata:{kind:'workflow'}};
 assert.equal(analytics.performanceFor(app,[workflow]).score,null);
 assert.equal(analytics.performanceFor(app,[workflow]).label,'Bedienablauf fehlgeschlagen');
 assert.equal(analytics.developmentFor(app,{frontend:'React',middleware:'HTTP',backend:'Worker',database:'Postgres',connections:'GitHub'},[workflow]).priority,'Hoch');
});
