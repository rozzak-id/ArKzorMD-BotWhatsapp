import type { CommandDefinition } from '../../router/command-registry.js';

export const searchCommand: CommandDefinition = {
  name: 'search',
  aliases: [
    'gimage',
    'googleimage',
    'pinsearch',
    'caripin',
    'pinvid',
    'carispotify',
    'caritiktok',
    'ttsearch',
    'sfilesearch',
    'caribstation',
  ],
  category: 'media',
  description: 'Mesin pencarian konten multi-platform (Google Image, Pinterest, TikTok, Spotify)',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const query = context.args.join(' ').trim();
    if (!query) {
      return 'Sertakan kata kunci pencarian, contoh: `.pinsearch wallpaper anime aesthetic`';
    }
    return `🔍 Mencari konten untuk: *"${query}"*... Hasil akan segera dikirimkan.`;
  },
};
