import React,{useEffect,useMemo,useState}from'react';
import{ArrowLeftRight,BadgeDollarSign,Check,CircleAlert,RefreshCw,ShieldCheck,Sparkles}from'lucide-react';
import{adminApi}from'./admin-api';
import{CURRENCIES,convertMoney,currencyLabel,formatMoney,getDefaultCurrency,setDefaultCurrency,type FxRates}from'./currencies';
import{useEnterprisePortal}from'./admin-enterprise-v17';

type FxPayload={base:string;rates:FxRates;updatedAt:number|null;source:string};

export default function EnterpriseSettingsV18(){
 const{isSuper,notify}=useEnterprisePortal();
 const[display,setDisplay]=useState(getDefaultCurrency()),[base,setBase]=useState('USD'),[savingBase,setSavingBase]=useState(false);
 const[amount,setAmount]=useState('1000'),[from,setFrom]=useState('USD'),[to,setTo]=useState(getDefaultCurrency()),[fx,setFx]=useState<FxPayload|null>(null),[fxLoading,setFxLoading]=useState(true),[fxError,setFxError]=useState('');
 const loadRates=async()=>{setFxLoading(true);setFxError('');try{const next=await adminApi<FxPayload>('/api/fx');if(!next?.rates||!Number.isFinite(Number(next.rates.USD)))throw new Error('Currency service returned invalid rates');setFx(next)}catch(e){setFxError(e instanceof Error?e.message:'Currency rates are unavailable')}finally{setFxLoading(false)}};
 useEffect(()=>{adminApi<{base_currency:string}>('/api/settings/base-currency').then(r=>{const code=String(r.base_currency||'USD').toUpperCase();if(CURRENCIES.some(c=>c.code===code))setBase(code)}).catch(()=>{});void loadRates()},[]);
 const numericAmount=useMemo(()=>{const value=Number(amount);return Number.isFinite(value)&&value>=0?value:null},[amount]);
 const converted=useMemo(()=>numericAmount===null?null:convertMoney(numericAmount,from,to,fx?.rates),[numericAmount,from,to,fx]);
 const unitRate=useMemo(()=>convertMoney(1,from,to,fx?.rates),[from,to,fx]);
 const selectedFrom=CURRENCIES.find(c=>c.code===from),selectedTo=CURRENCIES.find(c=>c.code===to);
 const saveDisplay=(value:string)=>{setDisplay(value);setDefaultCurrency(value);setTo(value);notify(`Display currency set to ${value}`)};
 const saveBase=async()=>{if(!isSuper)return;setSavingBase(true);try{const r=await adminApi<{base_currency:string}>('/api/settings/base-currency',{method:'PATCH',body:JSON.stringify({currency:base})});setBase(String(r.base_currency||base).toUpperCase());notify('Agency base currency updated')}catch(e){notify(e instanceof Error?e.message:'Unable to update base currency','error')}finally{setSavingBase(false)}};
 const swap=()=>{setFrom(to);setTo(from)};
 const updated=fx?.updatedAt?new Date(fx.updatedAt*1000):null;
 return <div className="ix-v18-settings">
  <div className="ix-page-top"><div><span>SYSTEM & FINANCE</span><h2>Settings</h2><p>Currency, operating preferences and security controls in one clean workspace.</p></div></div>
  <section className="ix-fx-hero">
   <div className="ix-fx-copy"><span className="ix-fx-icon"><BadgeDollarSign size={20}/></span><div><span>LIVE CURRENCY TOOL</span><h3>Currency converter</h3><p>Convert supported currencies using the portal's server-side FX feed. Original invoice and lead currencies are never rewritten.</p></div></div>
   <div className="ix-fx-status">{fxLoading?<><i className="loading"/>Updating rates…</>:fxError?<><CircleAlert size={14}/>Rates unavailable</>:<><i/>Rates ready</>}<button onClick={()=>void loadRates()} disabled={fxLoading} title="Refresh exchange rates"><RefreshCw size={14}/></button></div>
   <div className="ix-fx-converter">
    <label className="ix-fx-amount"><span>Amount</span><div><b>{selectedFrom?.symbol||from}</b><input type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-label="Amount to convert"/></div></label>
    <label><span>From</span><select value={from} onChange={e=>setFrom(e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
    <button className="ix-fx-swap" onClick={swap} aria-label="Swap currencies"><ArrowLeftRight size={17}/></button>
    <label><span>To</span><select value={to} onChange={e=>setTo(e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select></label>
    <div className="ix-fx-result"><span>Converted amount</span><b>{fxLoading?'Updating…':numericAmount===null?'Enter a valid amount':converted===null?'Rate unavailable':formatMoney(converted,to)}</b><small>{unitRate!==null?`1 ${from} = ${Number(unitRate).toLocaleString(undefined,{maximumFractionDigits:6})} ${to}`:'No rate available for this pair'}</small></div>
   </div>
   {fxError&&<div className="ix-fx-error"><CircleAlert size={15}/><span>{fxError}. Your saved currency preferences still work; conversion will resume when rates are available.</span><button onClick={()=>void loadRates()}>Retry</button></div>}
   <footer><span>Source: {fx?.source||'Exchange-rate service'}</span><span>{updated?`Updated ${updated.toLocaleString()}`:'Waiting for rate timestamp'}</span><span>{selectedTo?currencyLabel(selectedTo.code):to}</span></footer>
  </section>
  <div className="ix-v18-settings-grid">
   <section className="ix-settings-card"><div className="ix-settings-card-icon violet"><Sparkles size={18}/></div><div className="ix-settings-card-head"><span>PERSONAL</span><h3>Display currency</h3><p>Used for converter defaults and supported summaries. Stored record currencies remain unchanged.</p></div><select className="ix-large-select" value={display} onChange={e=>saveDisplay(e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select><div className="ix-settings-foot"><Check size={14}/> Saved automatically on this device</div></section>
   <section className="ix-settings-card"><div className="ix-settings-card-icon cyan"><BadgeDollarSign size={18}/></div><div className="ix-settings-card-head"><span>SUPER ADMIN</span><h3>Agency base currency</h3><p>Controls the operating currency used by protected pricing workflows.</p></div><select className="ix-large-select" disabled={!isSuper} value={base} onChange={e=>setBase(e.target.value)}>{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}</select><button className="ix-btn ix-primary" disabled={!isSuper||savingBase} onClick={()=>void saveBase()}>{savingBase?'Updating…':'Update base currency'}</button></section>
   <section className="ix-settings-card ix-security-card"><div className="ix-settings-card-icon pink"><ShieldCheck size={18}/></div><div className="ix-settings-card-head"><span>SECURITY</span><h3>Protected operations</h3><p>Destructive actions and access changes stay server-enforced, not just hidden in the interface.</p></div><div className="ix-security-list"><span><Check size={15}/> Super Admin-only delete actions</span><span><Check size={15}/> Server-enforced module permissions</span><span><Check size={15}/> Same-origin protected mutations</span><span><Check size={15}/> Session-backed team identities</span></div></section>
  </div>
 </div>
}
