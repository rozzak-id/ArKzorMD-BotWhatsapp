import type { ApprovalRequest, ApprovalRule, ApprovalStatus, Role } from '../types.js';
import type { ApprovalStore } from '../stores.js';
import type { AuditLog } from '../audit/audit-log.js';
import { newId, now, shortCode } from '../utils/id.js';

export type ApprovalDecision = 'approve' | 'reject' | 'always';

export interface ApprovalEngineOptions {
  ttlMs?: number;
  /** Dibaca saat dibutuhkan supaya perubahan Owner langsung berlaku. */
  ownerJid?: () => string | null;
}

export interface CreateApprovalInput {
  requesterJid: string;
  requesterRole: Role;
  toolName: string;
  params: Record<string, unknown>;
  chatId: string;
}

export type DecisionHandler = (request: ApprovalRequest) => Promise<unknown> | unknown;

export interface DecideInput {
  shortCode: string;
  actorJid: string;
  decision: ApprovalDecision;
}

export interface DecideResult {
  ok: boolean;
  request?: ApprovalRequest;
  rule?: ApprovalRule;
  reason?: string;
  executionError?: string;
}

/**
 * Antrean approval Owner. Kode pendek sekali pakai, kedaluwarsa, aturan
 * "setuju selalu", dan eksekusi tool setelah disetujui.
 */
export class ApprovalEngine {
  /** Dipanggil saat request baru dibuat — dipakai Bot untuk mengirim DM Owner. */
  onRequest: ((request: ApprovalRequest) => void | Promise<void>) | null = null;

  private decisionHandler: DecisionHandler | null = null;
  private readonly ttlMs: number;

  constructor(
    private readonly store: ApprovalStore,
    private readonly audit: AuditLog,
    private readonly options: ApprovalEngineOptions = {},
  ) {
    this.ttlMs = options.ttlMs ?? 5 * 60_000;
  }

  setDecisionHandler(handler: DecisionHandler): void {
    this.decisionHandler = handler;
  }

  async create(input: CreateApprovalInput): Promise<ApprovalRequest> {
    const createdAt = now();
    let code = shortCode();
    for (let attempt = 0; attempt < 20 && this.store.getByShortCode(code); attempt += 1) {
      code = shortCode();
    }

    const request: ApprovalRequest = {
      id: newId(),
      shortCode: code,
      requesterJid: input.requesterJid,
      requesterRole: input.requesterRole,
      toolName: input.toolName,
      params: input.params,
      chatId: input.chatId,
      status: 'pending',
      createdAt,
      expiresAt: createdAt + this.ttlMs,
      decidedAt: null,
      decidedBy: null,
    };

    this.store.create(request);
    this.audit.record({
      actorJid: input.requesterJid,
      action: 'approval.requested',
      params: { tool: input.toolName, params: input.params, code: request.shortCode },
    });

    try {
      await this.onRequest?.(request);
    } catch {
      // Pengiriman notifikasi tidak boleh menggagalkan pembuatan request;
      // request tetap tampil di Web UI dan bisa diputuskan di sana.
    }

    return request;
  }

  async decide(input: DecideInput): Promise<DecideResult> {
    const owner = this.options.ownerJid?.() ?? null;
    if (!owner) {
      return { ok: false, reason: 'Owner belum ditetapkan. Selesaikan Setup Wizard dulu.' };
    }
    if (input.actorJid !== owner) {
      return { ok: false, reason: 'Hanya JID Owner yang sah yang boleh memutuskan approval.' };
    }

    const normalized = input.shortCode.trim().toUpperCase();
    const code = normalized.startsWith('#') ? normalized : `#${normalized}`;
    const request = this.store.getByShortCode(code);
    if (!request) {
      return { ok: false, reason: `Approval ${code} tidak ditemukan.` };
    }
    if (request.status !== 'pending') {
      return { ok: false, reason: `Approval ${code} sudah ${request.status}.` };
    }

    const decidedAt = now();
    if (request.expiresAt <= decidedAt) {
      this.store.updateStatus(request.id, 'expired', decidedAt, owner);
      this.audit.record({
        actorJid: owner,
        action: 'approval.expired',
        params: { code, tool: request.toolName },
      });
      return { ok: false, reason: `Approval ${code} sudah kedaluwarsa.` };
    }

    let status: ApprovalStatus;
    if (input.decision === 'reject') {
      status = 'rejected';
    } else {
      status = 'approved';
    }

    this.store.updateStatus(request.id, status, decidedAt, owner);
    this.audit.record({
      actorJid: owner,
      action: 'approval.decided',
      params: { code, tool: request.toolName, decision: input.decision },
    });

    let rule: ApprovalRule | undefined;
    if (input.decision === 'always') {
      rule = {
        id: newId(),
        toolName: request.toolName,
        target: extractTarget(request.params),
        expiresAt: null,
        createdAt: decidedAt,
      };
      this.store.createRule(rule);
      this.audit.record({
        actorJid: owner,
        action: 'approval.rule_created',
        params: { tool: rule.toolName, target: rule.target },
      });
    }

    let executionError: string | undefined;
    if (input.decision !== 'reject' && this.decisionHandler) {
      try {
        const output = await this.decisionHandler(request);
        this.audit.record({
          actorJid: owner,
          action: 'approval.executed',
          params: { code, tool: request.toolName },
          result: output,
        });
      } catch (error) {
        executionError = error instanceof Error ? error.message : String(error);
        this.audit.record({
          actorJid: owner,
          action: 'approval.execution_failed',
          params: { code, tool: request.toolName },
          result: { error: executionError },
        });
      }
    }

    const updated = this.store.get(request.id) ?? { ...request, status };
    return { ok: true, request: updated, ...(rule ? { rule } : {}), ...(executionError ? { executionError } : {}) };
  }

  /** Menandai request yang melewati TTL sebagai kedaluwarsa. */
  expireStale(): number {
    const count = this.store.expireStale(now());
    if (count > 0) {
      this.audit.record({ action: 'approval.sweep', result: { expired: count } });
    }
    return count;
  }

  pending(): ApprovalRequest[] {
    return this.store.listPending(now());
  }

  pendingCount(): number {
    return this.store.countPending();
  }

  history(limit = 50): ApprovalRequest[] {
    return this.store.list(limit);
  }

  rules(): ApprovalRule[] {
    return this.store.listRules();
  }

  revokeRule(id: string): boolean {
    const deleted = this.store.deleteRule(id);
    if (deleted) {
      this.audit.record({ action: 'approval.rule_revoked', params: { id } });
    }
    return deleted;
  }

  matchRule(toolName: string, target: string | null): boolean {
    return Boolean(this.store.findRule(toolName, target, now()));
  }
}

export function extractTarget(params: Record<string, unknown>): string | null {
  for (const key of ['to', 'target', 'jid', 'chatId']) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
