// ATS polling job.
//
// Two Inngest functions ship here:
//   - `atsPollFunction` — daily 06:00 UTC sweep across every active
//     WatchlistCompany row.
//   - `atsPollRequestedFunction` — on-demand sweep scoped to a single user's
//     watchlist, triggered by `ats/poll.requested` events. The Day-2 →
//     Day-3 → Day-4 producer story: Day-2 had a stub `triggerPoll` in the
//     registry, Day-3 flipped it to fire the event, Day-4 (Backend Core)
//     reverted POST /api/discovery/poll to a pure freshness snapshot. The
//     event handler stays registered for the CLI producer at
//     `scripts/admin/poll-now.ts` and any future Backend Core wiring.
//
// For each WatchlistCompany row we call the matching adapter's
// `fetchPostings`, normalize each posting, and insert any whose
// (watchlistCompanyId, externalId) pair is not already in DiscoveredPosting.
// Per-row retries (5xx / 429 / network) are captured via the
// AsyncLocalStorage telemetry sink in lib/ats/_telemetry.ts and rolled up
// into the sweep summary so an operator can see whether providers are
// rate-limiting us or flaking.

import type { AtsProvider, WatchlistCompany } from '@/contracts/models';
import {
  ATS_REQUEST_DELAY_MS,
  ATS_POLL_REQUESTED_EVENT,
  AtsPollRequestedDataSchema,
} from '@/contracts/ats';
import { prisma } from '@/lib/db/prisma';
import { ATS_ADAPTERS } from '@/lib/ats/registry';
import { isAtsProviderError } from '@/lib/ats/errors';
import {
  newSink,
  summarizeRetries,
  withRetryTelemetry,
  type RetrySummary,
} from '@/lib/ats/_telemetry';
import { inngest } from './inngest';

const POLLER_KILL_SWITCH_VALUE = 'disabled';

export type WatchlistRow = Pick<
  WatchlistCompany,
  'id' | 'ownerId' | 'company' | 'atsProvider' | 'atsSlug'
>;

export interface PollError {
  watchlistCompanyId: string;
  provider: AtsProvider;
  slug: string;
  status?: number;
  attempts?: number;
  message: string;
}

export interface PollResult {
  watchlistCompanyId: string;
  provider: AtsProvider;
  fetched: number;
  inserted: number;
  retries: RetrySummary;
  error?: PollError;
}

