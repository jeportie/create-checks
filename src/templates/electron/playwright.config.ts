import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Specs use the `.e2e.ts` suffix (kept distinct from Vitest's `.test`/`.spec` files),
  // so widen testMatch beyond Playwright's default `*.@(spec|test).ts`.
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  use: { trace: 'on-first-retry' },
});
