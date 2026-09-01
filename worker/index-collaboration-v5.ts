import core from './index-collaboration-v4';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role='super_admin'|'admin'|'sales'|'project_manager'|'finance'|'content';
type Identity={id:number;name:string;email:string;role:Role;active:number};
type Access={content:boolean;clients:boolean;all_clients:boolean};
const SESSION_COOKIE='idealab_admin_session';
const CONTENT_STATUSES=['idea','draft','review','approved','scheduled','published','cancelled'];

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}})}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
async function sha256Hex(value:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(d))}
function cookieValue(req:Request,name:string){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const[k,...r]=part.trim().split('=');if(k===name)return decodeURIComponent(r.join('='))}return null}
async function identity(req:Request,env:Env):Promise<Identity>{const token=cookieValue(req,SESSION_COOKIE);if(!token)throw new Error('auth');const h=await sha256Hex(token);const r=await env.DB.prepare('SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1').bind(h).first<any>();if(!r||!r.active||Number(r.expires_at)<=Math.floor(Date.now()/1000))throw new Error('auth');return{id:Number(r.id),name:String(r.name),email:String(r.email),role:r.role as Role,active:Number(r.active)}}
function defaults(role:Role):Access{if(role==='super_admin')return{content:true,clients:true,all_clients:true};if(role==='admin')return{content:true,clients:true,all_clients:true};if(role==='project_manager')return{content:true,clients:true,all_clients:true};if(role==='content')return{content:true,clients:true,all_clients:true};return{content:false,clients:true,all_clients:true}}
async function accessFor(env:Env,user:Identity):Promise<Access>{const d=defaults(user.role);if(user.role==='super_admin')return d;const r=await env.DB.prepare('SELECT content,clients,all_clients FROM user_access WHERE user_id=? LIMIT 1').bind(user.id).first<any>();return r?{content:d.content&&Boolean(r.content),clients:d.clients&&Boolean(r.clients),all_clients:Boolean(r.all_clients)}:d}
async function clientSet(env:Env,user:Identity,access:Access){if(user.role==='super_admin'||access.all_clients)return null;const r=await env.DB.prepare('SELECT client_id FROM user_client_access WHERE user_id=?').bind(user.id).all<{client_id:number}>();return new Set((r.results||[]).map(x=>Number(x.client_id)))}
async function canClient(env:Env,user:Identity,access:Access,id:number|null){if(id===null)return true;const s=await clientSet(env,user,access);return s===null||s.has(id)}
function id(value:unknown){if(value===null||value===undefined||value==='')return null;const n=Number(value);if(!Number.isInteger(n)||n<=0)throw new Error('validation');return n}
function text(value:unknown,max:number){if(value===null||value===undefined||value==='')return null;if(typeof value!=='string')throw new Error('validation');const s=value.trim();if(s.length>max)throw new Error('validation');return s||null}
function requireWrite(req:Request){if(!['POST','PATCH'].includes(req.method))return;const u=new URL(req.url);if(req.headers.get('origin')!==u.origin||req.headers.get('x-requested-with')!=='idealab-admin')throw new Error('request')}
async function ensure(env:Env){const info=await env.DB.prepare('PRAGMA table_info(content_items)').all<{name:string}>();const cols=new Set((info.results||[]).map(x=>String(x.name)));if(!cols.has('campaign'))await env.DB.prepare('ALTER TABLE content_items ADD COLUMN campaign TEXT').run();if(!cols.has('owner_user_id'))await env.DB.prepare('ALTER TABLE content_items ADD COLUMN owner_user_id INTEGER').run()}

