import app from './index-free-auth-bootstrap';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Identity = { id: number; email: string; name: string; role: 'super_admin' };

const SESSION_COOKIE = 'idealab_admin_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const SESSION_COLUMNS = ['id', 'session_hash', 'user_id', 'expires_at', 'created_at', 'ip_address', 'user_agent'];

function json(data: unknown, status = 200, headers?: HeadersInit) {
  const h = new Headers(headers);
  h.set('content-type', 'application/json; charset=utf-8');
  h.set('cache-control', 'no-store, max-age=0');
  h.set('x-content-type-options', 'nosniff');
  h.set('x-frame-options', 'DENY');
  h.set('referrer-policy', 'no-referrer');
  return new Response(JSON.stringify(data), { status, headers: h });
}

function stageError(stage: string) {
  return json({ error: `Login backend error (${stage})` }, 500);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

async function createSessionTable(env: Env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)').run();
}

async function ensureLoginTables(env: Env) {
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

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS api_rate_limits (
    key TEXT PRIMARY KEY,
    window_start INTEGER NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
  )`).run();

  await createSessionTable(env);

  const tableInfo = await env.DB.prepare('PRAGMA table_info(admin_sessions)').all<{ name: string }>();
  const columns = new Set((tableInfo.results || []).map(row => String(row.name)));
  const compatible = SESSION_COLUMNS.every(column => columns.has(column));
  if (!compatible) {
    await env.DB.prepare('DROP TABLE IF EXISTS admin_sessions').run();
    await createSessionTable(env);
  }
}

async function rateLimit(req: Request, env: Env) {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const windowStart = Math.floor(Date.now() / (5 * 60 * 1000));
  const key = `login:${ip}`;
  await env.DB.prepare(`INSERT INTO api_rate_limits(key,window_start,count) VALUES(?,?,1)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END, window_start=excluded.window_start`)
    .bind(key, windowStart).run();
  const row = await env.DB.prepare('SELECT window_start,count FROM api_rate_limits WHERE key=?')
    .bind(key).first<{ window_start: number; count: number }>();
  if (row && row.window_start === windowStart && row.count > 10) {
    return json({ error: 'Too many login attempts. Try again in a few minutes.' }, 429);
  }
  return null;
}

async function ensureSuperAdmin(env: Env, email: string): Promise<Identity> {
  let row = await env.DB.prepare('SELECT id,name,email,role,active FROM users WHERE lower(email)=? LIMIT 1')
    .bind(email).first<any>();

  if (!row) {
    await env.DB.prepare("INSERT INTO users(name,email,role,active,last_login_at) VALUES(?,?,'super_admin',1,CURRENT_TIMESTAMP)")
      .bind(email.split('@')[0], email).run();
    row = await env.DB.prepare('SELECT id,name,email,role,active FROM users WHERE lower(email)=? LIMIT 1')
      .bind(email).first<any>();
  } else {
    await env.DB.prepare("UPDATE users SET role='super_admin', active=1, last_login_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .bind(row.id).run();
    row = await env.DB.prepare('SELECT id,name,email,role,active FROM users WHERE id=? LIMIT 1')
      .bind(row.id).first<any>();
  }

  if (!row) throw new Error('admin-profile');
  return { id: Number(row.id), email: String(row.email), name: String(row.name), role: 'super_admin' };
}

async function repairSessionTable(env: Env) {
  await env.DB.prepare('DROP TABLE IF EXISTS admin_sessions').run();
  await createSessionTable(env);
}

async function saveSession(env: Env, identity: Identity, token: string) {
  const sessionHash = await sha256Hex(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  await env.DB.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?')
    .bind(Math.floor(Date.now() / 1000)).run();
  await env.DB.prepare('INSERT INTO admin_sessions(session_hash,user_id,expires_at) VALUES(?,?,?)')
    .bind(sessionHash, identity.id, expiresAt).run();
}

async function handleLiteLogin(req: Request, env: Env) {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  if (!origin || origin !== url.origin) return json({ error: 'Untrusted request origin' }, 403);
  if (req.headers.get('x-requested-with') !== 'idealab-admin') return json({ error: 'Missing CSRF protection header' }, 403);
  if (!(req.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json({ error: 'JSON requests only' }, 415);

  try {
    await ensureLoginTables(env);
  } catch {
    return stageError('database setup');
  }

  try {
    const limited = await rateLimit(req, env);
    if (limited) return limited;
  } catch {
    return stageError('rate limit');
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json() as { email?: unknown; password?: unknown };
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const configuredEmail = (env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email || !password || email !== configuredEmail) return json({ error: 'Invalid email or password' }, 401);

  try {
    const expected = (env.ADMIN_PASSWORD_HASH || '').toLowerCase();
    const candidate = await sha256Hex(`${env.ADMIN_PASSWORD_SALT}:${password}`);
    if (!/^[0-9a-f]{64}$/.test(expected) || !constantTimeEqual(candidate, expected)) {
      return json({ error: 'Invalid email or password' }, 401);
    }
  } catch {
    return stageError('password verification');
  }

  let identity: Identity;
  try {
    identity = await ensureSuperAdmin(env, email);
  } catch {
    return stageError('admin profile');
  }

  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const token = bytesToBase64Url(random);

  try {
    await saveSession(env, identity, token);
  } catch {
    try {
      await repairSessionTable(env);
      await saveSession(env, identity, token);
    } catch {
      return stageError('session creation');
    }
  }

  return json({ user: identity }, 200, { 'set-cookie': sessionCookie(token) });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      return handleLiteLogin(req, env);
    }
    return app.fetch(req, env);
  },
} satisfies ExportedHandler<Env>;
