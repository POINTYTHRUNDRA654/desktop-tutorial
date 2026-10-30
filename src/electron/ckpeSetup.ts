/**
 * Read the user's real CKPE (Creation Kit Platform Extended) setup from disk.
 *
 * Every fact here was checked against CKPE's own source
 * (github.com/Perchik71/Creation-Kit-Platform-Extended, LGPL-3.0, read
 * 2026-10-29) and a real CKPE 0.6 install next to CK 1.11.246:
 *
 *  - CKPE 0.6+ installs ckpe_loader.exe, CKPE.dll, CKPE.Common.dll and
 *    CKPE.Fallout4.dll next to CreationKit.exe, configured by
 *    CreationKitPlatformExtended.toml. Older builds used
 *    CreationKitPlatformExtended.dll + .ini.
 *  - One CKPE build supports every listed CK version (VersionLists.h):
 *    1.10.162.0, 1.10.943.1, 1.10.982.3, 1.11.137.0, 1.11.240.0, 1.11.246.0.
 *  - CKPE needs its address library CKPEBins\version-<a-b-c-d>.bin for the
 *    exact CK version, or it fails with
 *    'IDDatabase::Load file "...version-...bin" no found'.
 *  - Settings and defaults below are the _READ_OPTION_* calls in the source.
 *
 * Nothing is guessed: a value that could not be read is reported as unknown.
 */
import fs from 'fs';
import path from 'path';

export const CKPE_SUPPORTED_CK_VERSIONS = [
  '1.10.162.0', '1.10.943.1', '1.10.982.3', '1.11.137.0', '1.11.240.0', '1.11.246.0',
];

export interface CkpeSettingInfo {
  key: string;               // "Section:key"
  value: string | null;      // as written in the toml/ini, null if absent
  defaultValue: string;      // CKPE's built-in default when the key is absent
  meaning: string;
}

export interface CkpeIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
}

export interface CkpeSetup {
  fo4Dir: string;
  detected: boolean;
  generation: 'current' | 'legacy' | 'none';
  /** Kept for the CK Tools hub's toolchain card. */
  found: boolean;
  iniFound: boolean;
  configPath: string | null;
  ckpeVersion: string | null;      // from ckpe.log, e.g. "0.6 build 267"
  ckVersion: string | null;        // CreationKit.exe file version
  ckSupported: boolean | null;
  addressLibrary: { path: string; found: boolean } | null;
  logPath: string | null;
  logOutputEnabled: boolean | null;
  settings: CkpeSettingInfo[];
  issues: CkpeIssue[];
  /** Legacy fields the toolchain card already reads. */
  ownArchiveLoader?: boolean;
  pointerHandle?: boolean;
}

const SETTINGS: Array<{ key: string; def: string; meaning: string }> = [
  { key: 'CreationKit:bAllowSaveESM', def: 'false', meaning: 'Lets CK save master files (.esm) directly and set them as the Active File. Destroys version-control info. Only applies when CK version control is off.' },
  { key: 'CreationKit:bAllowMasterESP', def: 'false', meaning: 'Lets .esp files act as masters for the plugin being saved.' },
  { key: 'CreationKit:bSkipTopicInfoValidation', def: 'false', meaning: 'Skips Topic Info (dialogue) validation while loading: faster loads; CKPE recommends it to avoid load crashes.' },
  { key: 'CreationKit:bDisableAssertions', def: 'false', meaning: 'Hides assertion pop-ups. Not recommended: real errors go unnoticed.' },
  { key: 'CreationKit:bGenerateCrashdumps', def: 'true', meaning: 'Writes a crash dump when CK crashes (Mossy reads these from Logs\\CKPE\\Crashes).' },
  { key: 'CreationKit:bBSPointerHandleExtremly', def: 'false', meaning: 'Experimental: raises the reference limit to 67,108,864. At your own risk.' },
  { key: 'CreationKit:bUnicode', def: 'false', meaning: 'Converts UTF-8 to ANSI when opening a plugin and back when saving.' },
  { key: 'CreationKit:bThreads', def: 'true', meaning: 'Thread management; limits CK to 85% CPU so other programs do not stutter.' },
  { key: 'CreationKit:bVersionControlMergeWorkaround', def: 'false', meaning: 'Experimental workaround for version-control merges with more than 2 masters. Do not use otherwise.' },
  { key: 'Animation:bSkipAnimationBuildData', def: 'false', meaning: 'Skips animation data generation for much faster loads. Turn off when working with animation.' },
  { key: 'PreCombined:bInstallOnlyModeCLI', def: 'true', meaning: "CKPE's precombine patch is harmful to previs, so by default it only installs when CK is started with -GeneratePreCombined." },
  { key: 'PreCombined:bGenerateForPC', def: 'true', meaning: 'Precombine Havok collision output for PC. false = PS4 mode (patch not applied).' },
  { key: 'Log:sOutputFile', def: '(empty)', meaning: "Copies CKPE's log to a file (ckpe.log). Mossy's precombine-conflict check reads that file." },
  { key: 'Crashes:bGenerateFullDump', def: 'false', meaning: 'Full crash dump with more detail (includes personal information).' },
];

