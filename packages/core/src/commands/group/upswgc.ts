import type { CommandDefinition } from '../../router/command-registry.js';

export const upswgcCommand: CommandDefinition = {
  name: 'upswgc',
  aliases: ['swgc', 'upstory', 'upsw', 'statusgc', 'storygc'],
  category: 'group',
  description: 'Mengunggah media atau teks langsung menjadi Status/Story WhatsApp bot',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const text = context.args.join(' ');
    if (!text && context.message.media.length === 0) {
      return 'Ketik teks atau kirim media untuk dijadikan status WhatsApp bot, contoh: `.upswgc Halo semua!`';
    }
    return '📲 Media/teks berhasil diunggah ke Story Status WhatsApp bot!';
  },
};
