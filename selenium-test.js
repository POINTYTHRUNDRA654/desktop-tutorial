import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeleniumTest() {
  console.log('🚀 Starting Selenium test for Mossy...');

  // Set up Chrome options for Electron app
  const chromeOptions = new chrome.Options();
  chromeOptions.addArguments('--disable-web-security');
  chromeOptions.addArguments('--disable-features=VizDisplayCompositor');
  chromeOptions.addArguments('--no-sandbox');
  chromeOptions.addArguments('--disable-dev-shm-usage');

  // Path to the packaged app
  const appPath = path.join(__dirname, '../../../release/win-unpacked/Mossy.exe');
  console.log('📁 App path:', appPath);

  let driver;

  try {
    // Create WebDriver instance
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();

    console.log('✅ WebDriver started successfully');

    // Navigate to the app (this might not work directly with Electron)
    // For Electron apps, we might need a different approach
    console.log('🔍 Attempting to connect to app...');

    // Try to navigate to localhost if dev server is running
    try {
      await driver.get('http://localhost:5174');
      console.log('✅ Connected to dev server');

      // Wait for the app to load
      await driver.wait(until.elementLocated(By.css('body')), 10000);
      console.log('✅ App loaded successfully');

      // Wait a bit more for initialization
      await driver.sleep(3000);

      // Look for common elements
      const bodyText = await driver.findElement(By.css('body')).getText();
      console.log('📄 Page content preview:', bodyText.substring(0, 500) + '...');

      // Check for specific Fallout/Pip-Boy elements
      try {
        const pipBoyElements = await driver.findElements(By.css('.pipboy-outer-container, .pip-boy, [class*="pip"], [class*="fallout"]'));
        if (pipBoyElements.length > 0) {
          console.log('✅ Found Pip-Boy themed elements:', pipBoyElements.length);
        }
      } catch (e) {
        console.log('⚠️  No Pip-Boy themed elements found');
      }

      // Try to find sidebar or main content
      try {
        const sidebar = await driver.wait(until.elementLocated(By.css('.sidebar, nav, [data-testid="sidebar"], .navigation')), 5000);
        console.log('✅ Found sidebar/navigation element');
      } catch (e) {
        console.log('⚠️  Sidebar not found, app might still be loading');
      }

      // Check for loading screen or initialization messages
      try {
        const loadingElements = await driver.findElements(By.css('.loading, .spinner, [data-testid="loading"], .initializing, .bios'));
        if (loadingElements.length > 0) {
          console.log('⏳ Found loading/initialization elements:', loadingElements.length);

          // Try to get text from loading elements
          for (let i = 0; i < Math.min(loadingElements.length, 3); i++) {
            try {
              const text = await loadingElements[i].getText();
              if (text.trim()) {
                console.log(`📝 Loading text ${i + 1}: "${text.substring(0, 100)}..."`);
              }
            } catch (e) {
              // Ignore individual element errors
            }
          }
        }
      } catch (e) {
        console.log('✅ No loading indicators found');
      }

      // Check page title
      const title = await driver.getTitle();
      console.log('📋 Page title:', title);

      // Try to find any clickable elements
      try {
        const buttons = await driver.findElements(By.css('button, [role="button"], .btn, [onclick]'));
        console.log('🔘 Found clickable elements:', buttons.length);

        if (buttons.length > 0) {
          // Try to click the first button to see if it does anything
          try {
            await buttons[0].click();
            console.log('🖱️  Clicked first button');
            await driver.sleep(2000); // Wait to see if anything changes

            const newBodyText = await driver.findElement(By.css('body')).getText();
            if (newBodyText !== bodyText) {
              console.log('📄 Content changed after click!');
            }
          } catch (e) {
            console.log('⚠️  Could not click button:', e.message);
          }
        }
      } catch (e) {
        console.log('⚠️  No clickable elements found');
      }

    } catch (e) {
      console.log('❌ Could not connect to dev server:', e.message);
      console.log('💡 Make sure the dev server is running with: npm run dev');
    }

  } catch (error) {
    console.error('❌ Selenium test failed:', error);
  } finally {
    if (driver) {
      await driver.quit();
      console.log('🛑 WebDriver closed');
    }
  }
}

// Run the test
runSeleniumTest().catch(console.error);