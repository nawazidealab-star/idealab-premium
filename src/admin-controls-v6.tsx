import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquare2, Moon, Sun, Trash2, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { adminApi, type AppUser, type D1Result } from './admin-api';
import './admin-controls-v6.css';

type Entity='leads'|'clients'|'projects'|'tasks'|'invoices'|'content_items';
type Row={id:number;[key:string]:unknown};
type Config={entity:Entity;label:string;path:string;statuses:string[];title:(row:Row)=>string;meta:(row:Row)=>string};

type Theme='light'|'dark';

const CONFIG:Record<string,Config>={
  '/admin/leads':{entity:'leads',label:'Leads',path:'/api/leads',statuses:['new','contacted','qualified','proposal','warm','follow_up','won','lost'],title:r=>String(r.name||`Lead #${r.id}`),meta:r=>[r.company,r.service,r.status].filter(Boolean).join(' · ')},
  '/admin/clients':{entity:'clients',label:'Clients',path:'/api/clients',statuses:['active','paused','inactive'],title:r=>String(r.name||`Client #${r.id}`),meta:r=>[r.company,r.country,r.status].filter(Boolean).join(' · ')},
  '/admin/projects':{entity:'projects',label:'Projects',path:'/api/projects',statuses:['planned','active','blocked','review','done','cancelled'],title:r=>String(r.name||`Project #${r.id}`),meta:r=>[r.client_name,r.type,r.status].filter(Boolean).join(' · ')},
  '/admin/tasks':{entity:'tasks',label:'Tasks',path:'/api/tasks',statuses:['todo','in_progress','review','done','cancelled'],title:r=>String(r.title||`Task #${r.id}`),meta:r=>[r.client_name,r.assignee_name,r.priority,r.status].filter(Boolean).join(' · ')},
  '/admin/invoices':{entity:'invoices',label:'Invoices',path:'/api/invoices',statuses:['draft','sent','due','paid','void'],title:r=>String(r.invoice_no||`Invoice #${r.id}`),meta:r=>[r.client_name,r.currency,r.amount,r.status].filter(v=>v!==null&&v!==undefined&&v!=='').join(' · ')},
  '/admin/content':{entity:'content_items',label:'Content',path:'/api/content_items',statuses:['idea','draft','review','approved','scheduled','published','cancelled'],title:r=>String(r.title||`Content #${r.id}`),meta:r=>[r.client_name||'IDEA LAB / internal',r.platform,r.format,r.status].filter(Boolean).join(' · ')},
};

