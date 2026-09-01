import core from './index-crm-complete';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';
type Identity = { id: number; email: string; name: string; role: Role; active: number };

const SESSION_COOKIE = 'idealab_admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const ROLE_VALUES: Role[] = ['super_admin', 'admin', 'sales', 'project_manager', 'finance', 'content'];
const ASSIGNABLE_ROLES: Role[] = ['admin', 'sales', 'project_manager', 'finance', 'content'];
const FX_URL = 'https://open.er-api.com/v6/latest/USD';

let fxCache: { expires: number; payload: unknown } | null = null;

function json(data: unknown, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers);
  h.set('content-type', 'application/json; charset=utf-8');
  h.set('cache-control', 'no-store, max-age=0');
  h.set('x-content-type-options', 'nosniff');
  h.set('x-frame-options', 'DENY');
  h.set('referrer-policy', 'no-referrer');
  return new Response(JSON.stringify(data), { status, headers: h });
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
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

async function pbkdf2Hex(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000 }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeEqual(a: string, b: string) {
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

function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

function requireTrustedOrigin(req: Request) {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  if (!origin || origin !== url.origin) throw new Error('origin');
  if (req.headers.get('x-requested-with') !== 'idealab-admin') throw new Error('csrf');
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) throw new Error('json');
}

function cleanEmail(value: unknown) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('email');
  return email;
}

function cleanName(value: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 120) throw new Error('name');
  return name;
}

function cleanPassword(value: unknown) {
  const password = typeof value === 'string' ? value : '';
  if (password.length < 8 || password.length > 128) throw new Error('password');
  return password;
}

function randomToken(bytes = 24) {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return bytesToBase64Url(value);
}

async function ensureSecuritySchema(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL DEFAULT 'sales',
    active INTEGER NOT NULL DEFAULT 1,
    created_by_user_id INTEGER,
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0
  )`).run();

  const info = await env.DB.prepare('PRAGMA table_info(users)').all<{ name: string }>();
  const columns = new Set((info.results || []).map(row => String(row.name)));
  if (!columns.has('password_salt')) await env.DB.prepare('ALTER TABLE users ADD COLUMN password_salt TEXT').run();
  if (!columns.has('password_hash')) await env.DB.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT').run();
}

async function rateLimitLogin(req: Request, env: Env) {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const windowStart = Math.floor(Date.now() / (5 * 60 * 1000));
  const key = `team-login:${ip}`;
  await env.DB.prepare(`INSERT INTO api_rate_limits(key,window_start,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END, window_start=excluded.window_start`)
    .bind(key, windowStart).run();
  const row = await env.DB.prepare('SELECT window_start,count FROM api_rate_limits WHERE key=?').bind(key).first<{ window_start: number; count: number }>();
  if (row && row.window_start === windowStart && row.count > 12) throw new Error('rate');
}

async function resolveIdentity(req: Request, env: Env): Promise<Identity> {
  await ensureSecuritySchema(env);
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token) throw new Error('auth');
  const sessionHash = await sha256Hex(token);
  const row = await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at
    FROM admin_sessions s JOIN users u ON u.id=s.user_id WHERE s.session_hash=? LIMIT 1`)
    .bind(sessionHash).first<any>();
  if (!row || Number(row.expires_at) <= Math.floor(Date.now() / 1000) || !row.active || !ROLE_VALUES.includes(row.role as Role)) throw new Error('auth');
  return { id: Number(row.id), name: String(row.name), email: String(row.email), role: row.role as Role, active: Number(row.active) };
}

