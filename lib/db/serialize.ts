// DB -> API projection helpers.
//
// WHY: Prisma hydrates `DateTime` columns as JS `Date` instances and `Json`
// columns as `Prisma.JsonValue` (effectively `unknown`). The contract shapes
// in /contracts/models.ts declare timestamps as ISO `string` and the JSON
// columns as concrete Zod-validated types. Without a canonical projection
// boundary every Backend Core handler would re-derive the same Date->ISO
// and unknown->Contact / unknown->Job[] / unknown->AlignmentAnalysis logic,
// or worse, ship a Date through res.json() and break contract-typed
// consumers that expect ISO strings for date math.
//
// See ARCHITECTURE.md "Date/timestamp serialization" and "Reading JSON
// columns" decisions.

import {
  AlignmentAnalysisSchema,
  ContactSchema,
  JobSchema,
  type AlignmentAnalysis,
  type Contact,
  type Job,
} from '@/contracts/models';

// toApiDate projects a Prisma DateTime column value to the ISO `string`
// transport shape the contracts declare. `string` inputs are passed through
// so callers can compose the helper through projectors that already
// stringified upstream.
export function toApiDate(
  value: Date | string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  return value.toISOString();
}

// parseContact / parseJobs / parseAlignmentAnalysis are the read-side
// counterpart to /contracts/models.ts's `parse()` on writes. Backend Core
// MUST run any `Json` column through these helpers before returning to API
// consumers so the contract types are honored at the boundary.
export function parseContact(value: unknown): Contact {
  return ContactSchema.parse(value);
}

export function parseJobs(value: unknown): Job[] {
  return JobSchema.array().parse(value ?? []);
}

export function parseAlignmentAnalysis(
  value: unknown,
): AlignmentAnalysis | undefined {
  if (value == null) return undefined;
  return AlignmentAnalysisSchema.parse(value);
}

// ---------------------------------------------------------------------------
// Per-table projectors.
//
// Backend Core imports these on Day 2 to project a Prisma row to its
// contract-shape API response in one call. Each projector covers exactly
// the Date and Json columns its table holds — flat columns are passed
// through unchanged because Prisma already hydrates them in the contract
// shape.
//
// The Prisma-row argument is typed loosely (input shape matches what
// `prisma.<table>.findUnique` returns) and the return type is left to the
// caller because Backend Core may further enrich the row (e.g. derive
// `Application.alignmentScore` from `alignmentAnalysis.score`) before
// returning to the wire.
// ---------------------------------------------------------------------------

// SkillsDBRow is the minimal Prisma-row shape the projector touches. It is
// not a full Prisma type import so this module stays useful in unit tests
// without dragging the generated client into the test bundle.
type SkillsDBRow = {
  id: string;
  ownerId: string;
  fullName: string;
  headline: string;
  positioning: string;
  contact: unknown;
  targetRoles: string[];
  awards: string[];
  jobs: unknown;
  coreSkills: string[];
  tools: string[];
  methods: string[];
  domains: string[];
  keywords: string[];
  updatedAt: Date | string;
};

export function projectSkillsDB(row: SkillsDBRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    fullName: row.fullName,
    headline: row.headline,
    positioning: row.positioning,
    contact: parseContact(row.contact),
    targetRoles: row.targetRoles,
    awards: row.awards,
    jobs: parseJobs(row.jobs),
    coreSkills: row.coreSkills,
    tools: row.tools,
    methods: row.methods,
    domains: row.domains,
    keywords: row.keywords,
    updatedAt: toApiDate(row.updatedAt) ?? '',
  };
}

