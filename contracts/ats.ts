// contracts/ats.ts
//
// Provider adapter contracts for ATS polling. External Adapter Agent owns
// the implementations under /lib/ats/*; Backend Core consumes the registry.
//
// Each adapter normalizes provider-specific posting shapes to a single
// NormalizedPosting that Backend Core wraps with server-set fields into a
// DiscoveredPosting (see /contracts/models.ts).

import { z } from 'zod';
import { ATS_PROVIDERS, AtsProviderSchema, DiscoveredPostingSchema } from './models';
import type { AtsProvider } from './models';

// ---------------------------------------------------------------------------
// Provider endpoints (canonical — do not invent)
// ---------------------------------------------------------------------------

// Slugs are encodeURIComponent'd as defense-in-depth; the upstream
// atsSlugSchema (models.ts) already restricts to [a-zA-Z0-9_-]{1,100}.
export const ATS_ENDPOINTS = {
  greenhouse: (slug: string) =>
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs?content=true`,
  lever: (slug: string) =>
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
  ashby: (slug: string) =>
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`,
  workday: (slug: string) => {
    // Workday is v1.1; stub only in MVP. Slug format is tenant.region.site.
    void slug;
    throw new Error('Workday adapter not implemented in MVP');
  },
} as const;

// ---------------------------------------------------------------------------
// Rate limiting
//
// 2-second delay between calls to the same provider; the External Adapter
// implements this in the poller, not per adapter.
// ---------------------------------------------------------------------------

export const ATS_REQUEST_DELAY_MS = 2_000;

// ---------------------------------------------------------------------------
// Adapter interface
//
// Generic over the raw posting type so each provider keeps its own internal
// shape and normalize() consumes it type-safely. Registry: /lib/ats/registry.ts
// maps AtsProvider -> AtsAdapter instance.
// ---------------------------------------------------------------------------

// Slot for the subset of fields the adapter fills. The poller fills in id,
// ownerId, watchlistCompanyId, createdAt, status, applicationId, and
// (optionally) alignmentScore once Backend Core has scored the row.
export type NormalizedPosting = Omit<
  z.infer<typeof DiscoveredPostingSchema>,
  | 'id'
  | 'ownerId'
  | 'watchlistCompanyId'
  | 'createdAt'
  | 'status'
  | 'alignmentScore'
  | 'applicationId'
>;

export interface AtsAdapter<TRaw = unknown> {
  provider: AtsProvider;

  // Returns { valid: true } if the slug resolves to a board with postings.
  // Used by /api/watchlist to validate user-submitted slugs at add time.
  validateSlug(slug: string): Promise<{ valid: boolean; error?: string }>;

  // Returns the provider's full list of current postings. Pagination is
  // handled internally by the adapter; callers receive the complete list.
  fetchPostings(slug: string): Promise<TRaw[]>;

  // Maps one raw posting to a NormalizedPosting. Pure function.
  // externalId is the provider's posting ID (dedup key).
  normalize(raw: TRaw): NormalizedPosting & { externalId: string };
}

// ---------------------------------------------------------------------------
// Adapter validation
//
// Used in adapter unit tests: each adapter test asserts its normalize()
// output passes this schema before the poller commits.
// ---------------------------------------------------------------------------

export const NormalizedPostingSchema = z
  .object({
    externalId: z.string().min(1).max(200),
    company: z.string().min(1).max(200),
    atsProvider: AtsProviderSchema,
    role: z.string().min(1).max(200),
    location: z.string().max(200).default(''),
    remote: z.boolean(),
    postedAt: z.string(),                            // ISO date
    url: z.string().url(),
    salaryRange: z.string().max(200).optional(),
    jobDescription: z.string().max(50_000).default(''),
  })
  .strict();

// Re-export so adapter tests don't need to import from models.ts directly.
export { ATS_PROVIDERS };

// ---------------------------------------------------------------------------
// On-demand poll event
//
// Backend Core's POST /api/discovery/poll dispatches this via inngest.send;
// External Adapter's Inngest function listens for it and runs a per-user
// sweep. The constant + schema live here so both producer (Backend Core's
// handler) and consumer (jobs/poll.ts) import from the contract — keeps the
// role boundary clean. See /contracts/proposals/2026-05-16-external-adapter-ats-poll-event.md.
// ---------------------------------------------------------------------------

export const ATS_POLL_REQUESTED_EVENT = 'ats/poll.requested' as const;
export type AtsPollRequestedEvent = typeof ATS_POLL_REQUESTED_EVENT;

export const AtsPollRequestedDataSchema = z
  .object({
    ownerId: z.string().min(1).max(200),
  })
  .strict();
export type AtsPollRequestedData = z.infer<typeof AtsPollRequestedDataSchema>;
