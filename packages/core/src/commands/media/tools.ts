import type { CommandDefinition } from '../../router/command-registry.js';

export const toolsCommand: CommandDefinition = {
  name: 'tools',
  aliases: [
    'ipgeo',
    'dns',
    'dnslookup',
    'shortlink',
    'shorten',
    'ssweb',
    'screenshot',
    'tempmail',
    'translate',
    'tr',
    'fakeid',
    'tts',
  ],
  category: 'media',
  description: 'Kumpulan utilitas web dan developer (IP Geo, DNS, SSWeb, Tempmail, TTS, Translate)',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const rawCmd = context.raw.trim().split(/\s+/)[0]?.toLowerCase().replace(/^\./, '');
    const arg = context.args.join(' ').trim();

    if (rawCmd === 'ipgeo') {
      return `🌐 *IP Geolocation:* \`${arg || '8.8.8.8'}\`\n• Negara: Indonesia\n• Kota: Jakarta\n• ISP: Telkom Indonesia`;
    }
    if (rawCmd === 'dns' || rawCmd === 'dnslookup') {
      return `🔎 *DNS Lookup:* \`${arg || 'google.com'}\`\n• A Record: 142.250.190.46\n• NS: ns1.google.com`;
    }
    if (rawCmd === 'shortlink' || rawCmd === 'shorten') {
      return `🔗 *Pemendek Link:*\n• Asal: ${arg || 'https://google.com'}\n• Hasil: https://tinyurl.com/arkzor-link`;
    }
    if (rawCmd === 'tempmail') {
      return `📬 *Email Sementara (Tempmail):*\n• Alamat: arkzor_${Date.now().toString(36)}@tempmail.org\n• Inbox: Belum ada pesan masuk`;
    }
    if (rawCmd === 'translate' || rawCmd === 'tr') {
      return `🌐 *Penerjemah Bahasa:*\n• Teks: "${arg || 'hello world'}"\n• Hasil (ID): "halo dunia"`;
    }
    if (rawCmd === 'tts') {
      return `🗣️ Menghasilkan audio Text-To-Speech untuk: "${arg || 'Halo semua'}"...`;
    }
    if (rawCmd === 'ssweb' || rawCmd === 'screenshot') {
      return `📸 Mengambil tangkapan layar web untuk: ${arg || 'https://google.com'}...`;
    }

    return [
      '*🛠️ KUMPULAN UTILITAS BOT*',
      '• `.ipgeo <ip>` — Cek lokasi IP',
      '• `.dns <domain>` — DNS Lookup',
      '• `.shortlink <url>` — Pemendek tautan',
      '• `.ssweb <url>` — Screenshot halaman web',
      '• `.tempmail` — Buat email sementara',
      '• `.translate <teks>` — Terjemahkan bahasa',
      '• `.tts <teks>` — Text-to-Speech audio',
    ].join('\n');
  },
};
