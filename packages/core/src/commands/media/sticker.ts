import type { CommandDefinition } from '../../router/command-registry.js';

export const stickerCommand: CommandDefinition = {
 name: 'sticker',
 aliases: ['s', 'stiker', 'sgif', 'wm', 'take'],
 category: 'media',
 description: 'Mengonversi foto, video pendek, atau GIF menjadi stiker WhatsApp',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 return ' Konversi stiker WhatsApp sedang diproses...';
 },
};

