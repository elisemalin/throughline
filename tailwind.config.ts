import type { Config } from 'tailwindcss';

// WHY: Tailwind 4 reads its theme from CSS-first directives, but a JS config
// is still loaded via `@config` in `app/globals.css` so design tokens stay in
// one TS file the team can grep. Palette mirrors the prototype: stone-950
// base surface with amber-200 as the single accent.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // The prototype is built on stone-950 + amber-200; named here so
        // components can reference the role rather than the swatch.
        surface: {
          DEFAULT: 'rgb(12 10 9)',   // stone-950
          raised:  'rgb(28 25 23)',  // stone-900
        },
        accent: {
          DEFAULT: 'rgb(253 230 138)', // amber-200
        },
      },
      fontFamily: {
        // CSS variables are populated by next/font in app/layout.tsx so the
        // font binaries are self-hosted and FOUT is avoided.
        display: ['var(--font-display)', 'serif'],
        sans:    ['var(--font-sans)',    'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)',    'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
