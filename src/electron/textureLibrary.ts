/**
 * Texture library -- the user's own texture folders (photo libraries, their own mods), scanned and sorted by
 * what may be SHIPPED. Added 2026-11-20 for AI Image Studio's Edit / Seamless tabs (start from a real photo,
 * let the AI change it).
 *
 * Licence classes (evidence-based, never guessed upward):
 *   cc0     -- safe to ship: ambientCG (CC0) or Poly Haven (CC0) by their exact file-naming schemes, or a licence /
 *              readme file next to the set that says CC0 / Creative Commons Zero / public domain.
 *   vanilla -- inside a folder the user marked "Fallout 4 game files" (the unpacked game). Edited game textures
 *              are what Fallout 4 retexture mods normally ship; never for use outside Fallout 4 mods.
 *   own     -- inside a folder the user marked "my own work" (their own mod). Their call -- but anything in it
 *              copied from the game or another mod still can't be redistributed; the UI says so.
 *   check   -- a known source with its own terms (Textures.com, Quixel/Megascans, Poliigon, Freepik-style
 *              "License free/premium.txt", DeviantArt-style "Terms of Use", any licence file that is not CC0):
 *              fine for personal use, read the terms before a release.
 *   game    -- only Fallout 4 format files (.dds/.bgsm/.bgem) in a folder that is not marked as own work: if
 *              they came from the game or another mod they can't be redistributed.
 *   unknown -- no evidence either way: treated as NOT safe to ship.
 * DDS colour maps (_d or no suffix) are shown and used through texconv (DDS -> PNG into a temp cache).
 * Nothing in a library folder is ever written, moved or deleted. The manifest lives in userData.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFile } from 'child_process';
import sharp from 'sharp';

type Register = (channel: string, handler: (event: any, ...args: any[]) => any) => void;
export type LicenceClass = 'cc0' | 'vanilla' | 'own' | 'check' | 'game' | 'unknown';

interface LibRoot { path: string; own: boolean; game?: boolean }   // game: the unpacked Fallout 4 game itself
interface LibImage { name: string; bytes: number }
interface LibSet {
  root: string;           // which library folder
  rel: string;            // folder relative to that root
  category: string;       // "<root name> / <top folder>"
  licence: LicenceClass;
  evidence: string;
  images: LibImage[];     // colour images only (normal/roughness/specular/... maps are left out of the picker)
  gameFiles: number;      // .bgsm/.bgem and non-colour .dds in the folder
}
interface Manifest { roots: LibRoot[]; scannedAt: string; sets: LibSet[]; licenceFiles: string[] }

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.bmp', '.dds']);
const GAME_ONLY_EXT = new Set(['.bgsm', '.bgem']);
// Maps that are not a colour image -- excluded from the picker (they stay part of the set on disk).
const NON_COLOUR = /(?:^|[_\-. ])(normal|normalgl|normaldx|nor_gl|nor_dx|nrm|nor|rough|roughness|rgh|metal|metallic|metalness|ao|ambientocclusion|occlusion|disp|displacement|height|bump|spec|specular|gloss|glossiness|opacity|mask|arm|cavity|translucency|refl|reflection)(?:[_\-. ]|\d|$)/i;
// Fallout 4 texture suffixes that are not colour: _n normal, _s specular, _g glow, _p parallax, _e/_em env mask,
// _m mask, _l lighting, _r reflection
const FO4_NON_COLOUR = /_(n|s|g|p|e|em|m|l|r|msn)$/i;
const AMBIENTCG = /^[A-Za-z]+\d{3}[A-Z]?_(?:1|2|4|8|12|16)K[_-]/;
const POLYHAVEN = /_(?:diff|nor_gl|nor_dx|rough|arm|disp|ao|spec|bump|translucent|mask)_(?:1|2|4|8|16)k\.(?:jpg|png|exr|tif)$/i;
const CHECK_SOURCES: [RegExp, string][] = [
  [/textures\.com|cgtextures/i, 'Textures.com'],
  [/megascans|quixel/i, 'Quixel/Megascans'],
  [/poliigon/i, 'Poliigon'],
];

let manifestPath = '';
let manifest: Manifest | null = null;
let texconvFinder: () => string | null = () => null;

function load(): Manifest | null {
  if (manifest || !manifestPath) return manifest;
  try {
    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    // v1 manifests had a single `root`
    if (m && !m.roots && m.root) { m.roots = [{ path: m.root, own: false }]; for (const s of m.sets || []) s.root = s.root || m.root; }
    manifest = m;
  } catch { manifest = null; }
  return manifest;
}
function rootOf(p: string): string | null {
  const m = load();
  if (!m || !p) return null;
  const abs = path.resolve(p);
  for (const r of m.roots) {
    const rel = path.relative(r.path, abs);
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return r.path;
  }
  return null;
}

const ddsCacheDir = () => path.join(os.tmpdir(), 'mossy-texture-library-dds');

/** DDS -> PNG through texconv, cached by path + size + mtime. */
async function ddsToPng(p: string): Promise<Buffer> {
  const texconv = texconvFinder();
  if (!texconv) throw new Error('DDS textures need texconv. Set your Fallout 4 / Creation Kit folder in Settings (the Creation Kit installs texconv in Tools\\Elric).');
  const st = fs.statSync(p);
  const key = crypto.createHash('sha1').update(`${path.resolve(p)}|${st.size}|${st.mtimeMs}`).digest('hex');
  const dir = path.join(ddsCacheDir(), key);
  const out = path.join(dir, path.basename(p, path.extname(p)) + '.png');
  if (fs.existsSync(out)) return fs.readFileSync(out);
  // No -y: the Creation Kit's own (older) texconv doesn't know it and only prints its usage text (found
  // 2026-11-20 with Tools\Elric\texconv.exe). Start from an empty folder instead so nothing needs overwriting.
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    execFile(texconv, ['-nologo', '-ft', 'png', '-o', dir, p], { timeout: 120000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error(`texconv could not read ${path.basename(p)}: ${String(stderr || stdout || err.message).slice(0, 200)}`));
      else resolve();
    });
  });
  const made = fs.readdirSync(dir).find(f => f.toLowerCase().endsWith('.png'));
  if (!made) throw new Error(`texconv produced no image for ${path.basename(p)}.`);
  if (path.join(dir, made) !== out) fs.renameSync(path.join(dir, made), out);
  return fs.readFileSync(out);
}

