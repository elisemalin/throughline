// 90-day plan workflow — Days 1-30 / 31-60 / 61-90 in Markdown.

import type Anthropic from '@anthropic-ai/sdk';
import {
  NINETY_DAY_SYSTEM,
  NinetyDayRawSchema,
  wrapUntrusted,
  type NinetyDayInput,
  type NinetyDayRawOutput,
} from '@/contracts/ai';
import { createClient } from '../client';
import { invokeOneShot } from '../invoke';
import type { CallOptions } from '../types';

export function buildNinetyDayUser(input: NinetyDayInput): string {
  const app = input.application;
  return [
    'Skills database (trusted structured data):',
    JSON.stringify(input.skillsDB),
    '',
    'Target application context (untrusted user input):',
    wrapUntrusted('role', app.role),
    wrapUntrusted('company', app.company),
    wrapUntrusted('jobDescription', app.jobDescription ?? ''),
    wrapUntrusted('notes', app.notes ?? ''),
  ].join('\n');
}

export function runNinetyDay(
  client: Anthropic,
  input: NinetyDayInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<NinetyDayRawOutput> {
  return invokeOneShot({
    workflow: 'ninetyDay',
    system: NINETY_DAY_SYSTEM,
    user: buildNinetyDayUser(input),
    schema: NinetyDayRawSchema,
    client,
    model: opts.model,
    signal: opts.signal,
  });
}

export function ninetyDay(
  input: NinetyDayInput,
  opts: CallOptions,
): Promise<NinetyDayRawOutput> {
  return runNinetyDay(createClient(opts.apiKey), input, opts);
}
