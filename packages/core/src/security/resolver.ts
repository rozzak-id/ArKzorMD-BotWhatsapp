import type {
  RiskLevel,
  Role,
  ToolDefinition,
} from '../types.js';

export interface EffectiveLevelResult {
  level: RiskLevel;
  reason: string;
}

export interface ResolverContext {
  currentChatId: string;
  senderId: string;
  role: Role;
  maxRecipients?: number;
  botJid?: string | null;
  /** Menentukan apakah messageId merupakan pesan bot sendiri */
  isBotMessage?: (messageId: string) => boolean;
}

export interface DecideContext extends ResolverContext {
  isKillSwitchOn: () => boolean;
  hasRule?: (toolName: string, target: string | null) => boolean;
  /** Apakah konfirmasi satu ketuk Owner dimatikan untuk tool ini (hanya jika tool.relaxable = true) */
  isOwnerConfirmationDisabled?: (toolName: string) => boolean;
}

export type PermissionDecisionOutcome = 'allow' | 'pending_approval' | 'denied';

export interface PermissionDecisionResult {
  outcome: PermissionDecisionOutcome;
  /** Alias outcome */
  decision: PermissionDecisionOutcome;
  effectiveLevel: RiskLevel;
  reason: string;
}

const ROLE_RANK: Record<Role, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function isRoleAllowed(role: Role, minRole: Role): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minRole] ?? 99);
}

export function allowedRolesForMinRole(minRole: Role): Role[] {
  if (minRole === 'member') return ['owner', 'admin', 'member'];
  if (minRole === 'admin') return ['owner', 'admin'];
  return ['owner'];
}

export function normalizeChatTarget(input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (value.includes('@')) return value;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return `${digits}@s.whatsapp.net`;
}

export function extractPrimaryTarget(params: Record<string, unknown>): string | null {
  for (const key of ['to', 'target', 'jid', 'chatId', 'groupId', 'channelId']) {
    const val = params[key];
    if (typeof val === 'string' && val.trim()) {
      return normalizeChatTarget(val);
    }
  }
  return null;
}

export function getRecipientsCount(params: Record<string, unknown>): number {
  for (const key of ['recipients', 'participants', 'numbers', 'jids']) {
    const val = params[key];
    if (Array.isArray(val)) {
      return val.length;
    }
  }

  const toVal = params.to;
  if (Array.isArray(toVal)) {
    return toVal.length;
  }
  if (typeof toVal === 'string' && toVal.includes(',')) {
    return toVal.split(',').filter((s) => s.trim().length > 0).length;
  }
  if (typeof toVal === 'string' && toVal.trim().length > 0) {
    return 1;
  }
  return 0;
}

/**
 * Fungsi murni penentu level efektif aksi sesuai Bagian 3 docs/agent-prompt-and-tools.md:
 * - Aksi pada chat berjalan -> L0
 * - Aksi ke chat/kontak/grup lain -> L1
 * - Aksi pada akun bot -> L1
 * - Aksi menimpa milik orang lain -> L1
 * - Membaca chat lain, daftar chat, daftar kontak -> L1 (hanya Owner)
 * - Penerima banyak (> maxRecipients, default 20) -> L1
 * - Mengubah izin, config, secret, kode -> L2 (terkunci)
 */
