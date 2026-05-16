// Vitest config for the security test suite.
//
// WHY env=node: tests exercise Node's built-in SubtleCrypto (Node 22) and
// pure server code. Path alias `@/*` mirrors tsconfig.json so the same
// import shape works at runtime in the test runner as in the app.

import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/security/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
