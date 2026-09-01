import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi, type D1Result } from './admin-api';
import './content-excel-automation.css';

type ContentItem = {
  id:number;
  client_id:number|null;
  client_name?:string|null;
  title:string;
  platform:string|null;
  format:string|null;
  status:string;
  publish_at:string|null;
  caption:string|null;
  asset_url:string|null;
};

type Client = { id:number; name:string; company?:string|null };
type SheetRow = Record<string, unknown>;
type ImportRow = {
  client_id:number|null;
  title:string;
  platform:string;
  format:string;
  status:string;
  publish_at:string|null;
  caption:string;
  asset_url:string;
};

const CONTENT_STATUSES = new Set(['idea','draft','review','approved','scheduled','published','cancelled']);

function normalKey(value:string){ return value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
function stringValue(value:unknown){ return value === null || value === undefined ? '' : String(value).trim(); }
function pick(row:SheetRow,...names:string[]){
  const mapped = new Map(Object.entries(row).map(([k,v])=>[normalKey(k),v]));
  for(const name of names){ const v=mapped.get(normalKey(name)); if(v!==undefined && v!==null && String(v).trim()!=='') return v; }
  return '';
}
function parseDate(value:unknown){
  if(value===null||value===undefined||value==='') return null;
  if(typeof value==='number'){
    const parsed=XLSX.SSF.parse_date_code(value);
    if(parsed){ const d=new Date(parsed.y,parsed.m-1,parsed.d,parsed.H||9,parsed.M||0,parsed.S||0); return Number.isNaN(d.getTime())?null:d.toISOString(); }
  }
  const d=new Date(String(value));
  return Number.isNaN(d.getTime())?null:d.toISOString();
}
function clientIdFor(value:unknown, clients:Client[]){
  const text=stringValue(value);
  if(!text) return null;
  const numeric=Number(text);
  if(Number.isInteger(numeric)&&clients.some(c=>c.id===numeric)) return numeric;
  const needle=text.toLowerCase();
  return clients.find(c=>c.name.toLowerCase()===needle||c.company?.toLowerCase()===needle)?.id||null;
}
function toImportRow(row:SheetRow,clients:Client[]):ImportRow|null{
  const title=stringValue(pick(row,'title','content title','topic','post'));
  if(!title) return null;
  const publish_at=parseDate(pick(row,'publish_at','publish date','publish_date','date','schedule','scheduled date','scheduled_date'));
  const rawStatus=stringValue(pick(row,'status')).toLowerCase().replace(/\s+/g,'_');
  const status=CONTENT_STATUSES.has(rawStatus) ? rawStatus : (publish_at ? 'scheduled' : 'idea');
  return {
    client_id:clientIdFor(pick(row,'client','client name','client_name','client_id'),clients),
    title,
    platform:stringValue(pick(row,'platform','channel'))||'Instagram',
    format:stringValue(pick(row,'format','content type','content_type','type'))||'Post',
    status,
    publish_at,
    caption:stringValue(pick(row,'caption','copy','description')),
    asset_url:stringValue(pick(row,'asset_url','asset url','asset','drive link','drive_link','link')),
  };
}
function reminderState(row:ContentItem){
  if(!row.publish_at||row.status==='published'||row.status==='cancelled') return null;
  const due=new Date(row.publish_at).getTime();
  if(Number.isNaN(due)) return null;
  const hours=(due-Date.now())/36e5;
  if(hours<0) return {kind:'overdue' as const,label:'Overdue'};
  if(hours<=24) return {kind:'today' as const,label:'Due within 24h'};
  if(hours<=72) return {kind:'soon' as const,label:'Due within 3 days'};
  return null;
}

export default function ContentExcelAutomation(){
  const [target,setTarget]=useState<Element|null>(null);
  const [open,setOpen]=useState(false);
  const [rows,setRows]=useState<ContentItem[]>([]);
  const [clients,setClients]=useState<Client[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const inputRef=useRef<HTMLInputElement|null>(null);

  const refresh=async()=>{
    try{
      const [content,clientRows]=await Promise.all([
        adminApi<D1Result<ContentItem>>('/api/content_items'),
        adminApi<D1Result<Client>>('/api/clients'),
      ]);
      setRows(content.results||[]); setClients(clientRows.results||[]);
    }catch{ /* planner page handles auth/errors */ }
  };

  useEffect(()=>{
    const find=()=>{
      const onPlanner=window.location.pathname.includes('/admin/content');
      setTarget(onPlanner?document.querySelector('.il-v2-page-head'):null);
      if(onPlanner) void refresh();
    };
    find();
    const observer=new MutationObserver(find); observer.observe(document.body,{childList:true,subtree:true});
    const timer=window.setInterval(find,2500);
    return()=>{observer.disconnect();window.clearInterval(timer)};
  },[]);

  const reminders=useMemo(()=>rows.map(row=>({row,state:reminderState(row)})).filter(x=>x.state),[rows]);
  const overdue=reminders.filter(x=>x.state?.kind==='overdue').length;
  const dueSoon=reminders.length-overdue;

  const downloadTemplate=()=>{
    const sample=[{
      Client:'IDEA LAB / internal',
      Title:'August campaign reel',
      Platform:'Instagram',
      Format:'Reel',
      Status:'scheduled',
      'Publish Date':'2026-08-25 18:00',
      Caption:'Caption text here',
      'Asset URL':'https://drive.google.com/...',
    }];
    const ws=XLSX.utils.json_to_sheet(sample);
    ws['!cols']=[{wch:24},{wch:30},{wch:16},{wch:14},{wch:14},{wch:20},{wch:45},{wch:42}];
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Content Schedule');
    XLSX.writeFile(wb,'IDEA-LAB-Content-Schedule-Template.xlsx');
  };

  const importFile=async(file:File)=>{
    setBusy(true); setMessage('Reading spreadsheet…');
    try{
      const bytes=await file.arrayBuffer();
      const workbook=XLSX.read(bytes,{type:'array',cellDates:true});
      const sheet=workbook.Sheets[workbook.SheetNames[0]];
      const raw=XLSX.utils.sheet_to_json<SheetRow>(sheet,{defval:''});
      const parsed=raw.map(row=>toImportRow(row,clients)).filter((row):row is ImportRow=>Boolean(row));
      if(!parsed.length) throw new Error('No valid rows found. The spreadsheet needs at least a Title column.');
      if(parsed.length>100) throw new Error('Please import 100 rows or fewer at a time.');
      let added=0,failed=0;
      for(const row of parsed){
        try{ await adminApi('/api/content_items',{method:'POST',body:JSON.stringify(row)}); added++; }
        catch{ failed++; }
      }
      setMessage(`${added} content item${added===1?'':'s'} added${failed?` · ${failed} skipped`:''}. Scheduled dates were added to the reminder queue.`);
      await refresh();
      window.dispatchEvent(new CustomEvent('idealab:content-imported'));
    }catch(error){ setMessage(error instanceof Error?error.message:'Unable to import spreadsheet.'); }
    finally{ setBusy(false); if(inputRef.current) inputRef.current.value=''; }
  };

  const enableNotifications=async()=>{
    if(!('Notification' in window)){setMessage('Browser notifications are not supported here. The in-portal reminders will still work.');return;}
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){setMessage('Notification permission was not enabled. In-portal reminders will still work.');return;}
    setMessage('Browser reminders enabled. You will see alerts while the portal is open.');
    const due=reminders.slice(0,3);
    if(due.length) new Notification('IDEA LAB Content Reminder',{body:`${due.length} item${due.length===1?'':'s'} need attention. Open Content Planner to review.`});
  };

  if(!target) return null;
  return <>{createPortal(<div className="il-excel-actions">
    <button className="il-admin-button" onClick={()=>setOpen(true)}><FileSpreadsheet size={15}/> Excel schedule {reminders.length>0&&<b>{reminders.length}</b>}</button>
  </div>,target)}
  {open&&createPortal(<div className="il-excel-backdrop" onMouseDown={()=>setOpen(false)}><div className="il-excel-modal" onMouseDown={e=>e.stopPropagation()}>
    <header><div><small>CONTENT AUTOMATION</small><h3>Excel schedule & reminders</h3><p>Import your monthly content plan and turn spreadsheet rows into scheduled CRM items.</p></div><button onClick={()=>setOpen(false)}><X size={18}/></button></header>
    <div className="il-excel-grid">
      <section><FileSpreadsheet size={22}/><h4>1. Use the template</h4><p>Columns: Client, Title, Platform, Format, Status, Publish Date, Caption, Asset URL.</p><button className="il-admin-button" onClick={downloadTemplate}><Download size={15}/> Download Excel template</button></section>
      <section><Upload size={22}/><h4>2. Import schedule</h4><p>Rows with a publish date automatically become Scheduled unless you provide another valid status.</p><input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f)}}/><button className="il-admin-button il-admin-primary" disabled={busy} onClick={()=>inputRef.current?.click()}><Upload size={15}/>{busy?'Importing…':'Choose Excel file'}</button></section>
    </div>
    <section className="il-excel-reminders"><div className="il-excel-reminder-head"><div><Bell size={18}/><span><b>Upload reminders</b><small>{overdue} overdue · {dueSoon} due soon</small></span></div><button className="il-admin-button" onClick={()=>void enableNotifications()}><Bell size={14}/> Enable browser alerts</button></div>
      {reminders.length?<div className="il-excel-reminder-list">{reminders.slice(0,8).map(({row,state})=><article key={row.id} className={`is-${state?.kind}`}><div><b>{row.title}</b><small>{row.client_name||'IDEA LAB / internal'} · {row.platform||'Platform'}</small></div><span>{state?.label}<small>{row.publish_at?new Date(row.publish_at).toLocaleString():''}</small></span></article>)}</div>:<div className="il-excel-empty">Nothing is due in the next 3 days.</div>}
    </section>
    {message&&<div className="il-excel-message">{message}</div>}
  </div></div>,document.body)}</>;
}
