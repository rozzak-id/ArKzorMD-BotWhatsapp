import type { CommandDefinition } from '../../router/command-registry.js';

export const selfCommand: CommandDefinition = {
  name: 'self',
  aliases: ['privat', 'private'],
  category: 'core',
  description: 'Mengubah bot ke mode Self (hanya merespons Owner)',
  roles: ['owner'],
  handler: (context) => {
    context.services.settings.set('access_mode', 'closed');
    return '🔒 Bot sekarang dalam *Mode Self*. Hanya Owner yang akan diladeni oleh bot.';
  },
};
