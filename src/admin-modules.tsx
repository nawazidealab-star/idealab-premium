import React, { useEffect, useMemo, useState } from 'react';
import { LogOut, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import { adminApi, logoutAdmin, type AppUser, type D1Result, type Role } from './admin-api';

export type PortalFrame = React.ComponentType<{ title: string; children: React.ReactNode }>;

function useRows<T>(path: string) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await adminApi<D1Result<T>>(path);
      setRows(result.results || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [path]);
  return { rows, setRows, loading, error, setError, load };
}

function formatMoney(value: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
  } catch {
    return `${currency} ${(value || 0).toLocaleString()}`;
  }
}

function dateOnly(value?: string | null) {
  if (!value) return '-';
  return value.slice(0, 10);
}

function searchable<T extends Record<string, unknown>>(rows: T[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => Object.values(row).filter((v) => v !== null && v !== undefined).join(' ').toLowerCase().includes(needle));
}

function Status({ children }: { children: React.ReactNode }) {
  return <span className="il-admin-status">{String(children).replaceAll('_', ' ')}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="il-admin-modal-backdrop" onMouseDown={onClose}>
      <div className="il-admin-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="il-admin-panel-heading">
          <h3>{title}</h3>
          <button className="il-admin-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PageToolbar({ query, onQuery, onRefresh, onAdd, addLabel }: { query: string; onQuery: (value: string) => void; onRefresh: () => void; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="il-admin-toolbar">
      <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search..." />
      <div className="il-admin-actions-row">
        <button className="il-admin-button" onClick={onRefresh}><RefreshCw size={15} /> Refresh</button>
        {onAdd && <button className="il-admin-button il-admin-primary" onClick={onAdd}><Plus size={15} /> {addLabel || 'Add'}</button>}
      </div>
    </div>
  );
}

type Client = { id: number; name: string; company: string | null; email: string | null; phone: string | null; status: string; country: string | null; notes: string | null; created_at: string };

type ClientForm = { name: string; company: string; email: string; phone: string; status: string; country: string; notes: string };
const emptyClient: ClientForm = { name: '', company: '', email: '', phone: '', status: 'active', country: '', notes: '' };

export function ClientsModule({ Frame, canWrite }: { Frame: PortalFrame; canWrite: boolean }) {
  const data = useRows<Client>('/api/clients');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyClient);
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => searchable(data.rows as unknown as Record<string, unknown>[], query) as unknown as Client[], [data.rows, query]);

  const openEdit = (row: Client) => {
    setEditing(row);
    setForm({ name: row.name, company: row.company || '', email: row.email || '', phone: row.phone || '', status: row.status, country: row.country || '', notes: row.notes || '' });
    setShowForm(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); data.setError(null);
    try {
      await adminApi(editing ? `/api/clients/${editing.id}` : '/api/clients', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(form) });
      setShowForm(false); setEditing(null); setForm(emptyClient); await data.load();
    } catch (err) { data.setError(err instanceof Error ? err.message : 'Unable to save client.'); }
    finally { setSaving(false); }
  };

  return (
    <Frame title="Clients">
      <div className="il-admin-panel">
        <PageToolbar query={query} onQuery={setQuery} onRefresh={() => void data.load()} onAdd={canWrite ? () => { setEditing(null); setForm(emptyClient); setShowForm(true); } : undefined} addLabel="Add Client" />
        {data.error && <div className="il-admin-inline-error">{data.error}</div>}
        {data.loading ? <div className="il-admin-empty">Loading clients...</div> : rows.length ? (
          <div className="il-admin-table-wrap"><table className="il-admin-table"><thead><tr><th>Client</th><th>Company</th><th>Contact</th><th>Country</th><th>Status</th><th>Created</th>{canWrite && <th />}</tr></thead><tbody>
            {rows.map((row) => <tr key={row.id}><td><b>{row.name}</b></td><td>{row.company || '-'}</td><td>{row.email || row.phone || '-'}</td><td>{row.country || '-'}</td><td><Status>{row.status}</Status></td><td>{dateOnly(row.created_at)}</td>{canWrite && <td><button className="il-admin-icon-button" onClick={() => openEdit(row)}><Pencil size={15} /></button></td>}</tr>)}
          </tbody></table></div>
        ) : <div className="il-admin-empty">No clients yet.</div>}
      </div>
      {showForm && <Modal title={editing ? 'Edit client' : 'Add client'} onClose={() => setShowForm(false)}><form className="il-admin-form" onSubmit={submit}>
        <label>Name *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Company<input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Country<input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="paused">Paused</option><option value="inactive">Inactive</option></select></label>
        <label className="il-admin-form-wide">Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <div className="il-admin-form-wide il-admin-form-actions"><button type="button" className="il-admin-button" onClick={() => setShowForm(false)}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={saving}>{saving ? 'Saving...' : 'Save client'}</button></div>
      </form></Modal>}
    </Frame>
  );
}

