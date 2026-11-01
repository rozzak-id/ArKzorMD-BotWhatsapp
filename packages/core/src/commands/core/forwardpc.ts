import type { CommandDefinition } from '../../router/command-registry.js';

export const forwardpcCommand: CommandDefinition = {
 name: 'forwardpc',
 aliases: ['fwdpc', 'setforward', 'teruskan'],
 category: 'core',
 description: 'Mengatur nomor tujuan penerusan pesan pribadi (DM)',
 roles: ['owner'],
 handler: (context) => {
 const phone = context.args[0]?.replace(/\D/g, '');
 if (!phone) {
 const current = context.services.settings.get('forward_pc_target');
 return current
 ? `Nomor tujuan penerusan pesan DM saat ini: +${current.split('@')[0]}`
 : 'Penerusan DM belum diatur. Gunakan `.forwardpc 628xxx` untuk mengatur.';
 }
 const targetJid = `${phone}@s.whatsapp.net`;
 context.services.settings.set('forward_pc_target', targetJid);
 return ` Pesan pribadi (DM) yang masuk ke bot akan diteruskan ke +${phone}.`;
 },
};
