// Integration-suite setupFile.
//
// WHY: route handlers under test import the singleton at /lib/db/prisma.ts,
// which reads `process.env.DATABASE_URL` at module load. To redirect those
// writes to the test branch, we resolve DATABASE_URL_TEST (preferred) or
// DATABASE_URL (fallback with warning) and assign it to DATABASE_URL BEFORE
// the test files (and the handlers they import) are evaluated. setupFiles
// run before test-file imports, so this is the right hook.
//
// API_INTEGRATION_DB_READY is the sentinel each test file checks with
// `describe.skipIf(!process.env.API_INTEGRATION_DB_READY)`. When neither
// URL is set the suite skips cleanly rather than erroring out.

import { resolveTestDatabaseUrl } from './_helpers';

const resolved = resolveTestDatabaseUrl();
if (resolved) {
  process.env.DATABASE_URL = resolved.url;
  // DIRECT_URL is read by prisma migrate. For the integration runtime, point
  // it at the same URL so any in-test migrate or introspect call works.
  if (!process.env.DIRECT_URL) process.env.DIRECT_URL = resolved.url;
  process.env.API_INTEGRATION_DB_READY = '1';
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[api-integration] Neither DATABASE_URL_TEST nor DATABASE_URL is set. The api integration suite will skip every test.',
  );
}
