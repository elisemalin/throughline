'use client';

// Inline passphrase-strength meter used by the Settings BYOK flow. We
// hand-roll a four-band score (counts character classes, applies a length
// floor) rather than pull in zxcvbn — the FLOOR.md rule is "no dependency
// without justification" and zxcvbn's ~400KB matrix is far too heavy for
// the four buckets we need here.

import { useMemo } from 'react';

type Band = {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: 'rose' | 'amber' | 'lime' | 'emerald' | 'stone';
};

function score(passphrase: string): Band {
  if (passphrase.length === 0) {
    return { level: 0, label: 'Enter a passphrase', tone: 'stone' };
  }
  let classes = 0;
  if (/[a-z]/.test(passphrase)) classes++;
  if (/[A-Z]/.test(passphrase)) classes++;
  if (/[0-9]/.test(passphrase)) classes++;
  if (/[^a-zA-Z0-9]/.test(passphrase)) classes++;

  const len = passphrase.length;
  if (len < 8) return { level: 1, label: 'Too short (under 8)', tone: 'rose' };
  if (len < 12 && classes < 2) return { level: 1, label: 'Weak — add length', tone: 'rose' };
  if (len < 12) return { level: 2, label: 'Okay — under 12 chars', tone: 'amber' };
  if (classes < 2) return { level: 2, label: 'Add character variety', tone: 'amber' };
  if (classes < 3) return { level: 3, label: 'Good', tone: 'lime' };
  if (len >= 16 && classes >= 3) return { level: 4, label: 'Strong', tone: 'emerald' };
  return { level: 3, label: 'Good', tone: 'lime' };
}

const TONE_CLASSES: Record<Band['tone'], { bar: string; text: string }> = {
  rose: { bar: 'bg-rose-400/70', text: 'text-rose-200' },
  amber: { bar: 'bg-amber-300/70', text: 'text-amber-200' },
  lime: { bar: 'bg-lime-300/70', text: 'text-lime-200' },
  emerald: { bar: 'bg-emerald-300/70', text: 'text-emerald-200' },
  stone: { bar: 'bg-stone-700', text: 'text-stone-500' },
};

export function PassphraseStrength({ passphrase }: { passphrase: string }) {
  const band = useMemo(() => score(passphrase), [passphrase]);
  const tone = TONE_CLASSES[band.tone];
  return (
    <div
      className="flex items-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={`Passphrase strength: ${band.label}`}
    >
      <div className="flex gap-1 flex-1" aria-hidden>
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${
              band.level >= segment ? tone.bar : 'bg-stone-800'
            }`}
          />
        ))}
      </div>
      <span className={`text-[10px] uppercase tracking-[0.2em] font-mono ${tone.text}`}>
        {band.label}
      </span>
    </div>
  );
}
