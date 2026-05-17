'use client';

// Settings. Day 5 brutalist reskin + BYOK in-memory unlock wired so
// the api-client can forward `x-anthropic-key` on AI calls.
//
// Flows:
//   - First save: user pastes plaintext + passphrase (or opts into the
//     XOR fallback). saveKey persists the envelope AND populates the
//     in-memory plaintext cache for the session.
//   - Return session: the persisted envelope is detected; the user
//     enters their passphrase to unlock and populate the in-memory
//     cache. Fallback envelopes unlock without a passphrase.
//   - Lock: clears only the in-memory plaintext; the encrypted envelope
//     stays on disk.
//   - Remove: wipes both the envelope and the in-memory plaintext.

import { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, KeyRound, Lock, ShieldOff, Unlock } from 'lucide-react';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PassphraseStrength,
  Pill,
  RouteHeader,
  Rule,
  SectionLabel,
} from '@/components';
import { useApiKeyStore } from '@/stores/useApiKeyStore';
import { useByokKey } from '@/stores/useByokKey';
import { useToastStore } from '@/stores/useToastStore';

export function SettingsClient() {
  const meta = useApiKeyStore((s) => s.meta);
  const hydrated = useApiKeyStore((s) => s.hydrated);
  const loadMeta = useApiKeyStore((s) => s.loadMeta);
  const saveKey = useApiKeyStore((s) => s.saveKey);
  const saveKeyNoPassphrase = useApiKeyStore((s) => s.saveKeyNoPassphrase);
  const unlock = useApiKeyStore((s) => s.unlock);
  const clearKey = useApiKeyStore((s) => s.clearKey);
  const byokPlaintext = useByokKey((s) => s.plaintext);
  const setByokPlaintext = useByokKey((s) => s.setPlaintext);
  const clearByokPlaintext = useByokKey((s) => s.clear);
  const pushToast = useToastStore((s) => s.push);

  const [showKey, setShowKey] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
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
      } else {
        await saveKey(plaintext, passphrase);
      }
      // WHY: populate the in-memory cache immediately so the user can
      // generate without re-entering the passphrase after saving.
      setByokPlaintext(plaintext);
      pushToast('Key saved and unlocked for this session.', 'success');
      setPlaintext('');
      setPassphrase('');
      setUseFallback(false);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Could not save key.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlock() {
    if (!meta) return;
    setUnlocking(true);
    try {
      // Fallback envelopes ignore the passphrase argument.
      const plain = await unlock(unlockPassphrase);
      setByokPlaintext(plain);
      pushToast('Key unlocked for this session.', 'success');
      setUnlockPassphrase('');
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Unlock failed.', 'error');
    } finally {
      setUnlocking(false);
    }
  }

  function handleLock() {
    clearByokPlaintext();
    pushToast('Locked. Generation will prompt for the key again.', 'info');
  }

  function handleConfirmedClear() {
    clearKey();
    clearByokPlaintext();
    setConfirmClear(false);
    pushToast('Key removed.', 'info');
  }

  const unlocked = Boolean(byokPlaintext);

  return (
    <div className="space-y-10">
      <RouteHeader
        section="§07"
        name="SETTINGS"
        title="Settings"
        sub="Anthropic key, stored encrypted in your browser. Never leaves the device unencrypted."
      />

      <Card tone={meta ? (unlocked ? 'success' : 'accent') : 'arctic'} className="px-7 py-6">
        <SectionLabel
          ornament="◆"
          right={
            meta && (
              <div className="flex items-center gap-2">
                <Pill tone={meta.mode === 'fallback' ? 'warn' : 'success'}>
                  {meta.mode === 'fallback' ? 'Fallback' : 'Encrypted'}
                </Pill>
                <Pill tone={unlocked ? 'success' : 'muted'}>
                  {unlocked ? 'Unlocked' : 'Locked'}
                </Pill>
              </div>
            )
          }
        >
          Anthropic API key
        </SectionLabel>

        {hydrated && meta ? (
          <div className="space-y-5">
            <p className="font-mono text-sm text-stone-200 flex items-center gap-2">
              <KeyRound size={14} className="text-amber-200" aria-hidden />
              <span aria-hidden className="text-stone-700">[</span>
              sk-ant-{'····'.padEnd(8, '·')}<span className="text-amber-200">{meta.last4}</span>
              <span aria-hidden className="text-stone-700">]</span>
              <span className="text-stone-500 ml-2">
                /{new Date(meta.createdAt).toLocaleDateString()}
              </span>
            </p>

            {meta.mode === 'fallback' && (
              <p className="font-mono text-xs text-rose-200 border-2 border-rose-300/80 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  [ FALLBACK ] Key is XOR-obfuscated, not encrypted. Anyone with disk access
                  recovers the plaintext. Remove and re-save with a passphrase to upgrade.
                </span>
              </p>
            )}

            {!unlocked && meta.mode !== 'fallback' && (
              <>
                <Rule />
                <Field label="Passphrase" hint="Required to unlock the key for this session.">
                  <Input
                    type="password"
                    value={unlockPassphrase}
                    onChange={(e) => setUnlockPassphrase(e.target.value)}
                    placeholder="The passphrase you used to save the key"
                    autoComplete="off"
                  />
                </Field>
              </>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {unlocked ? (
                <Button variant="secondary" size="sm" onClick={handleLock} arrow>
                  <Lock size={13} aria-hidden /> Lock
                </Button>
              ) : meta.mode === 'fallback' ? (
                <Button
                  size="sm"
                  onClick={handleUnlock}
                  disabled={unlocking}
                  arrow
                >
                  <Unlock size={13} aria-hidden /> {unlocking ? 'Unlocking' : 'Unlock'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleUnlock}
                  disabled={!unlockPassphrase || unlocking}
                  arrow
                >
                  <Unlock size={13} aria-hidden /> {unlocking ? 'Unlocking' : 'Unlock'}
                </Button>
              )}
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
          <div className="space-y-5">
            <Field
              label="API key"
              hint="Paste your Anthropic key; only the last 4 are stored as metadata."
              required
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
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-500 hover:text-arctic-400"
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
              <span className="font-mono text-xs">
                <span className="block text-stone-100 inline-flex items-center gap-1.5">
                  <ShieldOff size={13} aria-hidden /> SKIP PASSPHRASE [INSECURE]
                </span>
                <span className="block text-stone-500 mt-1 leading-snug">
                  Stores the key with XOR obfuscation only. Use only on a device you fully
                  control.
                </span>
              </span>
            </label>

            {useFallback ? (
              <p className="font-mono text-xs text-rose-200 border-2 border-rose-300/80 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  [ FALLBACK ] Without a passphrase, your key is XOR-obfuscated only. Anyone
                  with browser disk access can recover it.
                </span>
              </p>
            ) : (
              <Field
                label="Passphrase"
                hint="Used to encrypt the key. Forgetting it deletes the key — there is no recovery."
                required
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
                arrow
              >
                {saving ? 'Saving' : 'Save key'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="px-7 py-6">
        <SectionLabel>How the key is stored</SectionLabel>
        <ul className="space-y-3 font-mono text-sm text-stone-400 leading-relaxed">
          <li className="flex items-baseline gap-3">
            <span aria-hidden className="text-amber-200/80 shrink-0">▸</span>
            <span>
              The plaintext key is encrypted with AES-GCM using a key derived from your
              passphrase via PBKDF2 (100,000 iterations, SHA-256).
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span aria-hidden className="text-amber-200/80 shrink-0">▸</span>
            <span>
              Only the ciphertext, salt, and IV live in{' '}
              <span className="text-stone-200">[ localStorage ]</span>.
            </span>
          </li>
          <li className="flex items-baseline gap-3">
            <span aria-hidden className="text-amber-200/80 shrink-0">▸</span>
            <span>The server never sees your key. Every AI call runs from the browser.</span>
          </li>
          <li className="flex items-baseline gap-3">
            <span aria-hidden className="text-amber-200/80 shrink-0">▸</span>
            <span>
              The no-passphrase fallback uses XOR with a public source-code constant — it
              only stops casual disk inspection.
            </span>
          </li>
        </ul>
      </Card>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Remove Anthropic key?"
      >
        <div className="space-y-4">
          <p className="font-mono text-sm text-stone-300 leading-relaxed">
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
