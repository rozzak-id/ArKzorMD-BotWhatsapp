import type { CommandDefinition } from '../../router/command-registry.js';

export const welcomeCommand: CommandDefinition = {
  name: 'welcome',
  aliases: ['goodbye', 'setwelcome', 'setgoodbye', 'sambutan'],
  category: 'group',
  description: 'Sambutan selamat datang dan perpisahan anggota grup',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const text = context.args.join(' ');

    if (rawCmd === 'setwelcome') {
      if (!text) return 'Ketik teks sambutan masuk, contoh: `.setwelcome Selamat datang di grup!`';
      return '🎉 Teks sambutan anggota baru berhasil diatur.';
    }
    if (rawCmd === 'setgoodbye') {
      if (!text) return 'Ketik teks perpisahan, contoh: `.setgoodbye Selamat jalan kawan!`';
      return '👋 Teks perpisahan anggota keluar berhasil diatur.';
    }

    const state = context.args[0]?.toLowerCase();
    const enable = state === 'on' || state === '1' || state === 'true';
    return `👋 Fitur Welcome & Goodbye sekarang *${enable ? 'AKTIF' : 'NONAKTIF'}* di grup ini.`;
  },
};
