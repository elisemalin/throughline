'use client';

// Button family. Day 4 adds rest-state dimming, a hover-lift micro-
// interaction, and a press-down on active so the primary CTA feels
// intentional rather than a flat colour rectangle.

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export type ButtonSize = (typeof BUTTON_SIZES)[number];

export type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base = [
  'inline-flex items-center gap-2 font-display font-medium',
  'transition-[transform,background-color,color,box-shadow] duration-150 ease-out',
  'will-change-transform',
  'hover:-translate-y-px active:translate-y-px',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0',
  // Custom focus: amber underline ring without the generic blue browser
  // outline.
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'focus-visible:ring-amber-200/70 focus-visible:ring-offset-stone-950',
].join(' ');

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'text-stone-950',
    'bg-gradient-to-b from-amber-100 to-amber-200',
    'hover:from-amber-50 hover:to-amber-100',
    'hover:shadow-[0_8px_24px_-12px_rgba(253,230,138,0.45)]',
  ].join(' '),
  secondary: [
    'text-stone-200 ring-1 ring-stone-700/70 bg-stone-900/40',
    'hover:text-stone-50 hover:ring-amber-200/60 hover:bg-stone-900/70',
    'opacity-90 hover:opacity-100',
  ].join(' '),
  ghost: [
    'text-stone-400 bg-transparent',
    'hover:text-amber-200 hover:bg-stone-900/50',
  ].join(' '),
  danger: [
    'text-rose-200 ring-1 ring-rose-900/80 bg-rose-950/40',
    'hover:bg-rose-900/40 hover:text-rose-100',
  ].join(' '),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-md',
  md: 'text-sm px-4 py-2 rounded-md',
  lg: 'text-base px-5 py-2.5 rounded-md',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
