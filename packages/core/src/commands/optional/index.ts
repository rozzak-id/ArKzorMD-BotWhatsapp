import type { CommandDefinition } from '../../router/command-registry.js';
import { stalkerCommand } from './stalker.js';
import { animeCommand } from './anime.js';
import { nsfwCommand } from './nsfw.js';

/**
 * Modul Command Terpisah / Opsional:
 * Berisi perintah yang tidak masuk ke paket standar bot ArKzorMD
 * (.stalker, .anime, .nsfw) agar arsitektur utama tetap ramping,
 * aman, dan fokus pada fungsi asisten AI serta produktivitas.
 */
export const optionalCommands: CommandDefinition[] = [
  stalkerCommand,
  animeCommand,
  nsfwCommand,
];

