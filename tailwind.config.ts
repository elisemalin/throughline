import type { Config } from 'tailwindcss';

// Day 5 token reset for the brutalist + arctic blue direction.
//
// Palette: stone-950 base + amber-200 primary + arctic blue secondary
// (#4FA3FF, ramped from .200 to .700) for signals / focused states /
// info banners. Emerald stays for healthy/progress.
//
// Borders heavy (2-3px), corners sharp (rounded-none default; sm caps
// at 2px). No editorial shadow, no backdrop blur tokens — the Day-4
// translucent direction was rejected as generic SaaS polish.
//
// Two font families only — Space Grotesk + Space Mono. Tailwind
// `font-sans` and `font-mono` map to them via the CSS variables in
// `app/layout.tsx`. No fallback to system fonts during the migration.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './stories/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Arctic-blue secondary. Ramp generated from the locked hex
        // #4FA3FF (400) with hand-tuned 200/500/700 stops; 500 is the
        // saturated focus colour, 200 is the wash for backgrounds, 700
        // is the muted-text variant for low-emphasis copy.
        arctic: {
          200: '#B7D8FF',
          400: '#4FA3FF',
          500: '#1F7FE6',
          700: '#0F4F94',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // WHY: brutalist surfaces. The default rounded utility steps
        // up incrementally so any leftover `rounded-md` from the Day-4
        // pass still reads as sharp.
        none: '0px',
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '4px',
      },
      borderWidth: {
        // 2 / 3px heavy borders are the brutalist signature; default
        // bumps from 1px to 2px so we do not need to spell border-2
        // on every Card.
        DEFAULT: '2px',
        3: '3px',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'caret-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'slide-up': 'slide-up 120ms ease-out',
        'slide-in-right': 'slide-in-right 160ms ease-out',
        'caret-blink': 'caret-blink 1.1s steps(2, end) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
