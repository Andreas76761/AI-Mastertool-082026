export const providers = ['ChatGPT','Claude','Perplexity','Lovable','Vercel','Google Gemini','Google AI Studio','Microsoft Copilot','GitHub','Google Drive','Lokal','Unbekannt'] as const;
export type Provider = typeof providers[number];
export type SourceApp = {id:string;url?:string;source:string;projectId?:string;hosting?:string;provider?:string;technical?:{builder:string};};
export const providerAssets:Record<Provider,{file:string;url:string}> = {
 ChatGPT:{file:'chatgpt.svg',url:'https://chatgpt.com'},Claude:{file:'claude.svg',url:'https://claude.ai'},Perplexity:{file:'perplexity.ico',url:'https://www.perplexity.ai'},Lovable:{file:'lovable.png',url:'https://lovable.dev'},Vercel:{file:'vercel.ico',url:'https://vercel.com'},'Google Gemini':{file:'gemini.svg',url:'https://gemini.google.com/app'},'Google AI Studio':{file:'google-ai-studio.svg',url:'https://aistudio.google.com/apps'},'Microsoft Copilot':{file:'copilot.svg',url:'https://copilot.microsoft.com'},GitHub:{file:'github.ico',url:'https://github.com'},'Google Drive':{file:'google-drive.png',url:'https://drive.google.com'},Lokal:{file:'local.svg',url:''},Unbekannt:{file:'unknown.svg',url:''}
};
export function providerFor(app:SourceApp):Provider {
 if(providers.includes(app.provider as Provider))return app.provider as Provider;
 const builder=app.technical?.builder??'';const url=app.url??'';
 if(/copilot|power\s*(apps|automate)/i.test(builder)||/copilot\.microsoft|copilotstudio|m365\.cloud|powerapps\.com/i.test(url))return 'Microsoft Copilot';
 if(/gemini\.google\.com/.test(url)||/gemini/i.test(builder)&&!/ai studio/i.test(builder))return 'Google Gemini';
 if(/perplexity/i.test(builder+url))return 'Perplexity';
 if(/lovable/i.test(builder+url))return 'Lovable';
 if(/claude|anthropic/i.test(builder+url)||app.id.startsWith('claude-workspace-'))return 'Claude';
 if(/google ai studio/i.test(builder)||/aistudio\.google/.test(url))return 'Google AI Studio';
 if(app.projectId||/chatgpt|codex|sites/i.test(builder+url))return 'ChatGPT';
 if(/vercel\.app|vercel\.com/.test(url)||/vercel/i.test(builder))return 'Vercel';
 if(app.source==='GitHub')return 'GitHub';if(app.source==='Google Drive')return 'Google Drive';if(app.source==='Lokaler Rechner')return 'Lokal';return 'Unbekannt';
}
export function hostingFor(app:SourceApp):Provider|null {if(/vercel\.app|vercel\.com/i.test((app.url??'')+' '+(app.hosting??'')))return 'Vercel';return null;}
