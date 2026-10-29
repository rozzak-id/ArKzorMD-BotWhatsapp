import type { OutgoingContent, PlatformAdapter } from '../types.js';
import { sleep } from '../utils/id.js';

export interface HumanizerOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  msPerChar?: number;
  jitter?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

/**
 * Memberi jeda alami sebelum mengirim balasan (FR-15).
 * Indikator mengetik platform akan ditambahkan di adapter pada M0/M1.
 */
export class Humanizer {
  private readonly minDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly msPerChar: number;
  private readonly jitter: number;
  private readonly sleepFn: (ms: number) => Promise<void>;

  constructor(options: HumanizerOptions = {}) {
    this.minDelayMs = options.minDelayMs ?? 700;
    this.maxDelayMs = options.maxDelayMs ?? 6_000;
    this.msPerChar = options.msPerChar ?? 22;
    this.jitter = options.jitter ?? 0.25;
    this.sleepFn = options.sleepFn ?? sleep;
  }

  delayFor(text: string): number {
    const base = Math.min(this.maxDelayMs, this.minDelayMs + text.length * this.msPerChar);
    const jitter = base * this.jitter * (Math.random() * 2 - 1);
    return Math.max(this.minDelayMs, Math.round(base + jitter));
  }

  async typeAndSend(
    adapter: PlatformAdapter,
    chatId: string,
    content: OutgoingContent,
  ): Promise<void> {
    if (content.text) {
      await this.sleepFn(this.delayFor(content.text));
    }
    await adapter.send(chatId, content);
  }
}
