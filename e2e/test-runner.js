#!/usr/bin/env node

/**
 * Mossy Desktop App Test Runner
 *
 * This script provides an easy way to run comprehensive tests for the Mossy desktop app.
 * It supports testing both the development version and the packaged installer.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const command = args[0] || 'help';

function showHelp() {
  console.log(`
Mossy Desktop App Test Runner

Usage: node test-runner.js <command> [options]

Commands:
  dev         Run tests against development server (npm run dev)
  packaged    Run tests against packaged app (requires npm run build && npm run package:win)
  all         Run all tests (dev + packaged)
  build       Build the app and run packaged tests
  help        Show this help message

Options:
  --headed    Run tests in headed mode (show browser)
  --debug     Run tests in debug mode
  --grep <pattern>  Run only tests matching pattern

Examples:
  node test-runner.js dev
  node test-runner.js packaged --headed
  node test-runner.js all --debug
  node test-runner.js build
`);
}

function runCommand(cmd, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function checkPrerequisites() {
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    console.error('❌ node_modules not found. Run npm install first.');
    process.exit(1);
  }

  // Check if playwright is installed
  try {
    require('@playwright/test');
  } catch (error) {
    console.error('❌ Playwright not found. Run npm install first.');
    process.exit(1);
  }
}

function runDevTests(options = {}) {
  console.log('\n🧪 Running development tests...');

  const testCommand = [
    'npx playwright test',
    '--config playwright.config.ts',
    '--project electron-dev',
    options.headed ? '--headed' : '',
    options.debug ? '--debug' : '',
    options.grep ? `--grep "${options.grep}"` : ''
  ].filter(Boolean).join(' ');

  return runCommand(testCommand, 'Development tests');
}

function runPackagedTests(options = {}) {
  console.log('\n📦 Running packaged app tests...');

  // Check if packaged app exists
  const appPath = path.join('dist-electron', 'Mossy.exe');
  if (!fs.existsSync(appPath)) {
    console.error(`❌ Packaged app not found at ${appPath}`);
    console.log('💡 Run "npm run build && npm run package:win" first');
    return false;
  }

  const testCommand = [
    'npx playwright test',
    '--config playwright.config.ts',
    '--project electron-packaged',
    options.headed ? '--headed' : '',
    options.debug ? '--debug' : '',
    options.grep ? `--grep "${options.grep}"` : ''
  ].filter(Boolean).join(' ');

  return runCommand(testCommand, 'Packaged app tests');
}

function buildAndTest() {
  console.log('\n🔨 Building and testing packaged app...');

  // Build the app
  if (!runCommand('npm run build', 'Building app')) return false;

  // Package the app
  if (!runCommand('npm run package:win', 'Packaging app')) return false;

  // Run packaged tests
  return runPackagedTests();
}

function parseOptions(args) {
  const options = {};
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--headed':
        options.headed = true;
        break;
      case '--debug':
        options.debug = true;
        break;
      case '--grep':
        if (i + 1 < args.length) {
          options.grep = args[i + 1];
          i++;
        }
        break;
    }
  }
  return options;
}

function main() {
  checkPrerequisites();

  const options = parseOptions(args);

  switch (command) {
    case 'dev':
      runDevTests(options);
      break;

    case 'packaged':
      runPackagedTests(options);
      break;

    case 'all':
      const devSuccess = runDevTests(options);
      const packagedSuccess = runPackagedTests(options);
      if (devSuccess && packagedSuccess) {
        console.log('\n🎉 All tests passed!');
      } else {
        console.log('\n⚠️  Some tests failed. Check output above.');
        process.exit(1);
      }
      break;

    case 'build':
      if (buildAndTest()) {
        console.log('\n🎉 Build and tests completed successfully!');
      } else {
        console.log('\n❌ Build or tests failed.');
        process.exit(1);
      }
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

if (require.main === module) {
  main();
}