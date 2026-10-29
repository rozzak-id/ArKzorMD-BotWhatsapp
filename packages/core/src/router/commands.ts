import type { Role } from '../types.js';
import type { CommandContext, CommandDefinition } from './command-registry.js';

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

function menuText(context: CommandContext): string {
  const { services, role, message } = context;
  const name = message.senderName ?? message.senderId;
  const commands = services.menuFor(role);
  const lines = [
    '*ArKzorMD — Menu*',
    `Halo ${name}, role kamu: *${ROLE_LABEL[role]}*`,
    '',
    ...commands.map((command) => `• \`.${command.name}\` — ${command.description}`),
    '',
    'Ketik pesan biasa untuk bicara dengan AI.',
  ];
  return lines.join('\n');
}

export function createDefaultCommands(): CommandDefinition[] {
  return [
    {
      name: 'menu',
      description: 'Daftar fitur sesuai role',
      roles: ['owner', 'admin', 'member'],
      handler: (context) => menuText(context),
    },
    {
      name: 'help',
      description: 'Bantuan penggunaan',
      roles: ['owner', 'admin', 'member'],
      handler: (context) => menuText(context),
    },
    {
      name: 'ping',
      description: 'Cek bot hidup',
      roles: ['owner', 'admin', 'member'],
      handler: () => '🏓 Pong! Bot aktif.',
    },
    {
      name: 'status',
      description: 'Status bot dan kuota',
      roles: ['owner', 'admin', 'member'],
      handler: (context) => {
        const status = context.services.getStatus();
        const minutes = Math.floor(status.uptimeSec / 60);
        return [
          '*Status ArKzorMD*',
          `• Platform: ${context.services.adapter.id} (${status.platformStatus})`,
          `• AI provider: ${status.aiProvider}`,
          `• Uptime: ${minutes} menit`,
          `• Approval menunggu: ${status.pendingApprovals}`,
          `• Kill switch: ${status.killSwitch ? 'AKTIF' : 'nonaktif'}`,
        ].join('\n');
      },
    },
    {
      name: 'reset',
      description: 'Hapus memori percakapan chat ini',
      roles: ['owner', 'admin', 'member'],
      handler: (context) => {
        context.services.messages.clear(context.message.chatId);
        context.services.audit.record({
          actorJid: context.message.senderId,
          action: 'memory.cleared',
          params: { chatId: context.message.chatId },
        });
        return '🧹 Memori percakapan chat ini sudah dihapus.';
      },
    },
    {
      name: 'persona',
      description: 'Lihat atau ganti persona chat ini',
      roles: ['admin', 'owner'],
      handler: (context) => {
        const active = context.services.personas.getActive();
        if (context.args.length === 0) {
          const list = context.services.personas
            .list()
            .map((persona) => `${persona.id === active?.id ? '•' : '○'} ${persona.id} — ${persona.name}`)
            .join('\n');
          return `*Persona aktif:* ${active?.name ?? '-'}\n\n${list}`;
        }

        const wanted = context.args.join(' ').toLowerCase();
        const persona = context.services.personas
          .list()
          .find(
            (item) =>
              item.id.toLowerCase() === wanted ||
              item.name.toLowerCase() === wanted,
          );
        if (!persona) {
          return `Persona "${wanted}" tidak ditemukan. Ketik \`.persona\` untuk melihat daftar.`;
        }

        context.services.personas.activate(persona.id);
        context.services.audit.record({
          actorJid: context.message.senderId,
          action: 'persona.activated',
          params: { personaId: persona.id },
        });
        return `🎭 Persona aktif sekarang: *${persona.name}* (${persona.id}).`;
      },
    },
    {
      name: 'stop',
      description: 'Kill switch aksi L1 (Owner)',
      roles: ['owner'],
      handler: (context) => {
        const disable = context.args[0]?.toLowerCase() === 'off';
        context.services.setKillSwitch(!disable);
        return disable
          ? '▶️ Kill switch dimatikan. Aksi L1 kembali memerlukan approval.'
          : '⛔ Kill switch AKTIF. Semua aksi L1 diblokir sampai Owner mengaktifkan kembali dengan `.stop off`.';
      },
    },
  ];
}
