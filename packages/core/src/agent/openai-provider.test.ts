import { describe, expect, it } from 'vitest';
import { OpenAiProvider } from './openai-provider.js';
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

describe('OpenAiProvider', () => {
  it('mengirim chat completion dan membaca teks', async () => {
    const { fetchImpl, calls } = createFetchMock(() =>
      jsonResponse({
        choices: [
          {
            message: { role: 'assistant', content: 'Halo juga!' },
            finish_reason: 'stop',
          },
        ],
      }),
    );
    const provider = new OpenAiProvider({
      apiKey: 'sk-test-key-1234567890',
      baseUrl: 'https://example.test/v1/',
      model: 'gpt-test',
      timeoutMs: 5_000,
      fetchImpl,
    });

    const result = await provider.complete({
      messages: [
        { role: 'system', content: 'Kamu Arka.' },
        { role: 'user', content: 'Halo' },
      ],
      tools: TOOLS,
      temperature: 0.2,
      maxTokens: 64,
    });

    expect(result).toEqual({ text: 'Halo juga!', toolCalls: [] });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://example.test/v1/chat/completions');

    const body = bodyOf(calls[0]!);
    expect(body.model).toBe('gpt-test');
    expect(body.stream).toBe(false);
    expect(body.temperature).toBe(0.2);
    expect(body.max_tokens).toBe(64);
    expect(body.tool_choice).toBe('auto');
    expect(body.messages).toEqual([
      { role: 'system', content: 'Kamu Arka.' },
      { role: 'user', content: 'Halo' },
    ]);
    expect(body.tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'send_message',
          description: 'Kirim pesan ke kontak lain.',
          parameters: TOOLS[0]!.parameters,
        },
      },
    ]);
    expect(headersOf(calls[0]!).get('authorization')).toBe(
      'Bearer sk-test-key-1234567890',
    );
  });

  it('memetakan tool call dan mengirim tool result kembali', async () => {
    let requestIndex = 0;
    const { fetchImpl, calls } = createFetchMock(() => {
      requestIndex += 1;
      if (requestIndex === 1) {
        return jsonResponse({
          choices: [
            {
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [
                  {
                    id: 'call_1',
                    type: 'function',
                    function: {
                      name: 'send_message',
                      arguments:
                        '{"to":"6281234567890","text":"rapat jam 3"}',
                    },
                  },
                ],
              },
              finish_reason: 'tool_calls',
            },
          ],
        });
      }
      return jsonResponse({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'Pesan sudah dikirim.',
            },
            finish_reason: 'stop',
          },
        ],
      });
    });
    const provider = new OpenAiProvider({
      model: 'gpt-test',
      timeoutMs: 5_000,
      fetchImpl,
    });

    const first = await provider.complete({
      messages: [{ role: 'user', content: 'kirim pesan' }],
      tools: TOOLS,
    });

    expect(first.text).toBe('');
    expect(first.toolCalls).toEqual([
      {
        id: 'call_1',
        name: 'send_message',
        arguments: { to: '6281234567890', text: 'rapat jam 3' },
      },
    ]);

    const toolCall = first.toolCalls[0]!;
    await provider.complete({
      messages: [
        { role: 'user', content: 'kirim pesan' },
        {
          role: 'assistant',
          content: '',
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
    expect(followUp.messages).toEqual([
      { role: 'user', content: 'kirim pesan' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'send_message',
              arguments: '{"to":"6281234567890","text":"rapat jam 3"}',
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: 'call_1',
        name: 'send_message',
        content: '{"ok":true}',
      },
    ]);
  });

  it('mencoba model fallback saat model utama gagal', async () => {
    const models: string[] = [];
    const { fetchImpl } = createFetchMock((_url, init) => {
      const body = JSON.parse(String(init.body)) as { model: string };
      models.push(body.model);
      return models.length === 1
        ? jsonResponse({ error: { message: 'server sibuk' } }, 503)
        : jsonResponse({
            choices: [
              {
                message: { role: 'assistant', content: 'Dari fallback.' },
                finish_reason: 'stop',
              },
            ],
          });
    });
    const provider = new OpenAiProvider({
      model: 'gpt-primary',
      fallbackModel: 'gpt-fallback',
      timeoutMs: 5_000,
      fetchImpl,
    });

    const result = await provider.complete({
      messages: [{ role: 'user', content: 'halo' }],
      tools: [],
    });

    expect(models).toEqual(['gpt-primary', 'gpt-fallback']);
    expect(result.text).toBe('Dari fallback.');
  });

  it('tidak mencoba fallback untuk error autentikasi', async () => {
    const { fetchImpl, calls } = createFetchMock(() =>
      jsonResponse({ error: { message: 'Unauthorized' } }, 401),
    );
    const provider = new OpenAiProvider({
      model: 'gpt-primary',
      fallbackModel: 'gpt-fallback',
      timeoutMs: 5_000,
      fetchImpl,
    });

    await expect(
      provider.complete({
        messages: [{ role: 'user', content: 'halo' }],
        tools: [],
      }),
    ).rejects.toThrow(/HTTP 401/);
    expect(calls).toHaveLength(1);
  });

  it('menyaring API key dari pesan error provider', async () => {
    const apiKey = 'sk-secret-error-1234567890';
    const { fetchImpl } = createFetchMock(() =>
      jsonResponse(
        { error: { message: `Incorrect API key provided: ${apiKey}` } },
        401,
      ),
    );
    const provider = new OpenAiProvider({
      apiKey,
      model: 'gpt-test',
      timeoutMs: 5_000,
      fetchImpl,
    });

    const error = (await provider
      .complete({
        messages: [{ role: 'user', content: 'halo' } as AiMessage],
        tools: [],
      })
      .catch((caught: unknown) => caught)) as Error;

    expect(error.message).not.toContain(apiKey);
    expect(error.message).toContain('[redacted]');
  });
});
