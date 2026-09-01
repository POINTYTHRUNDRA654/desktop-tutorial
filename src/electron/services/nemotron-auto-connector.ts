/**
 * Nemotron Auto-Connection System
 * Automatically starts Nemotron service on app launch and manages lifecycle
 * Provides real-time status tracking to UI
 * 
 * OPTIONAL: Only activates if Nemotron was installed during setup
 */

import { ipcMain, BrowserWindow, app } from 'electron';
import { execSync } from 'child_process';
import type NemotronClient from '../../integrations/nemotron-client';

export interface NemotronConnectionState {
    isConnected: boolean;
    isConnecting: boolean;
    lastConnectAttempt: Date | null;
    errorMessage?: string;
    modelStatus?: 'loading' | 'ready' | 'error';
    serviceHealthy?: boolean;
    isInstalled?: boolean;  // NEW: Tracks if Nemotron was installed
}

class NemotronAutoConnector {
    private static instance: NemotronAutoConnector;
    private connectionState: NemotronConnectionState = {
        isConnected: false,
        isConnecting: false,
        lastConnectAttempt: null,
        isInstalled: false,  // NEW: Default to not installed
    };
    private nemotronClient: NemotronClient | null = null;
    private connectionCheckInterval: NodeJS.Timeout | null = null;
    private statusUpdateInterval: NodeJS.Timeout | null = null;
    private mainWindow: BrowserWindow | null = null;
    private nemotronDisabled = false;  // NEW: Track if disabled

    private constructor() { }

    static getInstance(): NemotronAutoConnector {
        if (!NemotronAutoConnector.instance) {
            NemotronAutoConnector.instance = new NemotronAutoConnector();
        }
        return NemotronAutoConnector.instance;
    }

    /**
     * Check if Nemotron was installed
     * Reads from Windows registry or checks file existence
     */
    private isNemotronInstalled(): boolean {
        // Allow dev testing with mock service via environment variable
        if (process.env.NEMOTRON_DEV_MODE === 'true') {
            console.log('[NemotronAutoConnector] Dev mode enabled - treating Nemotron as installed');
            return true;
        }

        // Check environment variable override
        if (process.env.NEMOTRON_DISABLED === 'true') {
            return false;
        }

        // In packaged app, check registry
        if (app.isPackaged && process.platform === 'win32') {
            try {
                // Query Windows registry for installation flag
                const output = execSync(
                    'reg query "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Mossy AI" /v NemotronInstalled',
                    { encoding: 'utf-8' }
                );
                return output.includes('1');
            } catch (error) {
                console.log('[NemotronAutoConnector] Nemotron not registered in Windows');
                return false;
            }
        }

        // In development, check if service executable exists
        const { join } = require('path');
        const servicePath = join(
            __dirname,
            app.isPackaged ? '../..' : '../../..',
            'nemotron-service',
            'nemotron-service.exe'
        );

        const fs = require('fs');
        const installed = fs.existsSync(servicePath);
        console.log(`[NemotronAutoConnector] Service path check: ${servicePath} → ${installed ? 'exists' : 'missing'}`);
        return installed;
    }

    /**
     * Initialize auto-connector with Nemotron client
     */
    initialize(client: NemotronClient, mainWindow: BrowserWindow) {
        this.nemotronClient = client;
        this.mainWindow = mainWindow;

        console.log('[Nemotron] Auto-connector initializing...');

        // Check if Nemotron is actually installed
        const installed = this.isNemotronInstalled();
        this.connectionState.isInstalled = installed;
        this.nemotronDisabled = !installed;

        console.log(`[Nemotron] Installation detected: ${installed ? 'YES ✓' : 'NO ✗'}`);

        if (!installed) {
            console.log('[Nemotron] Auto-connection skipped - not installed');
            this.connectionState.errorMessage = 'Nemotron AI not installed';
            this.setupIPCHandlers();  // Still register handlers for UI queries
            this.updateUI();
            return;
        }

        console.log('[Nemotron] Starting auto-connection system...');

        // Setup IPC handlers for status tracking
        this.setupIPCHandlers();

        // Start connection monitoring
        this.startConnectionMonitoring();

        // Trigger initial connection
        this.attemptConnection();
    }

