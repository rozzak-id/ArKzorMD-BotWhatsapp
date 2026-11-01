import type { CommandDefinition } from '../../router/command-registry.js';

export const adminCommand: CommandDefinition = {
 name: 'admin',
 aliases: ['kick', 'add', 'promote', 'demote', 'tagall'],
 category: 'group',
 description: 'Moderasi grup (kick, add, promote, demote, tagall)',
 roles: ['admin', 'owner'],
 handler: (context) => {
 const { message, args, raw } = context;
 if (!message.isGroup) {
 return ' Perintah ini hanya dapat digunakan di dalam grup.';
 }

 const commandUsed = raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
 const sub = commandUsed === 'admin' ? args[0]?.toLowerCase() : commandUsed;

 switch (sub) {
 case 'kick': {
 const target = args.slice(commandUsed === 'admin' ? 1 : 0).join(' ');
 if (!target) return 'Sertakan target yang ingin dikeluarkan, contoh: `.kick @user`';
 return ` Permintaan kick untuk ${target} dicatat. Memerlukan izin admin grup WhatsApp bot.`;
 }
 case 'add': {
 const target = args.slice(commandUsed === 'admin' ? 1 : 0).join(' ');
 if (!target) return 'Sertakan nomor yang ingin ditambahkan, contoh: `.add 628xxx`';
 return ` Mengundang ${target} ke grup...`;
 }
 case 'promote': {
 const target = args.slice(commandUsed === 'admin' ? 1 : 0).join(' ');
 if (!target) return 'Sertakan target yang ingin dinaikkan jadi Admin, contoh: `.promote @user`';
 return ` Menaikkan ${target} menjadi Admin grup...`;
 }
 case 'demote': {
 const target = args.slice(commandUsed === 'admin' ? 1 : 0).join(' ');
 if (!target) return 'Sertakan target yang ingin diturunkan, contoh: `.demote @user`';
 return ` Menurunkan ${target} menjadi anggota biasa...`;
 }
 case 'tagall': {
 const pesan = args.slice(commandUsed === 'admin' ? 1 : 0).join(' ') || 'Panggilan untuk semua anggota!';
 return ` *TAG ALL PANGGILAN*\n\nPesan: ${pesan}\n\n_Semua anggota grup dipanggil._`;
 }
 default:
 return [
 '* Menu Moderasi Admin Grup*',
 '• `.kick @user` — Keluarkan anggota',
 '• `.add 628xxx` — Tambahkan anggota baru',
 '• `.promote @user` — Naikkan jadi Admin grup',
 '• `.demote @user` — Turunkan Admin jadi anggota',
 '• `.tagall <pesan>` — Panggil seluruh anggota grup',
 ].join('\n');
 }
 },
};

