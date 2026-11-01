import type { CommandDefinition } from './command-registry.js';
import { getAllCommands } from '../commands/index.js';

export * from '../commands/index.js';

/**
 * Mengembalikan daftar default command bot ArKzorMD.
 * Terorganisasi secara modular per berkas dan per kategori di `packages/core/src/commands/`.
 */
export function createDefaultCommands(): CommandDefinition[] {
  return getAllCommands();
}