function ThemeControl(){
  const[target,setTarget]=useState<Element|null>(null);
  const[theme,setTheme]=useState<Theme>(()=>{
    const stored=localStorage.getItem('idealab-theme');
    if(stored==='light'||stored==='dark')return stored;
    return document.documentElement.dataset.adminTheme==='light'?'light':'dark';
  });
  useEffect(()=>{
    const find=()=>setTarget(document.querySelector('.il-premium-top-actions'));
    find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[]);
  useEffect(()=>{document.documentElement.dataset.adminTheme=theme;localStorage.setItem('idealab-theme',theme)},[theme]);
  if(!target)return null;
  return createPortal(<button className="il-top-icon il-v6-theme" title={`Switch to ${theme==='dark'?'light':'dark'} theme`} onClick={()=>setTheme(v=>v==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={17}/>:<Moon size={17}/>}</button>,target);
}

function BulkManager({user}:{user:AppUser}){
  const location=useLocation();
  const config=CONFIG[location.pathname];
  const[target,setTarget]=useState<Element|null>(null);
  const[open,setOpen]=useState(false);
  const[rows,setRows]=useState<Row[]>([]);
  const[selected,setSelected]=useState<number[]>([]);
  const[query,setQuery]=useState('');
  const[status,setStatus]=useState('');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const superAdmin=user.role==='super_admin';

  useEffect(()=>{
    const find=()=>setTarget(document.querySelector('.il-premium-top-actions'));
    find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[]);

  useEffect(()=>{setOpen(false);setSelected([]);setQuery('');setStatus('');setError('')},[location.pathname]);

  const load=async()=>{
    if(!config)return;
    setBusy(true);setError('');
    try{const result=await adminApi<D1Result<Row>>(config.path);setRows(result.results||[])}
    catch(err){setError(err instanceof Error?err.message:'Unable to load records')}
    finally{setBusy(false)}
  };

  const launch=async()=>{setOpen(true);setSelected([]);setQuery('');setStatus('');await load()};
  const filtered=useMemo(()=>{
    if(!config)return[];
    const q=query.trim().toLowerCase();
    return q?rows.filter(row=>`${config.title(row)} ${config.meta(row)}`.toLowerCase().includes(q)):rows;
  },[rows,query,config]);
  const allVisible=filtered.length>0&&filtered.every(row=>selected.includes(row.id));
  const toggleAll=()=>setSelected(allVisible?selected.filter(id=>!filtered.some(row=>row.id===id)):[...new Set([...selected,...filtered.map(row=>row.id)])]);

  const applyStatus=async()=>{
    if(!config||!selected.length||!status)return;
    setBusy(true);setError('');
    try{await adminApi('/api/bulk',{method:'POST',body:JSON.stringify({entity:config.entity,ids:selected,action:'status',status})});setOpen(false);window.location.reload()}
    catch(err){setError(err instanceof Error?err.message:'Bulk update failed');setBusy(false)}
  };

  const remove=async()=>{
    if(!config||!selected.length||!superAdmin)return;
    const ok=window.confirm(`Permanently delete ${selected.length} selected ${config.label.toLowerCase()} record${selected.length===1?'':'s'}? This cannot be undone.`);if(!ok)return;
    setBusy(true);setError('');
    try{await adminApi('/api/bulk',{method:'POST',body:JSON.stringify({entity:config.entity,ids:selected,action:'delete'})});setOpen(false);window.location.reload()}
    catch(err){setError(err instanceof Error?err.message:'Bulk delete failed');setBusy(false)}
  };

  if(!config||!target)return null;
  return <>{createPortal(<button className="il-admin-button il-v6-bulk-launch" onClick={()=>void launch()}><CheckSquare2 size={15}/> Bulk manage</button>,target)}
    {open&&createPortal(<div className="il-v6-backdrop" onMouseDown={()=>!busy&&setOpen(false)}><div className="il-v6-modal" onMouseDown={e=>e.stopPropagation()}>
      <header><div><small>BULK MANAGEMENT</small><h3>{config.label}</h3><p>Select records, then apply one action to all of them.</p></div><button disabled={busy} onClick={()=>setOpen(false)}><X size={18}/></button></header>
      <div className="il-v6-tools"><label className="il-v6-search"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search ${config.label.toLowerCase()}...`}/></label><button className="il-admin-button" onClick={toggleAll}>{allVisible?'Clear visible':'Select visible'}</button></div>
      <div className="il-v6-list">{busy&&!rows.length?<div className="il-v6-empty">Loading records…</div>:filtered.map(row=><label key={row.id} className={selected.includes(row.id)?'selected':''}><input type="checkbox" checked={selected.includes(row.id)} onChange={e=>setSelected(v=>e.target.checked?[...v,row.id]:v.filter(id=>id!==row.id))}/><span><b>{config.title(row)}</b><small>{config.meta(row)||`Record #${row.id}`}</small></span></label>)}{!busy&&!filtered.length&&<div className="il-v6-empty">No records found.</div>}</div>
      <footer><div className="il-v6-selection"><b>{selected.length}</b><span>selected</span></div><div className="il-v6-actions"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Change status…</option>{config.statuses.map(s=><option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select><button className="il-admin-button il-admin-primary" disabled={busy||!selected.length||!status} onClick={()=>void applyStatus()}>Apply status</button>{superAdmin&&<button className="il-admin-button il-v6-delete" disabled={busy||!selected.length} onClick={()=>void remove()}><Trash2 size={15}/> Delete</button>}</div></footer>
      {!!error&&<div className="il-v6-error">{error}</div>}
      {!superAdmin&&<div className="il-v6-note">Delete is restricted to Super Admin. Your account can bulk-update only records already visible to you.</div>}
    </div></div>,document.body)}
  </>;
}

export default function AdminControlsV6(){
  const[user,setUser]=useState<AppUser|null>(null);
  useEffect(()=>{adminApi<{user:AppUser}>('/api/me').then(r=>setUser(r.user)).catch(()=>setUser(null))},[]);
  return <><ThemeControl/>{user&&<BulkManager user={user}/>}</>;
}
