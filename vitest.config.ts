import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const alias = {
  '@arkzormd/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
  '@arkzormd/adapter-whatsapp': fileURLToPath(
    new URL('./packages/adapter-whatsapp/src/index.ts', import.meta.url),
  ),
  '@arkzormd/adapter-telegram': fileURLToPath(
    new URL('./packages/adapter-telegram/src/index.ts', import.meta.url),
  ),
  '@arkzormd/adapter-discord': fileURLToPath(
    new URL('./packages/adapter-discord/src/index.ts', import.meta.url),
  ),
};

export default defineConfig({
  resolve: { alias },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    reporters: ['default'],
  },
});
