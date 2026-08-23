import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle, CalendarDays, CheckSquare2, ChevronRight, Download, FileSpreadsheet,
  Filter, LayoutGrid, List, Plus, Search, Trash2, Upload, X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi, type AppUser, type D1Result } from './admin-api';
import './content-planner-v8.css';

type ContentRow = {
  id:number;
  client_id:number|null;
  client_name?:string|null;
  title:string;
  campaign?:string|null;
  platform:string|null;
  format:string|null;
  status:string;
  publish_at:string|null;
  caption:string|null;
  asset_url:string|null;
  owner_user_id?:number|null;
  owner_name?:string|null;
};

type ClientRow = { id:number; name:string; company?:string|null; status?:string };
type ViewMode = 'board'|'schedule'|'list';

type FormState = {
  client_id:string;
  title:string;
  campaign:string;
  platform:string;
  format:string;
  status:string;
  publish_at:string;
  caption:string;
  asset_url:string;
};

const STATUSES=['idea','draft','review','approved','scheduled','published'] as const;
const ALL_STATUSES=[...STATUSES,'cancelled'];
const PLATFORMS=['Instagram','Facebook','TikTok','LinkedIn','YouTube','Website','Email'];
const FORMATS=['Post','Reel','Story','Carousel','Static Graphic','Infographic','Video','Blog','Email'];

function localDate(value:string|null){
  if(!value)return null;
  const d=new Date(value);return Number.isNaN(d.getTime())?null:d;
}
function dateKey(value:string|null){const d=localDate(value);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'Unscheduled'}
function prettyDate(value:string|null){const d=localDate(value);return d?new Intl.DateTimeFormat('en',{weekday:'short',day:'numeric',month:'short'}).format(d):'Unscheduled'}
function todayStart(){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}
function endOfDays(days:number){const d=new Date();d.setHours(23,59,59,999);d.setDate(d.getDate()+days);return d.getTime()}
function active(row:ContentRow){return !['published','cancelled'].includes(row.status)}
function blankForm():FormState{return{client_id:'',title:'',campaign:'',platform:'Instagram',format:'Post',status:'idea',publish_at:'',caption:'',asset_url:''}}
function formFor(row:ContentRow):FormState{return{client_id:row.client_id?String(row.client_id):'',title:row.title,campaign:row.campaign||'',platform:row.platform||'Instagram',format:row.format||'Post',status:row.status,publish_at:row.publish_at?row.publish_at.slice(0,16):'',caption:row.caption||'',asset_url:row.asset_url||''}}
function statusLabel(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())}

async function inChunks<T>(items:T[],size:number,fn:(item:T)=>Promise<unknown>){
  for(let i=0;i<items.length;i+=size)await Promise.all(items.slice(i,i+size).map(fn));
}

function excelDate(value:unknown){
  if(value===null||value===undefined||value==='')return null;
  if(typeof value==='number'){
    const parsed=XLSX.SSF.parse_date_code(value);
    if(parsed){const d=new Date(parsed.y,parsed.m-1,parsed.d,parsed.H||9,parsed.M||0,parsed.S||0);return Number.isNaN(d.getTime())?null:d.toISOString()}
  }
  const d=new Date(String(value));return Number.isNaN(d.getTime())?null:d.toISOString();
}
function key(value:string){return value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}
function pick(row:Record<string,unknown>,...names:string[]){const map=new Map(Object.entries(row).map(([k,v])=>[key(k),v]));for(const n of names){const v=map.get(key(n));if(v!==undefined&&v!==null&&String(v).trim()!=='')return v}return ''}

