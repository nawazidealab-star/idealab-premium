import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  KanbanSquare,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShieldCheck,
  Target,
  Users,
  X,
} from 'lucide-react';
import {
  adminApi,
  type AppUser,
  type DashboardData,
  type D1Result,
  type Lead,
  type Role,
} from './admin-api';
import './admin.css';

type AdminContextValue = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  canSeeFinancials: boolean;
};

const AdminContext = createContext<AdminContextValue | null>(null);

function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi<{ user: AppUser }>('/api/me');
      setUser(data.user);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : 'Unable to verify your IDEA LAB account.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const canSeeFinancials = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'finance';

  return (
    <AdminContext.Provider value={{ user, loading, error, refreshUser, canSeeFinancials }}>
      {children}
    </AdminContext.Provider>
  );
}

function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used inside AdminProvider');
  return value;
}

type PermissionKey = 'leads' | 'clients' | 'projects' | 'tasks' | 'invoices' | 'content' | 'reports' | 'settings';

const rolePermissions: Record<Role, Set<PermissionKey>> = {
  super_admin: new Set(['leads', 'clients', 'projects', 'tasks', 'invoices', 'content', 'reports', 'settings']),
  admin: new Set(['leads', 'clients', 'projects', 'tasks', 'invoices', 'content', 'reports', 'settings']),
  sales: new Set(['leads', 'clients']),
  project_manager: new Set(['clients', 'projects', 'tasks', 'content']),
  finance: new Set(['clients', 'invoices', 'reports']),
  content: new Set(['clients', 'content']),
};

function hasModule(role: Role | undefined, key: PermissionKey) {
  return role ? rolePermissions[role].has(key) : false;
}

