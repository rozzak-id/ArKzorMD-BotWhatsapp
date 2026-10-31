import { describe, expect, it } from 'vitest';
import { GeminiProvider } from './gemini-provider.js';
import type { FetchLike } from './base-provider.js';
import type { AiMessage } from './provider.js';
import type { ToolSchema } from '../types.js';

const TOOLS: ToolSchema[] = [
  {
    name: 'send_message',
    description: 'Kirim pesan ke kontak lain.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Nomor tujuan' },
        text: { type: 'string', description: 'Isi pesan' },
      },
      required: ['to', 'text'],
      additionalProperties: false,
    },
    risk: 'L1',
    allowedRoles: ['owner', 'admin'],
  },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function createFetchMock(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
): {
  fetchImpl: FetchLike;
  calls: Array<{ url: string; init: RequestInit }>;
} {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: FetchLike = async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const requestInit = init ?? {};
    calls.push({ url, init: requestInit });
    return handler(url, requestInit);
  };
  return { fetchImpl, calls };
}

function bodyOf(call: { init: RequestInit }): Record<string, unknown> {
  return JSON.parse(String(call.init.body)) as Record<string, unknown>;
}

function headersOf(call: { init: RequestInit }): Headers {
  return new Headers(call.init.headers);
}

describe('GeminiProvider', () => {
  it('mengirim generateContent dengan system instruction dan skema tersaring', async () => {
    const { fetchImpl, calls } = createFetchMock(() =>
      jsonResponse({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'Halo juga!' }],
            },
            finishReason: 'STOP',
          },
        ],
      }),
    );
    const provider = new GeminiProvider({
      apiKey: 'AIza-test-key-1234567890',
      baseUrl: 'https://gemini.test/v1beta/',
      model: 'gemini-test',
      timeoutMs: 5_000,
      fetchImpl,
    });

    const result = await provider.complete({
      messages: [
        { role: 'system', content: 'Kamu Arka.' },
        { role: 'user', content: 'Halo' },
      ],
      tools: TOOLS,
      temperature: 0.4,
      maxTokens: 128,
    });

    expect(result).toEqual({ text: 'Halo juga!', toolCalls: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      'https://gemini.test/v1beta/models/gemini-test:generateContent',
    );
    expect(headersOf(calls[0]!).get('x-goog-api-key')).toBe(
      'AIza-test-key-1234567890',
    );

    const body = bodyOf(calls[0]!);
    expect(body.systemInstruction).toEqual({
      parts: [{ text: 'Kamu Arka.' }],
    });
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Halo' }] },
    ]);
    expect(body.generationConfig).toEqual({
      temperature: 0.4,
      maxOutputTokens: 128,
    });

    const tools = body.tools as Array<{
      functionDeclarations: Array<{
        name: string;
        parameters: Record<string, unknown>;
      }>;
    }>;
    expect(tools[0]?.functionDeclarations[0]?.name).toBe('send_message');
    expect(tools[0]?.functionDeclarations[0]?.parameters).not.toHaveProperty(
      'additionalProperties',
    );
  });

  it('memetakan function call, thoughtSignature, dan function response', async () => {
    let requestIndex = 0;
    const { fetchImpl, calls } = createFetchMock(() => {
      requestIndex += 1;
      if (requestIndex === 1) {
        return jsonResponse({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  { text: 'Saya cek dulu.' },
                  {
                    functionCall: {
                      name: 'send_message',
                      args: {
                        to: '6281234567890',
                        text: 'rapat jam 3',
                      },
                    },
                    thoughtSignature: 'sig-1',
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        });
      }
      return jsonResponse({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'Pesan sudah dikirim.' }],
            },
            finishReason: 'STOP',
          },
        ],
      });
    });
    const provider = new GeminiProvider({
      apiKey: 'AIza-test-key-1234567890',
      baseUrl: 'https://gemini.test/v1beta',
      model: 'gemini-test',
      timeoutMs: 5_000,
      fetchImpl,
    });

    const first = await provider.complete({
      messages: [{ role: 'user', content: 'kirim pesan' }],
      tools: TOOLS,
    });

    expect(first.text).toBe('Saya cek dulu.');
    expect(first.toolCalls).toHaveLength(1);
    const toolCall = first.toolCalls[0]!;
    expect(toolCall.name).toBe('send_message');
    expect(toolCall.arguments).toEqual({
      to: '6281234567890',
      text: 'rapat jam 3',
    });
    expect(toolCall.providerData).toEqual({
      functionCall: {
        name: 'send_message',
        args: { to: '6281234567890', text: 'rapat jam 3' },
      },
      thoughtSignature: 'sig-1',
    });

    await provider.complete({
      messages: [
        { role: 'user', content: 'kirim pesan' },
        {
          role: 'assistant',
          content: 'Saya cek dulu.',
          toolCalls: [toolCall],
        },
        {
          role: 'tool',
          toolCallId: toolCall.id,
          name: toolCall.name,
          content: '{"ok":true}',
        },
      ],
      tools: TOOLS,
    });

    const followUp = bodyOf(calls[1]!);
    const contents = followUp.contents as Array<{
      role: string;
      parts: Array<Record<string, unknown>>;
    }>;
    expect(contents[1]).toEqual({
      role: 'model',
      parts: [
        { text: 'Saya cek dulu.' },
        {
          functionCall: {
            name: 'send_message',
            args: { to: '6281234567890', text: 'rapat jam 3' },
          },
          thoughtSignature: 'sig-1',
        },
      ],
    });
    expect(contents[2]).toEqual({
      role: 'user',
      parts: [
        {
          functionResponse: {
            name: 'send_message',
            response: { ok: true },
          },
        },
      ],
    });
  });

  it('mencoba model fallback saat model utama gagal', async () => {
    const urls: string[] = [];
    const { fetchImpl } = createFetchMock((url) => {
      urls.push(url);
      return urls.length === 1
        ? jsonResponse({ error: { message: 'rate limit' } }, 429)
        : jsonResponse({
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [{ text: 'Dari fallback.' }],
                },
                finishReason: 'STOP',
              },
            ],
          });
    });
    const provider = new GeminiProvider({
      apiKey: 'AIza-test-key-1234567890',
      baseUrl: 'https://gemini.test/v1beta',
      model: 'gemini-primary',
      fallbackModel: 'gemini-fallback',
      timeoutMs: 5_000,
      fetchImpl,
    });

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'halo' } as AiMessage],
      tools: [],
    });

    expect(urls).toEqual([
      'https://gemini.test/v1beta/models/gemini-primary:generateContent',
      'https://gemini.test/v1beta/models/gemini-fallback:generateContent',
    ]);
    expect(result.text).toBe('Dari fallback.');
  });

  it('melaporkan respons yang diblokir', async () => {
    const { fetchImpl } = createFetchMock(() =>
      jsonResponse({
        promptFeedback: { blockReason: 'SAFETY' },
      }),
    );
    const provider = new GeminiProvider({
      apiKey: 'AIza-test-key-1234567890',
      baseUrl: 'https://gemini.test/v1beta',
      model: 'gemini-test',
      timeoutMs: 5_000,
      fetchImpl,
    });

    await expect(
      provider.complete({
        messages: [{ role: 'user', content: 'halo' }],
        tools: [],
      }),
    ).rejects.toThrow(/SAFETY/);
  });
});
