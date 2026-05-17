// Brutalist card. Day 5 reset:
//   - Flat opaque surface (no translucent gradient, no backdrop-blur).
//   - Heavy 2px border (defaults), `tone` swaps the border colour.
//   - Sharp corners by default. Pass `className="rounded-sm"` to round
//     to 2px if a specific surface needs it; otherwise zero radius.
//   - Optional 3px left accent bar via the `accent` prop.
//   - Optional top accent rule via the `topRule` prop (used as a frame
//     on cards that contain a featured artifact).

import type { ElementType, ReactNode } from 'react';

export type CardAccent = 'none' | 'amber' | 'emerald' | 'rose' | 'arctic';
export type CardTone = 'default' | 'urgent' | 'success' | 'arctic';

export type CardProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  accent?: CardAccent;
  tone?: CardTone;
  topRule?: boolean;
};

const ACCENT_BAR: Record<CardAccent, string> = {
  none: '',
  amber: 'before:bg-amber-200',
  emerald: 'before:bg-emerald-300',
  rose: 'before:bg-rose-300',
  arctic: 'before:bg-arctic-400',
};

const TONE_BORDER: Record<CardTone, string> = {
  default: 'border-stone-700',
  urgent: 'border-rose-400/80',
  success: 'border-emerald-400/80',
  arctic: 'border-arctic-400/70',
};

export function Card({
  children,
  className = '',
  as: As = 'div',
  accent = 'none',
  tone = 'default',
  topRule = false,
}: CardProps) {
  const showAccent = accent !== 'none';
  return (
    <As
      className={[
        'relative bg-stone-950',
        'border-2',
        TONE_BORDER[tone],
        'rounded-none',
        topRule ? 'border-t-[3px] border-t-amber-200' : '',
        showAccent
          ? `before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[3px] ${ACCENT_BAR[accent]}`
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </As>
  );
}
