import type { FetchLike } from './base-provider.js';
import { AiProviderError } from './provider.js';

export interface PostJsonOptions {
  provider: string;
  model: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  timeoutMs: number;
  fetchImpl: FetchLike;
  /** Nilai yang tidak boleh muncul di pesan error, misalnya API key. */
  secrets?: Array<string | null | undefined>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function scrubSecrets(
  text: string,
  secrets: Array<string | null | undefined>,
): string {
  let output = text;
  for (const secret of secrets) {
    const value = secret?.trim();
    if (value && value.length >= 4) {
      output = output.split(value).join('[redacted]');
    }
  }
  return output;
}

function truncate(text: string, max = 500): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

function apiErrorDetail(data: unknown, raw: string): string {
  if (isRecord(data)) {
    const error = data.error;
    if (typeof error === 'string') return error;
    if (isRecord(error) && typeof error.message === 'string') {
      return error.message;
    }
    if (typeof data.message === 'string') return data.message;
  }
  return raw || '(respons kosong)';
}

function retryableStatus(status: number): boolean {
  if (status === 404 || status === 408 || status === 409 || status === 425) {
    return true;
  }
  if (status === 429) return true;
  return status >= 500;
}

/**
 * POST JSON dengan timeout dan error yang sudah disanitasi.
 * Tidak pernah menulis request body, header Authorization, atau API key
 * ke pesan error.
 */
export async function postJson(
  options: PostJsonOptions,
): Promise<Record<string, unknown>> {
  const {
    provider,
    model,
    url,
    headers,
    body,
    timeoutMs,
    fetchImpl,
    secrets = [],
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await response.text();
    let parsed: unknown = null;
    if (raw.trim()) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        if (response.ok) {
          throw new AiProviderError(
            `Respons ${provider} bukan JSON yang valid.`,
            {
              provider,
              model,
              status: response.status,
              retryable: true,
            },
          );
        }
      }
    }

    if (!response.ok) {
      const detail = truncate(
        scrubSecrets(apiErrorDetail(parsed, raw), secrets),
      );
      throw new AiProviderError(
        `${provider} mengembalikan HTTP ${response.status}: ${detail}`,
        {
          provider,
          model,
          status: response.status,
          retryable: retryableStatus(response.status),
        },
      );
    }

    if (!isRecord(parsed)) {
      throw new AiProviderError(`Respons ${provider} kosong atau tidak valid.`, {
        provider,
        model,
        status: response.status,
        retryable: true,
      });
    }

    return parsed;
  } catch (error) {
    if (error instanceof AiProviderError) throw error;

    if (controller.signal.aborted) {
      throw new AiProviderError(
        `Permintaan ke ${provider} melewati batas waktu ${timeoutMs} ms.`,
        {
          provider,
          model,
          retryable: true,
          cause: error,
        },
      );
    }

    throw new AiProviderError(
      `Tidak bisa menghubungi ${provider}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      {
        provider,
        model,
        retryable: true,
        cause: error,
      },
    );
  } finally {
    clearTimeout(timer);
  }
}
