const fs = require('fs');
const s = fs.readFileSync('src/renderer/src/QuestEditor.tsx', 'utf8');
const pat = 'export const QuestEditor: React.FC = () => {';
const idx = s.indexOf(pat);
if (idx === -1) { console.log('start not found'); process.exit(0); }
const start = idx + pat.length - 1;
let depth = 0, pos = -1;
for (let i = start; i < s.length; i++) {
  const ch = s[i];
  if (ch === '\\'') { /* skip */ }
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) { pos = i; break; }
  }
}
console.log('component open index', start, 'component close index', pos);
if (pos !== -1) {
  const lineNum = s.slice(0, pos).split(/\r?\n/).length;
  console.log('close line', lineNum);
  console.log('closing snippet:\n' + s.slice(pos - 200, pos + 40));
} else console.log('no matching close');
const openCount = (s.match(/\{/g) || []).length;
const closeCount = (s.match(/\}/g) || []).length;
console.log('{ count', openCount, '} count', closeCount);