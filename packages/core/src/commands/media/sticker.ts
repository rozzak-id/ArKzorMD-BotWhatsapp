import sharp from 'sharp';
import type { CommandDefinition } from '../../router/command-registry.js';
import type { MediaAttachment } from '../../types.js';

export const stickerCommand: CommandDefinition = {
  name: 'sticker',
  aliases: ['s', 'stiker', 'sgif', 'wm', 'take'],
  category: 'media',
  description: 'Mengonversi foto atau gambar menjadi stiker WhatsApp (512x512 WebP)',
  roles: ['member', 'admin', 'owner'],
  handler: async (context) => {
    const { message, services } = context;

    // Cari media gambar dari pesan saat ini
    const targetMedia = message.media.find((m) => m.kind === 'image' || Boolean(m.mimeType?.startsWith('image/')));

    let imageBuffer: Buffer | null = null;
    if (targetMedia?.buffer) {
      imageBuffer = targetMedia.buffer;
    } else if (targetMedia?.base64) {
      imageBuffer = Buffer.from(targetMedia.base64, 'base64');
    }

    if (!imageBuffer) {
      return (
        'Kirim foto/gambar dengan caption `.sticker` atau balas gambar yang ingin dijadikan stiker.\n' +
        'Tips: Gunakan format JPG/PNG untuk hasil stiker transparan terbaik.'
      );
    }

    try {
      // Konversi ke format stiker resmi WhatsApp: WebP 512x512 transparan
      const webpBuffer = await sharp(imageBuffer)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      const stickerMedia: MediaAttachment = {
        kind: 'sticker',
        mimeType: 'image/webp',
        buffer: webpBuffer,
      };

      await services.adapter.send(message.chatId, {
        media: [stickerMedia],
        replyTo: message.id,
      });

      return '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `[GAGAL] Gagal membuat stiker: ${msg}`;
    }
  },
};
