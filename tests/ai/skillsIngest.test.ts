import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IngestRawSchema, MODEL_INGEST_FALLBACK, type IngestInput } from '@/contracts/ai';
import { skillsIngest as mockSkillsIngest } from '@/lib/ai/workflows/skillsIngest.mock';
import { runSkillsIngest } from '@/lib/ai/workflows/skillsIngest';
import { __setCacheClientForTests } from '@/lib/ai/cache';
import { makeFakeCache, makeFakeClient } from './fakes';

beforeEach(() => {
  __setCacheClientForTests(makeFakeCache());
});

afterEach(() => {
  __setCacheClientForTests(null);
});

const minimalIngest = {
  fullName: 'Jane Doe',
  headline: 'Senior Engineer',
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
  warnings: [],
};

describe('skillsIngest mock', () => {
  it('returns a schema-valid IngestRawOutput', async () => {
    const input: IngestInput = { resumeText: 'Jane Doe\nSenior Engineer\n...' };
    const out = await mockSkillsIngest(input, { apiKey: '' });
    expect(IngestRawSchema.safeParse(out).success).toBe(true);
    expect(out.fullName).toBe('Jane Doe');
  });

  it('returns a warnings array (Day-3 contract addition)', async () => {
    const out = await mockSkillsIngest(
      { resumeText: 'Jane Doe\nSenior Engineer' },
      { apiKey: '' },
    );
    expect(Array.isArray(out.warnings)).toBe(true);
    expect(out.warnings.length).toBeGreaterThan(0);
  });
});

describe('skillsIngest real (mocked SDK)', () => {
  const valid = JSON.stringify(minimalIngest);

  it('wraps both resumeText and linkedinText', async () => {
    const client = makeFakeClient([{ text: valid }]);
    await runSkillsIngest(client, {
      resumeText: 'Jane Doe resume payload',
      linkedinText: 'Jane Doe LinkedIn payload',
    });
    const user = client.calls[0].user;
    expect(user).toContain('<UNTRUSTED_INPUT name="resume">');
    expect(user).toContain('<UNTRUSTED_INPUT name="linkedin">');
  });

  it('defaults to MODEL_INGEST_FALLBACK (opus) for noisy resume text', async () => {
    const client = makeFakeClient([{ text: valid }]);
    await runSkillsIngest(client, { resumeText: 'Jane Doe' });
    expect(client.calls[0].model).toBe(MODEL_INGEST_FALLBACK);
  });
});
