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

// SkillsDB ingest output mirrors SkillsDBSchema minus server-set fields
// (id, ownerId, updatedAt). Listing every field here is verbose but
// prevents the model from inventing alternative names like "name" instead
// of "fullName" (alignment wandered on field names in the 2026-05-16 live
// smoke; this hint guards against the same pattern here).
const INGEST_OUTPUT_HINT = `Output JSON shape (return EXACTLY these keys; empty array / "" for missing fields):
{
  "fullName": "<full name>",
  "headline": "<one-line headline>",
  "positioning": "<1-2 sentence positioning>",
  "contact": { "email": "<email>", "phone": "<phone>", "location": "<location>", "linkedin": "<url>", "site": "<url>" },
  "targetRoles": ["<role>", ...],
  "awards": ["<award>", ...],
  "jobs": [
    {
      "id": "J01",
      "employer": "<employer>",
      "title": "<title>",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "location": "<location>",
      "industry": "<industry>",
      "summary": "<summary>",
      "projects": [
        {
          "id": "P01",
          "name": "<project name>",
          "problem": "<problem>",
          "actions": ["<action>", ...],
          "result": "<result>",
          "metrics": { "<key>": "<value>" },
          "scope": "<scope>",
          "skills": ["<skill>", ...],
          "tools": ["<tool>", ...],
          "methods": ["<method>", ...],
          "domain": "<domain>",
          "keywords": ["<keyword>", ...],
          "recency": <integer 1-5>,
          "relevance": ["<tag>", ...],
          "confidence": <number 0.0-1.0>
        }
      ]
    }
  ],
  "coreSkills": ["<skill>", ...],
  "tools": ["<tool>", ...],
  "methods": ["<method>", ...],
  "domains": ["<domain>", ...],
  "keywords": ["<keyword>", ...],
  "warnings": ["<short string flagging anything ambiguous you had to decide>", ...]
}

For the warnings array specifically: each entry is one short sentence (max 500 chars) describing a parse-time ambiguity, a missing field you defaulted, a duplicate you collapsed, or a normalization choice you made. Empty array if the parse was clean. Examples: "could not extract end date for J02", "collapsed duplicate skill entries (Python listed twice)", "resume contained 12 jobs; only the most recent 20 are kept".`;

export function buildIngestUser(input: IngestInput): string {
  const blocks: string[] = [
    'Resume text (untrusted user input):',
    wrapUntrusted('resume', input.resumeText),
  ];
  if (input.linkedinText) {
    blocks.push('', 'LinkedIn export (untrusted user input):');
    blocks.push(wrapUntrusted('linkedin', input.linkedinText));
  }
  blocks.push('', INGEST_OUTPUT_HINT);
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
