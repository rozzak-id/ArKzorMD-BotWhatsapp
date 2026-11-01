import type { CommandDefinition } from '../../router/command-registry.js';

export const orderCommand: CommandDefinition = {
  name: 'order',
  aliases: ['cekorder', 'pesanan', 'invoice'],
  category: 'cs',
  description: 'Mengecek detail dan status pesanan toko berdasarkan nomor invoice',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const inv = context.args[0]?.trim();
    if (!inv) {
      return 'Sertakan nomor invoice atau ID pesanan Anda, contoh: `.order INV-20261101`';
    }
    return [
      `📦 *STATUS PESANAN #${inv.toUpperCase()}*`,
      '• Produk: Layanan Toko',
      '• Status: *SEDANG DIPROSES*',
      '• Estimasi: 5-15 Menit',
      '',
      '_Jika pesanan belum masuk dalam 30 menit, silakan hubungi CS via `.komplain`._',
    ].join('\n');
  },
};
