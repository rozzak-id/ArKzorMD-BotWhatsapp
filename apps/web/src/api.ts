import type {
  ApprovalResponse,
  AuditResponse,
  AuthStatusResponse,
  GroupChat,
  PersonaResponse,
  PlatformCard,
  SettingsResponse,
  StatusResponse,
  ToolResponse,
} from './types';

const TOKEN_KEY = 'arkzor.admin_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('accept', 'application/json');
  if (init?.body) headers.set('content-type', 'application/json');

  const token = getAuthToken();
  if (token && !headers.has('x-session-token') && !headers.has('x-admin-token')) {
    headers.set('x-session-token', token);
  }

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
  activatePersona: (id: string) =>
    request<{ ok: boolean; active: string }>(`/api/personas/${encodeURIComponent(id)}/activate`, {
      method: 'POST',
    }),
  importPersonas: (personas: any[]) =>
    request<{ ok: boolean; imported: number }>('/api/personas/import', {
      method: 'POST',
      body: JSON.stringify({ personas }),
    }),
  users: () => request<{ users: import('./types').User[] }>('/api/users'),
  tools: () => request<ToolResponse>('/api/tools'),
  audit: (limit = 50) => request<AuditResponse>(`/api/audit?limit=${limit}`),
  settings: () => request<SettingsResponse>('/api/settings'),
  memory: (limit = 100) =>
    request<{ notes: Array<{ id: number; userJid: string; note: string; createdAt: number }> }>(
      `/api/memory?limit=${limit}`,
    ),
  deleteMemory: (id: number, token?: string) =>
    request<{ ok: boolean; id: number }>(`/api/memory/${id}`, {
      method: 'DELETE',
      headers: token ? { 'x-admin-token': token } : {},
    }),
  toggleKillSwitch: (enabled: boolean, token?: string) =>
    request<{ ok: boolean; killSwitch: boolean }>('/api/settings/kill-switch', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
      headers: token ? { 'x-admin-token': token } : {},
    }),
  // Auth & Setup
  authStatus: () => request<AuthStatusResponse>('/api/auth/status'),
  setupAdmin: (password: string) =>
    request<{ ok: boolean; token: string }>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  login: (password: string) =>
    request<{ ok: boolean; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),
  requestOwnerCode: (phoneNumber: string) =>
    request<{ ok: boolean; code: string; targetJid: string; instruction: string }>(
      '/api/setup/owner/request-code',
      {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      },
    ),
  verifyOwner: (phoneNumber: string, code: string) =>
    request<{ ok: boolean; ownerJid: string; message: string }>('/api/setup/owner/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, code }),
    }),
  finalizeSetup: (data: { personaId?: string; accessMode?: 'closed' | 'auto_member' | 'approval' }) =>
    request<{ ok: boolean; message: string }>('/api/setup/finalize', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // Groups
  groups: () => request<{ groups: GroupChat[] }>('/api/groups'),
  setGroupMode: (id: string, mode: 'off' | 'mention' | 'active') =>
    request<{ ok: boolean; group: any }>(`/api/groups/${encodeURIComponent(id)}/mode`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
  setGroupPersona: (id: string, personaId: string | null) =>
    request<{ ok: boolean; chatId: string; personaId: string | null }>(
      `/api/groups/${encodeURIComponent(id)}/persona`,
      {
        method: 'POST',
        body: JSON.stringify({ personaId }),
      },
    ),
  // WhatsApp Pairing Code
  requestPairingCode: (phoneNumber: string) =>
    request<{ ok: boolean; code: string }>('/api/whatsapp/pairing-code', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    }),
};
