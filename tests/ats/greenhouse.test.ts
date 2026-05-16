// Greenhouse adapter unit tests.
//
// normalize() runs against captured fixtures and every output row is parsed
// through NormalizedPostingSchema. fetchPostings/validateSlug are exercised
// against a stubbed global fetch so the suite is hermetic.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NormalizedPostingSchema } from '@/contracts/ats';
import { greenhouseAdapter, type GreenhouseRawJob } from '@/lib/ats/greenhouse';
import { AtsProviderError } from '@/lib/ats/errors';
import { __setSleepImplForTests } from '@/lib/ats/_http';
import anthropicFixture from '../fixtures/ats/greenhouse/greenhouse-anthropic.json' with { type: 'json' };

interface FixtureShape {
  jobs: GreenhouseRawJob[];
  meta?: { total?: number };
}

const fixture = anthropicFixture as FixtureShape;

function mockFetchOnce(body: unknown, init: { status?: number; ok?: boolean } = {}): void {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok,
      status,
      json: async () => body,
    })),
  );
}

beforeEach(() => {
  // Stubbed sleep means retry paths still execute their loop without
  // burning real seconds. Restored after each test.
  __setSleepImplForTests(async () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  __setSleepImplForTests(undefined);
});

describe('greenhouseAdapter.normalize', () => {
  it('produces NormalizedPostingSchema-valid rows for every fixture posting', () => {
    expect(fixture.jobs.length).toBeGreaterThan(0);
    for (const raw of fixture.jobs) {
      const out = greenhouseAdapter.normalize(raw);
      const parsed = NormalizedPostingSchema.safeParse(out);
      if (!parsed.success) {
        throw new Error(
          `normalize() output failed schema for posting id=${raw.id}: ${JSON.stringify(parsed.error.issues)}`,
        );
      }
    }
  });

  it('decodes HTML entities and strips tags in jobDescription', () => {
    const raw = fixture.jobs[0];
    const out = greenhouseAdapter.normalize(raw);
    expect(out.jobDescription).not.toContain('&lt;');
    expect(out.jobDescription).not.toMatch(/<[a-z]+[^>]*>/i);
    expect(out.jobDescription.length).toBeLessThanOrEqual(50_000);
  });

  it('preserves the absolute_url and string-coerced id', () => {
    const raw = fixture.jobs[0];
    const out = greenhouseAdapter.normalize(raw);
    expect(out.url).toBe(raw.absolute_url);
    expect(out.externalId).toBe(String(raw.id));
  });
});

describe('greenhouseAdapter.fetchPostings', () => {
  it('returns the full jobs array from a single response (no pagination cursor in v1)', async () => {
    mockFetchOnce({ jobs: fixture.jobs.slice(0, 5), meta: { total: 5 } });
    const result = await greenhouseAdapter.fetchPostings('anthropic');
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual(fixture.jobs[0]);
  });

  it('throws AtsProviderError immediately on 4xx (not retried)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(greenhouseAdapter.fetchPostings('anthropic')).rejects.toMatchObject({
      status: 401,
      provider: 'greenhouse',
      slug: 'anthropic',
      attempts: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on 5xx then throws AtsProviderError if still failing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const err = await greenhouseAdapter.fetchPostings('anthropic').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AtsProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('greenhouseAdapter.validateSlug', () => {
  it('returns valid for a board that has postings', async () => {
    mockFetchOnce({ jobs: [fixture.jobs[0]] });
    await expect(greenhouseAdapter.validateSlug('anthropic')).resolves.toEqual({ valid: true });
  });

  it('rejects malformed slugs without hitting the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await greenhouseAdapter.validateSlug('not a slug!');
    expect(out.valid).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports 404 as board-not-found', async () => {
    mockFetchOnce({ status: 404 }, { status: 404, ok: false });
    const out = await greenhouseAdapter.validateSlug('does-not-exist');
    expect(out).toEqual({ valid: false, error: 'board not found' });
  });

  it('reports an empty board as no-postings', async () => {
    mockFetchOnce({ jobs: [] });
    const out = await greenhouseAdapter.validateSlug('empty-board');
    expect(out.valid).toBe(false);
    expect(out.error).toMatch(/no postings/);
  });
});
