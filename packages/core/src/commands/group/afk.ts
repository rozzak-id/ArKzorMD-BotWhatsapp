import type { CommandDefinition } from '../../router/command-registry.js';

export const afkCommand: CommandDefinition = {
  name: 'afk',
  aliases: ['setafk', 'away'],
  category: 'group',
  description: 'Mengaktifkan status AFK (Away From Keyboard) dengan alasan tertentu',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const reason = context.args.join(' ') || 'Tanpa alasan';
    const name = context.message.senderName ?? 'User';
    return `💤 *${name}* sekarang dalam status AFK!\nAlasan: _${reason}_\nBot akan memberitahu siapa saja yang memanggilmu.`;
  },
};

