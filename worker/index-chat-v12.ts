import core from './index-bulk-v6';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role='super_admin'|'admin'|'sales'|'project_manager'|'finance'|'content';
type Identity={id:number;name:string;email:string;role:Role;active:number};
type AccessRow={chat?:number;all_clients?:number};
type ConversationType='general'|'client'|'dm';
const SESSION_COOKIE='idealab_admin_session';
let chatSchemaReady=false;

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff'}})}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
async function sha256Hex(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(digest))}
function cookieValue(req:Request,name:string){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const[key,...rest]=part.trim().split('=');if(key===name)return decodeURIComponent(rest.join('='))}return null}
function cleanText(value:unknown,max=1500){if(typeof value!=='string')return null;const v=value.trim();if(!v||v.length>max)return null;return v}
function cleanId(value:unknown){const n=Number(value);return Number.isInteger(n)&&n>0?n:null}
function requireWrite(req:Request){const url=new URL(req.url);if(req.headers.get('origin')!==url.origin)throw new Error('origin');if(req.headers.get('x-requested-with')!=='idealab-admin')throw new Error('csrf');if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new Error('json')}

async function identity(req:Request,env:Env):Promise<Identity>{
  const token=cookieValue(req,SESSION_COOKIE);if(!token)throw new Error('auth');
  const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1`).bind(hash).first<any>();
  if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000))throw new Error('auth');
  return{id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role as Role,active:Number(row.active)};
}

async function ensureChatSchema(env:Env){
  if(chatSchemaReady)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,client_id INTEGER,message TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  const cols=await env.DB.prepare('PRAGMA table_info(chat_messages)').all<{name:string}>();
  if(!(cols.results||[]).some(c=>String(c.name)==='recipient_user_id'))await env.DB.prepare('ALTER TABLE chat_messages ADD COLUMN recipient_user_id INTEGER').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_reads (user_id INTEGER NOT NULL,channel_key TEXT NOT NULL,last_message_id INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,channel_key))`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_chat_recipient_created ON chat_messages(recipient_user_id,created_at)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON chat_reads(user_id)').run();
  chatSchemaReady=true;
}

async function accessRow(env:Env,user:Identity):Promise<AccessRow>{
  if(user.role==='super_admin')return{chat:1,all_clients:1};
  const row=await env.DB.prepare('SELECT chat,all_clients FROM user_access WHERE user_id=? LIMIT 1').bind(user.id).first<any>();
  return row?{chat:Number(row.chat),all_clients:Number(row.all_clients)}:{chat:1,all_clients:1};
}

async function allowedClients(env:Env,user:Identity,access:AccessRow){
  if(user.role==='super_admin'||access.all_clients!==0)return env.DB.prepare(`SELECT id,name,company,status FROM clients WHERE status!='inactive' ORDER BY name ASC`).all<any>();
  return env.DB.prepare(`SELECT c.id,c.name,c.company,c.status FROM clients c JOIN user_client_access a ON a.client_id=c.id WHERE a.user_id=? AND c.status!='inactive' ORDER BY c.name ASC`).bind(user.id).all<any>();
}

function parseChannel(raw:string|null):{type:ConversationType;targetId:number|null;key:string}|null{
  const value=(raw||'general').trim();
  if(value==='general')return{type:'general',targetId:null,key:'general'};
  const m=/^(client|dm):(\d+)$/.exec(value);if(!m)return null;
  const id=Number(m[2]);if(!Number.isInteger(id)||id<=0)return null;
  return{type:m[1] as ConversationType,targetId:id,key:`${m[1]}:${id}`};
}

async function canUseClient(env:Env,user:Identity,access:AccessRow,clientId:number){
  if(user.role==='super_admin'||access.all_clients!==0)return !!(await env.DB.prepare('SELECT id FROM clients WHERE id=? LIMIT 1').bind(clientId).first());
  return !!(await env.DB.prepare('SELECT 1 ok FROM user_client_access WHERE user_id=? AND client_id=? LIMIT 1').bind(user.id,clientId).first());
}

async function canUseDm(env:Env,user:Identity,targetId:number){
  if(targetId===user.id)return false;
  return !!(await env.DB.prepare('SELECT id FROM users WHERE id=? AND active=1 LIMIT 1').bind(targetId).first());
}

async function validateChannel(env:Env,user:Identity,access:AccessRow,channel:{type:ConversationType;targetId:number|null;key:string}){
  if(channel.type==='client')return channel.targetId!==null&&await canUseClient(env,user,access,channel.targetId);
  if(channel.type==='dm')return channel.targetId!==null&&await canUseDm(env,user,channel.targetId);
  return true;
}

