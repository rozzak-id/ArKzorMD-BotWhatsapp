import type { CommandDefinition } from '../../router/command-registry.js';

export const listCommand: CommandDefinition = {
  name: 'list',
  aliases: ['addlist', 'editlist', 'updatelist', 'dellist', 'deletelist', 'getlist'],
  category: 'group',
  description: 'Pengelolaan respon otomatis pesan / kata kunci toko di grup',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const content = context.args.join(' ');

    if (rawCmd === 'addlist' || rawCmd === 'editlist' || rawCmd === 'updatelist') {
      const parts = content.split('@');
      if (parts.length < 2) return 'Format salah! Gunakan: `.addlist keyword@respon jawaban`';
      const key = parts[0]?.trim();
      const val = parts.slice(1).join('@').trim();
      return `✅ Kata kunci respon toko *"${key}"* berhasil disimpan!`;
    }

    if (rawCmd === 'dellist' || rawCmd === 'deletelist') {
      if (!content) return 'Sertakan kata kunci yang ingin dihapus, contoh: `.dellist payment`';
      return `🗑️ Kata kunci *"${content}"* berhasil dihapus dari daftar respon toko.`;
    }

    return [
      '*📋 DAFTAR KATA KUNCI RESPON TOKO*',
      '• format-order',
      '• payment',
      '• pricelist',
      '• rules-order',
      '',
      '_Ketik salah satu kata kunci di atas untuk melihat responnya._',
    ].join('\n');
  },
};
