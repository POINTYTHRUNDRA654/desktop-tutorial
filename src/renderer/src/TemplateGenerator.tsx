import React, { useRef, useState } from 'react';
import { Wand2, Copy, Download, Sparkles, Code } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxyFrom } from './components/useWheelScrollProxy';

interface GeneratedTemplate {
  code: string;
  explanation: string;
  scriptName: string;
}

export const TemplateGenerator: React.FC = () => {
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedTemplate | null>(null);

  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const examplesRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const outputScrollRef = useRef<HTMLDivElement | null>(null);

  const wheelProxy = useWheelScrollProxyFrom(() => (generated ? outputScrollRef.current : examplesRef.current));

  const generateTemplate = async () => {
    if (!description.trim()) return;
    
    setGenerating(true);
    
    // Simulate AI generation with intelligent template creation
    setTimeout(() => {
      const lowerDesc = description.toLowerCase();
      let code = '';
      let explanation = '';
      let scriptName = 'GeneratedScript';
      
      // Detect what type of script the user wants
      if (lowerDesc.includes('door') || lowerDesc.includes('activate')) {
        scriptName = 'ActivatorScript';
        code = `ScriptName ${scriptName} extends ObjectReference

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("You activated this object!")
        ; Add your custom logic here
    EndIf
EndEvent`;
        explanation = 'This script responds when the player activates an object. Place it on doors, containers, or any activatable object. The OnActivate event fires whenever someone or something activates the reference.';
      }
      else if (lowerDesc.includes('quest') || lowerDesc.includes('stage')) {
        scriptName = 'QuestScript';
        code = `ScriptName ${scriptName} extends Quest

Event OnInit()
    Parent.OnInit()
    Debug.Trace("${scriptName}: Quest initialized")
EndEvent

Function SetStage(Int aiStage)
    Self.SetStage(aiStage)
    Debug.Notification("Quest stage set to " + aiStage)
EndFunction`;
        explanation = 'Quest script template. Extends Quest and can manage quest stages, objectives, and quest-related logic. Use SetStage() to progress the quest.';
      }
      else if (lowerDesc.includes('perk') || lowerDesc.includes('player enter')) {
        scriptName = 'PerkScript';
        code = `ScriptName ${scriptName} extends Perk

Event OnPerkEntry()
    Debug.Notification("Perk acquired!")
    ; Perk logic here
EndEvent`;
        explanation = 'Perk script that fires when the player acquires the perk. Use this to grant abilities, modify stats, or trigger effects when the perk is earned.';
      }
      else if (lowerDesc.includes('combat') || lowerDesc.includes('fight') || lowerDesc.includes('attack')) {
        scriptName = 'CombatScript';
        code = `ScriptName ${scriptName} extends Actor

Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
        Debug.Notification("Entered combat!")
        ; Combat started logic
    ElseIf aeCombatState == 0
        Debug.Notification("Left combat")
        ; Combat ended logic
    EndIf
EndEvent

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
    Debug.Notification("Hit by " + akAggressor.GetDisplayName())
    ; React to being hit
EndEvent`;
        explanation = 'Combat script that responds to combat state changes and hits. OnCombatStateChanged fires when entering/leaving combat (state 1 = combat, 0 = not in combat). OnHit fires whenever this actor is struck.';
      }
      else if (lowerDesc.includes('timer') || lowerDesc.includes('delay') || lowerDesc.includes('wait')) {
        scriptName = 'TimerScript';
        code = `ScriptName ${scriptName} extends ObjectReference

Float Property UpdateInterval = 5.0 Auto
Int timerID = 1

Event OnInit()
    Parent.OnInit()
    StartTimer(UpdateInterval, timerID)
EndEvent

Event OnTimer(Int aiTimerID)
    If aiTimerID == timerID
        ; Timer logic here
        Debug.Trace("Timer fired")
        
        ; Restart timer for continuous updates
        StartTimer(UpdateInterval, timerID)
    EndIf
EndEvent`;
        explanation = 'Timer-based script that executes logic at regular intervals. Useful for periodic checks, spawning, or any repeated action. StartTimer() begins the countdown, OnTimer() fires when complete.';
      }
      else if (lowerDesc.includes('spawn') || lowerDesc.includes('create') || lowerDesc.includes('npc')) {
        scriptName = 'SpawnerScript';
        code = `ScriptName ${scriptName} extends ObjectReference

ActorBase Property ActorToSpawn Auto
Int Property SpawnCount = 3 Auto

Event OnInit()
    Parent.OnInit()
    SpawnActors()
EndEvent

Function SpawnActors()
    Int i = 0
    While i < SpawnCount
        Actor newActor = Self.PlaceActorAtMe(ActorToSpawn)
        If newActor
            Debug.Trace("Spawned actor " + (i + 1))
        EndIf
        i += 1
    EndWhile
EndFunction`;
        explanation = 'Spawner script that creates multiple actors at the reference location. Set ActorToSpawn property to the ActorBase you want to spawn. SpawnCount controls how many are created.';
      }
      else if (lowerDesc.includes('item') || lowerDesc.includes('inventory') || lowerDesc.includes('add')) {
        scriptName = 'ItemScript';
        code = `ScriptName ${scriptName} extends ObjectReference

Form Property ItemToAdd Auto
Int Property ItemCount = 1 Auto

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Game.GetPlayer().AddItem(ItemToAdd, ItemCount)
        Debug.Notification("Received " + ItemCount + " " + ItemToAdd.GetName())
        Self.Disable()
        Self.Delete()
    EndIf
EndEvent`;
        explanation = 'Item giver script. When activated by the player, adds items to their inventory then removes itself. Set ItemToAdd property to the item Form and ItemCount for quantity.';
      }
      else if (lowerDesc.includes('teleport') || lowerDesc.includes('move') || lowerDesc.includes('travel')) {
        scriptName = 'TeleportScript';
        code = `ScriptName ${scriptName} extends ObjectReference

ObjectReference Property TeleportDestination Auto

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Game.GetPlayer().MoveTo(TeleportDestination)
        Debug.Notification("Teleported!")
    EndIf
EndEvent`;
        explanation = 'Teleport script that moves the player to a destination marker. Set TeleportDestination property to an XMarker or other reference where the player should appear.';
      }
      else {
        // Generic template
        scriptName = 'CustomScript';
        code = `ScriptName ${scriptName} extends ObjectReference

; Properties - set these in the Creation Kit
; Type Property PropertyName Auto

Event OnInit()
    Parent.OnInit()
    Debug.Trace("${scriptName} initialized")
    ; Your initialization code here
EndEvent

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("Activated by player")
        ; Your activation code here
    EndIf
EndEvent

; Add custom functions below
Function MyCustomFunction()
    ; Your code here
EndFunction`;
        explanation = 'Generic Papyrus script template with common events. OnInit fires when the script starts, OnActivate fires when someone activates the object. Add properties and custom functions as needed.';
      }
      
      setGenerated({
        code,
        explanation,
        scriptName
      });
      
      setGenerating(false);
    }, 1200);
  };

  const copyToClipboard = () => {
    if (generated) {
      navigator.clipboard.writeText(generated.code);
    }
  };

  const downloadScript = () => {
    if (generated) {
      const blob = new Blob([generated.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generated.scriptName}.psc`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const examplePrompts = [
    "Create a script that activates when player enters and spawns 3 raiders",
    "Make a door that teleports the player to another location",
    "Script that adds items to player inventory when activated",
    "Combat script that tracks when NPC enters and exits combat",
    "Timer that runs every 5 seconds and checks a condition",
    "Quest script with stages and objectives"
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col min-h-0" onWheel={wheelProxy}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <Wand2 className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Papyrus Template Generator</h1>
            <p className="text-sm text-slate-400">Describe what you want - get working Papyrus code</p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-3">
          <textarea
            ref={descriptionRef}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what your script should do... (e.g., 'Create a door that spawns enemies when opened')"
            className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"
          />
          <button
            onClick={generateTemplate}
            disabled={!description.trim() || generating}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating Script...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate Papyrus Script
              </>
            )}
          </button>
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ToolsInstallVerifyPanel
            accentClassName="text-emerald-300"
            description="This generator runs locally in the UI (no external tools required). Use it to scaffold a script, then move it into your project and compile with your chosen toolchain."
            verify={[
              'Enter a short description and click Generate; confirm code + explanation appear.',
              'Copy code and confirm your clipboard contains the full script text.',
              'Download and confirm the saved file includes the generated script.'
            ]}
            firstTestLoop={[
              'Generate a small script (Activator or Timer) → copy it into your project.',
              'Open External Tools Settings and confirm your compiler/tool paths are configured (if you plan to compile locally).'
            ]}
            troubleshooting={[
              'If Generate does nothing, ensure the description field is not empty and retry.',
              'If download is blocked, allow downloads/popups in your environment.'
            ]}
            shortcuts={[
              { label: 'Tool Settings', to: '/settings/tools' },
              { label: 'Quick Reference', to: '/reference' },
              { label: 'Workshop', to: '/workshop' },
            ]}
          />

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div className="text-sm font-bold text-white mb-1">Existing Workflow (Legacy)</div>
            <div className="text-xs text-slate-400 mb-3">
              Quick access to the original page sections.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => descriptionRef.current?.focus()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold"
              >
                Focus Description
              </button>
              <button
                onClick={() => {
                  setDescription((prev) => prev.trim() ? prev : 'Create a script that activates when player enters and spawns 3 raiders');
                  requestAnimationFrame(() => descriptionRef.current?.focus());
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold"
              >
                Insert Example Prompt
              </button>
              <button
                onClick={() => examplesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold"
              >
                Example Prompts
              </button>
              <button
                onClick={() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-bold"
              >
                Generated Output
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden flex gap-4 p-6">
        {/* Left: Examples */}
        <div ref={examplesRef} className="w-80 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Example Prompts
            </h3>
            <div className="space-y-2">
              {examplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(prompt)}
                  className="w-full text-left text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 p-3 rounded-lg transition-colors"
                >
                  &quot;{prompt}&quot;
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <h4 className="font-bold text-blue-300 mb-2 text-sm">How it works</h4>
            <p className="text-xs text-slate-400">
              The generator analyzes your description and creates Papyrus code using common patterns.
              It detects keywords like &quot;activate&quot;, &quot;spawn&quot;, &quot;combat&quot;, &quot;timer&quot; to choose the right template.
            </p>
          </div>
        </div>

        {/* Right: Generated Code */}
        <div ref={outputRef} className="flex-1 min-h-0 flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          {!generated && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Code className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Describe your script and click Generate</p>
                <p className="text-xs mt-2">Try an example prompt from the left</p>
              </div>
            </div>
          )}

          {generated && (
            <>
              {/* Header */}
              <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  {generated.scriptName}.psc
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 text-sm transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={downloadScript}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>

              {/* Explanation */}
              <div className="p-4 bg-emerald-900/10 border-b border-emerald-500/20">
                <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2">Explanation</h4>
                <p className="text-sm text-slate-300">{generated.explanation}</p>
              </div>

              {/* Code */}
              <div ref={outputScrollRef} className="flex-1 min-h-0 overflow-y-auto">
                <pre className="p-4 text-sm font-mono text-slate-200 whitespace-pre-wrap">
                  {generated.code}
                </pre>
              </div>

              {/* Footer Notes */}
              <div className="p-4 border-t border-slate-700 bg-slate-800/30">
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-slate-400">Next steps:</span> Copy this script to your Data\Scripts\Source folder, 
                  compile it in the Creation Kit, then attach it to an object. Remember to set any required Properties in the CK.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
