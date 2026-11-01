import type { CommandDefinition } from '../../router/command-registry.js';

export const hidetagCommand: CommandDefinition = {
  name: 'hidetag',
  aliases: ['ht', 'h'],
  category: 'group',
  description: 'Mengirim pesan teks/media dengan mention tersembunyi ke semua anggota grup',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const text = context.args.join(' ');
    if (!text && context.message.media.length === 0) {
      return 'Ketik teks yang ingin di-hidetag, contoh: `.hidetag Pengumuman penting!`';
    }
    return `📢 *PENGUMUMAN*\n\n${text || '[Media Lampiran]'}`;
  },
};

