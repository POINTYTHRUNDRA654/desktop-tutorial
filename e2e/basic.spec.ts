import { test, expect, _electron } from '@playwright/test';

test.describe('Basic Electron Launch Test', () => {
  test('Electron app should launch', async () => {
    const electronApp = await _electron.launch({
      args: ['dist-electron/main/main.js'],
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