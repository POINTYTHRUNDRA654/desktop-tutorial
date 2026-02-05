/**
 * Live Session Mining Engine
 *
 * Monitors active modding sessions and extracts real-time insights
 * from Creation Kit, xEdit, NifSkope, and other modding tools.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface ProcessInfo {
  name: string;
  pid: number;
  startTime: Date;
  memoryUsage: number;
  cpuUsage: number;
  sessionType: 'creation_kit' | 'xedit' | 'nifskope' | 'other';
}

export interface FileChange {
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  timestamp: Date;
  size?: number;
  processId?: number;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage: number;
  timestamp: Date;
  processId: number;
}

export interface MemoryLeakIndicator {
  processId: number;
  memoryGrowthRate: number; // MB per minute
  timeWindow: number; // minutes
  confidence: number; // 0-1
  potentialCulprits: string[];
}

export interface LiveSessionMiningResult {
  activeProcesses: ProcessInfo[];
  recentFileChanges: FileChange[];
  performanceMetrics: PerformanceMetrics[];
  memoryLeakIndicators: MemoryLeakIndicator[];
  sessionInsights: string[];
}

/**
 * Live Session Mining Engine
 *
 * Monitors active modding tool sessions and extracts real-time insights
 */
export class LiveSessionMiningEngine {
  private monitoredProcesses = new Map<number, ProcessInfo>();
  private fileWatchers = new Map<string, fs.FSWatcher>();
  private performanceInterval?: NodeJS.Timeout;
  private isMonitoring = false;

  /**
   * Start live session monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('[LiveSessionMining] Starting live session monitoring...');

    // Start process monitoring
    await this.startProcessMonitoring();

    // Start file change monitoring
    await this.startFileChangeMonitoring();

    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Stop live session monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('[LiveSessionMining] Stopping live session monitoring...');

    // Clear performance monitoring
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = undefined;
    }

    // Stop file watchers
    for (const [path, watcher] of this.fileWatchers) {
      watcher.close();
    }
    this.fileWatchers.clear();

    // Clear monitored processes
    this.monitoredProcesses.clear();
  }

  /**
   * Get current live session mining results
   */
  async getCurrentResults(): Promise<LiveSessionMiningResult> {
    const activeProcesses = Array.from(this.monitoredProcesses.values());
    const recentFileChanges = await this.getRecentFileChanges();
    const performanceMetrics = await this.getPerformanceMetrics();
    const memoryLeakIndicators = await this.detectMemoryLeaks();
    const sessionInsights = this.generateSessionInsights(activeProcesses, performanceMetrics, memoryLeakIndicators);

    return {
      activeProcesses,
      recentFileChanges,
      performanceMetrics,
      memoryLeakIndicators,
      sessionInsights
    };
  }

  /**
   * Start monitoring modding tool processes
   */
  private async startProcessMonitoring(): Promise<void> {
    // Monitor for Creation Kit, xEdit, NifSkope processes
    const targetProcesses = [
      'CreationKit.exe',
      'SSEEdit.exe', 'FO4Edit.exe', 'TES5Edit.exe',
      'NifSkope.exe'
    ];

    // Use PowerShell to get process information
    const psCommand = `
      Get-Process | Where-Object {
        $_.ProcessName -in @(${targetProcesses.map(p => `'${p.replace('.exe', '')}'`).join(',')})
      } | Select-Object Id, ProcessName, StartTime, WorkingSet64, CPU | ConvertTo-Json
    `;

    try {
      const result = await this.executePowerShell(psCommand);
      const processes = JSON.parse(result);

      for (const proc of Array.isArray(processes) ? processes : [processes]) {
        const sessionType = this.determineSessionType(proc.ProcessName);
        const processInfo: ProcessInfo = {
          name: proc.ProcessName,
          pid: proc.Id,
          startTime: new Date(proc.StartTime),
          memoryUsage: proc.WorkingSet64 / (1024 * 1024), // Convert to MB
          cpuUsage: proc.CPU || 0,
          sessionType
        };

        this.monitoredProcesses.set(proc.Id, processInfo);
      }
    } catch (error) {
      console.error('[LiveSessionMining] Error monitoring processes:', error);
    }
  }

  /**
   * Start monitoring file changes in modding directories
   */
  private async startFileChangeMonitoring(): Promise<void> {
    // Common modding directories to monitor
    const moddingPaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Data',
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Skyrim Special Edition\\Data',
      'C:\\Users\\Public\\Documents\\My Games\\Fallout4',
      'C:\\Users\\Public\\Documents\\My Games\\Skyrim Special Edition'
    ];

