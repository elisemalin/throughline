// Brutalist stat tile — huge Space Grotesk tabular numeral with a
// bracketed Space Mono caption above. `prominence='primary'` keeps the
// 6xl numeral + amber accent bar; `prominence='quiet'` drops to 4xl
// stone-200 with a thin top rule instead of a left bar.

import type { ReactNode } from 'react';
import { Card } from './Card';

export type StatProminence = 'primary' | 'quiet';

export type StatProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  prominence?: StatProminence;
  // back-compat shorthand: pass `accent` to render the primary treatment
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
    <Card
      accent={isPrimary ? 'amber' : 'none'}
      topRule={!isPrimary}
      className={isPrimary ? 'pl-6 pr-5 py-6' : 'px-5 py-5'}
    >
      <div className="flex items-center gap-2 label-mono text-stone-500 mb-3">
        <span aria-hidden className="text-stone-700">[</span>
        <span className={isPrimary ? 'text-amber-200/80' : ''}>{label}</span>
        <span aria-hidden className="text-stone-700">]</span>
      </div>
      <div
        className={`tab-nums font-sans font-bold leading-none ${
          isPrimary ? 'text-6xl md:text-7xl text-amber-200' : 'text-4xl md:text-5xl text-stone-100'
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
