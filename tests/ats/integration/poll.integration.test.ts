// ATS integration test — gated on ATS_INTEGRATION=1.
//
// Runs the real Day-3 poll path: connects to a Postgres test database,
// seeds three WatchlistCompany rows (anthropic / stripe / airbnb on
// Greenhouse), calls `pollOne` for each, and asserts:
//   1. DiscoveredPosting count grew after the first sweep.
//   2. A second pass inserts zero rows (dedup invariant).
//   3. `lastPolled` was bumped on every row.
// Always tears down everything it created.
//
// DATABASE_URL_TEST is preferred (a Neon test branch); falls back to
// DATABASE_URL with a printed warning so a local dev DB is not poisoned by
// accident. ATS_INTEGRATION must be `1` for the test body to run.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { greenhouseAdapter } from '@/lib/ats/greenhouse';
import { NormalizedPostingSchema, ATS_REQUEST_DELAY_MS } from '@/contracts/ats';
import { pollOne } from '@/jobs/poll';

const ATS_INTEGRATION = process.env.ATS_INTEGRATION === '1';
const describeGated = ATS_INTEGRATION ? describe : describe.skip;

function pickDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;
  if (process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.warn(
      'ats integration: DATABASE_URL_TEST not set; falling back to DATABASE_URL. ' +
        'This pollutes the dev DB with TEST_OWNER_ID rows that the test will clean up.',
    );
    return process.env.DATABASE_URL;
  }
  return undefined;
}

const TEST_OWNER_ID = 'ats-integration-owner';
const SEED_ROWS = [
  { company: 'Anthropic', atsSlug: 'anthropic' },
  { company: 'Stripe', atsSlug: 'stripe' },
  { company: 'Airbnb', atsSlug: 'airbnb' },
] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('greenhouse adapter (real network, no DB)', () => {
  const runReal = ATS_INTEGRATION ? it : it.skip;

  runReal(
    'fetches and normalizes postings from three live boards with rate-limit delay',
    async () => {
      const allIds = new Set<string>();
      for (let i = 0; i < SEED_ROWS.length; i += 1) {
        if (i > 0) await sleep(ATS_REQUEST_DELAY_MS);
        const slug = SEED_ROWS[i].atsSlug;
        const raws = await greenhouseAdapter.fetchPostings(slug);
        expect(raws.length).toBeGreaterThan(0);
        for (const raw of raws.slice(0, 5)) {
          const normalized = greenhouseAdapter.normalize(raw);
          NormalizedPostingSchema.parse(normalized);
          allIds.add(`${slug}:${normalized.externalId}`);
        }
      }
      expect(allIds.size).toBeGreaterThan(0);
    },
    120_000,
  );

  runReal(
    'normalizing the same posting twice produces a stable externalId (dedup invariant)',
    async () => {
      const raws = await greenhouseAdapter.fetchPostings('anthropic');
      expect(raws.length).toBeGreaterThan(0);
      const first = greenhouseAdapter.normalize(raws[0]);
      const second = greenhouseAdapter.normalize(raws[0]);
      expect(first.externalId).toBe(second.externalId);
      expect(second.externalId.length).toBeGreaterThan(0);
    },
    60_000,
  );
});

describeGated('poll integration (Postgres + Greenhouse)', () => {
  const databaseUrl = pickDatabaseUrl();
  // Skip-all when no URL is configured; the test container has no DB to
  // connect to in that case.
  const itDb = databaseUrl ? it : it.skip;
  let prisma: PrismaClient | undefined;
  const seededIds: string[] = [];

  beforeAll(async () => {
    if (!databaseUrl) return;
    // Inject the chosen URL into env before instantiating Prisma so the
    // generated client picks it up. The HMR singleton in /lib/db/prisma.ts
    // reads from this env at import time; we bypass it here by constructing
    // a fresh client wired to the test URL.
    process.env.DATABASE_URL = databaseUrl;
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    // Ensure the test owner row exists. cuid IDs are not required for the
    // test user because we set a stable id, but FK constraints from
    // WatchlistCompany.ownerId -> User.id require the user row to exist.
    await prisma.user.upsert({
      where: { id: TEST_OWNER_ID },
      update: {},
      create: {
        id: TEST_OWNER_ID,
        email: `ats-integration-${Date.now()}@throughline.test`,
      },
    });
    for (const seed of SEED_ROWS) {
      const row = await prisma.watchlistCompany.upsert({
        where: {
          ownerId_atsProvider_atsSlug: {
            ownerId: TEST_OWNER_ID,
            atsProvider: 'greenhouse',
            atsSlug: seed.atsSlug,
          },
        },
        update: { active: true },
        create: {
          ownerId: TEST_OWNER_ID,
          company: seed.company,
          atsProvider: 'greenhouse',
          atsSlug: seed.atsSlug,
          active: true,
        },
      });
      seededIds.push(row.id);
    }
  }, 60_000);

  afterAll(async () => {
    if (!prisma) return;
    await prisma.discoveredPosting.deleteMany({ where: { ownerId: TEST_OWNER_ID } });
    await prisma.watchlistCompany.deleteMany({ where: { ownerId: TEST_OWNER_ID } });
    await prisma.user.delete({ where: { id: TEST_OWNER_ID } }).catch(() => undefined);
    await prisma.$disconnect();
  }, 30_000);

  itDb(
    'seed three Greenhouse rows, pollOne each, assert inserts then dedup',
    async () => {
      if (!prisma) throw new Error('prisma not initialized');

      const beforeCount = await prisma.discoveredPosting.count({
        where: { ownerId: TEST_OWNER_ID },
      });
      expect(beforeCount).toBe(0);

      const rows = await prisma.watchlistCompany.findMany({
        where: { ownerId: TEST_OWNER_ID, active: true },
        select: { id: true, ownerId: true, company: true, atsProvider: true, atsSlug: true },
      });
      expect(rows).toHaveLength(SEED_ROWS.length);

      let firstSweepInserts = 0;
      for (let i = 0; i < rows.length; i += 1) {
        if (i > 0) await sleep(ATS_REQUEST_DELAY_MS);
        const result = await pollOne(rows[i]);
        expect(result.error, JSON.stringify(result.error)).toBeUndefined();
        expect(result.fetched).toBeGreaterThan(0);
        expect(result.inserted).toBeGreaterThan(0);
        firstSweepInserts += result.inserted;
      }

      const afterFirstCount = await prisma.discoveredPosting.count({
        where: { ownerId: TEST_OWNER_ID },
      });
      expect(afterFirstCount).toBe(firstSweepInserts);
      expect(afterFirstCount).toBeGreaterThan(0);

      // lastPolled set on every row.
      const polled = await prisma.watchlistCompany.findMany({
        where: { ownerId: TEST_OWNER_ID },
        select: { id: true, lastPolled: true },
      });
      for (const row of polled) {
        expect(row.lastPolled).toBeInstanceOf(Date);
      }

      // Second sweep — dedup must block every row.
      for (let i = 0; i < rows.length; i += 1) {
        if (i > 0) await sleep(ATS_REQUEST_DELAY_MS);
        const result = await pollOne(rows[i]);
        expect(result.error, JSON.stringify(result.error)).toBeUndefined();
        expect(result.fetched).toBeGreaterThan(0);
        expect(result.inserted).toBe(0);
      }
      const afterSecondCount = await prisma.discoveredPosting.count({
        where: { ownerId: TEST_OWNER_ID },
      });
      expect(afterSecondCount).toBe(afterFirstCount);
    },
    300_000,
  );
});
