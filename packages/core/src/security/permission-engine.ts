import type { Role, ToolSchema } from '../types.js';

export type PermissionOutcome = 'allow' | 'approval' | 'deny';

export interface PermissionDecision {
  outcome: PermissionOutcome;
  risk: ToolSchema['risk'];
  reason: string;
}

export interface PermissionInput {
  role: Role;
  tool: Pick<ToolSchema, 'name' | 'risk' | 'allowedRoles'>;
  target?: string | null;
}

export interface PermissionEngineOptions {
  /** Kill switch global: mematikan semua aksi L1. */
  isKillSwitchOn: () => boolean;
  /** Aturan "setuju selalu" yang tersimpan. */
  hasRule?: (toolName: string, target: string | null) => boolean;
}

/**
 * Satu-satunya pemutus izin. AI tidak dapat mengubah hasil evaluasi ini
 * karena keputusan diambil dari role, level risiko, dan aturan kode.
 */
export class PermissionEngine {
  constructor(private readonly options: PermissionEngineOptions) {}

  evaluate(input: PermissionInput): PermissionDecision {
    const { role, tool } = input;
    const target = input.target ?? null;

    // L2 tidak pernah boleh dieksekusi oleh AI, termasuk oleh Owner.
    if (tool.risk === 'L2') {
      return {
        outcome: 'deny',
        risk: tool.risk,
        reason: 'Aksi L2 hanya dapat dilakukan lewat Web UI oleh Owner.',
      };
    }

    if (!tool.allowedRoles.includes(role)) {
      return {
        outcome: 'deny',
        risk: tool.risk,
        reason: `Role ${role} tidak diizinkan memakai tool ${tool.name}.`,
      };
    }

    if (tool.risk === 'L0') {
      return {
        outcome: 'allow',
        risk: tool.risk,
        reason: 'Aksi bebas (L0) di chat berjalan.',
      };
    }

    if (this.options.isKillSwitchOn()) {
      return {
        outcome: 'deny',
        risk: tool.risk,
        reason: 'Kill switch aktif: semua aksi L1 dinonaktifkan.',
      };
    }

    if (role === 'member') {
      return {
        outcome: 'deny',
        risk: tool.risk,
        reason: 'Member tidak diizinkan melakukan aksi L1.',
      };
    }

    if (this.options.hasRule?.(tool.name, target)) {
      return {
        outcome: 'allow',
        risk: tool.risk,
        reason: 'Cocok dengan aturan "setuju selalu" yang tersimpan.',
      };
    }

    return {
      outcome: 'approval',
      risk: tool.risk,
      reason:
        role === 'owner'
          ? 'Owner perlu konfirmasi satu ketuk untuk aksi L1.'
          : 'Aksi L1 perlu persetujuan Owner.',
    };
  }
}
