import type { CommandDefinition } from '../../router/command-registry.js';

export const autoreadCommand: CommandDefinition = {
 name: 'autoread',
 aliases: ['autobaca', 'centangbiru', 'readmsg'],
 category: 'core',
 description: 'Mengaktifkan atau mematikan centang biru otomatis',
 roles: ['admin', 'owner'],
 handler: (context) => {
 const val = context.args[0]?.toLowerCase();
 const enable = val === 'on' || val === '1' || val === 'true';
 context.services.settings.set('auto_read', String(enable));
 return ` Fitur Auto Read (Centang Biru) sekarang *${enable ? 'AKTIF' : 'NONAKTIF'}*.`;
 },
};
