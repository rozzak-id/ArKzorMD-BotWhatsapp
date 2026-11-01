import { BaseAiProvider, type BaseProviderOptions } from './base-provider.js';
import { isRecord, postJson } from './http.js';
import {
  AiProviderError,
  type AiCompletion,
  type AiCompletionRequest,
  type AiMessage,
  type AiToolCall,
} from './provider.js';

export interface GeminiProviderOptions extends BaseProviderOptions {
  apiKey?: string | null;
  /** Base URL API Gemini, biasanya berakhir di /v1beta. */
  baseUrl?: string;
}

const GEMINI_SCHEMA_KEYS = new Set([
  'type',
  'format',
  'title',
  'description',
  'nullable',
  'default',
  'items',
  'enum',
  'properties',
  'required',
  'minItems',
  'maxItems',
  'minProperties',
  'maxProperties',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'pattern',
  'example',
  'anyOf',
  'propertyOrdering',
]);

/**
 * Gemini memakai subset OpenAPI Schema. Buang kata kunci JSON Schema yang
 * tidak dikenal (misalnya additionalProperties) agar request tidak 400.
 */
function sanitizeSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeSchema);
  if (!isRecord(value)) return value;

  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!GEMINI_SCHEMA_KEYS.has(key)) continue;

    if (key === 'properties' && isRecord(child)) {
      output.properties = Object.fromEntries(
        Object.entries(child).map(([name, schema]) => [
          name,
          sanitizeSchema(schema),
        ]),
      );
      continue;
    }

    if (key === 'items' || key === 'anyOf') {
      output[key] = sanitizeSchema(child);
      continue;
    }

    output[key] = child;
  }

  return output;
}

function appendContent(
  contents: Array<Record<string, unknown>>,
  role: 'user' | 'model',
  parts: Array<Record<string, unknown>>,
): void {
  if (parts.length === 0) return;
  const last = contents[contents.length - 1];
  if (last && last.role === role && Array.isArray(last.parts)) {
    last.parts.push(...parts);
    return;
  }
  contents.push({ role, parts });
}

function toolResultStruct(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, error: 'Tool tidak mengembalikan hasil.' };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isRecord(parsed)) return parsed;
    return { result: parsed };
  } catch {
    return { result: content };
  }
}

function buildContents(messages: AiMessage[]): {
  systemText: string;
  contents: Array<Record<string, unknown>>;
} {
  const systemParts: string[] = [];
  const contents: Array<Record<string, unknown>> = [];

  for (const message of messages) {
    if (message.role === 'system') {
      if (message.content.trim()) systemParts.push(message.content);
      continue;
    }

    if (message.role === 'assistant') {
      const parts: Array<Record<string, unknown>> = [];
      if (message.content.trim()) {
        parts.push({ text: message.content });
      }

      for (const call of message.toolCalls ?? []) {
        const raw =
          isRecord(call.providerData) && isRecord(call.providerData.functionCall)
            ? call.providerData
            : null;
        if (raw) {
          // Pertahankan thoughtSignature dan metadata lain dari Gemini.
          parts.push({ ...raw });
        } else {
          parts.push({
            functionCall: {
              name: call.name,
              args: call.arguments,
            },
          });
        }
      }

      appendContent(contents, 'model', parts);
      continue;
    }

    if (message.role === 'tool') {
      appendContent(contents, 'user', [
        {
          functionResponse: {
            name: message.name ?? 'tool',
            response: toolResultStruct(message.content),
          },
        },
      ]);
      continue;
    }

    const userParts: Array<Record<string, unknown>> = [];
    if (message.content.trim()) {
      userParts.push({ text: message.content });
    }
    for (const item of message.media ?? []) {
      if (item.data && item.mimeType) {
        userParts.push({
          inlineData: {
            mimeType: item.mimeType,
            data: item.data,
          },
        });
      }
    }
    if (userParts.length > 0) {
      appendContent(contents, 'user', userParts);
    }
  }

  return {
    systemText: systemParts.join('\n\n').trim(),
    contents,
  };
}

