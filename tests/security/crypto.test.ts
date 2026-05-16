// Crypto round-trip + failure-mode tests.
//
// WHY env=node: vitest's node runner exposes SubtleCrypto via globalThis
// in Node 22, which matches the browser API our crypto.ts targets. No
// jsdom needed.

import { describe, expect, it } from 'vitest';
import {
  decryptKey,
  decryptNoPassphraseFallback,
  encryptKey,
  noPassphraseFallback,
} from '@/lib/security/crypto';

describe('encryptKey / decryptKey', () => {
  it('round-trips a plaintext through the passphrase path', async () => {
    const plaintext = 'sk-ant-api03-test-key-with-padding-1234567890';
    const passphrase = 'correct horse battery staple';
    const env = await encryptKey(plaintext, passphrase);
    const recovered = await decryptKey(env.ciphertext, env.iv, env.salt, passphrase);
    expect(recovered).toBe(plaintext);
  });

  it('produces a different ciphertext on every write (random IV + salt)', async () => {
    const plaintext = 'sk-ant-api03-test';
    const passphrase = 'pp';
    const a = await encryptKey(plaintext, passphrase);
    const b = await encryptKey(plaintext, passphrase);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
    expect(a.salt).not.toBe(b.salt);
  });

  it('throws on wrong passphrase', async () => {
    const env = await encryptKey('secret', 'right-passphrase');
    await expect(
      decryptKey(env.ciphertext, env.iv, env.salt, 'wrong-passphrase'),
    ).rejects.toThrow(/wrong passphrase/);
  });

  it('throws on tampered ciphertext', async () => {
    const env = await encryptKey('secret', 'pp');
    // Flip the last base64 group to mangle the GCM tag.
    const tampered = env.ciphertext.slice(0, -4) + 'AAAA';
    await expect(
      decryptKey(tampered, env.iv, env.salt, 'pp'),
    ).rejects.toThrow(/wrong passphrase|corrupted/);
  });
});

describe('noPassphraseFallback', () => {
  it('round-trips through the XOR fallback', () => {
    const plaintext = 'sk-ant-api03-fallback-test';
    const env = noPassphraseFallback(plaintext);
    const recovered = decryptNoPassphraseFallback(env.ciphertext);
    expect(recovered).toBe(plaintext);
  });

  it('matches the EncryptedKey shape so callers do not branch', () => {
    const env = noPassphraseFallback('x');
    expect(env).toHaveProperty('ciphertext');
    expect(env).toHaveProperty('iv');
    expect(env).toHaveProperty('salt');
    expect(typeof env.ciphertext).toBe('string');
    expect(typeof env.iv).toBe('string');
    expect(typeof env.salt).toBe('string');
  });
});
