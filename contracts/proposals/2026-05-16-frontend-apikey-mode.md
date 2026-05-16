[DECIDED: accept]

Accepted by Architect 2026-05-16. Field added to `ApiKeyMeta` in `/contracts/storage.ts` in this same PR. Frontend's local-only `throughline:apiKeyMode` shim should be removed in a follow-up commit; if it survives this PR's merge, file as Day-4 cleanup.

# Proposal: extend ApiKeyMeta with `mode`

**Date:** 2026-05-16
**Filed by:** Frontend Agent (agent/frontend/d3)
**Surfaces:** `/contracts/storage.ts`

## Problem

`stores/useApiKeyStore.ts` needs to know whether a saved BYOK key was
written via the passphrase-derived AES-GCM path
(`encryptKey(plaintext, passphrase)`) or the XOR fallback
(`noPassphraseFallback(plaintext)`) shipped in
`/lib/security/crypto.ts`. The two paths use the same on-disk shape
(`{ciphertext, iv, salt}`) by design — Security Agent's comment near
`noPassphraseFallback` explicitly says "the UI is the place that warns
the user". But the UI cannot warn what it cannot detect, and there is
currently no contract field that captures the mode.

Without `mode` the only signals available to the unlock flow are:
- Did the user enter a passphrase? (no — they may have used fallback
  and refreshed; or they may have used passphrase and forgotten it.)
- Does decryption succeed? (AES-GCM rejects the same way for "wrong
  passphrase" and "you saved with fallback" — so the UI cannot
  disambiguate at the moment of failure.)

## Proposed change

Extend `ApiKeyMeta` in `/contracts/storage.ts`:

```ts
export type ApiKeyMeta = {
  last4: string;
  createdAt: string;
  mode: 'passphrase' | 'fallback';
};
```

No other contract surface changes. `SERVER_NEVER_STORES` continues to
guarantee that none of `apiKey`, `apiKeySalt`, `apiKeyIv`, or
`apiKeyMeta` cross the server boundary.

## Interim

Day 3 ships a frontend-local equivalent at the localStorage key
`throughline:apiKeyMode`. It lives outside `LOCAL_STORAGE_KEYS` and
the frontend documents the gap in the store header. If this proposal
is accepted, the frontend folds the field into `apiKeyMeta` and the
local key is removed in the same commit.