export default function ContentPlannerV8(){
  const location=useLocation();
  const activeRoute=location.pathname==='/admin/content';
  const[target,setTarget]=useState<Element|null>(null);
  const[rows,setRows]=useState<ContentRow[]>([]);
  const[clients,setClients]=useState<ClientRow[]>([]);
  const[user,setUser]=useState<AppUser|null>(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const[notice,setNotice]=useState('');
  const[view,setView]=useState<ViewMode>(()=>(localStorage.getItem('idealab-content-view') as ViewMode)||'board');
  const[query,setQuery]=useState('');
  const[clientFilter,setClientFilter]=useState('all');
  const[statusFilter,setStatusFilter]=useState('all');
  const[platformFilter,setPlatformFilter]=useState('all');
  const[ownerFilter,setOwnerFilter]=useState('all');
  const[selected,setSelected]=useState<number[]>([]);
  const[edit,setEdit]=useState<ContentRow|null|undefined>(undefined);
  const[form,setForm]=useState<FormState>(blankForm());
  const[saving,setSaving]=useState(false);
  const[bulkClient,setBulkClient]=useState('');
  const[bulkStatus,setBulkStatus]=useState('');
  const fileRef=useRef<HTMLInputElement|null>(null);

  const superAdmin=user?.role==='super_admin';

  useEffect(()=>{
    if(!activeRoute){document.documentElement.classList.remove('il-cpv8-active');setTarget(null);return}
    document.documentElement.classList.add('il-cpv8-active');
    const find=()=>setTarget(document.querySelector('.il-premium-content'));
    find();const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();document.documentElement.classList.remove('il-cpv8-active')};
  },[activeRoute]);

  const load=async()=>{
    if(!activeRoute)return;setLoading(true);setError('');
    try{
      const[c,cl,me]=await Promise.all([
        adminApi<D1Result<ContentRow>>('/api/content_items'),
        adminApi<D1Result<ClientRow>>('/api/clients'),
        adminApi<{user:AppUser}>('/api/me'),
      ]);
      setRows(c.results||[]);setClients(cl.results||[]);setUser(me.user);
    }catch(err){setError(err instanceof Error?err.message:'Unable to load Content Planner')}
    finally{setLoading(false)}
  };
  useEffect(()=>{void load()},[activeRoute]);

  const owners=useMemo(()=>Array.from(new Set(rows.map(r=>r.owner_name).filter((v):v is string=>!!v))).sort(),[rows]);
  const platforms=useMemo(()=>Array.from(new Set(rows.map(r=>r.platform).filter((v):v is string=>!!v))).sort(),[rows]);
  const filtered=useMemo(()=>rows.filter(row=>{
    if(clientFilter==='internal'&&row.client_id!==null)return false;
    if(clientFilter!=='all'&&clientFilter!=='internal'&&String(row.client_id)!==clientFilter)return false;
    if(statusFilter!=='all'&&row.status!==statusFilter)return false;
    if(platformFilter!=='all'&&(row.platform||'')!==platformFilter)return false;
    if(ownerFilter==='unassigned'&&row.owner_name)return false;
    if(ownerFilter!=='all'&&ownerFilter!=='unassigned'&&(row.owner_name||'')!==ownerFilter)return false;
    const q=query.trim().toLowerCase();
    return !q||`${row.title} ${row.client_name||''} ${row.campaign||''} ${row.platform||''} ${row.format||''} ${row.owner_name||''}`.toLowerCase().includes(q);
  }),[rows,clientFilter,statusFilter,platformFilter,ownerFilter,query]);

  const now=todayStart();const week=endOfDays(7);
  const dueToday=rows.filter(r=>active(r)&&localDate(r.publish_at)&&localDate(r.publish_at)!.getTime()>=now&&localDate(r.publish_at)!.getTime()<now+86400000).length;
  const nextWeek=rows.filter(r=>active(r)&&localDate(r.publish_at)&&localDate(r.publish_at)!.getTime()>=now&&localDate(r.publish_at)!.getTime()<=week).length;
  const overdue=rows.filter(r=>active(r)&&localDate(r.publish_at)&&localDate(r.publish_at)!.getTime()<now).length;
  const needsClient=rows.filter(r=>active(r)&&r.client_id===null).length;
  const reviewQueue=rows.filter(r=>['review','approved'].includes(r.status)).length;

  const setMode=(next:ViewMode)=>{setView(next);localStorage.setItem('idealab-content-view',next)};
  const openNew=()=>{setEdit(null);setForm(blankForm())};
  const openEdit=(row:ContentRow)=>{setEdit(row);setForm(formFor(row))};
  const closeModal=()=>{if(!saving)setEdit(undefined)};

  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(!form.title.trim())return;setSaving(true);setError('');
    try{
      const payload={...form,client_id:form.client_id?Number(form.client_id):null,publish_at:form.publish_at||null};
      await adminApi(edit?`/api/content_items/${edit.id}`:'/api/content_items',{method:edit?'PATCH':'POST',body:JSON.stringify(payload)});
      setEdit(undefined);setNotice(edit?'Content updated.':'Content added.');await load();
    }catch(err){setError(err instanceof Error?err.message:'Unable to save content')}
    finally{setSaving(false)}
  };

  const quickStatus=async(row:ContentRow,status:string)=>{
    try{await adminApi(`/api/content_items/${row.id}`,{method:'PATCH',body:JSON.stringify({status})});setRows(v=>v.map(x=>x.id===row.id?{...x,status}:x))}
    catch(err){setError(err instanceof Error?err.message:'Unable to update status')}
  };

  const allFiltered=filtered.length>0&&filtered.every(r=>selected.includes(r.id));
  const toggleVisible=()=>setSelected(allFiltered?selected.filter(id=>!filtered.some(r=>r.id===id)):[...new Set([...selected,...filtered.map(r=>r.id)])]);

  const applyClient=async()=>{
    if(!selected.length||bulkClient==='')return;setSaving(true);setError('');
    try{
      const clientId=bulkClient==='internal'?null:Number(bulkClient);
      await inChunks(selected,8,id=>adminApi(`/api/content_items/${id}`,{method:'PATCH',body:JSON.stringify({client_id:clientId})}));
      setSelected([]);setBulkClient('');setNotice('Client assignment updated.');await load();
    }catch(err){setError(err instanceof Error?err.message:'Bulk client assignment failed')}
    finally{setSaving(false)}
  };
  const applyStatus=async()=>{
    if(!selected.length||!bulkStatus)return;setSaving(true);setError('');
    try{await adminApi('/api/bulk',{method:'POST',body:JSON.stringify({entity:'content_items',ids:selected,action:'status',status:bulkStatus})});setSelected([]);setBulkStatus('');setNotice('Status updated for selected content.');await load()}
    catch(err){setError(err instanceof Error?err.message:'Bulk status update failed')}
    finally{setSaving(false)}
  };
  const deleteSelected=async()=>{
    if(!superAdmin||!selected.length)return;if(!confirm(`Permanently delete ${selected.length} selected content item${selected.length===1?'':'s'}?`))return;setSaving(true);setError('');
    try{await adminApi('/api/bulk',{method:'POST',body:JSON.stringify({entity:'content_items',ids:selected,action:'delete'})});setSelected([]);setNotice('Selected content deleted.');await load()}
    catch(err){setError(err instanceof Error?err.message:'Delete failed')}
    finally{setSaving(false)}
  };

  const downloadTemplate=()=>{
    const rows=[{Client:'Example Client',Title:'August market update',Campaign:'August Campaign',Platform:'Instagram',Format:'Carousel',Status:'scheduled','Publish Date':'2026-08-28 10:00',Caption:'', 'Asset URL':''}];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Content Schedule');XLSX.writeFile(wb,'IDEA-LAB-Content-Schedule-Template.xlsx');
  };
  const importExcel=async(file:File)=>{
    setSaving(true);setError('');setNotice('');
    try{
      const data=await file.arrayBuffer();const wb=XLSX.read(data,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const source=XLSX.utils.sheet_to_json<Record<string,unknown>>(ws,{defval:''}).slice(0,100);
      const clientMap=new Map<string,number>();clients.forEach(c=>{clientMap.set(c.name.toLowerCase(),c.id);if(c.company)clientMap.set(c.company.toLowerCase(),c.id)});
      const payloads=source.map(row=>{
        const title=String(pick(row,'title','content title','topic','post')||'').trim();if(!title)return null;
        const clientText=String(pick(row,'client','client name','client_name')||'').trim().toLowerCase();const client_id=clientText?(clientMap.get(clientText)||null):null;
        const publish_at=excelDate(pick(row,'publish date','publish_date','publish_at','date','schedule'));
        const raw=String(pick(row,'status')||'').trim().toLowerCase().replace(/\s+/g,'_');const status=ALL_STATUSES.includes(raw as any)?raw:(publish_at?'scheduled':'idea');
        return{client_id,title,campaign:String(pick(row,'campaign','heading')||''),platform:String(pick(row,'platform','channel')||'Instagram'),format:String(pick(row,'format','content type','type')||'Post'),status,publish_at,caption:String(pick(row,'caption','copy','description')||''),asset_url:String(pick(row,'asset url','asset_url','asset','link')||'')};
      }).filter(Boolean) as Array<Record<string,unknown>>;
      if(!payloads.length)throw new Error('No valid content rows found. The Title column is required.');
      await inChunks(payloads,6,p=>adminApi('/api/content_items',{method:'POST',body:JSON.stringify(p)}));
      setNotice(`${payloads.length} content item${payloads.length===1?'':'s'} imported. Items without a matched client are flagged as Needs client.`);await load();
    }catch(err){setError(err instanceof Error?err.message:'Excel import failed')}
    finally{setSaving(false);if(fileRef.current)fileRef.current.value=''}
  };

  const scheduleGroups=useMemo(()=>{
    const map=new Map<string,ContentRow[]>();
    [...filtered].sort((a,b)=>{const ad=localDate(a.publish_at)?.getTime()??Number.MAX_SAFE_INTEGER;const bd=localDate(b.publish_at)?.getTime()??Number.MAX_SAFE_INTEGER;return ad-bd}).forEach(row=>{const k=dateKey(row.publish_at);map.set(k,[...(map.get(k)||[]),row])});
    return [...map.entries()];
  },[filtered]);

  if(!activeRoute||!target)return null;
  return createPortal(<section className="il-cpv8-root">
    <div className="il-cpv8-heading">
      <div><span>CONTENT OPERATIONS</span><h2>Plan by client. Know what is due.</h2><p>Every item has a clear client, stage, owner and publishing date. Fix unassigned imported content in bulk.</p></div>
      <div className="il-cpv8-head-actions"><button className="il-admin-button" onClick={downloadTemplate}><Download size={15}/> Template</button><button className="il-admin-button" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Import Excel</button><input ref={fileRef} hidden type="file" accept=".xlsx,.xls,.csv" onChange={e=>{const f=e.target.files?.[0];if(f)void importExcel(f)}}/><button className="il-admin-button il-admin-primary" onClick={openNew}><Plus size={15}/> Add content</button></div>
    </div>

    <div className="il-cpv8-stats">
      <Stat label="Needs client" value={needsClient} tone={needsClient?'danger':'ok'} hint="Imported/internal items" onClick={()=>setClientFilter('internal')}/>
      <Stat label="Due today" value={dueToday} tone={dueToday?'warn':'ok'} hint="Publishing today"/>
      <Stat label="Next 7 days" value={nextWeek} hint="Scheduled workload"/>
      <Stat label="Overdue" value={overdue} tone={overdue?'danger':'ok'} hint="Needs attention"/>
      <Stat label="Review queue" value={reviewQueue} hint="Review + approved" onClick={()=>setStatusFilter('review')}/>
    </div>

    {!!notice&&<div className="il-cpv8-notice">{notice}<button onClick={()=>setNotice('')}>×</button></div>}
    {!!error&&<div className="il-cpv8-error"><AlertTriangle size={15}/>{error}<button onClick={()=>setError('')}>×</button></div>}

    <div className="il-cpv8-toolbar">
      <label className="il-cpv8-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title, campaign, client…"/></label>
      <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)}><option value="all">All clients</option><option value="internal">Needs client / internal</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All stages</option>{ALL_STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select>
      <select value={platformFilter} onChange={e=>setPlatformFilter(e.target.value)}><option value="all">All platforms</option>{platforms.map(p=><option key={p}>{p}</option>)}</select>
      <select value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}><option value="all">All owners</option><option value="unassigned">Unassigned owner</option>{owners.map(o=><option key={o}>{o}</option>)}</select>
      <div className="il-cpv8-view"><button className={view==='board'?'active':''} onClick={()=>setMode('board')}><LayoutGrid size={15}/> Board</button><button className={view==='schedule'?'active':''} onClick={()=>setMode('schedule')}><CalendarDays size={15}/> Schedule</button><button className={view==='list'?'active':''} onClick={()=>setMode('list')}><List size={15}/> List</button></div>
    </div>

    <div className="il-cpv8-selectbar">
      <label><input type="checkbox" checked={allFiltered} onChange={toggleVisible}/><span>{allFiltered?'Clear visible':'Select visible'}</span></label><span>{filtered.length} shown</span>{selected.length>0&&<b>{selected.length} selected</b>}
    </div>

    {selected.length>0&&<div className="il-cpv8-bulk">
      <div><CheckSquare2 size={16}/><b>{selected.length} selected</b><span>Fix several items without opening them one by one.</span></div>
      <div className="il-cpv8-bulk-actions"><select value={bulkClient} onChange={e=>setBulkClient(e.target.value)}><option value="">Assign client…</option><option value="internal">IDEA LAB / internal</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button disabled={!bulkClient||saving} onClick={()=>void applyClient()}>Apply client</button><select value={bulkStatus} onChange={e=>setBulkStatus(e.target.value)}><option value="">Move stage…</option>{ALL_STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select><button disabled={!bulkStatus||saving} onClick={()=>void applyStatus()}>Apply stage</button>{superAdmin&&<button className="danger" disabled={saving} onClick={()=>void deleteSelected()}><Trash2 size={14}/> Delete</button>}<button className="ghost" onClick={()=>setSelected([])}>Clear</button></div>
    </div>}

    {loading?<div className="il-cpv8-loading">Loading content operations…</div>:view==='board'?<div className="il-cpv8-board">{STATUSES.map(status=><div className="il-cpv8-column" key={status}><header><b>{statusLabel(status)}</b><span>{filtered.filter(r=>r.status===status).length}</span></header><div className="il-cpv8-column-body">{filtered.filter(r=>r.status===status).map(row=><ContentCard key={row.id} row={row} checked={selected.includes(row.id)} onCheck={checked=>setSelected(v=>checked?[...new Set([...v,row.id])]:v.filter(id=>id!==row.id))} onEdit={()=>openEdit(row)} onStatus={s=>void quickStatus(row,s)}/>)}</div></div>)}</div>:view==='schedule'?<div className="il-cpv8-schedule">{scheduleGroups.map(([day,items])=><section key={day}><div className="il-cpv8-day"><CalendarDays size={15}/><div><b>{day==='Unscheduled'?'Unscheduled':prettyDate(items[0].publish_at)}</b><small>{items.length} item{items.length===1?'':'s'}</small></div></div><div className="il-cpv8-agenda">{items.map(row=><ContentCard key={row.id} row={row} compact checked={selected.includes(row.id)} onCheck={checked=>setSelected(v=>checked?[...new Set([...v,row.id])]:v.filter(id=>id!==row.id))} onEdit={()=>openEdit(row)} onStatus={s=>void quickStatus(row,s)}/>)}</div></section>)}</div>:<div className="il-cpv8-list"><div className="il-cpv8-list-head"><span></span><b>Content</b><b>Client</b><b>Stage</b><b>Owner</b><b>Publish</b></div>{filtered.map(row=><button key={row.id} className="il-cpv8-list-row" onClick={()=>openEdit(row)}><span onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.includes(row.id)} onChange={e=>setSelected(v=>e.target.checked?[...new Set([...v,row.id])]:v.filter(id=>id!==row.id))}/></span><div><b>{row.title}</b><small>{row.campaign||[row.platform,row.format].filter(Boolean).join(' · ')}</small></div><span>{row.client_name||<em>Needs client</em>}</span><span className={`stage stage-${row.status}`}>{statusLabel(row.status)}</span><span>{row.owner_name||'Unassigned'}</span><span>{prettyDate(row.publish_at)}</span></button>)}</div>}

    {edit!==undefined&&<div className="il-cpv8-modal-backdrop" onMouseDown={closeModal}><div className="il-cpv8-modal" onMouseDown={e=>e.stopPropagation()}><header><div><small>CONTENT ITEM</small><h3>{edit?'Edit content':'Add content'}</h3></div><button onClick={closeModal}><X size={18}/></button></header><form onSubmit={save}><label>Client<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">IDEA LAB / internal</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}</select></label><label>Title *<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Campaign / heading<input value={form.campaign} onChange={e=>setForm({...form,campaign:e.target.value})}/></label><label>Platform<select value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}>{PLATFORMS.map(v=><option key={v}>{v}</option>)}</select></label><label>Format<select value={form.format} onChange={e=>setForm({...form,format:e.target.value})}>{FORMATS.map(v=><option key={v}>{v}</option>)}</select></label><label>Stage<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{ALL_STATUSES.map(v=><option key={v} value={v}>{statusLabel(v)}</option>)}</select></label><label>Publish date<input type="datetime-local" value={form.publish_at} onChange={e=>setForm({...form,publish_at:e.target.value})}/></label><label className="wide">Asset link<input value={form.asset_url} onChange={e=>setForm({...form,asset_url:e.target.value})}/></label><label className="wide">Caption / notes<textarea rows={6} value={form.caption} onChange={e=>setForm({...form,caption:e.target.value})}/></label><div className="wide il-cpv8-modal-actions"><button type="button" className="il-admin-button" onClick={closeModal}>Cancel</button><button disabled={saving} className="il-admin-button il-admin-primary">{saving?'Saving…':'Save content'}</button></div></form></div></div>}
  </section>,target);
}

