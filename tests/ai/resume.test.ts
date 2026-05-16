import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ResumeRawSchema, type ResumeInput } from '@/contracts/ai';
import { resume as mockResume } from '@/lib/ai/workflows/resume.mock';
import { buildResumeUser, runResume } from '@/lib/ai/workflows/resume';
import { __setCacheClientForTests } from '@/lib/ai/cache';
import { fakeApplication, fakeSkillsDB, makeFakeCache, makeFakeClient } from './fakes';

beforeEach(() => {
  __setCacheClientForTests(makeFakeCache());
});

afterEach(() => {
  __setCacheClientForTests(null);
});

describe('resume mock', () => {
  it('returns a Markdown body that parses through ResumeRawSchema', async () => {
    const input: ResumeInput = { skillsDB: fakeSkillsDB(), application: fakeApplication() };
    const out = await mockResume(input, { apiKey: '' });
    expect(ResumeRawSchema.safeParse(out).success).toBe(true);
    expect(out.body).toContain('Test Candidate');
  });
});

describe('resume real (mocked SDK)', () => {
  const valid = JSON.stringify({ body: 'A resume body that is long enough to satisfy the validator: '.repeat(4) });

  it('wraps every user-supplied application field', async () => {
    const client = makeFakeClient([{ text: valid }]);
    const app = fakeApplication({ notes: 'remote-friendly' });
    await runResume(client, { skillsDB: fakeSkillsDB(), application: app });
    const userMsg = client.calls[0].user;
    expect(userMsg).toContain('<UNTRUSTED_INPUT name="role">');
    expect(userMsg).toContain('<UNTRUSTED_INPUT name="company">');
    expect(userMsg).toContain('<UNTRUSTED_INPUT name="jobDescription">');
    expect(userMsg).toContain('<UNTRUSTED_INPUT name="notes">');
  });

  it('retries on validation failure with the corrected attempt cached', async () => {
    const store = new Map<string, string>();
    __setCacheClientForTests(makeFakeCache(store));
    const client = makeFakeClient([
      { text: '{"body": "too short"}' },
      { text: valid },
    ]);
    await runResume(client, { skillsDB: fakeSkillsDB(), application: fakeApplication() });
    expect(client.calls).toHaveLength(2);
    expect(store.size).toBe(1);
  });

  it('builds a deterministic user message order so cache hits are stable', () => {
    const a = buildResumeUser({ skillsDB: fakeSkillsDB(), application: fakeApplication() });
    const b = buildResumeUser({ skillsDB: fakeSkillsDB(), application: fakeApplication() });
    expect(a).toBe(b);
  });
});
