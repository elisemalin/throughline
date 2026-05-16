import type { StorybookConfig } from '@storybook/react-vite';
import path from 'node:path';

// WHY @storybook/react-vite over @storybook/nextjs: the Next.js framework
// adapter ships @storybook/builder-webpack5, which calls cache.shutdown
// through a Hook.tap that Next 15.5's bundled webpack does not expose.
// The result is the "Cannot read properties of undefined (reading 'tap')"
// failure documented in the Day 3 kickoff. None of our stories import
// next/* primitives (Sidebar would, but no Sidebar story exists), so the
// Vite builder is the correct swap — faster builds, no webpack
// compatibility surface.
const config: StorybookConfig = {
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  staticDirs: [],
  // WHY viteFinal: Vite has no built-in awareness of the `@/*` path alias
  // declared in tsconfig.json. Mirroring it here keeps stories importable
  // from '@/components' without restructuring the source tree.
  viteFinal: async (vite) => {
    vite.resolve ??= {};
    vite.resolve.alias = {
      ...(vite.resolve.alias ?? {}),
      '@': path.resolve(__dirname, '..'),
    };
    return vite;
  },
};

export default config;
