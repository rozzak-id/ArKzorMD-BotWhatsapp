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
  AI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
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
  openaiApiKey: string | null;
  openaiBaseUrl: string;
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = parseEnv(env);
  const dataDir = resolve(PROJECT_ROOT, parsed.DATA_DIR);
  const adminToken = parsed.ADMIN_TOKEN?.trim() || null;

  if (adminToken && adminToken.length < 16) {
    throw new Error('ADMIN_TOKEN minimal 16 karakter. Gunakan nilai acak yang kuat.');
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
    aiProvider: parsed.AI_PROVIDER,
    aiModel: parsed.AI_MODEL,
    openaiApiKey: parsed.OPENAI_API_KEY?.trim() || null,
    openaiBaseUrl: parsed.OPENAI_BASE_URL,
  };
}
