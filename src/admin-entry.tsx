import React,{useEffect,useState}from'react';
import{AlertTriangle,ArrowLeft,LockKeyhole}from'lucide-react';
import{Link}from'react-router-dom';
import AdminEnterpriseV17 from'./admin-enterprise-v17';
import{ApiError,adminApi,loginAdmin,type AppUser}from'./admin-api';
import'./admin-enterprise-v17.css';
import'./admin-enterprise-auth-v17.css';

const ADMIN_EMAIL='nawazidealab@gmail.com';

type BoundaryState={failed:boolean};
class AdminBoundary extends React.Component<{children:React.ReactNode},BoundaryState>{
 state:BoundaryState={failed:false};
 static getDerivedStateFromError(){return{failed:true}}
 componentDidCatch(error:Error){console.error('IDEA LAB enterprise portal render error',error)}
 render(){if(this.state.failed)return <div className="ix-login-shell"><div className="ix-loading-card"><AlertTriangle size={34}/><h2>Workspace display error</h2><p>The screen was stopped safely before it could affect your data.</p><button className="ix-btn ix-primary" onClick={()=>location.reload()}>Reload workspace</button></div></div>;return this.props.children}
}

export default function AdminEntry(){const[checking,setChecking]=useState(true),[authenticated,setAuthenticated]=useState(false),[email,setEmail]=useState(ADMIN_EMAIL),[password,setPassword]=useState(''),[error,setError]=useState(''),[submitting,setSubmitting]=useState(false);useEffect(()=>{let active=true;adminApi<{user:AppUser}>('/api/me').then(()=>active&&setAuthenticated(true)).catch(err=>{if(!active)return;if(err instanceof ApiError&&(err.status===401||err.status===403)){setAuthenticated(false);setError('')}else setError(err instanceof Error?err.message:'Unable to check session')}).finally(()=>active&&setChecking(false));return()=>{active=false}},[]);const submit=async(e:React.FormEvent)=>{e.preventDefault();setSubmitting(true);setError('');try{await loginAdmin(email.trim().toLowerCase(),password);setAuthenticated(true);setPassword('')}catch(err){setError(err instanceof Error?err.message:'Unable to sign in')}finally{setSubmitting(false)}};if(checking)return <div className="ix-login-shell"><div className="ix-loading-card"><div className="ix-loader"/><h2>Opening IDEA LAB</h2><p>Checking your secure operations session.</p></div></div>;if(authenticated)return <AdminBoundary><AdminEnterpriseV17/></AdminBoundary>;return <div className="ix-login-shell"><section className="ix-auth-card"><div className="ix-auth-brand"><img src="/idealab-logo.jpg" alt="IDEA LAB"/><div><span>IDEA LAB</span><b>Operations OS</b></div></div><div className="ix-auth-copy"><LockKeyhole size={24}/><span>SECURE WORKSPACE</span><h1>Sign in to operations</h1><p>Use your IDEA LAB team account to access the admin workspace.</p></div><form onSubmit={submit}><label><span>Email</span><input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@idealab.com"/></label><label><span>Password</span><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label>{error&&<div className="ix-auth-error">{error}</div>}<button className="ix-btn ix-primary" disabled={submitting}>{submitting?'Signing in…':'Sign in'}</button></form><Link className="ix-auth-home" to="/"><ArrowLeft size={14}/> Back to website</Link></section></div>}
