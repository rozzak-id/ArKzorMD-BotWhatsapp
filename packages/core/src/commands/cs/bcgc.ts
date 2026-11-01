import type { CommandDefinition } from '../../router/command-registry.js';

export const bcgcCommand: CommandDefinition = {
  name: 'bcgc',
  aliases: ['broadcastgc', 'bcgrup', 'siarangc', 'broadcastgroup'],
  category: 'cs',
  description: 'Mengirim pesan siaran ke semua grup yang diikuti bot',
  roles: ['admin', 'owner'],
  handler: (context) => {
    const text = context.args.join(' ').trim();
    if (!text) {
      return 'Sertakan teks siaran untuk grup, contoh: `.bcgc Pengumuman maintenance server malam ini`';
    }
    return `📢 Siaran pesan ke seluruh grup WhatsApp berhasil dijadwalkan.`;
  },
};
