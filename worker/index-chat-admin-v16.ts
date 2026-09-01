import app from './index-stability-v14';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role='super_admin'|'admin'|'sales'|'project_manager'|'finance'|'content';
type Identity={id:number;name:string;email:string;role:Role;active:number};
type ConversationType='general'|'client'|'dm';
type Channel={type:ConversationType;targetId:number|null;key:string};

const SESSION_COOKIE='idealab_admin_session';

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, max-age=0',
    'x-content-type-options':'nosniff'
  }});
}

function bytesToHex(bytes:Uint8Array){
  return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('');
}

async function sha256Hex(value:string){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function cookieValue(req:Request,name:string){
  const raw=req.headers.get('cookie')||'';
  for(const part of raw.split(';')){
    const[key,...rest]=part.trim().split('=');
    if(key===name)return decodeURIComponent(rest.join('='));
  }
  return null;
}

function requireWrite(req:Request){
  const url=new URL(req.url);
  if(req.headers.get('origin')!==url.origin)throw new Error('origin');
  if(req.headers.get('x-requested-with')!=='idealab-admin')throw new Error('csrf');
  if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new Error('json');
}

async function identity(req:Request,env:Env):Promise<Identity>{
  const token=cookieValue(req,SESSION_COOKIE);
  if(!token)throw new Error('auth');
  const hash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at
    FROM admin_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.session_hash=? LIMIT 1`).bind(hash).first<any>();
  if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000))throw new Error('auth');
  return{id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role as Role,active:Number(row.active)};
}

function parseChannel(raw:unknown):Channel|null{
  const value=typeof raw==='string'?raw.trim():'';
  if(value==='general')return{type:'general',targetId:null,key:'general'};
  const match=/^(client|dm):(\d+)$/.exec(value);
  if(!match)return null;
  const id=Number(match[2]);
  if(!Number.isInteger(id)||id<=0)return null;
  return{type:match[1] as ConversationType,targetId:id,key:`${match[1]}:${id}`};
}

async function readChannel(req:Request){
  const body=await req.json().catch(()=>null) as {channel?:unknown}|null;
  return body?parseChannel(body.channel):null;
}

async function deleteMessage(env:Env,user:Identity,messageId:number,channel:Channel){
  let row:any=null;
  if(channel.type==='general'){
    row=await env.DB.prepare(`SELECT id FROM chat_messages
      WHERE id=? AND client_id IS NULL AND recipient_user_id IS NULL LIMIT 1`).bind(messageId).first();
  }else if(channel.type==='client'){
    row=await env.DB.prepare(`SELECT id FROM chat_messages
      WHERE id=? AND client_id=? AND recipient_user_id IS NULL LIMIT 1`).bind(messageId,channel.targetId).first();
  }else{
    row=await env.DB.prepare(`SELECT id FROM chat_messages
      WHERE id=? AND client_id IS NULL AND
      ((user_id=? AND recipient_user_id=?) OR (user_id=? AND recipient_user_id=?)) LIMIT 1`)
      .bind(messageId,user.id,channel.targetId,channel.targetId,user.id).first();
  }
  if(!row)return json({error:'Message not found in this conversation'},404);
  await env.DB.prepare('DELETE FROM chat_messages WHERE id=?').bind(messageId).run();
  return json({ok:true,id:messageId});
}

async function clearConversation(env:Env,user:Identity,channel:Channel){
  let result:D1Result<unknown>;
  if(channel.type==='general'){
    result=await env.DB.prepare(`DELETE FROM chat_messages
      WHERE client_id IS NULL AND recipient_user_id IS NULL`).run();
    await env.DB.prepare(`DELETE FROM chat_reads WHERE channel_key='general'`).run();
  }else if(channel.type==='client'){
    result=await env.DB.prepare(`DELETE FROM chat_messages
      WHERE client_id=? AND recipient_user_id IS NULL`).bind(channel.targetId).run();
    await env.DB.prepare('DELETE FROM chat_reads WHERE channel_key=?').bind(channel.key).run();
  }else{
    result=await env.DB.prepare(`DELETE FROM chat_messages
      WHERE client_id IS NULL AND
      ((user_id=? AND recipient_user_id=?) OR (user_id=? AND recipient_user_id=?))`)
      .bind(user.id,channel.targetId,channel.targetId,user.id).run();
    await env.DB.prepare('DELETE FROM chat_reads WHERE (user_id=? AND channel_key=?) OR (user_id=? AND channel_key=?)')
      .bind(user.id,channel.key,channel.targetId,`dm:${user.id}`).run();
  }
  return json({ok:true,deleted:Number(result.meta?.changes||0)});
}

export default{
  async fetch(req:Request,env:Env):Promise<Response>{
    const path=new URL(req.url).pathname;
    const messageMatch=/^\/api\/chat-v2\/messages\/(\d+)$/.exec(path);
    const isClear=path==='/api/chat-v2/conversation';

    if(req.method!=='DELETE'||(!messageMatch&&!isClear))return app.fetch(req,env);

    // Let the stability layer repair the chat/session/access schema before this
    // privileged extension touches those tables. The harmless unsupported probe
    // intentionally reaches the normal chat stack and never mutates data.
    const probeUrl=new URL(req.url);
    probeUrl.pathname='/api/chat-v2/admin-delete-schema-check';
    const probe=new Request(probeUrl.toString(),{method:'GET',headers:req.headers});
    await app.fetch(probe,env);

    let user:Identity;
    try{user=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
    if(user.role!=='super_admin')return json({error:'Super Admin access required'},403);
    try{requireWrite(req)}catch{return json({error:'Invalid request'},403)}

    const channel=await readChannel(req);
    if(!channel)return json({error:'Valid chat channel required'},400);

    if(messageMatch){
      const id=Number(messageMatch[1]);
      if(!Number.isInteger(id)||id<=0)return json({error:'Invalid message'},400);
      return deleteMessage(env,user,id,channel);
    }
    return clearConversation(env,user,channel);
  }
} satisfies ExportedHandler<Env>;
