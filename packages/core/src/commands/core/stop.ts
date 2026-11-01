import type { CommandDefinition } from '../../router/command-registry.js';

export const stopCommand: CommandDefinition = {
 name: 'stop',
 category: 'core',
 description: 'Kill switch aksi L1 (Owner)',
 roles: ['owner'],
 handler: (context) => {
 const disable = context.args[0]?.toLowerCase() === 'off';
 context.services.setKillSwitch(!disable);
 return disable
 ? '▶ Kill switch dimatikan. Aksi L1 kembali memerlukan approval.'
 : ' Kill switch AKTIF. Semua aksi L1 diblokir sampai Owner mengaktifkan kembali dengan `.stop off`.';
 },
};
