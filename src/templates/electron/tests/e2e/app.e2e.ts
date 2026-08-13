import { test, expect, _electron as electron } from '@playwright/test';

test('launches the app and renders the main window', async () => {
  const app = await electron.launch({ args: ['out/main/index.js'] });
  const window = await app.firstWindow();
  await expect(window.locator('h1')).toContainText('Electron');
  await app.close();
});