    for (const moddingPath of moddingPaths) {
      if (fs.existsSync(moddingPath)) {
        try {
          const watcher = fs.watch(moddingPath, { recursive: true }, (eventType, filename) => {
            if (filename) {
              const filePath = path.join(moddingPath, filename);
              const change: FileChange = {
                filePath,
                changeType: eventType === 'rename' ? 'deleted' : 'modified', // Simplified
                timestamp: new Date(),
                processId: this.getActiveProcessId()
              };

              // Store change for analysis
              this.storeFileChange(change);
            }
          });

          this.fileWatchers.set(moddingPath, watcher);
        } catch (error) {
          console.warn(`[LiveSessionMining] Could not watch ${moddingPath}:`, error);
        }
      }
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceInterval = setInterval(async () => {
      try {
        const metrics = await this.collectPerformanceMetrics();
        this.storePerformanceMetrics(metrics);
      } catch (error) {
        console.error('[LiveSessionMining] Error collecting performance metrics:', error);
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Collect current performance metrics
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    const metrics: PerformanceMetrics[] = [];

    for (const [pid, process] of this.monitoredProcesses) {
      try {
        // Get process performance data
        const psCommand = `
          $proc = Get-Process -Id ${pid} -ErrorAction SilentlyContinue;
          if ($proc) {
            @{
              pid = ${pid};
              memory = $proc.WorkingSet64 / 1MB;
              cpu = $proc.CPU;
              startTime = $proc.StartTime.ToString('o')
            } | ConvertTo-Json
          }
        `;

        const result = await this.executePowerShell(psCommand);
        if (result) {
          const data = JSON.parse(result);
          metrics.push({
            fps: await this.getCurrentFPS(pid), // Would need game integration
            memoryUsage: data.memory,
            cpuUsage: data.cpu,
            gpuUsage: 0, // Would need GPU monitoring
            timestamp: new Date(),
            processId: pid
          });
        }
      } catch (error) {
        console.error(`[LiveSessionMining] Error getting metrics for PID ${pid}:`, error);
      }
    }

    return metrics;
  }

  /**
   * Detect potential memory leaks
   */
  private async detectMemoryLeaks(): Promise<MemoryLeakIndicator[]> {
    const indicators: MemoryLeakIndicator[] = [];
    const timeWindow = 10; // 10 minutes

    for (const [pid, process] of this.monitoredProcesses) {
      try {
        // Analyze memory growth over time
        const recentMetrics = await this.getRecentMetrics(pid, timeWindow);
        if (recentMetrics.length >= 2) {
          const growthRate = this.calculateMemoryGrowthRate(recentMetrics);

          if (growthRate > 50) { // More than 50MB per minute
            indicators.push({
              processId: pid,
              memoryGrowthRate: growthRate,
              timeWindow,
              confidence: Math.min(growthRate / 100, 1), // Scale confidence
              potentialCulprits: await this.identifyPotentialCulprits(pid)
            });
          }
        }
      } catch (error) {
        console.error(`[LiveSessionMining] Error detecting memory leaks for PID ${pid}:`, error);
      }
    }

    return indicators;
  }

  /**
   * Generate insights from current session data
   */
  private generateSessionInsights(
    processes: ProcessInfo[],
    metrics: PerformanceMetrics[],
    leaks: MemoryLeakIndicator[]
  ): string[] {
    const insights: string[] = [];

    // Process insights
    if (processes.length > 0) {
      insights.push(`Active modding session with ${processes.length} tool(s) running`);
      for (const proc of processes) {
        insights.push(`${proc.name} has been running for ${this.getDurationString(proc.startTime)}`);
      }
    }

    // Performance insights
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;
    if (avgMemory > 1000) {
      insights.push(`High memory usage detected: ${avgMemory.toFixed(1)}MB average`);
    }

    // Memory leak insights
    if (leaks.length > 0) {
      insights.push(`Potential memory leak detected in ${leaks.length} process(es)`);
    }

    return insights;
  }

  // Helper methods
  private determineSessionType(processName: string): ProcessInfo['sessionType'] {
    if (processName.includes('CreationKit')) return 'creation_kit';
    if (processName.includes('Edit')) return 'xedit';
    if (processName.includes('NifSkope')) return 'nifskope';
    return 'other';
  }

  private async executePowerShell(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => stdout += data.toString());
      child.stderr.on('data', (data) => stderr += data.toString());

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`PowerShell exited with code ${code}: ${stderr}`));
        }
      });
    });
  }

  private getActiveProcessId(): number | undefined {
    // This would need more sophisticated process tracking
    return undefined;
  }

  private storeFileChange(change: FileChange): void {
    // Store in memory for now - could be persisted to database
    console.log('[LiveSessionMining] File change detected:', change);
  }

  private async getRecentFileChanges(): Promise<FileChange[]> {
    // Return recent changes from storage
    return [];
  }

  private storePerformanceMetrics(metrics: PerformanceMetrics[]): void {
    // Store metrics for analysis
    console.log('[LiveSessionMining] Performance metrics collected:', metrics.length);
  }

  private async getPerformanceMetrics(): Promise<PerformanceMetrics[]> {
    // Return recent metrics
    return [];
  }

  private async getCurrentFPS(pid: number): Promise<number> {
    // This would require game integration or external monitoring tools
    return 60; // Placeholder
  }

  private async getRecentMetrics(pid: number, minutes: number): Promise<PerformanceMetrics[]> {
    // Return metrics from the last N minutes
    return [];
  }

  private calculateMemoryGrowthRate(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) return 0;

    const sorted = metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const timeDiff = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60); // minutes
    const memoryDiff = last.memoryUsage - first.memoryUsage;

    return timeDiff > 0 ? memoryDiff / timeDiff : 0;
  }

  private async identifyPotentialCulprits(pid: number): Promise<string[]> {
    // This would analyze loaded mods, recent changes, etc.
    return ['Unknown - requires deeper analysis'];
  }

  private getDurationString(startTime: Date): string {
    const now = new Date();
    const diff = now.getTime() - startTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
}