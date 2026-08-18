/**
 * platform-audit.mjs
 * Comprehensive audit of all 23 MOSSY.SPACE platforms.
 *
 * Checks per platform:
 *   1. Route declared in App.tsx (<Route path="...">)
 *   2. Component lazy-imported in App.tsx
 *   3. Component source file exists on disk
 *   4. Component is non-trivial (>= MIN_LINES lines)
 *   5. Route path is in KEEP_ALIVE_PATHS
 *   6. No known placeholder patterns (TODO/COMING_SOON/placeholder/etc.)
 *   7. Has at least one IPC call (window.api / window.electronAPI / ipcRenderer)
 *
 * Additional cross-cutting checks:
 *   8. All IPC channels declared in preload.ts are handled in main.ts
 *   9. All IPC channels handled in main.ts are exposed in preload.ts
 *
 * Usage:
 *   node scripts/platform-audit.mjs
 *   node scripts/platform-audit.mjs --json   # output JSON
 *   node scripts/platform-audit.mjs --fix    # print actionable fix list
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Configuration ────────────────────────────────────────────────────────────

const MIN_LINES = 30; // below this we flag as likely stub

/**
 * Ground truth: 23 platforms from CLAUDE.md
 * format: { name, route, file, ipcExpected? }
 * ipcExpected: set of window.api method patterns we expect to see used
 */
const PLATFORMS = [
  { id:  1, name: 'Mossy.Space Home',              route: '/',                  file: 'TheNexus.tsx' },
  { id:  2, name: 'AI Chat',                       route: '/chat',              file: 'ChatInterface.tsx' },
  { id:  3, name: 'AI Mod Assistant',              route: '/ai-mod-assistant',  file: 'AIModAssistant.tsx' },
  { id:  4, name: 'FO4 Mod Journey Hub',           route: '/journey-hub',       file: 'JourneyHub.tsx' },
  { id:  5, name: 'FO4 Whats New',                 route: '/whats-new',         file: 'WhatsNewPage.tsx' },
  { id:  6, name: 'FO4 Knowledge Hub',             route: '/knowledge-hub',     file: 'KnowledgeHub.tsx' },
  { id:  7, name: 'FO4 Memory Vault',              route: '/memory-vault',      file: 'MossyMemoryVault.tsx' },
  { id:  8, name: 'FO4 Setup Wizards',             route: '/wizards',           file: 'WizardsHub.tsx' },
  { id:  9, name: 'FO4 Creation Kit Hub',          route: '/ck-tools',          file: 'CKToolsHub.tsx' },
  { id: 10, name: 'FO4 Textures & Materials',      route: '/textures',          file: 'TextureMaterialsHub.tsx' },
  { id: 11, name: 'FO4 Packaging & Release',       route: '/packaging-release', file: 'PackagingHub.tsx' },
  { id: 12, name: 'FO4 Guides Hub',                route: '/guides-hub',        file: 'GuidesHub.tsx' },
  { id: 13, name: 'FO4 Automation Studio',         route: '/tools/cosmos',      file: 'CosmosWorkflow.tsx' },
  { id: 14, name: 'FO4 Mod Builder Hub',           route: '/mod-builder',       file: 'ModBuilderHub.tsx' },
  { id: 15, name: 'FO4 Asset Analysis Hub',        route: '/asset-analysis',    file: 'AssetAnalysisHub.tsx' },
  { id: 16, name: 'FO4 Automation Orchestrator',   route: '/dev/orchestrator',  file: 'FO4AutomationOrchestrator.tsx', ipcExpected: ['automation'] },
  { id: 17, name: 'FO4 Automation Runner',         route: '/workflow-runner',   file: 'WorkflowRunner.tsx' },
  { id: 18, name: 'FO4 Runtime Hub',               route: '/runtime-hub',       file: 'RuntimeHub.tsx' },
  { id: 19, name: 'FO4 External Integrations Hub', route: '/ext-tools',         file: 'ExternalToolsHub.tsx' },
  { id: 20, name: 'FO4 Plugin & Load Order Hub',   route: '/plugin-tools',      file: 'PluginLoadOrderHub.tsx' },
  { id: 21, name: 'FO4 System & Diagnostics Hub',  route: '/system-hub',        file: 'SystemHub.tsx' },
  { id: 22, name: 'Settings',                      route: '/settings',          file: 'SettingsHub.tsx' },
  { id: 23, name: 'Vault-Tec Creative Director',   route: '/creative-director', file: 'plugin_creative_director/CreativeDirectorPanel.tsx', allowMissingFile: true },
];

