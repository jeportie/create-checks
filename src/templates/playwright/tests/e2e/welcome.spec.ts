import { expect, test } from '@playwright/test';

test.describe('Welcome page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Vite + React + Tailwind' })).toBeVisible();
  });

  test('counter increments on click', async ({ page }) => {
    const button = page.getByRole('button', { name: /count is/i });
    await expect(button).toHaveText('count is 0');
    await button.click();
    await expect(button).toHaveText('count is 1');
  });

  test('displays the three logo links', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Vite logo' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'React logo' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tailwind logo' })).toBeVisible();
  });
});
