import type { CommandDefinition } from '../../router/command-registry.js';

export const resetCommand: CommandDefinition = {
  name: 'reset',
  category: 'core',
  description: 'Hapus riwayat konteks percakapan chat ini',
  roles: ['owner', 'admin', 'member'],
  handler: (context) => {
    context.services.messages.clear(context.message.chatId);
    context.services.audit.record({
      actorJid: context.message.senderId,
      action: 'memory.cleared',
      params: { chatId: context.message.chatId },
    });
    return '🧹 Memori percakapan chat ini sudah dibersihkan.';
  },
};
