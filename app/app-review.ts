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
export function reviewLight(app:{review?:AppReview;analysis?:AppAnalysis},now=Date.now()){
 const checks=app.review?.checks??{};
 if(Object.values(checks).some(c=>c.status==='failed'))return {color:'red',label:'Rot · Fehler bestätigt'};
 if(!checks.access||checks.access.status!=='passed'){
  if(app.analysis?.status==='blocked'&&/404|NOT_FOUND/.test(app.analysis.summary+' '+app.analysis.evidence.join(' ')))return {color:'red',label:'Rot · Startpunkt fehlerhaft'};
 }
 if(reviewPlan.every(s=>{const c=checks[s.id],time=Date.parse(c?.checked_at??'');return c?.status==='passed'&&!!c.proof?.trim()&&Number.isFinite(time)&&time<=now&&now-time<=30*864e5;}))return {color:'green',label:'Grün · Prüfung bestanden'};
 return {color:'yellow',label:'Gelb · Nachweise offen'};
}
export function nextReviewStep(review?:AppReview,now=Date.now()){return reviewPlan.find(s=>{const c=review?.checks[s.id];return c?.status!=='passed'||!c.proof?.trim()||!c.checked_at||!Number.isFinite(Date.parse(c.checked_at))||now-Date.parse(c.checked_at)>30*864e5;})??reviewPlan[5];}
