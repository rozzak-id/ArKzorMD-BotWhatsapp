import type { CommandDefinition } from '../../router/command-registry.js';

export const faqCommand: CommandDefinition = {
  name: 'faq',
  aliases: ['bantuan', 'cs', 'tanya_cs'],
  category: 'cs',
  description: 'Daftar pertanyaan yang sering diajukan seputar layanan dan pemesanan',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    return [
      '*❓ FAQ & PANDUAN BANTUAN*',
      '',
      '*Q: Bagaimana cara order?*',
      'A: Pilih produk, kirim format order, lalu selesaikan pembayaran via QRIS.',
      '',
      '*Q: Metode pembayaran apa saja yang diterima?*',
      'A: Kami menerima QRIS (BCA, Mandiri, BRI, BNI, Dana, Ovo, Gopay, ShopeePay).',
      '',
      '*Q: Berapa lama pesanan diproses?*',
      'A: Otomatis 1-15 menit setelah pembayaran terverifikasi.',
      '',
      '_Butuh bantuan lebih lanjut? Ketik `.komplain <keluhan>` untuk terhubung ke CS._',
    ].join('\n');
  },
};