function Stat({label,value,hint,tone,onClick}:{label:string;value:number;hint:string;tone?:'danger'|'warn'|'ok';onClick?:()=>void}){const Tag=onClick?'button':'div';return <Tag className={`il-cpv8-stat ${tone||''}`} onClick={onClick}><small>{label}</small><b>{value}</b><span>{hint}</span></Tag>}

function ContentCard({row,checked,onCheck,onEdit,onStatus,compact=false}:{row:ContentRow;checked:boolean;onCheck:(checked:boolean)=>void;onEdit:()=>void;onStatus:(status:string)=>void;compact?:boolean}){
  const overdue=active(row)&&localDate(row.publish_at)&&localDate(row.publish_at)!.getTime()<todayStart();
  return <article className={`il-cpv8-card ${compact?'compact':''} ${checked?'selected':''}`} onClick={onEdit}>
    <div className="il-cpv8-card-top"><label onClick={e=>e.stopPropagation()}><input type="checkbox" checked={checked} onChange={e=>onCheck(e.target.checked)}/></label><span className={row.client_id?'client':'internal'}>{row.client_name||'Needs client'}</span>{overdue&&<span className="overdue">Overdue</span>}</div>
    <h4>{row.title}</h4>{row.campaign&&<p className="il-cpv8-campaign">{row.campaign}</p>}
    <div className="il-cpv8-tags">{row.platform&&<span>{row.platform}</span>}{row.format&&<span>{row.format}</span>}</div>
    <div className="il-cpv8-card-foot"><div><b>{row.owner_name||'Unassigned'}</b><small>{prettyDate(row.publish_at)}</small></div><select value={row.status} onClick={e=>e.stopPropagation()} onChange={e=>onStatus(e.target.value)}>{ALL_STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></div>
  </article>;
}
