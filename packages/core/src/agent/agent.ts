import type { AiMediaItem, AiMessage, AiProvider } from './provider.js';
import type { AudioTranscriber } from './transcriber.js';
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
  transcriber?: AudioTranscriber;
  maxSteps?: number;
  botName?: string;
  botNumber?: string;
  services?: import('../types.js').ToolServices;
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

  const mediaItems: AiMediaItem[] = [];
  for (const m of input.message.media ?? []) {
    if (m.base64 && m.mimeType) {
      mediaItems.push({
        mimeType: m.mimeType,
        data: m.base64,
      });
    }
  }

  const userMessage: AiMessage = {
    role: 'user',
    content: userContent,
    ...(mediaItems.length > 0 ? { media: mediaItems } : {}),
  };

  return [
    { role: 'system', content: systemPrompt },
    ...history,
    userMessage,
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

  setProvider(provider: AiProvider): void {
    (this.deps as { provider: AiProvider }).provider = provider;
  }

  getProvider(): AiProvider {
    return this.deps.provider;
  }

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    // FR-19: Transkripsi voice note / rekaman audio jika transcriber terpasang
    if (this.deps.transcriber && input.message.media && input.message.media.length > 0) {
      for (const m of input.message.media) {
        if (m.kind === 'audio' && (m.buffer || m.base64)) {
          try {
            const audioBuffer = m.buffer ?? Buffer.from(m.base64!, 'base64');
            const transcript = await this.deps.transcriber.transcribe({
              buffer: audioBuffer,
              mimeType: m.mimeType ?? 'audio/ogg',
              language: input.persona.language === 'en' ? 'en' : 'id',
            });
            if (transcript) {
              const currentText = input.message.text ? `${input.message.text}\n` : '';
              input.message.text = `${currentText}[Pesan Suara Pengguna]: "${transcript}"`;
            }
          } catch {
            // Biarkan flow berjalan jika transkripsi gagal
          }
        }
      }
    }

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
