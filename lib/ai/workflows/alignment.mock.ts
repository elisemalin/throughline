// Mock alignment — returns a contract-shaped fixture matching what the
// real workflow's AlignmentRawSchema would accept. Used during the
// parallel sprint when AI_MODE=mock (the default).

import {
  AlignmentRawSchema,
  type AlignmentInput,
  type AlignmentRawOutput,
} from '@/contracts/ai';
import { alignmentFixture } from '../mocks/fixtures';
import type { CallOptions } from '../types';

export async function alignment(
  input: AlignmentInput,
  _opts: CallOptions,
): Promise<AlignmentRawOutput> {
  const value = alignmentFixture(input.skillsDB, input.jobDescription);
  // Re-validate so a contract drift fails loudly during the sprint rather
  // than silently shipping a stale shape into Frontend integration.
  return AlignmentRawSchema.parse(value);
}
