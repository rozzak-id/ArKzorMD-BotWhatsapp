import { describe, expect, it } from 'vitest';
import { GeminiProvider } from './gemini-provider.js';
import { OpenAiProvider } from './openai-provider.js';
import { AgentOrchestrator } from './agent.js';
import { MockProvider } from './provider.js';
import { MockAdapter } from '../testing/mock-adapter.js';
import { ToolRegistry } from '../tools/registry.js';
import { PermissionEngine } from '../security/permission-engine.js';
import { ApprovalEngine } from '../security/approval-engine.js';
import { AuditLog } from '../audit/audit-log.js';
import { SqliteApprovalStore, SqliteAuditStore } from '../db/sqlite-stores.js';
import { openDatabase } from '../db/index.js';
import { DEFAULT_PERSONA } from '../db/schema.js';
import type { AudioTranscriber, AudioTranscriptionOptions } from './transcriber.js';
import type { FetchLike } from './base-provider.js';
import type { AiMessage, AiCompletionRequest } from './provider.js';
import type { InternalMessage } from '../types.js';

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

describe('Multimodal AI Support (FR-18 & FR-19)', () => {
  it('GeminiProvider menyertakan inlineData saat pesan user memiliki media', async () => {
    const { fetchImpl, calls } = createFetchMock(() =>
      jsonResponse({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'struk belanja indomaret' }],
            },
            finishReason: 'STOP',
          },
        ],
      }),
    );

    const provider = new GeminiProvider({
      model: 'gemini-1.5-flash',
      apiKey: 'test-gemini-key',
      fetchImpl,
    });

    const request: AiCompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'apa isi struk ini?',
          media: [
            {
              mimeType: 'image/jpeg',
              data: 'dGVzdC1pbWFnZS1ieXRlcw==',
            },
          ],
        },
      ],
      tools: [],
    };

    const result = await provider.complete(request);
    expect(result.text).toBe('struk belanja indomaret');

    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0]!.init.body)) as {
      contents: Array<{
        role: string;
        parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
      }>;
    };

    const userContent = body.contents.find((c) => c.role === 'user');
    expect(userContent).toBeDefined();
    expect(userContent?.parts).toHaveLength(2);
    expect(userContent?.parts[0]).toEqual({ text: 'apa isi struk ini?' });
    expect(userContent?.parts[1]).toEqual({
      inlineData: {
        mimeType: 'image/jpeg',
        data: 'dGVzdC1pbWFnZS1ieXRlcw==',
      },
    });
  });

  it('OpenAiProvider menyertakan format image_url data URL saat pesan user memiliki media', async () => {
    const { fetchImpl, calls } = createFetchMock(() =>
      jsonResponse({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'gambar kucing persia',
            },
            finish_reason: 'stop',
          },
        ],
      }),
    );

    const provider = new OpenAiProvider({
      model: 'gpt-4o',
      apiKey: 'test-openai-key',
      fetchImpl,
    });

    const request: AiCompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'foto apa ini?',
          media: [
            {
              mimeType: 'image/png',
              data: 'cG5nLWJ5dGVz',
            },
          ],
        },
      ],
      tools: [],
    };

    const result = await provider.complete(request);
    expect(result.text).toBe('gambar kucing persia');

    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0]!.init.body)) as {
      messages: Array<{
        role: string;
        content: Array<{ type: string; text?: string; image_url?: { url: string } }>;
      }>;
    };

    const userMsg = body.messages.find((m) => m.role === 'user');
    expect(userMsg).toBeDefined();
    expect(Array.isArray(userMsg?.content)).toBe(true);
    expect(userMsg?.content[0]).toEqual({ type: 'text', text: 'foto apa ini?' });
    expect(userMsg?.content[1]).toEqual({
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,cG5nLWJ5dGVz',
      },
    });
  });

  it('AgentOrchestrator mentranskripsi voice note jika ada transcriber (FR-19)', async () => {
    const db = openDatabase(':memory:');
    const auditStore = new SqliteAuditStore(db);
    const approvalStore = new SqliteApprovalStore(db);
    const audit = new AuditLog(auditStore);
    const approvals = new ApprovalEngine(approvalStore, audit);
    const permissions = new PermissionEngine({
      isKillSwitchOn: () => false,
    });
    const tools = new ToolRegistry();
    const adapter = new MockAdapter();

    class RecordingMockProvider extends MockProvider {
      lastReceivedMessages: AiMessage[] = [];
      override async complete(req: AiCompletionRequest) {
        this.lastReceivedMessages = [...req.messages];
        return { text: 'aku dengar vn kamu', toolCalls: [] };
      }
    }

    const provider = new RecordingMockProvider();

    const mockTranscriber: AudioTranscriber = {
      id: 'mock-transcriber',
      transcribe: async (options: AudioTranscriptionOptions) => {
        expect(options.buffer.toString()).toBe('suara rekaman halo arka');
        return 'halo arka apa kabar';
      },
    };

    const agent = new AgentOrchestrator({
      provider,
      adapter,
      tools,
      permissions,
      approvals,
      audit,
      transcriber: mockTranscriber,
      botName: 'Arka',
    });

    const incoming: InternalMessage = {
      id: 'msg-vn-1',
      platform: 'whatsapp',
      chatId: 'user1@s.whatsapp.net',
      chatType: 'private',
      senderId: 'user1@s.whatsapp.net',
      isGroup: false,
      text: '',
      media: [
        {
          kind: 'audio',
          mimeType: 'audio/ogg; codecs=opus',
          buffer: Buffer.from('suara rekaman halo arka'),
        },
      ],
      mentions: [],
      timestamp: Date.now(),
      fromBot: false,
    };

    const res = await agent.run({
      message: incoming,
      role: 'member',
      persona: DEFAULT_PERSONA,
      history: [],
    });

    expect(res.text).toBe('aku dengar vn kamu');
    const userPromptMsg = provider.lastReceivedMessages.find((m) => m.role === 'user');
    expect(userPromptMsg?.content).toContain('[Pesan Suara Pengguna]: "halo arka apa kabar"');
  });
});
