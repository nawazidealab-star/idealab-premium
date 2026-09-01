import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, Check, CheckCircle2, ChevronRight, Circle,
  Clock3, LayoutGrid, List, Plus, Search, Trash2, UserRound, UsersRound, X,
} from 'lucide-react';
import { adminApi, type AppUser, type D1Result } from './admin-api';
import './tasks-workspace-v10.css';

type TaskRow={
  id:number;title:string;description?:string|null;status:string;priority:string;
  client_id:number|null;client_name?:string|null;project_id:number|null;project_name?:string|null;
  assigned_user_id:number|null;assignee_name?:string|null;created_by_name?:string|null;
  due_at:string|null;checklist_json?:string;completed_at?:string|null;
};
type ClientRow={id:number;name:string};
type ViewMode='board'|'list';
type SmartFilter='all'|'today'|'overdue'|'urgent'|'no_due';
type Scope='team'|'mine';
type FormState={title:string;description:string;client_id:string;assigned_user_id:string;priority:string;status:string;due_at:string;checklist:string};

const BOARD_STATUSES=['todo','in_progress','review','done'] as const;
const ALL_STATUSES=['todo','in_progress','review','done','cancelled'] as const;
const PRIORITIES=['low','medium','high','urgent'] as const;
const PRIORITY_WEIGHT:Record<string,number>={urgent:0,high:1,medium:2,low:3};