async function content(req:Request,env:Env,user:Identity,access:Access){
  if(!access.content)return json({error:'Content Planner access is disabled for this account'},403);await ensure(env);const path=new URL(req.url).pathname;const parts=path.split('/').filter(Boolean);const allowed=await clientSet(env,user,access);
  if(req.method==='GET'){
    let where='';let binds:unknown[]=[];if(allowed!==null){const ids=[...allowed];where=ids.length?`WHERE ci.client_id IS NULL OR ci.client_id IN (${ids.map(()=>'?').join(',')})`:'WHERE ci.client_id IS NULL';binds=ids}
    return json(await env.DB.prepare(`SELECT ci.*,c.name client_name,u.name owner_name FROM content_items ci LEFT JOIN clients c ON c.id=ci.client_id LEFT JOIN users u ON u.id=ci.owner_user_id ${where} ORDER BY ci.publish_at IS NULL,ci.publish_at ASC,ci.id DESC LIMIT 750`).bind(...binds).all());
  }
  try{requireWrite(req)}catch{return json({error:'Invalid request'},403)}const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);
  if(req.method==='POST'){
    const clientId=id(body.client_id);if(!(await canClient(env,user,access,clientId)))return json({error:'This account does not have access to that client'},403);const title=text(body.title,220);if(!title)return json({error:'Content title is required'},400);const status=CONTENT_STATUSES.includes(String(body.status))?String(body.status):'idea';
    const result=await env.DB.prepare('INSERT INTO content_items(client_id,title,campaign,platform,format,status,publish_at,caption,asset_url,owner_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(clientId,title,text(body.campaign,180),text(body.platform,80),text(body.format,80),status,text(body.publish_at,50),text(body.caption,8000),text(body.asset_url,1000),user.id).run();return json({ok:true,id:Number(result.meta.last_row_id)},201);
  }
  if(req.method==='PATCH'&&parts[2]){
    const itemId=Number(parts[2]);const current=await env.DB.prepare('SELECT * FROM content_items WHERE id=? LIMIT 1').bind(itemId).first<any>();if(!current)return json({error:'Content item not found'},404);const clientId=body.client_id===undefined?(current.client_id?Number(current.client_id):null):id(body.client_id);if(!(await canClient(env,user,access,clientId)))return json({error:'This account does not have access to that client'},403);const status=body.status===undefined?String(current.status):(CONTENT_STATUSES.includes(String(body.status))?String(body.status):String(current.status));
    await env.DB.prepare('UPDATE content_items SET client_id=?,title=?,campaign=?,platform=?,format=?,status=?,publish_at=?,caption=?,asset_url=?,owner_user_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(clientId,body.title===undefined?current.title:(text(body.title,220)||current.title),body.campaign===undefined?current.campaign:text(body.campaign,180),body.platform===undefined?current.platform:text(body.platform,80),body.format===undefined?current.format:text(body.format,80),status,body.publish_at===undefined?current.publish_at:text(body.publish_at,50),body.caption===undefined?current.caption:text(body.caption,8000),body.asset_url===undefined?current.asset_url:text(body.asset_url,1000),current.owner_user_id||user.id,itemId).run();return json({ok:true});
  }
  return json({error:'Method not allowed'},405);
}

async function protectClientMutation(req:Request,env:Env,user:Identity,access:Access){if(req.method!=='PATCH')return null;const path=new URL(req.url).pathname;const match=/^\/api\/clients\/(\d+)$/.exec(path);if(!match)return null;const clientId=Number(match[1]);if(!(await canClient(env,user,access,clientId)))return json({error:'This account does not have access to that client'},403);return null}

export default{async fetch(req:Request,env:Env):Promise<Response>{const path=new URL(req.url).pathname;if(!path.startsWith('/api/'))return core.fetch(req,env);let user:Identity;try{user=await identity(req,env)}catch{return core.fetch(req,env)}const access=await accessFor(env,user);if(path==='/api/content_items'||path.startsWith('/api/content_items/'))return content(req,env,user,access);if(path.startsWith('/api/clients/')){const blocked=await protectClientMutation(req,env,user,access);if(blocked)return blocked}return core.fetch(req,env)}} satisfies ExportedHandler<Env>;
