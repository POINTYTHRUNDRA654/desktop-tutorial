const puppeteer = require('puppeteer');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { ChromeDevTools } = require('chrome-remote-interface');

console.log('🚀 Selenium/DevTools Testing Toolkit Demo');
console.log('==========================================');

/**
 * Puppeteer DevTools Example
 */
async function puppeteerTest() {
  console.log('\n📱 Testing with Puppeteer (DevTools Protocol):');

  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Monitor network requests
  page.on('request', request => {
    console.log(`🌐 Request: ${request.url()}`);
  });

  // Monitor console messages
  page.on('console', msg => {
    console.log(`📝 Console: ${msg.text()}`);
  });

  await page.goto('https://httpbin.org/html');
  console.log('✅ Puppeteer test completed');

  await browser.close();
}

/**
 * Selenium WebDriver Example
 */
async function seleniumTest() {
  console.log('\n🤖 Testing with Selenium WebDriver:');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(new chrome.Options().addArguments('--no-sandbox'))
    .build();

  try {
    await driver.get('https://httpbin.org/html');
    const title = await driver.getTitle();
    console.log(`📄 Page title: ${title}`);
    console.log('✅ Selenium test completed');
  } finally {
    await driver.quit();
  }
}

/**
 * Chrome Remote Interface Example
 */
async function chromeRemoteTest() {
  console.log('\n🔧 Testing with Chrome Remote Interface:');

  let client;
  try {
    client = await ChromeDevTools({
      host: '127.0.0.1',
      port: 9222
    });

    const { Network, Page, Runtime } = client;

    Network.requestWillBeSent(params => {
      console.log(`📡 Network: ${params.request.url}`);
    });

    await Network.enable();
    await Page.enable();
    await Runtime.enable();

    console.log('✅ Chrome Remote Interface test completed');
  } catch (err) {
    console.log('⚠️  Chrome Remote Interface test skipped (Chrome not running)');
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run all tests
async function runAllTests() {
  try {
    await puppeteerTest();
    await seleniumTest();
    await chromeRemoteTest();

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n💡 You can now use these tools to:');
    console.log('   • Test your Electron app UI');
    console.log('   • Monitor network requests');
    console.log('   • Capture performance metrics');
    console.log('   • Automate browser interactions');
    console.log('   • Debug and troubleshoot issues');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runAllTests();