import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { createAppContext } from '../bootstrap.js';

describe('Server API & Auth Routes', () => {
  it('manages setup wizard, admin password, and session token', async () => {
    const context = await createAppContext({
      port: 3000,
      host: '127.0.0.1',
      nodeEnv: 'test',
      logLevel: 'silent',
      webDist: resolve(process.cwd(), 'apps/web/dist'),
      dataDir: resolve(process.cwd(), 'data'),
      databasePath: ':memory:',
      prefix: '.',
      botNames: ['Arka'],
      ownerJid: '6281111111111@s.whatsapp.net',
      accessMode: 'closed',
      defaultChatMode: 'mention',
      whatsappMode: 'mock',
      whatsappAutoconnect: false,
      whatsappModule: 'onigis',
      aiProvider: 'mock',
      aiModel: 'mock',
      aiFallbackModel: null,
      aiTimeoutMs: 10000,
      adminToken: null,
      openaiApiKey: null,
      openaiBaseUrl: 'https://api.openai.com/v1',
      geminiApiKey: null,
      geminiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    });

    const app = await buildApp(context);

    // 1. Initial auth status
    const statusRes = await app.inject({
      method: 'GET',
      url: '/api/auth/status',
    });
    expect(statusRes.statusCode).toBe(200);
    const statusBody = JSON.parse(statusRes.payload);
    expect(statusBody.needsSetup).toBe(true);
    expect(statusBody.authenticated).toBe(false);

    // 2. Setup admin password
    const setupRes = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { password: 'short' }, // too short
    });
    expect(setupRes.statusCode).toBe(400);

    const validSetupRes = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { password: 'mySecurePassword123' },
    });
    expect(validSetupRes.statusCode).toBe(200);
    const validSetupBody = JSON.parse(validSetupRes.payload);
    expect(validSetupBody.ok).toBe(true);
    expect(validSetupBody.token).toBeDefined();
    const sessionToken = validSetupBody.token;

    // 3. Status now indicates setup completed
    const statusAfterRes = await app.inject({
      method: 'GET',
      url: '/api/auth/status',
      headers: { 'x-session-token': sessionToken },
    });
    const statusAfterBody = JSON.parse(statusAfterRes.payload);
    expect(statusAfterBody.needsSetup).toBe(false);
    expect(statusAfterBody.setupCompleted).toBe(true);
    expect(statusAfterBody.authenticated).toBe(true);

    // 4. Protected kill switch action with session token
    const killSwitchRes = await app.inject({
      method: 'POST',
      url: '/api/settings/kill-switch',
      headers: { 'x-session-token': sessionToken },
      payload: { enabled: true },
    });
    expect(killSwitchRes.statusCode).toBe(200);
    expect(context.stores.settings.getBoolean('kill_switch')).toBe(true);

    // Protected action without token should fail with 401
    const unauthedRes = await app.inject({
      method: 'POST',
      url: '/api/settings/kill-switch',
      payload: { enabled: false },
    });
    expect(unauthedRes.statusCode).toBe(401);

    // 5. WhatsApp Connect, Disconnect & Pairing Code via API
    const connectRes = await app.inject({
      method: 'POST',
      url: '/api/whatsapp/connect',
      headers: { 'x-session-token': sessionToken },
    });
    expect(connectRes.statusCode).toBe(200);

    const disconnectRes = await app.inject({
      method: 'POST',
      url: '/api/whatsapp/disconnect',
      headers: { 'x-session-token': sessionToken },
    });
    expect(disconnectRes.statusCode).toBe(200);

    const pairingRes = await app.inject({
      method: 'POST',
      url: '/api/whatsapp/pairing-code',
      headers: { 'x-session-token': sessionToken },
      payload: { phoneNumber: '08123456789' }, // uji auto-convert 0 -> 62
    });
    expect(pairingRes.statusCode).toBe(200);
    const pairingBody = JSON.parse(pairingRes.payload);
    expect(pairingBody.ok).toBe(true);
    expect(pairingBody.code).toBe('1234-5678');

    // 6. Owner code generation & verification
    const reqCodeRes = await app.inject({
      method: 'POST',
      url: '/api/setup/owner/request-code',
      headers: { 'x-session-token': sessionToken },
      payload: { phoneNumber: '62899998888' },
    });
    expect(reqCodeRes.statusCode).toBe(200);
    const reqCodeBody = JSON.parse(reqCodeRes.payload);
    expect(reqCodeBody.code).toBeDefined();

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/setup/owner/verify',
      headers: { 'x-session-token': sessionToken },
      payload: { phoneNumber: '62899998888', code: reqCodeBody.code },
    });
    expect(verifyRes.statusCode).toBe(200);
    const ownerUser = context.stores.users.get('62899998888@s.whatsapp.net');
    expect(ownerUser?.role).toBe('owner');

    // 7. Group management endpoints
    context.stores.chats.setMode({
      chatId: '120363000000000000@g.us',
      platform: 'whatsapp',
      type: 'group',
      mode: 'mention',
    });

    const groupsRes = await app.inject({
      method: 'GET',
      url: '/api/groups',
    });
    expect(groupsRes.statusCode).toBe(200);
    const groupsBody = JSON.parse(groupsRes.payload);
    expect(groupsBody.groups.length).toBe(1);
    expect(groupsBody.groups[0].chatId).toBe('120363000000000000@g.us');

    const updateModeRes = await app.inject({
      method: 'POST',
      url: '/api/groups/120363000000000000@g.us/mode',
      headers: { 'x-session-token': sessionToken },
      payload: { mode: 'active' },
    });
    expect(updateModeRes.statusCode).toBe(200);
    expect(context.stores.chats.get('120363000000000000@g.us')?.mode).toBe('active');

    // 8. Persona export & import
    const exportPersonaRes = await app.inject({
      method: 'GET',
      url: '/api/personas/export',
    });
    expect(exportPersonaRes.statusCode).toBe(200);
    expect(exportPersonaRes.headers['content-type']).toContain('application/json');
    const exportData = JSON.parse(exportPersonaRes.payload);
    expect(Array.isArray(exportData.personas)).toBe(true);

    const importPersonaRes = await app.inject({
      method: 'POST',
      url: '/api/personas/import',
      payload: {
        personas: [
          {
            id: 'custom_persona',
            name: 'Custom Persona',
            language: 'id',
            style: 'santai dan ramah',
            forbiddenTopics: [],
            typingDelay: 'fast',
            examples: [],
          },
        ],
      },
    });
    expect(importPersonaRes.statusCode).toBe(200);
    expect(context.stores.personas.get('custom_persona')?.name).toBe('Custom Persona');

    // 9. Audit export (CSV and JSON)
    const exportAuditCsvRes = await app.inject({
      method: 'GET',
      url: '/api/audit/export?format=csv',
    });
    expect(exportAuditCsvRes.statusCode).toBe(200);
    expect(exportAuditCsvRes.headers['content-type']).toContain('text/csv');
    expect(exportAuditCsvRes.payload).toContain('id,createdAt,datetime,actorJid,action');

    const exportAuditJsonRes = await app.inject({
      method: 'GET',
      url: '/api/audit/export?format=json',
    });
    expect(exportAuditJsonRes.statusCode).toBe(200);
    expect(exportAuditJsonRes.headers['content-type']).toContain('application/json');
    const auditJson = JSON.parse(exportAuditJsonRes.payload);
    expect(Array.isArray(auditJson.entries)).toBe(true);
  });
});
