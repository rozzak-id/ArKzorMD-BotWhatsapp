import type { CommandDefinition } from '../../router/command-registry.js';

export const pingCommand: CommandDefinition = {
  name: 'ping',
  aliases: ['p', 'pong', 'speed', 'test'],
  category: 'core',
  description: 'Menampilkan respon latency, uptime, dan status RAM bot',
  roles: ['owner', 'admin', 'member'],
  handler: (context) => {
    const start = context.message.timestamp;
    const latency = Math.max(0, Date.now() - start);
    const status = context.services.getStatus();
    const mem = process.memoryUsage();
    const ramUsed = (mem.rss / 1024 / 1024).toFixed(1);

    const hours = Math.floor(status.uptimeSec / 3600);
    const minutes = Math.floor((status.uptimeSec % 3600) / 60);
    const uptimeStr = `${hours}j ${minutes}m`;

    return [
      '🏓 *Pong!*',
      `• Latency: *${latency}ms*`,
      `• Uptime: *${uptimeStr}*`,
      `• RAM: *${ramUsed} MB*`,
      `• Platform: *${context.services.adapter.id}* (${status.platformStatus})`,
      `• AI: *${status.aiProvider}*`,
    ].join('\n');
  },
};
