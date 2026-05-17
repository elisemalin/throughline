'use client';

// Brutalist button. Block primary (solid amber + heavy border + sharp
// corners), block secondary (transparent + heavy border), ghost (mono
// caption only), danger (transparent + heavy rose border). Active state
// shifts the button 1px down rather than the prior hover-lift +
// gradient. Arrow ornament available via the `arrow` prop.

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Ornament } from './Ornament';

export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export type ButtonSize = (typeof BUTTON_SIZES)[number];

export type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const base = [
  'inline-flex items-center gap-2 font-sans font-medium uppercase tracking-[0.08em]',
  'rounded-none border-2',
  'transition-transform duration-100',
  'active:translate-y-px',
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:translate-y-0',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
  'focus-visible:ring-arctic-400 focus-visible:ring-offset-stone-950',
].join(' ');

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-amber-200 text-stone-950 border-amber-200 hover:bg-amber-100 hover:border-amber-100',
  secondary: 'bg-stone-950 text-stone-100 border-stone-100 hover:border-arctic-400 hover:text-arctic-200',
  ghost: 'bg-transparent text-stone-400 border-transparent hover:text-amber-200',
  danger: 'bg-stone-950 text-rose-200 border-rose-300/80 hover:bg-rose-950/40 hover:border-rose-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-[11px] px-3 py-1.5',
  md: 'text-xs px-4 py-2',
  lg: 'text-sm px-5 py-2.5',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  arrow = false,
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
      {arrow && <Ornament kind="arrow" className="font-mono text-current" />}
    </button>
  );
}
