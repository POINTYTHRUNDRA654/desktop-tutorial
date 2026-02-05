import {
  EventEmitter
} from 'events';
import * as fs from 'fs';
import * as path from 'path';
import {
  LongitudinalMiningEngine,
  MiningStatus,
  PerformanceTrend,
  TrendData,
  PerformanceChange,
  DegradationAlert,
  HistoricalData,
  PerformancePrediction,
  SessionData,
  ModChange,
  FuturePerformancePrediction,
  ModUpdate,
  UpdateImpactAnalysis
} from '../shared/types';

export interface LongitudinalConfig {
  dataRetentionDays: number;
  trendAnalysisInterval: number; // hours
  degradationThreshold: number; // percentage
  predictionHorizon: number; // days
  enablePredictiveAlerts: boolean;
  historicalDataPath?: string;
}

export class LongitudinalMiningEngineImpl extends EventEmitter implements LongitudinalMiningEngine {
  private config: LongitudinalConfig;
  private isRunning: boolean = false;
  private historicalData: HistoricalData[] = [];
  private analysisTimer?: NodeJS.Timeout;
  private dataManager: HistoricalDataManager;

  constructor(config: LongitudinalConfig) {
    super();
    this.config = config;
    this.dataManager = new HistoricalDataManager(config.historicalDataPath);
  }

  async start(): Promise<void> {
    this.emit('status', { status: 'starting', message: 'Initializing longitudinal mining' });

    try {
      this.isRunning = true;

      // Load historical data
      this.historicalData = await this.dataManager.loadHistoricalData();

      // Clean old data
      await this.cleanOldData();

      // Start trend analysis
      this.startTrendAnalysis();

      this.emit('status', { status: 'running', message: 'Longitudinal mining active' });
    } catch (error) {
      this.emit('status', { status: 'error', message: `Failed to start longitudinal engine: ${error}` });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.emit('status', { status: 'stopping', message: 'Stopping longitudinal mining' });

    this.isRunning = false;

    // Stop analysis timer
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }

    // Save historical data
    await this.dataManager.saveHistoricalData(this.historicalData);

    this.emit('status', { status: 'stopped', message: 'Longitudinal mining stopped' });
  }

  async getStatus(): Promise<MiningStatus> {
    const dataPoints = this.historicalData.length;
    const oldestData = dataPoints > 0 ? Math.min(...this.historicalData.map(d => d.timestamp)) : Date.now();
    const daysOfData = (Date.now() - oldestData) / (1000 * 60 * 60 * 24);

    return {
      active: this.isRunning,
      progress: Math.min(daysOfData / 30 * 100, 100), // Progress based on having 30 days of data
      currentTask: this.isRunning ? 'Analyzing performance trends' : 'Idle',
      engineType: 'longitudinal',
      engine: 'longitudinal',
      startTime: Date.now()
    };
  }

  async getResults(): Promise<any> {
    const recentTrends = await this.analyzeRecentTrends();
    const degradationAlerts = await this.detectDegradationAlerts();
    const predictions = await this.generatePerformancePredictions();

    return {
      engine: 'longitudinal',
      timestamp: new Date(),
      dataPoints: this.historicalData.length,
      trends: recentTrends,
      degradationAlerts,
      predictions,
      summary: {
        averageFPS: this.calculateAverageMetric('fps'),
        averageMemory: this.calculateAverageMetric('memoryUsage'),
        averageLoadTime: this.calculateAverageMetric('loadTime'),
        trendDirection: this.determineOverallTrend(),
        dataRetention: this.config.dataRetentionDays
      },
      metadata: {
        oldestDataPoint: this.historicalData.length > 0 ? new Date(Math.min(...this.historicalData.map(d => d.timestamp))) : null,
        newestDataPoint: this.historicalData.length > 0 ? new Date(Math.max(...this.historicalData.map(d => d.timestamp))) : null,
        analysisInterval: this.config.trendAnalysisInterval
      }
    };
  }

