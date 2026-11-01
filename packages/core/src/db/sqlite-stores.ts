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
} from '../types.js';
import type {
  ApprovalStore,
  AuditStore,
  ChatStore,
  MemoryNote,
  MemoryStore,
  MessageStore,
  PersonaStore,
  SettingsStore,
  UserStore,
} from '../stores.js';
import type { Db } from './index.js';
import { now } from '../utils/id.js';

interface UserRow {
  jid: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  quota_daily: number | null;
  created_at: number;
  updated_at: number;
}

interface PersonaRow {
  id: string;
  name: string;
  config: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

interface ChatRow {
  id: string;
  platform: Platform;
  type: ChatType;
  mode: ChatMode;
  updated_at: number;
}

interface MessageRow {
  id: number;
  chat_id: string;
  platform: Platform;
  sender_id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  created_at: number;
}

interface ApprovalRow {
  id: string;
  short_code: string;
  requester_jid: string;
  requester_role: Role;
  tool_name: string;
  params: string;
  chat_id: string;
  status: ApprovalStatus;
  created_at: number;
  expires_at: number;
  decided_at: number | null;
  decided_by: string | null;
}

interface ApprovalRuleRow {
  id: string;
  tool_name: string;
  target: string | null;
  expires_at: number | null;
  created_at: number;
}

interface AuditRow {
  id: number;
  actor_jid: string | null;
  action: string;
  params: string | null;
  result: string | null;
  created_at: number;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (value === null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toUser(row: UserRow): User {
  return {
    jid: row.jid,
    name: row.name,
    role: row.role,
    status: row.status,
    quotaDaily: row.quota_daily,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPersona(row: PersonaRow): Persona {
  const config = parseJson<Partial<Persona>>(row.config, {});
  return {
    id: row.id,
    name: row.name,
    language: config.language ?? 'id',
    style: config.style ?? 'santai',
    forbiddenTopics: config.forbiddenTopics ?? [],
    typingDelay: config.typingDelay ?? 'natural',
    ...(config.greeting ? { greeting: config.greeting } : {}),
    examples: config.examples ?? [],
    ...(config.extraInstructions ? { extraInstructions: config.extraInstructions } : {}),
    ...(config.model ? { model: config.model } : {}),
  };
}

function toChat(row: ChatRow): ChatRecord {
  return {
    id: row.id,
    platform: row.platform,
    type: row.type,
    mode: row.mode,
    updatedAt: row.updated_at,
  };
}

function toMessage(row: MessageRow): StoredMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    platform: row.platform,
    senderId: row.sender_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

function toApproval(row: ApprovalRow): ApprovalRequest {
  return {
    id: row.id,
    shortCode: row.short_code,
    requesterJid: row.requester_jid,
    requesterRole: row.requester_role,
    toolName: row.tool_name,
    params: parseJson<Record<string, unknown>>(row.params, {}),
    chatId: row.chat_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    decidedAt: row.decided_at,
    decidedBy: row.decided_by,
  };
}

function toRule(row: ApprovalRuleRow): ApprovalRule {
  return {
    id: row.id,
    toolName: row.tool_name,
    target: row.target,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function toAudit(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    actorJid: row.actor_jid,
    action: row.action,
    params: parseJson<unknown>(row.params, null),
    result: parseJson<unknown>(row.result, null),
    createdAt: row.created_at,
  };
}

export class SqliteUserStore implements UserStore {
  constructor(private readonly db: Db) {}

  get(jid: string): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE jid = ?').get(jid) as UserRow | undefined;
    return row ? toUser(row) : undefined;
  }

  upsert(input: {
    jid: string;
    name?: string | null;
    role?: Role;
    status?: UserStatus;
    quotaDaily?: number | null;
  }): User {
    const timestamp = now();
    const existing = this.get(input.jid);
    if (existing) {
      this.db
        .prepare(
          `UPDATE users
           SET name = ?, role = ?, status = ?, quota_daily = ?, updated_at = ?
           WHERE jid = ?`,
        )
        .run(
          input.name ?? existing.name,
          input.role ?? existing.role,
          input.status ?? existing.status,
          input.quotaDaily === undefined ? existing.quotaDaily : input.quotaDaily,
          timestamp,
          input.jid,
        );
    } else {
      this.db
        .prepare(
          `INSERT INTO users (jid, name, role, status, quota_daily, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.jid,
          input.name ?? null,
          input.role ?? 'member',
          input.status ?? 'active',
          input.quotaDaily ?? null,
          timestamp,
          timestamp,
        );
    }
    return this.get(input.jid) as User;
  }

  list(): User[] {
    const rows = this.db.prepare('SELECT * FROM users ORDER BY role, jid').all() as UserRow[];
    return rows.map(toUser);
  }

  setRole(jid: string, role: Role): void {
    this.db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE jid = ?').run(role, now(), jid);
  }

  setStatus(jid: string, status: UserStatus): void {
    this.db
      .prepare('UPDATE users SET status = ?, updated_at = ? WHERE jid = ?')
      .run(status, now(), jid);
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number };
    return row.total;
  }
}

export class SqlitePersonaStore implements PersonaStore {
  constructor(private readonly db: Db) {}

  list(): Persona[] {
    const rows = this.db.prepare('SELECT * FROM personas ORDER BY name').all() as PersonaRow[];
    return rows.map(toPersona);
  }

  get(id: string): Persona | undefined {
    const row = this.db.prepare('SELECT * FROM personas WHERE id = ?').get(id) as
      | PersonaRow
      | undefined;
    return row ? toPersona(row) : undefined;
  }

  getActive(): Persona | undefined {
    const row = this.db
      .prepare('SELECT * FROM personas WHERE is_active = 1 LIMIT 1')
      .get() as PersonaRow | undefined;
    return row ? toPersona(row) : undefined;
  }

  upsert(persona: Persona): Persona {
    const timestamp = now();
    this.db
      .prepare(
        `INSERT INTO personas (id, name, config, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)
         ON CONFLICT(id) DO UPDATE SET name = excluded.name, config = excluded.config, updated_at = excluded.updated_at`,
      )
      .run(persona.id, persona.name, JSON.stringify(persona), timestamp, timestamp);
    return this.get(persona.id) as Persona;
  }

  activate(id: string): void {
    const transaction = this.db.transaction(() => {
      this.db.prepare('UPDATE personas SET is_active = 0').run();
      this.db.prepare('UPDATE personas SET is_active = 1, updated_at = ? WHERE id = ?').run(now(), id);
    });
    transaction();
  }

  getAssignment(scope: 'chat' | 'group', scopeId: string): string | undefined {
    const row = this.db
      .prepare('SELECT persona_id FROM persona_assignments WHERE scope = ? AND scope_id = ?')
      .get(scope, scopeId) as { persona_id: string } | undefined;
    return row?.persona_id;
  }

  setAssignment(scope: 'chat' | 'group', scopeId: string, personaId: string | null): void {
    if (!personaId) {
      this.db
        .prepare('DELETE FROM persona_assignments WHERE scope = ? AND scope_id = ?')
        .run(scope, scopeId);
    } else {
      this.db
        .prepare(
          `INSERT INTO persona_assignments (scope, scope_id, persona_id)
           VALUES (?, ?, ?)
           ON CONFLICT(scope, scope_id) DO UPDATE SET persona_id = excluded.persona_id`,
        )
        .run(scope, scopeId, personaId);
    }
  }
}

export class SqliteChatStore implements ChatStore {
  constructor(private readonly db: Db) {}

  get(chatId: string): ChatRecord | undefined {
    const row = this.db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as ChatRow | undefined;
    return row ? toChat(row) : undefined;
  }

  setMode(input: {
    chatId: string;
    platform: Platform;
    type: ChatType;
    mode: ChatMode;
  }): ChatRecord {
    this.db
      .prepare(
        `INSERT INTO chats (id, platform, type, mode, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET platform = excluded.platform, type = excluded.type,
           mode = excluded.mode, updated_at = excluded.updated_at`,
      )
      .run(input.chatId, input.platform, input.type, input.mode, now());
    return this.get(input.chatId) as ChatRecord;
  }

  list(): ChatRecord[] {
    const rows = this.db.prepare('SELECT * FROM chats ORDER BY updated_at DESC').all() as ChatRow[];
    return rows.map(toChat);
  }
}

export class SqliteMessageStore implements MessageStore {
  constructor(private readonly db: Db) {}

  append(input: {
    chatId: string;
    platform: Platform;
    senderId: string;
    role: 'user' | 'assistant' | 'tool';
    content: string;
    createdAt?: number;
  }): void {
    this.db
      .prepare(
        `INSERT INTO messages (chat_id, platform, sender_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.chatId, input.platform, input.senderId, input.role, input.content, input.createdAt ?? now());
  }

  recent(chatId: string, limit: number): StoredMessage[] {
    const rows = this.db
      .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC LIMIT ?')
      .all(chatId, limit) as MessageRow[];
    return rows.reverse().map(toMessage);
  }

  clear(chatId: string): void {
    this.db.prepare('DELETE FROM messages WHERE chat_id = ?').run(chatId);
  }

  countSince(timestamp: number): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS total FROM messages WHERE created_at >= ?')
      .get(timestamp) as { total: number };
    return row.total;
  }
}

export class SqliteApprovalStore implements ApprovalStore {
  constructor(private readonly db: Db) {}

  create(request: ApprovalRequest): void {
    this.db
      .prepare(
        `INSERT INTO approvals
          (id, short_code, requester_jid, requester_role, tool_name, params, chat_id,
           status, created_at, expires_at, decided_at, decided_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        request.id,
        request.shortCode,
        request.requesterJid,
        request.requesterRole,
        request.toolName,
        JSON.stringify(request.params),
        request.chatId,
        request.status,
        request.createdAt,
        request.expiresAt,
        request.decidedAt,
        request.decidedBy,
      );
  }

  get(id: string): ApprovalRequest | undefined {
    const row = this.db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as
      | ApprovalRow
      | undefined;
    return row ? toApproval(row) : undefined;
  }

  getByShortCode(shortCode: string): ApprovalRequest | undefined {
    const row = this.db
      .prepare('SELECT * FROM approvals WHERE short_code = ?')
      .get(shortCode) as ApprovalRow | undefined;
    return row ? toApproval(row) : undefined;
  }

  listPending(nowTimestamp: number): ApprovalRequest[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM approvals WHERE status = ? AND expires_at > ? ORDER BY created_at ASC',
      )
      .all('pending', nowTimestamp) as ApprovalRow[];
    return rows.map(toApproval);
  }

  list(limit: number): ApprovalRequest[] {
    const rows = this.db
      .prepare('SELECT * FROM approvals ORDER BY created_at DESC LIMIT ?')
      .all(limit) as ApprovalRow[];
    return rows.map(toApproval);
  }

  updateStatus(
    id: string,
    status: ApprovalStatus,
    decidedAt: number | null,
    decidedBy: string | null,
  ): void {
    this.db
      .prepare('UPDATE approvals SET status = ?, decided_at = ?, decided_by = ? WHERE id = ?')
      .run(status, decidedAt, decidedBy, id);
  }

  expireStale(nowTimestamp: number): number {
    const result = this.db
      .prepare(
        "UPDATE approvals SET status = 'expired', decided_at = ? WHERE status = 'pending' AND expires_at <= ?",
      )
      .run(nowTimestamp, nowTimestamp);
    return result.changes;
  }

  countPending(): number {
    const row = this.db
      .prepare(
        "SELECT COUNT(*) AS total FROM approvals WHERE status = 'pending' AND expires_at > ?",
      )
      .get(now()) as { total: number };
    return row.total;
  }

  createRule(rule: ApprovalRule): void {
    this.db
      .prepare(
        'INSERT INTO approval_rules (id, tool_name, target, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(rule.id, rule.toolName, rule.target, rule.expiresAt, rule.createdAt);
  }

  findRule(toolName: string, target: string | null, nowTimestamp: number): ApprovalRule | undefined {
    const row = this.db
      .prepare(
        `SELECT * FROM approval_rules
         WHERE tool_name = ? AND (target IS NULL OR target = ?)
           AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY CASE WHEN target IS NULL THEN 1 ELSE 0 END ASC, created_at DESC
         LIMIT 1`,
      )
      .get(toolName, target, nowTimestamp) as ApprovalRuleRow | undefined;
    return row ? toRule(row) : undefined;
  }

  listRules(): ApprovalRule[] {
    const rows = this.db
      .prepare('SELECT * FROM approval_rules ORDER BY created_at DESC')
      .all() as ApprovalRuleRow[];
    return rows.map(toRule);
  }

  deleteRule(id: string): boolean {
    return this.db.prepare('DELETE FROM approval_rules WHERE id = ?').run(id).changes > 0;
  }
}

export class SqliteAuditStore implements AuditStore {
  constructor(private readonly db: Db) {}

  append(entry: Omit<AuditEntry, 'id'>): void {
    this.db
      .prepare(
        'INSERT INTO audit_logs (actor_jid, action, params, result, created_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(
        entry.actorJid,
        entry.action,
        entry.params === undefined ? null : JSON.stringify(entry.params),
        entry.result === undefined ? null : JSON.stringify(entry.result),
        entry.createdAt,
      );
  }

  list(limit: number): AuditEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?')
      .all(limit) as AuditRow[];
    return rows.map(toAudit);
  }
}

export class SqliteSettingsStore implements SettingsStore {
  constructor(private readonly db: Db) {}

  get(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  }

  set(key: string, value: string): void {
    this.db
      .prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      )
      .run(key, value);
  }

  getBoolean(key: string, fallback = false): boolean {
    const value = this.get(key);
    if (value === undefined) return fallback;
    return value === 'true' || value === '1';
  }

  getNumber(key: string, fallback = 0): number {
    const value = this.get(key);
    if (value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  all(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as {
      key: string;
      value: string;
    }[];
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
}

export class SqliteMemoryStore implements MemoryStore {
  constructor(private readonly db: Db) {}

  save(userJid: string, note: string): MemoryNote {
    const createdAt = now();
    const result = this.db
      .prepare('INSERT INTO memory_notes (user_jid, note, created_at) VALUES (?, ?, ?)')
      .run(userJid, note, createdAt);
    return {
      id: Number(result.lastInsertRowid),
      userJid,
      note,
      createdAt,
    };
  }

  search(userJid: string, query: string): MemoryNote[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM memory_notes WHERE user_jid = ? AND note LIKE ? ORDER BY id DESC',
      )
      .all(userJid, `%${query}%`) as Array<{
      id: number;
      user_jid: string;
      note: string;
      created_at: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      userJid: r.user_jid,
      note: r.note,
      createdAt: r.created_at,
    }));
  }

  list(userJid: string): MemoryNote[] {
    const rows = this.db
      .prepare('SELECT * FROM memory_notes WHERE user_jid = ? ORDER BY id DESC')
      .all(userJid) as Array<{
      id: number;
      user_jid: string;
      note: string;
      created_at: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      userJid: r.user_jid,
      note: r.note,
      createdAt: r.created_at,
    }));
  }

  listAll(limit = 100): MemoryNote[] {
    const rows = this.db
      .prepare('SELECT * FROM memory_notes ORDER BY id DESC LIMIT ?')
      .all(limit) as Array<{
      id: number;
      user_jid: string;
      note: string;
      created_at: number;
    }>;
    return rows.map((r) => ({
      id: r.id,
      userJid: r.user_jid,
      note: r.note,
      createdAt: r.created_at,
    }));
  }

  delete(id: number): boolean {
    const result = this.db.prepare('DELETE FROM memory_notes WHERE id = ?').run(id);
    return result.changes > 0;
  }

  clear(userJid: string): number {
    const result = this.db.prepare('DELETE FROM memory_notes WHERE user_jid = ?').run(userJid);
    return result.changes;
  }
}

export interface Stores {
  users: SqliteUserStore;
  personas: SqlitePersonaStore;
  chats: SqliteChatStore;
  messages: SqliteMessageStore;
  approvals: SqliteApprovalStore;
  audit: SqliteAuditStore;
  settings: SqliteSettingsStore;
  memory: SqliteMemoryStore;
}

export function createStores(db: Db): Stores {
  return {
    users: new SqliteUserStore(db),
    personas: new SqlitePersonaStore(db),
    chats: new SqliteChatStore(db),
    messages: new SqliteMessageStore(db),
    approvals: new SqliteApprovalStore(db),
    audit: new SqliteAuditStore(db),
    settings: new SqliteSettingsStore(db),
    memory: new SqliteMemoryStore(db),
  };
}
