// Authenticated app shell. Day-5b: structural dividers use explicit <hr>
// elements rather than border-b shorthand so they read as intentional
// rules, not single-side accents.

import type { ReactNode } from 'react';
import { BottomNav, Sidebar, Toaster } from '@/components';
import { QueryProvider } from '@/lib/queries/QueryProvider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <a href="#main" className="skip-link">Skip to main content</a>
      <div className="min-h-screen flex bg-stone-950 text-stone-100">
        <Sidebar />
        <hr aria-hidden className="hidden md:block border-0 w-[2px] bg-stone-800 self-stretch" />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-20 bg-stone-950 px-5 py-4 flex items-center justify-between">
            <div className="text-2xl text-stone-50 font-sans font-bold uppercase tracking-[-0.04em] leading-none">
              Throughline
            </div>
            <div className="label-mono text-amber-200/80">v0.5 / live</div>
          </header>
          <hr aria-hidden className="md:hidden border-0 h-[2px] bg-stone-800 sticky top-[60px] z-10" />
          <main
            id="main"
            className="flex-1 px-5 md:px-12 lg:px-16 pt-12 md:pt-16 pb-28 md:pb-20 max-w-6xl w-full mx-auto"
          >
            {children}
          </main>
          <BottomNav />
        </div>
        <Toaster />
      </div>
    </QueryProvider>
  );
}
