// Horizontal rule primitive. Brutalist surfaces use rules aggressively
// to divide sections; the `weight` prop swaps between a 1px hairline
// (between rows) and a 2-3px heavy rule (between sections / between a
// route header and the body).

import type { CSSProperties } from 'react';

export type RuleWeight = 'hairline' | 'heavy';
export type RuleTone = 'stone' | 'amber' | 'arctic';

export type RuleProps = {
  weight?: RuleWeight;
  tone?: RuleTone;
  className?: string;
  style?: CSSProperties;
};

const TONE_BG: Record<RuleTone, string> = {
  stone: 'bg-stone-700',
  amber: 'bg-amber-200',
  arctic: 'bg-arctic-400',
};

export function Rule({
  weight = 'hairline',
  tone = 'stone',
  className = '',
  style,
}: RuleProps) {
  const height = weight === 'hairline' ? 'h-px' : 'h-[2px]';
  return (
    <hr
      role="separator"
      style={style}
      className={`border-0 ${height} ${TONE_BG[tone]} ${className}`}
    />
  );
}
