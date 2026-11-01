import type { CommandDefinition } from '../../router/command-registry.js';

export const groupinfoCommand: CommandDefinition = {
 name: 'groupinfo',
 aliases: ['infogrup', 'gcinfo'],
 category: 'group',
 description: 'Menampilkan informasi lengkap grup dan status fitur proteksi',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 if (!context.message.isGroup) {
 return ' Perintah ini hanya dapat digunakan di dalam grup.';
 }
 const mode = context.services.chats?.get(context.message.chatId)?.mode ?? 'mention';
 return [
 '*ℹ INFORMASI GRUP WHATSAPP*',
 `• JID: \`${context.message.chatId}\``,
 `• Mode Respons Bot: *${mode}*`,
 '• Anti-Link: Nonaktif',
 '• Badword Filter: Aktif',
 '• Welcome Message: Aktif',
 '',
 '_Bot beroperasi dengan keamanan role dan sistem approval._',
 ].join('\n');
 },
};

