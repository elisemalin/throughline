// contracts/api.ts
//
// API endpoint contracts. Every entry in API_ROUTES maps 1:1 to a handler
// under /app/api/*; Backend Core implements the handler, Frontend Agent
// imports the types via /lib/mock-api during the parallel sprint and via
// the real fetch layer after integration.
//
// Routes carry an explicit HTTP method so collection endpoints can share a
// path (e.g. GET /api/applications + POST /api/applications) without
// collapsing in a path-keyed record.
//
// Every request body is exported as a Zod validator AND a derived TS type.
// Handlers use the validator at the boundary; callers use the type. Do not
// redefine these shapes elsewhere.

import { z } from 'zod';
import {
  AlignmentAnalysisSchema,
  AlignmentAnalysis,
  ApplicationSchema,
  ApplicationStatusSchema,
  ApplicationEventSchema,
  ATS_PROVIDERS,
  AtsProviderSchema,
  ContactSchema,
  DiscoveryStatusSchema,
  DocumentKindSchema,
  DocumentSchema,
  JobSchema,
  ProjectSchema,
  SkillsDBSchema,
  WatchlistCompanySchema,
  DiscoveredPostingSchema,
} from './models';
import type {
  Application,
  ApplicationEvent,
  AtsProvider,
  DiscoveredPosting,
  Document,
  SkillsDB,
  WatchlistCompany,
} from './models';

// ---------------------------------------------------------------------------
// Route registry
//
// Shape: { method, path }. Backend Core mounts handlers off this registry.
// Frontend uses the path for fetch construction post-integration; pre-
// integration, callers reference the type-bound mock-api function instead.
// ---------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export type RouteDef = { method: HttpMethod; path: string };

export const API_ROUTES = {
  // AI generation
  alignment:            { method: 'POST',   path: '/api/alignment' },
  resume:               { method: 'POST',   path: '/api/documents/resume' },
  coverLetter:          { method: 'POST',   path: '/api/documents/cover-letter' },
  ninetyDayPlan:        { method: 'POST',   path: '/api/documents/ninety-day-plan' },
  dossier:              { method: 'POST',   path: '/api/documents/dossier' },
  mockInterview:        { method: 'POST',   path: '/api/interviews/mock' },
  skillsIngest:         { method: 'POST',   path: '/api/skills/ingest' },

  // Application CRUD
  applicationList:      { method: 'GET',    path: '/api/applications' },
  applicationCreate:    { method: 'POST',   path: '/api/applications' },
  applicationUpdate:    { method: 'PATCH',  path: '/api/applications/:id' },
  applicationDelete:    { method: 'DELETE', path: '/api/applications/:id' },
  applicationEventList: { method: 'GET',    path: '/api/applications/:id/events' },

  // Document CRUD
  documentList:         { method: 'GET',    path: '/api/documents' },
  documentDelete:       { method: 'DELETE', path: '/api/documents/:id' },

  // Skills
  skillsRead:           { method: 'GET',    path: '/api/skills' },
  skillsUpdate:         { method: 'PATCH',  path: '/api/skills' },

  // Watchlist + Discovery
  watchlistList:        { method: 'GET',    path: '/api/watchlist' },
  watchlistAdd:         { method: 'POST',   path: '/api/watchlist' },
  watchlistRemove:      { method: 'DELETE', path: '/api/watchlist/:id' },
  discoveryList:        { method: 'GET',    path: '/api/discovery' },
  discoveryPoll:        { method: 'POST',   path: '/api/discovery/poll' },
  discoveryUpdate:      { method: 'PATCH',  path: '/api/discovery/:id' },
} as const satisfies Record<string, RouteDef>;

export type ApiRoute = keyof typeof API_ROUTES;

// ---------------------------------------------------------------------------
// POST /api/alignment
// ---------------------------------------------------------------------------

export const AlignmentRequestSchema = z
  .object({
    jobDescription: z.string().min(1).max(50_000),
    // skillsDB is resolved server-side from the authenticated session; the
    // client does not send it. Mock implementations resolve it from a shared
    // fixture so the call signature is identical to the live route.
  })
  .strict();
export type AlignmentRequest = z.infer<typeof AlignmentRequestSchema>;

// AlignmentResponse is the same shape as the persisted AlignmentAnalysis.
// Single source of truth: models.ts.
export const AlignmentResponseSchema = AlignmentAnalysisSchema;
export type AlignmentResponse = AlignmentAnalysis;

// ---------------------------------------------------------------------------
// Document generation: shared response
// ---------------------------------------------------------------------------

export const DocumentResponseSchema = z
  .object({
    kind: DocumentKindSchema,
    title: z.string(),
    body: z.string(),
    createdAt: z.string(),
    applicationId: z.string().optional(),
  })
  .strict();
export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/resume
// ---------------------------------------------------------------------------

export const ResumeRequestSchema = z
  .object({
    applicationId: z.string().optional(),
  })
  .strict();
export type ResumeRequest = z.infer<typeof ResumeRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/cover-letter
// ---------------------------------------------------------------------------

export const CoverLetterRequestSchema = z
  .object({
    applicationId: z.string(),
    customNotes: z.string().max(2_000).optional(),
  })
  .strict();
