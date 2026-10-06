'use client';
import {useState} from 'react';
import {providerAssets,providerFor,hostingFor,type Provider,type SourceApp} from './source-providers';
function Logo({provider}:{provider:Provider}){const [failed,setFailed]=useState(false);return <span className="provider-logo" title={provider}>{!failed?<img src={'/logos/'+providerAssets[provider].file} alt={provider} width="24" height="24" loading="lazy" onError={()=>setFailed(true)}/>:<span aria-hidden="true">{provider.slice(0,2)}</span>}<small>{provider}</small></span>;}
export default function ProviderLogo({app}:{app:SourceApp}){const provider=providerFor(app),host=hostingFor(app);return <span className="provider-logos" aria-label={`Quelle: ${provider}${host&&host!==provider?'; Hosting: '+host:''}`}><Logo provider={provider}/>{host&&host!==provider&&<Logo provider={host}/>}</span>;}
