// Lever adapter unit tests.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { NormalizedPostingSchema } from '@/contracts/ats';
import { leverAdapter, type LeverRawJob } from '@/lib/ats/lever';
import spotifyFixture from '../fixtures/ats/lever/lever-spotify.json' with { type: 'json' };

const fixture = spotifyFixture as LeverRawJob[];

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('leverAdapter.normalize', () => {
  it('produces NormalizedPostingSchema-valid rows for every fixture posting', () => {
    expect(fixture.length).toBeGreaterThan(0);
    for (const raw of fixture) {
      const out = leverAdapter.normalize(raw);
      const parsed = NormalizedPostingSchema.safeParse(out);
      if (!parsed.success) {
        throw new Error(
          `normalize() output failed schema for posting id=${raw.id}: ${JSON.stringify(parsed.error.issues)}`,
        );
      }
    }
  });

  it('converts the epoch-ms createdAt into ISO', () => {
    const raw = fixture[0];
    const out = leverAdapter.normalize(raw);
    expect(out.postedAt).toBe(new Date(raw.createdAt).toISOString());
  });

  it('derives company from hostedUrl slug (title-cased)', () => {
    const raw = fixture[0];
    const out = leverAdapter.normalize(raw);
    expect(out.company).toBe('Spotify');
  });
});

describe('leverAdapter.fetchPostings', () => {
  it('returns the response array verbatim', async () => {
    mockFetchOnce(fixture.slice(0, 3));
    const result = await leverAdapter.fetchPostings('spotify');
    expect(result).toHaveLength(3);
  });

  it('throws if the response is not an array', async () => {
    mockFetchOnce({ jobs: [] });
    await expect(leverAdapter.fetchPostings('spotify')).rejects.toThrow(/expected array/);
  });

  it('throws on non-2xx', async () => {
    mockFetchOnce({}, { status: 500, ok: false });
    await expect(leverAdapter.fetchPostings('spotify')).rejects.toThrow(/HTTP 500/);
  });
});

describe('leverAdapter.validateSlug', () => {
  it('returns valid for a board that returns at least one posting', async () => {
    mockFetchOnce([fixture[0]]);
    await expect(leverAdapter.validateSlug('spotify')).resolves.toEqual({ valid: true });
  });

  it('rejects malformed slugs without hitting the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = await leverAdapter.validateSlug('not.a.slug');
    expect(out.valid).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports 404 as board-not-found', async () => {
    mockFetchOnce({ ok: false, error: 'Document not found' }, { status: 404, ok: false });
    const out = await leverAdapter.validateSlug('does-not-exist');
    expect(out).toEqual({ valid: false, error: 'board not found' });
  });

  it('reports an empty board as no-postings', async () => {
    mockFetchOnce([]);
    const out = await leverAdapter.validateSlug('empty-board');
    expect(out.valid).toBe(false);
    expect(out.error).toMatch(/no postings/);
  });
});
