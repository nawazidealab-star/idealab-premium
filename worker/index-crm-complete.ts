import app from './index-free-auth-lite';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';
type Identity = { id: number; email: string; name: string; role: Role };

type JsonObject = Record<string, unknown>;

const SESSION_COOKIE = 'idealab_admin_session';
const MAX_BODY_BYTES = 64 * 1024;
const ROLE_VALUES: Role[] = ['super_admin', 'admin', 'sales', 'project_manager', 'finance', 'content'];
const CLIENT_STATUSES = ['active', 'paused', 'inactive'];
const PROJECT_STATUSES = ['planned', 'active', 'blocked', 'review', 'done', 'cancelled'];
const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done', 'cancelled'];
const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const INVOICE_STATUSES = ['draft', 'sent', 'due', 'paid', 'void'];
const CONTENT_STATUSES = ['idea', 'draft', 'review', 'approved', 'scheduled', 'published', 'cancelled'];

const MODULE_PATHS = new Set(['clients', 'projects', 'tasks', 'invoices', 'content_items', 'reports', 'users', 'activities']);

const permissions: Record<Role, Set<string>> = {
  super_admin: new Set(['*']),
  admin: new Set([
    'clients.read', 'clients.write', 'projects.read', 'projects.write', 'tasks.read', 'tasks.write',
    'invoices.read', 'invoices.write', 'content_items.read', 'content_items.write', 'activities.read',
    'users.read', 'reports.read',
  ]),
  sales: new Set(['clients.read', 'clients.write', 'activities.read']),
  project_manager: new Set(['clients.read', 'projects.read', 'projects.write', 'tasks.read', 'tasks.write', 'content_items.read', 'content_items.write', 'activities.read']),
  finance: new Set(['clients.read', 'invoices.read', 'invoices.write', 'activities.read', 'reports.read']),
  content: new Set(['clients.read', 'content_items.read', 'content_items.write', 'activities.read']),
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'no-referrer');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function cookieValue(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function resolveIdentity(req: Request, env: Env): Promise<Identity> {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token) throw new HttpError(401, 'Sign in required');
  const sessionHash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at
    FROM admin_sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.session_hash=? LIMIT 1`)
    .bind(sessionHash)
    .first<any>();

  if (!row) throw new HttpError(401, 'Session expired. Sign in again.');
  if (Number(row.expires_at) <= Math.floor(Date.now() / 1000)) {
    await env.DB.prepare('DELETE FROM admin_sessions WHERE session_hash=?').bind(sessionHash).run();
    throw new HttpError(401, 'Session expired. Sign in again.');
  }
  if (!row.active) throw new HttpError(403, 'Your IDEA LAB staff profile is not active');
  if (!ROLE_VALUES.includes(row.role as Role)) throw new HttpError(403, 'Invalid account role');
  return { id: Number(row.id), email: String(row.email), name: String(row.name), role: row.role as Role };
}

function can(identity: Identity, permission: string) {
  const allowed = permissions[identity.role];
  return allowed.has('*') || allowed.has(permission);
}

function requirePermission(identity: Identity, permission: string) {
  if (!can(identity, permission)) throw new HttpError(403, 'You do not have permission for this action');
}

function canSeeFinancials(identity: Identity) {
  return identity.role === 'super_admin' || identity.role === 'admin' || identity.role === 'finance';
}

function requireTrustedOrigin(req: Request) {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return;
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  if (!origin || origin !== url.origin) throw new HttpError(403, 'Untrusted request origin');
  if (req.headers.get('x-requested-with') !== 'idealab-admin') throw new HttpError(403, 'Missing CSRF protection header');
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON requests only');
}

async function readJson(req: Request): Promise<JsonObject> {
  const declared = Number(req.headers.get('content-length') || '0');
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large');
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large');
  try {
    return text ? JSON.parse(text) as JsonObject : {};
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function cleanString(value: unknown, field: string, max: number, required = false): string | null {
  if (value === null || value === undefined || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  const result = value.trim();
  if (!result && required) throw new HttpError(400, `${field} is required`);
  if (result.length > max) throw new HttpError(400, `${field} is too long`);
  return result || null;
}

function cleanEmail(value: unknown): string | null {
  const result = cleanString(value, 'email', 254);
  if (!result) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new HttpError(400, 'Invalid email');
  return result.toLowerCase();
}

function cleanEnum(value: unknown, field: string, allowed: string[], fallback?: string): string {
  const candidate = typeof value === 'string' && value ? value : fallback;
  if (!candidate || !allowed.includes(candidate)) throw new HttpError(400, `Invalid ${field}`);
  return candidate;
}

function cleanMoney(value: unknown): number {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0 || number > 1000000000) throw new HttpError(400, 'Invalid amount');
  return Math.round(number * 100) / 100;
}

function cleanInteger(value: unknown, field: string, required = false): number | null {
  if (value === null || value === undefined || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new HttpError(400, `Invalid ${field}`);
  return number;
}

function cleanProgress(value: unknown): number {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new HttpError(400, 'Progress must be between 0 and 100');
  return Math.round(number);
}

async function enforceRateLimit(req: Request, env: Env, identity: Identity) {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const write = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method);
  const max = write ? 60 : 180;
  const windowStart = Math.floor(Date.now() / 60000);
  const key = `crm:${identity.id}:${ip}:${write ? 'w' : 'r'}`;
  await env.DB.prepare(`INSERT INTO api_rate_limits(key,window_start,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END, window_start=excluded.window_start`)
    .bind(key, windowStart)
    .run();
  const row = await env.DB.prepare('SELECT window_start,count FROM api_rate_limits WHERE key=?')
    .bind(key)
    .first<{ window_start: number; count: number }>();
  if (row && row.window_start === windowStart && row.count > max) throw new HttpError(429, 'Too many requests. Try again shortly.');
}

async function ensureModuleSchema(env: Env) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT,
      status TEXT NOT NULL DEFAULT 'active', country TEXT, notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, name TEXT NOT NULL, type TEXT,
      status TEXT NOT NULL DEFAULT 'planned', start_date TEXT, due_date TEXT, budget REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD', progress INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, client_id INTEGER, title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo', priority TEXT NOT NULL DEFAULT 'medium', assigned_user_id INTEGER,
      due_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, invoice_no TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft', amount REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD',
      due_date TEXT, paid_at TEXT, notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS content_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER, title TEXT NOT NULL, platform TEXT, format TEXT,
      status TEXT NOT NULL DEFAULT 'idea', publish_at TEXT, caption TEXT, asset_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id INTEGER, action TEXT NOT NULL,
      detail TEXT, user_id INTEGER, ip_address TEXT, user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS api_rate_limits (
      key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0
    )`,
  ];
  for (const statement of statements) await env.DB.prepare(statement).run();
}

