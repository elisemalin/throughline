'use client';

// Textarea — boxed by default because multi-line input genuinely needs
// a frame to read, but the frame is the new layered surface (ring +
// gradient bg) rather than the old solid-border stone block.

import type { TextareaHTMLAttributes } from 'react';

export type TextareaProps = {
  mono?: boolean;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

const base = [
  'w-full bg-gradient-to-b from-stone-900/30 to-stone-950/40',
  'ring-1 ring-stone-800/80 rounded-md',
  'px-4 py-3 text-stone-100 placeholder-stone-600',
  'resize-none',
  'transition-[box-shadow,ring,background-color] duration-150',
  'focus:outline-none focus:ring-amber-200/50 focus:bg-stone-950/60',
  'hover:ring-stone-700',
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
      className={`${base} ${mono ? 'tab-nums text-sm tracking-[0.01em]' : 'text-sm leading-relaxed'} ${className}`}
      {...rest}
    />
  );
}
