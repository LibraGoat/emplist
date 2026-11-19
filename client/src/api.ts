import type { Employee, NewEmployee, User } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    let body: { error?: string; fields?: Record<string, string> } = {};
    try {
      body = (await res.json()) as typeof body;
    } catch {
      // non-JSON error body (proxy offline, etc.)
    }
    throw new ApiError(res.status, body.error || `Ошибка сервера (${res.status})`, body.fields);
  }
  return (await res.json()) as T;
}

export const api = {
  me: () => request<{ user: User }>('/api/auth/me'),
  login: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) =>
    request<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  departments: () => request<{ departments: string[] }>('/api/employees/departments'),
  employees: (search: string, department: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (department) params.set('department', department);
    const qs = params.toString();
    return request<{ employees: Employee[] }>(`/api/employees${qs ? `?${qs}` : ''}`);
  },
  addEmployee: (data: NewEmployee) =>
    request<{ employee: Employee }>('/api/employees', { method: 'POST', body: JSON.stringify(data) }),
};