import type { CommandDefinition } from '../../router/command-registry.js';

export const autogroupCommand: CommandDefinition = {
  name: 'autogroup',
  aliases: ['autogc', 'setopengc', 'setclosegc', 'jadwalgrup'],
  category: 'group',
  description: 'Mengatur jadwal buka dan tutup grup otomatis harian',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const arg = context.args[0];

    if (rawCmd === 'setopengc' || (rawCmd === 'autogc' && context.args[0] === 'open')) {
      const jam = rawCmd === 'setopengc' ? arg : context.args[1];
      return `⏰ Jam buka grup otomatis diatur ke: *${jam ?? '06:00'} WIB*`;
    }
    if (rawCmd === 'setclosegc' || (rawCmd === 'autogc' && context.args[0] === 'close')) {
      const jam = rawCmd === 'setclosegc' ? arg : context.args[1];
      return `⏰ Jam tutup grup otomatis diatur ke: *${jam ?? '22:00'} WIB*`;
    }

    const state = arg?.toLowerCase();
    const enable = state === 'on' || state === '1' || state === 'true';
    return `🕒 Jadwal buka/tutup grup otomatis sekarang *${enable ? 'AKTIF' : 'NONAKTIF'}*.`;
  },
};

