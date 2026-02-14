/**
 * Analytics Engine
 * Comprehensive analytics and metrics tracking for Mossy development workflow
 * Tracks usage patterns, performance metrics, and development insights
 */

import fs from 'fs';
import path from 'path';
import { AnalyticsEvent, TimeRange, MetricsSummary, BuildStatistics, AssetUsageReport, PerformanceHistory } from '../shared/types';

export class AnalyticsEngine {
  private events: AnalyticsEvent[] = [];
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(process.cwd(), 'data', 'analytics');
    this.ensureDataDirectory();
    this.loadExistingData();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
    }
  }

  private loadExistingData(): void {
    try {
      const eventsFile = path.join(this.dataPath, 'events.json');
      if (fs.existsSync(eventsFile)) {
        const data = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
        this.events = data.events || [];
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    }
  }

  private saveData(): void {
    try {
      const eventsFile = path.join(this.dataPath, 'events.json');
      fs.writeFileSync(eventsFile, JSON.stringify({ events: this.events }, null, 2));
    } catch (error) {
      console.error('Failed to save analytics data:', error);
    }
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    this.events.push(event);
    this.saveData();
  }

  /**
   * Get aggregated metrics for a time range
   */
  async getMetrics(timeRange: TimeRange): Promise<MetricsSummary> {
    const filteredEvents = this.filterEventsByTimeRange(timeRange);

    // Calculate metrics
    const totalEvents = filteredEvents.length;
    const buildCount = filteredEvents.filter(e => e.type === 'build').length;
    const successfulBuilds = filteredEvents.filter(e => e.type === 'build' && e.success).length;
    const successRate = buildCount > 0 ? successfulBuilds / buildCount : 0;
    const averageBuildTime = this.calculateAverageBuildTime(filteredEvents);
    const assetsCreated = filteredEvents.filter(e => e.type === 'file-create').length;
    const errorsEncountered = filteredEvents.filter(e => e.type === 'error').length;
    const timeSpent = this.calculateTimeSpent(filteredEvents);
    const topFeatures = this.getTopFeatures(filteredEvents);

    return {
      totalEvents,
      buildCount,
      successRate,
      averageBuildTime,
      assetsCreated,
      errorsEncountered,
      timeSpent,
      topFeatures,
    };
  }

  /**
   * Get build statistics
   */
  async getBuildStats(): Promise<BuildStatistics> {
    const buildEvents = this.events.filter(e => e.type === 'build');

    const successfulBuilds = buildEvents.filter(e => e.success).length;
    const failedBuilds = buildEvents.filter(e => !e.success).length;
    const totalBuilds = buildEvents.length;
    const averageTime = this.calculateAverageBuildTime(this.events);

    const buildTrend = buildEvents
      .filter(e => e.duration)
      .map(e => ({
        timestamp: e.timestamp,
        value: e.duration!,
      }));

    const errorFrequency = this.getErrorFrequency(buildEvents);

    return {
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      averageTime,
      buildTrend,
      errorFrequency,
    };
  }

  /**
   * Get asset usage report
   */
  async getAssetUsage(): Promise<AssetUsageReport> {
    const assetEvents = this.events.filter(e => e.type === 'file-create' || e.type === 'tool-launch');

    const totalAssets = assetEvents.length;
    const assetsByType = this.getAssetsByType(assetEvents);
    const mostReferenced = this.getMostReferencedAssets(assetEvents);
    const unusedAssets = this.getUnusedAssets(assetEvents);
    const optimizationSavings = this.calculateOptimizationSavings(assetEvents);

    return {
      totalAssets,
      assetsByType,
      mostReferenced,
      unusedAssets,
      optimizationSavings,
    };
  }

  /**
   * Get performance history
   */
  async getPerformanceHistory(): Promise<PerformanceHistory> {
    const performanceEvents = this.events.filter(e => e.metadata && (e.metadata.fps || e.metadata.memory || e.metadata.cpu));

    const dataPoints = performanceEvents.map(e => ({
      timestamp: e.timestamp,
      fps: e.metadata.fps || 0,
      memory: e.metadata.memory || 0,
      cpu: e.metadata.cpu || 0,
    }));

    const averageFps = dataPoints.length > 0
      ? dataPoints.reduce((sum, dp) => sum + dp.fps, 0) / dataPoints.length
      : 0;

    const memoryTrend = dataPoints.map(dp => ({
      timestamp: dp.timestamp,
      value: dp.memory,
    }));

    const buildTimeTrend = this.events
      .filter(e => e.type === 'build' && e.duration)
      .map(e => ({
        timestamp: e.timestamp,
        value: e.duration!,
      }));

    return {
      dataPoints,
      averageFps,
      memoryTrend,
      buildTimeTrend,
    };
  }

  /**
   * Export analytics report
   */
  async exportReport(format: 'json' | 'csv' | 'html'): Promise<string> {
    const [metrics, buildStats, assetUsage, performanceHistory] = await Promise.all([
      this.getMetrics({ start: 0, end: Date.now(), period: 'month' }),
      this.getBuildStats(),
      this.getAssetUsage(),
      this.getPerformanceHistory(),
    ]);

    const report = {
      generatedAt: Date.now(),
      metrics,
      buildStats,
      assetUsage,
      performanceHistory,
    };

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);

      case 'csv':
        return this.generateCSVReport(report);

      case 'html':
        return this.generateHTMLReport(report);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Helper methods
  private filterEventsByTimeRange(timeRange: TimeRange): AnalyticsEvent[] {
    return this.events.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end);
  }

  private countUniqueProjects(events: AnalyticsEvent[]): number {
    const projects = new Set(events.map(e => e.metadata?.projectId).filter(Boolean));
    return projects.size;
  }

  private countAssets(events: AnalyticsEvent[]): number {
    const assets = new Set(events.map(e => e.metadata?.assetId).filter(Boolean));
    return assets.size;
  }

  private calculateAverageBuildTime(events: AnalyticsEvent[]): number {
    const buildTimes = events
      .filter(e => e.type === 'build' && e.duration)
      .map(e => e.duration!);

    return buildTimes.length > 0
      ? buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length
      : 0;
  }

  private calculateActiveDevelopmentTime(events: AnalyticsEvent[]): number {
    // Calculate time spent in active development sessions
    const sessions = events.filter(e => e.event === 'session_start' || e.event === 'session_end');
    let totalTime = 0;

    for (let i = 0; i < sessions.length - 1; i += 2) {
      if (sessions[i].event === 'session_start' && sessions[i + 1]?.event === 'session_end') {
        totalTime += sessions[i + 1].timestamp - sessions[i].timestamp;
      }
    }

    return totalTime;
  }

  private getMostUsedFeatures(events: AnalyticsEvent[]): Array<{ feature: string; usage: number }> {
    const featureCounts: Record<string, number> = {};

    events.forEach(e => {
      if (e.properties.feature) {
        featureCounts[e.properties.feature] = (featureCounts[e.properties.feature] || 0) + 1;
      }
    });

    return Object.entries(featureCounts)
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);
  }

  private getAssetTypeDistribution(events: AnalyticsEvent[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    events.forEach(e => {
      if (e.properties.assetType) {
        distribution[e.properties.assetType] = (distribution[e.properties.assetType] || 0) + 1;
      }
    });

    return distribution;
  }

  private getPerformanceTrends(events: AnalyticsEvent[]): Array<{ timestamp: number; value: number }> {
    // Simplified performance trend calculation
    return events
      .filter(e => e.properties.performance)
      .map(e => ({
        timestamp: e.timestamp,
        value: e.properties.performance,
      }))
      .slice(-50); // Last 50 data points
  }

  private getErrorFrequency(buildEvents: AnalyticsEvent[]): Record<string, number> {
    const errors: Record<string, number> = {};

    buildEvents
      .filter(e => e.type === 'error' || (e.type === 'build' && !e.success))
      .forEach(e => {
        const errorType = (e.metadata?.errorType as string) || 'unknown';
        errors[errorType] = (errors[errorType] || 0) + 1;
      });

    return errors;
  }

  private getToolPerformance(buildEvents: AnalyticsEvent[]): Record<string, { avgTime: number; successRate: number }> {
    const toolStats: Record<string, { times: number[]; successes: number }> = {};

    buildEvents.forEach(e => {
      const tool = e.properties.tool || 'unknown';
      if (!toolStats[tool]) {
        toolStats[tool] = { times: [], successes: 0 };
      }

      if (e.properties.duration) {
        toolStats[tool].times.push(e.properties.duration);
      }

      if (e.properties.success) {
        toolStats[tool].successes++;
      }
    });

    const result: Record<string, { avgTime: number; successRate: number }> = {};
    Object.entries(toolStats).forEach(([tool, stats]) => {
      const avgTime = stats.times.length > 0
        ? stats.times.reduce((a, b) => a + b, 0) / stats.times.length
        : 0;
      const successRate = stats.times.length > 0
        ? (stats.successes / stats.times.length) * 100
        : 0;

      result[tool] = { avgTime, successRate };
    });

    return result;
  }

  private getMemoryUsageTrend(buildEvents: AnalyticsEvent[]): Array<{ timestamp: number; usage: number }> {
    return buildEvents
      .filter(e => e.properties.memoryUsage)
      .map(e => ({
        timestamp: e.timestamp,
        usage: e.properties.memoryUsage,
      }));
  }

  private countUniqueAssets(events: AnalyticsEvent[]): number {
    const assets = new Set(events.map(e => e.properties.assetId).filter(Boolean));
    return assets.size;
  }

  private getAssetsByType(events: AnalyticsEvent[]): Record<string, number> {
    const types: Record<string, number> = {};
    events.forEach(e => {
      if (e.properties.assetType) {
        types[e.properties.assetType] = (types[e.properties.assetType] || 0) + 1;
      }
    });
    return types;
  }

  private getAssetSizeDistribution(events: AnalyticsEvent[]): Array<{ size: number; count: number }> {
    const sizes: Record<number, number> = {};
    events.forEach(e => {
      if (e.properties.assetSize) {
        const size = Math.floor(e.properties.assetSize / 1024 / 1024); // MB buckets
        sizes[size] = (sizes[size] || 0) + 1;
      }
    });
    return Object.entries(sizes).map(([size, count]) => ({ size: parseInt(size), count }));
  }

  private getMostReferencedAssets(events: AnalyticsEvent[]): Array<{ name: string; references: number }> {
    const references: Record<string, number> = {};
    events
      .filter(e => e.event === 'asset_referenced')
      .forEach(e => {
        if (e.properties.assetName) {
          references[e.properties.assetName] = (references[e.properties.assetName] || 0) + 1;
        }
      });

    return Object.entries(references)
      .map(([name, references]) => ({ name, references }))
      .sort((a, b) => b.references - a.references)
      .slice(0, 10);
  }

  private getUnusedAssets(events: AnalyticsEvent[]): string[] {
    const created = new Set(events.filter(e => e.event === 'asset_created').map(e => e.properties.assetId));
    const referenced = new Set(events.filter(e => e.event === 'asset_referenced').map(e => e.properties.assetId));

    return Array.from(created).filter(id => !referenced.has(id));
  }

  private getOptimizationOpportunities(events: AnalyticsEvent[]): Array<{ asset: string; suggestion: string; impact: number }> {
    // Simplified optimization suggestions
    return events
      .filter(e => e.properties.optimizationNeeded)
      .map(e => ({
        asset: e.properties.assetName || 'Unknown',
        suggestion: e.properties.optimizationSuggestion || 'Optimize asset',
        impact: e.properties.optimizationImpact || 1,
      }))
      .slice(0, 10);
  }

  private getAssetCreationTrend(events: AnalyticsEvent[]): Array<{ timestamp: number; count: number }> {
    const dailyCounts: Record<number, number> = {};

    events
      .filter(e => e.event === 'asset_created')
      .forEach(e => {
        const day = Math.floor(e.timestamp / (24 * 60 * 60 * 1000));
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });

    return Object.entries(dailyCounts)
      .map(([day, count]) => ({ timestamp: parseInt(day) * 24 * 60 * 60 * 1000, count }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private getErrorRateTrend(): Array<{ timestamp: number; rate: number }> {
    // Simplified error rate calculation
    const dailyErrors: Record<number, { total: number; errors: number }> = {};

    this.events.forEach(e => {
      const day = Math.floor(e.timestamp / (24 * 60 * 60 * 1000));
      if (!dailyErrors[day]) {
        dailyErrors[day] = { total: 0, errors: 0 };
      }
      dailyErrors[day].total++;
      if (e.category === 'error') {
        dailyErrors[day].errors++;
      }
    });

    return Object.entries(dailyErrors)
      .map(([day, stats]) => ({
        timestamp: parseInt(day) * 24 * 60 * 60 * 1000,
        rate: stats.total > 0 ? (stats.errors / stats.total) * 100 : 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private getFeatureUsageHistory(): Record<string, Array<{ timestamp: number; usage: number }>> {
    const featureHistory: Record<string, Array<{ timestamp: number; usage: number }>> = {};

    this.events.forEach(e => {
      if (e.properties.feature) {
        if (!featureHistory[e.properties.feature]) {
          featureHistory[e.properties.feature] = [];
        }
        featureHistory[e.properties.feature].push({
          timestamp: e.timestamp,
          usage: 1,
        });
      }
    });

    return featureHistory;
  }

  private getToolPerformanceHistory(): Record<string, Array<{ timestamp: number; duration: number }>> {
    const toolHistory: Record<string, Array<{ timestamp: number; duration: number }>> = {};

    this.events
      .filter(e => (e.event === 'build_completed' || e.event === 'build_failed') && e.properties.duration)
      .forEach(e => {
        const tool = e.properties.tool || 'unknown';
        if (!toolHistory[tool]) {
          toolHistory[tool] = [];
        }
        toolHistory[tool].push({
          timestamp: e.timestamp,
          duration: e.properties.duration,
        });
      });

    return toolHistory;
  }

  private generateCSVReport(report: any): string {
    // Simplified CSV generation
    const lines = [
      'Metric,Value',
      `Total Projects,${report.metrics.totalProjects}`,
      `Total Assets,${report.metrics.totalAssets}`,
      `Build Success Rate,${report.metrics.buildSuccessRate.toFixed(2)}%`,
      `Average Build Time,${report.metrics.avgBuildTime.toFixed(2)}ms`,
    ];

    return lines.join('\n');
  }

  private generateHTMLReport(report: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Mossy Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { margin: 10px 0; }
          .value { font-weight: bold; color: #2563eb; }
        </style>
      </head>
      <body>
        <h1>Mossy Analytics Report</h1>
        <p>Generated at: ${new Date(report.generatedAt).toLocaleString()}</p>

        <h2>Overview</h2>
        <div class="metric">Total Projects: <span class="value">${report.metrics.totalProjects}</span></div>
        <div class="metric">Total Assets: <span class="value">${report.metrics.totalAssets}</span></div>
        <div class="metric">Build Success Rate: <span class="value">${report.metrics.buildSuccessRate.toFixed(2)}%</span></div>
        <div class="metric">Average Build Time: <span class="value">${report.metrics.avgBuildTime.toFixed(2)}ms</span></div>
      </body>
      </html>
    `;
  }

  // New helper methods for simplified analytics
  private calculateTimeSpent(events: AnalyticsEvent[]): number {
    const timeEvents = events.filter(e => e.duration);
    return timeEvents.reduce((total, e) => total + (e.duration || 0), 0) / (1000 * 60); // Convert to minutes
  }

  private getTopFeatures(events: AnalyticsEvent[]): Array<{ feature: string; usage: number }> {
    const featureCounts: Record<string, number> = {};

    events.forEach(e => {
      if (e.metadata && e.metadata.feature) {
        const feature = e.metadata.feature as string;
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      }
    });

    return Object.entries(featureCounts)
      .map(([feature, usage]) => ({ feature, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);
  }

  private getAssetsByType(events: AnalyticsEvent[]): Record<string, number> {
    const typeCounts: Record<string, number> = {};

    events.forEach(e => {
      if (e.metadata && e.metadata.assetType) {
        const type = e.metadata.assetType as string;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    });

    return typeCounts;
  }

  private calculateOptimizationSavings(events: AnalyticsEvent[]): number {
    // Calculate potential space savings from unused assets
    const unusedAssets = this.getUnusedAssets(events);
    // Assume average asset size of 1MB for calculation
    return unusedAssets.length * 1024 * 1024; // bytes
  }
}