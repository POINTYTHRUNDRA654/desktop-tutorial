
import http from 'http';
import crypto from 'crypto';
import { exec, spawn } from 'child_process';
import net from 'net';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { clipboard, nativeImage, screen, app } from 'electron';
import AdmZip from 'adm-zip';
import { extractFormIDs } from './espParser';

/**
 * Result of reading CKPE's (Creation Kit Platform Extended) log for real
 * per-cell precombine-ownership conflicts. CKPE is a third-party community
 * tool, not part of vanilla Creation Kit or bundled with Mossy — a user may
 * not have it installed, or may have its file logging (sOutputFile) turned
 * off in their own CreationKitPlatformExtended.toml. Every state is
 * distinguished explicitly rather than collapsing "never checked" and
 * "checked, found nothing" into the same shape — that collapse is exactly
 * what made the old check_previs_status fabrication (a hardcoded "no
 * conflicts detected" with no real check behind it) possible in the first
 * place, and CKPE's log format is unofficial/unversioned, so a future CKPE
 * update changing it must surface as "couldn't be parsed," never as a
 * silent, confident zero-conflict result.
 */
export type CKPEPrecombineStatus =
    | { detected: false; reason: string }
    | { detected: true; parsed: false; logPath: string; reason: string }
    | {
          detected: true;
          parsed: true;
          logPath: string;
          logMTime: string;
          sessionTimestamp: string | null;
          activePlugin: string | null;
          conflictCount: number;
          conflicts: Array<{ cell: string; cellFormId: string; ownerFile: string; refName: string; refFormId: string }>;
          // Raw message text (tag prefix stripped) from CKPE's [SCRIPTS] / [ANIMATION] /
          // [FORMS] sections — orphaned/deleted script refs, missing animation events,
          // invalid property references. Not restructured into typed fields the way
          // conflicts is: real-world lines vary too much in shape across these three
          // tags to parse honestly into fixed fields without guessing at some of them.
          // Captured as-written instead — still traces to an actual line, never synthesized.
          scriptWarnings: string[];
          animationWarnings: string[];
          formWarnings: string[];
      };

/**
 * Result of watching CKPE's own crash-dump folder (Logs\CKPE\Crashes under the
 * FO4 install) for new CreationKit.exe crashes. This is deliberately NOT
 * %LOCALAPPDATA%\CrashDumps or Windows' WER ReportQueue/ReportArchive — checked
 * directly against a real machine (2026-08-18) and found empty/nonexistent for
 * CreationKit.exe; standard per-process WER dump collection isn't registered for
 * it here. CKPE's Crashes folder is its own crash handler's output and is the
 * only source confirmed to have real, historical CreationKit.exe dumps on a
 * real system. Reading the dump's actual stack trace still needs WinDbg
 * (`!analyze -v`) — this only detects that a crash happened and when, so the
 * next one doesn't require a manual folder dig to even notice.
 */
export type CKCrashStatus =
    | { detected: false; reason: string }
    | { detected: true; listed: false; crashDir: string; reason: string }
    | {
          detected: true;
          listed: true;
          crashDir: string;
          crashCount: number;
          mostRecent: { fileName: string; mtime: string } | null;
          // Capped list, newest first — mirrors the conflicts cap above.
          dumps: Array<{ fileName: string; mtime: string; sizeBytes: number }>;
      };

/**
 * Mossy Bridge Server
 * Loopback-only HTTP server (127.0.0.1) providing screen/clipboard/hardware
 * access, file operations, and the Blender relay to the renderer process.
 *
 * SECURITY: every request (except CORS preflight) must carry a valid
 * X-Mossy-Token header, checked with a timing-safe comparison against
 * bridgeAuthToken in settings.json. Before this existed, this server had
 * zero authentication and Access-Control-Allow-Origin: '*' — since it's
 * bound to loopback but reachable by ANY page a user has open in ANY
 * browser tab (loopback binding restricts by network interface, not by
 * origin), that meant any website could silently screenshot the desktop,
 * read the clipboard, or (via a since-removed `/execute` type:'shell'
 * branch that called Node's exec() directly) run arbitrary OS commands —
 * all with zero user interaction beyond having the tab open while Mossy
 * ran. CORS headers do NOT protect against this on their own: they gate
 * whether the calling page's JS can read the response, not whether the
 * request is sent or its server-side effect happens — a same-origin CORS
 * policy does not stop a simple cross-origin POST from executing here. The
 * token is the actual fix; CORS stays permissive only because the token
 * check already closes the hole regardless of what Access-Control-Allow-
 * Origin says.
 */
export class BridgeServer {
    private server: http.Server | null = null;
    private port: number;
    private addonPort: number;
    private pythonPath: string = '';
    private _fileWatcher: fs.FSWatcher | null = null;
    private _watchedRoot: string = '';
    private _pendingFileChanges = new Map<string, number>(); // absolute path -> last-seen mtime (ms)
    private _ckpeLogWatcher: fs.FSWatcher | null = null;
    private _ckpeLogWatchedDir: string = '';
    private _ckpeLogCache: { path: string; mtimeMs: number; result: CKPEPrecombineStatus } | null = null;
    private _ckCrashWatcher: fs.FSWatcher | null = null;
    private _ckCrashWatchedDir: string = '';
    private _ckCrashCache: { dirSignature: string; result: CKCrashStatus } | null = null;
    private _optimizeJobs = new Map<string, {
        status: 'processing' | 'complete' | 'error';
        progress: number;
        filesProcessed: number;
        totalFiles: number;
        savedSpace: string;
        details: string[];
    }>();

    constructor(addonPort: number = 9999, port: number = 21337) {
        this.addonPort = addonPort;
        // REVERTED (2026-08-14, same day as the auth fix): briefly changed this
        // to 0 (OS-assigned ephemeral) as defense-in-depth alongside the token
        // fix. That broke a live integration — the released Blender add-on
        // (mossy_link.py, POINTYTHRUNDRA654/Blender-add-on.) pushes scene
        // context to a hardcoded 21337 (push_blender_context() ->
        // POST http://localhost:21337/blender_context), and has an install
        // base that can't be asked to reconfigure. The token is what actually
        // secures this endpoint (see class-level SECURITY comment) —
        // discoverability of the port was worth very little on its own, and
        // not worth breaking a shipped integration for. Fixed port + token is
        // both secure and compatible.
        this.port = port;
    }

    /** The real bound port. Fixed at 21337 by default (see constructor) —
     *  only meaningfully "pending" before start()'s listen callback fires if
     *  a caller ever passes port=0 explicitly. */
    getPort(): number {
        return this.port;
    }

    /** Set the Python executable to use for package installs. */
    setPythonPath(exePath: string): void {
        this.pythonPath = exePath;
        console.log('[Bridge] Python path configured:', exePath);
    }

    /** Read the same settings.json main.ts's loadSettings() writes to (read-only, no defaults/migration needed here). */
    private _readSettings(): Record<string, unknown> {
        try {
            const settingsPath = path.join(app.getPath('userData'), 'settings.json');
            return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        } catch {
            return {};
        }
    }

    /**
     * Parse a real CKPE session log for precombine-ownership conflicts.
     * Confirmed real-world format (read directly from an actual user's
     * CreationKitPlatformExtended.log, 2026-08):
     *   Hi, I'm CKPE! Now: Thursday 13 Aug 2026 01:08:43 PM Pacific Daylight Time
     *   Load active file SomeMod.esp...
     *   [MASTERFILE] *** Cell CambridgePolymerLabs01 (000560EE) combined data is
     *   owned by file Fallout 4 Moss AIO Glowing Sea Now Glows Redux.esp due to
     *   ref deadshrubGS03 (000B3D58)
     * This fires on ordinary plugin load, not only after an explicit
     * -GeneratePreCombined run, so it's real diagnostic signal on every session.
     *
     * Unofficial format, no version guarantee — wrapped so a future CKPE
     * update that changes this shape degrades to "couldn't be parsed"
     * (parsed: false) rather than crashing or, worse, returning a confident
     * conflictCount: 0 that isn't actually true.
     */
    private _parseCKPELog(logPath: string, mtimeMs: number): CKPEPrecombineStatus {
        let raw: string;
        try {
            raw = fs.readFileSync(logPath, 'utf-8');
        } catch (e: any) {
            return { detected: true, parsed: false, logPath, reason: `Found the CKPE log but could not read it: ${e?.message || e}` };
        }

        try {
            const lines = raw.split(/\r?\n/);

            const sessionLine = lines.find((l) => l.includes("Hi, I'm CKPE!"));
            const sessionMatch = sessionLine?.match(/Now:\s*(.+)$/);
            const sessionTimestamp = sessionMatch ? sessionMatch[1].trim() : null;

            const activeLine = lines.find((l) => l.includes('Load active file'));
            const activeMatch = activeLine?.match(/Load active file (.+?)\.\.\.\s*$/);
            const activePlugin = activeMatch ? activeMatch[1].trim() : null;

            const OWNERSHIP_RE = /^\[MASTERFILE\] \*\*\* Cell (.+?) \(([0-9A-Fa-f]{8})\) combined data is owned by file (.+?) due to ref (.+?) \(([0-9A-Fa-f]{8})\)\s*$/;
            const conflicts: Array<{ cell: string; cellFormId: string; ownerFile: string; refName: string; refFormId: string }> = [];
            const scriptWarnings: string[] = [];
            const animationWarnings: string[] = [];
            const formWarnings: string[] = [];
            const MAX_WARNINGS_PER_TAG = 200;
            let masterfileTagSeen = false;
            for (const line of lines) {
                if (line.startsWith('[MASTERFILE]')) {
                    masterfileTagSeen = true;
                    const m = line.match(OWNERSHIP_RE);
                    if (m) conflicts.push({ cell: m[1], cellFormId: m[2], ownerFile: m[3], refName: m[4], refFormId: m[5] });
                } else if (line.startsWith('[SCRIPTS]')) {
                    if (scriptWarnings.length < MAX_WARNINGS_PER_TAG) scriptWarnings.push(line.slice('[SCRIPTS]'.length).trim());
                } else if (line.startsWith('[ANIMATION]')) {
                    if (animationWarnings.length < MAX_WARNINGS_PER_TAG) animationWarnings.push(line.slice('[ANIMATION]'.length).trim());
                } else if (line.startsWith('[FORMS]')) {
                    if (formWarnings.length < MAX_WARNINGS_PER_TAG) formWarnings.push(line.slice('[FORMS]'.length).trim());
                }
            }

            // Structural sanity check before trusting a zero-conflict result. A
            // log with real content but no recognizable [MASTERFILE] section at
            // all means the format has drifted from what this parser knows —
            // report that honestly instead of a silent "0 conflicts".
            if (!masterfileTagSeen && lines.length > 5) {
                return {
                    detected: true,
                    parsed: false,
                    logPath,
                    reason: "Found the CKPE log, but its format doesn't match what Mossy knows how to read (no [MASTERFILE] section found) — likely a CKPE update changed the log format. This can't be diagnosed automatically until Mossy's parser is updated for the new format.",
                };
            }

            return {
                detected: true,
                parsed: true,
                logPath,
                logMTime: new Date(mtimeMs).toISOString(),
                sessionTimestamp,
                activePlugin,
                conflictCount: conflicts.length,
                // Cap the payload; conflictCount above still reflects the real total.
                conflicts: conflicts.slice(0, 200),
                scriptWarnings,
                animationWarnings,
                formWarnings,
            };
        } catch (e: any) {
            return { detected: true, parsed: false, logPath, reason: `Found the CKPE log but couldn't parse it: ${e?.message || e}` };
        }
    }

