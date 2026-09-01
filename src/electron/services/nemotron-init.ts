/**
 * Nemotron Service Initialization
 * Integrates with Electron main process for automatic startup
 * 
 * This module:
 * 1. Imports and registers the Nemotron handler
 * 2. Initializes the auto-connector after window creation
 * 3. Handles service lifecycle with app
 */

import { app, BrowserWindow } from 'electron';
import NemotronAutoConnector from '../services/nemotron-auto-connector';

// Import handler to register IPC channels
import '../handlers/nemotron-handler';

let autoConnector: NemotronAutoConnector | null = null;

/**
 * Initialize Nemotron auto-connection system
 * Call this after creating the main window
 */
export async function initializeNemotronAutoConnection(mainWindow: BrowserWindow) {
    try {
        console.log('[Nemotron] Initialization starting from main.ts ready-to-show...');

        // Get the auto-connector singleton
        autoConnector = NemotronAutoConnector.getInstance();
        console.log('[Nemotron] Auto-connector singleton acquired');

        // Import the handler module to get access to the initialized nemotronClient
        // Note: The handler must be imported before this to ensure nemotronClient is available
        const nemotronClient = require('../handlers/nemotron-handler').getNemotronClient;

        if (nemotronClient && typeof nemotronClient === 'function') {
            const client = nemotronClient();
            if (client) {
                console.log('[Nemotron] Calling auto-connector.initialize()...');
                // Initialize auto-connector with the client
                autoConnector.initialize(client, mainWindow);
                console.log('[Nemotron] Auto-connection system initialized ✓');
                return true;
            }
        }

        console.warn('[Nemotron] Could not get Nemotron client instance');
        return false;
    } catch (error) {
        console.error('[Nemotron] Failed to initialize auto-connection:', error);
        return false;
    }
}

/**
 * Clean up Nemotron resources on app exit
 */
export function cleanupNemotron() {
    if (autoConnector) {
        autoConnector.cleanup();
        console.log('[Nemotron] Cleanup complete');
    }
}

/**
 * Get the auto-connector instance (for testing/debugging)
 */
export function getNemotronAutoConnector() {
    return autoConnector;
}

// Setup app lifecycle hooks if available
if (app && !process.env.NEMOTRON_NO_LIFECYCLE) {
    app.on('quit', () => {
        cleanupNemotron();
    });
}
