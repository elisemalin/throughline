// Dark editorial card surface lifted from prototype/Throughline.jsx lines 740-748.

import type { ElementType, ReactNode } from 'react';

export type CardProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
};

export function Card({ children, className = '', as: As = 'div' }: CardProps) {
  return (
    <As
      className={`bg-stone-950/60 border border-stone-800/80 rounded-sm ${className}`}
    >
      {children}
    </As>
  );
}