export type CoverLetterRequest = z.infer<typeof CoverLetterRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/ninety-day-plan
// ---------------------------------------------------------------------------

export const NinetyDayRequestSchema = z
  .object({
    applicationId: z.string(),
  })
  .strict();
export type NinetyDayRequest = z.infer<typeof NinetyDayRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/documents/dossier
// ---------------------------------------------------------------------------

export const DossierRequestSchema = z
  .object({
    applicationId: z.string(),
  })
  .strict();
export type DossierRequest = z.infer<typeof DossierRequestSchema>;

// ---------------------------------------------------------------------------
// POST /api/interviews/mock
//
// Multi-turn. Client sends the running chat history; server returns the next
// interviewer turn. An empty transcript is the start-of-interview signal —
// server returns an opening question. After ~10 turns the server may set
// `done: true` to signal wrap-up.
// ---------------------------------------------------------------------------

export const MockInterviewTurnSchema = z
  .object({
    role: z.enum(['interviewer', 'user']),
    text: z.string(),
  })
  .strict();
export type MockInterviewTurn = z.infer<typeof MockInterviewTurnSchema>;

export const MockInterviewRequestSchema = z
  .object({
    applicationId: z.string(),
    transcript: z.array(MockInterviewTurnSchema).max(200),
  })
  .strict();
export type MockInterviewRequest = z.infer<typeof MockInterviewRequestSchema>;

export const MockInterviewResponseSchema = z
  .object({
    next: z
      .object({
        role: z.literal('interviewer'),
        text: z.string().min(1).max(2_000),
      })
      .strict(),
    done: z.boolean().default(false),
  })
  .strict();
export type MockInterviewResponse = z.infer<typeof MockInterviewResponseSchema>;

// ---------------------------------------------------------------------------
// POST /api/skills/ingest
//
// Resume / LinkedIn text is untrusted user input. AI Integration wraps it in
// <UNTRUSTED_INPUT> tags before sending to Claude (see /contracts/ai.ts
// INGEST_SYSTEM). The schema here only enforces length bounds.
// ---------------------------------------------------------------------------

export const SkillsIngestRequestSchema = z
  .object({
    resumeText: z.string().min(1).max(50_000),
    linkedinText: z.string().max(50_000).optional(),
  })
  .strict();
export type SkillsIngestRequest = z.infer<typeof SkillsIngestRequestSchema>;

export type SkillsIngestResponse = {
  skillsDB: SkillsDB;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Application CRUD
// ---------------------------------------------------------------------------

// ApplicationCreate is the persisted Application minus server-set fields.
// `.strict()` rejects unknown keys so a malicious client cannot inject
// ownerId/id at create time.
export const ApplicationCreateSchema = ApplicationSchema.omit({
  id: true,
  ownerId: true,
  alignmentAnalysis: true,
  createdAt: true,
  updatedAt: true,
})
  .extend({
    // alignmentAnalysis can be supplied at create time if the client ran
    // /api/alignment first and wants to snapshot it onto the row.
    alignmentAnalysis: AlignmentAnalysisSchema.optional(),
  })
  .strict();
export type ApplicationCreate = z.infer<typeof ApplicationCreateSchema>;

export const ApplicationUpdateSchema = ApplicationCreateSchema.partial().strict();
export type ApplicationUpdate = z.infer<typeof ApplicationUpdateSchema>;

export type ApplicationListResponse = { applications: Application[] };

export type ApplicationEventListResponse = { events: ApplicationEvent[] };

// ---------------------------------------------------------------------------
// Document CRUD
// ---------------------------------------------------------------------------

export type DocumentListResponse = { documents: Document[] };

// ---------------------------------------------------------------------------
// Skills read/update
//
// SkillsUpdate accepts a partial SkillsDB, validated nested. The nested
// schemas in models.ts are `.strict()` so a client cannot smuggle extra
// fields into the JSON column.
// ---------------------------------------------------------------------------

export type SkillsReadResponse = { skillsDB: SkillsDB | null };

export const SkillsUpdateSchema = SkillsDBSchema.omit({
  id: true,
  ownerId: true,
  updatedAt: true,
}).partial().strict();
export type SkillsUpdate = z.infer<typeof SkillsUpdateSchema>;

// ---------------------------------------------------------------------------
// Watchlist + Discovery
// ---------------------------------------------------------------------------

export const WatchlistAddSchema = z
  .object({
    company: z.string().min(1),
    atsProvider: AtsProviderSchema,
    atsSlug: z.string().min(1),
  })
  .strict();
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

// Discovery transitions can attach the resulting applicationId when status
// becomes 'drafted' so the Discovery view can deep-link to the Application.
export const DiscoveryUpdateSchema = z
  .object({
    status: DiscoveryStatusSchema,
    applicationId: z.string().optional(),
  })
  .strict();
export type DiscoveryUpdateRequest = z.infer<typeof DiscoveryUpdateSchema>;

// ---------------------------------------------------------------------------
// Re-export the nested schemas so consumers can validate sub-payloads
// without reaching into models.ts.
// ---------------------------------------------------------------------------

export {
  ContactSchema,
  ProjectSchema,
  JobSchema,
  AlignmentAnalysisSchema,
};