  async trackPerformanceOverTime(sessionData: SessionData[]): Promise<PerformanceTrend[]> {
    this.emit('status', { status: 'running', message: 'Tracking performance over time' });

    const trends: PerformanceTrend[] = [];

    // Group sessions by mod combinations
    const modCombinations = new Map<string, SessionData[]>();

    for (const session of sessionData) {
      const modKey = session.mods.sort().join('|');
      if (!modCombinations.has(modKey)) {
        modCombinations.set(modKey, []);
      }
      modCombinations.get(modKey)!.push(session);
    }

    // Analyze trends for each mod combination
    for (const [modKey, sessions] of Array.from(modCombinations)) {
      if (sessions.length < 2) continue; // Need at least 2 sessions for trend analysis

      const modCombination = modKey.split('|').filter(m => m.length > 0);

      // Sort sessions by time
      sessions.sort((a, b) => a.startTime - b.startTime);

      // Extract performance metrics
      const fpsValues = sessions.map(s => s.averageFPS);
      const memoryValues = sessions.map(s => s.peakRAM);
      const loadTimeValues = sessions.map(s => s.endTime - s.startTime); // Approximate load time
      const stabilityValues = sessions.map(s => 1.0); // Placeholder for stability

      const timestamps = sessions.map(s => s.startTime);

      // Calculate trend data for each metric
      const fpsTrend = this.calculateTrendData(fpsValues, timestamps);
      const memoryTrend = this.calculateTrendData(memoryValues, timestamps);
      const loadTimeTrend = this.calculateTrendData(loadTimeValues, timestamps);
      const stabilityTrend = this.calculateTrendData(stabilityValues, timestamps);

      // Detect significant changes
      const significantChanges = this.detectSignificantChanges(sessions);

      // Determine overall trend
      const trendScores = [fpsTrend.trend, memoryTrend.trend, loadTimeTrend.trend, stabilityTrend.trend];
      const improving = trendScores.filter(t => t === 'increasing').length;
      const degrading = trendScores.filter(t => t === 'decreasing').length;
      const overallTrend = improving > degrading ? 'improving' : degrading > improving ? 'degrading' : 'stable';

      trends.push({
        modCombination,
        timeRange: {
          start: sessions[0].startTime,
          end: sessions[sessions.length - 1].endTime
        },
        metrics: {
          fps: fpsTrend,
          memory: memoryTrend,
          loadTime: loadTimeTrend,
          stability: stabilityTrend
        },
        significantChanges,
        overallTrend
      });
    }

    this.emit('status', { status: 'completed', message: 'Performance tracking completed' });

    return trends;
  }

  async detectPerformanceDegradation(trends: PerformanceTrend[]): Promise<DegradationAlert[]> {
    const alerts: DegradationAlert[] = [];

    for (const trend of trends) {
      // Check for degradation in key metrics
      if (trend.metrics.fps.trend === 'decreasing' && trend.metrics.fps.slope < -5) {
        alerts.push({
          severity: trend.metrics.fps.slope < -10 ? 'critical' : 'high',
          description: `FPS degradation detected for mod combination: ${trend.modCombination.join(', ')}`,
          affectedMods: trend.modCombination,
          rootCause: 'Performance trend analysis indicates declining FPS over time',
          mitigationSteps: [
            'Check for conflicting mods',
            'Update graphics drivers',
            'Consider reducing graphics settings',
            'Monitor for specific mod incompatibilities'
          ],
          predictedImpact: {
            fps: trend.metrics.fps.slope * 30, // Projected impact over 30 days
            memory: 0,
            stability: -5
          },
          timeframe: `Detected in last ${Math.round((Date.now() - trend.timeRange.start) / (1000 * 60 * 60 * 24))} days`
        });
      }

      if (trend.metrics.memory.trend === 'increasing' && trend.metrics.memory.slope > 100) {
        alerts.push({
          severity: trend.metrics.memory.slope > 200 ? 'critical' : 'medium',
          description: `Memory usage increase detected for mod combination: ${trend.modCombination.join(', ')}`,
          affectedMods: trend.modCombination,
          rootCause: 'Memory consumption trending upward over time',
          mitigationSteps: [
            'Check for memory leaks in mods',
            'Increase available RAM',
            'Disable memory-intensive mods',
            'Monitor memory usage patterns'
          ],
          predictedImpact: {
            fps: 0,
            memory: trend.metrics.memory.slope * 30,
            stability: -3
          },
          timeframe: `Detected in last ${Math.round((Date.now() - trend.timeRange.start) / (1000 * 60 * 60 * 24))} days`
        });
      }
    }

    return alerts;
  }

