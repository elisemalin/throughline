// contracts/storage.ts
//
// Storage keys and the server-never-stores list. Security Agent owns
// enforcement; this file is the single source of truth.

// ---------------------------------------------------------------------------
// Client-side localStorage keys
//
// Only BYOK Anthropic key material and lightweight metadata live client-side.
// Everything else is on the server, behind authenticated routes.
// ---------------------------------------------------------------------------

export const LOCAL_STORAGE_KEYS = {
  apiKey: 'throughline:apiKey',                    // encrypted at rest via /lib/security/crypto.ts
  apiKeySalt: 'throughline:apiKeySalt',            // PBKDF2 salt for the apiKey ciphertext
  apiKeyIv: 'throughline:apiKeyIv',                // AES-GCM IV (per-write random)
  apiKeyMeta: 'throughline:apiKeyMeta',            // { last4: string; createdAt: string }
  apiKeyPassphraseHint: 'throughline:apiKeyPassphraseHint',
} as const;

export type LocalStorageKey = (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];

export type ApiKeyMeta = {
  last4: string;
  createdAt: string;                                // ISO 8601
};

// ---------------------------------------------------------------------------
// Server-never-stores list
//
// Security Agent enforces these via:
//   1. The grep rule in scripts/integrity.sh (rule 9). The grep token list
//      below is the canonical set; keep that script's pattern in sync.
//   2. A manual review of every PR touching /lib/server/, /app/api/,
//      /lib/db/, or /lib/ai/ for log statements, DB writes, or analytics
//      events that reference any token from the list.
//
// If an exception is necessary, file a proposal under
// /contracts/proposals/ — do not silently add a column or log statement.
// ---------------------------------------------------------------------------

export const SERVER_NEVER_STORES = [
  'Anthropic API keys (BYOK; ciphertext stays in browser localStorage only)',
  'Anthropic key plaintext or any partial of it beyond apiKeyMeta.last4',
  'Plaintext resume text or LinkedIn export beyond the lifetime of a single ingest request',
  'Raw prompts sent to Claude (cached server-side by SHA-256 hash only)',
  'Raw Claude responses (cached server-side by SHA-256 hash only)',
  'User passphrase or any KDF output derived from it (PBKDF2 salt is non-secret and may live in localStorage with the ciphertext)',
  'AES-GCM IV or salt in any server-side log, DB column, or analytics event',
  'Clerk session JWTs or refresh tokens beyond the cookies Clerk manages',
  'CSRF tokens beyond the lifetime of a single request',
  'Web search transcripts from the dossier workflow beyond the cache TTL',
] as const;
export type ServerNeverStoresEntry = (typeof SERVER_NEVER_STORES)[number];

// The integrity script's rule 9 greps for these tokens in source files under
// /app/api/, /lib/server/, /lib/db/, and /lib/ai/. Keep this list in sync
// with the rule's regex.
export const SERVER_NEVER_STORES_GREP_TOKENS = [
  'apiKey',
  'anthropicKey',
  'prompt',
  'completion',
  'resumeText',
  'linkedinText',
  'passphrase',
  'kdfKey',
  'apiKeyIv',
  'apiKeySalt',
] as const;
export type ServerNeverStoresGrepToken = (typeof SERVER_NEVER_STORES_GREP_TOKENS)[number];

// ---------------------------------------------------------------------------
// Server-side Redis cache key conventions
//
// AI Integration Agent uses these prefixes when writing to Upstash Redis.
// Security Agent audits that no cache value contains plaintext key material.
// ---------------------------------------------------------------------------

export const REDIS_KEY_PREFIXES = {
  aiCache: 'tl:ai:',                                // value: SHA-256 hash of (system + user + model)
  rateLimit: 'tl:rl:',                              // sliding-window rate limit per user
} as const;
