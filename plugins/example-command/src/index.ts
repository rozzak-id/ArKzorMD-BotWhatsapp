import type { CommandDefinition } from '@arkzormd/core';

/**
 * Contoh plugin command paling sederhana.
 * Tambahkan command lain dengan memanggil `definitions.push(...)`.
 */
export function createPluginCommands(): CommandDefinition[] {
  return [
    {
      name: 'hello',
      description: 'Sapaan contoh dari plugin',
      roles: ['owner', 'admin', 'member'],
      handler: (context) => {
        const target = context.args.length > 0 ? context.args.join(' ') : null;
        return target
          ? `Halo, ${target}! Command ini berasal dari plugin contoh.`
          : `Halo, ${context.message.senderName ?? 'kawan'}! Command ini berasal dari plugin contoh.`;
      },
    },
  ];
}
