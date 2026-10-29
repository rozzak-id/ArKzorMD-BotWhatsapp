import type {
  ApprovalEngine,
  Bot,
  CommandRegistry,
  Db,
  Logger,
  MockAdapter,
  PlatformAdapter,
  Stores,
  ToolRegistry,
} from '@arkzormd/core';
import type { AppConfig } from './config.js';

export interface AppContext {
  config: AppConfig;
  logger: Logger;
  db: Db;
  stores: Stores;
  adapter: PlatformAdapter;
  mockAdapter: MockAdapter | null;
  bot: Bot;
  commands: CommandRegistry;
  tools: ToolRegistry;
  approvals: ApprovalEngine;
  aiProviderId: string;
  startedAt: number;
}
