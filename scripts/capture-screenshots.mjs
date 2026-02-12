#!/usr/bin/env node
/**
 * Automated Screenshot Capture for Mossy Tutorial
 * 
 * This script uses Playwright to automatically capture screenshots
 * of all key pages and modules for the comprehensive tutorial.
 * 
 * Usage:
 *   npm run capture-screenshots
 * 
 * Prerequisites:
 *   - Run `npm install` to install dependencies
 *   - Ensure the app is built or run in dev mode
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const APP_URL = 'http://localhost:5174';

// Screenshot configuration
const screenshots = [
  // Core Modules
  { name: 'nexus-dashboard-overview', path: '/', description: 'The Nexus main dashboard' },
  { name: 'chat-interface', path: '/chat', description: 'Chat interface' },
  { name: 'live-voice', path: '/live-voice', description: 'Live voice chat' },
  
  // Tools
  { name: 'auditor-main', path: '/auditor', description: 'The Auditor main interface' },
  { name: 'image-suite-main', path: '/media/images', description: 'Image Suite' },
  { name: 'workshop-editor', path: '/workshop', description: 'Workshop code editor' },
  { name: 'vault-browser', path: '/vault', description: 'The Vault file browser' },
  { name: 'scribe-editor', path: '/scribe', description: 'The Scribe text editor' },
  { name: 'ba2-manager', path: '/ba2-manager', description: 'BA2 archive manager' },
  
  // Development
  { name: 'workflow-orchestrator', path: '/workflow-orchestrator', description: 'Workflow builder' },
  { name: 'workflow-recorder', path: '/workflow-recorder', description: 'Workflow recorder' },
  { name: 'plugin-manager', path: '/plugin-manager', description: 'Plugin Manager' },
  { name: 'mining-dashboard', path: '/mining-dashboard', description: 'Mining Dashboard' },
  
  // Testing & Deployment
  { name: 'holodeck-launch', path: '/holodeck', description: 'Holodeck game launch' },
  { name: 'bridge-tools', path: '/bridge', description: 'Desktop Bridge' },
  
  // Learning
  { name: 'learning-hub-main', path: '/learning-hub', description: 'Learning Hub' },
  
  // Settings
  { name: 'settings-general', path: '/settings', description: 'Settings page' },
  
  // Wizards
  { name: 'wizards-hub', path: '/wizards', description: 'Wizards Hub' },
];

async function ensureDirectory() {
  if (!existsSync(SCREENSHOT_DIR)) {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
  }
}

async function captureScreenshots() {
  console.log('🎬 Starting automated screenshot capture...\n');
  
  await ensureDirectory();
  
  const browser = await chromium.launch({
    headless: true,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  
  const page = await context.newPage();
  
  let captured = 0;
  let failed = 0;
  
  for (const screenshot of screenshots) {
    try {
      console.log(`📸 Capturing: ${screenshot.name}`);
      console.log(`   Path: ${screenshot.path}`);
      
      // Navigate to the page
      await page.goto(`${APP_URL}${screenshot.path}`, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
      
      // Wait a bit for animations/loading
      await page.waitForTimeout(2000);
      
      // Capture screenshot
      const filename = path.join(SCREENSHOT_DIR, `${screenshot.name}.png`);
      await page.screenshot({
        path: filename,
        fullPage: false,
      });
      
      console.log(`   ✅ Saved: ${screenshot.name}.png\n`);
      captured++;
    } catch (error) {
      console.error(`   ❌ Failed: ${screenshot.name}`);
      console.error(`   Error: ${error.message}\n`);
      failed++;
    }
  }
  
  await browser.close();
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Successfully captured: ${captured} screenshots`);
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed} screenshots`);
  }
  console.log(`\n💾 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('\n📝 Next steps:');
  console.log('   1. Review the screenshots in docs/screenshots/');
  console.log('   2. Update MOSSY_COMPREHENSIVE_TUTORIAL.md with image references');
  console.log('   3. Commit and push the changes');
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('❌ Error running screenshot capture:', error);
  process.exit(1);
});