  async predictFuturePerformance(currentMods: string[], futureChanges: ModChange[]): Promise<FuturePerformancePrediction> {
    // Simulate the mod combination after applying changes
    let predictedMods = [...currentMods];

    for (const change of futureChanges) {
      switch (change.type) {
        case 'add':
          if (!predictedMods.includes(change.modName)) {
            predictedMods.push(change.modName);
          }
          break;
        case 'remove':
          predictedMods = predictedMods.filter(m => m !== change.modName);
          break;
        case 'update':
          // Keep the mod but note the version change
          break;
      }
    }

    // Find historical data for similar mod combinations
    const similarSessions = this.historicalData.filter(d =>
      d.mods && this.similarityScore(d.mods, predictedMods) > 0.7
    );

    if (similarSessions.length === 0) {
      return {
        timeHorizon: 30, // 30 days
        predictedMetrics: {
          modCombination: predictedMods,
          fps: 60, // Default
          memoryUsage: 4096, // Default 4GB
          loadTime: 30, // Default 30 seconds
          stabilityScore: 70,
          conflictCount: 0,
          timestamp: Date.now() + (30 * 24 * 60 * 60 * 1000),
          hardwareProfile: {} as any
        },
        confidence: 0.1,
        riskFactors: ['Insufficient historical data for this mod combination'],
        recommendedActions: ['Monitor performance closely after changes', 'Consider testing in a controlled environment first']
      };
    }

    // Calculate predicted metrics based on historical data
    const avgFPS = similarSessions.reduce((sum, s) => sum + (s.fps || 0), 0) / similarSessions.length;
    const avgMemory = similarSessions.reduce((sum, s) => sum + (s.memoryUsage || 0), 0) / similarSessions.length;
    const avgLoadTime = similarSessions.reduce((sum, s) => sum + (s.loadTime || 0), 0) / similarSessions.length;

    // Calculate confidence based on data quality and quantity
    const confidence = Math.min(similarSessions.length / 10, 0.9);

    // Identify risk factors
    const riskFactors: string[] = [];
    if (futureChanges.some(c => c.type === 'add')) {
      riskFactors.push('Adding new mods may introduce compatibility issues');
    }
    if (futureChanges.some(c => c.type === 'update')) {
      riskFactors.push('Mod updates may change performance characteristics');
    }
    if (predictedMods.length > 50) {
      riskFactors.push('High mod count increases performance risk');
    }

    return {
      timeHorizon: 30, // 30 days prediction
      predictedMetrics: {
        modCombination: predictedMods,
        fps: avgFPS,
        memoryUsage: avgMemory,
        loadTime: avgLoadTime,
        stabilityScore: 80, // Placeholder
        conflictCount: 0, // Placeholder
        timestamp: Date.now() + (30 * 24 * 60 * 60 * 1000),
        hardwareProfile: {} as any // Placeholder
      },
      confidence,
      riskFactors,
      recommendedActions: [
        'Monitor FPS and memory usage after changes',
        'Consider performance benchmarking before and after updates',
        'Have a rollback plan ready'
      ]
    };
  }

