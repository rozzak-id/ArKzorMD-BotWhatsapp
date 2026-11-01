import type { CommandDefinition } from '../../router/command-registry.js';

export const smemeCommand: CommandDefinition = {
  name: 'smeme',
  aliases: ['stickermeme', 'stikermeme', 'smim'],
  category: 'media',
  description: 'Membuat stiker meme dengan teks atas dan bawah (format: teks_atas | teks_bawah)',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const text = context.args.join(' ');
    if (!text) {
      return 'Kirim atau reply gambar lalu ketik: `.smeme teks atas | teks bawah`';
    }
    return `🎭 Membuat stiker meme dengan teks: "${text}"...`;
  },
};
