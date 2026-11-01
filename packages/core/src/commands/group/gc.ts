import type { CommandDefinition } from '../../router/command-registry.js';

export const gcCommand: CommandDefinition = {
 name: 'gc',
 aliases: ['grup', 'managegc'],
 category: 'group',
 description: 'Manajemen grup yang terdaftar di database bot',
 roles: ['admin', 'owner'],
 handler: (context) => {
 const chats = context.services.chats?.list().filter((c) => c.type === 'group') ?? [];
 if (chats.length === 0) {
 return 'Belum ada grup yang tersimpan di database bot.';
 }
 const lines = chats.map((c, i) => `${i + 1}. \`${c.id}\` [Mode: ${c.mode}]`);
 return ['* DAFTAR GRUP BOT*', ...lines].join('\n');
 },
};

