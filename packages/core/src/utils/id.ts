import { randomBytes, randomUUID } from 'node:crypto';

export function newId(): string {
  return randomUUID();
}

export function now(): number {
  return Date.now();
}

/** Kode pendek sekali pakai untuk approval, misalnya #A7F3. */
export function shortCode(): string {
  return `#${randomBytes(2).toString('hex').toUpperCase()}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
