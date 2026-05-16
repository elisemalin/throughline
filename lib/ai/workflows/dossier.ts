// Dossier workflow — Markdown research dossier on a target company.
//
// The SYSTEM prompt instructs Claude to ground every factual claim with
// web_search; we pass the web_search tool through the SDK so the model
// can issue search queries. The cache key still hashes (system + user +
// model), so two requests for the same company hit the same cache entry
// even though the model issued live searches on the first call.

import type Anthropic from '@anthropic-ai/sdk';
import {
  DOSSIER_SYSTEM,
  DossierRawSchema,
  wrapUntrusted,
  type DossierInput,
  type DossierRawOutput,
} from '@/contracts/ai';
import { createClient } from '../client';
import { invokeOneShot } from '../invoke';
import type { CallOptions } from '../types';

// Tool config for Anthropic's web_search server tool. The SDK's
// `Messages.Tool` union currently models client-defined tools (which
// carry an input_schema); server tools have a different shape, so we
// cast through `unknown` once at the boundary rather than fight the
// SDK's narrower client-tool type at every call site.
const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5,
} as unknown as Anthropic.Messages.Tool;

export function buildDossierUser(input: DossierInput): string {
  const app = input.application;
  return [
    'Target application context (untrusted user input):',
    wrapUntrusted('role', app.role),
    wrapUntrusted('company', app.company),
    wrapUntrusted('jobDescription', app.jobDescription ?? ''),
    wrapUntrusted('notes', app.notes ?? ''),
  ].join('\n');
}

export function runDossier(
  client: Anthropic,
  input: DossierInput,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<DossierRawOutput> {
  return invokeOneShot({
    workflow: 'dossier',
    system: DOSSIER_SYSTEM,
    user: buildDossierUser(input),
    schema: DossierRawSchema,
    client,
    model: opts.model,
    signal: opts.signal,
    maxTokens: 8_192,
    tools: [WEB_SEARCH_TOOL],
  });
}

export function dossier(
  input: DossierInput,
  opts: CallOptions,
): Promise<DossierRawOutput> {
  return runDossier(createClient(opts.apiKey), input, opts);
}
