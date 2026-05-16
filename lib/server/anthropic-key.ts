// BYOK Anthropic key extraction for AI-generation routes.
//
// WHY: Throughline ships a BYOK Anthropic flow — the user's key lives in
// browser localStorage (encrypted at rest), and Frontend forwards it on
// every AI request via the `x-anthropic-key` header. The server never sees
// the key in any cookie, body, or persisted column. This helper centralizes
// the read so every AI route returns the same 400 shape when the header is
// absent and so the SERVER_NEVER_STORES policy has exactly one read site to
// audit. See contracts/storage.ts for the full never-stores list.

import { jsonError } from './response';

export function requireAnthropicKey(req: Request): Response | string {
  const key = req.headers.get('x-anthropic-key');
  if (!key || key.trim() === '') {
    return jsonError(
      400,
      'missing_anthropic_key',
      'AI routes require an x-anthropic-key request header (BYOK).',
    );
  }
  return key;
}
