// contracts/models.ts
//
// Domain types and enums. Mirrored to /prisma/schema.prisma by the Foundation
// Agent on Day 1; this file is the source of truth.
//
// Shapes lifted directly from /prototype/Throughline.jsx (seed data and form
// state) so the prototype and contracts stay aligned. Field names match the
// prototype field-for-field unless a deviation is documented in
// /contracts/proposals/.
//
// IMPORTANT: no agent except the Architect edits this file. Changes go through
// /contracts/proposals/<date>-<role>-<slug>.md.

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

export const DOCUMENT_KINDS = [
  'resume',
  'cover_letter',
  'ninety_day',
  'dossier',
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const ATS_PROVIDERS = ['greenhouse', 'lever', 'ashby', 'workday'] as const;
export type AtsProvider = (typeof ATS_PROVIDERS)[number];

export const DISCOVERY_STATUSES = ['new', 'viewed', 'drafted', 'dismissed'] as const;
export type DiscoveryStatus = (typeof DISCOVERY_STATUSES)[number];

export const APPLICATION_EVENT_KINDS = [
  'created',
  'status_change',
  'note',
  'document_generated',
  'follow_up',
] as const;
export type ApplicationEventKind = (typeof APPLICATION_EVENT_KINDS)[number];

// ---------------------------------------------------------------------------
// User
// Clerk owns identity; we shadow the Clerk user with a local row keyed by
// Clerk's user ID so we can attach owned rows via foreign key.
// ---------------------------------------------------------------------------

export type User = {
  id: string;            // Clerk user ID
  email: string;
  createdAt: string;     // ISO 8601
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// SkillsDB and its nested shapes
//
// The SkillsDB is the structured representation of the user's resume +
// LinkedIn export, parsed once on intake and edited from the Skills view.
// It is the source pulled by every AI workflow (alignment, resume, cover
// letter, ninety-day, dossier prompt context).
//
// Stored as JSON columns on a single SkillsDB row per user. Jobs and Projects
// are nested rather than relational because they are always read together and
// never queried independently — keeping them in JSON simplifies the schema.
// ---------------------------------------------------------------------------

export type Contact = {
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  site?: string;
};

export type Project = {
  id: string;            // P01, P02, ... (unique within a Job)
  name: string;
  problem: string;
  actions: string[];
  result: string;
  metrics: Record<string, string>;   // freeform key/value, e.g. { users: '25000' }
  scope?: string;
  skills: string[];
  tools: string[];
  methods: string[];
  domain: string;
  keywords: string[];
  recency: number;       // 1-5 scale; how recent and active
  relevance: string[];   // tags: 'frontend', 'leadership', 'fullstack', etc.
  confidence: number;    // 0.0-1.0; how confident we are this project is real / well-described
};

export type Job = {
  id: string;            // J01, J02, ... (unique within a SkillsDB)
  employer: string;
  title: string;
  startDate: string;     // YYYY-MM
  endDate: string;       // YYYY-MM or '' for current
  location: string;
  industry: string;
  summary: string;
  projects: Project[];
};

export type SkillsDB = {
  id: string;
  ownerId: string;       // User.id
  fullName: string;
  headline: string;
  positioning: string;
  contact: Contact;
  targetRoles: string[];
  awards: string[];
  jobs: Job[];
  coreSkills: string[];
  tools: string[];
  methods: string[];
  domains: string[];
  keywords: string[];
  updatedAt: string;
};

// Story is derived from SkillsDB jobs/projects at read time. Not persisted.
// Defined here so interview-prep workflows can type the derived shape.
export type Story = {
  id: string;            // <jobId>-<projectId>
  title: string;
  employer: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  skills: string[];
};

// ---------------------------------------------------------------------------
// Application + ApplicationEvent
//
// One row per job a user is tracking. Status transitions go through
// ApplicationEvent for audit; the current state lives on Application itself.
// ---------------------------------------------------------------------------

export type AlignmentAnalysisSnapshot = {
  // Embedded on Application so the row carries its scoring without joins.
  score: number;                       // 0-100
  recommendation: string;
  missingKeywords: string[];
  requirements: Array<{
    requirement: string;
    strength: number;                  // 0-10
    type: 'strong' | 'partial' | 'missing';
    evidence: string;
    recommendation: string;
  }>;
};

export type Application = {
  id: string;
  ownerId: string;                     // User.id
  company: string;
  role: string;
  url?: string;
  source?: string;                     // 'linkedin', 'referral', 'direct', etc. — freeform
  location?: string;
  remote: boolean;
  salaryRange?: string;
  jobDescription?: string;
  status: ApplicationStatus;
  appliedDate?: string;                // ISO date
  followUpDate?: string;               // ISO date
  notes?: string;
  alignmentScore?: number;
  alignmentAnalysis?: AlignmentAnalysisSnapshot;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationEvent = {
  id: string;
  applicationId: string;
  kind: ApplicationEventKind;
  at: string;                          // ISO 8601
  note?: string;
  // For kind='status_change'
  fromStatus?: ApplicationStatus;
  toStatus?: ApplicationStatus;
  // For kind='document_generated'
  documentId?: string;
};

// ---------------------------------------------------------------------------
// Document
//
// Generated artifacts (resume, cover letter, 90-day plan, dossier) keyed
// optionally to an Application. Body is markdown.
// ---------------------------------------------------------------------------

export type Document = {
  id: string;
  ownerId: string;
  kind: DocumentKind;
  title: string;
  body: string;                        // markdown
  applicationId?: string;              // null for general/un-targeted artifacts
  createdAt: string;
};

// ---------------------------------------------------------------------------
// WatchlistCompany + DiscoveredPosting
//
// Discovery loop. WatchlistCompany rows drive the daily Inngest poller;
// DiscoveredPosting rows are what the poller produces.
// ---------------------------------------------------------------------------

export type WatchlistCompany = {
  id: string;
  ownerId: string;
  company: string;                     // display name
  atsProvider: AtsProvider;
  atsSlug: string;                     // provider-specific board slug
  active: boolean;
  lastPolled?: string;                 // ISO 8601
  createdAt: string;
};

export type DiscoveredPosting = {
  id: string;
  ownerId: string;
  watchlistCompanyId: string;
  externalId: string;                  // provider's posting ID (dedup key)
  company: string;
  atsProvider: AtsProvider;
  role: string;
  location: string;
  remote: boolean;
  postedAt: string;                    // ISO date
  url: string;
  salaryRange?: string;
  jobDescription: string;
  alignmentScore?: number;             // populated by Backend Core after the poll commits
  status: DiscoveryStatus;
  createdAt: string;
};
