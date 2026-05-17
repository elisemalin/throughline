// Brutalist pill — bracketed Space Mono caption inside a heavy-bordered
// block. No soft tints; tone shifts border + text colour only.

import type { ReactNode } from 'react';

export const PILL_TONES = [
  'neutral',
  'info',
  'accent',
  'success',
  'muted',
  'warn',
  'arctic',
] as const;
export type PillTone = (typeof PILL_TONES)[number];

const toneClasses: Record<PillTone, string> = {
  neutral: 'border-stone-600 text-stone-200',
  info: 'border-arctic-400 text-arctic-200',
  accent: 'border-amber-200 text-amber-200',
  success: 'border-emerald-300 text-emerald-200',
  muted: 'border-stone-800 text-stone-500',
  warn: 'border-rose-300 text-rose-200',
  arctic: 'border-arctic-400 text-arctic-200',
};

export type PillProps = {
  children: ReactNode;
  tone?: PillTone;
};

export function Pill({ children, tone = 'neutral' }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded-none font-mono text-[10px] uppercase tracking-[0.08em] ${toneClasses[tone]}`}
    >
      <span aria-hidden className="opacity-60">[</span>
      {children}
      <span aria-hidden className="opacity-60">]</span>
    </span>
  );
}
