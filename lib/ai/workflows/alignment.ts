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

// Output-format cue. WHY: live smoke (2026-05-16) revealed the model
// wandered on field names — returned `{id, label}` per requirement
// instead of the schema's `{requirement, strength, type, evidence,
// recommendation}`. SYSTEM names the criteria but lives in /contracts/ai.ts
// (Architect-only); the workflow-owned user message is the right place to
// pin the exact shape.
const ALIGNMENT_OUTPUT_HINT = `Output JSON shape (return EXACTLY these keys; do not invent fields):
{
  "score": <integer 0-100>,
  "requirements": [
    {
      "requirement": "<requirement text>",
      "strength": <number 0-10>,
      "type": "strong" | "partial" | "missing",
      "evidence": "<one line>",
      "recommendation": "<one line>"
    }
  ],
  "missingKeywords": ["<keyword>", ...],
  "recommendation": "<overall recommendation>"
}`;

export function buildAlignmentUser(input: AlignmentInput): string {
  return [
    'Skills database (already-validated structured data, trusted):',
    JSON.stringify(input.skillsDB),
    '',
    'Job description (untrusted user input):',
    wrapUntrusted('jobDescription', input.jobDescription),
    '',
    ALIGNMENT_OUTPUT_HINT,
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
