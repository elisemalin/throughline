// Authenticated app shell. Wraps every /dashboard, /skills, etc. route in
// the QueryClient provider, the desktop Sidebar, the mobile BottomNav, and
// the global Toaster. The route group is auth-gated by Foundation's
// middleware.ts — anonymous users hit /sign-in before they get here.

import type { ReactNode } from 'react';
import { BottomNav, Sidebar, Toaster } from '@/components';
import { QueryProvider } from '@/lib/queries/QueryProvider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen flex bg-stone-950 text-stone-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-20 border-b border-stone-900/60 bg-stone-950/95 backdrop-blur px-4 py-3">
            <div className="text-2xl text-amber-200 font-wordmark leading-none">
              Throughline
            </div>
          </header>
          <main
            id="main"
            className="flex-1 px-4 md:px-8 lg:px-12 pt-6 pb-24 md:pb-12 max-w-6xl w-full mx-auto"
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
