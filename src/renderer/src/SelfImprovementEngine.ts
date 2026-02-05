/**
 * Mossy Self-Improvement Engine
 * Enables Mossy to learn from interactions, identify improvement opportunities,
 * and autonomously enhance her capabilities.
 */

import { LocalAIEngine } from './LocalAIEngine';

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
  type: 'papyrus' | 'xedit' | 'blender' | 'quest' | 'automation';
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
  confidence: number;
  requirements: string[];
}

export class SelfImprovementEngine {
  private patterns: LearningPattern[] = [];
  private opportunities: ImprovementOpportunity[] = [];
  private feedback: UserFeedback[] = [];
  private generatedScripts: GeneratedScript[] = [];
  private totalInteractions: number = 0;

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
      interactionId: `feedback_${Date.now()}`,
      rating,
      feedback: feedbackText,
      timestamp: new Date().toISOString(),
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
    const insights = this.extractInsightsFromFeedback(feedback.feedback);

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
    // Check for knowledge gaps
    if (outcome === 'failure' && (response.includes("I don't know") || response.includes("not sure"))) {
      this.opportunities.push({
        id: `improvement_${Date.now()}`,
        type: 'knowledge_gap',
        description: `Knowledge gap identified for query: "${query}"`,
        confidence: 0.8,
        proposedSolution: 'Research and add relevant information to knowledge vault',
        impact: 'medium',
        createdAt: new Date().toISOString()
      });
    }

    // Check for response quality issues
    if (outcome === 'partial' && response.length < 100) {
      this.opportunities.push({
        id: `improvement_${Date.now()}`,
        type: 'response_improvement',
        description: 'Response too brief for complex query',
        confidence: 0.6,
        proposedSolution: 'Enhance response detail for similar queries',
        impact: 'low',
        createdAt: new Date().toISOString()
      });
    }

    // Check for repeated patterns that could be automated
    const recentPatterns = this.patterns.filter(p => p.frequency > 3);
    recentPatterns.forEach(pattern => {
      if (!this.opportunities.find(o => o.description.includes(pattern.pattern))) {
        this.opportunities.push({
          id: `improvement_${Date.now()}`,
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
      .filter(f => new Date(f.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 2);

    if (recentFeedback.length > 0) {
      insights.push('**Recent User Feedback:**');
      recentFeedback.forEach(f => {
        insights.push(`- Rating: ${f.rating}/5 - "${f.feedback}"`);
      });
    }

    return insights.length > 0 ? insights.join('\n') : '';
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
   * Generates a script based on learned patterns and user requirements
   */
  generateScript(request: ScriptGenerationRequest): GeneratedScript {
    const scriptId = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let scriptContent = '';
    let scriptName = '';
    let confidence = 0.7; // Base confidence

    // Analyze patterns to improve generation
    const relevantPatterns = this.patterns.filter(p =>
      p.category === 'question' &&
      p.successRate > 0.8 &&
      this.isRelevantToScript(p.pattern, request)
    );

    if (relevantPatterns.length > 0) {
      confidence += 0.2; // Boost confidence with relevant experience
    }

    switch (request.type) {
      case 'papyrus': {
        const papyrusResult = this.generatePapyrusScript(request);
        scriptContent = papyrusResult.content;
        scriptName = papyrusResult.name;
        break;
      }

      case 'xedit': {
        const xeditResult = this.generateXEditScript(request);
        scriptContent = xeditResult.content;
        scriptName = xeditResult.name;
        break;
      }

      case 'blender': {
        const blenderResult = this.generateBlenderScript(request);
        scriptContent = blenderResult.content;
        scriptName = blenderResult.name;
        break;
      }

      case 'quest': {
        const questResult = this.generateQuestScript(request);
        scriptContent = questResult.content;
        scriptName = questResult.name;
        break;
      }

      case 'automation': {
        const automationResult = this.generateAutomationScript(request);
        scriptContent = automationResult.content;
        scriptName = automationResult.name;
        break;
      }

      default:
        throw new Error(`Unsupported script type: ${request.type}`);
    }

    const generatedScript: GeneratedScript = {
      id: scriptId,
      type: request.type,
      name: scriptName,
      content: scriptContent,
      description: request.description,
      generatedAt: new Date().toISOString(),
      confidence,
      requirements: request.requirements || []
    };

    this.generatedScripts.push(generatedScript);
    this.savePersistedData();

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
    // Analyze successful script generations
    const successfulScripts = this.generatedScripts.filter(s => s.confidence > 0.8);

    if (successfulScripts.length > 0) {
      // Create improvement opportunities based on successful patterns
      const scriptImprovement: ImprovementOpportunity = {
        id: `script_improvement_${Date.now()}`,
        type: 'script_generation',
        title: 'Enhance Script Generation Accuracy',
        description: `Improve script generation based on ${successfulScripts.length} successful generations`,
        priority: 'medium',
        confidence: 0.85,
        estimatedImpact: 'high',
        implementationSteps: [
          'Analyze successful script patterns',
          'Update generation algorithms',
          'Add new script templates'
        ],
        createdAt: new Date().toISOString(),
        implemented: false
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