import type { CommandContext, CommandDefinition } from '../../router/command-registry.js';
import type { Role } from '../../types.js';

const ROLE_LABEL: Record<Role, string> = {
 owner: 'Owner',
 admin: 'Admin',
 member: 'Member',
};

const CATEGORY_TITLES: Record<string, string> = {
 core: ' CORE & SISTEM',
 group: ' GRUP & MODERASI',
 cs: ' CS & TOKO',
 media: ' UTILITY & MEDIA',
};

export function menuText(context: CommandContext): string {
 const { services, role, message } = context;
 const name = message.senderName ?? message.senderId;
 const commands = services.menuFor(role);

 // Kelompokkan per kategori
 const grouped: Record<string, Array<{ name: string; description: string }>> = {};
 for (const cmd of commands) {
 const cat = cmd.category || 'core';
 if (!grouped[cat]) grouped[cat] = [];
 grouped[cat].push(cmd);
 }

 const sections: string[] = [
 '*─── ArKzorMD Bot Menu ───*',
 `Halo *${name}*, role kamu: *${ROLE_LABEL[role]}*`,
 '',
 ];

 for (const [catKey, catTitle] of Object.entries(CATEGORY_TITLES)) {
 const list = grouped[catKey];
 if (list && list.length > 0) {
 sections.push(`*${catTitle}*`);
 for (const cmd of list) {
 sections.push(`• \`.${cmd.name}\` — ${cmd.description}`);
 }
 sections.push('');
 }
 }

 // Sisa kategori lain jika ada
 for (const [catKey, list] of Object.entries(grouped)) {
 if (!CATEGORY_TITLES[catKey] && list.length > 0) {
 sections.push(`* ${catKey.toUpperCase()}*`);
 for (const cmd of list) {
 sections.push(`• \`.${cmd.name}\` — ${cmd.description}`);
 }
 sections.push('');
 }
 }

 sections.push(' _Ketik pesan biasa untuk berbicara dengan AI Assistant._');
 return sections.join('\n');
}

export const menuCommand: CommandDefinition = {
 name: 'menu',
 aliases: ['help', 'start', 'layanan'],
 category: 'core',
 description: 'Menampilkan menu utama bot interaktif sesuai role',
 roles: ['owner', 'admin', 'member'],
 handler: (context) => menuText(context),
};
