// Real-Neon integration test helpers.
//
// WHY: the api integration suite seeds rows under a namespaced owner prefix
// so cleanup is a single deleteMany on `User.id LIKE 'api-int-...%'`. Prisma
// cascade-deletes every owned row (Application, Document, etc.) per the
// schema's onDelete: Cascade.
//
// The suite is gated on `DATABASE_URL_TEST` (preferred — a dedicated Neon
// branch) with a fallback to `DATABASE_URL`. Without either the integration
// runner skips the whole suite via a printed message.

import { PrismaClient } from '@prisma/client';

export const TEST_OWNER_PREFIX = 'api-int-test-';

// The pre-test gate. Returns the resolved URL or null. The unit-test side
// (vitest.config.ts) is unaffected — this only runs from the integration
// config.
export function resolveTestDatabaseUrl(): { url: string; source: 'TEST' | 'FALLBACK' } | null {
  const test = process.env.DATABASE_URL_TEST;
  if (test && test.trim() !== '') return { url: test, source: 'TEST' };
  const main = process.env.DATABASE_URL;
  if (main && main.trim() !== '') {
    // eslint-disable-next-line no-console
    console.warn(
      '[api-integration] DATABASE_URL_TEST is unset; falling back to DATABASE_URL. Tests will write to the main branch. Set DATABASE_URL_TEST to a dedicated test branch in CI.',
    );
    return { url: main, source: 'FALLBACK' };
  }
  return null;
}

// Per-test owner id with a stable prefix and a random suffix so concurrent
// test files don't collide. Used as the Clerk userId in mocked auth() AND as
// the User.id we seed.
export function makeOwnerId(label: string): string {
  return `${TEST_OWNER_PREFIX}${label}-${Math.random().toString(36).slice(2, 10)}`;
}

// Builds a Prisma client against the resolved test URL. The integration
// suite cannot reuse the global singleton from /lib/db/prisma.ts because
// that client picked up DATABASE_URL at import time — the env value is
// what matters, and the singleton would also pollute later non-integration
// runs in the same process.
export function makeTestClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
}

// teardownOwnedRows deletes the seed User row by id; cascades wipe owned
// children. The function is idempotent and safe to run in afterEach.
export async function teardownOwnedRows(prisma: PrismaClient, ownerId: string): Promise<void> {
  await prisma.user.deleteMany({ where: { id: ownerId } });
}

// Catch-all sweep for any leftover rows from prior crashed runs. Called
// once per test file in beforeAll to keep the test branch tidy. Cheap when
// no rows match.
export async function sweepStaleTestRows(prisma: PrismaClient): Promise<void> {
  await prisma.user.deleteMany({
    where: { id: { startsWith: TEST_OWNER_PREFIX } },
  });
}
