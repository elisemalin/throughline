'use client';

// Brutalist toast queue. Heavy 3px top border keyed to tone, flat
// stone-950 body, Space Mono caption, slide-in from the right at 160ms
// (no rotation — that read as twee in Day-4 review).

import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/stores/useToastStore';

const TONE_BORDER: Record<ToastTone, string> = {
  info: 'border-t-arctic-400',
  success: 'border-t-emerald-300',
  error: 'border-t-rose-300',
};

const TONE_ICON_CLASS: Record<ToastTone, string> = {
  info: 'text-arctic-200',
  success: 'text-emerald-200',
  error: 'text-rose-200',
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
            'pointer-events-auto relative min-w-[260px] max-w-sm',
            'bg-stone-950 border-2 border-stone-100 rounded-none',
            'border-t-[3px]',
            TONE_BORDER[toast.tone],
            'animate-slide-in-right',
          ].join(' ')}
        >
          <div className="px-4 py-3 flex items-start gap-3 font-mono text-xs text-stone-100">
            <ToneIcon tone={toast.tone} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="label-mono text-stone-500 hover:text-arctic-400 transition-colors"
              aria-label={`Dismiss notification: ${toast.message}`}
            >
              [x]
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
