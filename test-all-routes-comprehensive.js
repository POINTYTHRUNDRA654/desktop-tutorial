const puppeteer = require('puppeteer');

async function testAllRoutes() {
  console.log('🚀 Starting comprehensive Mossy route testing...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // All routes from App.tsx organized by category
  const routeCategories = {
    'Core Application': [
      { name: 'Home/The Nexus', path: '/' },
      { name: 'AI Chat Interface', path: '/chat' },
      { name: 'Roadmap Panel', path: '/roadmap' },
      { name: 'Voice Chat', path: '/live' }
    ],
    'Core Tools': [
      { name: 'Tools Hub', path: '/tools' },
      { name: 'System Monitor', path: '/tools/monitor' },
      { name: 'Asset Auditor', path: '/tools/auditor' },
      { name: 'Mining Panel', path: '/tools/mining' },
      { name: 'Advanced Analysis', path: '/tools/advanced-analysis' },
      { name: 'The Assembler', path: '/tools/assembler' },
      { name: 'The Blueprint', path: '/tools/blueprint' },
      { name: 'The Scribe', path: '/tools/scribe' },
      { name: 'The Vault', path: '/tools/vault' },
      { name: 'Duplicate Finder', path: '/tools/dedupe' },
      { name: 'BA2 Manager', path: '/tools/ba2-manager' }
    ],
    'Development & Workflow': [
      { name: 'Dev Hub', path: '/dev' },
      { name: 'Workshop', path: '/dev/workshop' },
      { name: 'Workflow Orchestrator', path: '/dev/orchestrator' },
      { name: 'Workflow Runner', path: '/dev/workflow-runner' },
      { name: 'Neural Link', path: '/dev/neural-link' },
      { name: 'Workflow Recorder', path: '/dev/workflow-recorder' },
      { name: 'Plugin Manager', path: '/dev/plugin-manager' },
      { name: 'Mining Dashboard', path: '/dev/mining-dashboard' },
      { name: 'Load Order', path: '/dev/load-order' }
    ],
    'Media & Assets': [
      { name: 'Media Hub', path: '/media' },
      { name: 'Image Suite', path: '/media/images' },
      { name: 'TTS Panel', path: '/media/tts' },
      { name: 'Memory Vault', path: '/media/memory-vault' }
    ],
    'Testing & Deployment': [
      { name: 'Test Hub', path: '/test' },
      { name: 'Holodeck', path: '/test/holo' },
      { name: 'Notification Test', path: '/test/notification-test' },
      { name: 'Desktop Bridge', path: '/test/bridge' }
    ],
    'Knowledge & Learning': [
      { name: 'Learn Hub', path: '/learn' },
      { name: 'Lorekeeper', path: '/learn/lore' },
      { name: 'Knowledge Search', path: '/learn/knowledge' },
      { name: 'Quick Reference', path: '/learn/reference' },
      { name: 'Community Learning', path: '/learn/community' },
      { name: 'Local Capabilities', path: '/learn/capabilities' }
    ],
    'Blender Guides': [
      { name: 'Blender Hub', path: '/guides/blender' },
      { name: 'Animation Guide', path: '/guides/blender/animation' },
      { name: 'Skeleton Reference', path: '/guides/blender/skeleton' },
      { name: 'Animation Validator', path: '/guides/blender/animation-validator' },
      { name: 'Rigging Checklist', path: '/guides/blender/rigging-checklist' },
      { name: 'Export Settings', path: '/guides/blender/export-settings' },
      { name: 'Rigging Mistakes', path: '/guides/blender/rigging-mistakes' }
    ],
    'Creation Kit Guides': [
      { name: 'Creation Kit Hub', path: '/guides/creation-kit' },
      { name: 'Precombine PRP Guide', path: '/guides/creation-kit/precombine-prp' },
      { name: 'Precombine Checker', path: '/guides/creation-kit/precombine-checker' },
      { name: 'Leveled List Injection', path: '/guides/creation-kit/leveled-list-injection' },
      { name: 'Quest Authoring', path: '/guides/creation-kit/quest-authoring' },
      { name: 'CK Quest Dialogue', path: '/guides/creation-kit/ck-quest-dialogue' }
    ],
    'Papyrus Guides': [
      { name: 'Papyrus Hub', path: '/guides/papyrus' },
      { name: 'PaperScript Guide', path: '/guides/papyrus/guide' },
      { name: 'Quick Start Guide', path: '/guides/papyrus/quick-start' },
      { name: 'Fallout 4 Guide', path: '/guides/papyrus/fallout4' }
    ],
    'Physics Guides': [
      { name: 'Physics Hub', path: '/guides/physics' },
      { name: 'Havok Guide', path: '/guides/physics/havok' },
      { name: 'Havok Quick Start', path: '/guides/physics/havok-quick-start' },
      { name: 'Havok Fallout 4', path: '/guides/physics/havok-fo4' }
    ],
    'Mod Guides': [
      { name: 'Mods Hub', path: '/guides/mods' },
      { name: 'BodySlide Guide', path: '/guides/mods/bodyslide' },
      { name: 'Sim Settlements', path: '/guides/mods/sim-settlements' },
      { name: 'Sim Settlements Addon', path: '/guides/mods/sim-settlements-addon' },
      { name: 'Units Loadouts', path: '/guides/mods/sim-settlements-units-loadouts' },
      { name: 'Addon Toolkits', path: '/guides/mods/sim-settlements-addon-toolkits' }
    ],
    'Wizards': [
      { name: 'Wizards Hub', path: '/wizards' },
      { name: 'Install Wizard', path: '/wizards/install' },
      { name: 'Platforms Hub', path: '/wizards/platforms' },
      { name: 'Crash Triage', path: '/wizards/crash-triage' },
      { name: 'Packaging Release', path: '/wizards/packaging-release' },
      { name: 'PRP Patch Builder', path: '/wizards/prp-patch-builder' }
    ],
    'Development Tools': [
      { name: 'DevTools Hub', path: '/devtools' },
      { name: 'Script Analyzer', path: '/devtools/script-analyzer' },
      { name: 'Template Generator', path: '/devtools/template-generator' },
      { name: 'Tool Verify', path: '/devtools/tool-verify' },
      { name: 'Diagnostics', path: '/devtools/diagnostics' }
    ],
    'Settings': [
      { name: 'Settings Hub', path: '/settings' },
      { name: 'Privacy Settings', path: '/settings/privacy' },
      { name: 'Voice Settings', path: '/settings/voice' },
      { name: 'Language Settings', path: '/settings/language' },
      { name: 'External Tools', path: '/settings/tools' },
      { name: 'Import/Export', path: '/settings/import-export' }
    ],
    'Project Management': [
      { name: 'Project Hub', path: '/project' },
      { name: 'Mod Project Manager', path: '/project/journey' },
      { name: 'Modding Journey', path: '/project/achievements' },
      { name: 'Project Manager', path: '/project/manager' },
      { name: 'Project Creator', path: '/project/create' },
      { name: 'Collaboration', path: '/project/collaboration' },
      { name: 'Analytics', path: '/project/analytics' },
      { name: 'Analytics Dashboard', path: '/project/analytics-dashboard' }
    ],
    'Support': [
      { name: 'Donation Support', path: '/support' }
    ]
  };

  let totalRoutes = 0;
  let successfulRoutes = 0;
  let failedRoutes = [];

  for (const [category, routes] of Object.entries(routeCategories)) {
    console.log(`\n📂 Testing ${category}:`);
    console.log('='.repeat(50));

    for (const route of routes) {
      totalRoutes++;
      try {
        console.log(`🔍 Testing: ${route.name} (${route.path})`);

        await page.goto(`http://127.0.0.1:5174${route.path}`, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        const title = await page.title();
        const hasContent = await page.evaluate(() => {
          return document.body.innerText.length > 50;
        });

        const hasError = await page.evaluate(() => {
          return document.body.innerText.includes('Error') ||
                 document.body.innerText.includes('Failed to load') ||
                 document.body.innerText.includes('Component not found');
        });

        if (hasContent && !hasError) {
          console.log(`✅ ${route.name} - Loaded successfully (Title: ${title})`);
          successfulRoutes++;
        } else if (hasError) {
          console.log(`❌ ${route.name} - Error detected on page`);
          failedRoutes.push(route);
        } else {
          console.log(`⚠️  ${route.name} - Loaded but minimal content`);
          failedRoutes.push(route);
        }

      } catch (error) {
        console.log(`❌ ERROR: ${route.name} - ${error.message}`);
        failedRoutes.push(route);
      }
    }
  }

  // Test legacy redirects
  console.log(`\n📂 Testing Legacy Redirects:`);
  console.log('='.repeat(50));

  const legacyRoutes = [
    { name: 'Legacy Monitor', path: '/monitor', redirectTo: '/tools/monitor' },
    { name: 'Legacy Load Order', path: '/load-order', redirectTo: '/dev/load-order' },
    { name: 'Legacy Assembler', path: '/assembler', redirectTo: '/tools/assembler' },
    { name: 'Legacy Auditor', path: '/auditor', redirectTo: '/tools/auditor' },
    { name: 'Legacy Blueprint', path: '/blueprint', redirectTo: '/tools/blueprint' },
    { name: 'Legacy Scribe', path: '/scribe', redirectTo: '/tools/scribe' },
    { name: 'Legacy Orchestrator', path: '/orchestrator', redirectTo: '/dev/orchestrator' },
    { name: 'Legacy Workflow Runner', path: '/workflow-runner', redirectTo: '/dev/workflow-runner' },
    { name: 'Legacy Lore', path: '/lore', redirectTo: '/learn/lore' },
    { name: 'Legacy Holodeck', path: '/holo', redirectTo: '/test/holo' },
    { name: 'Legacy Vault', path: '/vault', redirectTo: '/tools/vault' },
    { name: 'Legacy Memory Vault', path: '/memory-vault', redirectTo: '/media/memory-vault' },
    { name: 'Legacy Neural Link', path: '/neural-link', redirectTo: '/dev/neural-link' },
    { name: 'Legacy Workshop', path: '/workshop', redirectTo: '/dev/workshop' },
    { name: 'Legacy Images', path: '/images', redirectTo: '/media/images' },
    { name: 'Legacy TTS', path: '/tts', redirectTo: '/media/tts' },
    { name: 'Legacy Bridge', path: '/bridge', redirectTo: '/test/bridge' },
    { name: 'Legacy Dedupe', path: '/dedupe', redirectTo: '/tools/dedupe' },
    { name: 'Legacy Diagnostics', path: '/diagnostics', redirectTo: '/devtools/diagnostics' },
    { name: 'Legacy Tool Verify', path: '/tool-verify', redirectTo: '/devtools/tool-verify' },
    { name: 'Legacy Community', path: '/community', redirectTo: '/learn/community' },
    { name: 'Legacy Reference', path: '/reference', redirectTo: '/learn/reference' },
    { name: 'Legacy Capabilities', path: '/capabilities', redirectTo: '/learn/capabilities' },
    { name: 'Legacy Script Analyzer', path: '/script-analyzer', redirectTo: '/devtools/script-analyzer' },
    { name: 'Legacy Template Generator', path: '/template-generator', redirectTo: '/devtools/template-generator' },
    { name: 'Legacy Install Wizard', path: '/install-wizard', redirectTo: '/wizards/install' },
    { name: 'Legacy Platforms', path: '/platforms', redirectTo: '/wizards/platforms' },
    { name: 'Legacy Crash Triage', path: '/crash-triage', redirectTo: '/wizards/crash-triage' },
    { name: 'Legacy Packaging Release', path: '/packaging-release', redirectTo: '/wizards/packaging-release' },
    { name: 'Legacy CK Quest Dialogue', path: '/ck-quest-dialogue', redirectTo: '/guides/creation-kit/ck-quest-dialogue' },
    { name: 'Legacy PRP Patch Builder', path: '/prp-patch-builder', redirectTo: '/wizards/prp-patch-builder' },
    { name: 'Legacy Animation Guide', path: '/animation-guide', redirectTo: '/guides/blender/animation' },
    { name: 'Legacy Skeleton Reference', path: '/skeleton-reference', redirectTo: '/guides/blender/skeleton' },
    { name: 'Legacy Animation Validator', path: '/animation-validator', redirectTo: '/guides/blender/animation-validator' },
    { name: 'Legacy Rigging Checklist', path: '/rigging-checklist', redirectTo: '/guides/blender/rigging-checklist' },
    { name: 'Legacy Export Settings', path: '/export-settings', redirectTo: '/guides/blender/export-settings' },
    { name: 'Legacy Rigging Mistakes', path: '/rigging-mistakes', redirectTo: '/guides/blender/rigging-mistakes' },
    { name: 'Legacy Precombine PRP', path: '/precombine-prp', redirectTo: '/guides/creation-kit/precombine-prp' },
    { name: 'Legacy Precombine Checker', path: '/precombine-checker', redirectTo: '/guides/creation-kit/precombine-checker' },
    { name: 'Legacy Leveled List Injection', path: '/leveled-list-injection', redirectTo: '/guides/creation-kit/leveled-list-injection' },
    { name: 'Legacy Quest Authoring', path: '/quest-mod-authoring-guide', redirectTo: '/guides/creation-kit/quest-authoring' },
    { name: 'Legacy Quest Authoring Alt', path: '/quest-authoring', redirectTo: '/guides/creation-kit/quest-authoring' },
    { name: 'Legacy Journey', path: '/journey', redirectTo: '/project/journey' },
    { name: 'Legacy BodySlide', path: '/bodyslide', redirectTo: '/guides/mods/bodyslide' },
    { name: 'Legacy Sim Settlements', path: '/sim-settlements', redirectTo: '/guides/mods/sim-settlements' },
    { name: 'Legacy Sim Settlements Addon', path: '/sim-settlements-addon', redirectTo: '/guides/mods/sim-settlements-addon' },
    { name: 'Legacy Units Loadouts', path: '/sim-settlements-units-loadouts', redirectTo: '/guides/mods/sim-settlements-units-loadouts' },
    { name: 'Legacy Addon Toolkits', path: '/sim-settlements-addon-toolkits', redirectTo: '/guides/mods/sim-settlements-addon-toolkits' },
    { name: 'Legacy PaperScript', path: '/paperscript', redirectTo: '/guides/papyrus/guide' },
    { name: 'Legacy PaperScript Quick Start', path: '/paperscript-quick-start', redirectTo: '/guides/papyrus/quick-start' },
    { name: 'Legacy PaperScript FO4', path: '/paperscript-fo4', redirectTo: '/guides/papyrus/fallout4' },
    { name: 'Legacy Havok', path: '/havok', redirectTo: '/guides/physics/havok' },
    { name: 'Legacy Havok Quick Start', path: '/havok-quick-start', redirectTo: '/guides/physics/havok-quick-start' },
    { name: 'Legacy Havok FO4', path: '/havok-fo4', redirectTo: '/guides/physics/havok-fo4' }
  ];

  for (const route of legacyRoutes) {
    totalRoutes++;
    try {
      console.log(`🔄 Testing redirect: ${route.name} (${route.path})`);

      await page.goto(`http://127.0.0.1:5174${route.path}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const currentUrl = page.url();
      const expectedUrl = `http://127.0.0.1:5174${route.redirectTo}`;

      if (currentUrl === expectedUrl) {
        console.log(`✅ ${route.name} - Redirected correctly`);
        successfulRoutes++;
      } else {
        console.log(`❌ ${route.name} - Redirect failed (got: ${currentUrl})`);
        failedRoutes.push(route);
      }

    } catch (error) {
      console.log(`❌ ERROR: ${route.name} - ${error.message}`);
      failedRoutes.push(route);
    }
  }

  // Summary
  console.log(`\n🎯 COMPREHENSIVE ROUTE TESTING COMPLETE!`);
  console.log('='.repeat(60));
  console.log(`📊 Total Routes Tested: ${totalRoutes}`);
  console.log(`✅ Successful: ${successfulRoutes}`);
  console.log(`❌ Failed: ${failedRoutes.length}`);

  if (failedRoutes.length > 0) {
    console.log(`\n❌ Failed Routes:`);
    failedRoutes.forEach(route => {
      console.log(`   • ${route.name} (${route.path})`);
    });
  }

  const successRate = ((successfulRoutes / totalRoutes) * 100).toFixed(1);
  console.log(`\n🎉 Success Rate: ${successRate}%`);

  if (successRate === '100.0') {
    console.log('🏆 ALL ROUTES WORKING PERFECTLY!');
  } else {
    console.log('⚠️  Some routes need attention.');
  }

  console.log('\n💡 Browser remains open for manual inspection.');
  // await browser.close(); // Keep browser open for manual inspection
}

testAllRoutes().catch(console.error);