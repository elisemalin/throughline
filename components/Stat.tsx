// Numeric KPI tile used on the Dashboard. Day 4 introduces explicit
// weight differentiation: `prominence="primary"` tiles get the large
// numeral + accent bar + warm radial background; `prominence="quiet"`
// tiles render at a smaller display size and dim copy so they hold
// their place in the grid without competing.

import type { ReactNode } from 'react';
import { Card } from './Card';

export type StatProminence = 'primary' | 'quiet';

export type StatProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  prominence?: StatProminence;
  accent?: boolean; // back-compat shorthand for prominence='primary'
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
      className={isPrimary ? 'pl-6 pr-5 py-5' : 'px-5 py-4'}
    >
      <div className={`caption-label mb-2 ${isPrimary ? 'text-amber-200/80' : 'text-stone-500'}`}>
        {label}
      </div>
      <div
        className={`tab-nums font-display ${
          isPrimary
            ? 'text-5xl font-light text-amber-100'
            : 'text-3xl font-light text-stone-200'
        }`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`mt-1.5 italic ${isPrimary ? 'text-amber-200/60 text-sm' : 'text-stone-500 text-xs'}`}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}
