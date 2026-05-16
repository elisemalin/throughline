// Public AI Integration namespace.
//
// Each export is the workflow function Backend Core calls. Mode is selected
// once at module load via `process.env.AI_MODE`:
//   - 'mock' (default during the parallel sprint) → fixture implementations
//   - 'live' (flipped on Day 5 by scripts/integrate.sh) → SDK implementations
//
// Both modes share the same signature: `(input, { apiKey }) => Promise<raw>`.
// Backend Core does not branch on mode; consumer code is identical.

import type { AlignmentInput, AlignmentRawOutput } from '@/contracts/ai';
import { alignment as alignmentReal } from './workflows/alignment';
import { alignment as alignmentMock } from './workflows/alignment.mock';
import { coverLetter as coverLetterReal } from './workflows/coverLetter';
import { coverLetter as coverLetterMock } from './workflows/coverLetter.mock';
import { dossier as dossierReal } from './workflows/dossier';
import { dossier as dossierMock } from './workflows/dossier.mock';
import { mockInterview as mockInterviewReal } from './workflows/mockInterview';
import { mockInterview as mockInterviewMock } from './workflows/mockInterview.mock';
import { ninetyDay as ninetyDayReal } from './workflows/ninetyDay';
import { ninetyDay as ninetyDayMock } from './workflows/ninetyDay.mock';
import { resume as resumeReal } from './workflows/resume';
import { resume as resumeMock } from './workflows/resume.mock';
import { skillsIngest as skillsIngestReal } from './workflows/skillsIngest';
import { skillsIngest as skillsIngestMock } from './workflows/skillsIngest.mock';

// resolveMode is exported (read-only) so Backend Core or the smoke script
// can log the active mode in their startup banner without re-deriving the
// env lookup. It is not part of the workflow API surface.
export function resolveMode(): 'mock' | 'live' {
  return process.env.AI_MODE === 'live' ? 'live' : 'mock';
}

const LIVE = resolveMode() === 'live';

export const alignment = LIVE ? alignmentReal : alignmentMock;
export const resume = LIVE ? resumeReal : resumeMock;
export const coverLetter = LIVE ? coverLetterReal : coverLetterMock;
export const ninetyDay = LIVE ? ninetyDayReal : ninetyDayMock;
export const dossier = LIVE ? dossierReal : dossierMock;
export const mockInterview = LIVE ? mockInterviewReal : mockInterviewMock;
export const skillsIngest = LIVE ? skillsIngestReal : skillsIngestMock;

export { AIValidationError } from './types';
export type { CallOptions } from './types';

// ---------------------------------------------------------------------------
// Backend Core Day-2 compatibility shim.
//
// Backend Core's Day-2 handlers landed before AI Integration shipped this
// namespace's exports. The handlers import `runAlignment`, `runResume`, etc.,
// and pass a single input arg (no apiKey). The aliases below let those
// handlers keep working: each accepts the same single-arg shape and forwards
// to the AI Integration namespace with an empty apiKey (the mock path
// ignores it; the live path requires a real apiKey, which Day-3 wires from
// `x-anthropic-key` request headers — TODO documented in CHANGELOG).
//
// On Day 3, Backend Core updates each route to read `x-anthropic-key` from
// the request and call the real namespace exports directly. These aliases
// disappear in the same PR.
// ---------------------------------------------------------------------------

const EMPTY_KEY_DAY2 = '';

export function runAlignment(input: AlignmentInput): Promise<AlignmentRawOutput> {
  return alignment(input, { apiKey: EMPTY_KEY_DAY2 });
}

export const runResume = (input: Parameters<typeof resume>[0]) =>
  resume(input, { apiKey: EMPTY_KEY_DAY2 });
export const runCoverLetter = (input: Parameters<typeof coverLetter>[0]) =>
  coverLetter(input, { apiKey: EMPTY_KEY_DAY2 });
export const runNinetyDay = (input: Parameters<typeof ninetyDay>[0]) =>
  ninetyDay(input, { apiKey: EMPTY_KEY_DAY2 });
export const runDossier = (input: Parameters<typeof dossier>[0]) =>
  dossier(input, { apiKey: EMPTY_KEY_DAY2 });
export const runMockInterview = (input: Parameters<typeof mockInterview>[0]) =>
  mockInterview(input, { apiKey: EMPTY_KEY_DAY2 });
export const runIngest = (input: Parameters<typeof skillsIngest>[0]) =>
  skillsIngest(input, { apiKey: EMPTY_KEY_DAY2 });

// Placeholder retained for Backend Core's skills-ingest handler. AI
// Integration's real workflow returns the structured DB without warnings;
// the SkillsIngestResponse.warnings field is filled by the handler from
// validation hints. Day-3 work replaces this with a per-response warnings
// list. Until then it is an empty array.
export const MOCK_INGEST_WARNINGS: readonly string[] = [];
