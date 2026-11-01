import type { CommandDefinition } from '../../router/command-registry.js';

export const ownerCommand: CommandDefinition = {
  name: 'owner',
  aliases: ['creator', 'developer', 'pemilik', 'dev'],
  category: 'core',
  description: 'Informasi dan kontak WhatsApp Owner resmi',
  roles: ['owner', 'admin', 'member'],
  handler: (context) => {
    const ownerJid = context.services.config?.ownerJid ?? 'Belum disetup';
    const cleanNumber = ownerJid.split('@')[0];
    return [
      '*👑 Kontak Owner ArKzorMD*',
      `• Nomor: +${cleanNumber}`,
      `• Chat: https://wa.me/${cleanNumber}`,
      '',
      '_Hubungi Owner untuk urusan penting, sewa bot, atau perizinan khusus._',
    ].join('\n');
  },
};