  async analyzeModUpdateImpact(updates: ModUpdate[]): Promise<UpdateImpactAnalysis[]> {
    const analyses: UpdateImpactAnalysis[] = [];

    for (const update of updates) {
      // Find historical data before and after this update
      const beforeUpdate = this.historicalData.filter(d =>
        d.timestamp < update.timestamp &&
        d.mods?.includes(update.modName)
      );

      const afterUpdate = this.historicalData.filter(d =>
        d.timestamp > update.timestamp &&
        d.mods?.includes(update.modName)
      );

      let performanceImpact = { fps: 0, memory: 0, loadTime: 0 };
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      const compatibilityChanges: string[] = [];
      const recommendations: string[] = [];

      if (beforeUpdate.length > 0 && afterUpdate.length > 0) {
        // Calculate performance impact
        const beforeAvgFPS = beforeUpdate.reduce((sum, d) => sum + (d.fps || 0), 0) / beforeUpdate.length;
        const afterAvgFPS = afterUpdate.reduce((sum, d) => sum + (d.fps || 0), 0) / afterUpdate.length;
        performanceImpact.fps = afterAvgFPS - beforeAvgFPS;

        const beforeAvgMemory = beforeUpdate.reduce((sum, d) => sum + (d.memoryUsage || 0), 0) / beforeUpdate.length;
        const afterAvgMemory = afterUpdate.reduce((sum, d) => sum + (d.memoryUsage || 0), 0) / afterUpdate.length;
        performanceImpact.memory = afterAvgMemory - beforeAvgMemory;

        const beforeAvgLoadTime = beforeUpdate.reduce((sum, d) => sum + (d.loadTime || 0), 0) / beforeUpdate.length;
        const afterAvgLoadTime = afterUpdate.reduce((sum, d) => sum + (d.loadTime || 0), 0) / afterUpdate.length;
        performanceImpact.loadTime = afterAvgLoadTime - beforeAvgLoadTime;

        // Determine risk level based on impact magnitude
        const significantImpact = Math.abs(performanceImpact.fps) > 10 ||
                                 Math.abs(performanceImpact.memory) > 200 ||
                                 Math.abs(performanceImpact.loadTime) > 2000;

        if (significantImpact) {
          riskLevel = Math.abs(performanceImpact.fps) > 20 ? 'high' : 'medium';
        }

        // Generate recommendations based on impact
        if (performanceImpact.fps < -10) {
          recommendations.push('Monitor FPS closely after update');
          recommendations.push('Consider adjusting graphics settings');
        }
        if (performanceImpact.memory > 100) {
          recommendations.push('Monitor memory usage for potential leaks');
        }
      } else {
        // No historical data available
        riskLevel = 'medium';
        recommendations.push('Limited historical data available for impact analysis');
        recommendations.push('Monitor performance closely after update');
      }

      // Analyze compatibility changes based on update type
      if (update.updateType === 'major') {
        compatibilityChanges.push('Major version update may introduce breaking changes');
        riskLevel = 'high';
      } else if (update.updateType === 'patch') {
        compatibilityChanges.push('Patch update typically maintains compatibility');
      }

      analyses.push({
        modName: update.modName,
        update,
        performanceImpact,
        compatibilityChanges,
        riskLevel,
        recommendations,
        rollbackAdvice: update.updateType === 'major' ?
          'Consider backing up saves before major updates' :
          'Standard rollback procedures apply'
      });
    }

    return analyses;
  }

  async recordPerformanceData(data: HistoricalData): Promise<void> {
    // Add timestamp if not provided
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    // Store the data
    this.historicalData.push(data);

    // Keep data within retention period
    const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    this.historicalData = this.historicalData.filter(d => d.timestamp >= cutoffTime);

    // Auto-save periodically (every 100 data points)
    if (this.historicalData.length % 100 === 0) {
      await this.dataManager.saveHistoricalData(this.historicalData);
    }

    this.emit('data-recorded', { dataPoint: data, totalPoints: this.historicalData.length });
  }

