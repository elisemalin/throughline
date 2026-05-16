'use client';

// Toast queue. Day 4: replaces "background-coloured tile" treatment
// (which read like alert(), only nicer) with a stone-950 frame and a
// 2px top accent bar coloured by tone. Entry slides in from the right
// with a 0.5deg rotation for handcraft.

import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/stores/useToastStore';

const TONE_BAR: Record<ToastTone, string> = {
  info: 'from-stone-300/70 via-stone-100/40 to-transparent',
  success: 'from-emerald-300/80 via-emerald-200/40 to-transparent',
  error: 'from-rose-300/80 via-rose-200/40 to-transparent',
};

const TONE_ICON_CLASS: Record<ToastTone, string> = {
  info: 'text-stone-300',
  success: 'text-emerald-300',
  error: 'text-rose-300',
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  const cls = `${TONE_ICON_CLASS[tone]} shrink-0 mt-0.5`;
  if (tone === 'success') return <CheckCircle2 size={14} className={cls} aria-hidden />;
  if (tone === 'error') return <AlertCircle size={14} className={cls} aria-hidden />;
  return <Info size={14} className={cls} aria-hidden />;
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-40 flex flex-col gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={[
            'pointer-events-auto relative min-w-[260px] max-w-sm overflow-hidden',
            'rounded-md ring-1 ring-stone-100/10 bg-stone-950/95 backdrop-blur',
            'shadow-[0_18px_36px_-12px_rgba(0,0,0,0.7)]',
            'animate-toast-in',
          ].join(' ')}
        >
          <span
            aria-hidden
            className={`absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r ${TONE_BAR[toast.tone]}`}
          />
          <div className="px-4 py-3 flex items-start gap-3 text-sm text-stone-100">
            <ToneIcon tone={toast.tone} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="caption-label text-stone-500 hover:text-amber-200 transition-colors"
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
