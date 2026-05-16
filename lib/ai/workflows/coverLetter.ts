// Cover letter workflow — three-paragraph Markdown letter tailored to an
// application. application.* and customNotes are both user-supplied and
// wrapped individually.

import type Anthropic from '@anthropic-ai/sdk';
import {
  COVER_LETTER_SYSTEM,
  CoverLetterRawSchema,
  wrapUntrusted,
  type CoverLetterInput,
  type CoverLetterRawOutput,
} from '@/contracts/ai';
import { createClient } from '../client';
import { invokeOneShot } from '../invoke';
import type { CallOptions } from '../types';

export function buildCoverLetterUser(input: CoverLetterInput): string {
  const app = input.application;
  const blocks: string[] = [
    'Skills database (trusted structured data):',
    JSON.stringify(input.skillsDB),
    '',
    'Target application context (untrusted user input):',
    wrapUntrusted('role', app.role),
    wrapUntrusted('company', app.company),
    wrapUntrusted('jobDescription', app.jobDescription ?? ''),
    wrapUntrusted('notes', app.notes ?? ''),
  ];
  if (input.customNotes) {
    blocks.push('', 'Custom notes from the candidate (untrusted user input):');
    blocks.push(wrapUntrusted('customNotes', input.customNotes));
  }
  return blocks.join('\n');
}

export function runCoverLetter(
  client: Anthropic,
  input: CoverLetterInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<CoverLetterRawOutput> {
  return invokeOneShot({
    workflow: 'coverLetter',
    system: COVER_LETTER_SYSTEM,
    user: buildCoverLetterUser(input),
    schema: CoverLetterRawSchema,
    client,
    model: opts.model,
    signal: opts.signal,
  });
}

export function coverLetter(
  input: CoverLetterInput,
  opts: CallOptions,
): Promise<CoverLetterRawOutput> {
  return runCoverLetter(createClient(opts.apiKey), input, opts);
}
