// Layered translucent surface used everywhere a content block needs
// containment. Day 4 replaces the flat `bg-stone-950/60 + border`
// treatment with a gradient + ring + editorial shadow so cards read as
// floating glass rather than the default shadcn rectangle.

import type { ElementType, ReactNode } from 'react';

export type CardAccent = 'none' | 'amber' | 'emerald' | 'rose';
export type CardTone = 'default' | 'urgent' | 'success';

export type CardProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  accent?: CardAccent;
  tone?: CardTone;
};

const ACCENT_BAR: Record<CardAccent, string> = {
  none: '',
  amber: 'before:bg-amber-200',
  emerald: 'before:bg-emerald-300',
  rose: 'before:bg-rose-300',
};

const TONE_RING: Record<CardTone, string> = {
  default: 'ring-stone-100/5',
  urgent: 'ring-rose-300/20',
  success: 'ring-emerald-300/20',
};

export function Card({
  children,
  className = '',
  as: As = 'div',
  accent = 'none',
  tone = 'default',
}: CardProps) {
  const showAccent = accent !== 'none';
  return (
    <As
      className={[
        'relative isolate rounded-md',
        // Layered gradient bg + soft top inset highlight via shadow-editorial
        'bg-gradient-to-b from-stone-900/40 via-stone-950/50 to-stone-950/60',
        'ring-1',
        TONE_RING[tone],
        'shadow-editorial',
        'backdrop-blur-[3px]',
        // Optional left accent bar via ::before so it doesn't add a node
        showAccent
          ? `before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[2px] before:rounded-full ${ACCENT_BAR[accent]}`
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
