// Authenticated app shell. Wraps every /dashboard, /skills, etc. route in
// the QueryClient provider, the desktop Sidebar, the mobile BottomNav,
// and the global Toaster. Brutalist surface: flat opaque stone-950 with
// a 2px sidebar divider; no backdrop blur, no warm radial.

import type { ReactNode } from 'react';
import { BottomNav, Sidebar, Toaster } from '@/components';
import { QueryProvider } from '@/lib/queries/QueryProvider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <a href="#main" className="skip-link">Skip to main content</a>
      <div className="min-h-screen flex bg-stone-950 text-stone-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-20 border-b-2 border-stone-800 bg-stone-950 px-5 py-4 flex items-center justify-between">
            <div className="text-2xl text-stone-50 font-sans font-bold uppercase tracking-[-0.04em] leading-none">
              Throughline
            </div>
            <div className="label-mono text-amber-200/80">v0.5 / live</div>
          </header>
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
