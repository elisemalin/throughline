// Cost-instrumentation unit tests. Verifies:
//   - usage is recorded per (workflow, model) and aggregated correctly
//   - USD estimate matches pricing-table × token count
//   - unknown models contribute zero USD (no throw, no silent drift)
//   - invokeOneShot records both attempts on validation-retry
//   - reset clears the counters
//
// The dollar arithmetic is intentionally brittle: a pricing update should
// fail this test and force an explicit acknowledgment in the same commit.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AlignmentRawSchema } from '@/contracts/ai';
import { __setCacheClientForTests } from '@/lib/ai/cache';
import {
  getCostStats,
  getPricingTable,
  recordUsage,
  resetCostStats,
} from '@/lib/ai/cost';
import { runAlignment } from '@/lib/ai/workflows/alignment';
import { fakeSkillsDB, makeFakeCache, makeFakeClient } from './fakes';

beforeEach(() => {
  resetCostStats();
  __setCacheClientForTests(makeFakeCache());
});

afterEach(() => {
  resetCostStats();
  __setCacheClientForTests(null);
});

describe('recordUsage', () => {
  it('starts empty after reset', () => {
    expect(getCostStats()).toEqual({ records: [], totalUsd: 0, byWorkflow: {} });
  });

  it('computes USD from the pricing table', () => {
    const r = recordUsage('alignment', 'claude-sonnet-4-6', {
      input_tokens: 1_000_000,
      output_tokens: 100_000,
    });
    // 1M sonnet input = $3.00 + 100k sonnet output = $1.50 → $4.50
    expect(r.estimatedUsd).toBeCloseTo(4.5, 5);
  });

  it('treats unknown models as zero-cost rather than throwing', () => {
    const r = recordUsage('alignment', 'claude-future-99', {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(r.estimatedUsd).toBe(0);
  });

  it('handles missing usage payload (defaults to zero tokens)', () => {
    const r = recordUsage('alignment', 'claude-sonnet-4-6', undefined);
    expect(r.inputTokens).toBe(0);
    expect(r.outputTokens).toBe(0);
    expect(r.estimatedUsd).toBe(0);
  });

  it('aggregates by workflow/model key', () => {
    recordUsage('alignment', 'claude-sonnet-4-6', {
      input_tokens: 1_000,
      output_tokens: 500,
    });
    recordUsage('alignment', 'claude-sonnet-4-6', {
      input_tokens: 2_000,
      output_tokens: 1_000,
    });
    recordUsage('skillsIngest', 'claude-opus-4-7', {
      input_tokens: 500,
      output_tokens: 200,
    });
    const stats = getCostStats();
    expect(Object.keys(stats.byWorkflow).sort()).toEqual([
      'alignment/claude-sonnet-4-6',
      'skillsIngest/claude-opus-4-7',
    ]);
    expect(stats.byWorkflow['alignment/claude-sonnet-4-6']).toMatchObject({
      inputTokens: 3_000,
      outputTokens: 1_500,
      calls: 2,
    });
    expect(stats.byWorkflow['skillsIngest/claude-opus-4-7'].calls).toBe(1);
    expect(stats.totalUsd).toBeGreaterThan(0);
  });

  it('exposes the pricing table read-only', () => {
    const table = getPricingTable();
    expect(table['claude-sonnet-4-6']).toEqual({ input: 3.0, output: 15.0 });
    expect(table['claude-opus-4-7']).toEqual({ input: 15.0, output: 75.0 });
    expect(table['claude-haiku-4-5']).toEqual({ input: 0.8, output: 4.0 });
  });
});

describe('invoke records usage on every SDK call (including retry)', () => {
  it('records once on a clean call', async () => {
    const valid = JSON.stringify(AlignmentRawSchema.parse({
      score: 50,
      requirements: [],
      missingKeywords: [],
      recommendation: 'fine',
    }));
    const client = makeFakeClient([{ text: valid }]);
    await runAlignment(client, {
      skillsDB: fakeSkillsDB(),
      jobDescription: 'looking for typescript',
    });
    const stats = getCostStats();
    expect(stats.records).toHaveLength(1);
    expect(stats.records[0].workflow).toBe('alignment');
  });

  it('records both attempts when the first call fails validation', async () => {
    const bad = '{"score": "not a number"}';
    const valid = JSON.stringify({
      score: 60,
      requirements: [],
      missingKeywords: [],
      recommendation: 'fine',
    });
    const client = makeFakeClient([{ text: bad }, { text: valid }]);
    await runAlignment(client, {
      skillsDB: fakeSkillsDB(),
      jobDescription: 'looking for typescript',
    });
    const stats = getCostStats();
    expect(stats.records).toHaveLength(2);
    expect(stats.records.every((r) => r.workflow === 'alignment')).toBe(true);
  });
});
