// Root layout for the entire app.
//
// WHY ClerkProvider wraps the tree: Clerk's hooks read session context from
// React. Fonts load via next/font/google so they are self-hosted (no FOUT,
// no third-party DNS) and exposed as CSS variables Tailwind consumes.

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
import { Fraunces, Italiana, JetBrains_Mono, DM_Sans } from 'next/font/google';

import './globals.css';

// Wordmark: Italiana is single-weight, art-deco, very distinctive — used
// only on the brand mark itself so the rest of the typography stays
// readable while the brand has presence.
const fontWordmark = Italiana({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-wordmark',
  display: 'swap',
});

// Display: Fraunces variable. We use the "soft" axis at runtime via CSS
// font-variation-settings so headings have organic edges rather than the
// crisp neoclassical look of a classic transitional serif.
const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

// Data: JetBrains Mono for table cells, IDs, and any numeric column where
// vertical alignment of digits matters.
const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// UI: DM Sans is the workhorse for body, labels, and most buttons.
const fontSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
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
        className={`${fontWordmark.variable} ${fontDisplay.variable} ${fontMono.variable} ${fontSans.variable}`}
      >
        <body className="font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
