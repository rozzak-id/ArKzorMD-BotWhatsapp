import { resolve } from 'node:path';
import {
  AgentOrchestrator,
  ApprovalEngine,
  AuditLog,
  Bot,
  CommandRegistry,
  GeminiProvider,
  Humanizer,
  MessageRouter,
  MockAdapter,
  MockProvider,
  OpenAiProvider,
  PermissionEngine,
  RateLimiter,
  ToolRegistry,
  WhisperAudioTranscriber,
  GeminiAudioTranscriber,
  type AudioTranscriber,
  createBuiltinTools,
  createDefaultCommands,
  createLogger,
  createStores,
  openDatabase,
  type AiProvider,
  type PlatformAdapter,
} from '@arkzormd/core';
import { WhatsAppAdapter } from '@arkzormd/adapter-whatsapp';
import { createPluginCommands } from '@arkzormd/plugin-example-command';
import { createEchoTool } from '@arkzormd/plugin-example-tool';
import type { AppConfig } from './config.js';
import type { AppContext } from './context.js';

function createProvider(
  config: AppConfig,
  logger: AppContext['logger'],
): AiProvider {
  if (config.aiProvider === 'mock') return new MockProvider();

  if (config.aiProvider === 'openai') {
    return new OpenAiProvider({
      apiKey: config.openaiApiKey,
      baseUrl: config.openaiBaseUrl,
      model: config.aiModel,
      fallbackModel: config.aiFallbackModel,
      timeoutMs: config.aiTimeoutMs,
      logger,
    });
  }

  return new GeminiProvider({
    apiKey: config.geminiApiKey,
    baseUrl: config.geminiBaseUrl,
    model: config.aiModel,
    fallbackModel: config.aiFallbackModel,
    timeoutMs: config.aiTimeoutMs,
    logger,
  });
}

function createAdapter(
  config: AppConfig,
  logger: AppContext['logger'],
): { adapter: PlatformAdapter; mock: MockAdapter | null } {
  if (config.whatsappMode === 'live') {
    return {
      adapter: new WhatsAppAdapter({
        authDir: resolve(config.dataDir, 'whatsapp-auth'),
        logger,
        moduleName: config.whatsappModule,
        commandPrefix: config.prefix,
      }),
      mock: null,
    };
  }

  const mock = new MockAdapter('whatsapp');
  return { adapter: mock, mock };
}

/**
 * Merakit seluruh dependensi core + adapter + plugin.
 * Semua keputusan izin tetap di core; server hanya wiring.
 */
export async function createAppContext(config: AppConfig): Promise<AppContext> {
  const logger = createLogger({ level: config.logLevel });
  const db = openDatabase(config.databasePath);
  const stores = createStores(db);

  if (config.ownerJid) {
    const existing = stores.users.get(config.ownerJid);
    stores.users.upsert({
      jid: config.ownerJid,
      name: existing?.name ?? null,
      role: 'owner',
      status: existing?.status ?? 'active',
    });
  }

  stores.settings.set('prefix', config.prefix);
  stores.settings.set('access_mode', config.accessMode);
  stores.settings.set('default_chat_mode', config.defaultChatMode);
  stores.settings.set('ai_provider', config.aiProvider);

  const { adapter, mock } = createAdapter(config, logger);
  if (config.whatsappMode === 'mock' && mock) {
    await mock.connect();
  }

  const audit = new AuditLog(stores.audit);
  const approvals = new ApprovalEngine(stores.approvals, audit, {
    ownerJid: () => config.ownerJid,
  });
  const permissions = new PermissionEngine({
    isKillSwitchOn: () => stores.settings.getBoolean('kill_switch'),
    hasRule: (toolName, target) => approvals.matchRule(toolName, target),
  });

  const tools = new ToolRegistry();
  tools.registerAll(createBuiltinTools());
  tools.register(createEchoTool());

  const commands = new CommandRegistry();
  commands.registerAll(createDefaultCommands());
  commands.registerAll(createPluginCommands());

  const router = new MessageRouter(config.prefix, commands);
  const provider = createProvider(config, logger);

  let transcriber: AudioTranscriber | undefined;
  if (config.openaiApiKey) {
    transcriber = new WhisperAudioTranscriber({
      apiKey: config.openaiApiKey,
      baseUrl: config.openaiBaseUrl,
    });
  } else if (config.geminiApiKey) {
    transcriber = new GeminiAudioTranscriber({
      apiKey: config.geminiApiKey,
      baseUrl: config.geminiBaseUrl,
    });
  }

  const agent = new AgentOrchestrator({
    provider,
    adapter,
    tools,
    permissions,
    approvals,
    audit,
    transcriber,
    botName: config.botNames[0] || 'Arka',
    services: {
      messages: stores.messages,
      memory: stores.memory,
      settings: stores.settings,
      audit,
    },
  });

  const humanizer = new Humanizer();
  const perChatLimit = Math.max(1, stores.settings.getNumber('rate_limit_per_minute', 12));
  const rateLimiter = new RateLimiter({
    perChatPerMinute: perChatLimit,
    globalPerMinute: perChatLimit * 3,
  });

  const bot = new Bot({
    adapter,
    config: {
      ownerJid: config.ownerJid,
      accessMode: config.accessMode,
      defaultChatMode: config.defaultChatMode,
      botJid: null,
      botNames: config.botNames.length > 0 ? config.botNames : ['Arka'],
      commandPrefix: config.prefix,
    },
    router,
    commands,
    users: stores.users,
    chats: stores.chats,
    messages: stores.messages,
    memory: stores.memory,
    personas: stores.personas,
    settings: stores.settings,
    permissions,
    approvals,
    tools,
    agent,
    humanizer,
    rateLimiter,
    audit,
    logger,
    aiProviderId: provider.id,
  });
  bot.start();

  if (config.whatsappMode === 'live' && config.whatsappAutoconnect) {
    void adapter.connect().catch((error: unknown) => {
      logger.error({ err: error }, 'Gagal menyambungkan WhatsApp saat startup');
    });
  }

  logger.info(
    {
      whatsappMode: config.whatsappMode,
      aiProvider: config.aiProvider,
      prefix: config.prefix,
      ownerConfigured: Boolean(config.ownerJid),
    },
    'ArKzorMD context siap',
  );

  return {
    config,
    logger,
    db,
    stores,
    adapter,
    mockAdapter: mock,
    bot,
    commands,
    tools,
    approvals,
    aiProviderId: provider.id,
    startedAt: Date.now(),
  };
}
