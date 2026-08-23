import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminAppV4 from './admin-app-v4';
import AdminChatV11 from './admin-chat-v11';
import AdminControlsV6 from './admin-controls-v6';
import ClientsWorkspaceV11 from './clients-workspace-v11';
import ContentPlannerV8 from './content-planner-v8';
import ContentExcelAutomation from './content-excel-automation';
import InvoiceBuilderSupport from './invoice-builder-support';
import InvoicePdfSupport from './invoice-pdf-support';
import TasksWorkspaceV10 from './tasks-workspace-v10';
import { ApiError, adminApi, loginAdmin, type AppUser } from './admin-api';
import './admin.css';
import './admin-modules.css';
import './admin-premium.css';
import './admin-theme-v7.css';
import './admin-global-fixes-v9.css';
import './admin-experience-v10.css';
import './admin-fixes-v11.css';

const ADMIN_EMAIL = 'nawazidealab@gmail.com';

export default function AdminEntry() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  if (authenticated) return <><InvoiceBuilderSupport/><InvoicePdfSupport/><ContentExcelAutomation/><AdminChatV11/><AdminControlsV6/><ContentPlannerV8/><TasksWorkspaceV10/><ClientsWorkspaceV11/><AdminAppV4/></>;

  return <div className="il-admin-state il-premium-state"><div className="il-admin-state-card"><div className="il-admin-kicker">IDEA LAB OPERATIONS</div><h2>Admin command center</h2><p>Sign in with your own IDEA LAB team account.</p><form onSubmit={submit} style={{display:'grid',gap:12,marginTop:22,textAlign:'left'}}><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700,color:'#5e636b'}}>Email<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:'12px',border:'1px solid #dfe2e6',borderRadius:10,font:'inherit'}}/></label><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700,color:'#5e636b'}}>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%',padding:'12px',border:'1px solid #dfe2e6',borderRadius:10,font:'inherit'}}/></label>{error&&<div className="il-admin-inline-error">{error}</div>}<button className="il-admin-button il-admin-primary" disabled={submitting}>{submitting?'Signing in...':'Sign in'}</button></form><Link className="il-admin-home-link" to="/">Return to public website</Link></div></div>;
}
