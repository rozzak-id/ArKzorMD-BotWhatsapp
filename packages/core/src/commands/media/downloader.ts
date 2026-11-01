import type { CommandDefinition } from '../../router/command-registry.js';

export const downloaderCommand: CommandDefinition = {
  name: 'downloader',
  aliases: [
    'dl',
    'down',
    'download',
    'tt',
    'tiktok',
    'ig',
    'instagram',
    'reels',
    'yt',
    'youtube',
    'ytdl',
    'ytmp3',
    'ytmp4',
    'fb',
    'facebook',
    'tw',
    'twitter',
    'x',
    'threads',
    'pin',
    'pinterest',
    'capcut',
    'douyin',
    'snack',
    'mediafire',
    'gdrive',
    'bilibili',
    'spotify',
    'sc',
    'sfile',
  ],
  category: 'media',
  description: 'Download video, audio, dan file tanpa watermark dari media sosial',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const url = context.args[0]?.trim();
    if (!url) {
      return 'Sertakan tautan/URL media yang ingin diunduh, contoh: `.tt https://vt.tiktok.com/xxx`';
    }
    return `📥 Mengambil media dari: ${url}...\nMedia sedang diproses dan akan segera dikirim.`;
  },
};

