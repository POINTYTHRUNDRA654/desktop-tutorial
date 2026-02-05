/**
 * FormID Relationship Mining Engine
 * Maps all FormID references across mods to identify dependencies, conflicts, and relationships
 */

import {
  FormIDRelationshipMiningEngine,
  FormIDRelationshipMap,
  FormIDReference,
  FormIDConflict,
  FormIDDependency,
  FormIDDependencyGraph,
  FormIDNode,
  FormIDEdge,
  FormIDCycle,
  ESPFile
} from '../shared/types';

export class FormIDRelationshipMiningEngineImpl implements FormIDRelationshipMiningEngine {
  private formIdMaps: Map<string, FormIDRelationshipMap> = new Map();

  async analyze(espFiles: ESPFile[]): Promise<FormIDRelationshipMap[]> {
    const results: FormIDRelationshipMap[] = [];

    for (const espFile of espFiles) {
      try {
        const formIdMap = await this.analyzeESPFile(espFile);
        if (formIdMap) {
          results.push(formIdMap);
          this.formIdMaps.set(formIdMap.formId, formIdMap);
        }
      } catch (error) {
        console.warn(`Failed to analyze FormIDs in ${espFile.fileName}:`, error);
      }
    }

    return results;
  }

  private async analyzeESPFile(espFile: ESPFile): Promise<FormIDRelationshipMap | null> {
    // Extract FormIDs from ESP file
    const formIds = this.extractFormIds(espFile);

    if (formIds.length === 0) return null;

    // For each FormID, find references and relationships
    const references: FormIDReference[] = [];
    const dependencies: FormIDDependency[] = [];

    for (const formId of formIds) {
      const refs = await this.findReferences(formId, espFile);
      references.push(...refs);

      const deps = await this.findDependencies(formId, espFile);
      dependencies.push(...deps);
    }

    return {
      formId: formIds[0], // Primary FormID for this record
      references,
      conflicts: [], // Will be populated by findConflicts
      dependencies,
      modOwnership: espFile.fileName,
      recordType: this.determineRecordType(espFile)
    };
  }

  private extractFormIds(espFile: ESPFile): string[] {
    // Mock implementation - in real implementation, parse ESP binary format
    const formIds: string[] = [];

    // Extract FormIDs from records
    if (espFile.records) {
      for (const record of espFile.records) {
        if (record.formId) {
          formIds.push(record.formId.toString());
        }
      }
    }

    return formIds;
  }

  private async findReferences(formId: string, espFile: ESPFile): Promise<FormIDReference[]> {
    const references: FormIDReference[] = [];

    // Mock implementation - analyze record data for references
    if (espFile.records) {
      for (const record of espFile.records) {
        if (record.references && record.references.includes(parseInt(formId))) {
          references.push({
            sourceFormId: record.formId.toString(),
            targetFormId: formId,
            referenceType: this.determineReferenceType(record, formId),
            modName: espFile.fileName,
            confidence: 0.9
          });
        }
      }
    }

    return references;
  }

  private async findDependencies(formId: string, espFile: ESPFile): Promise<FormIDDependency[]> {
    const dependencies: FormIDDependency[] = [];

    // Mock implementation - analyze record dependencies
    if (espFile.records) {
      for (const record of espFile.records) {
        if (record.dependencies) {
          for (const depFormId of record.dependencies) {
            if (depFormId === parseInt(formId)) {
              dependencies.push({
                dependentFormId: record.formId.toString(),
                dependencyFormId: formId,
                dependencyType: 'required', // Assume required if listed as dependency
                modName: espFile.fileName
              });
            }
          }
        }
      }
    }

    return dependencies;
  }

  private determineReferenceType(record: any, targetFormId: string): FormIDReference['referenceType'] {
    // Mock implementation - determine reference type based on record structure
    if (record.type === 'CELL' || record.type === 'WRLD') {
      return 'parent';
    }
    if (record.type === 'REFR' || record.type === 'ACHR') {
      return 'child';
    }
    return 'override';
  }

  private determineRecordType(espFile: ESPFile): string {
    // Mock implementation - determine primary record type
    if (espFile.records && espFile.records.length > 0) {
      return espFile.records[0].type || 'UNKNOWN';
    }
    return 'UNKNOWN';
  }

