// Anthropic SDK factory.
//
// The factory is intentionally a one-liner so the key path is auditable in
// one place: the BYOK apiKey arrives as a function argument, is passed to
// the SDK constructor, and never lands anywhere else (no globals, no
// process.env reads, no logging).
//
// `dangerouslyAllowBrowser: true` mirrors the BYOK posture documented in
// ARCHITECTURE.md — the same code path runs server-side from Backend Core
// route handlers (which forward the header-supplied key) and the smoke
// script (which reads `process.env.ANTHROPIC_API_KEY` only at the script
// entrypoint).

import Anthropic from '@anthropic-ai/sdk';

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

// Extracts the assembled text payload from a Claude `messages.create`
// response. Content can be a heterogeneous array (text blocks, tool_use
// blocks, etc.); for the JSON-output workflows we expect exactly one text
// block. tool_use blocks (e.g. web_search results in dossier) are filtered
// out — the final text block holds the assistant's structured output.
export function extractText(response: Anthropic.Messages.Message): string {
  const textBlocks = response.content.filter(
    (b): b is Anthropic.Messages.TextBlock => b.type === 'text',
  );
  return textBlocks.map((b) => b.text).join('');
}
