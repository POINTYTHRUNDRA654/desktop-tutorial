/**
 * Language Translation Verification Test
 * 
 * This script verifies that:
 * 1. All 12 locale files exist
 * 2. Each file contains actual translations (not English placeholders)
 * 3. The i18n system can resolve all language codes
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'src/renderer/src/locales');
const I18N_FILE = path.join(__dirname, 'src/renderer/src/i18n.ts');

const EXPECTED_LANGUAGES = [
  { code: 'en', name: 'English', file: 'en.json' },
  { code: 'es', name: 'Español', file: 'es.json' },
  { code: 'fr', name: 'Français', file: 'fr.json' },
  { code: 'de', name: 'Deutsch', file: 'de.json' },
  { code: 'ru', name: 'Русский', file: 'ru.json' },
  { code: 'zh-Hans', name: '中文（简体）', file: 'zh-Hans.json' },
  { code: 'pt-BR', name: 'Português (Brasil)', file: 'pt-BR.json' },
  { code: 'ja', name: '日本語', file: 'ja.json' },
  { code: 'ko', name: '한국어', file: 'ko.json' },
  { code: 'it', name: 'Italiano', file: 'it.json' },
  { code: 'pl', name: 'Polski', file: 'pl.json' },
  { code: 'tr', name: 'Türkçe', file: 'tr.json' },
];

// Sample keys to test for actual translations
const TEST_KEYS = [
  'nav.chat',
  'nav.aiModAssistant',
  'nav.tools',
];

let passed = 0;
let failed = 0;

console.log('🔍 Language Translation Verification Test\n');
console.log('=' .repeat(60));

// Test 1: Verify all locale files exist
console.log('\n📂 Test 1: Checking locale file existence...\n');
EXPECTED_LANGUAGES.forEach(lang => {
  const filePath = path.join(LOCALES_DIR, lang.file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${lang.name.padEnd(25)} - ${lang.file.padEnd(15)} (${(stats.size / 1024).toFixed(1)} KB)`);
    passed++;
  } else {
    console.log(`❌ ${lang.name.padEnd(25)} - ${lang.file.padEnd(15)} MISSING!`);
    failed++;
  }
});

// Test 2: Verify files contain actual translations (not just English)
console.log('\n📝 Test 2: Checking translation quality...\n');
EXPECTED_LANGUAGES.forEach(lang => {
  if (lang.code === 'en') return; // Skip English baseline
  
  const filePath = path.join(LOCALES_DIR, lang.file);
  if (!fs.existsSync(filePath)) return;
  
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check a few keys to see if they're different from English
    const chatValue = content?.nav?.chat;
    const toolsValue = content?.nav?.tools;
    
    // These should NOT be in English (unless the language uses English words)
    const hasTranslation = chatValue && toolsValue;
    const isNotJustEnglish = chatValue !== 'AI Chat' || toolsValue !== 'Tools';
    
    if (hasTranslation && isNotJustEnglish) {
      console.log(`✅ ${lang.name.padEnd(25)} - Contains real translations`);
      console.log(`   └─ nav.chat: "${chatValue}"`);
      passed++;
    } else {
      console.log(`⚠️  ${lang.name.padEnd(25)} - May contain English placeholders`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${lang.name.padEnd(25)} - Invalid JSON: ${err.message}`);
    failed++;
  }
});

// Test 3: Verify i18n.ts includes all languages
console.log('\n🔧 Test 3: Checking i18n.ts configuration...\n');
const i18nContent = fs.readFileSync(I18N_FILE, 'utf8');

EXPECTED_LANGUAGES.forEach(lang => {
  const importStatement = `import.*from.*'./locales/${lang.file.replace('.json', '.json')}'`;
  const hasImport = new RegExp(importStatement).test(i18nContent);
  
  if (hasImport || i18nContent.includes(`'${lang.file.replace('.json', '')}'`)) {
    console.log(`✅ ${lang.name.padEnd(25)} - Configured in i18n.ts`);
    passed++;
  } else {
    console.log(`❌ ${lang.name.padEnd(25)} - NOT configured in i18n.ts`);
    failed++;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Test Summary:\n');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📋 Total:  ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All language tests passed! All 12 languages are properly configured.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the output above.\n');
  process.exit(1);
}
