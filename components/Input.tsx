'use client';

// Underline-style text input. Day 4 drops the boxed `bg-stone-900/80 +
// border` chrome that read as default shadcn; the field is now a
// transparent line with a 2px amber focus underline that slides in from
// the left over 160ms (.focus-underline in globals.css).
//
// A `boxed` variant remains for cases where the field genuinely needs a
// frame to be legible — the BYOK API-key field where masked-text would
// otherwise float in space.

import type { InputHTMLAttributes } from 'react';

export type InputProps = {
  variant?: 'underline' | 'boxed';
  mono?: boolean; // back-compat: tabular numerics on Fraunces
} & InputHTMLAttributes<HTMLInputElement>;

const underlineWrap =
  'focus-underline block border-b border-stone-700 hover:border-stone-500 transition-colors';
const boxedWrap =
  'block rounded-md ring-1 ring-stone-800 bg-stone-950/60 hover:ring-stone-700 focus-within:ring-amber-200/60 transition';

const underlineInput =
  'block w-full bg-transparent px-0 py-2 text-stone-100 placeholder-stone-600 focus:outline-none';
const boxedInput =
  'block w-full bg-transparent px-3 py-2 text-stone-100 placeholder-stone-600 focus:outline-none';

export function Input({
  variant = 'underline',
  mono = false,
  className = '',
  type = 'text',
  ...rest
}: InputProps) {
  const wrap = variant === 'boxed' ? boxedWrap : underlineWrap;
  const inner = variant === 'boxed' ? boxedInput : underlineInput;
  return (
    <span className={wrap}>
      <input
        type={type}
        className={`${inner} ${mono ? 'tab-nums text-sm tracking-[0.01em]' : 'text-sm'} ${className}`}
        {...rest}
      />
    </span>
  );
}
