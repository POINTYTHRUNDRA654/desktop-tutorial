const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const repoRoot = path.resolve(__dirname, '..');
const exts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.md'];
const files = walk(repoRoot).filter(f => exts.includes(path.extname(f)));
let fixed = 0;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.includes('<<<<<<<')) continue;

  const lines = text.split(/\r?\n/);
  const out = [];
  let state = 'normal'; // normal | upper | lower

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (state === 'normal') {
      if (line.startsWith('<<<<<<<')) {
        state = 'upper';
        continue; // drop marker
      } else {
        out.push(line);
      }
    } else if (state === 'upper') {
      if (line.startsWith('=======')) {
        state = 'lower';
        continue; // drop separator
      } else {
        out.push(line); // keep upper side
      }
    } else if (state === 'lower') {
      if (line.startsWith('>>>>>>>')) {
        state = 'normal';
        continue; // drop end marker
      } else {
        // skip lower side lines
        continue;
      }
    }
  }

  const newText = out.join('\n');
  if (newText !== text) {
    fs.writeFileSync(file, newText, 'utf8');
    console.log('Resolved conflict markers in:', path.relative(repoRoot, file));
    fixed++;
  }
}

console.log(`Fixed files: ${fixed}`);
if (fixed === 0) process.exit(1);
