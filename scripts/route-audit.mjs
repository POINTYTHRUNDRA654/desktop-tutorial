import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const appPath = path.join(workspaceRoot, 'src', 'renderer', 'src', 'App.tsx');
const appDir = path.dirname(appPath);

const app = fs.readFileSync(appPath, 'utf8');

// Parse lazy imports like:
// const X = React.lazy(() => import('./X'));
// const Y = React.lazy(() => import('./Y').then(module => ({ default: module.Y })));
const lazyRe = /const\s+(\w+)\s*=\s*React\.lazy\(\(\)\s*=>\s*import\(['"](.+?)['"]\)/g;
const lazy = new Map();
for (const match of app.matchAll(lazyRe)) {
  lazy.set(match[1], match[2]);
}

// Parse routes like:
// <Route path="/x" element={<ErrorBoundary><Foo /></ErrorBoundary>} />
const routeRe = /<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g;
const routes = [];
for (const match of app.matchAll(routeRe)) {
  const routePath = match[1];
  const element = match[2].trim();
  const components = [...element.matchAll(/<([A-Z][A-Za-z0-9_]*)/g)].map(m => m[1]);
  const leafComponent = components.length ? components[components.length - 1] : null;
  routes.push({ path: routePath, component: leafComponent, element });
}

function resolveImport(specifier) {
  const abs = path.resolve(appDir, specifier);
  const candidates = [
    `${abs}.tsx`,
    `${abs}.ts`,
    `${abs}.jsx`,
    `${abs}.js`,
    path.join(abs, 'index.tsx'),
    path.join(abs, 'index.ts'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const markers = [
  /Tools\s*\/\s*Install\s*\/\s*Verify/i,
  /No\s*Guesswork/i,
  /First\s+test\s+loop/i,
  /ToolsInstallVerifyPanel/i,
];

const results = routes.map(r => {
  const importSpec = r.component ? lazy.get(r.component) : null;
  const file = importSpec ? resolveImport(importSpec) : null;
  if (!r.component) return { ...r, status: 'no-component' };
  if (!importSpec) return { ...r, status: 'no-lazy-import' };
  if (!file) return { ...r, status: 'no-file', importSpec };

  const text = fs.readFileSync(file, 'utf8');
  const hasMarker = markers.some(rx => rx.test(text));

  return {
    ...r,
    status: hasMarker ? 'has-marker' : 'missing-marker',
    file: path.relative(workspaceRoot, file).replace(/\\/g, '/'),
  };
});

const uniqueComponents = new Set(routes.map(r => r.component)).size;
const missing = results.filter(r => r.status === 'missing-marker');
const noFile = results.filter(r => r.status === 'no-file');
const noLazy = results.filter(r => r.status === 'no-lazy-import');
const noComponent = results.filter(r => r.status === 'no-component');

console.log(`ROUTES: ${routes.length}`);
console.log(`UNIQUE COMPONENTS: ${uniqueComponents}`);
console.log(`MISSING MARKER: ${missing.length}`);
for (const r of missing) {
  console.log(`- ${r.path} => ${r.component} (${r.file})`);
}

if (noFile.length) {
  console.log(`\nNO FILE MATCH: ${noFile.length}`);
  for (const r of noFile) console.log(`- ${r.path} => ${r.component} import ${r.importSpec}`);
}

if (noLazy.length) {
  console.log(`\nNO LAZY IMPORT: ${noLazy.length}`);
  for (const r of noLazy) console.log(`- ${r.path} => ${r.component}`);
}

if (noComponent.length) {
  console.log(`\nNO COMPONENT: ${noComponent.length}`);
  for (const r of noComponent) console.log(`- ${r.path} => element=${r.element}`);
}
