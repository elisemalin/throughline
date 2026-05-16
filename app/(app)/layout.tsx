// Authenticated app shell. Wraps every /dashboard, /skills, etc. route in
// the QueryClient provider, the desktop Sidebar, the mobile BottomNav,
// and the global Toaster.

import type { ReactNode } from 'react';
import { BottomNav, Sidebar, Toaster } from '@/components';
import { QueryProvider } from '@/lib/queries/QueryProvider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <div className="min-h-screen flex bg-stone-950 text-stone-100">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden sticky top-0 z-20 border-b border-stone-100/5 bg-stone-950/90 backdrop-blur px-5 py-4">
            <div className="text-2xl text-amber-200 font-wordmark leading-none">
              Throughline
            </div>
            <div className="mt-1 h-px w-8 bg-amber-200/40" aria-hidden />
          </header>
          <main
            id="main"
            className="flex-1 px-5 md:px-10 lg:px-14 pt-10 md:pt-12 pb-28 md:pb-16 max-w-6xl w-full mx-auto"
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
