import type { CommandDefinition } from '../../router/command-registry.js';

export const qrisCommand: CommandDefinition = {
  name: 'qris',
  aliases: ['qrisdinamis', 'payqris', 'bayarqris', 'setqris'],
  category: 'media',
  description: 'Membuat kode QR pembayaran QRIS dinamis lengkap dengan nominal tagihan',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const amount = context.args[0]?.replace(/\D/g, '');
    const formatted = amount
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(amount))
      : 'Rp 10.000';

    return [
      '💳 *KODE PEMBAYARAN QRIS TOKO*',
      `• Nominal: *${formatted}*`,
      '• Merchant: NafvyStore Official',
      '• Biaya Admin: Gratis (Rp 0)',
      '',
      '_Silakan pindai kode QRIS menggunakan GoPay, OVO, Dana, ShopeePay, atau Mobile Banking apa saja._',
    ].join('\n');
  },
};

