import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const mdPath = path.join(root, 'VISUAL_GUIDE.md');
const ctxPath = path.join(root, 'src', 'renderer', 'src', 'tutorialContext.ts');

const md = fs.readFileSync(mdPath, 'utf8');
let ctx = fs.readFileSync(ctxPath, 'utf8');

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// extract VISUAL_GUIDE page titles and numbers
const pageRe = /^##\s+Page\s+(\d+)\s*-\s*(.+)$/gm;
const pages = [];
let m;
while ((m = pageRe.exec(md)) !== null) {
  pages.push({ num: Number(m[1]), title: m[2].trim(), norm: normalize(m[2]) });
}

// extract all pageName entries from tutorialContext.ts
const pageNameRe = /pageName:\s*['"]([^'"]+)['"],/g;
const pageNamePositions = [];
while ((m = pageNameRe.exec(ctx)) !== null) {
  pageNamePositions.push({ name: m[1].trim(), index: m.index });
}

// build a normalized lookup from pageName -> location (the line start)
const ctxLines = ctx.split('\n');

function findInsertLineForPageName(pageName) {
  // find the line index where "pageName: '...'" occurs
  for (let i = 0; i < ctxLines.length; i++) {
    if (ctxLines[i].includes(`pageName: '${pageName}'`) || ctxLines[i].includes(`pageName: \"${pageName}\"`)) return i;
  }
  return -1;
}

let changes = 0;
const unmapped = [];
for (const p of pages) {
  // try exact normalized match against tutorialContext pageName list
  const match = pageNamePositions.find(pn => normalize(pn.name) === p.norm);
  if (match) {
    const lineIdx = findInsertLineForPageName(match.name);
    if (lineIdx === -1) continue; // should not happen

    // check if visualGuidePage already present in the next 4 lines
    const lookahead = ctxLines.slice(lineIdx, Math.min(lineIdx + 6, ctxLines.length)).join('\n');
    if (/visualGuidePage\s*:\s*\d+/.test(lookahead)) {
      // already present - skip
      continue;
    }

    // insert visualGuidePage after the pageName line
    ctxLines.splice(lineIdx + 1, 0, `    visualGuidePage: ${p.num},`);
    changes++;
    continue;
  }

  // fuzzy match: find first pageName that contains most words in common
  const parts = p.norm.split(' ').filter(Boolean);
  let best = null;
  for (const pn of pageNamePositions) {
    const normPn = normalize(pn.name);
    let score = 0;
    for (const part of parts) if (normPn.includes(part)) score++;
    if (score > 0 && (!best || score > best.score)) best = { pn, score };
  }
  if (best && best.score >= Math.max(1, Math.floor(parts.length / 2))) {
    const lineIdx = findInsertLineForPageName(best.pn.name);
    if (lineIdx === -1) continue;
    const lookahead = ctxLines.slice(lineIdx, Math.min(lineIdx + 6, ctxLines.length)).join('\n');
    if (/visualGuidePage\s*:\s*\d+/.test(lookahead)) continue;
    ctxLines.splice(lineIdx + 1, 0, `    visualGuidePage: ${p.num}, // synced from VISUAL_GUIDE.md`);
    changes++;
    continue;
  }

  unmapped.push(p);
}

if (changes > 0) {
  fs.writeFileSync(ctxPath, ctxLines.join('\n'), 'utf8');
  console.log(`Inserted visualGuidePage into ${changes} tutorialContext entries.`);
} else {
  console.log('No changes necessary — all matching contexts already have visualGuidePage.');
}

if (unmapped.length) {
  console.log('\nPages present in VISUAL_GUIDE.md that could not be mapped to tutorialContext.pageName:');
  unmapped.forEach(u => console.log(` - Page ${u.num}: ${u.title}`));
  process.exit(2);
}

process.exit(0);
