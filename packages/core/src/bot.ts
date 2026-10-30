import type {
  AccessMode,
  ApprovalRequest,
  ChatMode,
  InternalMessage,
  MessageHandler,
  OutgoingContent,
  PlatformAdapter,
  Role,
  ToolResult,
  User,
} from './types.js';
import type { ChatStore, MessageStore, PersonaStore, SettingsStore, UserStore } from './stores.js';
import type { AuditLog } from './audit/audit-log.js';
import type { ApprovalEngine } from './security/approval-engine.js';
import type { DecideInput, DecideResult } from './security/approval-engine.js';
import type { PermissionEngine } from './security/permission-engine.js';
import type { CommandRegistry, CommandServices } from './router/command-registry.js';
import type { MessageRouter } from './router/router.js';
import type { AgentOrchestrator } from './agent/agent.js';
import type { Humanizer } from './humanizer/humanizer.js';
import type { RateLimiter } from './rate-limit/rate-limiter.js';
import type { ToolRegistry } from './tools/registry.js';
import { executeTool } from './tools/registry.js';
import { DEFAULT_PERSONA } from './db/schema.js';
import type { Logger } from './logger.js';

export interface BotConfig {
  ownerJid: string | null;
  accessMode: AccessMode;
  defaultChatMode: ChatMode;
  botJid: string | null;
  botNames: string[];
  commandPrefix: string;
}

export interface BotDependencies {
  adapter: PlatformAdapter;
  config: BotConfig;
  router: MessageRouter;
  commands: CommandRegistry;
  users: UserStore;
  chats: ChatStore;
  messages: MessageStore;
  personas: PersonaStore;
  settings: SettingsStore;
  permissions: PermissionEngine;
  approvals: ApprovalEngine;
  tools: ToolRegistry;
  agent: AgentOrchestrator;
  humanizer: Humanizer;
  rateLimiter: RateLimiter;
  audit: AuditLog;
  logger: Logger;
  aiProviderId: string;
}

export interface HandleResult {
  replies: string[];
  ignored?: string;
}

const MAX_MESSAGE_AGE_MS = 5 * 60_000;

function bareJidUser(jid: string): string {
  return jid.split('@')[0]?.split(':')[0] ?? jid;
}

/**
 * Orkestrator bot: filter pesan, role, mode chat, router hybrid,
 * AI agent, humanizer, rate limit, dan audit.
 */
export class Bot {
  private readonly startedAt = Date.now();
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(private readonly deps: BotDependencies) {}

  start(): void {
    this.deps.adapter.onMessage((message) => this.handleSafely(message));

    this.deps.approvals.onRequest = (request) => this.notifyOwner(request);
    this.deps.approvals.setDecisionHandler((request) => this.executeApproved(request));

    this.sweepTimer = setInterval(() => {
      this.deps.approvals.expireStale();
    }, 30_000);
    this.sweepTimer.unref();
  }

  stop(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    this.deps.approvals.onRequest = null;
  }

