#!/usr/bin/env node

/**
 * Nemotron Installation Detection Test
 * Tests if the app correctly detects whether Nemotron is "installed"
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log(' Nemotron Installation Detection Test\n');
console.log('='.repeat(60));

// Test 1: Check registry flag (Windows only)
console.log('\n[Test 1] Checking Windows Registry for Nemotron installation...');
try {
    const registryKey = 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Mossy AI';
    const command = `reg query "${registryKey}" /v NemotronInstalled 2>&1`;

    const result = execSync(command, { encoding: 'utf-8' });

    if (result.includes('NemotronInstalled')) {
        // Parse the registry value
        const match = result.match(/NemotronInstalled\s+REG_SZ\s+(\d+)/);
        if (match) {
            const installed = match[1] === '1';
            console.log(`  ✓ Registry key found`);
            console.log(`  Installation status: ${installed ? '✅ INSTALLED' : '❌ NOT INSTALLED'}`);
        }
    } else {
        console.log('  ℹ Registry key not found (app not installed yet)');
        console.log('  This is expected in dev mode');
    }
} catch (error) {
    console.log('  ℹ Could not query registry (expected in dev mode)');
}

// Test 2: Check file existence fallback
console.log('\n[Test 2] Checking for nemotron-service.exe (dev mode fallback)...');
const serviceExePath = path.join(process.cwd(), 'nemotron-service', 'nemotron-service.exe');
if (fs.existsSync(serviceExePath)) {
    console.log(`  ✓ Found service executable at: ${serviceExePath}`);
} else {
    console.log(`  ℹ Service not found (expected in dev mode)`);
    console.log(`  Looking at: ${serviceExePath}`);
}

// Test 3: Check environment variable
console.log('\n[Test 3] Checking for NEMOTRON_DISABLED environment variable...');
const isDisabled = process.env.NEMOTRON_DISABLED === 'true';
console.log(`  Status: ${isDisabled ? '❌ DISABLED' : '✅ ENABLED'}`);

console.log('\n' + '='.repeat(60));
console.log('\n[Dev Mode Expectations]');
console.log('In development mode (before installation):');
console.log('  ✓ Registry key will not exist yet');
console.log('  ✓ nemotron-service.exe will not exist');
console.log('  ✓ App should report: "Nemotron not installed"');
console.log('  ✓ Loading overlay should show appropriate message');
console.log('\n[After Installation]');
console.log('  ✓ Registry will show NemotronInstalled=1 or 0');
console.log('  ✓ App will detect installation status');
console.log('  ✓ If installed: Will attempt connection');
console.log('  ✓ If not: Will skip auto-connection');

console.log('\n' + '='.repeat(60));
