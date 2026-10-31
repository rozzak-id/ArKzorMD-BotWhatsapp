export * from './types.js';
export * from './stores.js';
export * from './errors.js';
export * from './logger.js';
export * from './bot.js';

export { openDatabase, type Db } from './db/index.js';
export {
  createStores,
  SqliteApprovalStore,
  SqliteAuditStore,
  SqliteChatStore,
  SqliteMessageStore,
  SqlitePersonaStore,
  SqliteSettingsStore,
  SqliteUserStore,
  SqliteMemoryStore,
  type Stores,
} from './db/sqlite-stores.js';
export { DEFAULT_PERSONA, DEFAULT_SETTINGS } from './db/schema.js';

export { AuditLog, type AuditInput } from './audit/audit-log.js';

export {
  PermissionEngine,
  type PermissionDecision,
  type PermissionEngineOptions,
  type PermissionInput,
  type PermissionOutcome,
} from './security/permission-engine.js';
export {
  resolveEffectiveLevel,
  decide,
  isRoleAllowed,
  allowedRolesForMinRole,
  normalizeChatTarget,
  type EffectiveLevelResult,
  type ResolverContext,
  type DecideContext,
  type PermissionDecisionOutcome,
  type PermissionDecisionResult,
} from './security/resolver.js';
export {
  ApprovalEngine,
  extractTarget,
  type ApprovalDecision,
  type ApprovalEngineOptions,
  type CreateApprovalInput,
  type DecideInput,
  type DecideResult,
  type DecisionHandler,
} from './security/approval-engine.js';

export {
  CommandRegistry,
  type CommandContext,
  type CommandDefinition,
  type CommandHandler,
  type CommandRuntimeStatus,
  type CommandServices,
} from './router/command-registry.js';
export { MessageRouter, type RouteResult } from './router/router.js';
export { createDefaultCommands } from './router/commands.js';

export { ToolRegistry, executeTool } from './tools/registry.js';
export { createBuiltinTools, normalizeTarget } from './tools/builtin.js';

export { AgentOrchestrator, type AgentDependencies, type AgentRunInput, type AgentRunResult } from './agent/agent.js';
export {
  MockProvider,
  AiProviderError,
  type AiCompletion,
  type AiCompletionRequest,
  type AiMessage,
  type AiProvider,
  type AiProviderErrorOptions,
  type AiToolCall,
} from './agent/provider.js';
export {
  BaseAiProvider,
  type BaseProviderOptions,
  type FetchLike,
  type ProviderLogger,
} from './agent/base-provider.js';
export { OpenAiProvider, type OpenAiProviderOptions } from './agent/openai-provider.js';
export { GeminiProvider, type GeminiProviderOptions } from './agent/gemini-provider.js';

export { buildSystemPrompt } from './persona/prompt.js';

export { Humanizer, type HumanizerOptions } from './humanizer/humanizer.js';
export { RateLimiter, type RateLimiterOptions } from './rate-limit/rate-limiter.js';

export { MockAdapter, type ApprovalRecord, type SentRecord } from './testing/mock-adapter.js';

export { newId, now, shortCode, sleep } from './utils/id.js';
export { redact } from './utils/redact.js';