  private async handleSafely(message: InternalMessage): Promise<void> {
    try {
      await this.handleMessage(message);
    } catch (error) {
      this.deps.logger.error(
        { err: error, chatId: message.chatId, senderId: message.senderId },
        'Gagal memproses pesan',
      );
      this.deps.audit.record({
        actorJid: message.senderId,
        action: 'message.processing_failed',
        params: { chatId: message.chatId },
        result: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  async handleMessage(message: InternalMessage): Promise<HandleResult> {
    const replies: string[] = [];

    if (message.fromBot) return { replies, ignored: 'from-bot' };
    if (Date.now() - message.timestamp > MAX_MESSAGE_AGE_MS) {
      return { replies, ignored: 'stale-message' };
    }

    const resolution = await this.resolveUser(message);
    if (!resolution.user) {
      return { replies, ignored: resolution.ignored ?? 'unknown-user' };
    }
    const user = resolution.user;

    if (user.status === 'blocked') {
      this.deps.audit.record({
        actorJid: message.senderId,
        action: 'access.blocked_attempt',
        params: { chatId: message.chatId },
      });
      return { replies, ignored: 'blocked-user' };
    }

    if (user.status === 'pending') {
      await this.reply(
        message.chatId,
        { text: '⏳ Akses kamu masih menunggu persetujuan Owner.' },
        replies,
        message.id,
      );
      return { replies };
    }

    if (message.isGroup && !this.shouldRespondInGroup(message)) {
      return { replies, ignored: 'group-mode' };
    }

    const route = this.deps.router.route(message);
    if (route.kind === 'command') {
      await this.handleCommand(message, user, route.name, route.args, route.known, replies);
      return { replies };
    }

    const history = this.deps.messages.recent(message.chatId, 20);
    this.deps.messages.append({
      chatId: message.chatId,
      platform: message.platform,
      senderId: message.senderId,
      role: 'user',
      content: message.text || '[pesan media]',
    });

    const persona = this.deps.personas.getActive() ?? DEFAULT_PERSONA;
    const result = await this.deps.agent.run({
      message,
      role: user.role,
      persona,
      history,
    });

    if (result.text) {
      await this.reply(message.chatId, { text: result.text }, replies, message.id);
    }

    this.deps.audit.record({
      actorJid: message.senderId,
      action: 'agent.replied',
      params: {
        chatId: message.chatId,
        tools: result.toolCalls,
        pendingApprovals: result.pendingApprovals,
      },
    });

    return { replies };
  }

  async decideApproval(input: DecideInput): Promise<DecideResult> {
    return this.deps.approvals.decide(input);
  }

  private async resolveUser(
    message: InternalMessage,
  ): Promise<{ user?: User; ignored?: string }> {
    const existing = this.deps.users.get(message.senderId);
    if (existing) return { user: existing };

    const { accessMode } = this.deps.config;
    if (accessMode === 'auto-member') {
      const created = this.deps.users.upsert({
        jid: message.senderId,
        name: message.senderName ?? null,
        role: 'member',
        status: 'active',
      });
      this.deps.audit.record({
        actorJid: message.senderId,
        action: 'access.auto_member',
        params: { name: message.senderName },
      });
      return { user: created };
    }

    if (accessMode === 'approval') {
      const created = this.deps.users.upsert({
        jid: message.senderId,
        name: message.senderName ?? null,
        role: 'member',
        status: 'pending',
      });
      this.deps.audit.record({
        actorJid: message.senderId,
        action: 'access.requested',
        params: { name: message.senderName, chatId: message.chatId },
      });
      await this.notifyAccessRequest(message);
      return { user: created };
    }

    this.deps.audit.record({
      actorJid: message.senderId,
      action: 'access.rejected_unknown',
      params: { chatId: message.chatId },
    });
    return { ignored: 'access-closed' };
  }

  private async notifyAccessRequest(message: InternalMessage): Promise<void> {
    const owner = this.deps.config.ownerJid;
    if (!owner) return;
    try {
      await this.deps.adapter.send(owner, {
        text:
          `🔔 *Permintaan akses baru*\n` +
          `Nomor: ${message.senderId}\n` +
          `Nama: ${message.senderName ?? '-'}\n\n` +
          `Setujui lewat Web UI (Pengguna & Role).`,
      });
    } catch (error) {
      this.deps.logger.warn({ err: error }, 'Gagal mengirim notifikasi akses ke Owner');
    }
  }

  private shouldRespondInGroup(message: InternalMessage): boolean {
    const chat = this.deps.chats.get(message.chatId);
    const mode = chat?.mode ?? this.deps.config.defaultChatMode;
    if (mode === 'off') return false;
    if (mode === 'active') return true;
    return this.isMentioned(message);
  }

  private isMentioned(message: InternalMessage): boolean {
    if (message.quoted?.fromBot) return true;
    const botJid = this.deps.config.botJid ?? this.deps.adapter.getBotJid?.() ?? null;
    if (botJid) {
      const bareBot = bareJidUser(botJid);
      if (message.mentions.some((mention) => bareJidUser(mention) === bareBot)) {
        return true;
      }
    }
    const text = message.text.toLowerCase();
    const normalizedNames = this.deps.config.botNames.map((name) => name.toLowerCase().trim());
    if (
      message.mentions.some((mention) =>
        normalizedNames.some((name) => name.length > 0 && mention.toLowerCase().includes(name)),
      )
    ) {
      return true;
    }
    return normalizedNames.some((needle) => needle.length > 0 && text.includes(needle));
  }

  private async handleCommand(
    message: InternalMessage,
    user: User,
    name: string,
    args: string[],
    known: boolean,
    replies: string[],
  ): Promise<void> {
    const definition = this.deps.commands.get(name);
    if (!known || !definition) {
      await this.reply(
        message.chatId,
        { text: `Command \`.${name}\` tidak dikenal. Ketik \`.menu\` untuk daftar fitur.` },
        replies,
        message.id,
      );
      this.deps.audit.record({
        actorJid: message.senderId,
        action: 'command.unknown',
        params: { command: name },
      });
      return;
    }

    if (!definition.roles.includes(user.role)) {
      await this.reply(
        message.chatId,
        { text: `⛔ Command \`.${name}\` tidak tersedia untuk role ${user.role}.` },
        replies,
        message.id,
      );
      this.deps.audit.record({
        actorJid: message.senderId,
        action: 'command.denied',
        params: { command: name, role: user.role },
      });
      return;
    }

    try {
      const output = await definition.handler({
        message,
        role: user.role,
        args,
        raw: message.text,
        services: this.commandServices(),
      });
      if (output) {
        await this.reply(message.chatId, { text: output }, replies, message.id);
      }
      this.deps.audit.record({
        actorJid: message.senderId,
        action: 'command.executed',
        params: { command: name, args },
      });
    } catch (error) {
      this.deps.logger.error({ err: error, command: name }, 'Command gagal dieksekusi');
      await this.reply(
        message.chatId,
        { text: '⚠️ Command gagal dijalankan. Coba lagi nanti.' },
        replies,
        message.id,
      );
    }
  }

  private commandServices(): CommandServices {
    const deps = this.deps;
    return {
      adapter: deps.adapter,
      users: deps.users,
      personas: deps.personas,
      messages: deps.messages,
      settings: deps.settings,
      audit: deps.audit,
      menuFor: (role: Role) =>
        deps.commands.listFor(role).map((command) => ({
          name: command.name,
          description: command.description,
        })),
      getStatus: () => ({
        uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
        platformStatus: deps.adapter.getStatus(),
        pendingApprovals: deps.approvals.pendingCount(),
        killSwitch: deps.settings.getBoolean('kill_switch'),
        aiProvider: deps.aiProviderId,
      }),
      setKillSwitch: (enabled: boolean) => {
        deps.settings.set('kill_switch', String(enabled));
        deps.audit.record({
          actorJid: deps.config.ownerJid,
          action: enabled ? 'killswitch.enabled' : 'killswitch.disabled',
        });
      },
      decideApproval: (input) => this.decideApproval(input),
    };
  }

  private async reply(
    chatId: string,
    content: OutgoingContent,
    replies: string[],
    replyTo?: string,
  ): Promise<void> {
    await this.deps.rateLimiter.acquire(chatId);
    const outgoing: OutgoingContent = replyTo ? { ...content, replyTo } : content;
    await this.deps.humanizer.typeAndSend(this.deps.adapter, chatId, outgoing);
    if (outgoing.text) {
      this.deps.messages.append({
        chatId,
        platform: this.deps.adapter.id,
        senderId: this.deps.config.botJid ?? 'bot',
        role: 'assistant',
        content: outgoing.text,
      });
      replies.push(outgoing.text);
    }
  }

  private async notifyOwner(request: ApprovalRequest): Promise<void> {
    const owner = this.deps.config.ownerJid;
    if (!owner) {
      this.deps.logger.warn(
        { shortCode: request.shortCode },
        'Owner belum ditetapkan; approval hanya tampil di Web UI',
      );
      return;
    }

    try {
      await this.deps.adapter.sendApproval(owner, request);
    } catch (error) {
      this.deps.logger.warn({ err: error }, 'Tombol approval gagal; memakai fallback teks');
      try {
        await this.deps.adapter.send(owner, { text: this.formatApprovalFallback(request) });
      } catch (fallbackError) {
        this.deps.logger.error({ err: fallbackError }, 'Fallback approval juga gagal');
      }
    }
  }

  private formatApprovalFallback(request: ApprovalRequest): string {
    const expiry = new Date(request.expiresAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return [
      `🔐 *Persetujuan ${request.shortCode}*`,
      `Dari: ${request.requesterRole} (${request.requesterJid})`,
      `Aksi: ${request.toolName}`,
      `Detail: ${JSON.stringify(request.params)}`,
      `Berlaku sampai: ${expiry}`,
      '',
      `Balas \`${this.deps.config.commandPrefix}approve ${request.shortCode}\` untuk setuju, ` +
        `\`${this.deps.config.commandPrefix}reject ${request.shortCode}\` untuk tolak, atau ` +
        `\`${this.deps.config.commandPrefix}always ${request.shortCode}\` untuk setuju selalu.`,
    ].join('\n');
  }

  private async executeApproved(request: ApprovalRequest): Promise<ToolResult> {
    const tool = this.deps.tools.get(request.toolName);
    if (!tool) {
      throw new Error(`Tool ${request.toolName} tidak ditemukan.`);
    }

    const result = await executeTool(tool, {
      adapter: this.deps.adapter,
      chatId: request.chatId,
      senderId: request.requesterJid,
      role: request.requesterRole,
      params: request.params,
    });

    const notification = result.ok
      ? `✅ Aksi *${request.toolName}* (${request.shortCode}) disetujui Owner dan sudah dijalankan.`
      : `⚠️ Aksi *${request.toolName}* disetujui, tetapi gagal: ${result.error ?? 'tidak diketahui'}.`;

    const replies: string[] = [];
    await this.reply(request.chatId, { text: notification }, replies);

    this.deps.audit.record({
      actorJid: this.deps.config.ownerJid,
      action: 'tool.executed_via_approval',
      params: { tool: request.toolName, code: request.shortCode },
      result,
    });

    return result;
  }
}