    /**
     * Attempt to establish connection with Nemotron service
     */
    async attemptConnection(): Promise<boolean> {
        if (!this.nemotronClient) {
            console.error('[NemotronAutoConnector] Client not initialized');
            return false;
        }

        if (this.connectionState.isConnecting) {
            console.log('[NemotronAutoConnector] Already connecting...');
            return false;
        }

        this.connectionState.isConnecting = true;
        this.connectionState.lastConnectAttempt = new Date();
        this.updateUI();

        try {
            console.log('[NemotronAutoConnector] Attempting connection...');

            // Try health check
            const isHealthy = await this.nemotronClient.checkHealth();

            this.connectionState.isConnected = true;
            this.connectionState.isConnecting = false;
            this.connectionState.errorMessage = undefined;
            this.connectionState.serviceHealthy = isHealthy;

            console.log('[NemotronAutoConnector] ✓ Connected to Nemotron service');
            this.updateUI();

            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.error('[NemotronAutoConnector] Connection failed:', message);

            this.connectionState.isConnected = false;
            this.connectionState.isConnecting = false;
            this.connectionState.errorMessage = message;

            this.updateUI();

            return false;
        }
    }

    /**
     * Start monitoring connection health
     */
    private startConnectionMonitoring() {
        // Check connection every 5 seconds
        this.connectionCheckInterval = setInterval(async () => {
            if (!this.nemotronClient) return;

            try {
                // Silent health check in background
                const status = this.nemotronClient.getStatus();

                // Update connection state with latest status
                this.connectionState.serviceHealthy = status.healthy;
            } catch (error) {
                // Silently ignore background check errors
            }
        }, 5000);

        // Update UI with status every 2 seconds
        this.statusUpdateInterval = setInterval(() => {
            this.updateUI();
        }, 2000);
    }

    /**
     * Send connection status to renderer process
     */
    private updateUI() {
        if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

        try {
            this.mainWindow.webContents.send('nemotron:connection-status', {
                ...this.connectionState,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            // Window might not be ready yet
        }
    }

    /**
     * Setup IPC handlers for status queries
     */
    private setupIPCHandlers() {
        // Handler: Get current connection status
        ipcMain.handle('nemotron:get-status', () => {
            return this.connectionState;
        });

        // Handler: Force reconnection
        ipcMain.handle('nemotron:reconnect', async () => {
            return this.attemptConnection();
        });

        // Handler: Get full diagnostics
        ipcMain.handle('nemotron:get-diagnostics', async () => {
            if (!this.nemotronClient) {
                return {
                    error: 'Client not initialized',
                };
            }

            try {
                const health = await this.nemotronClient.checkHealth();
                return {
                    connection: this.connectionState,
                    health,
                    timestamp: new Date().toISOString(),
                };
            } catch (error) {
                return {
                    connection: this.connectionState,
                    error: error instanceof Error ? error.message : 'Unknown error',
                };
            }
        });

        // Handler: Wait for connection (blocks until ready)
        ipcMain.handle('nemotron:wait-for-connection', async (event, timeoutMs = 60000) => {
            const startTime = Date.now();

            while (Date.now() - startTime < timeoutMs) {
                if (this.connectionState.isConnected) {
                    return { connected: true, time: Date.now() - startTime };
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            return {
                connected: false,
                error: 'Connection timeout',
                time: Date.now() - startTime,
            };
        });
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
    }

    /**
     * Get current connection state
     */
    getState(): NemotronConnectionState {
        return { ...this.connectionState };
    }
}

export default NemotronAutoConnector;
