import type { ToolDefinition } from '../types.js';

/**
 * Normalisasi tujuan pesan. Untuk v0.1 fokus WhatsApp:
 * nomor lokal 08xx diubah ke 62xx@s.whatsapp.net.
 * TODO(M1): pindahkan normalisasi ke adapter agar netral platform.
 */
export function normalizeTarget(input: string): string {
  const value = input.trim();
  if (value.includes('@')) return value;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return `${digits}@s.whatsapp.net`;
}

export function createBuiltinTools(): ToolDefinition[] {
  return [
    {
      name: 'react',
      description: 'Beri reaksi emoji pada pesan di chat berjalan.',
      risk: 'L0',
      allowedRoles: ['owner', 'admin', 'member'],
      parameters: {
        type: 'object',
        properties: {
          emoji: { type: 'string', description: 'Satu emoji, misalnya 👍' },
          messageId: { type: 'string', description: 'ID pesan target' },
        },
        required: ['emoji'],
        additionalProperties: false,
      },
      async execute(context) {
        const emoji = String(context.params.emoji ?? '').trim();
        if (!emoji) return { ok: false, error: 'Emoji wajib diisi.' };
        const messageId = String(context.params.messageId ?? context.message?.id ?? '');
        if (!messageId) return { ok: false, error: 'Message ID tidak tersedia.' };
        await context.adapter.send(context.chatId, { reaction: { emoji, messageId } });
        return { ok: true, output: { emoji, messageId } };
      },
    },
    {
      name: 'send_message',
      description:
        'Kirim pesan teks ke kontak atau grup lain. Aksi L1, wajib persetujuan Owner.',
      risk: 'L1',
      allowedRoles: ['owner', 'admin'],
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Nomor tujuan atau JID. Nomor lokal 08xx akan dinormalisasi.',
          },
          text: { type: 'string', description: 'Isi pesan yang akan dikirim.' },
        },
        required: ['to', 'text'],
        additionalProperties: false,
      },
      async execute(context) {
        const to = normalizeTarget(String(context.params.to ?? ''));
        const text = String(context.params.text ?? '').trim();
        if (!to || to === '@s.whatsapp.net') {
          return { ok: false, error: 'Nomor tujuan tidak valid.' };
        }
        if (!text) return { ok: false, error: 'Isi pesan kosong.' };
        if (text.length > 4096) return { ok: false, error: 'Pesan melebihi 4096 karakter.' };
        await context.adapter.send(to, { text });
        return { ok: true, output: { to, length: text.length } };
      },
    },
    {
      name: 'update_profile',
      description:
        'Ubah profil atau status WhatsApp. Aksi L2 — hanya lewat Web UI, tidak pernah dieksekusi AI.',
      risk: 'L2',
      allowedRoles: ['owner'],
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
        additionalProperties: false,
      },
      async execute() {
        return {
          ok: false,
          error: 'Aksi L2 tidak boleh dieksekusi dari chat. Gunakan Web UI.',
        };
      },
    },
  ];
}
