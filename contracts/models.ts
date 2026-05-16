// contracts/models.ts
//
// Domain types, enums, and Zod schemas. Mirrored to /prisma/schema.prisma by
// the Foundation Agent on Day 1; this file is the source of truth.
//
// Shapes lifted directly from /prototype/Throughline.jsx (seed data and form
// state) so the prototype and contracts stay aligned. Field names match the
// prototype field-for-field unless a deviation is documented in
// /contracts/proposals/.
//
// IMPORTANT: no agent except the Architect edits this file. Changes go through
// /contracts/proposals/<date>-<role>-<slug>.md.

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const APPLICATION_STATUSES = [
  'researching',
  'applied',
  'screen',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const DOCUMENT_KINDS = [
  'resume',
  'cover_letter',
  'ninety_day',
  'dossier',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export const DocumentKindSchema = z.enum(DOCUMENT_KINDS);

export const ATS_PROVIDERS = ['greenhouse', 'lever', 'ashby', 'workday'] as const;
export type AtsProvider = (typeof ATS_PROVIDERS)[number];
export const AtsProviderSchema = z.enum(ATS_PROVIDERS);

export const DISCOVERY_STATUSES = ['new', 'viewed', 'drafted', 'dismissed'] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];
export const DiscoveryStatusSchema = z.enum(DISCOVERY_STATUSES);

export const APPLICATION_EVENT_KINDS = [
  'created',
  'status_change',
  'note',
  'document_generated',
  'follow_up',
] as const;
export type ApplicationEventKind = (typeof APPLICATION_EVENT_KINDS)[number];
export const ApplicationEventKindSchema = z.enum(APPLICATION_EVENT_KINDS);

// ---------------------------------------------------------------------------
// Shared validators
// ---------------------------------------------------------------------------

// The prototype emits '' for many optional fields when the user skips them.
// `optionalString` accepts string-or-undefined-or-empty and normalizes to
// undefined so DB and read code can rely on a single truthiness check.
const optionalString = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().optional(),
);

const optionalUrl = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.string().url().optional(),
);

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'ISO date');
const isoMonthString = z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM');

// ---------------------------------------------------------------------------
// User
// Clerk owns identity; we shadow the Clerk user with a local row keyed by
// Clerk's user ID so we can attach owned rows via foreign key.
// ---------------------------------------------------------------------------

export const UserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export type User = z.infer<typeof UserSchema>;

// ---------------------------------------------------------------------------
// SkillsDB and its nested shapes
//
// The SkillsDB is the structured representation of the user's resume +
// LinkedIn export, parsed once on intake and edited from the Skills view.
//
// Jobs and Projects are nested rather than relational because they are
// always read together and never queried independently — Foundation Agent
// translates SkillsDB to a Prisma row with a JSON column for `jobs`.
//
// Project IDs follow `P\d+` within a Job. Job IDs follow `J\d+` within a
// SkillsDB. Enforced by Zod so a malicious update payload cannot inject
// arbitrary nested rows that overflow the JSON column.
// ---------------------------------------------------------------------------

export const ContactSchema = z
  .object({
    email: z.string().email().or(z.literal('')),
    phone: z.string().default(''),
    location: z.string().default(''),
    linkedin: z.string().default(''),
    site: z.string().default(''),
  })
  .strict();
export type Contact = z.infer<typeof ContactSchema>;

export const ProjectSchema = z
  .object({
    id: z.string().regex(/^P\d+$/, 'project id must match P\\d+'),
    name: z.string().min(1),
    problem: z.string(),
    actions: z.array(z.string()).default([]),
    result: z.string(),
    metrics: z.record(z.string()).default({}),     // freeform key/value
    scope: z.string().default(''),
    skills: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    methods: z.array(z.string()).default([]),
    domain: z.string().default(''),
    keywords: z.array(z.string()).default([]),
    recency: z.number().int().min(1).max(5),
    relevance: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(1),
  })
  .strict();
export type Project = z.infer<typeof ProjectSchema>;

export const JobSchema = z
  .object({
    id: z.string().regex(/^J\d+$/, 'job id must match J\\d+'),
    employer: z.string().min(1),
    title: z.string().min(1),
    startDate: isoMonthString,
    endDate: z.string().regex(/^(\d{4}-\d{2})?$/, 'YYYY-MM or empty').default(''),
    location: z.string().default(''),
    industry: z.string().default(''),
    summary: z.string().default(''),
    projects: z.array(ProjectSchema).default([]),
  })
  .strict();
export type Job = z.infer<typeof JobSchema>;

export const SkillsDBSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),                            // User.id
    fullName: z.string().default(''),
    headline: z.string().default(''),
    positioning: z.string().default(''),
    contact: ContactSchema,
    targetRoles: z.array(z.string()).default([]),
    awards: z.array(z.string()).default([]),
    jobs: z.array(JobSchema).default([]),
    coreSkills: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
    methods: z.array(z.string()).default([]),
    domains: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    updatedAt: z.string(),
  })
  .strict();
export type SkillsDB = z.infer<typeof SkillsDBSchema>;

