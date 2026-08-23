import app from './index-chat-v12';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

const VERSION='v14.0.0';
let schemaReady=false;
let schemaPromise:Promise<void>|null=null;

function json(data:unknown,status=200,headers?:HeadersInit){
  const h=new Headers(headers);
  h.set('content-type','application/json; charset=utf-8');
  h.set('cache-control','no-store, max-age=0');
  h.set('x-content-type-options','nosniff');
  h.set('x-idealab-runtime',VERSION);
  return new Response(JSON.stringify(data),{status,headers:h});
}

async function tableColumns(env:Env,table:string){
  const result=await env.DB.prepare(`PRAGMA table_info(${table})`).all<{name:string}>();
  return new Set((result.results||[]).map(row=>String(row.name)));
}

async function ensureColumn(env:Env,table:string,column:string,definition:string){
  const columns=await tableColumns(env,table);
  if(!columns.has(column))await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

async function ensureBaseTables(env:Env){
  const statements=[
    `CREATE TABLE IF NOT EXISTS organization_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      role TEXT NOT NULL DEFAULT 'sales',active INTEGER NOT NULL DEFAULT 1,created_by_user_id INTEGER,last_login_at TEXT,
      created_at TEXT,updated_at TEXT,password_salt TEXT,password_hash TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,session_hash TEXT NOT NULL UNIQUE,user_id INTEGER NOT NULL,expires_at INTEGER NOT NULL,
      created_at TEXT,ip_address TEXT,user_agent TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS api_rate_limits (key TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,company TEXT,email TEXT,phone TEXT,status TEXT NOT NULL DEFAULT 'active',
      country TEXT,notes TEXT,created_at TEXT,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,company TEXT,email TEXT,phone TEXT,source TEXT,service TEXT,
      status TEXT NOT NULL DEFAULT 'new',value REAL NOT NULL DEFAULT 0,currency TEXT NOT NULL DEFAULT 'USD',next_action TEXT,
      next_action_at TEXT,owner_user_id INTEGER,notes TEXT,created_at TEXT,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,client_id INTEGER NOT NULL,name TEXT NOT NULL,type TEXT,status TEXT NOT NULL DEFAULT 'planned',
      start_date TEXT,due_date TEXT,budget REAL NOT NULL DEFAULT 0,currency TEXT NOT NULL DEFAULT 'USD',progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,project_id INTEGER,client_id INTEGER,title TEXT NOT NULL,description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',priority TEXT NOT NULL DEFAULT 'medium',assigned_user_id INTEGER,due_at TEXT,
      created_by_user_id INTEGER,checklist_json TEXT NOT NULL DEFAULT '[]',completed_at TEXT,created_at TEXT,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,client_id INTEGER NOT NULL,invoice_no TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'draft',
      amount REAL NOT NULL DEFAULT 0,currency TEXT NOT NULL DEFAULT 'USD',due_date TEXT,paid_at TEXT,notes TEXT,subtotal REAL NOT NULL DEFAULT 0,
      discount_type TEXT NOT NULL DEFAULT 'none',discount_value REAL NOT NULL DEFAULT 0,discount_amount REAL NOT NULL DEFAULT 0,
      created_at TEXT,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS content_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,client_id INTEGER,title TEXT NOT NULL,campaign TEXT,platform TEXT,format TEXT,
      status TEXT NOT NULL DEFAULT 'idea',publish_at TEXT,caption TEXT,asset_url TEXT,owner_user_id INTEGER,created_at TEXT,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,entity_type TEXT NOT NULL,entity_id INTEGER,action TEXT NOT NULL,detail TEXT,user_id INTEGER,
      ip_address TEXT,user_agent TEXT,created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,description TEXT,unit_price REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',active INTEGER NOT NULL DEFAULT 1,created_at TEXT,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,invoice_id INTEGER NOT NULL,service_id INTEGER,description TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,unit_price REAL NOT NULL DEFAULT 0,line_total REAL NOT NULL DEFAULT 0,sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS user_access (
      user_id INTEGER PRIMARY KEY,leads INTEGER NOT NULL DEFAULT 1,clients INTEGER NOT NULL DEFAULT 1,projects INTEGER NOT NULL DEFAULT 1,
      tasks INTEGER NOT NULL DEFAULT 1,invoices INTEGER NOT NULL DEFAULT 1,content INTEGER NOT NULL DEFAULT 1,reports INTEGER NOT NULL DEFAULT 1,
      settings INTEGER NOT NULL DEFAULT 0,chat INTEGER NOT NULL DEFAULT 1,all_clients INTEGER NOT NULL DEFAULT 1,updated_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS user_client_access (
      user_id INTEGER NOT NULL,client_id INTEGER NOT NULL,created_at TEXT,PRIMARY KEY(user_id,client_id)
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,client_id INTEGER,recipient_user_id INTEGER,message TEXT NOT NULL,created_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS chat_reads (
      user_id INTEGER NOT NULL,channel_key TEXT NOT NULL,last_message_id INTEGER NOT NULL DEFAULT 0,updated_at TEXT,
      PRIMARY KEY(user_id,channel_key)
    )`,
  ];
  for(const statement of statements)await env.DB.prepare(statement).run();
}

async function ensureLegacyColumns(env:Env){
  const columns:Array<[string,string,string]>=[
    ['organization_settings','updated_at','TEXT'],
    ['users','created_by_user_id','INTEGER'],['users','last_login_at','TEXT'],['users','created_at','TEXT'],['users','updated_at','TEXT'],['users','password_salt','TEXT'],['users','password_hash','TEXT'],
    ['admin_sessions','created_at','TEXT'],['admin_sessions','ip_address','TEXT'],['admin_sessions','user_agent','TEXT'],
    ['clients','company','TEXT'],['clients','email','TEXT'],['clients','phone','TEXT'],['clients','status',"TEXT NOT NULL DEFAULT 'active'"],['clients','country','TEXT'],['clients','notes','TEXT'],['clients','created_at','TEXT'],['clients','updated_at','TEXT'],
    ['leads','company','TEXT'],['leads','email','TEXT'],['leads','phone','TEXT'],['leads','source','TEXT'],['leads','service','TEXT'],['leads','status',"TEXT NOT NULL DEFAULT 'new'"],['leads','value','REAL NOT NULL DEFAULT 0'],['leads','currency',"TEXT NOT NULL DEFAULT 'USD'"],['leads','next_action','TEXT'],['leads','next_action_at','TEXT'],['leads','owner_user_id','INTEGER'],['leads','notes','TEXT'],['leads','created_at','TEXT'],['leads','updated_at','TEXT'],
    ['projects','type','TEXT'],['projects','status',"TEXT NOT NULL DEFAULT 'planned'"],['projects','start_date','TEXT'],['projects','due_date','TEXT'],['projects','budget','REAL NOT NULL DEFAULT 0'],['projects','currency',"TEXT NOT NULL DEFAULT 'USD'"],['projects','progress','INTEGER NOT NULL DEFAULT 0'],['projects','created_at','TEXT'],['projects','updated_at','TEXT'],
    ['tasks','description','TEXT'],['tasks','created_by_user_id','INTEGER'],['tasks','checklist_json',"TEXT NOT NULL DEFAULT '[]'"],['tasks','completed_at','TEXT'],['tasks','created_at','TEXT'],['tasks','updated_at','TEXT'],
    ['invoices','paid_at','TEXT'],['invoices','notes','TEXT'],['invoices','subtotal','REAL NOT NULL DEFAULT 0'],['invoices','discount_type',"TEXT NOT NULL DEFAULT 'none'"],['invoices','discount_value','REAL NOT NULL DEFAULT 0'],['invoices','discount_amount','REAL NOT NULL DEFAULT 0'],['invoices','created_at','TEXT'],['invoices','updated_at','TEXT'],
    ['content_items','campaign','TEXT'],['content_items','owner_user_id','INTEGER'],['content_items','created_at','TEXT'],['content_items','updated_at','TEXT'],
    ['activities','entity_id','INTEGER'],['activities','detail','TEXT'],['activities','user_id','INTEGER'],['activities','ip_address','TEXT'],['activities','user_agent','TEXT'],['activities','created_at','TEXT'],
    ['services','description','TEXT'],['services','unit_price','REAL NOT NULL DEFAULT 0'],['services','currency',"TEXT NOT NULL DEFAULT 'USD'"],['services','active','INTEGER NOT NULL DEFAULT 1'],['services','created_at','TEXT'],['services','updated_at','TEXT'],
    ['invoice_items','service_id','INTEGER'],['invoice_items','quantity','REAL NOT NULL DEFAULT 1'],['invoice_items','unit_price','REAL NOT NULL DEFAULT 0'],['invoice_items','line_total','REAL NOT NULL DEFAULT 0'],['invoice_items','sort_order','INTEGER NOT NULL DEFAULT 0'],['invoice_items','created_at','TEXT'],
    ['user_access','leads','INTEGER NOT NULL DEFAULT 1'],['user_access','clients','INTEGER NOT NULL DEFAULT 1'],['user_access','projects','INTEGER NOT NULL DEFAULT 1'],['user_access','tasks','INTEGER NOT NULL DEFAULT 1'],['user_access','invoices','INTEGER NOT NULL DEFAULT 1'],['user_access','content','INTEGER NOT NULL DEFAULT 1'],['user_access','reports','INTEGER NOT NULL DEFAULT 1'],['user_access','settings','INTEGER NOT NULL DEFAULT 0'],['user_access','chat','INTEGER NOT NULL DEFAULT 1'],['user_access','all_clients','INTEGER NOT NULL DEFAULT 1'],['user_access','updated_at','TEXT'],
    ['user_client_access','created_at','TEXT'],
    ['chat_messages','client_id','INTEGER'],['chat_messages','recipient_user_id','INTEGER'],['chat_messages','created_at','TEXT'],
    ['chat_reads','last_message_id','INTEGER NOT NULL DEFAULT 0'],['chat_reads','updated_at','TEXT'],
  ];
  for(const [table,column,definition] of columns)await ensureColumn(env,table,column,definition);
}

async function backfillAndIndex(env:Env){
  const now='CURRENT_TIMESTAMP';
  const timestampTables=['users','clients','leads','projects','tasks','invoices','content_items','activities','services','invoice_items','user_access','user_client_access','chat_messages','chat_reads'];
  for(const table of timestampTables){
    const columns=await tableColumns(env,table);
    if(columns.has('created_at'))await env.DB.prepare(`UPDATE ${table} SET created_at=${now} WHERE created_at IS NULL`).run();
    if(columns.has('updated_at'))await env.DB.prepare(`UPDATE ${table} SET updated_at=${now} WHERE updated_at IS NULL`).run();
  }
  const indexes=[
    'CREATE INDEX IF NOT EXISTS idx_users_email_v14 ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_active_v14 ON users(active)',
    'CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_v14 ON admin_sessions(expires_at)',
    'CREATE INDEX IF NOT EXISTS idx_projects_client_v14 ON projects(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_user_v14 ON tasks(assigned_user_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_client_v14 ON tasks(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_content_client_v14 ON content_items(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoices_client_v14 ON invoices(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_v14 ON invoice_items(invoice_id)',
    'CREATE INDEX IF NOT EXISTS idx_user_client_access_user_v14 ON user_client_access(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_chat_client_created_v14 ON chat_messages(client_id,created_at)',
    'CREATE INDEX IF NOT EXISTS idx_chat_recipient_created_v14 ON chat_messages(recipient_user_id,created_at)',
    'CREATE INDEX IF NOT EXISTS idx_chat_reads_user_v14 ON chat_reads(user_id)',
  ];
  for(const statement of indexes)await env.DB.prepare(statement).run();
}

async function migrate(env:Env){
  if(schemaReady)return;
  if(schemaPromise)return schemaPromise;
  schemaPromise=(async()=>{
    await ensureBaseTables(env);
    const row=await env.DB.prepare("SELECT value FROM organization_settings WHERE key='runtime_schema_version' LIMIT 1").first<{value:string}>();
    if(row?.value===VERSION){schemaReady=true;return}
    await ensureLegacyColumns(env);
    await backfillAndIndex(env);
    await env.DB.prepare(`INSERT INTO organization_settings(key,value,updated_at) VALUES('runtime_schema_version',?,CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(VERSION).run();
    schemaReady=true;
  })().finally(()=>{if(!schemaReady)schemaPromise=null});
  return schemaPromise;
}

function requestId(){const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    const id=requestId();
    try{
      if(url.pathname.startsWith('/api/'))await migrate(env);
      if(url.pathname==='/api/runtime-health')return json({ok:true,version:VERSION,database:'ready'});
      const response=await app.fetch(req,env);
      const headers=new Headers(response.headers);headers.set('x-idealab-runtime',VERSION);headers.set('x-idealab-request-id',id);
      if(response.status<500)return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
      const clone=response.clone();
      const payload=await clone.json().catch(()=>null) as any;
      if(payload&&typeof payload==='object'&&typeof payload.error==='string'&&payload.error.trim())return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
      return json({error:'This action could not be completed. Please retry once. If it still fails, send IDEA LAB support request ID '+id,request_id:id},response.status,headers);
    }catch(error){
      console.error('IDEA LAB runtime error',id,error instanceof Error?error.message:String(error));
      const message=url.pathname==='/api/runtime-health'?'Database repair failed':'This action could not be completed. The system protected your data. Please retry once.';
      return json({error:message,request_id:id},url.pathname==='/api/runtime-health'?503:500,{'x-idealab-request-id':id});
    }
  }
} satisfies ExportedHandler<Env>;
