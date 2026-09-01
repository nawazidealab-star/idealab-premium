import app from './index-bulk-v6';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role='super_admin'|'admin'|'sales'|'project_manager'|'finance'|'content';
const SESSION_COOKIE='idealab_admin_session';

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
async function sha256Hex(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(digest))}
function cookieValue(req:Request,name:string){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const[key,...rest]=part.trim().split('=');if(key===name)return decodeURIComponent(rest.join('='))}return null}
async function roleFor(req:Request,env:Env):Promise<Role|null>{const token=cookieValue(req,SESSION_COOKIE);if(!token)return null;const hash=await sha256Hex(token);const row=await env.DB.prepare(`SELECT u.role,u.active,s.expires_at FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1`).bind(hash).first<any>();if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000))return null;return row.role as Role}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(req.method==='DELETE'&&url.pathname.startsWith('/api/')){
      const role=await roleFor(req,env);
      if(!role)return json({error:'Sign in required'},401);
      if(role!=='super_admin')return json({error:'Only Super Admin can delete records'},403);
    }
    return app.fetch(req,env);
  }
} satisfies ExportedHandler<Env>;
