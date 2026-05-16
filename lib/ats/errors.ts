// Typed error class for ATS provider HTTP failures.
//
// The poller catches AtsProviderError specifically so it can render a
// structured `errors[]` summary line per WatchlistCompany row (provider,
// slug, status) instead of opaque message strings. Any other thrown error
// is treated as an internal bug and is rethrown so Inngest's retry surfaces
// it loudly.

import type { AtsProvider } from '@/contracts/models';

export class AtsProviderError extends Error {
  public readonly provider: AtsProvider;
  public readonly slug: string;
  public readonly status?: number;
  public readonly attempts: number;

  constructor(args: {
    provider: AtsProvider;
    slug: string;
    status?: number;
    attempts?: number;
    message: string;
  }) {
    super(args.message);
    this.name = 'AtsProviderError';
    this.provider = args.provider;
    this.slug = args.slug;
    this.status = args.status;
    this.attempts = args.attempts ?? 1;
  }
}

export function isAtsProviderError(value: unknown): value is AtsProviderError {
  return value instanceof AtsProviderError;
}
