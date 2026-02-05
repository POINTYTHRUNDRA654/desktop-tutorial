/**
 * Quest/Objective Mining Engine
 * Analyzes quest dependencies and conflicts
 */

import {
  QuestObjectiveMiningEngine,
  QuestObjectiveAnalysis,
  QuestObjective,
  QuestDependency,
  QuestConflict,
  QuestModInteraction,
  QuestChange,
  QuestAddition,
  QuestDependencyGraph,
  QuestNode,
  QuestEdge,
  QuestCycle,
  QuestPath,
  ESPFile
} from '../shared/types';

export class QuestObjectiveMiningEngineImpl implements QuestObjectiveMiningEngine {
  async analyze(espFiles: ESPFile[]): Promise<QuestObjectiveAnalysis[]> {
    const analyses: QuestObjectiveAnalysis[] = [];

    for (const espFile of espFiles) {
      try {
        const questAnalyses = await this.analyzeESPQuests(espFile);
        analyses.push(...questAnalyses);
      } catch (error) {
        console.warn(`Failed to analyze quests in ${espFile.fileName}:`, error);
      }
    }

    return analyses;
  }

  private async analyzeESPQuests(espFile: ESPFile): Promise<QuestObjectiveAnalysis[]> {
    const analyses: QuestObjectiveAnalysis[] = [];

    if (!espFile.records) return analyses;

    // Find all quest records
    const questRecords = espFile.records.filter(r => r.type === 'QUST');

    for (const questRecord of questRecords) {
      try {
        const analysis = await this.analyzeQuest(questRecord, espFile);
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.warn(`Failed to analyze quest ${questRecord.formId}:`, error);
      }
    }

    return analyses;
  }

  private async analyzeQuest(questRecord: any, espFile: ESPFile): Promise<QuestObjectiveAnalysis | null> {
    const objectives: QuestObjective[] = [];
    const dependencies: QuestDependency[] = [];
    const modInteractions: QuestModInteraction[] = [];

    // Extract quest objectives
    if (questRecord.objectives) {
      for (const obj of questRecord.objectives) {
        objectives.push({
          objectiveId: obj.id || 'unknown',
          description: obj.text || 'No description',
          completionCriteria: obj.conditions || [],
          rewards: obj.rewards || [],
          dependencies: obj.prerequisites || []
        });
      }
    }

    // Extract quest dependencies
    if (questRecord.prerequisites) {
      for (const prereq of questRecord.prerequisites) {
        dependencies.push({
          dependentQuest: questRecord.formId || 'unknown',
          dependencyQuest: prereq.questId,
          dependencyType: prereq.required ? 'required' : 'optional',
          modName: espFile.fileName
        });
      }
    }

    // Analyze mod interactions (simplified)
    modInteractions.push({
      modName: espFile.fileName,
      changes: [],
      additions: [],
      compatibility: 'compatible'
    });

    return {
      questId: questRecord.formId || 'unknown',
      questName: questRecord.name || 'Unknown Quest',
      objectives,
      dependencies,
      conflicts: [], // Will be populated by detectConflicts
      modInteractions
    };
  }

  async detectConflicts(questAnalyses: QuestObjectiveAnalysis[]): Promise<QuestConflict[]> {
    const conflicts: QuestConflict[] = [];

    // Group quests by name to find duplicates/modifications
    const questGroups = new Map<string, QuestObjectiveAnalysis[]>();

    for (const analysis of questAnalyses) {
      const key = analysis.questName.toLowerCase();
      if (!questGroups.has(key)) {
        questGroups.set(key, []);
      }
      questGroups.get(key)!.push(analysis);
    }

    // Find conflicts in quest groups
    for (const [questName, analyses] of questGroups) {
      if (analyses.length > 1) {
        const modNames = analyses.map(a => a.modInteractions[0]?.modName).filter(Boolean);
        conflicts.push({
          conflictingQuests: analyses.map(a => a.questId),
          conflictType: 'objective',
          severity: 'medium',
          description: `Quest "${questName}" is modified by multiple mods: ${modNames.join(', ')}`,
          resolution: 'Use a compatibility patch or choose one mod version'
        });
      }
    }

    // Check for circular dependencies
    const dependencyConflicts = this.detectDependencyConflicts(questAnalyses);
    conflicts.push(...dependencyConflicts);

    // Check for reward conflicts
    const rewardConflicts = this.detectRewardConflicts(questAnalyses);
    conflicts.push(...rewardConflicts);

    return conflicts;
  }

  private detectDependencyConflicts(questAnalyses: QuestObjectiveAnalysis[]): QuestConflict[] {
    const conflicts: QuestConflict[] = [];

    // Build dependency map
    const dependencyMap = new Map<string, string[]>();
    for (const analysis of questAnalyses) {
      for (const dep of analysis.dependencies) {
        if (!dependencyMap.has(dep.dependentQuest)) {
          dependencyMap.set(dep.dependentQuest, []);
        }
        dependencyMap.get(dep.dependentQuest)!.push(dep.dependencyQuest);
      }
    }

    // Check for cycles (simplified)
    for (const [questId, deps] of dependencyMap) {
      for (const dep of deps) {
        if (dependencyMap.has(dep) && dependencyMap.get(dep)!.includes(questId)) {
          conflicts.push({
            conflictingQuests: [questId, dep],
            conflictType: 'completion',
            severity: 'high',
            description: `Circular dependency detected between quests ${questId} and ${dep}`,
            resolution: 'Break the circular dependency or use patches'
          });
        }
      }
    }

    return conflicts;
  }

