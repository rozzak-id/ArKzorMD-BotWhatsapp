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

export function createDynamicAiProvider(options: {
  provider: string;
  apiKey?: string | null;
  baseUrl?: string;
  model?: string;
  fallbackModel?: string | null;
  timeoutMs?: number;
  logger?: any;
}): AiProvider {
  if (options.provider === 'mock') return new MockProvider();

  if (options.provider === 'gemini') {
    return new GeminiProvider({
      apiKey: options.apiKey || null,
      baseUrl: options.baseUrl || 'https://generativelanguage.googleapis.com/v1beta',
      model: options.model || 'gemini-2.5-flash',
      fallbackModel: options.fallbackModel || null,
      timeoutMs: options.timeoutMs ?? 60_000,
      logger: options.logger,
    });
  }

  // openai, 9router, openrouter, ollama, custom all use OpenAiProvider!
  let defaultBaseUrl = 'https://api.openai.com/v1';
  if (options.provider === '9router') defaultBaseUrl = 'http://localhost:20128/v1';
  else if (options.provider === 'openrouter') defaultBaseUrl = 'https://openrouter.ai/api/v1';
  else if (options.provider === 'ollama') defaultBaseUrl = 'http://localhost:11434/v1';

  return new OpenAiProvider({
    apiKey: options.apiKey || (options.provider === '9router' || options.provider === 'ollama' ? 'not-needed' : null),
    baseUrl: options.baseUrl || defaultBaseUrl,
    model: options.model || (options.provider === '9router' ? 'auto' : 'gpt-4o-mini'),
    fallbackModel: options.fallbackModel || null,
    timeoutMs: options.timeoutMs ?? 60_000,
    logger: options.logger,
  });
}

function createProvider(
  config: AppConfig,
  logger: AppContext['logger'],
  stores?: ReturnType<typeof createStores>,
): AiProvider {
  const provider = stores?.settings.get('ai_provider') || config.aiProvider;
  const model = stores?.settings.get('ai_model') || config.aiModel;
  const baseUrl = stores?.settings.get('ai_base_url') || (provider === 'gemini' ? config.geminiBaseUrl : config.openaiBaseUrl);
  const apiKey = stores?.settings.get('ai_api_key') || (provider === 'gemini' ? config.geminiApiKey : config.openaiApiKey);

  return createDynamicAiProvider({
    provider,
    apiKey,
    baseUrl,
    model,
    fallbackModel: config.aiFallbackModel,
    timeoutMs: config.aiTimeoutMs,
    logger,
  });
}

function createAdapter(
  config: AppConfig,
  logger: AppContext['logger'],
  stores?: ReturnType<typeof createStores>,
): { adapter: PlatformAdapter; mock: MockAdapter | null } {
  if (config.whatsappMode === 'live') {
    const selfControl = stores ? stores.settings.getBoolean('self_control', true) : true;
    const autoRead = stores ? stores.settings.getBoolean('auto_read', true) : true;
    const jitterDelayMs = stores ? stores.settings.getNumber('jitter_delay_ms', 1200) : 1200;
    return {
      adapter: new WhatsAppAdapter({
        authDir: resolve(config.dataDir, 'whatsapp-auth'),
        logger,
        moduleName: config.whatsappModule,
        commandPrefix: config.prefix,
        allowSelfControl: selfControl,
        autoRead,
        jitterDelayMs,
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

  if (!stores.settings.get('prefix')) stores.settings.set('prefix', config.prefix);
  if (!stores.settings.get('access_mode')) stores.settings.set('access_mode', config.accessMode);
  if (!stores.settings.get('default_chat_mode')) stores.settings.set('default_chat_mode', config.defaultChatMode);
  if (!stores.settings.get('ai_provider')) stores.settings.set('ai_provider', config.aiProvider);

  const { adapter, mock } = createAdapter(config, logger, stores);
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
  const provider = createProvider(config, logger, stores);

  const effectiveApiKey = stores.settings.get('ai_api_key') || (config.aiProvider === 'gemini' ? config.geminiApiKey : config.openaiApiKey);
  const effectiveProvider = stores.settings.get('ai_provider') || config.aiProvider;
  let transcriber: AudioTranscriber | undefined;
  if (effectiveProvider === 'gemini' && effectiveApiKey) {
    transcriber = new GeminiAudioTranscriber({
      apiKey: effectiveApiKey,
      baseUrl: stores.settings.get('ai_base_url') || config.geminiBaseUrl,
    });
  } else if (effectiveApiKey) {
    transcriber = new WhisperAudioTranscriber({
      apiKey: effectiveApiKey,
      baseUrl: stores.settings.get('ai_base_url') || config.openaiBaseUrl,
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
