import { resolve } from 'node:path';
import { z } from 'zod';
import { PROJECT_ROOT } from './paths.js';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return value;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

  DATA_DIR: z.string().default('./data'),
  DATABASE_PATH: z.string().optional(),
  WEB_DIST: z.string().optional(),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  ADMIN_TOKEN: z.string().optional(),
  OWNER_JID: z.string().optional(),

  ACCESS_MODE: z.enum(['closed', 'auto-member', 'approval']).default('closed'),
  DEFAULT_CHAT_MODE: z.enum(['off', 'mention', 'active']).default('mention'),
  PREFIX: z.string().min(1).max(3).default('.'),
  BOT_NAMES: z.string().default('Arka'),

  WHATSAPP_MODE: z.enum(['live', 'mock', 'off']).default('mock'),
  WHATSAPP_AUTOCONNECT: booleanFromEnv.default(false),
  WHATSAPP_MODULE: z.string().default('onigis'),

  AI_PROVIDER: z.enum(['mock', 'openai', 'gemini']).default('mock'),
  AI_MODEL: z.string().optional(),
  AI_FALLBACK_MODEL: z.string().optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(300_000).default(60_000),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_BASE_URL: z
    .string()
    .url()
    .default('https://generativelanguage.googleapis.com/v1beta'),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  dataDir: string;
  databasePath: string;
  webDist: string;
  logLevel: string;
  adminToken: string | null;
  ownerJid: string | null;
  accessMode: 'closed' | 'auto-member' | 'approval';
  defaultChatMode: 'off' | 'mention' | 'active';
  prefix: string;
  botNames: string[];
  whatsappMode: 'live' | 'mock' | 'off';
  whatsappAutoconnect: boolean;
  whatsappModule: string;
  aiProvider: 'mock' | 'openai' | 'gemini';
  aiModel: string;
  aiFallbackModel: string | null;
  aiTimeoutMs: number;
  openaiApiKey: string | null;
  openaiBaseUrl: string;
  geminiApiKey: string | null;
  geminiBaseUrl: string;
}

function parseEnv(env: NodeJS.ProcessEnv) {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Konfigurasi environment tidak valid: ${detail}`);
  }
  return parsed.data;
}

function defaultModel(provider: 'mock' | 'openai' | 'gemini'): string {
  if (provider === 'gemini') return 'gemini-2.5-flash';
  if (provider === 'openai') return 'gpt-4o-mini';
  return 'mock';
}

function isLocalEndpoint(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

function validateApiKey(
  provider: 'openai' | 'gemini',
  key: string | null,
): void {
  if (!key) {
    throw new Error(
      provider === 'openai'
        ? 'OPENAI_API_KEY wajib diisi untuk AI_PROVIDER=openai (kecuali endpoint lokal seperti Ollama).'
        : 'GEMINI_API_KEY wajib diisi untuk AI_PROVIDER=gemini.',
    );
  }
  if (key.length < 8) {
    throw new Error(
      `${provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY'} terlalu pendek; periksa kembali nilainya.`,
    );
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = parseEnv(env);
  const dataDir = resolve(PROJECT_ROOT, parsed.DATA_DIR);
  const adminToken = parsed.ADMIN_TOKEN?.trim() || null;
  const aiProvider = parsed.AI_PROVIDER;
  const aiModel = parsed.AI_MODEL?.trim() || defaultModel(aiProvider);
  const fallbackModel = parsed.AI_FALLBACK_MODEL?.trim() || null;
  const openaiApiKey = parsed.OPENAI_API_KEY?.trim() || null;
  const geminiApiKey = parsed.GEMINI_API_KEY?.trim() || null;

  if (adminToken && adminToken.length < 16) {
    throw new Error('ADMIN_TOKEN minimal 16 karakter. Gunakan nilai acak yang kuat.');
  }

  if (aiProvider === 'gemini') {
    validateApiKey('gemini', geminiApiKey);
  }

  if (aiProvider === 'openai' && !isLocalEndpoint(parsed.OPENAI_BASE_URL)) {
    validateApiKey('openai', openaiApiKey);
  } else if (aiProvider === 'openai' && openaiApiKey) {
    validateApiKey('openai', openaiApiKey);
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    dataDir,
    databasePath: parsed.DATABASE_PATH
      ? resolve(PROJECT_ROOT, parsed.DATABASE_PATH)
      : resolve(dataDir, 'arkzormd.db'),
    webDist: parsed.WEB_DIST
      ? resolve(PROJECT_ROOT, parsed.WEB_DIST)
      : resolve(PROJECT_ROOT, 'apps/web/dist'),
    logLevel: parsed.LOG_LEVEL,
    adminToken,
    ownerJid: parsed.OWNER_JID?.trim() || null,
    accessMode: parsed.ACCESS_MODE,
    defaultChatMode: parsed.DEFAULT_CHAT_MODE,
    prefix: parsed.PREFIX,
    botNames: parsed.BOT_NAMES.split(',')
      .map((name) => name.trim())
      .filter(Boolean),
    whatsappMode: parsed.WHATSAPP_MODE,
    whatsappAutoconnect: parsed.WHATSAPP_AUTOCONNECT,
    whatsappModule: parsed.WHATSAPP_MODULE,
    aiProvider,
    aiModel,
    aiFallbackModel:
      fallbackModel && fallbackModel !== aiModel ? fallbackModel : null,
    aiTimeoutMs: parsed.AI_TIMEOUT_MS,
    openaiApiKey,
    openaiBaseUrl: parsed.OPENAI_BASE_URL,
    geminiApiKey,
    geminiBaseUrl: parsed.GEMINI_BASE_URL,
  };
}
