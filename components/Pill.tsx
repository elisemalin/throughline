// Categorical badge. Day 4: drops the heavy `border + bg-X/40` look in
// favor of a lighter ring + soft background tint. Uses Fraunces small
// caps via .caption-label so it matches the rest of the new typography.

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
  neutral: 'bg-stone-800/40 text-stone-300 ring-stone-700/50',
  info: 'bg-sky-950/30 text-sky-200 ring-sky-900/40',
  accent: 'bg-amber-950/30 text-amber-200 ring-amber-800/50',
  success: 'bg-emerald-950/30 text-emerald-200 ring-emerald-900/40',
  muted: 'bg-stone-900/40 text-stone-500 ring-stone-800/40',
  warn: 'bg-rose-950/30 text-rose-200 ring-rose-900/40',
};

export type PillProps = {
  children: ReactNode;
  tone?: PillTone;
};

export function Pill({ children, tone = 'neutral' }: PillProps) {
  return (
    <span
      className={`caption-label inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ring-1 ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
