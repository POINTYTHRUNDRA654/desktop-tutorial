const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'VISUAL_GUIDE.md');
const ctxPath = path.join(root, 'src', 'renderer', 'src', 'tutorialContext.ts');

const md = fs.readFileSync(mdPath, 'utf8');
const ctx = fs.readFileSync(ctxPath, 'utf8');

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b([a-z]+)\s+s\b/g, '$1s') // normalize "what s" -> "whats"
    .trim();
}

// extract VISUAL_GUIDE page titles (lines like: ## Page 01 - Mossy.Space (Home Dashboard))
const pageTitleRe = /^##\s+Page\s+\d+\s*-\s*(.+)$/gm;
const mdTitles = [];
let m;
while ((m = pageTitleRe.exec(md)) !== null) {
  mdTitles.push(m[1].trim());
}

// extract tutorialContext pageName values: pageName: 'The Auditor',
// Use backreference so the closing delimiter matches the opening one, allowing
// apostrophes inside double-quoted strings (e.g. pageName: "FO4 What's New").
const pageNameRe = /\bpageName:\s*(['"])(.*?)\1\s*,/g;
const ctxNames = [];
while ((m = pageNameRe.exec(ctx)) !== null) {
  ctxNames.push(m[2].trim());
}

// build normalized lookup for ctx
const ctxMap = {};
for (const n of ctxNames) {
  ctxMap[normalize(n)] = n;
}

const results = [];
for (const t of mdTitles) {
  const norm = normalize(t);
  const matchedExact = ctxMap[norm];
  // fallback: fuzzy contains or contained
  const fuzzy = Object.keys(ctxMap).find(k => k.includes(norm) || norm.includes(k));
  if (matchedExact) {
    results.push({ title: t, status: 'match', ctxPageName: ctxMap[norm] });
  } else if (fuzzy) {
    results.push({ title: t, status: 'fuzzy', ctxPageName: ctxMap[fuzzy], note: `fuzzy match -> '${ctxMap[fuzzy]}'` });
  } else {
    results.push({ title: t, status: 'missing', ctxPageName: null });
  }
}

console.log('VISUAL_GUIDE -> tutorialContext pageName parity report');
console.table(results.map(r => ({ title: r.title, status: r.status, ctxPageName: r.ctxPageName || '' , note: r.note || '' })));

// print a concise actionable list of pages where tutorialContext needs to change to match images
const toFix = results.filter(r => r.status !== 'match');
if (toFix.length) {
  console.log('\nPages that should be updated in tutorialContext.ts to match VISUAL_GUIDE.md (or confirm VISUAL_GUIDE is authoritative):');
  toFix.forEach(r => console.log(` - ${r.title}  → status: ${r.status}${r.ctxPageName ? ` (closest: ${r.ctxPageName})` : ''}`));
  process.exit(1);
} else {
  console.log('\nAll VISUAL_GUIDE page titles match tutorialContext.pageName (normalized).');
  process.exit(0);
}
