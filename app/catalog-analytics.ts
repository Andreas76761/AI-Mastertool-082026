import type {AccessCheck,LocalLocation} from './app-access';
import type {AppReview} from './app-review';
import type {AppAnalysis,EvolutionStep} from './app-evolution';
export type Technical = {builder:string;frontend:string;middleware:string;backend:string;database:string;connections:string;models:string;evidence:string;access?:string};
export type AppRecord = {accessCheck?:AccessCheck;localLocations?:LocalLocation[];id:string;title:string;description:string;category:string;detail:string;source:string;status:string;url?:string;overlap?:string;performance?:string;trafficLight?:string;checkedAt?:string;technical?:Technical;projectId?:string;provider?:string;hosting?:string;analysis?:AppAnalysis;review?:AppReview;optimizations?:EvolutionStep[];evolutionStatus?:Record<string,EvolutionStep['status']>};
export type TestRun={app_key:string;outcome:string;http_status:number|null;duration_ms:number|null;checked_at:string;detail:string;metadata?:{kind?:string;lcp_ms?:number;dom_ms?:number;load_ms?:number;steps?:string}};
export type Account={id:string;provider:string;label:string;username:string;login_url:string;plan:string;billing_cycle:string;vault_reference:string;app_keys:string[];login_method?:string;access_status?:string;checked_at?:string;check_basis?:string};
export type Expense={id:string;app_key:string|null;account_id?:string|null;provider:string;transaction_date:string;amount:number|string;currency:string;description:string|null;source:string};
export type Development={app_key:string;status:string;priority:string;next_step:string;updated_at?:string};
const unverified=/noch|nicht.*(verifiziert|erfasst|identifiziert|belegt)|zu pr[üu]fen|aus repository|genau pr[üu]fen|geplant|vorgesehen/i;
export function technicalScore(details:Technical){const fields=['frontend','middleware','backend','database','connections'] as const;const known=fields.filter(k=>details[k].trim()&&!unverified.test(details[k]));return {score:known.length*20,known:known.length,missing:fields.filter(k=>!known.includes(k))};}
export function performanceFor(app:AppRecord,tests:TestRun[],now=Date.now()){
 const own=tests.filter(t=>t.app_key===app.id);
 const rank=(t:TestRun)=>Number.isFinite(Date.parse(t.checked_at))?Date.parse(t.checked_at):-Infinity;
 const latest=own.reduce<TestRun|undefined>((best,t)=>!best||rank(t)>rank(best)?t:best,undefined);
 if(latest){const time=Date.parse(latest.checked_at),invalid=!Number.isFinite(time)||time>now,stale=!invalid&&now-time>30*864e5,current=!invalid&&!stale;
 const positive=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&n>0;
 const dateLabel=invalid?'Messnachweis ungültig':stale?'Messung veraltet':null;
 const outcomeLabel=latest.outcome==='login_required'?'Anmeldung / Weiterleitung':latest.outcome==='available'?null:'Nicht erreichbar';
 const duration=positive(latest.duration_ms)?latest.duration_ms:null;
 if(latest.metadata?.kind==='workflow')return {score:null,label:dateLabel??(latest.outcome==='available'?'Bedienablauf bestanden':latest.outcome==='login_required'?'Anmeldung / Weiterleitung':'Bedienablauf fehlgeschlagen'),basis:`${latest.detail} · ${duration??'–'} ms · ${latest.checked_at.slice(0,10)} · manuell dokumentiert`,measured:true};
 if(latest.metadata?.kind==='browser'){const ms=positive(latest.metadata.lcp_ms)?latest.metadata.lcp_ms:null,dom=positive(latest.metadata.dom_ms)?latest.metadata.dom_ms:null;return {score:current&&latest.outcome==='available'&&ms!==null?(ms<=2500?100:ms<=4000?60:40):null,label:dateLabel??outcomeLabel??(ms===null?'Browser-Seitenaufbau · LCP offen':'Browser-Seitenaufbau'),basis:`LCP ${ms??'–'} ms · DOM ${dom??'–'} ms · ${latest.checked_at.slice(0,10)}`,measured:true};}
 const reachable=latest.outcome==='available'&&latest.http_status!==null&&latest.http_status>=200&&latest.http_status<300;
 const score=current&&reachable&&duration!==null?(duration<300?100:duration<1000?80:duration<2500?60:40):null;
 return {score,label:dateLabel??outcomeLabel??(reachable?'HTTP erreichbar':'HTTP-Ergebnis offen'),basis:`${duration??'–'} ms · HTTP ${latest.http_status??'–'} · ${latest.checked_at.slice(0,10)}`,measured:true};}
 return {score:null,label:app.trafficLight==='red'?'Historisch gestört':app.performance?'Historischer Hinweis':'Nicht gemessen',basis:app.performance??'Keine Laufzeitmessung vorhanden.',measured:false};
}
export function developmentFor(app:AppRecord,details:Technical,tests:TestRun[]){
 const tech=technicalScore(details),performance=performanceFor(app,tests);
 const priority=(performance.label==='Nicht erreichbar'||performance.label==='Bedienablauf fehlgeschlagen')||app.trafficLight==='red'?'Hoch':tech.score<60||app.status==='Entwurf'||app.status==='Prüfen'?'Hoch':'Mittel';
 const next=(performance.label==='Nicht erreichbar'||performance.label==='Bedienablauf fehlgeschlagen')||app.trafficLight==='red'?'Startpunkt und Zugangsfehler beheben; danach Kernablauf testen.':tech.score<60?`Technische Akte ergänzen (${tech.missing.join(', ')}); lauffähigen Startpunkt und Kernablauf prüfen.`:
 app.category==='Dokumentation'?'Quellenvergleich, deutsche Grammatik und Endnutzer-Export prüfen; Rollen und Suchablauf absichern.':app.category==='Präsentation'?'Exportqualität und Suchablauf prüfen; ähnliche Präsentationswerkzeuge fachlich vergleichen.':app.category==='Verträge'?'Prüfregeln und Zahlen gegen die Quellen testen; Überschneidungen mit Vertragswerkzeugen klären.':app.category==='Katalog'?'Vollständige Inventur, stabile IDs und Verbindungsstatus prüfen; Datenverlust vermeiden.':'Kernablauf messen, Fehlerfälle prüfen und eine konkrete nächste Funktion priorisieren.';
 return {priority,next,reason:(performance.label==='Nicht erreichbar'||performance.label==='Bedienablauf fehlgeschlagen')?'Betriebsfehler':tech.score<60?'Technische Angaben unvollständig':'Kernablauf und Pflege verbessern'};
}
const groups=[
 {name:'Verträge & Serviceverträge',pattern:/service.?vertrag|wartungsvertrag|vertragsbuddy|vertragsmanagement|contract/i,reason:'Verträge verwalten oder vergleichen; Datenmodell und Prüfregeln können sich überschneiden.'},
 {name:'Releaseletter & Release Notes',pattern:/release.?letter|release hub|jira.*release|release notes/i,reason:'Release-Kommunikation, Jira-Daten und Textprüfung; Import-, Freigabe- und Exportabläufe vergleichen.'},
 {name:'Benutzerhandbücher & Dokumentation',pattern:/handbook|docapp|dokupress|systemdoc|handbuch/i,reason:'Dokumentation und Benutzerhandbücher; Quellenverarbeitung, Rollen und Export unterscheiden.'},
 {name:'Präsentationen & Folien',pattern:/präsentation|praesentation|presentation|slide|thumbnail|thumnail/i,reason:'Folien erstellen, finden oder visualisieren; Suche und Generierung sind unterschiedliche Kernaufgaben.'},
 {name:'Kataloge & Wissensorganisation',pattern:/knowledgehub|ki.hub|übersicht|app.katalog|ticketbrain|intellifile|transparenz hub/i,reason:'Informationen sammeln und wiederfinden; Dateien, Tickets und App-Inventur haben verschiedene Datenobjekte.'},
 {name:'Autofabrik 2030',pattern:/autofabrik|werksplan|produktion innov|innovation prod|produktionsumgebung 2030/i,reason:'Produktionsbilder und Werkspläne; mögliche Varianten desselben Themas, Inhalt noch nicht geprüft.'},
 {name:'Wasserfall-Diagramme',pattern:/wasserfall/i,reason:'Preisaufbau als Wasserfall-Diagramm; Daten und Berechnungsregeln auf Gleichheit prüfen.'},
 {name:'Steuern & Abrechnung',pattern:/taxflow|haushaltkompass|doppelte haushalt/i,reason:'Abrechnung und Steuerdaten; allgemeine Buchhaltung und doppelte Haushaltsführung unterscheiden.'}
];
export function similarities(apps:AppRecord[]){return groups.map(g=>({...g,apps:apps.filter(a=>g.pattern.test(a.title))})).filter(g=>g.apps.length>1);}
export function summarizeAccounts(costs:Expense[],accounts:Account[],month:string,accountId='all'){
 const groups=new Map<string,{key:string;label:string;provider:string;currency:string;amount:number;entries:number}>();
 for(const row of costs){if(month&& !row.transaction_date.startsWith(month))continue;if(accountId!=='all'&&(accountId==='unassigned'?!!row.account_id:row.account_id!==accountId))continue;
  const account=accounts.find(a=>a.id===row.account_id);const key=(account?.id??'unassigned:'+row.provider)+':'+row.currency;const group=groups.get(key)??{key,label:account?.label??'Konto nicht zugeordnet',provider:row.provider,currency:row.currency,amount:0,entries:0};group.amount+=Number(row.amount);group.entries++;groups.set(key,group);}
 return [...groups.values()].sort((a,b)=>a.provider.localeCompare(b.provider,'de')||a.label.localeCompare(b.label,'de')||a.currency.localeCompare(b.currency));
}
