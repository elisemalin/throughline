// Ashby adapter.
//
// Public job-board API: see ATS_ENDPOINTS.ashby in /contracts/ats.ts. The
// response wraps the postings in `{ jobs, apiVersion }`. Captured fixtures
// under tests/fixtures/ats/ashby/ (linear / notion, May 2026).

import type { AtsAdapter } from '@/contracts/ats';
import { ATS_ENDPOINTS } from '@/contracts/ats';
import { atsSlugSchema } from '@/contracts/models';

export interface AshbyRawJob {
  id: string;
  title: string;
  department?: string;
  team?: string;
  employmentType?: string;
  location?: string;
  secondaryLocations?: Array<{ location?: string }> | null;
  publishedAt: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  jobUrl: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  compensationTierSummary?: string | null;
  compensation?: unknown;
}

interface AshbyResponse {
  jobs: AshbyRawJob[];
  apiVersion?: string;
}

// jobUrl is `https://jobs.ashbyhq.com/<slug>/<id>`; company is recovered from
// the first path segment. Poller overrides with WatchlistCompany.company.
function companyFromJobUrl(jobUrl: string): string {
  try {
    const path = new URL(jobUrl).pathname.split('/').filter(Boolean);
    const slug = path[0] ?? '';
    if (!slug) return '';
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  } catch {
    return '';
  }
}

export const ashbyAdapter: AtsAdapter<AshbyRawJob> = {
  provider: 'ashby',

  async validateSlug(slug) {
    const parsed = atsSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { valid: false, error: parsed.error.issues[0]?.message ?? 'invalid slug' };
    }
    try {
      const res = await fetch(ATS_ENDPOINTS.ashby(slug), {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (res.status === 404) return { valid: false, error: 'board not found' };
      if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
      const data = (await res.json()) as AshbyResponse;
      if (!Array.isArray(data.jobs) || data.jobs.length === 0) {
        return { valid: false, error: 'board returned no postings' };
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'network error' };
    }
  },

  async fetchPostings(slug) {
    const res = await fetch(ATS_ENDPOINTS.ashby(slug), {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Ashby ${slug}: HTTP ${res.status}`);
    const data = (await res.json()) as AshbyResponse;
    return data.jobs ?? [];
  },

  normalize(raw) {
    const location = raw.location ?? '';
    const remote =
      raw.isRemote === true ||
      (raw.workplaceType ? raw.workplaceType.toLowerCase() === 'remote' : false);
    const jobDescription = (raw.descriptionPlain ?? '').slice(0, 50_000);
    const salaryRange =
      typeof raw.compensationTierSummary === 'string' && raw.compensationTierSummary.length > 0
        ? raw.compensationTierSummary.slice(0, 200)
        : undefined;

    return {
      externalId: raw.id,
      company: companyFromJobUrl(raw.jobUrl),
      atsProvider: 'ashby',
      role: raw.title,
      location,
      remote,
      postedAt: raw.publishedAt,
      url: raw.jobUrl,
      ...(salaryRange !== undefined ? { salaryRange } : {}),
      jobDescription,
    };
  },
};
