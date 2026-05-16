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
// Every function in this file:
//   1. Has a signature matching its API_ROUTES entry. No extra parameters
//      that won't exist post-integration.
//   2. Validates its request through the relevant Zod schema FIRST so the
//      Frontend Agent sees the real boundary behavior during the sprint.
//   3. Strips server-controlled fields (id, ownerId, createdAt) from spread
//      payloads so a malicious request shape cannot clobber server state.
//
// A shared in-memory MockState replaces session/DB state during the sprint;
// integrate.sh deletes it.

import {
  AlignmentRequestSchema,
  ApplicationCreateSchema,
  ApplicationUpdateSchema,
  CoverLetterRequestSchema,
  DiscoveryUpdateSchema,
  DossierRequestSchema,
  MockInterviewRequestSchema,
  NinetyDayRequestSchema,
  ResumeRequestSchema,
  SkillsIngestRequestSchema,
  SkillsUpdateSchema,
  WatchlistAddSchema,
  type AlignmentRequest,
  type AlignmentResponse,
  type ApplicationCreate,
  type ApplicationListResponse,
  type ApplicationUpdate,
  type ApplicationAlignmentResponse,
  type ApplicationEventListResponse,
  type CoverLetterRequest,
  type DiscoveryListResponse,
  type DiscoveryPollResponse,
  type DiscoveryUpdateRequest,
  type DocumentListResponse,
  type DocumentResponse,
  type DossierRequest,
  type MockInterviewRequest,
  type MockInterviewResponse,
  type NinetyDayRequest,
  type ResumeRequest,
  type SkillsIngestRequest,
  type SkillsIngestResponse,
  type SkillsReadResponse,
  type SkillsUpdate,
  type WatchlistAddRequest,
  type WatchlistAddResponse,
  type WatchlistListResponse,
} from '@/contracts/api';
import type {
  AlignmentAnalysis,
  Application,
  DiscoveredPosting,
  Document,
  SkillsDB,
  WatchlistCompany,
} from '@/contracts/models';

// ---------------------------------------------------------------------------
// Mock mode sentinel. scripts/integrate.sh greps for __MOCK_MODE__ to detect
// sprint vs live mode. Don't remove it; the integration script depends on it.
// ---------------------------------------------------------------------------
const __MOCK_MODE__ = true;
void __MOCK_MODE__;

// ---------------------------------------------------------------------------
// Latency simulator and id helpers
// ---------------------------------------------------------------------------

const FAST = 120;
const MED = 600;
const SLOW = 1400;

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------
// Shared in-memory state
//
// Frontend Agent: the live state is owned by Zustand stores under /stores/.
// The mock module reads/writes a separate "server-side" in-memory store so
// API calls actually persist within the session. Lost on reload — fine for
// the sprint. Replaced by real Backend Core handlers on Day 5.
// ---------------------------------------------------------------------------

// MockState exported so Storybook stories can construct typed patches
// via __seedMockState.
export type MockState = {
  skillsDB: SkillsDB | null;
  applications: Application[];
  applicationEvents: Record<string, ApplicationEventListResponse['events']>;
  documents: Document[];
  watchlist: WatchlistAddResponse['company'][];
  discovery: DiscoveryListResponse['postings'];
};

const mockState: MockState = {
  skillsDB: null,
  applications: [],
  applicationEvents: {},
  documents: [],
  watchlist: [],
  discovery: [],
};

// Test-only escape hatch: lets the Frontend Agent's Storybook stories seed
// state without going through the API. Not exported through the package's
// public surface; the integrate.sh swap removes this entirely.
export function __seedMockState(patch: Partial<MockState>): void {
  Object.assign(mockState, patch);
}

// ---------------------------------------------------------------------------
// Fixtures (lifted from /prototype/Throughline.jsx so Storybook and the
// dev shell render against realistic data). Exported so stories and tests
// can construct typed patches via __seedMockState.
// ---------------------------------------------------------------------------

