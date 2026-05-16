// Greenhouse adapter.
//
// Public Job Board API: see ATS_ENDPOINTS.greenhouse in /contracts/ats.ts.
// Response shape verified against captured fixtures under
// tests/fixtures/ats/greenhouse/ (anthropic / stripe / airbnb, May 2026).

import type { AtsAdapter } from '@/contracts/ats';
import { ATS_ENDPOINTS } from '@/contracts/ats';
import { atsSlugSchema } from '@/contracts/models';
import { fetchWithRetry } from './_http';

// Subset of the Greenhouse posting we consume. The wire response carries more
// fields (departments, offices, metadata, requisition_id, etc.); we only type
// what normalize() actually reads so a contract drift in any other field is
// silently tolerated.
export interface GreenhouseRawJob {
  id: number;
  title: string;
  absolute_url: string;
  company_name?: string;
  location?: { name?: string } | null;
  offices?: Array<{ name?: string }> | null;
  updated_at?: string;
  first_published?: string;
  content?: string;
}

interface GreenhouseResponse {
  jobs: GreenhouseRawJob[];
  meta?: { total?: number };
}

// Greenhouse's content field is HTML escaped with named and numeric entities
// (the entity-encoded payload then survives as JSON). Order matters: numeric
// references are resolved before named so a literal `&amp;#39;` written by a
// poster is not double-decoded; &amp; is processed last so a single-encoded
// &amp;lt; round-trips to <.
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(parseInt(dec, 10)),
    )
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// Strip tags and collapse whitespace. Block-level tag closers become newlines
// so the downstream AI prompt does not glue paragraphs together. Output is
// capped to NormalizedPostingSchema's 50k bound by the caller.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|ul|ol|tr|td|th|table|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

const REMOTE_PATTERN = /\bremote\b/i;

function detectRemote(locationName: string, officeNames: string[]): boolean {
  if (REMOTE_PATTERN.test(locationName)) return true;
  return officeNames.some((name) => REMOTE_PATTERN.test(name));
}

async function fetchBoard(slug: string): Promise<GreenhouseResponse> {
  const res = await fetchWithRetry(
    ATS_ENDPOINTS.greenhouse(slug),
    { method: 'GET', headers: { accept: 'application/json' } },
    { provider: 'greenhouse', slug },
  );
  return (await res.json()) as GreenhouseResponse;
}

export const greenhouseAdapter: AtsAdapter<GreenhouseRawJob> = {
  provider: 'greenhouse',

  async validateSlug(slug) {
    const parsed = atsSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { valid: false, error: parsed.error.issues[0]?.message ?? 'invalid slug' };
    }
    try {
      const res = await fetch(ATS_ENDPOINTS.greenhouse(slug), {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if (res.status === 404) return { valid: false, error: 'board not found' };
      if (!res.ok) return { valid: false, error: `HTTP ${res.status}` };
      const data = (await res.json()) as GreenhouseResponse;
      if (!data.jobs || data.jobs.length === 0) {
        return { valid: false, error: 'board returned no postings' };
      }
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'network error' };
    }
  },

  async fetchPostings(slug) {
    // The public Job Board API returns the full list in a single response
    // (verified: anthropic 410 jobs in one 5.9 MB payload). There is no
    // pagination cursor in the documented contract; if Greenhouse adds one
    // (a `meta.next_cursor` or similar), extend here rather than scraping.
    const data = await fetchBoard(slug);
    return data.jobs ?? [];
  },

  normalize(raw) {
    const locationName = raw.location?.name ?? '';
    const officeNames = (raw.offices ?? [])
      .map((o) => o.name ?? '')
      .filter((n) => n.length > 0);
    const remote = detectRemote(locationName, officeNames);
    const postedAt = raw.updated_at ?? raw.first_published ?? '';
    const contentHtml = raw.content ? decodeHtmlEntities(raw.content) : '';
    const jobDescription = htmlToPlainText(contentHtml).slice(0, 50_000);

    return {
      externalId: String(raw.id),
      company: raw.company_name ?? '',
      atsProvider: 'greenhouse',
      role: raw.title,
      location: locationName,
      remote,
      postedAt,
      url: raw.absolute_url,
      jobDescription,
    };
  },
};
