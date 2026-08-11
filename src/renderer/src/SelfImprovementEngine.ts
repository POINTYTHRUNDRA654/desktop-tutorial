/**
 * Mossy Self-Improvement Engine
 * Enables Mossy to learn from interactions, identify improvement opportunities,
 * and autonomously enhance her capabilities.
 */

import { LocalAIEngine } from './LocalAIEngine';
import type { UserFeedback } from '../../shared/types';
import { SS2_PLOT_SYSTEM_PROMPT, CITY_PLAN_SYSTEM_PROMPT } from '../../shared/ss2PracticePrompts';

export interface LearningPattern {
  id: string;
  pattern: string;
  frequency: number;
  successRate: number;
  lastSeen: string;
  category: 'question' | 'task' | 'error' | 'feedback';
  insights: string[];
}

export interface ImprovementOpportunity {
  id: string;
  type: 'knowledge_gap' | 'response_improvement' | 'new_feature' | 'efficiency_gain';
  description: string;
  confidence: number;
  proposedSolution: string;
  impact: 'low' | 'medium' | 'high';
  createdAt: string;
  implemented?: boolean;
  implementedAt?: string;
}

export interface ScriptGenerationRequest {
  name?: string;
  type: 'papyrus' | 'xedit' | 'blender' | 'quest' | 'automation' | 'ss2-plot' | 'city-plan';
  description: string;
  requirements?: string[];
  context?: string;
}

export interface GeneratedScript {
  id: string;
  type: string;
  name: string;
  content: string;
  description: string;
  generatedAt: string;
  requirements: string[];
}

export class SelfImprovementEngine {
  private patterns: LearningPattern[] = [];
  private opportunities: ImprovementOpportunity[] = [];
  private feedback: UserFeedback[] = [];
  private generatedScripts: GeneratedScript[] = [];
  private totalInteractions: number = 0;
  private opportunityCounter: number = 0;

  constructor() {
    this.loadPersistedData();
  }

  /**
   * Records a user interaction for pattern analysis
   */
  recordInteraction(query: string, response: string, toolsUsed: string[], outcome: 'success' | 'partial' | 'failure') {
    const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Increment interaction counter
    this.totalInteractions++;

    // Record action in existing system
    LocalAIEngine.recordAction('user_interaction', {
      query,
      response,
      toolsUsed,
      outcome,
      interactionId
    });

    // Analyze for patterns
    this.analyzeInteraction(query, response, toolsUsed, outcome, interactionId);

    // Look for improvement opportunities
    this.identifyImprovements(query, response, outcome);

    this.savePersistedData();
  }

  /**
   * Records explicit user feedback
   */
  recordFeedback(rating: number, feedbackText: string, context: UserFeedback['context']) {
    const userFeedback: UserFeedback = {
      id: `feedback_${Date.now()}`,
      rating,
      comments: feedbackText,
      timestamp: Date.now(),
      context
    };

    this.feedback.push(userFeedback);
    this.analyzeFeedback(userFeedback);
    this.savePersistedData();
  }

  /**
   * Analyzes user interactions to identify patterns
   */
  private analyzeInteraction(query: string, response: string, toolsUsed: string[], outcome: 'success' | 'partial' | 'failure', interactionId: string) {
    // Extract patterns from query
    const queryPatterns = this.extractPatterns(query, 'question');

    // Update pattern frequencies
    queryPatterns.forEach(pattern => {
      const existing = this.patterns.find(p => p.pattern === pattern);
      if (existing) {
        existing.frequency++;
        existing.lastSeen = new Date().toISOString();
        existing.successRate = this.calculateSuccessRate(existing.pattern, outcome);
      } else {
        this.patterns.push({
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern,
          frequency: 1,
          successRate: outcome === 'success' ? 1 : 0,
          lastSeen: new Date().toISOString(),
          category: 'question',
          insights: []
        });
      }
    });

    // Analyze tool usage patterns
    if (toolsUsed.length > 0) {
      const toolPattern = `uses_tools:${toolsUsed.join(',')}`;
      this.updatePattern(toolPattern, 'task', outcome);
    }
  }

