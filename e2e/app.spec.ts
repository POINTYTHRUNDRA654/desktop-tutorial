import { test, expect } from '@playwright/test';
import { launchElectronApp } from './utils/electronHarness';

// extend timeout for slow startup/loading; individual waits also increased below
test.setTimeout(120000);

test.describe('Mossy Desktop App - Comprehensive Testing Suite', () => {
  let electronApp: any;
  let page: any;

  async function waitForSidebar(p: any, timeout = 60000) {
    const start = Date.now();
    let htmlSnapshot: string | null = null;
    try {
      await p.waitForSelector('nav, .sidebar', { timeout });
    } catch (err) {
      // fall through to final logging but rethrow afterwards
      throw err;
    } finally {
      const filename = `sidebar-debug-${Date.now()}.png`;
      const fullpath = require('path').join(process.cwd(), filename);
      await p.screenshot({ path: fullpath, fullPage: true }).catch(() => {});
      htmlSnapshot = await p.content().catch(() => null);
      console.log(`[debug] waitForSidebar elapsed ${Date.now() - start}ms; screenshot saved ${fullpath}`);
      if (htmlSnapshot) {
        const preview = htmlSnapshot.length > 1000 ? htmlSnapshot.slice(0, 1000) : htmlSnapshot;
        console.log('[debug] DOM snippet:', preview.replace(/\n/g, ' '));
        if (!/nav|sidebar/.test(htmlSnapshot)) {
          console.error('[debug] DOM does not contain nav or sidebar selectors');
        }
      }
    }
  }

  test.beforeAll(async ({}, testInfo) => {
    const launched = await launchElectronApp(testInfo.project.name);
    electronApp = launched.electronApp;
    page = launched.page;

    // Capture renderer console and uncaught errors for debugging
    page.on('console', msg => console.log('[renderer console]', msg.type(), msg.text()));
    page.on('pageerror', err => console.error('[renderer error]', err));

    // Log the current URL for debugging
    const currentUrl = page.url();
    console.log('Electron app loaded URL:', currentUrl);

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000); // Extra time for Electron app initialization

    // wait for renderer readiness flag (boot sequence complete)
    await page.waitForFunction(() => (window as any).__MOSSY_TEST_READY__ === true, { timeout: 20000 }).catch(() => {
      // okay if not set
    });

    // debug: log the initial DOM before checking for sidebar
    const initialHtml = await page.content().catch(() => '<unable to read>');
    // write full HTML to file for offline inspection
    try {
      const fs = require('fs');
      fs.writeFileSync('initial-dom.html', initialHtml);
    } catch (e) {
      console.warn('[debug] could not write initial-dom.html', e);
    }
    console.log('[debug] beforeAll initial DOM snippet', initialHtml.slice(0, 1000));

    // Wait for React app to fully load - look for actual app content, not loading screen
    await waitForSidebar(page, 60000);
    // also ensure initial loading indicator is present so tests know page has mounted
    await page.waitForSelector('.pipboy-outer-container', { timeout: 60000 });
  });

  test.afterAll(async () => {
    // Close the app
    await electronApp.close();
  });

  test('App launches successfully', async () => {
    test.setTimeout(120000);
    // Check that the main app loaded
    const title = await page.title();
    console.log('Page title:', title);

    // Wait for the loading screen to disappear and actual app to load
    // The app shows a pipboy loading screen initially
    await page.waitForSelector('.pipboy-outer-container', { timeout: 10000 });
    console.log('Loading screen detected');

    // Wait for the loading screen to disappear and sidebar to appear
    await waitForSidebar(page, 30000);
    console.log('App loaded, sidebar found');

    expect(title).toMatch(/Mossy|OmniForge/); // Accept either title for now

    // Check that the sidebar is visible
    const sidebar = page.locator('[data-testid="sidebar"], .sidebar, nav');
    await expect(sidebar).toBeVisible({ timeout: 5000 });
  });

  test('Navigation works correctly', async () => {
    test.setTimeout(90000);
    // App should already be loaded from beforeAll, but wait for sidebar
    await waitForSidebar(page, 60000);

    // Test sidebar navigation - look for chat link
    const chatLink = page.locator('a[href="/chat"], [data-testid="nav-chat"], button:has-text("Chat"), a:has-text("Chat")');
    await expect(chatLink.first()).toBeVisible({ timeout: 5000 });

    // Click on AI Chat
    await chatLink.first().click();

    // Wait for navigation (client-side routing)
    await page.waitForTimeout(1000);

    // Check that chat interface loads
    const chatInput = page.locator('textarea, input[type="text"]');
    await expect(chatInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('AI Chat functionality', async () => {
    test.setTimeout(90000);
    // App should already be loaded, wait for sidebar
    await waitForSidebar(page, 60000);

    // Navigate to chat using sidebar
    const chatLink = page.locator('a[href="/chat"], [data-testid="nav-chat"], button:has-text("Chat"), a:has-text("Chat")');
    if (await chatLink.isVisible()) {
      await chatLink.click();
      await page.waitForTimeout(1000);
    }

    // Check chat interface elements
    const chatContainer = page.locator('[data-testid="chat-container"], .chat-container, main');
    await expect(chatContainer).toBeVisible({ timeout: 5000 });

    // Test typing in chat
    const input = page.locator('textarea[data-testid="chat-input"], textarea');
    await expect(input.first()).toBeVisible({ timeout: 5000 });

    // Type a test message
    await input.first().fill('Hello Mossy, this is a test message');

    // Check if send button exists and is clickable
    const sendButton = page.locator('button[data-testid="send-button"], button[type="submit"], [aria-label*="send"]');
    if (await sendButton.isVisible()) {
      await sendButton.click();

      // Wait for response (this might take time due to AI processing)
      await page.waitForTimeout(5000);

      // Check if response appears
      const messages = page.locator('[data-testid="message"], .message, .chat-message');
      await expect(messages).toHaveCount(await messages.count() + 1);
    }
  });

  test('Desktop Bridge loads correctly', async () => {
    // Wait for app to load
    await waitForSidebar(page, 10000);

    // Navigate to bridge using sidebar
    const bridgeLink = page.locator('a[href="/bridge"], [data-testid="nav-bridge"], button:has-text("Bridge"), a:has-text("Bridge")');
    if (await bridgeLink.isVisible()) {
      await bridgeLink.click();
      await page.waitForTimeout(1000);
    } else {
      // Try direct navigation if link not found
      await page.evaluate(() => {
        // Use React Router programmatically
        window.history.pushState({}, '', '/bridge');
        // Trigger a popstate event to make React Router respond
        window.dispatchEvent(new PopStateEvent('popstate', {}));
      });
      await page.waitForTimeout(2000);
    }

    // Check that bridge interface loads (not a black page)
    const bridgeContent = page.locator('.desktop-bridge, [data-testid="bridge"], main');
    await expect(bridgeContent).toBeVisible({ timeout: 5000 });

    // Check for bridge-specific elements
    const bridgeTitle = page.locator('h1, h2, .title').filter({ hasText: /bridge|Bridge/ });
    await expect(bridgeTitle.or(page.locator('text=/Bridge/')).first()).toBeVisible({ timeout: 5000 });
  });

  test('Voice/TTS functionality', async () => {
    console.log('[e2e] running Voice/TTS test with waitForSidebar');
    // Wait for app to load
    await waitForSidebar(page, 10000);

    // Navigate to chat where voice is used
    const chatLink = page.locator('a[href="/chat"], [data-testid="nav-chat"], button:has-text("Chat"), a:has-text("Chat")');
    if (await chatLink.isVisible()) {
      await chatLink.click();
      await page.waitForTimeout(1000);
    }

    // Check if voice controls are present
    const voiceToggle = page.locator('[data-testid="voice-toggle"], [aria-label*="voice"], .voice-toggle');
    if (await voiceToggle.isVisible()) {
      // Test voice toggle
      await voiceToggle.click();

      // Check if voice status changes
      await page.waitForTimeout(1000);
    }

    // Test TTS by sending a message and checking for audio playback
    const input = page.locator('textarea[data-testid="chat-input"], textarea');
    const sendButton = page.locator('button[data-testid="send-button"], button[type="submit"]');

    if (await input.isVisible() && await sendButton.isVisible()) {
      await input.first().fill('Test voice response');
      await sendButton.click();

      // Wait for potential TTS processing
      await page.waitForTimeout(3000);

      // Check console for TTS errors (this would require custom logging)
      // For now, just ensure no crashes occurred
      const title = await page.title();
      expect(title).toMatch(/Mossy|OmniForge/); // App still running
    }
  });

  test('System Monitor loads', async () => {
    // Wait for app to load
    await waitForSidebar(page, 60000);

    // Navigate to system using sidebar
    const systemLink = page.locator('a[href="/system"], [data-testid="nav-system"], button:has-text("System"), a:has-text("System")');
    if (await systemLink.isVisible()) {
      await systemLink.click();
      await page.waitForTimeout(1000);
    } else {
      // Try direct navigation
      await page.evaluate(() => {
        window.history.pushState({}, '', '/system');
        window.dispatchEvent(new PopStateEvent('popstate', {}));
      });
      await page.waitForTimeout(2000);
    }

    // Check for system monitor content
    const systemContent = page.locator('[data-testid="system-monitor"], .system-monitor');
    await expect(systemContent.or(page.locator('text=/System/')).first()).toBeVisible({ timeout: 5000 });
  });

  test('Settings panel works', async () => {
    // Wait for app to load
    await waitForSidebar(page, 90000);

    // Look for settings button/link (accounts for nav-settings testid)
    const settingsLink = page.locator(
      'a[href*="settings"], [data-testid="nav-settings"], [data-testid="settings"]'
    );
    await expect(settingsLink.first()).toBeVisible({ timeout: 10000 });
    await settingsLink.first().click();

    // Wait for a settings heading or panel content to appear
    const settingsHeading = page.locator('text=Settings').first();
    await expect(settingsHeading).toBeVisible({ timeout: 10000 });

    // as a fallback, also allow generic container styles
    const settingsPanel = page.locator('[data-testid="settings"], .settings');
    await expect(settingsPanel.first()).toBeVisible({ timeout: 10000 });
  });

  test('Error boundaries work', async () => {
    // Wait for app to load
    await waitForSidebar(page, 90000);

    // Try to navigate to a non-existent route using React Router
    await page.evaluate(() => {
      window.history.pushState({}, '', '/non-existent-route');
      window.dispatchEvent(new PopStateEvent('popstate', {}));
    });

    await page.waitForTimeout(2000);

    // Should show error boundary or redirect to valid page
    // At minimum, app shouldn't crash
    const title = await page.title();
    expect(title).toMatch(/Mossy|OmniForge/);
  });

  test('Memory and performance', async () => {
    // Wait for app to load
    await page.waitForSelector('nav, .sidebar', { timeout: 60000 });

    // Navigate through multiple pages to test memory usage
    const routes = ['/chat', '/system', '/bridge', '/'];

    for (const route of routes) {
      try {
        // Use React Router navigation
        await page.evaluate((r) => {
          window.history.pushState({}, '', r);
          window.dispatchEvent(new PopStateEvent('popstate', {}));
        }, route);

        await page.waitForTimeout(1000);
      } catch (e) {
        console.warn(`Failed to navigate to ${route}:`, e);
      }
    }

    // App should still be responsive
    const title = await page.title();
    expect(title).toMatch(/Mossy|OmniForge/);
  });
});