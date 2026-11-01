import type { ToolSchema } from '../types.js';

export interface AiMediaItem {
  mimeType: string;
  data: string; // Base64-encoded string
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  name?: string;
  toolCalls?: AiToolCall[];
  media?: AiMediaItem[];
}

export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  /**
   * Metadata mentah khusus provider, misalnya thoughtSignature Gemini.
   * Tidak pernah ditampilkan ke pengguna dan hanya dipakai saat mengirim
   * kembali riwayat tool call ke provider yang sama.
   */
  providerData?: unknown;
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

/** Provider abstrak (FR-06). */
export interface AiProvider {
  id: string;
  complete(request: AiCompletionRequest): Promise<AiCompletion>;
}

export interface AiProviderErrorOptions {
  provider: string;
  model?: string | null;
  status?: number | null;
  retryable?: boolean;
  cause?: unknown;
}

/**
 * Error provider AI yang aman ditampilkan ke log.
 * Pesan tidak boleh memuat API key atau body permintaan mentah.
 */
export class AiProviderError extends Error {
  readonly provider: string;
  readonly model: string | null;
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, options: AiProviderErrorOptions) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'AiProviderError';
    this.provider = options.provider;
    this.model = options.model ?? null;
    this.status = options.status ?? null;
    this.retryable = options.retryable ?? false;
  }
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
      const pending =
        (last?.content.includes('pendingApproval') ||
          last?.content.includes('pending_approval')) ?? false;
      return {
        text: pending
          ? 'Permintaanmu sudah aku ajukan ke Owner. Tunggu persetujuan sebentar ya.'
          : 'Sudah aku proses ya. Ada lagi yang bisa dibantu?',
        toolCalls: [],
      };
    }

    const rawUser =
      [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    const lastUser = rawUser.replace(/^\[(OWNER|ADMIN|MEMBER)\]\s*/i, '').trim();

    const available = new Set(request.tools.map((tool) => tool.name));
    const sendMatch = /kirim(?:\s+pesan)?\s+ke\s+(\+?[\d][\d\s-]{6,})[:\s]+(.+)/i.exec(lastUser);
    const chosenSendTool = available.has('send_message')
      ? 'send_message'
      : available.has('wa.send_text')
        ? 'wa.send_text'
        : null;
    if (sendMatch && chosenSendTool) {
      return {
        text: '',
        toolCalls: [
          {
            id: `mock-${Date.now()}`,
            name: chosenSendTool,
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
      text: `Aku dengar: "${lastUser}". Respon simulasi.`,
      toolCalls: [],
    };
  }
}