async function imageBytes(p: string): Promise<Buffer> {
  return path.extname(p).toLowerCase() === '.dds' ? ddsToPng(p) : fs.promises.readFile(p);
}

/** Reads a library file (DDS converted to PNG) for the edit/seamless handlers. The path must be inside a library folder. */
export async function readLibraryFile(p: string): Promise<Buffer> {
  if (!rootOf(p)) throw new Error('Not inside a scanned texture library folder.');
  return imageBytes(p);
}

/** Licence class of the set a library file belongs to, or null if it isn't in a scanned library folder. */
export function licenceOf(p: string): { licence: LicenceClass; evidence: string } | null {
  const m = load();
  const root = rootOf(p);
  if (!m || !root) return null;
  const rel = path.relative(root, path.dirname(path.resolve(p))) || '.';
  const s = m.sets.find(x => x.root === root && x.rel === rel);
  return s ? { licence: s.licence, evidence: s.evidence } : null;
}

export function registerTextureLibraryHandlers(registerHandler: Register, deps: {
  userDataDir: string; downloadsDir: string; findTexconv: () => string | null;
}): void {
  manifestPath = path.join(deps.userDataDir, 'texture-library.json');
  texconvFinder = deps.findTexconv;
  const thumbs = new Map<string, string>();

  const save = (m: Manifest) => { manifest = m; fs.writeFileSync(manifestPath, JSON.stringify(m)); };
  const summary = (m: Manifest) => {
    const counts: Record<LicenceClass, number> = { cc0: 0, vanilla: 0, own: 0, check: 0, game: 0, unknown: 0 };
    const images: Record<LicenceClass, number> = { cc0: 0, vanilla: 0, own: 0, check: 0, game: 0, unknown: 0 };
    for (const s of m.sets) { counts[s.licence]++; images[s.licence] += s.images.length; }
    return { counts, images };
  };

  registerHandler('textures:library-status', async () => {
    const m = load();
    if (!m) return { scanned: false, roots: [], texconv: !!texconvFinder() };
    const categories = [...new Set(m.sets.map(s => s.category))].sort((a, b) => a.localeCompare(b));
    return { scanned: m.sets.length > 0, roots: m.roots, scannedAt: m.scannedAt, sets: m.sets.length, ...summary(m), categories, texconv: !!texconvFinder() };
  });

  /** Set the list of library folders (each { path, own }), then scan them all. */
  registerHandler('textures:library-scan', async (event, p: { roots: LibRoot[] }) => {
    const roots: LibRoot[] = [];
    for (const r of p?.roots || []) {
      const abs = path.resolve(String(r?.path || '').trim());
      if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return { success: false, error: `Folder not found: ${r?.path}` };
      if (!roots.some(x => x.path.toLowerCase() === abs.toLowerCase())) roots.push({ path: abs, own: !r.game && !!r.own, game: !!r.game });
    }
    if (!roots.length) return { success: false, error: 'Add at least one texture folder first.' };
    const t0 = Date.now();
    const sets: LibSet[] = [];
    const licenceFiles: string[] = [];
    let folders = 0, files = 0;

    for (const root of roots) {
      const rootName = path.basename(root.path) || root.path;
      const walk = async (dir: string, inherited: { cls: 'cc0' | 'other'; file: string } | null) => {
        let entries: fs.Dirent[];
        try { entries = await fs.promises.readdir(dir, { withFileTypes: true }); } catch { return; }
        folders++;
        let lic = inherited;
        for (const e of entries) {
          if (!e.isFile()) continue;
          if (/licen[cs]e|readme|terms|eula|copyright/i.test(e.name) && /\.(txt|md|html?)$/i.test(e.name)) {
            const fp = path.join(dir, e.name);
            licenceFiles.push(fp);
            try {
              const txt = (await fs.promises.readFile(fp, 'utf-8')).slice(0, 20000);
              const cls = /\bCC0\b|creative\s+commons\s+zero|public\s+domain/i.test(txt) ? 'cc0' : 'other';
              if (!lic || cls === 'other' || lic.cls === 'cc0') lic = { cls, file: path.relative(root.path, fp) };
            } catch { /* unreadable licence file */ }
          }
        }
        const images: LibImage[] = [];
        let gameFiles = 0, acg = 0, ph = 0;
        const checkHits = new Set<string>();
        for (const e of entries) {
          if (!e.isFile()) continue;
          files++;
          const ext = path.extname(e.name).toLowerCase();
          const full = path.join(dir, e.name);
          if (GAME_ONLY_EXT.has(ext)) { gameFiles++; continue; }
          if (!IMG_EXT.has(ext)) continue;
          const stem = path.basename(e.name, path.extname(e.name));
          if (ext === '.dds' && FO4_NON_COLOUR.test(stem)) { gameFiles++; continue; }
          if (AMBIENTCG.test(e.name)) acg++;
          if (POLYHAVEN.test(e.name)) ph++;
          for (const [rx, label] of CHECK_SOURCES) if (rx.test(e.name) || rx.test(full)) checkHits.add(label);
          if (NON_COLOUR.test(stem)) continue;
          let bytes = 0;
          try { bytes = (await fs.promises.stat(full)).size; } catch { /* skip */ }
          images.push({ name: e.name, bytes });
        }
        if (images.length || gameFiles) {
          const rel = path.relative(root.path, dir) || '.';
          const category = `${rootName} / ${rel === '.' ? '(top level)' : rel.split(path.sep)[0]}`;
          let licence: LicenceClass = 'unknown';
          let evidence = 'No licence file and no known source naming';
          if (root.game) { licence = 'vanilla'; evidence = `Fallout 4 game texture (in "${rootName}")`; }
          else if (lic?.cls === 'other') { licence = 'check'; evidence = `Licence file: ${lic.file}`; }
          else if (checkHits.size) { licence = 'check'; evidence = `Source: ${[...checkHits].join(', ')}`; }
          else if (lic?.cls === 'cc0') { licence = 'cc0'; evidence = `Licence file says CC0: ${lic.file}`; }
          else if (acg && acg >= images.length / 2) { licence = 'cc0'; evidence = 'ambientCG file naming (ambientCG is CC0)'; }
          else if (ph && ph >= images.length / 2) { licence = 'cc0'; evidence = 'Poly Haven file naming (Poly Haven is CC0)'; }
          else if (root.own) { licence = 'own'; evidence = `In "${rootName}", marked as your own work`; }
          else if (!images.length && gameFiles) { licence = 'game'; evidence = 'Fallout 4 format files only (.dds/.bgsm)'; }
          sets.push({ root: root.path, rel, category, licence, evidence, images, gameFiles });
        }
        for (const e of entries) if (e.isDirectory() && !e.name.startsWith('.')) await walk(path.join(dir, e.name), lic);
        if (folders % 200 === 0) { try { event?.sender?.send('textures:library-scan-progress', { folders, files }); } catch { /* noop */ } }
      };
      await walk(root.path, null);
    }
    sets.sort((a, b) => (a.root + a.rel).localeCompare(b.root + b.rel));
    const m: Manifest = { roots, scannedAt: new Date().toISOString(), sets, licenceFiles };
    save(m);
    thumbs.clear();
    return { success: true, roots, folders, files, sets: sets.length, ...summary(m), seconds: Math.round((Date.now() - t0) / 1000) };
  });

  registerHandler('textures:library-list', async (_e, p: { licences?: LicenceClass[]; category?: string; query?: string; offset?: number; limit?: number }) => {
    const m = load();
    if (!m) return { success: false, error: 'No texture folder has been scanned yet.' };
    const allow = new Set(p?.licences?.length ? p.licences : ['cc0']);
    const q = String(p?.query || '').trim().toLowerCase();
    const items: { path: string; name: string; set: string; category: string; licence: LicenceClass; evidence: string; bytes: number }[] = [];
    for (const s of m.sets) {
      if (!allow.has(s.licence)) continue;
      if (p?.category && s.category !== p.category) continue;
      for (const im of s.images) {
        if (q && !(`${s.category} ${s.rel} ${im.name}`.toLowerCase().includes(q))) continue;
        items.push({ path: path.join(s.root, s.rel, im.name), name: im.name, set: s.rel, category: s.category, licence: s.licence, evidence: s.evidence, bytes: im.bytes });
      }
    }
    const offset = Math.max(0, p?.offset || 0), limit = Math.min(200, Math.max(1, p?.limit || 48));
    return { success: true, total: items.length, items: items.slice(offset, offset + limit) };
  });

  registerHandler('textures:library-thumb', async (_e, p: { path: string }) => {
    if (!rootOf(p?.path)) return { success: false, error: 'Not inside a scanned texture library folder.' };
    const hit = thumbs.get(p.path);
    if (hit) return { success: true, dataUrl: hit };
    try {
      const buf = await sharp(await imageBytes(p.path), { limitInputPixels: false }).rotate().removeAlpha().resize(192, 192, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
      const url = `data:image/jpeg;base64,${buf.toString('base64')}`;
      if (thumbs.size > 2000) thumbs.clear();
      thumbs.set(p.path, url);
      return { success: true, dataUrl: url };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  });

  /** Preview for the Studio (max 1024 px) plus the original size; the full file is read by the edit handlers. */
  registerHandler('textures:library-preview', async (_e, p: { path: string }) => {
    if (!rootOf(p?.path)) return { success: false, error: 'Not inside a scanned texture library folder.' };
    try {
      const bytes = await imageBytes(p.path);
      const meta = await sharp(bytes, { limitInputPixels: false }).metadata();
      const buf = await sharp(bytes, { limitInputPixels: false }).rotate().removeAlpha().resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 88 }).toBuffer();
      return { success: true, dataUrl: `data:image/jpeg;base64,${buf.toString('base64')}`, width: meta.width, height: meta.height };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  });

  /** Writes the "not for shipping" list (everything that is not CC0, own work or Fallout 4 game files) as CSV into Downloads. */
  registerHandler('textures:library-export-not-shippable', async () => {
    const m = load();
    if (!m) return { success: false, error: 'No texture folder has been scanned yet.' };
    const rows = ['licence,folder,colour_images,other_texture_files,reason'];
    let n = 0;
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    for (const s of m.sets) {
      if (s.licence === 'cc0' || s.licence === 'own' || s.licence === 'vanilla') continue;
      n++;
      rows.push([s.licence, q(path.join(s.root, s.rel)), s.images.length, s.gameFiles, q(s.evidence)].join(','));
    }
    const out = path.join(deps.downloadsDir || deps.userDataDir, `Texture library - not for shipping ${new Date().toISOString().slice(0, 10)}.csv`);
    fs.writeFileSync(out, '\ufeff' + rows.join('\r\n'), 'utf-8');
    return { success: true, path: out, sets: n };
  });
}
