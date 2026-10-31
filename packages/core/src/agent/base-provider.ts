import type { AiCompletion, AiCompletionRequest, AiProvider } from './provider.js';
import { AiProviderError } from './provider.js';

/** Fetch yang bisa diganti saat pengujian, tanpa memanggil jaringan. */
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

/** Bagian logger pino yang dipakai provider; cukup untuk fallback warning. */
export interface ProviderLogger {
  warn(obj: Record<string, unknown>, message?: string): void;
}

export interface BaseProviderOptions {
  model: string;
  fallbackModel?: string | null;
  /** Batas waktu satu request, termasuk membaca body respons. */
  timeoutMs?: number;
  logger?: ProviderLogger;
  fetchImpl?: FetchLike;
}

/**
 * Basis provider HTTP dengan fallback model.
 *
 * Provider utama dicoba lebih dulu. Jika gagal dengan error yang bisa
 * diulang (429, 5xx, timeout, jaringan, model tidak ditemukan), model
 * cadangan dicoba sekali. Error 400/401/403 tidak diulang karena biasanya
 * bukan masalah model.
 */
export abstract class BaseAiProvider implements AiProvider {
  abstract readonly id: string;

  protected readonly model: string;
  protected readonly fallbackModel: string | null;
  protected readonly timeoutMs: number;
  protected readonly logger: ProviderLogger | undefined;
  protected readonly fetchImpl: FetchLike;

  protected constructor(options: BaseProviderOptions) {
    const model = options.model.trim();
    if (!model) {
      throw new Error('Model AI wajib diisi.');
    }

    const fallback = options.fallbackModel?.trim() || null;
    const timeoutMs = options.timeoutMs ?? 60_000;
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000) {
      throw new Error('Timeout provider AI minimal 1000 ms.');
    }

    this.model = model;
    this.fallbackModel = fallback && fallback !== model ? fallback : null;
    this.timeoutMs = timeoutMs;
    this.logger = options.logger;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletion> {
    const models = this.fallbackModel
      ? [this.model, this.fallbackModel]
      : [this.model];

    let lastError: AiProviderError | null = null;

    for (let index = 0; index < models.length; index += 1) {
      const model = models[index]!;
      try {
        return await this.completeWithModel(request, model);
      } catch (error) {
        const wrapped =
          error instanceof AiProviderError
            ? error
            : new AiProviderError(
                `Provider ${this.id} gagal: ${
                  error instanceof Error ? error.message : String(error)
                }`,
                {
                  provider: this.id,
                  model,
                  retryable: false,
                  cause: error,
                },
              );

        lastError = wrapped;
        const hasFallback = index < models.length - 1;
        if (!hasFallback || !wrapped.retryable) {
          throw wrapped;
        }

        this.logger?.warn(
          {
            provider: this.id,
            model,
            status: wrapped.status,
            err: wrapped.message,
          },
          'Model AI gagal; mencoba model fallback',
        );
      }
    }

    throw (
      lastError ??
      new AiProviderError(`Provider ${this.id} gagal tanpa detail.`, {
        provider: this.id,
        model: this.model,
        retryable: false,
      })
    );
  }

  protected abstract completeWithModel(
    request: AiCompletionRequest,
    model: string,
  ): Promise<AiCompletion>;
}
