import core from './index-collaboration-v5';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';
type Identity = { id:number; name:string; email:string; role:Role; active:number };
type ModuleKey = 'leads'|'clients'|'projects'|'tasks'|'invoices'|'content'|'reports'|'settings'|'chat';
type AccessMap = Record<ModuleKey,boolean> & { all_clients:boolean };
type Entity = 'leads'|'clients'|'projects'|'tasks'|'invoices'|'content_items';

const SESSION_COOKIE='idealab_admin_session';
const ENTITY_MODULE:Record<Entity,ModuleKey>={leads:'leads',clients:'clients',projects:'projects',tasks:'tasks',invoices:'invoices',content_items:'content'};
const STATUS_VALUES:Record<Entity,string[]>={
  leads:['new','contacted','qualified','proposal','warm','follow_up','won','lost'],
  clients:['active','paused','inactive'],
  projects:['planned','active','blocked','review','done','cancelled'],
  tasks:['todo','in_progress','review','done','cancelled'],
  invoices:['draft','sent','due','paid','void'],
  content_items:['idea','draft','review','approved','scheduled','published','cancelled'],
};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer'}})}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
async function sha256Hex(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(digest))}
function cookieValue(req:Request,name:string){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const[key,...rest]=part.trim().split('=');if(key===name)return decodeURIComponent(rest.join('='))}return null}
function requireWriteOrigin(req:Request){const url=new URL(req.url);if(req.headers.get('origin')!==url.origin)throw new Error('origin');if(req.headers.get('x-requested-with')!=='idealab-admin')throw new Error('csrf');if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new Error('json')}

