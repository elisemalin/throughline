import type { Preview } from '@storybook/nextjs';
import '../app/globals.css';

// WHY: every story runs axe-core via addon-a11y. Stories that intentionally
// violate a rule (none currently) would override `a11y` per-story.
const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'stone-950',
      values: [
        { name: 'stone-950', value: '#0c0a09' },
        { name: 'paper', value: '#ffffff' },
      ],
    },
    a11y: {
      element: '#storybook-root',
      manual: false,
      config: {
        rules: [],
      },
    },
    layout: 'fullscreen',
  },
};

export default preview;
