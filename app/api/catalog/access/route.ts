import {isEditor,requireCatalogUser,supabaseRest} from '../../_lib/supabase-server';
import {validateLocations} from '../../../app-access';
export async function POST(request:Request){try{
 const {profile}=await requireCatalogUser();if(!isEditor(profile))return Response.json({error:'Bearbeitungsrechte erforderlich.'},{status:403});
 const raw=await request.text();if(raw.length>10000)return Response.json({error:'Angaben sind zu groß.'},{status:413});const body=JSON.parse(raw);
 if(Object.keys(body).some(k=>!['app_key','locations'].includes(k))||typeof body.app_key!=='string'||!/^[a-zA-Z0-9_-]{1,160}$/.test(body.app_key))throw new Error('Bitte gültige App- und Pfadangaben verwenden.');
 const locations=validateLocations(body.locations);
 const loaded=await supabaseRest(`catalog_apps?app_key=eq.${body.app_key}&select=metadata,updated_at`);if(!loaded.ok)throw new Error('Ablageorte konnten nicht geladen werden.');const rows=await loaded.json() as {metadata:Record<string,unknown>;updated_at:string}[];if(!rows[0])return Response.json({error:'App nicht gefunden.'},{status:404});
 const row=rows[0],metadata={...row.metadata,local_locations:locations};
 const saved=await supabaseRest(`catalog_apps?app_key=eq.${body.app_key}&updated_at=eq.${encodeURIComponent(row.updated_at)}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({metadata,updated_at:new Date().toISOString()})});if(!saved.ok)throw new Error('Ablageorte konnten nicht gespeichert werden.');const changed=await saved.json() as unknown[];if(!changed.length)return Response.json({error:'Die App wurde zwischenzeitlich geändert. Bitte neu laden.'},{status:409});
 return Response.json({saved:true,locations});
 }catch(error){if(error instanceof Error&&error.message==='AUTH_REQUIRED')return Response.json({error:'Anmeldung erforderlich.'},{status:401});return Response.json({error:error instanceof Error?error.message:'Speichern fehlgeschlagen.'},{status:400});}}