    /**
     * Resolve fallout4Path from settings, confirm CKPE is actually present
     * (not assumed), and return its current precombine-ownership diagnosis.
     * Cached against the log's own mtime — re-parses only when CKPE has
     * actually written something new, watching the FO4 install root (where
     * ckpe.log lives) the same way /files/watch above watches an arbitrary
     * directory, just scoped to this one known location instead of a
     * client-supplied path.
     */
    private _getCKPEPrecombineStatus(): CKPEPrecombineStatus {
        const fallout4Path = String(this._readSettings()?.fallout4Path || '').trim();
        if (!fallout4Path) {
            return { detected: false, reason: 'Fallout 4 install path is not configured in Mossy Settings, so Mossy cannot look for a CKPE log yet.' };
        }

        // Verified against a real installed CKPE (2026-08-18): the [MASTERFILE]
        // per-cell precombine-ownership lines this parser reads live in the ROOT
        // ckpe.log (fallout4Path\ckpe.log, controlled by CKPE's own [Log]
        // sOutputFile setting) — NOT in Logs\CKPE\CreationKitPlatformExtended.log,
        // which turned out to be a completely different log (CKPE's own patch-
        // loader/DirectX-init diagnostics, no [MASTERFILE] section at all). Live
        // testing against the real file caught this; the two logs share a
        // misleading "duplicate my entries" header comment that made them look
        // like copies of each other during earlier code-only review — they
        // aren't. Logs\CKPE\...log is still checked as a secondary signal: its
        // presence means CKPE itself is genuinely running even when the root
        // ckpe.log (an optional, togglable duplicate) is absent, which lets the
        // "not installed" and "installed but not logging to file" cases stay
        // distinct instead of collapsing into one generic "not detected".
        const logDir = path.join(fallout4Path, 'Logs', 'CKPE');
        const ckpeRunning = fs.existsSync(path.join(logDir, 'CreationKitPlatformExtended.log'));
        const logPath = path.join(fallout4Path, 'ckpe.log');

        if (!fs.existsSync(logPath)) {
            const reason = ckpeRunning
                ? 'CKPE is installed, but its ckpe.log file output is disabled — this diagnosis needs it enabled. In Fallout 4\'s CreationKitPlatformExtended.toml, under [Log], set sOutputFile to a filename (e.g. \'ckpe.log\') and re-open Creation Kit once.'
                : 'CKPE (Creation Kit Platform Extended) not detected — this diagnosis needs it. CKPE is a separate, widely-used community tool; without it, Mossy has no real source for precombine-ownership data and won\'t guess.';
            return { detected: false, reason };
        }

        if (this._ckpeLogWatchedDir !== fallout4Path) {
            try { this._ckpeLogWatcher?.close(); } catch { /* ignore */ }
            try {
                this._ckpeLogWatcher = fs.watch(fallout4Path, (_eventType, filename) => {
                    if (filename && filename.toString() !== 'ckpe.log') return;
                    this._ckpeLogCache = null; // invalidate; next request re-parses
                });
                this._ckpeLogWatcher.on('error', (err) => {
                    console.error('[Bridge] CKPE log watcher error:', err);
                });
                this._ckpeLogWatchedDir = fallout4Path;
            } catch (e) {
                console.warn('[Bridge] Could not watch CKPE log directory (will still poll on request):', e);
            }
        }

        let mtimeMs: number;
        try {
            mtimeMs = fs.statSync(logPath).mtimeMs;
        } catch (e: any) {
            return { detected: true, parsed: false, logPath, reason: `CKPE log was detected but disappeared before it could be read: ${e?.message || e}` };
        }

        if (this._ckpeLogCache && this._ckpeLogCache.path === logPath && this._ckpeLogCache.mtimeMs === mtimeMs) {
            return this._ckpeLogCache.result;
        }

        const result = this._parseCKPELog(logPath, mtimeMs);
        this._ckpeLogCache = { path: logPath, mtimeMs, result };
        return result;
    }

    /**
     * Watch CKPE's own crash-dump folder for new CreationKit.exe crashes.
     * See CKCrashStatus's doc comment for why this targets Logs\CKPE\Crashes
     * specifically rather than %LOCALAPPDATA%\CrashDumps or WER.
     */
    private _getCKCrashStatus(): CKCrashStatus {
        const fallout4Path = String(this._readSettings()?.fallout4Path || '').trim();
        if (!fallout4Path) {
            return { detected: false, reason: 'Fallout 4 install path is not configured in Mossy Settings, so Mossy cannot look for CKPE crash dumps yet.' };
        }

        const crashDir = path.join(fallout4Path, 'Logs', 'CKPE', 'Crashes');
        if (!fs.existsSync(crashDir)) {
            return {
                detected: false,
                reason: 'No CKPE crash folder found (Logs\\CKPE\\Crashes) — either CKPE is not installed, or Creation Kit has never crashed since CKPE was set up.',
            };
        }

        if (this._ckCrashWatchedDir !== crashDir) {
            try { this._ckCrashWatcher?.close(); } catch { /* ignore */ }
            try {
                this._ckCrashWatcher = fs.watch(crashDir, () => {
                    this._ckCrashCache = null; // invalidate; next request re-lists
                });
                this._ckCrashWatcher.on('error', (err) => {
                    console.error('[Bridge] CKPE crash watcher error:', err);
                });
                this._ckCrashWatchedDir = crashDir;
            } catch (e) {
                console.warn('[Bridge] Could not watch CKPE crash directory (will still poll on request):', e);
            }
        }

        if (this._ckCrashCache) return this._ckCrashCache.result;

        try {
            const entries = fs.readdirSync(crashDir, { withFileTypes: true })
                .filter((e) => e.isFile() && /^CreationKit\.exe_.*\.(dmp|zip)$/i.test(e.name))
                .map((e) => {
                    const st = fs.statSync(path.join(crashDir, e.name));
                    return { fileName: e.name, mtime: st.mtimeMs, sizeBytes: st.size };
                })
                .sort((a, b) => b.mtime - a.mtime);

            const result: CKCrashStatus = {
                detected: true,
                listed: true,
                crashDir,
                crashCount: entries.length,
                mostRecent: entries.length > 0 ? { fileName: entries[0].fileName, mtime: new Date(entries[0].mtime).toISOString() } : null,
                dumps: entries.slice(0, 50).map((e) => ({ fileName: e.fileName, mtime: new Date(e.mtime).toISOString(), sizeBytes: e.sizeBytes })),
            };
            this._ckCrashCache = { dirSignature: `${entries.length}:${entries[0]?.mtime ?? 0}`, result };
            return result;
        } catch (e: any) {
            return { detected: true, listed: false, crashDir, reason: `Found the CKPE crash folder but couldn't list it: ${e?.message || e}` };
        }
    }

