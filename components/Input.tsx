'use client';

// Brutalist input. Day-5b: full 2px border on all sides (was a
// bottom-only 3px underline with arctic focus). Flat stone-950 bg,
// stone-700 border at rest, arctic-400 border on focus.

import type { InputHTMLAttributes } from 'react';

export type InputProps = {
  mono?: boolean;
} & InputHTMLAttributes<HTMLInputElement>;

const base = [
  'block w-full bg-stone-950 border-2 border-stone-700 rounded-none',
  'px-3 py-2 text-stone-100 placeholder-stone-600',
  'transition-colors duration-150',
  'hover:border-stone-500 focus:outline-none focus:border-arctic-400',
].join(' ');

export function Input({
  mono = false,
  className = '',
  type = 'text',
  ...rest
}: InputProps) {
  return (
    <input
      type={type}
      className={`${base} ${mono ? 'font-mono tab-nums text-sm tracking-[0.02em]' : 'text-sm'} ${className}`}
      {...rest}
    />
  );
}