/** Minimal TOML/INI reader: [Section] headers and key = value lines. */
export function parseCkpeConfig(text: string): Map<string, string> {
  const out = new Map<string, string>();
  let section = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\uFEFF/, '').trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const sec = /^\[([^\]]+)\]/.exec(line);
    if (sec) { section = sec[1].trim(); continue; }
    const kv = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].replace(/\s+[#;].*$/, '').trim();
    if (/^".*"$/.test(value) || /^'.*'$/.test(value)) value = value.slice(1, -1);
    out.set(`${section}:${kv[1]}`, value);
  }
  return out;
}

const _peCache = new Map<string, { mtimeMs: number; size: number; version: string | null }>();

/** FileVersion from a PE's VS_FIXEDFILEINFO block (signature 0xFEEF04BD). */
export function readExeFileVersion(exePath: string): string | null {
  try {
    const st = fs.statSync(exePath);
    const hit = _peCache.get(exePath);
    if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.version;
    const buf = fs.readFileSync(exePath);
    const sig = Buffer.from([0xbd, 0x04, 0xef, 0xfe]);
    let version: string | null = null;
    for (let i = buf.lastIndexOf(sig); i >= 0; i = buf.lastIndexOf(sig, i - 1)) {
      if (i + 16 > buf.length) continue;
      const struc = buf.readUInt32LE(i + 4);
      if (struc !== 0x00010000) continue;   // dwStrucVersion of a real VS_FIXEDFILEINFO
      const ms = buf.readUInt32LE(i + 8), ls = buf.readUInt32LE(i + 12);
      version = `${ms >>> 16}.${ms & 0xffff}.${ls >>> 16}.${ls & 0xffff}`;
      break;
    }
    _peCache.set(exePath, { mtimeMs: st.mtimeMs, size: st.size, version });
    return version;
  } catch {
    return null;
  }
}

function boolOf(v: string | null | undefined): boolean | null {
  if (v == null) return null;
  const s = v.trim().toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return null;
}

