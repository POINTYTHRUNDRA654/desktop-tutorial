import { launchElectronApp } from '../e2e/utils/electronHarness';

(async () => {
  console.log('starting manual launch');
  const { electronApp, page } = await launchElectronApp('electron-packaged');
  console.log('launched, waiting for 5s');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'manual-packaged.png', fullPage: true });
  const count = await page.evaluate(() => document.querySelectorAll('nav, .sidebar').length);
  console.log('nav/sidebar count', count);
  await electronApp.close();
  console.log('closed');
})();
