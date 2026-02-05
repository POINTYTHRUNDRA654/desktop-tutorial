/**
 * Cell/Worldspace Mining Engine
 * Extracts location-based mod interactions and conflicts
 */

import {
  CellWorldspaceMiningEngine,
  CellWorldspaceAnalysis,
  CellModInteraction,
  CellChange,
  CellModification,
  CellAddition,
  CellRemoval,
  CellConflict,
  CellOptimization,
  CellPerformanceImpact,
  ESPFile
} from '../shared/types';

export class CellWorldspaceMiningEngineImpl implements CellWorldspaceMiningEngine {
  async analyze(espFiles: ESPFile[], worldspaceData: any[]): Promise<CellWorldspaceAnalysis[]> {
    const analyses: CellWorldspaceAnalysis[] = [];

    // Group ESP files by cell/worldspace
    const cellGroups = this.groupByCell(espFiles);

    for (const [cellId, cellFiles] of cellGroups) {
      try {
        const analysis = await this.analyzeCell(cellId, cellFiles, worldspaceData);
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.warn(`Failed to analyze cell ${cellId}:`, error);
      }
    }

    return analyses;
  }

  private groupByCell(espFiles: ESPFile[]): Map<string, ESPFile[]> {
    const groups = new Map<string, ESPFile[]>();

    for (const espFile of espFiles) {
      if (espFile.records) {
        for (const record of espFile.records) {
          if (record.type === 'CELL' && record.cellId) {
            const cellId = record.cellId.toString();
            if (!groups.has(cellId)) {
              groups.set(cellId, []);
            }
            groups.get(cellId)!.push(espFile);
            break; // Only add file once per cell
          }
        }
      }
    }

    return groups;
  }

  private async analyzeCell(cellId: string, espFiles: ESPFile[], worldspaceData: any[]): Promise<CellWorldspaceAnalysis | null> {
    const mods: CellModInteraction[] = [];
    const conflicts: CellConflict[] = [];
    const optimizationOpportunities: CellOptimization[] = [];

    // Determine worldspace
    const worldspaceId = this.findWorldspaceForCell(cellId, worldspaceData);

    // Analyze each mod's interaction with this cell
    for (const espFile of espFiles) {
      const interaction = await this.analyzeModInteraction(cellId, espFile);
      if (interaction) {
        mods.push(interaction);
      }
    }

    // Detect conflicts between mods
    const cellConflicts = this.detectCellConflicts(mods, cellId);
    conflicts.push(...cellConflicts);

    // Find optimization opportunities
    const optimizations = this.findOptimizationOpportunities(mods, cellId);
    optimizationOpportunities.push(...optimizations);

    // Calculate performance impact
    const performanceImpact = this.calculatePerformanceImpact(mods, conflicts);

    // Build modifications array from mods
    const modifications: CellModification[] = mods.map(mod => ({
      modName: mod.modName,
      timestamp: Date.now(),
      additions: mod.additions,
      removals: mod.removals
    }));

    return {
      cellId,
      worldspaceId,
      mods,
      modifications,
      conflicts,
      optimizationOpportunities,
      performanceImpact
    };
  }

  private findWorldspaceForCell(cellId: string, worldspaceData: any[]): string {
    // Mock implementation - find worldspace containing this cell
    // In real implementation, check worldspace boundaries
    return 'Tamriel'; // Default worldspace
  }

  private async analyzeModInteraction(cellId: string, espFile: ESPFile): Promise<CellModInteraction | null> {
    const changes: CellChange[] = [];
    const additions: CellAddition[] = [];
    const removals: CellRemoval[] = [];

    if (!espFile.records) return null;

    // Analyze records for cell modifications
    for (const record of espFile.records) {
      if (record.cellId === parseInt(cellId)) {
        if (record.type === 'LAND') {
          changes.push({
            changeType: 'landscape',
            description: `Modified landscape in cell ${cellId}`,
            impact: 'medium'
          });
        } else if (record.type === 'NAVM') {
          changes.push({
            changeType: 'navmesh',
            description: `Modified navmesh in cell ${cellId}`,
            impact: 'high'
          });
        } else if (record.type === 'REFR') {
          if (record.isAddition) {
            additions.push({
              objectType: record.baseObject || 'unknown',
              formId: record.formId.toString(),
              position: record.position || { x: 0, y: 0, z: 0 },
              modName: espFile.fileName
            });
          } else if (record.isDeletion) {
            removals.push({
              objectType: record.baseObject || 'unknown',
              formId: record.formId.toString(),
              reason: record.deletionReason || 'removed by mod',
              modName: espFile.fileName
            });
          }
        }
      }
    }

    if (changes.length === 0 && additions.length === 0 && removals.length === 0) {
      return null;
    }

    return {
      modName: espFile.fileName,
      changes,
      additions,
      removals,
      timestamp: Date.now()
    };
  }

