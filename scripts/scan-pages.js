const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sidebarPath = path.join(root, 'src', 'renderer', 'src', 'Sidebar.tsx');
const appPath = path.join(root, 'src', 'renderer', 'src', 'App.tsx');

function read(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; }
}

const sidebar = read(sidebarPath);
const app = read(appPath);
if (!sidebar || !app) {
  console.error('Could not read Sidebar or App source files');
  process.exit(2);
}

// Extract nav paths from Sidebar
const navPathRe = /\{\s*to:\s*'([^']+)'/g;
const navPaths = new Set();
let m;
while ((m = navPathRe.exec(sidebar)) !== null) navPaths.add(m[1]);

// Extract Route paths and element payloads from App
const routeRe = /<Route\s+path=\"([^\"]+)\"\s+element=\{([^}]+)\}/g;
const routes = [];
while ((m = routeRe.exec(app)) !== null) {
  const p = m[1];
  const elem = m[2];
  routes.push({ path: p, element: elem.trim() });
}

// Helper: pick component candidate from element string
function pickComponent(elem) {
  // Ignore Navigate and wrappers like ErrorBoundary, MemoryRouter
  // Find all capitalized identifiers and prefer the last one that isn't a known wrapper
  const wrappers = new Set(['ErrorBoundary','Navigate','MemoryRouter','React.Fragment','Suspense','Route']);
  const ids = Array.from(new Set((elem.match(/[A-Z][A-Za-z0-9_]*/g) || [])));
  for (let i = ids.length - 1; i >= 0; --i) {
    const id = ids[i];
    if (!wrappers.has(id)) return id;
  }
  return ids.length ? ids[ids.length-1] : null;
}

// Map route -> component candidate
const routeMap = routes.map(r => ({ path: r.path, element: r.element, component: pickComponent(r.element) }));

// Check existence of component files and basic render content
const projectSrc = path.join(root, 'src', 'renderer', 'src');
function findComponentFiles(name) {
  const candidates = [];
  const files = fs.readdirSync(projectSrc);
  // first look for file with same name
  const direct = path.join(projectSrc, name + '.tsx');
  if (fs.existsSync(direct)) candidates.push(direct);
  // search all files for export of that name
  const all = (function walk(dir) {
    const res = [];
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) res.push(...walk(fp));
      else if (/\.(tsx|ts|jsx|js)$/.test(f)) res.push(fp);
    }
    return res;
  })(projectSrc);
  for (const fp of all) {
    const txt = fs.readFileSync(fp, 'utf8');
    const re = new RegExp('export\\s+(?:const|function|class)\\s+'+name+'\\b');
    const re2 = new RegExp('export\\s+\\{\\s*'+name+'\\s*\\}');
    if (re.test(txt) || re2.test(txt)) candidates.push(fp);
    // also check for "export default <name>" (rare)
    const re3 = new RegExp('export\\s+default\\s+'+name+'\\b');
    if (re3.test(txt)) candidates.push(fp);
  }
  return Array.from(new Set(candidates));
}

function isLikelyEmpty(fp) {
  const txt = fs.readFileSync(fp, 'utf8');
  // Heuristics: no JSX tags or no 'return (' occurrences
  const hasJsx = /<\w+[^>]*>/.test(txt) || /return\s*\(\s*<\w+/.test(txt) || /className=/.test(txt);
  const len = txt.replace(/\s+/g,'').length;
  return !hasJsx || len < 200; // treat very small components as suspicious
}

// Compare nav -> routes
const missingRoutes = [];
for (const nav of Array.from(navPaths)) {
  // skip external
  if (/^https?:/.test(nav)) continue;
  const match = routeMap.find(r => r.path === nav);
  if (!match) missingRoutes.push(nav);
}

// Find routes with missing components or empty component files
const routeProblems = [];
for (const r of routeMap) {
  if (!r.component) continue; // nothing to check
  const files = findComponentFiles(r.component);
  if (files.length === 0) {
    routeProblems.push({ path: r.path, component: r.component, issue: 'component-not-found' });
    continue;
  }
  // check each file - if all are suspicious, warn
  const suspicious = files.filter(isLikelyEmpty);
  if (suspicious.length === files.length) {
    routeProblems.push({ path: r.path, component: r.component, issue: 'component-empty-or-minimal', files });
  }
}

// Also detect components that are present in src but not referenced in routes (orphan pages)
const allRouteComponents = new Set(routeMap.map(r => r.component).filter(Boolean));
// find all top-level component files in src (heuristic: files with default export or React.FC)
const allFiles = (function walk(dir) {
  const res = [];
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) res.push(...walk(fp));
    else if (/\.tsx?$/.test(f)) res.push(fp);
  }
  return res;
})(projectSrc);

const orphanPages = [];
for (const fp of allFiles) {
  const txt = fs.readFileSync(fp, 'utf8');
  if (/export\s+default\s+|export\s+const\s+[A-Z]|React\.FC|React\.FunctionComponent/.test(txt)) {
    // guess component name from filename
    const name = path.basename(fp).replace(/\.tsx?$/, '');
    if (!allRouteComponents.has(name) && !name.endsWith('Guide') && !name.endsWith('Hub') && !name.endsWith('Guide')) {
      // report candidate orphans (but ignore test/helper files)
      orphanPages.push({ file: path.relative(root, fp), name });
    }
  }
}

// Print report
console.log('=== PAGES SCAN REPORT ===');
console.log('\nSidebar nav items:', navPaths.size);
console.log('Registered routes:', routeMap.length);
console.log('\nMissing routes for sidebar items (should be added or redirected):');
if (missingRoutes.length === 0) console.log('  None'); else missingRoutes.forEach(r => console.log('  -', r));

console.log('\nRoutes with missing / suspicious components:');
if (routeProblems.length === 0) console.log('  None'); else routeProblems.forEach(p => console.log('  -', p.path, p.component, p.issue, p.files ? p.files.map(x => path.relative(root,x)).join(', ') : ''));

console.log('\nPotential orphan page components (not referenced by routes):');
if (orphanPages.length === 0) console.log('  None'); else orphanPages.slice(0,50).forEach(o => console.log('  -', o.name, '-', o.file));

// Summary suggestions
console.log('\nSUMMARY:');
if (missingRoutes.length === 0 && routeProblems.length === 0) console.log('  No immediate route/component mismatches detected.');
else console.log('  Issues found — fix missing routes/components and verify suspicious component files.');

process.exit(0);
