export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type Role = 'owner' | 'admin' | 'member';
export type RiskLevel = 'L0' | 'L1' | 'L2';

export interface StatusResponse {
  app: string;
  version: string;
  nodeEnv: string;
  uptimeSec: number;
  ai: {
    provider: string;
    model: string;
    fallbackModel: string | null;
    timeoutMs: number;
  };
  connection: {
    platform: 'whatsapp';
    mode: string;
    status: ConnectionStatus;
    qr: string | null;
    autoconnect: boolean;
    module: string;
    runtime: string;
    lastError: string | null;
  };
  killSwitch: boolean;
  ownerConfigured: boolean;
  counts: { users: number; pendingApprovals: number; messagesToday: number };
  prefix: string;
}

export interface PlatformCard {
  id: 'whatsapp' | 'telegram' | 'discord';
  name: string;
  enabled: boolean;
  state: 'active' | 'inactive' | 'coming_soon';
  connection: ConnectionStatus;
  transport?: string;
  note?: string;
}

export interface ApprovalRequest {
  id: string;
  shortCode: string;
  requesterJid: string;
  requesterRole: Role;
  toolName: string;
  params: Record<string, unknown>;
  chatId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: number;
  expiresAt: number;
  decidedAt: number | null;
  decidedBy: string | null;
}

export interface ApprovalRule {
  id: string;
  toolName: string;
  target: string | null;
  expiresAt: number | null;
  createdAt: number;
}

export interface ApprovalResponse {
  pending: ApprovalRequest[];
  rules: ApprovalRule[];
}

export interface Persona {
  id: string;
  name: string;
  language: string;
  style: string;
  forbiddenTopics: string[];
  typingDelay: string;
  greeting?: string;
  examples: Array<{ user: string; bot: string }>;
  extraInstructions?: string;
}

export interface PersonaResponse {
  active: string | null;
  personas: Persona[];
}

export interface User {
  jid: string;
  name: string | null;
  role: Role;
  status: 'active' | 'blocked' | 'pending';
  quotaDaily: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ToolInfo {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  risk: RiskLevel;
  allowedRoles: Role[];
}

export interface ToolResponse {
  tools: ToolInfo[];
  killSwitch: boolean;
}

export interface AuditEntry {
  id: number;
  actorJid: string | null;
  action: string;
  params: unknown;
  result: unknown;
  createdAt: number;
}

export interface AuditResponse {
  entries: AuditEntry[];
}

export interface SettingsResponse {
  prefix: string;
  accessMode: string;
  defaultChatMode: string;
  killSwitch: boolean;
  selfControl?: boolean;
  rateLimitPerMinute: number;
  aiProvider: string;
  aiModel: string;
  aiBaseUrl?: string;
  aiFallbackModel: string | null;
  aiTimeoutMs: number;
  hasApiKey?: boolean;
  whatsappMode: string;
}

export interface GroupChat {
  chatId: string;
  mode: 'off' | 'mention' | 'active';
  personaId: string | null;
  updatedAt: number;
}

export interface AuthStatusResponse {
  needsSetup: boolean;
  setupCompleted: boolean;
  authenticated: boolean;
  hasOwner: boolean;
  ownerJid: string | null;
}
