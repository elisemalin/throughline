// Vitest config — shared across all test suites (security, ai, ats, api).
//
// WHY env=node: tests exercise Node's built-in SubtleCrypto (Node 22) and
// pure server code. Path alias `@/*` mirrors tsconfig.json so the same
// import shape works at runtime in the test runner as in the app.

import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/security/**/*.test.ts',
      'tests/ai/**/*.test.ts',
      'tests/ats/**/*.test.ts',
      'tests/api/**/*.test.ts',
      'tests/components/**/*.test.ts',
    ],
    globals: false,
    pool: 'forks',
    testTimeout: 30_000,
    // WHY: Backend Core's tests/api/** suite mocks @clerk/nextjs/server and
    // @/lib/db/prisma via vi.mock in this setup file. vi.mock factory bodies
    // are hoisted per test file, so the calls must live in a setupFile to
    // apply globally across the suite. Other suites (tests/security,
    // tests/ai, tests/ats) do not import either module, so the mocks are
    // inert in those contexts.
    setupFiles: ['./tests/api/_setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
