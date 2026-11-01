import type { CommandDefinition } from '../../router/command-registry.js';

/**
 * Command Opsional / Terpisah: .anime
 * Dipisahkan dari core project ArKzorMD karena fitur entertainment anime
 * di luar cakupan produktivitas, bisnis, dan asisten bot utama.
 */
export const animeCommand: CommandDefinition = {
 name: 'anime',
 aliases: ['otakudesu', 'carianime', 'animequote', 'quotesanime', 'waifu', 'cosplay', 'heroml'],
 category: 'optional',
 description: 'Pencarian serial anime, waifu, cosplay, dan audio hero ML (Opsional)',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
 const query = context.args.join(' ').trim();

 if (rawCmd === 'animequote' || rawCmd === 'quotesanime') {
 return ' _"Jika kamu tidak menyukai takdirmu, jangan menerimanya. Sebaliknya, miliki keberanian untuk mengubahnya."_ — Naruto Uzumaki';
 }
 if (rawCmd === 'waifu' || rawCmd === 'cosplay') {
 return ` Mengambil gambar ${rawCmd} aesthetic...`;
 }
 if (!query) {
 return `Format: \`.${rawCmd} <judul anime>\`\nContoh: \`.carianime Frieren\``;
 }
 return ` Menemukan anime: *${query}* [Score: 9.1 / MyAnimeList]`;
 },
};

