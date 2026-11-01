import type { ConnectionStatus } from '@arkzormd/core';
import type { AppContext } from './context.js';

export const APP_VERSION = '0.6.0';

export interface StatusResponse {
  app: string;
  version: string;
  nodeEnv: string;
  uptimeSec: number;
  ai: {
    provider: string;
    model: string;
    fallbackModel: string | null;
    timeoutMs: number;
  };
  connection: {
    platform: 'whatsapp';
    mode: string;
    status: ConnectionStatus;
    qr: string | null;
    autoconnect: boolean;
    module: string;
    runtime: string;
    lastError: string | null;
  };
  killSwitch: boolean;
  ownerConfigured: boolean;
  counts: { users: number; pendingApprovals: number; messagesToday: number };
  prefix: string;
}

export interface PlatformCard {
  id: 'whatsapp' | 'telegram' | 'discord';
  name: string;
  enabled: boolean;
  state: 'active' | 'inactive' | 'coming_soon';
  connection: ConnectionStatus;
  transport?: string;
  note?: string;
}

function startOfToday(): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function buildStatus(context: AppContext): StatusResponse {
  const provider = context.stores.settings.get('ai_provider') || context.aiProviderId || context.config.aiProvider;
  const model = context.stores.settings.get('ai_model') || context.config.aiModel;
  const prefix = context.stores.settings.get('prefix') || context.config.prefix;
  const ownerConfigured = Boolean(context.config.ownerJid || context.stores.settings.get('owner_jid'));

  return {
    app: 'ArKzorMD',
    version: APP_VERSION,
    nodeEnv: context.config.nodeEnv,
    uptimeSec: Math.floor((Date.now() - context.startedAt) / 1000),
    ai: {
      provider,
      model,
      fallbackModel: context.config.aiFallbackModel,
      timeoutMs: context.config.aiTimeoutMs,
    },
    connection: {
      platform: 'whatsapp',
      mode: context.config.whatsappMode,
      status: context.adapter.getStatus(),
      qr: context.adapter.getQr?.() ?? null,
      autoconnect: context.config.whatsappAutoconnect,
      module: context.config.whatsappModule,
      runtime: `${process.platform}-${process.arch}`,
      lastError: context.adapter.getLastError?.() ?? null,
    },
    killSwitch: context.stores.settings.getBoolean('kill_switch'),
    ownerConfigured,
    counts: {
      users: context.stores.users.count(),
      pendingApprovals: context.approvals.pendingCount(),
      messagesToday: context.stores.messages.countSince(startOfToday()),
    },
    prefix,
  };
}

export function buildPlatforms(context: AppContext): PlatformCard[] {
  const whatsappEnabled = context.config.whatsappMode !== 'off';
  return [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      enabled: whatsappEnabled,
      state: whatsappEnabled ? 'active' : 'inactive',
      connection: whatsappEnabled ? context.adapter.getStatus() : 'disconnected',
      transport: 'onigis',
      note:
        context.config.whatsappMode === 'off'
          ? 'WhatsApp dimatikan lewat WHATSAPP_MODE=off.'
          : context.config.whatsappMode === 'mock'
            ? 'Mode mock aktif — pesan disimulasikan untuk pengembangan.'
            : process.platform !== 'linux'
              ? 'Live WhatsApp memerlukan Linux x64/arm64 (Docker/WSL) untuk E2EE native.'
              : 'Terhubung lewat onigis (fork Baileys 7, E2EE MIT).',
    },
    {
      id: 'telegram',
      name: 'Telegram',
      enabled: false,
      state: 'coming_soon',
      connection: 'disconnected',
      note: 'Stub adapter tersedia. Diaktifkan di M6.',
    },
    {
      id: 'discord',
      name: 'Discord',
      enabled: false,
      state: 'coming_soon',
      connection: 'disconnected',
      note: 'Stub adapter tersedia. Diaktifkan di M6.',
    },
  ];
}
