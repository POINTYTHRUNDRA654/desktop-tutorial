import{r as o,j as e,F as g,D as m,v as p}from"./index-CEqdjNqX.js";import{C as v}from"./copy-D3A4jLxT.js";import{D as w}from"./download-BCBaShzR.js";const S=()=>{const[i,c]=o.useState(""),[l,d]=o.useState(!1),[n,h]=o.useState(null),u=async()=>{i.trim()&&(d(!0),setTimeout(()=>{const t=i.toLowerCase();let r="",s="",a="GeneratedScript";t.includes("door")||t.includes("activate")?(a="ActivatorScript",r=`ScriptName ${a} extends ObjectReference

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("You activated this object!")
        ; Add your custom logic here
    EndIf
EndEvent`,s="This script responds when the player activates an object. Place it on doors, containers, or any activatable object. The OnActivate event fires whenever someone or something activates the reference."):t.includes("quest")||t.includes("stage")?(a="QuestScript",r=`ScriptName ${a} extends Quest

Event OnInit()
    Parent.OnInit()
    Debug.Trace("${a}: Quest initialized")
EndEvent

Function SetStage(Int aiStage)
    Self.SetStage(aiStage)
    Debug.Notification("Quest stage set to " + aiStage)
EndFunction`,s="Quest script template. Extends Quest and can manage quest stages, objectives, and quest-related logic. Use SetStage() to progress the quest."):t.includes("perk")||t.includes("player enter")?(a="PerkScript",r=`ScriptName ${a} extends Perk

Event OnPerkEntry()
    Debug.Notification("Perk acquired!")
    ; Perk logic here
EndEvent`,s="Perk script that fires when the player acquires the perk. Use this to grant abilities, modify stats, or trigger effects when the perk is earned."):t.includes("combat")||t.includes("fight")||t.includes("attack")?(a="CombatScript",r=`ScriptName ${a} extends Actor

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
EndEvent`,s="Combat script that responds to combat state changes and hits. OnCombatStateChanged fires when entering/leaving combat (state 1 = combat, 0 = not in combat). OnHit fires whenever this actor is struck."):t.includes("timer")||t.includes("delay")||t.includes("wait")?(a="TimerScript",r=`ScriptName ${a} extends ObjectReference

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
EndEvent`,s="Timer-based script that executes logic at regular intervals. Useful for periodic checks, spawning, or any repeated action. StartTimer() begins the countdown, OnTimer() fires when complete."):t.includes("spawn")||t.includes("create")||t.includes("npc")?(a="SpawnerScript",r=`ScriptName ${a} extends ObjectReference

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
EndFunction`,s="Spawner script that creates multiple actors at the reference location. Set ActorToSpawn property to the ActorBase you want to spawn. SpawnCount controls how many are created."):t.includes("item")||t.includes("inventory")||t.includes("add")?(a="ItemScript",r=`ScriptName ${a} extends ObjectReference

Form Property ItemToAdd Auto
Int Property ItemCount = 1 Auto

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Game.GetPlayer().AddItem(ItemToAdd, ItemCount)
        Debug.Notification("Received " + ItemCount + " " + ItemToAdd.GetName())
        Self.Disable()
        Self.Delete()
    EndIf
EndEvent`,s="Item giver script. When activated by the player, adds items to their inventory then removes itself. Set ItemToAdd property to the item Form and ItemCount for quantity."):t.includes("teleport")||t.includes("move")||t.includes("travel")?(a="TeleportScript",r=`ScriptName ${a} extends ObjectReference

ObjectReference Property TeleportDestination Auto

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Game.GetPlayer().MoveTo(TeleportDestination)
        Debug.Notification("Teleported!")
    EndIf
EndEvent`,s="Teleport script that moves the player to a destination marker. Set TeleportDestination property to an XMarker or other reference where the player should appear."):(a="CustomScript",r=`ScriptName ${a} extends ObjectReference

; Properties - set these in the Creation Kit
; Type Property PropertyName Auto

Event OnInit()
    Parent.OnInit()
    Debug.Trace("${a} initialized")
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
EndFunction`,s="Generic Papyrus script template with common events. OnInit fires when the script starts, OnActivate fires when someone activates the object. Add properties and custom functions as needed."),h({code:r,explanation:s,scriptName:a}),d(!1)},1200))},b=()=>{n&&navigator.clipboard.writeText(n.code)},x=()=>{if(n){const t=new Blob([n.code],{type:"text/plain"}),r=URL.createObjectURL(t),s=document.createElement("a");s.href=r,s.download=`${n.scriptName}.psc`,s.click(),URL.revokeObjectURL(r)}},f=["Create a script that activates when player enters and spawns 3 raiders","Make a door that teleports the player to another location","Script that adds items to player inventory when activated","Combat script that tracks when NPC enters and exits combat","Timer that runs every 5 seconds and checks a condition","Quest script with stages and objectives"];return e.jsxs("div",{className:"h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col",children:[e.jsxs("div",{className:"p-6 border-b border-slate-700 bg-slate-800/50",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-4",children:[e.jsx(g,{className:"w-8 h-8 text-emerald-400"}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-white",children:"Papyrus Template Generator"}),e.jsx("p",{className:"text-sm text-slate-400",children:"Describe what you want - get working Papyrus code"})]})]}),e.jsxs("div",{className:"space-y-3",children:[e.jsx("textarea",{value:i,onChange:t=>c(t.target.value),placeholder:"Describe what your script should do... (e.g., 'Create a door that spawns enemies when opened')",className:"w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none resize-none"}),e.jsx("button",{onClick:u,disabled:!i.trim()||l,className:"w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors",children:l?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"}),"Generating Script..."]}):e.jsxs(e.Fragment,{children:[e.jsx(m,{className:"w-5 h-5"}),"Generate Papyrus Script"]})})]})]}),e.jsxs("div",{className:"flex-1 overflow-hidden flex gap-4 p-6",children:[e.jsxs("div",{className:"w-80 flex flex-col gap-4",children:[e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-xl p-4",children:[e.jsxs("h3",{className:"font-bold text-white mb-3 flex items-center gap-2",children:[e.jsx(m,{className:"w-4 h-4 text-emerald-400"}),"Example Prompts"]}),e.jsx("div",{className:"space-y-2",children:f.map((t,r)=>e.jsxs("button",{onClick:()=>c(t),className:"w-full text-left text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 p-3 rounded-lg transition-colors",children:['"',t,'"']},r))})]}),e.jsxs("div",{className:"bg-blue-900/20 border border-blue-500/30 rounded-xl p-4",children:[e.jsx("h4",{className:"font-bold text-blue-300 mb-2 text-sm",children:"How it works"}),e.jsx("p",{className:"text-xs text-slate-400",children:'The generator analyzes your description and creates Papyrus code using common patterns. It detects keywords like "activate", "spawn", "combat", "timer" to choose the right template.'})]})]}),e.jsxs("div",{className:"flex-1 flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden",children:[!n&&e.jsx("div",{className:"flex-1 flex items-center justify-center text-slate-500",children:e.jsxs("div",{className:"text-center",children:[e.jsx(p,{className:"w-16 h-16 mx-auto mb-4 opacity-20"}),e.jsx("p",{children:"Describe your script and click Generate"}),e.jsx("p",{className:"text-xs mt-2",children:"Try an example prompt from the left"})]})}),n&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center",children:[e.jsxs("h3",{className:"font-bold text-white flex items-center gap-2",children:[e.jsx(p,{className:"w-4 h-4"}),n.scriptName,".psc"]}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:b,className:"px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-2 text-sm transition-colors",children:[e.jsx(v,{className:"w-4 h-4"}),"Copy"]}),e.jsxs("button",{onClick:x,className:"px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-2 text-sm transition-colors",children:[e.jsx(w,{className:"w-4 h-4"}),"Download"]})]})]}),e.jsxs("div",{className:"p-4 bg-emerald-900/10 border-b border-emerald-500/20",children:[e.jsx("h4",{className:"text-xs font-bold text-emerald-400 uppercase mb-2",children:"Explanation"}),e.jsx("p",{className:"text-sm text-slate-300",children:n.explanation})]}),e.jsx("div",{className:"flex-1 overflow-y-auto",children:e.jsx("pre",{className:"p-4 text-sm font-mono text-slate-200 whitespace-pre-wrap",children:n.code})}),e.jsx("div",{className:"p-4 border-t border-slate-700 bg-slate-800/30",children:e.jsxs("p",{className:"text-xs text-slate-500",children:[e.jsx("span",{className:"font-bold text-slate-400",children:"Next steps:"})," Copy this script to your Data\\Scripts\\Source folder, compile it in the Creation Kit, then attach it to an object. Remember to set any required Properties in the CK."]})})]})]})]})]})};export{S as TemplateGenerator};
