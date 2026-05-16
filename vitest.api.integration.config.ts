import path from 'node:path';
import { defineConfig } from 'vitest/config';

// WHY: the api integration suite talks to a real Neon Postgres branch via the
// real Prisma client. Sharing the main vitest.config.ts setupFiles would mock
// @/lib/db/prisma globally and defeat the test. This config inherits only the
// alias resolution; mocking is per-file (vi.mock('@clerk/nextjs/server') is
// fine; nothing else gets mocked).
export default defineConfig({
  test: {
    include: ['tests/api/integration/**/*.test.ts'],
    environment: 'node',
    globals: false,
    pool: 'forks',
    // Neon serverless cold-start + cascade delete in afterAll can each take a
    // few seconds; the suite still runs in well under a minute when warm.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    setupFiles: ['./tests/api/integration/_env.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
