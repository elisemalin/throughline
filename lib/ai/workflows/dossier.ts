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
import { invokeOneShot, type ToolParam } from '../invoke';
import type { CallOptions } from '../types';

// Local mirror of Anthropic's `web_search_20250305` server tool. The SDK's
// public `Messages.Tool` union still models only client-defined tools
// (which carry an input_schema); the server-tool shape is documented at
// docs.anthropic.com/en/docs/build-with-claude/tool-use/web-search-tool.
// Pin the literal type so a future schema bump (e.g. _20260101) surfaces
// as a typecheck error rather than a silent runtime mismatch.
type WebSearchTool20250305 = {
  type: 'web_search_20250305';
  name: 'web_search';
  max_uses?: number;
  allowed_domains?: string[];
  blocked_domains?: string[];
  user_location?: { type: 'approximate'; country?: string; city?: string };
};

const WEB_SEARCH_TOOL: WebSearchTool20250305 = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 5,
};

const DOSSIER_OUTPUT_HINT = `Output JSON shape (return EXACTLY this key):
{
  "body": "<Markdown dossier as a single string, with inline source links>"
}`;

export function buildDossierUser(input: DossierInput): string {
  const app = input.application;
  return [
    'Target application context (untrusted user input):',
    wrapUntrusted('role', app.role),
    wrapUntrusted('company', app.company),
    wrapUntrusted('jobDescription', app.jobDescription ?? ''),
    wrapUntrusted('notes', app.notes ?? ''),
    '',
    DOSSIER_OUTPUT_HINT,
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
