/**
 * Panel Data Persistence Manager
 * 
 * Handles automatic saving and restoration of panel data
 * so users don't lose their work when navigating between panels.
 * 
 * Each panel can register a save/load handler pair.
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface PanelDataHandler {
    panelId: string;
    save: (data: any) => Promise<void>;
    load: () => Promise<any>;
}

const panelHandlers = new Map<string, PanelDataHandler>();
const userDataPath = app.getPath('userData');
const panelDataDir = path.join(userDataPath, 'panel-data');

// Ensure panel data directory exists
export function initializePanelDataDirectory() {
    if (!fs.existsSync(panelDataDir)) {
        fs.mkdirSync(panelDataDir, { recursive: true });
    }
}

/**
 * Get path to a panel's data file
 */
export function getPanelDataPath(panelId: string): string {
    return path.join(panelDataDir, `${panelId}.json`);
}

/**
 * Register a panel data handler
 */
export function registerPanelDataHandler(handler: PanelDataHandler) {
    panelHandlers.set(handler.panelId, handler);
}

/**
 * Save data for a specific panel
 */
export async function savePanelData(panelId: string, data: any): Promise<boolean> {
    try {
        initializePanelDataDirectory();
        const filePath = getPanelDataPath(panelId);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`[PanelData] Saved panel data for ${panelId}`);
        return true;
    } catch (error) {
        console.error(`[PanelData] Error saving panel data for ${panelId}:`, error);
        return false;
    }
}

/**
 * Load data for a specific panel
 */
export async function loadPanelData(panelId: string): Promise<any> {
    try {
        const filePath = getPanelDataPath(panelId);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            console.log(`[PanelData] Loaded panel data for ${panelId}`);
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error(`[PanelData] Error loading panel data for ${panelId}:`, error);
        return null;
    }
}

/**
 * Delete data for a specific panel
 */
export async function deletePanelData(panelId: string): Promise<boolean> {
    try {
        const filePath = getPanelDataPath(panelId);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[PanelData] Deleted panel data for ${panelId}`);
        }
        return true;
    } catch (error) {
        console.error(`[PanelData] Error deleting panel data for ${panelId}:`, error);
        return false;
    }
}

/**
 * Get all stored panel data (for backup/export)
 */
export async function getAllPanelData(): Promise<{ [panelId: string]: any }> {
    try {
        initializePanelDataDirectory();
        const files = fs.readdirSync(panelDataDir);
        const allData: { [panelId: string]: any } = {};

        for (const file of files) {
            if (file.endsWith('.json')) {
                const panelId = file.replace('.json', '');
                const filePath = path.join(panelDataDir, file);
                try {
                    const data = fs.readFileSync(filePath, 'utf-8');
                    allData[panelId] = JSON.parse(data);
                } catch (e) {
                    console.warn(`[PanelData] Skipping corrupted file: ${file}`);
                }
            }
        }

        return allData;
    } catch (error) {
        console.error('[PanelData] Error getting all panel data:', error);
        return {};
    }
}

/**
 * Clear all panel data (dangerous - use with confirmation)
 */
export async function clearAllPanelData(): Promise<boolean> {
    try {
        if (fs.existsSync(panelDataDir)) {
            const files = fs.readdirSync(panelDataDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    fs.unlinkSync(path.join(panelDataDir, file));
                }
            }
            console.log('[PanelData] Cleared all panel data');
        }
        return true;
    } catch (error) {
        console.error('[PanelData] Error clearing panel data:', error);
        return false;
    }
}
