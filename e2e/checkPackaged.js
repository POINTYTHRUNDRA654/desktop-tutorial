const { _electron } = require('@playwright/test');

(async () => {
  try {
    console.log('Launching packaged electron...');
    const path = require('path');
    // find packaged executable
    const PACKAGED_EXE_CANDIDATES = [
      path.join(process.cwd(), 'release', 'win-unpacked', 'Mossy.exe'),
      path.join(process.cwd(), 'dist-electron', 'Mossy.exe'),
    ];
    let execPath;
    for (const p of PACKAGED_EXE_CANDIDATES) {
      if (require('fs').existsSync(p)) {
        execPath = p;
        break;
      }
    }
    const launchOptions = {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ELECTRON_IS_TEST: 'true',
        NODE_ENV: 'production',
      },
      args: [],
    };
    if (execPath) {
      launchOptions.executablePath = execPath;
      launchOptions.args = ['.'];
    } else {
      // fall back to the bundled electron binary rather than "electron" CLI,
      // which in this workspace sometimes invokes the packager command instead.
      const path = require('path');
      const localElectron = process.platform === 'win32'
        ? path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe')
        : path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron');
      if (require('fs').existsSync(localElectron)) {
        launchOptions.executablePath = localElectron;
        launchOptions.args = ['.'];
      } else {
        // last resort, let playwright pick default
        launchOptions.args = ['.'];
      }
    }
    const electronApp = await _electron.launch(launchOptions);
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    console.log('Page URL:', await page.url());
    const html = await page.content();
    // dump full DOM to disk
    require('fs').writeFileSync('packaged-dom.html', html);
    console.log('HTML length:', html.length);
    console.log('HTML snippet:', html.slice(0, 1000));
    await page.screenshot({ path: 'packaged.png', fullPage: true }).catch(() => {});
    // wait a bit for the UI to hydrate and render navigation
    let nav = null;
    try {
      nav = await page.waitForSelector('nav, .sidebar', { timeout: 10000 });
      console.log('nav selector appeared');
    } catch {
      console.log('nav selector did not appear within timeout');
    }
    if (nav) {
      const visible = await nav.isVisible();
      console.log('nav visible?', visible);
      const html = await nav.evaluate(el => el.outerHTML);
      console.log('nav outerHTML snippet:', html.slice(0, 1000));
    } else {
      console.log('no nav element at all');
    }
    await electronApp.close();
  } catch (e) {
    console.error('error running check:', e);
  }
})();