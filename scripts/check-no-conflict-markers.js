#!/usr/bin/env node
/**
 * check-no-conflict-markers.js
 *
 * Scans source files for unresolved Git conflict markers.
 * Exits with code 1 (and prints offending files/lines) if any are found.
 *
 * Actual conflict markers always appear at the start of a line:
 *   <<<<<<< HEAD  (or <<<<<<< branch-name)
 *   =======       (exactly seven equals, nothing else on the line)
 *   >>>>>>> HEAD  (or >>>>>>> branch-name)
 *
 * The script skips node_modules, dist, and .git directories.
 */

const fs = require('fs');
const path = require('path');

// Source-code extensions to scan
const SCAN_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.json']);

// Regex patterns that match genuine conflict marker lines
const CONFLICT_PATTERNS = [
  /^<{7}\s/,   // <<<<<<< HEAD  or  <<<<<<< branch-name
  /^={7}\s*$/, // ======= (exactly, optional trailing whitespace)
  /^>{7}\s/,   // >>>>>>> branch-name
];

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'dist-backend', 'out', '.vite']);

function walk(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        results.push(...walk(path.join(dir, entry.name)));
      }
    } else if (entry.isFile() && SCAN_EXTS.has(path.extname(entry.name))) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function checkFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return [];
  }

  const violations = [];
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (CONFLICT_PATTERNS.some((re) => re.test(line))) {
      violations.push({ line: i + 1, text: line });
    }
  }
  return violations;
}

const repoRoot = path.resolve(__dirname, '..');
const files = walk(repoRoot);

let totalViolations = 0;
const report = [];

for (const file of files) {
  const violations = checkFile(file);
  if (violations.length > 0) {
    totalViolations += violations.length;
    report.push({ file: path.relative(repoRoot, file), violations });
  }
}

if (totalViolations === 0) {
  console.log('✅  No unresolved conflict markers found.');
  process.exit(0);
} else {
  console.error(`\n❌  Found unresolved Git conflict markers in ${report.length} file(s):\n`);
  for (const { file, violations } of report) {
    console.error(`  ${file}`);
    for (const { line, text } of violations) {
      console.error(`    Line ${line}: ${text}`);
    }
  }
  console.error(`\nTotal conflict marker lines: ${totalViolations}`);
  console.error('\nResolve these conflicts before merging.');
  process.exit(1);
}
