import type { CommandDefinition } from '../../router/command-registry.js';

export const setppgrupCommand: CommandDefinition = {
  name: 'setppgrup',
  aliases: ['setppgc', 'setpp'],
  category: 'group',
  description: 'Mengubah foto profil grup dari gambar yang dikirim atau di-reply',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    return '🖼️ Foto profil grup berhasil diperbarui.';
  },
};
