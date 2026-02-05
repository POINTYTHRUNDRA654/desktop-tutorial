/**
 * Mod Dependency Graph Builder
 * Analyzes mod relationships, conflicts, and optimal load order
 */

import {
  ModDependencyGraph,
  ModNode,
  ModDependencyEdge,
  ModConflict,
  ESPFile
} from '../shared/types';
import { ESPParser } from './esp-parser';
import * as fs from 'fs';
import * as path from 'path';

export class DependencyGraphBuilder {
  private nodes: Map<string, ModNode> = new Map();
  private edges: ModDependencyEdge[] = [];
  private cycles: string[][] = [];

  /**
   * Build dependency graph from mod files
   */
  async buildGraph(modFiles: string[]): Promise<ModDependencyGraph> {
    // Reset state
    this.nodes.clear();
    this.edges.length = 0;
    this.cycles.length = 0;

    // Parse all ESP files
    const espFiles: Map<string, ESPFile> = new Map();
    for (const modFile of modFiles) {
      if (modFile.toLowerCase().endsWith('.esp') || modFile.toLowerCase().endsWith('.esm')) {
        try {
          const espData = await ESPParser.parseFile(modFile);
          espFiles.set(path.basename(modFile), espData);
        } catch (error) {
          console.warn(`Failed to parse ${modFile}:`, error);
        }
      }
    }

    // Create nodes
    for (const [filename, espData] of espFiles) {
      const node = this.createNode(filename, espData);
      this.nodes.set(filename, node);
    }

    // Create edges and detect conflicts
    for (const [filename, node] of this.nodes) {
      this.buildEdges(filename, node, espFiles);
      this.detectConflicts(filename, node, espFiles);
    }

    // Calculate optimal load order
    const loadOrder = this.calculateLoadOrder();

    // Detect cycles
    this.cycles = this.detectCycles();

    return {
      nodes: this.nodes,
      edges: this.edges,
      cycles: this.cycles,
      loadOrder
    };
  }

  private createNode(filename: string, espData: ESPFile): ModNode {
    const providedRecords = new Map<string, number[]>();
    const requiredRecords = new Map<string, number[]>();

    // Analyze records provided by this mod
    for (const record of espData.records) {
      if (!providedRecords.has(record.type)) {
        providedRecords.set(record.type, []);
      }
      providedRecords.get(record.type)!.push(record.formId);
    }

    // Records required (masters) - simplified, real implementation would analyze references
    for (const master of espData.masters) {
      // For now, assume all masters are required
      // In a real implementation, we'd analyze which specific records are referenced
    }

    return {
      name: path.basename(filename, path.extname(filename)),
      filename,
      masters: espData.masters,
      optionalMasters: [], // Would need additional analysis
      providedRecords,
      requiredRecords,
      conflicts: [],
      loadOrder: 0, // Will be set later
      enabled: true
    };
  }

  private buildEdges(filename: string, node: ModNode, espFiles: Map<string, ESPFile>): void {
    for (const master of node.masters) {
      const masterFile = master + '.esm'; // Assume ESM for now
      if (this.nodes.has(masterFile)) {
        this.edges.push({
          from: filename,
          to: masterFile,
          type: 'master',
          weight: 1.0
        });
      }
    }

    // Analyze cross-references between mods
    const espData = espFiles.get(filename);
    if (!espData) return;

    for (const otherFilename of espFiles.keys()) {
      if (otherFilename === filename) continue;

      const otherEspData = espFiles.get(otherFilename);
      if (!otherEspData) continue;

      // Check for record references
      let referenceCount = 0;
      for (const record of espData.records) {
        // Simplified: check if any field data contains FormIDs from other mod
        // Real implementation would properly parse FormID references
        const data = Buffer.concat(record.fields.map(f => f.data));
        for (const otherRecord of otherEspData.records) {
          const formIdBytes = Buffer.alloc(4);
          formIdBytes.writeUInt32LE(otherRecord.formId, 0);
          if (data.includes(formIdBytes)) {
            referenceCount++;
          }
        }
      }

      if (referenceCount > 0) {
        this.edges.push({
          from: filename,
          to: otherFilename,
          type: 'compatibility',
          weight: referenceCount / 100.0 // Normalize weight
        });
      }
    }
  }

  private detectConflicts(filename: string, node: ModNode, espFiles: Map<string, ESPFile>): void {
    const conflicts: ModConflict[] = [];
    const espData = espFiles.get(filename);
    if (!espData) return;

    for (const [otherFilename, otherEspData] of espFiles) {
      if (otherFilename === filename) continue;

      const otherNode = this.nodes.get(otherFilename);
      if (!otherNode) continue;

      // Check for record overrides (same FormID)
      for (const record of espData.records) {
        for (const otherRecord of otherEspData.records) {
          if (record.formId === otherRecord.formId && record.type === otherRecord.type) {
            conflicts.push({
              type: 'override',
              conflictingMod: otherFilename,
              recordType: record.type,
              formIds: [record.formId],
              severity: this.determineConflictSeverity(record, otherRecord)
            });
          }
        }
      }
    }

    node.conflicts = conflicts;
  }

  private determineConflictSeverity(record1: any, record2: any): 'minor' | 'major' | 'critical' {
    // Simplified severity determination
    // Real implementation would analyze the actual changes
    const type = record1.type;

    // Critical conflicts for core records
    if (['NPC_', 'CREA', 'WEAP', 'ARMO', 'QUST'].includes(type)) {
      return 'critical';
    }

    // Major conflicts for important records
    if (['ACTI', 'CONT', 'DOOR', 'LIGH'].includes(type)) {
      return 'major';
    }

    // Minor for most other records
    return 'minor';
  }

  private calculateLoadOrder(): string[] {
    // Topological sort with cycle detection
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (filename: string): boolean => {
      if (visited.has(filename)) return true;
      if (visiting.has(filename)) return false; // Cycle detected

      visiting.add(filename);

      // Visit dependencies first
      for (const edge of this.edges) {
        if (edge.from === filename && edge.type === 'master') {
          if (!visit(edge.to)) {
            return false; // Cycle
          }
        }
      }

      visiting.delete(filename);
      visited.add(filename);
      order.unshift(filename); // Add to front for correct order
      return true;
    };

    // Visit all nodes
    for (const filename of this.nodes.keys()) {
      if (!visited.has(filename)) {
        if (!visit(filename)) {
          // Cycle detected, but we'll continue
          console.warn(`Cycle detected involving ${filename}`);
        }
      }
    }

    // Set load order numbers
    order.forEach((filename, index) => {
      const node = this.nodes.get(filename);
      if (node) {
        node.loadOrder = index + 1;
      }
    });

    return order;
  }

  private detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (filename: string, path: string[]): boolean => {
      visited.add(filename);
      recStack.add(filename);
      path.push(filename);

      for (const edge of this.edges) {
        if (edge.from === filename) {
          if (!visited.has(edge.to)) {
            if (dfs(edge.to, path)) {
              return true;
            }
          } else if (recStack.has(edge.to)) {
            // Cycle found
            const cycleStart = path.indexOf(edge.to);
            cycles.push(path.slice(cycleStart));
            return true;
          }
        }
      }

      recStack.delete(filename);
      path.pop();
      return false;
    };

    for (const filename of this.nodes.keys()) {
      if (!visited.has(filename)) {
        dfs(filename, []);
      }
    }

    return cycles;
  }
}