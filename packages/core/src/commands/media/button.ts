import type { CommandDefinition } from '../../router/command-registry.js';

export const buttonCommand: CommandDefinition = {
  name: 'button',
  aliases: ['btn', 'tombol', 'testbtn'],
  category: 'media',
  description: 'Contoh template pengiriman pesan tombol interaktif Native Flow',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    return [
      '🔘 *TEMPLAT TOMBOL INTERAKTIF NATIVE FLOW*',
      '• Quick Reply: Tombol pilihan respons instan',
      '• CTA URL: Membuka link website resmi',
      '• CTA Call: Tombol panggil nomor telepon CS',
      '• CTA Copy: Menyalin kode voucher/rekening dengan satu ketuk',
      '• Single Select: Menu daftar pilihan dropdown interaktif',
      '',
      '_Pesan tombol WhatsApp Native Flow aktif dan didukung penuh oleh adapter onigis._',
    ].join('\n');
  },
};
