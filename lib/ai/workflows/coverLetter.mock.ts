// Mock cover letter — body mirrors the prototype's renderer so Frontend's
// UI keeps rendering identical content during the parallel sprint.

import {
  CoverLetterRawSchema,
  type CoverLetterInput,
  type CoverLetterRawOutput,
} from '@/contracts/ai';
import { coverLetterFixture } from '../mocks/fixtures';
import type { CallOptions } from '../types';

export async function coverLetter(
  input: CoverLetterInput,
  _opts: CallOptions,
): Promise<CoverLetterRawOutput> {
  const body = coverLetterFixture(input.skillsDB, input.application, input.customNotes);
  return CoverLetterRawSchema.parse({ body });
}
