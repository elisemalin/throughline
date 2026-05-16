// Lever adapter.
//
// Public postings API: see ATS_ENDPOINTS.lever in /contracts/ats.ts. The
// response is a bare JSON array (no envelope). Captured fixtures under
// tests/fixtures/ats/lever/ (mistral / spotify, May 2026).

import type { AtsAdapter } from '@/contracts/ats';
import { ATS_ENDPOINTS } from '@/contracts/ats';
import { atsSlugSchema } from '@/contracts/models';

export interface LeverRawJob {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt: number;
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  } | null;
  country?: string;
  workplaceType?: string;
  descriptionPlain?: string;
  description?: string;
  additionalPlain?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string } | null;
}

// hostedUrl is the canonical posting URL and carries the org slug as the
// first path segment (e.g. https://jobs.lever.co/spotify/<id>). The poller
// stamps the authoritative company name from the WatchlistCompany row, so
// best-effort title-casing here is fine.
function companyFromHostedUrl(hostedUrl: string): string {
  try {
    const path = new URL(hostedUrl).pathname.split('/').filter(Boolean);
    const slug = path[0] ?? '';
    if (!slug) return '';
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  } catch {
    return '';
  }
}

function locationFrom(raw: LeverRawJob): string {
  const cat = raw.categories ?? {};
  if (cat.location) return cat.location;
  if (cat.allLocations && cat.allLocations.length > 0) return cat.allLocations[0];
  return '';
}

function detectRemote(raw: LeverRawJob): boolean {
  if (raw.workplaceType && raw.workplaceType.toLowerCase() === 'remote') return true;
  const cat = raw.categories ?? {};
  const candidates: string[] = [];
  if (cat.location) candidates.push(cat.location);
  if (cat.allLocations) candidates.push(...cat.allLocations);
  return candidates.some((s) => /\bremote\b/i.test(s));
}

function salaryRange(raw: LeverRawJob): string | undefined {
  const s = raw.salaryRange;
  if (!s || s.min == null || s.max == null) return undefined;
  const currency = s.currency ?? 'USD';
  return `${currency} ${s.min}-${s.max}${s.interval ? `/${s.interval}` : ''}`;
}

export const leverAdapter: AtsAdapter<LeverRawJob> = {
  provider: 'lever',

  async validateSlug(slug) {
    const parsed = atsSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { valid: false, error: parsed.error.issues[0]?.message ?? 'invalid slug' };
    }
    try {
      const res = await fetch(ATS_ENDPOINTS.lever(slug), {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (res.status === 404) return { valid: false, error: 'board not found' };
      if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data) || data.length === 0) {
        return { valid: false, error: 'board returned no postings' };
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'network error' };
    }
  },

  async fetchPostings(slug) {
    const res = await fetch(ATS_ENDPOINTS.lever(slug), {
      method: 'GET',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Lever ${slug}: HTTP ${res.status}`);
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error(`Lever ${slug}: expected array, got ${typeof data}`);
    }
    return data as LeverRawJob[];
  },

  normalize(raw) {
    const postedAt = new Date(raw.createdAt).toISOString();
    const jobDescription = (raw.descriptionPlain ?? '').slice(0, 50_000);

    return {
      externalId: raw.id,
      company: companyFromHostedUrl(raw.hostedUrl),
      atsProvider: 'lever',
      role: raw.text,
      location: locationFrom(raw),
      remote: detectRemote(raw),
      postedAt,
      url: raw.hostedUrl,
      ...(salaryRange(raw) !== undefined ? { salaryRange: salaryRange(raw) as string } : {}),
      jobDescription,
    };
  },
};
