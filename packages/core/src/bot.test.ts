import { afterEach, describe, expect, it } from 'vitest';
import { AgentOrchestrator } from './agent/agent.js';
import { AiProviderError, MockProvider, type AiProvider } from './agent/provider.js';
import { AuditLog } from './audit/audit-log.js';
import { Bot } from './bot.js';
import { openDatabase } from './db/index.js';
import { createStores } from './db/sqlite-stores.js';
import { Humanizer } from './humanizer/humanizer.js';
import { RateLimiter } from './rate-limit/rate-limiter.js';
import { createLogger } from './logger.js';
import { createDefaultCommands } from './router/commands.js';
import { CommandRegistry } from './router/command-registry.js';
import { MessageRouter } from './router/router.js';
import { ApprovalEngine } from './security/approval-engine.js';
import { PermissionEngine } from './security/permission-engine.js';
import { MockAdapter } from './testing/mock-adapter.js';
import { createBuiltinTools } from './tools/builtin.js';
import { ToolRegistry } from './tools/registry.js';
import type { InternalMessage } from './types.js';

const OWNER = '6281111111111@s.whatsapp.net';
const ADMIN = '6282222222222@s.whatsapp.net';
const MEMBER = '6283333333333@s.whatsapp.net';

function createHarness(provider: AiProvider = new MockProvider()) {
  const db = openDatabase(':memory:');
  const stores = createStores(db);
  const logger = createLogger({ level: 'silent' });
  const adapter = new MockAdapter('whatsapp');
  const audit = new AuditLog(stores.audit);

  stores.users.upsert({ jid: OWNER, role: 'owner', status: 'active' });
  stores.users.upsert({ jid: ADMIN, role: 'admin', status: 'active' });
  stores.users.upsert({ jid: MEMBER, role: 'member', status: 'active' });

  const approvals = new ApprovalEngine(stores.approvals, audit, {
    ownerJid: () => OWNER,
  });
  const permissions = new PermissionEngine({
    isKillSwitchOn: () => stores.settings.getBoolean('kill_switch'),
    hasRule: (tool, target) => approvals.matchRule(tool, target),
  });
  const tools = new ToolRegistry();
  tools.registerAll(createBuiltinTools());

  const commands = new CommandRegistry();
  commands.registerAll(createDefaultCommands());

  const agent = new AgentOrchestrator({
    provider,
    adapter,
    tools,
    permissions,
    approvals,
    audit,
  });

  const bot = new Bot({
    adapter,
    config: {
      ownerJid: OWNER,
      accessMode: 'closed',
      defaultChatMode: 'mention',
      botJid: null,
      botNames: ['Arka'],
      commandPrefix: '.',
    },
    router: new MessageRouter('.', commands),
    commands,
    users: stores.users,
    chats: stores.chats,
    messages: stores.messages,
    personas: stores.personas,
    settings: stores.settings,
    permissions,
    approvals,
    tools,
    agent,
    humanizer: new Humanizer({
      minDelayMs: 0,
      maxDelayMs: 0,
      msPerChar: 0,
      jitter: 0,
      sleepFn: async () => undefined,
    }),
    rateLimiter: new RateLimiter({ perChatPerMinute: 100, globalPerMinute: 1000 }),
    audit,
    logger,
    aiProviderId: provider.id,
  });

  return { db, stores, adapter, audit, approvals, bot };
}

function message(overrides: Partial<InternalMessage> = {}): InternalMessage {
  return {
    id: `msg-${Math.random().toString(16).slice(2, 8)}`,
    platform: 'whatsapp',
    chatId: MEMBER,
    chatType: 'private',
    senderId: MEMBER,
    senderName: 'Member',
    isGroup: false,
    text: 'halo',
    media: [],
    mentions: [],
    timestamp: Date.now(),
    fromBot: false,
    ...overrides,
  };
}

let cleanup: (() => void) | null = null;

afterEach(() => {
  cleanup?.();
  cleanup = null;
});

