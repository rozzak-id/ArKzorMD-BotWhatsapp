import { promises as dns } from 'node:dns';

export interface SsrValidationResult {
  safe: boolean;
  reason?: string;
  resolvedIp?: string;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const a = parts[0];
  const b = parts[1];
  if (a === undefined || b === undefined) return true;
  // 0.0.0.0/8
  if (a === 0) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12 (172.16.0.0 – 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 169 && b === 254) return true;
  // 100.64.0.0/10 (CGNAT / Shared Address)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();

  // loopback & unspecified
  if (lower === '::1' || lower === '::') return true;

  // IPv4-mapped IPv6, e.g., ::ffff:127.0.0.1
  if (lower.startsWith('::ffff:') || lower.startsWith('0:0:0:0:0:ffff:')) {
    const ipv4Part = lower.split(':').pop();
    if (ipv4Part && ipv4Part.includes('.')) {
      return isPrivateOrReservedIpv4(ipv4Part);
    }
  }

  // fe80::/10 (link-local: fe8*, fe9*, fea*, feb*)
  if (/^fe[89ab]/i.test(lower)) return true;

  // fc00::/7 (unique local: fc*, fd*)
  if (/^f[cd]/i.test(lower)) return true;

  return false;
}

export function isIpRestricted(ip: string): boolean {
  if (ip.includes(':')) {
    return isPrivateOrReservedIpv6(ip);
  }
  return isPrivateOrReservedIpv4(ip);
}

/**
 * Validasi URL terhadap risiko SSRF:
 * - Hanya skema http dan https
 * - Blokir localhost, .local, .internal
 * - Resolusi DNS dan blokir IP loopback, privat, dan link-local
 */
export async function validateSafeUrl(urlString: string): Promise<SsrValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Format URL tidak valid.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      safe: false,
      reason: `Skema URL '${parsed.protocol}' tidak diizinkan. Hanya http dan https yang diperbolehkan.`,
    };
  }

  let hostname = parsed.hostname.toLowerCase();
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { safe: false, reason: 'Akses ke domain localhost atau domain internal diblokir.' };
  }

  // Jika hostname adalah IP langsung
  if (isIpRestricted(hostname)) {
    return {
      safe: false,
      reason: `Akses ke alamat IP lokal/privat (${hostname}) diblokir.`,
      resolvedIp: hostname,
    };
  }

  // Resolusi DNS untuk memeriksa semua alamat IP terkait
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { safe: false, reason: `Gagal menyelesaikan DNS untuk hostname '${hostname}'.` };
    }

    for (const record of addresses) {
      if (isIpRestricted(record.address)) {
        return {
          safe: false,
          reason: `DNS teresolusi ke alamat privat/terlarang (${record.address}).`,
          resolvedIp: record.address,
        };
      }
    }

    return { safe: true, resolvedIp: addresses[0]?.address };
  } catch (error) {
    return {
      safe: false,
      reason: `Resolusi DNS gagal: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export interface SafeFetchOptions {
  maxRedirects?: number;
  maxBytes?: number;
  timeoutMs?: number;
}

export interface SafeFetchResult {
  ok: boolean;
  status?: number;
  statusText?: string;
  url?: string;
  contentType?: string;
  data?: string;
  error?: string;
}

/**
 * Fetch HTTP dengan perlindungan SSRF bertingkat dan verifikasi redirect.
 */
export async function safeFetch(
  initialUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const maxRedirects = options.maxRedirects ?? 5;
  const maxBytes = options.maxBytes ?? 512 * 1024; // 512 KB
  const timeoutMs = options.timeoutMs ?? 15_000;

  let currentUrl = initialUrl;
  let redirects = 0;

  while (redirects <= maxRedirects) {
    const check = await validateSafeUrl(currentUrl);
    if (!check.safe) {
      return {
        ok: false,
        error: `SSRF Blocked: ${check.reason}`,
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'user-agent': 'ArKzorMD-Bot/0.1 (+https://github.com/rozzak-id/arkzormd)',
          accept: 'text/html,application/json,text/plain,*/*',
        },
        redirect: 'manual',
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Tangani redirect secara manual untuk memeriksa target baru
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          return { ok: false, status: response.status, error: 'Redirect tanpa header Location.' };
        }
        currentUrl = new URL(location, currentUrl).toString();
        redirects += 1;
        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          url: currentUrl,
          error: `HTTP error ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get('content-type') || 'text/plain';
      const text = await response.text();
      const truncated = text.length > maxBytes ? text.slice(0, maxBytes) + '... [konten dipotong]' : text;

      return {
        ok: true,
        status: response.status,
        statusText: response.statusText,
        url: currentUrl,
        contentType,
        data: truncated,
      };
    } catch (error) {
      clearTimeout(timeout);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { ok: false, error: 'Melebihi batas maksimal redirect (5).' };
}
