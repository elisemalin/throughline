// Mock resume — returns a Markdown body shaped like what the real
// workflow's ResumeRawSchema would accept. Body content mirrors the
// renderer in /lib/mock-api.ts so Frontend's UI keeps rendering.

import {
  ResumeRawSchema,
  type ResumeInput,
  type ResumeRawOutput,
} from '@/contracts/ai';
import { resumeFixture } from '../mocks/fixtures';
import type { CallOptions } from '../types';

export async function resume(
  input: ResumeInput,
  _opts: CallOptions,
): Promise<ResumeRawOutput> {
  const body = resumeFixture(input.skillsDB, input.application);
  return ResumeRawSchema.parse({ body });
}
