'use client';

// Modal — Day 4 adds a 1px amber top accent, a deeper warm-tinted
// backdrop blur, and a 200ms fade+slide-up entry. Keyboard trap, ESC,
// and focus restoration carried forward from Day 2.

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
};

const FOCUSABLE_SELECTOR =
  'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, wide = false }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !containerRef.current) return;
      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', handleKey);
    const first = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleKey]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="throughline-modal-title"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close dialog backdrop"
        onClick={onClose}
        // Warm-tinted backdrop with a deeper blur for visual separation
        // from the surface noise.
        className="absolute inset-0 bg-stone-950/80 backdrop-blur-md cursor-default"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7), rgba(20,15,10,0.85))' }}
      />
      <div
        ref={containerRef}
        className={[
          'relative w-full md:my-8 max-h-[92vh] overflow-y-auto',
          'bg-gradient-to-b from-stone-900/80 via-stone-950/90 to-stone-950',
          'ring-1 ring-stone-100/8 md:rounded-md',
          'shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]',
          // Top amber accent — 1px line that signals "this is the active
          // overlay, not a generic dialog."
          'before:absolute before:left-6 before:right-6 before:top-0 before:h-px',
          'before:bg-gradient-to-r before:from-transparent before:via-amber-200/70 before:to-transparent',
          'animate-toast-in',
          wide ? 'md:max-w-3xl' : 'md:max-w-xl',
        ].join(' ')}
      >
        <div className="sticky top-0 z-10 bg-stone-950/85 backdrop-blur px-6 py-4 flex items-center justify-between border-b border-stone-100/5">
          <h2
            id="throughline-modal-title"
            className="text-xl md:text-2xl text-stone-50 font-display tracking-tight"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-stone-500 hover:text-amber-200 transition-colors duration-100 focus-visible:outline-none focus-visible:text-amber-200"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
