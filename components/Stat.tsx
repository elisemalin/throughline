// Numeric KPI tile used on the Dashboard. Wraps Card.
// Lifted from prototype/Throughline.jsx lines 761-776.

import type { ReactNode } from 'react';
import { Card } from './Card';

export type StatProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
};

export function Stat({ label, value, sub, accent = false }: StatProps) {
  return (
    <Card className="p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono mb-2">
        {label}
      </div>
      <div
        className={`text-4xl font-light tabular-nums font-display ${accent ? 'text-amber-200' : 'text-stone-100'}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-stone-500 mt-1 font-mono">{sub}</div>}
    </Card>
  );
}
