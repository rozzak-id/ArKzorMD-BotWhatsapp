import type { CommandDefinition } from '../../router/command-registry.js';

export const warnCommand: CommandDefinition = {
  name: 'warn',
  aliases: ['unwarn', 'cekwarn', 'resetwarn', 'peringatan'],
  category: 'group',
  description: 'Memberikan strike peringatan (3x peringatan akan otomatis di-kick)',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const user = context.args[0] || '@user';

    if (rawCmd === 'unwarn') {
      return `🕊️ Poin peringatan untuk ${user} telah dikurangi.`;
    }
    if (rawCmd === 'cekwarn') {
      return `⚠️ Peringatan ${user}: *1/3 strike*. Jika mencapai 3x akan otomatis dikeluarkan.`;
    }
    if (rawCmd === 'resetwarn') {
      return `🔄 Poin peringatan untuk ${user} telah direset ke 0.`;
    }

    const reason = context.args.slice(1).join(' ') || 'Melanggar aturan grup';
    return `⚠️ *PERINGATAN RESMI*\n\nTarget: ${user}\nAlasan: ${reason}\nTotal strike: *1/3*\n_Hati-hati! 3x peringatan akan dikeluarkan otomatis._`;
  },
};
