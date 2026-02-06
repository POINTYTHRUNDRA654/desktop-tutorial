const puppeteer = require('puppeteer');

async function testCoreRoutes() {
  console.log('🚀 Testing Core Mossy Routes...\n');

  let browser;
  let page;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Core routes to test
    const coreRoutes = [
      { path: '/', name: 'Home/The Nexus' },
      { path: '/chat', name: 'AI Chat Interface' },
      { path: '/tools/monitor', name: 'System Monitor' },
      { path: '/tools/auditor', name: 'Asset Auditor' },
      { path: '/tools/assembler', name: 'The Assembler' },
      { path: '/tools/blueprint', name: 'The Blueprint' },
      { path: '/tools/scribe', name: 'The Scribe' },
      { path: '/settings', name: 'Settings' },
      { path: '/project/manager', name: 'Project Manager' }
    ];

    console.log('📂 Testing Core Routes:\n');

    for (const route of coreRoutes) {
      try {
        console.log(`🔍 Testing: ${route.name} (${route.path})`);

        const url = `http://127.0.0.1:5174${route.path}`;
        const response = await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 15000
        });

        if (response.ok()) {
          await page.waitForTimeout(1000);

          // Check for basic content
          const hasContent = await page.evaluate(() => {
            return document.body && document.body.innerHTML.length > 100;
          });

          if (hasContent) {
            console.log(`✅ PASS: ${route.name}\n`);
          } else {
            console.log(`❌ FAIL: ${route.name} - No content loaded\n`);
          }
        } else {
          console.log(`❌ FAIL: ${route.name} - HTTP ${response.status()}\n`);
        }

      } catch (error) {
        console.log(`❌ ERROR: ${route.name} - ${error.message}\n`);
      }
    }

    console.log('🎯 Core route testing complete! Browser remains open for manual inspection.');

  } catch (error) {
    console.error('💥 Test setup failed:', error);
  }
}

testCoreRoutes();