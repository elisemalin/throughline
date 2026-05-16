// Ashby adapter unit tests.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NormalizedPostingSchema } from '@/contracts/ats';
import { ashbyAdapter, type AshbyRawJob } from '@/lib/ats/ashby';
import { AtsProviderError } from '@/lib/ats/errors';
import { __setSleepImplForTests } from '@/lib/ats/_http';
import linearFixture from '../fixtures/ats/ashby/ashby-linear.json' with { type: 'json' };

interface FixtureShape {
  jobs: AshbyRawJob[];
  apiVersion?: string;
}

const fixture = linearFixture as FixtureShape;

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
  __setSleepImplForTests(async () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  __setSleepImplForTests(undefined);
});

describe('ashbyAdapter.normalize', () => {
  it('produces NormalizedPostingSchema-valid rows for every fixture posting', () => {
    expect(fixture.jobs.length).toBeGreaterThan(0);
    for (const raw of fixture.jobs) {
      const out = ashbyAdapter.normalize(raw);
      const parsed = NormalizedPostingSchema.safeParse(out);
      if (!parsed.success) {
        throw new Error(
          `normalize() output failed schema for posting id=${raw.id}: ${JSON.stringify(parsed.error.issues)}`,
        );
      }
    }
  });

  it('honors isRemote=true from the raw payload', () => {
    const remoteOne = fixture.jobs.find((j) => j.isRemote === true);
    if (!remoteOne) return;
    const out = ashbyAdapter.normalize(remoteOne);
    expect(out.remote).toBe(true);
  });

  it('derives company from jobUrl slug (title-cased)', () => {
    const raw = fixture.jobs[0];
    const out = ashbyAdapter.normalize(raw);
    expect(out.company).toBe('Linear');
  });
});

describe('ashbyAdapter.fetchPostings', () => {
  it('returns the jobs array from the envelope', async () => {
    mockFetchOnce({ jobs: fixture.jobs.slice(0, 2), apiVersion: '1' });
    const result = await ashbyAdapter.fetchPostings('linear');
    expect(result).toHaveLength(2);
  });

  it('throws AtsProviderError immediately on 4xx (not retried)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(ashbyAdapter.fetchPostings('linear')).rejects.toMatchObject({
      status: 400,
      provider: 'ashby',
      slug: 'linear',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on 5xx then throws AtsProviderError', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 502 }))
      .mockResolvedValueOnce(new Response('{}', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(ashbyAdapter.fetchPostings('linear')).rejects.toBeInstanceOf(AtsProviderError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('ashbyAdapter.validateSlug', () => {
  it('returns valid for a board with at least one posting', async () => {
    mockFetchOnce({ jobs: [fixture.jobs[0]] });
    await expect(ashbyAdapter.validateSlug('linear')).resolves.toEqual({ valid: true });
  });

  it('rejects malformed slugs without hitting the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await ashbyAdapter.validateSlug('bad slug!');
    expect(out.valid).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports 404 as board-not-found', async () => {
    mockFetchOnce({}, { status: 404, ok: false });
    const out = await ashbyAdapter.validateSlug('does-not-exist');
    expect(out).toEqual({ valid: false, error: 'board not found' });
  });

  it('reports an empty board as no-postings', async () => {
    mockFetchOnce({ jobs: [], apiVersion: '1' });
    const out = await ashbyAdapter.validateSlug('empty-board');
    expect(out.valid).toBe(false);
    expect(out.error).toMatch(/no postings/);
  });
});
