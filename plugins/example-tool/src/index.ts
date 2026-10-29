import type { ToolDefinition } from '@arkzormd/core';

/**
 * Contoh tool plugin L0. Tool ini hanya mengembalikan teks, tidak menyentuh
 * layanan eksternal. Untuk tool L1, wajib mendaftarkan risk 'L1' dan
 * allowedRoles yang tepat — Permission Engine akan memaksa approval.
 */
export function createEchoTool(): ToolDefinition {
  return {
    name: 'echo_note',
    description: 'Mengembalikan catatan yang diberikan. Contoh tool plugin.',
    risk: 'L0',
    allowedRoles: ['owner', 'admin', 'member'],
    parameters: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Teks yang ingin digemakan.' },
      },
      required: ['note'],
      additionalProperties: false,
    },
    async execute(context) {
      const note = String(context.params.note ?? '').trim();
      if (!note) return { ok: false, error: 'Catatan kosong.' };
      return { ok: true, output: { note } };
    },
  };
}