  /**
   * Analyzes user feedback for insights
   */
  private analyzeFeedback(feedback: UserFeedback) {
    // Extract insights from feedback
    const insights = this.extractInsightsFromFeedback(feedback.comments || '');

    // Update patterns based on feedback
    insights.forEach(insight => {
      const pattern = this.patterns.find(p => p.pattern.includes(insight.toLowerCase()));
      if (pattern) {
        pattern.insights.push(insight);
        // Keep only recent insights
        pattern.insights = pattern.insights.slice(-5);
      }
    });
  }

  /**
   * Identifies potential improvements based on interactions
   */
  private identifyImprovements(query: string, response: string, outcome: 'success' | 'partial' | 'failure') {
    // Check for knowledge gaps. Dedupe on the query itself (not a fresh id/timestamp) so a
    // recurring topic (e.g. the same question about an SS2 override coming back with "not sure"
    // on every turn) bumps one existing entry instead of piling up a new near-identical
    // opportunity per interaction — that pile-up was showing up as a "stuck" repeating entry
    // in the Self-Improvement panel since every copy tied for top confidence.
    if (outcome === 'failure' && (response.includes("I don't know") || response.includes("not sure"))) {
      const existing = this.opportunities.find(
        o => o.type === 'knowledge_gap' && !o.implemented && o.description === `Knowledge gap identified for query: "${query}"`
      );
      if (existing) {
        existing.confidence = Math.min(1, existing.confidence + 0.02);
        existing.createdAt = new Date().toISOString();
      } else {
        this.opportunities.push({
          id: `improvement_${++this.opportunityCounter}`,
          type: 'knowledge_gap',
          description: `Knowledge gap identified for query: "${query}"`,
          confidence: 0.8,
          proposedSolution: 'Research and add relevant information to knowledge vault',
          impact: 'medium',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Check for response quality issues — same dedup reasoning as above.
    if (outcome === 'partial' && response.length < 100) {
      const existing = this.opportunities.find(
        o => o.type === 'response_improvement' && !o.implemented && o.description === 'Response too brief for complex query'
      );
      if (existing) {
        existing.confidence = Math.min(1, existing.confidence + 0.02);
        existing.createdAt = new Date().toISOString();
      } else {
        this.opportunities.push({
          id: `improvement_${++this.opportunityCounter}`,
          type: 'response_improvement',
          description: 'Response too brief for complex query',
          confidence: 0.6,
          proposedSolution: 'Enhance response detail for similar queries',
          impact: 'low',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Check for repeated patterns that could be automated
    const recentPatterns = this.patterns.filter(p => p.frequency > 3);
    recentPatterns.forEach(pattern => {
      if (!this.opportunities.find(o => o.description.includes(pattern.pattern))) {
        this.opportunities.push({
          id: `improvement_${++this.opportunityCounter}`,
          type: 'efficiency_gain',
          description: `Frequent pattern detected: ${pattern.pattern}`,
          confidence: 0.7,
          proposedSolution: 'Create automated workflow or shortcut',
          impact: 'medium',
          createdAt: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Generates self-improvement suggestions
   */
  generateImprovementSuggestions(): ImprovementOpportunity[] {
    return this.opportunities
      .filter(o => !o.implemented)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 suggestions
  }

  /**
   * Gets learning insights for system instruction enhancement
   */
  getLearningInsights(): string {
    const insights: string[] = [];

    // Top successful patterns
    const successfulPatterns = this.patterns
      .filter(p => p.successRate > 0.8 && p.frequency > 2)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    if (successfulPatterns.length > 0) {
      insights.push('**High-Success Patterns:**');
      successfulPatterns.forEach(p => {
        insights.push(`- ${p.pattern} (${p.frequency} times, ${(p.successRate * 100).toFixed(0)}% success)`);
      });
    }

    // Common failure patterns
    const failurePatterns = this.patterns
      .filter(p => p.successRate < 0.5 && p.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    if (failurePatterns.length > 0) {
      insights.push('**Areas Needing Improvement:**');
      failurePatterns.forEach(p => {
        insights.push(`- ${p.pattern} (${(p.successRate * 100).toFixed(0)}% success rate)`);
      });
    }

    // Tool usage patterns
    const toolPatterns = this.patterns
      .filter(p => p.pattern.startsWith('uses_tools:') && p.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    if (toolPatterns.length > 0) {
      insights.push('**Tool Usage Patterns:**');
      toolPatterns.forEach(p => {
        insights.push(`- ${p.pattern.replace('uses_tools:', 'Uses: ')} (${p.frequency} times, ${(p.successRate * 100).toFixed(0)}% success)`);
      });
    }

    // Recent feedback insights
    const recentFeedback = this.feedback
      .filter(f => typeof f.timestamp === 'number' && f.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 2);

    if (recentFeedback.length > 0) {
      insights.push('**Recent User Feedback:**');
      recentFeedback.forEach(f => {
        insights.push(`- Rating: ${f.rating}/5 - "${f.comments}"`);
      });
    }

    return insights.length > 0 ? insights.join('\n') : '';
  }

  /**
   * Lets external checks (e.g. the SS2 "Reality Check" GradingEngine, which
   * scores generated ss2-plot/city-plan design docs against real downloaded
   * mods) report a deficiency as a tracked opportunity — same dedup-by-description
   * pattern identifyImprovements() already uses internally, so a repeated
   * grading deficiency strengthens an existing entry instead of piling up duplicates.
   */
  reportGradingOpportunity(description: string, proposedSolution: string, confidence: number, impact: ImprovementOpportunity['impact']) {
    const existing = this.opportunities.find(o => o.type === 'response_improvement' && !o.implemented && o.description === description);
    if (existing) {
      existing.confidence = Math.min(1, existing.confidence + 0.05);
      existing.createdAt = new Date().toISOString();
    } else {
      this.opportunities.push({
        id: `improvement_${++this.opportunityCounter}`,
        type: 'response_improvement',
        description,
        confidence: Math.max(0, Math.min(1, confidence)),
        proposedSolution,
        impact,
        createdAt: new Date().toISOString()
      });
    }
    this.savePersistedData();
  }

  /**
   * Implements an improvement opportunity
   */
  implementImprovement(opportunityId: string) {
    const opportunity = this.opportunities.find(o => o.id === opportunityId);
    if (opportunity) {
      opportunity.implemented = true;
      opportunity.implementedAt = new Date().toISOString();
      this.savePersistedData();
    }
  }

  /**
   * Generates a script for the user's real request via LocalAIEngine.
   *
   * This used to be a purely template-based generator: fixed boilerplate strings
   * keyed only on `request.type`, with a "confidence" score computed from a hardcoded
   * base value (0.7) plus a static +0.2 bump — `request.description` (what the user
   * actually asked for) was never read. It was presented in the UI as AI-generated
   * code, which it was not. This now genuinely calls the AI with a type-specific
   * system prompt and the user's real description/requirements.
   */
  async generateScript(request: ScriptGenerationRequest): Promise<GeneratedScript> {
    const scriptId = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const SYSTEM_PROMPTS: Record<ScriptGenerationRequest['type'], string> = {
      papyrus: `You are a Fallout 4 Papyrus scripting expert. Write a complete, compilable Papyrus script (.psc) for Fallout 4. Follow real FO4 Papyrus syntax: Scriptname declarations with the correct "extends" clause, Properties declared at script scope only (never inside a Function/Event body), never name a Property identically to the script's own Scriptname. Output only the script code in a single code block, with a one-line comment above it summarizing what it does.`,
      xedit: `You are an xEdit (FO4Edit) Pascal scripting expert. Write a complete xEdit script for Fallout 4 record editing, using the real xEdit Pascal script API (functions like GetElement, SetElementEditValues, ElementByPath, etc.) and the standard "function Process(e: IInterface): integer;" entry point structure. Output only the script code in a single code block, with a one-line comment above it summarizing what it does.`,
      blender: `You are a Blender Python scripting expert specializing in Fallout 4 modding workflows (PyNifly NIF export/import, correct FO4 unit scale of 1.0, 30 FPS, applying transforms before export, BSSubIndexTriShape handling). Write a complete Blender Python script using the bpy API. Output only the script code in a single code block, with a one-line comment above it summarizing what it does.`,
      quest: `You are a Fallout 4 Papyrus quest-scripting expert. Write a complete Papyrus quest script (.psc, extends Quest) implementing the requested quest logic with real Fallout 4 Quest/Stage/Alias APIs. Output only the script code in a single code block, with a one-line comment above it summarizing what it does.`,
      automation: `You are a Python automation scripting expert for Fallout 4 modding pipelines (asset processing, batch file operations, build automation). Write a complete, runnable Python script for the requested automation task. Output only the script code in a single code block, with a one-line comment above it summarizing what it does.`,
      'ss2-plot': SS2_PLOT_SYSTEM_PROMPT,
      'city-plan': CITY_PLAN_SYSTEM_PROMPT,
    };

    const systemInstruction = SYSTEM_PROMPTS[request.type];
    if (!systemInstruction) {
      throw new Error(`Unsupported script type: ${request.type}`);
    }

    const requirementsText = (request.requirements || []).length
      ? `\n\nRequirements:\n${(request.requirements || []).map(r => `- ${r}`).join('\n')}`
      : '';
    const query = `${request.description}${requirementsText}${request.context ? `\n\nContext: ${request.context}` : ''}`;

    let responseContent: string;
    if (request.type === 'ss2-plot' || request.type === 'city-plan') {
      // SS2 practice generation needs to hit exact real naming conventions and
      // property names, not just "sound plausible" — a precision task the local
      // default (gemma4:12b) plateaus on even when shown real examples directly
      // (confirmed: 32/32 practice sessions capped at 65/100, never improving
      // across 8 retries). Routing this specific generation through Groq's
      // qwen3.6-27b (already proven in the self-critique pass elsewhere in this
      // codebase) tests whether it's a model-capability ceiling, not a prompt
      // problem — deliberately bypassing LocalAIEngine's local-first routing for
      // just this one precision-sensitive case.
      const bridge = (window.electron?.api || window.electronAPI) as any;
      const groqResp = await bridge?.aiChatGroq?.(query, systemInstruction, 'qwen/qwen3.6-27b', []);
      if (!groqResp?.success) {
        throw new Error(groqResp?.error || 'Groq generation failed for SS2 practice content.');
      }
      responseContent = String(groqResp.content || '');
    } else {
      // Build-guide-style generations run a much longer system prompt than an
      // ordinary chat turn and can legitimately take longer to answer — the
      // default 30s local-model timeout was tuned for chat latency, not this.
      // think:false also avoids a real failure mode found in testing: a hybrid
      // reasoning model (e.g. Ollama's qwen3.5) can burn its entire token budget
      // on internal "thinking" and never emit the actual answer before the old
      // timeout fired, silently producing nothing. Forcing non-thinking mode
      // plus a longer window makes this reliable regardless of which local
      // model is configured.
      const response = await LocalAIEngine.generateResponse(
        query, systemInstruction, undefined, false, undefined,
        { timeoutMs: 120_000, think: false }
      );
      responseContent = response.content;
    }
    const codeMatch = responseContent.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
    const scriptContent = (codeMatch ? codeMatch[1] : responseContent).trim();
    const scriptName = (request.name && request.name.trim()) || `${request.type}_${scriptId.slice(-6)}`;

    const generatedScript: GeneratedScript = {
      id: scriptId,
      type: request.type,
      name: scriptName,
      content: scriptContent,
      description: request.description,
      generatedAt: new Date().toISOString(),
      requirements: request.requirements || []
    };

    this.generatedScripts.push(generatedScript);
    this.savePersistedData();

    // Feed this generation into the same interaction/pattern tracking used for
    // chat — script practice runs should count toward "learned patterns" and
    // tool-usage stats in the panel, not sit disconnected from the learning loop.
    this.recordInteraction(
      request.description,
      scriptContent.slice(0, 500),
      [`generateScript:${request.type}`],
      'success'
    );

    return generatedScript;
  }

  /**
   * Gets all generated scripts
   */
  getGeneratedScripts(): GeneratedScript[] {
    return this.generatedScripts.sort((a, b) =>
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }

  /**
   * Gets scripts by type
   */
  getScriptsByType(type: string): GeneratedScript[] {
    return this.generatedScripts.filter(s => s.type === type);
  }

  /**
   * Deletes a generated script
   */
  deleteScript(scriptId: string): boolean {
    const index = this.generatedScripts.findIndex(s => s.id === scriptId);
    if (index !== -1) {
      this.generatedScripts.splice(index, 1);
      this.savePersistedData();
      return true;
    }
    return false;
  }

  /**
   * Improves script generation based on feedback and patterns
   */
  improveScriptGeneration(): void {
    // Analyze recent script generations
    const recentScripts = this.generatedScripts.slice(-20);

    if (recentScripts.length > 0) {
      // Create improvement opportunities based on recent generation activity
      const scriptImprovement: ImprovementOpportunity = {
        id: `script_improvement_${++this.opportunityCounter}`,
        type: 'efficiency_gain',
        description: `Review script generation quality across ${recentScripts.length} recent generations`,
        confidence: 0.85,
        proposedSolution: 'Analyze successful script patterns and update generation algorithms',
        impact: 'high',
        createdAt: new Date().toISOString()
      };

      this.opportunities.push(scriptImprovement);
      this.savePersistedData();
    }
  }

  /**
   * Gets performance metrics
   */
  getPerformanceMetrics() {
    const totalInteractions = this.totalInteractions;
    const avgSuccessRate = this.patterns.length > 0 ? this.patterns.reduce((sum, p) => sum + p.successRate, 0) / this.patterns.length : 0;
    const avgFeedbackRating = this.feedback.length > 0 ? this.feedback.reduce((sum, f) => sum + f.rating, 0) / this.feedback.length : 0;

    return {
      totalInteractions,
      totalPatterns: this.patterns.length,
      averageSuccessRate: avgSuccessRate,
      averageFeedbackRating: avgFeedbackRating,
      improvementOpportunities: this.opportunities.filter(o => !o.implemented).length
    };
  }

  // Private script generation methods

  private generatePapyrusScript(request: ScriptGenerationRequest): { content: string; name: string } {
    const scriptName = request.name || `GeneratedScript_${Date.now()}`;

    // Base Papyrus script template
    let content = `Scriptname ${scriptName} extends ObjectReference
{Generated by Mossy AI Assistant - ${request.description}}

; Properties
String Property MyString Auto
Int Property MyInt Auto
Bool Property MyBool Auto

; Events
Event OnInit()
    ; Initialization code
    Debug.Trace("${scriptName}: Script initialized")
EndEvent

Event OnActivate(ObjectReference akActionRef)
    ; Activation logic
    If akActionRef == Game.GetPlayer()
        Debug.Notification("${scriptName}: Activated by player")
    EndIf
EndEvent

; Functions
Function DoSomething()
    ; Custom functionality
    Debug.Trace("${scriptName}: Doing something")
EndFunction
`;

    // Add specific functionality based on requirements
    if (request.requirements) {
      request.requirements.forEach(req => {
        if (req.toLowerCase().includes('quest')) {
          content += `
; Quest-related functionality
Function UpdateQuestStage(Int stage)
    ; Update quest stage
    Debug.Trace("${scriptName}: Quest stage updated to " + stage)
EndFunction
`;
        }

        if (req.toLowerCase().includes('combat')) {
          content += `
; Combat functionality
Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 1 ; Combat started
        Debug.Trace("${scriptName}: Combat started")
    ElseIf aeCombatState == 0 ; Combat ended
        Debug.Trace("${scriptName}: Combat ended")
    EndIf
EndEvent
`;
        }

        if (req.toLowerCase().includes('dialogue')) {
          content += `
; Dialogue functionality
Function ShowDialogue()
    ; Show dialogue
    Debug.MessageBox("Hello from ${scriptName}!")
EndFunction
`;
        }
      });
    }

    return { content, name: scriptName };
  }

  private generateXEditScript(request: ScriptGenerationRequest): { content: string; name: string } {
    const scriptName = request.name || `XEdit_Script_${Date.now()}`;

    let content = `{
  Script generated by Mossy AI Assistant
  Purpose: ${request.description}
}

unit ${scriptName};

interface

implementation

function Initialize: Integer;
begin
  // Initialization code
  AddMessage('Script ${scriptName} initialized');
  Result := 0;
end;

function Process(e: IInterface): Integer;
begin
  // Process each record
  if Signature(e) = 'WEAP' then begin
    // Weapon processing
    AddMessage('Processing weapon: ' + Name(e));
  end;

  if Signature(e) = 'ARMO' then begin
    // Armor processing
    AddMessage('Processing armor: ' + Name(e));
  end;

  Result := 0;
end;

function Finalize: Integer;
begin
  // Cleanup code
  AddMessage('Script ${scriptName} completed');
  Result := 0;
end;

end.
`;

    return { content, name: scriptName };
  }

  private generateBlenderScript(request: ScriptGenerationRequest): { content: string; name: string } {
    const scriptName = request.name || `Blender_Script_${Date.now()}`;

    let content = `# Blender script generated by Mossy AI Assistant
# Purpose: ${request.description}

import bpy
import mathutils

def main():
    print("Running ${scriptName}")

    # Get the active object
    obj = bpy.context.active_object

    if obj is None:
        print("No active object selected")
        return

    # Example operations
    if obj.type == 'MESH':
        # Mesh operations
        print(f"Processing mesh: {obj.name}")

        # Apply transformations
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Example: Scale to Fallout 4 units (1.0 scale)
        obj.scale = (1.0, 1.0, 1.0)

    # Add materials if needed
    if len(obj.data.materials) == 0:
        mat = bpy.data.materials.new(name="${scriptName}_Material")
        obj.data.materials.append(mat)

    print("${scriptName} completed")

if __name__ == "__main__":
    main()
`;

    return { content, name: scriptName };
  }

  private generateQuestScript(request: ScriptGenerationRequest): { content: string; name: string } {
    const scriptName = request.name || `Quest_Script_${Date.now()}`;

    let content = `; Quest script generated by Mossy AI Assistant
; Purpose: ${request.description}

Scriptname ${scriptName} extends Quest

; Properties
ReferenceAlias Property PlayerAlias Auto
ReferenceAlias Property CompanionAlias Auto
LocationAlias Property QuestLocation Auto

; Quest stages
Int Property Stage_PreQuest = 0 Auto
Int Property Stage_Active = 10 Auto
Int Property Stage_Completed = 100 Auto

; Events
Event OnInit()
    ; Quest initialization
    Debug.Trace("${scriptName}: Quest initialized")
EndEvent

Event OnStageSet(Int auiStageID, Int auiItemID)
    ; Handle stage changes
    If auiStageID == Stage_Active
        ; Quest started
        Debug.Trace("${scriptName}: Quest started")
        ; Add objectives, etc.
    ElseIf auiStageID == Stage_Completed
        ; Quest completed
        Debug.Trace("${scriptName}: Quest completed")
        ; Give rewards, etc.
    EndIf
EndEvent

; Functions
Function StartQuest()
    SetStage(Stage_Active)
EndFunction

Function CompleteQuest()
    SetStage(Stage_Completed)
EndFunction
`;

    return { content, name: scriptName };
  }

  private generateAutomationScript(request: ScriptGenerationRequest): { content: string; name: string } {
    const scriptName = request.name || `Automation_Script_${Date.now()}`;

    let content = `# Automation script generated by Mossy AI Assistant
# Purpose: ${request.description}

import os
import sys
import subprocess
import shutil
from pathlib import Path

def main():
    print("Running ${scriptName}")

    # Example automation tasks
    try:
        # Backup files
        backup_dir = Path("backup")
        backup_dir.mkdir(exist_ok=True)

        # Copy important files
        if Path("Data").exists():
            shutil.copytree("Data", backup_dir / "Data", dirs_exist_ok=True)

        # Run compilation if needed
        if Path("scripts").exists():
            print("Compiling scripts...")
            # Add compilation logic here

        print("${scriptName} completed successfully")

    except Exception as e:
        print(f"Error in ${scriptName}: {e}")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())
`;

    return { content, name: scriptName };
  }

  private isRelevantToScript(pattern: string, request: ScriptGenerationRequest): boolean {
    const patternLower = pattern.toLowerCase();
    const descLower = request.description.toLowerCase();

    // Check if pattern mentions script-related keywords
    const scriptKeywords = ['script', 'papyrus', 'xedit', 'blender', 'quest', 'automation', 'code'];
    const hasScriptKeyword = scriptKeywords.some(keyword =>
      patternLower.includes(keyword) || descLower.includes(keyword)
    );

    return hasScriptKeyword;
  }

  // Helper methods
  private extractPatterns(text: string, category: LearningPattern['category']): string[] {
    const patterns: string[] = [];

    // Extract question types
    if (category === 'question') {
      if (text.toLowerCase().includes('how to') || text.toLowerCase().includes('how do')) {
        patterns.push('how-to questions');
      }
      if (text.toLowerCase().includes('error') || text.toLowerCase().includes('problem')) {
        patterns.push('troubleshooting queries');
      }
      if (text.toLowerCase().includes('install') || text.toLowerCase().includes('setup')) {
        patterns.push('installation guidance');
      }
    }

    return patterns;
  }

  private updatePattern(pattern: string, category: LearningPattern['category'], outcome: 'success' | 'partial' | 'failure') {
    const existing = this.patterns.find(p => p.pattern === pattern);
    if (existing) {
      existing.frequency++;
      existing.lastSeen = new Date().toISOString();
      existing.successRate = this.calculateSuccessRate(pattern, outcome);
    } else {
      this.patterns.push({
        id: `pattern_${Date.now()}`,
        pattern,
        frequency: 1,
        successRate: outcome === 'success' ? 1 : 0,
        lastSeen: new Date().toISOString(),
        category,
        insights: []
      });
    }
  }

  private calculateSuccessRate(pattern: string, latestOutcome: 'success' | 'partial' | 'failure'): number {
    // Simplified calculation - in practice, you'd track per-pattern outcomes
    const patternData = this.patterns.find(p => p.pattern === pattern);
    if (!patternData) return latestOutcome === 'success' ? 1 : 0;

    const total = patternData.frequency;
    const successes = Math.round(total * patternData.successRate);
    const newSuccesses = latestOutcome === 'success' ? 1 : 0;

    return (successes + newSuccesses) / (total + 1);
  }

  private extractInsightsFromFeedback(feedback: string): string[] {
    const insights: string[] = [];
    const lowerFeedback = feedback.toLowerCase();

    if (lowerFeedback.includes('too slow') || lowerFeedback.includes('faster')) {
      insights.push('Response speed needs improvement');
    }
    if (lowerFeedback.includes('unclear') || lowerFeedback.includes('confusing')) {
      insights.push('Response clarity needs improvement');
    }
    if (lowerFeedback.includes('helpful') || lowerFeedback.includes('useful')) {
      insights.push('Positive feedback on helpfulness');
    }

    return insights;
  }

  private loadPersistedData() {
    try {
      const patternsData = localStorage.getItem('mossy_learning_patterns');
      const opportunitiesData = localStorage.getItem('mossy_improvement_opportunities');
      const feedbackData = localStorage.getItem('mossy_user_feedback');
      const interactionsData = localStorage.getItem('mossy_total_interactions');

      if (patternsData) this.patterns = JSON.parse(patternsData);
      if (opportunitiesData) this.opportunities = JSON.parse(opportunitiesData);
      if (feedbackData) this.feedback = JSON.parse(feedbackData);
      if (interactionsData) this.totalInteractions = parseInt(interactionsData, 10) || 0;
    } catch (error) {
      console.error('Failed to load self-improvement data:', error);
    }
  }

  private savePersistedData() {
    try {
      // Cap unbounded growth: keep all unimplemented opportunities (so nothing pending is lost)
      // plus the 100 most recent implemented ones, instead of accumulating forever.
      if (this.opportunities.length > 200) {
        const pending = this.opportunities.filter(o => !o.implemented);
        const implemented = this.opportunities
          .filter(o => o.implemented)
          .sort((a, b) => new Date(b.implementedAt || b.createdAt).getTime() - new Date(a.implementedAt || a.createdAt).getTime())
          .slice(0, 100);
        this.opportunities = [...pending, ...implemented];
      }

      localStorage.setItem('mossy_learning_patterns', JSON.stringify(this.patterns));
      localStorage.setItem('mossy_improvement_opportunities', JSON.stringify(this.opportunities));
      localStorage.setItem('mossy_user_feedback', JSON.stringify(this.feedback));
      localStorage.setItem('mossy_total_interactions', this.totalInteractions.toString());
    } catch (error) {
      console.error('Failed to save self-improvement data:', error);
    }
  }
}

// Export singleton instance
export const selfImprovementEngine = new SelfImprovementEngine();