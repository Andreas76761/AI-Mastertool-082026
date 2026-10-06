export type ContentSource={id:string;app_key:string;kind:string;name:string;sha256:string;content:string;created_at:string};
export type Budget={id:string;account_id:string;month:string;currency:string;amount:number|string};
export function normalizedContent(text:string){return text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').normalize('NFC');}
export async function contentHash(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalizedContent(text))))).map(x=>x.toString(16).padStart(2,'0')).join('');}
const tokens=(text:string)=>new Set(text.toLocaleLowerCase('de').match(/[\p{L}\p{N}_]{3,}/gu)??[]);
export function compareContents(left:ContentSource[],right:ContentSource[]){
 if(!left.length||!right.length)return {status:'missing',score:null,basis:'Beide Apps benötigen mindestens eine Quelltext- oder Dokumentdatei.',differences:[] as string[]};
 const manifest=(rows:ContentSource[])=>rows.map(r=>r.kind+':'+r.sha256).sort().join('|');
 if(manifest(left)===manifest(right))return {status:'identical',score:100,basis:`Alle ${left.length} hochgeladenen Dateien stimmen nach SHA-256 überein. Aussage gilt für diese Dateien; vollständige App-Identität setzt vollständige Quellen voraus.`,differences:[] as string[]};
 const lt=left.map(r=>r.content).join('\n'),rt=right.map(r=>r.content).join('\n'),a=tokens(lt),b=tokens(rt),intersection=[...a].filter(t=>b.has(t)).length,union=new Set([...a,...b]).size;
 const score=union?Math.round(100*intersection/union):0;
 const numbers=(s:string)=>new Set(s.match(/\b\d+(?:[.,]\d+)?\b/g)??[]);const ln=numbers(lt),rn=numbers(rt);
 const differences=[...ln].filter(n=>!rn.has(n)).map(n=>'Nur links: '+n).concat([...rn].filter(n=>!ln.has(n)).map(n=>'Nur rechts: '+n)).slice(0,30);
 return {status:score>=60?'similar':'different',score,basis:'Wortüberschneidung (Jaccard) der hochgeladenen Inhalte; Zahlenabweichungen separat ausgewiesen. Kein automatischer fachlicher Gleichheitsnachweis.',differences};
}
export function budgetUsage(budget:Budget,costs:{account_id?:string|null;currency:string;transaction_date:string;amount:number|string}[]){const actual=costs.filter(c=>c.account_id===budget.account_id&&c.currency===budget.currency&&c.transaction_date.startsWith(budget.month)).reduce((sum,c)=>sum+Number(c.amount),0);const limit=Number(budget.amount);return {actual,limit,remaining:limit-actual,percent:limit>0?Math.round(actual/limit*100):0,exceeded:actual>limit};}