  async analyzePerformanceTrends(timeRange: { start: number; end: number }): Promise<PerformanceTrend[]> {
    this.emit('status', { status: 'running', message: 'Analyzing performance trends' });

    const relevantData = this.historicalData.filter(d =>
      d.timestamp >= timeRange.start && d.timestamp <= timeRange.end
    );

    if (relevantData.length < 2) {
      return [];
    }

    // Group by mod combinations
    const modGroups = new Map<string, HistoricalData[]>();
    relevantData.forEach(d => {
      const key = (d.mods || []).sort().join('|');
      if (!modGroups.has(key)) modGroups.set(key, []);
      modGroups.get(key)!.push(d);
    });

    const trends: PerformanceTrend[] = [];

    for (const [modKey, data] of Array.from(modGroups)) {
      if (data.length < 2) continue;
      
      const modCombination = modKey.split('|').filter(m => m.length > 0);
      
      // Calculate simple trends
      const fpsValues = data.map(d => d.fps || 0).filter(v => v > 0);
      const memoryValues = data.map(d => d.memoryUsage || 0).filter(v => v > 0);
      const loadTimeValues = data.map(d => d.loadTime || 0).filter(v => v > 0);
      
      if (fpsValues.length < 2) continue;
      
      // Simple linear trend calculation
      const fpsTrend = this.calculateSimpleTrend(fpsValues);
      const memoryTrend = this.calculateSimpleTrend(memoryValues);
      const loadTimeTrend = this.calculateSimpleTrend(loadTimeValues);
      const stabilityTrend = { trend: 'stable' as const, slope: 0, average: 80 };

      trends.push({
        modCombination,
        timeRange,
        metrics: {
          fps: {
            values: fpsValues,
            timestamps: data.map(d => d.timestamp),
            average: fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length,
            min: Math.min(...fpsValues),
            max: Math.max(...fpsValues),
            standardDeviation: this.calculateStdDev(fpsValues),
            trend: fpsTrend.trend,
            slope: fpsTrend.slope
          },
          memory: {
            values: memoryValues,
            timestamps: data.map(d => d.timestamp),
            average: memoryValues.length > 0 ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length : 0,
            min: memoryValues.length > 0 ? Math.min(...memoryValues) : 0,
            max: memoryValues.length > 0 ? Math.max(...memoryValues) : 0,
            standardDeviation: this.calculateStdDev(memoryValues),
            trend: memoryTrend.trend,
            slope: memoryTrend.slope
          },
          loadTime: {
            values: loadTimeValues,
            timestamps: data.map(d => d.timestamp),
            average: loadTimeValues.length > 0 ? loadTimeValues.reduce((a, b) => a + b, 0) / loadTimeValues.length : 0,
            min: loadTimeValues.length > 0 ? Math.min(...loadTimeValues) : 0,
            max: loadTimeValues.length > 0 ? Math.max(...loadTimeValues) : 0,
            standardDeviation: this.calculateStdDev(loadTimeValues),
            trend: loadTimeTrend.trend,
            slope: loadTimeTrend.slope
          },
          stability: {
            values: [80], // Placeholder
            timestamps: [Date.now()],
            average: 80,
            min: 80,
            max: 80,
            standardDeviation: 0,
            trend: stabilityTrend.trend,
            slope: stabilityTrend.slope
          }
        },
        significantChanges: [],
        overallTrend: fpsTrend.trend === 'increasing' ? 'improving' : fpsTrend.trend === 'decreasing' ? 'degrading' : 'stable'
      });
    }

    this.emit('status', { status: 'completed', message: 'Performance trend analysis completed' });

    return trends;
  }







  private async identifyDegradationCauses(metric: string, recentData: HistoricalData[], previousData: HistoricalData[]): Promise<string[]> {
    const causes: string[] = [];

    // Analyze mod changes
    const recentMods = new Set(recentData.flatMap(d => d.mods || []));
    const previousMods = new Set(previousData.flatMap(d => d.mods || []));

    const addedMods = Array.from(recentMods).filter(m => !previousMods.has(m));
    const removedMods = Array.from(previousMods).filter(m => !recentMods.has(m));

    if (addedMods.length > 0) {
      causes.push(`Recently added mods: ${addedMods.slice(0, 3).join(', ')}`);
    }

    if (removedMods.length > 0) {
      causes.push(`Recently removed mods: ${removedMods.slice(0, 3).join(', ')}`);
    }

    // Analyze system changes (simplified)
    const recentAvgConflicts = recentData.reduce((sum, d) => sum + (d.conflicts?.length || 0), 0) / recentData.length;
    const previousAvgConflicts = previousData.reduce((sum, d) => sum + (d.conflicts?.length || 0), 0) / previousData.length;

    if (recentAvgConflicts > previousAvgConflicts + 2) {
      causes.push('Increased mod conflicts detected');
    }

    // Hardware-related causes
    if (metric === 'fps' && recentAvgConflicts > previousAvgConflicts) {
      causes.push('Potential GPU driver issues or overheating');
    }

    if (metric === 'memoryUsage') {
      causes.push('Memory leaks or increased mod memory requirements');
    }

    return causes;
  }

