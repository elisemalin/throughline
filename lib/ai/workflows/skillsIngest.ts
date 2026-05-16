// Skills ingest workflow — parse resume + LinkedIn text into a structured
// SkillsDB shape. Falls back to MODEL_INGEST_FALLBACK (Opus) because
// noisy resume text benefits from the larger model per /contracts/ai.ts.

import type Anthropic from '@anthropic-ai/sdk';
import {
  INGEST_SYSTEM,
  IngestRawSchema,
  MODEL_INGEST_FALLBACK,
  wrapUntrusted,
  type IngestInput,
  type IngestRawOutput,
} from '@/contracts/ai';
import { createClient } from '../client';
import { invokeOneShot } from '../invoke';
import type { CallOptions } from '../types';

export function buildIngestUser(input: IngestInput): string {
  const blocks: string[] = [
    'Resume text (untrusted user input):',
    wrapUntrusted('resume', input.resumeText),
  ];
  if (input.linkedinText) {
    blocks.push('', 'LinkedIn export (untrusted user input):');
    blocks.push(wrapUntrusted('linkedin', input.linkedinText));
  }
  return blocks.join('\n');
}

export function runSkillsIngest(
  client: Anthropic,
  input: IngestInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<IngestRawOutput> {
  return invokeOneShot({
    workflow: 'skillsIngest',
    system: INGEST_SYSTEM,
    user: buildIngestUser(input),
    schema: IngestRawSchema,
    client,
    model: opts.model ?? MODEL_INGEST_FALLBACK,
    signal: opts.signal,
    maxTokens: 8_192,
  });
}

export function skillsIngest(
  input: IngestInput,
  opts: CallOptions,
): Promise<IngestRawOutput> {
  return runSkillsIngest(createClient(opts.apiKey), input, opts);
}
