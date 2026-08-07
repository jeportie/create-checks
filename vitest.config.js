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
      // Coverage gate — intentionally left commented until the baseline is known.
      // The "Report Coverage" step in pull-request-checks.yml prints current
      // coverage on the first PR; set these to just below that baseline, then
      // ratchet up. Once enabled, `npm run test:coverage` fails when actual < threshold.
      // thresholds: {
      //   lines: 80,
      //   statements: 80,
      //   functions: 75,
      //   branches: 70,
      // },
    },
  },
});
