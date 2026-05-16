// Root layout for the entire app.
//
// WHY ClerkProvider wraps the tree: Clerk's hooks read session context from
// React. Fonts load via next/font/google so they are self-hosted (no FOUT,
// no third-party DNS) and exposed as CSS variables Tailwind consumes.
//
// Day 4 hard rule: only two font families ship.
//   - Italiana for the wordmark only.
//   - Fraunces variable (with SOFT + opsz axes) for body, display, captions,
//     and tabular numerics.
// DM Sans and JetBrains Mono are gone — they read as the default Tailwind
// / shadcn starter combo that the user explicitly called out as "obviously
// coded by Claude agents."

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
import { Fraunces, Italiana } from 'next/font/google';

import './globals.css';

const fontWordmark = Italiana({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-wordmark',
  display: 'swap',
});

const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

export const metadata: Metadata = {
  title: 'Throughline',
  description: 'A job-search OS for skills, applications, and discovery.',
};

// Clerk's provider throws at SSG when the publishable key isn't available,
// and the public routes have no value to prerender (sign-in is a
// Clerk-hosted form, landing immediately redirects). force-dynamic at the
// root opts the whole tree into request-time rendering.
export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // WHY: middleware.security.ts forwards a per-request nonce on the x-nonce
  // request header. Passing it to ClerkProvider's `nonce` prop lets Clerk
  // attach the value to the bootstrap script it injects, so the script
  // satisfies our nonce-based CSP without us widening script-src.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <ClerkProvider nonce={nonce}>
      <html
        lang="en"
        className={`${fontWordmark.variable} ${fontDisplay.variable}`}
      >
        <body className="font-display antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
