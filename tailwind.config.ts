import type { Config } from 'tailwindcss';

// WHY: Tailwind 4 reads its theme from CSS-first directives, but a JS config
// is still loaded via `@config` in `app/globals.css` so design tokens stay in
// one TS file the team can grep. Palette mirrors the prototype: stone-950
// base surface with amber-200 as the single accent.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './stories/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(12 10 9)',
          raised: 'rgb(28 25 23)',
        },
        accent: {
          DEFAULT: 'rgb(253 230 138)',
        },
      },
      fontFamily: {
        // CSS variables are populated by next/font in app/layout.tsx so the
        // font binaries are self-hosted and FOUT is avoided. `wordmark` is
        // reserved for the brand mark in Sidebar; everything else uses
        // `display`, `sans`, or `mono`.
        wordmark: ['var(--font-wordmark)', 'serif'],
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Cards/buttons used `rounded-sm` (2px) which read as engineering-tool
        // brutal. Bumping the default `rounded` token to 4px and overriding
        // `sm` to keep it consistent across the existing call sites.
        sm: '4px',
        md: '6px',
      },
    },
  },
  plugins: [],
};

export default config;
