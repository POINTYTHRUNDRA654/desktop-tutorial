const puppeteer = require('puppeteer');

async function testMossyPages() {
  console.log('🚀 Starting comprehensive Mossy page testing...\n');

  let browser;
  let page;

  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Keep visible for manual inspection
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });

    // Enable network error logging
    page.on('response', response => {
      if (!response.ok()) {
        console.log(`⚠️  Network Error: ${response.status()} ${response.url()}`);
      }
    });

    // Test routes organized by category
    const testRoutes = {
      'Core Application': [
        { path: '/', name: 'Home/The Nexus' },
        { path: '/chat', name: 'AI Chat Interface' },
        { path: '/roadmap', name: 'Development Roadmap' },
        { path: '/live', name: 'Voice Chat' }
      ],

      'Core Tools': [
        { path: '/tools', name: 'Tools Hub' },
        { path: '/tools/monitor', name: 'System Monitor' },
        { path: '/tools/auditor', name: 'Asset Auditor' },
        { path: '/tools/mining', name: 'Mining Dashboard' },
        { path: '/tools/advanced-analysis', name: 'Advanced Analysis' },
        { path: '/tools/assembler', name: 'The Assembler' },
        { path: '/tools/blueprint', name: 'The Blueprint' },
        { path: '/tools/scribe', name: 'The Scribe' },
        { path: '/tools/vault', name: 'The Vault' },
        { path: '/tools/dedupe', name: 'Duplicate Finder' },
        { path: '/tools/ba2-manager', name: 'BA2 Archive Manager' }
      ],

      'Development & Workflow': [
        { path: '/dev', name: 'Dev Hub' },
        { path: '/dev/workshop', name: 'Workshop' },
        { path: '/dev/orchestrator', name: 'Workflow Orchestrator' },
        { path: '/dev/workflow-runner', name: 'Workflow Runner' },
        { path: '/dev/neural-link', name: 'Neural Link' },
        { path: '/dev/workflow-recorder', name: 'Workflow Recorder' },
        { path: '/dev/plugin-manager', name: 'Plugin Manager' },
        { path: '/dev/mining-dashboard', name: 'Mining Dashboard' },
        { path: '/dev/load-order', name: 'Load Order Analyzer' }
      ],

      'Media & Assets': [
        { path: '/media', name: 'Media Hub' },
        { path: '/media/images', name: 'Image Suite' },
        { path: '/media/tts', name: 'Text-to-Speech Panel' },
        { path: '/media/memory-vault', name: 'Memory Vault' }
      ],

      'Testing & Deployment': [
        { path: '/test', name: 'Test Hub' },
        { path: '/test/holo', name: 'Holodeck' },
        { path: '/test/notification-test', name: 'Notification Test' },
        { path: '/test/bridge', name: 'Desktop Bridge' }
      ],

      'Knowledge & Learning': [
        { path: '/learn', name: 'Learn Hub' },
        { path: '/learn/lore', name: 'Lorekeeper' },
        { path: '/learn/knowledge', name: 'Knowledge Search' },
        { path: '/learn/reference', name: 'Quick Reference' },
        { path: '/learn/community', name: 'Community Learning' },
        { path: '/learn/capabilities', name: 'Local Capabilities' }
      ],

      'Guides - Blender': [
        { path: '/guides/blender', name: 'Blender Guides Hub' },
        { path: '/guides/blender/animation', name: 'Animation Guide' },
        { path: '/guides/blender/skeleton', name: 'Skeleton Reference' },
        { path: '/guides/blender/animation-validator', name: 'Animation Validator' },
        { path: '/guides/blender/rigging-checklist', name: 'Rigging Checklist' },
        { path: '/guides/blender/export-settings', name: 'Export Settings' },
        { path: '/guides/blender/rigging-mistakes', name: 'Rigging Mistakes Gallery' }
      ],

      'Guides - Creation Kit': [
        { path: '/guides/creation-kit', name: 'Creation Kit Guides Hub' },
        { path: '/guides/creation-kit/precombine-prp', name: 'Precombine & PRP Guide' },
        { path: '/guides/creation-kit/precombine-checker', name: 'Precombine Checker' },
        { path: '/guides/creation-kit/leveled-list-injection', name: 'Leveled List Injection' },
        { path: '/guides/creation-kit/quest-authoring', name: 'Quest Authoring Guide' },
        { path: '/guides/creation-kit/ck-quest-dialogue', name: 'CK Quest Dialogue Wizard' }
      ],

      'Guides - Papyrus': [
        { path: '/guides/papyrus', name: 'Papyrus Guides Hub' },
        { path: '/guides/papyrus/guide', name: 'Papyrus Guide' },
        { path: '/guides/papyrus/quick-start', name: 'Quick Start Guide' },
        { path: '/guides/papyrus/fallout4', name: 'Fallout 4 Guide' }
      ],

      'Guides - Physics': [
        { path: '/guides/physics', name: 'Physics Guides Hub' },
        { path: '/guides/physics/havok', name: 'Havok Guide' },
        { path: '/guides/physics/havok-quick-start', name: 'Havok Quick Start' },
        { path: '/guides/physics/havok-fo4', name: 'Havok Fallout 4 Guide' }
      ],

      'Guides - Mods': [
        { path: '/guides/mods', name: 'Mod Guides Hub' },
        { path: '/guides/mods/bodyslide', name: 'BodySlide Guide' },
        { path: '/guides/mods/sim-settlements', name: 'Sim Settlements Guide' },
        { path: '/guides/mods/sim-settlements-addon', name: 'Sim Settlements Addon Guide' },
        { path: '/guides/mods/sim-settlements-units-loadouts', name: 'Units & Loadouts Guide' },
        { path: '/guides/mods/sim-settlements-addon-toolkits', name: 'Addon Toolkits Guide' }
      ],

      'Wizards & Advanced Tools': [
        { path: '/wizards', name: 'Wizards Hub' },
        { path: '/wizards/install', name: 'Install Wizard' },
        { path: '/wizards/platforms', name: 'Platforms Hub' },
        { path: '/wizards/crash-triage', name: 'Crash Triage Wizard' },
        { path: '/wizards/packaging-release', name: 'Packaging Release Wizard' },
        { path: '/wizards/prp-patch-builder', name: 'PRP Patch Builder' }
      ],

      'Development Tools': [
        { path: '/devtools', name: 'DevTools Hub' },
        { path: '/devtools/script-analyzer', name: 'Script Analyzer' },
        { path: '/devtools/template-generator', name: 'Template Generator' },
        { path: '/devtools/tool-verify', name: 'Tool Verify' },
        { path: '/devtools/diagnostics', name: 'Diagnostics' }
      ],

      'Settings': [
        { path: '/settings', name: 'Settings Hub' },
        { path: '/settings/privacy', name: 'Privacy Settings' },
        { path: '/settings/voice', name: 'Voice Settings' },
        { path: '/settings/language', name: 'Language Settings' },
        { path: '/settings/tools', name: 'External Tools Settings' },
        { path: '/settings/import-export', name: 'Import/Export Settings' }
      ],

      'Project Management': [
        { path: '/project', name: 'Project Hub' },
        { path: '/project/journey', name: 'Modding Journey' },
        { path: '/project/achievements', name: 'Achievements' },
        { path: '/project/manager', name: 'Project Manager' },
        { path: '/project/create', name: 'Project Creator' },
        { path: '/project/collaboration', name: 'Collaboration Manager' },
        { path: '/project/analytics', name: 'Analytics Manager' },
        { path: '/project/analytics-dashboard', name: 'Analytics Dashboard' }
      ],

      'Support': [
        { path: '/support', name: 'Support/Donation' }
      ]
    };

    const results = {
      passed: [],
      failed: [],
      errors: []
    };

    // Test each route
    for (const [category, routes] of Object.entries(testRoutes)) {
      console.log(`\n📂 Testing ${category}:`);
      console.log('='.repeat(50));

      for (const route of routes) {
        try {
          console.log(`🔍 Testing: ${route.name} (${route.path})`);

          // Navigate to the route
          const url = `http://127.0.0.1:5174${route.path}`;
          const response = await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
          });

          // Check if page loaded successfully
          if (response.ok()) {
            // Wait a bit for React to render
            await page.waitForTimeout(2000);

            // Check for error messages in the DOM
            const errorElements = await page.$$('[class*="error"], [class*="Error"], .error, .Error');
            const hasErrors = errorElements.length > 0;

            // Check page title/content
            const title = await page.title();
            const hasContent = (await page.$('body')) !== null;

            if (hasContent && !hasErrors) {
              console.log(`✅ PASS: ${route.name}`);
              results.passed.push(route);
            } else {
              console.log(`❌ FAIL: ${route.name} - ${hasErrors ? 'Has errors' : 'No content'}`);
              results.failed.push({ ...route, reason: hasErrors ? 'Has errors' : 'No content' });
            }
          } else {
            console.log(`❌ FAIL: ${route.name} - HTTP ${response.status()}`);
            results.failed.push({ ...route, reason: `HTTP ${response.status()}` });
          }

          // Brief pause between tests
          await page.waitForTimeout(500);

        } catch (error) {
          console.log(`❌ ERROR: ${route.name} - ${error.message}`);
          results.errors.push({ ...route, error: error.message });
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TESTING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`💥 Errors: ${results.errors.length}`);
    console.log(`📈 Total Routes Tested: ${results.passed.length + results.failed.length + results.errors.length}`);

    if (results.failed.length > 0) {
      console.log('\n❌ FAILED ROUTES:');
      results.failed.forEach(fail => {
        console.log(`  • ${fail.name} (${fail.path}) - ${fail.reason}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n💥 ERROR ROUTES:');
      results.errors.forEach(err => {
        console.log(`  • ${err.name} (${err.path}) - ${err.error}`);
      });
    }

    console.log('\n🎯 Testing complete! Keep the browser open for manual inspection.');

  } catch (error) {
    console.error('💥 Test setup failed:', error);
  }
}

// Run the test
testMossyPages().catch(console.error);