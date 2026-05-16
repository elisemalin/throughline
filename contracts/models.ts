// contracts/models.ts
//
// Domain types, enums, and Zod schemas. Mirrored to /prisma/schema.prisma by
// the Foundation Agent on Day 1; this file is the source of truth.
//
// Shapes lifted directly from /prototype/Throughline.jsx (seed data and form
// state) so the prototype and contracts stay aligned.
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
//
// optionalString normalizes prototype-form '' to undefined so DB and read
// code can rely on a single truthiness check across every optional field.
// ---------------------------------------------------------------------------

// stripEmpty is exported so any future preprocess-on-empty consumer can
// reuse the canonical primitive rather than redeclaring '' -> undefined.
export const stripEmpty = (v: unknown): unknown =>
  v === '' || v == null ? undefined : v;

// optionalString carries a default upper bound (500 chars) so a 10MB
// "location" or "source" payload cannot pass validation via the shared
// primitive. Call sites that need a tighter or wider bound use
// boundedOptionalString below.
export const optionalString = z.preprocess(
  stripEmpty,
  z.string().max(500).optional(),
);

export const boundedOptionalString = (max: number) =>
  z.preprocess(stripEmpty, z.string().max(max).optional());

export const optionalUrl = z.preprocess(
  stripEmpty,
  z.string().url().max(2_000).optional(),
);

export const optionalEmail = z.preprocess(
  stripEmpty,
  z.string().email().max(320).optional(),     // RFC 5321 max email length
);

// ATS slugs come from user input and are interpolated into provider URLs.
// Restrict to alphanumeric / dash / underscore so the URL is always safe
// regardless of encoding.
export const atsSlugSchema = z
  .string()
  .regex(/^[a-zA-Z0-9_-]{1,100}$/, 'ATS slug must be alphanumeric/_/-');

const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'ISO date');

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
// Jobs and Projects are nested rather than relational because they are
// always read together and never queried independently. ID-format and
// CARDINALITY are both bounded so a malicious SkillsUpdate payload cannot
// inject arbitrary nested rows or overflow the JSON column.
// ---------------------------------------------------------------------------

export const ContactSchema = z
  .object({
    email: optionalEmail,
    phone: optionalString,
    location: optionalString,
    linkedin: optionalString,
    site: optionalString,
  })
  .strict();
export type Contact = z.infer<typeof ContactSchema>;

export const ProjectSchema = z
  .object({
    id: z.string().regex(/^P\d{1,4}$/, 'project id must match P\\d{1,4}'),
    name: z.string().min(1).max(200),
    problem: z.string().max(2_000),
    actions: z.array(z.string().max(500)).max(20).default([]),
    result: z.string().max(2_000),
    metrics: z
      .record(z.string().max(100), z.string().max(200))
      .refine((m) => Object.keys(m).length <= 20, 'metrics: max 20 entries')
      .default({}),
    scope: z.string().max(500).default(''),
    skills: z.array(z.string().max(100)).max(50).default([]),
    tools: z.array(z.string().max(100)).max(50).default([]),
    methods: z.array(z.string().max(100)).max(50).default([]),
    domain: z.string().max(100).default(''),
    keywords: z.array(z.string().max(100)).max(50).default([]),
    recency: z.number().int().min(1).max(5).default(3),
    relevance: z.array(z.string().max(100)).max(50).default([]),
    confidence: z.number().min(0).max(1).default(0.5),
  })
  .strict();
export type Project = z.infer<typeof ProjectSchema>;

export const JobSchema = z
  .object({
    id: z.string().regex(/^J\d{1,4}$/, 'job id must match J\\d{1,4}'),
    employer: z.string().min(1).max(200),
    title: z.string().min(1).max(200),
    startDate: isoMonthString,
    endDate: z.preprocess(
      stripEmpty,
      z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM').optional(),
    ),
    location: z.string().max(200).default(''),
    industry: z.string().max(200).default(''),
    summary: z.string().max(2_000).default(''),
    projects: z.array(ProjectSchema).max(50).default([]),
  })
  .strict();
export type Job = z.infer<typeof JobSchema>;

