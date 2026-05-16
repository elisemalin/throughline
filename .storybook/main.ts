import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
  staticDirs: [],
};

export default config;
