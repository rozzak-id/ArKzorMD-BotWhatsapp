import { randomInt } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import {
  checkAdminPassword,
  extractToken,
  isAuthenticated,
  isSetupCompleted,
  requireAdmin,
  sessionManager,
  setAdminPassword,
} from '../auth.js';

const setupSchema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter.'),
});

const loginSchema = z.object({
  password: z.string().min(1, 'Password wajib diisi.'),
});

const ownerRequestCodeSchema = z.object({
  phoneNumber: z.string().min(8, 'Nomor telepon minimal 8 digit.'),
});

const ownerVerifySchema = z.object({
  phoneNumber: z.string().min(8, 'Nomor telepon minimal 8 digit.'),
  code: z.string().length(6, 'Kode verifikasi harus 6 digit.'),
});

const finalizeSchema = z.object({
  personaId: z.string().optional(),
  accessMode: z.enum(['closed', 'auto_member', 'approval']).optional(),
});

function normalizeJid(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const clean = digits.startsWith('0') ? '62' + digits.slice(1) : digits;
  return `${clean}@s.whatsapp.net`;
}

export function registerAuthRoutes(app: FastifyInstance, context: AppContext): void {
  // Status Auth & Setup
  app.get('/api/auth/status', async (request: FastifyRequest) => {
    const setupDone = isSetupCompleted(context);
    const authed = isAuthenticated(context, request);
    const ownerUsers = context.stores.users.list().filter((u) => u.role === 'owner');
    const hasOwner = Boolean(context.config.ownerJid || ownerUsers.length > 0);

    return {
      needsSetup: !setupDone,
      setupCompleted: setupDone,
      authenticated: authed,
      hasOwner,
      ownerJid: context.config.ownerJid || ownerUsers[0]?.jid || null,
    };
  });

  // Step 1: Set admin password
  app.post('/api/auth/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    if (isSetupCompleted(context)) {
      return reply.code(400).send({ error: 'Setup sudah pernah dilakukan sebelumnya.' });
    }

    const parsed = setupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Password tidak valid.' });
    }

    setAdminPassword(context, parsed.data.password);
    sessionManager.setStore(context.stores.settings);
    const token = sessionManager.createSession();

    context.stores.audit.append({
      actorJid: 'system',
      action: 'admin.password_set',
      params: { via: 'setup_wizard' },
      result: { success: true },
      createdAt: Date.now(),
    });

    return {
      ok: true,
      token,
      message: 'Password admin berhasil dibuat.',
    };
  });

  // Login
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Password wajib diisi.' });
    }

    const { password } = parsed.data;

    // Cek password hash atau static adminToken
    const validByHash = checkAdminPassword(context, password);
    const validByStaticToken = Boolean(
      context.config.adminToken && password === context.config.adminToken,
    );

    if (!validByHash && !validByStaticToken) {
      return reply.code(401).send({ error: 'Password tidak benar.' });
    }

    sessionManager.setStore(context.stores.settings);
    const token = sessionManager.createSession();
    return {
      ok: true,
      token,
    };
  });

  // Logout
  app.post('/api/auth/logout', async (request: FastifyRequest) => {
    const token = extractToken(request);
    if (token) {
      sessionManager.setStore(context.stores.settings);
      sessionManager.revokeSession(token);
    }
    return { ok: true };
  });

  // Step 4: Owner verification code generation
  app.post('/api/setup/owner/request-code', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(context, request, reply)) return reply;

    const parsed = ownerRequestCodeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Nomor telepon tidak valid.' });
    }

    const targetJid = normalizeJid(parsed.data.phoneNumber);
    const code = String(randomInt(100_000, 999_999));

    // Simpan ke settings sementara
    context.stores.settings.set('owner_verification_target', targetJid);
    context.stores.settings.set('owner_verification_code', code);
    context.stores.settings.set('owner_verification_created', String(Date.now()));

    return {
      ok: true,
      targetJid,
      code,
      instruction: `Kirim pesan dengan teks ${code} dari nomor Owner ke bot WhatsApp, atau masukkan kode ini di wizard untuk konfirmasi.`,
    };
  });

  // Step 4: Owner verification confirmation
  app.post('/api/setup/owner/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(context, request, reply)) return reply;

    const parsed = ownerVerifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Input verifikasi tidak valid.' });
    }

    const targetJid = normalizeJid(parsed.data.phoneNumber);
    const expectedTarget = context.stores.settings.get('owner_verification_target');
    const expectedCode = context.stores.settings.get('owner_verification_code');

    if (!expectedCode || !expectedTarget) {
      return reply.code(400).send({ error: 'Belum ada kode verifikasi yang dibuat. Minta kode baru.' });
    }

    if (targetJid !== expectedTarget || parsed.data.code !== expectedCode) {
      return reply.code(400).send({ error: 'Kode verifikasi salah atau nomor telepon tidak cocok.' });
    }

    // Set user sebagai owner
    context.stores.users.upsert({
      jid: targetJid,
      name: 'Owner',
      role: 'owner',
      status: 'active',
    });
    context.stores.settings.set('owner_jid', targetJid);

    // Hapus kode yang sudah dipakai
    context.stores.settings.set('owner_verification_code', '');

    context.stores.audit.append({
      actorJid: targetJid,
      action: 'owner.verified',
      params: { jid: targetJid, via: 'setup_wizard' },
      result: { success: true },
      createdAt: Date.now(),
    });

    return {
      ok: true,
      ownerJid: targetJid,
      message: 'Owner berhasil diverifikasi.',
    };
  });

  // Step 5: Finalize Setup
  app.post('/api/setup/finalize', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(context, request, reply)) return reply;

    const parsed = finalizeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Parameter finalize tidak valid.' });
    }

    const { personaId, accessMode } = parsed.data;

    if (personaId) {
      const persona = context.stores.personas.get(personaId);
      if (persona) {
        context.stores.personas.activate(personaId);
      }
    }

    if (accessMode) {
      context.stores.settings.set('access_mode', accessMode);
    }

    context.stores.settings.set('setup_completed', 'true');

    context.stores.audit.append({
      actorJid: 'system',
      action: 'setup.finalized',
      params: { personaId, accessMode },
      result: { success: true },
      createdAt: Date.now(),
    });

    return {
      ok: true,
      message: 'Setup wizard selesai. Bot siap digunakan.',
    };
  });
}
