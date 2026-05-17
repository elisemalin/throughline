// Bracketed Space Mono section label. Replaces the prior `.caption-label`
// pattern; the brackets are part of the rendering rather than the copy.

import type { ReactNode } from 'react';

export type SectionLabelProps = {
  children: ReactNode;
  right?: ReactNode;
  ornament?: string;
};

export function SectionLabel({
  children,
  right,
  ornament = '◆',
}: SectionLabelProps) {
  return (
    <div className="flex items-baseline justify-between mb-4 gap-3">
      <h3 className="label-mono flex items-center gap-2 text-stone-400">
        <span aria-hidden className="text-amber-200/80">{ornament}</span>
        <span aria-hidden className="text-stone-700">[</span>
        <span>{children}</span>
        <span aria-hidden className="text-stone-700">]</span>
      </h3>
      {right}
    </div>
  );
}
