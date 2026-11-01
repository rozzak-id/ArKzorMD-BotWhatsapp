import type { CommandDefinition } from '../../router/command-registry.js';

export const daftargcCommand: CommandDefinition = {
  name: 'daftargc',
  aliases: ['registergc', 'joingc'],
  category: 'group',
  description: 'Mendaftarkan grup ke whitelist bot atau menyuruh bot bergabung lewat link',
  roles: ['admin', 'owner'],
  handler: (context) => {
    const link = context.args[0];
    if (link && link.includes('chat.whatsapp.com')) {
      return `📥 Permintaan bergabung ke grup via link tercatat: ${link}.`;
    }
    if (context.message.isGroup) {
      return `✅ Grup \`${context.message.chatId}\` berhasil didaftarkan ke whitelist bot.`;
    }
    return 'Gunakan perintah ini di dalam grup atau sertakan link undangan grup WhatsApp.';
  },
};
