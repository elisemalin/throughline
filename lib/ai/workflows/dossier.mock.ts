// Mock dossier — placeholder body until web search is enabled in live mode.

import {
  DossierRawSchema,
  type DossierInput,
  type DossierRawOutput,
} from '@/contracts/ai';
import { dossierFixture } from '../mocks/fixtures';
import type { CallOptions } from '../types';

export async function dossier(
  input: DossierInput,
  _opts: CallOptions,
): Promise<DossierRawOutput> {
  const body = dossierFixture(input.application);
  return DossierRawSchema.parse({ body });
}
