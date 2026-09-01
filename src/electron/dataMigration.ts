/**
 * Data Migration & Preservation System
 * 
 * Handles version-based data migration to ensure that user data, scan results,
 * and all persisted information is preserved across app updates. Only system
 * defaults should be updated; user-created content persists.
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export interface MigrationManifest {
    previousVersion: string;
    currentVersion: string;
    migratedAt: number;
    preservedDataSources: string[]; // List of data sources that were preserved
}

/**
 * Data sources that should be preserved across updates
 * These include scan results, user settings, knowledge vault, projects, etc.
 * CRITICAL: These keys are NEVER cleared, even during fresh installs or reinstalls.
 */
const PRESERVED_DATA_SOURCES = [
    'mossy_scan_auditor',           // Auditor scan results
    'mossy_scan_summary',           // Program detection summary (NEVER CLEAR)
    'mossy_all_detected_apps',      // Full list of detected apps (NEVER CLEAR)
    'mossy_project_data',           // User projects
    'mossy_settings',               // User settings
    'mossy_vault_items',            // Knowledge vault items
    'mossy_load_order_cache',       // Load order analysis
    'mossy_mod_projects',           // Mod projects file
    'mossy_chat_history',           // Chat history
    'mossy_knowledge_vault',        // Knowledge vault file
    'mossy_voice_history',          // Voice interaction history
    'mossy_workflow_state',         // Saved workflow state
    'mossy_automation_state',       // Automation settings
    'mossy_roadmap',                // Roadmaps
    'mossy_onboarding_completed',   // Onboarding completion (preserve across reinstalls)
    'mossy_has_booted',             // Boot completion flag
];

/**
 * File-based data that persists in userData folder
 */
const PRESERVED_FILES = [
    'settings.json',
    'knowledge-vault.json',
    'mod-projects.json',
    'chat-history.json',
    'voice-history.json',
    'automation-state.json',
];

/**
 * Get the version from package.json
 */
export function getCurrentVersion(): string {
    try {
        const packagePath = path.join(app.getAppPath(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        return pkg.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

/**
 * Get the stored version from userData/migration.json
 */
function getStoredVersion(userDataPath: string): string | null {
    try {
        const migrationFile = path.join(userDataPath, 'migration.json');
        if (fs.existsSync(migrationFile)) {
            const manifest = JSON.parse(fs.readFileSync(migrationFile, 'utf-8'));
            return manifest.currentVersion || null;
        }
    } catch (err) {
        console.warn('[Migration] Failed to read stored version:', err);
    }
    return null;
}

/**
 * Save migration manifest to track version changes
 */
function saveMigrationManifest(
    userDataPath: string,
    previousVersion: string,
    currentVersion: string,
    preservedSources: string[]
): void {
    try {
        const manifest: MigrationManifest = {
            previousVersion,
            currentVersion,
            migratedAt: Date.now(),
            preservedDataSources: preservedSources,
        };
        const migrationFile = path.join(userDataPath, 'migration.json');
        fs.writeFileSync(migrationFile, JSON.stringify(manifest, null, 2));
        console.log('[Migration] Saved migration manifest:', manifest);
    } catch (err) {
        console.error('[Migration] Failed to save migration manifest:', err);
    }
}

/**
 * Backup localStorage data before clearing for a fresh install
 */
function backupLocalStorageData(userDataPath: string): Map<string, string> {
    const backup = new Map<string, string>();
    try {
        // This would normally be done in renderer, but we can check in userData backups
        const backupFile = path.join(userDataPath, '.localstorage-backup.json');
        if (fs.existsSync(backupFile)) {
            const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
            Object.entries(data).forEach(([key, value]) => {
                backup.set(key, value as string);
            });
        }
    } catch (err) {
        console.warn('[Migration] Could not read localStorage backup:', err);
    }
    return backup;
}

/**
 * Check if a version update occurred and handle data preservation
 * Returns true if a migration was performed
 */
export function detectAndHandleVersionUpdate(userDataPath: string): boolean {
    const currentVersion = getCurrentVersion();
    const storedVersion = getStoredVersion(userDataPath);

    if (!storedVersion) {
        console.log('[Migration] No previous version found – first launch or fresh install');
        saveMigrationManifest(userDataPath, '0.0.0', currentVersion, []);
        return false;
    }

    if (storedVersion === currentVersion) {
        console.log(`[Migration] Version unchanged (${currentVersion}) – no migration needed`);
        return false;
    }

    // Version changed – perform migration
    console.log(`[Migration] Version update detected: ${storedVersion} → ${currentVersion}`);
    console.log('[Migration] Preserving user data and scan results...');

    // Back up persisted localStorage data if available
    const localStorageBackup = backupLocalStorageData(userDataPath);
    const preservedSources: string[] = [];

    // Track which data sources were successfully preserved
    localStorageBackup.forEach((_value, key) => {
        if (PRESERVED_DATA_SOURCES.includes(key)) {
            preservedSources.push(key);
        }
    });

    // Log preserved file-based data
    PRESERVED_FILES.forEach(filename => {
        const filePath = path.join(userDataPath, filename);
        if (fs.existsSync(filePath)) {
            preservedSources.push(filename);
            console.log(`[Migration] Preserved file: ${filename}`);
        }
    });

    // Save migration manifest with preserved data list
    saveMigrationManifest(userDataPath, storedVersion, currentVersion, preservedSources);

    console.log(`[Migration] Migration complete. Preserved ${preservedSources.length} data sources.`);
    return true;
}

/**
 * Mark that a fresh-install has been processed, so it doesn't trigger again
 * This prevents the fresh-install.marker from repeatedly wiping onboarding flags
 * while preserving other user data
 */
export function markFreshInstallProcessed(userDataPath: string): void {
    try {
        const markerFile = path.join(userDataPath, '.fresh-install-processed');
        fs.writeFileSync(markerFile, Date.now().toString());
        console.log('[Migration] Marked fresh install as processed');
    } catch (err) {
        console.warn('[Migration] Failed to mark fresh install processed:', err);
    }
}

/**
 * Check if fresh install was already processed (to avoid redundant resets on every launch)
 */
export function wasFreshInstallProcessed(userDataPath: string): boolean {
    try {
        const markerFile = path.join(userDataPath, '.fresh-install-processed');
        return fs.existsSync(markerFile);
    } catch {
        return false;
    }
}

/**
 * Preload preserved localStorage data into the renderer
 * This should be called before the renderer initializes so that scan data etc. are available
 */
export function getPreservedLocalStorageData(userDataPath: string): Record<string, string> {
    const data: Record<string, string> = {};
    try {
        const backupFile = path.join(userDataPath, '.localstorage-backup.json');
        if (fs.existsSync(backupFile)) {
            const backup = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
            // Only load preserved data sources
            Object.entries(backup).forEach(([key, value]) => {
                if (PRESERVED_DATA_SOURCES.includes(key)) {
                    data[key] = value as string;
                    console.log(`[Migration] Restored localStorage: ${key}`);
                }
            });
        }
    } catch (err) {
        console.warn('[Migration] Could not restore localStorage data:', err);
    }
    return data;
}
