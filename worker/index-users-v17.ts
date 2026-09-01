import app from './index-chat-admin-v16';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role='super_admin'|'admin'|'sales'|'project_manager'|'finance'|'content';
type Identity={id:number;name:string;email:string;role:Role;active:number};

const SESSION_COOKIE='idealab_admin_session';
const SESSION_TTL_SECONDS=7*24*60*60;
const HASH_PREFIX='v17h$';
const ROLES:Role[]=['super_admin','admin','sales','project_manager','finance','content'];
const ASSIGNABLE:Role[]=['admin','sales','project_manager','finance','content'];

function json(data:unknown,status=200,headers?:HeadersInit){
  const h=new Headers(headers);
  h.set('content-type','application/json; charset=utf-8');
  h.set('cache-control','no-store, max-age=0');
  h.set('x-content-type-options','nosniff');
  h.set('x-idealab-users-runtime','v17.2.0');
  return new Response(JSON.stringify(data),{status,headers:h});
}
function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
function bytesToBase64Url(bytes:Uint8Array){let value='';for(const byte of bytes)value+=String.fromCharCode(byte);return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'')}
async function sha256Hex(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(digest))}
async function pbkdf2Hex(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:120000},key,256);return bytesToHex(new Uint8Array(bits))}
async function workerSafePasswordHash(password:string,salt:string,env:Env){
  const pepper=(env.ADMIN_PASSWORD_SALT||'').trim();
  if(!pepper)throw new Error('pepper');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${salt}:${password}`));
  return HASH_PREFIX+bytesToHex(new Uint8Array(signature));
}
function constantTimeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i+=1)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function randomToken(bytes=18){const value=new Uint8Array(bytes);crypto.getRandomValues(value);return bytesToBase64Url(value)}
function cookieValue(req:Request,name:string){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const[key,...rest]=part.trim().split('=');if(key===name)return decodeURIComponent(rest.join('='))}return null}
function sessionCookie(token:string){return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`}
function trustedWrite(req:Request){const url=new URL(req.url);return req.headers.get('origin')===url.origin&&req.headers.get('x-requested-with')==='idealab-admin'&&(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json')}
function validEmail(value:unknown){const email=typeof value==='string'?value.trim().toLowerCase():'';return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:null}
function validName(value:unknown){const name=typeof value==='string'?value.trim():'';return name.length>=2&&name.length<=120?name:null}
function validPassword(value:unknown){return typeof value==='string'&&value.length>=8&&value.length<=128?value:null}

async function identity(req:Request,env:Env):Promise<Identity>{
  const token=cookieValue(req,SESSION_COOKIE);if(!token)throw new Error('auth');
  const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1`).bind(hash).first<any>();
  if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000)||!ROLES.includes(row.role as Role))throw new Error('auth');
  return{id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role as Role,active:Number(row.active)};
}

async function login(req:Request,env:Env){
  if(!trustedWrite(req))return json({error:'Invalid login request'},403);
  const body=await req.json().catch(()=>null) as any;
  const email=body?validEmail(body.email):null,password=body?validPassword(body.password):null;
  if(!email||!password)return json({error:'Invalid email or password'},401);
  let row:any;
  try{row=await env.DB.prepare('SELECT id,name,email,role,active,password_salt,password_hash FROM users WHERE lower(email)=? LIMIT 1').bind(email).first<any>()}
  catch(error){console.error('V17 login lookup failed',error);return json({error:'Login backend unavailable'},500)}
  if(!row||!row.active||!ROLES.includes(row.role as Role))return json({error:'Invalid email or password'},401);

  let valid=false;
  try{
    if(row.password_hash&&row.password_salt){
      const stored=String(row.password_hash);
      if(stored.startsWith(HASH_PREFIX)){
        const candidate=await workerSafePasswordHash(password,String(row.password_salt),env);
        valid=constantTimeEqual(candidate,stored);
      }else{
        try{valid=constantTimeEqual(await pbkdf2Hex(password,String(row.password_salt)),stored.toLowerCase())}catch{valid=false}
      }
    }else if(email===(env.SUPER_ADMIN_EMAIL||'').trim().toLowerCase()){
      const candidate=await sha256Hex(`${env.ADMIN_PASSWORD_SALT}:${password}`);
      const expected=(env.ADMIN_PASSWORD_HASH||'').toLowerCase();
      valid=/^[0-9a-f]{64}$/.test(expected)&&constantTimeEqual(candidate,expected);
    }
  }catch(error){console.error('V17 login verification failed',error);return json({error:'Login backend unavailable'},500)}
  if(!valid)return json({error:'Invalid email or password'},401);

  try{
    const token=randomToken(32),sessionHash=await sha256Hex(token),now=Math.floor(Date.now()/1000),expiresAt=now+SESSION_TTL_SECONDS;
    await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now).run();
    await env.DB.prepare('INSERT INTO admin_sessions(session_hash,user_id,expires_at,ip_address,user_agent) VALUES(?,?,?,?,?)').bind(sessionHash,row.id,expiresAt,req.headers.get('cf-connecting-ip'),req.headers.get('user-agent')?.slice(0,250)||null).run();
    await env.DB.prepare('UPDATE users SET last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.id).run();
    return json({user:{id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role}},200,{'set-cookie':sessionCookie(token)});
  }catch(error){console.error('V17 session creation failed',error);return json({error:'Could not start a secure session'},500)}
}

async function createUser(req:Request,env:Env,user:Identity){
  if(user.role!=='super_admin')return json({error:'Super Admin access required'},403);
  if(!trustedWrite(req))return json({error:'Invalid request'},403);
  const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);
  const name=validName(body.name),email=validEmail(body.email),password=validPassword(body.password);
  const role=typeof body.role==='string'&&ASSIGNABLE.includes(body.role as Role)?body.role as Role:'sales';
  if(!name||!email||!password)return json({error:'Name, valid email and password of at least 8 characters are required'},400);
  try{const existing=await env.DB.prepare('SELECT id FROM users WHERE lower(email)=? LIMIT 1').bind(email).first();if(existing)return json({error:'A user with this email already exists'},409)}catch(error){console.error('V17 users lookup failed',error);return json({error:'Team account lookup failed. Code V17-USER-LOOKUP'},500)}

  const salt=randomToken();let hash='';
  try{hash=await workerSafePasswordHash(password,salt,env)}catch(error){console.error('V17 password hashing failed',error);return json({error:'Secure password setup failed. Code V17-USER-HASH2'},500)}
  let newId=0;
  try{const result=await env.DB.prepare('INSERT INTO users(name,email,role,active,created_by_user_id,password_salt,password_hash) VALUES(?,?,?,?,?,?,?)').bind(name,email,role,1,user.id,salt,hash).run();newId=Number(result.meta.last_row_id||0);if(!newId)throw new Error('missing-user-id')}
  catch(error){console.error('V17 user insert failed',error);return json({error:'Team account could not be saved. Code V17-USER-INSERT'},500)}

  try{await env.DB.prepare(`INSERT INTO user_access(user_id,leads,clients,projects,tasks,invoices,content,reports,settings,chat,all_clients,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO NOTHING`).bind(newId,role==='admin'||role==='sales'?1:0,1,role==='admin'||role==='project_manager'?1:0,role==='admin'||role==='project_manager'?1:0,role==='admin'||role==='finance'?1:0,role==='admin'||role==='project_manager'||role==='content'?1:0,role==='admin'||role==='finance'?1:0,0,1,1).run()}
  catch(error){console.error('V17 access bootstrap failed',error)}
  return json({ok:true,id:newId},201);
}

async function patchUser(req:Request,env:Env,user:Identity,id:number){
  if(user.role!=='super_admin')return json({error:'Super Admin access required'},403);
  if(!trustedWrite(req))return json({error:'Invalid request'},403);
  const body=await req.json().catch(()=>null) as any;if(!body)return json({error:'Invalid JSON'},400);
  const target=await env.DB.prepare('SELECT id,role,active FROM users WHERE id=? LIMIT 1').bind(id).first<any>();if(!target)return json({error:'User not found'},404);
  const fields:string[]=[];const values:unknown[]=[];
  if(body.name!==undefined){const name=validName(body.name);if(!name)return json({error:'Invalid name'},400);fields.push('name=?');values.push(name)}
  if(body.role!==undefined){const role=typeof body.role==='string'&&ROLES.includes(body.role as Role)?body.role as Role:null;if(!role)return json({error:'Invalid role'},400);if(id===user.id&&role!=='super_admin')return json({error:'You cannot remove your own Super Admin role'},400);fields.push('role=?');values.push(role)}
  if(body.active!==undefined){const active=body.active?1:0;if(id===user.id&&!active)return json({error:'You cannot deactivate your own account'},400);fields.push('active=?');values.push(active)}
  if(body.password!==undefined){const password=validPassword(body.password);if(!password)return json({error:'Password must be 8 to 128 characters'},400);const salt=randomToken();let hash='';try{hash=await workerSafePasswordHash(password,salt,env)}catch{return json({error:'Secure password setup failed. Code V17-USER-HASH2'},500)}fields.push('password_salt=?','password_hash=?');values.push(salt,hash)}
  if(!fields.length)return json({ok:true});
  try{await env.DB.prepare(`UPDATE users SET ${fields.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...values,id).run();if(body.password!==undefined||body.active===false)await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(id).run();return json({ok:true})}
  catch(error){console.error('V17 user update failed',error);return json({error:'Team account update failed. Code V17-USER-UPDATE'},500)}
}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/auth/login')return req.method==='POST'?login(req,env):json({error:'Method not allowed'},405);
    const match=/^\/api\/users(?:\/(\d+))?$/.exec(url.pathname);
    if(!match)return app.fetch(req,env);
    let user:Identity;try{user=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
    if(req.method==='GET'&&!match[1]){try{return user.role==='super_admin'||user.role==='admin'?json(await env.DB.prepare('SELECT id,name,email,role,active,last_login_at,created_at,updated_at FROM users ORDER BY active DESC,name ASC').all()):json(await env.DB.prepare('SELECT id,name,role,active FROM users WHERE active=1 ORDER BY name ASC').all())}catch(error){console.error('V17 users list failed',error);return json({error:'Team accounts could not be loaded. Code V17-USER-LIST'},500)}}
    if(req.method==='POST'&&!match[1])return createUser(req,env,user);
    if(req.method==='PATCH'&&match[1])return patchUser(req,env,user,Number(match[1]));
    return json({error:'Method not allowed'},405);
  }
} satisfies ExportedHandler<Env>;
