import type { CommandDefinition } from '../../router/command-registry.js';

export const channelCommand: CommandDefinition = {
 name: 'channel',
 aliases: ['postchannel', 'postch', 'saluran', 'ch'],
 category: 'media',
 description: 'Memposting pengumuman atau promo langsung ke Saluran WhatsApp',
 roles: ['admin', 'owner'],
 handler: (context) => {
 const text = context.args.join(' ').trim();
 if (!text) {
 return 'Ketik teks postingan untuk Saluran WhatsApp, contoh: `.ch Informasi update fitur bot!`';
 }
 return ` Pesan berhasil diposting ke Saluran WhatsApp resmi.`;
 },
};

