import type { CommandDefinition } from '../../router/command-registry.js';

export const toimgCommand: CommandDefinition = {
  name: 'toimg',
  aliases: ['toimage', 'topng', 'tojpg'],
  category: 'media',
  description: 'Mengonversi stiker WhatsApp biasa menjadi file gambar (PNG/JPG)',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    return '🖼️ Mengonversi stiker menjadi gambar...';
  },
};

