// Public AI Integration namespace.
//
// Each export is the workflow function Backend Core calls. Mode is selected
// once at module load via `process.env.AI_MODE`:
//   - 'mock' (default during the parallel sprint) → fixture implementations
//   - 'live' (flipped on Day 5 by scripts/integrate.sh) → SDK implementations
//
// Both modes share the same signature: `(input, { apiKey }) => Promise<raw>`.
// Backend Core does not branch on mode; consumer code is identical.

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