function prettyStatus(value:string){return value.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function dateValue(v:string|null){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
function when(v:string|null){const d=dateValue(v);if(!d)return'No due date';return new Intl.DateTimeFormat('en',{day:'numeric',month:'short',year:'numeric'}).format(d)}
function timeWhen(v:string|null){const d=dateValue(v);if(!d)return'';return new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit'}).format(d)}
function isClosed(t:TaskRow){return['done','cancelled'].includes(t.status)}
function isOverdue(t:TaskRow){const d=dateValue(t.due_at);return !!d&&!isClosed(t)&&d.getTime()<Date.now()}
function isToday(t:TaskRow){const d=dateValue(t.due_at);if(!d)return false;const n=new Date();return d.toDateString()===n.toDateString()}
function checklistItems(row:TaskRow){try{const v=JSON.parse(row.checklist_json||'[]');return Array.isArray(v)?v.map(String).filter(Boolean):[]}catch{return[]}}
function blankForm(userId?:number):FormState{return{title:'',description:'',client_id:'',assigned_user_id:userId?String(userId):'',priority:'medium',status:'todo',due_at:'',checklist:''}}
function formFor(row:TaskRow):FormState{return{title:row.title,description:row.description||'',client_id:row.client_id?String(row.client_id):'',assigned_user_id:row.assigned_user_id?String(row.assigned_user_id):'',priority:row.priority,status:row.status,due_at:row.due_at?row.due_at.slice(0,16):'',checklist:checklistItems(row).join('\n')}}

export default function TasksWorkspaceV10(){
  const location=useLocation();const active=location.pathname==='/admin/tasks';
  const[target,setTarget]=useState<Element|null>(null);
  const[user,setUser]=useState<AppUser|null>(null);const[rows,setRows]=useState<TaskRow[]>([]);const[clients,setClients]=useState<ClientRow[]>([]);const[users,setUsers]=useState<AppUser[]>([]);
  const[query,setQuery]=useState('');const[clientFilter,setClientFilter]=useState('all');const[assigneeFilter,setAssigneeFilter]=useState('all');const[priorityFilter,setPriorityFilter]=useState('all');const[smartFilter,setSmartFilter]=useState<SmartFilter>('all');
  const[scope,setScope]=useState<Scope>('team');const[view,setView]=useState<ViewMode>(()=>(localStorage.getItem('idealab-task-view') as ViewMode)||'board');
  const[selected,setSelected]=useState<number[]>([]);const[busy,setBusy]=useState(false);const[error,setError]=useState('');const[notice,setNotice]=useState('');
  const[editing,setEditing]=useState<TaskRow|null|undefined>(undefined);const[form,setForm]=useState<FormState>(blankForm());const[dirty,setDirty]=useState(false);
  const searchRef=useRef<HTMLInputElement|null>(null);
  const superAdmin=user?.role==='super_admin';

  useEffect(()=>{
    if(!active){document.documentElement.classList.remove('il-taskv10-active');setTarget(null);return}
    document.documentElement.classList.add('il-taskv10-active');
    const find=()=>setTarget(document.querySelector('.il-premium-content'));find();
    const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});
    return()=>{observer.disconnect();document.documentElement.classList.remove('il-taskv10-active')};
  },[active]);

  const load=async()=>{
    if(!active)return;setBusy(true);setError('');
    try{
      const me=await adminApi<{user:AppUser}>('/api/me');setUser(me.user);
      const all=me.user.role==='super_admin';
      const[t,c,u]=await Promise.all([
        adminApi<D1Result<TaskRow>>('/api/tasks'),adminApi<D1Result<ClientRow>>('/api/clients'),all?adminApi<D1Result<AppUser>>('/api/users'):Promise.resolve({results:[] as AppUser[]}),
      ]);
      setRows(t.results||[]);setClients(c.results||[]);setUsers(u.results||[]);
    }catch(e){setError(e instanceof Error?e.message:'Unable to load tasks')}
    finally{setBusy(false)}
  };
  useEffect(()=>{void load()},[active]);

  useEffect(()=>{
    if(!active)return;
    const key=(e:KeyboardEvent)=>{
      const tag=(e.target as HTMLElement)?.tagName?.toLowerCase();const typing=['input','textarea','select'].includes(tag);
      if(e.key==='/'&&!typing){e.preventDefault();searchRef.current?.focus()}
      if((e.key==='n'||e.key==='N')&&!typing){e.preventDefault();openNew()}
      if(e.key==='Escape'&&editing!==undefined)closeEditor();
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[active,editing,user]);

  const filtered=useMemo(()=>rows.filter(r=>{
    if(superAdmin&&scope==='mine'&&r.assigned_user_id!==user?.id)return false;
    if(clientFilter!=='all'&&String(r.client_id)!==clientFilter)return false;
    if(superAdmin&&assigneeFilter!=='all'&&String(r.assigned_user_id)!==assigneeFilter)return false;
    if(priorityFilter!=='all'&&r.priority!==priorityFilter)return false;
    if(smartFilter==='today'&&!isToday(r))return false;
    if(smartFilter==='overdue'&&!isOverdue(r))return false;
    if(smartFilter==='urgent'&&!(r.priority==='urgent'&&!isClosed(r)))return false;
    if(smartFilter==='no_due'&&(r.due_at||isClosed(r)))return false;
    const q=query.trim().toLowerCase();
    return !q||`${r.title} ${r.description||''} ${r.client_name||''} ${r.project_name||''} ${r.assignee_name||''}`.toLowerCase().includes(q);
  }).sort((a,b)=>{
    if(isClosed(a)!==isClosed(b))return isClosed(a)?1:-1;
    if(isOverdue(a)!==isOverdue(b))return isOverdue(a)?-1:1;
    const p=(PRIORITY_WEIGHT[a.priority]??9)-(PRIORITY_WEIGHT[b.priority]??9);if(p)return p;
    return (dateValue(a.due_at)?.getTime()??Number.MAX_SAFE_INTEGER)-(dateValue(b.due_at)?.getTime()??Number.MAX_SAFE_INTEGER);
  }),[rows,query,clientFilter,assigneeFilter,priorityFilter,smartFilter,superAdmin,scope,user?.id]);

  const openRows=rows.filter(r=>!isClosed(r));
  const stats={open:openRows.length,today:openRows.filter(isToday).length,overdue:openRows.filter(isOverdue).length,urgent:openRows.filter(r=>r.priority==='urgent').length,noDue:openRows.filter(r=>!r.due_at).length};
  const setMode=(next:ViewMode)=>{setView(next);localStorage.setItem('idealab-task-view',next)};

  const openNew=()=>{setEditing(null);setForm(blankForm(user?.id));setDirty(false);setError('')};
  const openEdit=(row:TaskRow)=>{setEditing(row);setForm(formFor(row));setDirty(false);setError('')};
  const closeEditor=()=>{if(dirty&&!confirm('Discard unsaved task changes?'))return;setEditing(undefined);setDirty(false)};
  const updateForm=(patch:Partial<FormState>)=>{setForm(v=>({...v,...patch}));setDirty(true)};

  const save=async(e:React.FormEvent)=>{
    e.preventDefault();if(!form.title.trim())return;setBusy(true);setError('');
    try{
      const payload={title:form.title.trim(),description:form.description.trim()||null,client_id:form.client_id?Number(form.client_id):null,assigned_user_id:form.assigned_user_id?Number(form.assigned_user_id):null,priority:form.priority,status:form.status,due_at:form.due_at||null,checklist:form.checklist.split('\n').map(x=>x.trim()).filter(Boolean)};
      await adminApi(editing?`/api/tasks/${editing.id}`:'/api/tasks',{method:editing?'PATCH':'POST',body:JSON.stringify(payload)});
      setEditing(undefined);setDirty(false);setNotice(editing?'Task updated.':'Task created.');await load();
    }catch(e){setError(e instanceof Error?e.message:'Unable to save task')}
    finally{setBusy(false)}
  };

  const quickStatus=async(row:TaskRow,status:string)=>{
    const old=row.status;setRows(v=>v.map(x=>x.id===row.id?{...x,status}:x));
    try{await adminApi(`/api/tasks/${row.id}`,{method:'PATCH',body:JSON.stringify({status})});setNotice(status==='done'?'Task marked complete.':'Task stage updated.')}
    catch(e){setRows(v=>v.map(x=>x.id===row.id?{...x,status:old}:x));setError(e instanceof Error?e.message:'Update failed')}
  };
  const toggleAll=()=>setSelected(filtered.length&&filtered.every(r=>selected.includes(r.id))?selected.filter(id=>!filtered.some(r=>r.id===id)):[...new Set([...selected,...filtered.map(r=>r.id)])]);
  const bulkStatus=async(status:string)=>{if(!selected.length)return;setBusy(true);try{await adminApi('/api/bulk',{method:'POST',body:JSON.stringify({entity:'tasks',ids:selected,action:'status',status})});setSelected([]);setNotice(`${selected.length} task${selected.length===1?'':'s'} moved to ${prettyStatus(status)}.`);await load()}catch(e){setError(e instanceof Error?e.message:'Bulk update failed')}finally{setBusy(false)}};
  const bulkDelete=async()=>{if(!superAdmin||!selected.length)return;if(!confirm(`Permanently delete ${selected.length} selected task${selected.length===1?'':'s'}? This cannot be undone.`))return;setBusy(true);try{await adminApi('/api/bulk',{method:'POST',body:JSON.stringify({entity:'tasks',ids:selected,action:'delete'})});setNotice(`${selected.length} task${selected.length===1?'':'s'} deleted.`);setSelected([]);await load()}catch(e){setError(e instanceof Error?e.message:'Delete failed')}finally{setBusy(false)}};
  const deleteOne=async(row:TaskRow)=>{if(!superAdmin)return;if(!confirm(`Delete “${row.title}” permanently?`))return;setSelected([row.id]);setEditing(undefined);setTimeout(()=>void bulkDelete(),0)};

  const resetFilters=()=>{setQuery('');setClientFilter('all');setAssigneeFilter('all');setPriorityFilter('all');setSmartFilter('all')};
  if(!active||!target)return null;

  return createPortal(<section className="il-taskv10-root">
    <div className="il-taskv10-heading">
      <div><span>WORK MANAGEMENT</span><h2>{superAdmin&&scope==='team'?'Team task command center':'My task focus'}</h2><p>{superAdmin&&scope==='team'?'See ownership, deadlines and blockers without opening every task.':'A focused queue of work assigned to you.'}</p></div>
      <div className="il-taskv10-heading-actions">
        {superAdmin&&<div className="il-taskv10-scope"><button className={scope==='team'?'active':''} onClick={()=>setScope('team')}><UsersRound size={14}/> Team</button><button className={scope==='mine'?'active':''} onClick={()=>setScope('mine')}><UserRound size={14}/> My work</button></div>}
        <button className="il-admin-button il-admin-primary" onClick={openNew}><Plus size={15}/> New task <kbd>N</kbd></button>
      </div>
    </div>

    <div className="il-taskv10-stats">
      <Stat label="Open work" value={stats.open} hint="Active tasks" active={smartFilter==='all'} onClick={()=>setSmartFilter('all')}/>
      <Stat label="Due today" value={stats.today} hint="Finish today" active={smartFilter==='today'} onClick={()=>setSmartFilter('today')} tone={stats.today?'blue':undefined}/>
      <Stat label="Overdue" value={stats.overdue} hint="Needs action" active={smartFilter==='overdue'} onClick={()=>setSmartFilter('overdue')} tone={stats.overdue?'danger':undefined}/>
      <Stat label="Urgent" value={stats.urgent} hint="High attention" active={smartFilter==='urgent'} onClick={()=>setSmartFilter('urgent')} tone={stats.urgent?'warn':undefined}/>
      <Stat label="No due date" value={stats.noDue} hint="Needs planning" active={smartFilter==='no_due'} onClick={()=>setSmartFilter('no_due')}/>
    </div>

    {!!notice&&<div className="il-taskv10-notice"><CheckCircle2 size={15}/>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
    {!!error&&<div className="il-taskv10-error"><AlertTriangle size={15}/>{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}

    <div className="il-taskv10-toolbar">
      <label className="il-taskv10-search"><Search size={15}/><input ref={searchRef} placeholder="Search tasks, clients, assignees…" value={query} onChange={e=>setQuery(e.target.value)}/><kbd>/</kbd></label>
      <select value={clientFilter} onChange={e=>setClientFilter(e.target.value)}><option value="all">All clients</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {superAdmin&&scope==='team'&&<select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)}><option value="all">All assignees</option>{users.filter(u=>(u as any).active!==0).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>}
      <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option value="all">All priorities</option>{PRIORITIES.map(p=><option key={p} value={p}>{prettyStatus(p)}</option>)}</select>
      <div className="il-taskv10-view"><button className={view==='board'?'active':''} onClick={()=>setMode('board')}><LayoutGrid size={14}/> Board</button><button className={view==='list'?'active':''} onClick={()=>setMode('list')}><List size={14}/> List</button></div>
    </div>

    <div className="il-taskv10-context">
      <div><label><input type="checkbox" checked={!!filtered.length&&filtered.every(r=>selected.includes(r.id))} onChange={toggleAll}/> Select visible</label><span>{filtered.length} task{filtered.length===1?'':'s'} shown</span>{selected.length>0&&<b>{selected.length} selected</b>}</div>
      {(query||clientFilter!=='all'||assigneeFilter!=='all'||priorityFilter!=='all'||smartFilter!=='all')&&<button onClick={resetFilters}>Clear filters</button>}
    </div>

    {selected.length>0&&<div className="il-taskv10-bulk"><div><Check size={15}/><div><b>{selected.length} selected</b><small>Move several tasks in one click.</small></div></div><div>{BOARD_STATUSES.map(s=><button key={s} disabled={busy} onClick={()=>void bulkStatus(s)}>{prettyStatus(s)}</button>)}{superAdmin&&<button className="danger" disabled={busy} onClick={()=>void bulkDelete()}><Trash2 size={14}/> Delete</button>}<button className="ghost" onClick={()=>setSelected([])}>Clear</button></div></div>}

    {busy&&!rows.length?<div className="il-taskv10-loading">Loading your workspace…</div>:filtered.length===0?<Empty onCreate={openNew} onReset={resetFilters}/>:view==='board'?
      <div className="il-taskv10-board">{BOARD_STATUSES.map(status=>{const items=filtered.filter(r=>r.status===status);return <section key={status}><header><div><span className={`stage-dot ${status}`}/><b>{prettyStatus(status)}</b></div><span>{items.length}</span></header><div className="il-taskv10-column-body">{items.length?items.map(r=><TaskCard key={r.id} row={r} selected={selected.includes(r.id)} onSelect={v=>setSelected(s=>v?[...new Set([...s,r.id])]:s.filter(id=>id!==r.id))} onOpen={()=>openEdit(r)} onStatus={s=>void quickStatus(r,s)}/>):<div className="il-taskv10-column-empty"><Circle size={15}/><span>No tasks here</span></div>}</div></section>})}</div>
      :<div className="il-taskv10-list"><div className="il-taskv10-list-head"><span></span><b>Task</b><b>Client</b><b>Owner</b><b>Priority</b><b>Due</b><b>Stage</b><span></span></div>{filtered.map(r=><div className="il-taskv10-list-row" key={r.id} onClick={()=>openEdit(r)}><span onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>setSelected(s=>e.target.checked?[...new Set([...s,r.id])]:s.filter(id=>id!==r.id))}/></span><div><b>{r.title}</b><small>{r.description||r.project_name||'No description added'}</small></div><span>{r.client_name||'Internal'}</span><span>{r.assignee_name||'Unassigned'}</span><span className={`priority ${r.priority}`}>{prettyStatus(r.priority)}</span><span className={isOverdue(r)?'overdue':''}>{when(r.due_at)}{r.due_at&&<small>{timeWhen(r.due_at)}</small>}</span><span onClick={e=>e.stopPropagation()}><select value={r.status} onChange={e=>void quickStatus(r,e.target.value)}>{ALL_STATUSES.map(s=><option key={s} value={s}>{prettyStatus(s)}</option>)}</select></span><ChevronRight size={15}/></div>)}</div>}

    {editing!==undefined&&<div className="il-taskv10-modal-backdrop" onMouseDown={closeEditor}><div className="il-taskv10-modal" onMouseDown={e=>e.stopPropagation()}><header><div><small>{editing?'TASK DETAILS':'NEW TASK'}</small><h3>{editing?editing.title:'Create a clear task'}</h3><p>{editing?'Update ownership, deadline and next stage.':'Give the task enough context so nobody has to ask what it means.'}</p></div><button onClick={closeEditor}><X size={18}/></button></header><form onSubmit={save}>
      <label className="wide">Task title *<input autoFocus required value={form.title} onChange={e=>updateForm({title:e.target.value})} placeholder="e.g. Finalise August content calendar"/></label>
      <label className="wide">Description<textarea rows={4} value={form.description} onChange={e=>updateForm({description:e.target.value})} placeholder="What needs to be done? Add enough context for the assignee."/></label>
      <label>Client<select value={form.client_id} onChange={e=>updateForm({client_id:e.target.value})}><option value="">IDEA LAB / internal</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      {superAdmin?<label>Assignee<select value={form.assigned_user_id} onChange={e=>updateForm({assigned_user_id:e.target.value})}><option value="">Unassigned</option>{users.filter(u=>(u as any).active!==0).map(u=><option key={u.id} value={u.id}>{u.name} · {prettyStatus(u.role)}</option>)}</select></label>:<label>Assignee<div className="il-taskv10-readonly"><UserRound size={14}/>{user?.name||'You'}</div></label>}
      <label>Priority<select value={form.priority} onChange={e=>updateForm({priority:e.target.value})}>{PRIORITIES.map(p=><option key={p} value={p}>{prettyStatus(p)}</option>)}</select></label>
      <label>Stage<select value={form.status} onChange={e=>updateForm({status:e.target.value})}>{ALL_STATUSES.map(s=><option key={s} value={s}>{prettyStatus(s)}</option>)}</select></label>
      <label className="wide">Due date & time<input type="datetime-local" value={form.due_at} onChange={e=>updateForm({due_at:e.target.value})}/><small>Leave blank only when there is genuinely no deadline.</small></label>
      <label className="wide">Checklist<textarea rows={5} value={form.checklist} onChange={e=>updateForm({checklist:e.target.value})} placeholder={'One step per line\nDraft copy\nClient approval\nSchedule post'}/><small>One checklist step per line.</small></label>
      <div className="wide il-taskv10-modal-actions">{editing&&superAdmin&&<button type="button" className="danger" onClick={()=>void deleteOne(editing)}><Trash2 size={14}/> Delete task</button>}<span/><button type="button" className="il-admin-button" onClick={closeEditor}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={busy||!form.title.trim()}>{busy?'Saving…':editing?'Save changes':'Create task'}</button></div>
    </form></div></div>}
  </section>,target)
}

function Stat({label,value,hint,tone,active,onClick}:{label:string;value:number;hint:string;tone?:string;active:boolean;onClick:()=>void}){return <button className={`il-taskv10-stat ${tone||''} ${active?'active':''}`} onClick={onClick}><small>{label}</small><b>{value}</b><span>{hint}</span><ChevronRight size={14}/></button>}

function TaskCard({row,selected,onSelect,onOpen,onStatus}:{row:TaskRow;selected:boolean;onSelect:(v:boolean)=>void;onOpen:()=>void;onStatus:(s:string)=>void}){
  const list=checklistItems(row);return <article className={`il-taskv10-card ${selected?'selected':''} ${isOverdue(row)?'is-overdue':''}`} onClick={onOpen}>
    <div className="il-taskv10-card-top"><label onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selected} onChange={e=>onSelect(e.target.checked)}/></label><span className={`priority ${row.priority}`}>{prettyStatus(row.priority)}</span>{isOverdue(row)&&<span className="overdue">Overdue</span>}</div>
    <h4>{row.title}</h4>{row.description&&<p>{row.description}</p>}
    {list.length>0&&<div className="il-taskv10-checklist"><CheckCircle2 size={13}/><span>{list.length} checklist step{list.length===1?'':'s'}</span></div>}
    <div className="il-taskv10-meta"><span><UserRound size={12}/>{row.assignee_name||'Unassigned'}</span><span>{row.client_name||'Internal'}</span></div>
    <div className="il-taskv10-foot"><span className={isOverdue(row)?'overdue-text':''}><CalendarClock size={12}/>{when(row.due_at)}</span><div onClick={e=>e.stopPropagation()}>{row.status!=='done'&&<button className="quick-done" title="Mark complete" onClick={()=>onStatus('done')}><Check size={13}/></button>}<select value={row.status} onChange={e=>onStatus(e.target.value)}>{ALL_STATUSES.map(s=><option key={s} value={s}>{prettyStatus(s)}</option>)}</select></div></div>
  </article>
}

function Empty({onCreate,onReset}:{onCreate:()=>void;onReset:()=>void}){return <div className="il-taskv10-empty"><div><CheckCircle2 size={26}/></div><h3>Nothing in this view</h3><p>Your filters may be hiding tasks, or there is genuinely nothing to work on here.</p><div><button className="il-admin-button" onClick={onReset}>Clear filters</button><button className="il-admin-button il-admin-primary" onClick={onCreate}><Plus size={14}/> Create task</button></div></div>}
