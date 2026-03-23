import { resolve } from 'path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    include: [
      '**/tests/**/*.{test,spec}.{ts,tsx,js}',
      '**/test/**/*.{test,spec}.{ts,tsx,js}',
    ],
    exclude: ['node_modules/**'],
  },
});