describe('Bot pipeline (mock end-to-end)', () => {
  it('membalas pesan biasa lewat AI agent', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    await harness.adapter.receive(message({ text: 'halo' }));

    expect(harness.adapter.sent).toHaveLength(1);
    expect(harness.adapter.sent[0]?.content.text).toContain('Halo');
  });

  it('Admin memicu approval L1 lalu eksekusi setelah disetujui Owner', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    await harness.adapter.receive(
      message({
        senderId: ADMIN,
        senderName: 'Admin',
        text: 'kirim pesan ke 081234567890: rapat jam 3',
      }),
    );

    expect(harness.adapter.approvals).toHaveLength(1);
    const approval = harness.adapter.approvals[0]?.request;
    expect(approval?.toolName).toBe('send_message');
    expect(approval?.params.to).toBe('081234567890');
    expect(
      harness.adapter.sent.some((record) =>
        record.content.text?.includes('Tunggu persetujuan'),
      ),
    ).toBe(true);

    const result = await harness.bot.decideApproval({
      shortCode: approval?.shortCode ?? '',
      actorJid: OWNER,
      decision: 'approve',
    });

    expect(result.ok).toBe(true);
    expect(result.request?.status).toBe('approved');
    expect(
      harness.adapter.sent.some(
        (record) =>
          record.chatId === '6281234567890@s.whatsapp.net' &&
          record.content.text === 'rapat jam 3',
      ),
    ).toBe(true);
    expect(
      harness.adapter.sent.some((record) => record.content.text?.includes('disetujui Owner')),
    ).toBe(true);

    const actions = harness.audit.list(50).map((entry) => entry.action);
    expect(actions).toContain('approval.requested');
    expect(actions).toContain('tool.executed_via_approval');
  });

  it('Owner bisa menyetujui approval lewat command .approve di WhatsApp', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    await harness.adapter.receive(
      message({
        senderId: ADMIN,
        senderName: 'Admin',
        text: 'kirim pesan ke 081234567890: rapat jam 4',
      }),
    );

    const approval = harness.adapter.approvals[0]?.request;
    expect(approval).toBeDefined();

    await harness.adapter.receive(
      message({
        senderId: OWNER,
        senderName: 'Owner',
        chatId: OWNER,
        text: `.approve ${approval?.shortCode ?? ''}`,
      }),
    );

    expect(harness.stores.approvals.get(approval?.id ?? '')?.status).toBe('approved');
    expect(
      harness.adapter.sent.some(
        (record) =>
          record.chatId === '6281234567890@s.whatsapp.net' &&
          record.content.text === 'rapat jam 4',
      ),
    ).toBe(true);
    expect(
      harness.adapter.sent.some((record) => record.content.text?.includes('disetujui')),
    ).toBe(true);

    const actions = harness.audit.list(50).map((entry) => entry.action);
    expect(actions).toContain('command.executed');
    expect(actions).toContain('approval.decided');
  });

  it('kill switch memblokir aksi L1 Admin', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();
    harness.stores.settings.set('kill_switch', 'true');

    await harness.adapter.receive(
      message({
        senderId: ADMIN,
        senderName: 'Admin',
        text: 'kirim pesan ke 081234567890: halo',
      }),
    );

    expect(harness.adapter.approvals).toHaveLength(0);
    const actions = harness.audit.list(50).map((entry) => entry.action);
    expect(actions).toContain('tool.denied');
  });

  it('menghormati mode grup mention', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    await harness.adapter.receive(
      message({
        chatId: '120363000000000000@g.us',
        chatType: 'group',
        isGroup: true,
        text: 'halo semuanya',
      }),
    );
    expect(harness.adapter.sent).toHaveLength(0);

    await harness.adapter.receive(
      message({
        chatId: '120363000000000000@g.us',
        chatType: 'group',
        isGroup: true,
        text: 'Arka, halo',
      }),
    );
    expect(harness.adapter.sent).toHaveLength(1);
  });

  it('menjalankan command .menu sesuai role dan .stop khusus Owner', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    await harness.adapter.receive(message({ text: '.menu' }));
    expect(harness.adapter.sent[0]?.content.text).toContain('Menu');
    expect(harness.adapter.sent[0]?.content.text).toContain('.menu');

    await harness.adapter.receive(message({ text: '.stop' }));
    expect(harness.stores.settings.getBoolean('kill_switch')).toBe(false);

    await harness.adapter.receive(message({ senderId: OWNER, text: '.stop' }));
    expect(harness.stores.settings.getBoolean('kill_switch')).toBe(true);
  });

  it('mengirim pesan ramah bila provider AI gagal total', async () => {
    const failingProvider: AiProvider = {
      id: 'openai',
      async complete() {
        throw new AiProviderError('OpenAI mengembalikan HTTP 500.', {
          provider: 'openai',
          model: 'gpt-test',
          status: 500,
          retryable: true,
        });
      },
    };
    const harness = createHarness(failingProvider);
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    await harness.adapter.receive(message({ text: 'halo' }));

    expect(harness.adapter.sent).toHaveLength(1);
    expect(harness.adapter.sent[0]?.content.text).toContain(
      'layanan AI sedang bermasalah',
    );
    const actions = harness.audit.list(50).map((entry) => entry.action);
    expect(actions).toContain('message.processing_failed');
  });

  it('menjalankan perintah .ping di grup tanpa perlu mention saat mode grup mention', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    // Mode grup default adalah 'mention'
    await harness.adapter.receive(
      message({
        chatId: '120363000000000000@g.us',
        isGroup: true,
        text: '.ping',
        mentions: [],
      }),
    );

    expect(harness.adapter.sent).toHaveLength(1);
    expect(harness.adapter.sent[0]?.content.text).toContain('Pong!');
  });

  it('menangani error provider AI pada runPlaygroundChat tanpa melempar exception', async () => {
    const failingProvider: AiProvider = {
      id: 'mock-fail',
      async complete() {
        throw new Error('API Key quota exhausted');
      },
    };
    const harness = createHarness(failingProvider);
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };

    const res = await harness.bot.runPlaygroundChat({
      text: 'halo bot',
    });

    expect(res).toBeDefined();
    expect(res.text).toContain('Gagal memproses respon AI');
    expect(res.text).toContain('API Key quota exhausted');
  });

  it('mengabaikan chat percakapan biasa dan tetap menjalankan perintah saat mode manual atau ai dinonaktifkan', async () => {
    const harness = createHarness();
    cleanup = () => {
      harness.bot.stop();
      harness.db.close();
    };
    await harness.adapter.connect();
    harness.bot.start();

    // Set mode manual (AI dinonaktifkan)
    harness.stores.settings.set('ai_enabled', 'false');

    // Pesan biasa (tanpa prefix) harus diabaikan, tidak ada balasan mock spam
    await harness.adapter.receive(message({ text: 'aku tadi di jalan' }));
    expect(harness.adapter.sent).toHaveLength(0);

    // Perintah manual dengan prefix . tetap berjalan normal
    await harness.adapter.receive(message({ text: '.ping' }));
    expect(harness.adapter.sent).toHaveLength(1);
    expect(harness.adapter.sent[0]?.content.text).toContain('Pong!');
  });
});
