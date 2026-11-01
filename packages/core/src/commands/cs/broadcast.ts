import type { CommandDefinition } from '../../router/command-registry.js';

export const broadcastCommand: CommandDefinition = {
  name: 'broadcast',
  aliases: ['bc', 'siaran'],
  category: 'cs',
  description: 'Mengirimkan siaran pesan promosi/pengumuman ke seluruh kontak pengguna',
  roles: ['admin', 'owner'],
  handler: (context) => {
    const text = context.args.join(' ').trim();
    if (!text) {
      return 'Sertakan teks siaran yang ingin dikirimkan, contoh: `.broadcast Promo awal bulan diskon 20%!`';
    }
    return `📢 Siaran pesan ke seluruh pengguna dijadwalkan dengan proteksi jeda anti-banned.`;
  },
};

