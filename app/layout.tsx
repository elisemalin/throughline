// Root layout for the entire app.
//
// WHY: ClerkProvider must wrap the whole tree because Clerk's hooks read the
// session context from React. Fonts are loaded via next/font/google so they
// are self-hosted (no FOUT, no third-party DNS) and exposed as CSS variables
// the Tailwind config consumes.

import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Instrument_Serif, JetBrains_Mono, DM_Sans } from 'next/font/google';

import './globals.css';

// Display: Instrument Serif (per the prototype's headline treatment).
const fontDisplay = Instrument_Serif({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${fontDisplay.variable} ${fontMono.variable} ${fontSans.variable}`}
      >
        <body className="font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
