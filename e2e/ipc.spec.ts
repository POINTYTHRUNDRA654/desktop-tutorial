<<<<<<< HEAD
import { test, expect } from '@playwright/test';
import { launchElectronApp, ensurePreloadInjected } from './utils/electronHarness';
=======
import { test, expect, _electron } from '@playwright/test';
>>>>>>> 7fc8ed4cf64803aee0ee7d1400034ae62c90ea17

test.describe('IPC Communication Tests', () => {
  let electronApp: any;
  let page: any;

<<<<<<< HEAD
  test.beforeAll(async ({}, testInfo) => {
    const launched = await launchElectronApp(testInfo.project.name);
    electronApp = launched.electronApp;
    page = launched.page;

    // wait for preload to inject APIs (shared logic from harness)
    await ensurePreloadInjected(page);

    // also wait for the app to signal it's ready (boot sequence complete)
    await page.waitForFunction(() => (window as any).__MOSSY_TEST_READY__ === true, { timeout: 20000 }).catch(() => {});

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
=======
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await _electron.launch({
      args: ['dist-electron/electron/main.js'],
      cwd: process.cwd(),
      env: {
        ...process.env,
        ELECTRON_IS_TEST: 'true', // Disable single instance lock for testing
      },
    });

    // Get the first window
    page = await electronApp.firstWindow();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
>>>>>>> 7fc8ed4cf64803aee0ee7d1400034ae62c90ea17
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('IPC channels are accessible', async () => {
<<<<<<< HEAD
    const ipcAvailable = await page.evaluate(() => Boolean((window as any).electron?.api));
    expect(ipcAvailable).toBe(true);
  });

  test('TTS IPC communication', async () => {
    const ttsApiExists = await page.evaluate(() => {
      const electron = (window as any).electron;
      return Boolean(electron?.api?.elevenLabsSynthesizeSpeech || electron?.api?.tts || electron?.api?.invoke);
    });

    expect(ttsApiExists).toBe(true);
  });

  test('Settings IPC communication', async () => {
    const settingsApiExists = await page.evaluate(() => {
      const electron = (window as any).electron;
      return Boolean(electron?.api?.getSettings || electron?.api?.settings || electron?.api?.invoke);
    });

    expect(settingsApiExists).toBe(true);
  });
});
=======
    // Wait for the app to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Test that IPC communication works by checking if window.electron exists (contextBridge)
    const ipcTest = await page.evaluate(() => {
      // Check if window.electron exists (contextBridge)
      return !!(window as any).electron;
    });

    expect(ipcTest).toBe(true);
  });

  test('TTS IPC communication', async () => {
    // Wait for app to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Navigate to chat using React Router
    await page.evaluate(() => {
      window.history.pushState({}, '', '/chat');
      window.dispatchEvent(new PopStateEvent('popstate', {}));
    });
    await page.waitForTimeout(2000);

    // Test TTS functionality through IPC
    const ttsTest = await page.evaluate(async () => {
      const electron = (window as any).electron;
      if (!electron?.api?.tts) return false;

      try {
        // Test TTS speak function
        await electron.api.tts.speak('Test message');
        return true;
      } catch (error) {
        console.error('TTS test failed:', error);
        return false;
      }
    });

    expect(ttsTest).toBe(true);
  });

  test('Settings IPC communication', async () => {
    // Wait for app to load
    await page.waitForSelector('body', { timeout: 10000 });

    // Test settings storage through IPC
    const settingsTest = await page.evaluate(async () => {
      const electron = (window as any).electron;
      if (!electron?.api?.settings) return false;

      try {
        // Test getting settings
        const settings = await electron.api.settings.get();
        return typeof settings === 'object';
      } catch (error) {
        console.error('Settings test failed:', error);
        return false;
      }
    });

    expect(settingsTest).toBe(true);
  });
});
>>>>>>> 7fc8ed4cf64803aee0ee7d1400034ae62c90ea17
