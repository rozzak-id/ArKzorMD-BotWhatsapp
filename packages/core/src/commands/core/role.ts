import type { CommandDefinition } from '../../router/command-registry.js';
import type { Role } from '../../types.js';

export const roleCommand: CommandDefinition = {
 name: 'role',
 aliases: [
 'setrole',
 'cekrole',
 'myrole',
 'addadmin',
 'deladmin',
 'listadmin',
 'adminlist',
 'listadm',
 'adminbot',
 ],
 category: 'core',
 description: 'Cek tingkatan role pengguna atau atur admin bot baru',
 roles: ['owner', 'admin', 'member'],
 handler: (context) => {
 const { args, message, role, services } = context;
 const sub = args[0]?.toLowerCase();

 // Cek daftar admin
 if (sub === 'list' || sub === 'listadmin' || sub === 'adminlist') {
 const allUsers = services.users.list();
 const admins = allUsers.filter((u) => u.role === 'admin' || u.role === 'owner');
 return [
 '* Daftar Pengelola Bot*',
 ...admins.map((u) => `• +${u.jid.split('@')[0]} - ${u.role.toUpperCase()}`),
 ].join('\n');
 }

 // Set role (khusus Owner)
 if ((sub === 'add' || sub === 'del' || sub === 'set') && args.length >= 2) {
 if (role !== 'owner') {
 return ' Hanya Owner yang berhak menambah atau mencabut Admin bot.';
 }
 const targetPhone = args[1]?.replace(/\D/g, '');
 if (!targetPhone) return 'Format salah. Gunakan `.role add 628xxx` atau `.role del 628xxx`.';
 const targetJid = `${targetPhone}@s.whatsapp.net`;
 const targetRole: Role = sub === 'del' ? 'member' : 'admin';

 services.users.upsert({
 jid: targetJid,
 name: null,
 role: targetRole,
 status: 'active',
 });

 return ` Role untuk +${targetPhone} berhasil diubah menjadi *${targetRole.toUpperCase()}*.`;
 }

 return `Informasi Akun Kamu:\n• Pengirim: ${message.senderName ?? message.senderId}\n• Role: *${role.toUpperCase()}*\n• Izin: ${
 role === 'owner' ? 'Akses Penuh' : role === 'admin' ? 'Moderasi & Manajemen' : 'Pengguna Standar'
 }`;
 },
};
