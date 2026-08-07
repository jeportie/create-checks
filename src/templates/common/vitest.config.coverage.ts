import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    // 'forks' (child processes) instead of worker threads so native addons
    // (e.g. better-sqlite3) load without crashing the test runner.
    pool: 'forks',
    include: [
      '**/tests/**/*.{test,spec}.{ts,tsx,js}',
      '**/test/**/*.{test,spec}.{ts,tsx,js}',
    ],
    exclude: ['node_modules/**'],
    coverage: {
      enabled: true,
      reporter: ['json-summary', 'json', 'html'],
      include: ['src/**/*'],
      reportOnFailure: true,
    },
  },
});
