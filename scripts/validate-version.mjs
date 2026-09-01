#!/usr/bin/env node
/**
 * Version Validation Script
 * 
 * Validates version consistency across the codebase before building/packaging
 * Ensures package.json version is the single source of truth
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readPackageJson() {
  try {
    const pkgPath = join(rootDir, 'package.json');
    const content = readFileSync(pkgPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkFileForHardcodedVersion(filePath, version, ignorePatterns = []) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const versionPattern = /\d+\.\d+\.\d+/g;
    const matches = content.match(versionPattern) || [];
    
    // Filter out matches that should be ignored
    const issues = matches.filter(match => {
      if (match === version) return false; // Correct version
      if (ignorePatterns.some(pattern => pattern.test(match))) return false;
      return true;
    });

    return issues;
  } catch (error) {
    // File doesn't exist or can't be read, skip
    return [];
  }
}

function validateVersionConsistency() {
  log('\n🔍 Validating Version Consistency\n', 'blue');
  log('═'.repeat(60), 'blue');

  const pkg = readPackageJson();
  const version = pkg.version;
  
  log(`\n📦 Package Version: ${version}`, 'bold');
  log(`📝 Package Name: ${pkg.name}`, 'bold');
  const description = pkg.description || '';
  const displayDesc = description.length > 80 ? description.substring(0, 80) + '...' : description;
  log(`📄 Description: ${displayDesc}`, 'bold');
  log('');

  let hasErrors = false;
  let warnings = [];

  // Check 1: Verify package.json has a valid version
  log('1️⃣  Checking package.json version format...', 'blue');
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    log(`   ❌ Invalid version format: ${version}`, 'red');
    log('   Expected format: MAJOR.MINOR.PATCH (e.g., 5.4.24)', 'red');
    hasErrors = true;
  } else {
    log(`   ✅ Version format is valid`, 'green');
  }

  // Check 2: Verify description includes version
  log('\n2️⃣  Checking package.json description...', 'blue');
  if (pkg.description.includes(version)) {
    log(`   ✅ Description includes version ${version}`, 'green');
  } else {
    warnings.push(`Description doesn't include version ${version}`);
    log(`   ⚠️  Description should include version ${version}`, 'yellow');
  }

  // Check 3: Look for hardcoded versions in README
  log('\n3️⃣  Checking README.md...', 'blue');
  const readmePath = join(rootDir, 'README.md');
  try {
    const readme = readFileSync(readmePath, 'utf8');
    if (readme.includes(version)) {
      log(`   ✅ README mentions version ${version}`, 'green');
    } else {
      warnings.push(`README doesn't mention version ${version}`);
      log(`   ⚠️  README should mention version ${version}`, 'yellow');
    }
  } catch (error) {
    log(`   ⚠️  Could not read README.md`, 'yellow');
  }

  // Check 4: Validate electron-builder configuration
  log('\n4️⃣  Checking electron-builder configuration...', 'blue');
  if (pkg.build) {
    log(`   ✅ Electron-builder config found`, 'green');
    if (pkg.build.productName) {
      log(`   ✅ Product name: ${pkg.build.productName}`, 'green');
    }
  } else {
    log(`   ⚠️  No electron-builder configuration found`, 'yellow');
  }

  // Check 5: Verify auto-updater configuration
  log('\n5️⃣  Checking auto-updater configuration...', 'blue');
  if (pkg.build?.publish) {
    log(`   ✅ Publish configuration found`, 'green');
    log(`   Provider: ${pkg.build.publish.provider}`, 'blue');
  } else {
    log(`   ⚠️  No publish configuration for auto-updater`, 'yellow');
  }

  // Summary
  log('\n' + '═'.repeat(60), 'blue');
  log('\n📊 Validation Summary:\n', 'bold');
  
  if (hasErrors) {
    log('❌ VALIDATION FAILED - Errors found', 'red');
    log('\nPlease fix the errors above before building/packaging.', 'red');
    process.exit(1);
  } else if (warnings.length > 0) {
    log('⚠️  VALIDATION PASSED WITH WARNINGS', 'yellow');
    log(`\nFound ${warnings.length} warning(s):`, 'yellow');
    warnings.forEach((warning, i) => {
      log(`   ${i + 1}. ${warning}`, 'yellow');
    });
    log('\nThese warnings can be ignored, but consider addressing them.', 'yellow');
    log('Build can proceed.', 'green');
  } else {
    log('✅ ALL CHECKS PASSED', 'green');
    log('\nVersion consistency validated successfully!', 'green');
    log(`Ready to build/package version ${version}`, 'green');
  }
  
  log('\n' + '═'.repeat(60) + '\n', 'blue');
}

// Run validation
try {
  validateVersionConsistency();
} catch (error) {
  log(`\n❌ Validation script error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
}
