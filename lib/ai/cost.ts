// Per-workflow token + cost instrumentation.
//
// invoke.ts and mockInterview.ts call `recordUsage()` after every SDK call.
// `getCostStats()` returns a snapshot grouped by (workflow × model) and a
// running total in USD. The cost figures are estimates for development
// observability — pricing tables drift; the canonical bill comes from
// the Anthropic console.
//
// Like the cache counters, this module never sees prompt or response
// content — only the model id, the token counts the SDK reports, and the
// workflow name supplied by the caller.

import type Anthropic from '@anthropic-ai/sdk';

// USD per million tokens. Sourced from the public Anthropic pricing page
// as of 2026-05. Unknown models default to {0, 0} so estimatedUsd remains
// a strict lower bound rather than throwing in production.
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-4-7': { input: 15.0, output: 75.0 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
};

export type CostRecord = {
  workflow: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
};

const records: CostRecord[] = [];

// Anthropic's Messages.Usage carries optional cache-related fields too
// (cache_creation_input_tokens, cache_read_input_tokens); we count only
// the headline numbers for now. If prompt caching lands later, this is
// the single point that needs to grow.
type UsageSource = Pick<Anthropic.Messages.Usage, 'input_tokens' | 'output_tokens'>;

export function recordUsage(
  workflow: string,
  model: string,
  usage: UsageSource | undefined,
): CostRecord {
  const inputTokens = usage?.input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  const pricing = PRICING_PER_MTOK[model] ?? { input: 0, output: 0 };
  const estimatedUsd =
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  const record: CostRecord = {
    workflow,
    model,
    inputTokens,
    outputTokens,
    estimatedUsd,
  };
  records.push(record);
  return record;
}

export type CostSnapshot = {
  records: CostRecord[];
  totalUsd: number;
  byWorkflow: Record<
    string,
    { inputTokens: number; outputTokens: number; usd: number; calls: number }
  >;
};

export function getCostStats(): CostSnapshot {
  const byWorkflow: CostSnapshot['byWorkflow'] = {};
  let totalUsd = 0;
  for (const r of records) {
    totalUsd += r.estimatedUsd;
    const key = `${r.workflow}/${r.model}`;
    if (!byWorkflow[key]) {
      byWorkflow[key] = { inputTokens: 0, outputTokens: 0, usd: 0, calls: 0 };
    }
    byWorkflow[key].inputTokens += r.inputTokens;
    byWorkflow[key].outputTokens += r.outputTokens;
    byWorkflow[key].usd += r.estimatedUsd;
    byWorkflow[key].calls += 1;
  }
  return { records: [...records], totalUsd, byWorkflow };
}

export function resetCostStats(): void {
  records.length = 0;
}

// Exposed for unit tests so a pricing-table change is easy to assert
// against. Callers should treat it as read-only.
export function getPricingTable(): Readonly<typeof PRICING_PER_MTOK> {
  return PRICING_PER_MTOK;
}