async function handleLogin(req: Request, env: Env) {
  try { requireTrustedOrigin(req); } catch { return json({ error: 'Invalid login request' }, 403); }
  try { await ensureSecuritySchema(env); await rateLimitLogin(req, env); } catch (error) {
    if (error instanceof Error && error.message === 'rate') return json({ error: 'Too many login attempts. Try again in a few minutes.' }, 429);
    return json({ error: 'Login backend unavailable' }, 500);
  }

  let body: { email?: unknown; password?: unknown };
  try { body = await req.json() as { email?: unknown; password?: unknown }; }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  let email = '';
  let password = '';
  try { email = cleanEmail(body.email); password = cleanPassword(body.password); }
  catch { return json({ error: 'Invalid email or password' }, 401); }

  const row = await env.DB.prepare('SELECT id,name,email,role,active,password_salt,password_hash FROM users WHERE lower(email)=? LIMIT 1')
    .bind(email).first<any>();
  if (!row || !row.active || !ROLE_VALUES.includes(row.role as Role)) return json({ error: 'Invalid email or password' }, 401);

  let valid = false;
  if (row.password_hash && row.password_salt) {
    const candidate = await pbkdf2Hex(password, String(row.password_salt));
    valid = constantTimeEqual(candidate, String(row.password_hash).toLowerCase());
  } else if (email === (env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase()) {
    const candidate = await sha256Hex(`${env.ADMIN_PASSWORD_SALT}:${password}`);
    const expected = (env.ADMIN_PASSWORD_HASH || '').toLowerCase();
    valid = /^[0-9a-f]{64}$/.test(expected) && constantTimeEqual(candidate, expected);
  }
  if (!valid) return json({ error: 'Invalid email or password' }, 401);

  const token = randomToken(32);
  const sessionHash = await sha256Hex(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(Math.floor(Date.now() / 1000)).run();
  await env.DB.prepare('INSERT INTO admin_sessions(session_hash,user_id,expires_at,ip_address,user_agent) VALUES(?,?,?,?,?)')
    .bind(sessionHash, row.id, expiresAt, req.headers.get('cf-connecting-ip'), req.headers.get('user-agent')?.slice(0, 250) || null).run();
  await env.DB.prepare('UPDATE users SET last_login_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(row.id).run();

  return json({ user: { id: Number(row.id), name: String(row.name), email: String(row.email), role: row.role } }, 200, { 'set-cookie': sessionCookie(token) });
}

async function handleUsers(req: Request, env: Env) {
  let identity: Identity;
  try { identity = await resolveIdentity(req, env); } catch { return json({ error: 'Sign in required' }, 401); }

  if (req.method === 'GET') {
    if (identity.role === 'super_admin' || identity.role === 'admin') {
      return json(await env.DB.prepare('SELECT id,name,email,role,active,last_login_at,created_at,updated_at FROM users ORDER BY active DESC,name ASC').all());
    }
    return json(await env.DB.prepare('SELECT id,name,role,active FROM users WHERE active=1 ORDER BY name ASC').all());
  }

  if (identity.role !== 'super_admin') return json({ error: 'Super Admin access required' }, 403);
  try { requireTrustedOrigin(req); } catch { return json({ error: 'Invalid request' }, 403); }

  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  let body: Record<string, unknown>;
  try { body = await req.json() as Record<string, unknown>; } catch { return json({ error: 'Invalid JSON' }, 400); }

  if (req.method === 'POST') {
    let name: string; let email: string; let password: string; let role: Role;
    try {
      name = cleanName(body.name); email = cleanEmail(body.email); password = cleanPassword(body.password);
      role = (typeof body.role === 'string' && ASSIGNABLE_ROLES.includes(body.role as Role) ? body.role : 'sales') as Role;
    } catch { return json({ error: 'Name, valid email and password of at least 8 characters are required' }, 400); }
    const exists = await env.DB.prepare('SELECT id FROM users WHERE lower(email)=? LIMIT 1').bind(email).first();
    if (exists) return json({ error: 'A user with this email already exists' }, 409);
    const salt = randomToken(18);
    const hash = await pbkdf2Hex(password, salt);
    const result = await env.DB.prepare('INSERT INTO users(name,email,role,active,created_by_user_id,password_salt,password_hash) VALUES(?,?,?,?,?,?,?)')
      .bind(name, email, role, 1, identity.id, salt, hash).run();
    return json({ ok: true, id: Number(result.meta.last_row_id) }, 201);
  }

  if (req.method === 'PATCH' && parts[2]) {
    const id = Number(parts[2]);
    if (!Number.isInteger(id) || id <= 0) return json({ error: 'Invalid user' }, 400);
    const target = await env.DB.prepare('SELECT id,role,active FROM users WHERE id=? LIMIT 1').bind(id).first<any>();
    if (!target) return json({ error: 'User not found' }, 404);

    const assignments: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) {
      try { assignments.push('name=?'); values.push(cleanName(body.name)); } catch { return json({ error: 'Invalid name' }, 400); }
    }
    if (body.role !== undefined) {
      const role = typeof body.role === 'string' && ROLE_VALUES.includes(body.role as Role) ? body.role as Role : null;
      if (!role) return json({ error: 'Invalid role' }, 400);
      if (id === identity.id && role !== 'super_admin') return json({ error: 'You cannot remove your own Super Admin role' }, 400);
      if (target.role === 'super_admin' && role !== 'super_admin') {
        const count = await env.DB.prepare("SELECT COUNT(*) c FROM users WHERE role='super_admin' AND active=1").first<{ c:number }>();
        if ((count?.c || 0) <= 1) return json({ error: 'At least one active Super Admin is required' }, 400);
      }
      assignments.push('role=?'); values.push(role);
    }
    if (body.active !== undefined) {
      const active = body.active ? 1 : 0;
      if (id === identity.id && !active) return json({ error: 'You cannot deactivate your own account' }, 400);
      if (target.role === 'super_admin' && !active) {
        const count = await env.DB.prepare("SELECT COUNT(*) c FROM users WHERE role='super_admin' AND active=1").first<{ c:number }>();
        if ((count?.c || 0) <= 1) return json({ error: 'At least one active Super Admin is required' }, 400);
      }
      assignments.push('active=?'); values.push(active);
    }
    if (body.password !== undefined) {
      let password: string;
      try { password = cleanPassword(body.password); } catch { return json({ error: 'Password must be 8 to 128 characters' }, 400); }
      const salt = randomToken(18);
      assignments.push('password_salt=?','password_hash=?'); values.push(salt, await pbkdf2Hex(password, salt));
    }
    if (!assignments.length) return json({ ok: true });
    await env.DB.prepare(`UPDATE users SET ${assignments.join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...values, id).run();
    if (body.password !== undefined || body.active === false) await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(id).run();
    return json({ ok: true });
  }

  return json({ error: 'Method not allowed' }, 405);
}

async function handleFx() {
  if (fxCache && fxCache.expires > Date.now()) return json(fxCache.payload);
  try {
    const response = await fetch(FX_URL, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('fx');
    const data = await response.json() as any;
    if (data?.result !== 'success' || !data?.rates?.USD) throw new Error('fx');
    const payload = { base: 'USD', rates: data.rates, updatedAt: data.time_last_update_unix || null, source: 'ExchangeRate-API' };
    fxCache = { expires: Date.now() + 6 * 60 * 60 * 1000, payload };
    return json(payload);
  } catch {
    return json({ error: 'Currency rates are temporarily unavailable' }, 503);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/auth/login' && req.method === 'POST') return handleLogin(req, env);
    if (url.pathname === '/api/users' || url.pathname.startsWith('/api/users/')) return handleUsers(req, env);
    if (url.pathname === '/api/fx' && req.method === 'GET') return handleFx();
    return core.fetch(req, env);
  },
} satisfies ExportedHandler<Env>;
