import React,{createContext,useContext,useEffect,useMemo,useState,type ReactNode}from'react';
import{NavLink,Navigate,Route,Routes,useLocation,useNavigate}from'react-router-dom';
import{BarChart3,BriefcaseBusiness,CalendarDays,ChevronRight,FileText,LayoutDashboard,LogOut,Menu,MessageSquareText,Moon,ReceiptText,Search,Settings,ShieldCheck,Sun,Target,Users,UserRoundCog,X,KanbanSquare}from'lucide-react';
import{adminApi,logoutAdmin,type AppUser,type Role}from'./admin-api';
import{DashboardPage,LeadsPage,ClientsPage,ProjectsPage,TasksPage,InvoicesPage,ContentPage,ReportsPage,SettingsPage}from'./admin-enterprise-pages-v17';
import EnterpriseChatV17 from'./admin-enterprise-chat-v17';
import EnterpriseTeamV17 from'./admin-enterprise-team-v17';
import'./admin-enterprise-v17.css';
import'./admin-enterprise-v18.css';

export type ModuleKey='leads'|'clients'|'projects'|'tasks'|'invoices'|'content'|'reports'|'settings'|'chat';
export type AccessMap=Record<ModuleKey,boolean>&{all_clients:boolean};
export type PortalToast={id:number;text:string;tone:'success'|'error'|'info'};
export type PortalContextValue={user:AppUser;access:AccessMap;isSuper:boolean;notify:(text:string,tone?:PortalToast['tone'])=>void;refreshSession:()=>Promise<void>};
const PortalContext=createContext<PortalContextValue|null>(null);
export function useEnterprisePortal(){const value=useContext(PortalContext);if(!value)throw new Error('Enterprise portal context missing');return value}

const roleDefaults=(role:Role):AccessMap=>{
 if(role==='super_admin')return{leads:true,clients:true,projects:true,tasks:true,invoices:true,content:true,reports:true,settings:true,chat:true,all_clients:true};
 if(role==='admin')return{leads:true,clients:true,projects:true,tasks:true,invoices:true,content:true,reports:true,settings:false,chat:true,all_clients:true};
 if(role==='sales')return{leads:true,clients:true,projects:false,tasks:false,invoices:false,content:false,reports:false,settings:false,chat:true,all_clients:true};
 if(role==='project_manager')return{leads:false,clients:true,projects:true,tasks:true,invoices:false,content:true,reports:false,settings:false,chat:true,all_clients:true};
 if(role==='finance')return{leads:false,clients:true,projects:false,tasks:false,invoices:true,content:false,reports:true,settings:false,chat:true,all_clients:true};
 return{leads:false,clients:true,projects:false,tasks:false,invoices:false,content:true,reports:false,settings:false,chat:true,all_clients:true};
};

type NavItem={to:string;label:string;short:string;module?:ModuleKey;superOnly?:boolean;icon:ReactNode};
const nav:NavItem[]=[
 {to:'/admin',label:'Overview',short:'Home',icon:<LayoutDashboard size={18}/>},
 {to:'/admin/leads',label:'Leads',short:'Leads',module:'leads',icon:<Target size={18}/>},
 {to:'/admin/clients',label:'Clients',short:'Clients',module:'clients',icon:<Users size={18}/>},
 {to:'/admin/projects',label:'Projects',short:'Projects',module:'projects',icon:<BriefcaseBusiness size={18}/>},
 {to:'/admin/tasks',label:'Tasks',short:'Tasks',module:'tasks',icon:<KanbanSquare size={18}/>},
 {to:'/admin/content',label:'Content',short:'Content',module:'content',icon:<CalendarDays size={18}/>},
 {to:'/admin/invoices',label:'Invoices',short:'Invoices',module:'invoices',icon:<ReceiptText size={18}/>},
 {to:'/admin/chat',label:'Chat',short:'Chat',module:'chat',icon:<MessageSquareText size={18}/>},
 {to:'/admin/reports',label:'Reports',short:'Reports',module:'reports',icon:<BarChart3 size={18}/>},
 {to:'/admin/team',label:'Team & Access',short:'Team',superOnly:true,icon:<UserRoundCog size={18}/>},
 {to:'/admin/settings',label:'Settings',short:'Settings',module:'settings',icon:<Settings size={18}/>},
];

const pathTitle=(path:string)=>nav.find(item=>item.to==='/admin'?path==='/admin':path.startsWith(item.to))?.label||'Operations';

