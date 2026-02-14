/**
 * QuestEditorEngine - Complete Quest/Dialogue/Script Management System
 * Handles quest creation, staging, objectives, dialogue trees, and Papyrus code generation
 */

import type {
  Quest,
  QuestStage,
  QuestObjective,
  DialogueBranch,
  DialogueNode,
  Condition,
  ValidationResult,
  QuestSimulationResult,
  PapyrusCode,
} from '../shared/types';

export interface QuestEditorConfig {
  gamePath?: string;
  modPath?: string;
  enableAutoSave?: boolean;
  papyrusVersion?: 'version1' | 'version2';
}

export interface QuestMarker {
  name: string;
  type: 'location' | 'npc' | 'item' | 'objective';
  formId?: string;
  coordinate?: { x: number; y: number; z: number };
}

export class QuestEditorEngine {
  private quests: Map<string, Quest> = new Map();
  private dialogueBranches: Map<string, DialogueBranch> = new Map();
  private config: QuestEditorConfig;
  private undoStack: Quest[] = [];
  private redoStack: Quest[] = [];

  constructor(config: QuestEditorConfig = {}) {
    this.config = {
      papyrusVersion: 'version2',
      enableAutoSave: true,
      ...config,
    };
  }

  // ============================================================================
  // QUEST MANAGEMENT (3 methods)
  // ============================================================================

  /**
   * Create a new quest with basic metadata
   */
  public createQuest(questData: {
    id: string;
    name: string;
    description: string;
    type: 'main' | 'side' | 'radiant' | 'companion' | 'faction' | 'misc';
    priority?: number;
  }): Quest {
    const quest: Quest = {
      id: questData.id,
      name: questData.name,
      description: questData.description,
      type: questData.type,
      priority: questData.priority || 50,
      stages: [],
      aliases: [],
      properties: [],
      script: undefined,
    };

    this.quests.set(questData.id, quest);
    this.undoStack.push(JSON.parse(JSON.stringify(quest)));
    return quest;
  }

  /**
   * Load an existing quest by ID
   */
  public loadQuest(questId: string): Quest | null {
    const quest = this.quests.get(questId);
    if (quest) {
      this.undoStack.push(JSON.parse(JSON.stringify(quest)));
    }
    return quest || null;
  }

  /**
   * Save quest with validation and auto-formatting
   */
  public saveQuest(questId: string): { success: boolean; errors: string[] } {
    const quest = this.quests.get(questId);
    if (!quest) {
      return { success: false, errors: ['Quest not found'] };
    }

    const validation = this.validateQuest(questId);
    if (!validation.isValid) {
      return { success: false, errors: validation.errors };
    }

    this.quests.set(questId, quest);
    // In production, would persist to disk/database
    return { success: true, errors: [] };
  }

  // ============================================================================
  // STAGE MANAGEMENT (2 methods)
  // ============================================================================

  /**
   * Add a new stage to a quest
   */
  public addStage(questId: string, stageData: {
    index: number;
    logEntry?: string;
  }): QuestStage | null {
    const quest = this.quests.get(questId);
    if (!quest) return null;

    const stage: QuestStage = {
      index: stageData.index,
      logEntry: stageData.logEntry,
      objectives: [],
      conditions: [],
      resultScript: undefined,
      flags: {
        run: false,
        startUpStage: false,
        shutDownStage: false,
        keepInstanceFlag: false,
        completeAllObjectives: false,
      },
    };

    quest.stages.push(stage);
    quest.stages.sort((a, b) => a.index - b.index);
    return stage;
  }

  /**
   * Set completion conditions for a stage
   */
  public setStageConditions(
    questId: string,
    stageIndex: number,
    conditions: Condition[]
  ): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;

    const stage = quest.stages.find((s) => s.index === stageIndex);
    if (!stage) return false;

