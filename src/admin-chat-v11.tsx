import React,{useEffect,useState}from'react';
import{MessageCircleMore}from'lucide-react';
import{adminApi}from'./admin-api';
import'./admin-chat-v11.css';

type Access={chat:boolean};
type ConvPayload={total_unread:number};

export default function AdminChatV11(){
 const[enabled,setEnabled]=useState(false),[unread,setUnread]=useState(0);
 useEffect(()=>{let alive=true;adminApi<{access:Access}>('/api/access/me').then(r=>{if(alive)setEnabled(!!r.access.chat)}).catch(()=>{if(alive)setEnabled(false)});return()=>{alive=false}},[]);
 useEffect(()=>{if(!enabled)return;let alive=true;let timer:number|undefined;const load=()=>{if(document.hidden)return;adminApi<ConvPayload>('/api/chat-v2/conversations').then(r=>{if(alive)setUnread(Number(r.total_unread||0))}).catch(()=>{})};const schedule=()=>{window.clearInterval(timer);timer=window.setInterval(load,30000)};load();schedule();const visibility=()=>{if(!document.hidden)load()};document.addEventListener('visibilitychange',visibility);return()=>{alive=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visibility)}},[enabled]);
 useEffect(()=>{if(!enabled)return;const key=(e:KeyboardEvent)=>{const tag=(e.target as HTMLElement)?.tagName?.toLowerCase();if(['input','textarea','select'].includes(tag))return;if((e.key==='c'||e.key==='C')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();location.assign('/admin/chat')}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[enabled]);
 useEffect(()=>{const h=()=>location.assign('/admin/chat');window.addEventListener('idealab:chat-client',h);return()=>window.removeEventListener('idealab:chat-client',h)},[]);
 if(!enabled)return null;
 return <button className="il-chatv11-launch il-chatv15-launch" onClick={()=>location.assign('/admin/chat')} aria-label="Open Chat Center"><MessageCircleMore size={19}/><span>Chat Center</span>{unread>0&&<b>{Math.min(unread,99)}</b>}<kbd>C</kbd></button>;
}
