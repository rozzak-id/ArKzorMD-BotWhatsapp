export interface AudioTranscriptionOptions {
  buffer: Buffer;
  mimeType?: string;
  fileName?: string;
  language?: string;
  prompt?: string;
}

export interface AudioTranscriber {
  readonly id: string;
  transcribe(options: AudioTranscriptionOptions): Promise<string | null>;
}

export interface WhisperTranscriberOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * Transkripsi audio via OpenAI/Groq Whisper API (FR-19).
 */
export class WhisperAudioTranscriber implements AudioTranscriber {
  readonly id = 'whisper';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: WhisperTranscriberOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.model = options.model ?? 'whisper-1';
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async transcribe(options: AudioTranscriptionOptions): Promise<string | null> {
    if (!this.apiKey || !options.buffer || options.buffer.length === 0) {
      return null;
    }

    try {
      const mime = options.mimeType ?? 'audio/ogg';
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : 'ogg';
      const fileName = options.fileName ?? `voice_note.${ext}`;

      const blob = new Blob([new Uint8Array(options.buffer)], { type: mime });
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('model', this.model);
      if (options.language) {
        formData.append('language', options.language);
      }
      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as { text?: unknown };
      if (typeof data?.text === 'string' && data.text.trim().length > 0) {
        return data.text.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
}

export interface GeminiTranscriberOptions {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * Transkripsi audio via Google Gemini Multimodal Audio (FR-19).
 */
export class GeminiAudioTranscriber implements AudioTranscriber {
  readonly id = 'gemini';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiTranscriberOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/+$/, '');
    this.model = options.model ?? 'gemini-1.5-flash';
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  async transcribe(options: AudioTranscriptionOptions): Promise<string | null> {
    if (!this.apiKey || !options.buffer || options.buffer.length === 0) {
      return null;
    }

    try {
      const mime = options.mimeType ?? 'audio/ogg';
      const base64Audio = options.buffer.toString('base64');

      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: 'Transkripsikan isi rekaman suara/audio ini secara persis ke dalam teks bahasa Indonesia atau bahasa aslinya. Hanya cetak teks transkripsi tanpa komentar, tanda kutip, atau tambahan apa pun.',
              },
              {
                inlineData: {
                  mimeType: mime,
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text === 'string' && text.trim().length > 0) {
        return text.trim();
      }
      return null;
    } catch {
      return null;
    }
  }
}
