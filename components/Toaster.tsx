'use client';

// Renders the useToastStore queue. Uses aria-live so screen readers
// announce transient feedback (a Discovery "Mark viewed" click, a successful
// API key save) without stealing focus.

import { useToastStore } from '@/stores/useToastStore';

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-24 md:bottom-4 right-4 z-40 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto min-w-[220px] max-w-sm px-3 py-2 rounded-sm border text-sm font-mono ${
            toast.tone === 'error'
              ? 'bg-rose-950/80 text-rose-100 border-rose-900'
              : toast.tone === 'success'
                ? 'bg-emerald-950/80 text-emerald-100 border-emerald-900'
                : 'bg-stone-900/90 text-stone-100 border-stone-800'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-[10px] uppercase tracking-[0.2em] text-stone-400 hover:text-amber-200"
              aria-label={`Dismiss notification: ${toast.message}`}
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
