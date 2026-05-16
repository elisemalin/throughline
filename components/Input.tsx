'use client';

// Text input matching the prototype's dark form treatment.
// Lifted from prototype/Throughline.jsx lines 815-825. The prototype passed
// onChange(value); we widen to standard HTML props so Field's cloneElement
// can inject id/aria-describedby and so React Hook Form etc. can attach later.

import type { InputHTMLAttributes } from 'react';

export type InputProps = {
  mono?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

const base =
  'w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-200/60 focus:bg-stone-900 transition-colors';

export function Input({ mono = false, className = '', type = 'text', ...rest }: InputProps) {
  return (
    <input
      type={type}
      className={`${base} ${mono ? 'font-mono text-sm' : 'text-sm'} ${className}`}
      {...rest}
    />
  );
}
