import app from './index-chat-v12';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

const VERSION='v14.1.0';

function json(data:unknown,status=200,headers?:HeadersInit){
  const h=new Headers(headers);
  h.set('content-type','application/json; charset=utf-8');
  h.set('cache-control','no-store, max-age=0');
  h.set('x-content-type-options','nosniff');
  h.set('x-idealab-runtime',VERSION);
  return new Response(JSON.stringify(data),{status,headers:h});
}

function requestId(){
  const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}

async function columns(env:Env,table:string){
  const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all<{name:string}>();
  return new Set((r.results||[]).map(x=>String(x.name)));
}

async function addColumn(env:Env,table:string,name:string,definition:string){
  const c=await columns(env,table);
  if(!c.has(name))await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`).run();
}

async function ensureIdentitySchema(env:Env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'sales',
    active INTEGER NOT NULL DEFAULT 1,
    created_by_user_id INTEGER,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    password_salt TEXT,
    password_hash TEXT
  )`).run();
  await addColumn(env,'users','created_by_user_id','INTEGER');
  await addColumn(env,'users','last_login_at','TEXT');
  await addColumn(env,'users','updated_at','TEXT');
  await addColumn(env,'users','password_salt','TEXT');
  await addColumn(env,'users','password_hash','TEXT');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL DEFAULT 0
  )`).run();
}

async function ensureAccessSchema(env:Env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_access (
    user_id INTEGER PRIMARY KEY,
    leads INTEGER NOT NULL DEFAULT 1,
    clients INTEGER NOT NULL DEFAULT 1,
    projects INTEGER NOT NULL DEFAULT 1,
    tasks INTEGER NOT NULL DEFAULT 1,
    invoices INTEGER NOT NULL DEFAULT 1,
    content INTEGER NOT NULL DEFAULT 1,
    reports INTEGER NOT NULL DEFAULT 1,
    settings INTEGER NOT NULL DEFAULT 0,
    chat INTEGER NOT NULL DEFAULT 1,
    all_clients INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_client_access (
    user_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id,client_id)
  )`).run();
  for(const [name,definition] of [
    ['leads','INTEGER NOT NULL DEFAULT 1'],['clients','INTEGER NOT NULL DEFAULT 1'],['projects','INTEGER NOT NULL DEFAULT 1'],
    ['tasks','INTEGER NOT NULL DEFAULT 1'],['invoices','INTEGER NOT NULL DEFAULT 1'],['content','INTEGER NOT NULL DEFAULT 1'],
    ['reports','INTEGER NOT NULL DEFAULT 1'],['settings','INTEGER NOT NULL DEFAULT 0'],['chat','INTEGER NOT NULL DEFAULT 1'],
    ['all_clients','INTEGER NOT NULL DEFAULT 1'],['updated_at','TEXT']
  ] as const)await addColumn(env,'user_access',name,definition);
}

async function ensureChatSchema(env:Env){
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    client_id INTEGER,
    recipient_user_id INTEGER,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await addColumn(env,'chat_messages','recipient_user_id','INTEGER');
  await addColumn(env,'chat_messages','created_at','TEXT');
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_reads (
    user_id INTEGER NOT NULL,
    channel_key TEXT NOT NULL,
    last_message_id INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id,channel_key)
  )`).run();
}

async function preparePath(path:string,env:Env){
  if(path.startsWith('/api/users')||path.startsWith('/api/auth/')||path.startsWith('/api/me'))await ensureIdentitySchema(env);
  if(path.startsWith('/api/access')){await ensureIdentitySchema(env);await ensureAccessSchema(env);}
  if(path.startsWith('/api/chat')){await ensureIdentitySchema(env);await ensureAccessSchema(env);await ensureChatSchema(env);}
}

async function health(env:Env){
  await ensureIdentitySchema(env);
  await ensureAccessSchema(env);
  await ensureChatSchema(env);
  const required:{table:string;columns:string[]}[]=[
    {table:'users',columns:['id','name','email','role','active','password_salt','password_hash']},
    {table:'admin_sessions',columns:['session_hash','user_id','expires_at']},
    {table:'user_access',columns:['user_id','chat','all_clients']},
    {table:'user_client_access',columns:['user_id','client_id']},
    {table:'chat_messages',columns:['user_id','message','recipient_user_id']},
    {table:'chat_reads',columns:['user_id','channel_key','last_message_id']},
  ];
  const checks=[] as {table:string;ok:boolean;missing:string[]}[];
  for(const item of required){const c=await columns(env,item.table);const missing=item.columns.filter(x=>!c.has(x));checks.push({table:item.table,ok:missing.length===0,missing});}
  return checks;
}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    const id=requestId();
    try{
      if(url.pathname==='/api/runtime-health'){
        const checks=await health(env);
        return json({ok:checks.every(x=>x.ok),version:VERSION,checks});
      }

      // Important: do not run a whole-database migration before every request.
      // Earlier V14 did this and one unrelated legacy table could block team creation,
      // chat, or any other API with a generic 500. Repair only the schema needed by
      // the route being requested; each feature module keeps its own migrations too.
      if(url.pathname.startsWith('/api/'))await preparePath(url.pathname,env);

      const response=await app.fetch(req,env);
      const headers=new Headers(response.headers);
      headers.set('x-idealab-runtime',VERSION);
      headers.set('x-idealab-request-id',id);

      if(response.status<500)return new Response(response.body,{status:response.status,statusText:response.statusText,headers});

      const payload=await response.clone().json().catch(()=>null) as any;
      if(payload&&typeof payload.error==='string'&&payload.error.trim()){
        // Preserve the real feature error instead of replacing it with a generic one.
        return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
      }
      return json({error:`This action could not be completed. Reference ${id}.`,request_id:id},response.status,headers);
    }catch(error){
      console.error('IDEA LAB runtime error',id,error instanceof Error?error.message:String(error));
      return json({error:`This action could not be completed. Reference ${id}.`,request_id:id},500,{'x-idealab-request-id':id});
    }
  }
} satisfies ExportedHandler<Env>;
