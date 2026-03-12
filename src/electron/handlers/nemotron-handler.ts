/**
 * Nemotron IPC Handler for Electron Main Process
 * Manages standalone Nemotron service lifecycle
 * Exposes nemotron-generate, nemotron-health, nemotron-config IPC channels
 */

import { ipcMain, app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import NemotronClient from '../../integrations/nemotron-client';
import type { GenerationRequest, GenerationResponse, NemotronConfig } from '../../integrations/nemotron-client';

let serviceProcess: ChildProcess | null = null;
let nemotronClient: NemotronClient | null = null;
let serviceStartingPromise: Promise<boolean> | null = null;

/**
 * Get the path to the standalone nemotron-service executable
 */
function getServiceExecutablePath(): string {
    if (process.env.NEMOTRON_SERVICE_PATH) {
        return process.env.NEMOTRON_SERVICE_PATH;
    }

    // In production (packaged app)
    if (app.isPackaged) {
        return join(app.getAppPath(), '..', 'nemotron-service', 'nemotron-service.exe');
    }

    // In development
    return join(__dirname, '..', '..', '..', 'nemotron-service.exe');
}

/**
 * Start the standalone Nemotron service
 */
async function startNemotronService(): Promise<boolean> {
    // If already starting, wait for that promise
    if (serviceStartingPromise) {
        return serviceStartingPromise;
    }

    serviceStartingPromise = (async () => {
        try {
            // Check if already running
            if (nemotronClient?.isAvailable()) {
                console.log('[Nemotron] Service already running');
                return true;
            }

            const executablePath = getServiceExecutablePath();
            console.log(`[Nemotron] Starting service from: ${executablePath}`);

            // Spawn the service process
            serviceProcess = spawn(executablePath, ['--port', '5000'], {
                detached: true,
                stdio: 'pipe',
                shell: false,
            });

            if (!serviceProcess || !serviceProcess.pid) {
                console.error('[Nemotron] Failed to spawn service process');
                return false;
            }

            console.log(`[Nemotron] Service started (PID: ${serviceProcess.pid})`);

            // Log service output for debugging
            serviceProcess.stdout?.on('data', (data) => {
                console.log(`[Nemotron] ${data.toString().trim()}`);
            });

            serviceProcess.stderr?.on('data', (data) => {
                console.error(`[Nemotron] ${data.toString().trim()}`);
            });

            // Detach from parent process
            if (serviceProcess.unref) {
                serviceProcess.unref();
            }

            // Wait for service to be ready (max 60 seconds)
            let retries = 60;
            while (retries > 0) {
                try {
                    await nemotronClient!.checkHealth();
                    console.log('[Nemotron] Service is ready');
                    return true;
                } catch (error) {
                    // Service not ready yet
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                retries--;
            }

            console.error('[Nemotron] Service startup timeout');
            return false;

        } catch (error) {
            console.error('[Nemotron] Error starting service:', error);
            return false;
        } finally {
            serviceStartingPromise = null;
        }
    })();

    return serviceStartingPromise;
}

/**
 * Stop the standalone Nemotron service
 */
function stopNemotronService() {
    if (serviceProcess && serviceProcess.pid) {
        try {
            console.log('[Nemotron] Stopping service');
            process.kill(serviceProcess.pid, 'SIGTERM');
            serviceProcess = null;
        } catch (error) {
            console.error('[Nemotron] Error stopping service:', error);
        }
    }
}

// Initialize Nemotron client (default: localhost:5000)
nemotronClient = new NemotronClient({
    host: process.env.NEMOTRON_HOST || 'localhost',
    port: parseInt(process.env.NEMOTRON_PORT || '5000', 10),
    enabled: process.env.NEMOTRON_ENABLED !== 'false',
});

// Auto-start service when main process is ready
if (!process.env.NEMOTRON_NO_AUTOSTART) {
    app.on('ready', () => {
        startNemotronService().catch(error => {
            console.error('[Nemotron] Failed to auto-start service:', error);
        });
    });

    // Clean up on exit
    app.on('before-quit', () => {
        stopNemotronService();
    });
}

/**
 * Handler: nemotron-generate
 * Generates text using Nemotron model
 */
ipcMain.handle('nemotron-generate', async (event, request: GenerationRequest): Promise<GenerationResponse> => {
    try {
        if (!nemotronClient) {
            throw new Error('Nemotron client not initialized');
        }

        // Ensure service is running
        const started = await startNemotronService();
        if (!started) {
            throw new Error('Failed to start Nemotron service');
        }

        const result = await nemotronClient.generate(request);
        return result;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Nemotron generation failed: ${message}`);
    }
});

/**
 * Handler: nemotron-health
 * Returns health status of Nemotron service
 */
ipcMain.handle('nemotron-health', async () => {
    if (!nemotronClient) {
        throw new Error('Nemotron client not initialized');
    }

    // Try to start service if not running
    await startNemotronService().catch(() => {
        // Ignore errors on health check
    });

    const status = nemotronClient.getStatus();
    return status;
});

/**
 * Handler: nemotron-config
 * Get or set Nemotron configuration
 */
ipcMain.handle('nemotron-config', async (event, action: string, config?: Partial<NemotronConfig>) => {
    if (!nemotronClient) {
        throw new Error('Nemotron client not initialized');
    }

    switch (action) {
        case 'get':
            return nemotronClient.getStatus();

        case 'check':
            await startNemotronService();
            await nemotronClient.checkHealth();
            return nemotronClient.getStatus();

        case 'start':
            await startNemotronService();
            return { started: true };

        case 'stop':
            stopNemotronService();
            return { stopped: true };

        case 'enable':
            nemotronClient.setEnabled(true);
            return { enabled: true };

        case 'disable':
            nemotronClient.setEnabled(false);
            stopNemotronService();
            return { enabled: false };

        default:
            throw new Error(`Unknown nemotron-config action: ${action}`);
    }
});

/**
 * Export functions for access from other modules
 */
export function getNemotronClient() {
    return nemotronClient;
}

export { nemotronClient, startNemotronService, stopNemotronService };
