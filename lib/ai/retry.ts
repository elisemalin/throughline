// One-retry-on-validation-failure wrapper.
//
// Contract (per /contracts/ai.ts):
//   - Call the model once with the workflow's SYSTEM prompt.
//   - If the response fails the workflow's Zod RawSchema, retry exactly
//     once with the validator error appended to SYSTEM. The retry's SYSTEM
//     suffix uses a fixed template so the model sees a stable, terse
//     correction instruction rather than a 2kB Zod issue dump.
//   - If the second attempt also fails, throw AIValidationError carrying
//     the second-attempt issues (the first attempt's issues are dropped to
//     keep error logs bounded).

import type { ZodType, ZodTypeDef } from 'zod';
import { RETRY_ON_VALIDATION_FAILURE } from '@/contracts/ai';
import { AIValidationError } from './types';

export type Attempt = (extraSystem: string) => Promise<unknown>;

// SchemaWithOutput constrains T to the schema's OUTPUT type (post-Zod
// defaults / transforms). z.ZodSchema's bare alias infers T from the
// schema's INPUT side, which breaks for schemas using `.default(...)` —
// alignment, mockInterview, and skillsIngest all do. Pinning the third
// type parameter to `any` (the schema's INPUT) makes T flow from OUTPUT.
export type SchemaWithOutput<T> = ZodType<T, ZodTypeDef, unknown>;

function correctionSuffix(issues: string): string {
  return `\n\nYour previous response failed schema validation: ${issues}. Return a corrected JSON object that matches the response schema exactly. No prose outside JSON. No markdown fences.`;
}

export async function withValidationRetry<T>(
  workflow: string,
  schema: SchemaWithOutput<T>,
  attempt: Attempt,
): Promise<T> {
  const first = await attempt('');
  const firstParsed = schema.safeParse(first);
  if (firstParsed.success) return firstParsed.data;

  // RETRY_ON_VALIDATION_FAILURE is pinned to 1 in /contracts/ai.ts. The
  // const is read here so a future contract bump cascades automatically.
  if (RETRY_ON_VALIDATION_FAILURE < 1) {
    throw new AIValidationError(workflow, firstParsed.error.message);
  }

  const issues = firstParsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  const second = await attempt(correctionSuffix(issues));
  const secondParsed = schema.safeParse(second);
  if (secondParsed.success) return secondParsed.data;

  const finalIssues = secondParsed.error.issues
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
  throw new AIValidationError(workflow, finalIssues);
}