type Project = { id: number; client_id: number; client_name?: string; name: string; type: string | null; status: string; start_date: string | null; due_date: string | null; budget?: number; currency?: string; progress: number };
type SimpleClient = { id: number; name: string };

type ProjectForm = { client_id: string; name: string; type: string; status: string; start_date: string; due_date: string; budget: string; currency: string; progress: string };
const emptyProject: ProjectForm = { client_id: '', name: '', type: '', status: 'planned', start_date: '', due_date: '', budget: '', currency: 'USD', progress: '0' };

export function ProjectsModule({ Frame, canWrite, canSeeFinancials }: { Frame: PortalFrame; canWrite: boolean; canSeeFinancials: boolean }) {
  const data = useRows<Project>('/api/projects'); const clients = useRows<SimpleClient>('/api/clients');
  const [query, setQuery] = useState(''); const [show, setShow] = useState(false); const [editing, setEditing] = useState<Project | null>(null); const [form, setForm] = useState<ProjectForm>(emptyProject); const [saving, setSaving] = useState(false);
  const rows = useMemo(() => searchable(data.rows as unknown as Record<string, unknown>[], query) as unknown as Project[], [data.rows, query]);
  const openEdit = (row: Project) => { setEditing(row); setForm({ client_id: String(row.client_id), name: row.name, type: row.type || '', status: row.status, start_date: row.start_date || '', due_date: row.due_date || '', budget: row.budget === undefined ? '' : String(row.budget), currency: row.currency || 'USD', progress: String(row.progress || 0) }); setShow(true); };
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setSaving(true); data.setError(null); try { const payload = { ...form, client_id: Number(form.client_id), progress: Number(form.progress || 0), ...(canSeeFinancials ? { budget: Number(form.budget || 0) } : {}) }; await adminApi(editing ? `/api/projects/${editing.id}` : '/api/projects', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); setShow(false); setEditing(null); setForm(emptyProject); await data.load(); } catch (err) { data.setError(err instanceof Error ? err.message : 'Unable to save project.'); } finally { setSaving(false); } };
  return <Frame title="Projects"><div className="il-admin-panel"><PageToolbar query={query} onQuery={setQuery} onRefresh={() => void data.load()} onAdd={canWrite ? () => { setEditing(null); setForm(emptyProject); setShow(true); } : undefined} addLabel="Add Project" />{data.error && <div className="il-admin-inline-error">{data.error}</div>}{data.loading ? <div className="il-admin-empty">Loading projects...</div> : rows.length ? <div className="il-admin-table-wrap"><table className="il-admin-table"><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Progress</th><th>Due</th>{canSeeFinancials && <th>Budget</th>}{canWrite && <th />}</tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td><b>{r.name}</b><small className="il-admin-cell-note">{r.type || ''}</small></td><td>{r.client_name || '-'}</td><td><Status>{r.status}</Status></td><td>{r.progress}%</td><td>{dateOnly(r.due_date)}</td>{canSeeFinancials && <td>{formatMoney(r.budget || 0, r.currency || 'USD')}</td>}{canWrite && <td><button className="il-admin-icon-button" onClick={() => openEdit(r)}><Pencil size={15} /></button></td>}</tr>)}</tbody></table></div> : <div className="il-admin-empty">No projects yet.</div>}</div>{show && <Modal title={editing ? 'Edit project' : 'Add project'} onClose={() => setShow(false)}><form className="il-admin-form" onSubmit={submit}><label>Client *<select required value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">Select client</option>{clients.rows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Project name *<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Type<input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></label><label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{['planned','active','blocked','review','done','cancelled'].map((s) => <option key={s} value={s}>{s.replaceAll('_',' ')}</option>)}</select></label><label>Start<input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></label><label>Due<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label><label>Progress %<input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} /></label>{canSeeFinancials && <><label>Budget<input type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></label><label>Currency<input value={form.currency} maxLength={8} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></label></>}<div className="il-admin-form-wide il-admin-form-actions"><button type="button" className="il-admin-button" onClick={() => setShow(false)}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={saving}>{saving ? 'Saving...' : 'Save project'}</button></div></form></Modal>}</Frame>;
}

