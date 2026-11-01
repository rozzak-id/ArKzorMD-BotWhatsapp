import sharp from 'sharp';
import type { CommandDefinition } from '../../router/command-registry.js';
import type { MediaAttachment } from '../../types.js';

export const toimgCommand: CommandDefinition = {
  name: 'toimg',
  aliases: ['toimage', 'topng', 'tojpg'],
  category: 'media',
  description: 'Mengonversi stiker WhatsApp menjadi file gambar PNG',
  roles: ['member', 'admin', 'owner'],
  handler: async (context) => {
    const { message, services } = context;

    const targetMedia = message.media.find((m) => m.kind === 'sticker' || Boolean(m.mimeType?.includes('webp')));
    let stickerBuffer: Buffer | null = null;
    if (targetMedia?.buffer) {
      stickerBuffer = targetMedia.buffer;
    } else if (targetMedia?.base64) {
      stickerBuffer = Buffer.from(targetMedia.base64, 'base64');
    }

    if (!stickerBuffer) {
      return 'Kirim atau balas stiker WhatsApp dengan mengetik `.toimg` untuk mengubahnya menjadi gambar biasa.';
    }

    try {
      const pngBuffer = await sharp(stickerBuffer).png().toBuffer();
      const imageMedia: MediaAttachment = {
        kind: 'image',
        mimeType: 'image/png',
        buffer: pngBuffer,
        caption: 'Konversi stiker ke gambar PNG selesai.',
      };

      await services.adapter.send(message.chatId, {
        media: [imageMedia],
        replyTo: message.id,
      });

      return '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `[GAGAL] Gagal mengonversi stiker ke gambar: ${msg}`;
    }
  },
};
