import type {AppAnalysis} from './app-evolution';
export const reviewPlan=[
 {id:'access',title:'1 · Zugang sichern',goal:'Einzelnen App-Link öffnen, zuständiges Konto und Anmeldeverfahren zuordnen. Zugriff mit Zeitpunkt und Quelle belegen.',fields:['source_url','access_profile']},
 {id:'data',title:'2 · Daten vervollständigen',goal:'Ziel, Hauptfunktion, Datenquellen und Aktualität einzeln prüfen. Fehlende Angaben ergänzen und gegen Originalquellen abgleichen.',fields:['description','detail']},
 {id:'architecture',title:'3 · Architektur belegen',goal:'Frontend, Middleware, Backend, Datenhaltung und Verbindungen im Quellcode oder Deployment prüfen. Aktive Konfiguration von geplanten Komponenten unterscheiden.',fields:['frontend','middleware','backend','database_technology']},
 {id:'function',title:'4 · Kernablauf testen',goal:'Typischen Ablauf mit Testdaten durchführen: Eingabe, Speichern, erneutes Laden und Export. Fehlerfall und Berechtigungen prüfen; Soll und Ist protokollieren.',fields:[]},
 {id:'performance',title:'5 · Performance messen',goal:'Messumgebung und Leistungsziel festlegen. Seitenaufbau und Kernablauf mehrfach messen, Ergebnisse und Fehler dokumentieren. HTTP-Erreichbarkeit allein reicht nicht.',fields:[]},
 {id:'release',title:'6 · Ergebnis freigeben',goal:'Nachweise, Kontenzuordnung, offene Fehler und nächste Evolutionsschritte prüfen. Erst nach bestandenen vorherigen Schritten abschließen.',fields:[]}
] as const;
export type ReviewCheck={status:'open'|'passed'|'failed';proof:string;checked_at?:string;};
export type AppReview={active:boolean;started_at?:string;finished_at?:string;checks:Record<string,ReviewCheck>;history?:{step:string;status:string;proof:string;checked_at:string;fields?:Record<string,string>}[]};
export function reviewCheckState(check?:ReviewCheck,now=Date.now()):'open'|'passed'|'failed'|'stale'|'invalid'{
 if(!check||check.status==='open')return 'open';
 if(check.status!=='passed'&&check.status!=='failed')return 'invalid';
 const time=Date.parse(check.checked_at??'');
 if(!check.proof||check.proof.trim().length<10||!Number.isFinite(time)||time>now)return 'invalid';
 if(check.status==='failed')return 'failed';
 return now-time>30*864e5?'stale':'passed';
}
export function reviewLight(app:{review?:AppReview;analysis?:AppAnalysis},now=Date.now()){
 const checks=app.review?.checks??{};
 if(Object.values(checks).some(c=>reviewCheckState(c,now)==='failed'))return {color:'red',label:'Rot · Fehler bestätigt'};
 if(reviewCheckState(checks.access,now)!=='passed'){
  if(app.analysis?.status==='blocked'&&/404|NOT_FOUND/.test(app.analysis.summary+' '+app.analysis.evidence.join(' ')))return {color:'red',label:'Rot · Startpunkt fehlerhaft'};
 }
 if(reviewPlan.every(s=>reviewCheckState(checks[s.id],now)==='passed'))return {color:'green',label:'Grün · Prüfung bestanden'};
 return {color:'yellow',label:'Gelb · Nachweise offen'};
}
export function nextReviewStep(review?:AppReview,now=Date.now()){return reviewPlan.find(s=>reviewCheckState(review?.checks[s.id],now)!=='passed')??reviewPlan[5];}