async function conversations(env:Env,user:Identity,access:AccessRow){
  const clients=(await allowedClients(env,user,access)).results||[];
  const people=(await env.DB.prepare('SELECT id,name,role FROM users WHERE active=1 AND id<>? ORDER BY name ASC').bind(user.id).all<any>()).results||[];
  const reads=(await env.DB.prepare('SELECT channel_key,last_message_id FROM chat_reads WHERE user_id=?').bind(user.id).all<any>()).results||[];
  const readMap=new Map<string,number>(reads.map((r:any)=>[String(r.channel_key),Number(r.last_message_id||0)]));

  const generalLast=await env.DB.prepare(`SELECT m.id,m.message,m.created_at,m.user_id,u.name user_name FROM chat_messages m JOIN users u ON u.id=m.user_id WHERE m.client_id IS NULL AND m.recipient_user_id IS NULL ORDER BY m.id DESC LIMIT 1`).first<any>();
  const generalUnread=await env.DB.prepare(`SELECT COUNT(*) count FROM chat_messages WHERE client_id IS NULL AND recipient_user_id IS NULL AND user_id<>? AND id>?`).bind(user.id,readMap.get('general')||0).first<any>();

  const clientLastRows=(await env.DB.prepare(`SELECT m.id,m.client_id target_id,m.message,m.created_at,m.user_id,u.name user_name FROM chat_messages m JOIN users u ON u.id=m.user_id JOIN (SELECT client_id,MAX(id) max_id FROM chat_messages WHERE client_id IS NOT NULL AND recipient_user_id IS NULL GROUP BY client_id) x ON x.max_id=m.id`).all<any>()).results||[];
  const clientLast=new Map<number,any>(clientLastRows.map((r:any)=>[Number(r.target_id),r]));
  const clientUnreadRows=(await env.DB.prepare(`SELECT m.client_id target_id,COUNT(*) count FROM chat_messages m LEFT JOIN chat_reads r ON r.user_id=? AND r.channel_key=('client:'||m.client_id) WHERE m.client_id IS NOT NULL AND m.recipient_user_id IS NULL AND m.user_id<>? AND m.id>COALESCE(r.last_message_id,0) GROUP BY m.client_id`).bind(user.id,user.id).all<any>()).results||[];
  const clientUnread=new Map<number,number>(clientUnreadRows.map((r:any)=>[Number(r.target_id),Number(r.count||0)]));

  const dmLastRows=(await env.DB.prepare(`SELECT x.peer_id target_id,m.id,m.message,m.created_at,m.user_id,u.name user_name FROM (SELECT CASE WHEN user_id=? THEN recipient_user_id ELSE user_id END peer_id,MAX(id) max_id FROM chat_messages WHERE client_id IS NULL AND recipient_user_id IS NOT NULL AND (user_id=? OR recipient_user_id=?) GROUP BY peer_id) x JOIN chat_messages m ON m.id=x.max_id JOIN users u ON u.id=m.user_id`).bind(user.id,user.id,user.id).all<any>()).results||[];
  const dmLast=new Map<number,any>(dmLastRows.map((r:any)=>[Number(r.target_id),r]));
  const dmUnreadRows=(await env.DB.prepare(`SELECT m.user_id target_id,COUNT(*) count FROM chat_messages m LEFT JOIN chat_reads r ON r.user_id=? AND r.channel_key=('dm:'||m.user_id) WHERE m.recipient_user_id=? AND m.user_id<>? AND m.id>COALESCE(r.last_message_id,0) GROUP BY m.user_id`).bind(user.id,user.id,user.id).all<any>()).results||[];
  const dmUnread=new Map<number,number>(dmUnreadRows.map((r:any)=>[Number(r.target_id),Number(r.count||0)]));

  const items:any[]=[{key:'general',type:'general',target_id:null,title:'Team chat',subtitle:'Everyone with chat access',avatar:'#',last_message:generalLast?.message||'',last_at:generalLast?.created_at||null,last_sender:generalLast?.user_name||null,unread:Number(generalUnread?.count||0)}];
  for(const c of clients){const id=Number(c.id),last=clientLast.get(id);items.push({key:`client:${id}`,type:'client',target_id:id,title:String(c.name),subtitle:String(c.company||'Client channel'),avatar:String(c.name||'C').slice(0,1).toUpperCase(),last_message:last?.message||'',last_at:last?.created_at||null,last_sender:last?.user_name||null,unread:clientUnread.get(id)||0})}
  for(const p of people){const id=Number(p.id),last=dmLast.get(id);items.push({key:`dm:${id}`,type:'dm',target_id:id,title:String(p.name),subtitle:String(p.role||'team').replaceAll('_',' '),avatar:String(p.name||'T').slice(0,1).toUpperCase(),last_message:last?.message||'',last_at:last?.created_at||null,last_sender:last?.user_name||null,unread:dmUnread.get(id)||0})}
  items.sort((a,b)=>{if(a.key==='general')return-1;if(b.key==='general')return 1;const at=a.last_at?new Date(a.last_at).getTime():0,bt=b.last_at?new Date(b.last_at).getTime():0;return bt-at||a.title.localeCompare(b.title)});
  return json({results:items,total_unread:items.reduce((n,x)=>n+Number(x.unread||0),0)});
}

