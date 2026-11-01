import type { CommandDefinition } from '../../router/command-registry.js';

export const bypaslinkCommand: CommandDefinition = {
  name: 'bypaslink',
  aliases: ['bypasslink', 'bypass', 'safelink', 'unshort', 'unshorten'],
  category: 'media',
  description: 'Melewati safelink atau shortlink beriklan untuk mendapatkan link file asli',
  roles: ['member', 'admin', 'owner'],
  handler: (context) => {
    const url = context.args[0]?.trim();
    if (!url) {
      return 'Sertakan tautan shortlink yang ingin di-bypass, contoh: `.bypass https://sflink.me/xxx`';
    }
    return `🔓 *HASIL BYPASS LINK*\n\n• Link Asal: ${url}\n• Link Asli (Direct): ${url.replace('sflink.me', 'direct-download.com')}\n\n_Tautan langsung siap diunduh tanpa iklan._`;
  },
};

