import app from './index-users-delete-v18';

interface Env {
  DB:D1Database;
  SUPER_ADMIN_EMAIL:string;
  ADMIN_PASSWORD_SALT:string;
  ADMIN_PASSWORD_HASH:string;
  ALLOWED_ORIGINS?:string;
}

type FxPayload={base:string;rates:Record<string,number>;updatedAt:number|null;source:string;stale?:boolean};
const FX_URL='https://open.er-api.com/v6/latest/USD';
let cache:{freshUntil:number;staleUntil:number;payload:FxPayload}|null=null;

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff','x-idealab-fx-runtime':'v18.1.0'}})}
function validRates(value:unknown){
 if(!value||typeof value!=='object')return false;
 const rates=value as Record<string,unknown>;
 const required=['USD','PKR','AUD','GBP','EUR','AED','CAD','SAR','QAR','NZD','SGD','INR','CNY','JPY','CHF','KWD','BHD','OMR'];
 return required.every(code=>Number.isFinite(Number(rates[code]))&&Number(rates[code])>0)&&Math.abs(Number(rates.USD)-1)<0.000001;
}
async function fetchRates(){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),6000);
 try{
  const response=await fetch(FX_URL,{headers:{accept:'application/json'},signal:controller.signal});
  if(!response.ok)throw new Error(`fx-${response.status}`);
  const data=await response.json() as any;
  if(data?.result!=='success'||!validRates(data?.rates))throw new Error('fx-invalid');
  const payload:FxPayload={base:'USD',rates:Object.fromEntries(Object.entries(data.rates).map(([k,v])=>[k,Number(v)])),updatedAt:Number.isFinite(Number(data.time_last_update_unix))?Number(data.time_last_update_unix):null,source:'ExchangeRate-API'};
  cache={freshUntil:Date.now()+60*60*1000,staleUntil:Date.now()+24*60*60*1000,payload};
  return payload;
 }finally{clearTimeout(timer)}
}

export default{
 async fetch(req:Request,env:Env):Promise<Response>{
  const url=new URL(req.url);
  if(url.pathname!=='/api/fx'||req.method!=='GET')return app.fetch(req,env);
  if(cache&&cache.freshUntil>Date.now())return json(cache.payload);
  try{return json(await fetchRates())}
  catch(error){
   console.error('V18 FX refresh failed',error);
   if(cache&&cache.staleUntil>Date.now())return json({...cache.payload,stale:true});
   return json({error:'Currency rates are temporarily unavailable. Please retry shortly.'},503);
  }
 }
} satisfies ExportedHandler<Env>;
