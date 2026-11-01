import type {
  ApprovalRequest,
  ApprovalRule,
  ApprovalStatus,
  AuditEntry,
  ChatMode,
  ChatRecord,
  ChatType,
  Persona,
  Platform,
  Role,
  StoredMessage,
  User,
  UserStatus,
} from './types.js';

export interface UserStore {
  get(jid: string): User | undefined;
  upsert(input: {
    jid: string;
    name?: string | null;
    role?: Role;
    status?: UserStatus;
    quotaDaily?: number | null;
  }): User;
  list(): User[];
  setRole(jid: string, role: Role): void;
  setStatus(jid: string, status: UserStatus): void;
  delete?(jid: string): boolean;
  count(): number;
}

export interface ChatStore {
  get(chatId: string): ChatRecord | undefined;
  setMode(input: {
    chatId: string;
    platform: Platform;
    type: ChatType;
    mode: ChatMode;
  }): ChatRecord;
  list(): ChatRecord[];
}

export interface MessageStore {
  append(input: {
    chatId: string;
    platform: Platform;
    senderId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    createdAt?: number;
  }): void;
  recent(chatId: string, limit: number): StoredMessage[];
  clear(chatId: string): void;
  countSince(timestamp: number): number;
}

export interface PersonaStore {
  list(): Persona[];
  get(id: string): Persona | undefined;
  getActive(): Persona | undefined;
  upsert(persona: Persona): Persona;
  activate(id: string): void;
  delete?(id: string): boolean;
  getAssignment?(scope: 'chat' | 'group', scopeId: string): string | undefined;
  setAssignment?(scope: 'chat' | 'group', scopeId: string, personaId: string | null): void;
}

export interface ApprovalStore {
  create(request: ApprovalRequest): void;
  get(id: string): ApprovalRequest | undefined;
  getByShortCode(shortCode: string): ApprovalRequest | undefined;
  listPending(now: number): ApprovalRequest[];
  list(limit: number): ApprovalRequest[];
  updateStatus(
    id: string,
    status: ApprovalStatus,
    decidedAt: number | null,
    decidedBy: string | null,
  ): void;
  expireStale(now: number): number;
  countPending(): number;
  createRule(rule: ApprovalRule): void;
  findRule(toolName: string, target: string | null, now: number): ApprovalRule | undefined;
  listRules(): ApprovalRule[];
  deleteRule(id: string): boolean;
}

export interface AuditStore {
  append(entry: Omit<AuditEntry, 'id'>): void;
  list(limit: number): AuditEntry[];
  clearAll?(): void;
}

export interface SettingsStore {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  getBoolean(key: string, fallback?: boolean): boolean;
  getNumber(key: string, fallback?: number): number;
  all(): Record<string, string>;
}

export interface MemoryNote {
  id: number;
  userJid: string;
  note: string;
  createdAt: number;
}

export interface MemoryStore {
  save(userJid: string, note: string): MemoryNote;
  search(userJid: string, query: string): MemoryNote[];
  list(userJid: string): MemoryNote[];
  listAll?(limit?: number): MemoryNote[];
  delete(id: number): boolean;
  clear(userJid: string): number;
  clearAll?(): void;
}
