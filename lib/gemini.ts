import { createHash } from 'node:crypto';
import { z } from 'zod';

// Server-only. Cached results are scoped to the authenticated user and never contain API keys.
export class GeminiApiError extends Error {
 constructor(public status: number, public model: string) {
  super(status === 404
   ? `Gemini model "${model}" was not found or is not available to this project (HTTP 404). Check GEMINI_MODEL.`
   : status === 503
    ? `Gemini model "${model}" is temporarily unavailable (HTTP 503).`
    : `Gemini request failed for model "${model}" (HTTP ${status}).`);
  this.name = 'GeminiApiError';
 }
}
class GeminiBusyError extends Error { constructor(){ super('Gemini request queue is busy.'); this.name='GeminiBusyError' } }
export function geminiFailureMessage(error: unknown): string {
 if(error instanceof GeminiBusyError)return 'The AI queue is busy. Please try again shortly.';
 if (error instanceof GeminiApiError && error.status === 404)
  return `Gemini model "${error.model}" is unavailable. Check GEMINI_MODEL in server settings.`;
 if (error instanceof GeminiApiError && error.status === 429)
  return 'Gemini quota or rate limit reached. Check your Google project and try again later.';
 if (error instanceof GeminiApiError && [500,502,503,504].includes(error.status))
  return 'Gemini is temporarily unavailable or overloaded. Please try again later.';
 return 'Gemini was unavailable. Check the server logs and configuration.';
}
type Cached = { value: unknown; model: string; expires: number };
type Work = { value: unknown; model: string };
type Waiter = { resolve:()=>void; reject:(e:Error)=>void; timer:ReturnType<typeof setTimeout> };
type State = { cache:Map<string,Cached>; inflight:Map<string,Promise<Work>>; active:number; queue:Waiter[] };
const globalState=globalThis as typeof globalThis & { __groovGeminiState?:State };
const state:State=globalState.__groovGeminiState ||= {cache:new Map<string,Cached>(),inflight:new Map<string,Promise<Work>>(),active:0,queue:[] as Waiter[]};
const MAX_ACTIVE=4, MAX_QUEUE=30, QUEUE_WAIT_MS=10000, CACHE_TTL_MS=60000, MAX_CACHE=200;
async function acquire():Promise<void>{
 if(state.active<MAX_ACTIVE){state.active++;return}
 if(state.queue.length>=MAX_QUEUE)throw new GeminiBusyError();
 await new Promise<void>((resolve,reject)=>{
  const waiter:Waiter={resolve,reject,timer:setTimeout(()=>{const i=state.queue.indexOf(waiter);if(i>=0)state.queue.splice(i,1);reject(new GeminiBusyError())},QUEUE_WAIT_MS)};
  state.queue.push(waiter);
 });
}
function release(){const waiter=state.queue.shift();if(waiter){clearTimeout(waiter.timer);waiter.resolve()}else state.active=Math.max(0,state.active-1)}
const validModel=(model:string)=>/^[a-zA-Z0-9._-]+$/.test(model);
const transient=(status:number)=>[500,502,503,504].includes(status);
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function callGemini<T>(prompt:string,schema:z.ZodType<T>,key:string,models:string[]):Promise<{value:T;model:string}>{
 let lastError:GeminiApiError|undefined;
 for(const [index,model] of models.entries()){
  // At most four provider calls: two primary, then two fallback calls on 5xx.
  for(let attempt=0;attempt<2;attempt++){
   const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.2}}),signal:AbortSignal.timeout(20000),cache:'no-store'});
   if(response.ok){
    const data=await response.json();const text=data?.candidates?.[0]?.content?.parts?.map((p:{text?:string})=>p.text||'').join('');
    if(!text)throw new Error('Gemini returned an empty response.');
    return {value:schema.parse(JSON.parse(text)),model};
   }
   lastError=new GeminiApiError(response.status,model);
   // Avoid amplifying quota failures and do not retry invalid requests or auth failures.
   if(!transient(response.status))throw lastError;
   if(attempt===0)await delay((index===0?700:1100)+Math.floor(Math.random()*300));
  }
 }
 throw lastError||new Error('Gemini was unavailable.');
}
export async function geminiJson<T>(prompt:string,schema:z.ZodType<T>,scope:string):Promise<{value:T;model:string;cached:boolean}>{
 const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('GEMINI_NOT_CONFIGURED');
 const primary=(process.env.GEMINI_MODEL||'gemini-3.8-flash').trim();
 const fallback=process.env.GEMINI_FALLBACK_MODEL===undefined?'gemini-3.5-flash-lite':process.env.GEMINI_FALLBACK_MODEL.trim();
 if(!validModel(primary)||(fallback&&!validModel(fallback)))throw new Error('Invalid Gemini model name. Use bare IDs such as gemini-3.8-flash.');
 const models=[primary,...(fallback&&fallback!==primary?[fallback]:[])];
 // Hash includes the authenticated user's ID and credential fingerprint. Never persist the raw prompt as a cache key.
 const cacheKey=createHash('sha256').update(JSON.stringify([scope,key,models,prompt])).digest('hex');
 const existing=state.cache.get(cacheKey);
 if(existing&&existing.expires>Date.now())return {value:schema.parse(existing.value),model:existing.model,cached:true};
 if(existing)state.cache.delete(cacheKey);
 const inflight=state.inflight.get(cacheKey);
 if(inflight){const shared=await inflight;return {value:schema.parse(shared.value),model:shared.model,cached:true}}
 const job=(async():Promise<Work>=>{await acquire();try{return await callGemini(prompt,schema,key,models)}finally{release()}})();
 state.inflight.set(cacheKey,job);
 try{
  const result=await job;
  // Successful results only. Cache is per-process, bounded and expires after one minute.
  for(const [k,v] of state.cache){if(v.expires<=Date.now())state.cache.delete(k)}
  while(state.cache.size>=MAX_CACHE){const first=state.cache.keys().next().value;if(!first)break;state.cache.delete(first)}
  state.cache.set(cacheKey,{...result,expires:Date.now()+CACHE_TTL_MS});
  return {value:schema.parse(result.value),model:result.model,cached:false};
 }finally{state.inflight.delete(cacheKey)}
}
