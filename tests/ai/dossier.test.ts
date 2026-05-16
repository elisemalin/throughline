import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DossierRawSchema, type DossierInput } from '@/contracts/ai';
import { dossier as mockDossier } from '@/lib/ai/workflows/dossier.mock';
import { runDossier } from '@/lib/ai/workflows/dossier';
import { __setCacheClientForTests } from '@/lib/ai/cache';
import { fakeApplication, makeFakeCache, makeFakeClient } from './fakes';

beforeEach(() => {
  __setCacheClientForTests(makeFakeCache());
});

afterEach(() => {
  __setCacheClientForTests(null);
});

describe('dossier mock', () => {
  it('returns a Markdown body that parses through DossierRawSchema', async () => {
    const input: DossierInput = { application: fakeApplication({ company: 'Stripe' }) };
    const out = await mockDossier(input, { apiKey: '' });
    expect(DossierRawSchema.safeParse(out).success).toBe(true);
    expect(out.body).toContain('Stripe Dossier');
  });
});

describe('dossier real (mocked SDK)', () => {
  const valid = JSON.stringify({
    body: '# Stripe Dossier\n## What they do\nPayments platform.\n## Smart questions\n- About strategy: ...\n- About the team: ...\n- About metrics: ...',
  });

  it('passes the web_search tool to the SDK', async () => {
    const client = makeFakeClient([{ text: valid }]);
    await runDossier(client, { application: fakeApplication() });
    const tools = client.calls[0].tools as Array<{ name: string }> | undefined;
    expect(tools).toBeDefined();
    expect(tools?.[0]?.name).toBe('web_search');
  });

  it('wraps application fields as untrusted input', async () => {
    const client = makeFakeClient([{ text: valid }]);
    await runDossier(client, { application: fakeApplication() });
    expect(client.calls[0].user).toContain('<UNTRUSTED_INPUT name="company">');
  });
});
