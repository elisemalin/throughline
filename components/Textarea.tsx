'use client';

// Brutalist textarea — flat opaque background inside a heavy 2px stone
// border, no corner radius. Focus border shifts to arctic blue.

import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = {
  mono?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

const base = [
  'w-full bg-stone-950 border-2 border-stone-700 rounded-none',
  'px-4 py-3 text-stone-100 placeholder-stone-600 resize-none',
  'transition-colors duration-150',
  'hover:border-stone-500 focus:outline-none focus:border-arctic-400',
].join(' ');

export function Textarea({
  mono = false,
  className = '',
  rows = 4,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={`${base} ${mono ? 'font-mono tab-nums text-sm tracking-[0.02em]' : 'text-sm leading-relaxed'} ${className}`}
      {...rest}
    />
  );
}
