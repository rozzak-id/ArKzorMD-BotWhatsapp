import { config as loadDotenv } from 'dotenv';
import { buildApp } from './app.js';
import { createAppContext } from './bootstrap.js';
import { loadConfig } from './config.js';
import { ENV_FILE } from './paths.js';

// npm workspace menjalankan script dengan cwd `apps/server`, jadi `.env`
// di akar proyek harus dimuat lewat path eksplisit.
loadDotenv({ path: ENV_FILE, quiet: true });

async function main(): Promise<void> {
  const config = loadConfig();
  const context = await createAppContext(config);
  const app = await buildApp(context);

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    context.logger.info({ signal }, 'Mematikan ArKzorMD...');
    try {
      await app.close();
      await context.adapter.disconnect().catch((error: unknown) => {
        context.logger.warn({ err: error }, 'Gagal memutuskan adapter saat shutdown');
      });
      context.bot.stop();
      context.db.close();
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
  context.logger.info(
    {
      url: `http://${config.host}:${config.port}`,
      webDist: config.webDist,
      whatsappMode: config.whatsappMode,
      aiProvider: config.aiProvider,
    },
    'ArKzorMD server berjalan',
  );
}

main().catch((error: unknown) => {
  console.error('Gagal menjalankan ArKzorMD:', error);
  process.exit(1);
});
