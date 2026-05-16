// fetchWithRetry policy unit tests.
//
// Sleep is stubbed via __setSleepImplForTests so the suite never waits the
// real 5-second / 30-second back-off windows. The test asserts call count
// and the exact sleep durations the helper requests for each retry path.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RETRY_5XX_DELAY_MS,
  RETRY_429_DEFAULT_DELAY_MS,
  __setSleepImplForTests,
  fetchWithRetry,
} from '@/lib/ats/_http';
import { AtsProviderError } from '@/lib/ats/errors';

const sleepCalls: number[] = [];

beforeEach(() => {
  sleepCalls.length = 0;
  __setSleepImplForTests(async (ms) => {
    sleepCalls.push(ms);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  __setSleepImplForTests(undefined);
});

function makeResponse(status: number, headers: Record<string, string> = {}): Response {
  return new Response('{}', { status, headers });
}

function chainFetch(responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn();
  for (const res of responses) fetchMock.mockResolvedValueOnce(res);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchWithRetry', () => {
  it('returns the response immediately on 2xx', async () => {
    chainFetch([makeResponse(200)]);
    const res = await fetchWithRetry('https://x', {}, { provider: 'greenhouse', slug: 'a' });
    expect(res.status).toBe(200);
    expect(sleepCalls).toEqual([]);
  });

  it('retries once on 5xx after RETRY_5XX_DELAY_MS, then returns 2xx', async () => {
    const fetchMock = chainFetch([makeResponse(503), makeResponse(200)]);
    const res = await fetchWithRetry('https://x', {}, { provider: 'greenhouse', slug: 'a' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepCalls).toEqual([RETRY_5XX_DELAY_MS]);
  });

  it('throws AtsProviderError after a single 5xx retry fails again', async () => {
    chainFetch([makeResponse(500), makeResponse(500)]);
    await expect(
      fetchWithRetry('https://x', {}, { provider: 'lever', slug: 'a' }),
    ).rejects.toBeInstanceOf(AtsProviderError);
    expect(sleepCalls).toEqual([RETRY_5XX_DELAY_MS]);
  });

  it('honors numeric Retry-After on 429', async () => {
    const fetchMock = chainFetch([makeResponse(429, { 'retry-after': '7' }), makeResponse(200)]);
    const res = await fetchWithRetry('https://x', {}, { provider: 'ashby', slug: 'a' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepCalls).toEqual([7_000]);
  });

  it('falls back to RETRY_429_DEFAULT_DELAY_MS when Retry-After is missing', async () => {
    chainFetch([makeResponse(429), makeResponse(200)]);
    await fetchWithRetry('https://x', {}, { provider: 'ashby', slug: 'a' });
    expect(sleepCalls).toEqual([RETRY_429_DEFAULT_DELAY_MS]);
  });

  it('fails immediately on 4xx other than 429 (likely bad slug)', async () => {
    const fetchMock = chainFetch([makeResponse(404)]);
    await expect(
      fetchWithRetry('https://x', {}, { provider: 'greenhouse', slug: 'bad' }),
    ).rejects.toMatchObject({ status: 404, attempts: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleepCalls).toEqual([]);
  });

  it('retries once on a network-level fetch rejection then bubbles AtsProviderError', async () => {
    const err = new Error('ECONNRESET');
    const fetchMock = vi.fn().mockRejectedValueOnce(err).mockRejectedValueOnce(err);
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      fetchWithRetry('https://x', {}, { provider: 'greenhouse', slug: 'a' }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/ECONNRESET/) });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleepCalls).toEqual([RETRY_5XX_DELAY_MS]);
  });

  it('attaches provider + slug + attempts to the thrown error', async () => {
    chainFetch([makeResponse(503), makeResponse(503)]);
    await expect(
      fetchWithRetry('https://x', {}, { provider: 'lever', slug: 'mistral' }),
    ).rejects.toMatchObject({
      provider: 'lever',
      slug: 'mistral',
      status: 503,
      attempts: 2,
    });
  });
});
