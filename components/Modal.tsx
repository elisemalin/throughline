'use client';

// Full-screen overlay with a sticky header and a single close affordance.
// Lifted from prototype/Throughline.jsx lines 839-868.
//
// WHY focus trap + Escape: the prototype was a single-file demo so it
// skipped these. Production needs them for WCAG 2.1.2 / 2.4.3 compliance —
// keyboard users must be able to dismiss the modal and TAB stays inside.

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
    // Give the modal its initial focus so screen readers and keyboard users
    // land inside the dialog.
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default"
      />
      <div
        ref={containerRef}
        className={`relative bg-stone-950 border-t md:border border-stone-800 md:rounded-sm w-full ${wide ? 'md:max-w-3xl' : 'md:max-w-xl'} md:my-8 max-h-[92vh] overflow-y-auto`}
      >
        <div className="sticky top-0 bg-stone-950 border-b border-stone-800/80 px-5 py-3.5 flex items-center justify-between">
          <h2 id="throughline-modal-title" className="text-xl text-stone-100 font-display">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-stone-500 hover:text-stone-200 transition-colors focus-visible:outline-none focus-visible:text-amber-200"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
