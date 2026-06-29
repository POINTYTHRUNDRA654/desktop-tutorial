
import http from 'http';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
type ElectronModule = typeof import('electron');

let electronModule: ElectronModule | null | undefined;

function getElectronModule(): ElectronModule | null {
    if (electronModule !== undefined) {
        return electronModule;
    }

    try {
        electronModule = require('electron') as ElectronModule;
    } catch {
        electronModule = null;
    }

    return electronModule;
}

/**
 * Mossy Bridge Server
 * Listens on port 21337 to provide a "Real Assistant" experience.
 * This server handles hardware telemetry, file system access, and tool execution.
 */
export class BridgeServer {
    private server: http.Server | null = null;
    private port: number;
    private addonPort: number;
    private pythonPath: string = '';

    constructor(addonPort: number = 9999, port: number = 21337) {
        this.addonPort = addonPort;
        this.port = port;
    }

    /** Set the Python executable to use for package installs. */
    setPythonPath(exePath: string): void {
        this.pythonPath = exePath;
        console.log('[Bridge] Python path configured:', exePath);
    }

    start() {
        this.server = http.createServer(async (req, res) => {
            console.log('[Bridge] incoming request', req.method, req.url);
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Private-Network');
            res.setHeader('Access-Control-Allow-Private-Network', 'true');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            const url = req.url || '/';
            const method = req.method;

            try {
                // Health Check
                if (url === '/health' && method === 'GET') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: "online", version: "6.0.0 (Neural Link Active)" }));
                }

                // Screen Capture — returns base64 PNG of the primary display
                else if (url === '/capture' && method === 'GET') {
                    try {
                        const electron = getElectronModule();
                        if (!electron) {
                            throw new Error('Electron APIs unavailable');
                        }

                        // Resolve the primary display bounds
                        const primaryDisplay = electron.screen.getPrimaryDisplay();
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
                        const electron = getElectronModule();
                        if (!electron) {
                            throw new Error('Electron APIs unavailable');
                        }

                        const text = electron.clipboard.readText();
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
                            const electron = getElectronModule();
                            if (!electron) {
                                throw new Error('Electron APIs unavailable');
                            }

                            electron.clipboard.writeText(String(text ?? ''));
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

                            } else if (type === 'shell') {
                                exec(script, (err, stdout, stderr) => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', stdout, stderr, code: err ? 1 : 0 }));
                                });
                            } else {
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
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ nodes, edges: [] }));
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

            socket.once('connect', () => {
                try { socket.write(JSON.stringify(payload)); }
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
