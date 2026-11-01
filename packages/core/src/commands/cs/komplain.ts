import type { CommandDefinition } from '../../router/command-registry.js';

export const komplainCommand: CommandDefinition = {
 name: 'komplain',
 aliases: ['report', 'lapor', 'cshelp'],
 category: 'cs',
 description: 'Mengirimkan laporan kendala atau keluhan pelanggan ke CS / Owner',
 roles: ['member', 'admin', 'owner'],
 handler: (context) => {
 const report = context.args.join(' ').trim();
 if (!report) {
 return 'Sertakan detail kendala pesanan Anda, contoh: `.komplain Order INV-123 saldo belum masuk`';
 }
 const sender = context.message.senderName ?? context.message.senderId;
 return ` Laporan kendala dari *${sender}* telah diteruskan ke Customer Service.\n_Pesan:_ "${report}"\nTim kami akan segera memeriksa laporan Anda.`;
 },
};

