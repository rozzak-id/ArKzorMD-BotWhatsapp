const SENSITIVE_KEY = /(api[_-]?key|token|secret|password|authorization|cookie)/i;

/**
 * Menghapus nilai sensitif sebelum masuk log/audit.
 * Kunci sensitif diganti "[redacted]", sedangkan string yang menyerupai
 * API key (sk-..., AIza..., token panjang) disamarkan.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[max-depth]';
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (/^sk-[A-Za-z0-9_-]{16,}$/.test(value)) return '[redacted]';
    if (/^AIza[A-Za-z0-9_-]{20,}$/.test(value)) return '[redacted]';
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redact(item, depth + 1);
    }
    return output;
  }

  return value;
}