export function resolveEffectiveLevel(
  tool: ToolDefinition,
  params: Record<string, unknown>,
  context: ResolverContext,
): EffectiveLevelResult {
  // 1. Aksi L2 / Kategori K (terkunci)
  if (
    tool.baseLevel === 'L2' ||
    tool.name.startsWith('admin.') ||
    tool.name === 'bot.unpanic' ||
    tool.name === 'update_profile'
  ) {
    return {
      level: 'L2',
      reason: 'Aksi L2 terkunci dan hanya dapat dilakukan lewat Web UI oleh Owner.',
    };
  }

  const maxRecipients = context.maxRecipients ?? 20;
  const count = getRecipientsCount(params);

  // 2. Penerima banyak (lebih dari 20, bisa diatur) -> L1
  if (count > maxRecipients) {
    return {
      level: 'L1',
      reason: `Jumlah penerima (${count}) melebihi batas maksimal ${maxRecipients}.`,
    };
  }

  // 3. Membaca chat lain, daftar chat, daftar kontak
  if (tool.name === 'wa.read_chat' || tool.name === 'wa.search_messages') {
    const targetChat = params.chatId ? normalizeChatTarget(String(params.chatId)) : null;
    const currentNorm = normalizeChatTarget(context.currentChatId);
    if (targetChat && targetChat !== currentNorm) {
      return {
        level: 'L1',
        reason: 'Membaca chat lain hanya diizinkan untuk Owner (L1).',
      };
    }
  }

  if (tool.name === 'wa.list_chats' || tool.name === 'wa.list_contacts' || tool.name === 'wa.view_status') {
    return {
      level: 'L1',
      reason: 'Membaca daftar chat atau kontak akun memerlukan izin Owner (L1).',
    };
  }

  // 4. Aksi yang menimpa milik orang lain
  if (tool.name === 'wa.delete_message') {
    const isBot = context.isBotMessage?.(String(params.messageId ?? '')) ?? false;
    const forEveryone = Boolean(params.forEveryone);
    if (!isBot || forEveryone) {
      return {
        level: 'L1',
        reason: 'Menghapus pesan orang lain atau untuk semua orang memerlukan persetujuan Owner (L1).',
      };
    }
  }

  if (
    tool.name === 'wa.group_remove' ||
    tool.name === 'wa.group_promote' ||
    tool.name === 'wa.group_demote'
  ) {
    return {
      level: 'L1',
      reason: 'Aksi menimpa status anggota grup (kick/promote/demote) memerlukan persetujuan Owner (L1).',
    };
  }

  // 5. Aksi pada akun bot (profil, privasi, status, chat management)
  if (
    tool.category === 'profile_privacy' ||
    tool.category === 'chat_management' ||
    tool.name.startsWith('wa.set_profile_') ||
    tool.name.startsWith('wa.set_about') ||
    tool.name.startsWith('wa.chat_') ||
    tool.name === 'wa.post_status' ||
    tool.name === 'wa.delete_status' ||
    tool.name === 'wa.update_privacy'
  ) {
    return {
      level: 'L1',
      reason: 'Aksi pada akun bot atau manajemen chat memerlukan persetujuan Owner (L1).',
    };
  }

  // 6. Aksi ke chat, kontak, atau grup lain
  const hasChatTarget =
    tool.category === 'message_media' ||
    tool.category === 'channel_broadcast' ||
    tool.category === 'group_community' ||
    tool.name.startsWith('wa.send_') ||
    tool.name === 'send_message' ||
    tool.name === 'wa.forward' ||
    tool.name === 'util.reminder';

  if (hasChatTarget) {
    const target = extractPrimaryTarget(params);
    const currentChatNormalized = normalizeChatTarget(context.currentChatId);
    if (target && target !== currentChatNormalized) {
      return {
        level: 'L1',
        reason: 'Aksi ke chat, kontak, atau grup lain memerlukan persetujuan Owner (L1).',
      };
    }
  }

  // 7. Aksi pada chat yang sedang berlangsung (balas, react, kirim teks/media tanpa to)
  const target = extractPrimaryTarget(params);
  const currentChatNormalized = normalizeChatTarget(context.currentChatId);
  const isTargetingCurrentOrEmpty = !target || target === currentChatNormalized;

  if (
    isTargetingCurrentOrEmpty &&
    (tool.name === 'wa.reply' ||
      tool.name === 'wa.react' ||
      tool.name === 'wa.edit_message' ||
      tool.category === 'memory' ||
      (tool.category === 'web_utility' && !tool.name.startsWith('wa.')) ||
      tool.name === 'bot.status' ||
      tool.name === 'bot.panic')
  ) {
    return {
      level: 'L0',
      reason: 'Aksi pada chat yang sedang berlangsung (L0).',
    };
  }

  // 8. Evaluasi scopeRules
  if (tool.scopeRules && tool.scopeRules.length > 0) {
    for (const rule of tool.scopeRules) {
      if (rule.when.toLowerCase().includes('chat ini') && (!target || target === currentChatNormalized)) {
        return {
          level: rule.level,
          reason: `Aturan scope cocok: ${rule.when}`,
        };
      }
    }
  }

  // Default: baseLevel tool
  return {
    level: tool.baseLevel,
    reason: `Level dasar ${tool.baseLevel} untuk tool ${tool.name}.`,
  };
}