async function identity(req:Request,env:Env):Promise<Identity>{
  const token=cookieValue(req,SESSION_COOKIE);if(!token)throw new Error('auth');
  const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1`).bind(hash).first<any>();
  if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000))throw new Error('auth');
  return{id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role as Role,active:Number(row.active)};
}

function roleDefaults(role:Role):AccessMap{
  if(role==='super_admin')return{leads:true,clients:true,projects:true,tasks:true,invoices:true,content:true,reports:true,settings:true,chat:true,all_clients:true};
  if(role==='admin')return{leads:true,clients:true,projects:true,tasks:true,invoices:true,content:true,reports:true,settings:false,chat:true,all_clients:true};
  if(role==='sales')return{leads:true,clients:true,projects:false,tasks:false,invoices:false,content:false,reports:false,settings:false,chat:true,all_clients:true};
  if(role==='project_manager')return{leads:false,clients:true,projects:true,tasks:true,invoices:false,content:true,reports:false,settings:false,chat:true,all_clients:true};
  if(role==='finance')return{leads:false,clients:true,projects:false,tasks:false,invoices:true,content:false,reports:true,settings:false,chat:true,all_clients:true};
  return{leads:false,clients:true,projects:false,tasks:false,invoices:false,content:true,reports:false,settings:false,chat:true,all_clients:true};
}

async function accessFor(env:Env,user:Identity):Promise<AccessMap>{
  const base=roleDefaults(user.role);if(user.role==='super_admin')return base;
  const row=await env.DB.prepare('SELECT * FROM user_access WHERE user_id=? LIMIT 1').bind(user.id).first<any>();
  if(!row)return base;
  const effective=(key:ModuleKey)=>base[key]&&Boolean(row[key]);
  return{leads:effective('leads'),clients:effective('clients'),projects:effective('projects'),tasks:effective('tasks'),invoices:effective('invoices'),content:effective('content'),reports:effective('reports'),settings:false,chat:Boolean(row.chat),all_clients:Boolean(row.all_clients)};
}

async function allowedClientIds(env:Env,user:Identity,access:AccessMap){
  if(user.role==='super_admin'||access.all_clients)return null;
  const rows=await env.DB.prepare('SELECT client_id FROM user_client_access WHERE user_id=?').bind(user.id).all<{client_id:number}>();
  return (rows.results||[]).map(r=>Number(r.client_id));
}

function normalizeIds(value:unknown){
  if(!Array.isArray(value))return[] as number[];
  return [...new Set(value.map(Number).filter(v=>Number.isInteger(v)&&v>0))].slice(0,250);
}

function placeholders(count:number){return Array.from({length:count},()=>'?').join(',')}

async function audit(env:Env,user:Identity,action:string,entity:string,detail:string){
  try{await env.DB.prepare('INSERT INTO activities(entity_type,action,detail,user_id) VALUES(?,?,?,?)').bind(entity,action,detail.slice(0,1000),user.id).run()}catch{/* audit must not block bulk action */}
}

async function bulkStatus(env:Env,user:Identity,access:AccessMap,entity:Entity,ids:number[],status:string){
  if(!STATUS_VALUES[entity].includes(status))return json({error:'Invalid status for this module'},400);
  const module=ENTITY_MODULE[entity];if(!access[module])return json({error:'Module access required'},403);
  const idSql=placeholders(ids.length);const clientIds=await allowedClientIds(env,user,access);
  const values:unknown[]=[status,...ids];let sql='';

  if(entity==='leads')sql=`UPDATE leads SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id IN (${idSql})`;
  if(entity==='clients'){
    if(clientIds!==null){if(!clientIds.length)return json({ok:true,changed:0});sql=`UPDATE clients SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id IN (${idSql}) AND id IN (${placeholders(clientIds.length)})`;values.push(...clientIds)}
    else sql=`UPDATE clients SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id IN (${idSql})`;
  }
  if(entity==='projects'||entity==='invoices'||entity==='content_items'){
    if(clientIds!==null){if(!clientIds.length)return json({ok:true,changed:0});sql=`UPDATE ${entity} SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id IN (${idSql}) AND client_id IN (${placeholders(clientIds.length)})`;values.push(...clientIds)}
    else sql=`UPDATE ${entity} SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id IN (${idSql})`;
  }
  if(entity==='tasks'){
    const clauses=[`id IN (${idSql})`];if(user.role!=='super_admin'){clauses.push('assigned_user_id=?');values.push(user.id)}
    if(clientIds!==null){if(!clientIds.length){clauses.push('client_id IS NULL')}else{clauses.push(`(client_id IS NULL OR client_id IN (${placeholders(clientIds.length)}))`);values.push(...clientIds)}}
    sql=`UPDATE tasks SET status=?,completed_at=CASE WHEN ?='done' THEN COALESCE(completed_at,CURRENT_TIMESTAMP) ELSE NULL END,updated_at=CURRENT_TIMESTAMP WHERE ${clauses.join(' AND ')}`;
    values.splice(1,0,status);
  }
  if(entity==='invoices'&&sql){
    const scoped=sql.replace('SET status=?,updated_at=CURRENT_TIMESTAMP','SET status=?,paid_at=CASE WHEN ?=\'paid\' THEN COALESCE(paid_at,CURRENT_TIMESTAMP) ELSE NULL END,updated_at=CURRENT_TIMESTAMP');
    values.splice(1,0,status);sql=scoped;
  }

  const result=await env.DB.prepare(sql).bind(...values).run();
  await audit(env,user,'bulk.status',entity,`${ids.length} selected -> ${status}`);
  return json({ok:true,changed:Number(result.meta.changes||0)});
}

async function bulkDelete(env:Env,user:Identity,entity:Entity,ids:number[]){
  if(user.role!=='super_admin')return json({error:'Only Super Admin can delete records'},403);
  const idSql=placeholders(ids.length);const statements:D1PreparedStatement[]=[];
  if(entity==='leads')statements.push(env.DB.prepare(`DELETE FROM leads WHERE id IN (${idSql})`).bind(...ids));
  if(entity==='tasks')statements.push(env.DB.prepare(`DELETE FROM tasks WHERE id IN (${idSql})`).bind(...ids));
  if(entity==='content_items')statements.push(env.DB.prepare(`DELETE FROM content_items WHERE id IN (${idSql})`).bind(...ids));
  if(entity==='projects'){
    statements.push(env.DB.prepare(`DELETE FROM tasks WHERE project_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM projects WHERE id IN (${idSql})`).bind(...ids));
  }
  if(entity==='invoices'){
    statements.push(env.DB.prepare(`DELETE FROM invoice_items WHERE invoice_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM invoices WHERE id IN (${idSql})`).bind(...ids));
  }
  if(entity==='clients'){
    statements.push(env.DB.prepare(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE client_id IN (${idSql}))`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM tasks WHERE client_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM content_items WHERE client_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM invoices WHERE client_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM projects WHERE client_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM chat_messages WHERE client_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM user_client_access WHERE client_id IN (${idSql})`).bind(...ids));
    statements.push(env.DB.prepare(`DELETE FROM clients WHERE id IN (${idSql})`).bind(...ids));
  }
  if(!statements.length)return json({error:'Unsupported bulk delete'},400);
  await env.DB.batch(statements);
  await audit(env,user,'bulk.delete',entity,`${ids.length} record(s) permanently deleted`);
  return json({ok:true,deleted:ids.length});
}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname!=='/api/bulk')return core.fetch(req,env);
    if(req.method!=='POST')return json({error:'Method not allowed'},405);
    try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}
    let user:Identity;try{user=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
    const access=await accessFor(env,user);
    const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);
    const entity=String(body.entity||'') as Entity;if(!(entity in ENTITY_MODULE))return json({error:'Invalid module'},400);
    const ids=normalizeIds(body.ids);if(!ids.length)return json({error:'Select at least one record'},400);
    if(body.action==='delete')return bulkDelete(env,user,entity,ids);
    if(body.action==='status')return bulkStatus(env,user,access,entity,ids,String(body.status||''));
    return json({error:'Unsupported bulk action'},400);
  }
} satisfies ExportedHandler<Env>;
