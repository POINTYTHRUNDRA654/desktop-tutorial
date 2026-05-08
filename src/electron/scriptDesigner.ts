/**
 * Script Designer & Execution Engine
 * 
 * Complete Papyrus scripting environment for mod authors:
 * - Visual script designer
 * - Code editor with IntelliSense
 * - Live testing and debugging
 * - Template library
 * - Compilation and execution
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ScriptTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
  variables: string[];
  documentation: string;
}

export interface ScriptNode {
  id: string;
  type: 'event' | 'condition' | 'action' | 'variable' | 'function';
  label: string;
  properties: Record<string, any>;
  connections: string[];
  position: { x: number; y: number };
}

export interface VisualScript {
  id: string;
  name: string;
  nodes: ScriptNode[];
  variables: Record<string, string>;
}

export class ScriptDesignerEngine {
  private templatesPath: string;
  private scriptsPath: string;
  private papyrusCompiler: string | null = null;

  constructor() {
    this.templatesPath = path.join(app.getPath('userData'), 'script-templates');
    this.scriptsPath = path.join(app.getPath('userData'), 'scripts');
    
    // Create directories
    if (!fs.existsSync(this.templatesPath)) {
      fs.mkdirSync(this.templatesPath, { recursive: true });
    }
    if (!fs.existsSync(this.scriptsPath)) {
      fs.mkdirSync(this.scriptsPath, { recursive: true });
    }

    this.initializeDefaultTemplates();
    this.findPapyrusCompiler();
  }

  /**
   * Initialize default script templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: ScriptTemplate[] = [
      {
        id: 'basic-quest',
        name: 'Basic Quest Script',
        category: 'Quest',
        description: 'Simple quest with stages and objectives',
        code: `Scriptname ${'{scriptName}'} extends Quest

Event OnInit()
    ; Quest initialization
    SetStage(10)
EndEvent

Event OnStageSet(int auStageID, int auItemID)
    If auStageID == 10
        ; Stage 10 logic
        Debug.Notification("Quest started!")
    ElseIf auStageID == 20
        ; Stage 20 logic
    ElseIf auStageID == 100
        ; Quest complete
        CompleteQuest()
    EndIf
EndEvent`,
        variables: ['scriptName'],
        documentation: 'Basic quest script with stage handling'
      },
      {
        id: 'item-pickup',
        name: 'Item Pickup Script',
        category: 'Item',
        description: 'Script for items that trigger actions when picked up',
        code: `Scriptname ${'{scriptName}'} extends ObjectReference

Event OnContainerChanged(ObjectReference akNewContainer, ObjectReference akOldContainer)
    If akNewContainer == Game.GetPlayer()
        ; Player picked up the item
        Debug.Notification("You found ${'{itemName}'}!")
        ; Add your logic here
    EndIf
EndEvent`,
        variables: ['scriptName', 'itemName'],
        documentation: 'Triggers when player picks up item'
      },
      {
        id: 'npc-dialog',
        name: 'NPC Dialog Handler',
        category: 'NPC',
        description: 'Handle NPC dialog and responses',
        code: `Scriptname ${'{scriptName}'} extends Actor

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        ; Player activated NPC
        ; Start conversation or custom dialog
    EndIf
EndEvent`,
        variables: ['scriptName'],
        documentation: 'NPC activation and dialog handling'
      },
      {
        id: 'trigger-zone',
        name: 'Trigger Zone',
        category: 'Location',
        description: 'Detect when player enters/exits an area',
        code: `Scriptname ${'{scriptName}'} extends ObjectReference

Event OnTriggerEnter(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        ; Player entered trigger zone
        Debug.Notification("Entered ${'{locationName}'}")
    EndIf
EndEvent

Event OnTriggerLeave(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        ; Player left trigger zone
        Debug.Notification("Left ${'{locationName}'}")
    EndIf
EndEvent`,
        variables: ['scriptName', 'locationName'],
        documentation: 'Trigger zone for location-based events'
      },
      {
        id: 'timed-event',
        name: 'Timed Event',
        category: 'Utility',
        description: 'Execute actions after a delay or on schedule',
        code: `Scriptname ${'{scriptName}'} extends Quest

Float Property UpdateInterval = 5.0 Auto

Event OnInit()
    RegisterForSingleUpdate(UpdateInterval)
EndEvent

Event OnUpdate()
    ; Your timed logic here
    Debug.Trace("Update tick")
    
    ; Register for next update
    RegisterForSingleUpdate(UpdateInterval)
EndEvent`,
        variables: ['scriptName'],
        documentation: 'Repeated updates for timed events'
      },
      {
        id: 'custom-weapon',
        name: 'Custom Weapon Script',
        category: 'Weapon',
        description: 'Add special effects to weapons',
        code: `Scriptname ${'{scriptName}'} extends ObjectReference

Event OnEquipped(Actor akActor)
    If akActor == Game.GetPlayer()
        ; Player equipped weapon
        Debug.Notification("${'{weaponName}'} equipped")
    EndIf
EndEvent

Event OnUnequipped(Actor akActor)
    If akActor == Game.GetPlayer()
        ; Player unequipped weapon
    EndIf
EndEvent

Event OnHit(ObjectReference akTarget, ObjectReference akAggressor, Form akSource, Projectile akProjectile, bool abPowerAttack, bool abSneakAttack, bool abBashAttack, bool abHitBlocked, string asMaterialName)
    ; Weapon hit something
    ; Add special effects here
EndEvent`,
        variables: ['scriptName', 'weaponName'],
        documentation: 'Custom weapon with special effects'
      }
    ];

    // Save templates
    for (const template of defaultTemplates) {
      const templatePath = path.join(this.templatesPath, `${template.id}.json`);
      if (!fs.existsSync(templatePath)) {
        fs.writeFileSync(templatePath, JSON.stringify(template, null, 2));
      }
    }
  }

  /**
   * Find Papyrus compiler path
   */
  private async findPapyrusCompiler(): Promise<void> {
    const commonPaths = [
      'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4\\Papyrus Compiler',
      'C:\\Program Files\\Fallout 4\\Papyrus Compiler',
      path.join(app.getPath('documents'), '..', '..', 'Fallout 4', 'Papyrus Compiler')
    ];

    for (const testPath of commonPaths) {
      const compilerPath = path.join(testPath, 'PapyrusCompiler.exe');
      if (fs.existsSync(compilerPath)) {
        this.papyrusCompiler = compilerPath;
        console.log(`[ScriptDesigner] Found Papyrus Compiler: ${compilerPath}`);
        return;
      }
    }

    console.log('[ScriptDesigner] Papyrus Compiler not found');
  }

  /**
   * Get all available templates
   */
  getTemplates(): ScriptTemplate[] {
    const templates: ScriptTemplate[] = [];
    const files = fs.readdirSync(this.templatesPath);

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const data = fs.readFileSync(path.join(this.templatesPath, file), 'utf-8');
          templates.push(JSON.parse(data));
        } catch (error) {
          console.error(`Failed to load template ${file}:`, error);
        }
      }
    }

    return templates;
  }

  /**
   * Create script from template
   */
  createFromTemplate(templateId: string, variables: Record<string, string>): string {
    const templates = this.getTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    let code = template.code;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `\${'{${key}}'}`;
      code = code.replace(new RegExp(placeholder, 'g'), value);
    }

    return code;
  }

  /**
   * Save script to file
   */
  saveScript(scriptName: string, code: string): string {
    const scriptPath = path.join(this.scriptsPath, `${scriptName}.psc`);
    fs.writeFileSync(scriptPath, code);
    console.log(`[ScriptDesigner] Saved script: ${scriptPath}`);
    return scriptPath;
  }

  /**
   * Compile Papyrus script
   */
  async compileScript(scriptPath: string): Promise<{ success: boolean; output: string; errors: string[] }> {
    if (!this.papyrusCompiler) {
      return {
        success: false,
        output: '',
        errors: ['Papyrus Compiler not found. Please install Creation Kit.']
      };
    }

    try {
      const { stdout, stderr } = await execAsync(`"${this.papyrusCompiler}" "${scriptPath}"`);
      
      const output = stdout + stderr;
      const errors = this.parseCompilerErrors(output);

      return {
        success: errors.length === 0,
        output,
        errors
      };
    } catch (error: any) {
      return {
        success: false,
        output: error.message,
        errors: [error.message]
      };
    }
  }

  /**
   * Parse compiler error messages
   */
  private parseCompilerErrors(output: string): string[] {
    const errors: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.toLowerCase().includes('error') || line.toLowerCase().includes('warning')) {
        errors.push(line.trim());
      }
    }

    return errors;
  }

  /**
   * Convert visual script to Papyrus code
   */
  visualToCode(visualScript: VisualScript): string {
    let code = `Scriptname ${visualScript.name} extends Quest\n\n`;

    // Add variables
    for (const [name, type] of Object.entries(visualScript.variables)) {
      code += `${type} Property ${name} Auto\n`;
    }
    code += '\n';

    // Process nodes in order
    const eventNodes = visualScript.nodes.filter(n => n.type === 'event');
    
    for (const eventNode of eventNodes) {
      code += this.generateEventCode(eventNode, visualScript.nodes);
      code += '\n';
    }

    return code;
  }

  /**
   * Generate code for an event node and its connected nodes
   */
  private generateEventCode(eventNode: ScriptNode, allNodes: ScriptNode[]): string {
    let code = `Event ${eventNode.label}()\n`;

    // Process connected nodes
    for (const connectionId of eventNode.connections) {
      const connectedNode = allNodes.find(n => n.id === connectionId);
      if (connectedNode) {
        code += this.generateNodeCode(connectedNode, allNodes, 1);
      }
    }

    code += 'EndEvent\n';
    return code;
  }

  /**
   * Generate code for a single node
   */
  private generateNodeCode(node: ScriptNode, allNodes: ScriptNode[], indent: number): string {
    const indentStr = '    '.repeat(indent);
    let code = '';

    switch (node.type) {
      case 'condition':
        code += `${indentStr}If ${node.properties.condition}\n`;
        for (const connectionId of node.connections) {
          const connectedNode = allNodes.find(n => n.id === connectionId);
          if (connectedNode) {
            code += this.generateNodeCode(connectedNode, allNodes, indent + 1);
          }
        }
        code += `${indentStr}EndIf\n`;
        break;

      case 'action':
        code += `${indentStr}${node.properties.code}\n`;
        break;

      case 'function':
        code += `${indentStr}${node.label}(${node.properties.params || ''})\n`;
        break;

      case 'variable':
        code += `${indentStr}${node.properties.varName} = ${node.properties.value}\n`;
        break;
    }

    return code;
  }

  /**
   * Validate Papyrus syntax
   */
  validateSyntax(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for basic syntax issues
    if (!code.includes('Scriptname')) {
      errors.push('Missing Scriptname declaration');
    }

    if (!code.includes('extends')) {
      errors.push('Missing extends declaration');
    }

    // Check for balanced Event/EndEvent
    const eventCount = (code.match(/Event\s+/g) || []).length;
    const endEventCount = (code.match(/EndEvent/g) || []).length;
    if (eventCount !== endEventCount) {
      errors.push(`Unbalanced Event/EndEvent (${eventCount} Events, ${endEventCount} EndEvents)`);
    }

    // Check for balanced If/EndIf
    const ifCount = (code.match(/If\s+/g) || []).length;
    const endIfCount = (code.match(/EndIf/g) || []).length;
    if (ifCount !== endIfCount) {
      errors.push(`Unbalanced If/EndIf (${ifCount} If, ${endIfCount} EndIf)`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get IntelliSense suggestions for cursor position
   */
  getIntelliSense(code: string, line: number, column: number): string[] {
    const suggestions: string[] = [];

    // Common Papyrus keywords
    const keywords = [
      'Scriptname', 'extends', 'Event', 'EndEvent', 'Function', 'EndFunction',
      'If', 'ElseIf', 'Else', 'EndIf', 'While', 'EndWhile',
      'Property', 'Auto', 'AutoReadOnly',
      'Return', 'Int', 'Float', 'Bool', 'String', 'Form', 'ObjectReference', 'Actor',
      'Debug.Trace', 'Debug.Notification', 'Debug.MessageBox',
      'Game.GetPlayer', 'Self', 'RegisterForSingleUpdate'
    ];

    // Common functions
    const functions = [
      'SetStage', 'CompleteQuest', 'GetStage',
      'AddItem', 'RemoveItem', 'GetItemCount',
      'MoveTo', 'Enable', 'Disable', 'Delete',
      'PlayIdle', 'Say', 'EvaluatePackage'
    ];

    suggestions.push(...keywords, ...functions);

    return suggestions;
  }

  /**
   * Test script execution (simulation)
   */
  async testScript(scriptPath: string): Promise<{ success: boolean; output: string }> {
    // In a real implementation, this would:
    // 1. Compile the script
    // 2. Load it in game
    // 3. Execute test scenarios
    // 4. Return results

    const compileResult = await this.compileScript(scriptPath);
    
    if (!compileResult.success) {
      return {
        success: false,
        output: `Compilation failed:\n${compileResult.errors.join('\n')}`
      };
    }

    return {
      success: true,
      output: 'Script compiled successfully. Ready for in-game testing.'
    };
  }
}

// Singleton instance
let scriptDesignerInstance: ScriptDesignerEngine | null = null;

export function getScriptDesigner(): ScriptDesignerEngine {
  if (!scriptDesignerInstance) {
    scriptDesignerInstance = new ScriptDesignerEngine();
  }
  return scriptDesignerInstance;
}
