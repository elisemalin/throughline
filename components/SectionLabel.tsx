// Uppercase mono-cap label used as the visual heading of every Card section.
// Lifted from prototype/Throughline.jsx lines 750-759.

import type { ReactNode } from 'react';

export type SectionLabelProps = {
  children: ReactNode;
  right?: ReactNode;
};

export function SectionLabel({ children, right }: SectionLabelProps) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-mono">
        {children}
      </h3>
      {right}
    </div>
  );
}