// Lifted from prototype/Throughline.jsx lines 120-469. IDs and shapes
// normalized to contracts/models.ts (jobs use the J\\d{1,4} regex; projects
// use the P\\d{1,4} regex; endDate is undefined rather than empty string).
export const eliseSeed: SkillsDB = {
  id: 'mock_skills',
  ownerId: 'mock_user',
  fullName: 'Elise Malin',
  headline: 'Software Engineer & UI Developer',
  positioning:
    'Front-end engineer who turns internal tooling into measurable operational lift for ops, training, and field teams at enterprise scale.',
  contact: {
    email: 'elisemalin7@gmail.com',
    phone: '+1 480 666 1320',
    location: 'Tempe, Arizona',
    site: 'pasteldawn.com',
  },
  targetRoles: [
    'Senior Full Stack Engineer',
    'Digital Solutions Engineer',
    'Senior Frontend Engineer',
  ],
  awards: [
    '2025 Award of Excellence at Discount Tire (one of three company-wide recipients)',
    'Employee of the Year at Tala Multimedia (2020)',
    'Employee of the Year at SmartWrap (2016)',
  ],
  jobs: [
    {
      id: 'J01',
      employer: 'Discount Tire',
      title: 'Frontend Developer II',
      startDate: '2021-07',
      location: 'Scottsdale, AZ',
      industry: 'Retail / Automotive Services',
      summary:
        'Design, develop, and test enterprise-wide web applications and training technology serving 25,000+ employees across 1,100+ retail locations.',
      projects: [
        {
          id: 'P01',
          name: 'Vision POS Training & Inventory System',
          problem:
            '25,000+ store associates needed to be trained on a new POS and inventory system without disrupting daily operations.',
          actions: [
            'Served as Program Lead for the rollout end-to-end',
            'Designed and built interactive simulations mirroring the production POS',
            'Developed mobile and desktop training modules in React',
          ],
          result: 'Onboarded 25,000+ store employees with a zero-disruption rollout.',
          metrics: { users: '25000', locations: '1100' },
          scope: 'Company-wide, 1,100+ retail locations',
          skills: ['React', 'JavaScript', 'Instructional design', 'Program management'],
          tools: ['React', 'SCORM', 'Kaltura'],
          methods: ['Agile', 'Cross-functional delivery'],
          domain: 'Enterprise training',
          keywords: ['POS training', 'simulation', 'eLearning', 'enterprise rollout'],
          recency: 5,
          relevance: ['leadership', 'frontend', 'training'],
          confidence: 0.95,
        },
        {
          id: 'P02',
          name: 'DTU Review Tracker (POC)',
          problem:
            'Performance and content review processes lacked structured tracking, SSO, and audit trail.',
          actions: [
            'Architected full-stack POC with React + TypeScript frontend and Node/Express backend',
            'Designed PostgreSQL schema with Prisma',
            'Integrated Okta SSO for enterprise authentication',
          ],
          result:
            'Delivered an IT-validated proof of concept used as evidence for Digital Solutions Engineering reclassification.',
          metrics: {},
          scope: 'DTU Develop team and stakeholders',
          skills: ['Full-stack architecture', 'React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          tools: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Prisma', 'Okta'],
          methods: ['Discovery', 'Architecture design', 'POC delivery'],
          domain: 'Enterprise internal tools',
          keywords: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Prisma', 'SSO'],
          recency: 5,
          relevance: ['fullstack', 'architecture'],
          confidence: 0.95,
        },
      ],
    },
    {
      id: 'J02',
      employer: 'Tala Multimedia',
      title: 'Contract Frontend Developer',
      startDate: '2019-08',
      endDate: '2024-05',
      location: 'Remote',
      industry: 'Web development agency',
      summary:
        'Designed, developed, and managed 150+ client websites across stacks including WordPress, Strapi, and static builds.',
      projects: [
        {
          id: 'P01',
          name: '150+ Client Website Builds',
          problem:
            'Small and mid-sized clients needed custom websites across a wide range of CMS, design, and budget constraints.',
          actions: [
            'Designed in Figma and Adobe XD',
            'Built across WordPress, Strapi, and static HTML/CSS/JS',
          ],
          result: 'Delivered 150+ production client websites with stack appropriate to each engagement.',
          metrics: { client_sites: '150' },
          scope: 'Agency client portfolio',
          skills: ['Frontend development', 'Design systems', 'Client management'],
          tools: ['Figma', 'Adobe XD', 'WordPress', 'Strapi', 'HTML', 'CSS', 'JavaScript'],
          methods: ['Client discovery', 'Iterative delivery'],
          domain: 'Web development',
          keywords: ['WordPress', 'Strapi', 'Figma', 'frontend'],
          recency: 4,
          relevance: ['frontend', 'design'],
          confidence: 0.95,
        },
      ],
    },
  ],
  coreSkills: [
    'React',
    'TypeScript',
    'JavaScript',
    'Node.js',
    'Full-stack architecture',
    'Frontend development',
    'API integration',
    'Program management',
    'Code review',
    'Mentorship',
  ],
  tools: [
    'React',
    'TypeScript',
    'Node.js',
    'Express',
    'PostgreSQL',
    'Prisma',
    'Figma',
    'Postman',
    'Okta',
    'AWS S3',
  ],
  methods: ['Agile', 'Cross-functional delivery', 'Architecture design', 'Code review'],
  domains: ['Enterprise training', 'Enterprise internal tools', 'Web development'],
  keywords: ['React', 'TypeScript', 'Node.js', 'enterprise rollout', 'internal tools'],
  updatedAt: '2026-05-16T00:00:00.000Z',
};

