import type { CommandDefinition } from '../../router/command-registry.js';

export const statusCommand: CommandDefinition = {
  name: 'status',
  category: 'core',
  description: 'Status bot, koneksi WhatsApp, dan kuota',
  roles: ['owner', 'admin', 'member'],
  handler: (context) => {
    const status = context.services.getStatus();
    const minutes = Math.floor(status.uptimeSec / 60);
    return [
      '*Status ArKzorMD*',
      `• Platform: ${context.services.adapter.id} (${status.platformStatus})`,
      `• AI provider: ${status.aiProvider}`,
      `• Uptime: ${minutes} menit`,
      `• Approval menunggu: ${status.pendingApprovals}`,
      `• Kill switch: ${status.killSwitch ? 'AKTIF' : 'nonaktif'}`,
    ].join('\n');
  },
};
