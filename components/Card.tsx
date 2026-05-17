// Brutalist card. Day 5 reset:
//   - Flat opaque surface (no translucent gradient, no backdrop-blur).
//   - Heavy 2px border, full perimeter. `tone` shifts the border colour.
//     Single-side decorative borders (top accents, left accent bars) are
//     out — the user called them "border-left or border-top shit".
//     A colored surface is fully bordered.
//   - Sharp corners by default.

import type { ElementType, ReactNode } from 'react';

export type CardTone = 'default' | 'urgent' | 'success' | 'arctic' | 'accent';

export type CardProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  tone?: CardTone;
};

const TONE_BORDER: Record<CardTone, string> = {
  default: 'border-stone-700',
  urgent: 'border-rose-300',
  success: 'border-emerald-300',
  arctic: 'border-arctic-400',
  accent: 'border-amber-200',
};

export function Card({
  children,
  className = '',
  as: As = 'div',
  tone = 'default',
}: CardProps) {
  return (
    <As
      className={[
        'relative bg-stone-950',
        'border-2',
        TONE_BORDER[tone],
        'rounded-none',
        className,
      ].join(' ')}
    >
      {children}
    </As>
  );
}
