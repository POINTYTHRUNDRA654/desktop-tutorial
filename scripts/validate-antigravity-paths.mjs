#!/usr/bin/env node

/**
 * Antigravity Path Validation Script
 * 
 * Ensures that agents only modify files in allowed paths
 * and never touch blocked paths (src/electron, IPC handlers, secrets, etc.)
 * 
 * Run via: npm run validate-antigravity-paths
 * Runs automatically before git push (if configured as pre-push hook)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, '.antigravity.config.json');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

/**
 * Load Antigravity configuration
 */
function loadConfig() {
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        return config;
    } catch (error) {
        console.error(`${colors.red}❌ Failed to load .antigravity.config.json${colors.reset}`);
        process.exit(1);
    }
}

/**
 * Normalize path for comparison (forward slashes, no drive letters)
 */
function normalizePath(filePath) {
    return filePath
        .replace(/\\/g, '/')           // Convert backslashes to forward slashes
        .replace(/^[A-Z]:/, '')        // Remove drive letter (Windows)
        .toLowerCase();
}

/**
 * Check if a path matches a glob pattern
 */
function matchesPattern(filePath, pattern) {
    const normalizedFile = normalizePath(filePath);
    const normalizedPattern = normalizePath(pattern);

    // Handle wildcards
    if (normalizedPattern.includes('**')) {
        // Match any number of path segments
        const regex = normalizedPattern
            .replace(/\//g, '\\/')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*');
        return new RegExp(`^${regex}$`).test(normalizedFile);
    }

    // Simple exact/prefix match
    return normalizedFile === normalizedPattern ||
        normalizedFile.startsWith(normalizedPattern.replace(/\*$/, ''));
}

/**
 * Check if path is in allowed list
 */
function isAllowed(filePath, allowedPatterns) {
    return allowedPatterns.some(pattern => matchesPattern(filePath, pattern));
}

/**
 * Check if path is in blocked list
 */
function isBlocked(filePath, blockedPatterns) {
    return blockedPatterns.some(pattern => matchesPattern(filePath, pattern));
}

/**
 * Get changed files from git
 */
function getChangedFiles() {
    try {
        // Get staged and unstaged changes
        const stagedOutput = execSync('git diff --cached --name-only', { encoding: 'utf-8' });
        const unstagedOutput = execSync('git diff --name-only', { encoding: 'utf-8' });

        const staged = stagedOutput.trim().split('\n').filter(f => f);
        const unstaged = unstagedOutput.trim().split('\n').filter(f => f);

        return [...new Set([...staged, ...unstaged])]; // Deduplicate
    } catch (error) {
        console.warn(`${colors.yellow}⚠️  Warning: Could not read git status${colors.reset}`);
        return [];
    }
}

/**
 * Main validation logic
 */
function validate() {
    const config = loadConfig();
    const changedFiles = getChangedFiles();

    if (changedFiles.length === 0) {
        console.log(`${colors.blue}ℹ️  No changed files to validate${colors.reset}`);
        return true;
    }

    console.log(`${colors.blue}🔍 Validating ${changedFiles.length} changed file(s)...${colors.reset}\n`);

    let violations = [];
    let allowed = [];

    for (const file of changedFiles) {
        const relPath = path.relative(rootDir, file);

        // Skip certain files
        if (relPath.includes('.git') || relPath.includes('node_modules')) {
            continue;
        }

        // Check blocked paths first (high priority)
        if (isBlocked(relPath, config.blockedPaths)) {
            violations.push({
                file: relPath,
                reason: 'File is in BLOCKED path'
            });
            continue;
        }

        // Check allowed paths
        if (isAllowed(relPath, config.allowedPaths)) {
            allowed.push(relPath);
        } else {
            violations.push({
                file: relPath,
                reason: 'File is NOT in allowed paths'
            });
        }
    }

    // Report results
    if (allowed.length > 0) {
        console.log(`${colors.green}✅ Allowed files (${allowed.length}):${colors.reset}`);
        allowed.forEach(f => console.log(`   ${colors.green}✓${colors.reset} ${f}`));
        console.log();
    }

    if (violations.length > 0) {
        console.log(`${colors.red}❌ Violations found (${violations.length}):${colors.reset}`);
        violations.forEach(v => {
            console.log(`   ${colors.red}✗${colors.reset} ${v.file}`);
            console.log(`     Reason: ${v.reason}`);
        });
        console.log();

        console.log(`${colors.red}🚫 VALIDATION FAILED${colors.reset}`);
        console.log(`\nAllowed paths (from .antigravity.config.json):`);
        config.allowedPaths.forEach(p => console.log(`  - ${p}`));
        console.log(`\nBlocked paths (from .antigravity.config.json):`);
        config.blockedPaths.forEach(p => console.log(`  - ${p}`));

        return false;
    }

    console.log(`${colors.green}✅ VALIDATION PASSED - All changes are in allowed paths${colors.reset}\n`);
    return true;
}

/**
 * Main entry point
 */
function main() {
    const success = validate();

    if (process.argv.includes('--strict')) {
        // Exit with error code if validation fails (for use as pre-push hook)
        process.exit(success ? 0 : 1);
    }

    // For normal runs, just report (exit 0 either way)
    process.exit(0);
}

main();
