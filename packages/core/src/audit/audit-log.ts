import type { AuditEntry } from '../types.js';
import type { AuditStore } from '../stores.js';
import { redact } from '../utils/redact.js';

export interface AuditInput {
  actorJid?: string | null;
  action: string;
  params?: unknown;
  result?: unknown;
}

/** Semua aksi penting harus lewat sini agar bisa diaudit Owner. */
export class AuditLog {
  constructor(private readonly store: AuditStore) {}

  record(input: AuditInput): void {
    this.store.append({
      actorJid: input.actorJid ?? null,
      action: input.action,
      params: redact(input.params),
      result: redact(input.result),
      createdAt: Date.now(),
    });
  }

  list(limit = 100): AuditEntry[] {
    return this.store.list(limit);
  }
}
