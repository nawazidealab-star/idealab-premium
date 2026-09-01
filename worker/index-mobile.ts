import app from './index-users-v17';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

const SESSION_COOKIE = 'idealab_admin_session';
const MOBILE_LOGIN = '/api/mobile/auth/login';
const MOBILE_LOGOUT = '/api/mobile/auth/logout';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function bearerToken(req: Request) {
  const value = req.headers.get('authorization') || '';
  const match = /^Bearer\s+([A-Za-z0-9_-]{40,60})$/.exec(value);
  return match?.[1] || null;
}

async function mobileRequest(req: Request, token: string, path = new URL(req.url).pathname) {
  const url = new URL(req.url);
  url.pathname = path;
  const headers = new Headers(req.headers);
  headers.delete('authorization');
  headers.set('cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}`);
  if (['POST','PATCH','PUT','DELETE'].includes(req.method)) {
    headers.set('origin', url.origin);
    headers.set('x-requested-with', 'idealab-admin');
    if (!headers.has('content-type')) headers.set('content-type','application/json');
  }
  const body = ['GET','HEAD'].includes(req.method) ? undefined : await req.clone().arrayBuffer();
  return new Request(url.toString(), { method:req.method, headers, body, redirect:'manual' });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'} });
}

function tokenFromSetCookie(value: string | null) {
  if (!value) return null;
  const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(value);
  return match ? decodeURIComponent(match[1]) : null;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === MOBILE_LOGIN) {
      if (req.method !== 'POST') return json({error:'Method not allowed'},405);
      const loginUrl = new URL(req.url); loginUrl.pathname = '/api/auth/login';
      const headers = new Headers(req.headers);
      headers.delete('authorization');
      headers.set('origin', loginUrl.origin);
      headers.set('x-requested-with','idealab-admin');
      headers.set('content-type','application/json');
      const body = await req.clone().arrayBuffer();
      const internal = new Request(loginUrl.toString(), { method:'POST', headers, body, redirect:'manual' });
      const response = await app.fetch(internal, env);
      const payload = await response.clone().json().catch(()=>null) as any;
      if (!response.ok) return json(payload || {error:'Unable to sign in'},response.status);
      const token = tokenFromSetCookie(response.headers.get('set-cookie'));
      if (!token) return json({error:'Mobile session could not be created'},500);
      return json({user:payload?.user,token,expires_in:SESSION_TTL_SECONDS});
    }

    if (url.pathname === MOBILE_LOGOUT) {
      if (req.method !== 'POST') return json({error:'Method not allowed'},405);
      const token = bearerToken(req);
      if (!token) return json({error:'Sign in required'},401);
      return app.fetch(await mobileRequest(req,token,'/api/auth/logout'),env);
    }

    const token = bearerToken(req);
    if (token && url.pathname.startsWith('/api/')) return app.fetch(await mobileRequest(req,token),env);
    return app.fetch(req,env);
  },
} satisfies ExportedHandler<Env>;