const navItems: Array<{ to: string; label: string; key?: PermissionKey; icon: React.ReactNode }> = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { to: '/admin/leads', label: 'Leads', key: 'leads', icon: <Target size={17} /> },
  { to: '/admin/clients', label: 'Clients', key: 'clients', icon: <Users size={17} /> },
  { to: '/admin/projects', label: 'Projects', key: 'projects', icon: <BriefcaseBusiness size={17} /> },
  { to: '/admin/tasks', label: 'Tasks', key: 'tasks', icon: <KanbanSquare size={17} /> },
  { to: '/admin/invoices', label: 'Invoices', key: 'invoices', icon: <ReceiptText size={17} /> },
  { to: '/admin/content', label: 'Content Planner', key: 'content', icon: <CalendarDays size={17} /> },
  { to: '/admin/reports', label: 'Reports', key: 'reports', icon: <BarChart3 size={17} /> },
  { to: '/admin/settings', label: 'Settings', key: 'settings', icon: <Settings size={17} /> },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'IL';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function formatMoney(value: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function AdminGate() {
  const { loading, error, user, refreshUser } = useAdmin();

  if (loading) {
    return (
      <div className="il-admin-state">
        <div className="il-admin-state-card">
          <div className="il-admin-spinner" />
          <h2>Verifying secure access...</h2>
          <p>Checking Cloudflare Access and your IDEA LAB internal profile.</p>
        </div>
      </div>
    );
  }

  if (!user || error) {
    return (
      <div className="il-admin-state">
        <div className="il-admin-state-card">
          <ShieldCheck size={34} />
          <h2>Admin access unavailable</h2>
          <p>{error || 'Your account is not approved for IDEA LAB admin.'}</p>
          <button className="il-admin-button il-admin-primary" onClick={() => void refreshUser()}>Try again</button>
          <Link className="il-admin-home-link" to="/">Return to public website</Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

function AdminRoot() {
  return (
    <AdminProvider>
      <AdminGate />
    </AdminProvider>
  );
}

function PortalLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user } = useAdmin();
  const visibleNav = navItems.filter((item) => !item.key || hasModule(user?.role, item.key));

  return (
    <div className="il-admin-shell">
      <aside className="il-admin-sidebar">
        <Link to="/" className="il-admin-brand">
          <img src="/idealab-logo.jpg" alt="IDEA LAB" />
          <span>IDEA LAB</span>
        </Link>
        <div className="il-admin-label">Operations</div>
        <nav>
          {visibleNav.map((item) => (
            <NavLink end={item.to === '/admin'} to={item.to} key={item.to}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="il-admin-content">
        <header className="il-admin-topbar">
          <div>
            <div className="il-admin-kicker">IDEA LAB OPERATIONS</div>
            <h1>{title}</h1>
          </div>
          <div className="il-admin-user-chip">
            <div className="il-admin-avatar">{initials(user?.name || 'IDEA LAB')}</div>
            <div>
              <b>{user?.name}</b>
              <small>{user?.role.replaceAll('_', ' ')}</small>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Dashboard() {
  const { canSeeFinancials, user } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApi<DashboardData>('/api/dashboard')
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <PortalLayout title="Dashboard"><div className="il-admin-panel il-admin-loading">Loading live CRM data...</div></PortalLayout>;
  }

  if (error || !data) {
    return (
      <PortalLayout title="Dashboard">
        <div className="il-admin-panel il-admin-error"><b>Dashboard could not load.</b><p>{error}</p></div>
      </PortalLayout>
    );
  }

  const cards = [
    ['Total Leads', String(data.leads), 'Live D1 data'],
    ['Active Clients', String(data.clients), 'Live D1 data'],
    ['Open Projects', String(data.projects), 'Live D1 data'],
    canSeeFinancials
      ? ['Paid Revenue', formatMoney(data.revenue), 'Financial view']
      : ['Account Role', (user?.role || '').replaceAll('_', ' ').toUpperCase(), 'Financials restricted'],
  ];

  return (
    <PortalLayout title="Dashboard">
      <div className="il-admin-card-grid">
        {cards.map((card) => (
          <div className="il-admin-card" key={card[0]}>
            <small>{card[0]}</small>
            <b>{card[1]}</b>
            <span>{card[2]}</span>
          </div>
        ))}
      </div>
      <div className="il-admin-panel il-admin-welcome">
        <div>
          <div className="il-admin-kicker">SECURE BACKEND</div>
          <h2>IDEA LAB CRM is connected.</h2>
          <p>Your session is authenticated by Cloudflare Access and CRM records are read from D1.</p>
        </div>
        <ShieldCheck size={38} />
      </div>
    </PortalLayout>
  );
}

type LeadFormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  service: string;
  status: string;
  value: string;
  currency: string;
  next_action: string;
  notes: string;
};

const emptyLead: LeadFormState = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: '',
  service: '',
  status: 'new',
  value: '',
  currency: 'USD',
  next_action: '',
  notes: '',
};

function Leads() {
  const { user, canSeeFinancials } = useAdmin();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<LeadFormState>(emptyLead);

  const canWrite = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'sales';

  const load = async () => {
    setLoading(true);
    try {
      const result = await adminApi<D1Result<Lead>>('/api/leads');
      setRows(result.results || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => Object.values(row)
      .filter((value) => value !== undefined && value !== null)
      .join(' ')
      .toLowerCase()
      .includes(needle));
  }, [rows, query]);

  const updateField = (field: keyof LeadFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        company: form.company,
        email: form.email,
        phone: form.phone,
        source: form.source,
        service: form.service,
        status: form.status,
        next_action: form.next_action,
        notes: form.notes,
      };
      if (canSeeFinancials) {
        payload.value = form.value ? Number(form.value) : 0;
        payload.currency = form.currency;
      }
      await adminApi<{ ok: true; id: number }>('/api/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm(emptyLead);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout title="Leads">
      {showForm && (
        <div className="il-admin-panel il-admin-lead-form">
          <div className="il-admin-panel-heading">
            <div><h3>Add lead</h3><p>Saved directly to the secure D1 database.</p></div>
            <button className="il-admin-icon-button" onClick={() => setShowForm(false)} aria-label="Close lead form"><X size={18} /></button>
          </div>
          <form className="il-admin-form" onSubmit={submitLead}>
            <label>Name *<input required value={form.name} onChange={(event) => updateField('name', event.target.value)} /></label>
            <label>Company<input value={form.company} onChange={(event) => updateField('company', event.target.value)} /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} /></label>
            <label>Phone<input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} /></label>
            <label>Service<input value={form.service} onChange={(event) => updateField('service', event.target.value)} /></label>
            <label>Source<input value={form.source} onChange={(event) => updateField('source', event.target.value)} /></label>
            <label>Status
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="warm">Warm</option>
                <option value="follow_up">Follow up</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            {canSeeFinancials && (
              <>
                <label>Value<input type="number" min="0" step="0.01" value={form.value} onChange={(event) => updateField('value', event.target.value)} /></label>
                <label>Currency<input maxLength={8} value={form.currency} onChange={(event) => updateField('currency', event.target.value.toUpperCase())} /></label>
              </>
            )}
            <label className="il-admin-form-wide">Next action<input value={form.next_action} onChange={(event) => updateField('next_action', event.target.value)} /></label>
            <label className="il-admin-form-wide">Notes<textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} /></label>
            <div className="il-admin-form-wide il-admin-form-actions">
              <button type="button" className="il-admin-button" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="il-admin-button il-admin-primary" disabled={saving}>{saving ? 'Saving...' : 'Save lead'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="il-admin-panel">
        <div className="il-admin-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leads..." />
          {canWrite && <button className="il-admin-button il-admin-primary" onClick={() => setShowForm(true)}>+ Add Lead</button>}
        </div>
        {error && <div className="il-admin-inline-error">{error}</div>}
        {loading ? (
          <div className="il-admin-empty">Loading leads...</div>
        ) : filtered.length ? (
          <div className="il-admin-table-wrap">
            <table className="il-admin-table">
              <thead><tr><th>Name</th><th>Company</th><th>Service</th><th>Status</th>{canSeeFinancials && <th>Value</th>}<th>Next action</th></tr></thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.name}</td>
                    <td>{lead.company || '-'}</td>
                    <td>{lead.service || '-'}</td>
                    <td><span className="il-admin-status">{lead.status.replaceAll('_', ' ')}</span></td>
                    {canSeeFinancials && <td>{formatMoney(lead.value, lead.currency)}</td>}
                    <td>{lead.next_action || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="il-admin-empty">{query ? 'No leads match your search.' : 'No leads yet. Add your first lead.'}</div>
        )}
      </div>
    </PortalLayout>
  );
}

function ModulePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <PortalLayout title={title}>
      <div className="il-admin-panel il-admin-module-placeholder">
        <FileText size={32} />
        <h2>{title}</h2>
        <p>{description}</p>
        <span className="il-admin-status">Backend available - UI next phase</span>
      </div>
    </PortalLayout>
  );
}

function ModuleGuard({ module, children }: { module: PermissionKey; children: ReactNode }) {
  const { user } = useAdmin();
  if (!hasModule(user?.role, module)) {
    return (
      <PortalLayout title="Restricted">
        <div className="il-admin-panel il-admin-error"><ShieldCheck size={28} /><h3>Permission required</h3><p>Your role does not include this module.</p></div>
      </PortalLayout>
    );
  }
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminRoot />}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<ModuleGuard module="leads"><Leads /></ModuleGuard>} />
        <Route path="clients" element={<ModuleGuard module="clients"><ModulePlaceholder title="Clients" description="The D1 client table and API permissions already exist. The full client management screen is the next UI phase." /></ModuleGuard>} />
        <Route path="projects" element={<ModuleGuard module="projects"><ModulePlaceholder title="Projects" description="Project data and role permissions are already present in the backend. The project workflow screen is next." /></ModuleGuard>} />
        <Route path="tasks" element={<ModuleGuard module="tasks"><ModulePlaceholder title="Tasks" description="Task data and role permissions are already present in the backend. The team board is next." /></ModuleGuard>} />
        <Route path="invoices" element={<ModuleGuard module="invoices"><ModulePlaceholder title="Invoices" description="Invoice records are protected by finance/admin permissions. Invoice UI is the next phase." /></ModuleGuard>} />
        <Route path="content" element={<ModuleGuard module="content"><ModulePlaceholder title="Content Planner" description="Content records and permissions exist in D1. Calendar and asset workflow UI are next." /></ModuleGuard>} />
        <Route path="reports" element={<ModuleGuard module="reports"><ModulePlaceholder title="Reports" description="Reporting access is restricted by role. Detailed reports are the next phase." /></ModuleGuard>} />
        <Route path="settings" element={<ModuleGuard module="settings"><ModulePlaceholder title="Settings" description="User roles are enforced by the Worker. Team management UI is the next phase." /></ModuleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
