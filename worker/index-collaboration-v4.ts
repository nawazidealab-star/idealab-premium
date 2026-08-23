import core from './index-invoicing-v3';

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
type AccessMap = Record<ModuleKey, boolean> & { all_clients:boolean };

const SESSION_COOKIE='idealab_admin_session';
const TASK_STATUSES=['todo','in_progress','review','done','cancelled'];
const TASK_PRIORITIES=['low','medium','high','urgent'];
const SERVICE_ROLES=new Set<Role>(['super_admin','admin','finance']);
const CURRENCIES=new Set(['USD','PKR','AUD','GBP','EUR','AED','CAD','SAR','QAR','NZD','SGD','INR','CNY','JPY','CHF','KWD','BHD','OMR']);
let schemaReady=false;
let fxCache:{expires:number;rates:Record<string,number>}|null=null;

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store, max-age=0','x-content-type-options':'nosniff','x-frame-options':'DENY','referrer-policy':'no-referrer'}})}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
async function sha256Hex(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(digest))}
function cookieValue(req:Request,name:string){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const[key,...rest]=part.trim().split('=');if(key===name)return decodeURIComponent(rest.join('='))}return null}
function cleanText(value:unknown,max=5000){if(value===undefined||value===null||value==='')return null;if(typeof value!=='string')throw new Error('validation');const v=value.trim();if(v.length>max)throw new Error('validation');return v||null}
function cleanId(value:unknown){if(value===undefined||value===null||value==='')return null;const n=Number(value);if(!Number.isInteger(n)||n<=0)throw new Error('validation');return n}
function cleanCurrency(value:unknown){const code=String(value||'USD').trim().toUpperCase();if(!CURRENCIES.has(code))throw new Error('currency');return code}
function requireWriteOrigin(req:Request){if(!['POST','PATCH','PUT','DELETE'].includes(req.method))return;const url=new URL(req.url);if(req.headers.get('origin')!==url.origin)throw new Error('origin');if(req.headers.get('x-requested-with')!=='idealab-admin')throw new Error('csrf');if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new Error('json')}

async function identity(req:Request,env:Env):Promise<Identity>{
  const token=cookieValue(req,SESSION_COOKIE);if(!token)throw new Error('auth');
  const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1`).bind(hash).first<any>();
  if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000))throw new Error('auth');
  return{id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role as Role,active:Number(row.active)};
}

async function ensureColumn(env:Env,table:string,column:string,sql:string){const info=await env.DB.prepare(`PRAGMA table_info(${table})`).all<{name:string}>();if(!(info.results||[]).some(r=>String(r.name)===column))await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${sql}`).run()}

