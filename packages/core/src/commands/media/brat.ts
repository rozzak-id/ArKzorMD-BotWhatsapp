import type { CommandDefinition } from '../../router/command-registry.js';

export const bratCommand: CommandDefinition = {
  name: 'brat',
  aliases: ['bratgenerator', 'bratstik'],
  category: 'media',
  description: 'Membuat stiker teks dengan tipografi hijau khas album viral Brat Charli XCX',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const text = context.args.join(' ').trim();
    if (!text) {
      return 'Ketik teks yang ingin dijadikan stiker brat, contoh: `.brat kamu nanya`';
    }
    return `Membuat stiker Brat untuk: *"${text}"*...`;
  },
};