    /** Spawn an external tool and capture its output — same shape as main.ts's runProcessCapture. */
    private _runProcess(cmd: string, args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): Promise<{ exitCode: number; stdout: string; stderr: string }> {
        return new Promise((resolve) => {
            let child: ReturnType<typeof spawn>;
            try {
                child = spawn(cmd, args, { cwd: opts.cwd, windowsHide: true });
            } catch (e: any) {
                resolve({ exitCode: 1, stdout: '', stderr: String(e?.message || e) });
                return;
            }
            let stdout = '';
            let stderr = '';
            const timer = opts.timeoutMs
                ? setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, opts.timeoutMs)
                : null;
            child.stdout?.on('data', (d) => { stdout += d.toString(); });
            child.stderr?.on('data', (d) => { stderr += d.toString(); });
            child.on('close', (code) => {
                if (timer) clearTimeout(timer);
                resolve({ exitCode: code ?? 1, stdout, stderr });
            });
            child.on('error', (err) => {
                if (timer) clearTimeout(timer);
                resolve({ exitCode: 1, stdout, stderr: String(err?.message || err) });
            });
        });
    }

    /** Count files recursively under a directory (used to report extract/pack file counts). */
    private _countFilesRecursive(dir: string): number {
        let count = 0;
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return 0;
        }
        for (const e of entries) {
            if (e.isDirectory()) count += this._countFilesRecursive(path.join(dir, e.name));
            else count += 1;
        }
        return count;
    }

    /** Root folder where BackupManager's real snapshot contents live, one subfolder per snapshotId. */
    private _backupsRoot(): string {
        const dir = path.join(app.getPath('userData'), 'backups');
        fs.mkdirSync(dir, { recursive: true });
        return dir;
    }

    /** Total file count + byte size of a directory tree (used for snapshot/optimizer reporting). */
    private _getDirStats(dir: string): { fileCount: number; totalBytes: number } {
        let fileCount = 0;
        let totalBytes = 0;
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return { fileCount, totalBytes };
        }
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                const sub = this._getDirStats(full);
                fileCount += sub.fileCount;
                totalBytes += sub.totalBytes;
            } else {
                fileCount += 1;
                try { totalBytes += fs.statSync(full).size; } catch { /* ignore */ }
            }
        }
        return { fileCount, totalBytes };
    }

    /** Run `git <args>` against a working directory and capture output. */
    private _git(cwd: string, args: string[], timeoutMs = 30_000): Promise<{ exitCode: number; stdout: string; stderr: string }> {
        return this._runProcess('git', args, { cwd, timeoutMs });
    }

    /**
     * Parse a Fallout 4 .fos save file's HEADER section (player name/level/location/
     * playtime + plugin list). Layout verified against the real, open-source
     * pub-struct/fo4-save-cleaner parser (src/fo4_save_editor/parser.py).
     *
     * Deliberately does NOT parse Change Forms (health/caps/inventory/quest data) —
     * those are compressed, per-form binary diffs with a large, versioned internal
     * format; even the reference parser above treats that section as an opaque blob
     * it preserves rather than decodes. Faking those numbers would be worse than not
     * reporting them, so this returns what can actually be read correctly and says so.
     */
    private _parseFO4Save(buf: Buffer): {
        playerName: string; playerLevel: number; location: string; playTime: string;
        activeMods: string[]; note: string;
    } {
        if (buf.length < 12 || buf.toString('ascii', 0, 12) !== 'FO4_SAVEGAME') {
            throw new Error('Not a valid Fallout 4 save file (missing FO4_SAVEGAME signature)');
        }
        let offset = 12;
        const readU8 = () => { const v = buf.readUInt8(offset); offset += 1; return v; };
        const readU16 = () => { const v = buf.readUInt16LE(offset); offset += 2; return v; };
        const readU32 = () => { const v = buf.readUInt32LE(offset); offset += 4; return v; };
        const readF32 = () => { const v = buf.readFloatLE(offset); offset += 4; return v; };
        const readU64 = () => { const v = Number(buf.readBigUInt64LE(offset)); offset += 8; return v; };
        const readWString = () => {
            const len = readU16();
            const s = buf.toString('utf-8', offset, offset + len);
            offset += len;
            return s;
        };

        const headerSize = readU32();
        const headerStart = offset;
        readU32(); // save_version
        readU32(); // save_number
        const playerName = readWString();
        const playerLevel = readU32();
        const location = readWString();
        const playTime = readWString();
        readWString(); // race
        readU16(); // gender
        readF32(); // current_exp
        readF32(); // required_exp
        readU64(); // file_time
        const screenshotWidth = readU32();
        const screenshotHeight = readU32();
        offset = headerStart + headerSize; // header may have trailing fields we don't need — trust the declared size

        offset += screenshotWidth * screenshotHeight * 4; // skip RGBA screenshot data

        readU8(); // form_version
        readWString(); // game_version

        const pluginListSize = readU32();
        const pluginSectionStart = offset;
        const activeMods: string[] = [];
        const regularCount = readU8();
        for (let i = 0; i < regularCount; i++) activeMods.push(readWString());
        if (offset - pluginSectionStart < pluginListSize) {
            const lightCount = readU16();
            for (let i = 0; i < lightCount; i++) activeMods.push(readWString());
        }

        return {
            playerName, playerLevel, location, playTime, activeMods,
            note: 'Health, caps, quest count, and inventory weight require decoding compressed per-form save data (Change Forms), which is not implemented — these are not fabricated and are omitted/zeroed rather than guessed.',
        };
    }

    /** Locate a real texconv.exe (Microsoft DirectXTex) install — checks a user-configured
     * setting first, then a few known real install locations on this machine. */
    private _findTexconv(): string | null {
        const configured = String(this._readSettings()?.texconvPath || '').trim();
        if (configured && fs.existsSync(configured)) return configured;
        const knownPaths = [
            'D:\\blender_tools\\texconv\\texconv.exe',
            'E:\\Tools\\FO4xEdit 4.1.5q\\Edit Scripts\\Texconv.exe',
            'E:\\xEdit.4.1.5c\\Edit Scripts\\Texconv.exe',
            'E:\\Tools\\xEdit.4.1.4c.EXTREMELY.EXPERIMENTAL\\Edit Scripts\\Texconv.exe',
            'E:\\Tools\\SSEEdit\\Edit Scripts\\Texconv.exe',
        ];
        return knownPaths.find((p) => fs.existsSync(p)) || null;
    }

    /** Recursively list files under dir whose extension (lowercased) is in exts. */
    private _listFilesByExt(dir: string, exts: string[]): string[] {
        const results: string[] = [];
        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return results;
        }
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) results.push(...this._listFilesByExt(full, exts));
            else if (exts.includes(path.extname(e.name).toLowerCase())) results.push(full);
        }
        return results;
    }

    /**
     * Sends a command to the Mossy Link Blender add-on (POINTYTHRUNDRA654/Blender-add-on, mossy_link.py) on port 9999 —
     * same real wire protocol as main.ts's send-blender-command handler. Used to run real
     * Python inside the user's live Blender session (e.g. PyNifly mesh import/cleanup/export)
     * rather than hand-parsing NIF binary data in this process.
     */
    private _sendToBlenderTCP(payload: any, timeoutMs = 30000): Promise<any> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let responseReceived = false;
            const cleanup = () => { try { socket.destroy(); } catch { /* ignore */ } };
            socket.setTimeout(timeoutMs);
            socket.on('connect', () => { socket.write(JSON.stringify(payload)); });
            socket.on('data', (data) => {
                if (responseReceived) return;
                responseReceived = true;
                try {
                    const response = JSON.parse(data.toString().trim());
                    cleanup();
                    resolve(response);
                } catch {
                    cleanup();
                    resolve({ success: false, message: 'Invalid JSON response from Blender add-on' });
                }
            });
            socket.on('timeout', () => {
                if (!responseReceived) { cleanup(); resolve({ success: false, message: 'Timeout waiting for Blender response' }); }
            });
            socket.on('error', (err: any) => {
                if (!responseReceived) { cleanup(); resolve({ success: false, message: String(err?.message || err) }); }
            });
            socket.on('close', () => {
                if (!responseReceived) resolve({ success: false, message: 'Blender Link is not connected — open Blender with the Mossy Link v6 add-on running.' });
            });
            try {
                socket.connect(9999, '127.0.0.1');
            } catch (e: any) {
                cleanup();
                resolve({ success: false, message: String(e?.message || e) });
            }
        });
    }

    /**
     * Runs one AssetOptimizer job in the background, updating this._optimizeJobs.get(jobId)
     * as it progresses so GET /optimize/progress/:jobId can report real state.
     *
     * Texture recompression (texconv.exe) and archive packing (Archive2.exe) route through
     * real external tools. Mesh optimization routes through the live Mossy Link Blender
     * bridge + PyNifly (real merge-by-distance / recalc-normals via Blender's own mesh API —
     * not a hand-rolled NIF binary editor, which would risk silently corrupting files). Script
     * optimization recompiles real .psc source with the configured Papyrus Compiler — Papyrus
     * has no "strip debug bytes from an already-compiled .pex" operation; a clean recompile
     * from source is the real, safe equivalent.
     */
    private async _runOptimizeJob(jobId: string, input: string, output: string, type: string, options: any): Promise<void> {
        const job = this._optimizeJobs.get(jobId);
        if (!job) return;
        try {
            fs.mkdirSync(output, { recursive: true });
            let totalSavedBytes = 0;
            const doTextures = type === 'texture' || type === 'all';
            const doArchive = type === 'archive' || type === 'all';
            const doMesh = (type === 'mesh' || type === 'all') && options?.compressMeshes !== false;
            const doScripts = type === 'all' && options?.optimizeScripts === true;

            if (doMesh) {
                const nifFiles = this._listFilesByExt(input, ['.nif']);
                if (nifFiles.length === 0) {
                    job.details.push('No .nif files found under input path.');
                } else {
                    for (const file of nifFiles) {
                        const relDir = path.dirname(path.relative(input, file));
                        const outDir = path.join(output, relDir);
                        fs.mkdirSync(outDir, { recursive: true });
                        const outFile = path.join(outDir, path.basename(file));
                        const escapedIn = file.replace(/\\/g, '\\\\');
                        const escapedOut = outFile.replace(/\\/g, '\\\\');
                        const code = [
                            'import json, os',
                            'result = {"success": False, "error": None, "before": 0, "after": 0}',
                            'try:',
                            "    if not (hasattr(bpy.ops, 'import_scene') and hasattr(bpy.ops.import_scene, 'pynifly')):",
                            '        result["error"] = "PyNifly is not installed in this Blender. Install PyNifly 25+ (Nexus #52319)."',
                            '    else:',
                            `        result["before"] = os.path.getsize(r"${escapedIn}")`,
                            "        bpy.ops.wm.read_factory_settings(use_empty=True)",
                            `        bpy.ops.import_scene.pynifly(filepath=r"${escapedIn}", game_type='FO4')`,
                            '        for obj in list(bpy.data.objects):',
                            "            if obj.type == 'MESH':",
                            '                bpy.context.view_layer.objects.active = obj',
                            "                bpy.ops.object.mode_set(mode='EDIT')",
                            "                bpy.ops.mesh.select_all(action='SELECT')",
                            '                bpy.ops.mesh.remove_doubles()',
                            '                bpy.ops.mesh.normals_make_consistent()',
                            "                bpy.ops.object.mode_set(mode='OBJECT')",
                            `        bpy.ops.export_scene.pynifly(filepath=r"${escapedOut}", game_type='FO4')`,
                            `        result["after"] = os.path.getsize(r"${escapedOut}")`,
                            '        result["success"] = True',
                            'except Exception as e:',
                            '    result["error"] = str(e)',
                            '    try:',
                            "        bpy.ops.object.mode_set(mode='OBJECT')",
                            '    except Exception:',
                            '        pass',
                            'print(json.dumps(result))',
                        ].join('\n');

                        const settings = this._readSettings();
                        const payload: any = { type: 'script', code };
                        if (settings?.blenderLinkToken) payload.token = settings.blenderLinkToken;
                        const resp = await this._sendToBlenderTCP(payload);
                        const raw = String(resp?.result ?? '');
                        const jsonMatch = raw.match(/\{[\s\S]*\}/);
                        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

                        if (!resp?.success) {
                            job.details.push(`Mesh optimization needs Blender open with Mossy Link v6 connected — skipping remaining .nif files: ${resp?.message || 'not connected'}`);
                            break;
                        } else if (!parsed?.success) {
                            job.details.push(`Failed to optimize ${path.basename(file)}: ${parsed?.error || raw.slice(0, 200)}`);
                        } else {
                            const saved = Math.max(0, (parsed.before || 0) - (parsed.after || 0));
                            totalSavedBytes += saved;
                            job.details.push(`Optimized ${path.basename(file)} (${parsed.before} -> ${parsed.after} bytes)`);
                        }
                        job.filesProcessed += 1;
                        job.totalFiles = nifFiles.length;
                        job.progress = Math.round((job.filesProcessed / Math.max(1, job.totalFiles)) * 30);
                    }
                }
            } else if (type === 'mesh' || type === 'all') {
                job.details.push('Mesh optimization skipped — "Compress meshes" was unchecked.');
            }

            if (doScripts) {
                const settings = this._readSettings();
                const compilerPath = String(settings?.papyrusCompilerPath || '').trim();
                const flagsPath = String(settings?.papyrusFlagsPath || '').trim();
                const pscFiles = this._listFilesByExt(input, ['.psc']);
                if (!compilerPath || !fs.existsSync(compilerPath)) {
                    job.details.push('Papyrus Compiler not configured in Mossy Settings — script optimization skipped.');
                } else if (pscFiles.length === 0) {
                    job.details.push('No .psc source files found under input path — Papyrus has no safe way to strip debug data from already-compiled .pex bytecode alone.');
                } else {
                    const outDir = path.join(output, 'Scripts');
                    fs.mkdirSync(outDir, { recursive: true });
                    const args = [...pscFiles, '-i=' + input, '-o=' + outDir, ...(flagsPath ? ['-f=' + flagsPath] : [])];
                    const r = await this._runProcess(compilerPath, args, { cwd: path.dirname(compilerPath), timeoutMs: 120_000 });
                    if (r.exitCode === 0) {
                        job.details.push(`Recompiled ${pscFiles.length} script(s) to ${outDir} (clean bytecode, no debug artifacts).`);
                    } else {
                        job.details.push(`Script recompile failed: ${r.stderr || r.stdout}`);
                    }
                }
            }

            if (doTextures) {
                const texconv = this._findTexconv();
                const ddsFiles = this._listFilesByExt(input, ['.dds']);
                job.totalFiles = ddsFiles.length;
                if (!texconv) {
                    job.details.push('texconv.exe not found — set "texconvPath" in Mossy Settings (DirectXTex). Texture optimization skipped.');
                } else if (ddsFiles.length === 0) {
                    job.details.push('No .dds files found under input path.');
                } else {
                    const targetSize = options?.textureSize === '1k' ? 1024 : options?.textureSize === '4k' ? 4096 : 2048;
                    for (const file of ddsFiles) {
                        const before = fs.statSync(file).size;
                        const relDir = path.dirname(path.relative(input, file));
                        const outDir = path.join(output, relDir);
                        fs.mkdirSync(outDir, { recursive: true });
                        const args = ['-y', '-o', outDir, '-w', String(targetSize), '-h', String(targetSize)];
                        if (options?.generateMipmaps === false) args.push('-m', '1');
                        args.push(file);
                        const r = await this._runProcess(texconv, args, { timeoutMs: 60_000 });
                        const outFile = path.join(outDir, path.basename(file));
                        if (r.exitCode === 0 && fs.existsSync(outFile)) {
                            const after = fs.statSync(outFile).size;
                            totalSavedBytes += Math.max(0, before - after);
                            job.details.push(`Optimized ${path.basename(file)} (${before} -> ${after} bytes)`);
                        } else {
                            job.details.push(`Failed to optimize ${path.basename(file)}: ${r.stderr || r.stdout}`);
                        }
                        job.filesProcessed += 1;
                        job.progress = Math.round((job.filesProcessed / Math.max(1, job.totalFiles)) * (doArchive ? 80 : 100));
                    }
                }
            }

            if (doArchive) {
                const archive2Path = String(this._readSettings()?.archive2Path || '').trim();
                if (!archive2Path || !fs.existsSync(archive2Path)) {
                    job.details.push('Archive2.exe not configured — set it in Mossy Settings → External Tools. Archive packing skipped.');
                } else {
                    const archiveOut = path.join(output, path.basename(input) + '.ba2');
                    const packSource = doTextures ? output : input;
                    const r = await this._runProcess(archive2Path, [packSource, '-create=' + archiveOut, '-format=General'], {
                        cwd: path.dirname(archive2Path), timeoutMs: 180_000,
                    });
                    if (r.exitCode === 0 && fs.existsSync(archiveOut)) {
                        job.details.push(`Packed archive: ${archiveOut}`);
                    } else {
                        job.details.push(`Archive packing failed: ${r.stderr || r.stdout}`);
                    }
                }
            }

            job.progress = 100;
            job.status = 'complete';
            job.savedSpace = totalSavedBytes > 0 ? `${(totalSavedBytes / (1024 * 1024)).toFixed(1)} MB` : '0 MB';
        } catch (e: any) {
            job.status = 'error';
            job.details.push(String(e?.message || e));
        }
    }

    /**
     * Parse a Fallout 4 BA2 (BTDX) archive header directly — no external tool needed for a
     * read-only listing. Layout verified against xEdit's real archive reader
     * (TES5Edit/TES5Edit Core/wbBSArchive.pas): 24-byte header (Magic 'BTDX', Version u32,
     * Magic2 'GNRL'|'DX10', FileCount u32, FileTableOffset u64), followed by one 36-byte
     * record per file for GNRL (or a variable DX10 record with per-mip-chunk sizes), then a
     * name table at FileTableOffset (u16-length-prefixed strings, '/' used as separator).
     */
    private _parseBA2(archivePath: string): {
        files: { name: string; size: number; compressed: number; ratio: string }[];
        info: { totalFiles: number; totalSize: number; compressedSize: number; compressionRatio: string; headerVersion: string };
    } {
        const buf = fs.readFileSync(archivePath);
        if (buf.length < 24 || buf.toString('ascii', 0, 4) !== 'BTDX') {
            throw new Error('Not a valid Fallout 4 BA2 (BTDX) archive');
        }
        const version = buf.readUInt32LE(4);
        const magic2 = buf.toString('ascii', 8, 12);
        const fileCount = buf.readUInt32LE(12);
        const fileTableOffset = Number(buf.readBigUInt64LE(16));

        if (magic2 !== 'GNRL' && magic2 !== 'DX10') {
            throw new Error(`Unsupported BA2 archive type: ${magic2}`);
        }

        const raw: { name: string; size: number; compressed: number }[] = [];
        let offset = 24;

        if (magic2 === 'GNRL') {
            for (let i = 0; i < fileCount; i++) {
                offset += 4 + 4 + 4; // NameHash32, Ext, DirHash32
                offset += 1 + 1 + 2; // ModIndex, ChunkCount, HeaderSize
                offset += 8; // data Offset (unused for listing)
                const packedSize = buf.readUInt32LE(offset); offset += 4;
                const size = buf.readUInt32LE(offset); offset += 4;
                offset += 4; // 0xBAADF00D padding
                raw.push({ name: '', size, compressed: packedSize || size });
            }
        } else {
            for (let i = 0; i < fileCount; i++) {
                offset += 4 + 4 + 4 + 1; // NameHash32, Ext, DirHash32, ModIndex
                const chunkCount = buf.readUInt8(offset); offset += 1;
                offset += 2; // HeaderSize
                offset += 2 + 2 + 1 + 1 + 1 + 1; // Height, Width, NumMips, DXGIFormat, Flags, TileMode
                let totalSize = 0;
                let totalPacked = 0;
                for (let c = 0; c < chunkCount; c++) {
                    offset += 8; // chunk data Offset
                    const packedSize = buf.readUInt32LE(offset); offset += 4;
                    const size = buf.readUInt32LE(offset); offset += 4;
                    offset += 2 + 2; // StartMip, EndMip
                    offset += 4; // 0xBAADF00D padding
                    totalSize += size;
                    totalPacked += packedSize || size;
                }
                raw.push({ name: '', size: totalSize, compressed: totalPacked });
            }
        }

        if (fileTableOffset > 0 && fileTableOffset < buf.length) {
            let nameOffset = fileTableOffset;
            for (let i = 0; i < fileCount; i++) {
                const nameLen = buf.readUInt16LE(nameOffset); nameOffset += 2;
                raw[i].name = buf.toString('utf-8', nameOffset, nameOffset + nameLen).replace(/\//g, '\\');
                nameOffset += nameLen;
            }
        } else {
            raw.forEach((f, i) => { f.name = `unnamed_${i}`; });
        }

        const totalSize = raw.reduce((s, f) => s + f.size, 0);
        const compressedSize = raw.reduce((s, f) => s + f.compressed, 0);

        return {
            files: raw.map((f) => ({
                name: f.name,
                size: f.size,
                compressed: f.compressed,
                ratio: f.size > 0 ? `${Math.round((1 - f.compressed / f.size) * 100)}%` : '0%',
            })),
            info: {
                totalFiles: fileCount,
                totalSize,
                compressedSize,
                compressionRatio: totalSize > 0 ? `${Math.round((1 - compressedSize / totalSize) * 100)}%` : '0%',
                // Real, verified version numbers from wbBSArchive.pas: FO4v1=1 (pre-NG),
                // FO4v7=7 / FO4v8=8 (both NG/AE) — no FO4 version falls between them.
                headerVersion: version >= 7 ? 'V2' : 'V1',
            },
        };
    }

    /** Timing-safe comparison against bridgeAuthToken in settings.json. No token
     *  configured means reject everything, never fail open — see the class-level
     *  SECURITY comment for why. */
    private _checkAuth(req: http.IncomingMessage): boolean {
        const settings = this._readSettings();
        const expected = String(settings.bridgeAuthToken || '');
        if (!expected) return false;
        const provided = String(req.headers['x-mossy-token'] || '');
        const expectedBuf = Buffer.from(expected, 'utf-8');
        const providedBuf = Buffer.from(provided, 'utf-8');
        if (expectedBuf.length !== providedBuf.length) return false;
        try {
            return crypto.timingSafeEqual(expectedBuf, providedBuf);
        } catch {
            return false;
        }
    }

    start() {
        this.server = http.createServer(async (req, res) => {
            console.log('[Bridge] incoming request', req.method, req.url);
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Mossy-Token, Access-Control-Allow-Private-Network');
            res.setHeader('Access-Control-Allow-Private-Network', 'true');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            const url = req.url || '/';
            const method = req.method;

            // GET /health is exempt from the token gate: it returns nothing beyond
            // "Mossy is running" + a version string, none of which is sensitive
            // (unlike every other route here, which can screenshot, read the
            // clipboard, or reach Blender). The Blender add-on's check_bridge()
            // relies on this being callable with no token — see its own docstring
            // ("1. Test outbound connections (no token needed)") — so gating it
            // broke Quick Connect / the add-on's connection-status check with a
            // 401 it has no legitimate way to clear.
            const isUnauthenticatedHealthCheck = url === '/health' && method === 'GET';

            // SECURITY: every other non-preflight request must present a valid
            // token — see the class-level comment above for why this exists at all.
            if (!isUnauthenticatedHealthCheck && !this._checkAuth(req)) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'error', message: 'Missing or invalid X-Mossy-Token header.' }));
                return;
            }

            try {
                // Health Check
                if (url === '/health' && method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: "online", version: "6.0.0 (Neural Link Active)" }));
                }

                // Screen Capture — returns base64 PNG of the primary display
                else if (url === '/capture' && method === 'GET') {
                    try {
                        // Resolve the primary display bounds
                        const primaryDisplay = screen.getPrimaryDisplay();
                        const { width, height } = primaryDisplay.size;

                        // Use Electron desktopCapturer via a helper exec approach.
                        // We call a small Node snippet via exec so it runs in the main
                        // process context that has access to desktopCapturer sources.
                        // For the native Bridge Server path we use nativeImage + clipboard
                        // trick: take a screenshot via PowerShell and return the PNG bytes.
                        const tmpPath = path.join(os.tmpdir(), `mossy_capture_${Date.now()}.png`);
                        await new Promise<void>((resolve, reject) => {
                            // PowerShell screenshot (works without any extra dependencies)
                            const psScript = [
                                `Add-Type -AssemblyName System.Windows.Forms`,
                                `$bmp = New-Object System.Drawing.Bitmap(${width},${height})`,
                                `$g = [System.Drawing.Graphics]::FromImage($bmp)`,
                                `$g.CopyFromScreen(0,0,0,0,[System.Drawing.Size]::new(${width},${height}))`,
                                `$bmp.Save('${tmpPath.replace(/\\/g, '\\\\')}')`,
                                `$g.Dispose()`,
                                `$bmp.Dispose()`,
                            ].join('; ');
                            exec(`powershell -NoProfile -Command "${psScript}"`, (err) => {
                                if (err) reject(err); else resolve();
                            });
                        });
                        const pngBytes = fs.readFileSync(tmpPath);
                        fs.unlinkSync(tmpPath);
                        const b64 = pngBytes.toString('base64');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            status: 'success',
                            image: `data:image/png;base64,${b64}`,
                            resolution: `${width}x${height}`,
                        }));
                    } catch (captureErr: any) {
                        console.error('[Bridge] /capture error:', captureErr);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'error', message: String(captureErr?.message ?? captureErr) }));
                    }
                }

                // Clipboard — GET reads current clipboard text, POST writes it
                else if (url === '/clipboard' && method === 'GET') {
                    try {
                        const text = clipboard.readText();
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success', text }));
                    } catch (clipErr: any) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'error', message: String(clipErr?.message ?? clipErr) }));
                    }
                }

                else if (url === '/clipboard' && method === 'POST') {
                    let body = '';
                    req.on('data', (chunk) => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { text } = JSON.parse(body);
                            clipboard.writeText(String(text ?? ''));
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'success', message: 'Clipboard updated' }));
                        } catch (clipErr: any) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'error', message: String(clipErr?.message ?? clipErr) }));
                        }
                    });
                }

                // Hardware Telemetry
                else if (url === '/hardware' && method === 'GET') {
                    const cpus = os.cpus();
                    const totalMem = Math.round(os.totalmem() / (1024 ** 3));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: "success",
                        os: `${os.type()} ${os.release()}`,
                        cpu: cpus[0].model,
                        ram: totalMem,
                        gpu: "Auto-detected by Bridge",
                        python: "Native Bridge"
                    }));
                }

                // File Listing
                else if (url === '/files' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', async () => {
                        const { path: dirPath } = JSON.parse(body);
                        if (!dirPath || !fs.existsSync(dirPath)) {
                            res.writeHead(404);
                            res.end(JSON.stringify({ error: "Path not found" }));
                            return;
                        }

                        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                        const files = entries.map(e => ({
                            name: e.name,
                            is_dir: e.isDirectory(),
                            size: e.isFile() ? fs.statSync(path.join(dirPath, e.name)).size : 0
                        }));

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: "success", files }));
                    });
                }

                // EXECUTE SCRIPT (The "Real Assistant" part)
                else if (url === '/execute' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', async () => {
                        try {
                            const { type, script, target, name, run } = JSON.parse(body);
                            console.log('[Bridge] /execute payload', { type, script, target });
                            
                            // ── Blender command dispatch — all types use this._blenderSend() ──────────
                            const blenderErrResponse = (e: any, label: string) => {
                                if (e?.type === 'timeout') {
                                    res.writeHead(504, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'error', message: `Blender addon timed out during ${label}.` }));
                                } else {
                                    res.writeHead(503, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'error', message: `Blender addon not responding on port ${this.addonPort}. Is the addon active?` }));
                                }
                            };

                            if (type === 'blender') {
                                try {
                                    const response = await this._blenderSend({ type: 'script', code: script }, 3_000);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender command executed', response }));
                                } catch (e: any) { blenderErrResponse(e, 'script execution'); }

                            } else if (type === 'text') {
                                try {
                                    const response = await this._blenderSend({ type: 'text', code: script, name, run }, 3_000);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender text updated', response }));
                                } catch (e: any) { blenderErrResponse(e, 'text update'); }

                            } else if (type === 'context') {
                                try {
                                    const response = await this._blenderSend({ type: 'get_context' }, 3_000);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender context', response }));
                                } catch (e: any) { blenderErrResponse(e, 'context fetch'); }

                            } else if (type === 'capabilities') {
                                // Version handshake — added alongside get_context's real-world
                                // rollout finding that an outdated add-on's "Unknown command
                                // type" response looked identical to "Blender isn't running" from
                                // the client's side, so a stale add-on just silently abstained
                                // instead of telling the user to update. Callers should check
                                // this BEFORE relying on get_context, not just try get_context
                                // and guess why it came back empty.
                                try {
                                    const response = await this._blenderSend({ type: 'get_capabilities' }, 3_000);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender capabilities', response }));
                                } catch (e: any) { blenderErrResponse(e, 'capabilities fetch'); }

                            } else if (type === 'export_fbx') {
                                try {
                                    const response = await this._blenderSend(
                                        { type: 'export_fbx', filepath: target || script || '', use_selection: true, bake_anim: false },
                                        6_000,
                                    );
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender export_fbx', response }));
                                } catch (e: any) { blenderErrResponse(e, 'FBX export'); }

                            } else if (type === 'export_obj') {
                                try {
                                    const response = await this._blenderSend(
                                        { type: 'export_obj', filepath: target || script || '', use_selection: true },
                                        6_000,
                                    );
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender export_obj', response }));
                                } catch (e: any) { blenderErrResponse(e, 'OBJ export'); }

                            } else {
                                // 'shell' (arbitrary exec(script)) was removed here — no caller in this
                                // codebase ever sent it; it existed purely as unused, unauthenticated
                                // attack surface. /install_package (below) is the pattern for anything
                                // that genuinely needs to shell out: a named operation with sanitized,
                                // constrained parameters, not a raw command string.
                                res.writeHead(400);
                                res.end(JSON.stringify({ error: 'Unsupported execution type' }));
                            }
                        } catch (parseError) {
                            res.writeHead(400);
                            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                        }
                    });
                }

                // GET /loadorder/graph — {nodes, edges} for the Conflict Visualizer
                else if (url === '/loadorder/graph' && method === 'GET') {
                    try {
                        const localApp = process.env.LOCALAPPDATA
                            || require('path').join(require('os').homedir(), 'AppData', 'Local');
                        const pluginsTxt = require('path').join(localApp, 'Fallout4', 'Plugins.txt');
                        let nodes: any[] = [];
                        if (require('fs').existsSync(pluginsTxt)) {
                            const raw: string = require('fs').readFileSync(pluginsTxt, 'utf-8');
                            const lines: string[] = raw.split(/\r?\n/)
                                .map((l: string) => l.trim())
                                .filter((l: string) => l.length > 0 && !l.startsWith('#'));
                            const active: string[] = lines
                                .filter((l: string) => l.startsWith('*'))
                                .map((l: string) => l.slice(1).trim())
                                .filter(Boolean);
                            const cols = Math.max(1, Math.ceil(Math.sqrt(active.length)));
                            nodes = active.map((name: string, i: number) => ({
                                id: name.toLowerCase(),
                                name,
                                type: name.toLowerCase().endsWith('.esm') ? 'master'
                                    : name.toLowerCase().endsWith('.esl') ? 'light' : 'plugin',
                                x: 80 + (i % cols) * 160,
                                y: 80 + Math.floor(i / cols) * 120,
                                conflicts: [],
                                overrides: [],
                            }));
                        }
                        // Real FormID-overlap edges — previously hardcoded to [] so the graph could
                        // never show any relationship lines even though node positions were real.
                        const edges: Array<{ from: string; to: string; severity: 'high' | 'medium' | 'low'; records: string[] }> = [];
                        const fallout4Path = String(this._readSettings()?.fallout4Path || '').trim();
                        if (fallout4Path && nodes.length > 0) {
                            const dataDir = path.join(fallout4Path, 'Data');
                            const formIdMap = new Map<string, string[]>();
                            const masterIds = new Set(nodes.filter((n: any) => n.type === 'master').map((n: any) => n.id));
                            for (const node of nodes) {
                                const pluginPath = path.join(dataDir, node.name);
                                if (!fs.existsSync(pluginPath)) continue;
                                for (const formId of extractFormIDs(pluginPath)) {
                                    const owners = formIdMap.get(formId) || [];
                                    owners.push(node.id);
                                    formIdMap.set(formId, owners);
                                }
                            }
                            const nodeById = new Map(nodes.map((n: any) => [n.id, n]));
                            const pairRecords = new Map<string, string[]>();
                            for (const [formId, owners] of formIdMap) {
                                if (owners.length < 2) continue;
                                for (let i = 0; i < owners.length; i++) {
                                    nodeById.get(owners[i])?.conflicts.push(...owners.filter((o: string) => o !== owners[i]));
                                    for (let j = i + 1; j < owners.length; j++) {
                                        const key = [owners[i], owners[j]].sort().join('|');
                                        const list = pairRecords.get(key) || [];
                                        list.push(formId);
                                        pairRecords.set(key, list);
                                    }
                                }
                            }
                            for (const [key, records] of pairRecords) {
                                const [from, to] = key.split('|');
                                const severity: 'high' | 'medium' | 'low' =
                                    (masterIds.has(from) || masterIds.has(to)) ? 'high' : records.length > 5 ? 'medium' : 'low';
                                edges.push({ from, to, severity, records });
                            }
                            for (const node of nodes) {
                                node.conflicts = Array.from(new Set(node.conflicts));
                            }
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ nodes, edges }));
                    } catch (graphErr: any) {
                        console.error('[Bridge] /loadorder/graph error:', graphErr);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ nodes: [], edges: [] }));
                    }
                }

                // GET /loadorder/read — raw active plugin list
                else if (url === '/loadorder/read' && method === 'GET') {
                    try {
                        const localApp2 = process.env.LOCALAPPDATA
                            || require('path').join(require('os').homedir(), 'AppData', 'Local');
                        const pluginsTxt2 = require('path').join(localApp2, 'Fallout4', 'Plugins.txt');
                        if (!require('fs').existsSync(pluginsTxt2)) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ plugins: [], active: [] }));
                        } else {
                            const raw2: string = require('fs').readFileSync(pluginsTxt2, 'utf-8');
                            const lines2: string[] = raw2.split(/\r?\n/)
                                .map((l: string) => l.trim())
                                .filter((l: string) => l.length > 0 && !l.startsWith('#'));
                            const allPlugins: string[] = lines2
                                .map((l: string) => l.replace(/^\*/, '').trim())
                                .filter(Boolean);
                            const activePlugins: string[] = lines2
                                .filter((l: string) => l.startsWith('*'))
                                .map((l: string) => l.slice(1).trim())
                                .filter(Boolean);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ plugins: allPlugins, active: activePlugins }));
                        }
                    } catch (readErr: any) {
                        console.error('[Bridge] /loadorder/read error:', readErr);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to read Plugins.txt' }));
                    }
                }

                // POST /install_package — install one or more pip packages into Mossy's Python env
                else if (url === '/install_package' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const payload = JSON.parse(body);
                            // Accept { package: string } or { packages: string[] }
                            const pkgs: string[] = Array.isArray(payload.packages)
                                ? payload.packages
                                : payload.package
                                    ? [String(payload.package)]
                                    : [];

                            if (pkgs.length === 0) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ status: 'error', message: 'No package specified. Provide "package" or "packages" in the request body.' }));
                                return;
                            }

                            // Resolve python executable — use configured path, then fall back
                            const pythonCandidates = this.pythonPath
                                ? [this.pythonPath, 'python', 'python3', 'py']
                                : ['python', 'python3', 'py'];

                            const pythonExe = pythonCandidates[0];
                            const safeNames = pkgs.map(p => p.replace(/[^a-zA-Z0-9_.=<>![\],\-]/g, ''));
                            const cmd = `"${pythonExe}" -m pip install --no-warn-script-location ${safeNames.join(' ')}`;

                            console.log('[Bridge] /install_package running:', cmd);

                            exec(cmd, { timeout: 300_000 }, (err, stdout, stderr) => {
                                const code = err ? (err as any).code ?? 1 : 0;
                                const success = code === 0;
                                console.log(`[Bridge] /install_package exit=${code}`);
                                res.writeHead(success ? 200 : 500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    status: success ? 'success' : 'error',
                                    packages: safeNames,
                                    stdout: stdout.trim(),
                                    stderr: stderr.trim(),
                                    code,
                                }));
                            });
                        } catch (parseErr: any) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON payload' }));
                        }
                    });
                }

                // POST /game/connect — real capability check: is Fallout4.exe running.
                // Engine-internal telemetry (FPS, frame time, Papyrus script timing, in-game
                // console) still needs a native F4SE plugin hooking the engine — not implemented
                // here. But process-level RAM (tasklist) and GPU usage (nvidia-smi) are real,
                // externally-observable data that don't require hooking anything, so a connection
                // now succeeds whenever the game process is actually running.
                else if (url === '/game/connect' && method === 'POST') {
                    (async () => {
                        try {
                            const r = await this._runProcess('tasklist', ['/FI', 'IMAGENAME eq Fallout4.exe', '/FO', 'CSV'], { timeoutMs: 5000 });
                            const running = r.stdout.toLowerCase().includes('fallout4.exe');
                            if (running) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: true,
                                    gameRunning: true,
                                    message: 'Connected — RAM and GPU usage are real (process/driver level). FPS, frame time, and script timing need an F4SE plugin (not yet installed) and will show as unavailable.',
                                }));
                            } else {
                                res.writeHead(503, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, gameRunning: false, message: 'Fallout 4 is not currently running.' }));
                            }
                        } catch (e: any) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: e?.message || 'Could not check process list' }));
                        }
                    })();
                }

                // GET /game/metrics — real RAM (tasklist) and GPU usage (nvidia-smi) where
                // available; everything that needs actual engine hooking (fps, frameTime,
                // scriptTime, scriptCount, activeScripts, consoleLog, variables) is honestly
                // reported as unavailable rather than invented.
                else if (url === '/game/metrics' && method === 'GET') {
                    (async () => {
                        try {
                            const tl = await this._runProcess('tasklist', ['/FI', 'IMAGENAME eq Fallout4.exe', '/FO', 'CSV', '/NH'], { timeoutMs: 5000 });
                            const line = tl.stdout.trim().split(/\r?\n/)[0] || '';
                            if (!line.toLowerCase().includes('fallout4.exe')) {
                                res.writeHead(503, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Fallout 4 is not running.' }));
                                return;
                            }
                            const cols = line.split('","').map((c) => c.replace(/^"|"$/g, ''));
                            const memKb = parseInt((cols[4] || '0').replace(/[^\d]/g, ''), 10) || 0;
                            const ramUsedMb = memKb / 1024;

                            let vram: { used: number; total: number } | null = null;
                            try {
                                const nv = await this._runProcess('nvidia-smi', ['--query-gpu=memory.used,memory.total', '--format=csv,noheader,nounits'], { timeoutMs: 5000 });
                                const first = nv.stdout.trim().split(/\r?\n/)[0] || '';
                                const [usedStr, totalStr] = first.split(',').map((s) => s.trim());
                                const used = parseFloat(usedStr), total = parseFloat(totalStr);
                                if (Number.isFinite(used) && Number.isFinite(total) && total > 0) {
                                    vram = { used, total };
                                }
                            } catch { /* non-NVIDIA GPU or nvidia-smi not on PATH — leave vram null, reported honestly below */ }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                ram: { used: ramUsedMb, total: null },
                                vram,
                                fps: null, frameTime: null, scriptTime: null, scriptCount: null,
                                activeScripts: [], consoleLog: [], variables: [],
                                unavailable: [
                                    'fps', 'frameTime', 'scriptTime', 'scriptCount', 'activeScripts', 'consoleLog', 'variables',
                                    ...(vram ? [] : ['vram']),
                                ],
                                unavailableReason: 'Engine-internal telemetry (FPS, frame time, Papyrus script timing/console) requires an F4SE plugin that hooks the engine — not yet installed. GPU usage needs nvidia-smi on PATH (NVIDIA GPUs only).',
                            }));
                        } catch (e: any) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'Failed to read game metrics' }));
                        }
                    })();
                }

                // POST /game/hotreload — the one real, safe thing achievable here: recompile any
                // changed Papyrus scripts. NOT a live in-game script swap (FO4 has no such
                // mechanism) — recompiled .pex files apply on the next game/save load.
                else if (url === '/game/hotreload' && method === 'POST') {
                    (async () => {
                        try {
                            const settings = this._readSettings();
                            const compilerPath = String(settings?.papyrusCompilerPath || '').trim();
                            const sourcePath = String(settings?.papyrusSourcePath || '').trim();
                            const flagsPath = String(settings?.papyrusFlagsPath || '').trim();
                            if (!compilerPath || !fs.existsSync(compilerPath) || !sourcePath || !fs.existsSync(sourcePath)) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: false,
                                    message: 'Papyrus compiler/source paths not configured in Mossy Settings. Note: this recompiles scripts — Fallout 4 has no true live script hot-swap, so changes apply on next load, not instantly in a running session.',
                                }));
                                return;
                            }
                            const pscFiles = this._listFilesByExt(sourcePath, ['.psc']);
                            if (pscFiles.length === 0) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true, compiled: 0, message: 'No .psc scripts found under papyrusSourcePath.' }));
                                return;
                            }
                            const args = [...pscFiles, '-i=' + sourcePath, ...(flagsPath ? ['-f=' + flagsPath] : [])];
                            const r = await this._runProcess(compilerPath, args, { cwd: path.dirname(compilerPath), timeoutMs: 120_000 });
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: r.exitCode === 0,
                                compiled: pscFiles.length,
                                message: r.exitCode === 0
                                    ? `Recompiled ${pscFiles.length} script(s). Applies on next game/save load — Fallout 4 cannot hot-swap Papyrus in a running session.`
                                    : `Compile failed: ${r.stderr || r.stdout}`,
                            }));
                        } catch (e: any) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: e?.message || 'Hot reload failed' }));
                        }
                    })();
                }

                // POST /savegame/parse — real .fos header parse (name/level/location/playtime/plugins)
                else if (url === '/savegame/parse' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { path: savePath } = JSON.parse(body || '{}');
                            if (!savePath || !fs.existsSync(savePath)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Save file not found: ' + savePath }));
                                return;
                            }
                            const buf = fs.readFileSync(savePath);
                            const parsed = this._parseFO4Save(buf);

                            // Cross-check the save's plugin list against the currently-installed
                            // Data folder to find real missing masters (plugins the save expects
                            // that no longer exist on disk) — computable without change-form parsing.
                            const fallout4Path = String(this._readSettings()?.fallout4Path || '').trim();
                            const missingMasters: string[] = [];
                            if (fallout4Path) {
                                const dataDir = path.join(fallout4Path, 'Data');
                                for (const mod of parsed.activeMods) {
                                    if (!fs.existsSync(path.join(dataDir, mod))) missingMasters.push(mod);
                                }
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                playerName: parsed.playerName,
                                playerLevel: parsed.playerLevel,
                                location: parsed.location,
                                playTime: parsed.playTime,
                                activeMods: parsed.activeMods,
                                missingMasters,
                                health: 0,
                                caps: 0,
                                questCount: 0,
                                inventoryWeight: 0,
                                note: parsed.note + (fallout4Path ? '' : ' Missing-master detection also needs "fallout4Path" set in Mossy Settings.'),
                            }));
                        } catch (e: any) {
                            console.error('[Bridge] /savegame/parse error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'Failed to parse save file' }));
                        }
                    });
                }

                // POST /files/watch — start (or retarget) a real recursive fs.watch on a directory
                else if (url === '/files/watch' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { path: watchPath } = JSON.parse(body || '{}');
                            if (!watchPath || !fs.existsSync(watchPath)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Path not found: ' + watchPath }));
                                return;
                            }
                            if (this._fileWatcher) {
                                try { this._fileWatcher.close(); } catch { /* ignore */ }
                            }
                            this._pendingFileChanges.clear();
                            this._watchedRoot = watchPath;
                            this._fileWatcher = fs.watch(watchPath, { recursive: true }, (_eventType, filename) => {
                                if (!filename) return;
                                const fullPath = path.join(this._watchedRoot, filename.toString());
                                try {
                                    const st = fs.statSync(fullPath);
                                    if (st.isFile()) this._pendingFileChanges.set(fullPath, st.mtimeMs);
                                } catch {
                                    // File already gone (deleted / renamed away) — nothing to report.
                                }
                            });
                            this._fileWatcher.on('error', (err) => {
                                console.error('[Bridge] file watcher error:', err);
                            });
                            console.log('[Bridge] /files/watch started on:', watchPath);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, watching: watchPath }));
                        } catch (e: any) {
                            console.error('[Bridge] /files/watch error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'Failed to start watcher' }));
                        }
                    });
                }

                // GET /files/changes — drain and return changes accumulated since the last poll
                else if (url === '/files/changes' && method === 'GET') {
                    const files = Array.from(this._pendingFileChanges.entries()).map(([p, mtime]) => ({
                        path: p,
                        modified: new Date(mtime).toISOString(),
                    }));
                    this._pendingFileChanges.clear();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ files }));
                }

                // GET /ck/precombine-status — real per-cell precombine-ownership
                // conflicts read from the user's own CKPE log, if CKPE is installed
                // and logging. See _getCKPEPrecombineStatus for the detected/parsed
                // state machine this can return.
                else if (url === '/ck/precombine-status' && method === 'GET') {
                    const status = this._getCKPEPrecombineStatus();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(status));
                }

                // GET /ck/crash-status — real CreationKit.exe crash dumps from CKPE's own
                // Crashes folder. See CKCrashStatus's doc comment for why this source and
                // not %LOCALAPPDATA%\CrashDumps/WER.
                else if (url === '/ck/crash-status' && method === 'GET') {
                    const status = this._getCKCrashStatus();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(status));
                }

                // POST /backup/create — real recursive copy of workspacePath into this snapshot's backup slot
                else if (url === '/backup/create' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { snapshotId, workspacePath } = JSON.parse(body || '{}');
                            if (!snapshotId || !workspacePath || !fs.existsSync(workspacePath)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'workspacePath not found: ' + workspacePath }));
                                return;
                            }
                            const dest = path.join(this._backupsRoot(), String(snapshotId));
                            fs.cpSync(workspacePath, dest, { recursive: true, force: true });
                            const stats = this._getDirStats(dest);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, fileCount: stats.fileCount, totalBytes: stats.totalBytes }));
                        } catch (e: any) {
                            console.error('[Bridge] /backup/create error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'Backup failed' }));
                        }
                    });
                }

                // GET /git/status?path=<repo> — real branch/uncommitted/unpushed via git CLI
                else if (url.split('?')[0] === '/git/status' && method === 'GET') {
                    (async () => {
                        try {
                            const query = new URLSearchParams(url.split('?')[1] || '');
                            const repoPath = query.get('path') || '';
                            if (!repoPath || !fs.existsSync(repoPath)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'path not found: ' + repoPath }));
                                return;
                            }
                            const branchResult = await this._git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD']);
                            if (branchResult.exitCode !== 0) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Not a git repository: ' + repoPath }));
                                return;
                            }
                            const statusResult = await this._git(repoPath, ['status', '--porcelain']);
                            const uncommitted = statusResult.stdout.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
                            // No upstream configured is a normal, common state — treat as 0 unpushed rather than an error.
                            const unpushedResult = await this._git(repoPath, ['rev-list', '@{u}..HEAD', '--count']);
                            const unpushed = unpushedResult.exitCode === 0 ? parseInt(unpushedResult.stdout.trim(), 10) || 0 : 0;
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ branch: branchResult.stdout.trim(), uncommitted, unpushed }));
                        } catch (e: any) {
                            console.error('[Bridge] /git/status error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'git status failed' }));
                        }
                    })();
                }

                // POST /git/commit — real `git add -A && git commit -m <message>`
                else if (url === '/git/commit' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', async () => {
                        try {
                            const { message, path: repoPath } = JSON.parse(body || '{}');
                            if (!repoPath || !fs.existsSync(repoPath)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'path not found: ' + repoPath }));
                                return;
                            }
                            if (!message || !String(message).trim()) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'message is required' }));
                                return;
                            }
                            const addResult = await this._git(repoPath, ['add', '-A']);
                            if (addResult.exitCode !== 0) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'git add failed: ' + (addResult.stderr || addResult.stdout) }));
                                return;
                            }
                            const commitResult = await this._git(repoPath, ['commit', '-m', String(message)]);
                            if (commitResult.exitCode !== 0) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'git commit failed: ' + (commitResult.stderr || commitResult.stdout) }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, output: commitResult.stdout }));
                        } catch (e: any) {
                            console.error('[Bridge] /git/commit error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'git commit failed' }));
                        }
                    });
                }

                // POST /git/push — real `git push`
                else if (url === '/git/push' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', async () => {
                        try {
                            const { path: repoPath } = JSON.parse(body || '{}');
                            if (!repoPath || !fs.existsSync(repoPath)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'path not found: ' + repoPath }));
                                return;
                            }
                            const pushResult = await this._git(repoPath, ['push'], 60_000);
                            if (pushResult.exitCode !== 0) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'git push failed: ' + (pushResult.stderr || pushResult.stdout) }));
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, output: pushResult.stdout || pushResult.stderr }));
                        } catch (e: any) {
                            console.error('[Bridge] /git/push error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'git push failed' }));
                        }
                    });
                }

                // POST /backup/restore — safety-snapshots the CURRENT workspace, then restores the target snapshot over it
                else if (url === '/backup/restore' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { snapshotId, workspacePath } = JSON.parse(body || '{}');
                            const snapshotDir = path.join(this._backupsRoot(), String(snapshotId));
                            if (!fs.existsSync(snapshotDir)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Snapshot has no backed-up files (it may predate this feature, or the Desktop Bridge was offline when it was created): ' + snapshotId }));
                                return;
                            }
                            if (!workspacePath) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'workspacePath is required' }));
                                return;
                            }
                            if (fs.existsSync(workspacePath)) {
                                const safetyId = `${snapshotId}_pre-restore-safety_${Date.now()}`;
                                fs.cpSync(workspacePath, path.join(this._backupsRoot(), safetyId), { recursive: true, force: true });
                            }
                            fs.cpSync(snapshotDir, workspacePath, { recursive: true, force: true });
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
                        } catch (e: any) {
                            console.error('[Bridge] /backup/restore error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'Restore failed' }));
                        }
                    });
                }

                // GET /backup/export/:id — zip the snapshot's real backed-up files to disk
                else if (url.startsWith('/backup/export/') && method === 'GET') {
                    try {
                        const snapshotId = decodeURIComponent(url.slice('/backup/export/'.length));
                        const snapshotDir = path.join(this._backupsRoot(), snapshotId);
                        if (!fs.existsSync(snapshotDir)) {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Snapshot has no backed-up files: ' + snapshotId }));
                            return;
                        }
                        const exportsDir = path.join(app.getPath('userData'), 'backup-exports');
                        fs.mkdirSync(exportsDir, { recursive: true });
                        const zipPath = path.join(exportsDir, `snapshot-${snapshotId}.zip`);
                        const zip = new AdmZip();
                        zip.addLocalFolder(snapshotDir);
                        zip.writeZip(zipPath);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, path: zipPath }));
                    } catch (e: any) {
                        console.error('[Bridge] /backup/export error:', e?.message);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: e?.message || 'Export failed' }));
                    }
                }

                // POST /optimize/start — kicks off a background AssetOptimizer job, returns immediately
                else if (url === '/optimize/start' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const parsed = JSON.parse(body || '{}');
                            const jobId = String(parsed.jobId || Date.now().toString());
                            const { input, output, type, options } = parsed;
                            if (!input || !fs.existsSync(input)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Input path not found: ' + input }));
                                return;
                            }
                            this._optimizeJobs.set(jobId, {
                                status: 'processing', progress: 0, filesProcessed: 0,
                                totalFiles: 0, savedSpace: '0 MB', details: [],
                            });
                            // Fire-and-forget: client polls /optimize/progress/:jobId for state.
                            void this._runOptimizeJob(jobId, input, output || `${input}_optimized`, type, options || {});
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ jobId, status: 'started' }));
                        } catch {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                        }
                    });
                }

                // GET /optimize/progress/:jobId
                else if (url.startsWith('/optimize/progress/') && method === 'GET') {
                    const jobId = decodeURIComponent(url.slice('/optimize/progress/'.length));
                    const job = this._optimizeJobs.get(jobId);
                    if (!job) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Unknown job id: ' + jobId }));
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(job));
                }

                // POST /ba2/list — read-only header parse, no external tool required
                else if (url === '/ba2/list' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', () => {
                        try {
                            const { archive } = JSON.parse(body || '{}');
                            if (!archive || !fs.existsSync(archive)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Archive not found: ' + archive }));
                                return;
                            }
                            const parsed = this._parseBA2(archive);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(parsed));
                        } catch (e: any) {
                            console.error('[Bridge] /ba2/list error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'Failed to parse archive' }));
                        }
                    });
                }

                // POST /ba2/extract — real Archive2.exe -extract
                else if (url === '/ba2/extract' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', async () => {
                        try {
                            const { archive, destination } = JSON.parse(body || '{}');
                            const archive2Path = String(this._readSettings()?.archive2Path || '').trim();
                            if (!archive2Path || !fs.existsSync(archive2Path)) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Archive2.exe path not configured — set it in Mossy Settings → External Tools.' }));
                                return;
                            }
                            if (!archive || !fs.existsSync(archive)) {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Archive not found: ' + archive }));
                                return;
                            }
                            if (!destination) {
                                res.writeHead(400, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'destination is required' }));
                                return;
                            }
                            fs.mkdirSync(destination, { recursive: true });
                            const result = await this._runProcess(archive2Path, [archive, '-extract=' + destination], {
                                cwd: path.dirname(archive2Path), timeoutMs: 120_000,
                            });
                            if (result.exitCode !== 0) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: `Archive2 extract failed (exit ${result.exitCode}): ${result.stderr || result.stdout}` }));
                                return;
                            }
                            const fileCount = this._countFilesRecursive(destination);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ fileCount, destination }));
                        } catch (e: any) {
                            console.error('[Bridge] /ba2/extract error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: e?.message || 'Extraction failed' }));
                        }
                    });
                }

                // POST /ba2/pack — real Archive2.exe -create
                else if (url === '/ba2/pack' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', async () => {
                        try {
                            const { source, output, archiveType } = JSON.parse(body || '{}');
                            const archive2Path = String(this._readSettings()?.archive2Path || '').trim();
                            if (!archive2Path || !fs.existsSync(archive2Path)) {
                                res.writeHead(400, { 'Content-Type': 'text/plain' });
                                res.end('Archive2.exe path not configured — set it in Mossy Settings → External Tools.');
                                return;
                            }
                            if (!source || !fs.existsSync(source)) {
                                res.writeHead(404, { 'Content-Type': 'text/plain' });
                                res.end('Source folder not found: ' + source);
                                return;
                            }
                            if (!output) {
                                res.writeHead(400, { 'Content-Type': 'text/plain' });
                                res.end('output path is required');
                                return;
                            }
                            // Archive2's -format accepts General|DDS|XBoxDDS directly — matches
                            // the archiveType values the UI already sends, no translation needed.
                            const format = archiveType === 'DDS' ? 'DDS' : 'General';
                            const result = await this._runProcess(archive2Path, [source, '-create=' + output, '-format=' + format], {
                                cwd: path.dirname(archive2Path), timeoutMs: 180_000,
                            });
                            if (result.exitCode !== 0 || !fs.existsSync(output)) {
                                res.writeHead(500, { 'Content-Type': 'text/plain' });
                                res.end(`Archive2 pack failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`);
                                return;
                            }
                            const fileCount = this._countFilesRecursive(source);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ fileCount, output }));
                        } catch (e: any) {
                            console.error('[Bridge] /ba2/pack error:', e?.message);
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            res.end(e?.message || 'Packing failed');
                        }
                    });
                }

                // POST /ba2/merge — extract all inputs into one folder (later archives win on
                // path collision), then re-pack the merged tree as a single output archive
                else if (url === '/ba2/merge' && method === 'POST') {
                    let body = '';
                    req.on('data', chunk => { body += chunk.toString(); });
                    req.on('end', async () => {
                        let mergeTempDir: string | null = null;
                        try {
                            const { inputArchives, outputArchive, archiveType } = JSON.parse(body || '{}');
                            const archive2Path = String(this._readSettings()?.archive2Path || '').trim();
                            if (!archive2Path || !fs.existsSync(archive2Path)) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, message: 'Archive2.exe path not configured — set it in Mossy Settings → External Tools.' }));
                                return;
                            }
                            if (!Array.isArray(inputArchives) || inputArchives.length < 2 || !outputArchive) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: false, message: 'At least 2 inputArchives and an outputArchive are required.' }));
                                return;
                            }

                            mergeTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mossy-ba2-merge-'));
                            // Raw per-archive counts (via the header parser, no extraction needed)
                            // summed BEFORE merging, so this can be larger than finalFiles below —
                            // the difference is exactly how many paths collided across archives.
                            let extractedFiles = 0;
                            for (const archive of inputArchives) {
                                if (!fs.existsSync(archive)) {
                                    throw new Error(`Input archive not found: ${archive}`);
                                }
                                extractedFiles += this._parseBA2(archive).info.totalFiles;
                            }
                            for (const archive of inputArchives) {
                                // Extract in order into the SAME shared folder — later archives'
                                // files overwrite earlier ones on path collision, which is the
                                // intended "merge" behavior for same-type archive stacking.
                                const r = await this._runProcess(archive2Path, [archive, '-extract=' + mergeTempDir], {
                                    cwd: path.dirname(archive2Path), timeoutMs: 120_000,
                                });
                                if (r.exitCode !== 0) {
                                    throw new Error(`Failed to extract ${path.basename(archive)}: ${r.stderr || r.stdout}`);
                                }
                            }
                            const finalFiles = this._countFilesRecursive(mergeTempDir);

                            const format = archiveType === 'texture' ? 'DDS' : 'General';
                            const packResult = await this._runProcess(archive2Path, [mergeTempDir, '-create=' + outputArchive, '-format=' + format], {
                                cwd: path.dirname(archive2Path), timeoutMs: 180_000,
                            });
                            if (packResult.exitCode !== 0 || !fs.existsSync(outputArchive)) {
                                throw new Error(`Failed to pack merged archive: ${packResult.stderr || packResult.stdout}`);
                            }

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                message: `Merged ${inputArchives.length} archives into ${outputArchive}`,
                                outputPath: outputArchive,
                                extractedFiles,
                                finalFiles,
                                archiveType,
                            }));
                        } catch (e: any) {
                            console.error('[Bridge] /ba2/merge error:', e?.message);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: e?.message || 'Merge failed' }));
                        } finally {
                            if (mergeTempDir) {
                                try { fs.rmSync(mergeTempDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
                            }
                        }
                    });
                }

                else {
                    res.writeHead(404);
                    res.end();
                }
            } catch (error) {
                console.error('[Bridge Error]', error);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal Bridge Error' }));
            }
        });

        this.server.on('error', (e: any) => {
            if (e.code === 'EADDRINUSE') {
                console.warn(`[MOSSY] Port ${this.port} is already in use. Neural Bridge will retry or skip.`);
            } else {
                console.error('[MOSSY] Bridge Server Error:', e);
            }
        });

        this.server.listen(this.port, '127.0.0.1', () => {
            const addr = this.server?.address();
            if (addr && typeof addr === 'object') {
                this.port = addr.port; // capture the real OS-assigned port
            }
            console.log(`[MOSSY] Neural Bridge Server active on port ${this.port}`);
        });
    }

    /**
     * Low-level helper: open a TCP socket to the Blender addon, send a JSON
     * payload, wait for a response, then close.  All /execute sub-handlers and
     * executeBlenderScript use this instead of duplicating socket boilerplate.
     *
     * @param payload    JSON-serialisable object to send
     * @param timeoutMs  Socket idle timeout in ms (default 3 000)
     */
    private _blenderSend(payload: object, timeoutMs = 3_000): Promise<string> {
        return new Promise((resolve, reject) => {
            const net = require('net');
            const socket = new net.Socket();
            let finished = false;

            const cleanup = () => { try { socket.destroy(); } catch { /* ignore */ } };

            socket.setTimeout(timeoutMs);

            // The Blender add-on's token check (public/mossy_link_addon.py's
            // _validate_token) fails closed as of the 2026-08-14 security fix — a
            // missing token now means REJECTED, not accepted, unlike before. None
            // of this method's five callers (type 'blender'/'text'/'context'/
            // 'export_fbx'/'export_obj') ever attached one, so every one of them
            // started silently getting "Unauthorized" the moment a real Blender
            // add-on token existed (which happens automatically on first load —
            // see _ensure_token_initialized in the add-on). Attaching it here once,
            // centrally, instead of requiring every call site to remember — same
            // reasoning as bridgeFetch() centralizing the renderer's own auth
            // header rather than hand-duplicating it at ~30 call sites.
            const settings = this._readSettings();
            const outgoing: any = { ...payload };
            if (settings?.blenderLinkToken && outgoing.token === undefined) {
                outgoing.token = settings.blenderLinkToken;
            }

            socket.once('connect', () => {
                try { socket.write(JSON.stringify(outgoing)); }
                catch (e) { if (!finished) { finished = true; cleanup(); reject(e); } }
            });

            socket.on('data', (data: Buffer) => {
                if (finished) return;
                finished = true;
                cleanup();
                resolve(data.toString());
            });

            socket.once('timeout', () => {
                if (finished) return;
                finished = true;
                cleanup();
                reject({ type: 'timeout' });
            });

            socket.once('error', (err: any) => {
                if (finished) return;
                finished = true;
                cleanup();
                reject({ type: 'conn', error: err });
            });

            socket.once('close', () => {
                if (!finished) {
                    finished = true;
                    reject({ type: 'conn', error: new Error('Connection closed prematurely') });
                }
            });

            try {
                // Always use 127.0.0.1 — 'localhost' may resolve to ::1 (IPv6) on
                // Windows and fail if the addon is only listening on IPv4.
                socket.connect(this.addonPort, '127.0.0.1');
            } catch (e) {
                if (!finished) { finished = true; cleanup(); reject({ type: 'conn', error: e }); }
            }
        });
    }

    /**
     * Execute texture enhancement script via Blender (Neural Link).
     * Routes Python script to the Blender addon on addonPort.
     */
    async executeBlenderScript(payload: { script: string; jobId: string }): Promise<{ success: boolean; message: string }> {
        try {
            const response = await this._blenderSend(
                { type: 'texture_enhance', jobId: payload.jobId, script: payload.script },
                30_000,
            );
            console.log('[Bridge] Blender texture_enhance response:', response);
            return { success: true, message: response };
        } catch (e: any) {
            const msg = e?.error?.message ?? e?.message ?? String(e);
            console.error('[Bridge] executeBlenderScript error:', msg);
            throw new Error(msg);
        }
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