  async findConflicts(formIdMaps: FormIDRelationshipMap[]): Promise<FormIDConflict[]> {
    const conflicts: FormIDConflict[] = [];

    // Group FormIDs by value to find duplicates
    const formIdGroups = new Map<string, FormIDRelationshipMap[]>();

    for (const map of formIdMaps) {
      if (!formIdGroups.has(map.formId)) {
        formIdGroups.set(map.formId, []);
      }
      formIdGroups.get(map.formId)!.push(map);
    }

    // Find conflicts in groups with multiple owners
    for (const [formId, maps] of formIdGroups) {
      if (maps.length > 1) {
        const modNames = maps.map(m => m.modOwnership);
        conflicts.push({
          conflictingMods: modNames,
          conflictType: 'duplicate',
          severity: 'high',
          description: `FormID ${formId} is defined in multiple mods: ${modNames.join(', ')}`,
          resolution: 'One mod should override the other or use a patch'
        });
      }
    }

    // Find missing references
    for (const map of formIdMaps) {
      for (const ref of map.references) {
        const targetExists = formIdMaps.some(m => m.formId === ref.targetFormId);
        if (!targetExists) {
          conflicts.push({
            conflictingMods: [map.modOwnership],
            conflictType: 'missing_reference',
            severity: 'medium',
            description: `FormID ${ref.targetFormId} referenced by ${ref.sourceFormId} in ${map.modOwnership} does not exist`,
            resolution: 'Ensure the referenced mod is installed or create a patch'
          });
        }
      }
    }

    return conflicts;
  }

  async buildDependencyGraph(formIdMaps: FormIDRelationshipMap[]): Promise<FormIDDependencyGraph> {
    const nodes: FormIDNode[] = [];
    const edges: FormIDEdge[] = [];
    const cycles: FormIDCycle[] = [];

    // Create nodes
    for (const map of formIdMaps) {
      nodes.push({
        formId: map.formId,
        modName: map.modOwnership,
        recordType: map.recordType,
        referenceCount: map.references.length
      });
    }

    // Create edges
    for (const map of formIdMaps) {
      for (const ref of map.references) {
        edges.push({
          source: ref.sourceFormId,
          target: ref.targetFormId,
          edgeType: 'references',
          weight: ref.confidence
        });
      }

      for (const dep of map.dependencies) {
        edges.push({
          source: dep.dependentFormId,
          target: dep.dependencyFormId,
          edgeType: 'depends_on',
          weight: 1.0
        });
      }
    }

    // Find conflicts as edges
    const conflicts = await this.findConflicts(formIdMaps);
    for (const conflict of conflicts) {
      // Create conflict edges between conflicting mods
      for (let i = 0; i < conflict.conflictingMods.length - 1; i++) {
        for (let j = i + 1; j < conflict.conflictingMods.length; j++) {
          edges.push({
            source: conflict.conflictingMods[i],
            target: conflict.conflictingMods[j],
            edgeType: 'conflicts_with',
            weight: conflict.severity === 'high' ? 1.0 : conflict.severity === 'medium' ? 0.7 : 0.4
          });
        }
      }
    }

    // Detect cycles (simplified implementation)
    const detectedCycles = this.detectCycles(edges);
    cycles.push(...detectedCycles);

    // Find isolated nodes
    const connectedFormIds = new Set(edges.flatMap(e => [e.source, e.target]));
    const isolatedNodes = nodes
      .filter(n => !connectedFormIds.has(n.formId))
      .map(n => n.formId);

    return {
      nodes,
      edges,
      cycles,
      isolatedNodes
    };
  }

  private detectCycles(edges: FormIDEdge[]): FormIDCycle[] {
    const cycles: FormIDCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart);
        cycles.push({
          nodes: cycle,
          description: `Dependency cycle detected: ${cycle.join(' -> ')}`,
          severity: 'high'
        });
        return true;
      }

      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      // Check all edges from this node
      for (const edge of edges.filter(e => e.source === node)) {
        if (dfs(edge.target, [...path])) {
          return true; // Cycle found
        }
      }

      recursionStack.delete(node);
      path.pop();
      return false;
    };

    // Check all nodes
    for (const edge of edges) {
      if (!visited.has(edge.source)) {
        dfs(edge.source, []);
      }
    }

    return cycles;
  }
}