/**
 * ENB Specular Fix -- repair old Fallout 4 texture mods whose specular maps make
 * ENB Complex Parallax smear.
 *
 * ENB Complex Parallax reads a height map from the ALPHA of a FO4 specular map
 * (_s). Only an alpha of exactly 255 means "off"; 127 is the surface, darker
 * pushes in, brighter pushes out. Vanilla _s maps are BC5 (8,709 of 8,772 in the
 * unpacked game + DLC): red = specular, green = smoothness, no alpha, so ENB
 * reads 1.0 = off. Many older mods saved _s as BC1/BC3/BC7 with a cut-out mask
 * in the alpha, and with ENB parallax on those surfaces smear toward the camera.
 * Setting the alpha to 255 is not enough in a compressed format (BC7 left
 * 251-254 in a test, which ENB still treats as on). What fixed it in game
 * (Moss AIO Redux, 952 maps, 2026-11-12): re-save every _s as BC5 like vanilla,
 * red and green unchanged, no alpha.
 *
 * This writes the fixed copies to a NEW folder next to each mod
 * ("<mod> - ENB Specular Fix"); the original mod is never modified. Texture BA2s
 * are read with BSArch (ships with xEdit): the archive is repacked filtered to
 * *_s.dds into a small temp archive and that is unpacked (a 3.9 GB texture
 * archive gave 954 specular maps / 584 MB in ~40 s instead of a full unpack).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { dialog, shell, BrowserWindow } from 'electron';

export const FIX_SUFFIX = ' - ENB Specular Fix';
export const LOG_NAME = '_enb_specular_fix_log.txt';

const DXGI: Record<number, string> = {
  71: 'BC1', 72: 'BC1', 74: 'BC2', 75: 'BC2', 77: 'BC3', 78: 'BC3', 80: 'BC4', 81: 'BC4',
  83: 'BC5', 84: 'BC5', 98: 'BC7', 99: 'BC7', 28: 'RGBA8', 29: 'RGBA8', 87: 'BGRA8', 91: 'BGRA8',
};
const FOURCC: Record<string, string> = {
  DXT1: 'BC1', DXT3: 'BC2', DXT5: 'BC3', ATI1: 'BC4', BC4U: 'BC4', ATI2: 'BC5', BC5U: 'BC5',
};

export type DdsInfo = { width: number; height: number; format: string };

/** Width, height and compression of a DDS file, or null if it is not a readable DDS. */
export function ddsInfo(p: string): DdsInfo | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(p, 'r');
    const b = Buffer.alloc(148);
    const n = fs.readSync(fd, b, 0, 148, 0);
    if (n < 128 || b.toString('latin1', 0, 4) !== 'DDS ') return null;
    const height = b.readUInt32LE(12);
    const width = b.readUInt32LE(16);
    const pfFlags = b.readUInt32LE(80);
    const four = b.toString('latin1', 84, 88);
    let format: string;
    if (four === 'DX10' && n >= 132) format = DXGI[b.readUInt32LE(128)] || 'DX10-other';
    else if (pfFlags & 0x4) format = FOURCC[four] || four.replace(/\0/g, '');
    else format = (pfFlags & 0x1) ? 'RGBA' : 'RGB';
    return { width, height, format };
  } catch {
    return null;
  } finally {
    if (fd !== null) { try { fs.closeSync(fd); } catch { /* already closed */ } }
  }
}

/** Every _s that is not BC5 can carry an alpha ENB reads as height (BC1 too: 1-bit alpha). */
export const needsFix = (format: string) => format !== 'BC5';
export const isSpecular = (name: string) => /_s\.dds$/i.test(name);
const isTerrain = (rel: string) => rel.replace(/\//g, '\\').toLowerCase().startsWith('textures\\terrain\\');

function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

export function looksLikeMod(dir: string): boolean {
  try {
    return fs.readdirSync(dir).some((n) => n.toLowerCase() === 'textures' || n.toLowerCase().endsWith('.ba2'));
  } catch { return false; }
}

export function listModFolders(root: string, allInside: boolean): string[] {
  if (!allInside) return [root];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.endsWith(FIX_SUFFIX) && !/^[_.]/.test(e.name))
    .map((e) => path.join(root, e.name))
    .sort((a, b) => a.localeCompare(b));
}

export type ModScan = { loose: { rel: string; format: string }[]; ba2: string[]; terrainSkipped: number };

