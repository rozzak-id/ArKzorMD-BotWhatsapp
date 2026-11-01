import type { CommandDefinition } from '../../router/command-registry.js';

export const makerCommand: CommandDefinition = {
  name: 'maker',
  aliases: [
    'bratvid',
    'emojimix',
    'mixemoji',
    'removebg',
    'nobg',
    'jadianime',
    'toanime',
    'toghibli',
    'ghibli',
    'tohitam',
    'tozombie',
    'upscale',
    'remini',
    'hd',
  ],
  category: 'media',
  description: 'Pengolah foto kreatif (hapus background, filter foto, upscale HD, dan emojimix)',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    return `🎨 Permintaan foto efek *${rawCmd}* sedang diproses...`;
  },
};

