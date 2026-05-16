// Vitest config — minimal. The `@/*` path alias mirrors tsconfig.json so
// imports of `@/contracts/...` and `@/lib/...` resolve identically under
// vitest, tsc, and the Next bundler.

import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/ai/**/*.test.ts'],
    // Each test resets its own injected cache client; vitest's default
    // isolation per file is enough.
    pool: 'forks',
  },
});
