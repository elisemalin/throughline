'use client';

// Multi-line text input matching the prototype's dark form treatment.
// Lifted from prototype/Throughline.jsx lines 827-837.

import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = {
  mono?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

const base =
  'w-full bg-stone-900/80 border border-stone-800 rounded-sm px-3 py-2 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-200/60 focus:bg-stone-900 transition-colors resize-none';

export function Textarea({
  mono = false,
  className = '',
  rows = 4,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={`${base} ${mono ? 'font-mono text-sm' : 'text-sm'} ${className}`}
      {...rest}
    />
  );
}
