/**
 * Data Persistence Store
 * 
 * Uses lowdb for simple file-based JSON storage.
 * Stores messages, settings, and other persistent data.
 * 
 * Alternative: For production, consider SQLite (better-sqlite3) for better performance
 * and more complex queries.
 */

import { join } from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { app } from 'electron';
import { Message, Settings, DEFAULT_SETTINGS } from '../shared/types';

/**
 * Database schema
 */
interface Database {
  messages: Message[];
  settings: Settings;
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
  metadata: {
    version: '1.0.0',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
};

let db: Low<Database> | null = null;

/**
 * Initialize and get the database instance
 */
export async function getStore(): Promise<Low<Database>> {
  if (db) {
    return db;
  }

  // Store database in user data directory
  const dbPath = join(app.getPath('userData'), 'data.json');
  
  const adapter = new JSONFile<Database>(dbPath);
  db = new Low(adapter, defaultData);

  // Read existing data or initialize with defaults
  await db.read();

  // Ensure data structure exists
  db.data ||= defaultData;

  // Merge with default settings (in case new settings were added)
  db.data.settings = { ...DEFAULT_SETTINGS, ...db.data.settings };

  await db.write();

  return db;
}

/**
 * Save a message to the database
 */
export async function saveMessage(message: Message): Promise<void> {
  const store = await getStore();
  store.data.messages.push(message);
  store.data.metadata.updatedAt = Date.now();
  await store.write();
}

/**
 * Get all messages
 */
export async function getMessages(): Promise<Message[]> {
  const store = await getStore();
  return store.data.messages;
}

/**
 * Get messages with pagination
 */
export async function getMessagesPaginated(
  limit: number = 50,
  offset: number = 0
): Promise<Message[]> {
  const store = await getStore();
  return store.data.messages.slice(offset, offset + limit);
}

/**
 * Clear all messages (useful for privacy/reset)
 */
export async function clearMessages(): Promise<void> {
  const store = await getStore();
  store.data.messages = [];
  store.data.metadata.updatedAt = Date.now();
  await store.write();
}

/**
 * Get settings
 */
export function getSettings(): Settings {
  if (!db || !db.data) {
    return DEFAULT_SETTINGS;
  }
  return db.data.settings;
}

/**
 * Update settings (merge with existing)
 */
export async function setSettings(newSettings: Partial<Settings>): Promise<Settings> {
  const store = await getStore();
  store.data.settings = { ...store.data.settings, ...newSettings };
  store.data.metadata.updatedAt = Date.now();
  await store.write();
  return store.data.settings;
}

/**
 * Export data (for backup/sync)
 */
export async function exportData(): Promise<Database> {
  const store = await getStore();
  return JSON.parse(JSON.stringify(store.data)); // Deep clone
}

/**
 * Import data (from backup/sync)
 * WARNING: This will overwrite existing data
 */
export async function importData(data: Partial<Database>): Promise<void> {
  const store = await getStore();
  
  if (data.messages) {
    store.data.messages = data.messages;
  }
  
  if (data.settings) {
    store.data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  }
  
  store.data.metadata.updatedAt = Date.now();
  await store.write();
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
