export type EvolutionStep={id:string;title:string;priority:'Hoch'|'Mittel'|'Niedrig';why:string;acceptance:string;status:'Geplant'|'In Arbeit'|'Erledigt'};
export type AppAnalysis={status:'live'|'source'|'partial'|'blocked'|'catalog';checked_at:string;scope:string;summary:string;evidence:string[];limitations:string[];steps:EvolutionStep[]};
export const analysisLabels={live:'Oberfläche geprüft',source:'Quellen geprüft',partial:'Teilweise geprüft',blocked:'Zugriff offen',catalog:'Katalogbasis'};
export function analysisDate(value?:string){return value?new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Berlin'}).format(new Date(value)):'Noch nicht geprüft';}
export const accessLabels:Record<string,string>={verified:'Konto bestätigt',partial:'Teilzugriff bestätigt',open:'Konto noch offen',needs_login:'Anmeldung erforderlich'};
