import type { CommandDefinition } from '../../router/command-registry.js';

export const antilinkCommand: CommandDefinition = {
  name: 'antilink',
  aliases: ['antilinkgroup', 'protectlink'],
  category: 'group',
  description: 'Otomatis menghapus pesan dan menindak penyebar link grup WhatsApp lain',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const state = context.args[0]?.toLowerCase();
    const enable = state === 'on' || state === '1' || state === 'true';
    return `🛡️ Fitur Anti-Link Grup WhatsApp sekarang *${enable ? 'AKTIF' : 'NONAKTIF'}* di grup ini.`;
  },
};

