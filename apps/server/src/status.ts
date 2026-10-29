import type { ConnectionStatus } from '@arkzormd/core';
import type { AppContext } from './context.js';

export const APP_VERSION = '0.1.0';

export interface StatusResponse {
  app: string;
  version: string;
  nodeEnv: string;
  uptimeSec: number;
  ai: { provider: string; model: string };
  connection: { platform: 'whatsapp'; mode: string; status: ConnectionStatus };
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
  return {
    app: 'ArKzorMD',
    version: APP_VERSION,
    nodeEnv: context.config.nodeEnv,
    uptimeSec: Math.floor((Date.now() - context.startedAt) / 1000),
    ai: { provider: context.aiProviderId, model: context.config.aiModel },
    connection: {
      platform: 'whatsapp',
      mode: context.config.whatsappMode,
      status: context.adapter.getStatus(),
    },
    killSwitch: context.stores.settings.getBoolean('kill_switch'),
    ownerConfigured: Boolean(context.config.ownerJid),
    counts: {
      users: context.stores.users.count(),
      pendingApprovals: context.approvals.pendingCount(),
      messagesToday: context.stores.messages.countSince(startOfToday()),
    },
    prefix: context.config.prefix,
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
      connection: context.adapter.getStatus(),
      transport: 'OnigiBaileys',
      note:
        context.config.whatsappMode === 'mock'
          ? 'Mode mock aktif — pesan disimulasikan untuk pengembangan.'
          : undefined,
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
