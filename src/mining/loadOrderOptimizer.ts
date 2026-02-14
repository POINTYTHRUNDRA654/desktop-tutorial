/**
 * Load Order Optimizer Engine
 * Analyzes plugin load order, detects conflicts, resolves dependencies, and optimizes performance
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { ESPParser } from './esp-parser';
import type {
  PluginInfo,
  LoadOrderAnalysis,
  OptimizedLoadOrder,
  ConflictMatrix,
  DependencyGraph,
  PerformanceEstimate,
  OptimizationRules,
  SortingRule,
  PluginConflict,
  DependencyIssue,
  LoadOrderRecommendation,
  LoadOrderChange,
  HeatmapCell,
  DependencyNode,
  DependencyEdge,
  LoadOrderBottleneck,
  PriorityPlugin,
} from '../shared/types';

// ============================================================================
// LOAD ORDER OPTIMIZER ENGINE
// ============================================================================

export class LoadOrderOptimizerEngine {
  private pluginCache: Map<string, PluginInfo> = new Map();

  /**
   * Analyze current load order for conflicts, dependencies, and performance
   */
  async analyzeLoadOrder(plugins: PluginInfo[]): Promise<LoadOrderAnalysis> {
    const enabledPlugins = plugins.filter(p => p.enabled);
    
    // Build dependency graph
    const dependencyGraph = await this.resolveDependencies(enabledPlugins);
    
    // Detect conflicts
    const conflictMatrix = await this.detectConflicts(enabledPlugins);
    
    // Find dependency issues
    const dependencyIssues = this.findDependencyIssues(enabledPlugins, dependencyGraph);
    
    // Find circular dependencies
    const circularDependencies = this.findCircularDependencies(dependencyGraph);
    
    // Find missing masters
    const missingMasters = this.findMissingMasters(enabledPlugins);
    
    // Calculate scores
    const performanceScore = this.calculatePerformanceScore(enabledPlugins);
    const stabilityScore = this.calculateStabilityScore(enabledPlugins, dependencyIssues, conflictMatrix);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      enabledPlugins,
      conflictMatrix,
      dependencyIssues,
      circularDependencies
    );
    
    // Collect all conflicts
    const allConflicts: PluginConflict[] = [];
    for (const plugin of enabledPlugins) {
      allConflicts.push(...plugin.conflicts);
    }

    return {
      totalPlugins: plugins.length,
      enabledPlugins: enabledPlugins.length,
      conflicts: allConflicts,
      dependencyIssues,
      circularDependencies,
      missingMasters,
      performanceScore,
      stabilityScore,
      recommendations,
      conflictMatrix,
      dependencyGraph,
    };
  }

  /**
   * Generate optimized load order
   */
  async optimizeLoadOrder(plugins: PluginInfo[], rules: OptimizationRules): Promise<OptimizedLoadOrder> {
    const startTime = Date.now();
    const originalOrder = [...plugins];
    
    // Step 1: Separate plugins by type
    const esms = plugins.filter(p => p.type === 'esm');
    const esls = plugins.filter(p => p.type === 'esl');
    const esps = plugins.filter(p => p.type === 'esp');
    
    // Step 2: Build dependency graph
    const depGraph = await this.resolveDependencies(plugins);
    
    // Step 3: Apply algorithm-specific sorting
    let sortedPlugins: PluginInfo[] = [];
    
    switch (rules.algorithm) {
      case 'loot':
        sortedPlugins = await this.lootLikeSort(plugins, depGraph, rules);
        break;
      case 'boss':
        sortedPlugins = await this.bossLikeSort(plugins, depGraph, rules);
        break;
      case 'stability':
        sortedPlugins = await this.stabilitySort(plugins, depGraph);
        break;
      case 'performance':
        sortedPlugins = await this.performanceSort(plugins, depGraph);
        break;
      case 'custom':
        sortedPlugins = await this.customSort(plugins, depGraph, rules);
        break;
      default:
        sortedPlugins = [...plugins];
    }
    
    // Step 4: Apply priority overrides
    if (rules.priorityPlugins.length > 0) {
      sortedPlugins = this.applyPriorityOverrides(sortedPlugins, rules.priorityPlugins);
    }
    
    // Step 5: Apply custom rules
    if (rules.customRules.length > 0 && rules.customRules.some(r => r.enabled)) {
      sortedPlugins = await this.applyRules(sortedPlugins, rules.customRules.filter(r => r.enabled));
    }
    
    // Step 6: Validate and calculate improvements
    const originalAnalysis = await this.analyzeLoadOrder(originalOrder);
    const newAnalysis = await this.analyzeLoadOrder(sortedPlugins);
    
    const changes = this.calculateChanges(originalOrder, sortedPlugins);
    const warnings = this.validateOptimization(sortedPlugins, depGraph);
    
    return {
      plugins: sortedPlugins.map(p => p.fileName),
      changes,
      improvements: {
        conflictsResolved: Math.max(0, originalAnalysis.conflicts.length - newAnalysis.conflicts.length),
        dependenciesFixed: Math.max(0, originalAnalysis.dependencyIssues.length - newAnalysis.dependencyIssues.length),
        stabilityGain: newAnalysis.stabilityScore - originalAnalysis.stabilityScore,
        performanceGain: newAnalysis.performanceScore - originalAnalysis.performanceScore,
      },
      warnings,
      appliedRules: this.getAppliedRulesDescription(rules),
      score: {
        before: (originalAnalysis.stabilityScore + originalAnalysis.performanceScore) / 2,
        after: (newAnalysis.stabilityScore + newAnalysis.performanceScore) / 2,
      },
    };
  }

  /**
   * Detect conflicts between plugins
   */
  async detectConflicts(plugins: PluginInfo[]): Promise<ConflictMatrix> {
    const pluginNames = plugins.map(p => p.fileName);
    const size = plugins.length;
    const conflicts: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));
    const severityMap: ('none' | 'minor' | 'major' | 'critical')[][] = Array(size).fill(null).map(() => Array(size).fill('none'));
    const heatmapData: HeatmapCell[] = [];

    // Compare each plugin pair
    for (let i = 0; i < plugins.length; i++) {
      for (let j = i + 1; j < plugins.length; j++) {
        const conflictInfo = this.comparePlugins(plugins[i], plugins[j]);
        
        if (conflictInfo.count > 0) {
          conflicts[i][j] = conflictInfo.count;
          conflicts[j][i] = conflictInfo.count;
          severityMap[i][j] = conflictInfo.severity;
          severityMap[j][i] = conflictInfo.severity;
          
          heatmapData.push({
            x: i,
            y: j,
            value: conflictInfo.count,
            severity: conflictInfo.severity,
            plugins: [plugins[i].fileName, plugins[j].fileName],
          });
        }
      }
    }

    return {
      plugins: pluginNames,
      conflicts,
      severityMap,
      heatmapData,
    };
  }

  /**
   * Resolve dependencies and build graph
   */
  async resolveDependencies(plugins: PluginInfo[]): Promise<DependencyGraph> {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const pluginMap = new Map<string, PluginInfo>();
    
    plugins.forEach(p => pluginMap.set(p.fileName.toLowerCase(), p));

    // Build nodes
    for (const plugin of plugins) {
      const dependencies = plugin.masters.filter(m => pluginMap.has(m.toLowerCase()));
      const dependents = plugins.filter(p => p.masters.some(m => m.toLowerCase() === plugin.fileName.toLowerCase())).map(p => p.fileName);
      
      nodes.push({
        id: plugin.fileName,
        plugin: plugin.fileName,
        type: plugin.type,
        level: 0,
        dependencies,
        dependents,
      });
      
      // Build master edges
      for (const master of dependencies) {
        edges.push({
          from: master,
          to: plugin.fileName,
          type: 'master',
          required: true,
        });
      }
      
      // Build override edges
      for (const override of plugin.overrides) {
        if (pluginMap.has(override.toLowerCase())) {
          edges.push({
            from: override,
            to: plugin.fileName,
            type: 'override',
            required: false,
          });
        }
      }
    }

    // Calculate levels (topological sort)
    const levels = this.calculateDependencyLevels(nodes, edges);
    
    // Update node levels
    for (const node of nodes) {
      const level = levels.findIndex(lvl => lvl.includes(node.id));
      node.level = level >= 0 ? level : 0;
    }

    // Find cycles
    const cycles = this.findCycles(nodes, edges);

    return {
      nodes,
      edges,
      levels,
      cycles,
    };
  }

  /**
   * Predict performance impact of load order
   */
  async predictPerformance(plugins: PluginInfo[]): Promise<PerformanceEstimate> {
    let totalLoadTime = 0;
    let totalMemory = 0;
    let scriptLoad = 0;
    let cellLoadImpact = 0;
    const bottlenecks: LoadOrderBottleneck[] = [];

    for (const plugin of plugins) {
      if (!plugin.enabled) continue;

      // Estimate load time based on file size and record count
      const loadTime = (plugin.size / 1024 / 1024) * 0.5 + plugin.recordCount * 0.001;
      totalLoadTime += loadTime;

      // Estimate memory usage
      const memory = plugin.recordCount * 0.5 + (plugin.size / 1024);
      totalMemory += memory;

      // Script-heavy plugins
      if (plugin.fileName.toLowerCase().includes('script') || plugin.recordCount > 10000) {
        scriptLoad += plugin.recordCount * 0.01;
      }

      // Cell modifications
      if (plugin.overrides.length > 100) {
        cellLoadImpact += plugin.overrides.length * 0.1;
      }

      // Identify bottlenecks
      if (plugin.size > 100 * 1024 * 1024) {
        bottlenecks.push({
          plugin: plugin.fileName,
          type: 'large_esp',
          severity: 'high',
          impact: 25,
          suggestion: 'Consider splitting into smaller plugins or ESMs',
        });
      }

      if (plugin.overrides.length > 500) {
        bottlenecks.push({
          plugin: plugin.fileName,
          type: 'many_overrides',
          severity: 'medium',
          impact: 15,
          suggestion: 'Many record overrides may cause conflicts',
        });
      }
    }

    const overallScore = Math.max(0, 100 - (totalLoadTime * 2 + totalMemory / 100 + scriptLoad / 10 + cellLoadImpact / 50));

    return {
      loadTime: totalLoadTime,
      memoryUsage: totalMemory,
      scriptLoad,
      cellLoadImpact,
      overallScore: Math.round(overallScore),
      bottlenecks,
    };
  }

  /**
   * Apply custom sorting rules
   */
  async applyRules(plugins: PluginInfo[], rules: SortingRule[]): Promise<PluginInfo[]> {
    let result = [...plugins];
    
    // Sort rules by priority
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      if (!rule.enabled) continue;
      
      result = this.applySingleRule(result, rule);
    }
    
    return result;
  }

  /**
   * Import load order from MO2 or Vortex
   */
  async importLoadOrder(source: 'mo2' | 'vortex', sourcePath?: string): Promise<{ success: boolean; source: 'mo2' | 'vortex' | 'nmm' | 'manual'; plugins: PluginInfo[]; errors: string[] }> {
    const errors: string[] = [];

    if (!sourcePath) {
      return { success: false, source, plugins: [], errors: ['Source path is required'] };
    }

    const resolvedPath = await this.resolvePluginsFilePath(sourcePath);
    if (!resolvedPath) {
      return { success: false, source, plugins: [], errors: ['Could not find plugins.txt at source path'] };
    }

    const raw = await fs.readFile(resolvedPath, 'utf-8');
    const entries = this.parsePluginsTxt(raw);
    const baseDir = path.dirname(resolvedPath);

    const plugins: PluginInfo[] = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const pluginPath = path.join(baseDir, entry.fileName);
      if (await fs.pathExists(pluginPath)) {
        try {
          const parsed = await this.parsePlugin(pluginPath);
          plugins.push({ ...parsed, enabled: entry.enabled, loadIndex: i });
        } catch (err: any) {
          errors.push(`Failed to parse ${entry.fileName}: ${err.message || err}`);
          plugins.push(this.createMinimalPlugin(entry.fileName, pluginPath, entry.enabled, i));
        }
      } else {
        plugins.push(this.createMinimalPlugin(entry.fileName, pluginPath, entry.enabled, i));
      }
    }

    return {
      success: errors.length === 0,
      source,
      plugins,
      errors,
    };
  }

  /**
   * Export load order to MO2 or Vortex plugins.txt
   */
  async exportLoadOrder(plugins: PluginInfo[], destination: 'mo2' | 'vortex', destPath?: string): Promise<{ success: boolean; destination: 'mo2' | 'vortex' | 'manual'; filePath: string; pluginCount: number; error?: string }> {
    if (!destPath) {
      return { success: false, destination, filePath: '', pluginCount: 0, error: 'Destination path is required' };
    }

    const sorted = [...plugins].sort((a, b) => a.loadIndex - b.loadIndex);
    const lines = sorted.map(p => `${p.enabled ? '*' : ''}${p.fileName}`);
    const content = lines.join('\n');

    try {
      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, content, 'utf-8');
      return { success: true, destination, filePath: destPath, pluginCount: sorted.length };
    } catch (err: any) {
      return { success: false, destination, filePath: destPath, pluginCount: 0, error: err.message || String(err) };
    }
  }

  /**
   * Parse a single plugin file into PluginInfo
   */
  async parsePlugin(pluginPath: string): Promise<PluginInfo> {
    const cached = this.pluginCache.get(pluginPath.toLowerCase());
    if (cached) return cached;

    const stats = await fs.stat(pluginPath);
    const espData = await ESPParser.parseFile(pluginPath);
    const fileName = path.basename(pluginPath);
    const type = this.detectPluginType(fileName);
    const overrides = Array.from(new Set(espData.records.map(r => r.type)));

    const pluginInfo: PluginInfo = {
      fileName,
      filePath: pluginPath,
      enabled: true,
      type,
      masters: espData.masters,
      recordCount: espData.records.length,
      overrides,
      conflicts: [],
      loadIndex: 0,
      size: stats.size,
      modifiedDate: stats.mtime,
    };

    this.pluginCache.set(pluginPath.toLowerCase(), pluginInfo);
    return pluginInfo;
  }

  /**
   * Save optimization results to disk
   */
  async saveOptimization(optimization: OptimizedLoadOrder, filePath: string): Promise<{ success: boolean }> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(filePath, optimization, { spaces: 2 });
      return { success: true };
    } catch (err) {
      console.error('Failed to save load order optimization:', err);
      return { success: false };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private comparePlugins(plugin1: PluginInfo, plugin2: PluginInfo): { count: number; severity: 'none' | 'minor' | 'major' | 'critical' } {
    let conflictCount = 0;
    let maxSeverity: 'none' | 'minor' | 'major' | 'critical' = 'none';

    // Check for override conflicts
    const p1Overrides = new Set(plugin1.overrides.map(o => o.toLowerCase()));
    const p2Overrides = new Set(plugin2.overrides.map(o => o.toLowerCase()));
    
    for (const override of p1Overrides) {
      if (p2Overrides.has(override)) {
        conflictCount++;
        
        // Determine severity based on conflict type
        if (override.includes('navmesh')) {
          maxSeverity = 'critical';
        } else if (override.includes('cell') || override.includes('worldspace')) {
          maxSeverity = maxSeverity === 'critical' ? 'critical' : 'major';
        } else {
          maxSeverity = maxSeverity === 'none' ? 'minor' : maxSeverity;
        }
      }
    }

    return { count: conflictCount, severity: maxSeverity };
  }

  private findDependencyIssues(plugins: PluginInfo[], graph: DependencyGraph): DependencyIssue[] {
    const issues: DependencyIssue[] = [];
    const pluginSet = new Set(plugins.map(p => p.fileName.toLowerCase()));

    for (const plugin of plugins) {
      // Check for missing masters
      for (const master of plugin.masters) {
        if (!pluginSet.has(master.toLowerCase())) {
          issues.push({
            plugin: plugin.fileName,
            issue: 'missing_master',
            severity: 'error',
            description: `Missing required master: ${master}`,
            affectedPlugins: [master],
          });
        }
      }

      // Check for load order issues
      const masterIndices = plugin.masters
        .map(m => plugins.findIndex(p => p.fileName.toLowerCase() === m.toLowerCase()))
        .filter(idx => idx >= 0);
      
      const pluginIndex = plugins.findIndex(p => p.fileName === plugin.fileName);
      
      for (const masterIndex of masterIndices) {
        if (masterIndex > pluginIndex) {
          issues.push({
            plugin: plugin.fileName,
            issue: 'load_order',
            severity: 'error',
            description: `Master ${plugins[masterIndex].fileName} loads after dependent plugin`,
            affectedPlugins: [plugins[masterIndex].fileName],
          });
        }
      }
    }

    // Check for circular dependencies
    for (const cycle of graph.cycles) {
      issues.push({
        plugin: cycle[0],
        issue: 'circular',
        severity: 'warning',
        description: `Circular dependency detected: ${cycle.join(' → ')}`,
        affectedPlugins: cycle,
      });
    }

    return issues;
  }

  private findCircularDependencies(graph: DependencyGraph): string[][] {
    return graph.cycles;
  }

  private findMissingMasters(plugins: PluginInfo[]): { plugin: string; missingMaster: string }[] {
    const pluginSet = new Set(plugins.map(p => p.fileName.toLowerCase()));
    const missing: { plugin: string; missingMaster: string }[] = [];

    for (const plugin of plugins) {
      for (const master of plugin.masters) {
        if (!pluginSet.has(master.toLowerCase())) {
          missing.push({
            plugin: plugin.fileName,
            missingMaster: master,
          });
        }
      }
    }

    return missing;
  }

  private calculatePerformanceScore(plugins: PluginInfo[]): number {
    const totalSize = plugins.reduce((sum, p) => sum + p.size, 0);
    const totalRecords = plugins.reduce((sum, p) => sum + p.recordCount, 0);
    const totalOverrides = plugins.reduce((sum, p) => sum + p.overrides.length, 0);

    // Penalize large total size, many records, and excessive overrides
    const sizeScore = Math.max(0, 100 - (totalSize / 1024 / 1024 / 10));
    const recordScore = Math.max(0, 100 - (totalRecords / 1000));
    const overrideScore = Math.max(0, 100 - (totalOverrides / 50));

    return Math.round((sizeScore + recordScore + overrideScore) / 3);
  }

  private calculateStabilityScore(plugins: PluginInfo[], issues: DependencyIssue[], conflicts: ConflictMatrix): number {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const totalConflicts = conflicts.heatmapData.reduce((sum, cell) => sum + cell.value, 0);
    const criticalConflicts = conflicts.heatmapData.filter(c => c.severity === 'critical').length;

    const score = 100 - (errorCount * 10 + warningCount * 5 + criticalConflicts * 8 + (totalConflicts / 10));
    return Math.round(Math.max(0, score));
  }

  private generateRecommendations(
    plugins: PluginInfo[],
    conflicts: ConflictMatrix,
    issues: DependencyIssue[],
    cycles: string[][]
  ): LoadOrderRecommendation[] {
    const recommendations: LoadOrderRecommendation[] = [];

    // Recommend fixes for critical errors
    for (const issue of issues.filter(i => i.severity === 'error')) {
      if (issue.issue === 'missing_master') {
        recommendations.push({
          type: 'disable',
          plugin: issue.plugin,
          priority: 'critical',
          description: `Missing master file: ${issue.affectedPlugins[0]}`,
          suggestedAction: `Disable ${issue.plugin} or install missing master`,
          impact: {
            stabilityImprovement: 15,
            performanceImprovement: 0,
            conflictReduction: 0,
          },
        });
      } else if (issue.issue === 'load_order') {
        recommendations.push({
          type: 'move',
          plugin: issue.plugin,
          priority: 'critical',
          description: 'Master loads after dependent',
          suggestedAction: `Move ${issue.plugin} after ${issue.affectedPlugins[0]}`,
          impact: {
            stabilityImprovement: 20,
            performanceImprovement: 0,
            conflictReduction: 0,
          },
        });
      }
    }

    // Recommend conflict resolution
    const criticalConflicts = conflicts.heatmapData.filter(c => c.severity === 'critical');
    for (const conflict of criticalConflicts.slice(0, 5)) {
      recommendations.push({
        type: 'patch',
        plugin: conflict.plugins[0],
        priority: 'high',
        description: `Critical conflict with ${conflict.plugins[1]}`,
        suggestedAction: 'Create compatibility patch or reorder plugins',
        impact: {
          stabilityImprovement: 10,
          performanceImprovement: 0,
          conflictReduction: conflict.value,
        },
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  private async lootLikeSort(plugins: PluginInfo[], graph: DependencyGraph, rules: OptimizationRules): Promise<PluginInfo[]> {
    // LOOT-like: ESMs first, then topological sort by dependencies
    const esms = plugins.filter(p => p.type === 'esm');
    const esps = plugins.filter(p => p.type === 'esp');
    const esls = plugins.filter(p => p.type === 'esl');

    const sortedESMs = this.topologicalSort(esms, graph);
    const sortedESPs = this.topologicalSort(esps, graph);
    const sortedESLs = rules.enableESLFirst ? this.topologicalSort(esls, graph) : [];

    return rules.enableESLFirst 
      ? [...sortedESMs, ...sortedESLs, ...sortedESPs]
      : [...sortedESMs, ...sortedESPs, ...sortedESLs];
  }

  private async bossLikeSort(plugins: PluginInfo[], graph: DependencyGraph, rules: OptimizationRules): Promise<PluginInfo[]> {
    // BOSS-like: strict groups and community rules
    return this.topologicalSort(plugins, graph);
  }

  private async stabilitySort(plugins: PluginInfo[], graph: DependencyGraph): Promise<PluginInfo[]> {
    // Prioritize plugins with fewer conflicts
    return this.topologicalSort(plugins, graph).sort((a, b) => {
      return a.conflicts.length - b.conflicts.length;
    });
  }

  private async performanceSort(plugins: PluginInfo[], graph: DependencyGraph): Promise<PluginInfo[]> {
    // Prioritize smaller, lighter plugins first
    return this.topologicalSort(plugins, graph).sort((a, b) => {
      return (a.size + a.recordCount * 100) - (b.size + b.recordCount * 100);
    });
  }

  private async customSort(plugins: PluginInfo[], graph: DependencyGraph, rules: OptimizationRules): Promise<PluginInfo[]> {
    // Apply custom rules
    let sorted = this.topologicalSort(plugins, graph);
    
    if (rules.customRules.length > 0) {
      sorted = await this.applyRules(sorted, rules.customRules.filter(r => r.enabled));
    }
    
    return sorted;
  }

  private topologicalSort(plugins: PluginInfo[], graph: DependencyGraph): PluginInfo[] {
    const result: PluginInfo[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    const pluginMap = new Map(plugins.map(p => [p.fileName.toLowerCase(), p]));

    const visit = (fileName: string) => {
      if (temp.has(fileName)) return; // Cycle detected
      if (visited.has(fileName)) return;

      temp.add(fileName);
      
      const plugin = pluginMap.get(fileName.toLowerCase());
      if (plugin) {
        // Visit dependencies first
        for (const master of plugin.masters) {
          const masterLower = master.toLowerCase();
          if (pluginMap.has(masterLower)) {
            visit(master);
          }
        }
        
        visited.add(fileName);
        temp.delete(fileName);
        result.push(plugin);
      }
    };

    // Visit all plugins
    for (const plugin of plugins) {
      if (!visited.has(plugin.fileName)) {
        visit(plugin.fileName);
      }
    }

    return result;
  }

  private applyPriorityOverrides(plugins: PluginInfo[], priorities: PriorityPlugin[]): PluginInfo[] {
    let result = [...plugins];
    
    for (const priority of priorities) {
      const index = result.findIndex(p => p.fileName.toLowerCase() === priority.plugin.toLowerCase());
      if (index === -1) continue;
      
      const plugin = result.splice(index, 1)[0];
      
      switch (priority.priority) {
        case 'first':
          result.unshift(plugin);
          break;
        case 'last':
          result.push(plugin);
          break;
        case 'before':
          if (priority.anchor) {
            const anchorIndex = result.findIndex(p => p.fileName.toLowerCase() === priority.anchor!.toLowerCase());
            if (anchorIndex >= 0) {
              result.splice(anchorIndex, 0, plugin);
            }
          }
          break;
        case 'after':
          if (priority.anchor) {
            const anchorIndex = result.findIndex(p => p.fileName.toLowerCase() === priority.anchor!.toLowerCase());
            if (anchorIndex >= 0) {
              result.splice(anchorIndex + 1, 0, plugin);
            }
          }
          break;
      }
    }
    
    return result;
  }

  private applySingleRule(plugins: PluginInfo[], rule: SortingRule): PluginInfo[] {
    const result = [...plugins];
    
    // Find plugins matching condition
    const matchingIndices: number[] = [];
    
    for (let i = 0; i < result.length; i++) {
      if (this.matchesCondition(result[i], rule.condition)) {
        matchingIndices.push(i);
      }
    }
    
    // Apply action to matching plugins
    for (const index of matchingIndices.reverse()) {
      const plugin = result[index];
      
      switch (rule.action.type) {
        case 'move_before':
          if (rule.action.target) {
            const targetIndex = result.findIndex(p => p.fileName.toLowerCase() === rule.action.target!.toLowerCase());
            if (targetIndex >= 0 && targetIndex !== index) {
              result.splice(index, 1);
              result.splice(targetIndex, 0, plugin);
            }
          }
          break;
        case 'move_after':
          if (rule.action.target) {
            const targetIndex = result.findIndex(p => p.fileName.toLowerCase() === rule.action.target!.toLowerCase());
            if (targetIndex >= 0 && targetIndex !== index) {
              result.splice(index, 1);
              result.splice(targetIndex + 1, 0, plugin);
            }
          }
          break;
      }
    }
    
    return result;
  }

  private matchesCondition(plugin: PluginInfo, condition: any): boolean {
    switch (condition.type) {
      case 'plugin_name':
        if (condition.operator === 'equals') {
          return plugin.fileName.toLowerCase() === String(condition.value).toLowerCase();
        } else if (condition.operator === 'contains') {
          return plugin.fileName.toLowerCase().includes(String(condition.value).toLowerCase());
        } else if (condition.operator === 'regex') {
          return new RegExp(String(condition.value), 'i').test(plugin.fileName);
        }
        break;
      case 'type':
        return plugin.type === condition.value;
      case 'size':
        if (condition.operator === 'greater_than') {
          return plugin.size > Number(condition.value);
        } else if (condition.operator === 'less_than') {
          return plugin.size < Number(condition.value);
        }
        break;
    }
    return false;
  }

  private parsePluginsTxt(content: string): Array<{ fileName: string; enabled: boolean }> {
    const entries: Array<{ fileName: string; enabled: boolean }> = [];
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      let enabled = true;
      let fileName = trimmed;

      if (trimmed.startsWith('*')) {
        enabled = true;
        fileName = trimmed.slice(1).trim();
      } else if (trimmed.startsWith('+')) {
        enabled = true;
        fileName = trimmed.slice(1).trim();
      } else if (trimmed.startsWith('-')) {
        enabled = false;
        fileName = trimmed.slice(1).trim();
      }

      if (fileName) {
        entries.push({ fileName, enabled });
      }
    }

    return entries;
  }

  private async resolvePluginsFilePath(sourcePath: string): Promise<string | null> {
    const stats = await fs.stat(sourcePath).catch(() => null);
    if (!stats) return null;

    if (stats.isFile()) {
      return sourcePath;
    }

    const pluginsPath = path.join(sourcePath, 'plugins.txt');
    if (await fs.pathExists(pluginsPath)) return pluginsPath;

    return null;
  }

  private detectPluginType(fileName: string): 'esm' | 'esp' | 'esl' {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.esm') return 'esm';
    if (ext === '.esl') return 'esl';
    return 'esp';
  }

  private createMinimalPlugin(fileName: string, filePath: string, enabled: boolean, loadIndex: number): PluginInfo {
    return {
      fileName,
      filePath,
      enabled,
      type: this.detectPluginType(fileName),
      masters: [],
      recordCount: 0,
      overrides: [],
      conflicts: [],
      loadIndex,
      size: 0,
      modifiedDate: new Date(),
    };
  }

  private calculateChanges(original: PluginInfo[], optimized: PluginInfo[]): LoadOrderChange[] {
    const changes: LoadOrderChange[] = [];
    const originalMap = new Map(original.map((p, idx) => [p.fileName.toLowerCase(), idx]));
    
    for (let i = 0; i < optimized.length; i++) {
      const plugin = optimized[i];
      const originalIndex = originalMap.get(plugin.fileName.toLowerCase());
      
      if (originalIndex !== undefined && originalIndex !== i) {
        changes.push({
          plugin: plugin.fileName,
          from: originalIndex,
          to: i,
          reason: this.determineChangeReason(plugin, original, optimized, originalIndex, i),
        });
      }
    }
    
    return changes;
  }

  private determineChangeReason(plugin: PluginInfo, original: PluginInfo[], optimized: PluginInfo[], from: number, to: number): string {
    if (plugin.masters.length > 0) {
      return 'Dependency resolution';
    }
    if (plugin.conflicts.length > 0) {
      return 'Conflict reduction';
    }
    if (to < from) {
      return 'Load order optimization';
    }
    return 'Algorithm-based repositioning';
  }

  private validateOptimization(plugins: PluginInfo[], graph: DependencyGraph): string[] {
    const warnings: string[] = [];
    const pluginMap = new Map(plugins.map((p, idx) => [p.fileName.toLowerCase(), idx]));
    
    // Check that masters load before dependents
    for (const plugin of plugins) {
      const pluginIndex = pluginMap.get(plugin.fileName.toLowerCase())!;
      
      for (const master of plugin.masters) {
        const masterIndex = pluginMap.get(master.toLowerCase());
        if (masterIndex !== undefined && masterIndex > pluginIndex) {
          warnings.push(`Warning: ${plugin.fileName} loads before its master ${master}`);
        }
      }
    }
    
    return warnings;
  }

  private calculateDependencyLevels(nodes: DependencyNode[], edges: DependencyEdge[]): string[][] {
    const levels: string[][] = [];
    const assigned = new Set<string>();
    const edgeMap = new Map<string, string[]>();
    
    // Build edge map
    for (const edge of edges) {
      if (edge.type === 'master') {
        if (!edgeMap.has(edge.to)) {
          edgeMap.set(edge.to, []);
        }
        edgeMap.get(edge.to)!.push(edge.from);
      }
    }
    
    let currentLevel = 0;
    let remaining = new Set(nodes.map(n => n.id));
    
    while (remaining.size > 0 && currentLevel < 100) {
      const levelNodes: string[] = [];
      
      for (const nodeId of remaining) {
        const dependencies = edgeMap.get(nodeId) || [];
        const allDepsAssigned = dependencies.every(dep => assigned.has(dep));
        
        if (dependencies.length === 0 || allDepsAssigned) {
          levelNodes.push(nodeId);
        }
      }
      
      if (levelNodes.length === 0) {
        // Circular dependency - add remaining nodes to current level
        levelNodes.push(...Array.from(remaining));
      }
      
      levels.push(levelNodes);
      levelNodes.forEach(n => {
        assigned.add(n);
        remaining.delete(n);
      });
      
      currentLevel++;
    }
    
    return levels;
  }

  private findCycles(nodes: DependencyNode[], edges: DependencyEdge[]): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const edgeMap = new Map<string, string[]>();
    
    // Build adjacency list
    for (const edge of edges) {
      if (edge.type === 'master') {
        if (!edgeMap.has(edge.from)) {
          edgeMap.set(edge.from, []);
        }
        edgeMap.get(edge.from)!.push(edge.to);
      }
    }
    
    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);
      
      const neighbors = edgeMap.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, path)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          cycles.push([...path.slice(cycleStart), neighbor]);
          return true;
        }
      }
      
      recStack.delete(node);
      path.pop();
      return false;
    };
    
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    }
    
    return cycles;
  }

  private getAppliedRulesDescription(rules: OptimizationRules): string[] {
    const descriptions: string[] = [];
    
    descriptions.push(`Algorithm: ${rules.algorithm}`);
    
    if (rules.priorityPlugins.length > 0) {
      descriptions.push(`${rules.priorityPlugins.length} priority overrides`);
    }
    
    if (rules.customRules.length > 0) {
      const enabledCount = rules.customRules.filter(r => r.enabled).length;
      descriptions.push(`${enabledCount} custom rules`);
    }
    
    if (rules.communityRules) {
      descriptions.push('Community best practices');
    }
    
    return descriptions;
  }
}

// Singleton instance
export const loadOrderOptimizerEngine = new LoadOrderOptimizerEngine();
