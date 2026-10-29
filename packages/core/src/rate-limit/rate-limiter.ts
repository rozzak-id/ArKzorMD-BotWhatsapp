import { sleep } from '../utils/id.js';

export interface RateLimiterOptions {
  perChatPerMinute?: number;
  globalPerMinute?: number;
  now?: () => number;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Rate limit sliding-window sederhana untuk pesan keluar (FR-17).
 * Menahan pengiriman sampai slot tersedia, bukan membuang balasan.
 */
export class RateLimiter {
  private readonly perChatPerMinute: number;
  private readonly globalPerMinute: number;
  private readonly now: () => number;
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly globalHits: number[] = [];
  private readonly chatHits = new Map<string, number[]>();

  constructor(options: RateLimiterOptions = {}) {
    this.perChatPerMinute = options.perChatPerMinute ?? 12;
    this.globalPerMinute = options.globalPerMinute ?? 40;
    this.now = options.now ?? Date.now;
    this.sleepFn = options.sleepFn ?? sleep;
  }

  async acquire(chatId: string): Promise<void> {
    const windowMs = 60_000;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const timestamp = this.now();
      const chat = (this.chatHits.get(chatId) ?? []).filter(
        (value) => timestamp - value < windowMs,
      );
      this.chatHits.set(chatId, chat);

      while (this.globalHits.length > 0 && timestamp - (this.globalHits[0] ?? 0) >= windowMs) {
        this.globalHits.shift();
      }

      if (chat.length < this.perChatPerMinute && this.globalHits.length < this.globalPerMinute) {
        chat.push(timestamp);
        this.globalHits.push(timestamp);
        return;
      }

      const chatWait =
        chat.length >= this.perChatPerMinute
          ? windowMs - (timestamp - (chat[0] ?? timestamp))
          : 0;
      const globalWait =
        this.globalHits.length >= this.globalPerMinute
          ? windowMs - (timestamp - (this.globalHits[0] ?? timestamp))
          : 0;
      await this.sleepFn(Math.max(250, Math.min(5_000, Math.max(chatWait, globalWait))));
    }
  }
}
