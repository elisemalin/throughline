// contracts/storage.ts
//
// Storage keys and the server-never-stores list. Security Agent owns
// enforcement; this file is the single source of truth.

// ---------------------------------------------------------------------------
// Client-side localStorage keys
//
// Only the BYOK Anthropic key lives client-side. Everything else is on
// the server, behind authenticated routes.
// ---------------------------------------------------------------------------

export const LOCAL_STORAGE_KEYS = {
  apiKey: 'throughline:apiKey',           // encrypted at rest via /lib/security/crypto.ts
  apiKeyMeta: 'throughline:apiKeyMeta',   // { last4: string; createdAt: string }
  apiKeyPassphraseHint: 'throughline:apiKeyPassphraseHint', // optional reminder shown if decrypt fails
} as const;

export type LocalStorageKey = (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];

// ---------------------------------------------------------------------------
// Client API key metadata
// ---------------------------------------------------------------------------

export type ApiKeyMeta = {
  last4: string;
  createdAt: string;                      // ISO 8601
};

// ---------------------------------------------------------------------------
// Server-never-stores list
//
// Security Agent enforces these via:
//   1. The grep rule in scripts/integrity.sh (rule 9)
//   2. A manual review of every PR touching /lib/server/, /app/api/, or /lib/db/
//
// If you believe an exception is necessary, file a proposal under
// /contracts/proposals/ — do not silently add a column or log statement.
// ---------------------------------------------------------------------------

export const SERVER_NEVER_STORES: readonly string[] = [
  'Anthropic API keys (BYOK; stays in browser only)',
  'Raw prompts sent to Claude (cached by hash only)',
  'Raw Claude responses (cached by hash only)',
  'User passphrase or any value derived from it',
] as const;

// ---------------------------------------------------------------------------
// Server-side Redis cache key conventions
//
// AI Integration Agent uses these prefixes when writing to Upstash Redis.
// Security Agent audits that no cache value contains plaintext key material.
// ---------------------------------------------------------------------------

export const REDIS_KEY_PREFIXES = {
  // SHA-256 hash of (system + user prompt + model)
  aiCache: 'tl:ai:',
  // sliding-window rate limit per user
  rateLimit: 'tl:rl:',
} as const;
