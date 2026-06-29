const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tutorialFile = path.join(root, 'src', 'renderer', 'src', 'InteractiveTutorial.tsx');
const txt = fs.readFileSync(tutorialFile, 'utf8');

// Strip single-line comment-only lines before scanning to avoid false positives from comments
// that happen to mention the /visual-guide-images/ path.
const codeOnly = txt.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
const re = /\/visual-guide-images\/((?:\\'|[^'"$)`\n])+)/g; // allow escaped single quote; stop at newline
const matches = [];
let mm;
while ((mm = re.exec(codeOnly)) !== null) {
  // unescape any escaped single quotes in captured filename
  const raw = mm[1].replace(/\\'/g, "'");
  matches.push('/visual-guide-images/' + raw);
}
const uniqueMatches = Array.from(new Set(matches));
const matchesList = uniqueMatches;

console.log('Found', matches.length, 'unique image references in InteractiveTutorial');

const missing = [];
const found = [];
for (const rel of matchesList) {
  // Candidates to check: public/visual-guide-images/<file> and visual-guide-images/<file>
  const filename = rel.replace('/visual-guide-images/', '');
  const candidates = [
    path.join(root, 'public', 'visual-guide-images', filename),
    path.join(root, 'visual-guide-images', filename),
    path.join(root, 'src', 'renderer', 'public', 'visual-guide-images', filename)
  ];

  const exists = candidates.find(p => fs.existsSync(p));
  if (exists) found.push({ ref: rel, path: path.relative(root, exists) });
  else missing.push(rel);
}

console.log('\nSummary:');
console.log('  Found on disk:', found.length);
found.slice(0, 50).forEach(f => console.log('   -', f.ref, '->', f.path));
if (missing.length) {
  console.log('\n  Missing files:', missing.length);
  missing.forEach(m => console.log('   -', m));
  process.exit(2);
} else {
  console.log('\n  All referenced tutorial images exist on disk.');
  process.exit(0);
}
