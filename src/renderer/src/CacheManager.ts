import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  metadata?: Record<string, any>;
}

export interface MossyCacheSchema extends DBSchema {
  'ai-responses': {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
  'ai-context': {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
  'analysis-results': {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
  'user-sessions': {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
  'chat-history': {
    key: string;
    value: CacheEntry;
    indexes: { 'by-timestamp': number };
  };
}

export type StoreName = keyof MossyCacheSchema;
export type StoreNameLiteral = 'ai-responses' | 'ai-context' | 'analysis-results' | 'user-sessions' | 'chat-history';

class CacheManager {
  private db: IDBPDatabase<MossyCacheSchema> | null = null;
  private readonly DB_NAME = 'mossy-cache';
  private readonly DB_VERSION = 2;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<MossyCacheSchema>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // AI Responses cache
        if (!db.objectStoreNames.contains('ai-responses')) {
          const aiStore = db.createObjectStore('ai-responses', { keyPath: 'key' });
          aiStore.createIndex('by-timestamp', 'timestamp');
        }

        // AI Context cache
        if (!db.objectStoreNames.contains('ai-context')) {
          const aiContextStore = db.createObjectStore('ai-context', { keyPath: 'key' });
          aiContextStore.createIndex('by-timestamp', 'timestamp');
        }

        // Analysis Results cache
        if (!db.objectStoreNames.contains('analysis-results')) {
          const analysisStore = db.createObjectStore('analysis-results', { keyPath: 'key' });
          analysisStore.createIndex('by-timestamp', 'timestamp');
        }

        // User Sessions cache
        if (!db.objectStoreNames.contains('user-sessions')) {
          const sessionStore = db.createObjectStore('user-sessions', { keyPath: 'key' });
          sessionStore.createIndex('by-timestamp', 'timestamp');
        }

        // Chat History cache
        if (!db.objectStoreNames.contains('chat-history')) {
          const chatStore = db.createObjectStore('chat-history', { keyPath: 'key' });
          chatStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });

    // Start cleanup interval
    this.startCleanupInterval();
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async set<T>(
    storeName: StoreNameLiteral,
    key: string,
    data: T,
    ttl: number = 24 * 60 * 60 * 1000, // 24 hours default
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.db) await this.init();

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      metadata,
    };

    await this.db!.put(storeName, entry);
  }

  async get<T>(storeName: StoreNameLiteral, key: string): Promise<T | null> {
    if (!this.db) await this.init();

    const entry = await this.db!.get(storeName, key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      await this.delete(storeName, key);
      return null;
    }

    return entry.data;
  }

  async delete(storeName: StoreNameLiteral, key: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete(storeName, key);
  }

  async clear(storeName: StoreNameLiteral): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear(storeName);
  }

  async cleanup(): Promise<void> {
    if (!this.db) return;

    const now = Date.now();
    const stores: StoreNameLiteral[] = ['ai-responses', 'analysis-results', 'user-sessions', 'chat-history'];

    for (const storeName of stores) {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index('by-timestamp');

      let cursor = await index.openCursor();

      while (cursor) {
        const entry = cursor.value;
        if (now - entry.timestamp > entry.ttl) {
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }

      await tx.done;
    }
  }

  async getStats(): Promise<Record<string, number>> {
    if (!this.db) await this.init();

    const stats: Record<string, number> = {};
    const stores: StoreNameLiteral[] = ['ai-responses', 'analysis-results', 'user-sessions', 'chat-history'];

    for (const storeName of stores) {
      const count = await this.db!.count(storeName);
      stats[storeName] = count;
    }

    return stats;
  }

  // Specific methods for different data types
  async cacheAIResponse(query: string, response: any, ttl?: number): Promise<void> {
    const key = `ai-${btoa(query).slice(0, 32)}`;
    await this.set('ai-responses', key, response, ttl);
  }

  async getCachedAIResponse(query: string): Promise<any | null> {
    const key = `ai-${btoa(query).slice(0, 32)}`;
    return this.get('ai-responses', key);
  }

  async cacheAnalysisResult(filePath: string, result: any, ttl?: number): Promise<void> {
    const key = `analysis-${btoa(filePath).slice(0, 32)}`;
    await this.set('analysis-results', key, result, ttl);
  }

  async getCachedAnalysisResult(filePath: string): Promise<any | null> {
    const key = `analysis-${btoa(filePath).slice(0, 32)}`;
    return this.get('analysis-results', key);
  }

  async saveUserSession(sessionId: string, sessionData: any): Promise<void> {
    await this.set('user-sessions', sessionId, sessionData, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async loadUserSession(sessionId: string): Promise<any | null> {
    return this.get('user-sessions', sessionId);
  }

  async saveChatHistory(chatId: string, messages: any[]): Promise<void> {
    await this.set('chat-history', chatId, messages, 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  async loadChatHistory(chatId: string): Promise<any[] | null> {
    return this.get('chat-history', chatId);
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Also export the class for typing
export { CacheManager };