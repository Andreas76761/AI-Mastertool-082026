import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
const source=await readFile(new URL('../app/catalog-analytics.ts',import.meta.url),'utf8');
const compiled=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
const {summarizeAccounts,technicalScore,performanceFor,similarities,developmentFor}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const app={id:'one',title:'App',description:'',category:'Analyse',detail:'',source:'Cloud',status:'Aktiv'};
const details={builder:'Sites',frontend:'React',middleware:'API',backend:'Worker',database:'Noch nicht verifiziert',connections:'Noch zu prüfen',models:'Nicht verifiziert',evidence:'package.json'};

test('account bills separate currencies, months, identities and refunds',()=>{
 const accounts=[{id:'a',label:'Privat',provider:'ChatGPT'},{id:'b',label:'Firma',provider:'ChatGPT'}];
 const costs=[{id:'1',account_id:'a',provider:'ChatGPT',amount:'20',currency:'EUR',transaction_date:'2026-09-01'},{id:'2',account_id:'a',provider:'ChatGPT',amount:'-5',currency:'EUR',transaction_date:'2026-09-02'},{id:'3',account_id:'a',provider:'ChatGPT',amount:'10',currency:'USD',transaction_date:'2026-09-03'},{id:'4',account_id:'b',provider:'ChatGPT',amount:'30',currency:'EUR',transaction_date:'2026-09-04'},{id:'5',account_id:null,provider:'Claude',amount:'40',currency:'EUR',transaction_date:'2026-09-05'},{id:'6',account_id:'a',provider:'ChatGPT',amount:'100',currency:'EUR',transaction_date:'2026-10-01'}];
 const bill=summarizeAccounts(costs,accounts,'2026-09','a');assert.equal(bill.length,2);assert.equal(bill.find(b=>b.currency==='EUR').amount,15);assert.equal(bill.find(b=>b.currency==='USD').amount,10);
 const unassigned=summarizeAccounts(costs,accounts,'2026-09','unassigned');assert.equal(unassigned.length,1);assert.equal(unassigned[0].amount,40);
 assert.equal(summarizeAccounts(costs,accounts,'2026-09').length,4);
});
test('technical coverage has an explicit scale and leaves unknowns open',()=>{assert.equal(technicalScore(details).score,60);assert.deepEqual(technicalScore(details).missing,['database','connections']);assert.equal(technicalScore({...details,database:'Keine Datenbank',connections:'Keine externen Verbindungen'}).score,100);});
test('performance never invents a benchmark from historical notes or login pages',()=>{
 assert.equal(performanceFor({...app,performance:'HTTP 200 im August'},[]).score,null);
 const now=Date.parse('2026-10-06T07:00:00Z');const run={app_key:'one',outcome:'available',http_status:200,duration_ms:250,checked_at:'2026-10-06T06:00:00Z'};
 assert.equal(performanceFor(app,[run],now).score,100);
 assert.equal(performanceFor(app,[{...run,outcome:'login_required',http_status:403}],now).score,null);
 assert.equal(performanceFor(app,[{...run,checked_at:'2026-08-01'}],now).score,null);
});
test('known errors get priority and theme comparisons remain separate apps',()=>{assert.equal(developmentFor({...app,trafficLight:'red'},details,[]).priority,'Hoch');const groups=similarities([{...app,id:'a',title:'Wartungsvertrag Vergleich'},{...app,id:'b',title:'Wartungsvertrag Vergleich V2'},{...app,id:'c',title:'HaushaltKompass'}]);assert.equal(groups.length,1);assert.equal(groups[0].apps.length,2);});
