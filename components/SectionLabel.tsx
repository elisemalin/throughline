// Uppercase Fraunces caption used as the visual heading of every Card
// section. Day 4: drops `font-mono` for `.caption-label` so the entire
// caption system shares the new typography rather than dragging
// JetBrains Mono into the build.

import type { ReactNode } from 'react';

export type SectionLabelProps = {
  children: ReactNode;
  right?: ReactNode;
};

export function SectionLabel({ children, right }: SectionLabelProps) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h3 className="caption-label text-stone-500">{children}</h3>
      {right}
    </div>
  );
}