async function messages(req:Request,env:Env,user:Identity,access:AccessRow){
  const url=new URL(req.url),channel=parseChannel(url.searchParams.get('channel'));if(!channel)return json({error:'Invalid chat channel'},400);if(!(await validateChannel(env,user,access,channel)))return json({error:'You do not have access to this conversation'},403);
  let rows:D1Result<any>;
  if(channel.type==='general')rows=await env.DB.prepare(`SELECT m.id,m.user_id,m.client_id,m.recipient_user_id,m.message,m.created_at,u.name user_name,u.role user_role FROM chat_messages m JOIN users u ON u.id=m.user_id WHERE m.client_id IS NULL AND m.recipient_user_id IS NULL ORDER BY m.id DESC LIMIT 120`).all<any>();
  else if(channel.type==='client')rows=await env.DB.prepare(`SELECT m.id,m.user_id,m.client_id,m.recipient_user_id,m.message,m.created_at,u.name user_name,u.role user_role FROM chat_messages m JOIN users u ON u.id=m.user_id WHERE m.client_id=? AND m.recipient_user_id IS NULL ORDER BY m.id DESC LIMIT 120`).bind(channel.targetId).all<any>();
  else rows=await env.DB.prepare(`SELECT m.id,m.user_id,m.client_id,m.recipient_user_id,m.message,m.created_at,u.name user_name,u.role user_role FROM chat_messages m JOIN users u ON u.id=m.user_id WHERE m.client_id IS NULL AND ((m.user_id=? AND m.recipient_user_id=?) OR (m.user_id=? AND m.recipient_user_id=?)) ORDER BY m.id DESC LIMIT 120`).bind(user.id,channel.targetId,channel.targetId,user.id).all<any>();
  const ordered=[...(rows.results||[])].reverse();
  const last=ordered.at(-1)?.id||0;if(last)await env.DB.prepare(`INSERT INTO chat_reads(user_id,channel_key,last_message_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,channel_key) DO UPDATE SET last_message_id=MAX(chat_reads.last_message_id,excluded.last_message_id),updated_at=CURRENT_TIMESTAMP`).bind(user.id,channel.key,last).run();
  return json({results:ordered,channel:channel.key});
}

async function send(req:Request,env:Env,user:Identity,access:AccessRow){
  try{requireWrite(req)}catch{return json({error:'Invalid request'},403)}
  const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);const channel=parseChannel(String(body.channel||'general'));if(!channel)return json({error:'Invalid chat channel'},400);if(!(await validateChannel(env,user,access,channel)))return json({error:'You do not have access to this conversation'},403);const message=cleanText(body.message);if(!message)return json({error:'Message is required and must be under 1500 characters'},400);
  const clientId=channel.type==='client'?channel.targetId:null,recipientId=channel.type==='dm'?channel.targetId:null;
  const result=await env.DB.prepare('INSERT INTO chat_messages(user_id,client_id,recipient_user_id,message) VALUES(?,?,?,?)').bind(user.id,clientId,recipientId,message).run();
  const id=Number(result.meta.last_row_id||0);if(id)await env.DB.prepare(`INSERT INTO chat_reads(user_id,channel_key,last_message_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,channel_key) DO UPDATE SET last_message_id=MAX(chat_reads.last_message_id,excluded.last_message_id),updated_at=CURRENT_TIMESTAMP`).bind(user.id,channel.key,id).run();
  return json({ok:true,id},201);
}

async function markRead(req:Request,env:Env,user:Identity,access:AccessRow){
  try{requireWrite(req)}catch{return json({error:'Invalid request'},403)}const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);const channel=parseChannel(String(body.channel||''));if(!channel||!(await validateChannel(env,user,access,channel)))return json({error:'Invalid chat channel'},400);const id=cleanId(body.last_message_id)||0;await env.DB.prepare(`INSERT INTO chat_reads(user_id,channel_key,last_message_id,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,channel_key) DO UPDATE SET last_message_id=MAX(chat_reads.last_message_id,excluded.last_message_id),updated_at=CURRENT_TIMESTAMP`).bind(user.id,channel.key,id).run();return json({ok:true});
}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const path=new URL(req.url).pathname;if(!path.startsWith('/api/chat-v2'))return core.fetch(req,env);
    let user:Identity;try{user=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
    await ensureChatSchema(env);const access=await accessRow(env,user);if(access.chat===0)return json({error:'Chat access is disabled for this account'},403);
    if(path==='/api/chat-v2/conversations'&&req.method==='GET')return conversations(env,user,access);
    if(path==='/api/chat-v2/messages'&&req.method==='GET')return messages(req,env,user,access);
    if(path==='/api/chat-v2/messages'&&req.method==='POST')return send(req,env,user,access);
    if(path==='/api/chat-v2/read'&&req.method==='POST')return markRead(req,env,user,access);
    return json({error:'Method not allowed'},405);
  }
} satisfies ExportedHandler<Env>;
