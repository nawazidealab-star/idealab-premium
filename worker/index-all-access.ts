import app from './index-crm-complete';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

let normalized = false;

async function normalizeActiveStaffAccess(env: Env) {
  if (normalized) return;
  await env.DB.prepare(`UPDATE users
    SET role='admin', updated_at=CURRENT_TIMESTAMP
    WHERE active=1 AND role NOT IN ('super_admin','admin')`).run();
  normalized = true;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/auth/login') {
      try {
        await normalizeActiveStaffAccess(env);
      } catch {
        // Do not block a valid request if the users table is not initialized yet.
      }
    }
    return app.fetch(req, env);
  },
} satisfies ExportedHandler<Env>;
