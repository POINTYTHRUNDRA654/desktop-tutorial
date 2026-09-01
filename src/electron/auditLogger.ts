/**
 * Centralized Audit Logger for Platform 5 (Neural Link) Integration
 * 
 * Logs all tool integration operations with timestamp, source, operation, result, and user context.
 * Stored in ~/.mossy/audit-log.json for compliance and debugging.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

export interface AuditLogEntry {
  timestamp: string;
  operation: string;
  tool: string; // 'xedit', 'blender', 'ck', 'mh2', etc.
  action: string; // 'install-script', 'launch', 'validate', 'execute', etc.
  status: 'success' | 'error' | 'warning';
  duration?: number; // milliseconds
  userId?: string;
  details?: Record<string, any>; // tool-specific details
  error?: string; // error message if status === 'error'
  result?: any; // operation result summary
}

class AuditLogger {
  private logFilePath: string;
  private maxEntriesPerFile: number = 10000;
  private entries: AuditLogEntry[] = [];

  constructor() {
    const appDataPath = path.join(os.homedir(), '.mossy');
    if (!fs.existsSync(appDataPath)) {
      fs.mkdirSync(appDataPath, { recursive: true });
    }
    this.logFilePath = path.join(appDataPath, 'audit-log.json');
    this.loadExistingLog();
  }

  private loadExistingLog(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const content = fs.readFileSync(this.logFilePath, 'utf-8');
        this.entries = JSON.parse(content);
        if (!Array.isArray(this.entries)) {
          this.entries = [];
        }
      }
    } catch (error: any) {
      console.error('[AuditLogger] Failed to load existing log:', error.message);
      this.entries = [];
    }
  }

  private saveLog(): void {
    try {
      // Keep only recent entries if exceeding max
      if (this.entries.length > this.maxEntriesPerFile) {
        this.entries = this.entries.slice(-this.maxEntriesPerFile);
      }

      fs.writeFileSync(this.logFilePath, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch (error: any) {
      console.error('[AuditLogger] Failed to save audit log:', error.message);
    }
  }

  /**
   * Log a tool integration operation
   */
  public log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const timestamp = new Date().toISOString();
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp,
    };

    this.entries.push(fullEntry);
    this.saveLog();

    // Also log to console in dev mode
    const statusEmoji = entry.status === 'success' ? '✓' : entry.status === 'error' ? '✗' : '⚠';
    console.log(
      `[Audit] ${statusEmoji} [${entry.tool}] ${entry.action}: ${entry.status}${entry.duration ? ` (${entry.duration}ms)` : ''}`
    );

    if (entry.error) {
      console.log(`[Audit] Error: ${entry.error}`);
    }
  }

  /**
   * Query audit log entries by tool and/or action
   */
  public query(options?: {
    tool?: string;
    action?: string;
    status?: 'success' | 'error' | 'warning';
    limit?: number;
  }): AuditLogEntry[] {
    let results = [...this.entries];

    if (options?.tool) {
      results = results.filter((e) => e.tool === options.tool);
    }
    if (options?.action) {
      results = results.filter((e) => e.action === options.action);
    }
    if (options?.status) {
      results = results.filter((e) => e.status === options.status);
    }

    // Return most recent first
    results.reverse();

    if (options?.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get statistics about tool usage
   */
  public getStats(): {
    totalOperations: number;
    byTool: Record<string, number>;
    byStatus: Record<string, number>;
    recentErrors: AuditLogEntry[];
  } {
    const stats = {
      totalOperations: this.entries.length,
      byTool: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      recentErrors: [] as AuditLogEntry[],
    };

    for (const entry of this.entries) {
      stats.byTool[entry.tool] = (stats.byTool[entry.tool] || 0) + 1;
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;

      if (entry.status === 'error') {
        stats.recentErrors.push(entry);
      }
    }

    // Keep only recent errors
    stats.recentErrors = stats.recentErrors.slice(-10);

    return stats;
  }

  /**
   * Clear old entries (older than specified days)
   */
  public clearOldEntries(days: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const beforeCount = this.entries.length;
    this.entries = this.entries.filter((e) => new Date(e.timestamp) > cutoffDate);
    const removedCount = beforeCount - this.entries.length;

    this.saveLog();
    console.log(`[AuditLogger] Removed ${removedCount} entries older than ${days} days`);

    return removedCount;
  }

  /**
   * Export audit log (for compliance/reporting)
   */
  public export(): string {
    return JSON.stringify(this.entries, null, 2);
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
