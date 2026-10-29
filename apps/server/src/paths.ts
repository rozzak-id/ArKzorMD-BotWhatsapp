import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Akar monorepo. File ini berada di `apps/server/src` saat dev dan ikut
 * ter-bundle ke `apps/server/dist` saat build, jadi tiga tingkat ke atas
 * selalu menunjuk folder proyek.
 */
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export const ENV_FILE = resolve(PROJECT_ROOT, '.env');