/**
 * Keputusan izin murni sesuai Bagian 3 docs/agent-prompt-and-tools.md:
 * - Member pada L1 = denied
 * - Admin pada L1 = pending_approval
 * - Owner pada L1 = konfirmasi satu ketuk (pending_approval, bisa dimatikan bila relaxable)
 * - L2 = denied
 * - L0 = allow
 * - Kill switch aktif = denied untuk L1
 * - Rule setuju selalu = allow
 */
export function decide(
  tool: ToolDefinition | undefined,
  params: Record<string, unknown>,
  context: DecideContext,
): PermissionDecisionResult {
  if (!tool) {
    return {
      outcome: 'denied',
      decision: 'denied',
      effectiveLevel: 'L0',
      reason: 'Tool tidak dikenal (unknown_tool).',
    };
  }

  const effective = resolveEffectiveLevel(tool, params, context);

  // Aksi L2 selalu ditolak untuk AI
  if (effective.level === 'L2') {
    return {
      outcome: 'denied',
      decision: 'denied',
      effectiveLevel: 'L2',
      reason: effective.reason,
    };
  }

  // Pengecekan role minimum
  if (!isRoleAllowed(context.role, tool.minRole)) {
    return {
      outcome: 'denied',
      decision: 'denied',
      effectiveLevel: effective.level,
      reason: `Role ${context.role} tidak diizinkan memakai tool ${tool.name} (minimum ${tool.minRole}).`,
    };
  }

  // Membaca chat lain hanya diizinkan untuk Owner
  if (
    (tool.name === 'wa.read_chat' || tool.name === 'wa.search_messages') &&
    params.chatId &&
    normalizeChatTarget(String(params.chatId)) !== normalizeChatTarget(context.currentChatId) &&
    context.role !== 'owner'
  ) {
    return {
      outcome: 'denied',
      decision: 'denied',
      effectiveLevel: 'L1',
      reason: 'Membaca chat lain hanya diizinkan untuk Owner.',
    };
  }

  if (
    (tool.name === 'wa.list_chats' || tool.name === 'wa.list_contacts' || tool.name === 'wa.view_status') &&
    context.role !== 'owner'
  ) {
    return {
      outcome: 'denied',
      decision: 'denied',
      effectiveLevel: 'L1',
      reason: `Tool ${tool.name} hanya diizinkan untuk Owner.`,
    };
  }

  // L0 bebas dijalankan
  if (effective.level === 'L0') {
    return {
      outcome: 'allow',
      decision: 'allow',
      effectiveLevel: 'L0',
      reason: effective.reason,
    };
  }

  // Aksi L1:
  // 1. Periksa kill switch
  if (context.isKillSwitchOn()) {
    return {
      outcome: 'denied',
      decision: 'denied',
      effectiveLevel: 'L1',
      reason: 'Kill switch aktif: semua aksi L1 dinonaktifkan.',
    };
  }

  // 2. Periksa aturan setuju selalu
  const target = extractPrimaryTarget(params);
  if (context.hasRule?.(tool.name, target)) {
    return {
      outcome: 'allow',
      decision: 'allow',
      effectiveLevel: 'L1',
      reason: 'Cocok dengan aturan setuju selalu yang tersimpan.',
    };
  }

  // 3. Evaluasi per role untuk L1
  if (context.role === 'member') {
    return {
      outcome: 'denied',
      decision: 'denied',
      effectiveLevel: 'L1',
      reason: 'Member tidak diizinkan melakukan aksi L1.',
    };
  }

  if (context.role === 'admin') {
    return {
      outcome: 'pending_approval',
      decision: 'pending_approval',
      effectiveLevel: 'L1',
      reason: 'Aksi L1 oleh Admin memerlukan persetujuan Owner.',
    };
  }

  if (context.role === 'owner') {
    if (tool.relaxable && context.isOwnerConfirmationDisabled?.(tool.name)) {
      return {
        outcome: 'allow',
        decision: 'allow',
        effectiveLevel: 'L1',
        reason: `Konfirmasi Owner untuk tool ${tool.name} dinonaktifkan.`,
      };
    }
    return {
      outcome: 'pending_approval',
      decision: 'pending_approval',
      effectiveLevel: 'L1',
      reason: 'Owner memerlukan konfirmasi satu ketuk untuk aksi L1.',
    };
  }

  return {
    outcome: 'denied',
    decision: 'denied',
    effectiveLevel: 'L1',
    reason: `Role ${context.role} tidak dikenali.`,
  };
}
