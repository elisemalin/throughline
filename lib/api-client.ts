// Real API client. Day-5 swap target: every `/lib/queries/*` hook now
// imports from here instead of `/lib/mock-api.ts`. Function shapes are
// identical so the TanStack Query hooks pick up the new fetcher without
// changing signatures.
//
// Auth:
//   - Clerk session cookie is forwarded automatically by `fetch`
//     (same-origin); no header plumbing needed for the gated routes.
//   - AI routes additionally require the BYOK Anthropic key on the
//     `x-anthropic-key` header. Those calls take an explicit `apiKey`
//     parameter; the calling hooks pull it from `useByokKey()` and
//     surface a `missing_anthropic_key` error if the user has not
//     unlocked their key this session.
//
// Errors:
//   - Non-2xx responses are parsed through `ApiErrorBodySchema`. The
//     thrown `ApiClientError` carries the `code` for switch-statement
//     narrowing in error UIs (e.g. "regenerate" on `ai_invalid_response`).

import { z, type ZodTypeAny } from 'zod';
import {
  ApplicationEventSchema,
  ApplicationSchema,
  DiscoveredPostingSchema,
  DocumentSchema,
  SkillsDBSchema,
  WatchlistCompanySchema,
} from '@/contracts/models';
import {
  AlignmentResponseSchema,
  ApplicationAlignmentResponseSchema,
  DocumentResponseSchema,
  MockInterviewResponseSchema,
  type AlignmentRequest,
  type AlignmentResponse,
  type ApplicationAlignmentResponse,
  type ApplicationCreate,
  type ApplicationListResponse,
  type ApplicationUpdate,
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
import { ApiErrorBodySchema, type ApiErrorBody } from '@/lib/server/response';

export type ApiErrorCode = ApiErrorBody['error']['code'];

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body.error.code;
    this.details = body.error.details;
  }
}

type RequestInitWithBody = Omit<RequestInit, 'body'> & { jsonBody?: unknown };

// WHY a single fetch wrapper: centralizing the JSON encode + 4xx/5xx
// parse here means every route call has identical error semantics, and
// the swap from mock-api → api-client is a search/replace rather than a
// thirty-call audit.
async function call<T>(
  path: string,
  init: RequestInitWithBody,
  schema: ZodTypeAny | null,
): Promise<T> {
  const { jsonBody, headers, ...rest } = init;
  const merged: HeadersInit = {
    ...(jsonBody === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string> | undefined),
  };
  const response = await fetch(path, {
    ...rest,
    headers: merged,
    body: jsonBody === undefined ? undefined : JSON.stringify(jsonBody),
    credentials: 'same-origin',
  });
  if (!response.ok) {
    // WHY: try to parse the structured error first; fall back to a
    // synthetic invalid_request if the server returned non-JSON or
    // truncated the body (a Lambda timeout, a 502 from upstream).
    let body: ApiErrorBody;
    try {
      const parsed = await response.json();
      body = ApiErrorBodySchema.parse(parsed);
    } catch {
      body = {
        error: {
          code: 'invalid_request',
          message: `Request failed with status ${response.status}.`,
        },
      };
    }
    throw new ApiClientError(response.status, body);
  }
  if (response.status === 204) return undefined as T;
  const raw = await response.json();
  if (!schema) return raw as T;
  return schema.parse(raw) as T;
}

// ---------------------------------------------------------------------------
// Response schemas (composed from contracts/models — kept here so the
// client owns its parsing layer; integration test asserts equivalence).
// ---------------------------------------------------------------------------

const ApplicationListResponseSchema = z
  .object({ applications: z.array(ApplicationSchema) })
  .strict();
const ApplicationEventListResponseSchema = z
  .object({ events: z.array(ApplicationEventSchema) })
  .strict();
const ApplicationOnlyResponseSchema = z
  .object({ application: ApplicationSchema })
  .strict();
const DocumentListResponseSchema = z
  .object({ documents: z.array(DocumentSchema) })
  .strict();
const SkillsReadResponseSchema = z
  .object({ skillsDB: SkillsDBSchema.nullable() })
  .strict();
const WatchlistListResponseSchema = z
  .object({ companies: z.array(WatchlistCompanySchema) })
  .strict();
const DiscoveryListResponseSchema = z
  .object({ postings: z.array(DiscoveredPostingSchema) })
  .strict();
const DiscoveryPollResponseSchema = z
  .object({
    newPostings: z.number().int().nonnegative(),
    totalPostings: z.number().int().nonnegative(),
    polledAt: z.string(),
  })
  .strict();
const OkResponseSchema = z.object({ ok: z.literal(true) }).strict();
const WatchlistAddResponseSchema = z
  .object({
    company: WatchlistCompanySchema,
    validation: z
      .object({ valid: z.boolean(), error: z.string().optional() })
      .strict(),
  })
  .strict();
// WHY skillsIngest projects a raw shape: the route returns
// { skillsDB, warnings }; SkillsIngestResponse is exported as a type but
// not as a schema in contracts/api.ts, so we compose here.
const SkillsIngestResponseSchema = z
  .object({
    skillsDB: SkillsDBSchema,
    warnings: z.array(z.string()),
  })
  .strict();

function ai(apiKey: string): HeadersInit {
  return { 'x-anthropic-key': apiKey };
}

// ---------------------------------------------------------------------------
// AI generation (BYOK — every call takes the unlocked key)
// ---------------------------------------------------------------------------

