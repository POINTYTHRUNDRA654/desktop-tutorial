const puppeteer = require('puppeteer');

async function testCoreRoutes() {
  console.log('🚀 Testing Core Mossy Routes...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  const routes = [
    { name: 'Home/The Nexus', path: '/' },
    { name: 'AI Chat Interface', path: '/chat' },
    { name: 'System Monitor', path: '/tools/monitor' },
    { name: 'Asset Auditor', path: '/tools/auditor' },
    { name: 'The Assembler', path: '/tools/assembler' },
    { name: 'The Blueprint', path: '/tools/blueprint' },
    { name: 'The Scribe', path: '/tools/scribe' },
    { name: 'Settings', path: '/settings' },
    { name: 'Project Manager', path: '/project/manager' }
  ];

  for (const route of routes) {
    try {
      console.log(`🔍 Testing: ${route.name} (${route.path})`);

      await page.goto(`http://127.0.0.1:5174${route.path}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const title = await page.title();
      const hasContent = await page.evaluate(() => {
        return document.body.innerText.length > 100;
      });

      if (hasContent) {
        console.log(`✅ ${route.name} - Loaded successfully (Title: ${title})`);
      } else {
        console.log(`⚠️  ${route.name} - Loaded but minimal content`);
      }

    } catch (error) {
      console.log(`❌ ERROR: ${route.name} - ${error.message}`);
    }
  }

  console.log('\n🎯 Core route testing complete! Browser remains open for manual inspection.');
  // await browser.close(); // Keep browser open for manual inspection
}

testCoreRoutes().catch(console.error);