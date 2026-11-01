import type { CommandDefinition } from '../../router/command-registry.js';

export const sewaCommand: CommandDefinition = {
  name: 'sewa',
  aliases: ['ceksewa', 'sewabot', 'rent', 'sewainfo'],
  category: 'group',
  description: 'Menampilkan status dan sisa durasi masa aktif sewa bot di grup',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    return [
      '*⏳ STATUS SEWA BOT*',
      '• Status: *Aktif Permanen / Self-Host*',
      '• Masa Aktif: Unlimited',
      '',
      '_Bot ini di-host secara mandiri menggunakan arsitektur ArKzorMD._',
    ].join('\n');
  },
};
