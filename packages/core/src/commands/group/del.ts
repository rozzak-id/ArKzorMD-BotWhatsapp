import type { CommandDefinition } from '../../router/command-registry.js';

export const delCommand: CommandDefinition = {
  name: 'del',
  aliases: ['delete', 'd', 'hapus'],
  category: 'group',
  description: 'Menghapus pesan bot atau pesan anggota (Delete for Everyone)',
  roles: ['admin', 'owner'],
  handler: (context) => {
    return '🗑️ Permintaan hapus pesan diproses.';
  },
};
