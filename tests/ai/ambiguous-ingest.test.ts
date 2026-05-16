// Deliberate-ambiguity ingest corpus.
//
// Day-4 deliverable: exercise the new IngestRawSchema.warnings field
// against resumes that ought to produce parsing warnings. Offline tier:
// drives the workflow with a fake SDK that simulates a well-behaved model
// emitting warnings tied to specific ambiguities. The live tier (real
// model against the same corpus) runs under pnpm test:ai:live as part of
// the smoke script.
//
// Each test case:
//   1. Hands the workflow a resumeText with a known ambiguity.
//   2. Has the fake SDK return an IngestRawOutput whose `warnings` array
//      reflects the ambiguity.
//   3. Asserts the workflow surfaces those warnings unchanged through
//      the Zod parse boundary (no silent stripping).

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IngestRawSchema } from '@/contracts/ai';
import { runSkillsIngest } from '@/lib/ai/workflows/skillsIngest';
import { __setCacheClientForTests } from '@/lib/ai/cache';
import { makeFakeCache, makeFakeClient } from './fakes';

beforeEach(() => {
  __setCacheClientForTests(makeFakeCache());
});

afterEach(() => {
  __setCacheClientForTests(null);
});

type AmbiguityCase = {
  name: string;
  resumeText: string;
  expectedWarningSubstrings: string[];
};

const AMBIGUITY_CORPUS: AmbiguityCase[] = [
  {
    name: 'job with missing end date (current role marked "Present")',
    resumeText:
      'Jane Doe\nSenior Engineer\n\nAcme Co — Senior Engineer\n2022-01 — Present\n- Owned ETL.',
    expectedWarningSubstrings: ['end date', 'present'],
  },
  {
    name: 'duplicate skills listed multiple times',
    resumeText:
      'Jane Doe\nFullstack Engineer\n\nSkills: Python, Python, TypeScript, Python, SQL, SQL',
    expectedWarningSubstrings: ['duplicate', 'collapsed'],
  },
  {
    name: 'ambiguous date format (Q3 2024 vs 2024-09)',
    resumeText:
      'Jane Doe\nProduct Manager\n\nWidgets Inc — PM\nQ3 2024 — Q1 2025\n- Launched discovery flow.',
    expectedWarningSubstrings: ['date', 'quarter'],
  },
  {
    name: 'twelve+ jobs (resume contains more roles than schema cap)',
    resumeText:
      Array.from({ length: 14 }, (_, i) =>
        `Job${i} Inc — Engineer\n201${i % 10}-01 — 201${(i + 1) % 10}-01\n- Built things.`,
      ).join('\n\n'),
    expectedWarningSubstrings: ['most recent', 'truncated'],
  },
];

// Helper: build a deliberately-warnings-rich response the fake SDK can return.
function fakeIngestResponse(warnings: string[]) {
  return {
    fullName: 'Jane Doe',
    headline: '',
    positioning: '',
    contact: {},
    targetRoles: [],
    awards: [],
    jobs: [],
    coreSkills: [],
    tools: [],
    methods: [],
    domains: [],
    keywords: [],
    warnings,
  };
}

describe('ambiguous-ingest corpus (offline)', () => {
  for (const { name, resumeText, expectedWarningSubstrings } of AMBIGUITY_CORPUS) {
    it(`surfaces warnings for: ${name}`, async () => {
      const warningsFromModel = expectedWarningSubstrings.map(
        (sub) => `${sub}: simulated parse ambiguity`,
      );
      const response = JSON.stringify(fakeIngestResponse(warningsFromModel));
      const client = makeFakeClient([{ text: response }]);
      const out = await runSkillsIngest(client, { resumeText });
      // Zod parse boundary did not strip the warnings.
      expect(out.warnings).toEqual(warningsFromModel);
      // And the schema round-trips cleanly.
      expect(IngestRawSchema.safeParse(out).success).toBe(true);
    });
  }

  it('an empty warnings array is valid (clean parse)', async () => {
    const response = JSON.stringify(fakeIngestResponse([]));
    const client = makeFakeClient([{ text: response }]);
    const out = await runSkillsIngest(client, { resumeText: 'Jane Doe' });
    expect(out.warnings).toEqual([]);
  });

  it('the schema caps warnings at 20 entries', () => {
    const overflowing = fakeIngestResponse(
      Array.from({ length: 21 }, (_, i) => `warning ${i}`),
    );
    expect(IngestRawSchema.safeParse(overflowing).success).toBe(false);
  });
});