    stage.conditions = conditions;
    return true;
  }

  // ============================================================================
  // OBJECTIVE SYSTEM (2 methods)
  // ============================================================================

  /**
   * Add an objective to a quest
   */
  public addObjective(questId: string, objectiveData: {
    id: string;
    displayText: string;
    target?: string;
    targetCount?: number;
  }): QuestObjective | null {
    const quest = this.quests.get(questId);
    if (!quest) return null;

    const objective: QuestObjective = {
      id: objectiveData.id,
      displayText: objectiveData.displayText,
      target: objectiveData.target,
      targetCount: objectiveData.targetCount,
      completed: false,
      conditions: [],
    };

    // Add objective to first stage if available
    if (quest.stages.length > 0) {
      quest.stages[0].objectives.push(objective);
    }

    return objective;
  }

  /**
   * Link an objective to a map marker
   */
  public linkObjectiveToMarker(
    questId: string,
    objectiveId: string,
    marker: QuestMarker
  ): boolean {
    const quest = this.quests.get(questId);
    if (!quest) return false;

    // Find objective across all stages
    for (const stage of quest.stages) {
      const objective = stage.objectives.find((o) => o.id === objectiveId);
      if (objective) {
        // Store marker location in target
        objective.target = marker.formId || `marker_${marker.name}`;
        return true;
      }
    }

    return false;
  }

  // ============================================================================
  // DIALOGUE EDITOR (3 methods)
  // ============================================================================

  /**
   * Create a new dialogue branch for a quest
   */
  public createDialogueBranch(branchData: {
    id: string;
    npc: string;
    topic: string;
    priority: number;
    quest?: string;
  }): DialogueBranch {
    const branch: DialogueBranch = {
      id: branchData.id,
      npc: branchData.npc,
      topic: branchData.topic,
      priority: branchData.priority,
      nodes: [],
      quest: branchData.quest,
    };

    this.dialogueBranches.set(branchData.id, branch);
    return branch;
  }

  /**
   * Add a dialogue node to a branch
   */
  public addDialogueNode(
    branchId: string,
    nodeData: {
      id: string;
      speaker: 'player' | 'npc' | 'other';
      text: string;
      prompt?: string;
      emotions?: 'happy' | 'sad' | 'angry' | 'fear' | 'disgust' | 'surprise' | 'neutral' | 'custom';
      animation?: string;
    }
  ): DialogueNode | null {
    const branch = this.dialogueBranches.get(branchId);
    if (!branch) return null;

    const node: DialogueNode = {
      id: nodeData.id,
      speaker: nodeData.speaker,
      text: nodeData.text,
      prompt: nodeData.prompt,
      responses: [],
      conditions: [],
      actions: [],
      emotions: nodeData.emotions,
      animation: nodeData.animation,
    };

    branch.nodes.push(node);
    return node;
  }

  /**
   * Set conditions for dialogue nodes
   */
  public setDialogueConditions(
    branchId: string,
    nodeId: string,
    conditions: Condition[]
  ): boolean {
    const branch = this.dialogueBranches.get(branchId);
    if (!branch) return false;

    const node = branch.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    node.conditions = conditions;
    return true;
  }

  // ============================================================================
  // SCRIPT GENERATION (2 methods)
  // ============================================================================

  /**
   * Generate complete Papyrus script code for a quest
   */
  public generateQuestScript(questId: string): PapyrusCode | null {
    const quest = this.quests.get(questId);
    if (!quest) return null;

    const scriptName = this.sanitizeScriptName(quest.questName);
    const questFormId = this.generateFormId();

    const template = `
; Auto-generated quest script for ${quest.questName}
; Generated at ${new Date().toISOString()}

ScriptName ${scriptName}_Quest extends Quest
{Script for ${quest.questName}}

; ============================================================================
; PROPERTIES
; ============================================================================

Bool Property QuestEnabled = True Auto Hidden
{Tracks if quest is currently active}

Int Property Priority = ${quest.priority} Auto Hidden
{Quest priority ranking}

; ============================================================================
; EVENTS
; ============================================================================

Event OnInit()
  ; Initialize quest-specific variables
  RegisterForEvents()
EndEvent

Event OnStageSet(int aiStage, int aiStageID)
  ; Handle stage transitions
  OnQuestStageUpdate(aiStage)
EndEvent

; ============================================================================
; QUEST MANAGEMENT
; ============================================================================

Function StartQuest()
  QuestEnabled = True
  SetActive(True)
  ${this.generateStageInitialization(quest)}
EndFunction

Function CompleteQuest()
  ${this.generateCompletionHandler(quest)}
  QuestEnabled = False
  Stop()
EndFunction

Function FailQuest()
  QuestEnabled = False
  SetFailed(True)
  Stop()
EndFunction

; ============================================================================
; STAGE HANDLERS
; ============================================================================
${this.generateStageHandlers(quest)}

; ============================================================================
; OBJECTIVE TRACKING
; ============================================================================
${this.generateObjectiveTracking(quest)}

; ============================================================================
; REWARD DISTRIBUTION
; ============================================================================
${this.generateRewardDistribution(quest)}

; ============================================================================
; UTILITY FUNCTIONS
; ============================================================================

Function RegisterForEvents()
  ; Register quest-specific event handlers
EndFunction

Function OnQuestStageUpdate(int stage)
  ; Override in quest-specific scripts
EndFunction
`.trim();

    return {
      scriptName: scriptName,
      scriptBody: template,
      fragments: this.generateDialogueFragments(questId),
      formId: questFormId,
      dependencies: this.extractScriptDependencies(quest),
      createdAt: Date.now(),
    };
  }

  /**
   * Generate Papyrus dialogue fragments for linked dialogue branches
   */
  public generateDialogueFragments(questId: string): string[] {
    const quest = this.quests.get(questId);
    if (!quest) return [];

    const fragments: string[] = [];

    for (const branchId of quest.dialogueLinks) {
      const branch = this.dialogueBranches.get(branchId);
      if (!branch) continue;

      const fragmentName = `${this.sanitizeScriptName(branch.topic)}_Frag`;

      const fragment = `
; Dialogue Fragment: ${branch.topic}
; Topic: ${branch.topic}
; Quest: ${quest.questName}

Scriptname ${fragmentName} extends TopicInfo hidden
{Auto-generated dialogue fragment}

; ============================================================================
; FRAGMENT CODE
; ============================================================================

Function Fragment_0()
  ; Default dialogue response
EndFunction

; ============================================================================
; DIALOGUE CHOICES
; ============================================================================
${this.generateDialogueChoices(branch)}

; ============================================================================
; CONDITIONS
; ============================================================================
${this.generateDialogueConditionChecks(branch)}
`.trim();

      fragments.push(fragment);
    }

    return fragments;
  }

  // ============================================================================
  // TESTING & VALIDATION (4 methods)
  // ============================================================================

  /**
   * Validate quest structure and configurations
   */
  public validateQuest(questId: string): ValidationResult {
    const quest = this.quests.get(questId);
    if (!quest) {
      return { isValid: false, errors: ['Quest not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate quest ID
    if (!quest.questId || quest.questId.trim().length === 0) {
      errors.push('Quest ID is required');
    }

    // Validate quest name
    if (!quest.questName || quest.questName.trim().length === 0) {
      errors.push('Quest name is required');
    }

    // Validate stages
    if (quest.stages.length === 0) {
      warnings.push('Quest has no stages defined');
    } else {
      const stageIndices = new Set(quest.stages.map((s) => s.stageIndex));
      if (stageIndices.size !== quest.stages.length) {
        errors.push('Duplicate stage indices detected');
      }
    }

    // Validate objectives
    if (quest.objectives.length === 0) {
      warnings.push('Quest has no objectives');
    } else {
      const objectiveIds = new Set(quest.objectives.map((o) => o.objectiveId));
      if (objectiveIds.size !== quest.objectives.length) {
        errors.push('Duplicate objective IDs detected');
      }
    }

    // Validate dialogue links
    for (const branchId of quest.dialogueLinks) {
      if (!this.dialogueBranches.has(branchId)) {
        errors.push(`Referenced dialogue branch not found: ${branchId}`);
      }
    }

    // Validate objective markers
    for (const objective of quest.objectives) {
      if (objective.marker && !objective.marker.formId && !objective.marker.coordinate) {
        warnings.push(`Objective ${objective.objectiveId} has insufficient marker data`);
      }
    }

    // Validate rewards
    if (quest.rewards.length === 0) {
      warnings.push('Quest has no rewards defined');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      timestamp: Date.now(),
    };
  }

  /**
   * Simulate quest flow for testing
   */
  public simulateQuestFlow(questId: string): QuestSimulationResult {
    const quest = this.quests.get(questId);
    if (!quest) {
      return {
        questId,
        totalStages: 0,
        executedStages: [],
        completionPath: [],
        estimatedDuration: 0,
        issues: ['Quest not found'],
        success: false,
      };
    }

    const executedStages: number[] = [];
    const completionPath: string[] = [];
    let estimatedDuration = 0;
    const issues: string[] = [];

    // Simulate stage progression
    for (const stage of quest.stages) {
      executedStages.push(stage.stageIndex);
      completionPath.push(stage.description);

      // Check stage conditions
      if (stage.conditions.length === 0) {
        issues.push(`Stage ${stage.stageIndex} has no completion conditions`);
      }

      // Estimate time based on objectives
      const stageObjectives = quest.objectives.filter((o) => o.stageIndex === stage.stageIndex);
      estimatedDuration += stageObjectives.length * 5; // 5 minutes per objective
    }

    // Validate completion
    const validation = this.validateQuest(questId);

    return {
      questId,
      totalStages: quest.stages.length,
      executedStages,
      completionPath,
      estimatedDuration,
      issues: [...issues, ...validation.errors],
      success: validation.isValid,
    };
  }

  /**
   * Get extended quest validation results with suggestions
   */
  public getValidationSuggestions(questId: string): { errors: string[]; warnings: string[]; suggestions: string[] } {
    const validation = this.validateQuest(questId);
    const suggestions: string[] = [];

    if (validation.warnings.includes('Quest has no stages defined')) {
      suggestions.push('Consider adding at least 2 stages: initial and completion');
    }

    if (validation.warnings.includes('Quest has no objectives')) {
      suggestions.push('Add objectives to guide the player through the quest');
    }

    if (validation.warnings.includes('Quest has no rewards defined')) {
      suggestions.push('Define rewards (items, gold, experience) for quest completion');
    }

    return {
      errors: validation.errors,
      warnings: validation.warnings,
      suggestions,
    };
  }

  /**
   * Export quest to JSON format
   */
  public exportQuestToJson(questId: string): string | null {
    const quest = this.quests.get(questId);
    if (!quest) return null;

    return JSON.stringify(quest, null, 2);
  }

  // ============================================================================
  // PRIVATE UTILITY METHODS
  // ============================================================================

  private sanitizeScriptName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 32);
  }

  private generateFormId(): string {
    return '0x' + Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .toUpperCase()
      .padStart(6, '0');
  }

  private generateStageInitialization(quest: Quest): string {
    if (quest.stages.length === 0) return '';

    const lines = quest.stages.map((stage) => {
      return `  SetStage(${stage.stageIndex}) ; ${stage.description}`;
    });

    return lines.join('\n');
  }

  private generateCompletionHandler(quest: Quest): string {
    const rewardLines = quest.rewards
      .map((reward) => {
        if (reward.type === 'item') {
          return `  Game.GetPlayer().AddItem(Game.GetFormFromFile(${reward.formId}, "${quest.questName}.esp"), ${reward.amount || 1})`;
        } else if (reward.type === 'faction') {
          return `  Game.GetPlayer().SetInFaction(Game.GetFormFromFile(${reward.formId}, "${quest.questName}.esp"))`;
        }
        return '';
      })
      .filter((line) => line);

    return rewardLines.join('\n') || '  ; No rewards specified';
  }

  private generateStageHandlers(quest: Quest): string {
    const handlers = quest.stages
      .map((stage) => {
        return `
; Stage ${stage.stageIndex}: ${stage.description}
Function OnStage_${stage.stageIndex}()
  ; Triggered when reaching stage ${stage.stageIndex}
  Debug.Notification("${stage.logEntry || stage.description}")
  ${stage.scriptFragments?.slice(0, 1).join('\n  ') || '; Stage-specific code'}
EndFunction`.trim();
      })
      .join('\n\n');

    return handlers;
  }

  private generateObjectiveTracking(quest: Quest): string {
    const objectives = quest.objectives
      .map((obj) => {
        return `
; Objective: ${obj.description}
Function SetObjective_${obj.objectiveId}()
  SetObjectiveDisplayed(${obj.objectiveId}, True)
  Debug.Trace("Objective Set: ${obj.description}")
EndFunction`.trim();
      })
      .join('\n\n');

    return objectives || '; No objectives to track';
  }

  private generateRewardDistribution(quest: Quest): string {
    if (quest.rewards.length === 0) return '; No rewards';

    return quest.rewards
      .map((reward, index) => {
        return `
; Reward ${index + 1}: ${reward.description}
Function GiveReward_${index}()
  ; Distribute reward: ${reward.description}
EndFunction`.trim();
      })
      .join('\n\n');
  }

  private generateDialogueChoices(branch: DialogueBranch): string {
    if (branch.nodes.length === 0) return '; No dialogue nodes';

    return branch.nodes
      .map((node) => {
        return `
; Response: "${node.text}"
Function Response_${node.nodeId}()
  ${node.scriptActions?.slice(0, 1).join('\n  ') || '; Response-specific code'}
EndFunction`.trim();
      })
      .join('\n\n');
  }

  private generateDialogueConditionChecks(branch: DialogueBranch): string {
    if (branch.conditions.length === 0) return '; No special conditions';

    return branch.conditions
      .map((cond, index) => {
        return `
; Condition ${index + 1}
Bool Function Check_Condition_${index}()
  Return ${cond} ; Condition logic
EndFunction`.trim();
      })
      .join('\n\n');
  }

  private extractScriptDependencies(quest: Quest): string[] {
    const dependencies: Set<string> = new Set();

    // Add stage dependencies
    for (const stage of quest.stages) {
      for (const condition of stage.conditions || []) {
        if ((condition as any).type === 'quest') {
          dependencies.add(`Quest.${(condition as any).questId}`);
        }
      }
    }

    // Add objective dependencies
    for (const objective of quest.objectives) {
      if (objective.marker?.formId) {
        dependencies.add(`Actor.${objective.targetFormId}`);
      }
    }

    return Array.from(dependencies);
  }
}

// Export singleton instance
export const questEditor = new QuestEditorEngine();