function parseArguments(
  raw: unknown,
  provider: string,
  model: string,
  toolName: string,
): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (isRecord(raw)) return raw;

  throw new AiProviderError(
    `${provider} mengembalikan argumen tool "${toolName}" dengan format tidak didukung.`,
    { provider, model, retryable: true },
  );
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

  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const candidate = candidates[0];
  if (!isRecord(candidate)) {
    const feedback = isRecord(data.promptFeedback)
      ? data.promptFeedback
      : null;
    const blockReason =
      feedback && typeof feedback.blockReason === 'string'
        ? feedback.blockReason
        : null;
    throw new AiProviderError(
      blockReason
        ? `${provider} memblokir permintaan (${blockReason}).`
        : `${provider} tidak mengembalikan kandidat respons.`,
      { provider, model, retryable: true },
    );
  }

  const content = isRecord(candidate.content) ? candidate.content : null;
  const parts =
    content && Array.isArray(content.parts) ? content.parts : [];
  const textParts: string[] = [];
  const toolCalls: AiToolCall[] = [];

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!isRecord(part)) continue;

    if (typeof part.text === 'string' && part.thought !== true) {
      textParts.push(part.text);
    }

    const functionCall = isRecord(part.functionCall)
      ? part.functionCall
      : null;
    if (!functionCall) continue;

    const name =
      typeof functionCall.name === 'string'
        ? functionCall.name.trim()
        : '';
    if (!name) {
      throw new AiProviderError(
        `${provider} mengembalikan function call tanpa nama.`,
        { provider, model, retryable: true },
      );
    }

    toolCalls.push({
      id: `gemini-${Date.now()}-${index}`,
      name,
      arguments: parseArguments(
        functionCall.args,
        provider,
        model,
        name,
      ),
      providerData: { ...part },
    });
  }

  const text = textParts.join('');
  if (!text.trim() && toolCalls.length === 0) {
    const finishReason =
      typeof candidate.finishReason === 'string'
        ? ` (${candidate.finishReason})`
        : '';
    throw new AiProviderError(
      `${provider} mengembalikan respons kosong${finishReason}.`,
      { provider, model, retryable: true },
    );
  }

  return { text, toolCalls };
}

/**
 * Provider Google Gemini generateContent dengan function calling.
 * API key dikirim lewat header, bukan query string, agar tidak bocor ke log URL.
 */
export class GeminiProvider extends BaseAiProvider {
  readonly id = 'gemini';

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(options: GeminiProviderOptions) {
    super(options);
    const apiKey = options.apiKey?.trim() ?? '';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY wajib diisi untuk provider Gemini.');
    }

    this.apiKey = apiKey;
    this.baseUrl = (
      options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');

    if (!this.baseUrl) {
      throw new Error('GEMINI_BASE_URL tidak boleh kosong.');
    }
  }

  private endpoint(model: string): string {
    const trimmed = model.trim().replace(/^models\//, '');
    const path = model.trim().startsWith('tunedModels/')
      ? model.trim()
      : `models/${trimmed}`;
    return `${this.baseUrl}/${path}:generateContent`;
  }

  protected async completeWithModel(
    request: AiCompletionRequest,
    model: string,
  ): Promise<AiCompletion> {
    const { systemText, contents } = buildContents(request.messages);
    const payload: Record<string, unknown> = { contents };

    if (systemText) {
      payload.systemInstruction = { parts: [{ text: systemText }] };
    }

    if (request.tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: request.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: sanitizeSchema(tool.parameters),
          })),
        },
      ];
    }

    const generationConfig: Record<string, unknown> = {};
    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }
    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }
    if (Object.keys(generationConfig).length > 0) {
      payload.generationConfig = generationConfig;
    }

    const data = await postJson({
      provider: this.id,
      model,
      url: this.endpoint(model),
      headers: {
        'x-goog-api-key': this.apiKey,
        'user-agent': 'ArKzorMD/0.1',
      },
      body: payload,
      timeoutMs: this.timeoutMs,
      fetchImpl: this.fetchImpl,
      secrets: [this.apiKey],
    });

    return parseResponse(data, this.id, model);
  }
}
