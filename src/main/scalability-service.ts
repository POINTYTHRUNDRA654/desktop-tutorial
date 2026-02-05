/**
 * Scalability Service
 *
 * Provides database integration, caching layers, and distributed processing
 * capabilities for improved performance and horizontal scaling.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
// Lazy load sqlite3 to prevent crash if native module fails to load
// import * as sqlite3 from 'sqlite3';
import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';

export interface CacheEntry {
  key: string;
  value: any;
  expiresAt?: number;
  lastAccessed: number;
  accessCount: number;
  size: number; // bytes
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mongodb';
  connectionString?: string;
  databasePath?: string; // for SQLite
  poolSize?: number;
  enableMigrations: boolean;
  backupEnabled: boolean;
  backupInterval: number; // hours
}

export interface CacheConfig {
  maxSize: number; // MB
  defaultTTL: number; // seconds
  compressionEnabled: boolean;
  persistenceEnabled: boolean;
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
}

export interface DistributedTask {
  id: string;
  type: string;
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: number;
  assignedTo?: string; // worker ID
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
  timeout: number; // seconds
}

export interface WorkerNode {
  id: string;
  type: 'cpu' | 'gpu' | 'io';
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline';
  lastHeartbeat: number;
  tasksProcessed: number;
  performance: {
    avgResponseTime: number;
    successRate: number;
    currentLoad: number;
  };
}

export class ScalabilityService extends EventEmitter {
  private db?: any;
  private cache: Map<string, CacheEntry> = new Map();
  private workers: Map<string, Worker> = new Map();
  private workerNodes: Map<string, WorkerNode> = new Map();
  private taskQueue: DistributedTask[] = [];
  private processingTasks: Map<string, DistributedTask> = new Map();

  private readonly dataDir: string;
  private readonly config: {
    database: DatabaseConfig;
    cache: CacheConfig;
  };

  private dbBackupInterval?: NodeJS.Timeout;
  private cacheCleanupInterval?: NodeJS.Timeout;
  private taskSchedulerInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.dataDir = path.join(app.getPath('userData'), 'scalability');

    // Default configuration
    this.config = {
      database: {
        type: 'sqlite',
        databasePath: path.join(this.dataDir, 'mossy.db'),
        enableMigrations: true,
        backupEnabled: true,
        backupInterval: 24, // hours
      },
      cache: {
        maxSize: 100, // MB
        defaultTTL: 3600, // 1 hour
        compressionEnabled: true,
        persistenceEnabled: true,
        evictionPolicy: 'lru',
      },
    };

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.initializeServices();
  }

  // Database Integration
  async initializeDatabase(): Promise<void> {
    if (this.config.database.type === 'sqlite') {
      return new Promise((resolve, reject) => {
        try {
          // Lazy load sqlite3
          const sqlite3 = require('sqlite3');
          this.db = new sqlite3.Database(this.config.database.databasePath!, (err: any) => {
            if (err) {
              console.error('[Scalability] SQLite initialization error:', err);
              reject(err);
              return;
            }

            this.createTables().then(resolve).catch(reject);
          });
        } catch (err) {
          console.error('[Scalability] Failed to load sqlite3 native module:', err);
          reject(new Error('SQLite native module not available'));
        }
      });
    }
    // Would implement other database types here
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    const tables = [
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        user_id TEXT,
        session_id TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS mining_results (
        id TEXT PRIMARY KEY,
        engine_type TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        processing_time INTEGER
      )`,

      `CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        expires_at INTEGER,
        last_accessed INTEGER NOT NULL,
        access_count INTEGER DEFAULT 0,
        size INTEGER NOT NULL
      )`,
    ];

    for (const sql of tables) {
      await this.runQuery(sql);
    }

    // Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics_events(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_mining_timestamp ON mining_results(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at)',
    ];

    for (const sql of indexes) {
      await this.runQuery(sql);
    }
  }

  async runQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function(this: any, err: any) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async getQuery(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err: any, row: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async allQuery(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err: any, rows: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Caching Layer
  async get(key: string): Promise<any | null> {
    // Check memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && (!memoryEntry.expiresAt || memoryEntry.expiresAt > Date.now())) {
      memoryEntry.lastAccessed = Date.now();
      memoryEntry.accessCount++;
      await this.persistCacheEntry(memoryEntry);
      return memoryEntry.value;
    }

    // Check database cache
    if (this.db) {
      const row = await this.getQuery(
        'SELECT data, expires_at FROM cache_entries WHERE key = ? AND (expires_at IS NULL OR expires_at > ?)',
        [key, Date.now()]
      );

      if (row) {
        const value = JSON.parse(row.data);
        const entry: CacheEntry = {
          key,
          value,
          expiresAt: row.expires_at,
          lastAccessed: Date.now(),
          accessCount: 1,
          size: Buffer.byteLength(row.data, 'utf8'),
        };

        // Add to memory cache
        this.cache.set(key, entry);
        await this.persistCacheEntry(entry);

        return value;
      }
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + (ttl * 1000) : undefined;
    const data = JSON.stringify(value);
    const size = Buffer.byteLength(data, 'utf8');

    const entry: CacheEntry = {
      key,
      value,
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: 0,
      size,
    };

    // Add to memory cache
    this.cache.set(key, entry);

    // Persist to database
    await this.persistCacheEntry(entry);

    // Check cache size limits
    await this.enforceCacheLimits();
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);

    if (this.db) {
      await this.runQuery('DELETE FROM cache_entries WHERE key = ?', [key]);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();

    if (this.db) {
      await this.runQuery('DELETE FROM cache_entries');
    }
  }

  private async persistCacheEntry(entry: CacheEntry): Promise<void> {
    if (!this.db) return;

    const data = JSON.stringify(entry.value);
    await this.runQuery(
      `INSERT OR REPLACE INTO cache_entries
       (key, data, expires_at, last_accessed, access_count, size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entry.key, data, entry.expiresAt, entry.lastAccessed, entry.accessCount, entry.size]
    );
  }

  private async enforceCacheLimits(): Promise<void> {
    const maxSizeBytes = this.config.cache.maxSize * 1024 * 1024; // Convert MB to bytes
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    if (totalSize > maxSizeBytes) {
      // Evict based on policy
      const entries = Array.from(this.cache.entries());

      switch (this.config.cache.evictionPolicy) {
        case 'lru':
          entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
          break;
        case 'lfu':
          entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
          break;
        case 'fifo':
          entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed); // Using lastAccessed as proxy
          break;
      }

      // Remove oldest entries until under limit
      while (totalSize > maxSizeBytes && entries.length > 0) {
        const [key, entry] = entries.shift()!;
        this.cache.delete(key);
        await this.runQuery('DELETE FROM cache_entries WHERE key = ?', [key]);
        totalSize -= entry.size;
      }
    }
  }

  // Distributed Processing
  async submitTask(task: Omit<DistributedTask, 'id' | 'createdAt' | 'status' | 'retries'>): Promise<string> {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const distributedTask: DistributedTask = {
      ...task,
      id,
      createdAt: Date.now(),
      status: 'pending',
      retries: 0,
      maxRetries: task.maxRetries || 3,
      timeout: task.timeout || 300, // 5 minutes default
    };

    this.taskQueue.push(distributedTask);
    this.taskQueue.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));

    this.emit('taskSubmitted', distributedTask);
    return id;
  }

  async getTaskStatus(taskId: string): Promise<DistributedTask | null> {
    // Check processing tasks
    const processing = this.processingTasks.get(taskId);
    if (processing) return processing;

    // Check queue
    const queued = this.taskQueue.find(t => t.id === taskId);
    if (queued) return queued;

    return null;
  }

  private getPriorityWeight(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  }

  // Worker Management
  async registerWorker(workerId: string, capabilities: string[], type: 'cpu' | 'gpu' | 'io' = 'cpu'): Promise<void> {
    const workerNode: WorkerNode = {
      id: workerId,
      type,
      capabilities,
      status: 'idle',
      lastHeartbeat: Date.now(),
      tasksProcessed: 0,
      performance: {
        avgResponseTime: 0,
        successRate: 1.0,
        currentLoad: 0,
      },
    };

    this.workerNodes.set(workerId, workerNode);
    this.emit('workerRegistered', workerNode);
  }

  async updateWorkerStatus(workerId: string, status: WorkerNode['status'], performance?: Partial<WorkerNode['performance']>): Promise<void> {
    const worker = this.workerNodes.get(workerId);
    if (worker) {
      worker.status = status;
      worker.lastHeartbeat = Date.now();
      if (performance) {
        worker.performance = { ...worker.performance, ...performance };
      }
      this.workerNodes.set(workerId, worker);
    }
  }

  getAvailableWorkers(): WorkerNode[] {
    return Array.from(this.workerNodes.values()).filter(w => w.status === 'idle');
  }

  // Task Scheduling
  private startTaskScheduler(): void {
    this.taskSchedulerInterval = setInterval(() => {
      this.processTaskQueue();
    }, 5000); // Check every 5 seconds
  }

  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0) return;

    const availableWorkers = this.getAvailableWorkers();
    if (availableWorkers.length === 0) return;

    // Assign tasks to workers
    for (const worker of availableWorkers) {
      const suitableTask = this.taskQueue.find(task =>
        task.status === 'pending' &&
        this.isWorkerSuitableForTask(worker, task)
      );

      if (suitableTask) {
        await this.assignTaskToWorker(suitableTask, worker);
      }
    }
  }

  private isWorkerSuitableForTask(worker: WorkerNode, task: DistributedTask): boolean {
    // Check if worker has required capabilities
    if (task.payload.requiredCapabilities) {
      return task.payload.requiredCapabilities.every((cap: string) => worker.capabilities.includes(cap));
    }
    return true;
  }

  private async assignTaskToWorker(task: DistributedTask, worker: WorkerNode): Promise<void> {
    // Remove from queue
    const index = this.taskQueue.indexOf(task);
    if (index > -1) {
      this.taskQueue.splice(index, 1);
    }

    // Mark as processing
    task.status = 'processing';
    task.assignedTo = worker.id;
    this.processingTasks.set(task.id, task);

    // Update worker status
    await this.updateWorkerStatus(worker.id, 'busy');

    // Simulate task execution (would be actual worker communication)
    setTimeout(async () => {
      try {
        const result = await this.executeTask(task);
        task.status = 'completed';
        task.result = result;
        worker.tasksProcessed++;
      } catch (error) {
        task.status = 'failed';
        task.error = error instanceof Error ? error.message : 'Unknown error';

        if (task.retries < task.maxRetries) {
          task.retries++;
          task.status = 'pending';
          this.taskQueue.push(task);
        }
      }

      this.processingTasks.delete(task.id);
      await this.updateWorkerStatus(worker.id, 'idle');
      this.emit('taskCompleted', task);
    }, Math.random() * 10000 + 1000); // Simulate 1-11 seconds
  }

  private async executeTask(task: DistributedTask): Promise<any> {
    // Simulate task execution based on type
    switch (task.type) {
      case 'mining_analysis':
        return { insights: 'Analysis completed', confidence: 0.85 };

      case 'data_processing':
        return { processed: task.payload.size || 1000, duration: Math.random() * 1000 };

      case 'model_training':
        return { accuracy: 0.92, loss: 0.08, epochs: 100 };

      default:
        return { result: 'Task completed successfully' };
    }
  }

  // Database Backup
  private startDatabaseBackup(): void {
    if (!this.config.database.backupEnabled) return;

    const interval = this.config.database.backupInterval * 60 * 60 * 1000; // Convert hours to ms
    this.dbBackupInterval = setInterval(() => {
      this.performDatabaseBackup();
    }, interval);
  }

  private async performDatabaseBackup(): Promise<void> {
    if (!this.db || this.config.database.type !== 'sqlite') return;

    try {
      const backupPath = path.join(
        this.dataDir,
        'backups',
        `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`
      );

      await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.promises.copyFile(this.config.database.databasePath!, backupPath);

      // Clean old backups (keep last 7)
      const backupDir = path.dirname(backupPath);
      const files = await fs.promises.readdir(backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup_'))
        .sort()
        .reverse();

      if (backupFiles.length > 7) {
        for (const oldFile of backupFiles.slice(7)) {
          await fs.promises.unlink(path.join(backupDir, oldFile));
        }
      }

      console.log(`[Scalability] Database backup created: ${backupPath}`);
    } catch (error) {
      console.error('[Scalability] Database backup failed:', error);
    }
  }

  // Cache Cleanup
  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      this.performCacheCleanup();
    }, 60000); // Every minute
  }

  private async performCacheCleanup(): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    // Clean memory cache
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && entry.expiresAt < now) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.cache.delete(key);
    }

    // Clean database cache
    if (this.db) {
      await this.runQuery('DELETE FROM cache_entries WHERE expires_at < ?', [now]);
    }

    if (toDelete.length > 0) {
      console.log(`[Scalability] Cleaned up ${toDelete.length} expired cache entries`);
    }
  }

  // Initialization
  private async initializeServices(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.loadCacheFromDatabase();
      this.startCacheCleanup();
      this.startDatabaseBackup();
      this.startTaskScheduler();

      console.log('[Scalability] Services initialized successfully');
    } catch (error) {
      console.error('[Scalability] Failed to initialize services:', error);
    }
  }

  private async loadCacheFromDatabase(): Promise<void> {
    if (!this.db) return;

    try {
      const rows = await this.allQuery(
        'SELECT key, data, expires_at, last_accessed, access_count, size FROM cache_entries WHERE expires_at IS NULL OR expires_at > ?',
        [Date.now()]
      );

      for (const row of rows) {
        const entry: CacheEntry = {
          key: row.key,
          value: JSON.parse(row.data),
          expiresAt: row.expires_at,
          lastAccessed: row.last_accessed,
          accessCount: row.access_count,
          size: row.size,
        };
        this.cache.set(row.key, entry);
      }

      console.log(`[Scalability] Loaded ${rows.length} cache entries from database`);
    } catch (error) {
      console.error('[Scalability] Failed to load cache from database:', error);
    }
  }

  // Cleanup
  async shutdown(): Promise<void> {
    if (this.dbBackupInterval) {
      clearInterval(this.dbBackupInterval);
    }
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
    }
    if (this.taskSchedulerInterval) {
      clearInterval(this.taskSchedulerInterval);
    }

    // Close database
    if (this.db) {
      await new Promise<void>((resolve) => {
        this.db!.close((err: any) => {
          if (err) console.error('[Scalability] Error closing database:', err);
          resolve();
        });
      });
    }

    // Terminate workers
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    this.workers.clear();

    console.log('[Scalability] Services shut down');
  }
}