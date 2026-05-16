'use client';

// Inline passphrase-strength meter used by the Settings BYOK flow.
//
// Day 4: hand-rolled heuristic gains a denylist + keyboard-walk detector
// so common-but-long passwords ("password123", "qwerty1234") flag as
// weak. The previous version only counted length + character classes, so
// "password123" graded as "Okay" because it crossed length 8 and used
// two classes.
//
// Still no zxcvbn dependency — the heuristic stays small and explicable;
// the FLOOR.md rule is "no dependency without justification."

import { useMemo } from 'react';

type Band = {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: 'rose' | 'amber' | 'lime' | 'emerald' | 'stone';
};

// Top common-password substrings. Any passphrase containing one (case-
// insensitive) is forced to weak regardless of length / class count.
// List is deliberately short; the goal is to catch the most embarrassing
// defaults, not to ship a 10k-entry dictionary.
const COMMON_FRAGMENTS = [
  'password',
  'qwerty',
  'letmein',
  'iloveyou',
  'admin',
  'welcome',
  'dragon',
  'monkey',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'master',
  'abc123',
];

// Long sequential runs (digits or alpha) and keyboard rows; if a passphrase
// contains any of these as a substring, treat it as a predictable pattern.
const SEQUENTIAL_PATTERNS = [
  '0123456789', '9876543210',
  '12345', '23456', '34567', '45678', '56789',
  '54321', '65432', '76543', '87654', '98765',
  'abcdefg', 'abcdefghij',
  'qwerty', 'asdfgh', 'zxcvbn',
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
];

// WHY: "p@ssword" and "passw0rd" are still "password" to an attacker
// running a dictionary with common substitutions. Normalize before
// matching so the denylist doesn't have to enumerate every variation.
function normalizeLeet(input: string): string {
  return input
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/7/g, 't')
    .replace(/!/g, 'i');
}

function hasCommonFragment(lower: string): boolean {
  const normalized = normalizeLeet(lower);
  return COMMON_FRAGMENTS.some(
    (f) => lower.includes(f) || normalized.includes(f),
  );
}

function hasSequentialRun(lower: string): boolean {
  return SEQUENTIAL_PATTERNS.some((p) => lower.includes(p));
}

function isMostlyRepeating(input: string): boolean {
  if (input.length < 6) return false;
  const unique = new Set(input);
  // 6+ chars with ≤2 unique characters reads as "aaaaaa" or "abababab".
  return unique.size <= 2;
}

export function scorePassphrase(passphrase: string): Band {
  if (passphrase.length === 0) {
    return { level: 0, label: 'Enter a passphrase', tone: 'stone' };
  }
  const lower = passphrase.toLowerCase();
  if (hasCommonFragment(lower)) {
    return { level: 1, label: 'Common — too predictable', tone: 'rose' };
  }
  if (hasSequentialRun(lower)) {
    return { level: 1, label: 'Predictable pattern', tone: 'rose' };
  }
  if (isMostlyRepeating(passphrase)) {
    return { level: 1, label: 'Too repetitive', tone: 'rose' };
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
  if (len >= 16 && classes >= 3) return { level: 4, label: 'Strong', tone: 'emerald' };
  return { level: 3, label: 'Good', tone: 'lime' };
}

const TONE_CLASSES: Record<Band['tone'], { bar: string; text: string }> = {
  rose: { bar: 'bg-rose-400/80', text: 'text-rose-200' },
  amber: { bar: 'bg-amber-300/80', text: 'text-amber-200' },
  lime: { bar: 'bg-lime-300/80', text: 'text-lime-200' },
  emerald: { bar: 'bg-emerald-300/80', text: 'text-emerald-200' },
  stone: { bar: 'bg-stone-700', text: 'text-stone-500' },
};

export function PassphraseStrength({ passphrase }: { passphrase: string }) {
  const band = useMemo(() => scorePassphrase(passphrase), [passphrase]);
  const tone = TONE_CLASSES[band.tone];
  return (
    <div
      className="flex items-center gap-3"
      role="status"
      aria-live="polite"
      aria-label={`Passphrase strength: ${band.label}`}
    >
      <div className="flex gap-1.5 flex-1" aria-hidden>
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-all duration-200 ${
              band.level >= segment ? tone.bar : 'bg-stone-800/80'
            }`}
          />
        ))}
      </div>
      <span className={`caption-label ${tone.text}`}>{band.label}</span>
    </div>
  );
}
