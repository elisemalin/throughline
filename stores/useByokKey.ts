'use client';

// In-memory cache for the unlocked BYOK Anthropic key.
//
// HARD INVARIANT: the plaintext key lives only in module-local state +
// transient store state; it never touches localStorage and never enters
// the Zustand devtools-visible state by itself. Settings's "Unlock" flow
// writes it here; AI hooks read it via `useByokKey()` and pass it to
// the api-client. The store clears on tab close (no persist middleware).
//
// WHY a separate store from useApiKeyStore: the encrypted envelope and
// metadata are persistent + safe to put on disk. The plaintext is not —
// it must remain in-memory only and out of any persistence layer.

import { create } from 'zustand';

export type ByokKeyState = {
  plaintext: string | null;
  setPlaintext: (value: string | null) => void;
  clear: () => void;
};

export const useByokKey = create<ByokKeyState>((set) => ({
  plaintext: null,
  setPlaintext: (value) => set({ plaintext: value }),
  clear: () => set({ plaintext: null }),
}));

// Helper for query hooks to pull the key and throw the same error code
// the server emits if the user has not unlocked. Callers don't need
// their own branch.
export function readByokKeyOrThrow(): string {
  const key = useByokKey.getState().plaintext;
  if (!key) {
    const error = new Error(
      'Anthropic key is locked. Unlock from Settings before generating.',
    );
    (error as Error & { code?: string }).code = 'missing_anthropic_key';
    throw error;
  }
  return key;
}