const PLACEHOLDER_PATTERNS = [
  /coming\s+soon/i,
  /TODO.*implement/i,
  // only flag literal visible text, not HTML attr placeholder="..." or CSS class
  />\s*placeholder\s*</i,
  /lorem ipsum/i,
  // flag "stubbed out" / "this is a stub" but not imports named LocalAIEngine or className="stub"
  /(?:is a stub|stubbed out|this component is stub)/i,
  /not yet implemented/i,
  /under construction/i,
  /\bwork in progress\b/i,
];

const IPC_PATTERNS = [
  /window\.api\./,
  /window\.electronAPI\./,
  /window\.electron\??\.api/,  // window.electron.api.X / window.electron?.api — used throughout newer components
  /ipcRenderer\./,
  /LocalAIEngine\./,     // wraps window.electronAPI internally
  /\(window as any\)\.api/,  // TypeScript cast pattern
  /window as any.*\.api/,
  /getBridge\(\)/,       // local helper pattern: const getBridge = () => window.electron?.api || window.electronAPI
];

// ─── Read source files ────────────────────────────────────────────────────────

const APP_PATH    = path.join(ROOT, 'src', 'renderer', 'src', 'App.tsx');
const SRC_DIR     = path.join(ROOT, 'src', 'renderer', 'src');
const PRELOAD     = path.join(ROOT, 'src', 'electron', 'preload.ts');
const MAIN        = path.join(ROOT, 'src', 'electron', 'main.ts');

const appText     = fs.readFileSync(APP_PATH, 'utf8');
const preloadText = fs.existsSync(PRELOAD) ? fs.readFileSync(PRELOAD, 'utf8') : '';
const mainText    = fs.existsSync(MAIN)    ? fs.readFileSync(MAIN, 'utf8')    : '';

// ─── Parse App.tsx structures ─────────────────────────────────────────────────

/** Extract all declared route paths */
const routePaths = new Set(
  [...appText.matchAll(/<Route\s+path="([^"]+)"/g)].map(m => m[1])
);

