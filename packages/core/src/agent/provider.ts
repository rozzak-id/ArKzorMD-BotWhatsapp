import type { ToolSchema } from '../types.js';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
  toolCalls?: AiToolCall[];
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiCompletion {
  text: string;
  toolCalls: AiToolCall[];
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  tools: ToolSchema[];
  temperature?: number;
  maxTokens?: number;
}

/** Provider abstrak (FR-06). Implementasi nyata menyusul di M1. */
export interface AiProvider {
  id: string;
  complete(request: AiCompletionRequest): Promise<AiCompletion>;
}

/**
 * Provider mock untuk pengembangan awal dan pengujian pipeline.
 * Tidak memanggil jaringan; cukup meniru jawaban dan satu tool call.
 */
export class MockProvider implements AiProvider {
  readonly id = 'mock';

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    const toolResults = request.messages.filter((message) => message.role === 'tool');
    if (toolResults.length > 0) {
      const last = toolResults[toolResults.length - 1];
      const pending = last?.content.includes('pendingApproval') ?? false;
      return {
        text: pending
          ? 'Permintaanmu sudah aku ajukan ke Owner. Tunggu persetujuan sebentar ya.'
          : 'Sudah aku proses ya. Ada lagi yang bisa dibantu?',
        toolCalls: [],
      };
    }

    const lastUser =
      [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? '';

    const available = new Set(request.tools.map((tool) => tool.name));
    const sendMatch = /kirim(?:\s+pesan)?\s+ke\s+(\+?[\d][\d\s-]{6,})[:\s]+(.+)/i.exec(lastUser);
    if (sendMatch && available.has('send_message')) {
      return {
        text: '',
        toolCalls: [
          {
            id: `mock-${Date.now()}`,
            name: 'send_message',
            arguments: {
              to: sendMatch[1] ?? '',
              text: (sendMatch[2] ?? '').trim(),
            },
          },
        ],
      };
    }

    if (/^(hai|halo|hello|hi)\b/i.test(lastUser.trim())) {
      return { text: 'Halo! Ada yang bisa aku bantu?', toolCalls: [] };
    }

    return {
      text: `Aku dengar: "${lastUser}". (mock provider — provider AI asli menyusul di M1)`,
      toolCalls: [],
    };
  }
}