// Lifted from prototype/Throughline.jsx lines 481-492. Shape matches
// WatchlistCompany contract (id, ownerId, company, atsProvider, atsSlug,
// active, lastPolled, createdAt).
export const watchlistSeed: WatchlistCompany[] = [
  {
    id: 'w_1',
    ownerId: 'mock_user',
    company: 'Retool',
    atsProvider: 'greenhouse',
    atsSlug: 'retool',
    active: true,
    lastPolled: '2026-05-13T06:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'w_2',
    ownerId: 'mock_user',
    company: 'Linear',
    atsProvider: 'greenhouse',
    atsSlug: 'linear',
    active: true,
    lastPolled: '2026-05-13T06:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'w_3',
    ownerId: 'mock_user',
    company: 'Vercel',
    atsProvider: 'ashby',
    atsSlug: 'vercel',
    active: true,
    lastPolled: '2026-05-13T06:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'w_4',
    ownerId: 'mock_user',
    company: 'Anthropic',
    atsProvider: 'greenhouse',
    atsSlug: 'anthropic',
    active: true,
    lastPolled: '2026-05-13T06:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
  },
  {
    id: 'w_5',
    ownerId: 'mock_user',
    company: 'Figma',
    atsProvider: 'ashby',
    atsSlug: 'figma',
    active: true,
    lastPolled: '2026-05-13T06:00:00Z',
    createdAt: '2026-05-01T00:00:00Z',
  },
];

