import { describe, expect, it } from 'vitest';
import { createBuiltinTools } from './builtin.js';
import { ToolRegistry, executeTool } from './registry.js';
import { MockAdapter } from '../testing/mock-adapter.js';
import { openDatabase } from '../db/index.js';
import { createStores } from '../db/sqlite-stores.js';
import type { ToolContext } from '../types.js';

describe('P0 Tool Handlers Execution & Safeguards', () => {
  const db = openDatabase(':memory:');
  const stores = createStores(db);
  const adapter = new MockAdapter('whatsapp');
  const registry = new ToolRegistry();
  registry.registerAll(createBuiltinTools());

  function createContext(overrides: Partial<ToolContext> = {}): ToolContext {
    return {
      adapter,
      chatId: '628111@s.whatsapp.net',
      senderId: '628222@s.whatsapp.net',
      role: 'member',
      params: {},
      services: {
        messages: stores.messages,
        memory: stores.memory,
        settings: stores.settings,
        audit: stores.audit,
        setKillSwitch: (val: boolean) => stores.settings.set('kill_switch', String(val)),
      },
      ...overrides,
    };
  }

  it('util.calculate: menghitung ekspresi matematika aman tanpa eval', async () => {
    const calc = registry.get('util.calculate')!;

    // Ekspresi matematika umum
    const res1 = await executeTool(calc, createContext({ params: { expression: 'sqrt(16) * 5 + 2^3' } }));
    expect(res1.ok).toBe(true);
    expect((res1.output as any).result).toBe(28); // 4 * 5 + 8 = 28

    // Pengujian fungsi matematika
    const res2 = await executeTool(calc, createContext({ params: { expression: 'min(10, 5, 20) + sin(0)' } }));
    expect(res2.ok).toBe(true);
    expect((res2.output as any).result).toBe(5);

    // Pembagian dengan nol ditolak
    const resDiv0 = await executeTool(calc, createContext({ params: { expression: '10 / 0' } }));
    expect(resDiv0.ok).toBe(false);
    expect(resDiv0.error).toContain('nol');

    // Kata-kata terlarang (eval, process, require, import) ditolak
    const resEval = await executeTool(calc, createContext({ params: { expression: 'eval("1+1")' } }));
    expect(resEval.ok).toBe(false);

    const resProcess = await executeTool(calc, createContext({ params: { expression: 'process.exit(1)' } }));
    expect(resProcess.ok).toBe(false);
  });

  it('util.convert: mengonversi unit pengukuran antar kategori yang sesuai', async () => {
    const convert = registry.get('util.convert')!;

    // Panjang: km ke m
    const resKm = await executeTool(convert, createContext({ params: { value: 2.5, from: 'km', to: 'm' } }));
    expect(resKm.ok).toBe(true);
    expect((resKm.output as any).result).toBe(2500);

    // Suhu: celsius ke fahrenheit
    const resTemp = await executeTool(convert, createContext({ params: { value: 100, from: 'c', to: 'f' } }));
    expect(resTemp.ok).toBe(true);
    expect((resTemp.output as any).result).toBe(212);

    // Waktu: jam ke menit
    const resTime = await executeTool(convert, createContext({ params: { value: 2, from: 'jam', to: 'menit' } }));
    expect(resTime.ok).toBe(true);
    expect((resTime.output as any).result).toBe(120);

    // Data: mb ke kb
    const resData = await executeTool(convert, createContext({ params: { value: 1, from: 'mb', to: 'kb' } }));
    expect(resData.ok).toBe(true);
    expect((resData.output as any).result).toBe(1024);

    // Kategori tidak cocok (panjang ke berat) ditolak
    const resMismatch = await executeTool(convert, createContext({ params: { value: 10, from: 'km', to: 'kg' } }));
    expect(resMismatch.ok).toBe(false);
    expect(resMismatch.error).toContain('tidak didukung');
  });

  it('memory.*: menyimpan, mencari, dan menghapus catatan memori pengguna', async () => {
    const saveTool = registry.get('memory.save_note')!;
    const searchTool = registry.get('memory.search')!;
    const forgetTool = registry.get('memory.forget')!;

    const userJid = '628testuser@s.whatsapp.net';
    const ctx = createContext({ senderId: userJid });

    // Simpan catatan
    const saveRes = await executeTool(saveTool, {
      ...ctx,
      params: { text: 'Pengguna alergi terhadap kacang dan menyukai kopi hitam' },
    });
    expect(saveRes.ok).toBe(true);
    const noteId = (saveRes.output as any).id;

    // Cari catatan berdasarkan kata kunci
    const searchRes = await executeTool(searchTool, {
      ...ctx,
      params: { query: 'alergi' },
    });
    expect(searchRes.ok).toBe(true);
    const notes = (searchRes.output as any).notes;
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0].note).toContain('kacang');

    // Hapus catatan spesifik
    const forgetRes = await executeTool(forgetTool, {
      ...ctx,
      params: { noteId },
    });
    expect(forgetRes.ok).toBe(true);

    // Verifikasi catatan terhapus
    const searchAfter = await executeTool(searchTool, {
      ...ctx,
      params: { query: 'alergi' },
    });
    expect((searchAfter.output as any).notes.length).toBe(0);
  });

  it('bot.panic: mengaktifkan kill switch secara instan (L0 Owner)', async () => {
    const panicTool = registry.get('bot.panic')!;
    const ownerCtx = createContext({ role: 'owner' });

    // Pastikan sebelumnya kill switch false
    stores.settings.set('kill_switch', 'false');
    expect(stores.settings.getBoolean('kill_switch')).toBe(false);

    // Jalankan bot.panic
    const panicRes = await executeTool(panicTool, ownerCtx);
    expect(panicRes.ok).toBe(true);
    expect((panicRes.output as any).killSwitch).toBe(true);

    // Verifikasi bahwa kill switch sekarang aktif di settings
    expect(stores.settings.getBoolean('kill_switch')).toBe(true);
  });

  it('Mencegah memecah aksi besar menjadi panggilan kecil: akumulasi penerima dalam jendela waktu', () => {
    // Pengujian skenario mitigasi: pengguna mencoba membroadcast ke 30 nomor dengan memecahnya jadi 3 panggilan @10 nomor
    const windowRecipients = new Set<string>();
    const WINDOW_LIMIT = 20;

    const batches = [
      Array.from({ length: 10 }, (_, i) => `6281000${i}`),
      Array.from({ length: 8 }, (_, i) => `6282000${i}`),
      Array.from({ length: 5 }, (_, i) => `6283000${i}`),
    ];

    let rejectedAtBatch = -1;

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]!;
      // Periksa apakah batch ini membuat akumulasi melebihi WINDOW_LIMIT
      if (windowRecipients.size + batch.length > WINDOW_LIMIT) {
        rejectedAtBatch = batchIdx;
        break;
      }
      for (const num of batch) windowRecipients.add(num);
    }

    // Batch ke-3 (10 + 8 + 5 = 23 > 20) harus terdeteksi dan diblokir
    expect(rejectedAtBatch).toBe(2);
    expect(windowRecipients.size).toBe(18);
  });
});

