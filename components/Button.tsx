'use client';

// Four-variant button matching the prototype's visual language.
// Lifted from prototype/Throughline.jsx lines 778-801.

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

const base =
  'inline-flex items-center gap-2 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-amber-200 text-stone-950 hover:bg-amber-100',
  secondary: 'bg-stone-800 text-stone-100 hover:bg-stone-700 border border-stone-700',
  ghost: 'text-stone-300 hover:text-amber-200 hover:bg-stone-900/60',
  danger: 'bg-rose-950 text-rose-200 border border-rose-900 hover:bg-rose-900/40',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1.5 rounded-sm',
  md: 'text-sm px-3.5 py-2 rounded-sm',
  lg: 'text-sm px-5 py-3 rounded-sm',
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
      // WHY: default to type=button so an unintentional submit doesn't fire
      // when a primary CTA lives inside a Modal-hosted form.
      type={type ?? 'button'}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
