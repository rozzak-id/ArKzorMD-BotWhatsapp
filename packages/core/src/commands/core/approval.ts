import type { CommandContext, CommandDefinition } from '../../router/command-registry.js';
import type { ApprovalDecision } from '../../security/approval-engine.js';

async function decideApprovalCommand(
  context: CommandContext,
  decision: ApprovalDecision,
): Promise<string> {
  const code = context.args[0]?.trim();
  if (!code) {
    const pending = context.services.getStatus().pendingApprovals;
    return (
      'Sertakan kode approval, misalnya `.approve #A7F3`.\n' +
      `Approval menunggu: ${pending}. Daftar lengkap ada di Web UI > Persetujuan.`
    );
  }

  const result = await context.services.decideApproval({
    shortCode: code,
    actorJid: context.message.senderId,
    decision,
  });

  if (!result.ok) return `⚠️ ${result.reason ?? 'Approval tidak dapat diputuskan.'}`;

  const normalizedCode = result.request?.shortCode ?? code.toUpperCase();
  if (decision === 'reject') {
    return `🚫 Approval ${normalizedCode} ditolak. Aksi tidak dijalankan.`;
  }
  if (result.executionError) {
    return (
      `⚠️ Approval ${normalizedCode} disetujui, tetapi eksekusi gagal: ` +
      `${result.executionError}`
    );
  }
  if (decision === 'always') {
    return (
      `✅ Approval ${normalizedCode} disetujui dan dijalankan. ` +
      'Aturan "selalu izinkan" untuk aksi serupa sudah disimpan.'
    );
  }
  return `✅ Approval ${normalizedCode} disetujui dan dijalankan.`;
}

export const approveCommand: CommandDefinition = {
  name: 'approve',
  category: 'core',
  description: 'Setujui aksi tertunda dengan kode (Owner)',
  roles: ['owner'],
  handler: (context) => decideApprovalCommand(context, 'approve'),
};

export const rejectCommand: CommandDefinition = {
  name: 'reject',
  category: 'core',
  description: 'Tolak aksi tertunda dengan kode (Owner)',
  roles: ['owner'],
  handler: (context) => decideApprovalCommand(context, 'reject'),
};

export const alwaysCommand: CommandDefinition = {
  name: 'always',
  category: 'core',
  description: 'Setujui dan selalu izinkan aksi serupa (Owner)',
  roles: ['owner'],
  handler: (context) => decideApprovalCommand(context, 'always'),
};
