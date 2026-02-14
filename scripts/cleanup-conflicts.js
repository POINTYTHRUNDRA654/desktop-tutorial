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
let changed = 0;

for (const file of files) {
  let txt = fs.readFileSync(file, 'utf8');
  if (!txt.includes('<<<<<<< Updated upstream')) continue;

  const before = txt;
  // Replace conflict blocks by keeping the 'Updated upstream' side (content before '=======')
  txt = txt.replace(/<<<<<<< Updated upstream([\s\S]*?)=======[\s\S]*?>>>>>>> Stashed changes/g, (_, keep) => keep);

  if (txt !== before) {
    fs.writeFileSync(file, txt, 'utf8');
    console.log('Cleaned:', path.relative(repoRoot, file));
    changed++;
  }
}

console.log(`Done. Files changed: ${changed}`);
if (changed === 0) process.exit(1);
