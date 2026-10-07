import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source=await readFile(new URL('../app/merge-catalog.ts',import.meta.url),'utf8');
const compiled=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
const {mergeCatalog}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));

test('central data does not hide new inventory or existing local apps',()=>{
 const old=[{id:'local',title:'Local app'},{id:'hosted',title:'DocApp',url:'https://docapp.example/'}];
 const remote=[{id:'hosted',title:'DocApp',url:'https://docapp.example',description:'Database description'}];
 const snapshot=[{id:'hosted',projectId:'site-doc',title:'DocApp',url:'https://docapp.example',version:'17',isNew:true},{id:'ticket',title:'TicketBrain',isNew:true}];
 const rows=mergeCatalog(old,remote,snapshot);
 assert.equal(rows.length,3);
 assert.equal(rows.find(r=>r.title==='DocApp').id,'hosted');
 assert.equal(rows.find(r=>r.title==='DocApp').version,'17');
 assert.equal(rows.find(r=>r.title==='DocApp').description,'Database description');
 assert.ok(rows.find(r=>r.id==='local'));
 assert.ok(rows.find(r=>r.id==='ticket').isNew);
});

test('stable project identity avoids duplicates after renaming',()=>{
 const rows=mergeCatalog([{id:'db-app',projectId:'site-1',title:'Old title'}],[{id:'site-1',projectId:'site-1',title:'New title'}]);
 assert.equal(rows.length,1); assert.equal(rows[0].title,'New title'); assert.equal(rows[0].id,'db-app');
});

test('catalog renders latest apps and new labels from the built Worker',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('http://localhost/',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal(response.status,200);
 const html=await response.text();
 for(const title of ['HaushaltKompass','DocApp 2.2','Handbookly','TicketBrain','oneSCM Handbook Studio']) assert.ok(html.includes(title),title);
 assert.match(html,/class="new-badge"/);
 assert.equal((html.match(/data-app-id=/g)||[]).length,132);
 assert.match(html,/Seitennavigation/);
 assert.match(html,/Inhaltsvergleich/);
 assert.match(html,/Access/);
 assert.ok(html.includes('Aftersales 4 Parts Logistics'));
 assert.ok(html.includes('Wartungsvertrag Vergleich V2')); 
 assert.match(html,/App-Abgleich:.*06\.10\.2026/);
 assert.doesNotMatch(html,/Building your site|Your site is taking shape/);
});


test('shared overview URLs and titles never collapse separate app identities',()=>{
 const rows=mergeCatalog([{id:'one',title:'App',url:'https://www.perplexity.ai/computer/artifacts'},{id:'two',title:'App',url:'https://www.perplexity.ai/computer/artifacts'}]);
 assert.equal(rows.length,2);
});
