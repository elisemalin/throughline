import type { Preview } from '@storybook/react-vite';
import '../app/globals.css';

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
      config: { rules: [] },
    },
    layout: 'fullscreen',
  },
};

export default preview;
