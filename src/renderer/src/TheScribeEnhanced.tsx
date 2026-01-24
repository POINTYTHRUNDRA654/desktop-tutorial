import React, { useEffect, useState } from 'react';
import { Code, FileCode, Palette, Check, X, AlertTriangle, Zap, Copy, Play, BookOpen, Terminal, Wrench } from 'lucide-react';
import type { Settings } from '../../shared/types';

type ScriptType = 'papyrus' | 'xedit' | 'blender';

interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export const TheScribe: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ScriptType>('papyrus');
  const [code, setCode] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [launching, setLaunching] = useState(false);
  const [toolVersion, setToolVersion] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const s = await window.electronAPI.getSettings();
        setSettings(s);
        window.electronAPI.onSettingsUpdated((next) => setSettings(next));
      } catch (e) {
        console.warn('[TheScribe] Failed to load settings', e);
      }
    };
    init();
    return () => {
      // onSettingsUpdated returns void; renderer cleans up on unload
    };
  }, []);

  useEffect(() => {
    const fetchVersion = async () => {
      const path = getActiveToolPath();
      if (!path.trim()) {
        setToolVersion('');
        return;
      }
      try {
        const bridge = (window as any).electron?.api;
        if (bridge?.getToolVersion) {
          const v = await bridge.getToolVersion(path);
          setToolVersion(v || '');
        } else {
          setToolVersion('');
        }
      } catch (e) {
        console.warn('Tool version lookup failed', e);
        setToolVersion('');
      }
    };
    fetchVersion();
  }, [activeTab, settings]);

  const getActiveToolPath = () => {
    if (!settings) return '';
    if (activeTab === 'papyrus') return settings.creationKitPath || '';
    if (activeTab === 'xedit') return settings.xeditPath || '';
    if (activeTab === 'blender') return settings.blenderPath || '';
    return '';
  };

  const getActiveToolName = () => {
    if (activeTab === 'papyrus') return 'Creation Kit';
    if (activeTab === 'xedit') return 'xEdit';
    if (activeTab === 'blender') return 'Blender';
    return 'Tool';
  };

  const handleLaunchTool = async () => {
    const path = getActiveToolPath();
    const toolName = getActiveToolName();
    if (!path || !path.trim()) {
      alert(`Set a path for ${toolName} in Tool Settings before launching.`);
      return;
    }
    setLaunching(true);
    try {
      const bridge = (window as any).electron?.api;
      if (bridge?.openExternal) {
        await bridge.openExternal(path);
      } else {
        alert('Launching external tools requires the Desktop Bridge (Electron).');
      }
    } catch (err) {
      console.error('Failed to launch tool:', err);
      alert(`Could not launch ${toolName}. Check the configured path in Tool Settings.`);
    } finally {
      setLaunching(false);
    }
  };

  const validatePapyrus = (code: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    // Identify first non-empty, non-comment line
    const firstRealLineIndex = lines.findIndex((l) => l.trim() && !l.trim().startsWith(';'));
    const firstRealLine = firstRealLineIndex >= 0 ? lines[firstRealLineIndex].trim() : '';

    // Validate ScriptName and extends
    let extendsType: 'Quest' | 'Actor' | 'ObjectReference' | undefined;
    if (!firstRealLine || !/^ScriptName\s+\w+/i.test(firstRealLine)) {
      errors.push({
        line: Math.max(1, firstRealLineIndex + 1),
        message: 'Script must start with "ScriptName <Name>" declaration',
        severity: 'error',
      });
    } else {
      const m = firstRealLine.match(/ScriptName\s+\w+(?:\s+extends\s+(\w+))?/i);
      if (m) {
        if (!m[1]) {
          errors.push({
            line: firstRealLineIndex + 1,
            message: 'Script should declare base type with "extends" (e.g., Quest/Actor/ObjectReference)',
            severity: 'warning',
          });
        } else if (!/^(Quest|Actor|ObjectReference)$/i.test(m[1])) {
          errors.push({
            line: firstRealLineIndex + 1,
            message: `Unknown extends type "${m[1]}"; common bases are Quest, Actor, ObjectReference`,
            severity: 'info',
          });
        } else {
          extendsType = m[1] as any;
        }
      }
    }

    // Track block starts/ends for Event/Function/If/While
    const stack: { kind: 'Event' | 'Function' | 'If' | 'While'; name?: string; line: number }[] = [];
    const pushBlock = (kind: 'Event' | 'Function' | 'If' | 'While', name: string | undefined, line: number) => stack.push({ kind, name, line });
    const popBlock = (kind: 'Event' | 'Function' | 'If' | 'While', line: number, endToken: string) => {
      const idx = [...stack].reverse().findIndex((s) => s.kind === kind);
      if (idx === -1) {
        errors.push({ line, message: `${endToken} without matching start`, severity: 'error' });
      } else {
        stack.splice(stack.length - 1 - idx, 1);
      }
    };

    // Valid event names per base type (subset, heuristic)
    const validEvents: Record<string, string[]> = {
      Quest: ['OnQuestInit', 'OnStoryScript','OnStageSet'],
      Actor: ['OnInit', 'OnCombatStateChanged', 'OnDeath', 'OnLocationChange'],
      ObjectReference: ['OnActivate', 'OnContainerChanged', 'OnInit', 'OnLoad'],
    };

    const hasImport = (name: string) => new RegExp(`^\\s*Import\\s+${name}\\b`, 'im').test(code);

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith(';')) return;

      // Event/Function starts
      const eventStart = trimmedLine.match(/^Event\s+([A-Za-z0-9_.]+)/);
      const funcStart = trimmedLine.match(/^Function\s+([A-Za-z0-9_]+)\s*\(/);
      if (eventStart) {
        const evNameRaw = eventStart[1];
        const evName = evNameRaw.includes('.') ? evNameRaw.split('.')[1] : evNameRaw;
        pushBlock('Event', evName, lineNum);
        if (extendsType && validEvents[extendsType]) {
          const allowed = validEvents[extendsType].map((e) => e.toLowerCase());
          if (!allowed.includes(evName.toLowerCase())) {
            errors.push({
              line: lineNum,
              message: `Event "${evNameRaw}" may not be valid for base ${extendsType}`,
              severity: 'warning',
            });
          }
        }
      } else if (funcStart) {
        pushBlock('Function', funcStart[1], lineNum);
      }

      // Block ends
      if (/^EndEvent\b/.test(trimmedLine)) popBlock('Event', lineNum, 'EndEvent');
      if (/^EndFunction\b/.test(trimmedLine)) popBlock('Function', lineNum, 'EndFunction');
      if (/^EndIf\b/.test(trimmedLine)) popBlock('If', lineNum, 'EndIf');
      if (/^EndWhile\b/.test(trimmedLine)) popBlock('While', lineNum, 'EndWhile');

      // Control structures
      if (/^If\b/.test(trimmedLine)) pushBlock('If', undefined, lineNum);
      if (/^While\b/.test(trimmedLine)) pushBlock('While', undefined, lineNum);

      // Property declarations
      const propDecl = trimmedLine.match(/^([A-Za-z0-9_]+)\s+Property\s+([A-Za-z0-9_]+)(.*)$/i);
      if (propDecl) {
        const suffix = propDecl[3] || '';
        if (!/\bAuto\b/i.test(suffix) && !/=/.test(suffix)) {
          errors.push({
            line: lineNum,
            message: 'Property should use Auto or explicit getter/setter implementation',
            severity: 'info',
          });
        }
      }

      // F4SE-related usage without import
      const usesF4SE = /(\bF4SE\b|\bUI\.|\bInput\.|\bConsoleUtil\.)/.test(trimmedLine);
      if (usesF4SE && !(hasImport('F4SE') || hasImport('UI') || hasImport('Input') || hasImport('ConsoleUtil')) ) {
        errors.push({
          line: lineNum,
          message: 'Using F4SE/UI/Input/ConsoleUtil functions requires Import at script top',
          severity: 'error',
        });
      }

      // Deprecated patterns
      if (/\bGetDistance\s*\(/.test(trimmedLine)) {
        errors.push({
          line: lineNum,
          message: 'Prefer GetDistance(ObjectReference) or vector math over deprecated forms',
          severity: 'warning',
        });
      }
    });

    // Unclosed blocks leftover
    for (const s of stack) {
      const endToken = s.kind === 'Event' ? 'EndEvent' : s.kind === 'Function' ? 'EndFunction' : s.kind === 'If' ? 'EndIf' : 'EndWhile';
      errors.push({ line: s.line, message: `${s.kind} started here is missing matching ${endToken}`, severity: 'error' });
    }

    return errors;
  };

  const validateXEdit = (code: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    const firstRealLineIndex = lines.findIndex((l) => l.trim());
    const firstRealLine = firstRealLineIndex >= 0 ? lines[firstRealLineIndex].trim() : '';
    if (!/^unit\s+\w+;?/i.test(firstRealLine)) {
      errors.push({ line: Math.max(1, firstRealLineIndex + 1), message: 'xEdit script must start with "unit <Name>;"', severity: 'error' });
    }

    const hasInitialize = /function\s+Initialize\s*:\s*integer\s*;/i.test(code);
    const hasProcess = /function\s+Process\s*\(.*IInterface.*\)\s*:\s*integer\s*;/i.test(code);
    const hasFinalize = /function\s+Finalize\s*:\s*integer\s*;/i.test(code);
    if (!hasInitialize && !hasProcess) {
      errors.push({ line: 1, message: 'Script should implement Initialize or Process function', severity: 'warning' });
    }
    if (!hasFinalize) {
      errors.push({ line: 1, message: 'Consider adding Finalize for cleanup/logging', severity: 'info' });
    }

    // Ensure end.
    if (!/end\./i.test(code.trim())) {
      errors.push({ line: lines.length, message: 'Script should end with "end."', severity: 'error' });
    }

    // Validate function bodies have begin/end; and set Result
    const fnRegex = /function\s+(Initialize|Process|Finalize)[\s\S]*?begin([\s\S]*?)end\s*;/gi;
    let m: RegExpExecArray | null;
    const seenFns: string[] = [];
    while ((m = fnRegex.exec(code)) !== null) {
      const fnName = m[1];
      seenFns.push(fnName.toLowerCase());
      const body = m[2];
      if (!/Result\s*:=\s*0\s*;/.test(body)) {
        errors.push({ line: 1, message: `${fnName} should set Result := 0;`, severity: 'info' });
      }
    }

    // If any declared function lacks a begin/end pair
    const declaredFns = (code.match(/function\s+(Initialize|Process|Finalize)/gi) || []).map((s) => s.toLowerCase());
    for (const d of declaredFns) {
      if (!seenFns.includes(d)) {
        errors.push({ line: 1, message: `Function ${d} missing begin/end; block`, severity: 'error' });
      }
    }

    return errors;
  };

  const validateBlender = (code: string): ValidationError[] => {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    if (!/\bimport\s+bpy\b/.test(code)) {
      errors.push({ line: 1, message: 'Blender scripts must import bpy', severity: 'error' });
    }

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Guarded access to context object
      if (/\bbpy\.context\.object\b/.test(trimmedLine) && !/if\s+bpy\.context\.object/.test(code)) {
        errors.push({ line: lineNum, message: 'Guard access: use "if bpy.context.object:" before bpy.context.object', severity: 'warning' });
      }

      // Deprecated operators
      if (/\bbpy\.ops\.object\.select_name\b/.test(trimmedLine)) {
        errors.push({ line: lineNum, message: 'select_name is deprecated; use obj.select_set(True)', severity: 'warning' });
      }
    });

    // Heuristic: using bpy.ops requires active object/context
    const usesOps = /\bbpy\.ops\./.test(code);
    const hasContextSetup = /(bpy\.context\.view_layer\.objects\.active\s*=|obj\.select_set\(|with\s+bpy\.context\.temp_override)/.test(code);
    if (usesOps && !hasContextSetup) {
      errors.push({ line: 1, message: 'bpy.ops calls usually require active object or context override', severity: 'info' });
    }

    // Recommend using os.path.join for file path assembly when exporting
    if (/\bbpy\.ops\.export_/.test(code) && !/os\.path\.join\(/.test(code)) {
      errors.push({ line: 1, message: 'Use os.path.join() for stable export file paths', severity: 'info' });
    }

    return errors;
  };

  const handleValidate = () => {
    let errors: ValidationError[] = [];
    
    switch (activeTab) {
      case 'papyrus':
        errors = validatePapyrus(code);
        break;
      case 'xedit':
        errors = validateXEdit(code);
        break;
      case 'blender':
        errors = validateBlender(code);
        break;
    }

    setValidationErrors(errors);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const templates = {
    papyrus: {
      quest: `ScriptName MyQuestScript extends Quest

Event OnQuestInit()
    Debug.Trace("Quest initialized")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    Debug.Notification("Location changed!")
EndEvent`,
      actor: `ScriptName MyActorScript extends Actor

Event OnInit()
    Debug.Trace("Actor initialized")
EndEvent

Event OnCombatStateChanged(Actor akTarget, int aeCombatState)
    If aeCombatState == 1
        Debug.Notification("Entering combat!")
    EndIf
EndEvent

Event OnDeath(Actor akKiller)
    Debug.Trace("Actor died")
EndEvent`,
      objectReference: `ScriptName MyObjectScript extends ObjectReference

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("Player activated object")
        ; Your code here
    EndIf
EndEvent

Event OnContainerChanged(ObjectReference akNewContainer, ObjectReference akOldContainer)
    Debug.Trace("Container changed")
EndEvent`,
    },
    xedit: {
      basic: `unit UserScript;

function Initialize: integer;
begin
  Result := 0;
  AddMessage('Script initialized');
end;

function Process(e: IInterface): integer;
begin
  Result := 0;
  
  // Process each record
  AddMessage('Processing: ' + GetEditValue(e, 'EDID'));
  
  // Your code here
  
end;

function Finalize: integer;
begin
  Result := 0;
  AddMessage('Script complete');
end;

end.`,
      renumber: `unit RenumberFormIDs;

var
  targetPlugin: IInterface;
  newFormIDBase: integer;

function Initialize: integer;
begin
  Result := 0;
  targetPlugin := FileByName('MyMod.esp');
  newFormIDBase := $01000800; // New FormID base
end;

function Process(e: IInterface): integer;
var
  oldFormID, newFormID: integer;
begin
  Result := 0;
  
  if GetFile(e) <> targetPlugin then
    Exit;
  
  oldFormID := GetLoadOrderFormID(e);
  newFormID := newFormIDBase;
  Inc(newFormIDBase);
  
  // Renumber
  SetLoadOrderFormID(e, newFormID);
  AddMessage(Format('Changed %s from %s to %s', [GetEditValue(e, 'EDID'), IntToHex(oldFormID, 8), IntToHex(newFormID, 8)]));
end;

end.`,
    },
    blender: {
      basic: `import bpy

# Get active object
obj = bpy.context.active_object

if obj:
    print(f"Selected object: {obj.name}")
    
    # Modify object
    obj.location = (0, 0, 0)
    obj.scale = (1, 1, 1)
else:
    print("No object selected")`,
      export: `import bpy
import os

# Export settings
export_path = "D:/FO4/Data/Meshes/"
export_name = "my_mesh.nif"

# Select all mesh objects
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)

# Export as NIF (requires PyNifly plugin)
filepath = os.path.join(export_path, export_name)
bpy.ops.export_scene.nif(
    filepath=filepath,
    use_selection=True,
    apply_scale=True
)

print(f"Exported to {filepath}")`,
      batch: `import bpy

# Batch process all meshes
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    
    # Select object
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    # Apply transformations
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Add modifier
    mod = obj.modifiers.new(name="EdgeSplit", type='EDGE_SPLIT')
    mod.split_angle = 0.523599  # 30 degrees
    
    # Apply modifier
    bpy.ops.object.modifier_apply(modifier="EdgeSplit")
    
    obj.select_set(False)
    print(f"Processed: {obj.name}")

print("Batch processing complete")`,
    },
  };

  const loadTemplate = (template: string) => {
    const templates_for_type = templates[activeTab];
    if (templates_for_type && template in templates_for_type) {
      setCode((templates_for_type as any)[template]);
      setValidationErrors([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">The Scribe</h1>
              <p className="text-sm text-slate-400">Script Writing & Validation</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 bg-slate-900 rounded-lg p-1">
            <button
              onClick={() => { setActiveTab('papyrus'); setCode(''); setValidationErrors([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'papyrus'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Code className="w-4 h-4" />
              Papyrus
            </button>
            <button
              onClick={() => { setActiveTab('xedit'); setCode(''); setValidationErrors([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'xedit'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              xEdit
            </button>
            <button
              onClick={() => { setActiveTab('blender'); setCode(''); setValidationErrors([]); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'blender'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Palette className="w-4 h-4" />
              Blender
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor */}
        <div className="flex-1 flex flex-col border-r border-slate-700/50">
          {/* Toolbar */}
          <div className="p-3 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
            <div className="flex gap-2">
              <select
                onChange={(e) => loadTemplate(e.target.value)}
                className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Load Template...</option>
                {activeTab === 'papyrus' && (
                  <>
                    <option value="quest">Quest Script</option>
                    <option value="actor">Actor Script</option>
                    <option value="objectReference">Object Reference</option>
                  </>
                )}
                {activeTab === 'xedit' && (
                  <>
                    <option value="basic">Basic Script</option>
                    <option value="renumber">Renumber FormIDs</option>
                  </>
                )}
                {activeTab === 'blender' && (
                  <>
                    <option value="basic">Basic Script</option>
                    <option value="export">Export NIF</option>
                    <option value="batch">Batch Process</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleLaunchTool}
                disabled={launching || !getActiveToolPath().trim()}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {activeTab === 'papyrus' && 'Launch CK'}
                {activeTab === 'xedit' && 'Launch xEdit'}
                {activeTab === 'blender' && 'Launch Blender'}
              </button>
              {getActiveToolPath().trim() && (
                <span className="text-[11px] text-slate-400 px-2 py-1 bg-slate-800 border border-slate-700 rounded">
                  {toolVersion ? `Version: ${toolVersion}` : 'Version: unknown'}
                </span>
              )}
              <button
                onClick={handleValidate}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors"
              >
                <Check className="w-4 h-4" />
                Validate
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 p-4 overflow-auto bg-slate-950">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Enter your ${activeTab} code here...`}
              className="w-full h-full bg-transparent text-emerald-400 font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
              style={{ 
                minHeight: '100%',
                lineHeight: '1.5',
                tabSize: 4,
              }}
            />
          </div>
        </div>

        {/* Right Panel - Validation Results */}
        <div className="w-96 flex flex-col bg-slate-900/50">
          <div className="p-4 border-b border-slate-700/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Validation Results
            </h2>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-2">
            {validationErrors.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Check className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No issues detected</p>
                <p className="text-sm mt-1">Click &quot;Validate&quot; to check your code</p>
              </div>
            )}

            {validationErrors.map((error, index) => {
              const colors = {
                error: 'border-red-500/50 bg-red-900/20 text-red-400',
                warning: 'border-amber-500/50 bg-amber-900/20 text-amber-400',
                info: 'border-blue-500/50 bg-blue-900/20 text-blue-400',
              };

              const icons = {
                error: X,
                warning: AlertTriangle,
                info: Zap,
              };

              const Icon = icons[error.severity];

              return (
                <div
                  key={index}
                  className={`border rounded-lg p-3 ${colors[error.severity]}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase">{error.severity}</span>
                        <span className="text-xs opacity-70">Line {error.line}</span>
                      </div>
                      <p className="text-sm">{error.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Tips */}
          <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Quick Tips
            </h3>
            <div className="space-y-1 text-xs text-slate-400">
              {activeTab === 'papyrus' && (
                <>
                  <p>• Always start with ScriptName declaration</p>
                  <p>• Close all Event/Function blocks</p>
                  <p>• Import F4SE if using F4SE functions</p>
                  <p>• Use &quot;Auto&quot; for simple properties</p>
                </>
              )}
              {activeTab === 'xedit' && (
                <>
                  <p>• Start with &quot;unit&quot; declaration</p>
                  <p>• Implement Initialize/Process/Finalize</p>
                  <p>• Use AddMessage() for logging</p>
                  <p>• End with &quot;end.&quot;</p>
                </>
              )}
              {activeTab === 'blender' && (
                <>
                  <p>• Always import bpy first</p>
                  <p>• Check if objects exist before accessing</p>
                  <p>• Use bpy.context for active objects</p>
                  <p>• Use bpy.data for all data</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
