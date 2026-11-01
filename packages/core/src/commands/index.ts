import type { CommandDefinition } from '../router/command-registry.js';
import { coreCommands } from './core/index.js';
import { groupCommands } from './group/index.js';
import { csCommands } from './cs/index.js';
import { mediaCommands } from './media/index.js';
import { optionalCommands } from './optional/index.js';

export { coreCommands } from './core/index.js';
export { groupCommands } from './group/index.js';
export { csCommands } from './cs/index.js';
export { mediaCommands } from './media/index.js';
export { optionalCommands } from './optional/index.js';

/**
 * Mengembalikan seluruh command resmi yang aktif dan relevan untuk proyek ArKzorMD.
 * Fitur dikelompokkan modular per file:
 * - ⚙️ Core & Sistem (menu, ping, owner, role, status, reset, persona, approval, stop, dll)
 * - 👥 Grup & Moderasi (admin, hidetag, totag, del, groupset, antilink, warn, welcome, list, dll)
 * - 🛍️ CS & Toko (order, faq, komplain, broadcast, bcgc)
 * - 🛠️ Utility & Media (ai, downloader, music, search, sticker, maker, gamecheck, qris, dll)
 *
 * Catatan: Fitur di luar proyek (.stalker, .anime, .nsfw) sengaja dipisahkan di `optionalCommands`.
 */
export function getAllCommands(): CommandDefinition[] {
  return [
    ...coreCommands,
    ...groupCommands,
    ...csCommands,
    ...mediaCommands,
  ];
}
