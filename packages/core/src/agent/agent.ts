import type { AiMessage, AiProvider } from './provider.js';
import type {
  InternalMessage,
  Persona,
  PlatformAdapter,
  Role,
  StoredMessage,
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
}

function toAiMessages(input: AgentRunInput): AiMessage[] {
  const history: AiMessage[] = input.history.map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : item.role === 'tool' ? 'tool' : 'user',
    content: item.content,
  }));

  return [
    { role: 'system', content: buildSystemPrompt(input.persona) },
    ...history,
    { role: 'user', content: input.message.text || '[pesan media]' },
  ];
}

function targetOf(params: Record<string, unknown>): string | null {
  for (const key of ['to', 'target', 'jid']) {
    const value = params[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
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
    const messages = toAiMessages(input);
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
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: serialize({ ok: false, error: `Tool ${call.name} tidak dikenal.` }),
          });
          continue;
        }

        const target = targetOf(call.arguments);
        const decision = this.deps.permissions.evaluate({
          role: input.role,
          tool,
          target,
        });

        if (decision.outcome === 'deny') {
          this.deps.audit.record({
            actorJid: input.message.senderId,
            action: 'tool.denied',
            params: { tool: call.name, params: call.arguments, reason: decision.reason },
          });
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: serialize({ ok: false, error: decision.reason }),
          });
          continue;
        }

        if (decision.outcome === 'approval') {
          const request = await this.deps.approvals.create({
            requesterJid: input.message.senderId,
            requesterRole: input.role,
            toolName: call.name,
            params: call.arguments,
            chatId: input.message.chatId,
          });
          pendingApprovals.push(request.shortCode);
          messages.push({
            role: 'tool',
            toolCallId: call.id,
            name: call.name,
            content: serialize({
              ok: false,
              pendingApproval: true,
              code: request.shortCode,
              note: `Menunggu persetujuan Owner (${request.shortCode}).`,
            }),
          });
          continue;
        }

        const result = await executeTool(tool, {
          adapter: this.deps.adapter,
          chatId: input.message.chatId,
          senderId: input.message.senderId,
          role: input.role,
          params: call.arguments,
          message: input.message,
        });
        usedTools.push(call.name);
        this.deps.audit.record({
          actorJid: input.message.senderId,
          action: 'tool.executed',
          params: { tool: call.name, params: call.arguments },
          result,
        });
        messages.push({
          role: 'tool',
          toolCallId: call.id,
          name: call.name,
          content: serialize(result),
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