  private generateDegradationActions(metric: string, degradationPercent: number): string[] {
    const actions: string[] = [];

    if (metric === 'fps') {
      actions.push('Check GPU drivers and temperatures');
      actions.push('Reduce graphics settings in mod configurations');
      if (degradationPercent > 15) {
        actions.push('Consider removing recently added graphics mods');
      }
    }

    if (metric === 'memoryUsage') {
      actions.push('Monitor for memory leaks in mods');
      actions.push('Reduce texture cache sizes');
      if (degradationPercent > 30) {
        actions.push('Consider adding more RAM or optimizing mod selection');
      }
    }

    if (metric === 'loadTime') {
      actions.push('Check disk performance and available space');
      actions.push('Defragment storage or move to SSD');
      actions.push('Reduce mod count or optimize mod loading');
    }

    return actions;
  }



  private calculateTrendData(values: number[], timestamps: number[]): TrendData {
    const n = values.length;
    const average = values.reduce((a, b) => a + b, 0) / n;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate standard deviation
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Calculate linear regression for trend
    const sumX = timestamps.reduce((sum, t, i) => sum + i, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = timestamps.reduce((sum, t, i) => sum + i * values[i], 0);
    const sumXX = timestamps.reduce((sum, t, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Determine trend direction
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (slope > 0.1) trend = 'increasing';
    else if (slope < -0.1) trend = 'decreasing';

    return {
      values,
      timestamps,
      average,
      min,
      max,
      standardDeviation,
      trend,
      slope
    };
  }

  private detectSignificantChanges(sessions: SessionData[]): PerformanceChange[] {
    const changes: PerformanceChange[] = [];

    for (let i = 1; i < sessions.length; i++) {
      const prev = sessions[i - 1];
      const curr = sessions[i];

      const fpsChange = curr.averageFPS - prev.averageFPS;
      const memoryChange = curr.peakRAM - prev.peakRAM;
      const loadTimeChange = (curr.endTime - curr.startTime) - (prev.endTime - prev.startTime);

      // Detect significant changes (more than 10% or 5 FPS)
      if (Math.abs(fpsChange) > 5 || Math.abs(fpsChange / prev.averageFPS) > 0.1) {
        changes.push({
          timestamp: curr.startTime,
          changeType: fpsChange > 0 ? 'improvement' : 'degradation',
          magnitude: Math.abs(fpsChange),
          cause: 'Performance change detected',
          confidence: 0.8
        });
      }

      if (Math.abs(memoryChange) > 100 || Math.abs(memoryChange / prev.peakRAM) > 0.1) {
        changes.push({
          timestamp: curr.startTime,
          changeType: memoryChange > 0 ? 'degradation' : 'improvement',
          magnitude: Math.abs(memoryChange),
          cause: 'Memory usage change detected',
          confidence: 0.7
        });
      }
    }

    return changes;
  }

  private similarityScore(mods1: string[], mods2: string[]): number {
    const set1 = new Set(mods1);
    const set2 = new Set(mods2);

    const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
    const union = new Set([...Array.from(set1), ...Array.from(set2)]);

    return intersection.size / union.size;
  }

  private async analyzeRecentTrends(): Promise<PerformanceTrend[]> {
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    return await this.analyzePerformanceTrends({ start: weekAgo, end: now });
  }

  private async detectDegradationAlerts(): Promise<DegradationAlert[]> {
    const trends = await this.analyzeRecentTrends();
    const degradations = await this.detectPerformanceDegradation(trends);

    return degradations; // Already returns DegradationAlert[]
  }

  private async generatePerformancePredictions(): Promise<FuturePerformancePrediction> {
    // Get current mods from recent data
    const recentData = this.historicalData.slice(-10);
    const currentMods = Array.from(new Set(recentData.flatMap(d => d.mods || [])));
    
    return await this.predictFuturePerformance(currentMods, []);
  }

  private calculateAverageMetric(metric: keyof HistoricalData): number {
    if (this.historicalData.length === 0) return 0;

    const values = this.historicalData
      .map(d => d[metric] as number)
      .filter(v => v !== undefined && !isNaN(v));

    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  private determineOverallTrend(): 'improving' | 'degrading' | 'stable' {
    const recentTrends = this.historicalData.slice(-20);
    if (recentTrends.length < 2) return 'stable';

    // Simple trend analysis based on recent data
    const recentAvg = recentTrends.slice(-10).reduce((sum, d) => sum + (d.fps || 0), 0) / Math.min(10, recentTrends.length);
    const olderAvg = recentTrends.slice(0, -10).reduce((sum, d) => sum + (d.fps || 0), 0) / Math.max(1, recentTrends.length - 10);

    if (recentAvg > olderAvg * 1.05) return 'improving';
    if (recentAvg < olderAvg * 0.95) return 'degrading';
    return 'stable';
  }

  private calculatePeriodMetrics(data: HistoricalData[]): any {
    if (data.length === 0) {
      return {
        averageFPS: 0,
        averageMemory: 0,
        averageLoadTime: 0,
        minFPS: 0,
        maxFPS: 0,
        dataPoints: 0
      };
    }

    const fpsValues = data.map(d => d.fps).filter((v): v is number => v !== undefined && !isNaN(v));
    const memoryValues = data.map(d => d.memoryUsage).filter((v): v is number => v !== undefined && !isNaN(v));
    const loadTimeValues = data.map(d => d.loadTime).filter((v): v is number => v !== undefined && !isNaN(v));

    return {
      averageFPS: fpsValues.length > 0 ? (fpsValues as number[]).reduce((a, b) => a + b, 0) / fpsValues.length : 0,
      averageMemory: memoryValues.length > 0 ? (memoryValues as number[]).reduce((a, b) => a + b, 0) / memoryValues.length : 0,
      averageLoadTime: loadTimeValues.length > 0 ? (loadTimeValues as number[]).reduce((a, b) => a + b, 0) / loadTimeValues.length : 0,
      minFPS: fpsValues.length > 0 ? Math.min(...(fpsValues as number[])) : 0,
      maxFPS: fpsValues.length > 0 ? Math.max(...(fpsValues as number[])) : 0,
      dataPoints: data.length
    };
  }

  private startTrendAnalysis(): void {
    // Run trend analysis periodically
    this.analysisTimer = setInterval(async () => {
      try {
        const trends = await this.analyzeRecentTrends();
        const alerts = await this.detectDegradationAlerts();

        // Emit alerts if any
        alerts.forEach(alert => {
          this.emit('degradation-alert', alert);
        });

      } catch (error) {
        console.error('Trend analysis error:', error);
      }
    }, this.config.trendAnalysisInterval * 60 * 60 * 1000); // Convert hours to milliseconds
  }

  private calculateSimpleTrend(values: number[]): { trend: 'increasing' | 'decreasing' | 'stable'; slope: number } {
    if (values.length < 2) return { trend: 'stable', slope: 0 };
    
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, v) => sum + v, 0);
    const sumXY = values.reduce((sum, v, i) => sum + v * i, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    const trend = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
    return { trend, slope };
  }

  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private async cleanOldData(): Promise<void> {
    const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
    const originalLength = this.historicalData.length;

    this.historicalData = this.historicalData.filter(d => d.timestamp >= cutoffTime);

    if (this.historicalData.length < originalLength) {
      console.log(`Cleaned ${originalLength - this.historicalData.length} old data points`);
    }
  }
}

class HistoricalDataManager {
  private dataPath: string;

  constructor(dataPath?: string) {
    this.dataPath = dataPath || path.join(process.cwd(), 'longitudinal-data.json');
  }

  async loadHistoricalData(): Promise<HistoricalData[]> {
    if (!fs.existsSync(this.dataPath)) {
      return [];
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
      return data.historicalData || [];
    } catch (error) {
      console.warn('Failed to load historical data:', error);
      return [];
    }
  }

  async saveHistoricalData(data: HistoricalData[]): Promise<void> {
    const saveData = {
      historicalData: data,
      lastSaved: Date.now(),
      version: '1.0'
    };

    fs.writeFileSync(this.dataPath, JSON.stringify(saveData, null, 2));
  }
}

// Export the implementation as the interface name for easier importing
export { LongitudinalMiningEngineImpl as LongitudinalMiningEngine };