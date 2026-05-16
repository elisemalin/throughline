'use client';

// Wraps the (app) layout in a single QueryClient. Memoized once per browser
// session so navigations between routes share the cache.

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // WHY 1 min stale: discovery and tracker views poll on user
            // action; the data is owned by mock state during the sprint, so
            // refetch-on-focus would waste cycles. Backend Core handlers can
            // tune this per-route later.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