export interface PollSweepSummary {
  watchlistRows: number;
  providersTouched: number;
  postingsInserted: number;
  errors: PollError[];
  retries: RetrySummary;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Exported for the integration test, which seeds rows and invokes pollOne
// directly against a real Postgres rather than going through Inngest.
export async function pollOne(row: WatchlistRow): Promise<PollResult> {
  const adapter = ATS_ADAPTERS[row.atsProvider];
  const sink = newSink();
  try {
    const raws = await withRetryTelemetry(sink, () => adapter.fetchPostings(row.atsSlug));
    let inserted = 0;
    for (const raw of raws) {
      const normalized = adapter.normalize(raw);
      try {
        await prisma.discoveredPosting.create({
          data: {
            ownerId: row.ownerId,
            watchlistCompanyId: row.id,
            externalId: normalized.externalId,
            // WatchlistCompany.company is the authoritative display name;
            // the adapter's best-effort company string is discarded here.
            company: row.company,
            atsProvider: normalized.atsProvider,
            role: normalized.role,
            location: normalized.location,
            remote: normalized.remote,
            postedAt: new Date(normalized.postedAt),
            url: normalized.url,
            salaryRange: normalized.salaryRange,
            jobDescription: normalized.jobDescription,
            status: 'new',
          },
        });
        inserted += 1;
      } catch (err) {
        // P2002 = unique constraint on (watchlistCompanyId, externalId).
        // This is the dedup hit and is the expected steady-state outcome;
        // every other Prisma error rethrows so the caller marks the row.
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') continue;
        throw err;
      }
    }
    await prisma.watchlistCompany.update({
      where: { id: row.id },
      data: { lastPolled: new Date() },
    });
    return {
      watchlistCompanyId: row.id,
      provider: row.atsProvider,
      fetched: raws.length,
      inserted,
      retries: summarizeRetries(sink),
    };
  } catch (err) {
    const retries = summarizeRetries(sink);
    if (isAtsProviderError(err)) {
      return {
        watchlistCompanyId: row.id,
        provider: row.atsProvider,
        fetched: 0,
        inserted: 0,
        retries,
        error: {
          watchlistCompanyId: row.id,
          provider: row.atsProvider,
          slug: row.atsSlug,
          status: err.status,
          attempts: err.attempts,
          message: err.message,
        },
      };
    }
    return {
      watchlistCompanyId: row.id,
      provider: row.atsProvider,
      fetched: 0,
      inserted: 0,
      retries,
      error: {
        watchlistCompanyId: row.id,
        provider: row.atsProvider,
        slug: row.atsSlug,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }
}

async function pollProviderGroup(rows: WatchlistRow[]): Promise<PollResult[]> {
  const results: PollResult[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    // ATS_REQUEST_DELAY_MS gap BEFORE every call except the first in the
    // group, so two calls to the same provider are never closer than the
    // rate-limit window even under back-to-back failures.
    if (i > 0) await sleep(ATS_REQUEST_DELAY_MS);
    results.push(await pollOne(rows[i]));
  }
  return results;
}

// Shared sweep body — the daily and on-demand functions both call this.
// `rowsLoader` lets the daily variant pull all active rows while the
// on-demand variant scopes by ownerId.
export async function runPollSweep(
  rowsLoader: () => Promise<WatchlistRow[]>,
): Promise<PollSweepSummary> {
  const rows = await rowsLoader();

  const groups = new Map<AtsProvider, WatchlistRow[]>();
  for (const row of rows) {
    const list = groups.get(row.atsProvider) ?? [];
    list.push(row);
    groups.set(row.atsProvider, list);
  }

  const grouped = await Promise.all(
    Array.from(groups.values()).map((group) => pollProviderGroup(group)),
  );
  const results = grouped.flat();

  const retries: RetrySummary = { fivexx: 0, fourTwentyNine: 0, network: 0, totalBackoffMs: 0 };
  for (const r of results) {
    retries.fivexx += r.retries.fivexx;
    retries.fourTwentyNine += r.retries.fourTwentyNine;
    retries.network += r.retries.network;
    retries.totalBackoffMs += r.retries.totalBackoffMs;
  }

  return {
    watchlistRows: rows.length,
    providersTouched: groups.size,
    postingsInserted: results.reduce((acc, r) => acc + r.inserted, 0),
    errors: results
      .filter((r): r is PollResult & { error: PollError } => r.error !== undefined)
      .map((r) => r.error),
    retries,
  };
}

export const atsPollFunction = inngest.createFunction(
  { id: 'ats-poll-daily', name: 'ATS poll (daily)' },
  { cron: '0 6 * * *' },
  async ({ logger }) => {
    if (process.env.ATS_POLLER === POLLER_KILL_SWITCH_VALUE) {
      logger.info('ATS_POLLER=disabled; skipping sweep');
      return { skipped: true };
    }
    const summary = await runPollSweep(() =>
      prisma.watchlistCompany.findMany({
        where: { active: true },
        select: { id: true, ownerId: true, company: true, atsProvider: true, atsSlug: true },
      }),
    );
    logger.info({ summary }, 'ats poll sweep (daily) complete');
    return summary;
  },
);

export const atsPollRequestedFunction = inngest.createFunction(
  { id: 'ats-poll-requested', name: 'ATS poll (on-demand)' },
  { event: ATS_POLL_REQUESTED_EVENT },
  async ({ event, logger }) => {
    if (process.env.ATS_POLLER === POLLER_KILL_SWITCH_VALUE) {
      logger.info('ATS_POLLER=disabled; skipping on-demand sweep');
      return { skipped: true };
    }
    // Validate at function entry — Inngest does not type event payloads.
    const parsed = AtsPollRequestedDataSchema.safeParse(event.data);
    if (!parsed.success) {
      throw new Error(
        `${ATS_POLL_REQUESTED_EVENT}: invalid payload — ${parsed.error.issues[0]?.message ?? 'unknown'}`,
      );
    }
    const { ownerId } = parsed.data;
    const summary = await runPollSweep(() =>
      prisma.watchlistCompany.findMany({
        where: { active: true, ownerId },
        select: { id: true, ownerId: true, company: true, atsProvider: true, atsSlug: true },
      }),
    );
    logger.info({ summary, ownerId }, 'ats poll sweep (on-demand) complete');
    return summary;
  },
);
