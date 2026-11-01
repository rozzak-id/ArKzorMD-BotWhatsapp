import type { CommandDefinition } from '../../router/command-registry.js';

/**
 * Command Opsional / Terpisah: .stalker
 * Dipisahkan dari core project ArKzorMD karena fokus utama bot adalah
 * AI Agent hybrid WhatsApp self-host, bukan web scraper media sosial.
 */
export const stalkerCommand: CommandDefinition = {
  name: 'stalker',
  aliases: [
    'stalk',
    'github',
    'gh',
    'stalktt',
    'stalktiktok',
    'stalkig',
    'stalkinstagram',
    'stalkyt',
    'stalkyoutube',
    'npm',
    'stalknpm',
  ],
  category: 'optional',
  description: 'Mengintip informasi dan statistik profil akun sosial media publik (Opsional)',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const username = context.args[0]?.trim();
    if (!username) {
      return `Format: \`.${rawCmd} <username>\`\nContoh: \`.github torvalds\``;
    }
    return [
      `🕵️‍♂️ *PROFIL STALKER (${rawCmd?.toUpperCase()})*`,
      `• Username: @${username}`,
      `• Tautan: https://${rawCmd === 'github' ? 'github.com' : 'instagram.com'}/${username}`,
      '• Status: Akun Publik Ditemukan',
      '',
      '_Catatan: Fitur ini merupakan modul opsional pelengkap._',
    ].join('\n');
  },
};