// Lifted from prototype/Throughline.jsx lines 499-650. Shapes normalized to
// the DiscoveredPosting contract (adds ownerId, watchlistCompanyId,
// externalId, createdAt; coerces remote to boolean; postedAt is ISO date).
export const discoverySeed: DiscoveredPosting[] = [
  {
    id: 'disc_1',
    ownerId: 'mock_user',
    watchlistCompanyId: 'w_1',
    externalId: 'gh-retool-1',
    company: 'Retool',
    atsProvider: 'greenhouse',
    role: 'Solutions Engineer, Internal Tools',
    location: 'San Francisco / Remote (US)',
    remote: true,
    postedAt: '2026-05-12',
    url: 'https://job-boards.greenhouse.io/retool/jobs/example',
    salaryRange: '$170k to $230k',
    jobDescription:
      "Retool is hiring a Solutions Engineer for our Internal Tools practice. You'll partner with our largest customers (engineering, ops, and training teams) to architect internal applications on Retool. You will translate business requirements into shipped tooling, build reference implementations, and debug production deployments alongside customer engineering teams.",
    alignmentScore: 92,
    status: 'new',
    createdAt: '2026-05-12T06:00:00Z',
  },
  {
    id: 'disc_2',
    ownerId: 'mock_user',
    watchlistCompanyId: 'w_2',
    externalId: 'gh-linear-1',
    company: 'Linear',
    atsProvider: 'greenhouse',
    role: 'Senior Frontend Engineer',
    location: 'Remote (Americas)',
    remote: true,
    postedAt: '2026-05-11',
    url: 'https://job-boards.greenhouse.io/linear/jobs/example',
    salaryRange: '$190k to $250k',
    jobDescription:
      'Linear is hiring a Senior Frontend Engineer to work on our core product. You will ship rapidly, own features end to end, and partner with design on tightly crafted interactions. We are looking for strong React and TypeScript fundamentals, design sensibility, and a portfolio of production frontend work at scale.',
    alignmentScore: 88,
    status: 'new',
    createdAt: '2026-05-11T06:00:00Z',
  },
  {
    id: 'disc_3',
    ownerId: 'mock_user',
    watchlistCompanyId: 'w_3',
    externalId: 'ashby-vercel-1',
    company: 'Vercel',
    atsProvider: 'ashby',
    role: 'Senior Full Stack Engineer, Customer Engineering',
    location: 'Remote (US)',
    remote: true,
    postedAt: '2026-05-10',
    url: 'https://jobs.ashbyhq.com/vercel/example',
    salaryRange: '$180k to $240k',
    jobDescription:
      "Vercel is hiring a Senior Full Stack Engineer for our Customer Engineering team. You will work directly with enterprise customers, build reference implementations, debug production Next.js deployments, and contribute back into our core product.",
    alignmentScore: 85,
    status: 'new',
    createdAt: '2026-05-10T06:00:00Z',
  },
  {
    id: 'disc_4',
    ownerId: 'mock_user',
    watchlistCompanyId: 'w_4',
    externalId: 'gh-anthropic-1',
    company: 'Anthropic',
    atsProvider: 'greenhouse',
    role: 'Frontend Engineer, Claude for Work',
    location: 'San Francisco / NYC / Remote',
    remote: true,
    postedAt: '2026-05-08',
    url: 'https://job-boards.greenhouse.io/anthropic/jobs/example',
    salaryRange: '$200k to $260k',
    jobDescription:
      "Anthropic is hiring Frontend Engineers to build Claude.ai and our enterprise extensions. You'll work in React and TypeScript, ship features for millions of users, and partner closely with research, design, and product.",
    alignmentScore: 82,
    status: 'new',
    createdAt: '2026-05-08T06:00:00Z',
  },
  {
    id: 'disc_5',
    ownerId: 'mock_user',
    watchlistCompanyId: 'w_5',
    externalId: 'ashby-figma-1',
    company: 'Figma',
    atsProvider: 'ashby',
    role: 'Software Engineer, Internal Tools',
    location: 'San Francisco / NYC',
    remote: false,
    postedAt: '2026-05-08',
    url: 'https://jobs.ashbyhq.com/figma/example',
    salaryRange: '$180k to $240k',
    jobDescription:
      "Figma is hiring a Software Engineer for our Internal Tools team. You will build the tooling that lets Figma's GTM, ops, support, and training teams scale. React and TypeScript skills, comfort with full stack JavaScript and SQL, and the ability to scope ambiguous problems are required.",
    alignmentScore: 80,
    status: 'new',
    createdAt: '2026-05-08T06:00:00Z',
  },
];

// Hydrate the mock state with the prototype's seed data on module load so
// every route renders against realistic data during the parallel sprint.
// Storybook stories override via __seedMockState.
Object.assign(mockState, {
  skillsDB: eliseSeed,
  watchlist: watchlistSeed,
  discovery: discoverySeed,
});

// ---------------------------------------------------------------------------
// POST /api/alignment
//
// Mirrors mockAlignmentAnalysis() in the prototype. Mock reads SkillsDB from
// mockState (the real route resolves it from the session). Field name is
// `requirement` per /contracts/models.ts AlignmentRequirement — the
// prototype's `term` field was renamed to align with the contract.
// ---------------------------------------------------------------------------

