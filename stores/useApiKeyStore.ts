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
//                         UI warns and the contract proposal at
//                         /contracts/proposals/2026-05-16-frontend-apikey-mode.md
//                         tracks the mode field formally).
//
// Day 3 interim: the mode is persisted under the frontend-local key
// `throughline:apiKeyMode` until that proposal is accepted into
// /contracts/storage.ts as ApiKeyMeta.mode.

import { create } from 'zustand';
import { LOCAL_STORAGE_KEYS, type ApiKeyMeta } from '@/contracts/storage';

export type ApiKeyMode = 'passphrase' | 'fallback';

// WHY frontend-local: see /contracts/proposals/2026-05-16-frontend-apikey-mode.md.
const APIKEY_MODE_KEY = 'throughline:apiKeyMode';

export type ApiKeyState = {
  meta: ApiKeyMeta | null;
  mode: ApiKeyMode | null;
  hydrated: boolean;
  loadMeta: () => void;
  saveKey: (plaintext: string, passphrase: string) => Promise<void>;
  saveKeyNoPassphrase: (plaintext: string) => Promise<void>;
  unlock: (passphrase: string) => Promise<string>;
  clearKey: () => void;
};

type CryptoModule = {
  encryptKey: (
    plaintext: string,
    passphrase: string,
  ) => Promise<{ ciphertext: string; iv: string; salt: string }>;
  decryptKey: (
    ciphertext: string,
    iv: string,
    salt: string,
    passphrase: string,
  ) => Promise<string>;
  noPassphraseFallback: (
    plaintext: string,
  ) => { ciphertext: string; iv: string; salt: string };
  decryptNoPassphraseFallback: (ciphertext: string) => string;
};

async function loadCrypto(): Promise<CryptoModule> {
  try {
    const mod = await import('@/lib/security/crypto');
    return mod as CryptoModule;
  } catch {
    throw new Error('BYOK crypto helpers failed to load (/lib/security/crypto.ts).');
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

function readModeFromStorage(): ApiKeyMode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(APIKEY_MODE_KEY);
  return raw === 'passphrase' || raw === 'fallback' ? raw : null;
}

function persistEnvelope(
  envelope: { ciphertext: string; iv: string; salt: string },
  plaintext: string,
  mode: ApiKeyMode,
): ApiKeyMeta {
  const meta: ApiKeyMeta = {
    last4: plaintext.slice(-4),
    createdAt: new Date().toISOString(),
  };
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKey, envelope.ciphertext);
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeySalt, envelope.salt);
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeyIv, envelope.iv);
  window.localStorage.setItem(LOCAL_STORAGE_KEYS.apiKeyMeta, JSON.stringify(meta));
  window.localStorage.setItem(APIKEY_MODE_KEY, mode);
  return meta;
}

function clearStorage(): void {
  if (typeof window === 'undefined') return;
  const keys = [
    LOCAL_STORAGE_KEYS.apiKey,
    LOCAL_STORAGE_KEYS.apiKeySalt,
    LOCAL_STORAGE_KEYS.apiKeyIv,
    LOCAL_STORAGE_KEYS.apiKeyMeta,
    APIKEY_MODE_KEY,
  ];
  keys.forEach((k) => window.localStorage.removeItem(k));
}

export const useApiKeyStore = create<ApiKeyState>((set) => ({
  meta: null,
  mode: null,
  hydrated: false,
  loadMeta: () => {
    const meta = readMetaFromStorage();
    const mode = meta ? (readModeFromStorage() ?? 'passphrase') : null;
    set({ meta, mode, hydrated: true });
  },
  saveKey: async (plaintext, passphrase) => {
    const crypto = await loadCrypto();
    const envelope = await crypto.encryptKey(plaintext, passphrase);
    const meta = persistEnvelope(envelope, plaintext, 'passphrase');
    set({ meta, mode: 'passphrase' });
  },
  saveKeyNoPassphrase: async (plaintext) => {
    const crypto = await loadCrypto();
    const envelope = crypto.noPassphraseFallback(plaintext);
    const meta = persistEnvelope(envelope, plaintext, 'fallback');
    set({ meta, mode: 'fallback' });
  },
  unlock: async (passphrase) => {
    const ciphertext = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKey);
    const salt = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeySalt);
    const iv = window.localStorage.getItem(LOCAL_STORAGE_KEYS.apiKeyIv);
    if (!ciphertext || !salt || !iv) {
      throw new Error('No saved Anthropic key. Add one in Settings first.');
    }
    const mode = readModeFromStorage() ?? 'passphrase';
    const crypto = await loadCrypto();
    if (mode === 'fallback') {
      return crypto.decryptNoPassphraseFallback(ciphertext);
    }
    return crypto.decryptKey(ciphertext, iv, salt, passphrase);
  },
  clearKey: () => {
    clearStorage();
    set({ meta: null, mode: null });
  },
}));
