import { expect, test } from '@playwright/test';

test('smoke: home page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/vite/i);
});