type ApplicationRow = {
  id: string;
  ownerId: string;
  company: string;
  role: string;
  url: string | null;
  source: string | null;
  location: string | null;
  remote: boolean;
  salaryRange: string | null;
  jobDescription: string | null;
  status: string;
  appliedDate: string | null;
  followUpDate: string | null;
  notes: string | null;
  alignmentAnalysis: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

// projectApplication returns the contract-typed API row plus the derived
// `alignmentScore` field (per ARCHITECTURE.md "Application.alignmentScore is
// a read-side derived field, not a column"). The caller decides whether to
// strip the analysis on list responses to keep payload size down.
export function projectApplication(row: ApplicationRow) {
  const alignmentAnalysis = parseAlignmentAnalysis(row.alignmentAnalysis);
  return {
    id: row.id,
    ownerId: row.ownerId,
    company: row.company,
    role: row.role,
    url: row.url ?? undefined,
    source: row.source ?? undefined,
    location: row.location ?? undefined,
    remote: row.remote,
    salaryRange: row.salaryRange ?? undefined,
    jobDescription: row.jobDescription ?? undefined,
    status: row.status,
    appliedDate: row.appliedDate ?? undefined,
    followUpDate: row.followUpDate ?? undefined,
    notes: row.notes ?? undefined,
    alignmentAnalysis,
    alignmentScore: alignmentAnalysis?.score,
    createdAt: toApiDate(row.createdAt) ?? '',
    updatedAt: toApiDate(row.updatedAt) ?? '',
  };
}

type WatchlistCompanyRow = {
  id: string;
  ownerId: string;
  company: string;
  atsProvider: string;
  atsSlug: string;
  active: boolean;
  lastPolled: Date | string | null;
  createdAt: Date | string;
};

export function projectWatchlistCompany(row: WatchlistCompanyRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    company: row.company,
    atsProvider: row.atsProvider,
    atsSlug: row.atsSlug,
    active: row.active,
    lastPolled: toApiDate(row.lastPolled),
    createdAt: toApiDate(row.createdAt) ?? '',
  };
}

type DiscoveredPostingRow = {
  id: string;
  ownerId: string;
  watchlistCompanyId: string;
  externalId: string;
  company: string;
  atsProvider: string;
  role: string;
  location: string;
  remote: boolean;
  postedAt: Date | string;
  url: string;
  salaryRange: string | null;
  jobDescription: string;
  alignmentScore: number | null;
  status: string;
  applicationId: string | null;
  createdAt: Date | string;
};

export function projectDiscoveredPosting(row: DiscoveredPostingRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    watchlistCompanyId: row.watchlistCompanyId,
    externalId: row.externalId,
    company: row.company,
    atsProvider: row.atsProvider,
    role: row.role,
    location: row.location,
    remote: row.remote,
    postedAt: toApiDate(row.postedAt) ?? '',
    url: row.url,
    salaryRange: row.salaryRange ?? undefined,
    jobDescription: row.jobDescription,
    alignmentScore: row.alignmentScore ?? undefined,
    status: row.status,
    applicationId: row.applicationId ?? undefined,
    createdAt: toApiDate(row.createdAt) ?? '',
  };
}

type ApplicationEventRow = {
  id: string;
  applicationId: string;
  kind: string;
  at: Date | string;
  note: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  documentId: string | null;
};

export function projectApplicationEvent(row: ApplicationEventRow) {
  return {
    id: row.id,
    applicationId: row.applicationId,
    kind: row.kind,
    at: toApiDate(row.at) ?? '',
    note: row.note ?? undefined,
    fromStatus: row.fromStatus ?? undefined,
    toStatus: row.toStatus ?? undefined,
    documentId: row.documentId ?? undefined,
  };
}

type DocumentRow = {
  id: string;
  ownerId: string;
  kind: string;
  title: string;
  body: string;
  applicationId: string | null;
  createdAt: Date | string;
};

export function projectDocument(row: DocumentRow) {
  return {
    id: row.id,
    ownerId: row.ownerId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    applicationId: row.applicationId ?? undefined,
    createdAt: toApiDate(row.createdAt) ?? '',
  };
}

type UserRow = {
  id: string;
  email: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function projectUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    createdAt: toApiDate(row.createdAt) ?? '',
    updatedAt: toApiDate(row.updatedAt) ?? '',
  };
}
