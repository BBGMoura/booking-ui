import type { Preview } from '@storybook/nextjs-vite';
import { sb } from 'storybook/test';
import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/app/globals.css';

sb.mock('../src/lib/api/auth.ts');

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
