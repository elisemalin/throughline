'use client';

// Global toast queue used by mutations to surface success/error feedback.
// The Toaster component reads this store and renders inside an aria-live
// region so screen readers announce updates without stealing focus.

import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'error';

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

export type ToastState = {
  toasts: Toast[];
  push: (message: string, tone?: ToastTone) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const newId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const AUTO_DISMISS_MS = 5000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = newId();
    set({ toasts: [...get().toasts, { id, message, tone }] });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        // Re-read inside the callback so a manually-dismissed toast doesn't
        // bounce back into view after the timeout fires.
        const current = get().toasts;
        if (current.some((t) => t.id === id)) {
          set({ toasts: current.filter((t) => t.id !== id) });
        }
      }, AUTO_DISMISS_MS);
    }
    return id;
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  clear: () => set({ toasts: [] }),
}));
