import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import { PROJECT_ROOT } from './paths.js';

describe('loadConfig', () => {
  it('mengacu ke akar proyek, bukan cwd workspace', () => {
    const config = loadConfig({});

    expect(config.dataDir).toBe(resolve(PROJECT_ROOT, 'data'));
    expect(config.databasePath).toBe(resolve(PROJECT_ROOT, 'data', 'arkzormd.db'));
    expect(config.webDist).toBe(resolve(PROJECT_ROOT, 'apps', 'web', 'dist'));
  });

  it('menormalkan OWNER_JID dan ADMIN_TOKEN', () => {
    const config = loadConfig({
      OWNER_JID: '  6281234567890@s.whatsapp.net  ',
      ADMIN_TOKEN: '  token-uji-yang-cukup-panjang  ',
    });

    expect(config.ownerJid).toBe('6281234567890@s.whatsapp.net');
    expect(config.adminToken).toBe('token-uji-yang-cukup-panjang');
  });

  it('memakai onigis sebagai modul WhatsApp default', () => {
    expect(loadConfig({}).whatsappModule).toBe('onigis');
  });

  it('memakai model default sesuai provider dan membaca fallback/timeout', () => {
    const gemini = loadConfig({
      AI_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'AIza-test-key-1234567890',
      AI_FALLBACK_MODEL: '  gemini-2.5-pro  ',
      AI_TIMEOUT_MS: '45000',
    });

    expect(gemini.aiModel).toBe('gemini-2.5-flash');
    expect(gemini.aiFallbackModel).toBe('gemini-2.5-pro');
    expect(gemini.aiTimeoutMs).toBe(45_000);
    expect(gemini.geminiBaseUrl).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
  });

  it('menolak provider Gemini tanpa API key', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'gemini' })).toThrow(
      /GEMINI_API_KEY wajib diisi/i,
    );
  });

  it('menolak provider OpenAI cloud tanpa API key', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'openai' })).toThrow(
      /OPENAI_API_KEY wajib diisi/i,
    );
  });

  it('mengizinkan endpoint OpenAI lokal tanpa API key', () => {
    const config = loadConfig({
      AI_PROVIDER: 'openai',
      AI_MODEL: 'llama3.1',
      OPENAI_BASE_URL: 'http://127.0.0.1:11434/v1',
    });

    expect(config.aiModel).toBe('llama3.1');
    expect(config.openaiApiKey).toBeNull();
  });

  it('menolak ADMIN_TOKEN yang terlalu pendek', () => {
    expect(() => loadConfig({ ADMIN_TOKEN: 'pendek' })).toThrow(/minimal 16 karakter/i);
  });
});
