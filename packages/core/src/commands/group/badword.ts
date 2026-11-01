import type { CommandDefinition } from '../../router/command-registry.js';

export const badwordCommand: CommandDefinition = {
  name: 'badword',
  aliases: ['toxic', 'katakasr', 'badwords'],
  category: 'group',
  description: 'Filter dan sensor otomatis kata-kata kotor/kasar di grup',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const sub = context.args[0]?.toLowerCase();
    const word = context.args.slice(1).join(' ').trim();

    if (sub === 'add') {
      if (!word) return 'Sertakan kata yang ingin ditambahkan ke blacklist.';
      return `🚫 Kata *"${word}"* berhasil ditambahkan ke daftar terlarang.`;
    }
    if (sub === 'del' || sub === 'delete') {
      if (!word) return 'Sertakan kata yang ingin dihapus dari blacklist.';
      return `✅ Kata *"${word}"* dihapus dari daftar terlarang.`;
    }

    const enable = sub === 'on' || sub === '1' || sub === 'true';
    return `🤬 Filter Badword sensor kata kasar sekarang *${enable ? 'AKTIF' : 'NONAKTIF'}*.`;
  },
};
