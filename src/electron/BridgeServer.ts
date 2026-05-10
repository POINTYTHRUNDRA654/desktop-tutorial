
import http from 'http';
import { exec, spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

/**
 * Mossy Bridge Server
 * Listens on port 21337 to provide a "Real Assistant" experience.
 * This server handles hardware telemetry, file system access, and tool execution.
 */
export class BridgeServer {
    private server: http.Server | null = null;
    private port: number = 21337;
    private addonPort: number;

    constructor(addonPort: number = 9999) {
        this.addonPort = addonPort;
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

                                        socket.on('data', (data) => {
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
                            } else if (type === 'shell') {
                                exec(script, (err, stdout, stderr) => {
                                    res.writeHead(200, { 'Content-Type': 'application/json' });
                                    res.end(JSON.stringify({ status: "success", stdout, stderr, code: err ? 1 : 0 }));
                                });
                            } else {
                                res.writeHead(400);
                                res.end(JSON.stringify({ error: "Unsupported execution type" }));
                            }
                        } catch (parseError) {
                            res.writeHead(400);
                            res.end(JSON.stringify({ error: "Invalid JSON payload" }));
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
                res.end(JSON.stringify({ error: "Internal Bridge Error" }));
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
    async executeBlenderScript(payload: {
        script: string;
        jobId: string;
    }): Promise<{ success: boolean; message: string }> {
        return new Promise((resolve, reject) => {
            const net = require('net');
            const socket = new net.Socket();
            const timeoutMs = 30000; // 30 sec for texture processing
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

            socket.on('data', (data) => {
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

            // Connect to Blender addon
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
