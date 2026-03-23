import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['**/tests/**/*.{test,spec}.{js,mjs,cjs}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      reporter: ['json-summary', 'json', 'html'],
      include: ['src/**/*'],
      reportOnFailure: true,
    },
  },
});
