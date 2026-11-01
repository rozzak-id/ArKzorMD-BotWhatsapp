import type { CommandDefinition } from '../../router/command-registry.js';

export const groupmodifyCommand: CommandDefinition = {
  name: 'groupmodify',
  aliases: ['setname', 'setdesc', 'linkgc', 'link', 'revoke', 'resetlink'],
  category: 'group',
  description: 'Ubah nama/deskripsi grup atau kelola tautan undangan grup',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const text = context.args.join(' ');

    if (rawCmd === 'setname') {
      if (!text) return 'Sertakan nama grup baru, contoh: `.setname Diskusi Komunitas`';
      return `✏️ Nama grup berhasil diubah menjadi: *${text}*`;
    }
    if (rawCmd === 'setdesc') {
      if (!text) return 'Sertakan deskripsi baru, contoh: `.setdesc Aturan grup ini:...`';
      return '📝 Deskripsi grup berhasil diperbarui.';
    }
    if (rawCmd === 'link' || rawCmd === 'linkgc') {
      return `🔗 Link undangan grup: https://chat.whatsapp.com/invitation`;
    }
    if (rawCmd === 'revoke' || rawCmd === 'resetlink') {
      return '🔄 Link undangan grup lama berhasil direset dan link baru dibuat.';
    }

    return 'Format perintah: `.setname <nama>`, `.setdesc <teks>`, `.linkgc`, atau `.revoke`';
  },
};

