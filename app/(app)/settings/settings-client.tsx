'use client';

// Ported from prototype/Throughline.jsx SettingsView (lines 3928-4005).
// Day 3: passphrase strength meter, no-passphrase fallback toggle (with
// EXPLICIT warning copy), confirmation modal before clearKey.

import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, KeyRound, ShieldOff } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PassphraseStrength,
  Pill,
  SectionLabel,
} from '@/components';
import { useApiKeyStore } from '@/stores/useApiKeyStore';
import { useToastStore } from '@/stores/useToastStore';

export function SettingsClient() {
  const meta = useApiKeyStore((s) => s.meta);
  const hydrated = useApiKeyStore((s) => s.hydrated);
  const loadMeta = useApiKeyStore((s) => s.loadMeta);
  const saveKey = useApiKeyStore((s) => s.saveKey);
  const saveKeyNoPassphrase = useApiKeyStore((s) => s.saveKeyNoPassphrase);
  const clearKey = useApiKeyStore((s) => s.clearKey);
  const pushToast = useToastStore((s) => s.push);

  const [showKey, setShowKey] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  async function handleSave() {
    if (!plaintext) return;
    if (!useFallback && !passphrase) return;
    setSaving(true);
    try {
      if (useFallback) {
        await saveKeyNoPassphrase(plaintext);
        pushToast('Key saved (no-passphrase fallback).', 'success');
      } else {
        await saveKey(plaintext, passphrase);
        pushToast('Key saved with passphrase encryption.', 'success');
      }
      setPlaintext('');
      setPassphrase('');
      setUseFallback(false);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Could not save key.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleConfirmedClear() {
    clearKey();
    setConfirmClear(false);
    pushToast('Key removed.', 'info');
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="caption-label text-stone-500">BYOK</div>
        <h1 className="text-5xl md:text-6xl text-stone-50 font-display tracking-tight leading-[1.05]">
          Settings
        </h1>
        <p className="text-stone-400 italic max-w-xl text-sm md:text-base leading-relaxed">
          Anthropic key, stored encrypted in your browser. Never leaves the device unencrypted.
        </p>
      </header>

      <Card className="p-5">
        <SectionLabel
          right={
            meta && (
              <Pill tone={meta.mode === 'fallback' ? 'warn' : 'success'}>
                {meta.mode === 'fallback' ? 'Fallback' : 'Encrypted'}
              </Pill>
            )
          }
        >
          Anthropic API key
        </SectionLabel>
        {hydrated && meta ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-300">
              <KeyRound size={14} className="inline mr-1.5 text-amber-200" aria-hidden />
              Saved key ending in{' '}
              <span className="font-mono text-amber-200">····{meta.last4}</span> · created{' '}
              {new Date(meta.createdAt).toLocaleDateString()}
            </p>
            {meta.mode === 'fallback' && (
              <p className="text-xs text-rose-200 bg-rose-950/30 border border-rose-900 rounded-md px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  This key is XOR-obfuscated, not encrypted. Anyone with access to your
                  browser&apos;s disk storage can recover the plaintext. Add a passphrase to
                  upgrade.
                </span>
              </p>
            )}
            <div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmClear(true)}
                data-testid="settings-clear-key"
              >
                Remove key
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field
              label="API key"
              hint="Paste your Anthropic key; only the last 4 are stored as metadata."
            >
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  placeholder="sk-ant-..."
                  mono
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-amber-200"
                >
                  {showKey ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                </button>
              </div>
            </Field>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useFallback}
                onChange={(e) => setUseFallback(e.target.checked)}
                className="mt-1 accent-amber-200"
              />
              <span className="text-sm">
                <span className="block text-stone-100 inline-flex items-center gap-1.5">
                  <ShieldOff size={13} aria-hidden /> Skip passphrase (insecure)
                </span>
                <span className="block text-xs text-stone-500 mt-0.5">
                  Stores the key with XOR obfuscation only. Use only on a device you fully
                  control.
                </span>
              </span>
            </label>

            {useFallback ? (
              <p className="text-xs text-rose-200 bg-rose-950/30 border border-rose-900 rounded-md px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Without a passphrase, your key is XOR-obfuscated only. Anyone with your
                  browser disk access can recover it. The encrypted path uses AES-GCM with a
                  PBKDF2-derived key.
                </span>
              </p>
            ) : (
              <Field
                label="Passphrase"
                hint="Used to encrypt the key. Forgetting it deletes the key — there is no recovery."
              >
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="A memorable passphrase"
                    autoComplete="off"
                  />
                  <PassphraseStrength passphrase={passphrase} />
                </div>
              </Field>
            )}

            <div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!plaintext || (!useFallback && !passphrase) || saving}
                data-testid="settings-save-key"
              >
                {saving ? 'Saving...' : 'Save key'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <SectionLabel>How the key is stored</SectionLabel>
        <ul className="text-sm text-stone-400 space-y-2 list-disc pl-5">
          <li>
            The plaintext key is encrypted with AES-GCM using a key derived from your
            passphrase via PBKDF2 (100,000 iterations, SHA-256).
          </li>
          <li>
            Only the ciphertext, salt, and IV live in{' '}
            <span className="font-mono text-stone-200">localStorage</span>.
          </li>
          <li>The server never sees your key. Every AI call runs from the browser.</li>
          <li>
            The no-passphrase fallback uses XOR with a public source-code constant — it only
            stops casual disk inspection. Use a passphrase whenever possible.
          </li>
        </ul>
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Remove Anthropic key?"
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-300">
            The key, salt, IV, and metadata will be wiped from localStorage. You can save a
            new key right after — but if you have lost your passphrase, the existing
            ciphertext is unrecoverable either way.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmedClear}
              data-testid="settings-clear-confirm"
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
