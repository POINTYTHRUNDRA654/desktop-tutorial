import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { _electron, ElectronApplication, Page } from '@playwright/test';

const DEFAULT_DEV_PORT = String(process.env.VITE_DEV_SERVER_PORT || process.env.DEV_SERVER_PORT || 5174);
const DEV_SERVER_URL = process.env.E2E_DEV_SERVER_URL || `http://127.0.0.1:${DEFAULT_DEV_PORT}`;
// original DEV_START_URL included the test query; main.ts will append it again
const DEV_START_URL = DEV_SERVER_URL;
const MAIN_ENTRY = path.join(process.cwd(), 'dist-electron', 'electron', 'main.js');
const PACKAGED_EXE_CANDIDATES = [
  path.join(process.cwd(), 'release', 'win-unpacked', 'Mossy.exe'),
  path.join(process.cwd(), 'dist-electron', 'Mossy.exe'),
];
const LOCAL_ELECTRON_EXE =
  process.platform === 'win32'
    ? path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(process.cwd(), 'node_modules', 'electron', 'dist', 'electron');

function ensureMainBuild() {
  if (fs.existsSync(MAIN_ENTRY)) return;
  console.log('[e2e] dist-electron output missing; running build:electron');
  execSync('npm run build:electron', { stdio: 'inherit', cwd: process.cwd() });
}

async function ensurePreloadInjected(page: Page, fallbackStartUrl?: string) {
  if (fallbackStartUrl && page.url() === 'about:blank') {
    // add ?test=true when manually navigating; main process adds the query when creating window
    await page.goto(`${fallbackStartUrl}?test=true`);
  }

  await page.waitForLoadState('domcontentloaded');
  // preload bridge must appear before we can call any Electron APIs
  await page.waitForFunction(() => Boolean((window as any).electron?.api), { timeout: 20000 });
  // also wait for the renderer to mark itself ready (boot/UI initialization complete)
  await page.waitForFunction(() => (window as any).__MOSSY_TEST_READY__ === true, { timeout: 20000 }).catch(() => {
    // not critical if the flag never appears, just continue
  });
}

export async function launchElectronApp(projectName: string): Promise<{ electronApp: ElectronApplication; page: Page }> {
  ensureMainBuild();

  const isPackagedProject = projectName === 'electron-packaged';
  const packagedExe = PACKAGED_EXE_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  const hasLocalElectron = fs.existsSync(LOCAL_ELECTRON_EXE);

  const envSource: NodeJS.ProcessEnv = {
    ...process.env,
    ELECTRON_IS_TEST: 'true',
    NODE_ENV: isPackagedProject ? 'production' : 'development',
    DEV_SERVER_PORT: DEFAULT_DEV_PORT,
    VITE_DEV_SERVER_PORT: DEFAULT_DEV_PORT,
    ELECTRON_ENABLE_LOGGING: 'true',
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
  };

  if (!isPackagedProject) {
    envSource.ELECTRON_START_URL = DEV_START_URL;
  } else {
    delete envSource.ELECTRON_START_URL;
  }

  const env = Object.fromEntries(
    Object.entries(envSource).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  );

  const launchOptions: {
    cwd: string;
    env: { [key: string]: string };
    args: string[];
    executablePath?: string;
  } = {
    cwd: process.cwd(),
    env,
    args: ['.'],
  };

  if (isPackagedProject && packagedExe) {
    launchOptions.executablePath = packagedExe;
    launchOptions.args = [];
  } else if (hasLocalElectron) {
    launchOptions.executablePath = LOCAL_ELECTRON_EXE;
  } else {
    launchOptions.args = [MAIN_ENTRY];
  }

  // avoid dumping full env object here; it was flooding logs and truncating test output
  console.log('[e2e] launching electron');
  const electronApp = await _electron.launch(launchOptions).catch(err => {
    console.error('[e2e] electron.launch failed', err);
    throw err;
  });
  console.log('[e2e] electron launched, retrieving first window');
  let page = await electronApp.firstWindow().catch(err => {
    console.error('[e2e] firstWindow failed', err);
    throw err;
  });
  // if DevTools auto-opened, the first window will be the devtools UI
  if (page.url().startsWith('devtools://')) {
    console.log('[e2e] first window was DevTools, waiting for app window');
    page = await electronApp.waitForEvent('window');
  }
  console.log('[e2e] obtained page handle', page.url());
  console.log('[e2e] obtained page handle');

  // attach debug listeners before anything else
  page.on('console', msg => console.log('[e2e][page console]', msg.text()));
  page.on('pageerror', err => console.error('[e2e][pageerror]', err));
  page.on('crash', () => console.error('[e2e] page crashed')); 
  page.on('close', () => console.error('[e2e] page closed unexpectedly'));

  // ensure preload injection first; the renderer may navigate before DOM is ready
  console.log('[e2e] calling ensurePreloadInjected');
  await ensurePreloadInjected(page, isPackagedProject ? undefined : DEV_START_URL);
  console.log('[e2e] ensurePreloadInjected returned');

  // mark onboarding and boot so no startup UI interferes with tests
  console.log('[e2e] setting onboarding/boot flags');
  try {
    await page.evaluate(() => {
      // both variants are used in the renderer; migration only copies one to the other
      localStorage.setItem('mossy_onboarding_completed', 'true');
      localStorage.setItem('mossy_onboarding_complete', 'true');
      // skip the boot sequence (normally triggered by ?test=true or a prior run)
      localStorage.setItem('mossy_has_booted', 'true');
      // first-run flow should be marked complete too
      localStorage.setItem('mossy_first_run_complete', 'true');
      // mark voice setup done so we don't see the overlay
      localStorage.setItem('mossy_voice_setup_complete', 'true');
      // also opt into test mode in case any logic checks for it directly
      localStorage.setItem('mossy_test_mode', 'true');
      // also set a readiness flag for the harness to wait on if needed
      (window as any).__MOSSY_TEST_READY__ = true;
    });
  } catch (e) {
    console.warn('[e2e] failed to set onboarding/boot flags', e);
  }

  // take debug screenshots once ready or right after preload
  console.log('[e2e] about to wait for __MOSSY_TEST_READY__');
  try {
    await page.waitForFunction(() => (window as any).__MOSSY_TEST_READY__ === true, { timeout: 20000 });
    await page.screenshot({ path: 'e2e-ready.png', fullPage: true });
    // log nav/sidebar presence for further debugging
    const count = await page.evaluate(() => document.querySelectorAll('nav, .sidebar').length);
    console.log('[e2e] post-ready nav/sidebar count =', count);
  } catch (err) {
    console.error('[e2e] error during ready-wait or screenshot', err);
    await page.screenshot({ path: 'e2e-preload.png', fullPage: true }).catch((e) => {
      console.error('[e2e] screenshot failed', e);
    });
    const count = await page.evaluate(() => document.querySelectorAll('nav, .sidebar').length).catch((e) => {
      console.error('[e2e] nav/sidebar evaluate failed', e);
      return -1;
    });
    console.log('[e2e] preload nav/sidebar count =', count);
  }

  return { electronApp, page };
}

export { ensurePreloadInjected };
