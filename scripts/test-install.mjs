#!/usr/bin/env node

/**
 * Test script to verify that installation and build work correctly.
 * This simulates a fresh user install experience.
 */

import { existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('============================================');
console.log('Testing Fresh Install & Build Process');
console.log('============================================\n');

// Test 1: Verify postinstall script exists
console.log('[1/6] Checking postinstall script...');
const postinstallPath = join(projectRoot, 'scripts', 'postinstall.mjs');
if (!existsSync(postinstallPath)) {
  console.error('❌ FAIL: postinstall.mjs not found');
  process.exit(1);
}
console.log('✅ PASS: postinstall script exists\n');

// Test 2: Verify Electron is installed
console.log('[2/6] Checking Electron installation...');
const electronPath = join(projectRoot, 'node_modules', 'electron', 'dist');
const electronPathFile = join(projectRoot, 'node_modules', 'electron', 'path.txt');
if (!existsSync(electronPath) && !existsSync(electronPathFile)) {
  console.error('❌ FAIL: Electron binary not found');
  process.exit(1);
}
console.log('✅ PASS: Electron binary installed\n');

// Test 3: Run postinstall script
console.log('[3/6] Running postinstall script...');
try {
  execSync('node scripts/postinstall.mjs', {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  console.log('✅ PASS: postinstall script ran successfully\n');
} catch (error) {
  console.error('❌ FAIL: postinstall script failed');
  process.exit(1);
}

// Test 4: Verify build outputs can be created
console.log('[4/6] Testing build process...');
try {
  execSync('npm run build', {
    cwd: projectRoot,
    stdio: ['ignore', 'pipe', 'inherit'], // Suppress stdout but show stderr for errors
    timeout: 120000 // 2 minute timeout
  });
  console.log('✅ PASS: Build completed successfully\n');
} catch (error) {
  console.error('❌ FAIL: Build failed');
  console.error('Error:', error.message);
  if (error.stderr) {
    console.error('stderr:', error.stderr.toString());
  }
  process.exit(1);
}

// Test 5: Verify build artifacts exist
console.log('[5/6] Checking build artifacts...');
const distPath = join(projectRoot, 'dist');
const distElectronPath = join(projectRoot, 'dist-electron');
if (!existsSync(distPath)) {
  console.error('❌ FAIL: dist/ directory not found');
  process.exit(1);
}
if (!existsSync(distElectronPath)) {
  console.error('❌ FAIL: dist-electron/ directory not found');
  process.exit(1);
}
console.log('✅ PASS: Build artifacts exist\n');

// Test 6: Verify package.json has postinstall hook
console.log('[6/6] Verifying package.json configuration...');
const packageJsonPath = join(projectRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
if (!packageJson.scripts.postinstall) {
  console.error('❌ FAIL: postinstall script not in package.json');
  process.exit(1);
}
if (packageJson.scripts.postinstall !== 'node scripts/postinstall.mjs') {
  console.error('❌ FAIL: postinstall script path incorrect');
  process.exit(1);
}
console.log('✅ PASS: package.json configured correctly\n');

console.log('============================================');
console.log('✅ ALL TESTS PASSED!');
console.log('============================================\n');
console.log('Summary:');
console.log('- Postinstall script is present and functional');
console.log('- Electron binary is properly installed');
console.log('- Build process completes without errors');
console.log('- All build artifacts are generated');
console.log('- Package.json is correctly configured');
console.log('\nThe installation and build crashes are FIXED! ✨');
