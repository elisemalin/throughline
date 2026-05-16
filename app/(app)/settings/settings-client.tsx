'use client';

// Ported from prototype/Throughline.jsx SettingsView (lines 3928-4005).
// BYOK Anthropic key entry. Encryption is delegated to /lib/security/crypto
// (Security Agent); see useApiKeyStore for the Day 2 graceful-fallback note.

import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { Button, Card, Field, Input, SectionLabel } from '@/components';
import { useApiKeyStore } from '@/stores/useApiKeyStore';
import { useToastStore } from '@/stores/useToastStore';

export function SettingsClient() {
  const meta = useApiKeyStore((s) => s.meta);
  const hydrated = useApiKeyStore((s) => s.hydrated);
  const loadMeta = useApiKeyStore((s) => s.loadMeta);
  const saveKey = useApiKeyStore((s) => s.saveKey);
  const clearKey = useApiKeyStore((s) => s.clearKey);
  const pushToast = useToastStore((s) => s.push);

  const [showKey, setShowKey] = useState(false);
  const [plaintext, setPlaintext] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  async function handleSave() {
    if (!plaintext || !passphrase) return;
    setSaving(true);
    try {
      await saveKey(plaintext, passphrase);
      pushToast('Anthropic key saved.', 'success');
      setPlaintext('');
      setPassphrase('');
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : 'Could not save key.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl text-stone-100 font-display">Settings</h1>
        <p className="text-stone-500 text-sm mt-1">
          BYOK Anthropic key. Stored encrypted in your browser; never leaves the device unencrypted.
        </p>
      </header>

      <Card className="p-5">
        <SectionLabel>Anthropic API key</SectionLabel>
        {hydrated && meta ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-300">
              <KeyRound size={14} className="inline mr-1.5 text-amber-200" aria-hidden />
              Saved key ending in{' '}
              <span className="font-mono text-amber-200">····{meta.last4}</span> · created{' '}
              {new Date(meta.createdAt).toLocaleDateString()}
            </p>
            <div>
              <Button variant="danger" size="sm" onClick={clearKey} data-testid="settings-clear-key">
                Remove key
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="API key" hint="Paste your Anthropic key; only the last 4 are stored as metadata.">
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
            <Field
              label="Passphrase"
              hint="Used to encrypt the key. Forgetting it deletes the key — there is no recovery."
            >
              <Input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="A memorable passphrase"
                autoComplete="off"
              />
            </Field>
            <div>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!plaintext || !passphrase || saving}
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
          <li>The plaintext key is encrypted with AES-GCM using a key derived from your passphrase via PBKDF2.</li>
          <li>Only the ciphertext, salt, and IV live in <span className="font-mono text-stone-200">localStorage</span>.</li>
          <li>The server never sees your key. Every AI call runs from the browser using the SDK.</li>
        </ul>
      </Card>
    </div>
  );
}