export const SkillsDBSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    fullName: z.string().max(200).default(''),
    headline: z.string().max(300).default(''),
    positioning: z.string().max(1_000).default(''),
    contact: ContactSchema,
    targetRoles: z.array(z.string().max(200)).max(20).default([]),
    awards: z.array(z.string().max(500)).max(30).default([]),
    jobs: z.array(JobSchema).max(20).default([]),
    coreSkills: z.array(z.string().max(100)).max(200).default([]),
    tools: z.array(z.string().max(100)).max(200).default([]),
    methods: z.array(z.string().max(100)).max(200).default([]),
    domains: z.array(z.string().max(100)).max(200).default([]),
    keywords: z.array(z.string().max(100)).max(200).default([]),
    updatedAt: z.string(),
  })
  .strict();
export type SkillsDB = z.infer<typeof SkillsDBSchema>;

// Story is derived from SkillsDB at read time. Not persisted.
export const StorySchema = z
  .object({
    id: z.string(),
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
// ---------------------------------------------------------------------------

export const AlignmentRequirementSchema = z
  .object({
    requirement: z.string().max(200),
    strength: z.number().min(0).max(10),
    type: z.enum(['strong', 'partial', 'missing']),
    evidence: z.string().max(500),
    recommendation: z.string().max(500),
  })
  .strict();
export type AlignmentRequirement = z.infer<typeof AlignmentRequirementSchema>;

export const AlignmentAnalysisSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    requirements: z.array(AlignmentRequirementSchema).max(30).default([]),
    missingKeywords: z.array(z.string().max(100)).max(20).default([]),
    recommendation: z.string().max(1_000),
  })
  .strict();
export type AlignmentAnalysis = z.infer<typeof AlignmentAnalysisSchema>;

// ---------------------------------------------------------------------------
// Application + ApplicationEvent
//
// jobDescription and notes are bounded so a write via /api/applications
// cannot bypass the /api/alignment 50KB cap. Same bound on both surfaces.
//
// alignmentAnalysis is the persisted snapshot. alignmentScore is a derived
// read-side field (number) populated from alignmentAnalysis?.score on read.
// Backend Core projects it into list responses so the Frontend's prototype
// pattern (`application.alignmentScore`) continues to work.
// ---------------------------------------------------------------------------

export const ApplicationSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    company: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    url: optionalUrl,
    source: optionalString,
    location: optionalString,
    remote: z.boolean().default(false),
    salaryRange: optionalString,
    jobDescription: boundedOptionalString(50_000),
    status: ApplicationStatusSchema,
    appliedDate: boundedOptionalString(50),     // ISO date string
    followUpDate: boundedOptionalString(50),
    notes: boundedOptionalString(10_000),
    alignmentAnalysis: AlignmentAnalysisSchema.optional(),
    // alignmentScore: derived from alignmentAnalysis?.score. Server projects
    // it into list responses; Frontend reads it directly. Not persisted as a
    // separate column.
    alignmentScore: z.number().int().min(0).max(100).optional(),
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
    documentId: optionalString,
  })
  .strict();
export type ApplicationEvent = z.infer<typeof ApplicationEventSchema>;

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export const DocumentSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    kind: DocumentKindSchema,
    title: z.string().max(500),
    body: z.string().max(100_000),
    applicationId: optionalString,
    createdAt: z.string(),
  })
  .strict();
export type Document = z.infer<typeof DocumentSchema>;

// ---------------------------------------------------------------------------
// WatchlistCompany + DiscoveredPosting
//
// applicationId on DiscoveredPosting is set when the user drafts an
// application from a discovered posting (status: 'drafted'). The
// invariant ("applicationId iff status='drafted'") is enforced at
// request-parse time by DiscoveryUpdateSchema in /contracts/api.ts (a
// discriminated union). It is NOT a DB-level constraint — Foundation
// Agent does not need a CHECK clause when mirroring this to Prisma.
// ---------------------------------------------------------------------------

export const WatchlistCompanySchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    company: z.string().min(1).max(200),
    atsProvider: AtsProviderSchema,
    atsSlug: atsSlugSchema,
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
    externalId: z.string().min(1).max(200),         // provider's posting ID (dedup key)
    company: z.string().max(200),
    atsProvider: AtsProviderSchema,
    role: z.string().max(200),
    location: z.string().max(200).default(''),
    remote: z.boolean(),
    postedAt: isoDateString,
    url: z.string().url(),
    salaryRange: optionalString,
    jobDescription: z.string().max(50_000).default(''),
    alignmentScore: z.number().int().min(0).max(100).optional(),
    status: DiscoveryStatusSchema,
    applicationId: optionalString,
    createdAt: z.string(),
  })
  .strict();
export type DiscoveredPosting = z.infer<typeof DiscoveredPostingSchema>;
