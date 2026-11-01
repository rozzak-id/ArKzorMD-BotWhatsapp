import type { CommandDefinition } from '../../router/command-registry.js';

export const mengetikCommand: CommandDefinition = {
  name: 'mengetik',
  aliases: ['typing', 'autotyping', 'ngetik'],
  category: 'core',
  description: 'Mengaktifkan atau mematikan efek visual sedang mengetik saat memproses',
  roles: ['admin', 'owner'],
  handler: (context) => {
    const val = context.args[0]?.toLowerCase();
    const enable = val === 'on' || val === '1' || val === 'true';
    context.services.settings.set('typing_presence', String(enable));
    return `✍️ Indikator Mengetik (*Typing Presence*) sekarang *${enable ? 'AKTIF' : 'NONAKTIF'}*.`;
  },
};
