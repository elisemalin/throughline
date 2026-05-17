'use client';

// Brutalist modal. Day-5b: full amber border (no top-only accent strip).
// Flat opaque surface, slide-up entry at 120ms. Keyboard trap, ESC, and
// focus restoration carried forward. Header divider uses an explicit
// <hr> rather than a border-b so the rule reads as intentional.

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
        className="absolute inset-0 bg-stone-950/85 cursor-default"
      />
      <div
        ref={containerRef}
        className={[
          'relative w-full md:my-8 max-h-[92vh] overflow-y-auto',
          'bg-stone-950 border-2 border-amber-200 rounded-none',
          'animate-slide-up',
          wide ? 'md:max-w-3xl' : 'md:max-w-xl',
        ].join(' ')}
      >
        <div className="sticky top-0 z-10 bg-stone-950 px-6 py-4 flex items-center justify-between">
          <h2
            id="throughline-modal-title"
            className="text-xl md:text-2xl text-stone-50 font-sans font-bold uppercase tracking-[-0.02em]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-stone-500 hover:text-arctic-400 transition-colors focus-visible:outline-none focus-visible:text-arctic-400"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <hr aria-hidden className="border-0 h-px bg-stone-700" />
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
