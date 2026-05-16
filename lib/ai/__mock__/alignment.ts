// Day-2 placeholder for AI Integration's alignment workflow.
//
// WHY: Backend Core imports `runAlignment` from '@/lib/ai' so handlers can be
// built before AI Integration's real workflow lands. The mock returns a
// contract-shaped AlignmentAnalysis derived from the same overlap heuristic
// the prototype's mockAlignmentAnalysis used, so the response remains
// realistic enough for Frontend Agent's Storybook stories. AI Integration's
// Day-2 PR overwrites this file path with the real workflow.

import type { AlignmentInput, AlignmentRawOutput } from '@/contracts/ai';

export async function runAlignment(
  input: AlignmentInput,
): Promise<AlignmentRawOutput> {
  const jd = (input.jobDescription || '').toLowerCase();
  const haystack = [
    ...input.skillsDB.coreSkills,
    ...input.skillsDB.tools,
    ...input.skillsDB.methods,
    ...input.skillsDB.domains,
    ...input.skillsDB.keywords,
  ].map((s) => s.toLowerCase());

  const tokens = Array.from(
    new Set(
      jd
        .replace(/[^a-z0-9+./\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2),
    ),
  );

  const requirements = tokens.slice(0, 14).map((t) => {
    const matched = haystack.some((h) => h.includes(t));
    const strength = matched ? 8 : 2;
    const type: 'strong' | 'partial' | 'missing' = matched ? 'strong' : 'missing';
    return {
      requirement: t,
      strength,
      type,
      evidence: matched
        ? 'Matches existing skill or tool entry'
        : 'No direct match in Skills DB',
      recommendation: matched
        ? 'Surface in summary or top bullet'
        : 'Consider adding a project or learning note',
    };
  });

  const matched = requirements.filter((r) => r.type !== 'missing').length;
  const score =
    requirements.length === 0
      ? 0
      : Math.min(97, Math.round((matched / requirements.length) * 100));

  return {
    score,
    requirements,
    missingKeywords: requirements
      .filter((r) => r.type === 'missing')
      .map((r) => r.requirement)
      .slice(0, 5),
    recommendation:
      score >= 80
        ? 'Strong fit. Apply.'
        : score >= 60
          ? 'Good potential. Targeted edits should lift this above 80.'
          : 'Weak fit on paper. Either reposition heavily or move on.',
  };
}
