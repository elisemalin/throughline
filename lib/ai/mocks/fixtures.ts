// Fixture builders for the AI Integration mock implementations.
//
// These mirror the rendering helpers in /lib/mock-api.ts so Frontend's UI
// keeps rendering identical body content during the parallel sprint. We do
// NOT import from /lib/mock-api.ts: that file belongs to Frontend Agent and
// is overwritten by scripts/integrate.sh on Day 5. Keeping parallel
// builders here lets the AI namespace's mocks stand on their own once the
// frontend mock-api becomes a fetch layer.
//
// Every value returned here is shaped to pass the workflow's Zod RawSchema
// from /contracts/ai.ts; the per-workflow .mock.ts files do a final
// schema.parse() so a contract drift surfaces immediately.

import type {
  Application,
  Project,
  SkillsDB,
  Story,
} from '@/contracts/models';
import type { IngestRawOutput } from '@/contracts/ai';

export function emptySkillsDBPersistedShape(): SkillsDB {
  return {
    id: 'mock_skills',
    ownerId: 'mock_user',
    fullName: '',
    headline: '',
    positioning: '',
    contact: { email: '', phone: '', location: '', linkedin: '', site: '' },
    targetRoles: [],
    awards: [],
    jobs: [],
    coreSkills: [],
    tools: [],
    methods: [],
    domains: [],
    keywords: [],
    updatedAt: new Date().toISOString(),
  };
}

// Ingest output omits server-set fields. Provides a small but non-empty
// shape so the body-of-evidence assertions in tests have something to
// verify.
export function ingestFixture(resumeText: string): IngestRawOutput {
  const firstLine = resumeText.split('\n').find((l) => l.trim().length > 0) ?? '';
  const inferredName = firstLine.slice(0, 80);
  return {
    fullName: inferredName,
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
  };
}

