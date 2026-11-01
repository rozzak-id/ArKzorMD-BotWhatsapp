import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { buildStatus } from '../status.js';

/** Siarkan status real-time ke Web UI setiap 2.5 detik (FR-02). */
export async function registerWsRoute(
  app: FastifyInstance,
  context: AppContext,
): Promise<void> {
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket) => {
    const push = () => {
      if (socket.readyState !== 1) return;
      socket.send(JSON.stringify({ type: 'status', data: buildStatus(context) }));
    };

    push();
    const timer = setInterval(push, 2_500);
    timer.unref();

    socket.on('close', () => clearInterval(timer));
    socket.on('error', () => clearInterval(timer));
  });
}