export default function AdminEnterpriseV17(){
 const location=useLocation(),navigate=useNavigate();
 const[user,setUser]=useState<AppUser|null>(null),[access,setAccess]=useState<AccessMap|null>(null),[loading,setLoading]=useState(true),[fatal,setFatal]=useState('');
 const[sidebar,setSidebar]=useState(false),[more,setMore]=useState(false),[command,setCommand]=useState(false),[commandQuery,setCommandQuery]=useState('');
 const[theme,setTheme]=useState<'light'|'dark'>(()=>localStorage.getItem('idealab-enterprise-theme')==='dark'?'dark':'light');
 const[toasts,setToasts]=useState<PortalToast[]>([]);
 const notify=(text:string,tone:PortalToast['tone']='success')=>{const id=Date.now()+Math.random();setToasts(v=>[...v,{id,text,tone}]);window.setTimeout(()=>setToasts(v=>v.filter(t=>t.id!==id)),3600)};
 const refreshSession=async()=>{setFatal('');try{const me=await adminApi<{user:AppUser}>('/api/me');let next=roleDefaults(me.user.role);try{const a=await adminApi<{access:AccessMap}>('/api/access/me');next=a.access}catch{/* backend remains authoritative */}setUser(me.user);setAccess(next)}catch(e){setFatal(e instanceof Error?e.message:'Unable to load your workspace')}finally{setLoading(false)}};
 useEffect(()=>{document.body.classList.add('ix-admin-body');return()=>document.body.classList.remove('ix-admin-body')},[]);
 useEffect(()=>{void refreshSession()},[]);
 useEffect(()=>{document.documentElement.dataset.ixTheme=theme;localStorage.setItem('idealab-enterprise-theme',theme)},[theme]);
 useEffect(()=>{setSidebar(false);setMore(false);setCommand(false)},[location.pathname]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const tag=(e.target as HTMLElement)?.tagName?.toLowerCase();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setCommand(true);return}if(e.key==='Escape'){setCommand(false);setSidebar(false);setMore(false)}if(tag==='input'||tag==='textarea'||tag==='select')return};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[]);
 const isSuper=user?.role==='super_admin';
 const visible=useMemo(()=>nav.filter(item=>(!item.superOnly||isSuper)&&(!item.module||access?.[item.module])),[access,isSuper]);
 const commandItems=useMemo(()=>{const q=commandQuery.trim().toLowerCase();return visible.filter(item=>!q||`${item.label} ${item.short}`.toLowerCase().includes(q))},[visible,commandQuery]);
 if(loading)return <PortalLoading/>;
 if(fatal||!user||!access)return <PortalFailure message={fatal||'Your session is unavailable.'} retry={()=>void refreshSession()}/>;
 const context:PortalContextValue={user,access,isSuper:!!isSuper,notify,refreshSession};
 const signOut=async()=>{try{await logoutAdmin()}finally{window.location.assign('/admin')}};
 const primary=['/admin','/admin/clients','/admin/tasks','/admin/chat'];
 const mobilePrimary=visible.filter(x=>primary.includes(x.to));
 return <PortalContext.Provider value={context}><div className={`ix-root ix-theme-${theme}`}>
  <button className="ix-mobile-menu" onClick={()=>setSidebar(true)} aria-label="Open navigation"><Menu size={20}/></button>
  {sidebar&&<button className="ix-drawer-scrim" onClick={()=>setSidebar(false)} aria-label="Close navigation"/>}
  <aside className={`ix-sidebar ${sidebar?'open':''}`}>
   <div className="ix-brand"><img src="/idealab-logo.jpg" alt="IDEA LAB"/><div><strong>IDEA LAB</strong><span>Operations OS</span></div><button className="ix-sidebar-close" onClick={()=>setSidebar(false)}><X size={18}/></button></div>
   <div className="ix-nav-label">WORKSPACE</div><nav className="ix-nav">{visible.map(item=><NavLink key={item.to} to={item.to} end={item.to==='/admin'}>{item.icon}<span>{item.label}</span><ChevronRight size={14}/></NavLink>)}</nav>
   <div className="ix-sidebar-foot"><div className="ix-role-card"><ShieldCheck size={16}/><div><b>{user.name}</b><span>{user.role.replaceAll('_',' ')}</span></div></div><button onClick={()=>void signOut()}><LogOut size={16}/><span>Sign out</span></button></div>
  </aside>
  <section className="ix-app">
   <header className="ix-topbar"><div className="ix-page-title"><span>IDEA LAB / OPERATIONS</span><h1>{pathTitle(location.pathname)}</h1></div><div className="ix-top-actions"><button className="ix-command-trigger" onClick={()=>setCommand(true)}><Search size={16}/><span>Search workspace</span><kbd>Ctrl K</kbd></button><button className="ix-icon-button" onClick={()=>setTheme(v=>v==='dark'?'light':'dark')} title="Change appearance">{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button><div className="ix-user-chip"><div>{user.name.slice(0,1).toUpperCase()}</div><span><b>{user.name}</b><small>{user.role.replaceAll('_',' ')}</small></span></div></div></header>
   <main className="ix-content"><Routes>
    <Route path="/admin" element={<DashboardPage/>}/>
    <Route path="/admin/leads" element={<ModuleGuard module="leads"><LeadsPage/></ModuleGuard>}/>
    <Route path="/admin/clients" element={<ModuleGuard module="clients"><ClientsPage/></ModuleGuard>}/>
    <Route path="/admin/projects" element={<ModuleGuard module="projects"><ProjectsPage/></ModuleGuard>}/>
    <Route path="/admin/tasks" element={<ModuleGuard module="tasks"><TasksPage/></ModuleGuard>}/>
    <Route path="/admin/content" element={<ModuleGuard module="content"><ContentPage/></ModuleGuard>}/>
    <Route path="/admin/invoices" element={<ModuleGuard module="invoices"><InvoicesPage/></ModuleGuard>}/>
    <Route path="/admin/chat" element={<ModuleGuard module="chat"><EnterpriseChatV17/></ModuleGuard>}/>
    <Route path="/admin/reports" element={<ModuleGuard module="reports"><ReportsPage/></ModuleGuard>}/>
    <Route path="/admin/team" element={isSuper?<EnterpriseTeamV17/>:<Restricted/>}/>
    <Route path="/admin/settings" element={<ModuleGuard module="settings"><SettingsPage/></ModuleGuard>}/>
    <Route path="*" element={<Navigate to="/admin" replace/>}/>
   </Routes></main>
  </section>
  <nav className="ix-bottom-nav">{mobilePrimary.map(item=><NavLink key={item.to} to={item.to} end={item.to==='/admin'}>{item.icon}<span>{item.short}</span></NavLink>)}<button className={more?'active':''} onClick={()=>setMore(v=>!v)}><Menu size={19}/><span>More</span></button></nav>
  {more&&<><button className="ix-more-scrim" onClick={()=>setMore(false)} aria-label="Close menu"/><section className="ix-more-sheet"><div><strong>More tools</strong><button onClick={()=>setMore(false)}><X size={18}/></button></div><nav>{visible.filter(item=>!primary.includes(item.to)).map(item=><button key={item.to} onClick={()=>navigate(item.to)}>{item.icon}<span>{item.label}</span></button>)}</nav><button className="ix-sheet-signout" onClick={()=>void signOut()}><LogOut size={17}/> Sign out</button></section></>}
  {command&&<div className="ix-command-backdrop" onMouseDown={()=>setCommand(false)}><section className="ix-command" onMouseDown={e=>e.stopPropagation()}><div className="ix-command-search"><Search size={18}/><input autoFocus value={commandQuery} onChange={e=>setCommandQuery(e.target.value)} placeholder="Jump to a workspace…"/><button onClick={()=>setCommand(false)}><X size={17}/></button></div><div className="ix-command-results">{commandItems.map(item=><button key={item.to} onClick={()=>navigate(item.to)}>{item.icon}<span><b>{item.label}</b><small>{item.to.replace('/admin','')||'/overview'}</small></span><ChevronRight size={15}/></button>)}{!commandItems.length&&<div className="ix-command-empty">No matching workspace</div>}</div></section></div>}
  <div className="ix-toast-host">{toasts.map(t=><div key={t.id} className={`ix-toast ${t.tone}`}>{t.text}</div>)}</div>
 </div></PortalContext.Provider>;
}

function ModuleGuard({module,children}:{module:ModuleKey;children:ReactNode}){const{access}=useEnterprisePortal();return access[module]?<>{children}</>:<Restricted/>}
function Restricted(){return <div className="ix-state"><ShieldCheck size={34}/><h2>Workspace restricted</h2><p>Your account does not have access to this area.</p></div>}
function PortalLoading(){return <div className="ix-login-shell"><div className="ix-loading-card"><div className="ix-loader"/><h2>Opening IDEA LAB</h2><p>Loading your secure operations workspace.</p></div></div>}
function PortalFailure({message,retry}:{message:string;retry:()=>void}){return <div className="ix-login-shell"><div className="ix-loading-card"><FileText size={34}/><h2>Workspace unavailable</h2><p>{message}</p><button className="ix-btn ix-primary" onClick={retry}>Try again</button></div></div>}
