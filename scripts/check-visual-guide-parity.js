const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const visualGuideMd = path.join(root, 'VISUAL_GUIDE.md');
const visualImagesDir = path.join(root, 'visual-guide-images');
const publicImagesDir = path.join(root, 'public', 'visual-guide-images');
const tutorialContext = path.join(root, 'src', 'renderer', 'src', 'tutorialContext.ts');
const interactiveTutorial = path.join(root, 'src', 'renderer', 'src', 'InteractiveTutorial.tsx');

function readFile(fp) { return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : ''; }
const md = readFile(visualGuideMd);
const ctx = readFile(tutorialContext);
const itx = readFile(interactiveTutorial);

const imageFilesRoot = fs.existsSync(visualImagesDir) ? fs.readdirSync(visualImagesDir) : [];
const imageFilesPublic = fs.existsSync(publicImagesDir) ? fs.readdirSync(publicImagesDir) : [];

function findMdPages(mdText) {
  const lines = mdText.split(/\r?\n/);
  const pages = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^## Page\s+(\d+)\s*-\s*(.+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const title = m[2].trim();
      // find next image link within next 6 lines
      let img = null;
      for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
        const im = lines[j].match(/\((visual-guide-images\/[^)]+)\)/);
        if (im) { img = im[1]; break; }
      }
      pages.push({ num, title, img });
    }
  }
  return pages;
}

const mdPages = findMdPages(md);

function existsInRoot(rel) {
  if (!rel) return false;
  const filename = decodeURIComponent(path.basename(rel));
  return imageFilesRoot.includes(filename);
}

function findRootCandidate(title) {
  const key = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const parts = key.split(/\s+/).filter(Boolean);
  // prefer files that contain the longest contiguous match
  let best = null;
  for (const f of imageFilesRoot) {
    const lf = f.toLowerCase();
    let score = 0;
    for (const p of parts) if (lf.includes(p)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { file: f, score };
  }
  return best ? best.file : null;
}

const mdReport = [];
for (const p of mdPages) {
  const ok = existsInRoot(p.img);
  const candidate = findRootCandidate(p.title);
  mdReport.push({ page: p.num, title: p.title, referenced: p.img, existsInRoot: ok, rootCandidate: candidate });
}

// check InteractiveTutorial imageMap references exist in public images
// allow filenames with spaces — stop when encountering a closing quote, parenthesis, or template literal expression ($)
const itxImgs = Array.from(new Set((itx.match(/\/visual-guide-images\/[^'"$)]+/g) || [])
  .map(s => s.replace('/visual-guide-images/',''))
  .map(fn => fn.replace(/\\'/g, "'").replace(/\\\\/g, "\\").trim())
));

function findPublicCandidate(key) {
  const k = key.toLowerCase().replace(/page\s*\d+/i, '').replace(/[^a-z0-9]+/g, ' ').trim();
  if (!k) return null;
  const parts = k.split(/\s+/).filter(p => p.length > 2);
  let best = null;
  for (const f of imageFilesPublic) {
    const lf = f.toLowerCase();
    let score = 0;
    for (const p of parts) if (lf.includes(p)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { file: f, score };
  }
  return best ? best.file : null;
}

const itxReport = itxImgs.map(fn => ({ fn, existsInPublic: imageFilesPublic.includes(decodeURIComponent(fn)), candidate: findPublicCandidate(fn) }));

// check tutorialContexts pageName presence in tutorialContext.ts
const pageNames = mdPages.map(p => p.title.toLowerCase());
const missingNames = pageNames.filter(name => !ctx.toLowerCase().includes(name));

console.log('VISUAL_GUIDE.md -> visual-guide-images parity check (root images folder)');
console.table(mdReport.map(r => ({ page: r.page, title: r.title, referenced: r.referenced || '(none)', existsInRoot: r.existsInRoot, rootCandidate: r.rootCandidate })));

console.log('\nInteractiveTutorial -> public/visual-guide-images check');
console.table(itxReport);

console.log('\nTutorialContext pageName presence check (basic substring match)');
if (missingNames.length) console.log('Missing page-name substrings in tutorialContext.ts (may be false positives):', missingNames);
else console.log('All VISUAL_GUIDE page titles appear in tutorialContext.ts (substring match).');

// Exit with code 1 if any md referenced image does not exist in root or any itx images missing in public
const mdMissing = mdReport.filter(r => !r.existsInRoot);
const itxMissing = itxReport.filter(r => !r.existsInPublic && !r.candidate);
if (mdMissing.length || itxMissing.length) {
  console.error('\nERROR: Parity issues detected. Run with --fix to apply suggested fixes (re-point VISUAL_GUIDE.md image links to root candidates).');
  mdMissing.forEach(m => console.error(`  - Page ${m.page} (${m.title}) references ${m.referenced} but root candidate is ${m.rootCandidate}`));
  itxReport.forEach(r => {
    if (!r.existsInPublic && r.candidate) {
      console.warn(`  - InteractiveTutorial references ${r.fn} which was not found exactly in public; best candidate: ${r.candidate}`);
    }
  });
  itxMissing.forEach(m => console.error(`  - InteractiveTutorial references ${m.fn} which is missing in public/visual-guide-images`));
  process.exit(1);
}
console.log('\nAll visual guide image references in VISUAL_GUIDE.md exist in root, and InteractiveTutorial images exist in public.');
process.exit(0);
