export type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';

export type AppUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type Lead = {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  service: string | null;
  status: string;
  value: number;
  currency: string;
  next_action: string | null;
  next_action_at: string | null;
  owner_user_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DashboardData = {
  leads: number;
  clients: number;
  projects: number;
  revenue: number;
};

export type D1Result<T> = {
  results: T[];
  success?: boolean;
  meta?: Record<string, unknown>;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function adminApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');

  const method = (init.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('x-requested-with', 'idealab-admin');
  }
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      response.status,
      'Secure API session required. Sign in through Cloudflare Access and try again.',
    );
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}
