// Retry telemetry sink for the ATS poller.
//
// `fetchWithRetry` records every retry decision (which class, how long it
// waited) into the active sink. The poller installs a per-row sink via
// `withRetryTelemetry(sink, () => adapter.fetchPostings(slug))` so the
// retries belong to the row that triggered them, even when many rows are
// polled concurrently. AsyncLocalStorage carries the sink across `await`
// boundaries so the adapter code stays unaware of the instrumentation.

import { AsyncLocalStorage } from 'node:async_hooks';

export type RetryReason = 'fivexx' | 'fourTwentyNine' | 'network';

export interface RetryTelemetrySink {
  retries: Array<{ reason: RetryReason; waitMs: number }>;
}

export const retryTelemetryStorage = new AsyncLocalStorage<RetryTelemetrySink>();

export function recordRetry(reason: RetryReason, waitMs: number): void {
  const sink = retryTelemetryStorage.getStore();
  if (!sink) return;
  sink.retries.push({ reason, waitMs });
}

export function withRetryTelemetry<T>(
  sink: RetryTelemetrySink,
  fn: () => Promise<T>,
): Promise<T> {
  return retryTelemetryStorage.run(sink, fn);
}

export interface RetrySummary {
  fivexx: number;
  fourTwentyNine: number;
  network: number;
  totalBackoffMs: number;
}

export function summarizeRetries(sink: RetryTelemetrySink): RetrySummary {
  const summary: RetrySummary = {
    fivexx: 0,
    fourTwentyNine: 0,
    network: 0,
    totalBackoffMs: 0,
  };
  for (const r of sink.retries) {
    summary.totalBackoffMs += r.waitMs;
    if (r.reason === 'fivexx') summary.fivexx += 1;
    else if (r.reason === 'fourTwentyNine') summary.fourTwentyNine += 1;
    else summary.network += 1;
  }
  return summary;
}

export function newSink(): RetryTelemetrySink {
  return { retries: [] };
}
