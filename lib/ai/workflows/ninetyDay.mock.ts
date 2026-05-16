// Mock 90-day plan — body mirrors the prototype's renderer.

import {
  NinetyDayRawSchema,
  type NinetyDayInput,
  type NinetyDayRawOutput,
} from '@/contracts/ai';
import { ninetyDayFixture } from '../mocks/fixtures';
import type { CallOptions } from '../types';

export async function ninetyDay(
  input: NinetyDayInput,
  _opts: CallOptions,
): Promise<NinetyDayRawOutput> {
  const body = ninetyDayFixture(input.application);
  return NinetyDayRawSchema.parse({ body });
}
