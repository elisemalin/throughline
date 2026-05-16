// Mock skills ingest — returns a minimal but valid IngestRawOutput. The
// real workflow extracts a much richer payload; the mock keeps Frontend's
// "no skills DB yet" path exercised during the sprint.

import {
  IngestRawSchema,
  type IngestInput,
  type IngestRawOutput,
} from '@/contracts/ai';
import { ingestFixture } from '../mocks/fixtures';
import type { CallOptions } from '../types';

export async function skillsIngest(
  input: IngestInput,
  _opts: CallOptions,
): Promise<IngestRawOutput> {
  return IngestRawSchema.parse(ingestFixture(input.resumeText));
}
