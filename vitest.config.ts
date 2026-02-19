import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    include: ['**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      enabled: true,
      // you can include other reporters, but 'json-summary' is required, json is recommended
      reporter: ['json-summary', 'json', 'html'],
      include: ['src/**/*'],
      reportOnFailure: true,
    },
    setupFiles: '__tests__/setup.ts',
  },
});
