import { by, device, element, expect } from 'detox';

describe('App', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show welcome screen', async () => {
    await expect(element(by.text('Welcome to Your App'))).toBeVisible();
  });

  it('should show counter button', async () => {
    await expect(element(by.text('count is 0'))).toBeVisible();
  });
});
