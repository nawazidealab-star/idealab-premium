import app from './index-users-v17';

interface Env {
  DB:D1Database;
  SUPER_ADMIN_EMAIL:string;
  ADMIN_PASSWORD_SALT:string;
  ADMIN_PASSWORD_HASH:string;
  ALLOWED_ORIGINS?:string;
}

type Identity={id:number;role:string;active:number};
const SESSION_COOKIE='idealab_admin_session';

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-idealab-delete-runtime':'v18.0.0'}})}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
async function sha256Hex(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(digest))}
function cookieValue(req:Request,name:string){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const[key,...rest]=part.trim().split('=');if(key===name)return decodeURIComponent(rest.join('='))}return null}
function trustedWrite(req:Request){const url=new URL(req.url);return req.headers.get('origin')===url.origin&&req.headers.get('x-requested-with')==='idealab-admin'&&(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json')}
async function identity(req:Request,env:Env):Promise<Identity>{const token=cookieValue(req,SESSION_COOKIE);if(!token)throw new Error('auth');const hash=await sha256Hex(token);const row=await env.DB.prepare(`SELECT u.id,u.role,u.active,s.expires_at FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1`).bind(hash).first<any>();if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000))throw new Error('auth');return{id:Number(row.id),role:String(row.role),active:Number(row.active)}}
async function safe(env:Env,sql:string,...values:unknown[]){try{await env.DB.prepare(sql).bind(...values).run()}catch(error){console.warn('V18 delete cleanup skipped',sql,error)}}

export default{
 async fetch(req:Request,env:Env):Promise<Response>{
  const path=new URL(req.url).pathname,match=/^\/api\/users\/(\d+)$/.exec(path);
  if(req.method!=='DELETE'||!match)return app.fetch(req,env);
  let actor:Identity;try{actor=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
  if(actor.role!=='super_admin')return json({error:'Super Admin access required'},403);
  if(!trustedWrite(req))return json({error:'Invalid request'},403);
  const targetId=Number(match[1]);if(!Number.isInteger(targetId)||targetId<=0)return json({error:'Invalid user'},400);
  if(targetId===actor.id)return json({error:'You cannot delete your own Super Admin account'},400);
  const body=await req.json().catch(()=>null) as any;if(!body?.confirm)return json({error:'Delete confirmation required'},400);
  const target=await env.DB.prepare('SELECT id,name,email,role FROM users WHERE id=? LIMIT 1').bind(targetId).first<any>();
  if(!target)return json({error:'User not found'},404);
  if(String(target.role)==='super_admin')return json({error:'Super Admin accounts cannot be deleted here'},403);

  try{
   // Preserve operational records; remove identity-specific access, sessions and chat.
   await safe(env,'UPDATE tasks SET assigned_user_id=NULL WHERE assigned_user_id=?',targetId);
   await safe(env,'UPDATE content_items SET owner_user_id=NULL WHERE owner_user_id=?',targetId);
   await safe(env,'DELETE FROM chat_reads WHERE user_id=?',targetId);
   await safe(env,'DELETE FROM chat_messages WHERE user_id=? OR recipient_user_id=?',targetId,targetId);
   await safe(env,'DELETE FROM user_client_access WHERE user_id=?',targetId);
   await safe(env,'DELETE FROM user_access WHERE user_id=?',targetId);
   await safe(env,'DELETE FROM admin_sessions WHERE user_id=?',targetId);
   const result=await env.DB.prepare('DELETE FROM users WHERE id=?').bind(targetId).run();
   if(Number(result.meta?.changes||0)!==1)return json({error:'Account could not be deleted'},500);
   return json({ok:true,id:targetId,name:String(target.name||'Team member')});
  }catch(error){console.error('V18 team delete failed',error);return json({error:'Team member deletion failed. Code V18-USER-DELETE'},500)}
 }
} satisfies ExportedHandler<Env>;
