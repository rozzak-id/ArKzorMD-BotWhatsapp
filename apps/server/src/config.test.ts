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

  it('menolak ADMIN_TOKEN yang terlalu pendek', () => {
    expect(() => loadConfig({ ADMIN_TOKEN: 'pendek' })).toThrow(/minimal 16 karakter/i);
  });
});
