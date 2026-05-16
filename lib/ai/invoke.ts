// Shared "run a one-shot JSON workflow" wrapper.
//
// Every one-shot workflow (alignment, resume, coverLetter, ninetyDay,
// dossier, skillsIngest) follows the same five-step recipe:
//
//   1. Hash the assembled prompt.
//   2. If the hash has a cached result, return it (no SDK call).
//   3. Call the SDK once; if the JSON parse + Zod parse succeed, cache and
//      return.
//   4. On validation failure, retry once with the validator error appended
//      to SYSTEM (see ./retry.ts).
//   5. On final success, cache and return; on second failure, throw
//      AIValidationError.
//
// Centralizing this avoids drift between workflows. mockInterview is the
// only workflow NOT routed through here — it is multi-turn and the cache
// semantics (transcript-keyed) would invite stale-state bugs.

import type Anthropic from '@anthropic-ai/sdk';
import { MODEL_DEFAULT } from '@/contracts/ai';
import { cacheGet, cacheSet } from './cache';
import { extractText } from './client';
import { recordUsage } from './cost';
import { promptHash } from './hash';
import { withValidationRetry, type SchemaWithOutput } from './retry';

// A workflow can pass either an SDK-typed client tool (which carries an
// input_schema) or a server tool like `web_search_20250305` whose shape
// the SDK's `Messages.Tool` union does not yet model. Workflows pass
// properly-typed objects; the single cast at the SDK call site below
// keeps the type-laundering narrow and auditable.
export type ToolParam =
  | Anthropic.Messages.Tool
  | { type: string; name: string; [key: string]: unknown };

export type InvokeArgs<T> = {
  workflow: string;
  system: string;
  user: string;
  schema: SchemaWithOutput<T>;
  client: Anthropic;
  model?: string;
  signal?: AbortSignal;
  maxTokens?: number;
  // Optional tools (used by dossier for web_search). Passed through to the
  // SDK as-is; not part of the cache key beyond what the system/user
  // strings already encode.
  tools?: ToolParam[];
};

// Defensive JSON extraction: the SYSTEM prompts forbid markdown fences, but
// models occasionally emit ```json ... ``` anyway. Strip a leading fence
// (and trailing fence) before parsing so a stray fence does not trigger an
// expensive retry. Anything else (preamble text, multiple JSON blobs) is
// the model's fault and falls through to the retry path.
function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

export async function invokeOneShot<T>(args: InvokeArgs<T>): Promise<T> {
  const model = args.model ?? MODEL_DEFAULT;
  const hash = promptHash(args.system, args.user, model);

  const cached = await cacheGet<T>(hash);
  if (cached !== null) {
    // Re-validate cached value through the schema so a contract change
    // does not allow a stale cache entry to leak through unchecked.
    const parsed = args.schema.safeParse(cached);
    if (parsed.success) return parsed.data;
    // Fall through to a fresh call if the cached shape no longer fits.
  }

  const callOnce = async (extraSystem: string): Promise<unknown> => {
    const response = await args.client.messages.create(
      {
        model,
        max_tokens: args.maxTokens ?? 4_096,
        system: extraSystem ? `${args.system}${extraSystem}` : args.system,
        messages: [{ role: 'user', content: args.user }],
        // Single cast: the SDK's `tools` param is typed as the narrower
        // client-tool union but accepts server-tool shapes at runtime.
        // See the ToolParam comment above.
        ...(args.tools ? { tools: args.tools as Anthropic.Messages.Tool[] } : {}),
      },
      args.signal ? { signal: args.signal } : undefined,
    );
    // Record both successful and retry calls so the cost log reflects
    // every SDK round-trip, not just the one whose output we kept.
    recordUsage(args.workflow, model, response.usage);
    const text = extractText(response);
    return tryParseJson(text);
  };

  const validated = await withValidationRetry(args.workflow, args.schema, callOnce);
  await cacheSet(hash, validated);
  return validated;
}
