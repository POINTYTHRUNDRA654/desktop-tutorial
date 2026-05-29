import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code, Wand2, BookOpen, Zap, FileSearch, Copy, CheckCircle2 } from 'lucide-react';
import { ScriptAnalyzer } from './ScriptAnalyzer';
import { TemplateGenerator } from './TemplateGenerator';


// ============================================================================
// FOMOD XML GENERATOR — produces real ModuleConfig.xml + info.xml
// ============================================================================

interface FomodOption {
    id: string;
    name: string;
    description: string;
    imageFile: string;
    sourceFolder: string;
    destFolder: string;
}

interface FomodStep {
    name: string;
    groupName: string;
    groupType: 'SelectAny' | 'SelectExactlyOne' | 'SelectAll';
    options: FomodOption[];
}

const FomodGeneratorPanel: React.FC = () => {
    const [modName, setModName] = useState('My Fallout 4 Mod');
    const [author, setAuthor] = useState('');
    const [version, setVersion] = useState('1.0.0');
    const [website, setWebsite] = useState('');
    const [modDesc, setModDesc] = useState('');
    const [coreFolder, setCoreFolder] = useState('Core');
    const [steps, setSteps] = useState<FomodStep[]>([
        {
            name: 'Choose Your Option',
            groupName: 'Options',
            groupType: 'SelectExactlyOne',
            options: [
                { id: 'opt1', name: 'Standard', description: 'Standard version', imageFile: 'fomod/images/standard.jpg', sourceFolder: 'Options/Standard', destFolder: '' },
                { id: 'opt2', name: 'Alternate', description: 'Alternate version', imageFile: 'fomod/images/alternate.jpg', sourceFolder: 'Options/Alternate', destFolder: '' },
            ],
        },
    ]);
    const [copied, setCopied] = useState<string | null>(null);
    const [activeXmlTab, setActiveXmlTab] = useState<'module' | 'info'>('module');

    const addStep = () => setSteps(prev => [...prev, {
        name: 'New Step',
        groupName: 'Options',
        groupType: 'SelectAny',
        options: [{ id: `opt_${Date.now()}`, name: 'Option', description: '', imageFile: '', sourceFolder: '', destFolder: '' }],
    }]);

    const removeStep = (si: number) => setSteps(prev => prev.filter((_, i) => i !== si));

    const addOption = (si: number) => setSteps(prev => prev.map((s, i) =>
        i === si ? { ...s, options: [...s.options, { id: `opt_${Date.now()}`, name: 'New Option', description: '', imageFile: '', sourceFolder: '', destFolder: '' }] } : s
    ));

    const removeOption = (si: number, oi: number) => setSteps(prev => prev.map((s, i) =>
        i === si ? { ...s, options: s.options.filter((_, j) => j !== oi) } : s
    ));

    const updateStep = (si: number, field: keyof FomodStep, value: any) =>
        setSteps(prev => prev.map((s, i) => i === si ? { ...s, [field]: value } : s));

    const updateOption = (si: number, oi: number, field: keyof FomodOption, value: string) =>
        setSteps(prev => prev.map((s, i) => i === si ? {
            ...s,
            options: s.options.map((o, j) => j === oi ? { ...o, [field]: value } : o)
        } : s));

    const generateInfoXml = () => {
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<fomod>
  <Name>${modName}</Name>
  <Author>${author}</Author>
  <Version>${version}</Version>${website ? `
  <Website>${website}</Website>` : ''}${modDesc ? `
  <Description>${modDesc}</Description>` : ''}
</fomod>`;
    };

    const generateModuleConfigXml = () => {
        const stepXml = steps.map(step => {
            const optionsXml = step.options.map(opt => {
                const dest = opt.destFolder ? opt.destFolder : 'Data';
                return `        <plugin name="${opt.name}">
          <description>${opt.description || opt.name}</description>${opt.imageFile ? `
          <image path="${opt.imageFile}" />` : ''}
          <files>
            <folder source="${opt.sourceFolder}" destination="${dest}" priority="0" />
          </files>
          <typeDescriptor>
            <type name="Optional" />
          </typeDescriptor>
        </plugin>`;
            }).join('\n');

            return `    <installStep name="${step.name}">
      <optionalFileGroups order="Explicit">
        <group name="${step.groupName}" type="${step.groupType}">
          <plugins order="Explicit">
${optionsXml}
          </plugins>
        </group>
      </optionalFileGroups>
    </installStep>`;
        }).join('\n');

        const coreLine = coreFolder.trim()
            ? `  <requiredInstallFiles>
    <folder source="${coreFolder}" destination="Data" priority="0" />
  </requiredInstallFiles>

` : '';

        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>${modName}</moduleName>
  <moduleImage path="fomod/images/header.jpg" />

${coreLine}  <installSteps order="Explicit">
${stepXml}
  </installSteps>
</config>`;
    };

    const handleCopy = (type: 'module' | 'info') => {
        const xml = type === 'module' ? generateModuleConfigXml() : generateInfoXml();
        navigator.clipboard.writeText(xml);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const xml = activeXmlTab === 'module' ? generateModuleConfigXml() : generateInfoXml();
    const filename = activeXmlTab === 'module' ? 'fomod/ModuleConfig.xml' : 'fomod/info.xml';

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left — form inputs */}
            <div className="space-y-4">
                {/* Mod metadata */}
                <div className="space-y-2">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Mod Info</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Mod Name *</label>
                            <input value={modName} onChange={e => setModName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Author *</label>
                            <input value={author} onChange={e => setAuthor(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Version</label>
                            <input value={version} onChange={e => setVersion(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" placeholder="1.0.0" />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500 mb-0.5 block">Website</label>
                            <input value={website} onChange={e => setWebsite(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" placeholder="https://nexusmods.com/…" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 mb-0.5 block">Core Folder (always installed)</label>
                        <input value={coreFolder} onChange={e => setCoreFolder(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500" placeholder="Core" />
                        <p className="text-[10px] text-slate-600 mt-0.5">Archive folder copied to Data/ unconditionally. Leave blank if no core files.</p>
                    </div>
                </div>

                {/* Install steps */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Install Steps</div>
                        <button onClick={addStep} className="px-2 py-1 text-[10px] bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded transition-colors font-bold">+ Step</button>
                    </div>

                    {steps.map((step, si) => (
                        <div key={si} className="border border-slate-700 rounded-lg p-3 space-y-2 bg-slate-900/40">
                            <div className="flex items-center gap-2">
                                <input value={step.name} onChange={e => updateStep(si, 'name', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500" placeholder="Step name" />
                                <select value={step.groupType} onChange={e => updateStep(si, 'groupType', e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none">
                                    <option value="SelectExactlyOne">Select One</option>
                                    <option value="SelectAny">Select Any</option>
                                    <option value="SelectAll">Select All</option>
                                </select>
                                <button onClick={() => removeStep(si)} className="text-red-500 hover:text-red-400 text-xs px-1">✕</button>
                            </div>
                            <input value={step.groupName} onChange={e => updateStep(si, 'groupName', e.target.value)} className="w-full bg-slate-900 border border-slate-700/50 rounded px-2 py-1 text-[11px] text-slate-400 focus:outline-none focus:border-emerald-500" placeholder="Group name (shown in installer)" />

                            <div className="space-y-2 pl-2 border-l border-slate-800">
                                {step.options.map((opt, oi) => (
                                    <div key={oi} className="space-y-1">
                                        <div className="flex gap-1">
                                            <input value={opt.name} onChange={e => updateOption(si, oi, 'name', e.target.value)} className="flex-1 bg-slate-900 border border-slate-700/50 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500" placeholder="Option name" />
                                            <button onClick={() => removeOption(si, oi)} className="text-slate-600 hover:text-red-400 text-xs px-1">✕</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <input value={opt.sourceFolder} onChange={e => updateOption(si, oi, 'sourceFolder', e.target.value)} className="bg-slate-900 border border-slate-700/40 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono focus:outline-none" placeholder="Source folder in archive" />
                                            <input value={opt.imageFile} onChange={e => updateOption(si, oi, 'imageFile', e.target.value)} className="bg-slate-900 border border-slate-700/40 rounded px-2 py-0.5 text-[10px] text-slate-400 font-mono focus:outline-none" placeholder="fomod/images/opt.jpg" />
                                        </div>
                                        <input value={opt.description} onChange={e => updateOption(si, oi, 'description', e.target.value)} className="w-full bg-slate-900 border border-slate-700/40 rounded px-2 py-0.5 text-[10px] text-slate-400 focus:outline-none" placeholder="Option description shown in installer" />
                                    </div>
                                ))}
                                <button onClick={() => addOption(si)} className="text-[10px] text-emerald-600 hover:text-emerald-400 transition-colors">+ Add option</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg text-[11px] text-amber-300">
                    <strong>Archive structure:</strong> Place the <code className="font-mono">fomod/</code> folder and your option folders at the archive root — not inside <code className="font-mono">Data/</code>. The installer maps source folders into <code className="font-mono">Data/</code> automatically.
                </div>
            </div>

            {/* Right — live XML preview */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        {(['module', 'info'] as const).map(tab => (
                            <button key={tab} onClick={() => setActiveXmlTab(tab)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-t transition-colors ${activeXmlTab === tab ? 'bg-[#0a0e0a] text-emerald-300 border-t border-x border-slate-700' : 'bg-slate-900/50 text-slate-500 hover:text-slate-300'}`}>
                                {tab === 'module' ? 'ModuleConfig.xml' : 'info.xml'}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => handleCopy(activeXmlTab)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors">
                        {copied === activeXmlTab ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === activeXmlTab ? 'Copied!' : `Copy ${filename}`}
                    </button>
                </div>
                <pre className="bg-[#050805] border border-slate-800 rounded-b-lg rounded-tr-lg p-4 text-[11px] text-emerald-200 font-mono leading-relaxed overflow-auto max-h-[520px] whitespace-pre">
{xml}
                </pre>
                <p className="text-[10px] text-slate-600">Copy the XML and save it as <code className="font-mono text-slate-400">{filename}</code> in your archive.</p>
            </div>
        </div>
    );
};

// ============================================================================
// PAPYRUS SNIPPET LIBRARY — Real, production-ready patterns
// ============================================================================

interface Snippet {
    id: string;
    title: string;
    category: string;
    description: string;
    code: string;
    tags: string[];
}

const PAPYRUS_SNIPPETS: Snippet[] = [
    {
        id: 'onactivate',
        title: 'OnActivate — Player Gate',
        category: 'Events',
        description: 'Gate activation to the player only, with notification.',
        tags: ['event', 'activation', 'player'],
        code: `Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("Activated!")
        ; your logic here
    EndIf
EndEvent`,
    },
    {
        id: 'oninit',
        title: 'OnInit — Safe Initialization',
        category: 'Events',
        description: 'Correct OnInit pattern — always call Parent.OnInit() and use RegisterForSingleUpdate instead of blocking waits.',
        tags: ['event', 'init', 'startup'],
        code: `Event OnInit()
    Parent.OnInit()
    ; Do not use Utility.Wait() here — use deferred init instead
    RegisterForSingleUpdate(0.1)
EndEvent

Event OnUpdate()
    ; Safe deferred initialization logic
EndEvent`,
    },
    {
        id: 'timer',
        title: 'Timer — RegisterForSingleUpdate',
        category: 'Timers',
        description: 'Preferred timer pattern. Avoid Utility.Wait() in gameplay scripts — it blocks the thread.',
        tags: ['timer', 'update', 'delay'],
        code: `Event OnInit()
    Parent.OnInit()
    RegisterForSingleUpdate(5.0)  ; fire in 5 seconds
EndEvent

Event OnUpdate()
    Debug.Notification("Timer fired!")
    ; Re-register for repeating behaviour:
    ; RegisterForSingleUpdate(5.0)
EndEvent`,
    },
    {
        id: 'property',
        title: 'Property — Auto & Conditional',
        category: 'Properties',
        description: 'Standard property declarations. Use Auto for CK-fillable references. Conditional allows use in conditions.',
        tags: ['property', 'variable', 'reference'],
        code: `; Auto property — fill in the CK
Actor Property MyActor Auto
Quest Property MyQuest Auto

; Conditional — can be checked in CK condition functions
Bool Property bIsActive = False Auto Conditional

; Read-only (no Auto — must supply getter)
Int Property MyReadOnly
    Int Function Get()
        Return _privateValue
    EndFunction
EndProperty`,
    },
    {
        id: 'questalias',
        title: 'Quest Alias — GetActorRef',
        category: 'Quests',
        description: 'Retrieve a filled alias reference from a quest. Always null-check before using.',
        tags: ['quest', 'alias', 'npc'],
        code: `; Attach to the quest script or any script with a Quest property
Quest Property MyQuest Auto

Function GetQuestNPC()
    ; Cast to alias then to actor
    ReferenceAlias alias = MyQuest.GetAlias(0)  ; alias index 0
    Actor akTarget = alias.GetActorReference()
    If akTarget == None
        Debug.Trace("MyScript: Alias 0 returned None — not filled yet")
        Return
    EndIf
    akTarget.MoveTo(Game.GetPlayer())
EndFunction`,
    },
    {
        id: 'leveledlist',
        title: 'Leveled List — Runtime Injection',
        category: 'Items',
        description: 'Add an item to a leveled list at runtime via script. Use with caution — permanent save-game change.',
        tags: ['leveled list', 'injection', 'loot'],
        code: `LeveledItem Property LLI_VendorMisc Auto   ; the leveled list to patch
Form Property MyNewItem Auto                    ; the item to add
Int Property SpawnCount = 1 Auto
Int Property MinLevel = 1 Auto

Event OnInit()
    Parent.OnInit()
    LLI_VendorMisc.AddForm(MyNewItem, MinLevel, SpawnCount)
EndEvent`,
    },
    {
        id: 'mcm',
        title: 'MCM — F4SE Config Call',
        category: 'F4SE / MCM',
        description: 'Read a float setting from an MCM .ini file using F4SE\'s ConfigManager. Requires F4SE 0.7.7+.',
        tags: ['f4se', 'mcm', 'settings', 'ini'],
        code: `; Read float from MyMod.ini (Documents\\My Games\\Fallout4\\MyMod.ini)
Float fSomeValue = Game.GetGameSettingFloat("fMyModSetting:MyMod")

; Write a value (persisted to ini):
; Game.SetGameSettingFloat("fMyModSetting:MyMod", 1.5)

; Check if F4SE is present before calling F4SE-dependent functions:
If !Game.IsPluginInstalled("F4SE")
    Debug.Trace("MyMod: F4SE not detected — MCM features disabled")
EndIf`,
    },
    {
        id: 'traceprofile',
        title: 'Debug Trace — Profiling',
        category: 'Debugging',
        description: 'Structured trace output for profiling and diagnosing script execution. Include script name in every trace.',
        tags: ['debug', 'trace', 'profiling'],
        code: `; Always prefix traces with [ScriptName] for easy log filtering
Debug.Trace("[MyScript] OnInit fired — IsRunning: " + Self.IsRunning() as String)

; For expensive operations:
Float fStart = Utility.GetCurrentRealTime()
; ... expensive work ...
Float fElapsed = Utility.GetCurrentRealTime() - fStart
Debug.Trace("[MyScript] Work completed in " + fElapsed + "s")`,
    },
    {
        id: 'dispatchmodkevent',
        title: 'ModEvent — Cross-Mod Events',
        category: 'F4SE / MCM',
        description: 'Send and receive F4SE Mod Events to communicate between mods without hard dependencies.',
        tags: ['f4se', 'mod event', 'cross-mod'],
        code: `; === SENDER SCRIPT ===
Int iHandle = ModEvent.Create("MyMod_OnItemCrafted")
If iHandle
    ModEvent.PushForm(iHandle, akItem)
    ModEvent.PushInt(iHandle, aiCount)
    ModEvent.Send(iHandle)
EndIf

; === RECEIVER SCRIPT (in another mod) ===
Event OnInit()
    RegisterForModEvent("MyMod_OnItemCrafted", "OnItemCrafted")
EndEvent

Event OnItemCrafted(Form akItem, Int aiCount)
    Debug.Notification("Received: " + akItem.GetName() + " x" + aiCount)
EndEvent`,
    },
    {
        id: 'workitemqueue',
        title: 'Work Queue — Batch Actor Processing',
        category: 'Performance',
        description: 'Process a large array of actors in batches per frame to avoid Papyrus stack overruns.',
        tags: ['performance', 'batch', 'array', 'actors'],
        code: `Actor[] Property ActorPool Auto
Int _iProcessIdx = 0

Event OnInit()
    Parent.OnInit()
    RegisterForSingleUpdate(0.1)
EndEvent

Event OnUpdate()
    Int iBatchSize = 5   ; process 5 per tick — tune to taste
    Int iEnd = Math.Min(_iProcessIdx + iBatchSize, ActorPool.Length)
    While _iProcessIdx < iEnd
        ProcessActor(ActorPool[_iProcessIdx])
        _iProcessIdx += 1
    EndWhile
    If _iProcessIdx < ActorPool.Length
        RegisterForSingleUpdate(0.05)   ; continue next tick
    Else
        _iProcessIdx = 0   ; reset for next pass
    EndIf
EndEvent

Function ProcessActor(Actor akTarget)
    ; your per-actor logic
EndFunction`,    },
    {
        id: 'onobjectequipped',
        title: 'OnObjectEquipped / Unequipped',
        category: 'Events',
        description: 'Track when an actor equips or unequips items. Cast akBaseObject to detect weapon or armor.',
        tags: ['event', 'equip', 'weapon', 'armor'],
        code: `; Attach script to an Actor form — events fire automatically
Event OnObjectEquipped(Form akBaseObject, ObjectReference akReference)
    Weapon kWeapon = akBaseObject as Weapon
    If kWeapon
        Debug.Notification("Equipped: " + kWeapon.GetName())
    EndIf
    Armor kArmor = akBaseObject as Armor
    If kArmor
        Debug.Notification("Armor piece equipped")
    EndIf
EndEvent

Event OnObjectUnequipped(Form akBaseObject, ObjectReference akReference)
    Debug.Trace("[Equip] Unequipped: " + akBaseObject.GetName())
EndEvent

; Monitor from another script (F4SE RemoteEvent):
; RegisterForRemoteEvent(akTarget as ScriptObject, "Actor.OnObjectEquipped")`,
    },
    {
        id: 'formlistops',
        title: 'FormList — Add / Remove / Iterate',
        category: 'Items',
        description: 'Manipulate FormList records at runtime. Guard AddForm with HasForm to prevent duplicates.',
        tags: ['formlist', 'list', 'add', 'remove', 'iterate'],
        code: `FormList Property MyFormList Auto   ; fill in CK

Function AddToList(Form akItem)
    If !MyFormList.HasForm(akItem)
        MyFormList.AddForm(akItem)
    EndIf
EndFunction

Function RemoveFromList(Form akItem)
    MyFormList.RemoveAddedForm(akItem)   ; only removes runtime-added forms
EndFunction

Function DumpList()
    Int i = 0
    While i < MyFormList.GetSize()
        Form kEntry = MyFormList.GetAt(i)
        Debug.Trace("[FormList] " + i + ": " + kEntry.GetName())
        i += 1
    EndWhile
EndFunction`,
    },
    {
        id: 'getrace',
        title: 'Actor.GetRace — Race Detection',
        category: 'Actors',
        description: 'Compare an actor race to a filled Race property. Useful for species-specific logic and dialogue conditions.',
        tags: ['actor', 'race', 'npc', 'condition'],
        code: `Actor Property akTarget Auto
Race Property HumanRace Auto        ; fill in CK
Race Property GhoulRace Auto
Race Property SuperMutantRace Auto

Function CheckRace()
    Race kRace = akTarget.GetRace()
    If kRace == HumanRace
        Debug.Notification("Human")
    ElseIf kRace == GhoulRace
        Debug.Notification("Ghoul")
    ElseIf kRace == SuperMutantRace
        Debug.Notification("Super Mutant")
    Else
        Debug.Trace("[Race] Unknown: " + kRace.GetName())
    EndIf
EndFunction

; Inline condition (usable in CK Dialogue / Quest conditions):
; akTarget.GetRace() == HumanRace`,
    },
    {
        id: 'statemachine',
        title: 'State Machine — Papyrus States',
        category: 'Patterns',
        description: 'Papyrus State blocks create mutually exclusive behaviour modes. Events in a state shadow the default handlers.',
        tags: ['state', 'machine', 'pattern', 'fsm'],
        code: `; Default state — auto-selected on script init
Event OnActivate(ObjectReference akActionRef)
    GotoState("Active")
EndEvent

State Active
    Event OnBeginState(String asOldState)
        Debug.Trace("[FSM] Active ← " + asOldState)
        RegisterForSingleUpdate(10.0)
    EndEvent

    Event OnUpdate()
        Debug.Trace("[FSM] Timeout — back to Idle")
        GotoState("")   ; "" = default state
    EndEvent

    ; Block re-activation while running
    Event OnActivate(ObjectReference akActionRef)
    EndEvent

    Event OnEndState(String asNewState)
        Debug.Trace("[FSM] Active → " + asNewState)
    EndEvent
EndState`,
    },
    {
        id: 'ondeath',
        title: 'OnDeath — Actor Death Handling',
        category: 'Events',
        description: 'Respond to actor death. Drop items, trigger quest stages, then disable the body after a delay.',
        tags: ['event', 'death', 'actor', 'npc'],
        code: `MiscObject Property DeathLoot Auto   ; optional drop item

Event OnDeath(Actor akKiller)
    Debug.Trace("[OnDeath] Killed by: " + akKiller.GetDisplayName())

    ; Add loot to the body before disabling
    If DeathLoot != None
        Self.AddItem(DeathLoot, 1, True)   ; True = silent
    EndIf

    ; Advance a quest stage
    ; MyQuest.SetStage(30)

    ; Schedule body cleanup
    RegisterForSingleUpdate(30.0)
EndEvent

Event OnUpdate()
    Self.Disable()   ; remove body after looting window
EndEvent

; Remote event from another script (F4SE):
; RegisterForRemoteEvent(akNPC as ScriptObject, "Actor.OnDeath")`,
    },
    {
        id: 'storageutil',
        title: 'StorageUtil — Per-Actor Persistence (F4SE)',
        category: 'F4SE / MCM',
        description: 'F4SE StorageUtil provides save-safe per-Form key-value storage. Prefix all keys with your mod name.',
        tags: ['f4se', 'storage', 'persistence', 'save', 'storageutil'],
        code: `; Requires F4SE 0.7.7+ and StorageUtil.pex (ships with F4SE)
; Prefix all keys: "MyMod.KeyName" to avoid cross-mod collisions

; ── Int ──────────────────────────────────────────────────────────────────────
StorageUtil.SetIntValue(akActor, "MyMod.TalkCount", 0)
Int iTalks = StorageUtil.GetIntValue(akActor, "MyMod.TalkCount", 0)
StorageUtil.AdjustIntValue(akActor, "MyMod.TalkCount", 1)   ; atomic increment

; ── Float ─────────────────────────────────────────────────────────────────────
StorageUtil.SetFloatValue(None, "MyMod.GlobalTimer", 0.0)   ; None = global

; ── String ───────────────────────────────────────────────────────────────────
StorageUtil.SetStringValue(akActor, "MyMod.LastLine", "Hello")
String s = StorageUtil.GetStringValue(akActor, "MyMod.LastLine", "")

; ── Cleanup — prevent save-game bloat ────────────────────────────────────────
StorageUtil.UnsetIntValue(akActor, "MyMod.TalkCount")
StorageUtil.UnsetStringValue(akActor, "MyMod.LastLine")`,
    },
];

// ============================================================================
// XEDIT QUICK REFERENCE
// ============================================================================

interface XEditRef {
    title: string;
    sig: string;
    notes: string;
}

const XEDIT_REFS: XEditRef[] = [
    { title: 'Copy As Override (Ctrl+D)', sig: 'Copy Record', notes: 'Creates a winning override in your patch. Right-click a record → "Copy as override into..."' },
    { title: 'Forward Value', sig: 'Right-click cell → Forward', notes: 'Copy the value from one mod into another in the same field row. Core patching operation.' },
    { title: 'Clean Masters', sig: 'File → Clean Masters', notes: 'Removes unused master references from the plugin header. Run before release.' },
    { title: 'Remove ITM', sig: 'Right-click → Remove ITM', notes: 'Removes Identical To Master records — entries that match the master exactly and contribute nothing.' },
    { title: 'Undelete References', sig: 'Right-click → Undelete and Disable', notes: 'Converts deleted references to disabled — deleted refs cause crashes with dependent mods.' },
    { title: 'ESL Flag (Header)', sig: 'File Header → Record Flags → ESL', notes: 'Check this box to ESL-flag an ESP. Works if new FormIDs ≤ 2047. Verify with xEdit record count.' },
    { title: 'Script Fragment Injection', sig: 'SCEN / QUST fragment scripts', notes: 'Quest stage and scene scripts auto-generated by CK. Edit PSC source and recompile; do not hand-edit the .pex.' },
    { title: 'Conflict Filter', sig: 'View → Show Conflict Winners', notes: 'Highlights records with multiple overrides. Red = critical override. Yellow = benign. Run this on your load order.' },
    { title: 'Material Swap (MSWP)', sig: 'MSWP record → Material Substitutions', notes: 'Create an MSWP record in xEdit to swap BGSM materials without editing the NIF. Link via Object Modification (OMOD) or script at runtime.' },
    { title: 'Keyword Assignment', sig: "KYWD in record's Keywords array", notes: 'Add keywords to WEAP/ARMO/NPC_ by expanding the Keywords array. Controls perk applicability, crafting recipes, and condition checks.' },
    { title: 'NPC_ FaceGen Check', sig: 'NPC_ → Face Data', notes: 'The Face Data sub-record stores morphs and tints. If blank, FaceGen geometry was not exported from CK — re-export via Char Gen → Export All to fix grey face.' },
    { title: 'Record Signature Reference', sig: 'WEAP / ARMO / NPC_ / QUST / CELL / REFR / STAT / ACTI / FURN / CONT / FACT / KYWD / FLST / LVLI / COBJ', notes: 'Common record types: WEAP=Weapon, ARMO=Armor, NPC_=Actor, QUST=Quest, CELL=Cell, REFR=Placed Object, STAT=Static, FLST=FormList, LVLI=LeveledItem, COBJ=Crafting Recipe.' },
];

type HubSection = {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    content: React.ReactNode;
};

// ============================================================================
// SNIPPET PANEL
// ============================================================================

const SnippetPanel: React.FC = () => {
    const [search, setSearch] = useState('');
    const [copied, setCopied] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const categories = ['All', ...Array.from(new Set(PAPYRUS_SNIPPETS.map(s => s.category)))];

    const filtered = PAPYRUS_SNIPPETS.filter(s => {
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
        const q = search.toLowerCase();
        const matchesSearch = !q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.includes(q));
        return matchesCategory && matchesSearch;
    });

    const handleCopy = (snippet: Snippet) => {
        navigator.clipboard.writeText(snippet.code);
        setCopied(snippet.id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search snippets…"
                    className="flex-1 min-w-[160px] bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex gap-1 flex-wrap">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${selectedCategory === cat ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No snippets match your search.</p>
            )}

            <div className="grid gap-3">
                {filtered.map(snippet => (
                    <div key={snippet.id} className="bg-[#0a0e0a] border border-slate-800 rounded-lg overflow-hidden">
                        <div className="flex items-start justify-between px-4 pt-3 pb-2">
                            <div>
                                <div className="text-sm font-bold text-white">{snippet.title}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{snippet.description}</div>
                                <div className="flex gap-1 mt-1.5">
                                    {snippet.tags.map(tag => (
                                        <span key={tag} className="px-1.5 py-0.5 bg-slate-800 text-[9px] text-slate-500 rounded">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <button
                                onClick={() => handleCopy(snippet)}
                                className="ml-3 shrink-0 p-1.5 rounded hover:bg-slate-700 transition-colors"
                                title="Copy snippet"
                            >
                                {copied === snippet.id
                                    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    : <Copy className="w-4 h-4 text-slate-400" />}
                            </button>
                        </div>
                        <pre className="px-4 pb-3 text-[11px] text-emerald-200 font-mono leading-relaxed whitespace-pre overflow-x-auto bg-black/20">
                            {snippet.code}
                        </pre>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// XEDIT REFERENCE PANEL
// ============================================================================

const XEditReferencePanel: React.FC = () => (
    <div className="space-y-2">
        <p className="text-xs text-slate-400 mb-3">Quick reference for the most common xEdit/FO4Edit operations. All operations require xEdit 4.1.5+ (FO4Edit 4.1.5+).</p>
        {XEDIT_REFS.map((ref, idx) => (
            <div key={idx} className="bg-[#0a0e0a] border border-slate-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                    <div className="flex-1">
                        <div className="text-sm font-bold text-amber-300">{ref.title}</div>
                        <div className="text-[10px] font-mono text-slate-500 mb-1">{ref.sig}</div>
                        <p className="text-[11px] text-slate-400">{ref.notes}</p>
                    </div>
                </div>
            </div>
        ))}
        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg text-[11px] text-blue-300">
            <strong>F4SE Version Note:</strong> FO4Edit reads the game version from your executable. Ensure your xEdit version supports your Fallout 4 build (Legacy 1.10.163, Next-Gen 1.10.980–984, or Creations 1.11.x).
        </div>
    </div>
);

// ============================================================================
// DEVTOOLS HUB
// ============================================================================

const DevtoolsHub: React.FC = () => {
    const [expandedSection, setExpandedSection] = useState<string>('template-generator');

    const toggleSection = (id: string) => {
        setExpandedSection(current => current === id ? '' : id);
    };

    const sections: HubSection[] = [
        {
            id: 'template-generator',
            title: 'Step 1 — Template Generator',
            description: 'Draft a Papyrus script from a plain-English description.',
            icon: Wand2,
            content: <TemplateGenerator embedded />,
        },
        {
            id: 'script-analyzer',
            title: 'Step 2 — Script Analyzer',
            description: 'Paste a .psc file and scan for errors, warnings, and performance anti-patterns.',
            icon: Code,
            content: <ScriptAnalyzer embedded />,
        },
        {
            id: 'snippet-library',
            title: 'Papyrus Snippet Library',
            description: `${PAPYRUS_SNIPPETS.length} production-ready patterns — events, timers, F4SE Mod Events, performance patterns, and more.`,
            icon: Zap,
            content: <SnippetPanel />,
        },
        {
            id: 'xedit-reference',
            title: 'xEdit / FO4Edit Quick Reference',
            description: 'The most-used xEdit operations: conflict resolution, ITM/UDR cleaning, ESL flagging, forward patching.',
            icon: FileSearch,
            content: <XEditReferencePanel />,
        },
        {
            id: 'fomod-generator',
            title: 'FOMOD Installer Generator',
            description: 'Build a valid ModuleConfig.xml + info.xml from a form — copy directly into your fomod/ folder.',
            icon: FileSearch,
            content: <FomodGeneratorPanel />,
        },
        {
            id: 'f4se-guide',
            title: 'F4SE Version Guide',
            description: 'Match your F4SE build to your Fallout 4 game version — the #1 cause of crashes on modded installs.',
            icon: BookOpen,
            content: (
                <div className="space-y-3 text-xs">
                    <div className="grid gap-2">
                        {[
                            { version: 'F4SE 0.6.23', game: '1.10.163 (Legacy / Pre-Next-Gen)', status: 'Legacy — works for most classic setups', color: 'border-slate-600 text-slate-300' },
                            { version: 'F4SE 0.7.2', game: '1.10.980 / 1.10.984 (Next-Gen Update)', status: 'Next-Gen — required for NG builds', color: 'border-blue-700/50 text-blue-300' },
                            { version: 'F4SE 0.7.7+', game: '1.11.x (Creations Update, Nov 2025+)', status: 'Current — required for 1.11.x Creations Menu', color: 'border-emerald-700/50 text-emerald-300' },
                        ].map(row => (
                            <div key={row.version} className={`bg-[#0a0e0a] border rounded-lg p-3 ${row.color}`}>
                                <div className="font-bold">{row.version}</div>
                                <div className="text-slate-400 mt-0.5">Game: {row.game}</div>
                                <div className="text-[10px] mt-1 opacity-80">{row.status}</div>
                            </div>
                        ))}
                    </div>
                    <div className="p-3 bg-amber-900/20 border border-amber-700/40 rounded-lg">
                        <div className="font-bold text-amber-300 mb-1">Address Library</div>
                        <p className="text-slate-400">Always install the matching Address Library build for your F4SE version. For 1.11.x: use the <strong className="text-white">All In One (Anniversary Edition)</strong> build from Nexus #47327.</p>
                    </div>
                    <div className="p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
                        <div className="font-bold text-red-300 mb-1">DLL Plugin Compatibility</div>
                        <p className="text-slate-400">Every F4SE DLL plugin (SKSE-style .dll in Data/F4SE/Plugins/) must be compiled for your exact F4SE version. Mixed versions will crash on startup. Check each mod's Nexus page for a matching update.</p>
                    </div>
                    <div className="text-slate-500 text-[10px]">F4SE download: <span className="text-slate-300 font-mono">f4se.silverlock.org</span></div>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-full bg-[#0b0f0b] text-slate-100 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col gap-3 mb-8">
                    <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Dev — Tools</div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Devtools Hub</h1>
                    <p className="text-sm font-medium text-slate-300 max-w-2xl">
                        Script generation, Papyrus analysis, production-ready snippet library, xEdit reference, and F4SE compatibility guide — all in one place.
                    </p>
                </div>

                <div className="mb-6 rounded-lg border border-emerald-700/30 bg-emerald-900/10 p-4 text-xs font-medium text-slate-300">
                    <div className="font-bold text-slate-200 mb-2">Recommended Flow</div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400">
                        <li><span className="text-slate-200">Template Generator</span> — describe what you need, get a starting script</li>
                        <li><span className="text-slate-200">Snippet Library</span> — find production patterns to extend your script</li>
                        <li><span className="text-slate-200">Script Analyzer</span> — paste your finished .psc and check for issues</li>
                        <li><span className="text-slate-200">xEdit Reference</span> — resolve conflicts and clean your plugin before release</li>
                    </ol>
                </div>

                <div className="space-y-4">
                    {sections.map(section => {
                        const isExpanded = expandedSection === section.id;
                        const Icon = section.icon;
                        return (
                            <div key={section.id} className="border border-slate-800 rounded-lg overflow-hidden bg-black/30">
                                <button
                                    type="button"
                                    onClick={() => toggleSection(section.id)}
                                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-900/50 hover:bg-slate-900/70 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-emerald-300" />
                                        <div>
                                            <div className="text-sm font-black text-white">{section.title}</div>
                                            <div className="text-xs font-medium text-slate-400">{section.description}</div>
                                        </div>
                                    </div>
                                    {isExpanded
                                        ? <ChevronUp className="w-4 h-4 text-emerald-300" />
                                        : <ChevronDown className="w-4 h-4 text-emerald-300" />}
                                </button>
                                {isExpanded && (
                                    <div className="p-4 bg-[#0a0e0a] border-t border-slate-800">
                                        {section.content}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DevtoolsHub;
