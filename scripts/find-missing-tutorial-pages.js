const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appPath = path.join(root, 'src', 'renderer', 'src', 'App.tsx');
const tutorialPath = path.join(root, 'src', 'renderer', 'src', 'tutorialContext.ts');

const appTxt = fs.readFileSync(appPath, 'utf8');
const tutTxt = fs.readFileSync(tutorialPath, 'utf8');

// Extract Route path and element (simplified)
const routeRe = /<Route\s+path=\"([^\"]+)\"\s+element=\{([^}]+)\}/g;
const routes = [];
let m;
while ((m = routeRe.exec(appTxt)) !== null) {
  const pathStr = m[1];
  const elem = m[2].trim();
  // treat Navigate as redirect, ignore
  const isRedirect = /<Navigate\b|Navigate\b/.test(elem);
  routes.push({ path: pathStr, element: elem, isRedirect });
}

// Extract tutorialContexts entries and their routes
const tutRouteRe = /'([^']+)'\s*:\s*\{[\s\S]*?route:\s*'([^']+)'/g;
const tutEntries = [];
while ((m = tutRouteRe.exec(tutTxt)) !== null) {
  tutEntries.push({ key: m[1], route: m[2] });
}

const tutRoutesSet = new Set(tutEntries.map(t => t.route));

// Find routes that are real pages (not redirect) and not present in tutorialContexts
const missingTutorialForRoutes = routes
  .filter(r => !r.isRedirect)
  .map(r => r.path)
  .filter(p => !tutRoutesSet.has(p));

// Find tutorial contexts that point to routes not present in app routes
const appRouteSet = new Set(routes.map(r => r.path));
const orphanTutorialEntries = tutEntries.filter(e => !appRouteSet.has(e.route));

console.log('Total app routes:', routes.length);
console.log('Total tutorial contexts:', tutEntries.length);
console.log('\nPages missing tutorial contexts (need content added):');
if (missingTutorialForRoutes.length === 0) console.log('  None');
else missingTutorialForRoutes.forEach(r => console.log('  -', r));

console.log('\nTutorial contexts pointing at missing/removed routes (orphaned):');
if (orphanTutorialEntries.length === 0) console.log('  None');
else orphanTutorialEntries.forEach(e => console.log('  -', e.key, '->', e.route));

// Save a JSON report for use in automated PRs/tests
fs.writeFileSync(path.join(root, 'scripts', 'missing-tutorial-pages.json'), JSON.stringify({ missingTutorialForRoutes, orphanTutorialEntries }, null, 2));

process.exit(0);
