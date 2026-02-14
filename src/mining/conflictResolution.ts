/**
 * Conflict Resolution Engine
 * Deep conflict analysis, record comparison, patch generation, and compatibility checks
 */

import { ESPParser } from './esp-parser';
import type {
  ConflictAnalysis,
  Conflict,
  ConflictSeverity,
  ConflictType,
  RecordComparison,
  FieldDifference,
  ResolutionStrategy,
  PatchESP,
  PatchRecord,
  FieldChange,
  CompatibilityReport,
  MergeRecommendation,
  ConflictRule,
  ResolvedConflicts,
  PluginConflictInfo,
  RecordData,
  ConflictMatrix,
} from '../shared/types';

export class ConflictResolutionEngine {
  private cache: Map<string, any> = new Map();

  /**
   * Deep conflict analysis across plugins
   */
  async analyzeConflicts(plugins: string[]): Promise<ConflictAnalysis> {
    const parsed = await Promise.all(plugins.map(p => this.parsePlugin(p)));
    const conflicts: Conflict[] = [];

    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        const pluginConflicts = this.comparePluginPair(parsed[i], parsed[j]);
        conflicts.push(...pluginConflicts);
      }
    }

    // Build plugin conflict info
    const pluginInfo: PluginConflictInfo[] = parsed.map(plugin => {
      const pluginConflicts = conflicts.filter(c => c.affectedPlugins.includes(plugin.fileName));
      const criticalCount = pluginConflicts.filter(c => c.severity === 'critical').length;

      return {
        pluginName: plugin.fileName,
        conflictCount: pluginConflicts.length,
        criticalCount,
        affectedRecords: pluginConflicts.map(c => c.formId),
      };
    });

    // Generate basic conflict matrix (simplified)
    const conflictMatrix: ConflictMatrix = {
      plugins: parsed.map(p => p.fileName),
      conflicts: parsed.map(() => parsed.map(() => 0)), // Initialize empty matrix
      severityMap: parsed.map(() => parsed.map(() => 'none')),
      heatmapData: [],
    };

    // Fill conflict matrix
    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        const pluginConflicts = conflicts.filter(c =>
          c.affectedPlugins.includes(parsed[i].fileName) &&
          c.affectedPlugins.includes(parsed[j].fileName)
        );
        conflictMatrix.conflicts[i][j] = pluginConflicts.length;
        conflictMatrix.conflicts[j][i] = pluginConflicts.length;

        const maxSeverity = pluginConflicts.length > 0 ?
          pluginConflicts.reduce((max, c) => c.severity === 'critical' ? 'critical' :
            c.severity === 'major' && max !== 'critical' ? 'major' : max, 'none' as any) : 'none';

        conflictMatrix.severityMap[i][j] = maxSeverity;
        conflictMatrix.severityMap[j][i] = maxSeverity;

        if (pluginConflicts.length > 0) {
          conflictMatrix.heatmapData.push({
            x: i,
            y: j,
            value: pluginConflicts.length,
            severity: maxSeverity,
            plugins: [parsed[i].fileName, parsed[j].fileName],
          });
        }
      }
    }

    const criticalConflicts = conflicts.filter(c => c.severity === 'critical').length;
    const recommendations = this.generateRecommendations(conflicts);

    return {
      totalConflicts: conflicts.length,
      criticalConflicts,
      plugins: pluginInfo,
      conflictMatrix,
      recommendations,
    };
  }

  /**
   * Record-level comparison between two plugins
   * Supports both recordType (e.g., "WEAP") and formId (e.g., "0x1234") with auto-detection
   */
  async compareRecords(pluginA: string, pluginB: string, recordIdentifier: string): Promise<RecordComparison> {
    const a = await this.parsePlugin(pluginA);
    const b = await this.parsePlugin(pluginB);

    // Auto-detect: 4-char strings are record types, hex strings are formIds
    const isRecordType = /^[A-Z]{4}$/.test(recordIdentifier);
    const isFormId = /^0x[0-9a-fA-F]+$/i.test(recordIdentifier) || /^[0-9a-fA-F]+$/i.test(recordIdentifier);

    let recordA: any;
    let recordB: any;
    let formId: string;
    let recordType: string;

    if (isFormId) {
      // Compare specific formId
      const numericFormId = parseInt(recordIdentifier.startsWith('0x') ? recordIdentifier : `0x${recordIdentifier}`, 16);
      formId = recordIdentifier.startsWith('0x') ? recordIdentifier : `0x${recordIdentifier}`;

      recordA = a.records.find((r: any) => r.formId === numericFormId);
      recordB = b.records.find((r: any) => r.formId === numericFormId);
      recordType = recordA?.type || recordB?.type || 'UNKNOWN';
    } else {
      throw new Error(`Invalid record identifier: ${recordIdentifier}. Expected hex formId (e.g., "0x1234")`);
    }

    if (!recordA && !recordB) {
      throw new Error(`Record ${formId} not found in either plugin`);
    }

    const recordDataA: RecordData = recordA ? {
      pluginName: pluginA,
      formId,
      recordType,
      fields: recordA.fields || {},
      editorId: recordA.editorId,
    } : {
      pluginName: pluginA,
      formId,
      recordType,
      fields: {},
    };

    const recordDataB: RecordData = recordB ? {
      pluginName: pluginB,
      formId,
      recordType,
      fields: recordB.fields || {},
      editorId: recordB.editorId,
    } : {
      pluginName: pluginB,
      formId,
      recordType,
      fields: {},
    };

    const differences: FieldDifference[] = this.compareFields(recordDataA.fields, recordDataB.fields);
    const recommendation = this.generateRecommendation(differences, recordType);

    return {
      formId,
      recordType,
      pluginA: recordDataA,
      pluginB: recordDataB,
      differences,
      recommendation,
    };
  }

  /**
   * Automatic patch generation (metadata only)
   */
  async generatePatch(conflicts: Conflict[], strategy: ResolutionStrategy): Promise<PatchESP> {
    const records: PatchRecord[] = conflicts.map(conflict => {
      const preferred = this.getPreferredPlugin(conflict, strategy);
      return {
        formId: conflict.formId || '0x00000000',
        recordType: conflict.recordType,
        sourcePlugin: preferred,
        fields: this.buildFieldChanges(conflict),
        resolution: this.resolvePatchAction(strategy, conflict),
      };
    });

    const masters = this.collectMasters(conflicts);

    return {
      fileName: 'ConflictResolutionPatch.esp',
      records,
      masters,
      loadPosition: 'last',
      description: `Generated with strategy: ${strategy}`,
    };
  }

  /**
   * Compatibility check between two mods
   */
  async checkCompatibility(modA: string, modB: string): Promise<CompatibilityReport> {
    const a = await this.parsePlugin(modA);
    const b = await this.parsePlugin(modB);
    const conflicts = this.comparePluginPair(a, b);

    const severity = this.getHighestSeverity(conflicts);
    const compatible = severity !== 'critical';
    const criticalCount = conflicts.filter(c => c.severity === 'critical').length;

    return {
      modA,
      modB,
      compatible,
      severity,
      conflicts,
      summary: `Detected ${conflicts.length} conflicts (${criticalCount} critical).`,
      recommendations: compatible
        ? ['Create a small override patch if conflicts affect gameplay']
        : ['Create a compatibility patch or adjust load order'],
    };
  }

  /**
   * Recommend merge candidates based on conflict density
   */
  async recommendMerge(plugins: string[]): Promise<MergeRecommendation[]> {
    const parsed = await Promise.all(plugins.map(p => this.parsePlugin(p)));
    const recommendations: MergeRecommendation[] = [];

    for (let i = 0; i < parsed.length; i++) {
      for (let j = i + 1; j < parsed.length; j++) {
        const conflicts = this.comparePluginPair(parsed[i], parsed[j]);
        if (conflicts.length >= 25) {
          recommendations.push({
            plugins: [parsed[i].fileName, parsed[j].fileName],
            conflictCount: conflicts.length,
            severity: this.getHighestSeverity(conflicts),
            reason: 'High overlap of record overrides',
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Rule-based resolution
   */
  async applyResolutionRules(conflicts: Conflict[], rules: ConflictRule[]): Promise<ResolvedConflicts> {
    const resolved: Conflict[] = [];
    const unresolved: Conflict[] = [];
    const appliedRules: string[] = [];

    const activeRules = [...rules].filter(r => r.enabled).sort((a, b) => b.priority - a.priority);

    for (const conflict of conflicts) {
      let matched = false;

      for (const rule of activeRules) {
        if (!this.matchesRule(conflict, rule)) continue;
        conflict.resolutionSuggestion = rule.action.resolution;
        resolved.push(conflict);
        matched = true;
        appliedRules.push(rule.name);
        break;
      }

      if (!matched) {
        unresolved.push(conflict);
      }
    }

    return { resolved, unresolved, appliedRules };
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private async parsePlugin(pluginPath: string): Promise<any> {
    const key = pluginPath.toLowerCase();
    if (this.cache.has(key)) return this.cache.get(key);

    const parsed = await ESPParser.parseFile(pluginPath);
    this.cache.set(key, parsed);
    return parsed;
  }

  private comparePluginPair(pluginA: any, pluginB: any): Conflict[] {
    const conflicts: Conflict[] = [];
    const mapA = new Map<number, any>();
    const mapB = new Map<number, any>();

    for (const record of pluginA.records) {
      mapA.set(record.formId, record);
    }
    for (const record of pluginB.records) {
      mapB.set(record.formId, record);
    }

    for (const [formId, recordA] of mapA.entries()) {
      if (!mapB.has(formId)) continue;
      const recordB = mapB.get(formId);

      const conflictType = this.mapConflictType(recordA.type);
      const severity = this.mapSeverity(recordA.type);

      // Determine winning/losing plugins (simplified: assume pluginA wins for now)
      const winningPlugin = pluginA.fileName;
      const losingPlugins = [pluginB.fileName];

      conflicts.push({
        formId: `0x${Number(formId).toString(16)}`,
        recordType: recordA.type,
        editorId: recordA.editorId,
        affectedPlugins: [pluginA.fileName, pluginB.fileName],
        winningPlugin,
        losingPlugins,
        severity,
        conflictType,
        resolutionSuggestion: this.generateResolutionSuggestion(recordA.type, severity),
      });
    }

    return conflicts;
  }

  private mapConflictType(recordType: string): 'override' | 'delete' | 'navmesh' | 'script' | 'asset' {
    if (recordType === 'NAVM' || recordType === 'NAVI') return 'navmesh';
    if (recordType === 'PACK') return 'delete'; // AI packages are often deleted in conflicts
    if (recordType === 'SCPT') return 'script';
    if (recordType === 'TXST' || recordType === 'STAT' || recordType === 'MESH') return 'asset';
    return 'override';
  }

  private mapSeverity(recordType: string): ConflictSeverity {
    if (recordType === 'NAVM' || recordType === 'NAVI') return 'critical';
    if (recordType === 'PACK' || recordType === 'SCPT') return 'major';
    return 'minor';
  }

  private getHighestSeverity(conflicts: Conflict[]): ConflictSeverity {
    if (conflicts.some(c => c.severity === 'critical')) return 'critical';
    if (conflicts.some(c => c.severity === 'major')) return 'major';
    return 'minor';
  }

  private matchesRule(conflict: Conflict, rule: ConflictRule): boolean {
    if (rule.match.type && rule.match.type !== conflict.conflictType) return false;
    if (rule.match.recordType && rule.match.recordType !== conflict.recordType) return false;
    if (rule.match.severity && rule.match.severity !== conflict.severity) return false;
    if (rule.match.plugin && !conflict.affectedPlugins.some(p => p.toLowerCase() === rule.match.plugin!.toLowerCase())) return false;
    return true;
  }

  private getPreferredPlugin(conflict: Conflict, strategy: ResolutionStrategy): string {
    if (strategy === 'last-wins' || strategy === 'ai-suggest') {
      return conflict.affectedPlugins[conflict.affectedPlugins.length - 1];
    }
    return conflict.affectedPlugins[0];
  }

  private resolvePatchAction(strategy: ResolutionStrategy, conflict: Conflict): 'keep' | 'discard' | 'merge' {
    if (strategy === 'merge-all') return 'merge';
    if (strategy === 'manual') return 'keep';
    if (strategy === 'rule-based') {
      // For rule-based, we could parse resolutionSuggestion, but for now default to keep
      return 'keep';
    }
    return 'keep';
  }

  private buildFieldChanges(conflict: Conflict): FieldChange[] {
    return [
      {
        field: 'record',
        note: conflict.resolutionSuggestion || 'Conflict resolution needed',
      },
    ];
  }

  private collectMasters(conflicts: Conflict[]): string[] {
    const masters = new Set<string>();
    for (const conflict of conflicts) {
      for (const plugin of conflict.affectedPlugins) {
        masters.add(plugin);
      }
    }
    return Array.from(masters);
  }

  private compareFields(fieldsA: Record<string, any>, fieldsB: Record<string, any>): FieldDifference[] {
    const differences: FieldDifference[] = [];
    const allFields = new Set([...Object.keys(fieldsA), ...Object.keys(fieldsB)]);

    for (const field of allFields) {
      const valueA = fieldsA[field];
      const valueB = fieldsB[field];

      if (valueA !== valueB) {
        differences.push({
          fieldName: field,
          valueA,
          valueB,
          important: this.isImportantField(field),
        });
      }
    }

    return differences;
  }

  private isImportantField(fieldName: string): boolean {
    const importantFields = ['NAME', 'EDID', 'FULL', 'DESC', 'MODL', 'ICON', 'MICO'];
    return importantFields.includes(fieldName.toUpperCase());
  }

  private generateRecommendation(differences: FieldDifference[], recordType: string): 'keep-a' | 'keep-b' | 'merge' | 'manual' {
    if (differences.length === 0) return 'keep-a';

    const importantDifferences = differences.filter(d => d.important);
    if (importantDifferences.length === 0) return 'merge';

    // For critical record types, prefer manual resolution
    if (['WEAP', 'ARMO', 'NPC_', 'CREA'].includes(recordType)) {
      return 'manual';
    }

    return 'keep-a'; // Default fallback
  }

  private generateRecommendations(conflicts: Conflict[]): string[] {
    const recommendations: string[] = [];

    if (conflicts.length === 0) {
      recommendations.push('No conflicts detected - load order appears stable');
      return recommendations;
    }

    const criticalCount = conflicts.filter(c => c.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical conflicts first`);
    }

    const scriptConflicts = conflicts.filter(c => c.conflictType === 'script').length;
    if (scriptConflicts > 0) {
      recommendations.push('Review script conflicts carefully - they may cause runtime errors');
    }

    recommendations.push('Consider using a bashed patch for minor conflicts');
    recommendations.push('Test in a separate save before applying changes');

    return recommendations;
  }

  private generateResolutionSuggestion(recordType: string, severity: string): string {
    if (severity === 'critical') {
      return 'Manual resolution required - conflicts may break gameplay';
    }

    if (recordType === 'WEAP' || recordType === 'ARMO') {
      return 'Consider merging equipment stats or keeping higher-level version';
    }

    if (recordType === 'NPC_') {
      return 'NPC conflicts may affect quest progression - review carefully';
    }

    return 'Standard override resolution should work';
  }
}
