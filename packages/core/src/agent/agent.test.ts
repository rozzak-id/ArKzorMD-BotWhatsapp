import { describe, expect, it } from 'vitest';
import type { StoredMessage } from '../types.js';
import { compactHistory } from './agent.js';

describe('Agent Context Compaction (FR-08)', () => {
  it('membiarkan riwayat di bawah batas maksimum tanpa diringkas', () => {
    const history: StoredMessage[] = [
      { id: 1, chatId: 'c1', platform: 'whatsapp', senderId: 'u1', role: 'user', content: 'pesan 1', createdAt: 1000 },
      { id: 2, chatId: 'c1', platform: 'whatsapp', senderId: 'bot', role: 'assistant', content: 'balasan 1', createdAt: 1001 },
    ];

    const result = compactHistory(history, 5);
    expect(result).toHaveLength(2);
    expect(result[0]?.content).toBe('pesan 1');
    expect(result[1]?.content).toBe('balasan 1');
  });

  it('meringkas pesan lama jika riwayat melebihi batas token/jendela pesan', () => {
    const history: StoredMessage[] = [];
    for (let i = 1; i <= 15; i++) {
      history.push({
        id: i,
        chatId: 'c1',
        platform: 'whatsapp',
        senderId: i % 2 === 1 ? 'u1' : 'bot',
        role: i % 2 === 1 ? 'user' : 'assistant',
        content: `percakapan ke-${i}`,
        createdAt: 1000 + i,
      });
    }

    // maxRecent = 5 -> 10 pesan lama diringkas menjadi 1 pesan ringkasan system + 5 pesan terbaru
    const result = compactHistory(history, 5);
    expect(result).toHaveLength(6);
    expect(result[0]?.role).toBe('system');
    expect(result[0]?.content).toContain('[Ringkasan riwayat percakapan sebelumnya]');
    expect(result[0]?.content).toContain('User: percakapan ke-1');
    expect(result[0]?.content).toContain('Bot: percakapan ke-2');
    expect(result[5]?.content).toBe('percakapan ke-15');
  });
});
