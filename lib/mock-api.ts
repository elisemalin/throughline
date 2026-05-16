// lib/mock-api.ts
//
// FRONTEND AGENT owns this file end-to-end. Architect pre-populates it on
// Day 0 so Frontend has shapes to call against on Day 2.
//
// Every component imports from '@/lib/mock-api'. During the parallel sprint,
// these functions return contract-shaped fixtures derived from the prototype's
// mock implementations (see /prototype/Throughline.jsx).
//
// On Day 5, scripts/integrate.sh overwrites this file with /lib/api-client.ts,
// which has identical exports but uses fetch() against /app/api/*. Callers
// do not change. That is the entire integration mechanism for the frontend.
//
// CONTRACT: every function signature here matches a route in
// /contracts/api.ts. The integrity script verifies this at CI time.

import type {
  AlignmentRequest,
  AlignmentResponse,
  ApplicationCreate,
  ApplicationListResponse,
  ApplicationUpdate,
  CoverLetterRequest,
  DiscoveryListResponse,
  DiscoveryPollResponse,
  DiscoveryUpdateStatusRequest,
  DocumentListResponse,
  DocumentResponse,
  DossierRequest,
  MockInterviewRequest,
  MockInterviewResponse,
  NinetyDayRequest,
  ResumeRequest,
  SkillsIngestRequest,
  SkillsIngestResponse,
  SkillsReadResponse,
  SkillsUpdate,
  WatchlistAddRequest,
  WatchlistAddResponse,
  WatchlistListResponse,
} from '@/contracts/api';
import type {
  Application,
  Document,
  SkillsDB,
} from '@/contracts/models';

// ---------------------------------------------------------------------------
// Latency simulator — keep the UI honest about loading states
// ---------------------------------------------------------------------------
const __MOCK_MODE__ = true;
const FAST = 120;
const MED = 600;
const SLOW = 1400;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// POST /api/alignment
// Mirrors mockAlignmentAnalysis() in the prototype.
// ---------------------------------------------------------------------------
export async function postAlignment(
  req: AlignmentRequest,
  // Frontend Agent: passes the user's SkillsDB explicitly during mock mode.
  // After integration, the server resolves it from the session and this
  // parameter goes away.
  skillsDB: SkillsDB,
): Promise<AlignmentResponse> {
  await delay(MED);
  const jd = (req.jobDescription || '').toLowerCase();
  const haystack = [
    ...skillsDB.coreSkills,
    ...skillsDB.tools,
    ...skillsDB.methods,
    ...skillsDB.domains,
    ...skillsDB.keywords,
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
    const matched = haystack.some(
      (h) => h.includes(t) || t.includes(h.split(' ')[0] || ''),
    );
    const strength = matched ? 7 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 4);
    const type: 'strong' | 'partial' | 'missing' = matched
      ? 'strong'
      : Math.random() > 0.6
        ? 'partial'
        : 'missing';
    return {
      requirement: t,
      strength,
      type,
      evidence: matched ? 'Matches existing skill or tool entry' : 'No direct match in Skills DB',
      recommendation: matched
        ? 'Surface in summary or top bullet'
        : 'Consider adding a project or learning note',
    };
  });

  const matched = requirements.filter((r) => r.type !== 'missing').length;
  const score = Math.min(
    97,
    Math.round((matched / Math.max(requirements.length, 1)) * 100),
  );

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

// ---------------------------------------------------------------------------
// Document generation
// ---------------------------------------------------------------------------

