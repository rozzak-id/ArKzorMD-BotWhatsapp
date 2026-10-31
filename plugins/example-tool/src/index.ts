import type { ToolDefinition } from '@arkzormd/core';

/**
 * Contoh tool plugin L0. Tool ini hanya mengembalikan teks, tidak menyentuh
 * layanan eksternal. Untuk tool L1, wajib mendaftarkan risk 'L1' dan
 * allowedRoles yang tepat — Permission Engine akan memaksa approval.
 */
export function createEchoTool(): ToolDefinition {
  return {
    name: 'echo_note',
    category: 'web_utility',
    description: 'Echo back the provided note. Example plugin tool.',
    baseLevel: 'L0',
    scopeRules: [],
    minRole: 'member',
    relaxable: false,
    audit: true,
    priority: 'P0',
    implemented: true,
    params: {
      type: 'object',
      properties: {
        note: { type: 'string', description: 'Teks yang ingin digemakan.' },
      },
      required: ['note'],
      additionalProperties: false,
    },
    async handler(context) {
      const note = String(context.params.note ?? '').trim();
      if (!note) return { ok: false, status: 'error', error: 'Catatan kosong.' };
      return { ok: true, status: 'ok', output: { note } };
    },
  };
}
