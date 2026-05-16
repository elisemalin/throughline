// Index dispatch tests — confirms `AI_MODE=mock` (the default) routes to
// the .mock implementations. The "live" dispatch path is exercised by the
// per-workflow runX() tests with an injected fake SDK; re-flipping
// AI_MODE at runtime would require module reloading and adds little
// coverage beyond the per-workflow tests.

import { describe, expect, it } from 'vitest';
import { AlignmentRawSchema, ResumeRawSchema } from '@/contracts/ai';
import { alignment, resolveMode, resume } from '@/lib/ai';
import { fakeApplication, fakeSkillsDB } from './fakes';

describe('AI Integration namespace dispatch', () => {
  it('defaults to mock mode when AI_MODE is unset', () => {
    // Vitest runs with whatever env is set; this assertion documents the
    // default — if a CI step ever sets AI_MODE=live, the per-workflow
    // tests will catch the wiring break via the missing-API-key path.
    expect(resolveMode()).toBe(process.env.AI_MODE === 'live' ? 'live' : 'mock');
  });

  it('exposes the alignment function from index', async () => {
    const out = await alignment(
      { skillsDB: fakeSkillsDB(), jobDescription: 'typescript engineer' },
      { apiKey: '' },
    );
    expect(AlignmentRawSchema.safeParse(out).success).toBe(true);
  });

  it('exposes the resume function from index', async () => {
    const out = await resume(
      { skillsDB: fakeSkillsDB(), application: fakeApplication() },
      { apiKey: '' },
    );
    expect(ResumeRawSchema.safeParse(out).success).toBe(true);
  });
});
