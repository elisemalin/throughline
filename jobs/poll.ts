// ATS polling job.
//
// Daily 06:00 UTC sweep across every active WatchlistCompany row. For each
// row we call the matching adapter's fetchPostings, normalize each posting,
// and insert any whose (watchlistCompanyId, externalId) pair is not already
// in DiscoveredPosting. A 2-second pause is inserted between calls to the
// same provider per the ATS rate-limit policy in /contracts/ats.ts.
//
// What this job does NOT do (intentional, see CLAUDE.md):
//   - It does not call AI workflows. Alignment scoring runs in Backend Core
//     after the row is written.
//   - It does not retry failed fetches inside one sweep. The next daily run
//     picks the row up; transient provider failures resolve naturally.
//   - It does not overwrite existing DiscoveredPosting rows. The dedup key
//     is (watchlistCompanyId, externalId) and inserts are conditional.

import type { AtsProvider, WatchlistCompany } from '@/contracts/models';
import { ATS_REQUEST_DELAY_MS } from '@/contracts/ats';
import { prisma } from '@/lib/db/prisma';
import { ATS_ADAPTERS } from '@/lib/ats/registry';
import { inngest } from './inngest';

const POLLER_KILL_SWITCH_VALUE = 'disabled';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PollResult {
  watchlistCompanyId: string;
  provider: AtsProvider;
  fetched: number;
  inserted: number;
  error?: string;
}

async function pollOne(
  row: Pick<WatchlistCompany, 'id' | 'ownerId' | 'company' | 'atsProvider' | 'atsSlug'>,
): Promise<PollResult> {
  const adapter = ATS_ADAPTERS[row.atsProvider];
  try {
    const raws = await adapter.fetchPostings(row.atsSlug);
    let inserted = 0;
    for (const raw of raws) {
      const normalized = adapter.normalize(raw);
      // upsert-with-skip semantics: createMany + skipDuplicates would also work
      // but per-row insert keeps the path simple and gives us a precise count.
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
    return { watchlistCompanyId: row.id, provider: row.atsProvider, fetched: raws.length, inserted };
  } catch (err) {
    return {
      watchlistCompanyId: row.id,
      provider: row.atsProvider,
      fetched: 0,
      inserted: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function pollProviderGroup(
  rows: Array<Pick<WatchlistCompany, 'id' | 'ownerId' | 'company' | 'atsProvider' | 'atsSlug'>>,
): Promise<PollResult[]> {
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

export const atsPollFunction = inngest.createFunction(
  { id: 'ats-poll-daily', name: 'ATS poll (daily)' },
  { cron: '0 6 * * *' },
  async ({ logger }) => {
    if (process.env.ATS_POLLER === POLLER_KILL_SWITCH_VALUE) {
      logger.info('ATS_POLLER=disabled; skipping sweep');
      return { skipped: true };
    }

    const rows = await prisma.watchlistCompany.findMany({
      where: { active: true },
      select: { id: true, ownerId: true, company: true, atsProvider: true, atsSlug: true },
    });

    // Group by provider so the 2-second delay only serializes calls within
    // a provider; different providers run concurrently.
    const groups = new Map<
      AtsProvider,
      Array<(typeof rows)[number]>
    >();
    for (const row of rows) {
      const list = groups.get(row.atsProvider) ?? [];
      list.push(row);
      groups.set(row.atsProvider, list);
    }

    const grouped = await Promise.all(
      Array.from(groups.values()).map((group) => pollProviderGroup(group)),
    );
    const results = grouped.flat();

    const summary = {
      watchlistRows: rows.length,
      providersTouched: groups.size,
      postingsInserted: results.reduce((acc, r) => acc + r.inserted, 0),
      errors: results.filter((r) => r.error).map((r) => ({ id: r.watchlistCompanyId, error: r.error })),
    };
    logger.info({ summary }, 'ats poll sweep complete');
    return summary;
  },
);
