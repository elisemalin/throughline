import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AlignmentRawSchema, type AlignmentInput } from '@/contracts/ai';
import { alignment as mockAlignment } from '@/lib/ai/workflows/alignment.mock';
import { buildAlignmentUser, runAlignment } from '@/lib/ai/workflows/alignment';
import { __setCacheClientForTests } from '@/lib/ai/cache';
import { fakeApplication, fakeSkillsDB, makeFakeCache, makeFakeClient } from './fakes';

const apiKey = 'sk-test';

beforeEach(() => {
  __setCacheClientForTests(makeFakeCache());
});

afterEach(() => {
  __setCacheClientForTests(null);
});

describe('alignment mock', () => {
  it('returns a schema-valid shape', async () => {
    const input: AlignmentInput = {
      skillsDB: fakeSkillsDB(),
      jobDescription: 'Looking for typescript and react engineers.',
    };
    const out = await mockAlignment(input, { apiKey });
    expect(AlignmentRawSchema.safeParse(out).success).toBe(true);
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
  });
});

describe('alignment real (mocked SDK)', () => {
  const validResponse = JSON.stringify({
    score: 78,
    requirements: [
      {
        requirement: 'typescript',
        strength: 8,
        type: 'strong',
        evidence: 'core skill present',
        recommendation: 'lead the resume summary with this',
      },
    ],
    missingKeywords: [],
    recommendation: 'Strong fit.',
  });

  it('wrapUntrusted is called on jobDescription', async () => {
    const client = makeFakeClient([{ text: validResponse }]);
    const app = fakeApplication();
    await runAlignment(client, {
      skillsDB: fakeSkillsDB(),
      jobDescription: app.jobDescription ?? '',
    });
    expect(client.calls).toHaveLength(1);
    expect(client.calls[0].user).toContain('<UNTRUSTED_INPUT name="jobDescription">');
    expect(client.calls[0].user).toContain('</UNTRUSTED_INPUT name="jobDescription">');
  });

  it('retries once on validation failure and returns the corrected output', async () => {
    const client = makeFakeClient([
      { text: '{"score": "not a number"}' },
      { text: validResponse },
    ]);
    const out = await runAlignment(client, {
      skillsDB: fakeSkillsDB(),
      jobDescription: 'looking for typescript',
    });
    expect(client.calls).toHaveLength(2);
    expect(out.score).toBe(78);
    // The retry attempt's system prompt carries the correction suffix.
    expect(client.calls[1].system).toContain('failed schema validation');
    expect(client.calls[0].system).not.toContain('failed schema validation');
  });

  it('caches the validated response by SHA-256 of (system + user + model)', async () => {
    const store = new Map<string, string>();
    __setCacheClientForTests(makeFakeCache(store));
    const client = makeFakeClient([{ text: validResponse }, { text: validResponse }]);
    const input: AlignmentInput = {
      skillsDB: fakeSkillsDB(),
      jobDescription: 'looking for typescript',
    };
    const first = await runAlignment(client, input);
    expect(store.size).toBe(1);
    // Cache values are JSON-encoded strings.
    const cached = JSON.parse(store.values().next().value!);
    expect(cached.score).toBe(78);
    // Second call with the same input hits the cache and never reaches
    // the SDK, so the second response in the fake queue stays untouched.
    const second = await runAlignment(client, input);
    expect(client.calls).toHaveLength(1);
    expect(second).toEqual(first);
  });

  it('buildAlignmentUser places JD content inside the tag block with < escaped', () => {
    const user = buildAlignmentUser({
      skillsDB: fakeSkillsDB(),
      jobDescription: 'looking for senior <script>alert(1)</script> typescript',
    });
    // wrapUntrusted escapes `<` (and `&`) but leaves `>` alone per the
    // contract in /contracts/ai.ts — `>` by itself cannot start a tag.
    expect(user).toContain(
      '<UNTRUSTED_INPUT name="jobDescription">\nlooking for senior &lt;script>alert(1)&lt;/script> typescript\n</UNTRUSTED_INPUT name="jobDescription">',
    );
  });
});
