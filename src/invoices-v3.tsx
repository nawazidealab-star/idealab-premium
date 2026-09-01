import React, { useEffect, useMemo, useState } from 'react';
import { FileText, PackagePlus, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { adminApi, type D1Result } from './admin-api';
import { CURRENCIES, CURRENCY_EVENT, convertMoney, formatMoney, getDefaultCurrency, type FxRates } from './currencies';
import './invoices-v3.css';

export type PortalFrame = React.ComponentType<{ title:string; children:React.ReactNode }>;

type Client={id:number;name:string;company:string|null;email:string|null;phone:string|null};
type Service={id:number;name:string;description:string|null;unit_price:number;currency:string;active:number};
type Invoice={id:number;client_id:number;client_name?:string|null;invoice_no:string;status:string;amount:number;currency:string;due_date:string|null;paid_at:string|null;notes:string|null;subtotal?:number;discount_type?:'none'|'percent'|'fixed';discount_value?:number;discount_amount?:number};
type InvoiceItem={id?:number;invoice_id?:number;service_id:number|null;description:string;quantity:number;unit_price:number;line_total?:number};
type Detail={invoice:Invoice;items:InvoiceItem[]};
type FxResponse={rates:FxRates};

function useRows<T>(path:string){const[rows,setRows]=useState<T[]>([]);const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);const load=async()=>{setLoading(true);try{const r=await adminApi<D1Result<T>>(path);setRows(r.results||[]);setError(null)}catch(e){setError(e instanceof Error?e.message:'Unable to load data')}finally{setLoading(false)}};useEffect(()=>{void load()},[path]);return{rows,loading,error,setError,load}}
function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){return <div className="il-v3-backdrop" onMouseDown={onClose}><div className={`il-v3-modal ${wide?'wide':''}`} onMouseDown={e=>e.stopPropagation()}><header><div><small>IDEA LAB BILLING</small><h3>{title}</h3></div><button type="button" onClick={onClose}><X size={18}/></button></header>{children}</div></div>}
function CurrencySelect({value,onChange}:{value:string;onChange:(v:string)=>void}){return <select value={value} onChange={e=>onChange(e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select>}
function dateOnly(v?:string|null){return v?v.slice(0,10):'—'}

export function InvoicesModule({Frame,canWrite}:{Frame:PortalFrame;canWrite:boolean}){
  const invoices=useRows<Invoice>('/api/invoices');
  const clients=useRows<Client>('/api/clients');
  const services=useRows<Service>('/api/services');
  const[query,setQuery]=useState('');
  const[builderOpen,setBuilderOpen]=useState(false);
  const[serviceOpen,setServiceOpen]=useState(false);
  const[editing,setEditing]=useState<Invoice|null>(null);
  const[serviceEditing,setServiceEditing]=useState<Service|null>(null);
  const[displayCurrency,setDisplayCurrency]=useState(getDefaultCurrency());
  const[rates,setRates]=useState<FxRates|null>(null);

  useEffect(()=>{const h=(e:Event)=>setDisplayCurrency((e as CustomEvent<string>).detail||getDefaultCurrency());window.addEventListener(CURRENCY_EVENT,h);adminApi<FxResponse>('/api/fx').then(r=>setRates(r.rates)).catch(()=>setRates(null));return()=>window.removeEventListener(CURRENCY_EVENT,h)},[]);

  const filtered=useMemo(()=>invoices.rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(query.toLowerCase())),[invoices.rows,query]);
  const totals=useMemo(()=>{let total=0,outstanding=0,paid=0;for(const r of filtered){const v=convertMoney(Number(r.amount||0),r.currency,displayCurrency,rates);if(v===null)continue;if(r.status!=='void')total+=v;if(['sent','due'].includes(r.status))outstanding+=v;if(r.status==='paid')paid+=v}return{total,outstanding,paid}},[filtered,displayCurrency,rates]);

  const openNew=()=>{setEditing(null);setBuilderOpen(true)};
  const openEdit=(r:Invoice)=>{setEditing(r);setBuilderOpen(true)};

  return <Frame title="Invoices">
    <div className="il-v3-head"><div><span>FINANCE</span><h2>Invoice builder</h2><p>Create invoices from saved services, quantities and discounts. PDFs use the exact same line items.</p></div><div className="il-v3-head-actions">{canWrite&&<button className="il-admin-button" onClick={()=>{setServiceEditing(null);setServiceOpen(true)}}><PackagePlus size={15}/> Services</button>}{canWrite&&<button className="il-admin-button il-admin-primary" onClick={openNew}><Plus size={15}/> New invoice</button>}</div></div>
    <div className="il-v3-metrics"><div><small>Total invoiced</small><b>{formatMoney(totals.total,displayCurrency)}</b></div><div><small>Outstanding</small><b>{formatMoney(totals.outstanding,displayCurrency)}</b></div><div><small>Paid</small><b>{formatMoney(totals.paid,displayCurrency)}</b></div></div>
    <section className="il-admin-panel"><div className="il-v3-toolbar"><input placeholder="Search invoices..." value={query} onChange={e=>setQuery(e.target.value)}/><button className="il-admin-button" onClick={()=>void invoices.load()}><RefreshCw size={15}/> Refresh</button></div>{invoices.error&&<div className="il-admin-inline-error">{invoices.error}</div>}<div className="il-v3-invoice-list">{filtered.map(r=><article key={r.id}><div><b>{r.invoice_no}</b><small>{r.client_name||'No client'} · due {dateOnly(r.due_date)}</small></div><div className="il-v3-invoice-meta"><span className={`il-v3-status ${r.status}`}>{r.status}</span><strong>{formatMoney(r.amount,r.currency)}</strong>{canWrite&&<button className="il-admin-icon-button" onClick={()=>openEdit(r)} title="Edit invoice"><Pencil size={15}/></button>}<span data-invoice-pdf-host={r.id}/></div></article>)}{!invoices.loading&&!filtered.length&&<div className="il-admin-empty">No invoices yet. Create your first invoice.</div>}</div></section>
    {builderOpen&&<InvoiceBuilder invoice={editing} clients={clients.rows} services={services.rows.filter(s=>s.active)} onClose={()=>setBuilderOpen(false)} onSaved={async()=>{setBuilderOpen(false);await invoices.load();window.dispatchEvent(new Event('idealab:invoice-saved'))}}/>}
    {serviceOpen&&<ServiceManager services={services.rows} editing={serviceEditing} setEditing={setServiceEditing} onClose={()=>setServiceOpen(false)} onChanged={()=>void services.load()}/>} 
  </Frame>
}

function InvoiceBuilder({invoice,clients,services,onClose,onSaved}:{invoice:Invoice|null;clients:Client[];services:Service[];onClose:()=>void;onSaved:()=>Promise<void>}){
  const defaultCurrency=getDefaultCurrency();
  const[loading,setLoading]=useState(!!invoice);
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState('');
  const[form,setForm]=useState({client_id:invoice?String(invoice.client_id):'',invoice_no:invoice?.invoice_no||`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,status:invoice?.status||'draft',currency:invoice?.currency||defaultCurrency,due_date:invoice?.due_date||'',notes:invoice?.notes||'',discount_type:invoice?.discount_type||'none',discount_value:String(invoice?.discount_value||0)});
  const[items,setItems]=useState<InvoiceItem[]>([{service_id:null,description:'',quantity:1,unit_price:0}]);

  useEffect(()=>{if(!invoice)return;setLoading(true);adminApi<Detail>(`/api/invoices/${invoice.id}/detail`).then(d=>{setForm({client_id:String(d.invoice.client_id),invoice_no:d.invoice.invoice_no,status:d.invoice.status,currency:d.invoice.currency,due_date:d.invoice.due_date||'',notes:d.invoice.notes||'',discount_type:d.invoice.discount_type||'none',discount_value:String(d.invoice.discount_value||0)});setItems((d.items||[]).map(i=>({service_id:i.service_id||null,description:i.description,quantity:Number(i.quantity||1),unit_price:Number(i.unit_price||0)})))}).catch(e=>setError(e instanceof Error?e.message:'Unable to load invoice')).finally(()=>setLoading(false))},[invoice]);

  const subtotal=useMemo(()=>items.reduce((sum,i)=>sum+Math.max(0,Number(i.quantity||0))*Math.max(0,Number(i.unit_price||0)),0),[items]);
  const discountValue=Math.max(0,Number(form.discount_value||0));
  const discountAmount=form.discount_type==='percent'?Math.min(subtotal,subtotal*Math.min(100,discountValue)/100):form.discount_type==='fixed'?Math.min(subtotal,discountValue):0;
  const total=Math.max(0,subtotal-discountAmount);

  const addService=(serviceId:string)=>{const service=services.find(s=>s.id===Number(serviceId));if(!service)return;setForm(f=>({...f,currency:service.currency||f.currency}));setItems(v=>[...v,{service_id:service.id,description:service.name,quantity:1,unit_price:Number(service.unit_price||0)}])};
  const addCustom=()=>setItems(v=>[...v,{service_id:null,description:'Custom service',quantity:1,unit_price:0}]);
  const patchItem=(index:number,patch:Partial<InvoiceItem>)=>setItems(v=>v.map((item,i)=>i===index?{...item,...patch}:item));
  const removeItem=(index:number)=>setItems(v=>v.filter((_,i)=>i!==index));

  const save=async(e:React.FormEvent)=>{e.preventDefault();setError('');if(!items.length){setError('Add at least one service');return}setSaving(true);try{await adminApi(invoice?`/api/invoices/${invoice.id}`:'/api/invoices',{method:invoice?'PATCH':'POST',body:JSON.stringify({...form,client_id:Number(form.client_id),discount_value:discountValue,items:items.map(i=>({...i,quantity:Number(i.quantity),unit_price:Number(i.unit_price)}))})});await onSaved()}catch(err){setError(err instanceof Error?err.message:'Unable to save invoice')}finally{setSaving(false)}};

  return <Modal title={invoice?'Edit invoice':'Create invoice'} onClose={onClose} wide>{loading?<div className="il-v3-loading">Loading invoice…</div>:<form className="il-v3-builder" onSubmit={save}><div className="il-v3-form-grid"><label>Client *<select required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})}><option value="">Select client</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}{c.company?` — ${c.company}`:''}</option>)}</select></label><label>Invoice no. *<input required value={form.invoice_no} onChange={e=>setForm({...form,invoice_no:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['draft','sent','due','paid','void'].map(s=><option key={s}>{s}</option>)}</select></label><label>Currency<CurrencySelect value={form.currency} onChange={v=>setForm({...form,currency:v})}/></label><label>Due date<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label></div>
  <div className="il-v3-line-head"><div><h4>Services & line items</h4><p>Add saved services or custom work.</p></div><div><select defaultValue="" onChange={e=>{addService(e.target.value);e.currentTarget.value=''}}><option value="">+ Add saved service</option>{services.map(s=><option value={s.id} key={s.id}>{s.name} — {formatMoney(s.unit_price,s.currency)}</option>)}</select><button type="button" className="il-admin-button" onClick={addCustom}><Plus size={14}/> Custom line</button></div></div>
  <div className="il-v3-lines">{items.map((item,index)=><div className="il-v3-line" key={index}><input className="desc" placeholder="Service description" required value={item.description} onChange={e=>patchItem(index,{description:e.target.value})}/><label>Qty<input type="number" min="0.01" step="0.01" value={item.quantity} onChange={e=>patchItem(index,{quantity:Number(e.target.value)})}/></label><label>Unit price<input type="number" min="0" step="0.01" value={item.unit_price} onChange={e=>patchItem(index,{unit_price:Number(e.target.value)})}/></label><strong>{formatMoney(Number(item.quantity||0)*Number(item.unit_price||0),form.currency)}</strong><button type="button" className="il-admin-icon-button" onClick={()=>removeItem(index)} title="Remove line"><Trash2 size={15}/></button></div>)}</div>
  <div className="il-v3-bottom"><div><label>Discount type<select value={form.discount_type} onChange={e=>setForm({...form,discount_type:e.target.value as 'none'|'percent'|'fixed'})}><option value="none">No discount</option><option value="percent">Percentage %</option><option value="fixed">Fixed amount</option></select></label>{form.discount_type!=='none'&&<label>Discount value<input type="number" min="0" step="0.01" value={form.discount_value} onChange={e=>setForm({...form,discount_value:e.target.value})}/></label>}<label className="notes">Notes<textarea rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div><aside><div><span>Subtotal</span><b>{formatMoney(subtotal,form.currency)}</b></div><div><span>Discount</span><b>- {formatMoney(discountAmount,form.currency)}</b></div><div className="total"><span>Total</span><b>{formatMoney(total,form.currency)}</b></div></aside></div>{error&&<div className="il-admin-inline-error">{error}</div>}<footer><button type="button" className="il-admin-button" onClick={onClose}>Cancel</button><button className="il-admin-button il-admin-primary" disabled={saving}><FileText size={15}/>{saving?'Saving…':'Save invoice'}</button></footer></form>}</Modal>
}

function ServiceManager({services,editing,setEditing,onClose,onChanged}:{services:Service[];editing:Service|null;setEditing:(s:Service|null)=>void;onClose:()=>void;onChanged:()=>void}){
 const[form,setForm]=useState({name:'',description:'',unit_price:'',currency:getDefaultCurrency(),active:true});const[error,setError]=useState('');const[saving,setSaving]=useState(false);
 useEffect(()=>{setForm(editing?{name:editing.name,description:editing.description||'',unit_price:String(editing.unit_price),currency:editing.currency,active:!!editing.active}:{name:'',description:'',unit_price:'',currency:getDefaultCurrency(),active:true})},[editing]);
 const save=async(e:React.FormEvent)=>{e.preventDefault();setSaving(true);setError('');try{await adminApi(editing?`/api/services/${editing.id}`:'/api/services',{method:editing?'PATCH':'POST',body:JSON.stringify({...form,unit_price:Number(form.unit_price||0)})});setEditing(null);setForm({name:'',description:'',unit_price:'',currency:getDefaultCurrency(),active:true});onChanged()}catch(err){setError(err instanceof Error?err.message:'Unable to save service')}finally{setSaving(false)}};
 return <Modal title="Services catalog" onClose={onClose} wide><div className="il-v3-services"><form onSubmit={save}><h4>{editing?'Edit service':'Add service'}</h4><label>Name *<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Description<textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Default price<input type="number" min="0" step="0.01" value={form.unit_price} onChange={e=>setForm({...form,unit_price:e.target.value})}/></label><label>Currency<CurrencySelect value={form.currency} onChange={v=>setForm({...form,currency:v})}/></label><label className="check"><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active service</label>{error&&<div className="il-admin-inline-error">{error}</div>}<div className="actions"><button type="button" className="il-admin-button" onClick={()=>setEditing(null)}>Clear</button><button className="il-admin-button il-admin-primary" disabled={saving}>{saving?'Saving…':'Save service'}</button></div></form><section><h4>Saved services</h4>{services.map(s=><article key={s.id}><div><b>{s.name}</b><small>{s.description||'No description'}</small></div><div><strong>{formatMoney(s.unit_price,s.currency)}</strong><span>{s.active?'Active':'Inactive'}</span><button className="il-admin-icon-button" onClick={()=>setEditing(s)}><Pencil size={14}/></button></div></article>)}{!services.length&&<div className="il-admin-empty">No saved services yet.</div>}</section></div></Modal>
}
