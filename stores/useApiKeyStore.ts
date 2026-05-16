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
// Two write paths:
//   - mode = 'passphrase' uses encryptKey/decryptKey (AES-GCM 256, PBKDF2)
//   - mode = 'fallback'   uses noPassphraseFallback (XOR obfuscation; the
//                         UI warns the user)
//
// Day 4: the frontend-local `throughline:apiKeyMode` shim is gone.
// /contracts/proposals/2026-05-16-frontend-apikey-mode.md was accepted on
// main; `mode` is now part of ApiKeyMeta in /contracts/storage.ts. Reading
// or writing the mode flag goes through `meta.mode` exclusively.

import { create } from 'zustand';
import {
  decryptKey,
  decryptNoPassphraseFallback,
  encryptKey,
  noPassphraseFallback,
} from '@/lib/security/crypto';
import { LOCAL_STORAGE_KEYS, type ApiKeyMeta } from '@/contracts/storage';

export type ApiKeyMode = ApiKeyMeta['mode'];

export type ApiKeyState = {
  meta: ApiKeyMeta | null;
  hydrated: boolean;
  loadMeta: () => void;
  saveKey: (plaintext: string, passphrase: string) => Promise<void>;
  saveKeyNoPassphrase: (plaintext: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<string>;
  clearKey: () => void;
};

function readMetaFromStorage(): ApiKeyMeta | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeyMeta);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiKeyMeta;
    if (
      typeof parsed?.last4 !== 'string' ||
      typeof parsed?.createdAt !== 'string' ||
      (parsed?.mode !== 'passphrase' && parsed?.mode !== 'fallback')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistEnvelope(
  envelope: { ciphertext: string; iv: string; salt: string },
  plaintext: string,
  mode: ApiKeyMode,
): ApiKeyMeta {
  const meta: ApiKeyMeta = {
    last4: plaintext.slice(-4),
    createdAt: new Date().toISOString(),
    mode,
  };
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKey, envelope.ciphertext);
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeySalt, envelope.salt);
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeyIv, envelope.iv);
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeyMeta, JSON.stringify(meta));
  return meta;
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

export const useApiKeyStore = create<ApiKeyState>((set, get) => ({
  meta: null,
  hydrated: false,
  loadMeta: () => {
    const meta = readMetaFromStorage();
    set({ meta, hydrated: true });
  },
  saveKey: async (plaintext, passphrase) => {
    const envelope = await encryptKey(plaintext, passphrase);
    const meta = persistEnvelope(envelope, plaintext, 'passphrase');
    set({ meta });
  },
  saveKeyNoPassphrase: async (plaintext) => {
    const envelope = noPassphraseFallback(plaintext);
    const meta = persistEnvelope(envelope, plaintext, 'fallback');
    set({ meta });
  },
  unlock: async (passphrase) => {
    const ciphertext = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKey);
    const salt = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeySalt);
    const iv = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeyIv);
    if (!ciphertext || !salt || !iv) {
      throw new Error('No saved Anthropic key. Add one in Settings first.');
    }
    const mode = get().meta?.mode ?? 'passphrase';
    if (mode === 'fallback') {
      return decryptNoPassphraseFallback(ciphertext);
    }
    return decryptKey(ciphertext, iv, salt, passphrase);
  },
  clearKey: () => {
    clearStorage();
    set({ meta: null });
  },
}));
