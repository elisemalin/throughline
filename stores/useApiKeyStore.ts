'use client';

// BYOK Anthropic key state.
//
// HARD INVARIANT: this store never holds plaintext key material in its
// committed state. The encrypted ciphertext lives in localStorage at
// LOCAL_STORAGE_KEYS.apiKey and is only decrypted into a short-lived
// in-memory variable when an AI call is about to run. Even that decrypted
// copy lives outside the Zustand state to keep it out of devtools snapshots.
//
// Crypto comes from /lib/security/crypto.ts (owned by Security Agent).
// Day 2 carry-over: that module is not yet shipped. Until it lands the
// `unlock`/`saveKey` mutations fail loudly via `cryptoUnavailableError`,
// which the Settings UI surfaces. See KNOWN_DEBT in the Day 2 PR.

import { create } from 'zustand';
import { LOCAL_STORAGE_KEYS, type ApiKeyMeta } from '@/contracts/storage';

export type ApiKeyState = {
  meta: ApiKeyMeta | null;
  hydrated: boolean;
  loadMeta: () => void;
  saveKey: (plaintext: string, passphrase: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<string>;
  clearKey: () => void;
};

type CryptoModule = {
  encryptKey: (
    plaintext: string,
    passphrase: string,
  ) => Promise<{ ciphertext: string; salt: string; iv: string }>;
  decryptKey: (
    ciphertext: string,
    passphrase: string,
    salt: string,
    iv: string,
  ) => Promise<string>;
};

// WHY: /lib/security/crypto.ts is owned by Security Agent and may not be
// present during the parallel sprint. Resolve lazily so this store can
// hydrate from localStorage without crashing the bundle when the module is
// missing; surface a clear error at the moment the user attempts an action
// that actually requires crypto.
async function loadCrypto(): Promise<CryptoModule> {
  try {
    // @ts-expect-error -- /lib/security/crypto.ts is shipped by Security
    //   Agent on a later day; resolved lazily so a missing module is a
    //   runtime error, not a typecheck failure.
    const mod = await import('@/lib/security/crypto');
    return mod as CryptoModule;
  } catch {
    throw new Error(
      'BYOK crypto helpers are not yet available (Security Agent ships /lib/security/crypto.ts).',
    );
  }
}

function readMetaFromStorage(): ApiKeyMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeyMeta);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiKeyMeta;
    if (typeof parsed?.last4 !== 'string' || typeof parsed?.createdAt !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearStorage(): void {
  if (typeof window === 'undefined') return;
  const keys = [
    LOCAL_STORAGE_KEYS.apiKey,
    LOCAL_STORAGE_KEYS.apiKeySalt,
    LOCAL_STORAGE_KEYS.apiKeyIv,
    LOCAL_STORAGE_KEYS.apiKeyMeta,
  ];
  keys.forEach((k) => window.localStorage.removeItem(k));
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  meta: null,
  hydrated: false,
  loadMeta: () => {
    const meta = readMetaFromStorage();
    set({ meta, hydrated: true });
  },
  saveKey: async (plaintext, passphrase) => {
    const crypto = await loadCrypto();
    const { ciphertext, salt, iv } = await crypto.encryptKey(plaintext, passphrase);
    const meta: ApiKeyMeta = {
      last4: plaintext.slice(-4),
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKey, ciphertext);
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeySalt, salt);
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeyIv, iv);
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeyMeta, JSON.stringify(meta));
    set({ meta });
  },
  unlock: async (passphrase) => {
    const ciphertext = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKey);
    const salt = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeySalt);
    const iv = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeyIv);
    if (!ciphertext || !salt || !iv) {
      throw new Error('No saved Anthropic key. Add one in Settings first.');
    }
    const crypto = await loadCrypto();
    return crypto.decryptKey(ciphertext, passphrase, salt, iv);
  },
  clearKey: () => {
    clearStorage();
    set({ meta: null });
  },
}));
