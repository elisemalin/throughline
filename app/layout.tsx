// Root layout for the entire app.
//
// Day 5 type-system reset:
//   - Space Grotesk variable — display, body, large numerics, wordmark.
//   - Space Mono — captions, labels, bracketed metadata, tabular signals.
// Italiana and Fraunces (Day 3 / Day 4 directions) are out. The user
// rejected serif-led design entirely: "I hate serif fonts on websites,
// it looks like placeholder shit no matter the site imo." Hard rule
// going forward: no serif fonts on websites.

import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { ClerkProvider } from '@clerk/nextjs';
import { Space_Grotesk, Space_Mono } from 'next/font/google';

import './globals.css';

const fontSans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
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
      <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
        <body className="font-sans antialiased">{children}</body>
      </html>
    </ClerkProvider>
  );
}
