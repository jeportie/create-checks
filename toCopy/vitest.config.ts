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
      '**/__tests__/**/*.{test,spec}.{ts,tsx,js}',
      '**/test/**/*.{test,spec}.{ts,tsx,js}',
    ],
    coverage: {
      enabled: true,
      reporter: ['json-summary', 'json', 'html'],
      include: ['src/**/*'],
      reportOnFailure: true,
    },
  },
});
