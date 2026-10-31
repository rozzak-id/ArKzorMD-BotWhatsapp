import { BaseAiProvider, type BaseProviderOptions } from './base-provider.js';
import { isRecord, postJson } from './http.js';
import {
  AiProviderError,
  type AiCompletion,
  type AiCompletionRequest,
  type AiMessage,
  type AiToolCall,
} from './provider.js';

export interface OpenAiProviderOptions extends BaseProviderOptions {
  apiKey?: string | null;
  /** Base URL API, biasanya berakhir di /v1. */
  baseUrl?: string;
}

function serializeArguments(args: Record<string, unknown>): string {
  return JSON.stringify(args);
}

function toOpenAiMessage(message: AiMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId ?? message.name ?? 'tool',
      ...(message.name ? { name: message.name } : {}),
      content: message.content,
    };
  }

  if (message.role === 'assistant') {
    const toolCalls = message.toolCalls?.map((call) => ({
      id: call.id,
      type: 'function',
      function: {
        name: call.name,
        arguments: serializeArguments(call.arguments),
      },
    }));

    return {
      role: 'assistant',
      content: message.content.trim() ? message.content : null,
      ...(toolCalls && toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    };
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function extractContentText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        isRecord(part) && typeof part.text === 'string' ? part.text : '',
      )
      .join('');
  }
  return '';
}

function parseArguments(
  raw: unknown,
  provider: string,
  model: string,
  toolName: string,
): Record<string, unknown> {
  if (raw === undefined || raw === null || raw === '') return {};
  if (isRecord(raw)) return raw;

  if (typeof raw === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AiProviderError(
        `${provider} mengembalikan argumen tool "${toolName}" yang bukan JSON valid.`,
        { provider, model, retryable: true },
      );
    }
    if (parsed === null) return {};
    if (isRecord(parsed)) return parsed;
  }

  throw new AiProviderError(
    `${provider} mengembalikan argumen tool "${toolName}" dengan format tidak didukung.`,
    { provider, model, retryable: true },
  );
}

function parseToolCalls(
  message: Record<string, unknown>,
  provider: string,
  model: string,
): AiToolCall[] {
  const parsed: AiToolCall[] = [];
  const rawCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];

  for (let index = 0; index < rawCalls.length; index += 1) {
    const rawCall = rawCalls[index];
    if (!isRecord(rawCall)) continue;

    const fn = isRecord(rawCall.function) ? rawCall.function : null;
    const name = typeof fn?.name === 'string' ? fn.name.trim() : '';
    if (!name) {
      throw new AiProviderError(
        `${provider} mengembalikan tool call tanpa nama fungsi.`,
        { provider, model, retryable: true },
      );
    }

    const id =
      typeof rawCall.id === 'string' && rawCall.id.trim()
        ? rawCall.id
        : `openai-${Date.now()}-${index}`;

    parsed.push({
      id,
      name,
      arguments: parseArguments(fn?.arguments, provider, model, name),
    });
  }

  if (parsed.length === 0 && isRecord(message.function_call)) {
    const legacy = message.function_call;
    const name =
      typeof legacy.name === 'string' ? legacy.name.trim() : '';
    if (!name) {
      throw new AiProviderError(
        `${provider} mengembalikan function_call tanpa nama.`,
        { provider, model, retryable: true },
      );
    }
    parsed.push({
      id: `openai-legacy-${Date.now()}`,
      name,
      arguments: parseArguments(legacy.arguments, provider, model, name),
    });
  }

  return parsed;
}

function parseResponse(
  data: Record<string, unknown>,
  provider: string,
  model: string,
): AiCompletion {
  if (isRecord(data.error)) {
    const message =
      typeof data.error.message === 'string'
        ? data.error.message
        : 'error tidak diketahui';
    throw new AiProviderError(`${provider} mengembalikan error: ${message}`, {
      provider,
      model,
      retryable: true,
    });
  }

  const choices = Array.isArray(data.choices) ? data.choices : [];
  const choice = choices[0];
  if (!isRecord(choice)) {
    throw new AiProviderError(`${provider} tidak mengembalikan pilihan respons.`, {
      provider,
      model,
      retryable: true,
    });
  }

  const message = isRecord(choice.message) ? choice.message : null;
  if (!message) {
    throw new AiProviderError(`${provider} tidak mengembalikan pesan.`, {
      provider,
      model,
      retryable: true,
    });
  }

  const text = extractContentText(message.content);
  const toolCalls = parseToolCalls(message, provider, model);

  if (!text.trim() && toolCalls.length === 0) {
    const finishReason =
      typeof choice.finish_reason === 'string'
        ? ` (${choice.finish_reason})`
        : '';
    throw new AiProviderError(
      `${provider} mengembalikan respons kosong${finishReason}.`,
      { provider, model, retryable: true },
    );
  }

  return { text, toolCalls };
}

/**
 * Provider untuk endpoint kompatibel OpenAI Chat Completions:
 * OpenAI, OpenRouter, Ollama, vLLM, LM Studio, dan sejenisnya.
 */
export class OpenAiProvider extends BaseAiProvider {
  readonly id = 'openai';

  private readonly apiKey: string | null;
  private readonly baseUrl: string;

  constructor(options: OpenAiProviderOptions) {
    super(options);
    this.apiKey = options.apiKey?.trim() || null;
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(
      /\/+$/,
      '',
    );

    if (!this.baseUrl) {
      throw new Error('OPENAI_BASE_URL tidak boleh kosong.');
    }
  }

  protected async completeWithModel(
    request: AiCompletionRequest,
    model: string,
  ): Promise<AiCompletion> {
    const payload: Record<string, unknown> = {
      model,
      messages: request.messages.map(toOpenAiMessage),
      stream: false,
    };

    if (request.tools.length > 0) {
      payload.tools = request.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
      payload.tool_choice = 'auto';
    }

    if (request.temperature !== undefined) {
      payload.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      payload.max_tokens = request.maxTokens;
    }

    const headers: Record<string, string> = {
      'user-agent': 'ArKzorMD/0.1',
    };
    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    const data = await postJson({
      provider: this.id,
      model,
      url: `${this.baseUrl}/chat/completions`,
      headers,
      body: payload,
      timeoutMs: this.timeoutMs,
      fetchImpl: this.fetchImpl,
      secrets: [this.apiKey],
    });

    return parseResponse(data, this.id, model);
  }
}