/** Extract KEEP_ALIVE_PATHS entries */
const keepAliveBlock = appText.match(/KEEP_ALIVE_PATHS\s*=\s*new\s*Set\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
const keepAlivePaths = new Set(
  [...keepAliveBlock.matchAll(/'([^']+)'/g)].map(m => m[1])
);

/** Extract lazy import map: ComponentName → import specifier */
const lazyImports = new Map(
  [...appText.matchAll(/const\s+(\w+)\s*=\s*React\.lazy\(\(\)\s*=>\s*import\(['"](.+?)['"]\)/g)]
    .map(m => [m[1], m[2]])
);

/** Also capture direct (non-lazy) imports: import X from './X' */
const directImports = new Map(
  [...appText.matchAll(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/gm)]
    .map(m => [m[1], m[2]])
);

/** Map route path → component name (look for Route + lazy-loaded element nearby) */
const routeComponents = new Map();
for (const [name, spec] of lazyImports) {
  const basename = spec.split('/').pop();
  // Find route that uses this component
  const rx = new RegExp(`path="([^"]+)"[^>]*${name}|${name}[^<]*path="([^"]+)"`, 'g');
  for (const m of appText.matchAll(new RegExp(`<(?:Route|KeepAlivePanel)\\s+path="([^"]+)"[^>]*>?[\\s\\S]{0,300}?<${name}\\b`, 'g'))) {
    routeComponents.set(m[1], { name, spec });
  }
  // Also try: <KeepAlivePanel path="..."><...<Name
  for (const m of appText.matchAll(new RegExp(`<KeepAlivePanel\\s+path="([^"]+)">[\\s\\S]{0,200}?<${name}\\b`, 'g'))) {
    routeComponents.set(m[1], { name, spec });
  }
}

// Fallback: map basename to routes
for (const [name, spec] of lazyImports) {
  const basename = path.basename(spec).replace(/\.[tj]sx?$/, '');
  for (const p of PLATFORMS) {
    const pbase = path.basename(p.file).replace(/\.[tj]sx?$/, '');
    if (pbase === basename && !routeComponents.has(p.route)) {
      routeComponents.set(p.route, { name, spec });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveFile(spec) {
  const abs = path.resolve(SRC_DIR, spec);
  for (const ext of ['.tsx', '.ts', '.jsx', '.js', '']) {
    const candidate = ext ? abs + ext : abs;
    if (fs.existsSync(candidate)) return candidate;
    const idx = path.join(abs, 'index.tsx');
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

function countLines(text) {
  return text.split('\n').length;
}

function checkPlaceholders(text) {
  return PLACEHOLDER_PATTERNS.filter(rx => rx.test(text)).map(rx => rx.source);
}

function hasIpcCall(text) {
  return IPC_PATTERNS.some(rx => rx.test(text));
}

// ─── IPC channel cross-check ──────────────────────────────────────────────────

// Build channel name → string value map from types.ts and preload.ts
const TYPES_PATH = path.join(ROOT, 'src', 'electron', 'types.ts');
const typesText  = fs.existsSync(TYPES_PATH) ? fs.readFileSync(TYPES_PATH, 'utf8') : '';
/** Map: channel key (e.g. GET_SETTINGS) → wire string (e.g. 'get-settings') */
const channelValues = new Map(
  [...typesText.matchAll(/(\w+):\s*'([^']+)'/g)].map(m => [m[1], m[2]])
);
// Also harvest from preload.ts
for (const m of preloadText.matchAll(/(\w+):\s*'([^']+)'/g)) channelValues.set(m[1], m[2]);

const preloadChannels = new Set(
  [...preloadText.matchAll(/IPC_CHANNELS\.(\w+)/g)].map(m => m[1])
);
const mainChannels = new Set(
  [...mainText.matchAll(/IPC_CHANNELS\.(\w+)/g)].map(m => m[1])
);

/**
 * Check if a channel is "covered" in a source text.
 * Accepts either IPC_CHANNELS.KEY or the string literal value.
 */
function isCovered(channelKey, sourceText) {
  if (sourceText.includes(`IPC_CHANNELS.${channelKey}`)) return true;
  const val = channelValues.get(channelKey);
  if (val && sourceText.includes(`'${val}'`)) return true;
  return false;
}

/**
 * Detect push-only channels: exposed in preload via `on(channel, ...)` but
 * not via `invoke(channel, ...)`. Main sends these unilaterally.
 */
function isPushChannel(channelKey) {
  const val = channelValues.get(channelKey);
  if (!val) return false;
  // main.ts uses webContents.send('channel') for push events
  if (mainText.includes(`webContents.send('${val}'`) || mainText.includes(`.send('${val}'`)) return true;
  // One-way send from renderer: ipcRenderer.send(IPC_CHANNELS.X, ...)
  if (preloadText.includes(`ipcRenderer.send(IPC_CHANNELS.${channelKey}`)) return true;
  // Push listener in preload: ipcRenderer.on(IPC_CHANNELS.X, ...) with no matching invoke
  // Pattern: ipcRenderer.on(IPC_CHANNELS.CHANNEL_NAME
  const usedAsListener = preloadText.includes(`ipcRenderer.on(IPC_CHANNELS.${channelKey}`) ||
                         preloadText.includes(`ipcRenderer.off(IPC_CHANNELS.${channelKey}`);
  const usedAsInvoke   = preloadText.includes(`ipcRenderer.invoke(IPC_CHANNELS.${channelKey}`);
  if (usedAsListener && !usedAsInvoke) return true;
  return false;
}

// All channels in preload with no matching handler in main (may include push channels)
const preloadMissing = [...preloadChannels].filter(c => !isCovered(c, mainText));

// Channels in preload but no invoke handler in main AND not a push/send channel
const preloadOnly = preloadMissing.filter(c => !isPushChannel(c));
// Channels registered in main but not exposed in preload (callable from renderer)
const mainOnly = [...mainChannels].filter(c => !isCovered(c, preloadText));
// Classify push-event-only channels (ipcRenderer.on listeners or one-way sends, no invoke)
const pushOnly = preloadMissing.filter(c => isPushChannel(c));

// ─── Platform-catalog drift check ──────────────────────────────────────────────
//
// src/renderer/src/platformCatalog.ts (added 2026-08-15) is the app's own
// feature catalog — folded into Mossy's system prompt and the home page.
// It's a hand-maintained list, same as the PLATFORMS array immediately above,
// which means it can drift from reality exactly the way that array's
// predecessor (a hand-written block inside MossyBrain.ts) already did once —
// silently, until someone read the actual code and found it describing
// capabilities that didn't exist. This can't verify the catalog's PROSE is
// accurate (that needs a human/AI re-read, same as last time), but it closes
// the cheaper, structural half: every id/route the catalog claims must match
// what PLATFORMS above (already cross-checked against the live App.tsx
// routes) actually has, and vice versa. Parsed via regex against the raw
// file text rather than imported/executed — this script runs in postbuild
// on plain Node with no TS-execution step, and a build-critical check
// shouldn't depend on an experimental runtime feature.

const CATALOG_PATH = path.join(SRC_DIR, 'platformCatalog.ts');
const catalogText  = fs.existsSync(CATALOG_PATH) ? fs.readFileSync(CATALOG_PATH, 'utf8') : '';
const catalogDrift = [];

if (!catalogText) {
  catalogDrift.push('src/renderer/src/platformCatalog.ts not found — catalog referenced by MossyBrain.ts/TheNexus.tsx is missing.');
} else {
  // Extract each `{ id: N, ... route: '...', ... }` entry from PLATFORM_CATALOG.
  // Entries span multiple lines, so match id and route independently within
  // each top-level array-element block (split on the `id: N,` markers).
  const entryBlocks = catalogText
    .split(/(?=\{\s*\n\s*id:\s*\d+,)/)
    .filter(b => /^\{\s*\n\s*id:\s*\d+,/.test(b));

  const catalogEntries = new Map(); // id -> route
  for (const block of entryBlocks) {
    const id = block.match(/id:\s*(\d+),/)?.[1];
    const route = block.match(/route:\s*'([^']+)'/)?.[1];
    if (id && route) catalogEntries.set(Number(id), route);
  }

  if (catalogEntries.size === 0) {
    catalogDrift.push('Could not parse any { id, route } entries out of platformCatalog.ts — regex may need updating if the file\'s structure changed.');
  }

  const platformIds = new Set(PLATFORMS.map(p => p.id));
  const catalogIds   = new Set(catalogEntries.keys());

  for (const p of PLATFORMS) {
    if (!catalogEntries.has(p.id)) {
      catalogDrift.push(`Platform ${p.id} (${p.name}) exists in this script's PLATFORMS list but has no entry in platformCatalog.ts — Mossy's system prompt and the home page don't know about it.`);
      continue;
    }
    const catalogRoute = catalogEntries.get(p.id);
    if (catalogRoute !== p.route) {
      catalogDrift.push(`Platform ${p.id} (${p.name}): route mismatch — PLATFORMS has "${p.route}", platformCatalog.ts has "${catalogRoute}".`);
    }
  }
  for (const id of catalogIds) {
    if (!platformIds.has(id)) {
      catalogDrift.push(`platformCatalog.ts has id ${id} with no matching entry in this script's PLATFORMS list — either a new platform was added without updating platform-audit.mjs, or the catalog has a stale/renumbered entry.`);
    }
  }
}

// ─── Per-platform audit ───────────────────────────────────────────────────────

const PASS = '✓';
const FAIL = '✗';
const WARN = '⚠';

const results = PLATFORMS.map(p => {
  const issues = [];
  const warns  = [];
  const info   = {};

  // 1. Route exists
  // Accept the route itself OR a redirect route that points to it
  const hasRoute = routePaths.has(p.route)
    || appText.includes(`"${p.route}"`) // covers KeepAlivePanel
    ;
  if (!hasRoute) issues.push(`Route "${p.route}" not declared in App.tsx`);
  info.hasRoute = hasRoute;

  // 2. Lazy import
  const comp = routeComponents.get(p.route);
  const specFromPlatform = `./${p.file.replace(/\.[tj]sx?$/, '')}`;
  // Also accept if any lazy import basename matches the file
  const fileBase = path.basename(p.file).replace(/\.[tj]sx?$/, '');
  const matchingLazy = [...lazyImports.entries()].find(([, spec]) =>
    path.basename(spec).replace(/\.[tj]sx?$/, '') === fileBase
  );
  // Also accept direct (non-lazy) imports for special-case pages
  const matchingDirect = [...directImports.entries()].find(([, spec]) =>
    path.basename(spec).replace(/\.[tj]sx?$/, '') === fileBase
  );
  const hasLazy = !!comp || !!matchingLazy || !!matchingDirect;
  if (!hasLazy) issues.push(`No import found for ${p.file}`);
  info.componentName = comp?.name ?? matchingLazy?.[0] ?? matchingDirect?.[0] ?? '?';
  info.importSpec    = comp?.spec ?? matchingLazy?.[1] ?? matchingDirect?.[1] ?? '?';
  if (matchingDirect && !matchingLazy) warns.push('Direct import (not lazy) — acceptable for startup/modal pages');

  // 3. File exists
  const resolvedFile = resolveFile(specFromPlatform) ?? resolveFile(`./${p.file}`);
  info.filePath = resolvedFile ? path.relative(ROOT, resolvedFile).replace(/\\/g, '/') : null;
  if (!resolvedFile) {
    if (p.allowMissingFile) {
      warns.push(`Component file not found: ${p.file} (optional local-only module)`);
      info.lines = null;
      info.hasIpc = false;
      const status = warns.length > 0 ? 'WARN' : 'PASS';
      return { ...p, issues, warns, info, status };
    }
    issues.push(`Component file not found: ${p.file}`);
    return { ...p, issues, warns, info, status: 'FAIL' };
  }

  const src = fs.readFileSync(resolvedFile, 'utf8');
  const lines = countLines(src);
  info.lines = lines;

  // 4. Non-trivial
  if (lines < MIN_LINES) warns.push(`Component is very short (${lines} lines — likely a stub)`);

  // 5. KEEP_ALIVE_PATHS
  const inKAP = keepAlivePaths.has(p.route);
  if (!inKAP) {
    // Check if it renders via a path that IS in KAP (e.g. /dev/orchestrator for /orchestrator)
    const altRoute = appText.match(new RegExp(`path="${p.route.replace('/', '\\/')}"[^>]*Navigate\\s+to="([^"]+)"`))?.[1];
    const altInKAP = altRoute ? keepAlivePaths.has(altRoute) : false;
    if (!altInKAP) warns.push(`Route "${p.route}" not in KEEP_ALIVE_PATHS (404 overlay may appear)`);
    info.keepAlive = altInKAP ? `via ${altRoute}` : false;
  } else {
    info.keepAlive = true;
  }

  // 6. Placeholder content
  const plhMatches = checkPlaceholders(src);
  if (plhMatches.length > 0) warns.push(`Possible placeholder content: ${plhMatches.join(', ')}`);
  info.placeholders = plhMatches;

  // 7. IPC calls
  const hasIpc = hasIpcCall(src);
  // Hub shells: they lazy-load or directly import sub-components which have IPC.
  // Detect hub shells by counting lazy imports + capitalized direct imports.
  const lazyCount   = (src.match(/React\.lazy\(/g) ?? []).length;
  const subImports  = (src.match(/^import\s+\{?[A-Z]/gm) ?? []).length;
  const isHubShell  = lazyCount >= 2 || subImports >= 3;
  if (!hasIpc) {
    if (isHubShell) {
      // Hub shells delegate IPC to children — expected, not a warning
      info.ipcNote = 'hub-shell';
    } else {
      warns.push('No IPC calls detected — may be static/disconnected');
    }
  }
  info.hasIpc = hasIpc;

  // 8. Expected IPC namespaces
  if (p.ipcExpected) {
    for (const ns of p.ipcExpected) {
      // Accept both direct access and TypeScript any-cast access patterns
      const patterns = [
        new RegExp(`window\\.api\\.${ns}\\.`),
        new RegExp(`window\\.electronAPI\\.${ns}\\.`),
        new RegExp(`\\.api\\??\\.${ns}`),        // (window as any).api?.namespace
        new RegExp(`api\\s*=.*\\.${ns}`),          // const api = (...).automation
      ];
      const found = patterns.some(rx => rx.test(src));
      if (!found) {
        issues.push(`Expected IPC namespace "window.api.${ns}" not found`);
      }
    }
  }

  const status = issues.length > 0 ? 'FAIL' : warns.length > 0 ? 'WARN' : 'PASS';
  return { ...p, issues, warns, info, status };
});

// ─── Output ───────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const fixMode  = args.includes('--fix');

if (jsonMode) {
  console.log(JSON.stringify({ platforms: results, ipc: { preloadOnly, mainOnly } }, null, 2));
  process.exit(0);
}

// Pretty print
const pad = (s, n) => String(s).padEnd(n);
const N   = 24;

console.log('\n' + '═'.repeat(100));
console.log('  MOSSY.SPACE PLATFORM AUDIT');
console.log('  ' + new Date().toISOString());
console.log('═'.repeat(100));
console.log(pad('#', 4) + pad('Status', 8) + pad('Platform', 32) + pad('Route', 28) + 'Lines  IPC  KAP');
console.log('─'.repeat(100));

for (const r of results) {
  const icon  = r.status === 'PASS' ? PASS : r.status === 'WARN' ? WARN : FAIL;
  // info.keepAlive is `true` (direct match), a truthy string like "via /dev/x" (resolved
  // through a redirect — genuinely fine, no warn was pushed for it), or `false` (real gap).
  const kap   = r.info.keepAlive ? PASS : FAIL;
  const ipc   = r.info.hasIpc ? PASS : r.info.ipcNote === 'hub-shell' ? '◈' : WARN;
  const lines = r.info.lines ? String(r.info.lines).padStart(5) : '  —  ';
  console.log(
    pad(`${r.id}.`, 4) +
    pad(`[${icon}]`, 8) +
    pad(r.name, 32) +
    pad(r.route, 28) +
    `${lines}  ${ipc}    ${kap}`
  );
  for (const issue of r.issues) console.log(`       ${FAIL} ${issue}`);
  for (const warn  of r.warns)  console.log(`       ${WARN} ${warn}`);
}

console.log('─'.repeat(100));
const pass = results.filter(r => r.status === 'PASS').length;
const warn = results.filter(r => r.status === 'WARN').length;
const fail = results.filter(r => r.status === 'FAIL').length;
console.log(`  PASS: ${pass}  WARN: ${warn}  FAIL: ${fail}  (of ${results.length} platforms)`);

// IPC cross-check
console.log('\n' + '─'.repeat(100));
console.log('  IPC CHANNEL CROSS-CHECK');
if (!preloadOnly.length && !mainOnly.length && !pushOnly.length) {
  console.log('  All channels balanced ✓');
} else {
  if (pushOnly.length) {
    console.log(`\n  ◈ Push/event channels in preload (expected — no main handler needed) (${pushOnly.length}):`);
    for (const c of pushOnly.sort()) console.log(`     - ${c}`);
  }
  if (preloadOnly.length) {
    console.log(`\n  ${WARN} Exposed in preload but no handler in main.ts (${preloadOnly.length}):`);
    for (const c of preloadOnly.sort()) console.log(`     - ${c}`);
  }
  if (mainOnly.length) {
    console.log(`\n  ${WARN} Handled in main.ts but NOT exposed in preload — renderer cannot call these (${mainOnly.length}):`);
    for (const c of mainOnly.sort()) console.log(`     - ${c}`);
  }
}
// Platform-catalog drift check
console.log('\n' + '─'.repeat(100));
console.log('  PLATFORM CATALOG DRIFT CHECK (src/renderer/src/platformCatalog.ts)');
if (catalogDrift.length === 0) {
  console.log(`  All ${PLATFORMS.length} platforms present in both lists with matching routes ✓`);
} else {
  for (const d of catalogDrift) console.log(`  ${FAIL} ${d}`);
}
console.log('═'.repeat(100) + '\n');

if (fixMode) {
  const broken = results.filter(r => r.status !== 'PASS');
  if (broken.length === 0) { console.log('Nothing to fix.\n'); process.exit(0); }
  console.log('ACTION LIST:\n');
  for (const r of broken) {
    console.log(`Platform ${r.id}: ${r.name}`);
    for (const i of r.issues) console.log(`  FIX:  ${i}`);
    for (const w of r.warns)  console.log(`  TODO: ${w}`);
    console.log();
  }
}

process.exit((fail > 0 || catalogDrift.length > 0) ? 1 : 0);
