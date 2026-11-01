import type { CommandDefinition } from '../../router/command-registry.js';

export const personaCommand: CommandDefinition = {
  name: 'persona',
  category: 'core',
  description: 'Lihat daftar atau aktifkan persona bot',
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
          item.id.toLowerCase() === wanted || item.name.toLowerCase() === wanted,
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
};
