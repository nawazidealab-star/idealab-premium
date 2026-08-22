export interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';
type Identity = { id: number; email: string; name: string; role: Role };

const MAX_BODY_BYTES = 64 * 1024;
const ROLE_VALUES: Role[] = ['super_admin', 'admin', 'sales', 'project_manager', 'finance', 'content'];
const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'warm', 'won', 'lost', 'follow_up'];
const CLIENT_STATUSES = ['active', 'paused', 'inactive'];
const SESSION_COOKIE = 'idealab_admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const PBKDF2_ITERATIONS = 120000;

const SECURITY_HEADERS: Record<string, string> = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store, max-age=0',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-resource-policy': 'same-site',
};

function json(data: unknown, init: ResponseInit = {}, origin?: string) {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  if (origin) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
    headers.set('access-control-allow-credentials', 'true');
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

function allowedOrigins(env: Env, requestUrl: URL) {
  const configured = (env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  return new Set([requestUrl.origin, ...configured]);
}

function corsOrigin(req: Request, env: Env, url: URL): string | undefined {
  const origin = req.headers.get('origin');
  if (!origin) return undefined;
  return allowedOrigins(env, url).has(origin) ? origin : undefined;
}

function requireTrustedOrigin(req: Request, env: Env, url: URL) {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return;
  const origin = req.headers.get('origin');
  if (!origin || !allowedOrigins(env, url).has(origin)) throw new HttpError(403, 'Untrusted request origin');
  if (req.headers.get('x-requested-with') !== 'idealab-admin') throw new HttpError(403, 'Missing CSRF protection header');
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON requests only');
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) throw new HttpError(500, 'Authentication configuration invalid');
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const value of bytes) binary += String.fromCharCode(value);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function derivePasswordHash(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: hexToBytes(saltHex),
    iterations: PBKDF2_ITERATIONS,
  }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeHexEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookieValue(req: Request, name: string) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sessionCookie(token: string, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

async function ensureAuthTables(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)').run();
}

async function ensureSuperAdmin(env: Env, email: string): Promise<Identity> {
  let row = await env.DB.prepare('SELECT id,name,email,role,active FROM users WHERE lower(email)=? LIMIT 1').bind(email).first<any>();
  if (!row) {
    await env.DB.prepare("INSERT INTO users(name,email,role,active,last_login_at) VALUES(?,?,'super_admin',1,CURRENT_TIMESTAMP)")
      .bind(email.split('@')[0], email).run();
    row = await env.DB.prepare('SELECT id,name,email,role,active FROM users WHERE lower(email)=? LIMIT 1').bind(email).first<any>();
  } else if (row.role !== 'super_admin' || !row.active) {
    await env.DB.prepare("UPDATE users SET role='super_admin', active=1, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id).run();
    row = await env.DB.prepare('SELECT id,name,email,role,active FROM users WHERE id=? LIMIT 1').bind(row.id).first<any>();
  }
  if (!row) throw new HttpError(500, 'Unable to initialize admin account');
  return { id: Number(row.id), email: String(row.email), name: String(row.name), role: 'super_admin' };
}

async function enforceLoginRateLimit(req: Request, env: Env) {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const windowStart = Math.floor(Date.now() / (5 * 60 * 1000));
  const key = `login:${ip}`;
  await env.DB.prepare(`INSERT INTO api_rate_limits(key,window_start,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END, window_start=excluded.window_start`)
    .bind(key, windowStart).run();
  const row = await env.DB.prepare('SELECT window_start,count FROM api_rate_limits WHERE key=?').bind(key).first<{window_start:number;count:number}>();
  if (row && row.window_start === windowStart && row.count > 10) throw new HttpError(429, 'Too many login attempts. Try again in a few minutes.');
}

async function handleLogin(req: Request, env: Env, origin?: string) {
  await ensureAuthTables(env);
  await enforceLoginRateLimit(req, env);
  const body = await readJson(req);
  const email = cleanEmail(body.email, true)!;
  const password = cleanString(body.password, 'password', 200, true)!;
  const configuredEmail = (env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!configuredEmail || email !== configuredEmail) throw new HttpError(401, 'Invalid email or password');
  if (!/^[0-9a-f]{32}$/i.test(env.ADMIN_PASSWORD_SALT || '') || !/^[0-9a-f]{64}$/i.test(env.ADMIN_PASSWORD_HASH || '')) {
    throw new HttpError(503, 'Admin login is not configured');
  }

  const candidateHash = await derivePasswordHash(password, env.ADMIN_PASSWORD_SALT);
  if (!constantTimeHexEqual(candidateHash, env.ADMIN_PASSWORD_HASH.toLowerCase())) throw new HttpError(401, 'Invalid email or password');

  const identity = await ensureSuperAdmin(env, email);
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const token = bytesToBase64Url(random);
  const sessionHash = await sha256Hex(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const ip = req.headers.get('cf-connecting-ip') || null;
  const ua = req.headers.get('user-agent')?.slice(0, 250) || null;

  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(Math.floor(Date.now() / 1000)).run();
  await env.DB.prepare('INSERT INTO admin_sessions(session_hash,user_id,expires_at,ip_address,user_agent) VALUES(?,?,?,?,?)')
    .bind(sessionHash, identity.id, expiresAt, ip, ua).run();
  await env.DB.prepare('UPDATE users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?').bind(identity.id).run();
  await audit(env, identity, 'auth.login', 'user', identity.id, undefined, req);

  return json({ user: identity }, { headers: { 'set-cookie': sessionCookie(token) } }, origin);
}

async function handleLogout(req: Request, env: Env, origin?: string) {
  const token = cookieValue(req, SESSION_COOKIE);
  if (token) {
    await ensureAuthTables(env);
    const sessionHash = await sha256Hex(token);
    await env.DB.prepare('DELETE FROM admin_sessions WHERE session_hash=?').bind(sessionHash).run();
  }
  return json({ ok: true }, { headers: { 'set-cookie': sessionCookie('', 0) } }, origin);
}

async function resolveIdentity(req: Request, env: Env): Promise<Identity> {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token) throw new HttpError(401, 'Sign in required');
  await ensureAuthTables(env);
  const sessionHash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at
    FROM admin_sessions s
    JOIN users u ON u.id=s.user_id
    WHERE s.session_hash=? LIMIT 1`).bind(sessionHash).first<any>();
  if (!row) throw new HttpError(401, 'Session expired. Sign in again.');
  const now = Math.floor(Date.now() / 1000);
  if (Number(row.expires_at) <= now) {
    await env.DB.prepare('DELETE FROM admin_sessions WHERE session_hash=?').bind(sessionHash).run();
    throw new HttpError(401, 'Session expired. Sign in again.');
  }
  if (!row.active) throw new HttpError(403, 'Your IDEA LAB staff profile is not active');
  if (!ROLE_VALUES.includes(row.role as Role)) throw new HttpError(403, 'Invalid account role');
  return { id: Number(row.id), email: String(row.email), name: String(row.name), role: row.role as Role };
}

const permissions: Record<Role, Set<string>> = {
  super_admin: new Set(['*']),
  admin: new Set(['dashboard.read','leads.read','leads.write','clients.read','clients.write','projects.read','projects.write','tasks.read','tasks.write','invoices.read','invoices.write','content_items.read','content_items.write','activities.read','users.read']),
  sales: new Set(['dashboard.read','leads.read','leads.write','clients.read','clients.write','activities.read']),
  project_manager: new Set(['dashboard.read','clients.read','projects.read','projects.write','tasks.read','tasks.write','content_items.read','content_items.write','activities.read']),
  finance: new Set(['dashboard.read','clients.read','invoices.read','invoices.write','activities.read']),
  content: new Set(['dashboard.read','clients.read','content_items.read','content_items.write','activities.read']),
};

function can(identity: Identity, permission: string) {
  const p = permissions[identity.role];
  return p.has('*') || p.has(permission);
}
function requirePermission(identity: Identity, permission: string) {
  if (!can(identity, permission)) throw new HttpError(403, 'You do not have permission for this action');
}
function canSeeFinancials(identity: Identity) {
  return identity.role === 'super_admin' || identity.role === 'admin' || identity.role === 'finance';
}

async function enforceRateLimit(req: Request, env: Env, identity: Identity) {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const windowStart = Math.floor(Date.now() / 60000);
  const isWrite = ['POST','PATCH','PUT','DELETE'].includes(req.method);
  const max = isWrite ? 60 : 180;
  const key = `${identity.id}:${ip}:${isWrite ? 'w' : 'r'}`;
  await env.DB.prepare(`INSERT INTO api_rate_limits(key,window_start,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END, window_start=excluded.window_start`)
    .bind(key, windowStart).run();
  const row = await env.DB.prepare('SELECT window_start,count FROM api_rate_limits WHERE key=?').bind(key).first<{window_start:number;count:number}>();
  if (row && row.window_start === windowStart && row.count > max) throw new HttpError(429, 'Too many requests. Try again shortly.');
}

async function audit(env: Env, identity: Identity, action: string, entityType: string, entityId?: number, detail?: string, req?: Request) {
  const ip = req?.headers.get('cf-connecting-ip') || null;
  const ua = req?.headers.get('user-agent')?.slice(0, 250) || null;
  await env.DB.prepare('INSERT INTO activities(entity_type,entity_id,action,detail,user_id,ip_address,user_agent) VALUES(?,?,?,?,?,?,?)')
    .bind(entityType, entityId ?? null, action, detail?.slice(0, 1000) ?? null, identity.id, ip, ua).run();
}

async function readJson(req: Request): Promise<any> {
  const declared = Number(req.headers.get('content-length') || '0');
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large');
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new HttpError(413, 'Request body too large');
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, 'Invalid JSON'); }
}

function cleanString(value: unknown, field: string, max: number, required = false): string | null {
  if (value === null || value === undefined || value === '') {
    if (required) throw new HttpError(400, `${field} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be text`);
  const v = value.trim();
  if (!v && required) throw new HttpError(400, `${field} is required`);
  if (v.length > max) throw new HttpError(400, `${field} is too long`);
  return v || null;
}
function cleanEmail(value: unknown, required = false): string | null {
  const v = cleanString(value, 'email', 254, required);
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new HttpError(400, 'Invalid email');
  return v.toLowerCase();
}
function cleanEnum(value: unknown, field: string, allowed: string[], fallback?: string): string {
  const v = typeof value === 'string' && value ? value : fallback;
  if (!v || !allowed.includes(v)) throw new HttpError(400, `Invalid ${field}`);
  return v;
}
function cleanMoney(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > 1000000000) throw new HttpError(400, 'Invalid value');
  return Math.round(n * 100) / 100;
}

const tablePermissions: Record<string, string> = {
  leads: 'leads.read', clients: 'clients.read', projects: 'projects.read', tasks: 'tasks.read', invoices: 'invoices.read', content_items: 'content_items.read', activities: 'activities.read'
};
async function listTable(env: Env, identity: Identity, table: string) {
  const permission = tablePermissions[table];
  if (!permission) throw new HttpError(404, 'Not found');
  requirePermission(identity, permission);
  if (table === 'leads' && !canSeeFinancials(identity)) {
    return env.DB.prepare('SELECT id,name,company,email,phone,source,service,status,next_action,next_action_at,owner_user_id,notes,created_at,updated_at FROM leads ORDER BY id DESC LIMIT 250').all();
  }
  return env.DB.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 250`).all();
}

async function handleApi(req: Request, env: Env, identity: Identity, url: URL, origin?: string) {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') throw new HttpError(404, 'Not found');

  if (parts[1] === 'me' && req.method === 'GET') return json({ user: identity }, {}, origin);

  if (parts[1] === 'dashboard' && req.method === 'GET') {
    requirePermission(identity, 'dashboard.read');
    const [leads,clients,projects,invoices] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) c FROM leads').first<{c:number}>(),
      env.DB.prepare('SELECT COUNT(*) c FROM clients').first<{c:number}>(),
      env.DB.prepare("SELECT COUNT(*) c FROM projects WHERE status != 'done'").first<{c:number}>(),
      can(identity, 'invoices.read') ? env.DB.prepare("SELECT COALESCE(SUM(amount),0) total FROM invoices WHERE status='paid'").first<{total:number}>() : Promise.resolve({total:0}),
    ]);
    return json({leads:leads?.c||0,clients:clients?.c||0,projects:projects?.c||0,revenue:invoices?.total||0}, {}, origin);
  }

  if (parts[1] === 'users') {
    if (req.method === 'GET') {
      requirePermission(identity, 'users.read');
      const rows = await env.DB.prepare('SELECT id,name,email,role,active,last_login_at,created_at,updated_at FROM users ORDER BY active DESC,name ASC').all();
      return json(rows, {}, origin);
    }
    if (req.method === 'POST') {
      requirePermission(identity, 'users.write');
      const b = await readJson(req);
      const name = cleanString(b.name, 'name', 120, true)!;
      const email = cleanEmail(b.email, true)!;
      const role = cleanEnum(b.role, 'role', ROLE_VALUES, 'sales') as Role;
      const r = await env.DB.prepare('INSERT INTO users(name,email,role,active,created_by_user_id) VALUES(?,?,?,?,?)')
        .bind(name,email,role,1,identity.id).run();
      await audit(env, identity, 'user.created', 'user', Number(r.meta.last_row_id), `${email} / ${role}`, req);
      return json({ok:true,id:r.meta.last_row_id},{status:201},origin);
    }
    if (req.method === 'PATCH' && parts[2]) {
      requirePermission(identity, 'users.write');
      const id = Number(parts[2]); if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid user id');
      const b = await readJson(req);
      const role = b.role === undefined ? null : cleanEnum(b.role, 'role', ROLE_VALUES) as Role;
      const active = b.active === undefined ? null : (b.active ? 1 : 0);
      if (id === identity.id && active === 0) throw new HttpError(400, 'You cannot deactivate your own account');
      if (id === identity.id && role && role !== 'super_admin') throw new HttpError(400, 'You cannot remove your own super admin role');
      await env.DB.prepare('UPDATE users SET role=COALESCE(?,role), active=COALESCE(?,active), updated_at=CURRENT_TIMESTAMP WHERE id=?')
        .bind(role,active,id).run();
      await audit(env, identity, 'user.updated', 'user', id, `role=${role ?? 'unchanged'}, active=${active ?? 'unchanged'}`, req);
      return json({ok:true},{},origin);
    }
  }

  const table = parts[1];
  if (req.method === 'GET' && table) return json(await listTable(env, identity, table), {}, origin);

  if (req.method === 'POST' && table === 'leads') {
    requirePermission(identity, 'leads.write');
    const b = await readJson(req);
    const name = cleanString(b.name, 'name', 120, true)!;
    const status = cleanEnum(b.status, 'status', LEAD_STATUSES, 'new');
    const value = canSeeFinancials(identity) ? cleanMoney(b.value) : 0;
    const currency = canSeeFinancials(identity) ? (cleanString(b.currency,'currency',8)||'USD') : 'USD';
    const r = await env.DB.prepare('INSERT INTO leads(name,company,email,phone,source,service,status,value,currency,next_action,next_action_at,owner_user_id,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(name,cleanString(b.company,'company',160),cleanEmail(b.email),cleanString(b.phone,'phone',50),cleanString(b.source,'source',80),cleanString(b.service,'service',100),status,value,currency,cleanString(b.next_action,'next_action',250),cleanString(b.next_action_at,'next_action_at',40),identity.id,cleanString(b.notes,'notes',5000)).run();
    await audit(env, identity, 'lead.created', 'lead', Number(r.meta.last_row_id), name, req);
    return json({ok:true,id:r.meta.last_row_id},{status:201},origin);
  }

  if (req.method === 'POST' && table === 'clients') {
    requirePermission(identity, 'clients.write');
    const b = await readJson(req);
    const name = cleanString(b.name, 'name', 120, true)!;
    const status = cleanEnum(b.status, 'status', CLIENT_STATUSES, 'active');
    const r = await env.DB.prepare('INSERT INTO clients(name,company,email,phone,status,country,notes) VALUES(?,?,?,?,?,?,?)')
      .bind(name,cleanString(b.company,'company',160),cleanEmail(b.email),cleanString(b.phone,'phone',50),status,cleanString(b.country,'country',100),cleanString(b.notes,'notes',5000)).run();
    await audit(env, identity, 'client.created', 'client', Number(r.meta.last_row_id), name, req);
    return json({ok:true,id:r.meta.last_row_id},{status:201},origin);
  }

  if (req.method === 'PATCH' && table === 'leads' && parts[2]) {
    requirePermission(identity, 'leads.write');
    const id = Number(parts[2]); if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Invalid lead id');
    const b = await readJson(req);
    const status = b.status === undefined ? null : cleanEnum(b.status,'status',LEAD_STATUSES);
    await env.DB.prepare('UPDATE leads SET status=COALESCE(?,status), next_action=COALESCE(?,next_action), next_action_at=COALESCE(?,next_action_at), notes=COALESCE(?,notes), updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(status,cleanString(b.next_action,'next_action',250),cleanString(b.next_action_at,'next_action_at',40),cleanString(b.notes,'notes',5000),id).run();
    await audit(env, identity, 'lead.updated', 'lead', id, status ? `status=${status}` : undefined, req);
    return json({ok:true},{},origin);
  }

  throw new HttpError(404, 'Not found');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = corsOrigin(req, env, url);

    try {
      if (req.method === 'OPTIONS') {
        const requestedOrigin = req.headers.get('origin');
        if (!requestedOrigin || !origin) throw new HttpError(403, 'Origin not allowed');
        const headers = new Headers(SECURITY_HEADERS);
        headers.set('access-control-allow-origin', origin);
        headers.set('access-control-allow-credentials', 'true');
        headers.set('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS');
        headers.set('access-control-allow-headers', 'content-type,x-requested-with');
        headers.set('access-control-max-age', '600');
        headers.set('vary', 'Origin');
        return new Response(null, { status: 204, headers });
      }

      if (url.pathname === '/api/health') return json({ ok: true, service: 'idealab-secure-api', auth: 'd1-session' }, {}, origin);
      if (!url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, { status: 404 }, origin);

      requireTrustedOrigin(req, env, url);
      if (url.pathname === '/api/auth/login' && req.method === 'POST') return await handleLogin(req, env, origin);
      if (url.pathname === '/api/auth/logout' && req.method === 'POST') return await handleLogout(req, env, origin);

      const identity = await resolveIdentity(req, env);
      await enforceRateLimit(req, env, identity);
      return await handleApi(req, env, identity, url, origin);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'Internal server error';
      return json({ error: message }, { status }, origin);
    }
  }
} satisfies ExportedHandler<Env>;