// Alignment requirement extraction matches the prototype's tokenization:
// strip non-word punctuation, split on whitespace, dedupe, drop short
// tokens. Mirrors postAlignment() in /lib/mock-api.ts.
function tokenize(jd: string): string[] {
  return Array.from(
    new Set(
      jd
        .toLowerCase()
        .replace(/[^a-z0-9+./\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2),
    ),
  );
}

function skillsHaystack(skillsDB: SkillsDB): string[] {
  return [
    ...skillsDB.coreSkills,
    ...skillsDB.tools,
    ...skillsDB.methods,
    ...skillsDB.domains,
    ...skillsDB.keywords,
  ].map((s) => s.toLowerCase());
}

export function alignmentFixture(skillsDB: SkillsDB, jobDescription: string) {
  const haystack = skillsHaystack(skillsDB);
  const tokens = tokenize(jobDescription).slice(0, 14);
  const requirements = tokens.map((t) => {
    const matched = haystack.some((h) => h.includes(t));
    const strength = matched ? 8 : 3;
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
  // Avoid divide-by-zero when the JD is too short to produce tokens; the
  // empty-JD case is rejected by the API request schema, but the mock has
  // no such guard and may be called from a Storybook story.
  const score = requirements.length === 0
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
        ? 'Strong fit. Apply. Surface the partial matches more prominently in summary and bullets.'
        : score >= 60
          ? 'Good potential. Targeted edits to bullets and keyword density should lift this above 80.'
          : 'Weak fit on paper. Either reposition heavily or move on.',
  };
}

export function resumeFixture(skillsDB: SkillsDB, application?: Application): string {
  const role = application?.role || skillsDB.headline || 'Role';
  const company = application?.company ? ` (targeting ${application.company})` : '';
  const top = (skillsDB.jobs || []).slice(0, 3);
  const summary =
    skillsDB.positioning ||
    `${skillsDB.headline || 'Engineer'} with experience across enterprise internal tooling.`;
  const skillsLine = [
    ...(skillsDB.coreSkills || []).slice(0, 8),
    ...(skillsDB.tools || []).slice(0, 8),
  ].join(' - ');
  const expBlocks = top
    .map((j) => {
      const projects = (j.projects || [])
        .slice(0, 3)
        .map((p: Project) => {
          const metrics =
            p.metrics && Object.keys(p.metrics).length
              ? ` (${Object.entries(p.metrics)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(', ')})`
              : '';
          return `- ${p.result || p.name}${metrics}`;
        })
        .join('\n');
      return `### ${j.title} at ${j.employer}\n${j.startDate} to ${j.endDate || 'Present'} - ${j.location}\n\n${projects}`;
    })
    .join('\n\n');
  const awardsBlock = (skillsDB.awards || []).length
    ? `## Awards\n${skillsDB.awards.map((a) => `- ${a}`).join('\n')}`
    : '';

  return `# ${skillsDB.fullName || 'Your name'}
${role}${company}

${skillsDB.contact?.email || ''} - ${skillsDB.contact?.location || ''} - ${skillsDB.contact?.site || ''}

## Summary
${summary}

## Skills
${skillsLine}

## Experience
${expBlocks || '(no experience entries on file)'}

${awardsBlock}

(Mock document generated for the parallel sprint. Live mode replaces this with a tailored resume produced by Claude.)
`;
}

export function coverLetterFixture(
  skillsDB: SkillsDB,
  application: Application,
  customNotes?: string,
): string {
  const name = skillsDB.fullName || 'Your name';
  const role = application.role || 'this role';
  const company = application.company || 'your company';
  const sample = skillsDB.jobs?.[0]?.projects?.[0];
  return `# Cover Letter

Dear ${company} hiring team,

I am writing about the ${role} opening. ${
    skillsDB.positioning ||
    'I build internal tools that turn business requirements into measurable operational lift.'
  }

${
  sample
    ? `In my current role I led ${sample.name.toLowerCase()}: ${sample.result || sample.problem}.`
    : ''
} The work translated directly into outcomes the business could measure, which is the kind of contribution I want to make at ${company}.

${customNotes ? `${customNotes}\n\n` : ''}What draws me to this role specifically is the chance to apply the same approach at a different scale. I would bring a structured, evidence-led practice to your team from day one.

Sincerely,
${name}

(Mock document generated for the parallel sprint. Live mode replaces this with a tailored cover letter produced by Claude.)
`;
}

export function ninetyDayFixture(application: Application): string {
  return `# 90-Day Plan: ${application.role || 'Target role'} at ${application.company || 'Company'}

## Days 1-30 - Learn the system
- Map stakeholders, tooling, and the active backlog
- Sit in on team ceremonies and shadow current owners of adjacent surfaces
- Ship one small, low-risk improvement to demonstrate working style
- Identify the two highest-leverage problems worth a structured proposal

## Days 31-60 - Earn the room
- Lead one cross-functional initiative end to end
- Establish a measurement baseline so future work is provably impactful
- Begin pairing with junior engineers and contributing to code review standards
- Write up a short retrospective for the team's reference

## Days 61-90 - Compound
- Take ownership of one durable system or workstream
- Document a roadmap for the next two quarters with measurable outcomes
- Establish recurring touchpoints with stakeholder leadership
- Build the conditions for the next person to ramp faster than you did

(Mock document generated for the parallel sprint. Live mode replaces this with a tailored plan produced by Claude.)
`;
}

export function dossierFixture(application: Application): string {
  const company = application.company || 'Company';
  return `# ${company} Dossier

## What they do
A summary of the company's products, services, and primary business model would appear here, written from current public sources.

## How they make money
Primary revenue lines, customer segments, and pricing posture.

## Recent signals
- Recent news, leadership changes, strategic shifts
- Product launches or pivots in the last 12 months
- Tech stack signals from job postings and public engineering content

## Likely priorities for this role
Inferred from the JD and the company's current situation. What problems is this role most likely being hired to solve?

## Smart questions to ask
- About strategy
- About the team
- About success metrics in the first 90 days

(Mock document generated for the parallel sprint. Live mode replaces this with a researched dossier produced by Claude with web search.)
`;
}

const MOCK_OPENERS = [
  'Thanks for making the time. To start: walk me through your most relevant experience for this role.',
  'Tell me about the most impactful project you have shipped that maps to what we are hiring for.',
  'What drew you to this opening specifically?',
];

const MOCK_FOLLOWUPS = [
  'Good. Drill into the trickiest part of that. What broke and how did you handle it?',
  'Walk me through how you decided the scope. What did you cut?',
  'Tell me about a stakeholder who pushed back. What was the disagreement and how did it resolve?',
  'What would you do differently if you had to do that work again?',
  'How did you measure success? Who saw the metric?',
];

const MOCK_WRAPUP = "That covers what I had. We'll be in touch.";

// Same opener-rotation primitive as /lib/mock-api.ts so re-opening the
// same Application in the prototype pairs with a stable opener.
function openerIndexFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % MOCK_OPENERS.length;
}

export function mockInterviewFixture(
  application: Application,
  _stories: Story[],
  transcript: Array<{ role: 'interviewer' | 'user'; text: string }>,
): { next: string; done: boolean } {
  if (transcript.length === 0) {
    return { next: MOCK_OPENERS[openerIndexFor(application.id)], done: false };
  }
  const userTurns = transcript.filter((t) => t.role === 'user').length;
  if (userTurns >= 10) {
    return { next: MOCK_WRAPUP, done: true };
  }
  return { next: MOCK_FOLLOWUPS[userTurns % MOCK_FOLLOWUPS.length], done: false };
}