export async function postResume(
  req: ResumeRequest,
  skillsDB: SkillsDB,
  application?: Application,
): Promise<DocumentResponse> {
  await delay(SLOW);
  return {
    kind: 'resume',
    title: `Resume for ${application?.role || 'general'}${application?.company ? ` (${application.company})` : ''}`,
    body: renderResume(skillsDB, application),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
}

export async function postCoverLetter(
  req: CoverLetterRequest,
  skillsDB: SkillsDB,
  application: Application,
): Promise<DocumentResponse> {
  await delay(SLOW);
  return {
    kind: 'cover_letter',
    title: `Cover letter for ${application.company || 'draft'}`,
    body: renderCoverLetter(skillsDB, application, req.customNotes),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
}

export async function postNinetyDayPlan(
  req: NinetyDayRequest,
  application: Application,
): Promise<DocumentResponse> {
  await delay(SLOW);
  return {
    kind: 'ninety_day',
    title: `90-day plan for ${application.company || 'draft'}`,
    body: renderNinetyDay(application),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
}

export async function postDossier(
  req: DossierRequest,
  application: Application,
): Promise<DocumentResponse> {
  await delay(SLOW);
  return {
    kind: 'dossier',
    title: `Dossier for ${application.company || 'company'}`,
    body: renderDossier(application),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
}

// ---------------------------------------------------------------------------
// Mock Interview — multi-turn
// ---------------------------------------------------------------------------

export async function postMockInterviewTurn(
  req: MockInterviewRequest,
): Promise<MockInterviewResponse> {
  await delay(MED);
  const followups = [
    'Good. Drill into the trickiest part of that. What broke and how did you handle it?',
    'Walk me through how you decided the scope. What did you cut?',
    'Tell me about a stakeholder who pushed back. What was the disagreement and how did it resolve?',
    'What would you do differently if you had to do that work again?',
    'How did you measure success? Who saw the metric?',
  ];
  return {
    next: {
      role: 'interviewer',
      text: followups[req.transcript.length % followups.length],
    },
  };
}

// ---------------------------------------------------------------------------
// Skills DB
// ---------------------------------------------------------------------------

export async function postSkillsIngest(
  _req: SkillsIngestRequest,
): Promise<SkillsIngestResponse> {
  await delay(SLOW);
  // Mock: returns an empty SkillsDB; real parsing happens once AI Integration
  // ships /lib/ai/skills-ingest.ts. Frontend can call this to drive its
  // loading/error UI shapes without waiting on the real implementation.
  return {
    skillsDB: emptySkillsDB(),
    warnings: ['mock-ingest: no parsing performed during sprint'],
  };
}

export async function getSkills(): Promise<SkillsReadResponse> {
  await delay(FAST);
  return { skillsDB: null };
}

export async function putSkills(_update: SkillsUpdate): Promise<SkillsReadResponse> {
  await delay(FAST);
  return { skillsDB: emptySkillsDB() };
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function getApplications(): Promise<ApplicationListResponse> {
  await delay(FAST);
  return { applications: [] };
}

export async function postApplication(
  req: ApplicationCreate,
): Promise<{ application: Application }> {
  await delay(FAST);
  return {
    application: {
      id: newId('app'),
      ownerId: 'mock_user',
      remote: req.remote ?? false,
      status: req.status ?? 'researching',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ...req,
    },
  };
}

export async function patchApplication(
  id: string,
  _patch: ApplicationUpdate,
): Promise<{ application: Application }> {
  await delay(FAST);
  return {
    application: {
      id,
      ownerId: 'mock_user',
      company: '',
      role: '',
      remote: false,
      status: 'researching',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      ..._patch,
    },
  };
}

export async function deleteApplication(_id: string): Promise<{ ok: true }> {
  await delay(FAST);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getDocuments(): Promise<DocumentListResponse> {
  await delay(FAST);
  return { documents: [] };
}

export async function deleteDocument(_id: string): Promise<{ ok: true }> {
  await delay(FAST);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Watchlist + Discovery
// ---------------------------------------------------------------------------

export async function getWatchlist(): Promise<WatchlistListResponse> {
  await delay(FAST);
  return { companies: [] };
}

export async function postWatchlistAdd(
  req: WatchlistAddRequest,
): Promise<WatchlistAddResponse> {
  await delay(FAST);
  return {
    company: {
      id: newId('w'),
      ownerId: 'mock_user',
      company: req.company,
      atsProvider: req.atsProvider,
      atsSlug: req.atsSlug,
      active: true,
      createdAt: nowIso(),
    },
    validation: { valid: true },
  };
}

export async function deleteWatchlistCompany(_id: string): Promise<{ ok: true }> {
  await delay(FAST);
  return { ok: true };
}

export async function getDiscovery(): Promise<DiscoveryListResponse> {
  await delay(FAST);
  return { postings: [] };
}

export async function postDiscoveryPoll(): Promise<DiscoveryPollResponse> {
  await delay(MED);
  return {
    newPostings: 0,
    totalPostings: 0,
    polledAt: nowIso(),
  };
}

export async function patchDiscoveryStatus(
  _id: string,
  _req: DiscoveryUpdateStatusRequest,
): Promise<{ ok: true }> {
  await delay(FAST);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Private helpers — straight from the prototype's mock document generators
// ---------------------------------------------------------------------------

function emptySkillsDB(): SkillsDB {
  return {
    id: 'mock_skills',
    ownerId: 'mock_user',
    fullName: '',
    headline: '',
    positioning: '',
    contact: { email: '' },
    targetRoles: [],
    awards: [],
    jobs: [],
    coreSkills: [],
    tools: [],
    methods: [],
    domains: [],
    keywords: [],
    updatedAt: nowIso(),
  };
}

function renderResume(skillsDB: SkillsDB, app?: Application): string {
  const role = app?.role || skillsDB.headline || 'Role';
  const company = app?.company ? ` (targeting ${app.company})` : '';
  const top = (skillsDB.jobs || []).slice(0, 3);
  const summary =
    skillsDB.positioning ||
    `${skillsDB.headline || 'Engineer'} with experience across enterprise internal tooling.`;
  const skillsLine = [
    ...(skillsDB.coreSkills || []).slice(0, 8),
    ...(skillsDB.tools || []).slice(0, 8),
  ].join(' · ');
  const expBlocks = top
    .map((j) => {
      const projects = (j.projects || [])
        .slice(0, 3)
        .map((p) => {
          const metrics = p.metrics && Object.keys(p.metrics).length
            ? ` (${Object.entries(p.metrics).map(([k, v]) => `${k}: ${v}`).join(', ')})`
            : '';
          return `- ${p.result || p.name}${metrics}`;
        })
        .join('\n');
      return `### ${j.title} at ${j.employer}\n${j.startDate} to ${j.endDate || 'Present'} · ${j.location}\n\n${projects}`;
    })
    .join('\n\n');

  return `# ${skillsDB.fullName || 'Your name'}
${role}${company}

${skillsDB.contact?.email || ''} · ${skillsDB.contact?.location || ''} · ${skillsDB.contact?.site || ''}

## Summary
${summary}

## Skills
${skillsLine}

## Experience
${expBlocks}

${(skillsDB.awards || []).length ? `## Awards\n${skillsDB.awards.map((a) => `- ${a}`).join('\n')}` : ''}
`;
}

function renderCoverLetter(
  skillsDB: SkillsDB,
  app: Application,
  customNotes?: string,
): string {
  const name = skillsDB.fullName || 'Your name';
  const role = app.role || 'this role';
  const company = app.company || 'your company';
  const sample = skillsDB.jobs?.[0]?.projects?.[0];
  return `# Cover Letter

Dear ${company} hiring team,

I'm writing about the ${role} opening. ${skillsDB.positioning || 'I build internal tools that turn business requirements into measurable operational lift.'}

${
  sample
    ? `In my current role I led ${sample.name.toLowerCase()}: ${sample.result || sample.problem}.`
    : ''
} The work translated directly into outcomes the business could measure, which is the kind of contribution I want to make at ${company}.

${customNotes ? `${customNotes}\n\n` : ''}What draws me to this role specifically is the chance to apply the same approach at a different scale. I would bring a structured, evidence-led practice to your team from day one.

### Skills and capabilities that align
- ${(skillsDB.coreSkills || []).slice(0, 3).join('\n- ')}
- ${(skillsDB.tools || []).slice(0, 3).join('\n- ')}

I would welcome the chance to discuss how this background fits.

Sincerely,
${name}
`;
}

function renderNinetyDay(app: Application): string {
  return `# 90-Day Plan: ${app.role || 'Target role'} at ${app.company || 'Company'}

## Days 1-30 · Learn the system
- Map stakeholders, tooling, and the active backlog
- Sit in on team ceremonies and shadow current owners of adjacent surfaces
- Ship one small, low-risk improvement to demonstrate working style
- Identify the two highest-leverage problems worth a structured proposal

## Days 31-60 · Earn the room
- Lead one cross-functional initiative end to end
- Establish a measurement baseline so future work is provably impactful
- Begin pairing with junior engineers and contributing to code review standards
- Write up a short retrospective for the team's reference

## Days 61-90 · Compound
- Take ownership of one durable system or workstream
- Document a roadmap for the next two quarters with measurable outcomes
- Establish recurring touchpoints with stakeholder leadership
- Build the conditions for the next person to ramp faster than you did
`;
}

function renderDossier(app: Application): string {
  const company = app.company || 'Company';
  return `# ${company} Dossier

## What they do
*(In production this is a one-shot Claude call with web search enabled.)* A summary of the company's products, services, and primary business model would appear here, written from current public sources.

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
`;
}

// __MOCK_MODE__ is read by scripts/integrate.sh status to detect sprint vs
// live mode. Don't remove it; the integration script greps for it.
void __MOCK_MODE__;
