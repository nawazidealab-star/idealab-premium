import app from './index-free-auth';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

let schemaReady = false;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'sales' CHECK(role IN ('super_admin','admin','sales','project_manager','finance','content')),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
    created_by_user_id INTEGER,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(created_by_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','inactive')),
    country TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    service TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','proposal','warm','won','lost','follow_up')),
    value REAL NOT NULL DEFAULT 0 CHECK(value >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    next_action TEXT,
    next_action_at TEXT,
    owner_user_id INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','blocked','review','done','cancelled')),
    start_date TEXT,
    due_date TEXT,
    budget REAL NOT NULL DEFAULT 0 CHECK(budget >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    client_id INTEGER,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','review','done','cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
    assigned_user_id INTEGER,
    due_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id) REFERENCES projects(id),
    FOREIGN KEY(client_id) REFERENCES clients(id),
    FOREIGN KEY(assigned_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    invoice_no TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','due','paid','void')),
    amount REAL NOT NULL DEFAULT 0 CHECK(amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    due_date TEXT,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    title TEXT NOT NULL,
    platform TEXT,
    format TEXT,
    status TEXT NOT NULL DEFAULT 'idea' CHECK(status IN ('idea','draft','review','approved','scheduled','published','cancelled')),
    publish_at TEXT,
    caption TEXT,
    asset_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(client_id) REFERENCES clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    action TEXT NOT NULL,
    detail TEXT,
    user_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
  'CREATE INDEX IF NOT EXISTS idx_users_active ON users(active)',
  'CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)',
  'CREATE INDEX IF NOT EXISTS idx_leads_next_action ON leads(next_action_at)',
  'CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at)',
  'CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(assigned_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)',
  'CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type,entity_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)',
];

async function ensureSchema(env: Env) {
  if (schemaReady) return;

  const existing = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','clients','leads','projects','tasks','invoices','content_items','activities','api_rate_limits','admin_sessions')"
  ).all<{ name: string }>();

  if ((existing.results?.length || 0) < 10) {
    for (const statement of schemaStatements) {
      await env.DB.prepare(statement).run();
    }
  }

  schemaReady = true;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      await ensureSchema(env);
    }
    return app.fetch(req, env);
  },
} satisfies ExportedHandler<Env>;