  private detectCellConflicts(mods: CellModInteraction[], cellId: string): CellConflict[] {
    const conflicts: CellConflict[] = [];

    // Check for placement conflicts
    const allAdditions = mods.flatMap(m => m.additions);
    const positionGroups = new Map<string, CellAddition[]>();

    // Group additions by approximate position
    for (const addition of allAdditions) {
      const key = `${Math.floor(addition.position.x / 100)},${Math.floor(addition.position.y / 100)},${Math.floor(addition.position.z / 100)}`;
      if (!positionGroups.has(key)) {
        positionGroups.set(key, []);
      }
      positionGroups.get(key)!.push(addition);
    }

    // Find conflicts in crowded positions
    for (const [position, additions] of positionGroups) {
      if (additions.length > 3) { // Arbitrary threshold
        const modNames = [...new Set(additions.map(a => a.modName))];
        if (modNames.length > 1) {
          conflicts.push({
            mods: modNames,
            conflictType: 'placement',
            affectedObjects: additions.map(a => a.formId),
            severity: 'medium',
            description: `Multiple mods placing objects in close proximity at ${position}`,
            cellId,
            resolution: 'Consider using a compatibility patch or adjusting placements'
          });
        }
      }
    }

    // Check for removal conflicts
    const allRemovals = mods.flatMap(m => m.removals);
    const removalGroups = new Map<string, CellRemoval[]>();

    for (const removal of allRemovals) {
      if (!removalGroups.has(removal.formId)) {
        removalGroups.set(removal.formId, []);
      }
      removalGroups.get(removal.formId)!.push(removal);
    }

    // Find multiple removals of same object
    for (const [formId, removals] of removalGroups) {
      if (removals.length > 1) {
        const modNames = removals.map(r => r.modName);
        conflicts.push({
          mods: modNames,
          conflictType: 'removal',
          affectedObjects: [formId],
          severity: 'high',
          description: `Multiple mods removing the same object ${formId}`,
          cellId,
          resolution: 'Only one mod should remove this object'
        });
      }
    }

    return conflicts;
  }

  private findOptimizationOpportunities(mods: CellModInteraction[], cellId: string): CellOptimization[] {
    const opportunities: CellOptimization[] = [];

    // Count different types of changes
    let navmeshChanges = 0;
    let lightingChanges = 0;
    let placementChanges = 0;
    let landscapeChanges = 0;

    for (const mod of mods) {
      for (const change of mod.changes) {
        switch (change.changeType) {
          case 'navmesh':
            navmeshChanges++;
            break;
          case 'lighting':
            lightingChanges++;
            break;
          case 'placement':
            placementChanges++;
            break;
          case 'landscape':
            landscapeChanges++;
            break;
        }
      }
    }

    // Suggest LOD optimization if many objects added
    const totalAdditions = mods.reduce((sum, mod) => sum + mod.additions.length, 0);
    if (totalAdditions > 50) {
      opportunities.push({
        optimizationType: 'lod',
        description: `Cell ${cellId} has ${totalAdditions} added objects - consider LOD optimization`,
        potentialGain: Math.min(totalAdditions * 2, 30), // Estimate FPS gain
        difficulty: 'medium'
      });
    }

    // Suggest occlusion culling if many landscape changes
    if (landscapeChanges > 2) {
      opportunities.push({
        optimizationType: 'occlusion',
        description: `Multiple landscape modifications in cell ${cellId} - occlusion culling may help`,
        potentialGain: 10,
        difficulty: 'hard'
      });
    }

    // Suggest batching for many small placements
    if (placementChanges > 10) {
      opportunities.push({
        optimizationType: 'batching',
        description: `Many placement changes in cell ${cellId} - consider object batching`,
        potentialGain: 5,
        difficulty: 'easy'
      });
    }

    return opportunities;
  }

  private calculatePerformanceImpact(mods: CellModInteraction[], conflicts: CellConflict[]): CellPerformanceImpact {
    let fpsImpact = 0;
    let memoryImpact = 0;
    let loadTimeImpact = 0;
    let streamingImpact = 0;

    // Calculate impact from mods
    for (const mod of mods) {
      fpsImpact += mod.changes.length * 0.5; // Each change costs ~0.5 FPS
      fpsImpact += mod.additions.length * 0.2; // Each addition costs ~0.2 FPS
      memoryImpact += mod.additions.length * 0.1; // Memory impact in MB
      loadTimeImpact += (mod.changes.length + mod.additions.length) * 0.01; // Load time in seconds
    }

    // Additional impact from conflicts
    for (const conflict of conflicts) {
      const multiplier = conflict.severity === 'high' ? 2 : conflict.severity === 'medium' ? 1.5 : 1;
      fpsImpact *= multiplier;
      memoryImpact *= multiplier;
    }

    return {
      fpsImpact,
      memoryImpact,
      loadTimeImpact,
      streamingImpact: Math.max(0, fpsImpact - 5) // Streaming impact if FPS drops significantly
    };
  }

  async detectConflicts(cellAnalyses: CellWorldspaceAnalysis[]): Promise<CellConflict[]> {
    const conflicts: CellConflict[] = [];

    for (const analysis of cellAnalyses) {
      // Check for placement conflicts
      const placementConflicts = this.detectPlacementConflicts(analysis);
      conflicts.push(...placementConflicts);

      // Check for removal conflicts
      const removalConflicts = this.detectRemovalConflicts(analysis);
      conflicts.push(...removalConflicts);
    }

    return conflicts;
  }