export async function postAlignment(req: AlignmentRequest): Promise<AlignmentResponse> {
  AlignmentRequestSchema.parse(req);
  await delay(MED);

  const skillsDB = mockState.skillsDB ?? emptySkillsDB();
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

  const requirements: AlignmentAnalysis['requirements'] = tokens.slice(0, 14).map((t) => {
    // Multi-word skill entries are compared by their full lowercase form;
    // single-word JD tokens still match when contained in a skill phrase.
    const matched = haystack.some((h) => h.includes(t));
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

// ---------------------------------------------------------------------------
// Document generation
// ---------------------------------------------------------------------------

// WHY: in production, the document-generation routes also persist the
// resulting Document row (a generation that no one can re-read isn't useful).
// The mock mirrors that: each generator pushes to mockState.documents so
// getDocuments() returns the freshly created entry.
function persistGenerated(response: DocumentResponse): Document {
  const doc: Document = {
    id: newId('doc'),
    ownerId: 'mock_user',
    kind: response.kind,
    title: response.title,
    body: response.body,
    applicationId: response.applicationId,
    createdAt: response.createdAt,
  };
  mockState.documents.unshift(doc);
  return doc;
}

export async function postResume(req: ResumeRequest): Promise<DocumentResponse> {
  ResumeRequestSchema.parse(req);
  await delay(SLOW);
  const skillsDB = mockState.skillsDB ?? emptySkillsDB();
  const application = req.applicationId
    ? mockState.applications.find((a) => a.id === req.applicationId)
    : undefined;
  const response: DocumentResponse = {
    kind: 'resume',
    title: `Resume for ${application?.role || 'general'}${application?.company ? ` (${application.company})` : ''}`,
    body: renderResume(skillsDB, application),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
  persistGenerated(response);
  return response;
}

export async function postCoverLetter(req: CoverLetterRequest): Promise<DocumentResponse> {
  CoverLetterRequestSchema.parse(req);
  await delay(SLOW);
  const skillsDB = mockState.skillsDB ?? emptySkillsDB();
  const application = mockState.applications.find((a) => a.id === req.applicationId);
  if (!application) {
    throw new Error(`Application not found: ${req.applicationId}`);
  }
  const response: DocumentResponse = {
    kind: 'cover_letter',
    title: `Cover letter for ${application.company || 'draft'}`,
    body: renderCoverLetter(skillsDB, application, req.customNotes),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
  persistGenerated(response);
  return response;
}

export async function postNinetyDayPlan(req: NinetyDayRequest): Promise<DocumentResponse> {
  NinetyDayRequestSchema.parse(req);
  await delay(SLOW);
  const application = mockState.applications.find((a) => a.id === req.applicationId);
  if (!application) {
    throw new Error(`Application not found: ${req.applicationId}`);
  }
  const response: DocumentResponse = {
    kind: 'ninety_day',
    title: `90-day plan for ${application.company || 'draft'}`,
    body: renderNinetyDay(application),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
  persistGenerated(response);
  return response;
}

export async function postDossier(req: DossierRequest): Promise<DocumentResponse> {
  DossierRequestSchema.parse(req);
  await delay(SLOW);
  const application = mockState.applications.find((a) => a.id === req.applicationId);
  if (!application) {
    throw new Error(`Application not found: ${req.applicationId}`);
  }
  const response: DocumentResponse = {
    kind: 'dossier',
    title: `Dossier for ${application.company || 'company'}`,
    body: renderDossier(application),
    createdAt: nowIso(),
    applicationId: req.applicationId,
  };
  persistGenerated(response);
  return response;
}

// ---------------------------------------------------------------------------
// Mock Interview — multi-turn with opener + termination
//
// Empty transcript → return an opener anchored to the application role.
// After 10+ user turns → set done=true and return a wrap-up message.
// Otherwise cycle through follow-up archetypes.
// ---------------------------------------------------------------------------

// Three openers; rotate by applicationId hash so the same app pairs with the
// same opener across re-opens, but different apps get variety.
const MOCK_OPENERS = [
  'Thanks for making the time. To start: walk me through your most relevant experience for this role.',
  'Tell me about the most impactful project you have shipped that maps to what we are hiring for.',
  'What drew you to this opening specifically?',
];

function openerIndexFor(applicationId: string): number {
  let h = 0;
  for (let i = 0; i < applicationId.length; i++) h = (h * 31 + applicationId.charCodeAt(i)) >>> 0;
  return h % MOCK_OPENERS.length;
}

const MOCK_FOLLOWUPS = [
  'Good. Drill into the trickiest part of that. What broke and how did you handle it?',
  'Walk me through how you decided the scope. What did you cut?',
  'Tell me about a stakeholder who pushed back. What was the disagreement and how did it resolve?',
  'What would you do differently if you had to do that work again?',
  'How did you measure success? Who saw the metric?',
];

const MOCK_WRAPUP = "That covers what I had. We'll be in touch.";

export async function postMockInterviewTurn(
  req: MockInterviewRequest,
): Promise<MockInterviewResponse> {
  MockInterviewRequestSchema.parse(req);
  await delay(MED);

  const userTurns = req.transcript.filter((t) => t.role === 'user').length;

  if (req.transcript.length === 0) {
    return {
      next: { role: 'interviewer', text: MOCK_OPENERS[openerIndexFor(req.applicationId)] },
      done: false,
    };
  }

  if (userTurns >= 10) {
    return {
      next: { role: 'interviewer', text: MOCK_WRAPUP },
      done: true,
    };
  }

  return {
    next: {
      role: 'interviewer',
      text: MOCK_FOLLOWUPS[userTurns % MOCK_FOLLOWUPS.length],
    },
    done: false,
  };
}

// ---------------------------------------------------------------------------
// Skills DB
// ---------------------------------------------------------------------------

export async function postSkillsIngest(
  req: SkillsIngestRequest,
): Promise<SkillsIngestResponse> {
  SkillsIngestRequestSchema.parse(req);
  await delay(SLOW);
  const skillsDB = emptySkillsDB();
  mockState.skillsDB = skillsDB;
  return {
    skillsDB,
    warnings: ['mock-ingest: no parsing performed during sprint'],
  };
}

export async function getSkills(): Promise<SkillsReadResponse> {
  await delay(FAST);
  return { skillsDB: mockState.skillsDB };
}

export async function putSkills(update: SkillsUpdate): Promise<SkillsReadResponse> {
  SkillsUpdateSchema.parse(update);
  await delay(FAST);
  const current = mockState.skillsDB ?? emptySkillsDB();
  mockState.skillsDB = {
    ...current,
    ...update,
    contact: { ...current.contact, ...(update.contact ?? {}) },
    updatedAt: nowIso(),
  } as SkillsDB;
  return { skillsDB: mockState.skillsDB };
}

// ---------------------------------------------------------------------------
// Applications
//
// Mass-assignment defense: ApplicationCreateSchema and ApplicationUpdateSchema
// are both .strict() and .omit({id, ownerId, createdAt, updatedAt}). A strict
// parse THROWS on any of those keys in the request, so they cannot smuggle in
// even if the TS type erased.
//
// alignmentScore is derived from alignmentAnalysis?.score on read; mock
// projects it into the response so Frontend's `application.alignmentScore`
// continues to work.
// ---------------------------------------------------------------------------

function projectScore(app: Application): Application {
  return {
    ...app,
    alignmentScore: app.alignmentAnalysis?.score,
  };
}

export async function getApplications(): Promise<ApplicationListResponse> {
  await delay(FAST);
  return { applications: mockState.applications.map(projectScore) };
}

function recordEvent(
  applicationId: string,
  event: Omit<ApplicationEventListResponse['events'][number], 'id' | 'applicationId' | 'at'>,
): void {
  const list = mockState.applicationEvents[applicationId] ?? [];
  list.unshift({
    id: newId('evt'),
    applicationId,
    at: nowIso(),
    ...event,
  });
  mockState.applicationEvents[applicationId] = list;
}

export async function postApplication(
  req: ApplicationCreate,
): Promise<{ application: Application }> {
  const validated = ApplicationCreateSchema.parse(req);
  await delay(FAST);
  const application: Application = {
    id: newId('app'),
    ownerId: 'mock_user',
    company: validated.company,
    role: validated.role,
    url: validated.url,
    source: validated.source,
    location: validated.location,
    remote: validated.remote ?? false,
    salaryRange: validated.salaryRange,
    jobDescription: validated.jobDescription,
    status: validated.status,
    appliedDate: validated.appliedDate,
    followUpDate: validated.followUpDate,
    notes: validated.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  mockState.applications.unshift(application);
  recordEvent(application.id, { kind: 'created' });
  return { application: projectScore(application) };
}

export async function patchApplication(
  id: string,
  patch: ApplicationUpdate,
): Promise<{ application: Application }> {
  const validated = ApplicationUpdateSchema.parse(patch);
  await delay(FAST);
  const idx = mockState.applications.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error(`Application not found: ${id}`);
  const previous = mockState.applications[idx];
  const merged: Application = {
    ...previous,
    ...validated,
    updatedAt: nowIso(),
  };
  mockState.applications[idx] = merged;
  // WHY: backend writes events on transitions; the mock mirrors that so the
  // Tracker detail timeline shows the same events the real backend will.
  if (validated.status && validated.status !== previous.status) {
    recordEvent(id, {
      kind: 'status_change',
      fromStatus: previous.status,
      toStatus: validated.status,
    });
  }
  if (validated.notes && validated.notes !== previous.notes) {
    recordEvent(id, { kind: 'note', note: validated.notes.slice(0, 120) });
  }
  return { application: projectScore(merged) };
}

export async function deleteApplication(id: string): Promise<{ ok: true }> {
  await delay(FAST);
  mockState.applications = mockState.applications.filter((a) => a.id !== id);
  return { ok: true };
}

export async function getApplicationEvents(id: string): Promise<ApplicationEventListResponse> {
  await delay(FAST);
  // Backend Core writes events on status transitions; the mock keeps a
  // per-application transcript in mockState.applicationEvents (initialized
  // lazily) so the Tracker detail timeline can render across the same
  // session.
  const list = (mockState.applicationEvents ?? {})[id] ?? [];
  return { events: list };
}

// Mirrors POST /api/applications/:id/alignment on main. Recomputes the
// AlignmentAnalysis from the row's jobDescription and persists the snapshot.
export async function postApplicationAlignment(
  id: string,
): Promise<ApplicationAlignmentResponse> {
  await delay(MED);
  const idx = mockState.applications.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error(`Application not found: ${id}`);
  const row = mockState.applications[idx];
  const analysis = await postAlignment({ jobDescription: row.jobDescription ?? '' });
  const merged: Application = {
    ...row,
    alignmentAnalysis: analysis,
    updatedAt: nowIso(),
  };
  mockState.applications[idx] = merged;
  return { application: projectScore(merged) };
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getDocuments(): Promise<DocumentListResponse> {
  await delay(FAST);
  return { documents: mockState.documents };
}

export async function deleteDocument(id: string): Promise<{ ok: true }> {
  await delay(FAST);
  mockState.documents = mockState.documents.filter((d) => d.id !== id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Watchlist + Discovery
// ---------------------------------------------------------------------------

export async function getWatchlist(): Promise<WatchlistListResponse> {
  await delay(FAST);
  return { companies: mockState.watchlist };
}

export async function postWatchlistAdd(
  req: WatchlistAddRequest,
): Promise<WatchlistAddResponse> {
  // Schema validation enforces the slug regex; if a Frontend Storybook
  // story bypasses validation and submits a malformed slug, fall through
  // to a {valid:false} response so the unhappy-path UI is exercised.
  const parsed = WatchlistAddSchema.safeParse(req);
  await delay(FAST);
  if (!parsed.success) {
    return {
      company: {
        id: newId('w'),
        ownerId: 'mock_user',
        company: req.company || '',
        atsProvider: req.atsProvider,
        atsSlug: req.atsSlug || '',
        active: false,
        createdAt: nowIso(),
      },
      validation: { valid: false, error: parsed.error.issues[0]?.message ?? 'invalid input' },
    };
  }
  const company = {
    id: newId('w'),
    ownerId: 'mock_user',
    company: parsed.data.company,
    atsProvider: parsed.data.atsProvider,
    atsSlug: parsed.data.atsSlug,
    active: true,
    createdAt: nowIso(),
  };
  mockState.watchlist.push(company);
  return { company, validation: { valid: true } };
}

export async function deleteWatchlistCompany(id: string): Promise<{ ok: true }> {
  await delay(FAST);
  mockState.watchlist = mockState.watchlist.filter((w) => w.id !== id);
  return { ok: true };
}

export async function getDiscovery(): Promise<DiscoveryListResponse> {
  await delay(FAST);
  return { postings: mockState.discovery };
}

export async function postDiscoveryPoll(): Promise<DiscoveryPollResponse> {
  await delay(MED);
  return {
    newPostings: 0,
    totalPostings: mockState.discovery.length,
    polledAt: nowIso(),
  };
}

export async function patchDiscoveryStatus(
  id: string,
  req: DiscoveryUpdateRequest,
): Promise<{ ok: true }> {
  DiscoveryUpdateSchema.parse(req);
  await delay(FAST);
  const idx = mockState.discovery.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error(`Posting not found: ${id}`);
  const prev = mockState.discovery[idx];
  // Discriminated union narrowing: applicationId exists only on the
  // 'drafted' arm. Non-drafted transitions preserve any existing
  // applicationId on the row (do not clear) — useful if the user reverts
  // a 'drafted' posting to 'viewed' for further editing.
  mockState.discovery[idx] = req.status === 'drafted'
    ? { ...prev, status: req.status, applicationId: req.applicationId }
    : { ...prev, status: req.status };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Private renderers — straight from the prototype's mock document generators
// ---------------------------------------------------------------------------

function emptySkillsDB(): SkillsDB {
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
