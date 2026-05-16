// Test fixtures and request helpers.
//
// WHY: each route's three core assertions (401 / 400 / contract shape) need
// the same Request builder and the same set of believable Prisma rows.
// Centralizing them keeps each test file under ~100 lines and makes contract
// drift surface as one fixture update rather than nineteen.

import { auth } from '@clerk/nextjs/server';
import type {
  Application,
  ApplicationEvent,
  DiscoveredPosting,
  Document,
  SkillsDB,
  WatchlistCompany,
} from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { vi } from 'vitest';

export const FAKE_USER_ID = 'user_test_1';

export const mAuth = vi.mocked(auth);
export const mPrisma = vi.mocked(prisma, true);

export function signedIn(userId: string = FAKE_USER_ID) {
  mAuth.mockResolvedValue({ userId } as Awaited<ReturnType<typeof auth>>);
}

export function signedOut() {
  mAuth.mockResolvedValue({ userId: null } as Awaited<ReturnType<typeof auth>>);
}

type JsonBody = unknown;
type ReqInit = { method: string; url: string; body?: JsonBody };

export function makeRequest({ method, url, body }: ReqInit): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// fakeApplicationRow returns a Prisma-shape row (Date instances for
// timestamps, null for absent optional columns) so handlers exercise the
// real projectApplication path rather than working against a contract-shape
// fixture that hid the projection logic. Each fixture returns the Prisma-
// generated row type so test-side type errors surface before the route is
// invoked.
export function fakeApplicationRow(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app_test_1',
    ownerId: FAKE_USER_ID,
    company: 'Acme',
    role: 'Engineer',
    url: null,
    source: null,
    location: null,
    remote: false,
    salaryRange: null,
    jobDescription: 'Build software.',
    status: 'researching',
    appliedDate: null,
    followUpDate: null,
    notes: null,
    alignmentAnalysis: null,
    createdAt: new Date('2026-05-16T10:00:00Z'),
    updatedAt: new Date('2026-05-16T10:00:00Z'),
    ...overrides,
  };
}

export function fakeSkillsRow(overrides: Partial<SkillsDB> = {}): SkillsDB {
  return {
    id: 'skills_test_1',
    ownerId: FAKE_USER_ID,
    fullName: 'Test User',
    headline: 'Engineer',
    positioning: 'Builds software.',
    contact: { email: 'test@example.com' },
    targetRoles: ['Engineer'],
    awards: [],
    jobs: [],
    coreSkills: ['TypeScript', 'React'],
    tools: ['VSCode'],
    methods: [],
    domains: [],
    keywords: [],
    updatedAt: new Date('2026-05-16T10:00:00Z'),
    ...overrides,
  };
}

export function fakeDocumentRow(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc_test_1',
    ownerId: FAKE_USER_ID,
    kind: 'resume',
    title: 'Resume',
    body: 'x'.repeat(200),
    applicationId: null,
    createdAt: new Date('2026-05-16T10:00:00Z'),
    ...overrides,
  };
}

export function fakeWatchlistRow(overrides: Partial<WatchlistCompany> = {}): WatchlistCompany {
  return {
    id: 'w_test_1',
    ownerId: FAKE_USER_ID,
    company: 'Acme',
    atsProvider: 'greenhouse',
    atsSlug: 'acme',
    active: true,
    lastPolled: null,
    createdAt: new Date('2026-05-16T10:00:00Z'),
    ...overrides,
  };
}

export function fakeDiscoveryRow(overrides: Partial<DiscoveredPosting> = {}): DiscoveredPosting {
  return {
    id: 'disc_test_1',
    ownerId: FAKE_USER_ID,
    watchlistCompanyId: 'w_test_1',
    externalId: 'ext_1',
    company: 'Acme',
    atsProvider: 'greenhouse',
    role: 'Engineer',
    location: 'Remote',
    remote: true,
    postedAt: new Date('2026-05-15T10:00:00Z'),
    url: 'https://example.com/jobs/1',
    salaryRange: null,
    jobDescription: 'Build software.',
    alignmentScore: null,
    status: 'new',
    applicationId: null,
    createdAt: new Date('2026-05-16T10:00:00Z'),
    ...overrides,
  };
}

export function fakeAppEventRow(overrides: Partial<ApplicationEvent> = {}): ApplicationEvent {
  return {
    id: 'evt_test_1',
    applicationId: 'app_test_1',
    kind: 'created',
    at: new Date('2026-05-16T10:00:00Z'),
    note: null,
    fromStatus: null,
    toStatus: 'researching',
    documentId: null,
    ...overrides,
  };
}
