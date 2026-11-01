import type { AiMessage, AiProvider } from './provider.js';
import type {
  InternalMessage,
  Persona,
  PlatformAdapter,
  Role,
  StoredMessage,
  ToolDefinition,
} from '../types.js';
import type { AuditLog } from '../audit/audit-log.js';
import type { ApprovalEngine } from '../security/approval-engine.js';
import type { PermissionEngine } from '../security/permission-engine.js';
import type { ToolRegistry } from '../tools/registry.js';
import { executeTool } from '../tools/registry.js';
import { buildSystemPrompt } from '../persona/prompt.js';
import { redact } from '../utils/redact.js';

export interface AgentRunInput {
  message: InternalMessage;
  role: Role;
  persona: Persona;
  history: StoredMessage[];
}

export interface AgentRunResult {
  text: string;
  toolCalls: string[];
  pendingApprovals: string[];
}

export interface AgentDependencies {
  provider: AiProvider;
  adapter: PlatformAdapter;
  tools: ToolRegistry;
  permissions: PermissionEngine;
  approvals: ApprovalEngine;
  audit: AuditLog;
  maxSteps?: number;
  botName?: string;
  botNumber?: string;
  services?: any;
}

export function compactHistory(history: StoredMessage[], maxRecent = 10): AiMessage[] {
  if (history.length <= maxRecent) {
    return history.map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : item.role === 'tool' ? 'tool' : 'user',
      content: item.content,
    }));
  }

  const older = history.slice(0, history.length - maxRecent);
  const recent = history.slice(history.length - maxRecent);

  const summaryLines = older.map((m) => {
    const roleLabel = m.role === 'assistant' ? 'Bot' : 'User';
    const snippet = m.content.length > 80 ? `${m.content.slice(0, 80)}...` : m.content;
    return `${roleLabel}: ${snippet}`;
  });

  const summaryMessage: AiMessage = {
    role: 'system',
    content: `[Ringkasan riwayat percakapan sebelumnya]\n${summaryLines.join('\n')}`,
  };

  const recentMessages: AiMessage[] = recent.map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : item.role === 'tool' ? 'tool' : 'user',
    content: item.content,
  }));

  return [summaryMessage, ...recentMessages];
}

function toAiMessages(
  input: AgentRunInput,
  tools: ToolDefinition[],
  botName?: string,
  botNumber?: string,
): AiMessage[] {
  const history: AiMessage[] = compactHistory(input.history, 10);

  const systemPrompt = buildSystemPrompt({
    botName,
    botNumber,
    persona: input.persona,
    language: input.persona.language,
    chatId: input.message.chatId,
    chatType: input.message.chatType,
    senderName: input.message.senderName ?? input.message.senderId,
    senderRole: input.role,
    tools,
  });

  const roleTag = input.role ? `[${input.role.toUpperCase()}] ` : '';
  const userContent = input.message.text ? `${roleTag}${input.message.text}` : '[pesan media]';

  return [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userContent },
  ];
}

function serialize(value: unknown): string {
  return JSON.stringify(redact(value));
}

export class AgentOrchestrator {
  private readonly maxSteps: number;

  constructor(private readonly deps: AgentDependencies) {
    this.maxSteps = deps.maxSteps ?? 4;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const availableTools = this.deps.tools.listToolsForRole(input.role);
    const messages = toAiMessages(input, availableTools, this.deps.botName, this.deps.botNumber);
    const usedTools: string[] = [];
    const pendingApprovals: string[] = [];

    for (let step = 0; step < this.maxSteps; step += 1) {
      const completion = await this.deps.provider.complete({
        messages,
        tools: this.deps.tools.schemasFor(input.role),
        ...(input.persona.model?.temperature !== undefined
          ? { temperature: input.persona.model.temperature }
          : {}),
        ...(input.persona.model?.maxTokens !== undefined
          ? { maxTokens: input.persona.model.maxTokens }
          : {}),
      });

      if (completion.toolCalls.length === 0) {
        return { text: completion.text, toolCalls: usedTools, pendingApprovals };
      }

      messages.push({
        role: 'assistant',
        content: completion.text,
        toolCalls: completion.toolCalls,
      });

      for (const call of completion.toolCalls) {
        const tool = this.deps.tools.get(call.name);

        if (!tool) {
          this.deps.audit.record({
            actorJid: input.message.senderId,
            action: 'tool.denied',
            params: {
              tool: call.name,
              params: call.arguments,
              effectiveLevel: 'L0',
              decision: 'denied',
              reason: 'Tool tidak dikenal (unknown_tool).',
            },
          });
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: serialize({
              ok: false,
              status: 'denied',
              reason: 'Tool tidak dikenal (unknown_tool).',
              errorCode: 'unknown_tool',
              retryable: false,
            }),
          });
          continue;
        }

        const decision = this.deps.permissions.decide(tool, call.arguments, {
          currentChatId: input.message.chatId,
          senderId: input.message.senderId,
          role: input.role,
        });

        if (decision.decision === 'denied') {
          this.deps.audit.record({
            actorJid: input.message.senderId,
            action: 'tool.denied',
            params: {
              tool: call.name,
              params: call.arguments,
              effectiveLevel: decision.effectiveLevel,
              decision: 'denied',
              reason: decision.reason,
            },
          });
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: serialize({
              ok: false,
              status: 'denied',
              reason: decision.reason,
            }),
          });
          continue;
        }

        if (decision.decision === 'pending_approval') {
          const request = await this.deps.approvals.create({
            requesterJid: input.message.senderId,
            requesterRole: input.role,
            toolName: call.name,
            params: call.arguments,
            chatId: input.message.chatId,
          });
          pendingApprovals.push(request.shortCode);
          this.deps.audit.record({
            actorJid: input.message.senderId,
            action: 'tool.pending_approval',
            params: {
              tool: call.name,
              params: call.arguments,
              effectiveLevel: decision.effectiveLevel,
              decision: 'pending_approval',
              code: request.shortCode,
            },
          });
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: serialize({
              ok: false,
              status: 'pending_approval',
              pendingApproval: true,
              approvalId: request.id,
              code: request.shortCode,
              expiresAt: request.expiresAt,
              note: `Permintaan aksi membutuhkan persetujuan Owner (#${request.shortCode}).`,
            }),
          });
          continue;
        }

        // Allowed
        const result = await executeTool(tool, {
          adapter: this.deps.adapter,
          chatId: input.message.chatId,
          senderId: input.message.senderId,
          role: input.role,
          params: call.arguments,
          message: input.message,
          services: this.deps.services,
        });

        usedTools.push(call.name);
        this.deps.audit.record({
          actorJid: input.message.senderId,
          action: 'tool.executed',
          params: {
            tool: call.name,
            params: call.arguments,
            effectiveLevel: decision.effectiveLevel,
            decision: 'allow',
          },
          result,
        });

        messages.push({
          role: 'tool',
          toolCallId: call.id,
          name: call.name,
          content: serialize({
            ok: result.ok,
            status: result.status ?? (result.ok ? 'ok' : 'error'),
            output: result.output,
            error: result.error,
            errorCode: result.errorCode,
            retryable: result.retryable,
          }),
        });
      }
    }

    return {
      text: 'Maaf, permintaan ini terlalu kompleks untuk diproses sekaligus. Coba sederhanakan ya.',
      toolCalls: usedTools,
      pendingApprovals,
    };
  }
}
