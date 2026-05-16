// Shared test setup. Runs once per test file via vitest.config.ts:setupFiles.
//
// WHY: every route handler hits the same two boundaries — `auth()` from
// @clerk/nextjs/server, and `prisma` from @/lib/db/prisma. Mocking both here
// (rather than in each test file) keeps the per-test file overhead to mock
// configuration only, and guarantees every test file sees the same surface
// of mock methods (a missing method on one file would fail typecheck before
// the test ran).
//
// vi.mock factory bodies must be self-contained — they're hoisted by vitest
// before the surrounding module evaluates — so we declare the full Prisma
// surface inline rather than importing it from a sibling fixture module.

import { vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    skillsDB: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    application: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    applicationEvent: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    watchlistCompany: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
    discoveredPosting: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));
