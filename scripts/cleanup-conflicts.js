const fs = require('fs');
const path = require('path');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', 'dist-backend', 'out', '.vite']);

function walk(dir) {
  const files = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) files.push(...walk(path.join(dir, entry.name)));
    } else {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

const repoRoot = path.resolve(__dirname, '..');
const exts = ['.ts', '.tsx', '.js', '.jsx', '.css'];

const files = walk(repoRoot).filter(f => exts.includes(path.extname(f)));
let changed = 0;

for (const file of files) {
  let txt = fs.readFileSync(file, 'utf8');
  if (!txt.includes('<<<<<<<')) continue;

  // Normalize line endings then strip conflict blocks, keeping the HEAD (ours) side.
  // A conflict block looks like:
  //   <<<<<<< HEAD\n<ours>\n=======\n<theirs>\n>>>>>>> branch\n
  const normalized = txt.replace(/\r\n/g, '\n');
  const resolved = normalized.replace(/^<{7}[^\n]*\n([\s\S]*?)^={7}\s*$\n[\s\S]*?^>{7}[^\n]*\n?/gm, '$1');
  // Restore original line endings if needed
  const newTxt = txt.includes('\r\n') ? resolved.replace(/\n/g, '\r\n') : resolved;

  if (newTxt !== txt) {
    fs.writeFileSync(file, newTxt, 'utf8');
    console.log('Cleaned:', path.relative(repoRoot, file));
    changed++;
  }
}

console.log(`Done. Files changed: ${changed}`);
if (changed === 0) process.exit(1);