// Story is derived from SkillsDB at read time. Not persisted.
export const StorySchema = z
  .object({
    id: z.string(),                                 // <jobId>-<projectId>
    title: z.string(),
    employer: z.string(),
    situation: z.string(),
    task: z.string(),
    action: z.string(),
    result: z.string(),
    tags: z.array(z.string()),
    skills: z.array(z.string()),
  })
  .strict();
export type Story = z.infer<typeof StorySchema>;

// ---------------------------------------------------------------------------
// Alignment analysis — single source of truth
//
// Lives here because it is BOTH the persisted snapshot on Application AND the
// API response shape for /api/alignment. Defining it once prevents drift.
// The handoff §4.2 example shape is preserved field-for-field; the API
// response type in /contracts/api.ts re-exports the inferred type.
// ---------------------------------------------------------------------------

export const AlignmentRequirementSchema = z
  .object({
    requirement: z.string(),
    strength: z.number().min(0).max(10),
    type: z.enum(['strong', 'partial', 'missing']),
    evidence: z.string(),
    recommendation: z.string(),
  })
  .strict();
export type AlignmentRequirement = z.infer<typeof AlignmentRequirementSchema>;

export const AlignmentAnalysisSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    requirements: z.array(AlignmentRequirementSchema).max(30).default([]),
    missingKeywords: z.array(z.string()).max(20).default([]),
    recommendation: z.string(),
  })
  .strict();
export type AlignmentAnalysis = z.infer<typeof AlignmentAnalysisSchema>;

// ---------------------------------------------------------------------------
// Application + ApplicationEvent
//
// One row per job a user is tracking. Status transitions go through
// ApplicationEvent for audit; the current state lives on Application itself.
//
// `alignmentScore` is derived from `alignmentAnalysis?.score` at read time
// for display; it is NOT a separately persisted column. Backend Core
// computes and reads it as a getter (or a Prisma client extension).
// ---------------------------------------------------------------------------

export const ApplicationSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    company: z.string().min(1),
    role: z.string().min(1),
    url: optionalUrl,
    source: optionalString,                         // 'linkedin', 'referral', etc.
    location: optionalString,
    remote: z.boolean().default(false),
    salaryRange: optionalString,
    jobDescription: optionalString,
    status: ApplicationStatusSchema,
    appliedDate: optionalString,                    // ISO date if present
    followUpDate: optionalString,
    notes: optionalString,
    alignmentAnalysis: AlignmentAnalysisSchema.optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export type Application = z.infer<typeof ApplicationSchema>;

export const ApplicationEventSchema = z
  .object({
    id: z.string(),
    applicationId: z.string(),
    kind: ApplicationEventKindSchema,
    at: z.string(),
    note: optionalString,
    fromStatus: ApplicationStatusSchema.optional(),
    toStatus: ApplicationStatusSchema.optional(),
    documentId: optionalString,                     // for kind='document_generated'
  })
  .strict();
export type ApplicationEvent = z.infer<typeof ApplicationEventSchema>;

// ---------------------------------------------------------------------------
// Document
//
// Generated artifacts (resume, cover letter, 90-day plan, dossier) keyed
// optionally to an Application. Body is markdown.
// ---------------------------------------------------------------------------

export const DocumentSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    kind: DocumentKindSchema,
    title: z.string(),
    body: z.string(),                               // markdown
    applicationId: optionalString,                  // undefined for general/un-targeted
    createdAt: z.string(),
  })
  .strict();
export type Document = z.infer<typeof DocumentSchema>;

// ---------------------------------------------------------------------------
// WatchlistCompany + DiscoveredPosting
//
// Discovery loop. WatchlistCompany rows drive the daily Inngest poller;
// DiscoveredPosting rows are what the poller produces.
//
// applicationId on DiscoveredPosting is set when the user drafts an
// application from a discovered posting (status: 'drafted'). Lets the
// Discovery view deep-link to the resulting Application row.
// ---------------------------------------------------------------------------

export const WatchlistCompanySchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    company: z.string().min(1),
    atsProvider: AtsProviderSchema,
    atsSlug: z.string().min(1),
    active: z.boolean(),
    lastPolled: optionalString,
    createdAt: z.string(),
  })
  .strict();
export type WatchlistCompany = z.infer<typeof WatchlistCompanySchema>;

export const DiscoveredPostingSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    watchlistCompanyId: z.string(),
    externalId: z.string(),                         // provider's posting ID (dedup key)
    company: z.string(),
    atsProvider: AtsProviderSchema,
    role: z.string(),
    location: z.string().default(''),
    remote: z.boolean(),
    postedAt: isoDateString,
    url: z.string().url(),
    salaryRange: optionalString,
    jobDescription: z.string().default(''),
    alignmentScore: z.number().int().min(0).max(100).optional(),
    status: DiscoveryStatusSchema,
    applicationId: optionalString,                  // set when drafted into an Application
    createdAt: z.string(),
  })
  .strict();
export type DiscoveredPosting = z.infer<typeof DiscoveredPostingSchema>;
