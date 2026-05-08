#!/usr/bin/env node

/**
 * Development Launcher - Mock Nemotron + App
 * 
 * This script launches both the mock Nemotron service and the dev app
 * in a way that makes it easy to test the integration.
 * 
 * Usage:
 *   npm run dev:nemotron
 *   --or--
 *   node scripts/dev-launcher.mjs
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);

console.log('\n' + '='.repeat(70));
console.log('🚀 Mossy Development Launcher (with Mock Nemotron)');
console.log('='.repeat(70));

// Step 1: Start mock service
console.log('\n📡 [Step 1/2] Starting Mock Nemotron Service...\n');

const mockServiceProcess = spawn('node', [path.join(__dirname, 'mock-nemotron-service.mjs')], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
});

mockServiceProcess.on('error', (error) => {
    console.error('❌ Failed to start mock service:', error);
    process.exit(1);
});

// Wait for service to be ready
await sleep(2000);

// Step 2: Start dev app with NEMOTRON_DEV_MODE enabled
console.log('\n\n📱 [Step 2/2] Starting Mossy Dev App...\n');

const devProcess = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true,
    env: {
        ...process.env,
        NEMOTRON_DEV_MODE: 'true'  // Enable dev mode
    }
});

devProcess.on('error', (error) => {
    console.error('❌ Failed to start dev app:', error);
    mockServiceProcess.kill();
    process.exit(1);
});

// Handle process termination
const cleanup = () => {
    console.log('\n\n⏹️  Shutting down...');
    devProcess.kill();
    mockServiceProcess.kill();
    process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

devProcess.on('close', cleanup);