  private detectPlacementConflicts(analysis: CellWorldspaceAnalysis): CellConflict[] {
    const conflicts: CellConflict[] = [];
    const additions = analysis.modifications.flatMap(m => m.additions);

    // Group additions by position (simplified proximity check)
    const positionGroups = new Map<string, CellAddition[]>();

    for (const addition of additions) {
      const key = `${Math.floor(addition.position.x / 100)},${Math.floor(addition.position.y / 100)},${Math.floor(addition.position.z / 100)}`;
      if (!positionGroups.has(key)) {
        positionGroups.set(key, []);
      }
      positionGroups.get(key)!.push(addition);
    }

    // Find conflicts where multiple mods place objects in same area
    for (const [position, group] of positionGroups) {
      if (group.length > 1) {
        const modNames = [...new Set(group.map(a => a.modName))];
        if (modNames.length > 1) {
          conflicts.push({
            conflictType: 'placement',
            severity: 'medium',
            mods: modNames,
            description: `Multiple mods placing objects in close proximity`,
            cellId: analysis.cellId,
            position: group[0].position,
            objects: group.map(a => ({ formId: a.formId, objectType: a.objectType }))
          });
        }
      }
    }

    return conflicts;
  }

  private detectRemovalConflicts(analysis: CellWorldspaceAnalysis): CellConflict[] {
    const conflicts: CellConflict[] = [];
    const removals = analysis.modifications.flatMap(m => m.removals);

    // Group removals by formId
    const removalGroups = new Map<string, CellRemoval[]>();

    for (const removal of removals) {
      if (!removalGroups.has(removal.formId)) {
        removalGroups.set(removal.formId, []);
      }
      removalGroups.get(removal.formId)!.push(removal);
    }

    // Find conflicts where multiple mods remove the same object
    for (const [formId, group] of removalGroups) {
      if (group.length > 1) {
        const modNames = [...new Set(group.map(r => r.modName))];
        if (modNames.length > 1) {
          conflicts.push({
            conflictType: 'removal',
            severity: 'high',
            mods: modNames,
            description: `Multiple mods removing the same object ${formId}`,
            cellId: analysis.cellId,
            objects: [{ formId, objectType: 'unknown' }]
          });
        }
      }
    }

    return conflicts;
  }

  async optimizeLayout(cellAnalyses: CellWorldspaceAnalysis[]): Promise<CellOptimization[]> {
    const optimizations: CellOptimization[] = [];

    for (const analysis of cellAnalyses) {
      // Check for performance optimizations
      const perfOpt = this.optimizePerformance(analysis);
      if (perfOpt) {
        optimizations.push(perfOpt);
      }

      // Check for layout optimizations
      const layoutOpts = this.optimizeLayoutInternal(analysis);
      optimizations.push(...layoutOpts);
    }

    return optimizations;
  }

  private optimizePerformance(analysis: CellWorldspaceAnalysis): CellOptimization | null {
    const totalAdditions = analysis.modifications.reduce((sum, m) => sum + m.additions.length, 0);
    const totalRemovals = analysis.modifications.reduce((sum, m) => sum + m.removals.length, 0);

    if (totalAdditions > 50) {
      return {
        optimizationType: 'performance',
        description: `High object count (${totalAdditions}) may impact performance`,
        cellId: analysis.cellId,
        suggestedActions: [
          'Consider reducing object density',
          'Use LOD for distant objects',
          'Split large cells into smaller ones'
        ],
        expectedImprovement: {
          fps: totalAdditions > 100 ? -10 : -5,
          memory: totalRemovals * 0.1,
          loadTime: totalAdditions * 0.05
        }
      };
    }

    return null;
  }

  private optimizeLayoutInternal(analysis: CellWorldspaceAnalysis): CellOptimization[] {
    const optimizations: CellOptimization[] = [];

    // Check for clustered objects that could be spread out
    const additions = analysis.modifications.flatMap(m => m.additions);
    if (additions.length > 10) {
      const positions = additions.map(a => a.position);
      const avgDistance = this.calculateAverageDistance(positions);

      if (avgDistance < 50) { // Objects too close together
        optimizations.push({
          optimizationType: 'layout',
          description: 'Objects are clustered too closely together',
          cellId: analysis.cellId,
          suggestedActions: [
            'Spread objects apart for better visual distribution',
            'Use varied heights and orientations',
            'Consider grouping related objects'
          ],
          expectedImprovement: {
            fps: 2,
            memory: 0,
            loadTime: 0
          }
        });
      }
    }

    return optimizations;
  }

  private calculateAverageDistance(positions: Array<{x: number, y: number, z: number}>): number {
    if (positions.length < 2) return 0;

    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dz = positions[i].z - positions[j].z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        totalDistance += distance;
        pairCount++;
      }
    }

    return totalDistance / pairCount;
  }
}