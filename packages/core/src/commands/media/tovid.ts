import type { CommandDefinition } from '../../router/command-registry.js';

export const tovidCommand: CommandDefinition = {
 name: 'tovid',
 aliases: ['tovideo', 'tomp4', 'togif'],
 category: 'media',
 description: 'Mengonversi stiker animasi/bergerak menjadi file video MP4',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 return ' Mengonversi stiker animasi menjadi video MP4...';
 },
};

