import fs from 'fs';
const ctx = fs.readFileSync(new URL('../src/renderer/src/tutorialContext.ts', import.meta.url), 'utf8');
const pageNameRe = /\bpageName:\s*['\"]([^'\"]+)['\"]\s*,/g;
let m; const ctxNames = [];
while ((m = pageNameRe.exec(ctx)) !== null) ctxNames.push(m[1].trim());
console.log('FOUND pageName entries (count=' + ctxNames.length + '):');
console.log(ctxNames.slice(0,200).join('\n'));
const normalize = (s) => s.toLowerCase().replace(/\u2019/g, "'").replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
console.log('\nincludes "What\'s New"? ->', ctxNames.includes("What's New"));
console.log('normalized md title for "What\'s New" ->', normalize("What's New"));
console.log('normalized ctxNames entries that include "what":', ctxNames.filter(n => normalize(n).includes('what')));
console.log('normalized ctxNames contains "what s new"? ->', ctxNames.map(n=>normalize(n)).includes(normalize("What's New")));
console.log('includes "Quest Authoring Guide (Quest Mod Authorizing)"? ->', ctxNames.includes('Quest Authoring Guide (Quest Mod Authorizing)'));

// show raw characters around the pageName line for whats-new
const idx = ctx.indexOf("whats-new");
if (idx !== -1) {
  const snippet = ctx.slice(Math.max(0, idx-60), idx+120);
  console.log('\n-- snippet around whats-new --');
  console.log(snippet);
  console.log(Array.from(snippet).map(c => c.charCodeAt(0)).join(','));
} else {
  console.log('\nwhats-new not found in ctx source');
}
