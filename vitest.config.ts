import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Vitest config for the External Adapter's unit + integration suites.
// The `@/*` path alias is duplicated here from tsconfig.json because Vitest
// does not parse tsconfig paths without an extra plugin (vite-tsconfig-paths),
// and FLOOR.md rule 4 requires a justification for every added dependency.
// Hard-coding one alias is cheaper than adding a package.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/ats/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 30_000,
  },
});
