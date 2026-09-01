#!/usr/bin/env node

/**
 * Translation Extraction Script
 * 
 * This script helps identify hardcoded strings in TSX/TS files that should be translated.
 * It searches for common patterns of user-facing text and reports them.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src', 'renderer', 'src');

// Patterns to identify potential hardcoded strings
const patterns = {
  // JSX text content: <div>Hardcoded text</div>
  jsxText: />([A-Z][^<>{}]*[a-z][^<>{}]*)</g,
  
  // String literals in common UI patterns
  title: /title\s*=\s*["']([^"']+)["']/g,
  placeholder: /placeholder\s*=\s*["']([^"']+)["']/g,
  label: /label\s*=\s*["']([^"']+)["']/g,
  
  // Button/link text
  buttonText: /<button[^>]*>([^<>{}]+)</gi,
  linkText: /<Link[^>]*>([^<>{}]+)</gi,
  
  // Headings
  heading: /<h[1-6][^>]*>([^<>{}]+)</gi,
};

// Strings to ignore (technical terms, component names, etc.)
const ignorePatterns = [
  /^[A-Z][a-z]+[A-Z]/,  // PascalCase component names
  /^\d+$/,              // Numbers only
  /^[a-z]+$/,           // Single lowercase words (likely variables)
  /^\s*$/,              // Whitespace only
  /^[A-Z]{2,}$/,        // All caps acronyms
  /Mossy|xEdit|CK|PRP|SS2|MO2|LOOT|F4SE|DDS|BA2/i, // Technical terms
];

function shouldIgnore(text) {
  text = text.trim();
  if (text.length < 3) return true;
  return ignorePatterns.some(pattern => pattern.test(text));
}

function extractFromFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const findings = [];
  
  // Check if file already uses i18n
  const usesI18n = content.includes('useI18n()') || content.includes('from \'./i18n\'');
  
  for (const [patternName, regex] of Object.entries(patterns)) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const text = match[1].trim();
      if (!shouldIgnore(text)) {
        findings.push({
          pattern: patternName,
          text: text,
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }
  }
  
  return { usesI18n, findings };
}

function walkDir(dir, fileList = []) {
  const files = readdirSync(dir);
  
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, dist, etc.
      if (!['node_modules', 'dist', 'dist-electron', '.git'].includes(file)) {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function generateReport() {
  console.log('🔍 Scanning for hardcoded strings...\n');
  
  const files = walkDir(srcDir);
  const results = {};
  let totalFindings = 0;
  let filesWithI18n = 0;
  let filesWithoutI18n = 0;
  
  for (const file of files) {
    const relativePath = relative(rootDir, file);
    const { usesI18n, findings } = extractFromFile(file);
    
    if (usesI18n) {
      filesWithI18n++;
    } else if (findings.length > 0) {
      filesWithoutI18n++;
    }
    
    if (findings.length > 0) {
      results[relativePath] = { usesI18n, findings };
      totalFindings += findings.length;
    }
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   Total files scanned: ${files.length}`);
  console.log(`   Files using i18n: ${filesWithI18n}`);
  console.log(`   Files with potential hardcoded strings: ${Object.keys(results).length}`);
  console.log(`   Total potential hardcoded strings found: ${totalFindings}\n`);
  
  // Detailed report
  console.log('📝 Detailed Report:\n');
  console.log('Files WITHOUT i18n that have hardcoded strings:\n');
  
  const sortedFiles = Object.entries(results)
    .filter(([, data]) => !data.usesI18n)
    .sort((a, b) => b[1].findings.length - a[1].findings.length);
  
  for (const [file, data] of sortedFiles.slice(0, 20)) {
    console.log(`  📄 ${file}`);
    console.log(`     Found ${data.findings.length} potential hardcoded strings:`);
    
    for (const finding of data.findings.slice(0, 3)) {
      console.log(`       Line ${finding.line}: "${finding.text}"`);
    }
    
    if (data.findings.length > 3) {
      console.log(`       ... and ${data.findings.length - 3} more`);
    }
    console.log('');
  }
  
  if (sortedFiles.length > 20) {
    console.log(`  ... and ${sortedFiles.length - 20} more files\n`);
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('   1. Add useI18n() hook to components with hardcoded strings');
  console.log('   2. Replace hardcoded text with t() calls');
  console.log('   3. Add corresponding keys to all language JSON files');
  console.log('   4. Use descriptive key names (e.g., "common.save", "settings.language.title")');
  console.log('\n');
}

// Run the report
generateReport();
