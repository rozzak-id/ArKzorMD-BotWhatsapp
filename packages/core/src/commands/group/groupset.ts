import type { CommandDefinition } from '../../router/command-registry.js';

export const groupsetCommand: CommandDefinition = {
  name: 'groupset',
  aliases: [
    'buka',
    'tutup',
    'open',
    'close',
    'opengc',
    'closegc',
    'bukagc',
    'tutupgc',
    'mute',
    'unmute',
    'setgroup',
    'group',
  ],
  category: 'group',
  description: 'Mengatur izin kirim pesan grup (buka / tutup grup)',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const arg = context.args[0]?.toLowerCase();
    const isClose =
      ['tutup', 'close', 'closegc', 'tutupgc', 'mute'].includes(rawCmd ?? '') ||
      ['tutup', 'close', 'mute'].includes(arg ?? '');

    return isClose
      ? '🔒 *Grup Ditutup*. Hanya admin yang dapat mengirim pesan sekarang.'
      : '🔓 *Grup Dibuka*. Semua anggota sekarang dapat mengirim pesan.';
  },
};
