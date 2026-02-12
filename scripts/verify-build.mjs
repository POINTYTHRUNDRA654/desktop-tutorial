#!/usr/bin/env node
/**
 * Verify Installer Build
 * 
 * This script checks that all necessary files are present and properly configured
 * before packaging the installer.
 * 
 * Usage:
 *   node scripts/verify-build.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

function logSuccess(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function logError(msg) {
  console.log(`${RED}✗${RESET} ${msg}`);
}

function logWarning(msg) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

function logInfo(msg) {
  console.log(`${BLUE}ℹ${RESET} ${msg}`);
}

function checkFileExists(filePath, description) {
  const fullPath = path.join(rootDir, filePath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`${description} exists: ${filePath}`);
    return true;
  } else {
    logError(`${description} missing: ${filePath}`);
    return false;
  }
}

function checkDirectoryExists(dirPath, description) {
  const fullPath = path.join(rootDir, dirPath);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    const files = fs.readdirSync(fullPath);
    logSuccess(`${description} exists with ${files.length} files: ${dirPath}`);
    return true;
  } else {
    logError(`${description} missing or empty: ${dirPath}`);
    return false;
  }
}

function checkEnvEncryption() {
  logInfo('\nChecking environment encryption...');
  
  const envPath = path.join(rootDir, '.env.encrypted');
  if (!fs.existsSync(envPath)) {
    logError('.env.encrypted not found');
    return false;
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'));
  
  let allEncrypted = true;
  const keysToCheck = ['OPENAI_API_KEY', 'GROQ_API_KEY', 'MOSSY_BACKEND_TOKEN', 'MOSSY_BRIDGE_TOKEN'];
  
  for (const key of keysToCheck) {
    const line = lines.find(l => l.startsWith(`${key}=`));
    if (!line) {
      logWarning(`${key} not found in .env.encrypted`);
      continue;
    }
    
    const value = line.split('=')[1].trim();
    if (value.startsWith('enc:')) {
      logSuccess(`${key} is encrypted`);
    } else if (value === '' || value === 'undefined') {
      logWarning(`${key} is empty`);
    } else {
      logError(`${key} is NOT encrypted (should start with "enc:")`);
      allEncrypted = false;
    }
  }
  
  return allEncrypted;
}

function checkPackageJson() {
  logInfo('\nChecking package.json configuration...');
  
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  
  let allGood = true;
  
  // Check build configuration
  if (!pkg.build) {
    logError('package.json missing "build" section');
    return false;
  }
  
  // Check files array
  const requiredFiles = ['dist/**/*', 'dist-electron/**/*', '.env.encrypted'];
  for (const file of requiredFiles) {
    if (pkg.build.files.includes(file)) {
      logSuccess(`Build includes: ${file}`);
    } else {
      logError(`Build missing: ${file}`);
      allGood = false;
    }
  }
  
  // Check extraResources
  if (pkg.build.extraResources && pkg.build.extraResources.length > 0) {
    logSuccess(`Extra resources configured: ${pkg.build.extraResources.length} items`);
  } else {
    logWarning('No extra resources configured');
  }
  
  return allGood;
}

function checkKnowledgeBase() {
  logInfo('\nChecking knowledge base...');
  
  const publicKnowledgePath = path.join(rootDir, 'public', 'knowledge');
  if (fs.existsSync(publicKnowledgePath)) {
    const files = fs.readdirSync(publicKnowledgePath).filter(f => f.endsWith('.md'));
    if (files.length > 0) {
      logSuccess(`Knowledge base has ${files.length} markdown files`);
      return true;
    } else {
      logWarning('Knowledge base directory exists but has no markdown files');
      logInfo('Run: npm run prebuild:vite');
      return false;
    }
  } else {
    logWarning('Knowledge base not copied to public/knowledge yet');
    logInfo('Run: npm run prebuild:vite');
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Mossy Installer Build Verification');
  console.log('='.repeat(60));
  
  let allChecks = true;
  
  // Check critical files
  logInfo('\nChecking critical files...');
  allChecks &= checkFileExists('.env.encrypted', 'Environment config');
  allChecks &= checkFileExists('package.json', 'Package config');
  allChecks &= checkFileExists('src/electron/main.ts', 'Main process');
  allChecks &= checkFileExists('vite.config.mts', 'Vite config');
  
  // Check build outputs
  logInfo('\nChecking build outputs...');
  const hasViteBuild = checkDirectoryExists('dist', 'Vite build output');
  const hasElectronBuild = checkDirectoryExists('dist-electron', 'Electron build output');
  
  if (!hasViteBuild || !hasElectronBuild) {
    logWarning('Build outputs missing. Run: npm run build');
    allChecks = false;
  }
  
  // Check encryption
  allChecks &= checkEnvEncryption();
  
  // Check package.json
  allChecks &= checkPackageJson();
  
  // Check knowledge base
  checkKnowledgeBase(); // Warning only, not critical
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  if (allChecks) {
    logSuccess('All critical checks passed! Ready to package.');
    console.log('\nNext steps:');
    console.log('  1. npm run package:win    # Package for Windows');
    console.log('  2. Test the installer in release/ directory');
    console.log('  3. Verify API keys work after installation');
  } else {
    logError('Some checks failed. Please fix the issues above.');
    console.log('\nCommon fixes:');
    console.log('  - Run: npm run build');
    console.log('  - Run: node scripts/fix-env-encryption.mjs');
    console.log('  - Check package.json build configuration');
    process.exit(1);
  }
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
