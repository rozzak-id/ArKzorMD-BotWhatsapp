import { existsSync } from 'node:fs';
import { join } from 'node:path';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppContext } from './context.js';
import { registerApiRoutes } from './routes/api.js';
import { registerWsRoute } from './routes/ws.js';

export async function buildApp(context: AppContext): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: context.config.logLevel },
    bodyLimit: 1_048_576,
    trustProxy: false,
  });

  await registerWsRoute(app, context);
  registerApiRoutes(app, context);

  const hasWebBuild = existsSync(join(context.config.webDist, 'index.html'));
  if (hasWebBuild) {
    await app.register(fastifyStatic, {
      root: context.config.webDist,
      prefix: '/',
    });

    app.setNotFoundHandler((request, reply) => {
      const wantsHtml = request.headers.accept?.includes('text/html') ?? false;
      if (
        request.method === 'GET' &&
        !request.url.startsWith('/api') &&
        !request.url.startsWith('/ws') &&
        wantsHtml
      ) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'Tidak ditemukan.' });
    });
  } else {
    app.get('/', async () => ({
      app: 'ArKzorMD',
      message:
        'Web UI belum dibangun. Jalankan `npm run dev:web` untuk mode pengembangan ' +
        'atau `npm run build` untuk produksi.',
    }));
    app.setNotFoundHandler((_request, reply) =>
      reply.code(404).send({ error: 'Tidak ditemukan.' }),
    );
  }

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'Request gagal');
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    const message =
      statusCode >= 500 && context.config.nodeEnv === 'production'
        ? 'Terjadi kesalahan internal.'
        : error instanceof Error
          ? error.message
          : 'Terjadi kesalahan internal.';
    return reply.code(statusCode).send({ error: message });
  });

  return app;
}
