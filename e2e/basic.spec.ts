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
