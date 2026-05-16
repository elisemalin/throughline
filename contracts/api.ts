// contracts/api.ts
//
// API endpoint contracts. Every key in API_ROUTES maps 1:1 to a handler
// under /app/api/*; Backend Core implements the handler, Frontend Agent
// imports the types via /lib/mock-api during the parallel sprint and via
// the real fetch layer after integration.
//
// Every request schema is exported as a Zod validator AND as a derived
// TypeScript type. Handlers use the validator at the boundary; callers use
// the type. Do not redefine these shapes elsewhere.

import { z } from 'zod';
import type {
  Application,
  ApplicationStatus,
  AtsProvider,
  DiscoveredPosting,
  DiscoveryStatus,
  Document,
  DocumentKind,
  SkillsDB,
  WatchlistCompany,
} from './models';
import {
  APPLICATION_STATUSES,
  ATS_PROVIDERS,
  DOCUMENT_KINDS,
  DISCOVERY_STATUSES,
} from './models';

// ---------------------------------------------------------------------------
// Route registry
// ---------------------------------------------------------------------------

export const API_ROUTES = {
  // AI generation
  alignment: '/api/alignment',
  resume: '/api/documents/resume',
  coverLetter: '/api/documents/cover-letter',
  ninetyDayPlan: '/api/documents/ninety-day-plan',
  dossier: '/api/documents/dossier',
  mockInterview: '/api/interviews/mock',
  skillsIngest: '/api/skills/ingest',

  // Application CRUD
  applicationList: '/api/applications',
  applicationCreate: '/api/applications',
  applicationUpdate: '/api/applications/:id',
  applicationDelete: '/api/applications/:id',

  // Document CRUD
  documentList: '/api/documents',
  documentDelete: '/api/documents/:id',

  // Skills
  skillsRead: '/api/skills',
  skillsUpdate: '/api/skills',

  // Watchlist + Discovery
  watchlistList: '/api/watchlist',
  watchlistAdd: '/api/watchlist',
  watchlistRemove: '/api/watchlist/:id',
  discoveryList: '/api/discovery',
  discoveryPoll: '/api/discovery/poll',
  discoveryUpdateStatus: '/api/discovery/:id',
} as const;

export type ApiRoute = keyof typeof API_ROUTES;

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

const ApplicationStatusEnum = z.enum(APPLICATION_STATUSES);
const DocumentKindEnum = z.enum(DOCUMENT_KINDS);
const AtsProviderEnum = z.enum(ATS_PROVIDERS);
const DiscoveryStatusEnum = z.enum(DISCOVERY_STATUSES);

// ---------------------------------------------------------------------------
// POST /api/alignment
// ---------------------------------------------------------------------------

export const AlignmentRequestSchema = z.object({
  jobDescription: z.string().min(1).max(50_000),
  // skillsDB is resolved server-side from the authenticated session;
  // the client does not send it.
});
export type AlignmentRequest = z.infer<typeof AlignmentRequestSchema>;

export const AlignmentResponseSchema = z.object({
  score: z.number().int().min(0).max(100),
  requirements: z.array(
    z.object({
      requirement: z.string(),
      strength: z.number().min(0).max(10),
      type: z.enum(['strong', 'partial', 'missing']),
      evidence: z.string(),
      recommendation: z.string(),
    }),
  ),
  missingKeywords: z.array(z.string()).max(20),
  recommendation: z.string(),
});
export type AlignmentResponse = z.infer<typeof AlignmentResponseSchema>;

// ---------------------------------------------------------------------------
// Document generation: shared response
// ---------------------------------------------------------------------------

export const DocumentResponseSchema = z.object({
  kind: DocumentKindEnum,
  title: z.string(),
  body: z.string(),                    // markdown
  createdAt: z.string(),               // ISO 8601
  applicationId: z.string().optional(),
});
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/resume
// ---------------------------------------------------------------------------

export const ResumeRequestSchema = z.object({
  applicationId: z.string().optional(),
});
export type ResumeRequest = z.infer<typeof ResumeRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/cover-letter
// ---------------------------------------------------------------------------

export const CoverLetterRequestSchema = z.object({
  applicationId: z.string(),           // cover letters require a target application
  customNotes: z.string().max(2_000).optional(),
});
export type CoverLetterRequest = z.infer<typeof CoverLetterRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/ninety-day-plan
// ---------------------------------------------------------------------------

