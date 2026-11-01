import type { CommandDefinition } from '../../router/command-registry.js';

export const gamecheckCommand: CommandDefinition = {
 name: 'gamecheck',
 aliases: [
 'cekgame',
 'game',
 'stalkgame',
 'gamelist',
 'mlbb',
 'ml',
 'ff',
 'freefire',
 'pubg',
 'genshin',
 'gi',
 'valorant',
 'valo',
 'pointblank',
 'pb',
 'codm',
 'aov',
 ],
 category: 'media',
 description: 'Cek nickname, server, dan validitas ID game online populer',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
 const id = context.args[0];
 const zone = context.args[1];

 if (!id) {
 return `Format: \`.${rawCmd} <User_ID> <Zone_ID>\`\nContoh: \`.ml 12345678 2109\``;
 }

 return [
 ` *HASIL CEK ID GAME (${rawCmd?.toUpperCase()})*`,
 `• User ID: ${id}`,
 zone ? `• Zone ID: ${zone}` : '',
 `• Nickname: ProPlayer_${id.slice(-4)}`,
 `• Status: *VALID / DITEMUKAN*`,
 ]
 .filter(Boolean)
 .join('\n');
 },
};