export function readCkpeSetup(fo4Dir: string): CkpeSetup {
  const p = (...parts: string[]) => path.join(fo4Dir, ...parts);
  const exists = (f: string) => { try { return fs.existsSync(f); } catch { return false; } };
  const issues: CkpeIssue[] = [];

  const current = exists(p('ckpe_loader.exe')) || (exists(p('CKPE.dll')) && exists(p('CKPE.Fallout4.dll')));
  const legacy = !current && exists(p('CreationKitPlatformExtended.dll'));
  const toml = p('CreationKitPlatformExtended.toml');
  const ini = p('CreationKitPlatformExtended.ini');
  const configPath = exists(toml) ? toml : exists(ini) ? ini : null;
  const ckExe = p('CreationKit.exe');
  const ckVersion = exists(ckExe) ? readExeFileVersion(ckExe) : null;

  const setup: CkpeSetup = {
    fo4Dir, detected: current || legacy, generation: current ? 'current' : legacy ? 'legacy' : 'none',
    found: current || legacy, iniFound: !!configPath, configPath,
    ckpeVersion: null, ckVersion, ckSupported: ckVersion ? CKPE_SUPPORTED_CK_VERSIONS.includes(ckVersion) : null,
    addressLibrary: null, logPath: null, logOutputEnabled: null, settings: [], issues,
  };

  if (!exists(ckExe)) issues.push({ level: 'info', message: `CreationKit.exe is not in ${fo4Dir}.` });
  if (!setup.detected) {
    issues.push({ level: 'error', message: 'CKPE is not installed here (no ckpe_loader.exe / CKPE.dll next to CreationKit.exe). Get it from Nexus #51165 or the CKPE GitHub releases, and extract it into the Fallout 4 folder.' });
    return setup;
  }
  if (legacy) {
    issues.push({ level: 'warning', message: 'This is an older CKPE (CreationKitPlatformExtended.dll). Current CKPE 0.6+ ships ckpe_loader.exe and one build supports every CK version from 1.10.162 to 1.11.246.' });
  }

  let cfg = new Map<string, string>();
  if (configPath) {
    try { cfg = parseCkpeConfig(fs.readFileSync(configPath, 'utf-8')); }
    catch (e: any) { issues.push({ level: 'warning', message: `Could not read ${path.basename(configPath)}: ${e?.message || e}` }); }
  } else {
    issues.push({ level: 'warning', message: 'No CreationKitPlatformExtended.toml found, so CKPE runs on its built-in defaults.' });
  }
  setup.settings = SETTINGS.map((s) => ({ key: s.key, value: cfg.has(s.key) ? cfg.get(s.key)! : null, defaultValue: s.def, meaning: s.meaning }));
  const val = (k: string) => setup.settings.find((s) => s.key === k)?.value ?? null;
  setup.ownArchiveLoader = /^false$/i.test(cfg.get('CreationKit:bOwnArchiveLoader') ?? '');
  setup.pointerHandle = boolOf(val('CreationKit:bBSPointerHandleExtremly')) === true;

  // ckpe.log: version header, and the address-library failure CKPE writes
  const logPath = exists(p('ckpe.log')) ? p('ckpe.log') : null;
  setup.logPath = logPath;
  const out = val('Log:sOutputFile');
  setup.logOutputEnabled = out == null ? false : out.trim() !== '' && out.trim().toLowerCase() !== 'none';
  let logText = '';
  if (logPath) {
    try { logText = fs.readFileSync(logPath, 'utf-8'); } catch { /* optional */ }
    const v = /CKPE Runtime:\s*([0-9.]+\s+build\s+\d+)/i.exec(logText);
    if (v) setup.ckpeVersion = v[1].replace(/\s+/g, ' ');
    if (!setup.ckVersion) {
      const ck = /^CK:\s*(\d+)\.(\d+)\s+build\s+(\d+)\s+rev:(\d+)/m.exec(logText);
      if (ck) setup.ckVersion = `${ck[1]}.${ck[2]}.${ck[3]}.${ck[4]}`;
      setup.ckSupported = setup.ckVersion ? CKPE_SUPPORTED_CK_VERSIONS.includes(setup.ckVersion) : null;
    }
  }

  if (setup.ckVersion && current) {
    const bin = p('CKPEBins', `version-${setup.ckVersion.replace(/\./g, '-')}.bin`);
    setup.addressLibrary = { path: bin, found: exists(bin) };
    if (!setup.addressLibrary.found) {
      issues.push({ level: 'error', message: `CKPE's address library for CK ${setup.ckVersion} is missing (${path.join('CKPEBins', path.basename(bin))}). Without it CKPE cannot patch CK. It comes with the CKPE download (Nexus #51165) or the CKPE GitHub repo's Database/FO4/CKPEBins folder.` });
    }
  }
  if (/IDDatabase::Load file .* no found/i.test(logText)) {
    issues.push({ level: 'error', message: 'The last ckpe.log says CKPE could not find its address library (IDDatabase::Load ... no found).' });
  }
  if (setup.ckSupported === false) {
    issues.push({ level: 'warning', message: `CK ${setup.ckVersion} is not in the CK versions this Mossy knows CKPE supports (${CKPE_SUPPORTED_CK_VERSIONS.join(', ')}). A newer CKPE may support it; check the CKPE release notes.` });
  }
  if (!setup.logOutputEnabled) {
    issues.push({ level: 'info', message: "CKPE's log file output is off ([Log] sOutputFile). Mossy's precombine-conflict check needs it: set sOutputFile = \"ckpe.log\"." });
  }
  if (boolOf(val('CreationKit:bDisableAssertions')) === true) {
    issues.push({ level: 'warning', message: 'bDisableAssertions is on: CK error pop-ups are hidden, so real problems can go unnoticed.' });
  }
  if (boolOf(val('Animation:bSkipAnimationBuildData')) === true) {
    issues.push({ level: 'info', message: 'bSkipAnimationBuildData is on: animation data is not built. Turn it off when working on animations.' });
  }
  if (boolOf(val('CreationKit:bAllowSaveESM')) === true) {
    issues.push({ level: 'info', message: 'bAllowSaveESM is on: CK can save .esm masters directly (and they can be the Active File).' });
  }
  if (boolOf(val('PreCombined:bInstallOnlyModeCLI')) === false) {
    issues.push({ level: 'warning', message: "bInstallOnlyModeCLI is off: CKPE's precombine patch is always installed, and CKPE notes it is harmful to previs. The default (true) installs it only for -GeneratePreCombined runs." });
  }
  return setup;
}

/** Plain-text summary for Mossy's chat context. */
export function summarizeCkpeSetup(s: CkpeSetup): string {
  const lines: string[] = [`User's CKPE setup (read from ${s.fo4Dir} just now):`];
  if (!s.detected) {
    lines.push('- CKPE: not installed.');
  } else {
    lines.push(`- CKPE: installed (${s.generation === 'current' ? 'current loader build' : 'older build'})${s.ckpeVersion ? `, runtime ${s.ckpeVersion}` : ''}.`);
  }
  lines.push(`- Creation Kit version: ${s.ckVersion ?? 'unknown'}${s.ckSupported === true ? ' (supported by CKPE)' : s.ckSupported === false ? ' (not in the known supported list)' : ''}.`);
  if (s.addressLibrary) lines.push(`- CKPE address library for this CK: ${s.addressLibrary.found ? 'present' : 'MISSING'}.`);
  const set = s.settings.filter((x) => x.value != null).map((x) => `${x.key.split(':')[1]}=${x.value}`);
  if (set.length) lines.push(`- Settings: ${set.join(', ')}.`);
  for (const i of s.issues) lines.push(`- ${i.level.toUpperCase()}: ${i.message}`);
  return lines.join('\n');
}