async function ensureSchema(env:Env){
  if(schemaReady)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS organization_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_access (
    user_id INTEGER PRIMARY KEY,
    leads INTEGER NOT NULL DEFAULT 1,clients INTEGER NOT NULL DEFAULT 1,projects INTEGER NOT NULL DEFAULT 1,tasks INTEGER NOT NULL DEFAULT 1,
    invoices INTEGER NOT NULL DEFAULT 1,content INTEGER NOT NULL DEFAULT 1,reports INTEGER NOT NULL DEFAULT 1,settings INTEGER NOT NULL DEFAULT 0,chat INTEGER NOT NULL DEFAULT 1,
    all_clients INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_client_access (user_id INTEGER NOT NULL,client_id INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(user_id,client_id))`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,client_id INTEGER,message TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_chat_client_created ON chat_messages(client_id,created_at)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_user_client_access_user ON user_client_access(user_id)').run();
  await ensureColumn(env,'tasks','description','description TEXT');
  await ensureColumn(env,'tasks','created_by_user_id','created_by_user_id INTEGER');
  await ensureColumn(env,'tasks','checklist_json',"checklist_json TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(env,'tasks','completed_at','completed_at TEXT');
  await ensureColumn(env,'content_items','campaign','campaign TEXT');
  await ensureColumn(env,'content_items','owner_user_id','owner_user_id INTEGER');
  schemaReady=true;
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

async function allowedClientIds(env:Env,user:Identity,access:AccessMap){if(user.role==='super_admin'||access.all_clients)return null;const rows=await env.DB.prepare('SELECT client_id FROM user_client_access WHERE user_id=?').bind(user.id).all<{client_id:number}>();return new Set((rows.results||[]).map(r=>Number(r.client_id)))}
async function canUseClient(env:Env,user:Identity,access:AccessMap,clientId:number|null){if(clientId===null)return true;const ids=await allowedClientIds(env,user,access);return ids===null||ids.has(clientId)}
async function requireClient(env:Env,user:Identity,access:AccessMap,clientId:number|null){if(!(await canUseClient(env,user,access,clientId)))throw new Error('client-access')}

function moduleForPath(path:string):ModuleKey|null{
  if(path.startsWith('/api/leads'))return'leads';if(path.startsWith('/api/clients')||path.startsWith('/api/client-workspaces'))return'clients';
  if(path.startsWith('/api/projects'))return'projects';if(path.startsWith('/api/tasks'))return'tasks';if(path.startsWith('/api/invoices')||path.startsWith('/api/services'))return'invoices';
  if(path.startsWith('/api/content_items'))return'content';if(path.startsWith('/api/reports'))return'reports';if(path.startsWith('/api/chat'))return'chat';if(path.startsWith('/api/access')||path.startsWith('/api/settings/'))return'settings';return null;
}

async function getSetting(env:Env,key:string,fallback:string){const row=await env.DB.prepare('SELECT value FROM organization_settings WHERE key=? LIMIT 1').bind(key).first<{value:string}>();return row?.value||fallback}
async function setSetting(env:Env,key:string,value:string){await env.DB.prepare(`INSERT INTO organization_settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP`).bind(key,value).run()}

async function fxRates(){
  if(fxCache&&fxCache.expires>Date.now())return fxCache.rates;
  const response=await fetch('https://open.er-api.com/v6/latest/USD',{headers:{accept:'application/json'}});if(!response.ok)throw new Error('fx');
  const payload=await response.json() as any;if(payload?.result!=='success'||!payload?.rates?.USD)throw new Error('fx');
  fxCache={expires:Date.now()+6*60*60*1000,rates:payload.rates};return payload.rates as Record<string,number>;
}
function convert(amount:number,from:string,to:string,rates:Record<string,number>){if(from===to)return amount;const a=rates[from],b=rates[to];if(!a||!b)throw new Error('fx');return Math.round(((amount/a)*b)*100)/100}

async function handleBaseCurrency(req:Request,env:Env,user:Identity){
  const current=await getSetting(env,'base_currency','USD');
  if(req.method==='GET')return json({base_currency:current});
  if(req.method!=='PATCH')return json({error:'Method not allowed'},405);
  if(user.role!=='super_admin')return json({error:'Super Admin access required'},403);
  try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}
  const body=await req.json().catch(()=>({})) as any;let next:string;try{next=cleanCurrency(body.currency)}catch{return json({error:'Invalid currency'},400)}
  if(next===current){return json({ok:true,base_currency:next,services_updated:0})}
  try{
    const rates=await fxRates();const services=await env.DB.prepare('SELECT id,unit_price,currency FROM services').all<any>();const statements=[] as D1PreparedStatement[];
    for(const service of services.results||[]){const from=cleanCurrency(service.currency||current);const price=convert(Number(service.unit_price||0),from,next,rates);statements.push(env.DB.prepare('UPDATE services SET unit_price=?,currency=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(price,next,service.id))}
    if(statements.length)await env.DB.batch(statements);await setSetting(env,'base_currency',next);
    return json({ok:true,base_currency:next,services_updated:statements.length});
  }catch{return json({error:'Currency conversion is temporarily unavailable. Nothing was changed.'},503)}
}

async function handleServices(req:Request,env:Env,user:Identity){
  if(!SERVICE_ROLES.has(user.role))return json({error:'Finance access required'},403);
  const base=await getSetting(env,'base_currency','USD');const parts=new URL(req.url).pathname.split('/').filter(Boolean);
  if(req.method==='GET'){const rows=await env.DB.prepare('SELECT id,name,description,unit_price,currency,active,created_at,updated_at FROM services ORDER BY active DESC,name ASC').all();return json({...rows,base_currency:base})}
  try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}
  const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);
  const name=cleanText(body.name,140);if(req.method==='POST'){
    if(!name)return json({error:'Service name is required'},400);const price=Number(body.unit_price||0);if(!Number.isFinite(price)||price<0)return json({error:'Invalid service price'},400);
    const result=await env.DB.prepare('INSERT INTO services(name,description,unit_price,currency,active) VALUES(?,?,?,?,?)').bind(name,cleanText(body.description,2000),Math.round(price*100)/100,base,body.active===false?0:1).run();
    return json({ok:true,id:Number(result.meta.last_row_id)},201);
  }
  if(req.method==='PATCH'&&parts[2]){
    const id=Number(parts[2]);const existing=await env.DB.prepare('SELECT * FROM services WHERE id=?').bind(id).first<any>();if(!existing)return json({error:'Service not found'},404);
    const nextName=body.name===undefined?existing.name:name;if(!nextName)return json({error:'Service name is required'},400);const price=body.unit_price===undefined?Number(existing.unit_price):Number(body.unit_price);if(!Number.isFinite(price)||price<0)return json({error:'Invalid service price'},400);
    await env.DB.prepare('UPDATE services SET name=?,description=?,unit_price=?,currency=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(nextName,body.description===undefined?existing.description:cleanText(body.description,2000),Math.round(price*100)/100,base,body.active===undefined?existing.active:(body.active?1:0),id).run();return json({ok:true});
  }
  return json({error:'Method not allowed'},405);
}

async function handleAccess(req:Request,env:Env,user:Identity){
  const url=new URL(req.url);const parts=url.pathname.split('/').filter(Boolean);
  if(url.pathname==='/api/access/me'&&req.method==='GET')return json({access:await accessFor(env,user),user});
  if(user.role!=='super_admin')return json({error:'Super Admin access required'},403);
  if(url.pathname==='/api/access/users'&&req.method==='GET'){
    const users=await env.DB.prepare('SELECT id,name,email,role,active,last_login_at FROM users ORDER BY active DESC,name ASC').all<any>();const result=[];
    for(const row of users.results||[]){const u:Identity={id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role as Role,active:Number(row.active)};const access=await accessFor(env,u);const ids=await env.DB.prepare('SELECT client_id FROM user_client_access WHERE user_id=? ORDER BY client_id').bind(u.id).all<{client_id:number}>();result.push({...row,access,client_ids:(ids.results||[]).map(x=>Number(x.client_id))})}
    return json({results:result});
  }
  if(req.method==='PATCH'&&parts[2]==='users'&&parts[3]){
    try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}const targetId=Number(parts[3]);if(!Number.isInteger(targetId)||targetId<=0)return json({error:'Invalid user'},400);const target=await env.DB.prepare('SELECT id,role FROM users WHERE id=?').bind(targetId).first<any>();if(!target)return json({error:'User not found'},404);if(target.role==='super_admin')return json({error:'Super Admin always keeps full access'},400);
    const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);const base=roleDefaults(target.role as Role);const incoming=body.access||{};const flag=(key:ModuleKey)=>base[key]&&incoming[key]!==false?1:0;const allClients=body.all_clients===false?0:1;
    await env.DB.prepare(`INSERT INTO user_access(user_id,leads,clients,projects,tasks,invoices,content,reports,settings,chat,all_clients,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET leads=excluded.leads,clients=excluded.clients,projects=excluded.projects,tasks=excluded.tasks,invoices=excluded.invoices,content=excluded.content,reports=excluded.reports,settings=excluded.settings,chat=excluded.chat,all_clients=excluded.all_clients,updated_at=CURRENT_TIMESTAMP`)
      .bind(targetId,flag('leads'),flag('clients'),flag('projects'),flag('tasks'),flag('invoices'),flag('content'),flag('reports'),0,incoming.chat===false?0:1,allClients).run();
    if(Array.isArray(body.client_ids)){await env.DB.prepare('DELETE FROM user_client_access WHERE user_id=?').bind(targetId).run();if(!allClients){const ids=[...new Set(body.client_ids.map(Number).filter((x:number)=>Number.isInteger(x)&&x>0))];if(ids.length)await env.DB.batch(ids.map((id:number)=>env.DB.prepare('INSERT OR IGNORE INTO user_client_access(user_id,client_id) VALUES(?,?)').bind(targetId,id)))}}
    return json({ok:true});
  }
  return json({error:'Not found'},404);
}

async function handleClientWorkspaces(env:Env,user:Identity,access:AccessMap){
  if(!access.clients)return json({error:'Client access required'},403);const ids=await allowedClientIds(env,user,access);let where='';const binds:unknown[]=[];if(ids!==null){const list=[...ids];if(!list.length)return json({results:[]});where=`WHERE c.id IN (${list.map(()=>'?').join(',')})`;binds.push(...list)}
  const financial=user.role==='super_admin'||user.role==='admin'||user.role==='finance';
  const sql=`SELECT c.*,
    (SELECT COUNT(*) FROM projects p WHERE p.client_id=c.id AND p.status NOT IN ('done','cancelled')) active_projects,
    (SELECT COUNT(*) FROM tasks t WHERE t.client_id=c.id AND t.status NOT IN ('done','cancelled')) open_tasks,
    (SELECT COUNT(*) FROM content_items ci WHERE ci.client_id=c.id AND ci.status NOT IN ('published','cancelled')) content_queue,
    ${financial?"(SELECT COUNT(*) FROM invoices i WHERE i.client_id=c.id AND i.status IN ('sent','due'))":"0"} open_invoices
    FROM clients c ${where} ORDER BY CASE c.status WHEN 'active' THEN 0 ELSE 1 END,c.name ASC`;
  return json(await env.DB.prepare(sql).bind(...binds).all());
}

async function handleScopedClients(req:Request,env:Env,user:Identity,access:AccessMap){
  const ids=await allowedClientIds(env,user,access);if(req.method==='GET'&&ids!==null){const list=[...ids];if(!list.length)return json({results:[]});return json(await env.DB.prepare(`SELECT * FROM clients WHERE id IN (${list.map(()=>'?').join(',')}) ORDER BY name ASC`).bind(...list).all())}
  if(req.method==='POST'&&ids!==null){const response=await core.fetch(req,env);if(response.ok){const payload=await response.clone().json().catch(()=>null) as any;if(payload?.id)await env.DB.prepare('INSERT OR IGNORE INTO user_client_access(user_id,client_id) VALUES(?,?)').bind(user.id,Number(payload.id)).run()}return response}
  return core.fetch(req,env);
}

async function validateClientWrite(req:Request,env:Env,user:Identity,access:AccessMap,path:string){
  if(!['POST','PATCH'].includes(req.method))return null;const body=await req.clone().json().catch(()=>null) as any;if(!body)return null;let clientId=cleanId(body.client_id);
  if(req.method==='PATCH'&&clientId===null){const parts=path.split('/').filter(Boolean);const id=Number(parts[2]);if(path.startsWith('/api/projects/'))clientId=(await env.DB.prepare('SELECT client_id FROM projects WHERE id=?').bind(id).first<any>())?.client_id??null;else if(path.startsWith('/api/content_items/'))clientId=(await env.DB.prepare('SELECT client_id FROM content_items WHERE id=?').bind(id).first<any>())?.client_id??null;else if(path.startsWith('/api/invoices/'))clientId=(await env.DB.prepare('SELECT client_id FROM invoices WHERE id=?').bind(id).first<any>())?.client_id??null}
  await requireClient(env,user,access,clientId);return null;
}

async function handleScopedGet(req:Request,env:Env,user:Identity,access:AccessMap,path:string){
  if(req.method!=='GET')return null;const ids=await allowedClientIds(env,user,access);if(ids===null)return null;const list=[...ids];if(!list.length)return json({results:[]});const placeholders=list.map(()=>'?').join(',');
  if(path==='/api/projects')return json(await env.DB.prepare(`SELECT p.*,c.name client_name FROM projects p LEFT JOIN clients c ON c.id=p.client_id WHERE p.client_id IN (${placeholders}) ORDER BY p.id DESC`).bind(...list).all());
  if(path==='/api/content_items')return json(await env.DB.prepare(`SELECT ci.*,c.name client_name,u.name owner_name FROM content_items ci LEFT JOIN clients c ON c.id=ci.client_id LEFT JOIN users u ON u.id=ci.owner_user_id WHERE ci.client_id IS NULL OR ci.client_id IN (${placeholders}) ORDER BY ci.publish_at IS NULL,ci.publish_at ASC,ci.id DESC`).bind(...list).all());
  if(path==='/api/invoices')return json(await env.DB.prepare(`SELECT i.*,c.name client_name FROM invoices i LEFT JOIN clients c ON c.id=i.client_id WHERE i.client_id IN (${placeholders}) ORDER BY i.id DESC`).bind(...list).all());
  return null;
}

async function handleTasks(req:Request,env:Env,user:Identity,access:AccessMap){
  const url=new URL(req.url);const parts=url.pathname.split('/').filter(Boolean);const superAdmin=user.role==='super_admin';
  if(req.method==='GET'){
    const mine=url.searchParams.get('mine')==='1';const filters:string[]=[];const values:unknown[]=[];if(!superAdmin||mine){filters.push('t.assigned_user_id=?');values.push(user.id)}
    const clientId=cleanId(url.searchParams.get('client_id'));if(clientId){await requireClient(env,user,access,clientId);filters.push('t.client_id=?');values.push(clientId)}const assignee=cleanId(url.searchParams.get('assignee'));if(superAdmin&&assignee){filters.push('t.assigned_user_id=?');values.push(assignee)}
    const where=filters.length?`WHERE ${filters.join(' AND ')}`:'';return json(await env.DB.prepare(`SELECT t.*,p.name project_name,c.name client_name,u.name assignee_name,creator.name created_by_name FROM tasks t LEFT JOIN projects p ON p.id=t.project_id LEFT JOIN clients c ON c.id=t.client_id LEFT JOIN users u ON u.id=t.assigned_user_id LEFT JOIN users creator ON creator.id=t.created_by_user_id ${where} ORDER BY CASE t.status WHEN 'done' THEN 1 WHEN 'cancelled' THEN 2 ELSE 0 END,t.due_at IS NULL,t.due_at ASC,t.id DESC LIMIT 750`).bind(...values).all());
  }
  try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);
  if(req.method==='POST'){
    const title=cleanText(body.title,220);if(!title)return json({error:'Task title is required'},400);const status=TASK_STATUSES.includes(String(body.status))?String(body.status):'todo';const priority=TASK_PRIORITIES.includes(String(body.priority))?String(body.priority):'medium';const clientId=cleanId(body.client_id);await requireClient(env,user,access,clientId);const assigned=superAdmin?(cleanId(body.assigned_user_id)||user.id):user.id;const checklist=Array.isArray(body.checklist)?body.checklist.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,30):[];
    const result=await env.DB.prepare('INSERT INTO tasks(project_id,client_id,title,description,status,priority,assigned_user_id,due_at,created_by_user_id,checklist_json,completed_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(cleanId(body.project_id),clientId,title,cleanText(body.description,5000),status,priority,assigned,cleanText(body.due_at,50),user.id,JSON.stringify(checklist),status==='done'?new Date().toISOString():null).run();return json({ok:true,id:Number(result.meta.last_row_id)},201);
  }
  if(req.method==='PATCH'&&parts[2]){
    const id=Number(parts[2]);const current=await env.DB.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first<any>();if(!current)return json({error:'Task not found'},404);if(!superAdmin&&Number(current.assigned_user_id)!==user.id)return json({error:'You can only update your own tasks'},403);const clientId=body.client_id===undefined?Number(current.client_id)||null:cleanId(body.client_id);await requireClient(env,user,access,clientId);
    const nextStatus=body.status===undefined?String(current.status):(TASK_STATUSES.includes(String(body.status))?String(body.status):String(current.status));const nextPriority=body.priority===undefined?String(current.priority):(TASK_PRIORITIES.includes(String(body.priority))?String(body.priority):String(current.priority));const checklist=body.checklist===undefined?String(current.checklist_json||'[]'):JSON.stringify(Array.isArray(body.checklist)?body.checklist.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,30):[]);const assigned=superAdmin&&body.assigned_user_id!==undefined?(cleanId(body.assigned_user_id)||null):current.assigned_user_id;
    await env.DB.prepare(`UPDATE tasks SET project_id=?,client_id=?,title=?,description=?,status=?,priority=?,assigned_user_id=?,due_at=?,checklist_json=?,completed_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(body.project_id===undefined?current.project_id:cleanId(body.project_id),clientId,body.title===undefined?current.title:(cleanText(body.title,220)||current.title),body.description===undefined?current.description:cleanText(body.description,5000),nextStatus,nextPriority,assigned,body.due_at===undefined?current.due_at:cleanText(body.due_at,50),checklist,nextStatus==='done'?(current.completed_at||new Date().toISOString()):null,id).run();return json({ok:true});
  }
  return json({error:'Method not allowed'},405);
}

async function handleChat(req:Request,env:Env,user:Identity,access:AccessMap){
  if(!access.chat)return json({error:'Chat access is disabled'},403);const url=new URL(req.url);const clientId=cleanId(url.searchParams.get('client_id'));await requireClient(env,user,access,clientId);
  if(req.method==='GET'){const where=clientId?'m.client_id=?':'m.client_id IS NULL';const stmt=env.DB.prepare(`SELECT m.id,m.user_id,m.client_id,m.message,m.created_at,u.name user_name,u.role user_role,c.name client_name FROM chat_messages m JOIN users u ON u.id=m.user_id LEFT JOIN clients c ON c.id=m.client_id WHERE ${where} ORDER BY m.id DESC LIMIT 80`);const rows=clientId?await stmt.bind(clientId).all():await stmt.all();return json({results:(rows.results||[]).reverse()})}
  if(req.method==='POST'){try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}const body=await req.json().catch(()=>null) as any;const message=cleanText(body?.message,1000);const postedClient=cleanId(body?.client_id);if(!message)return json({error:'Message is required'},400);await requireClient(env,user,access,postedClient);const result=await env.DB.prepare('INSERT INTO chat_messages(user_id,client_id,message) VALUES(?,?,?)').bind(user.id,postedClient,message).run();return json({ok:true,id:Number(result.meta.last_row_id)},201)}
  return json({error:'Method not allowed'},405);
}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);const path=url.pathname;await ensureSchema(env);
    if(!path.startsWith('/api/'))return core.fetch(req,env);
    let user:Identity;try{user=await identity(req,env)}catch{if(['/api/auth/login','/api/mobile/auth/login'].includes(path))return core.fetch(req,env);return core.fetch(req,env)}
    const access=await accessFor(env,user);
    if(path==='/api/access/me'||path.startsWith('/api/access/users'))return handleAccess(req,env,user);
    if(path==='/api/settings/base-currency')return handleBaseCurrency(req,env,user);
    if(path==='/api/services'||path.startsWith('/api/services/')){if(!access.invoices&&user.role!=='super_admin')return json({error:'Invoice access required'},403);return handleServices(req,env,user)}
    if(path==='/api/client-workspaces'&&req.method==='GET')return handleClientWorkspaces(env,user,access);
    if(path==='/api/chat')return handleChat(req,env,user,access);
    const module=moduleForPath(path);if(module&&module!=='settings'&&!access[module])return json({error:`${module.replace('_',' ')} access is disabled for this account`},403);
    if(path==='/api/tasks'||path.startsWith('/api/tasks/'))return handleTasks(req,env,user,access);
    if(path==='/api/clients'||path.startsWith('/api/clients/'))return handleScopedClients(req,env,user,access);
    const scoped=await handleScopedGet(req,env,user,access,path);if(scoped)return scoped;
    if(path.startsWith('/api/projects')||path.startsWith('/api/content_items')||path.startsWith('/api/invoices')){try{await validateClientWrite(req,env,user,access,path)}catch(error){if(error instanceof Error&&error.message==='client-access')return json({error:'This account does not have access to that client'},403)}}
    return core.fetch(req,env);
  }
} satisfies ExportedHandler<Env>;
