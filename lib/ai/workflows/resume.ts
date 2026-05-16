// Resume workflow — produce a Markdown resume tailored to an application.
//
// application.* fields (when an application is supplied) are user input
// and wrapped via wrapUntrusted. SkillsDB is canonical persisted data and
// passed as a trusted JSON blob.

import type Anthropic from '@anthropic-ai/sdk';
import {
  RESUME_SYSTEM,
  ResumeRawSchema,
  wrapUntrusted,
  type ResumeInput,
  type ResumeRawOutput,
} from '@/contracts/ai';
import { createClient } from '../client';
import { invokeOneShot } from '../invoke';
import type { CallOptions } from '../types';

function buildApplicationBlock(input: ResumeInput): string {
  if (!input.application) return '(no application context — generate a general resume)';
  const app = input.application;
  // Each user-typed application field is its own wrapped block so a prompt-
  // injection payload in one field cannot leak across into another.
  return [
    wrapUntrusted('role', app.role),
    wrapUntrusted('company', app.company),
    wrapUntrusted('jobDescription', app.jobDescription ?? ''),
    wrapUntrusted('notes', app.notes ?? ''),
  ].join('\n');
}

export function buildResumeUser(input: ResumeInput): string {
  return [
    'Skills database (trusted structured data):',
    JSON.stringify(input.skillsDB),
    '',
    'Target application context (untrusted user input):',
    buildApplicationBlock(input),
  ].join('\n');
}

export function runResume(
  client: Anthropic,
  input: ResumeInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<ResumeRawOutput> {
  return invokeOneShot({
    workflow: 'resume',
    system: RESUME_SYSTEM,
    user: buildResumeUser(input),
    schema: ResumeRawSchema,
    client,
    model: opts.model,
    signal: opts.signal,
  });
}

export function resume(
  input: ResumeInput,
  opts: CallOptions,
): Promise<ResumeRawOutput> {
  return runResume(createClient(opts.apiKey), input, opts);
}
