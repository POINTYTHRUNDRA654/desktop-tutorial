/**
 * deploy-full.cjs - Full slim-pack deploy of dist/ + dist-electron/ into app.asar
 * Run from the project root: node deploy-full.cjs
 */
'use strict';

const path = require('path');
const fs   = require('fs');
const os   = require('os');

const ROOT   = __dirname;
// Optional CLI arg selects which packaged edition to deploy to, e.g.:
//   node deploy-full.cjs "Mossy NVIDIA"
//   node deploy-full.cjs "Mossy Universal"
// Defaults to NVIDIA (the edition this script has always targeted) so existing
// call sites/muscle memory keep working unchanged.
const EDITION = process.argv[2] || 'Mossy NVIDIA';
const TMP    = path.join(os.tmpdir(), 'mossy-full-deploy-' + EDITION.replace(/\s+/g, '-'));
const DEST   = path.join(ROOT, 'Mossy', EDITION, 'resources', 'app.asar');
const BACKUP = DEST + '.bak';
// Fix minimatch CJS default-export mismatch in @electron/asar
// minimatch v9+ exports { minimatch } but asar.js calls minimatch_1.default()
const mmMod = require(path.join(ROOT, 'node_modules', 'minimatch'));
if (!mmMod.default && mmMod.minimatch) mmMod.default = mmMod.minimatch;
const ASAR   = require(path.join(ROOT, 'node_modules', '@electron', 'asar', 'lib', 'asar.js'));

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dest, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function main() {
  console.log('\n[MOSSY.SPACE] Full Slim-Pack Deployer\n');
  console.log('ROOT: ' + ROOT);

  // 1. Verify build outputs
  const distDir         = path.join(ROOT, 'dist');
  const distElectronDir = path.join(ROOT, 'dist-electron');
  if (!fs.existsSync(distDir))         { console.error('ERROR: dist/ not found'); process.exit(1); }
  if (!fs.existsSync(distElectronDir)) { console.error('ERROR: dist-electron/ not found'); process.exit(1); }
  console.log('[1/6] Build outputs verified');

  // 2. Verify destination
  if (!fs.existsSync(DEST)) { console.error('ERROR: app.asar not found at ' + DEST); process.exit(1); }
  console.log('[2/6] Target asar found: ' + DEST);

  // 3. Backup
  fs.copyFileSync(DEST, BACKUP);
  console.log('[3/6] Backup created: ' + BACKUP);

  // 4. Extract existing asar
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  console.log('[4/6] Extracting current asar...');
  ASAR.extractAll(DEST, TMP);
  console.log('      Extracted to ' + TMP);

  // 5. Overlay new build outputs
  console.log('[5/6] Overlaying new build outputs...');
  const tmpDist = path.join(TMP, 'dist');
  if (fs.existsSync(tmpDist)) fs.rmSync(tmpDist, { recursive: true, force: true });
  copyDir(distDir, tmpDist);
  console.log('      dist/ replaced');

  const tmpDE = path.join(TMP, 'dist-electron');
  if (fs.existsSync(tmpDE)) fs.rmSync(tmpDE, { recursive: true, force: true });
  copyDir(distElectronDir, tmpDE);
  console.log('      dist-electron/ replaced');

  // 5b. Sync .env.encrypted from project root so the deployed asar always uses
  // the latest token values (the extracted asar has the old copy).
  const srcEnv = path.join(ROOT, '.env.encrypted');
  const destEnv = path.join(TMP, '.env.encrypted');
  if (fs.existsSync(srcEnv)) {
    fs.copyFileSync(srcEnv, destEnv);
    console.log('      .env.encrypted refreshed from project root');
  }

  // 5b2. Sync CHANGELOG.md so the What's New feature (main.ts findChangelogPath) can
  // find it at app.getAppPath()/CHANGELOG.md inside the packaged asar.
  const srcChangelog = path.join(ROOT, 'CHANGELOG.md');
  const destChangelog = path.join(TMP, 'CHANGELOG.md');
  if (fs.existsSync(srcChangelog)) {
    fs.copyFileSync(srcChangelog, destChangelog);
    console.log('      CHANGELOG.md refreshed from project root');
  }

  // 5b3. Sync package.json so `require('../../package.json').version` in main.ts
  // (used by whats-new-get-current and elsewhere) reports the real deployed version
  // instead of whatever version the asar happened to be packed at originally.
  const srcPkg = path.join(ROOT, 'package.json');
  const destPkg = path.join(TMP, 'package.json');
  if (fs.existsSync(srcPkg)) {
    fs.copyFileSync(srcPkg, destPkg);
    console.log('      package.json refreshed from project root');
  }

  // 5c. Sync runtime node_modules added since the asar's bundled node_modules was last packed
  const REQUIRED_MODULES = [
    'simple-git', '@kwsites/file-exists', '@kwsites/promise-deferred',
    '@simple-git/args-pathspec', '@simple-git/argv-parser', 'debug', 'ms',
    'adm-zip',
  ];
  const tmpNodeModules = path.join(TMP, 'node_modules');
  for (const mod of REQUIRED_MODULES) {
    const src = path.join(ROOT, 'node_modules', mod);
    const dest = path.join(tmpNodeModules, mod);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      copyDir(src, dest);
      console.log('      synced node_modules/' + mod);
    }
  }

  // 5d. Copy Python runtime scripts to resources/scripts/ (alongside the asar).
  // These cannot live inside the asar — Python's execFileSync needs a real disk path.
  // The main.ts scan handler looks here first: path.join(app.getAppPath(), '..', 'scripts', ...)
  const PYTHON_SCRIPTS = ['fo4_strings_scan.py'];
  const srcScriptsDir  = path.join(ROOT, 'scripts');
  const destScriptsDir = path.join(ROOT, 'Mossy', EDITION, 'resources', 'scripts');
  if (!fs.existsSync(destScriptsDir)) fs.mkdirSync(destScriptsDir, { recursive: true });
  for (const script of PYTHON_SCRIPTS) {
    const src = path.join(srcScriptsDir, script);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(destScriptsDir, script));
      console.log('      copied scripts/' + script + ' → resources/scripts/');
    }
  }

  // 5e. Copy blank-plugin ESP templates to resources/plugin-templates/ (alongside the asar).
  // These are real disk files (not asar contents) so the "Create Blank Plugin" IPC handler
  // can fs.copyFileSync() them straight to a user-chosen destination.
  // The main.ts handler looks here first: path.join(app.getAppPath(), '..', 'plugin-templates', ...)
  const PLUGIN_TEMPLATES = ['EmptyPlugin.esp', 'PrevisGen.esp'];
  const srcTemplatesDir  = path.join(ROOT, 'resources', 'plugin-templates');
  const destTemplatesDir = path.join(ROOT, 'Mossy', EDITION, 'resources', 'plugin-templates');
  if (!fs.existsSync(destTemplatesDir)) fs.mkdirSync(destTemplatesDir, { recursive: true });
  for (const tmpl of PLUGIN_TEMPLATES) {
    const src = path.join(srcTemplatesDir, tmpl);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(destTemplatesDir, tmpl));
      console.log('      copied resources/plugin-templates/' + tmpl + ' → resources/plugin-templates/');
    }
  }

  // 6. Slim-pack (native .node modules stay in app.asar.unpacked)
  console.log('[6/6] Slim-packing...');
  await ASAR.createPackageWithOptions(TMP, DEST, { unpack: '{*.node,*.dll}' });
  fs.rmSync(TMP, { recursive: true, force: true });

  console.log('\nDEPLOY COMPLETE');
  console.log('Deployed to: ' + DEST);
  console.log('Backup at:   ' + BACKUP);
  console.log('\nClose and relaunch ' + EDITION + ' to load the new build.\n');

  // Platform audit — run after every deploy to catch regressions immediately
  const { execSync } = require('child_process');
  try {
    execSync('node scripts/platform-audit.mjs', { stdio: 'inherit', cwd: ROOT });
  } catch {
    // Audit exits with code 1 on FAIL — don't block the deploy, just surface it
    console.warn('[AUDIT] Platform audit reported failures — check output above.\n');
  }
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