export function scanMod(mod: string): ModScan {
  const loose: { rel: string; format: string }[] = [];
  const ba2: string[] = [];
  let terrainSkipped = 0;
  for (const p of walk(mod)) {
    const name = path.basename(p);
    if (/\.ba2$/i.test(name) && /texture/i.test(name)) ba2.push(p);
    if (!isSpecular(name)) continue;
    const rel = path.relative(mod, p);
    if (isTerrain(rel)) { terrainSkipped++; continue; } // generated terrain LOD: xLODGen's job
    loose.push({ rel, format: ddsInfo(p)?.format || 'unreadable' });
  }
  return { loose, ba2, terrainSkipped };
}

// -- tools --------------------------------------------------------------------

function onPath(exe: string): string | null {
  for (const dir of String(process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    const p = path.join(dir, exe);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function findTools(settings: any, ckTexconv: string | null): { texconv: string | null; bsarch: string | null } {
  const xedit = String(settings?.xeditPath || '').trim();
  const xeditDir = xedit ? (/\.exe$/i.test(xedit) ? path.dirname(xedit) : xedit) : '';
  const texCandidates = [
    ckTexconv || '',
    xeditDir && path.join(xeditDir, 'Edit Scripts', 'Texconv.exe'),
    xeditDir && path.join(xeditDir, 'texconv.exe'),
  ];
  const texconv = texCandidates.find((c) => c && fs.existsSync(c)) || onPath('texconv.exe');
  const bsCandidates = [xeditDir && path.join(xeditDir, 'BSArch.exe'), xeditDir && path.join(xeditDir, 'BSArch64.exe')];
  const bsarch = bsCandidates.find((c) => c && fs.existsSync(c)) || onPath('BSArch.exe');
  return { texconv: texconv || null, bsarch: bsarch || null };
}

const active = new Set<ChildProcess>();

function run(cmd: string, args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    let out = '';
    let child: ChildProcess;
    try {
      child = spawn(cmd, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e: any) {
      resolve({ code: -1, out: String(e?.message || e) });
      return;
    }
    active.add(child);
    const keep = (d: Buffer) => { out = (out + d.toString()).slice(-4000); };
    child.stdout?.on('data', keep);
    child.stderr?.on('data', keep);
    child.on('error', (e) => { active.delete(child); resolve({ code: -1, out: out + e.message }); });
    child.on('close', (code) => { active.delete(child); resolve({ code: code ?? -1, out }); });
  });
}

const tail = (s: string, n = 3) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-n).join(' | ');

// -- one file -----------------------------------------------------------------

export type AlphaKind = 'none (255)' | 'hard mask' | 'soft or gradient';

/**
 * Describe the old alpha of texconv's uncompressed RGBA8 decode, for the log only.
 * Not a reliable "is this a real parallax height" test: on Moss AIO (2021) 153 of
 * 952 maps came out "soft or gradient" (anti-aliased masks), and removing all of
 * them is what stopped the smearing in game. So nothing is skipped based on it.
 */
export function alphaClass(rawDds: string): { kind: AlphaKind; min: number; max: number } {
  const buf = fs.readFileSync(rawDds);
  const dx10 = buf.toString('latin1', 84, 88) === 'DX10';
  const off = dx10 ? 148 : 128;
  const amask = dx10 ? 0xff000000 : buf.readUInt32LE(104);
  const ch = ({ 0xff: 0, 0xff00: 1, 0xff0000: 2, 0xff000000: 3 } as Record<number, number>)[amask] ?? 3;
  let min = 255, max = 0, extreme = 0, n = 0;
  for (let i = off + ch; i < buf.length; i += 4) {
    const a = buf[i];
    if (a < min) min = a;
    if (a > max) max = a;
    if (a <= 8 || a >= 247) extreme++;
    n++;
  }
  if (min === 255) return { kind: 'none (255)', min, max };
  return { kind: extreme / Math.max(n, 1) > 0.85 ? 'hard mask' : 'soft or gradient', min, max };
}

export type FileResult = { status: 'ok' | 'fail'; note: string };

/**
 * Re-save one specular map as BC5 (red and green kept, no alpha), same size, full mip
 * chain. Decode and encode both with -srgb so texconv applies no gamma change
 * (measured on real mod files: under 1.2/255 average change on red/green).
 */
export async function convertOne(src: string, dst: string, texconv: string, work: string): Promise<FileResult> {
  fs.rmSync(work, { recursive: true, force: true });
  const dec = path.join(work, 'dec');
  const enc = path.join(work, 'enc');
  fs.mkdirSync(dec, { recursive: true });
  fs.mkdirSync(enc, { recursive: true });
  try {
    let r = await run(texconv, ['-nologo', '-y', '-ft', 'dds', '-f', 'R8G8B8A8_UNORM', '-srgb', '-m', '1', '-o', dec, src]);
    const raw = fs.readdirSync(dec).filter((f) => /\.dds$/i.test(f));
    if (!raw.length) return { status: 'fail', note: `decode failed: ${tail(r.out)}` };
    const rawPath = path.join(dec, raw[0]);
    const a = alphaClass(rawPath);
    const alphaNote = `old alpha: ${a.kind} ${a.min}-${a.max}`;
    // encode inside the work folder, never next to the destination: texconv names its
    // output after the input file, and on Windows that could overwrite a same-named source
    r = await run(texconv, ['-nologo', '-y', '-f', 'BC5_UNORM', '-srgb', '-m', '0', '-o', enc, rawPath]);
    const made = fs.readdirSync(enc).filter((f) => /\.dds$/i.test(f));
    if (!made.length) return { status: 'fail', note: `encode failed: ${tail(r.out)}` };
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const tmp = `${dst}.tmp`;
    fs.copyFileSync(path.join(enc, made[0]), tmp);
    fs.renameSync(tmp, dst);
    const o = ddsInfo(dst), s = ddsInfo(src);
    if (!o) return { status: 'fail', note: 'output is not a readable DDS' };
    if (o.format !== 'BC5') return { status: 'fail', note: `output is ${o.format}, not BC5` };
    if (s && (o.width !== s.width || o.height !== s.height)) return { status: 'fail', note: `size changed ${s.width}x${s.height} -> ${o.width}x${o.height}` };
    return { status: 'ok', note: alphaNote };
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// -- job ----------------------------------------------------------------------

type Work = { src: string; rel: string; dst: string };
export type ModResult = { mod: string; out: string; ok: number; failed: number };
export type JobState = {
  running: boolean; cancelled: boolean; phase: string;
  modIndex: number; modCount: number; currentMod: string;
  fileDone: number; fileTotal: number;
  done: number; failed: number;
  results: ModResult[]; notes: string[]; log: string[];
  startedAt: number; finishedAt: number | null; root: string;
};

const README = (mod: string, n: number) => [
  `${mod}${FIX_SUFFIX}`,
  '='.repeat(mod.length + FIX_SUFFIX.length),
  '',
  'Made by Mossy (Textures & Materials > ENB Specular Fix).',
  '',
  `${n} specular maps (_s) of "${mod}" are re-saved here as BC5 like the vanilla game:`,
  'red = specular, green = smoothness, no alpha. ENB Complex Parallax reads its height',
  'from that alpha (only exactly 255 means off), so the old maps made surfaces smear and',
  'stretch. Without an alpha channel the game reads 1.0 = off on every pixel, like every',
  'vanilla texture.',
  '',
  `Install: enable this folder as a mod in Mod Organizer and place it BELOW "${mod}"`,
  'in the left pane, so these files win. The original mod is untouched; disable this one',
  'to go back.',
  '',
  `${LOG_NAME} lists every file and what its old alpha held.`,
  '',
].join('\n');

let job: JobState | null = null;

function pushLog(line: string) {
  if (!job) return;
  job.log.push(line);
  if (job.log.length > 400) job.log.splice(0, job.log.length - 400);
}

async function pool<T>(items: T[], size: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length && job && !job.cancelled) {
      const i = next++;
      await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, worker));
}

async function collectBa2(mod: string, ba2: string, bsarch: string, temp: string, outDir: string, seen: Set<string>, notes: string[]): Promise<Work[]> {
  const name = path.basename(ba2);
  const small = path.join(temp, 'spec_only.ba2');
  const dest = path.join(temp, 'unpacked');
  fs.mkdirSync(dest, { recursive: true });
  pushLog(`${path.basename(mod)}: reading ${name}`);
  let r = await run(bsarch, ['pack', ba2, small, '-fo4dds', '-z', '-f:*_s.dds']);
  if (r.code !== 0 || !fs.existsSync(small)) {
    // An archive with no specular maps at all also lands here; the note says which.
    notes.push(`${path.basename(mod)}: ${name} gave no specular maps (BSArch exit ${r.code}: ${tail(r.out)})`);
    return [];
  }
  r = await run(bsarch, ['unpack', small, dest]);
  try { fs.rmSync(small, { force: true }); } catch { /* temp */ }
  if (r.code !== 0) {
    notes.push(`${path.basename(mod)}: could not unpack the specular maps of ${name} (BSArch exit ${r.code}: ${tail(r.out)})`);
    return [];
  }
  const jobs: Work[] = [];
  for (const p of walk(dest)) {
    if (!isSpecular(p)) continue;
    const rel = path.relative(dest, p);
    if (isTerrain(rel) || seen.has(rel.toLowerCase())) continue; // loose files / earlier archives win, as in game
    seen.add(rel.toLowerCase());
    const info = ddsInfo(p);
    if (info && needsFix(info.format)) jobs.push({ src: p, rel, dst: path.join(outDir, rel) });
  }
  return jobs;
}

async function runJob(root: string, allInside: boolean, includeBa2: boolean, texconv: string, bsarch: string | null) {
  const j = job!;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mossy-enb-spec-'));
  const workers = Math.max(2, Math.min(6, Math.floor(os.cpus().length / 2)));
  try {
    const mods = listModFolders(root, allInside);
    j.modCount = mods.length;
    for (let mi = 0; mi < mods.length && !j.cancelled; mi++) {
      const mod = mods[mi];
      const name = path.basename(mod);
      const outDir = path.join(path.dirname(mod), name + FIX_SUFFIX);
      const temp = path.join(tempRoot, `m${mi}`);
      fs.mkdirSync(temp, { recursive: true });
      j.modIndex = mi + 1; j.currentMod = name; j.phase = 'Reading'; j.fileDone = 0; j.fileTotal = 0;
      try {
        const scan = scanMod(mod);
        const seen = new Set<string>();
        const work: Work[] = [];
        for (const l of scan.loose) {
          seen.add(l.rel.toLowerCase());
          if (needsFix(l.format)) work.push({ src: path.join(mod, l.rel), rel: l.rel, dst: path.join(outDir, l.rel) });
        }
        if (scan.ba2.length && includeBa2) {
          if (!bsarch) j.notes.push(`${name}: ${scan.ba2.length} texture BA2(s) not read -- BSArch not found (it ships with xEdit; set your xEdit path in Settings > External Tools)`);
          else {
            for (let bi = 0; bi < scan.ba2.length && !j.cancelled; bi++) {
              work.push(...await collectBa2(mod, scan.ba2[bi], bsarch, path.join(temp, `a${bi}`), outDir, seen, j.notes));
            }
          }
        }
        if (!work.length) { pushLog(`${name}: nothing to fix`); continue; }
        j.phase = 'Converting'; j.fileTotal = work.length;
        pushLog(`${name}: re-saving ${work.length} specular map(s) as BC5`);
        const lines: string[] = [];
        const res: ModResult = { mod: name, out: outDir, ok: 0, failed: 0 };
        await pool(work, workers, async (w, i) => {
          let r: FileResult;
          try { r = await convertOne(w.src, w.dst, texconv, path.join(temp, 'w', String(i))); }
          catch (e: any) { r = { status: 'fail', note: String(e?.message || e) }; }
          if (r.status === 'ok') { res.ok++; j.done++; }
          else { res.failed++; j.failed++; pushLog(`FAIL ${w.rel}: ${r.note}`); }
          lines.push(`${r.status.toUpperCase().padEnd(4)} ${w.rel}  (${r.note})`);
          j.fileDone++;
        });
        lines.sort((a, b) => a.slice(5).localeCompare(b.slice(5)));
        if (res.ok) {
          fs.writeFileSync(path.join(outDir, LOG_NAME), `ENB specular fix of ${name} -- status, file, what the old alpha held\n${lines.join('\n')}\n`, 'utf-8');
          fs.writeFileSync(path.join(outDir, 'README - ENB Specular Fix.txt'), README(name, res.ok), 'utf-8');
        } else if (lines.length) {
          j.notes.push(...lines.map((l) => `${name}: ${l}`)); // nothing written: no empty fix folder
        }
        j.results.push(res);
        pushLog(`${name}: ${res.ok} fixed, ${res.failed} failed`);
      } catch (e: any) {
        j.notes.push(`${name}: stopped with an error: ${e?.message || e}`);
      } finally {
        fs.rmSync(temp, { recursive: true, force: true });
      }
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    j.running = false;
    j.phase = j.cancelled ? 'Stopped' : 'Finished';
    j.finishedAt = Date.now();
    pushLog(`${j.phase}: ${j.done} re-saved as BC5, ${j.failed} failed`);
  }
}

// -- IPC ----------------------------------------------------------------------

type Register = (channel: string, handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any) => void;

function checkRoot(folder: string, allInside: boolean): string | null {
  if (!folder || !fs.existsSync(folder) || !fs.statSync(folder).isDirectory()) return 'Pick a mod folder first.';
  if (path.basename(folder).endsWith(FIX_SUFFIX)) return 'That folder is a fix output, not a mod.';
  if (!allInside && !looksLikeMod(folder)) {
    const subs = fs.readdirSync(folder, { withFileTypes: true }).filter((e) => e.isDirectory());
    if (subs.some((e) => looksLikeMod(path.join(folder, e.name)))) return 'This looks like a folder of mods -- turn on "Every mod inside this folder".';
    return 'No textures folder or texture BA2 in this folder.';
  }
  return null;
}

/** Test hook: run a whole fix synchronously-awaitable without IPC. */
export async function runFixForTest(folder: string, allInside: boolean, includeBa2: boolean, texconv: string, bsarch: string | null): Promise<JobState> {
  job = {
    running: true, cancelled: false, phase: 'Starting', modIndex: 0, modCount: 0, currentMod: '',
    fileDone: 0, fileTotal: 0, done: 0, failed: 0, results: [], notes: [], log: [],
    startedAt: Date.now(), finishedAt: null, root: folder,
  };
  await runJob(folder, allInside, includeBa2, texconv, bsarch);
  return job;
}

export function registerEnbSpecularFix(registerHandler: Register, deps: {
  getWindow: () => BrowserWindow | null;
  loadSettings: () => any;
  findCkTexconv: () => string | null;
}) {
  const tools = () => findTools(deps.loadSettings() || {}, deps.findCkTexconv());

  registerHandler('enbfix:status', async () => {
    const t = tools();
    return { texconv: t.texconv, bsarch: t.bsarch };
  });

  registerHandler('enbfix:pick-folder', async () => {
    const w = deps.getWindow();
    const opts: Electron.OpenDialogOptions = { properties: ['openDirectory'], title: 'Pick a mod folder, or your Mod Organizer mods folder' };
    const r = w ? await dialog.showOpenDialog(w, opts) : await dialog.showOpenDialog(opts);
    return r.canceled || !r.filePaths[0] ? { success: false } : { success: true, folder: r.filePaths[0] };
  });

  registerHandler('enbfix:scan', async (_e, params: { folder: string; allInside: boolean }) => {
    const err = checkRoot(params?.folder, !!params?.allInside);
    if (err) return { success: false, error: err };
    const rows = [];
    for (const mod of listModFolders(params.folder, !!params.allInside)) {
      const s = scanMod(mod);
      const name = path.basename(mod);
      const fix = s.loose.filter((l) => needsFix(l.format));
      if (!fix.length && !s.ba2.length) continue;
      const formats: Record<string, number> = {};
      for (const l of s.loose) formats[l.format] = (formats[l.format] || 0) + 1;
      const outDir = path.join(path.dirname(mod), name + FIX_SUFFIX);
      const fixExists = fs.existsSync(outDir);
      const covered = fixExists ? fix.filter((l) => ddsInfo(path.join(outDir, l.rel))?.format === 'BC5').length : 0;
      rows.push({ mod: name, path: mod, looseSpecular: s.loose.length, toFix: fix.length, formats, ba2: s.ba2.map((b) => path.basename(b)), fixExists, covered });
    }
    return { success: true, rows };
  });

  registerHandler('enbfix:start', async (_e, params: { folder: string; allInside: boolean; includeBa2: boolean }) => {
    if (job?.running) return { success: false, error: 'A fix is already running.' };
    const err = checkRoot(params?.folder, !!params?.allInside);
    if (err) return { success: false, error: err };
    const t = tools();
    if (!t.texconv) return { success: false, error: 'texconv.exe not found. Set your Fallout 4 folder (the Creation Kit installs Tools\\Elric\\texconv.exe) or your xEdit path (Edit Scripts\\Texconv.exe) in Settings > External Tools.' };
    job = {
      running: true, cancelled: false, phase: 'Starting', modIndex: 0, modCount: 0, currentMod: '',
      fileDone: 0, fileTotal: 0, done: 0, failed: 0, results: [], notes: [], log: [],
      startedAt: Date.now(), finishedAt: null, root: params.folder,
    };
    runJob(params.folder, !!params.allInside, params.includeBa2 !== false, t.texconv, t.bsarch)
      .catch((e) => { if (job) { job.notes.push(`Stopped with an error: ${e?.message || e}`); job.running = false; job.phase = 'Failed'; } });
    return { success: true };
  });

  registerHandler('enbfix:job-status', async () => job);

  registerHandler('enbfix:cancel', async () => {
    if (!job?.running) return { success: false, error: 'Nothing is running.' };
    job.cancelled = true;
    for (const c of active) { try { c.kill(); } catch { /* already gone */ } }
    return { success: true };
  });

  registerHandler('enbfix:open-folder', async (_e, params: { folder: string }) => {
    if (!params?.folder || !fs.existsSync(params.folder)) return { success: false, error: 'Folder not found.' };
    const err = await shell.openPath(params.folder);
    return err ? { success: false, error: err } : { success: true };
  });
}
