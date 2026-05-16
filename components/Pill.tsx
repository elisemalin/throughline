// Tone-coded badge lifted from prototype/Throughline.jsx lines 722-738.
// Used everywhere a small categorical status, skill, or count appears.

import type { ReactNode } from 'react';

export const PILL_TONES = [
  'neutral',
  'info',
  'accent',
  'success',
  'muted',
  'warn',
] as const;
export type PillTone = (typeof PILL_TONES)[number];

const toneClasses: Record<PillTone, string> = {
  neutral: 'bg-stone-800/60 text-stone-300 border-stone-700',
  info: 'bg-sky-950/40 text-sky-200 border-sky-900',
  accent: 'bg-amber-900/30 text-amber-200 border-amber-800/60',
  success: 'bg-emerald-950/40 text-emerald-200 border-emerald-900',
  muted: 'bg-stone-900/60 text-stone-500 border-stone-800',
  warn: 'bg-rose-950/40 text-rose-200 border-rose-900',
};

export type PillProps = {
  children: ReactNode;
  tone?: PillTone;
};

export function Pill({ children, tone = 'neutral' }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border text-[10px] uppercase tracking-[0.12em] font-mono ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
