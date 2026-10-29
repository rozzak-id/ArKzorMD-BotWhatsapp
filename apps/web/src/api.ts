import type {
  ApprovalResponse,
  AuditResponse,
  PersonaResponse,
  PlatformCard,
  SettingsResponse,
  StatusResponse,
  ToolResponse,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('accept', 'application/json');
  if (init?.body) headers.set('content-type', 'application/json');

  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  status: () => request<StatusResponse>('/api/status'),
  platforms: () => request<{ platforms: PlatformCard[] }>('/api/platforms'),
  approvals: () => request<ApprovalResponse>('/api/approvals'),
  personas: () => request<PersonaResponse>('/api/personas'),
  users: () => request<{ users: import('./types').User[] }>('/api/users'),
  tools: () => request<ToolResponse>('/api/tools'),
  audit: (limit = 50) => request<AuditResponse>(`/api/audit?limit=${limit}`),
  settings: () => request<SettingsResponse>('/api/settings'),
};