async function audit(env: Env, identity: Identity, action: string, entityType: string, entityId?: number, detail?: string, req?: Request) {
  await env.DB.prepare('INSERT INTO activities(entity_type,entity_id,action,detail,user_id,ip_address,user_agent) VALUES(?,?,?,?,?,?,?)')
    .bind(
      entityType,
      entityId ?? null,
      action,
      detail?.slice(0, 1000) ?? null,
      identity.id,
      req?.headers.get('cf-connecting-ip') || null,
      req?.headers.get('user-agent')?.slice(0, 250) || null,
    )
    .run();
}

async function assertClientExists(env: Env, id: number) {
  const row = await env.DB.prepare('SELECT id FROM clients WHERE id=? LIMIT 1').bind(id).first<{ id: number }>();
  if (!row) throw new HttpError(400, 'Client not found');
}

async function patchRow(env: Env, table: string, id: number, fields: Array<[string, unknown, boolean]>) {
  const selected = fields.filter((entry) => entry[2]);
  if (!selected.length) return;
  const assignments = selected.map(([field]) => `${field}=?`).join(', ');
  await env.DB.prepare(`UPDATE ${table} SET ${assignments}, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(...selected.map((entry) => entry[1]), id)
    .run();
}

async function handleClients(req: Request, env: Env, identity: Identity, parts: string[]) {
  if (req.method === 'GET') {
    requirePermission(identity, 'clients.read');
    return json(await env.DB.prepare('SELECT * FROM clients ORDER BY id DESC LIMIT 500').all());
  }

  if (req.method === 'POST') {
    requirePermission(identity, 'clients.write');
    const body = await readJson(req);
    const name = cleanString(body.name, 'name', 120, true)!;
    const status = cleanEnum(body.status, 'status', CLIENT_STATUSES, 'active');
    const result = await env.DB.prepare('INSERT INTO clients(name,company,email,phone,status,country,notes) VALUES(?,?,?,?,?,?,?)')
      .bind(name, cleanString(body.company, 'company', 160), cleanEmail(body.email), cleanString(body.phone, 'phone', 50), status, cleanString(body.country, 'country', 100), cleanString(body.notes, 'notes', 5000))
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(env, identity, 'client.created', 'client', id, name, req);
    return json({ ok: true, id }, { status: 201 });
  }

  if (req.method === 'PATCH' && parts[2]) {
    requirePermission(identity, 'clients.write');
    const id = cleanInteger(parts[2], 'client id', true)!;
    const body = await readJson(req);
    await patchRow(env, 'clients', id, [
      ['name', body.name === undefined ? null : cleanString(body.name, 'name', 120, true), body.name !== undefined],
      ['company', cleanString(body.company, 'company', 160), body.company !== undefined],
      ['email', cleanEmail(body.email), body.email !== undefined],
      ['phone', cleanString(body.phone, 'phone', 50), body.phone !== undefined],
      ['status', body.status === undefined ? null : cleanEnum(body.status, 'status', CLIENT_STATUSES), body.status !== undefined],
      ['country', cleanString(body.country, 'country', 100), body.country !== undefined],
      ['notes', cleanString(body.notes, 'notes', 5000), body.notes !== undefined],
    ]);
    await audit(env, identity, 'client.updated', 'client', id, undefined, req);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed');
}

async function handleProjects(req: Request, env: Env, identity: Identity, parts: string[]) {
  if (req.method === 'GET') {
    requirePermission(identity, 'projects.read');
    const financial = canSeeFinancials(identity);
    const select = financial
      ? 'p.*, c.name client_name'
      : 'p.id,p.client_id,p.name,p.type,p.status,p.start_date,p.due_date,p.progress,p.created_at,p.updated_at,c.name client_name';
    return json(await env.DB.prepare(`SELECT ${select} FROM projects p LEFT JOIN clients c ON c.id=p.client_id ORDER BY p.id DESC LIMIT 500`).all());
  }

  if (req.method === 'POST') {
    requirePermission(identity, 'projects.write');
    const body = await readJson(req);
    const clientId = cleanInteger(body.client_id, 'client', true)!;
    await assertClientExists(env, clientId);
    const name = cleanString(body.name, 'name', 160, true)!;
    const status = cleanEnum(body.status, 'status', PROJECT_STATUSES, 'planned');
    const budget = canSeeFinancials(identity) ? cleanMoney(body.budget) : 0;
    const currency = canSeeFinancials(identity) ? (cleanString(body.currency, 'currency', 8) || 'USD') : 'USD';
    const result = await env.DB.prepare('INSERT INTO projects(client_id,name,type,status,start_date,due_date,budget,currency,progress) VALUES(?,?,?,?,?,?,?,?,?)')
      .bind(clientId, name, cleanString(body.type, 'type', 100), status, cleanString(body.start_date, 'start date', 40), cleanString(body.due_date, 'due date', 40), budget, currency.toUpperCase(), cleanProgress(body.progress))
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(env, identity, 'project.created', 'project', id, name, req);
    return json({ ok: true, id }, { status: 201 });
  }

  if (req.method === 'PATCH' && parts[2]) {
    requirePermission(identity, 'projects.write');
    const id = cleanInteger(parts[2], 'project id', true)!;
    const body = await readJson(req);
    let clientId: number | null = null;
    if (body.client_id !== undefined) {
      clientId = cleanInteger(body.client_id, 'client', true)!;
      await assertClientExists(env, clientId);
    }
    await patchRow(env, 'projects', id, [
      ['client_id', clientId, body.client_id !== undefined],
      ['name', body.name === undefined ? null : cleanString(body.name, 'name', 160, true), body.name !== undefined],
      ['type', cleanString(body.type, 'type', 100), body.type !== undefined],
      ['status', body.status === undefined ? null : cleanEnum(body.status, 'status', PROJECT_STATUSES), body.status !== undefined],
      ['start_date', cleanString(body.start_date, 'start date', 40), body.start_date !== undefined],
      ['due_date', cleanString(body.due_date, 'due date', 40), body.due_date !== undefined],
      ['progress', body.progress === undefined ? null : cleanProgress(body.progress), body.progress !== undefined],
      ['budget', body.budget === undefined || !canSeeFinancials(identity) ? null : cleanMoney(body.budget), body.budget !== undefined && canSeeFinancials(identity)],
      ['currency', body.currency === undefined || !canSeeFinancials(identity) ? null : (cleanString(body.currency, 'currency', 8) || 'USD').toUpperCase(), body.currency !== undefined && canSeeFinancials(identity)],
    ]);
    await audit(env, identity, 'project.updated', 'project', id, undefined, req);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed');
}

async function handleTasks(req: Request, env: Env, identity: Identity, parts: string[]) {
  if (req.method === 'GET') {
    requirePermission(identity, 'tasks.read');
    return json(await env.DB.prepare(`SELECT t.*, p.name project_name, c.name client_name, u.name assignee_name
      FROM tasks t
      LEFT JOIN projects p ON p.id=t.project_id
      LEFT JOIN clients c ON c.id=t.client_id
      LEFT JOIN users u ON u.id=t.assigned_user_id
      ORDER BY CASE t.status WHEN 'done' THEN 1 WHEN 'cancelled' THEN 2 ELSE 0 END, t.due_at IS NULL, t.due_at ASC, t.id DESC
      LIMIT 750`).all());
  }

  if (req.method === 'POST') {
    requirePermission(identity, 'tasks.write');
    const body = await readJson(req);
    const title = cleanString(body.title, 'title', 220, true)!;
    const status = cleanEnum(body.status, 'status', TASK_STATUSES, 'todo');
    const priority = cleanEnum(body.priority, 'priority', TASK_PRIORITIES, 'medium');
    const result = await env.DB.prepare('INSERT INTO tasks(project_id,client_id,title,status,priority,assigned_user_id,due_at) VALUES(?,?,?,?,?,?,?)')
      .bind(cleanInteger(body.project_id, 'project'), cleanInteger(body.client_id, 'client'), title, status, priority, cleanInteger(body.assigned_user_id, 'assignee'), cleanString(body.due_at, 'due date', 50))
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(env, identity, 'task.created', 'task', id, title, req);
    return json({ ok: true, id }, { status: 201 });
  }

  if (req.method === 'PATCH' && parts[2]) {
    requirePermission(identity, 'tasks.write');
    const id = cleanInteger(parts[2], 'task id', true)!;
    const body = await readJson(req);
    await patchRow(env, 'tasks', id, [
      ['project_id', cleanInteger(body.project_id, 'project'), body.project_id !== undefined],
      ['client_id', cleanInteger(body.client_id, 'client'), body.client_id !== undefined],
      ['title', body.title === undefined ? null : cleanString(body.title, 'title', 220, true), body.title !== undefined],
      ['status', body.status === undefined ? null : cleanEnum(body.status, 'status', TASK_STATUSES), body.status !== undefined],
      ['priority', body.priority === undefined ? null : cleanEnum(body.priority, 'priority', TASK_PRIORITIES), body.priority !== undefined],
      ['assigned_user_id', cleanInteger(body.assigned_user_id, 'assignee'), body.assigned_user_id !== undefined],
      ['due_at', cleanString(body.due_at, 'due date', 50), body.due_at !== undefined],
    ]);
    await audit(env, identity, 'task.updated', 'task', id, undefined, req);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed');
}

async function handleInvoices(req: Request, env: Env, identity: Identity, parts: string[]) {
  if (req.method === 'GET') {
    requirePermission(identity, 'invoices.read');
    if (!canSeeFinancials(identity)) throw new HttpError(403, 'Financial access required');
    return json(await env.DB.prepare(`SELECT i.*, c.name client_name FROM invoices i LEFT JOIN clients c ON c.id=i.client_id ORDER BY i.id DESC LIMIT 500`).all());
  }

  if (req.method === 'POST') {
    requirePermission(identity, 'invoices.write');
    if (!canSeeFinancials(identity)) throw new HttpError(403, 'Financial access required');
    const body = await readJson(req);
    const clientId = cleanInteger(body.client_id, 'client', true)!;
    await assertClientExists(env, clientId);
    const invoiceNo = cleanString(body.invoice_no, 'invoice number', 80, true)!;
    const duplicate = await env.DB.prepare('SELECT id FROM invoices WHERE invoice_no=? LIMIT 1').bind(invoiceNo).first();
    if (duplicate) throw new HttpError(409, 'Invoice number already exists');
    const status = cleanEnum(body.status, 'status', INVOICE_STATUSES, 'draft');
    const paidAt = status === 'paid' ? (cleanString(body.paid_at, 'paid date', 50) || new Date().toISOString()) : cleanString(body.paid_at, 'paid date', 50);
    const result = await env.DB.prepare('INSERT INTO invoices(client_id,invoice_no,status,amount,currency,due_date,paid_at,notes) VALUES(?,?,?,?,?,?,?,?)')
      .bind(clientId, invoiceNo, status, cleanMoney(body.amount), (cleanString(body.currency, 'currency', 8) || 'USD').toUpperCase(), cleanString(body.due_date, 'due date', 40), paidAt, cleanString(body.notes, 'notes', 5000))
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(env, identity, 'invoice.created', 'invoice', id, invoiceNo, req);
    return json({ ok: true, id }, { status: 201 });
  }

  if (req.method === 'PATCH' && parts[2]) {
    requirePermission(identity, 'invoices.write');
    if (!canSeeFinancials(identity)) throw new HttpError(403, 'Financial access required');
    const id = cleanInteger(parts[2], 'invoice id', true)!;
    const body = await readJson(req);
    let status: string | null = null;
    if (body.status !== undefined) status = cleanEnum(body.status, 'status', INVOICE_STATUSES);
    const paidAt = body.paid_at !== undefined
      ? cleanString(body.paid_at, 'paid date', 50)
      : status === 'paid' ? new Date().toISOString() : null;
    await patchRow(env, 'invoices', id, [
      ['client_id', cleanInteger(body.client_id, 'client'), body.client_id !== undefined],
      ['invoice_no', body.invoice_no === undefined ? null : cleanString(body.invoice_no, 'invoice number', 80, true), body.invoice_no !== undefined],
      ['status', status, body.status !== undefined],
      ['amount', body.amount === undefined ? null : cleanMoney(body.amount), body.amount !== undefined],
      ['currency', body.currency === undefined ? null : (cleanString(body.currency, 'currency', 8) || 'USD').toUpperCase(), body.currency !== undefined],
      ['due_date', cleanString(body.due_date, 'due date', 40), body.due_date !== undefined],
      ['paid_at', paidAt, body.paid_at !== undefined || status === 'paid'],
      ['notes', cleanString(body.notes, 'notes', 5000), body.notes !== undefined],
    ]);
    await audit(env, identity, 'invoice.updated', 'invoice', id, status || undefined, req);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed');
}

async function handleContent(req: Request, env: Env, identity: Identity, parts: string[]) {
  if (req.method === 'GET') {
    requirePermission(identity, 'content_items.read');
    return json(await env.DB.prepare(`SELECT ci.*, c.name client_name FROM content_items ci LEFT JOIN clients c ON c.id=ci.client_id ORDER BY ci.publish_at IS NULL, ci.publish_at ASC, ci.id DESC LIMIT 750`).all());
  }

  if (req.method === 'POST') {
    requirePermission(identity, 'content_items.write');
    const body = await readJson(req);
    const title = cleanString(body.title, 'title', 220, true)!;
    const status = cleanEnum(body.status, 'status', CONTENT_STATUSES, 'idea');
    const result = await env.DB.prepare('INSERT INTO content_items(client_id,title,platform,format,status,publish_at,caption,asset_url) VALUES(?,?,?,?,?,?,?,?)')
      .bind(cleanInteger(body.client_id, 'client'), title, cleanString(body.platform, 'platform', 80), cleanString(body.format, 'format', 80), status, cleanString(body.publish_at, 'publish date', 50), cleanString(body.caption, 'caption', 8000), cleanString(body.asset_url, 'asset URL', 1000))
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(env, identity, 'content.created', 'content_item', id, title, req);
    return json({ ok: true, id }, { status: 201 });
  }

  if (req.method === 'PATCH' && parts[2]) {
    requirePermission(identity, 'content_items.write');
    const id = cleanInteger(parts[2], 'content item id', true)!;
    const body = await readJson(req);
    await patchRow(env, 'content_items', id, [
      ['client_id', cleanInteger(body.client_id, 'client'), body.client_id !== undefined],
      ['title', body.title === undefined ? null : cleanString(body.title, 'title', 220, true), body.title !== undefined],
      ['platform', cleanString(body.platform, 'platform', 80), body.platform !== undefined],
      ['format', cleanString(body.format, 'format', 80), body.format !== undefined],
      ['status', body.status === undefined ? null : cleanEnum(body.status, 'status', CONTENT_STATUSES), body.status !== undefined],
      ['publish_at', cleanString(body.publish_at, 'publish date', 50), body.publish_at !== undefined],
      ['caption', cleanString(body.caption, 'caption', 8000), body.caption !== undefined],
      ['asset_url', cleanString(body.asset_url, 'asset URL', 1000), body.asset_url !== undefined],
    ]);
    await audit(env, identity, 'content.updated', 'content_item', id, undefined, req);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed');
}

async function handleUsers(req: Request, env: Env, identity: Identity, parts: string[]) {
  if (req.method === 'GET') {
    requirePermission(identity, 'users.read');
    return json(await env.DB.prepare('SELECT id,name,email,role,active,last_login_at,created_at,updated_at FROM users ORDER BY active DESC,name ASC').all());
  }

  if (req.method === 'POST') {
    requirePermission(identity, 'users.write');
    const body = await readJson(req);
    const name = cleanString(body.name, 'name', 120, true)!;
    const email = cleanString(body.email, 'email', 254, true)!.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Invalid email');
    const role = cleanEnum(body.role, 'role', ROLE_VALUES, 'sales');
    const duplicate = await env.DB.prepare('SELECT id FROM users WHERE lower(email)=? LIMIT 1').bind(email).first();
    if (duplicate) throw new HttpError(409, 'A user with this email already exists');
    const result = await env.DB.prepare('INSERT INTO users(name,email,role,active,created_by_user_id) VALUES(?,?,?,?,?)')
      .bind(name, email, role, 1, identity.id)
      .run();
    const id = Number(result.meta.last_row_id);
    await audit(env, identity, 'user.created', 'user', id, `${email} / ${role}`, req);
    return json({ ok: true, id }, { status: 201 });
  }

  if (req.method === 'PATCH' && parts[2]) {
    requirePermission(identity, 'users.write');
    const id = cleanInteger(parts[2], 'user id', true)!;
    const body = await readJson(req);
    const target = await env.DB.prepare('SELECT id,role,active FROM users WHERE id=? LIMIT 1').bind(id).first<any>();
    if (!target) throw new HttpError(404, 'User not found');
    const role = body.role === undefined ? null : cleanEnum(body.role, 'role', ROLE_VALUES);
    const active = body.active === undefined ? null : (body.active ? 1 : 0);
    if (id === identity.id && active === 0) throw new HttpError(400, 'You cannot deactivate your own account');
    if (id === identity.id && role && role !== 'super_admin' && identity.role === 'super_admin') throw new HttpError(400, 'You cannot remove your own Super Admin role');
    if (target.role === 'super_admin' && (active === 0 || (role && role !== 'super_admin'))) {
      const count = await env.DB.prepare("SELECT COUNT(*) c FROM users WHERE role='super_admin' AND active=1").first<{ c: number }>();
      if ((count?.c || 0) <= 1) throw new HttpError(400, 'At least one active Super Admin is required');
    }
    await patchRow(env, 'users', id, [
      ['name', body.name === undefined ? null : cleanString(body.name, 'name', 120, true), body.name !== undefined],
      ['role', role, body.role !== undefined],
      ['active', active, body.active !== undefined],
    ]);
    await audit(env, identity, 'user.updated', 'user', id, `role=${role ?? 'unchanged'}, active=${active ?? 'unchanged'}`, req);
    return json({ ok: true });
  }

  throw new HttpError(405, 'Method not allowed');
}

async function handleActivities(req: Request, env: Env, identity: Identity) {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
  requirePermission(identity, 'activities.read');
  return json(await env.DB.prepare(`SELECT a.*, u.name user_name FROM activities a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100`).all());
}

async function handleReports(req: Request, env: Env, identity: Identity) {
  if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
  requirePermission(identity, 'reports.read');
  const [leadStatus, clientStatus, projectStatus, taskStatus, invoiceStatus, contentStatus, overdue, outstanding, recent] = await Promise.all([
    env.DB.prepare('SELECT status,COUNT(*) count FROM leads GROUP BY status ORDER BY count DESC').all(),
    env.DB.prepare('SELECT status,COUNT(*) count FROM clients GROUP BY status ORDER BY count DESC').all(),
    env.DB.prepare('SELECT status,COUNT(*) count FROM projects GROUP BY status ORDER BY count DESC').all(),
    env.DB.prepare('SELECT status,COUNT(*) count FROM tasks GROUP BY status ORDER BY count DESC').all(),
    env.DB.prepare('SELECT status,COUNT(*) count,COALESCE(SUM(amount),0) total FROM invoices GROUP BY status ORDER BY count DESC').all(),
    env.DB.prepare('SELECT status,COUNT(*) count FROM content_items GROUP BY status ORDER BY count DESC').all(),
    env.DB.prepare("SELECT COUNT(*) c FROM tasks WHERE status NOT IN ('done','cancelled') AND due_at IS NOT NULL AND datetime(due_at) < datetime('now')").first<{ c: number }>(),
    env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM invoices WHERE status IN ('sent','due')").first<{ total: number }>(),
    env.DB.prepare(`SELECT a.id,a.entity_type,a.entity_id,a.action,a.detail,a.created_at,u.name user_name
      FROM activities a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 12`).all(),
  ]);
  return json({
    leadStatus: leadStatus.results || [],
    clientStatus: clientStatus.results || [],
    projectStatus: projectStatus.results || [],
    taskStatus: taskStatus.results || [],
    invoiceStatus: canSeeFinancials(identity) ? (invoiceStatus.results || []) : [],
    contentStatus: contentStatus.results || [],
    overdueTasks: overdue?.c || 0,
    outstandingAmount: canSeeFinancials(identity) ? (outstanding?.total || 0) : 0,
    recentActivities: recent.results || [],
  });
}

async function handleModuleRequest(req: Request, env: Env, identity: Identity, url: URL) {
  const parts = url.pathname.split('/').filter(Boolean);
  const module = parts[1];
  if (module === 'clients') return handleClients(req, env, identity, parts);
  if (module === 'projects') return handleProjects(req, env, identity, parts);
  if (module === 'tasks') return handleTasks(req, env, identity, parts);
  if (module === 'invoices') return handleInvoices(req, env, identity, parts);
  if (module === 'content_items') return handleContent(req, env, identity, parts);
  if (module === 'users') return handleUsers(req, env, identity, parts);
  if (module === 'activities') return handleActivities(req, env, identity);
  if (module === 'reports') return handleReports(req, env, identity);
  throw new HttpError(404, 'Not found');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'api' || !MODULE_PATHS.has(parts[1] || '')) {
      return app.fetch(req, env);
    }

    try {
      requireTrustedOrigin(req);
      await ensureModuleSchema(env);
      const identity = await resolveIdentity(req, env);
      await enforceRateLimit(req, env, identity);
      return await handleModuleRequest(req, env, identity, url);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'Internal server error';
      return json({ error: message }, { status });
    }
  },
} satisfies ExportedHandler<Env>;