export async function postAlignment(
  req: AlignmentRequest,
  apiKey: string,
): Promise<AlignmentResponse> {
  return call('/api/alignment', { method: 'POST', jsonBody: req, headers: ai(apiKey) }, AlignmentResponseSchema);
}

export async function postResume(
  req: ResumeRequest,
  apiKey: string,
): Promise<DocumentResponse> {
  return call('/api/documents/resume', { method: 'POST', jsonBody: req, headers: ai(apiKey) }, DocumentResponseSchema);
}

export async function postCoverLetter(
  req: CoverLetterRequest,
  apiKey: string,
): Promise<DocumentResponse> {
  return call('/api/documents/cover-letter', { method: 'POST', jsonBody: req, headers: ai(apiKey) }, DocumentResponseSchema);
}

export async function postNinetyDayPlan(
  req: NinetyDayRequest,
  apiKey: string,
): Promise<DocumentResponse> {
  return call('/api/documents/ninety-day-plan', { method: 'POST', jsonBody: req, headers: ai(apiKey) }, DocumentResponseSchema);
}

export async function postDossier(
  req: DossierRequest,
  apiKey: string,
): Promise<DocumentResponse> {
  return call('/api/documents/dossier', { method: 'POST', jsonBody: req, headers: ai(apiKey) }, DocumentResponseSchema);
}

export async function postMockInterviewTurn(
  req: MockInterviewRequest,
  apiKey: string,
): Promise<MockInterviewResponse> {
  return call('/api/interviews/mock', { method: 'POST', jsonBody: req, headers: ai(apiKey) }, MockInterviewResponseSchema);
}

export async function postSkillsIngest(
  req: SkillsIngestRequest,
  apiKey: string,
): Promise<SkillsIngestResponse> {
  return call('/api/skills/ingest', { method: 'POST', jsonBody: req, headers: ai(apiKey) }, SkillsIngestResponseSchema);
}

export async function postApplicationAlignment(
  id: string,
  apiKey: string,
): Promise<ApplicationAlignmentResponse> {
  return call(
    `/api/applications/${encodeURIComponent(id)}/alignment`,
    { method: 'POST', jsonBody: {}, headers: ai(apiKey) },
    ApplicationAlignmentResponseSchema,
  );
}

// ---------------------------------------------------------------------------
// Application CRUD
// ---------------------------------------------------------------------------

export async function getApplications(): Promise<ApplicationListResponse> {
  return call('/api/applications', { method: 'GET' }, ApplicationListResponseSchema);
}

export async function postApplication(
  req: ApplicationCreate,
): Promise<{ application: ApplicationListResponse['applications'][number] }> {
  return call('/api/applications', { method: 'POST', jsonBody: req }, ApplicationOnlyResponseSchema);
}

export async function patchApplication(
  id: string,
  patch: ApplicationUpdate,
): Promise<{ application: ApplicationListResponse['applications'][number] }> {
  return call(
    `/api/applications/${encodeURIComponent(id)}`,
    { method: 'PATCH', jsonBody: patch },
    ApplicationOnlyResponseSchema,
  );
}

export async function deleteApplication(id: string): Promise<{ ok: true }> {
  return call(`/api/applications/${encodeURIComponent(id)}`, { method: 'DELETE' }, OkResponseSchema);
}

export async function getApplicationEvents(
  id: string,
): Promise<ApplicationEventListResponse> {
  return call(
    `/api/applications/${encodeURIComponent(id)}/events`,
    { method: 'GET' },
    ApplicationEventListResponseSchema,
  );
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getDocuments(): Promise<DocumentListResponse> {
  return call('/api/documents', { method: 'GET' }, DocumentListResponseSchema);
}

export async function deleteDocument(id: string): Promise<{ ok: true }> {
  return call(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE' }, OkResponseSchema);
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export async function getSkills(): Promise<SkillsReadResponse> {
  return call('/api/skills', { method: 'GET' }, SkillsReadResponseSchema);
}

export async function putSkills(update: SkillsUpdate): Promise<SkillsReadResponse> {
  return call('/api/skills', { method: 'PATCH', jsonBody: update }, SkillsReadResponseSchema);
}

// ---------------------------------------------------------------------------
// Watchlist + Discovery
// ---------------------------------------------------------------------------

export async function getWatchlist(): Promise<WatchlistListResponse> {
  return call('/api/watchlist', { method: 'GET' }, WatchlistListResponseSchema);
}

export async function postWatchlistAdd(
  req: WatchlistAddRequest,
): Promise<WatchlistAddResponse> {
  return call('/api/watchlist', { method: 'POST', jsonBody: req }, WatchlistAddResponseSchema);
}

export async function deleteWatchlistCompany(id: string): Promise<{ ok: true }> {
  return call(`/api/watchlist/${encodeURIComponent(id)}`, { method: 'DELETE' }, OkResponseSchema);
}

export async function getDiscovery(): Promise<DiscoveryListResponse> {
  return call('/api/discovery', { method: 'GET' }, DiscoveryListResponseSchema);
}

export async function postDiscoveryPoll(): Promise<DiscoveryPollResponse> {
  return call('/api/discovery/poll', { method: 'POST', jsonBody: {} }, DiscoveryPollResponseSchema);
}

export async function patchDiscoveryStatus(
  id: string,
  req: DiscoveryUpdateRequest,
): Promise<{ ok: true }> {
  return call(
    `/api/discovery/${encodeURIComponent(id)}`,
    { method: 'PATCH', jsonBody: req },
    OkResponseSchema,
  );
}
