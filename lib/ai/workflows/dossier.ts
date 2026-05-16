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

// Default web_search budget for one dossier call. WHY 5: empirically the
// model issues 2-4 searches for a well-known company and tops out around
// 5 for an obscure one. Lowering this to e.g. 2 caps token spend per
// dossier (each tool call carries its own input/output token weight in
// the billed usage); raising it past 5 has diminishing recall.
export const DEFAULT_WEB_SEARCH_MAX_USES = 5;

function webSearchTool(maxUses: number): WebSearchTool20250305 {
  return {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: maxUses,
  };
}

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

export type DossierOpts = {
  model?: string;
  signal?: AbortSignal;
  // Per-call web_search budget. Defaults to DEFAULT_WEB_SEARCH_MAX_USES.
  // Backend Core can lower this for cost-sensitive callers (e.g. a free
  // tier) without redeploying.
  webSearchMaxUses?: number;
};

export function runDossier(
  client: Anthropic,
  input: DossierInput,
  opts: DossierOpts = {},
): Promise<DossierRawOutput> {
  const maxUses = opts.webSearchMaxUses ?? DEFAULT_WEB_SEARCH_MAX_USES;
  return invokeOneShot({
    workflow: 'dossier',
    system: DOSSIER_SYSTEM,
    user: buildDossierUser(input),
    schema: DossierRawSchema,
    client,
    model: opts.model,
    signal: opts.signal,
    maxTokens: 8_192,
    tools: [webSearchTool(maxUses)],
  });
}

export function dossier(
  input: DossierInput,
  opts: CallOptions & Pick<DossierOpts, 'webSearchMaxUses'>,
): Promise<DossierRawOutput> {
  return runDossier(createClient(opts.apiKey), input, opts);
}
