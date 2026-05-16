import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NinetyDayRawSchema, type NinetyDayInput } from '@/contracts/ai';
import { ninetyDay as mockNinetyDay } from '@/lib/ai/workflows/ninetyDay.mock';
import { runNinetyDay } from '@/lib/ai/workflows/ninetyDay';
import { __setCacheClientForTests } from '@/lib/ai/cache';
import { fakeApplication, fakeSkillsDB, makeFakeCache, makeFakeClient } from './fakes';

beforeEach(() => {
  __setCacheClientForTests(makeFakeCache());
});

afterEach(() => {
  __setCacheClientForTests(null);
});

describe('ninetyDay mock', () => {
  it('returns a Markdown body that parses through NinetyDayRawSchema', async () => {
    const input: NinetyDayInput = { skillsDB: fakeSkillsDB(), application: fakeApplication() };
    const out = await mockNinetyDay(input, { apiKey: '' });
    expect(NinetyDayRawSchema.safeParse(out).success).toBe(true);
    expect(out.body).toContain('Days 1-30');
  });
});

describe('ninetyDay real (mocked SDK)', () => {
  const valid = JSON.stringify({
    body: '# Plan\n## Days 1-30 Learn\n- map the codebase\n- shadow oncall\n- ship a small change\n\n## Days 31-60 Earn\n- lead one initiative\n- baseline a metric\n\n## Days 61-90 Compound\n- own a workstream\n- document the roadmap',
  });

  it('passes role and company through wrapUntrusted tags', async () => {
    const client = makeFakeClient([{ text: valid }]);
    await runNinetyDay(client, {
      skillsDB: fakeSkillsDB(),
      application: fakeApplication({ role: 'Staff Engineer', company: 'Stripe' }),
    });
    const user = client.calls[0].user;
    expect(user).toContain('<UNTRUSTED_INPUT name="role">\nStaff Engineer');
    expect(user).toContain('<UNTRUSTED_INPUT name="company">\nStripe');
  });
});
