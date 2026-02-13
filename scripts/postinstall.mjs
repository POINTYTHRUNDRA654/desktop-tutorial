#!/usr/bin/env node

/**
 * Post-install script to ensure critical dependencies are properly installed.
 * This script ensures Electron binary is available even if install scripts were skipped.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('[postinstall] Verifying critical dependencies...');

/**
 * Check if Electron is properly installed
 */
function checkElectron() {
  const electronDistPath = join(projectRoot, 'node_modules', 'electron', 'dist');
  const electronPathFile = join(projectRoot, 'node_modules', 'electron', 'path.txt');
  
  if (!existsSync(electronDistPath) && !existsSync(electronPathFile)) {
    console.warn('[postinstall] ⚠️  Electron binary not found. Attempting to rebuild...');
    try {
      console.log('[postinstall] Running: npm rebuild electron');
      execSync('npm rebuild electron', { 
        stdio: 'inherit', 
        cwd: projectRoot 
      });
      console.log('[postinstall] ✓ Electron rebuilt successfully');
      return true;
    } catch (error) {
      console.error('[postinstall] ✗ Failed to rebuild Electron:', error.message);
      console.error('[postinstall] Please run: npm rebuild electron');
      return false;
    }
  } else {
    console.log('[postinstall] ✓ Electron binary found');
    return true;
  }
}

/**
 * Check optional dependencies that may fail in restricted networks
 */
function checkOptionalDeps() {
  const optionalDeps = [
    { 
      name: 'chromedriver', 
      path: join(projectRoot, 'node_modules', 'chromedriver'),
      checkFile: 'lib/chromedriver/chromedriver'
    },
    { 
      name: 'puppeteer', 
      path: join(projectRoot, 'node_modules', 'puppeteer'),
      checkFile: '.local-chromium'
    }
  ];

  for (const dep of optionalDeps) {
    // First check if the package directory exists
    if (!existsSync(dep.path)) {
      continue; // Package not installed at all, skip check
    }
    
    // Check for the expected binary/data directory
    const fullCheckPath = join(dep.path, dep.checkFile);
    if (!existsSync(fullCheckPath)) {
      console.warn(`[postinstall] ⚠️  ${dep.name} not fully installed (may be due to network restrictions)`);
      console.warn(`[postinstall]    This is optional and won't prevent the app from running`);
    } else {
      console.log(`[postinstall] ✓ ${dep.name} found`);
    }
  }
}

// Run checks
const electronOk = checkElectron();
checkOptionalDeps();

if (!electronOk) {
  console.error('\n[postinstall] ⚠️  Critical dependency check failed!');
  console.error('[postinstall] The app may not start properly.');
  console.error('[postinstall] Try running: npm rebuild electron');
  process.exit(0); // Don't fail the install, just warn
}

console.log('[postinstall] ✓ Dependency verification complete\n');