  private detectRewardConflicts(questAnalyses: QuestObjectiveAnalysis[]): QuestConflict[] {
    const conflicts: QuestConflict[] = [];

    // Group objectives by reward type
    const rewardGroups = new Map<string, QuestObjective[]>();

    for (const analysis of questAnalyses) {
      for (const objective of analysis.objectives) {
        for (const reward of objective.rewards) {
          const key = `${reward.type}:${reward.formId || 'generic'}`;
          if (!rewardGroups.has(key)) {
            rewardGroups.set(key, []);
          }
          rewardGroups.get(key)!.push(objective);
        }
      }
    }

    // Find duplicate rewards
    for (const [rewardKey, objectives] of rewardGroups) {
      if (objectives.length > 1) {
        const questIds = [...new Set(objectives.map(o => o.objectiveId))];
        conflicts.push({
          conflictingQuests: questIds,
          conflictType: 'reward',
          severity: 'low',
          description: `Multiple quests offer similar reward: ${rewardKey}`,
          resolution: 'Consider adjusting reward values to avoid overlap'
        });
      }
    }

    return conflicts;
  }

  async buildDependencyGraph(questAnalyses: QuestObjectiveAnalysis[]): Promise<QuestDependencyGraph> {
    const nodes: QuestNode[] = [];
    const edges: QuestEdge[] = [];
    const cycles: QuestCycle[] = [];
    const completionPaths: QuestPath[] = [];

    // Create nodes
    for (const analysis of questAnalyses) {
      nodes.push({
        questId: analysis.questId,
        questName: analysis.questName,
        modName: analysis.modInteractions[0]?.modName || 'unknown',
        objectiveCount: analysis.objectives.length
      });
    }

    // Create edges from dependencies
    for (const analysis of questAnalyses) {
      for (const dep of analysis.dependencies) {
        edges.push({
          source: dep.dependentQuest,
          target: dep.dependencyQuest,
          edgeType: dep.dependencyType === 'required' ? 'requires' : 'enables',
          weight: dep.dependencyType === 'required' ? 1.0 : 0.5
        });
      }
    }

    // Add conflict edges
    const conflicts = await this.detectConflicts(questAnalyses);
    for (const conflict of conflicts) {
      for (let i = 0; i < conflict.conflictingQuests.length - 1; i++) {
        for (let j = i + 1; j < conflict.conflictingQuests.length; j++) {
          edges.push({
            source: conflict.conflictingQuests[i],
            target: conflict.conflictingQuests[j],
            edgeType: 'conflicts',
            weight: conflict.severity === 'high' ? 1.0 : conflict.severity === 'medium' ? 0.7 : 0.4
          });
        }
      }
    }

    // Detect cycles
    const detectedCycles = this.detectCycles(edges);
    cycles.push(...detectedCycles);

    // Find completion paths (simplified)
    const paths = this.findCompletionPaths(nodes, edges);
    completionPaths.push(...paths);

    return {
      nodes,
      edges,
      cycles,
      completionPaths
    };
  }

  private detectCycles(edges: QuestEdge[]): QuestCycle[] {
    const cycles: QuestCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart);
        cycles.push({
          nodes: cycle,
          description: `Quest dependency cycle: ${cycle.join(' -> ')}`,
          breakable: this.isCycleBreakable(cycle, edges)
        });
        return true;
      }

      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      for (const edge of edges.filter(e => e.source === node)) {
        if (dfs(edge.target, [...path])) {
          return true;
        }
      }

      recursionStack.delete(node);
      path.pop();
      return false;
    };

    for (const edge of edges) {
      if (!visited.has(edge.source)) {
        dfs(edge.source, []);
      }
    }

    return cycles;
  }

  private isCycleBreakable(cycle: string[], edges: QuestEdge[]): boolean {
    // Check if any edge in the cycle is optional
    for (let i = 0; i < cycle.length - 1; i++) {
      const edge = edges.find(e => e.source === cycle[i] && e.target === cycle[i + 1]);
      if (edge && edge.edgeType === 'enables') {
        return true; // Optional dependency can be broken
      }
    }
    return false;
  }

  private findCompletionPaths(nodes: QuestNode[], edges: QuestEdge[]): QuestPath[] {
    const paths: QuestPath[] = [];

    // Find root quests (no dependencies)
    const dependentQuests = new Set(edges.map(e => e.target));
    const rootQuests = nodes.filter(n => !dependentQuests.has(n.questId));

    // For each root quest, find completion path
    for (const rootQuest of rootQuests) {
      const path = this.buildCompletionPath(rootQuest.questId, edges, nodes);
      if (path.quests.length > 1) {
        paths.push(path);
      }
    }

    return paths.slice(0, 10); // Limit to top 10 paths
  }

  private buildCompletionPath(startQuest: string, edges: QuestEdge[], nodes: QuestNode[]): QuestPath {
    const visited = new Set<string>();
    const path: string[] = [];
    let totalObjectives = 0;
    let estimatedTime = 0;

    const dfs = (questId: string): void => {
      if (visited.has(questId)) return;
      visited.add(questId);
      path.push(questId);

      const node = nodes.find(n => n.questId === questId);
      if (node) {
        totalObjectives += node.objectiveCount;
        estimatedTime += node.objectiveCount * 30; // Estimate 30 minutes per objective
      }

      // Find quests that depend on this one
      const dependents = edges.filter(e => e.target === questId && e.edgeType === 'requires');
      for (const dep of dependents) {
        dfs(dep.source);
      }
    };

    dfs(startQuest);

    return {
      quests: path,
      totalObjectives,
      estimatedTime,
      difficulty: totalObjectives > 20 ? 'hard' : totalObjectives > 10 ? 'medium' : 'easy'
    };
  }
}