import type { Config } from 'tailwindcss';

// WHY: Tailwind 4 reads its theme from CSS-first directives, but a JS
// config is still loaded via `@config` in `app/globals.css` so design
// tokens stay in one TS file the team can grep. Palette: stone-950 base
// surface, amber-200 primary accent; a secondary emerald used sparingly
// for "healthy / progress" signals (interview-stage cards, success
// toasts) so the UI is not single-accent monotone.
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
        // Two families total. Italiana is reserved for the wordmark.
        // Fraunces drives every other surface (body, display, captions,
        // tabular numerics) via font-variation-settings tuned per use
        // case in app/globals.css.
        wordmark: ['var(--font-wordmark)', 'serif'],
        display: ['var(--font-display)', 'serif'],
        // `sans` and `mono` map to Fraunces so any leftover utility class
        // does not silently fall back to system fonts during the
        // migration. This intentional collapse is a Day 4 invariant.
        sans: ['var(--font-display)', 'serif'],
        mono: ['var(--font-display)', 'serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
      boxShadow: {
        // WHY: cards use this for the layered-translucent look — a
        // long, low-opacity shadow plus a tight inset highlight so the
        // surface reads as floating glass, not a flat rectangle.
        editorial:
          '0 1px 0 0 rgba(253, 230, 138, 0.04) inset, 0 12px 24px -12px rgba(0, 0, 0, 0.55)',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateX(40px) rotate(0.5deg)' },
          '100%': { opacity: '1', transform: 'translateX(0) rotate(0deg)' },
        },
        'underline-in': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 220ms ease-out',
        'underline-in': 'underline-in 160ms ease-out forwards',
      },
    },
  },
  plugins: [],
};

export default config;