type Task = { id: number; title: string; status: string; priority: string; project_id: number | null; client_id: number | null; assigned_user_id: number | null; project_name?: string; client_name?: string; assignee_name?: string; due_at: string | null };
type UserRow = { id: number; name: string; email: string; role: Role; active: number; last_login_at: string | null };
type TaskForm = { title: string; project_id: string; client_id: string; assigned_user_id: string; priority: string; status: string; due_at: string };
const emptyTask: TaskForm = { title: '', project_id: '', client_id: '', assigned_user_id: '', priority: 'medium', status: 'todo', due_at: '' };

export function TasksModule({ Frame, canWrite }: { Frame: PortalFrame; canWrite: boolean }) {
  const data = useRows<Task>('/api/tasks'); const projects = useRows<Project>('/api/projects'); const clients = useRows<SimpleClient>('/api/clients'); const users = useRows<UserRow>('/api/users');
  const [query,setQuery]=useState(''); const [show,setShow]=useState(false); const [editing,setEditing]=useState<Task|null>(null); const [form,setForm]=useState<TaskForm>(emptyTask); const [saving,setSaving]=useState(false);
  const rows=useMemo(()=>searchable(data.rows as unknown as Record<string,unknown>[],query) as unknown as Task[],[data.rows,query]);
  const edit=(r:Task)=>{setEditing(r);setForm({title:r.title,project_id:r.project_id?String(r.project_id):'',client_id:r.client_id?String(r.client_id):'',assigned_user_id:r.assigned_user_id?String(r.assigned_user_id):'',priority:r.priority,status:r.status,due_at:r.due_at?r.due_at.slice(0,16):''});setShow(true)};
  const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);data.setError(null);try{const payload={...form,project_id:form.project_id?Number(form.project_id):null,client_id:form.client_id?Number(form.client_id):null,assigned_user_id:form.assigned_user_id?Number(form.assigned_user_id):null};await adminApi(editing?`/api/tasks/${editing.id}`:'/api/tasks',{method:editing?'PATCH':'POST',body:JSON.stringify(payload)});setShow(false);setEditing(null);setForm(emptyTask);await data.load()}catch(err){data.setError(err instanceof Error?err.message:'Unable to save task.')}finally{setSaving(false)}};
  const quickStatus=async(r:Task,status:string)=>{try{await adminApi(`/api/tasks/${r.id}`,{method:'PATCH',body:JSON.stringify({status})});await data.load()}catch(err){data.setError(err instanceof Error?err.message:'Unable to update task.')}};
  return <Frame title="Tasks"><div className="il-admin-panel"><PageToolbar query={query} onQuery={setQuery} onRefresh={()=>void data.load()} onAdd={canWrite?()=>{setEditing(null);setForm(emptyTask);setShow(true)}:undefined} addLabel="Add Task"/>{data.error&&<div className="il-admin-inline-error">{data.error}</div>}{data.loading?<div className="il-admin-empty">Loading tasks...</div>:rows.length?<div className="il-admin-task-list">{rows.map(r=><div className="il-admin-task-row" key={r.id}><div><b>{r.title}</b><small>{r.project_name||r.client_name||'Internal task'} · {r.assignee_name||'Unassigned'} · {dateOnly(r.due_at)}</small></div><div className="il-admin-actions-row"><Status>{r.priority}</Status><Status>{r.status}</Status>{canWrite&&r.status!=='done'&&<button className="il-admin-button" onClick={()=>void quickStatus(r,'done')}>Mark done</button>}{canWrite&&<button className="il-admin-icon-button" onClick={()=>edit(r)}><Pencil size={15}/></button>}</div></div>)}</div>:<div className="il-admin-empty">No tasks yet.</div>}</div>{show&&<Modal title={editing?'Edit task':'Add task'} onClose={()=>setShow(false)}><form className="il-admin-form" onSubmit={save}><label className="il-admin-form-wide">Task *<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Project<select value={form.project_id} onChange={e=>setForm({...form,project_id:e.target.value})}><option value="">None</option>{projects.rows.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><label>Client<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">None</option>{clients.rows.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Assignee<select value={form.assigned_user_id} onChange={e=>setForm({...form,assigned_user_id:e.target.value})}><option value="">Unassigned</option>{users.rows.filter(u=>u.active).map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label><label>Priority<select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})}>{['low','medium','high','urgent'].map(x=><option key={x}>{x}</option>)}</select></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['todo','in_progress','review','done','cancelled'].map(x=><option value={x} key={x}>{x.replaceAll('_',' ')}</option>)}</select></label><label>Due<input type="datetime-local" value={form.due_at} onChange={e=>setForm({...form,due_at:e.target.value})}/></label><div className="il-admin-form-wide il-admin-form-actions"><button type="button" className="il-admin-button" onClick={()=>setShow(false)}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={saving}>{saving?'Saving...':'Save task'}</button></div></form></Modal>}</Frame>;
}

type Invoice={id:number;client_id:number;client_name?:string;invoice_no:string;status:string;amount:number;currency:string;due_date:string|null;paid_at:string|null;notes:string|null};
type InvoiceForm={client_id:string;invoice_no:string;status:string;amount:string;currency:string;due_date:string;notes:string};
const emptyInvoice:InvoiceForm={client_id:'',invoice_no:'',status:'draft',amount:'',currency:'USD',due_date:'',notes:''};
export function InvoicesModule({Frame,canWrite}:{Frame:PortalFrame;canWrite:boolean}){const data=useRows<Invoice>('/api/invoices');const clients=useRows<SimpleClient>('/api/clients');const[query,setQuery]=useState('');const[show,setShow]=useState(false);const[editing,setEditing]=useState<Invoice|null>(null);const[form,setForm]=useState<InvoiceForm>(emptyInvoice);const[saving,setSaving]=useState(false);const rows=useMemo(()=>searchable(data.rows as unknown as Record<string,unknown>[],query) as unknown as Invoice[],[data.rows,query]);const edit=(r:Invoice)=>{setEditing(r);setForm({client_id:String(r.client_id),invoice_no:r.invoice_no,status:r.status,amount:String(r.amount),currency:r.currency,due_date:r.due_date||'',notes:r.notes||''});setShow(true)};const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);data.setError(null);try{await adminApi(editing?`/api/invoices/${editing.id}`:'/api/invoices',{method:editing?'PATCH':'POST',body:JSON.stringify({...form,client_id:Number(form.client_id),amount:Number(form.amount||0)})});setShow(false);setEditing(null);setForm(emptyInvoice);await data.load()}catch(err){data.setError(err instanceof Error?err.message:'Unable to save invoice.')}finally{setSaving(false)}};const total=rows.reduce((s,r)=>s+r.amount,0);return <Frame title="Invoices"><div className="il-admin-card-grid il-admin-card-grid-3"><div className="il-admin-card"><small>Invoices</small><b>{rows.length}</b><span>Tracked manually</span></div><div className="il-admin-card"><small>Total value</small><b>{formatMoney(total,rows[0]?.currency||'USD')}</b><span>Visible to finance roles</span></div><div className="il-admin-card"><small>Outstanding</small><b>{formatMoney(rows.filter(r=>['sent','due'].includes(r.status)).reduce((s,r)=>s+r.amount,0),rows[0]?.currency||'USD')}</b><span>Sent + due</span></div></div><div className="il-admin-panel"><PageToolbar query={query} onQuery={setQuery} onRefresh={()=>void data.load()} onAdd={canWrite?()=>{setEditing(null);setForm({...emptyInvoice,invoice_no:`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`});setShow(true)}:undefined} addLabel="Create Invoice"/>{data.error&&<div className="il-admin-inline-error">{data.error}</div>}{data.loading?<div className="il-admin-empty">Loading invoices...</div>:rows.length?<div className="il-admin-table-wrap"><table className="il-admin-table"><thead><tr><th>Invoice</th><th>Client</th><th>Status</th><th>Amount</th><th>Due</th><th>Paid</th>{canWrite&&<th/>}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><b>{r.invoice_no}</b></td><td>{r.client_name||'-'}</td><td><Status>{r.status}</Status></td><td>{formatMoney(r.amount,r.currency)}</td><td>{dateOnly(r.due_date)}</td><td>{dateOnly(r.paid_at)}</td>{canWrite&&<td><button className="il-admin-icon-button" onClick={()=>edit(r)}><Pencil size={15}/></button></td>}</tr>)}</tbody></table></div>:<div className="il-admin-empty">No invoices yet.</div>}</div>{show&&<Modal title={editing?'Edit invoice':'Create invoice'} onClose={()=>setShow(false)}><form className="il-admin-form" onSubmit={save}><label>Client *<select required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">Select client</option>{clients.rows.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Invoice no. *<input required value={form.invoice_no} onChange={e=>setForm({...form,invoice_no:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['draft','sent','due','paid','void'].map(x=><option key={x}>{x}</option>)}</select></label><label>Amount<input type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Currency<input maxLength={8} value={form.currency} onChange={e=>setForm({...form,currency:e.target.value.toUpperCase()})}/></label><label>Due<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label><label className="il-admin-form-wide">Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="il-admin-form-wide il-admin-form-actions"><button type="button" className="il-admin-button" onClick={()=>setShow(false)}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={saving}>{saving?'Saving...':'Save invoice'}</button></div></form></Modal>}</Frame>}

type ContentItem={id:number;client_id:number|null;client_name?:string;title:string;platform:string|null;format:string|null;status:string;publish_at:string|null;caption:string|null;asset_url:string|null};type ContentForm={client_id:string;title:string;platform:string;format:string;status:string;publish_at:string;caption:string;asset_url:string};const emptyContent:ContentForm={client_id:'',title:'',platform:'',format:'',status:'idea',publish_at:'',caption:'',asset_url:''};
export function ContentModule({Frame,canWrite}:{Frame:PortalFrame;canWrite:boolean}){const data=useRows<ContentItem>('/api/content_items');const clients=useRows<SimpleClient>('/api/clients');const[query,setQuery]=useState('');const[show,setShow]=useState(false);const[editing,setEditing]=useState<ContentItem|null>(null);const[form,setForm]=useState<ContentForm>(emptyContent);const[saving,setSaving]=useState(false);const rows=useMemo(()=>searchable(data.rows as unknown as Record<string,unknown>[],query) as unknown as ContentItem[],[data.rows,query]);const edit=(r:ContentItem)=>{setEditing(r);setForm({client_id:r.client_id?String(r.client_id):'',title:r.title,platform:r.platform||'',format:r.format||'',status:r.status,publish_at:r.publish_at?r.publish_at.slice(0,16):'',caption:r.caption||'',asset_url:r.asset_url||''});setShow(true)};const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);data.setError(null);try{await adminApi(editing?`/api/content_items/${editing.id}`:'/api/content_items',{method:editing?'PATCH':'POST',body:JSON.stringify({...form,client_id:form.client_id?Number(form.client_id):null})});setShow(false);setEditing(null);setForm(emptyContent);await data.load()}catch(err){data.setError(err instanceof Error?err.message:'Unable to save content item.')}finally{setSaving(false)}};return <Frame title="Content Planner"><div className="il-admin-panel"><PageToolbar query={query} onQuery={setQuery} onRefresh={()=>void data.load()} onAdd={canWrite?()=>{setEditing(null);setForm(emptyContent);setShow(true)}:undefined} addLabel="Add Content"/>{data.error&&<div className="il-admin-inline-error">{data.error}</div>}{data.loading?<div className="il-admin-empty">Loading content...</div>:rows.length?<div className="il-admin-content-grid">{rows.map(r=><div className="il-admin-content-card" key={r.id}><div className="il-admin-panel-heading"><div><Status>{r.status}</Status><h3>{r.title}</h3></div>{canWrite&&<button className="il-admin-icon-button" onClick={()=>edit(r)}><Pencil size={15}/></button>}</div><p>{r.client_name||'IDEA LAB'} · {r.platform||'Platform TBD'} · {r.format||'Format TBD'}</p><small>{r.publish_at?`Publish ${new Date(r.publish_at).toLocaleString()}`:'Not scheduled'}</small>{r.caption&&<div className="il-admin-caption-preview">{r.caption}</div>}</div>)}</div>:<div className="il-admin-empty">No content planned yet.</div>}</div>{show&&<Modal title={editing?'Edit content':'Add content'} onClose={()=>setShow(false)}><form className="il-admin-form" onSubmit={save}><label>Client<select value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">IDEA LAB / internal</option>{clients.rows.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label>Title *<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Platform<input value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}/></label><label>Format<input value={form.format} onChange={e=>setForm({...form,format:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['idea','draft','review','approved','scheduled','published','cancelled'].map(x=><option key={x}>{x}</option>)}</select></label><label>Publish<input type="datetime-local" value={form.publish_at} onChange={e=>setForm({...form,publish_at:e.target.value})}/></label><label className="il-admin-form-wide">Asset URL<input value={form.asset_url} onChange={e=>setForm({...form,asset_url:e.target.value})}/></label><label className="il-admin-form-wide">Caption<textarea value={form.caption} onChange={e=>setForm({...form,caption:e.target.value})}/></label><div className="il-admin-form-wide il-admin-form-actions"><button type="button" className="il-admin-button" onClick={()=>setShow(false)}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={saving}>{saving?'Saving...':'Save content'}</button></div></form></Modal>}</Frame>}

type ReportRow={status:string;count:number;total?:number};type Activity={id:number;action:string;entity_type:string;detail:string|null;created_at:string;user_name?:string};type Reports={leadStatus:ReportRow[];clientStatus:ReportRow[];projectStatus:ReportRow[];taskStatus:ReportRow[];invoiceStatus:ReportRow[];contentStatus:ReportRow[];overdueTasks:number;outstandingAmount:number;recentActivities:Activity[]};
export function ReportsModule({Frame,canSeeFinancials}:{Frame:PortalFrame;canSeeFinancials:boolean}){const[data,setData]=useState<Reports|null>(null);const[error,setError]=useState<string|null>(null);const[loading,setLoading]=useState(true);const load=async()=>{setLoading(true);try{setData(await adminApi<Reports>('/api/reports'));setError(null)}catch(err){setError(err instanceof Error?err.message:'Unable to load reports.')}finally{setLoading(false)}};useEffect(()=>{void load()},[]);const Section=({title,rows}:{title:string;rows:ReportRow[]})=><div className="il-admin-panel"><h3>{title}</h3>{rows.length?<div className="il-admin-report-bars">{rows.map(r=><div key={r.status}><div><span>{r.status.replaceAll('_',' ')}</span><b>{r.count}</b></div><div className="il-admin-report-track"><i style={{width:`${Math.min(100,Math.max(8,r.count*12))}%`}}/></div></div>)}</div>:<div className="il-admin-empty il-admin-empty-small">No data yet.</div>}</div>;return <Frame title="Reports">{error&&<div className="il-admin-inline-error">{error}</div>}{loading?<div className="il-admin-panel il-admin-loading">Loading reports...</div>:data&&<><div className="il-admin-card-grid"><div className="il-admin-card"><small>Overdue tasks</small><b>{data.overdueTasks}</b><span>Needs attention</span></div><div className="il-admin-card"><small>Outstanding invoices</small><b>{canSeeFinancials?formatMoney(data.outstandingAmount):'Restricted'}</b><span>Sent + due</span></div><div className="il-admin-card"><small>Activity log</small><b>{data.recentActivities.length}</b><span>Recent actions shown</span></div><div className="il-admin-card"><small>Refresh</small><button className="il-admin-button" onClick={()=>void load()}><RefreshCw size={15}/> Update report</button></div></div><div className="il-admin-report-grid"><Section title="Lead pipeline" rows={data.leadStatus}/><Section title="Projects" rows={data.projectStatus}/><Section title="Tasks" rows={data.taskStatus}/><Section title="Content" rows={data.contentStatus}/>{canSeeFinancials&&<Section title="Invoices" rows={data.invoiceStatus}/>}<Section title="Clients" rows={data.clientStatus}/></div><div className="il-admin-panel"><h3>Recent activity</h3>{data.recentActivities.length?<div className="il-admin-activity-list">{data.recentActivities.map(a=><div key={a.id}><b>{a.action.replaceAll('.',' · ')}</b><span>{a.detail||a.entity_type}</span><small>{a.user_name||'System'} · {new Date(a.created_at).toLocaleString()}</small></div>)}</div>:<div className="il-admin-empty il-admin-empty-small">No activity yet.</div>}</div></>}</Frame>}

type UserForm={name:string;email:string;role:Role};const emptyUser:UserForm={name:'',email:'',role:'sales'};
export function SettingsModule({Frame,currentUser}:{Frame:PortalFrame;currentUser:AppUser}){const data=useRows<UserRow>('/api/users');const[show,setShow]=useState(false);const[form,setForm]=useState<UserForm>(emptyUser);const[saving,setSaving]=useState(false);const canManage=currentUser.role==='super_admin';const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);data.setError(null);try{await adminApi('/api/users',{method:'POST',body:JSON.stringify(form)});setShow(false);setForm(emptyUser);await data.load()}catch(err){data.setError(err instanceof Error?err.message:'Unable to add user.')}finally{setSaving(false)}};const update=async(row:UserRow,patch:Record<string,unknown>)=>{try{await adminApi(`/api/users/${row.id}`,{method:'PATCH',body:JSON.stringify(patch)});await data.load()}catch(err){data.setError(err instanceof Error?err.message:'Unable to update user.')}};const logout=async()=>{try{await logoutAdmin()}finally{window.location.href='/admin'}};return <Frame title="Settings"><div className="il-admin-settings-grid"><div className="il-admin-panel"><div className="il-admin-panel-heading"><div><h3>Team access</h3><p>Roles control which CRM modules each team member can use.</p></div>{canManage&&<button className="il-admin-button il-admin-primary" onClick={()=>setShow(true)}><Plus size={15}/> Add user</button>}</div>{data.error&&<div className="il-admin-inline-error">{data.error}</div>}{data.loading?<div className="il-admin-empty">Loading team...</div>:<div className="il-admin-table-wrap"><table className="il-admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th></tr></thead><tbody>{data.rows.map(u=><tr key={u.id}><td><b>{u.name}</b></td><td>{u.email}</td><td>{canManage&&u.id!==currentUser.id?<select value={u.role} onChange={e=>void update(u,{role:e.target.value})}>{['super_admin','admin','sales','project_manager','finance','content'].map(r=><option value={r} key={r}>{r.replaceAll('_',' ')}</option>)}</select>:<Status>{u.role}</Status>}</td><td>{canManage&&u.id!==currentUser.id?<button className="il-admin-button" onClick={()=>void update(u,{active:!u.active})}>{u.active?'Deactivate':'Activate'}</button>:<Status>{u.active?'active':'inactive'}</Status>}</td><td>{u.last_login_at?new Date(u.last_login_at).toLocaleString():'Never'}</td></tr>)}</tbody></table></div>}</div><div className="il-admin-panel"><h3>Session</h3><p className="il-admin-muted-copy">Signed in as <b>{currentUser.email}</b>. Authentication uses the zero-cost D1 session system.</p><button className="il-admin-button" onClick={()=>void logout()}><LogOut size={15}/> Sign out</button></div></div>{show&&<Modal title="Add team user" onClose={()=>setShow(false)}><form className="il-admin-form" onSubmit={save}><label>Name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email *<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value as Role})}>{['admin','sales','project_manager','finance','content'].map(r=><option value={r} key={r}>{r.replaceAll('_',' ')}</option>)}</select></label><div className="il-admin-form-wide il-admin-form-actions"><button type="button" className="il-admin-button" onClick={()=>setShow(false)}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={saving}>{saving?'Saving...':'Add user'}</button></div></form></Modal>}</Frame>}
