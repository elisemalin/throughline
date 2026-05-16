import path from 'node:path';
import { defineConfig } from 'vitest/config';

// WHY: the `@/*` alias mirrors tsconfig.json so test files import handlers
// via the same paths the Next.js runtime uses. A manual `resolve.alias` is
// preferred over the vite-tsconfig-paths plugin because the plugin is ESM-
// only and vitest 2.x loads its config via require(), which fails on ESM
// dependencies.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/api/**/*.test.ts'],
    environment: 'node',
    globals: false,
    clearMocks: true,
    setupFiles: ['./tests/api/_setup.ts'],
  },
});
