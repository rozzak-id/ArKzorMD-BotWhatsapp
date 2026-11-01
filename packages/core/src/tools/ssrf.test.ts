import { describe, expect, it, vi } from 'vitest';
import { isIpRestricted, safeFetch, validateSafeUrl } from './ssrf.js';

describe('SSRF Protection (web.fetch & safeFetch - Langkah 7)', () => {
  it('Memblokir skema selain http dan https', async () => {
    const fileRes = await validateSafeUrl('file:///etc/passwd');
    expect(fileRes.safe).toBe(false);
    expect(fileRes.reason).toContain('Skema URL');

    const ftpRes = await validateSafeUrl('ftp://example.com/file.txt');
    expect(ftpRes.safe).toBe(false);

    const gopherRes = await validateSafeUrl('gopher://example.com');
    expect(gopherRes.safe).toBe(false);

    const dataRes = await validateSafeUrl('data:text/plain;base64,SGVsbG8=');
    expect(dataRes.safe).toBe(false);
  });

  it('Memblokir domain localhost dan internal', async () => {
    expect((await validateSafeUrl('http://localhost:3000')).safe).toBe(false);
    expect((await validateSafeUrl('http://sub.localhost:8080')).safe).toBe(false);
    expect((await validateSafeUrl('http://myservice.local')).safe).toBe(false);
    expect((await validateSafeUrl('http://backend.internal')).safe).toBe(false);
  });

  it('Memblokir seluruh rentang IPv4 terlarang (loopback, private, link-local, cloud metadata)', () => {
    // 127.0.0.0/8 (loopback)
    expect(isIpRestricted('127.0.0.1')).toBe(true);
    expect(isIpRestricted('127.255.255.254')).toBe(true);

    // 10.0.0.0/8 (Class A private)
    expect(isIpRestricted('10.0.0.1')).toBe(true);
    expect(isIpRestricted('10.254.1.2')).toBe(true);

    // 172.16.0.0/12 (Class B private: 172.16 - 172.31)
    expect(isIpRestricted('172.16.0.1')).toBe(true);
    expect(isIpRestricted('172.31.255.254')).toBe(true);
    // 172.32.0.1 bukan private
    expect(isIpRestricted('172.32.0.1')).toBe(false);

    // 192.168.0.0/16 (Class C private)
    expect(isIpRestricted('192.168.0.1')).toBe(true);
    expect(isIpRestricted('192.168.100.50')).toBe(true);

    // 169.254.0.0/16 (link-local & AWS/GCP metadata)
    expect(isIpRestricted('169.254.169.254')).toBe(true);
    expect(isIpRestricted('169.254.1.1')).toBe(true);

    // 0.0.0.0/8
    expect(isIpRestricted('0.0.0.0')).toBe(true);

    // Public IP sah
    expect(isIpRestricted('8.8.8.8')).toBe(false);
    expect(isIpRestricted('1.1.1.1')).toBe(false);
  });

  it('Memblokir IPv6 loopback, link-local, unique local, dan IPv4-mapped IPv6', () => {
    // ::1 (loopback)
    expect(isIpRestricted('::1')).toBe(true);
    expect(isIpRestricted('::')).toBe(true);

    // fe80::/10 (link-local)
    expect(isIpRestricted('fe80::1')).toBe(true);
    expect(isIpRestricted('fe90::1')).toBe(true);
    expect(isIpRestricted('febf::ffff')).toBe(true);

    // fc00::/7 (unique local)
    expect(isIpRestricted('fc00::1')).toBe(true);
    expect(isIpRestricted('fd12:3456::1')).toBe(true);

    // IPv4-mapped IPv6 (::ffff:127.0.0.1 atau ::ffff:192.168.1.1)
    expect(isIpRestricted('::ffff:127.0.0.1')).toBe(true);
    expect(isIpRestricted('::ffff:192.168.1.1')).toBe(true);
    expect(isIpRestricted('::ffff:10.0.0.1')).toBe(true);

    // Public IPv6 sah
    expect(isIpRestricted('2001:4860:4860::8888')).toBe(false);
  });

  it('validateSafeUrl memblokir IP privat langsung di URL', async () => {
    expect((await validateSafeUrl('http://127.0.0.1:3000/api')).safe).toBe(false);
    expect((await validateSafeUrl('http://10.0.0.5/secret')).safe).toBe(false);
    expect((await validateSafeUrl('http://192.168.1.1/admin')).safe).toBe(false);
    expect((await validateSafeUrl('http://169.254.169.254/latest/meta-data')).safe).toBe(false);
    expect((await validateSafeUrl('http://[::1]:8080/')).safe).toBe(false);
  });

  it('safeFetch memblokir redirect ke alamat privat internal', async () => {
    // Simulasikan fetch global untuk menguji redirect
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn();

    // Request pertama: ke server publik sah yang mengembalikan HTTP 302 ke 127.0.0.1
    fetchMock.mockResolvedValueOnce({
      status: 302,
      ok: false,
      headers: {
        get: (h: string) => (h.toLowerCase() === 'location' ? 'http://127.0.0.1:3000/admin' : null),
      },
    });

    globalThis.fetch = fetchMock as any;

    try {
      // Kita gunakan domain publik sah yang lolos cek awal, tapi redirect ke 127.0.0.1
      const res = await safeFetch('https://example.com');
      expect(res.ok).toBe(false);
      expect(res.error).toContain('SSRF Blocked');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