export const NinetyDayRequestSchema = z.object({
  applicationId: z.string(),
});
export type NinetyDayRequest = z.infer<typeof NinetyDayRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/dossier
// ---------------------------------------------------------------------------

export const DossierRequestSchema = z.object({
  applicationId: z.string(),
});
export type DossierRequest = z.infer<typeof DossierRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/interviews/mock
//
// Multi-turn. Client sends the running chat history; server returns the next
// interviewer turn. No server-side session state — Frontend owns the
// transcript.
// ---------------------------------------------------------------------------

export const MockInterviewTurnSchema = z.object({
  role: z.enum(['interviewer', 'user']),
  text: z.string(),
});
export type MockInterviewTurn = z.infer<typeof MockInterviewTurnSchema>;

export const MockInterviewRequestSchema = z.object({
  applicationId: z.string(),
  transcript: z.array(MockInterviewTurnSchema).max(200),
});
export type MockInterviewRequest = z.infer<typeof MockInterviewRequestSchema>;

export const MockInterviewResponseSchema = z.object({
  next: MockInterviewTurnSchema,        // always role='interviewer'
});
export type MockInterviewResponse = z.infer<typeof MockInterviewResponseSchema>;

// ---------------------------------------------------------------------------
// POST /api/skills/ingest
// ---------------------------------------------------------------------------

export const SkillsIngestRequestSchema = z.object({
  resumeText: z.string().min(50).max(50_000),
  linkedinText: z.string().max(50_000).optional(),
});
export type SkillsIngestRequest = z.infer<typeof SkillsIngestRequestSchema>;

// Response references the SkillsDB type from models.ts; the AI workflow
// returns a Zod-validated SkillsDB shape (see /contracts/ai.ts).
export type SkillsIngestResponse = {
  skillsDB: SkillsDB;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Application CRUD
// ---------------------------------------------------------------------------

export const ApplicationCreateSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  url: z.string().url().optional(),
  source: z.string().optional(),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  salaryRange: z.string().optional(),
  jobDescription: z.string().max(50_000).optional(),
  status: ApplicationStatusEnum.default('researching'),
  appliedDate: z.string().optional(),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
  alignmentScore: z.number().int().min(0).max(100).optional(),
});
export type ApplicationCreate = z.infer<typeof ApplicationCreateSchema>;

export const ApplicationUpdateSchema = ApplicationCreateSchema.partial();
export type ApplicationUpdate = z.infer<typeof ApplicationUpdateSchema>;

export type ApplicationListResponse = { applications: Application[] };

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

export type DocumentListResponse = { documents: Document[] };

// ---------------------------------------------------------------------------
// Skills read/update
// ---------------------------------------------------------------------------

export type SkillsReadResponse = { skillsDB: SkillsDB | null };

// SkillsUpdateSchema validates a partial SkillsDB. Excludes id/ownerId/updatedAt
// which the server sets. Kept lenient (passthrough) for nested job/project
// edits; tightening this is a contract proposal.
export const SkillsUpdateSchema = z
  .object({
    fullName: z.string().optional(),
    headline: z.string().optional(),
    positioning: z.string().optional(),
    contact: z.record(z.string()).optional(),
    targetRoles: z.array(z.string()).optional(),
    awards: z.array(z.string()).optional(),
    jobs: z.array(z.record(z.unknown())).optional(),
    coreSkills: z.array(z.string()).optional(),
    tools: z.array(z.string()).optional(),
    methods: z.array(z.string()).optional(),
    domains: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  })
  .passthrough();
export type SkillsUpdate = z.infer<typeof SkillsUpdateSchema>;

// ---------------------------------------------------------------------------
// Watchlist + Discovery
// ---------------------------------------------------------------------------

export const WatchlistAddSchema = z.object({
  company: z.string().min(1),
  atsProvider: AtsProviderEnum,
  atsSlug: z.string().min(1),
});
export type WatchlistAddRequest = z.infer<typeof WatchlistAddSchema>;

export type WatchlistAddResponse = {
  company: WatchlistCompany;
  validation: { valid: boolean; error?: string };
};

export type WatchlistListResponse = { companies: WatchlistCompany[] };

export type DiscoveryListResponse = { postings: DiscoveredPosting[] };

export type DiscoveryPollResponse = {
  newPostings: number;
  totalPostings: number;
  polledAt: string;
};

export const DiscoveryUpdateStatusSchema = z.object({
  status: DiscoveryStatusEnum,
});
export type DiscoveryUpdateStatusRequest = z.infer<typeof DiscoveryUpdateStatusSchema>;
