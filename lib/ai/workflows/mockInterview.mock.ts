// Mock interview — opener / followup / wrap-up rotation that matches the
// behavior in /lib/mock-api.ts so the prototype's interview UI is exercised
// during the sprint.

import {
  MockInterviewRawSchema,
  type MockInterviewInput,
  type MockInterviewRawOutput,
} from '@/contracts/ai';
import { mockInterviewFixture } from '../mocks/fixtures';
import type { CallOptions } from '../types';

export async function mockInterview(
  input: MockInterviewInput,
  _opts: CallOptions,
): Promise<MockInterviewRawOutput> {
  const value = mockInterviewFixture(input.application, input.stories, input.transcript);
  return MockInterviewRawSchema.parse(value);
}
