import type { CommandDefinition } from '../../router/command-registry.js';

/**
 * Command Terpisah & Dibatasi: .nsfw
 * Sesuai kebijakan keamanan ArKzorMD dan ketentuan layanan WhatsApp,
 * konten dewasa / NSFW secara default ditolak dan dinonaktifkan.
 */
export const nsfwCommand: CommandDefinition = {
 name: 'nsfw',
 aliases: ['bokep', 'hentai', '18+'],
 category: 'optional',
 description: 'Perintah konten dewasa (Ditolak / Dinonaktifkan sesuai kebijakan bot)',
 roles: ['owner'],
 handler: () => {
 return ' *Akses Ditolak*. Bot ArKzorMD melarang keras konten pornografi, SARA, dan NSFW sesuai standar kepatuhan WhatsApp dan etika AI.';
 },
};

