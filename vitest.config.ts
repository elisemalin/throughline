// Vitest config — shared across all test suites (security, ai, ats).
//
// WHY env=node: tests exercise Node's built-in SubtleCrypto (Node 22) and
// pure server code. Path alias `@/*` mirrors tsconfig.json so the same
// import shape works at runtime in the test runner as in the app.

import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/security/**/*.test.ts', 'tests/ai/**/*.test.ts', 'tests/ats/**/*.test.ts'],
    globals: false,
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
