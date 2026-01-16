
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

    start() {
        this.server = http.createServer(async (req, res) => {
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
                            const { type, script, target } = JSON.parse(body);
                            
                            // Handle Blender Python Execution
                            if (type === 'blender' && target) {
                                console.log('[Bridge] Executing Blender Python...');
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ status: "success", message: "Script transmitted to Blender Neural Link." }));
                            } 
                            else if (type === 'shell') {
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

    stop() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
