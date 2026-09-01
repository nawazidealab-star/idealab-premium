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
  requestId?: string;

  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
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

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'Network connection failed. Check your internet and retry.');
  }

  const contentType = response.headers.get('content-type') || '';
  const headerRequestId = response.headers.get('x-idealab-request-id') || undefined;
  if (!contentType.includes('application/json')) {
    const suffix = headerRequestId ? ` · Ref ${headerRequestId}` : '';
    throw new ApiError(response.status, `Admin API returned an unexpected response${suffix}.`, headerRequestId);
  }

  const payload = await response.json().catch(() => null) as any;
  if (!response.ok) {
    const requestId = typeof payload?.request_id === 'string' ? payload.request_id : headerRequestId;
    const baseMessage = payload && typeof payload === 'object' && 'error' in payload
      ? String(payload.error)
      : `Request failed (${response.status})`;
    const message = requestId && !baseMessage.includes(requestId) ? `${baseMessage} · Ref ${requestId}` : baseMessage;
    throw new ApiError(response.status, message, requestId);
  }

  return payload as T;
}

export function loginAdmin(email: string, password: string) {
  return adminApi<{ user: AppUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAdmin() {
  return adminApi<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
