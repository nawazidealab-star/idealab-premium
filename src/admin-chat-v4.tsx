import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, MessageSquareText, Send, X } from 'lucide-react';
import { adminApi, type AppUser, type D1Result } from './admin-api';
import './admin-chat-v4.css';

type Client = { id:number; name:string; company?:string|null };
type ChatMessage = { id:number; user_id:number; client_id:number|null; message:string; created_at:string; user_name:string; user_role:string; client_name?:string|null };
type Access = { chat:boolean };

export default function AdminChatV4(){
  const[enabled,setEnabled]=useState(false);const[open,setOpen]=useState(false);const[user,setUser]=useState<AppUser|null>(null);const[clients,setClients]=useState<Client[]>([]);const[clientId,setClientId]=useState<string>('general');const[messages,setMessages]=useState<ChatMessage[]>([]);const[text,setText]=useState('');const[sending,setSending]=useState(false);const[error,setError]=useState('');const endRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{Promise.all([adminApi<{user:AppUser}>('/api/me'),adminApi<{access:Access}>('/api/access/me'),adminApi<D1Result<Client>>('/api/clients')]).then(([me,a,c])=>{setUser(me.user);setEnabled(!!a.access.chat);setClients(c.results||[])}).catch(()=>setEnabled(false))},[]);
  const path=useMemo(()=>clientId==='general'?'/api/chat':`/api/chat?client_id=${clientId}`,[clientId]);
  const load=async()=>{if(!enabled)return;try{const r=await adminApi<D1Result<ChatMessage>>(path);setMessages(r.results||[]);setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to load chat')}};
  useEffect(()=>{if(!open||!enabled)return;void load();const timer=window.setInterval(()=>void load(),15000);return()=>window.clearInterval(timer)},[open,enabled,path]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages,open]);
  const send=async(e:React.FormEvent)=>{e.preventDefault();const message=text.trim();if(!message||sending)return;setSending(true);setError('');try{await adminApi('/api/chat',{method:'POST',body:JSON.stringify({message,client_id:clientId==='general'?null:Number(clientId)})});setText('');await load()}catch(err){setError(err instanceof Error?err.message:'Unable to send message')}finally{setSending(false)}};
  if(!enabled)return null;
  return <><button className="il-chat-launcher" onClick={()=>setOpen(v=>!v)} aria-label="Open team chat"><MessageSquareText size={20}/><span>Team chat</span></button>{open&&<aside className="il-chat-panel"><header><div><small>IDEA LAB COLLABORATION</small><h3>Team chat</h3></div><button onClick={()=>setOpen(false)}><X size={18}/></button></header><div className="il-chat-scope"><Building2 size={14}/><select value={clientId} onChange={e=>setClientId(e.target.value)}><option value="general">General team chat</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}</select></div><div className="il-chat-messages">{messages.map(m=><div className={`il-chat-message ${m.user_id===user?.id?'mine':''}`} key={m.id}><div><b>{m.user_name}</b><span>{m.user_role.replaceAll('_',' ')}</span></div><p>{m.message}</p><time>{new Date(m.created_at).toLocaleString()}</time></div>)}{!messages.length&&!error&&<div className="il-chat-empty">No messages here yet.</div>}<div ref={endRef}/></div>{error&&<div className="il-chat-error">{error}</div>}<form onSubmit={send}><textarea rows={2} value={text} onChange={e=>setText(e.target.value)} placeholder={clientId==='general'?'Message the team...':'Message about this client...'}/><button disabled={sending||!text.trim()}><Send size={16}/></button></form></aside>}</>;
}
