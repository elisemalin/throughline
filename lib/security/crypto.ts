// BYOK key encryption at rest in browser storage.
//
// WHY: Throughline never sends the Anthropic API key to our server. The
// ciphertext, salt, and IV live in browser localStorage (keys defined in
// /contracts/storage.ts). XSS in our own origin is the residual attack —
// mitigated by middleware.security.ts CSP, with this passphrase-derived
// encryption as the second layer.
//
// Algorithm choices (PBKDF2-SHA256, 100k iterations, AES-GCM 256, random
// 16-byte salt, random 12-byte IV per write) follow the .claude-roles/security
// floor; they are the OWASP-recommended baselines, not bespoke tuning.

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;                                  // AES-GCM convention
const AES_KEY_BITS = 256;

export type EncryptedKey = {
  ciphertext: string;                                 // base64
  iv: string;                                         // base64
  salt: string;                                       // base64
};

// ---------------------------------------------------------------------------
// Base64 helpers
//
// WHY: SubtleCrypto produces ArrayBuffer; localStorage stores strings. We
// could JSON.stringify a Uint8Array but the round-trip is lossy in older
// browsers, so we encode to base64 explicitly.
// ---------------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  // btoa is present in browsers and Node 16+; Buffer is the Node-only path
  // we avoid so this file remains cleanly browser-portable.
  return typeof btoa === 'function'
    ? btoa(binary)
    : Buffer.from(bytes).toString('base64');
}

function fromBase64(b64: string): Uint8Array {
  const binary =
    typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getSubtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c || !c.subtle) {
    throw new Error('SubtleCrypto is unavailable in this runtime');
  }
  return c.subtle;
}

// ---------------------------------------------------------------------------
// Key derivation
//
// WHY exported: tests assert that the same passphrase + salt yields the
// same derived key bits, which is the property PBKDF2 must guarantee.
// ---------------------------------------------------------------------------

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const passphraseKey = await subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: AES_KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ---------------------------------------------------------------------------
// Encrypt / decrypt
// ---------------------------------------------------------------------------

export async function encryptKey(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedKey> {
  const subtle = getSubtle();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const cipherBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    ciphertext: toBase64(new Uint8Array(cipherBuf)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
}

export async function decryptKey(
  ciphertext: string,
  iv: string,
  salt: string,
  passphrase: string,
): Promise<string> {
  const subtle = getSubtle();
  const key = await deriveKey(passphrase, fromBase64(salt));
  let plainBuf: ArrayBuffer;
  try {
    plainBuf = await subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv) as unknown as BufferSource },
      key,
      fromBase64(ciphertext) as unknown as BufferSource,
    );
  } catch {
    // WHY: AES-GCM rejects on wrong key OR tampered ciphertext with the same
    // OperationError. The UI surfaces "wrong passphrase" because that is the
    // overwhelmingly likely cause; the ciphertext lives in the user's own
    // localStorage and is not exposed to a tamperer in our threat model.
    throw new Error('decryptKey: wrong passphrase or corrupted ciphertext');
  }
  return new TextDecoder().decode(plainBuf);
}

// ---------------------------------------------------------------------------
// No-passphrase fallback
//
// WHY: Users who refuse to set a passphrase get a deliberately weak XOR
// obfuscation. The output shape matches EncryptedKey so callers do not
// branch — the UI is the place that warns the user, and /docs/threat-model.md
// documents that this mode only stops casual disk inspection.
//
// FALLBACK_KEY is a constant in source code. That is the point: an attacker
// who can read the user's localStorage can also read this file, so the secret
// is not in the key but in the user's informed decision to opt in.
// ---------------------------------------------------------------------------

const FALLBACK_KEY = 'throughline-no-passphrase-fallback-v1';

function xorBytes(input: Uint8Array, key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    out[i] = input[i]! ^ keyBytes[i % keyBytes.length]!;
  }
  return out;
}

export function noPassphraseFallback(plaintext: string): EncryptedKey {
  const ptBytes = new TextEncoder().encode(plaintext);
  const ct = xorBytes(ptBytes, FALLBACK_KEY);
  // WHY: salt and iv are still generated so the on-disk shape matches the
  // strong path; reading code never has to distinguish modes by shape, only
  // by an `apiKeyMeta.mode` flag the UI sets.
  return {
    ciphertext: toBase64(ct),
    iv: toBase64(crypto.getRandomValues(new Uint8Array(IV_BYTES))),
    salt: toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES))),
  };
}

export function decryptNoPassphraseFallback(ciphertext: string): string {
  const ct = fromBase64(ciphertext);
  const pt = xorBytes(ct, FALLBACK_KEY);
  return new TextDecoder().decode(pt);
}
