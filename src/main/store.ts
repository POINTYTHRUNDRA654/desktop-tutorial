/**
 * Data Persistence Store
 *
 * Simple JSON file-based storage.
 * Stores messages, settings, and other persistent data.
 */

import { join } from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { Message, Settings, DEFAULT_SETTINGS, InstalledProgram, AnalyticsEvent, Roadmap, ModProject } from '../shared/types';

/**
 * Database schema
 */
interface Database {
  messages: Message[];
  settings: Settings;
  projects: ModProject[];
  roadmaps: Roadmap[];
  detectedPrograms: {
    programs: InstalledProgram[];
    lastScan: number;
  };
  analytics: AnalyticsEvent[];
  metadata: {
    version: string;
    createdAt: number;
    updatedAt: number;
  };
}

/**
 * Default database structure
 */
const defaultData: Database = {
  messages: [],
  settings: DEFAULT_SETTINGS,
  projects: [],
  roadmaps: [],
  detectedPrograms: {
    programs: [],
    lastScan: 0,
  },
  analytics: [],
  metadata: {
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
};

let db: Database | null = null;
let dbPath: string;

/**
 * Initialize and get the database instance
 */
export function getStore(): Database {
  if (db) {
    return db;
  }

  // Get user data directory
  const userDataPath = app.getPath('userData');
  dbPath = join(userDataPath, 'mossy-db.json');

  // Load or initialize database
  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      const parsedData = JSON.parse(data);
      db = {
        messages: parsedData.messages || [],
        settings: { ...DEFAULT_SETTINGS, ...parsedData.settings },
        projects: parsedData.projects || [],
        roadmaps: parsedData.roadmaps || [],
        detectedPrograms: parsedData.detectedPrograms || defaultData.detectedPrograms,
        analytics: parsedData.analytics || [],
        metadata: parsedData.metadata || defaultData.metadata,
      };
    } else {
      db = { ...defaultData };
      saveToFile();
    }
  } catch (error) {
    console.warn('Error loading database, using defaults:', error);
    db = { ...defaultData };
  }

  if (!db) {
    db = { ...defaultData };
  }

  return db;
}

/**
 * Save database to file
 */
function saveToFile(): void {
  if (db && dbPath) {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    } catch (error) {
      console.error('Error saving database:', error);
    }
  }
}

/**
 * Save a message to the database
 */
export function saveMessage(message: Message): void {
  const store = getStore();
  store.messages.push(message);
  store.metadata.updatedAt = Date.now();
  saveToFile();
}

/**
 * Get all messages
 */
export function getMessages(): Message[] {
  const store = getStore();
  return store.messages;
}

/**
 * Get messages with pagination
 */
export function getMessagesPaginated(
  limit: number = 50,
  offset: number = 0
): Message[] {
  const store = getStore();
  return store.messages.slice(offset, offset + limit);
}

/**
 * Clear all messages (useful for privacy/reset)
 */
export function clearMessages(): void {
  const store = getStore();
  store.messages = [];
  store.metadata.updatedAt = Date.now();
  saveToFile();
}

/**
 * Get settings
 */
export function getSettings(): Settings {
  const store = getStore();
  return store.settings;
}

/**
 * Update settings (merge with existing)
 */
export function setSettings(newSettings: Partial<Settings>): Settings {
  const store = getStore();
  store.settings = { ...store.settings, ...newSettings };
  store.metadata.updatedAt = Date.now();
  saveToFile();
  return store.settings;
}

/**
 * Get detected programs
 */
export function getDetectedPrograms(): InstalledProgram[] {
  const store = getStore();
  return store.detectedPrograms.programs;
}

/**
 * Set detected programs
 */
export function setDetectedPrograms(programs: InstalledProgram[]): void {
  const store = getStore();
  store.detectedPrograms.programs = programs;
  store.detectedPrograms.lastScan = Date.now();
  store.metadata.updatedAt = Date.now();
  saveToFile();
}

/**
 * Get last scan timestamp
 */
export function getLastProgramScan(): number {
  const store = getStore();
  return store.detectedPrograms.lastScan;
}

/**
 * Export data (for backup/sync)
 */
export function exportData(): Database {
  const store = getStore();
  return JSON.parse(JSON.stringify(store)); // Deep clone
}

/**
 * Roadmap Management
 */
export function getRoadmaps(projectId?: string): Roadmap[] {
  const store = getStore();
  if (projectId) {
    return store.roadmaps.filter(r => r.projectId === projectId);
  }
  return store.roadmaps;
}

export function saveRoadmap(roadmap: Roadmap): void {
  const store = getStore();
  const index = store.roadmaps.findIndex(r => r.id === roadmap.id);
  if (index >= 0) {
    store.roadmaps[index] = { ...roadmap, updatedAt: Date.now() };
  } else {
    store.roadmaps.push({ ...roadmap, createdAt: Date.now(), updatedAt: Date.now() });
  }
  store.metadata.updatedAt = Date.now();
  saveToFile();
}

export function deleteRoadmap(id: string): void {
  const store = getStore();
  store.roadmaps = store.roadmaps.filter(r => r.id !== id);
  store.metadata.updatedAt = Date.now();
  saveToFile();
}

/**
 * Project Management
 */
export function getProjects(): ModProject[] {
  const store = getStore();
  return store.projects;
}

export function saveProject(project: ModProject): void {
  const store = getStore();
  const index = store.projects.findIndex(p => p.id === project.id);
  if (index >= 0) {
    store.projects[index] = { ...project, updatedAt: Date.now() };
  } else {
    store.projects.push({ ...project, createdAt: Date.now(), updatedAt: Date.now() });
  }
  store.metadata.updatedAt = Date.now();
  saveToFile();
}

/**
 * Import data (from backup/sync)
 * WARNING: This will overwrite existing data
 */
export function importData(data: Partial<Database>): void {
  const store = getStore();

  if (data.messages) {
    store.messages = data.messages;
  }

  if (data.settings) {
    store.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  }

  store.metadata.updatedAt = Date.now();
  saveToFile();
}

/**
 * Notes on SQLite migration:
 * 
 * For better performance and more complex queries, consider migrating to SQLite.
 * Recommended package: better-sqlite3
 * 
 * Example schema:
 * 
 * CREATE TABLE messages (
 *   id TEXT PRIMARY KEY,
 *   role TEXT NOT NULL,
 *   content TEXT NOT NULL,
 *   timestamp INTEGER NOT NULL
 * );
 * 
 * CREATE TABLE settings (
 *   key TEXT PRIMARY KEY,
 *   value TEXT NOT NULL
 * );
 * 
 * CREATE INDEX idx_messages_timestamp ON messages(timestamp);
 */
