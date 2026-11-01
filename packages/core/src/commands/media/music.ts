import type { CommandDefinition } from '../../router/command-registry.js';

export const musicCommand: CommandDefinition = {
  name: 'music',
  aliases: ['play', 'song', 'playmusic', 'carilagu', 'lirik', 'lyrics'],
  category: 'media',
  description: 'Mencari lagu, memutar file audio, dan menampilkan lirik lagu',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const query = context.args.join(' ').trim();
    if (!query) {
      return 'Sertakan judul lagu yang ingin dicari, contoh: `.play Hindia Evaluasi`';
    }
    return `🎵 Sedang mencari lagu: *"${query}"*...\nAudio akan segera dikirimkan.`;
  },
};
