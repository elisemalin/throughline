// Alignment workflow — score how well a SkillsDB matches a JD.
//
// jobDescription is the only user-supplied field on this call (SkillsDB is
// canonical persisted data already validated through SkillsDBSchema). It is
// wrapped via wrapUntrusted before going into the user message so prompt
// injection from the JD cannot override the workflow's SYSTEM rules.

import type Anthropic from '@anthropic-ai/sdk';
import {
  ALIGNMENT_SYSTEM,
  AlignmentRawSchema,
  wrapUntrusted,
  type AlignmentInput,
  type AlignmentRawOutput,
} from '@/contracts/ai';
import { createClient } from '../client';
import { invokeOneShot } from '../invoke';
import type { CallOptions } from '../types';

export function buildAlignmentUser(input: AlignmentInput): string {
  return [
    'Skills database (already-validated structured data, trusted):',
    JSON.stringify(input.skillsDB),
    '',
    'Job description (untrusted user input):',
    wrapUntrusted('jobDescription', input.jobDescription),
  ].join('\n');
}

export function runAlignment(
  client: Anthropic,
  input: AlignmentInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<AlignmentRawOutput> {
  return invokeOneShot({
    workflow: 'alignment',
    system: ALIGNMENT_SYSTEM,
    user: buildAlignmentUser(input),
    schema: AlignmentRawSchema,
    client,
    model: opts.model,
    signal: opts.signal,
  });
}

export function alignment(
  input: AlignmentInput,
  opts: CallOptions,
): Promise<AlignmentRawOutput> {
  return runAlignment(createClient(opts.apiKey), input, opts);
}
