import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { InternalMessage } from '@arkzormd/core';
import type { AppContext } from '../context.js';
import { APP_VERSION, buildPlatforms, buildStatus } from '../status.js';

const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject', 'always']),
});

const devInboundSchema = z.object({
  text: z.string().min(1).max(4_000),
  from: z.string().min(3).optional(),
  name: z.string().max(80).optional(),
  chatId: z.string().min(3).optional(),
  isGroup: z.boolean().default(false),
  mentioned: z.boolean().default(false),
});

const limitSchema = z.coerce.number().int().min(1).max(500).default(50);

function safeEqual(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

function requireAdminToken(
  context: AppContext,
  request: FastifyRequest,
  reply: FastifyReply,
): boolean {
  if (!context.config.adminToken) {
    reply.code(503).send({
      error:
        'ADMIN_TOKEN belum dikonfigurasi. Set nilai acak minimal 16 karakter di .env ' +
        'sebelum memakai endpoint keputusan Approval.',
    });
    return false;
  }

  const header = request.headers['x-admin-token'];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token || !safeEqual(context.config.adminToken, token)) {
    reply.code(401).send({ error: 'Token admin tidak valid.' });
    return false;
  }
  return true;
}

export function registerApiRoutes(app: FastifyInstance, context: AppContext): void {
  app.get('/api/health', async () => ({
    ok: true,
    app: 'ArKzorMD',
    version: APP_VERSION,
    uptimeSec: Math.floor((Date.now() - context.startedAt) / 1000),
  }));

  app.get('/api/status', async () => buildStatus(context));

  app.get('/api/platforms', async () => ({ platforms: buildPlatforms(context) }));

  app.get('/api/approvals', async () => ({
    pending: context.approvals.pending(),
    rules: context.approvals.rules(),
  }));

  app.get('/api/approvals/history', async (request) => {
    const parsed = limitSchema.safeParse(
      (request.query as Record<string, unknown> | undefined)?.limit,
    );
    return { history: context.approvals.history(parsed.success ? parsed.data : 50) };
  });

  app.post('/api/approvals/:code/decision', async (request, reply) => {
    if (!requireAdminToken(context, request, reply)) return reply;

    if (!context.config.ownerJid) {
      return reply.code(409).send({
        error: 'OWNER_JID belum ditetapkan. Selesaikan setup Owner terlebih dahulu.',
      });
    }

    const parsed = decisionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Body harus berisi decision: approve|reject|always.' });
    }

    const params = request.params as { code?: string };
    const code = params.code?.trim().replace(/^#/, '');
    if (!code) {
      return reply.code(400).send({ error: 'Kode approval wajib diisi.' });
    }

    const result = await context.bot.decideApproval({
      shortCode: code,
      actorJid: context.config.ownerJid,
      decision: parsed.data.decision,
    });

    if (!result.ok) {
      return reply.code(400).send({ error: result.reason ?? 'Approval gagal diputuskan.' });
    }

    return {
      ok: true,
      request: result.request,
      ...(result.rule ? { rule: result.rule } : {}),
      ...(result.executionError ? { executionError: result.executionError } : {}),
    };
  });

  app.get('/api/personas', async () => ({
    active: context.stores.personas.getActive()?.id ?? null,
    personas: context.stores.personas.list(),
  }));

  app.get('/api/users', async () => ({ users: context.stores.users.list() }));

  app.get('/api/tools', async () => ({
    tools: context.tools.list().map(({ execute: _execute, ...schema }) => schema),
    killSwitch: context.stores.settings.getBoolean('kill_switch'),
  }));

  app.get('/api/audit', async (request) => {
    const parsed = limitSchema.safeParse(
      (request.query as Record<string, unknown> | undefined)?.limit,
    );
    return { entries: context.stores.audit.list(parsed.success ? parsed.data : 50) };
  });

  app.get('/api/settings', async () => ({
    prefix: context.config.prefix,
    accessMode: context.config.accessMode,
    defaultChatMode: context.config.defaultChatMode,
    killSwitch: context.stores.settings.getBoolean('kill_switch'),
    rateLimitPerMinute: context.stores.settings.getNumber('rate_limit_per_minute', 12),
    aiProvider: context.config.aiProvider,
    aiModel: context.config.aiModel,
    whatsappMode: context.config.whatsappMode,
  }));

  app.post('/api/dev/inbound', async (request, reply) => {
    if (context.config.nodeEnv === 'production' || context.config.whatsappMode !== 'mock') {
      return reply.code(404).send({ error: 'Endpoint pengembangan tidak tersedia.' });
    }
    if (!context.mockAdapter) {
      return reply.code(503).send({ error: 'Mock adapter tidak aktif.' });
    }

    const parsed = devInboundSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Body tidak valid: butuh field text.' });
    }

    const body = parsed.data;
    const senderId = body.from ?? '6281111111111@s.whatsapp.net';
    const chatId = body.chatId ?? (body.isGroup ? '120363000000000000@g.us' : senderId);

    const existing = context.stores.users.get(senderId);
    if (!existing) {
      context.stores.users.upsert({
        jid: senderId,
        name: body.name ?? 'Dev User',
        role: senderId === context.config.ownerJid ? 'owner' : 'member',
        status: 'active',
      });
    }

    const message: InternalMessage = {
      id: `dev-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      platform: 'whatsapp',
      chatId,
      chatType: body.isGroup ? 'group' : 'private',
      senderId,
      senderName: body.name ?? 'Dev User',
      isGroup: body.isGroup,
      text: body.text,
      media: [],
      mentions: body.mentioned ? [context.config.botNames[0] ?? 'Arka'] : [],
      timestamp: Date.now(),
      fromBot: false,
    };

    const sentBefore = context.mockAdapter.sent.length;
    const approvalsBefore = context.mockAdapter.approvals.length;

    await context.mockAdapter.receive(message);

    return {
      ok: true,
      replies: context.mockAdapter.sent
        .slice(sentBefore)
        .map((record) => ({ chatId: record.chatId, ...record.content })),
      approvals: context.mockAdapter.approvals
        .slice(approvalsBefore)
        .map((record) => ({
          code: record.request.shortCode,
          tool: record.request.toolName,
          params: record.request.params,
        })),
    };
  });
}
