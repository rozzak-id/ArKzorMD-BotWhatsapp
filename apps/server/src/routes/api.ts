import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { InternalMessage, Persona, Role } from '@arkzormd/core';
import type { AppContext } from '../context.js';
import { isSetupCompleted, requireAdmin } from '../auth.js';
import { APP_VERSION, buildPlatforms, buildStatus } from '../status.js';
import { createDynamicAiProvider } from '../bootstrap.js';

const personaUpsertSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/i, 'ID persona harus alfanumerik huruf, angka, strip, underscore.'),
  name: z.string().min(1).max(80),
  style: z.string().min(1).max(100).default('santai'),
  language: z.string().min(1).max(10).default('id'),
  typingDelay: z.enum(['natural', 'fast', 'slow']).default('natural'),
  greeting: z.string().max(500).optional(),
  forbiddenTopics: z.array(z.string()).default([]),
  extraInstructions: z.string().max(2000).optional(),
});

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
    if (!requireAdmin(context, request, reply)) return reply;

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

  app.get('/api/personas/export', async (_request, reply) => {
    const list = context.stores.personas.list();
    const activeId = context.stores.personas.getActive()?.id ?? null;
    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="arkzormd-personas.json"');
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      activeId,
      personas: list,
    };
  });

  app.post('/api/personas/import', async (request, reply) => {
    const body = request.body as Record<string, unknown> | undefined;
    const items = Array.isArray(body?.personas)
      ? body.personas
      : Array.isArray(body)
        ? body
        : null;
    if (!items || items.length === 0) {
      reply.code(400);
      return { error: 'Payload tidak valid: diharapkan daftar personas' };
    }

    let importedCount = 0;
    for (const item of items) {
      if (
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).name === 'string'
      ) {
        const raw = item as Record<string, unknown>;
        const persona: Persona = {
          id: String(raw.id),
          name: String(raw.name),
          language: typeof raw.language === 'string' ? raw.language : 'id',
          style: typeof raw.style === 'string' ? raw.style : 'jutek',
          forbiddenTopics: Array.isArray(raw.forbiddenTopics) ? (raw.forbiddenTopics as string[]) : [],
          typingDelay: ['natural', 'fast', 'slow'].includes(raw.typingDelay as string)
            ? (raw.typingDelay as 'natural' | 'fast' | 'slow')
            : 'natural',
          greeting: typeof raw.greeting === 'string' ? raw.greeting : undefined,
          examples: Array.isArray(raw.examples) ? (raw.examples as Array<{ user: string; bot: string }>) : [],
          extraInstructions: typeof raw.extraInstructions === 'string' ? raw.extraInstructions : undefined,
          model: typeof raw.model === 'object' && raw.model !== null ? (raw.model as { temperature?: number; maxTokens?: number }) : undefined,
        };
        context.stores.personas.upsert(persona);
        importedCount += 1;
      }
    }

    return { ok: true, imported: importedCount };
  });

  app.post('/api/personas', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const parsed = personaUpsertSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Data persona tidak valid.' });
    }
    const persona: Persona = {
      ...parsed.data,
      examples: [],
    };
    context.stores.personas.upsert(persona);
    return { ok: true, persona };
  });

  app.put('/api/personas/:id', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { id?: string };
    const id = params.id;
    if (!id) return reply.code(400).send({ error: 'ID persona wajib diisi.' });

    const existing = context.stores.personas.get(id);
    if (!existing) return reply.code(404).send({ error: 'Persona tidak ditemukan.' });

    const body = request.body as Record<string, unknown>;
    const updated: Persona = {
      ...existing,
      name: typeof body.name === 'string' && body.name ? body.name : existing.name,
      style: typeof body.style === 'string' && body.style ? body.style : existing.style,
      language: typeof body.language === 'string' && body.language ? body.language : existing.language,
      typingDelay: ['natural', 'fast', 'slow'].includes(body.typingDelay as string)
        ? (body.typingDelay as any)
        : existing.typingDelay,
      greeting: typeof body.greeting === 'string' ? body.greeting : existing.greeting,
      forbiddenTopics: Array.isArray(body.forbiddenTopics) ? (body.forbiddenTopics as string[]) : existing.forbiddenTopics,
      extraInstructions: typeof body.extraInstructions === 'string' ? body.extraInstructions : existing.extraInstructions,
    };

    context.stores.personas.upsert(updated);
    return { ok: true, persona: updated };
  });

  app.delete('/api/personas/:id', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { id?: string };
    const id = params.id;
    if (!id) return reply.code(400).send({ error: 'ID persona wajib diisi.' });

    const active = context.stores.personas.getActive();
    if (active?.id === id) {
      return reply.code(400).send({ error: 'Tidak dapat menghapus persona yang sedang aktif. Aktifkan persona lain terlebih dahulu.' });
    }

    if (context.stores.personas.delete) {
      const ok = context.stores.personas.delete(id);
      return { ok, id };
    }
    return reply.code(501).send({ error: 'Store tidak mendukung penghapusan persona.' });
  });

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

  app.get('/api/audit/export', async (request, reply) => {
    const query = request.query as Record<string, unknown> | undefined;
    const format = query?.format === 'csv' ? 'csv' : 'json';
    const limit = typeof query?.limit === 'string' ? parseInt(query.limit, 10) : 500;
    const entries = context.stores.audit.list(isNaN(limit) ? 500 : Math.min(limit, 5000));

    if (format === 'csv') {
      const escapeCsv = (val: unknown) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = ['id', 'createdAt', 'datetime', 'actorJid', 'action', 'params', 'result'];
      const rows = entries.map((e) =>
        [
          escapeCsv(e.id),
          escapeCsv(e.createdAt),
          escapeCsv(new Date(e.createdAt || Date.now()).toISOString()),
          escapeCsv(e.actorJid ?? 'sistem'),
          escapeCsv(e.action),
          escapeCsv(typeof e.params === 'object' && e.params !== null ? JSON.stringify(e.params) : e.params ?? ''),
          escapeCsv(typeof e.result === 'object' && e.result !== null ? JSON.stringify(e.result) : e.result ?? ''),
        ].join(','),
      );

      const csvContent = [headers.join(','), ...rows].join('\n');
      reply.header('Content-Type', 'text/csv; charset=utf-8');
      reply.header('Content-Disposition', 'attachment; filename="arkzormd-audit.csv"');
      return reply.send(csvContent);
    }

    reply.header('Content-Type', 'application/json');
    reply.header('Content-Disposition', 'attachment; filename="arkzormd-audit.json"');
    return {
      exportedAt: new Date().toISOString(),
      count: entries.length,
      entries,
    };
  });

  app.get('/api/settings', async () => {
    const aiProvider = context.stores.settings.get('ai_provider') || context.config.aiProvider;
    const aiEnabled = context.stores.settings.getBoolean('ai_enabled', aiProvider !== 'none' && aiProvider !== 'mock');
    const aiModel = context.stores.settings.get('ai_model') || context.config.aiModel;
    const aiBaseUrl = context.stores.settings.get('ai_base_url') || (aiProvider === 'gemini' ? context.config.geminiBaseUrl : context.config.openaiBaseUrl);
    const selfControl = context.stores.settings.getBoolean('self_control', true);
    const hasApiKey = Boolean(
      context.stores.settings.get('ai_api_key') ||
      (aiProvider === 'gemini' ? context.config.geminiApiKey : context.config.openaiApiKey) ||
      aiProvider === '9router' ||
      aiProvider === 'ollama' ||
      aiProvider === 'mock'
    );

    return {
      prefix: context.stores.settings.get('prefix') || context.config.prefix,
      accessMode: context.stores.settings.get('access_mode') || context.config.accessMode,
      defaultChatMode: context.stores.settings.get('default_chat_mode') || context.config.defaultChatMode,
      killSwitch: context.stores.settings.getBoolean('kill_switch'),
      selfControl,
      rateLimitPerMinute: context.stores.settings.getNumber('rate_limit_per_minute', 12),
      aiEnabled,
      aiProvider,
      aiModel,
      aiBaseUrl,
      aiFallbackModel: context.config.aiFallbackModel,
      aiTimeoutMs: context.config.aiTimeoutMs,
      hasApiKey,
      jitterDelayMs: context.stores.settings.getNumber('jitter_delay_ms', 1200),
      autoRead: context.stores.settings.getBoolean('auto_read', true),
      whatsappMode: context.config.whatsappMode,
    };
  });

  app.post('/api/settings', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const body = request.body as Record<string, unknown> | undefined;
    if (!body) return reply.code(400).send({ error: 'Body tidak boleh kosong.' });

    if (typeof body.prefix === 'string' && body.prefix) {
      context.stores.settings.set('prefix', body.prefix);
    }
    if (typeof body.accessMode === 'string' && ['closed', 'auto_member', 'approval'].includes(body.accessMode)) {
      context.stores.settings.set('access_mode', body.accessMode);
    }
    if (typeof body.defaultChatMode === 'string' && ['off', 'mention', 'active'].includes(body.defaultChatMode)) {
      context.stores.settings.set('default_chat_mode', body.defaultChatMode);
    }
    if (typeof body.selfControl === 'boolean') {
      context.stores.settings.set('self_control', String(body.selfControl));
      (context.adapter as any)?.setAllowSelfControl?.(body.selfControl);
    }
    if (typeof body.rateLimitPerMinute === 'number' && body.rateLimitPerMinute > 0) {
      context.stores.settings.set('rate_limit_per_minute', String(body.rateLimitPerMinute));
    }
    if (typeof body.jitterDelayMs === 'number' && body.jitterDelayMs >= 0) {
      context.stores.settings.set('jitter_delay_ms', String(body.jitterDelayMs));
      (context.adapter as any)?.setJitterDelayMs?.(body.jitterDelayMs);
    }
    if (typeof body.autoRead === 'boolean') {
      context.stores.settings.set('auto_read', String(body.autoRead));
      (context.adapter as any)?.setAutoRead?.(body.autoRead);
    }
    if (typeof body.aiEnabled === 'boolean') {
      context.stores.settings.set('ai_enabled', String(body.aiEnabled));
    }

    let reloadAi = false;
    if (typeof body.aiProvider === 'string') {
      context.stores.settings.set('ai_provider', body.aiProvider);
      if (body.aiProvider === 'none') {
        context.stores.settings.set('ai_enabled', 'false');
      }
      reloadAi = true;
    }
    if (typeof body.aiModel === 'string' && body.aiModel) {
      context.stores.settings.set('ai_model', body.aiModel);
      reloadAi = true;
    }
    if (typeof body.aiBaseUrl === 'string' && body.aiBaseUrl) {
      context.stores.settings.set('ai_base_url', body.aiBaseUrl);
      reloadAi = true;
    }
    if (typeof body.aiApiKey === 'string') {
      context.stores.settings.set('ai_api_key', body.aiApiKey.trim());
      reloadAi = true;
    }

    if (reloadAi) {
      const provider = context.stores.settings.get('ai_provider') || context.config.aiProvider;
      if (provider === 'none') {
        context.aiProviderId = 'none';
      } else {
        const model = context.stores.settings.get('ai_model') || context.config.aiModel;
        const baseUrl = context.stores.settings.get('ai_base_url') || undefined;
        const apiKey = context.stores.settings.get('ai_api_key') ||
          (provider === 'gemini' ? context.config.geminiApiKey : context.config.openaiApiKey);

        try {
          const newProvider = createDynamicAiProvider({
            provider,
            model,
            baseUrl,
            apiKey,
            fallbackModel: context.config.aiFallbackModel,
            timeoutMs: context.config.aiTimeoutMs,
            logger: context.logger,
          });
          context.bot.updateAiProvider(newProvider);
          context.aiProviderId = newProvider.id;
        } catch (err) {
          context.logger.error({ err }, 'Gagal reload AI provider');
        }
      }
    }

    context.stores.audit.append({
      actorJid: context.config.ownerJid,
      action: 'settings.updated',
      params: { via: 'web_ui' },
      result: { success: true },
      createdAt: Date.now(),
    });

    return { ok: true, message: 'Pengaturan berhasil disimpan & diterapkan.' };
  });

  app.post('/api/settings/test-ai', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const body = (request.body as Record<string, unknown> | undefined) ?? {};
    const provider = String(body.aiProvider || context.stores.settings.get('ai_provider') || context.config.aiProvider);
    const model = String(body.aiModel || context.stores.settings.get('ai_model') || context.config.aiModel);
    const baseUrl = String(body.aiBaseUrl || context.stores.settings.get('ai_base_url') || (provider === 'gemini' ? context.config.geminiBaseUrl : context.config.openaiBaseUrl));
    const apiKey = typeof body.aiApiKey === 'string' && body.aiApiKey.trim()
      ? body.aiApiKey.trim()
      : context.stores.settings.get('ai_api_key') || (provider === 'gemini' ? context.config.geminiApiKey : context.config.openaiApiKey);

    const startTime = Date.now();
    try {
      const testProvider = createDynamicAiProvider({
        provider,
        model,
        baseUrl,
        apiKey,
        timeoutMs: 15_000,
        logger: context.logger,
      });

      const res = await testProvider.complete({
        messages: [{ role: 'user', content: 'Halo, konfirmasi koneksi API berhasil dalam 3 kata.' }],
        tools: [],
      });

      const latencyMs = Date.now() - startTime;
      return {
        ok: true,
        latencyMs,
        provider,
        model,
        reply: res.text || 'Koneksi berhasil',
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(400).send({
        ok: false,
        latencyMs,
        error: `Tes AI gagal: ${msg}`,
      });
    }
  });

  app.post('/api/settings/fetch-models', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const body = (request.body as Record<string, unknown> | undefined) ?? {};
    const provider = String(body.provider || context.stores.settings.get('ai_provider') || context.config.aiProvider);
    const baseUrl = String(body.baseUrl || context.stores.settings.get('ai_base_url') || (provider === 'gemini' ? context.config.geminiBaseUrl : context.config.openaiBaseUrl));
    const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim()
      ? body.apiKey.trim()
      : context.stores.settings.get('ai_api_key') || (provider === 'gemini' ? context.config.geminiApiKey : context.config.openaiApiKey);

    try {
      let models: string[] = [];
      if (provider === 'gemini') {
        if (!apiKey) {
          return reply.code(400).send({ ok: false, error: 'API key Gemini wajib diisi untuk mengambil daftar model.' });
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, { headers: { 'User-Agent': `ArKzorMD/${APP_VERSION}` } });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Gemini API error (${res.status}): ${text.slice(0, 150)}`);
        }
        const json = (await res.json()) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
        models = (json.models || [])
          .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent'))
          .map((m) => (m.name || '').replace(/^models\//, ''))
          .filter(Boolean);
      } else if (provider === 'mock') {
        models = ['mock-echo', 'mock-chat', 'mock-reasoning'];
      } else {
        const cleanBase = baseUrl.replace(/\/+$/, '');
        const modelsUrl = cleanBase.endsWith('/v1') ? `${cleanBase}/models` : `${cleanBase}/v1/models`;
        const headers: Record<string, string> = {
          'User-Agent': `ArKzorMD/${APP_VERSION}`,
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }
        let res = await fetch(modelsUrl, { headers });
        if (!res.ok) {
          res = await fetch(`${cleanBase}/models`, { headers });
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`API error (${res.status}): ${text.slice(0, 150)}`);
        }
        const json = (await res.json()) as { data?: Array<{ id?: string }>; models?: Array<{ name?: string }> };
        if (Array.isArray(json.data)) {
          models = json.data.map((d) => d.id || '').filter(Boolean);
        } else if (Array.isArray(json.models)) {
          models = json.models.map((m) => m.name || '').filter(Boolean);
        }
      }

      models.sort((a, b) => a.localeCompare(b));
      return { ok: true, provider, count: models.length, models };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(400).send({ ok: false, error: `Gagal mengambil daftar model: ${msg}` });
    }
  });

  app.post('/api/settings/reset-data', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const body = request.body as { target?: string } | undefined;
    const target = body?.target;

    if (target === 'memory') {
      context.stores.memory.clearAll?.();
      return { ok: true, message: 'Seluruh catatan memori bot berhasil dihapus.' };
    }

    if (target === 'audit') {
      context.stores.audit.clearAll?.();
      return { ok: true, message: 'Seluruh riwayat audit log berhasil dibersihkan.' };
    }

    if (target === 'factory_reset') {
      context.stores.memory.clearAll?.();
      context.stores.audit.clearAll?.();
      context.stores.settings.set('setup_completed', 'false');
      return { ok: true, message: 'Data dan status setup berhasil di-reset ke kondisi awal.' };
    }

    return reply.code(400).send({ error: 'Target reset tidak valid: pilih memory, audit, atau factory_reset.' });
  });

  app.post('/api/settings/kill-switch', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const body = request.body as { enabled?: boolean } | undefined;
    const enabled = Boolean(body?.enabled);
    context.stores.settings.set('kill_switch', String(enabled));
    context.stores.audit.append({
      actorJid: context.config.ownerJid,
      action: enabled ? 'killswitch.enabled' : 'killswitch.disabled',
      params: { via: 'web_ui' },
      result: { enabled },
      createdAt: Date.now(),
    });
    return { ok: true, killSwitch: enabled };
  });

  app.get('/api/memory', async (request) => {
    const query = request.query as { jid?: string; limit?: string } | undefined;
    if (query?.jid) {
      return { notes: context.stores.memory.list(query.jid) };
    }
    const limit = query?.limit ? Math.min(200, Math.max(1, Number(query.limit))) : 100;
    const notes = context.stores.memory.listAll ? context.stores.memory.listAll(limit) : [];
    return { notes };
  });

  app.delete('/api/memory/:id', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { id?: string };
    const id = Number(params.id);
    if (isNaN(id)) return reply.code(400).send({ error: 'ID catatan tidak valid.' });
    const ok = context.stores.memory.delete(id);
    return { ok, id };
  });

  app.post('/api/personas/:id/activate', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { id?: string };
    const id = params.id;
    if (!id) return reply.code(400).send({ error: 'ID persona wajib diisi.' });
    context.stores.personas.activate(id);
    return { ok: true, activePersona: id };
  });

  app.post('/api/users/:jid/role', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { jid?: string };
    const body = request.body as { role?: string } | undefined;
    const jid = params.jid;
    const role = body?.role;
    if (!jid || !['owner', 'admin', 'member'].includes(role ?? '')) {
      return reply.code(400).send({ error: 'JID dan role (owner|admin|member) wajib diisi.' });
    }
    const existing = context.stores.users.get(jid);
    context.stores.users.upsert({
      jid,
      name: existing?.name ?? null,
      role: role as any,
      status: existing?.status ?? 'active',
    });
    return { ok: true, jid, role };
  });

  app.post('/api/users', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const body = request.body as { phoneOrJid?: string; name?: string; role?: string } | undefined;
    const raw = body?.phoneOrJid?.trim();
    if (!raw) {
      return reply.code(400).send({ error: 'Nomor telepon atau JID pengguna wajib diisi.' });
    }

    let jid = raw;
    if (!jid.includes('@')) {
      let digits = raw.replace(/\D/g, '');
      if (digits.startsWith('0')) {
        digits = '62' + digits.slice(1);
      }
      if (digits.length < 8 || digits.length > 16) {
        return reply.code(400).send({ error: 'Nomor telepon tidak valid.' });
      }
      jid = `${digits}@s.whatsapp.net`;
    }

    const role = (['owner', 'admin', 'member'].includes(body?.role ?? '') ? body?.role : 'member') as Role;
    const name = body?.name?.trim() || null;

    const user = context.stores.users.upsert({
      jid,
      name,
      role,
      status: 'active',
    });

    context.stores.audit.append({
      actorJid: context.config.ownerJid,
      action: 'user.created',
      params: { jid, name, role },
      result: { success: true },
      createdAt: Date.now(),
    });

    return { ok: true, user };
  });

  app.post('/api/users/:jid/status', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { jid?: string };
    const body = request.body as { status?: string } | undefined;
    const jid = params.jid;
    const status = body?.status;
    if (!jid || !['active', 'blocked'].includes(status ?? '')) {
      return reply.code(400).send({ error: 'JID dan status (active|blocked) wajib diisi.' });
    }
    context.stores.users.setStatus(jid, status as any);
    return { ok: true, jid, status };
  });

  app.delete('/api/users/:jid', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { jid?: string };
    const jid = params.jid;
    if (!jid) return reply.code(400).send({ error: 'JID pengguna wajib diisi.' });

    if (jid === context.config.ownerJid) {
      return reply.code(400).send({ error: 'Tidak dapat menghapus Owner utama sistem.' });
    }

    if (context.stores.users.delete) {
      const ok = context.stores.users.delete(jid);
      context.stores.audit.append({
        actorJid: context.config.ownerJid,
        action: 'user.deleted',
        params: { jid },
        result: { ok },
        createdAt: Date.now(),
      });
      return { ok, jid };
    }
    return reply.code(501).send({ error: 'Store tidak mendukung penghapusan user.' });
  });

  app.post('/api/playground/chat', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const body = request.body as {
      text?: string;
      personaId?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    } | undefined;

    const text = body?.text?.trim();
    if (!text) {
      return reply.code(400).send({ error: 'Pesan chat wajib diisi.' });
    }

    try {
      const result = await context.bot.runPlaygroundChat({
        text,
        personaId: body?.personaId,
        history: body?.history,
      });
      return { ok: true, ...result };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: `AI Playground error: ${msg}` });
    }
  });

  app.get('/api/groups', async () => {
    const chats = context.stores.chats.list().filter((c) => c.type === 'group');
    const groups = chats.map((chat) => ({
      chatId: chat.id,
      mode: chat.mode,
      personaId: context.stores.personas.getAssignment?.('group', chat.id) ?? null,
      updatedAt: chat.updatedAt,
    }));
    return { groups };
  });

  app.post('/api/groups/:id/mode', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { id?: string };
    const body = request.body as { mode?: string } | undefined;
    const mode = body?.mode;
    if (!params.id || !['off', 'mention', 'active'].includes(mode ?? '')) {
      return reply.code(400).send({ error: 'Chat ID dan mode (off|mention|active) wajib diisi.' });
    }
    const updated = context.stores.chats.setMode({
      chatId: params.id,
      platform: 'whatsapp',
      type: 'group',
      mode: mode as any,
    });
    return { ok: true, group: updated };
  });

  app.post('/api/groups/:id/persona', async (request, reply) => {
    if (!requireAdmin(context, request, reply)) return reply;
    const params = request.params as { id?: string };
    const body = request.body as { personaId?: string | null } | undefined;
    if (!params.id) {
      return reply.code(400).send({ error: 'Chat ID wajib diisi.' });
    }
    context.stores.personas.setAssignment?.('group', params.id, body?.personaId ?? null);
    return { ok: true, chatId: params.id, personaId: body?.personaId ?? null };
  });

  const checkAccess = (request: FastifyRequest, reply: FastifyReply): boolean => {
    if (!isSetupCompleted(context)) {
      return true;
    }
    return requireAdmin(context, request, reply);
  };

  app.post('/api/whatsapp/connect', async (request, reply) => {
    if (!checkAccess(request, reply)) return reply;
    if (context.config.whatsappMode === 'off') {
      return reply.code(400).send({ error: 'WhatsApp dimatikan lewat WHATSAPP_MODE=off.' });
    }
    const currentStatus = context.adapter.getStatus();
    if (currentStatus === 'connected') {
      return { ok: true, status: 'connected', message: 'WhatsApp sudah terhubung.' };
    }
    try {
      void context.adapter.connect().catch((err: unknown) => {
        context.logger.error({ err }, 'Koneksi WhatsApp manual gagal');
      });
      return {
        ok: true,
        status: context.adapter.getStatus(),
        qr: context.adapter.getQr?.() ?? null,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({ error: `Gagal memulai koneksi WhatsApp: ${msg}` });
    }
  });

  app.post('/api/whatsapp/disconnect', async (request, reply) => {
    if (!checkAccess(request, reply)) return reply;
    try {
      await context.adapter.disconnect();
      return { ok: true, status: context.adapter.getStatus() };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({ error: `Gagal memutuskan WhatsApp: ${msg}` });
    }
  });

  app.post('/api/whatsapp/pairing-code', async (request, reply) => {
    if (!checkAccess(request, reply)) return reply;
    const body = request.body as { phoneNumber?: string } | undefined;
    let phone = body?.phoneNumber?.trim();
    if (!phone) {
      return reply.code(400).send({ error: 'Nomor telepon wajib diisi.' });
    }
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1);
    }
    if (phone.length < 8 || phone.length > 15) {
      return reply.code(400).send({
        error: 'Nomor telepon harus dalam format internasional yang valid seperti 628123456789.',
      });
    }
    if (!context.adapter.requestPairingCode) {
      return reply.code(501).send({ error: 'Adapter platform saat ini tidak mendukung pairing code.' });
    }
    try {
      const code = await context.adapter.requestPairingCode(phone);
      return { ok: true, code };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return reply.code(500).send({ error: `Gagal meminta pairing code: ${msg}` });
    }
  });

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
