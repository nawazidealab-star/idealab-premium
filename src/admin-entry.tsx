import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AdminAppV4 from './admin-app-v4';
import AdminChatV11 from './admin-chat-v11';
import AdminControlsV6 from './admin-controls-v6';
import ClientsWorkspaceV11 from './clients-workspace-v11';
import ContentPlannerV8 from './content-planner-v8';
import ContentExcelAutomation from './content-excel-automation';
import InvoiceBuilderSupport from './invoice-builder-support';
import InvoicePdfSupport from './invoice-pdf-support';
import TasksWorkspaceV10 from './tasks-workspace-v10';
import TeamExperienceV12 from './team-experience-v12';
import ChatCenterV12 from './chat-center-v12';
import MobileAdminV13 from './mobile-admin-v13';
import { ApiError, adminApi, loginAdmin, type AppUser } from './admin-api';
import './admin.css';
import './admin-modules.css';
import './admin-premium.css';
import './admin-theme-v7.css';
import './admin-global-fixes-v9.css';
import './admin-experience-v10.css';
import './admin-fixes-v11.css';
import './admin-polish-v15.css';

const ADMIN_EMAIL = 'nawazidealab@gmail.com';

type BoundaryState={failed:boolean};
class AdminBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
  state:BoundaryState={failed:false};
  static getDerivedStateFromError(){return{failed:true}}
  componentDidCatch(error:Error){console.error('IDEA LAB portal render error',error)}
  render(){if(this.state.failed)return <div className="il-admin-error-boundary"><div><AlertTriangle size={34}/><h2>This workspace hit a display error</h2><p>Your data was not changed. Reload the portal to recover the screen. If it happens again, we can trace the exact module instead of leaving a blank or broken page.</p><button className="il-admin-button il-admin-primary" onClick={()=>location.reload()}>Reload workspace</button></div></div>;return this.props.children}
}

export default function AdminEntry() {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const chatRoute = location.pathname === '/admin/chat' || location.pathname.startsWith('/admin/chat/');

  useEffect(() => {
    let active = true;
    adminApi<{ user: AppUser }>('/api/me')
      .then(() => { if (active) setAuthenticated(true); })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) { setAuthenticated(false); setError(null); }
        else setError(err instanceof Error ? err.message : 'Unable to check admin session.');
      })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(null);
    try { await loginAdmin(email, password); setAuthenticated(true); setPassword(''); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); }
    finally { setSubmitting(false); }
  };

  if (checking) return <div className="il-admin-state il-premium-state"><div className="il-admin-state-card"><div className="il-admin-spinner"/><h2>Opening IDEA LAB Admin...</h2><p>Checking your secure session.</p></div></div>;

  if (authenticated && chatRoute) return <AdminBoundary key={location.pathname}><ChatCenterV12/><MobileAdminV13/></AdminBoundary>;

  if (authenticated) return <AdminBoundary key={location.pathname}><InvoiceBuilderSupport/><InvoicePdfSupport/><ContentExcelAutomation/><AdminChatV11/><AdminControlsV6/><ContentPlannerV8/><TasksWorkspaceV10/><ClientsWorkspaceV11/><TeamExperienceV12/><AdminAppV4/><MobileAdminV13/></AdminBoundary>;

  return <div className="il-admin-state il-premium-state"><div className="il-admin-state-card"><div className="il-admin-kicker">IDEA LAB OPERATIONS</div><h2>Admin command center</h2><p>Sign in with your own IDEA LAB team account.</p><form onSubmit={submit} style={{display:'grid',gap:12,marginTop:22,textAlign:'left'}}><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700,color:'#5e636b'}}>Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:'12px',border:'1px solid #dfe2e6',borderRadius:10,font:'inherit'}}/></label><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700,color:'#5e636b'}}>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:'12px',border:'1px solid #dfe2e6',borderRadius:10,font:'inherit'}}/></label>{error&&<div className="il-admin-inline-error">{error}</div>}<button className="il-admin-button il-admin-primary" disabled={submitting}>{submitting?'Signing in...':'Sign in'}</button></form><Link className="il-admin-home-link" to="/">Return to public website</Link></div></div>;
}
