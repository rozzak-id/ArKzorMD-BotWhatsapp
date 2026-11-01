import type { CommandDefinition } from '../../router/command-registry.js';

export const totagCommand: CommandDefinition = {
  name: 'totag',
  aliases: ['qtag', 'tagpesan'],
  category: 'group',
  description: 'Meneruskan pesan yang di-reply sambil me-mention semua anggota grup',
  roles: ['admin', 'owner'],
  handler: (context) => {
    if (!context.message.isGroup) {
      return '⚠️ Perintah ini hanya dapat digunakan di dalam grup.';
    }
    return '📢 Pesan diteruskan dengan mention seluruh anggota grup.';
  },
};

