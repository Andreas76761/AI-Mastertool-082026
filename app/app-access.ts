export type AccessCheck={status:'signed_in'|'public'|'editor'|'login_required'|'unavailable'|'blocked'|'unknown'|'local'|'missing';checked_at:string;entry_url?:string;login_url?:string;proof:string;login_note?:string};
export type LocalLocation={device:'pc1'|'pc2'|'pc3'|'unassigned';device_name:string;path:string;folder:string;source?:string;recorded_at?:string};
export const accessCheckLabels:Record<AccessCheck['status'],string>={signed_in:'Angemeldeter Zugang bestätigt',public:'Ohne Anmeldung erreichbar',editor:'Plattform-Editor erreichbar',login_required:'Anmeldung erforderlich',unavailable:'Startlink fehlerhaft',blocked:'Prüfung im Browser blockiert',unknown:'Zugang noch offen',local:'Lokaler Zugang separat prüfen',missing:'Startlink fehlt'};
export function localFolder(path:string){const p=path.trim().replace(/(?<!^)\\{2,}/g,'\\');return /\.(html?|exe|zip|pdf|md|json|py|js|bat|ps1)$/i.test(p)?p.slice(0,Math.max(p.lastIndexOf('\\'),p.lastIndexOf('/'))):p;}
export function validateLocations(raw:unknown):LocalLocation[]{
 if(!Array.isArray(raw)||raw.length>4)throw new Error('Bitte höchstens drei Rechner und einen nicht zugeordneten Pfad verwenden.');
 const seen=new Set<string>();return raw.map(value=>{
  if(!value||typeof value!=='object'||Object.keys(value).some(k=>!['device','device_name','path'].includes(k)))throw new Error('Bitte nur Rechner und Pfadangaben verwenden.');
  const {device,device_name,path}=value;
  if(!['pc1','pc2','pc3','unassigned'].includes(device)||seen.has(device))throw new Error('Bitte jeden Rechner nur einmal angeben.');seen.add(device);
  if(typeof path!=='string'||path.length>1000||!path.trim()||!(/^[A-Za-z]:[\\/]/.test(path)||/^\\\\[^\\]+\\/.test(path)||/^\/(?!\/)/.test(path))||/[\x00-\x1f]/.test(path))throw new Error('Bitte einen vollständigen lokalen Pfad angeben.');
  if(typeof device_name!=='string'||!device_name.trim()||device_name.length>100)throw new Error('Bitte einen Rechnernamen angeben.');
  const normalized=path.trim().replace(/(?<!^)\\{2,}/g,'\\');
  return {device,device_name:device_name.trim(),path:normalized,folder:localFolder(normalized),source:'Benutzerangabe; Erreichbarkeit nicht geprüft',recorded_at:new Date().toISOString()};
 });
}
