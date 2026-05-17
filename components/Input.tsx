'use client';

// Brutalist input — transparent background, 3px bottom border (heavy
// stone), focus underline shifts to arctic blue via `.focus-arctic`
// in globals.css. No corner radius, no boxed frame by default.
//
// `variant="boxed"` keeps a fully-framed form-field for the BYOK
// password input where masked text needs containment to read.

import type { InputHTMLAttributes } from 'react';

export type InputProps = {
  variant?: 'underline' | 'boxed';
  mono?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

const underlineWrap =
  'focus-arctic block border-b-[3px] border-stone-700 hover:border-stone-500 transition-colors';
const boxedWrap =
  'block border-2 border-stone-700 bg-stone-950 hover:border-stone-500 focus-within:border-arctic-400 transition-colors';

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
        className={`${inner} ${mono ? 'font-mono tab-nums text-sm tracking-[0.02em]' : 'text-sm'} ${className}`}
        {...rest}
      />
    </span>
  );
}
