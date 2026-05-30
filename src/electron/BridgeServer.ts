
import http from 'http';
import { exec } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { clipboard, nativeImage, screen } from 'electron';

/**
 * Mossy Bridge Server
 * Listens on port 21337 to provide a "Real Assistant" experience.
 * This server handles hardware telemetry, file system access, and tool execution.
 */
export class BridgeServer {
    private server: http.Server | null = null;
    private port: number = 21337;
    private addonPort: number;
    private pythonPath: string = '';

    constructor(addonPort: number = 9999) {
        this.addonPort = addonPort;
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
                            
                            // Handle Blender Python Execution
                            if (type === 'blender') {
                                console.log('[Bridge] executing blender type');
                                // forward the script (or text block) to the add-on socket on port 9999
                                // this mirrors the behaviour of the Python helper that users can download.
                                const net = await import('net');
                                const timeoutMs = 3000;

                                const sendCommandToAddon = (payload: any) => {
                                    console.log('[Bridge] sendCommandToAddon payload', payload);
                                    return new Promise<string>((resolve, reject) => {
                                        const socket = new net.Socket();
                                        let finished = false;

                                        const cleanup = () => {
                                            try { socket.destroy(); } catch { /* ignore */ }
                                        };

                                        socket.setTimeout(timeoutMs);

                                        socket.on('connect', () => {
                                            console.log('[Bridge] socket connected');
                                            try {
                                                socket.write(JSON.stringify(payload));
                                            } catch (e) {
                                                console.log('[Bridge] socket write error', e);
                                            }
                                        });

                                        socket.on('data', (data: Buffer) => {
                                            console.log('[Bridge] socket data', data.toString());
                                            if (finished) return;
                                            finished = true;
                                            const str = data.toString();
                                            cleanup();
                                            resolve(str);
                                        });

                                        socket.on('timeout', () => {
                                            console.log('[Bridge] socket timeout');
                                            if (finished) return;
                                            finished = true;
                                            cleanup();
                                            reject({ type: 'timeout' });
                                        });

                                        socket.on('error', (err: any) => {
                                            console.log('[Bridge] socket error', err);
                                            if (finished) return;
                                            finished = true;
                                            cleanup();
                                            reject({ type: 'conn', error: err });
                                        });

                                        socket.on('close', () => {
                                            console.log('[Bridge] socket close');
                                            if (!finished) {
                                                finished = true;
                                                reject({ type: 'conn', error: new Error('Connection closed prematurely') });
                                            }
                                        });

                                        try {
                                            socket.connect(this.addonPort, '127.0.0.1');
                                        } catch (e) {
                                            console.log('[Bridge] socket connect throw', e);
                                            if (!finished) {
                                                finished = true;
                                                cleanup();
                                                reject({ type: 'conn', error: e });
                                            }
                                        }
                                    });
                                };

                                try {
                                    const addonPayload: any = { type: 'script', code: script };
                                    const responseText = await sendCommandToAddon(addonPayload);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: "success", message: "Blender command executed", response: responseText }));
                                } catch (e: any) {
                                    console.log('[Bridge] sendCommandToAddon failed', e);
                                    if (e?.type === 'conn') {
                                        res.writeHead(503, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ status: "error", message: `Blender addon not responding on port ${this.addonPort}. Is the addon active?` }));
                                    } else if (e?.type === 'timeout') {
                                        res.writeHead(504, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ status: "error", message: "Blender addon timed out (>3s)." }));
                                    } else {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ status: "error", message: "Bridge internal error" }));
                                    }
                                }
                            } 
                            else if (type === 'text') {
                                console.log('[Bridge] executing text type');
                                // create or update a text datablock in Blender
                                const net = await import('net');
                                const timeoutMs = 3000;

                                const sendCommandToAddon = (payload: any) => {
                                    return new Promise<string>((resolve, reject) => {
                                        const socket = new net.Socket();
                                        let finished = false;
                                        const cleanup = () => { try { socket.destroy(); } catch { /* ignore */ } };
                                        socket.setTimeout(timeoutMs);
                                        socket.on('connect', () => {
                                            socket.write(JSON.stringify(payload));
                                        });
                                        socket.on('data', (data) => {
                                            if (finished) return;
                                            finished = true;
                                            cleanup();
                                            resolve(data.toString());
                                        });
                                        socket.on('timeout', () => {
                                            if (finished) return;
                                            finished = true;
                                            cleanup();
                                            reject({ type: 'timeout' });
                                        });
                                        socket.on('error', (err: any) => {
                                            if (finished) return;
                                            finished = true;
                                            cleanup();
                                            reject({ type: 'conn', error: err });
                                        });
                                        socket.on('close', () => {
                                            if (!finished) {
                                                finished = true;
                                                reject({ type: 'conn', error: new Error('Connection closed prematurely') });
                                            }
                                        });
                                        try { socket.connect(this.addonPort, '127.0.0.1'); } catch (e) {
                                            if (!finished) {
                                                finished = true;
                                                cleanup();
                                                reject({ type: 'conn', error: e });
                                            }
                                        }
                                    });
                                };

                                try {
                                    const addonPayload: any = { type: 'text', code: script, name, run };
                                    const responseText = await sendCommandToAddon(addonPayload);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: "success", message: "Blender text updated", response: responseText }));
                                } catch (e: any) {
                                    if (e?.type === 'conn') {
                                        res.writeHead(503, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ status: "error", message: `Blender addon not responding on port ${this.addonPort}. Is the addon active?` }));
                                    } else if (e?.type === 'timeout') {
                                        res.writeHead(504, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ status: "error", message: "Blender addon timed out (>3s)." }));
                                    } else {
                                        res.writeHead(500, { 'Content-Type': 'application/json' });
                                        res.end(JSON.stringify({ status: "error", message: "Bridge internal error" }));
                                    }
                                }
                            } else if (type === 'context') {
                                // Ask Blender add-on for a full scene context snapshot
                                const netCtx = await import('net');
                                const sendCtx = (payload: any) => new Promise<string>((resolve, reject) => {
                                    const sock = new netCtx.Socket();
                                    let done = false;
                                    const cleanup = () => { try { sock.destroy(); } catch { /* ignore */ } };
                                    sock.setTimeout(3000);
                                    sock.on('connect', () => { try { sock.write(JSON.stringify(payload)); } catch (e) { if (!done) { done = true; cleanup(); reject(e); } } });
                                    sock.on('data', (d: Buffer) => { if (done) return; done = true; cleanup(); resolve(d.toString()); });
                                    sock.on('timeout', () => { if (done) return; done = true; cleanup(); reject({ type: 'timeout' }); });
                                    sock.on('error', (e: any) => { if (done) return; done = true; cleanup(); reject({ type: 'conn', error: e }); });
                                    sock.on('close', () => { if (!done) { done = true; reject({ type: 'conn', error: new Error('Closed prematurely') }); } });
                                    try { sock.connect(this.addonPort, '127.0.0.1'); } catch (e) { if (!done) { done = true; cleanup(); reject({ type: 'conn', error: e }); } }
                                });
                                try {
                                    const responseText = await sendCtx({ type: 'get_context' });
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender context', response: responseText }));
                                } catch (e: any) {
                                    const code = e?.type === 'timeout' ? 504 : 503;
                                    res.writeHead(code, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'error', message: e?.type === 'timeout' ? 'Blender addon timed out.' : `Blender addon not responding on port ${this.addonPort}.` }));
                                }

                            } else if (type === 'export_fbx') {
                                // Trigger FBX export via add-on
                                const netFbx = await import('net');
                                const sendFbx = (payload: any) => new Promise<string>((resolve, reject) => {
                                    const sock = new netFbx.Socket();
                                    let done = false;
                                    const cleanup = () => { try { sock.destroy(); } catch { /* ignore */ } };
                                    sock.setTimeout(6000);
                                    sock.on('connect', () => { try { sock.write(JSON.stringify(payload)); } catch (e) { if (!done) { done = true; cleanup(); reject(e); } } });
                                    sock.on('data', (d: Buffer) => { if (done) return; done = true; cleanup(); resolve(d.toString()); });
                                    sock.on('timeout', () => { if (done) return; done = true; cleanup(); reject({ type: 'timeout' }); });
                                    sock.on('error', (e: any) => { if (done) return; done = true; cleanup(); reject({ type: 'conn', error: e }); });
                                    sock.on('close', () => {
                                        if (!done) {
                                            done = true;
                                            reject({ type: 'conn', error: new Error('Connection closed prematurely') });
                                        }
                                    });
                                    try {
                                        sock.connect(this.addonPort, '127.0.0.1');
                                    } catch (connErr) {
                                        if (!done) { done = true; cleanup(); reject({ type: 'conn', error: connErr }); }
                                    }
                                });
                                try {
                                    const fbxPayload = {
                                        type: 'export_fbx',
                                        filepath: target || script || '',
                                        use_selection: true,
                                        bake_anim: false,
                                    };
                                    const fbxResponse = await sendFbx(fbxPayload);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender export_fbx', response: fbxResponse }));
                                } catch (e: any) {
                                    const fbxCode = e?.type === 'timeout' ? 504 : 503;
                                    res.writeHead(fbxCode, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'error', message: e?.type === 'timeout' ? 'Blender FBX export timed out (>6s).' : `Blender addon not responding on port ${this.addonPort}.` }));
                                }

                            } else if (type === 'export_obj') {
                                // Trigger OBJ export via add-on (Outfit Studio pipeline)
                                const netObj = await import('net');
                                const sendObj = (objPayload: any) => new Promise<string>((resolveO, rejectO) => {
                                    const sock = new netObj.Socket();
                                    let done = false;
                                    const cleanup = () => { try { sock.destroy(); } catch (_e) { /* ignore */ } };
                                    sock.setTimeout(6000);
                                    sock.on('connect', () => {
                                        try { sock.write(JSON.stringify(objPayload)); } catch (we) {
                                            if (!done) { done = true; cleanup(); rejectO(we); }
                                        }
                                    });
                                    sock.on('data', (d: Buffer) => {
                                        if (done) return;
                                        done = true; cleanup(); resolveO(d.toString());
                                    });
                                    sock.on('timeout', () => {
                                        if (done) return;
                                        done = true; cleanup(); rejectO({ type: 'timeout' });
                                    });
                                    sock.on('error', (e: any) => {
                                        if (done) return;
                                        done = true; cleanup(); rejectO({ type: 'conn', error: e });
                                    });
                                    sock.on('close', () => {
                                        if (!done) {
                                            done = true;
                                            rejectO({ type: 'conn', error: new Error('Connection closed prematurely') });
                                        }
                                    });
                                    try {
                                        sock.connect(this.addonPort, '127.0.0.1');
                                    } catch (connErr2) {
                                        if (!done) { done = true; cleanup(); rejectO({ type: 'conn', error: connErr2 }); }
                                    }
                                });
                                try {
                                    const exportObjPayload = {
                                        type: 'export_obj',
                                        filepath: target || script || '',
                                        use_selection: true,
                                    };
                                    const objResponse = await sendObj(exportObjPayload);
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'success', message: 'Blender export_obj', response: objResponse }));
                                } catch (e: any) {
                                    const objCode = e?.type === 'timeout' ? 504 : 503;
                                    res.writeHead(objCode, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: 'error', message: e?.type === 'timeout' ? 'Blender OBJ export timed out (>6s).' : `Blender addon not responding on port ${this.addonPort}.` }));
                                }

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
     * Execute texture enhancement script via Blender (Neural Link)
     * Routes Python script to Blender addon on addonPort
     */
    async executeBlenderScript(payload: { script: string; jobId: string }): Promise<{ success: boolean; message: string }> {
        return new Promise((resolve, reject) => {
            const net = require('net');
            const socket = new net.Socket();
            const timeoutMs = 30000;
            let finished = false;

            socket.setTimeout(timeoutMs);

            socket.on('connect', () => {
                console.log('[Bridge] Blender addon connected');
                try {
                    socket.write(JSON.stringify({
                        type: 'texture_enhance',
                        jobId: payload.jobId,
                        script: payload.script,
                    }));
                } catch (e) {
                    console.error('[Bridge] Socket write error:', e);
                    finished = true;
                    socket.destroy();
                    reject(e);
                }
            });

            socket.on('data', (data: Buffer) => {
                if (finished) return;
                finished = true;
                const response = data.toString();
                console.log('[Bridge] Blender response:', response);
                socket.destroy();
                resolve({ success: true, message: response });
            });

            socket.on('timeout', () => {
                if (finished) return;
                finished = true;
                console.log('[Bridge] Blender texture enhancement timed out');
                socket.destroy();
                reject(new Error('Blender texture enhancement timed out'));
            });

            socket.on('error', (err: any) => {
                if (finished) return;
                finished = true;
                console.error('[Bridge] Blender socket error:', err);
                socket.destroy();
                reject(err);
            });

            socket.on('close', () => {
                console.log('[Bridge] Blender socket closed');
            });

            socket.connect(this.addonPort, 'localhost');
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
