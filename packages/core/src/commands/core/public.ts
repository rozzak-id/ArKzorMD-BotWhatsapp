import type { CommandDefinition } from '../../router/command-registry.js';

export const publicCommand: CommandDefinition = {
 name: 'public',
 aliases: ['publik'],
 category: 'core',
 description: 'Mengubah bot ke mode Publik (merespons semua pengguna)',
 roles: ['owner'],
 handler: (context) => {
 context.services.settings.set('access_mode', 'auto_member');
 return ' Bot sekarang dalam *Mode Publik*. Pengguna baru dapat menggunakan bot.';
 },
};
