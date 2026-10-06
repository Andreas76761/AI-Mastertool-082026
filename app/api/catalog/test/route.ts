import { isEditor, requireCatalogUser, supabaseRest } from '../../_lib/supabase-server';

export async function POST(request: Request) {
 try {
  const {profile}=await requireCatalogUser();if(!isEditor(profile))return Response.json({error:'Bearbeitungsrechte erforderlich.'},{status:403});
  const body=await request.json() as {appKey?:string;url?:string};
  if(!body.appKey||!/^[a-zA-Z0-9_-]{1,160}$/.test(body.appKey)||!body.url)return Response.json({error:'App und HTTPS-Adresse fehlen.'},{status:400});
  const known=await (await supabaseRest(`catalog_apps?app_key=eq.${encodeURIComponent(body.appKey)}&select=source_url`)).json() as {source_url:string}[];
  if(!known[0]||known[0].source_url!==body.url)return Response.json({error:'Nur der im Katalog hinterlegte App-Link kann gemessen werden.'},{status:400});
  let url:URL;try{url=new URL(body.url);}catch{return Response.json({error:'Ungültige Adresse.'},{status:400});}
  if(url.protocol!=='https:'||url.username||url.password||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname)||url.hostname.endsWith('.local'))return Response.json({error:'Lokale Adressen benötigen den lokalen Status-Agenten.'},{status:400});
  const start=Date.now(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  let status=0,outcome='unavailable',detail='HTTP-Antwortzeit; vollständiger Bedienablauf nicht geprüft.';
  try {let response=await fetch(url,{method:'HEAD',redirect:'manual',signal:controller.signal});
   if(response.status===405||response.status===501)response=await fetch(url,{method:'GET',headers:{Range:'bytes=0-0'},redirect:'manual',signal:controller.signal});
   status=response.status;outcome=status>=200&&status<300?'available':status===401||status===403||(status>=300&&status<400)?'login_required':'unavailable';
   if(status>=300&&status<400)detail='Weiterleitung; App-Inhalt und Login-Ziel nicht geprüft.';
  }catch(error){detail=error instanceof Error&&error.name==='AbortError'?'Zeitüberschreitung nach 8 Sekunden.':'Zielserver nicht erreichbar.';}finally{clearTimeout(timeout);}
  const durationMs=Date.now()-start;
  await supabaseRest('app_test_runs',{method:'POST',body:JSON.stringify({app_key:body.appKey,outcome,http_status:status||null,duration_ms:durationMs,detail})});
  return Response.json({outcome,status:status||null,durationMs,detail});
 }catch(error){if(error instanceof Error&&error.message==='AUTH_REQUIRED')return Response.json({error:'Anmeldung erforderlich.'},{status:401});return Response.json({error:error instanceof Error?error.message:'Messung fehlgeschlagen.'},{status:503});}
}
