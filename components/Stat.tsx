// Brutalist stat tile. Day-5b: drops the left accent-bar pattern (no
// single-side colored borders). `prominence='primary'` swaps the Card
// tone to `accent` so the whole tile is bordered amber; `quiet` keeps
// the default stone border.

import type { ReactNode } from 'react';
import { Card } from './Card';

export type StatProminence = 'primary' | 'quiet';

export type StatProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  prominence?: StatProminence;
  // back-compat shorthand: pass `accent` for primary prominence
  accent?: boolean;
};

export function Stat({
  label,
  value,
  sub,
  prominence,
  accent = false,
}: StatProps) {
  const isPrimary = prominence === 'primary' || accent;
  return (
    <Card tone={isPrimary ? 'accent' : 'default'} className="px-5 py-6">
      <div className="flex items-center gap-2 label-mono mb-3">
        <span aria-hidden className="text-stone-700">[</span>
        <span className={isPrimary ? 'text-amber-200' : 'text-stone-500'}>{label}</span>
        <span aria-hidden className="text-stone-700">]</span>
      </div>
      <div
        className={`tab-nums font-sans font-bold leading-none ${
          isPrimary
            ? 'text-6xl md:text-7xl text-amber-200'
            : 'text-4xl md:text-5xl text-stone-100'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`mt-3 font-mono text-[11px] uppercase tracking-[0.08em] ${
            isPrimary ? 'text-amber-200/70' : 'text-stone-500'
          }`}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}
