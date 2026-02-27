<<<<<<< HEAD
import { test, expect } from '@playwright/test';
import { launchElectronApp } from './utils/electronHarness';

test.describe('Basic Electron Launch Test', () => {
  test('Electron app should launch in Electron context', async ({}, testInfo) => {
    const { electronApp, page } = await launchElectronApp(testInfo.project.name);

    const hasElectronApi = await page.evaluate(() => Boolean((window as any).electron?.api));
    expect(hasElectronApi).toBe(true);

    const isRunning = !electronApp.process().killed;
    expect(isRunning).toBe(true);

    await electronApp.close();
  });
});
=======
import { test, expect, _electron } from '@playwright/test';

test.describe('Basic Electron Launch Test', () => {
  test('Electron app should launch', async () => {
    const electronApp = await _electron.launch({
      args: ['dist-electron/electron/main.js'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        ELECTRON_IS_TEST: 'true', // Disable single instance lock for testing
      },
    });

    // Wait for app to launch
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if app is running (this will fail if app crashed)
    const isRunning = !electronApp.process().killed;
    expect(isRunning).toBe(true);

    // Close the app
    await electronApp.close();
  });
});
>>>>>>> 7fc8ed4cf64803aee0ee7d1400034ae62c90ea17
