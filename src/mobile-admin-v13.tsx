import React,{useEffect,useMemo,useState}from'react';
import{BarChart3,CalendarDays,Home,MessageCircleMore,MoreHorizontal,ReceiptText,Settings,Target,Users,KanbanSquare,BriefcaseBusiness,Moon,Sun,X}from'lucide-react';
import{useLocation,useNavigate}from'react-router-dom';
import{adminApi}from'./admin-api';
import'./mobile-efficiency-v13.css';

type Access={leads:boolean;clients:boolean;projects:boolean;tasks:boolean;invoices:boolean;content:boolean;reports:boolean;settings:boolean;chat:boolean;all_clients:boolean};
type ConvPayload={total_unread:number};
type Item={to:string;label:string;icon:React.ReactNode;key?:keyof Access};

const primary:Item[]=[
 {to:'/admin',label:'Home',icon:<Home size={19}/>},
 {to:'/admin/clients',label:'Clients',icon:<Users size={19}/>,key:'clients'},
 {to:'/admin/tasks',label:'Tasks',icon:<KanbanSquare size={19}/>,key:'tasks'},
 {to:'/admin/chat',label:'Chat',icon:<MessageCircleMore size={19}/>,key:'chat'},
];
const moreItems:Item[]=[
 {to:'/admin/leads',label:'Leads',icon:<Target size={18}/>,key:'leads'},
 {to:'/admin/projects',label:'Projects',icon:<BriefcaseBusiness size={18}/>,key:'projects'},
 {to:'/admin/content',label:'Content',icon:<CalendarDays size={18}/>,key:'content'},
 {to:'/admin/invoices',label:'Invoices',icon:<ReceiptText size={18}/>,key:'invoices'},
 {to:'/admin/reports',label:'Reports',icon:<BarChart3 size={18}/>,key:'reports'},
 {to:'/admin/settings',label:'Settings',icon:<Settings size={18}/>,key:'settings'},
];

export default function MobileAdminV13(){
 const loc=useLocation(),navigate=useNavigate();
 const[mobile,setMobile]=useState(()=>window.matchMedia('(max-width:760px)').matches);
 const[access,setAccess]=useState<Access|null>(null),[more,setMore]=useState(false),[unread,setUnread]=useState(0);
 const[theme,setTheme]=useState<'light'|'dark'>(()=>localStorage.getItem('idealab-theme')==='light'?'light':'dark');
 useEffect(()=>{const mq=window.matchMedia('(max-width:760px)'),h=()=>setMobile(mq.matches);mq.addEventListener('change',h);return()=>mq.removeEventListener('change',h)},[]);
 useEffect(()=>{if(!mobile)return;adminApi<{access:Access}>('/api/access/me').then(r=>setAccess(r.access)).catch(()=>setAccess(null))},[mobile]);
 useEffect(()=>{if(!mobile||access?.chat===false)return;let alive=true;const load=()=>{if(document.hidden)return;adminApi<ConvPayload>('/api/chat-v2/conversations').then(r=>{if(alive)setUnread(Number(r.total_unread||0))}).catch(()=>{})};load();const timer=window.setInterval(load,20000);const vis=()=>{if(!document.hidden)load()};document.addEventListener('visibilitychange',vis);return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',vis)}},[mobile,access?.chat]);
 useEffect(()=>setMore(false),[loc.pathname]);
 useEffect(()=>{document.documentElement.dataset.adminTheme=theme;localStorage.setItem('idealab-theme',theme)},[theme]);
 const allowed=(item:Item)=>!item.key||access?.[item.key]!==false;
 const isActive=(to:string)=>to==='/admin'?loc.pathname==='/admin':loc.pathname.startsWith(to);
 const visibleMore=useMemo(()=>moreItems.filter(allowed),[access]);
 if(!mobile)return null;
 const go=(to:string)=>{setMore(false);if(to==='/admin/chat'){window.location.assign('/admin/chat');return}navigate(to)};
 return <>
  <nav className="il-mobile-bottom-v13" aria-label="Mobile admin navigation">
   {primary.filter(allowed).map(item=><button key={item.to} className={isActive(item.to)?'active':''} onClick={()=>go(item.to)}>{item.icon}<span>{item.label}</span>{item.to==='/admin/chat'&&unread>0&&<b>{Math.min(unread,99)}</b>}</button>)}
   <button className={more?'active':''} onClick={()=>setMore(v=>!v)}><MoreHorizontal size={20}/><span>More</span></button>
  </nav>
  {more&&<><button className="il-mobile-more-scrim" onClick={()=>setMore(false)} aria-label="Close menu"/><section className="il-mobile-more-v13"><header><div><small>IDEA LAB</small><h3>More tools</h3></div><button onClick={()=>setMore(false)}><X size={18}/></button></header><div className="il-mobile-more-grid">{visibleMore.map(item=><button key={item.to} className={isActive(item.to)?'active':''} onClick={()=>go(item.to)}>{item.icon}<span>{item.label}</span></button>)}</div><button className="il-mobile-theme-v13" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}<span>{theme==='dark'?'Light mode':'Dark mode'}</span></button></section></>}
 </>;
}
