import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, Copy, ArrowDownToLine, Sparkles, Code, ChevronDown, ChevronRight } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxyFrom } from './components/useWheelScrollProxy';

interface GeneratedTemplate {
  code: string;
  explanation: string;
  scriptName: string;
  category: string;
  tags: string[];
}

interface TemplatePattern {
  id: string;
  label: string;
  category: string;
  tags: string[];
  keywords: string[];
  weight: number;
  generate: (desc: string) => GeneratedTemplate;
}

type TemplateGeneratorProps = {
  embedded?: boolean;
};

// ── Scoring helper ────────────────────────────────────────────────────────
function scorePattern(pattern: TemplatePattern, desc: string): number {
  const lower = desc.toLowerCase();
  let score = 0;
  for (const kw of pattern.keywords) {
    if (lower.includes(kw)) {
      // longer keywords are more specific — weight them higher
      score += kw.length >= 6 ? 3 : kw.length >= 4 ? 2 : 1;
    }
  }
  return score * pattern.weight;
}

function bestMatch(patterns: TemplatePattern[], desc: string): TemplatePattern {
  let best = patterns[0];
  let bestScore = -1;
  for (const p of patterns) {
    const s = scorePattern(p, desc);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

// ── Template library ──────────────────────────────────────────────────────
const PATTERNS: TemplatePattern[] = [
  // ── Activator / Interact ───────────────────────────────────────────────
  {
    id: 'activator',
    label: 'Activator / Door',
    category: 'Object',
    tags: ['activate', 'door', 'button', 'lever'],
    keywords: ['door', 'activate', 'button', 'lever', 'switch', 'press', 'open', 'interact'],
    weight: 1,
    generate: () => ({
      scriptName: 'ActivatorScript',
      category: 'Object',
      tags: ['activate'],
      explanation:
        'Fires when the player (or any actor) activates this object reference. ' +
        'Ideal for doors, containers, buttons, and levers. ' +
        'The akActionRef parameter is the actor who triggered it.',
      code: `ScriptName ActivatorScript extends ObjectReference

; True = can only be activated once
Bool Property bOneShot = False Auto

Bool bUsed = False

Event OnActivate(ObjectReference akActionRef)
    If akActionRef != Game.GetPlayer()
        Return
    EndIf

    If bOneShot && bUsed
        Debug.Notification("Already activated.")
        Return
    EndIf

    bUsed = True

    Debug.Notification("Activated!")
    ; ── Add your logic here ──────────────────────────
    ; Self.PlayAnimation("Open")
    ; Game.GetPlayer().AddItem(SomeForm, 1)
    ; ─────────────────────────────────────────────────
EndEvent`,
    }),
  },

  // ── Quest ──────────────────────────────────────────────────────────────
  {
    id: 'quest',
    label: 'Quest / Stage Manager',
    category: 'Quest',
    tags: ['quest', 'stage', 'objective'],
    keywords: ['quest', 'stage', 'objective', 'main quest', 'side quest', 'story', 'mission'],
    weight: 1,
    generate: () => ({
      scriptName: 'QuestManagerScript',
      category: 'Quest',
      tags: ['quest', 'stage'],
      explanation:
        'Attach to a Quest record. OnStageSet fires every time the quest stage changes, ' +
        'letting you branch logic by stage number. Use SetObjectiveDisplayed / Completed to ' +
        'manage HUD objectives.',
      code: `ScriptName QuestManagerScript extends Quest

; ── Stage constants (match your CK stages) ───────────────
Int Property STAGE_START     = 10 Auto Const
Int Property STAGE_MID       = 20 Auto Const
Int Property STAGE_COMPLETE  = 100 Auto Const

Event OnInit()
    Debug.Trace(Self + ": Quest initialized")
EndEvent

Event OnStageSet(Int auiStageID, Int auiItemID)
    Debug.Trace(Self + ": Stage " + auiStageID + " set")

    If auiStageID == STAGE_START
        SetObjectiveDisplayed(10)
        Debug.Notification("Quest started!")

    ElseIf auiStageID == STAGE_MID
        SetObjectiveCompleted(10)
        SetObjectiveDisplayed(20)
        Debug.Notification("Halfway there…")

    ElseIf auiStageID == STAGE_COMPLETE
        SetObjectiveCompleted(20)
        CompleteAllObjectives()
        Debug.Notification("Quest complete!")
    EndIf
EndEvent`,
    }),
  },

  // ── Combat ─────────────────────────────────────────────────────────────
  {
    id: 'combat',
    label: 'Combat Responder',
    category: 'Actor',
    tags: ['combat', 'hit', 'fight'],
    keywords: ['combat', 'fight', 'attack', 'enemy', 'hit', 'battle', 'aggress', 'hostile'],
    weight: 1,
    generate: () => ({
      scriptName: 'CombatResponderScript',
      category: 'Actor',
      tags: ['combat', 'hit'],
      explanation:
        'Extends Actor and responds to combat state changes and incoming hits. ' +
        'aeCombatState values: 0 = not in combat, 1 = in combat, 2 = searching. ' +
        'Attach to an NPC or the player alias.',
      code: `ScriptName CombatResponderScript extends Actor

; Called when this actor's combat state changes
Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
        Debug.Notification("Entered combat with " + akTarget.GetDisplayName())
        ; ── enter-combat logic here ──────────────────
        ; Self.EquipItem(CombatWeapon)
        ; Self.EvaluatePackage()
        ; ─────────────────────────────────────────────
    ElseIf aeCombatState == 0
        Debug.Notification("Combat ended")
        ; ── post-combat cleanup here ─────────────────
    ElseIf aeCombatState == 2
        Debug.Notification("Searching for target…")
    EndIf
EndEvent

; Called each time this actor is struck
Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, \
            Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
    If !abHitBlocked
        Debug.Trace(Self + " hit by " + akAggressor.GetDisplayName() + \
                    " with " + akSource.GetName())
        ; ── react to being hit ───────────────────────
    EndIf
EndEvent`,
    }),
  },

  // ── Timer ──────────────────────────────────────────────────────────────
  {
    id: 'timer',
    label: 'Repeating Timer',
    category: 'Object',
    tags: ['timer', 'delay', 'interval'],
    keywords: ['timer', 'delay', 'wait', 'interval', 'every', 'seconds', 'periodic', 'repeat', 'tick'],
    weight: 1,
    generate: () => ({
      scriptName: 'RepeatingTimerScript',
      category: 'Object',
      tags: ['timer'],
      explanation:
        'Fires OnTimer at a configurable interval. Uses two timer IDs so you can ' +
        'run independent timers in the same script. Change UpdateInterval in the CK. ' +
        'Call StopTimer(timerID) to cancel.',
      code: `ScriptName RepeatingTimerScript extends ObjectReference

Float Property UpdateInterval = 5.0 Auto   ; seconds between ticks
Int   Property MaxTicks        = 0   Auto   ; 0 = unlimited

Int TIMER_UPDATE = 1
Int TIMER_DELAY  = 2
Int _tickCount   = 0

Event OnInit()
    Parent.OnInit()
    StartTimer(1.0, TIMER_DELAY) ; brief startup delay
EndEvent

Event OnTimer(Int aiTimerID)
    If aiTimerID == TIMER_DELAY
        ; Startup delay done — begin main loop
        StartTimer(UpdateInterval, TIMER_UPDATE)

    ElseIf aiTimerID == TIMER_UPDATE
        _tickCount += 1
        Debug.Trace("Timer tick #" + _tickCount)

        ; ── Your recurring logic here ─────────────────
        ; Example: spawn actor, play sound, update value
        ; ─────────────────────────────────────────────

        If MaxTicks > 0 && _tickCount >= MaxTicks
            Debug.Trace("Timer finished after " + _tickCount + " ticks")
            Return ; stop repeating
        EndIf

        StartTimer(UpdateInterval, TIMER_UPDATE) ; restart
    EndIf
EndEvent`,
    }),
  },

  // ── Spawner ────────────────────────────────────────────────────────────
  {
    id: 'spawner',
    label: 'Actor Spawner',
    category: 'Object',
    tags: ['spawn', 'actor', 'NPC'],
    keywords: ['spawn', 'create', 'npc', 'actor', 'raider', 'enemy', 'place', 'summon', 'appear'],
    weight: 1,
    generate: () => ({
      scriptName: 'ActorSpawnerScript',
      category: 'Object',
      tags: ['spawn', 'actor'],
      explanation:
        'Spawns a configurable number of actors at this reference. ' +
        'Set ActorToSpawn to an ActorBase and adjust SpawnCount in the CK. ' +
        'Each spawned actor is tracked in the _spawned array.',
      code: `ScriptName ActorSpawnerScript extends ObjectReference

ActorBase Property ActorToSpawn Auto
Int       Property SpawnCount    = 3    Auto
Bool      Property bSpawnOnInit  = True Auto

Actor[] _spawned

Event OnInit()
    Parent.OnInit()
    _spawned = New Actor[0]
    If bSpawnOnInit
        SpawnActors()
    EndIf
EndEvent

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        SpawnActors()
    EndIf
EndEvent

Function SpawnActors()
    Int i = 0
    While i < SpawnCount
        Actor a = Self.PlaceActorAtMe(ActorToSpawn, 4) ; 4 = minimum distance
        If a
            _spawned.Add(a)
            Debug.Trace("Spawned actor " + (i + 1) + ": " + a.GetDisplayName())
        EndIf
        i += 1
    EndWhile
    Debug.Notification("Spawned " + _spawned.Length + " actors")
EndFunction

Function DespawnAll()
    Int i = 0
    While i < _spawned.Length
        If _spawned[i]
            _spawned[i].Disable()
            _spawned[i].Delete()
        EndIf
        i += 1
    EndWhile
    _spawned = New Actor[0]
EndFunction`,
    }),
  },

  // ── Item giver ─────────────────────────────────────────────────────────
  {
    id: 'item',
    label: 'Item Giver',
    category: 'Object',
    tags: ['item', 'inventory', 'loot'],
    keywords: ['item', 'inventory', 'add', 'give', 'receive', 'loot', 'pickup', 'container', 'reward'],
    weight: 1,
    generate: () => ({
      scriptName: 'ItemGiverScript',
      category: 'Object',
      tags: ['item', 'inventory'],
      explanation:
        'Gives items to the player on activation. Supports optional message and ' +
        'self-removal after use. Set ItemToAdd and ItemCount in the CK.',
      code: `ScriptName ItemGiverScript extends ObjectReference

Form Property ItemToAdd   Auto
Int  Property ItemCount   = 1     Auto
Bool Property bRemoveSelf = True  Auto
String Property GiveMessage = "Item received." Auto

Event OnActivate(ObjectReference akActionRef)
    If akActionRef != Game.GetPlayer()
        Return
    EndIf

    Actor player = Game.GetPlayer()
    player.AddItem(ItemToAdd, ItemCount, True) ; True = silent add

    If GiveMessage != ""
        Debug.Notification(GiveMessage)
    EndIf

    If bRemoveSelf
        Self.Disable()
        Self.Delete()
    EndIf
EndEvent`,
    }),
  },

  // ── Teleport ───────────────────────────────────────────────────────────
  {
    id: 'teleport',
    label: 'Teleporter',
    category: 'Object',
    tags: ['teleport', 'travel', 'warp'],
    keywords: ['teleport', 'move', 'travel', 'warp', 'transport', 'fast travel', 'destination', 'portal'],
    weight: 1,
    generate: () => ({
      scriptName: 'TeleporterScript',
      category: 'Object',
      tags: ['teleport'],
      explanation:
        'Moves the player to TeleportDestination on activation. ' +
        'Set TeleportDestination to an XMarker or any reference in the CK. ' +
        'FadeOut/FadeIn creates a smooth transition effect.',
      code: `ScriptName TeleporterScript extends ObjectReference

ObjectReference Property TeleportDestination Auto
String Property ActivateMessage = "Teleporting…" Auto
Float  Property FadeTime        = 0.5 Auto

Event OnActivate(ObjectReference akActionRef)
    If akActionRef != Game.GetPlayer()
        Return
    EndIf

    Actor player = Game.GetPlayer()

    If ActivateMessage != ""
        Debug.Notification(ActivateMessage)
    EndIf

    ; Fade out, move, fade back in
    Game.FadeOutGame(True, True, FadeTime, FadeTime)
    Utility.Wait(FadeTime)
    player.MoveTo(TeleportDestination)
    Utility.Wait(0.1)
    Game.FadeOutGame(False, True, FadeTime, FadeTime)
EndEvent`,
    }),
  },

  // ── Perk ──────────────────────────────────────────────────────────────
  {
    id: 'perk',
    label: 'Perk Entry',
    category: 'Perk',
    tags: ['perk', 'ability', 'stat'],
    keywords: ['perk', 'ability', 'special', 'trait', 'skill', 'rank', 'upgrade', 'power'],
    weight: 1,
    generate: () => ({
      scriptName: 'PerkEntryScript',
      category: 'Perk',
      tags: ['perk'],
      explanation:
        'Runs when the player acquires the perk. Supports multiple ranks via PerkRank. ' +
        'Attach this to a Perk Entry Point in the CK.',
      code: `ScriptName PerkEntryScript extends Perk

; Called when the player gains this perk
Event OnEntryRun(Int auiEntryID, ObjectReference akTarget, Actor akCombatTarget)
    Int rank = Game.GetPlayer().GetPerkRank(Self)
    Debug.Trace("PerkEntry: rank " + rank + " acquired, entry " + auiEntryID)

    If rank == 1
        Debug.Notification("Perk rank 1 acquired!")
        ; Apply rank-1 effect
    ElseIf rank == 2
        Debug.Notification("Perk rank 2 acquired!")
        ; Apply rank-2 effect
    EndIf
EndEvent`,
    }),
  },

  // ── Furniture ─────────────────────────────────────────────────────────
  {
    id: 'furniture',
    label: 'Furniture / Sit',
    category: 'Object',
    tags: ['furniture', 'sit', 'workbench'],
    keywords: ['furniture', 'sit', 'chair', 'bed', 'sleep', 'workbench', 'use furniture', 'rest'],
    weight: 1,
    generate: () => ({
      scriptName: 'FurnitureScript',
      category: 'Object',
      tags: ['furniture'],
      explanation:
        'Extends Furniture. OnFurnitureEnter fires when an actor begins using it; ' +
        'OnFurnitureExit fires when they stand up. Useful for special chairs, ' +
        'ritual altars, power armor stations, etc.',
      code: `ScriptName FurnitureScript extends Furniture

Event OnFurnitureEnter(ObjectReference akActionRef)
    Actor user = akActionRef As Actor
    If user
        Debug.Notification(user.GetDisplayName() + " sat down.")
        ; ── begin-use logic ──────────────────────────
    EndIf
EndEvent

Event OnFurnitureExit(ObjectReference akActionRef)
    Actor user = akActionRef As Actor
    If user
        Debug.Notification(user.GetDisplayName() + " stood up.")
        ; ── end-use logic ────────────────────────────
    EndIf
EndEvent`,
    }),
  },

  // ── Trap / Hazard ─────────────────────────────────────────────────────
  {
    id: 'trap',
    label: 'Trap / Hazard',
    category: 'Object',
    tags: ['trap', 'hazard', 'trigger'],
    keywords: ['trap', 'hazard', 'trigger', 'damage', 'tripwire', 'proximity', 'mine', 'danger'],
    weight: 1,
    generate: () => ({
      scriptName: 'TrapScript',
      category: 'Object',
      tags: ['trap', 'damage'],
      explanation:
        'Proximity-based trap. OnTriggerEnter fires when an actor steps into the ' +
        'collision volume. Deals configurable damage and optionally resets after a delay.',
      code: `ScriptName TrapScript extends ObjectReference

Float Property DamageAmount  = 25.0 Auto
Float Property ResetDelay    = 10.0 Auto
Bool  Property bResetable    = True  Auto
Bool  Property bPlayerOnly   = False Auto

Bool _triggered = False
Int  RESET_TIMER = 1

Event OnTriggerEnter(ObjectReference akActionRef)
    If _triggered
        Return
    EndIf

    Actor victim = akActionRef As Actor
    If !victim
        Return
    EndIf

    If bPlayerOnly && victim != Game.GetPlayer()
        Return
    EndIf

    _triggered = True
    victim.DamageActorValue("Health", DamageAmount)
    Debug.Trace("Trap triggered on " + victim.GetDisplayName())

    ; Play trap animation / sound
    Self.PlayAnimation("TriggerIn")

    If bResetable
        StartTimer(ResetDelay, RESET_TIMER)
    EndIf
EndEvent

Event OnTimer(Int aiTimerID)
    If aiTimerID == RESET_TIMER
        _triggered = False
        Self.PlayAnimation("TriggerOut")
        Debug.Trace("Trap reset")
    EndIf
EndEvent`,
    }),
  },

  // ── Light toggle ──────────────────────────────────────────────────────
  {
    id: 'light',
    label: 'Light Switch / Toggle',
    category: 'Object',
    tags: ['light', 'toggle', 'switch'],
    keywords: ['light', 'lamp', 'toggle', 'switch', 'dark', 'illuminate', 'lantern'],
    weight: 1,
    generate: () => ({
      scriptName: 'LightSwitchScript',
      category: 'Object',
      tags: ['light', 'toggle'],
      explanation:
        'Toggles a linked light reference on/off when activated. ' +
        'Link the light to this object in the CK using a LinkedRef keyword.',
      code: `ScriptName LightSwitchScript extends ObjectReference

ObjectReference Property LinkedLight Auto

Bool _isOn = True

Event OnActivate(ObjectReference akActionRef)
    If akActionRef != Game.GetPlayer()
        Return
    EndIf

    _isOn = !_isOn

    If _isOn
        LinkedLight.Enable()
        Debug.Notification("Light on")
    Else
        LinkedLight.Disable()
        Debug.Notification("Light off")
    EndIf
EndEvent`,
    }),
  },

  // ── Magic Effect ──────────────────────────────────────────────────────
  {
    id: 'magic',
    label: 'Magic Effect',
    category: 'Magic',
    tags: ['magic', 'effect', 'buff'],
    keywords: ['magic', 'effect', 'spell', 'buff', 'debuff', 'enchant', 'ability', 'power', 'boost'],
    weight: 1,
    generate: () => ({
      scriptName: 'MagicEffectScript',
      category: 'Magic',
      tags: ['magic', 'effect'],
      explanation:
        'Attach to a Magic Effect record. OnEffectStart fires when applied; ' +
        'OnEffectFinish fires when it expires. MagnitudeValue and DurationValue ' +
        'come from the effect entry in the spell/enchantment.',
      code: `ScriptName MagicEffectScript extends ActiveMagicEffect

Event OnEffectStart(Actor akTarget, Actor akCaster)
    Debug.Trace("MagicEffect applied to " + akTarget.GetDisplayName())

    ; MagnitudeValue and DurationValue available here
    Float mag = MagnitudeValue
    Float dur = DurationValue

    ; ── Apply your effect ─────────────────────────
    ; akTarget.ModActorValue("SpeedMult", mag)
    ; akTarget.ModActorValue("CarryWeight", mag)
    ; ─────────────────────────────────────────────
EndEvent

Event OnEffectFinish(Actor akTarget, Actor akCaster)
    Debug.Trace("MagicEffect expired on " + akTarget.GetDisplayName())
    ; ── Undo your effect ─────────────────────────
    ; akTarget.ModActorValue("SpeedMult", -MagnitudeValue)
    ; ─────────────────────────────────────────────
EndEvent`,
    }),
  },

  // ── Player Alias ──────────────────────────────────────────────────────
  {
    id: 'alias',
    label: 'Player Alias',
    category: 'Quest / Alias',
    tags: ['alias', 'player', 'quest'],
    keywords: ['alias', 'player alias', 'quest alias', 'player reference', 'track player'],
    weight: 1,
    generate: () => ({
      scriptName: 'PlayerAliasScript',
      category: 'Quest / Alias',
      tags: ['alias', 'player'],
      explanation:
        'Attach to a ReferenceAlias that fills on the player. ' +
        'OnPlayerLoadGame fires on every game load — use it to re-register events. ' +
        'RegisterForSingleUpdate queues the OnUpdate event.',
      code: `ScriptName PlayerAliasScript extends ReferenceAlias

Event OnInit()
    RegisterForSingleUpdate(0.1)
EndEvent

Event OnPlayerLoadGame()
    Debug.Trace("PlayerAlias: game loaded, re-registering events")
    RegisterForSingleUpdate(0.1)
EndEvent

Event OnUpdate()
    Actor player = Game.GetPlayer()
    Debug.Trace("PlayerAlias: update tick on " + player.GetDisplayName())
    ; ── Recurring player checks here ─────────────
    ; If player.GetCurrentHealth() < 10.0
    ;     Debug.Notification("Low health!")
    ; EndIf
    ; ─────────────────────────────────────────────
    RegisterForSingleUpdate(5.0)
EndEvent`,
    }),
  },

  // ── Container / Respawn ───────────────────────────────────────────────
  {
    id: 'container',
    label: 'Container / Respawn',
    category: 'Object',
    tags: ['container', 'loot', 'respawn'],
    keywords: ['container', 'chest', 'refill', 'respawn', 'loot box', 'inventory reset'],
    weight: 1,
    generate: () => ({
      scriptName: 'RespawningContainerScript',
      category: 'Object',
      tags: ['container', 'respawn'],
      explanation:
        'Container that refills itself after a configurable delay once the player loots it. ' +
        'OnItemRemoved detects looting; StartTimer triggers the restock.',
      code: `ScriptName RespawningContainerScript extends ObjectReference

Form  Property RefillItem   Auto
Int   Property RefillCount  = 1    Auto
Float Property RespawnDelay = 86400.0 Auto  ; seconds (86400 = 24 hrs)

Int RESPAWN_TIMER = 1
Bool _looted = False

Event OnItemRemoved(Form akBaseItem, Int aiItemCount, ObjectReference akItemReference, ObjectReference akDestContainer)
    If !_looted
        _looted = True
        StartTimer(RespawnDelay, RESPAWN_TIMER)
        Debug.Trace("Container looted — restocking in " + RespawnDelay + "s")
    EndIf
EndEvent

Event OnTimer(Int aiTimerID)
    If aiTimerID == RESPAWN_TIMER && _looted
        Refill()
    EndIf
EndEvent

Function Refill()
    Self.AddItem(RefillItem, RefillCount)
    _looted = False
    Debug.Trace("Container refilled")
EndFunction`,
    }),
  },

  // ── Sound player ─────────────────────────────────────────────────────
  {
    id: 'sound',
    label: 'Sound Trigger',
    category: 'Audio',
    tags: ['sound', 'audio', 'music'],
    keywords: ['sound', 'audio', 'play sound', 'music', 'noise', 'voice', 'ambient', 'sfx'],
    weight: 1,
    generate: () => ({
      scriptName: 'SoundTriggerScript',
      category: 'Audio',
      tags: ['sound'],
      explanation:
        'Plays a sound when activated. Supports a 3D positional sound via ' +
        'PlaySound3D at the reference location.',
      code: `ScriptName SoundTriggerScript extends ObjectReference

Sound Property SoundToPlay Auto
Bool  Property b3DSound    = True  Auto
Bool  Property bOneShot    = True  Auto

Bool _played = False

Event OnActivate(ObjectReference akActionRef)
    If bOneShot && _played
        Return
    EndIf
    _played = True

    If b3DSound
        Self.PlaySound3D(SoundToPlay.GetEditorID())
    Else
        SoundToPlay.Play(Self)
    EndIf
EndEvent`,
    }),
  },

  // ── Holotape / Terminal ───────────────────────────────────────────────
  {
    id: 'holotape',
    label: 'Holotape / Terminal',
    category: 'Interface',
    tags: ['holotape', 'terminal', 'game'],
    keywords: ['holotape', 'terminal', 'pipboy', 'pip-boy', 'game', 'minigame', 'interface'],
    weight: 1,
    generate: () => ({
      scriptName: 'HolotapeScript',
      category: 'Interface',
      tags: ['holotape', 'terminal'],
      explanation:
        'Attach to a Terminal or Holotape Minigame form. OnMenuOpenCloseEvent ' +
        'fires when the Pip-Boy is opened or closed. GetCurrentHolotapeGame ' +
        'identifies which game is active.',
      code: `ScriptName HolotapeScript extends ObjectReference

Quest Property MyQuest Auto

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        ; Advance the quest when the holotape is played
        If MyQuest && !MyQuest.IsCompleted()
            MyQuest.SetCurrentStageID(10)
            Debug.Notification("Holotape played — quest updated")
        EndIf
    EndIf
EndEvent`,
    }),
  },

  // ── Scene / Dialogue ──────────────────────────────────────────────────
  {
    id: 'scene',
    label: 'Scene / Dialogue',
    category: 'Quest',
    tags: ['scene', 'dialogue', 'cutscene'],
    keywords: ['scene', 'dialogue', 'cutscene', 'conversation', 'speak', 'talk', 'npc conversation'],
    weight: 1,
    generate: () => ({
      scriptName: 'SceneControllerScript',
      category: 'Quest',
      tags: ['scene', 'dialogue'],
      explanation:
        'Attach to a Scene record or a Quest script. OnSceneStart/OnSceneEnd ' +
        'fire when a scene begins/ends. Call Start() on the scene reference to trigger it.',
      code: `ScriptName SceneControllerScript extends Quest

Scene Property MyScene Auto

Event OnInit()
    Debug.Trace("SceneController: ready")
EndEvent

Event OnStageSet(Int auiStageID, Int auiItemID)
    If auiStageID == 10
        ; Trigger scene when quest reaches stage 10
        If MyScene && !MyScene.IsPlaying()
            MyScene.Start()
            Debug.Trace("Scene started")
        EndIf
    EndIf
EndEvent

; Attach this to the Scene record itself (not the Quest) to get these events:
; Event OnSceneStart() ... EndEvent
; Event OnSceneEnd(Bool abInterrupted) ... EndEvent`,
    }),
  },

  // ── Companion / Follower ──────────────────────────────────────────────
  {
    id: 'companion',
    label: 'Companion / Follower',
    category: 'Actor',
    tags: ['companion', 'follower', 'NPC'],
    keywords: ['companion', 'follower', 'recruit', 'dismiss', 'follow', 'npc', 'ally', 'partner'],
    weight: 1.2,
    generate: () => ({
      scriptName: 'CompanionScript',
      category: 'Actor',
      tags: ['companion', 'follower'],
      explanation:
        'Basic companion/follower script. Tracks follow state and handles ' +
        'recruit/dismiss via dialogue topic conditions. Extend with combat/sandbox packages.',
      code: `ScriptName CompanionScript extends Actor

Bool Property bIsFollowing = False Auto

Function Recruit()
    If bIsFollowing
        Debug.Notification(Self.GetDisplayName() + " is already following you.")
        Return
    EndIf

    bIsFollowing = True
    ; Evaluate follow package
    Self.EvaluatePackage()
    Debug.Notification(Self.GetDisplayName() + " will follow you.")
EndFunction

Function Dismiss()
    If !bIsFollowing
        Return
    EndIf

    bIsFollowing = False
    Self.EvaluatePackage()
    Debug.Notification(Self.GetDisplayName() + " stays behind.")
EndFunction

Function IsFollowing() Bool
    Return bIsFollowing
EndFunction`,
    }),
  },

  // ── Generic fallback ──────────────────────────────────────────────────
  {
    id: 'generic',
    label: 'General Purpose',
    category: 'Object',
    tags: ['general'],
    keywords: [],
    weight: 0,
    generate: (desc) => ({
      scriptName: 'CustomScript',
      category: 'Object',
      tags: ['general'],
      explanation:
        'General-purpose ObjectReference script. ' +
        'OnInit fires on first load, OnActivate fires when an actor uses it.',
      code: `ScriptName CustomScript extends ObjectReference

; ── Properties (set in Creation Kit) ─────────────────────
; Bool   Property bEnabled = True Auto
; Float  Property SomeValue = 1.0  Auto
; Form   Property SomeItem  Auto
; ─────────────────────────────────────────────────────────

Event OnInit()
    Parent.OnInit()
    Debug.Trace("CustomScript: initialized on " + Self)
EndEvent

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("Activated!")
    EndIf
EndEvent

Function DoSomething()
    Debug.Trace("CustomScript: DoSomething called")
EndFunction`,
    }),
  },
];

// ── Category grouping for the sidebar ────────────────────────────────────
const CATEGORIES = [
  { label: 'Object',    patterns: PATTERNS.filter(p => p.category === 'Object') },
  { label: 'Actor',     patterns: PATTERNS.filter(p => p.category === 'Actor') },
  { label: 'Quest',     patterns: PATTERNS.filter(p => p.category === 'Quest' || p.category === 'Quest / Alias') },
  { label: 'Magic',     patterns: PATTERNS.filter(p => p.category === 'Magic') },
  { label: 'Audio',     patterns: PATTERNS.filter(p => p.category === 'Audio') },
  { label: 'Interface', patterns: PATTERNS.filter(p => p.category === 'Interface') },
  { label: 'Perk',      patterns: PATTERNS.filter(p => p.category === 'Perk') },
].filter(c => c.patterns.length > 0);

const EXAMPLE_PROMPTS = [
  'A door that spawns 3 raiders when opened',
  'Quest with multiple stages and HUD objectives',
  'Proximity trap that damages nearby enemies',
  'Timer that heals the player every 5 seconds',
  'Companion NPC with recruit and dismiss logic',
  'Light switch that toggles a linked lamp',
  'Container that refills itself after 24 hours',
  'Holotape that advances a quest when played',
  'Scene that triggers when the player enters a cell',
  'Magic effect that boosts speed for 10 seconds',
  'Teleporter that fades the screen and warps the player',
  'Spawner that creates 5 robots on activation',
];

// ── Mossy AI system prompt ────────────────────────────────────────────────
const AI_SYSTEM_PROMPT = `You are Mossy, an expert Fallout 4 modding assistant specializing in Papyrus scripting.
Generate a complete, working Papyrus script based on the user's description.

Rules:
- Output ONLY a JSON object — no markdown fences, no explanation outside JSON.
- JSON shape: { "scriptName": "...", "code": "...", "explanation": "...", "category": "Object|Actor|Quest|Magic|Audio|Interface|Perk", "tags": ["tag1","tag2"] }
- scriptName: PascalCase, no spaces, ends with "Script"
- code: Complete valid Papyrus (.psc) source — ScriptName line, properties, events, functions
- explanation: 1-2 sentences describing what the script does and how to set it up
- tags: 2-4 lowercase keywords
- Use Fallout 4 Papyrus API only (not Skyrim). Common base types: ObjectReference, Actor, Quest, ActiveMagicEffect, Perk.
- Always include ScriptName <Name> extends <BaseType> as the first line.
- Comments start with ; in Papyrus. Use Auto keyword for simple properties.`;

export const TemplateGenerator: React.FC<TemplateGeneratorProps> = ({ embedded = false }) => {
  const [description, setDescription]   = useState('');
  const [generating, setGenerating]     = useState(false);
  const [generated, setGenerated]       = useState<GeneratedTemplate | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ Object: true });
  const [copied, setCopied]             = useState(false);
  const [aiUsed, setAiUsed]             = useState(false);
  const [aiError, setAiError]           = useState('');

  const descriptionRef  = useRef<HTMLTextAreaElement | null>(null);
  const examplesRef     = useRef<HTMLDivElement | null>(null);
  const outputRef       = useRef<HTMLDivElement | null>(null);
  const outputScrollRef = useRef<HTMLDivElement | null>(null);

  const wheelProxy = useWheelScrollProxyFrom(() =>
    generated ? outputScrollRef.current : examplesRef.current
  );

  const generateTemplate = async () => {
    const desc = description.trim();
    if (!desc) return;
    setGenerating(true);
    setAiUsed(false);
    setAiError('');

    // ── Try Mossy AI (Groq) first ──────────────────────────────────────────
    const api = (window as any).electronAPI;
    if (typeof api?.aiChatGroq === 'function') {
      try {
        const result = await api.aiChatGroq(
          `Generate a Papyrus script for: ${desc}`,
          AI_SYSTEM_PROMPT,
          'qwen/qwen3.6-27b',
        );
        if (result?.success && result.content) {
          const raw = String(result.content)
            .replace(/^```[\w]*\n?/m, '')
            .replace(/\n?```$/m, '')
            .trim();
          const parsed = JSON.parse(raw) as GeneratedTemplate;
          if (parsed.code && parsed.scriptName) {
            setGenerated({
              scriptName:  String(parsed.scriptName  || 'CustomScript'),
              code:        String(parsed.code        || ''),
              explanation: String(parsed.explanation || ''),
              category:    String(parsed.category    || 'Object'),
              tags:        Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
            });
            setAiUsed(true);
            setGenerating(false);
            return;
          }
        }
        if (result && !result.success) {
          setAiError(`AI unavailable (${result.error || 'no response'}) — using local fallback.`);
        }
      } catch (e: any) {
        setAiError('AI parse error — using local fallback.');
        console.warn('[TemplateGenerator] AI error:', e?.message || e);
      }
    }

    // ── Local keyword-scoring fallback ────────────────────────────────────
    await new Promise(res => setTimeout(res, 400));
    const pattern = bestMatch(PATTERNS, desc);
    setGenerated(pattern.generate(desc));
    setGenerating(false);
  };

  const selectPattern = (pattern: TemplatePattern) => {
    setAiUsed(false);
    setAiError('');
    setGenerated(pattern.generate(''));
  };

  const copyToClipboard = () => {
    if (generated) {
      navigator.clipboard.writeText(generated.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadScript = () => {
    if (generated) {
      const blob = new Blob([generated.code], { type: 'text/plain' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `${generated.scriptName}.psc`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleCat = (label: string) =>
    setExpandedCats(prev => ({ ...prev, [label]: !prev[label] }));

  const containerClass = embedded
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col min-h-0'
    : 'h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col min-h-0';
  const headerClass = embedded ? 'p-4 border-b border-slate-700 bg-slate-800/50' : 'p-6 border-b border-slate-700 bg-slate-800/50';
  const bodyClass   = embedded ? 'flex-1 min-h-0 overflow-hidden flex gap-4 p-4' : 'flex-1 min-h-0 overflow-hidden flex gap-4 p-6';

  return (
    <div className={containerClass} onWheel={wheelProxy}>
      {/* Header */}
      <div className={headerClass}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Papyrus Template Generator</h1>
              <p className="text-sm text-slate-400">Describe what you want — Mossy AI writes working Papyrus code</p>
            </div>
          </div>
          {!embedded && (
            <Link
              to="/reference"
              className="px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-900/30 border border-emerald-500/30 text-emerald-100 hover:bg-emerald-900/40 transition-colors"
            >
              Help
            </Link>
          )}
        </div>

        {/* Input row */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={descriptionRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) void generateTemplate(); }}
              placeholder="Describe your script… e.g. 'A trap that damages the player and resets after 10 seconds'"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-emerald-500 transition-colors"
              rows={3}
            />
            <div className="absolute bottom-2 right-3 text-[10px] text-slate-600">Ctrl+Enter to generate</div>
          </div>
          <button
            onClick={() => void generateTemplate()}
            disabled={generating || !description.trim()}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors flex flex-col items-center gap-1 min-w-[96px]"
          >
            {generating ? (
              <>
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span className="text-xs">Thinking…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tool verify panel */}
      <div className={embedded ? 'px-4 pt-3' : 'px-6 pt-4'}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ToolsInstallVerifyPanel
            accentClassName="text-emerald-300"
            description="Uses Mossy AI (Groq) to generate custom Papyrus scripts from plain English. Falls back to 17 built-in templates when AI is unavailable."
            verify={[
              'Type a description and click Generate — AI result shows a ✦ AI badge.',
              'Pick any template from the left sidebar for instant local generation.',
              'Copy or Download the .psc file, then compile it in the CK or with Caprica.',
            ]}
            firstTestLoop={[
              'Generate an Activator script → copy into Data\\Scripts\\Source.',
              'Confirm CK / compiler path is set in External Tools Settings.',
            ]}
            troubleshooting={[
              'No AI badge? Groq API key may not be set — check Mossy Settings.',
              'If Generate does nothing, ensure the description field is not empty.',
              'If download is blocked, allow pop-ups / downloads in your environment.',
            ]}
          />
        </div>
      </div>

      {/* Body */}
      <div className={bodyClass}>
        {/* Left sidebar */}
        <div ref={examplesRef} className="w-72 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
          {/* Category browser */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-700 flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Templates ({PATTERNS.length - 1})</span>
            </div>
            {CATEGORIES.map(cat => (
              <div key={cat.label}>
                <button
                  onClick={() => toggleCat(cat.label)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/40 transition-colors"
                >
                  <span className="uppercase tracking-wide">{cat.label}</span>
                  {expandedCats[cat.label]
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />
                  }
                </button>
                {expandedCats[cat.label] && (
                  <div className="border-t border-slate-700/50">
                    {cat.patterns
                      .filter(p => p.id !== 'generic')
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => selectPattern(p)}
                          className={`w-full text-left px-5 py-1.5 text-xs transition-colors ${
                            generated?.scriptName === p.generate('').scriptName
                              ? 'bg-emerald-900/30 text-emerald-300'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Example prompts */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3">
            <h3 className="font-bold text-white text-xs uppercase tracking-wide mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Example Prompts
            </h3>
            <div className="space-y-1.5">
              {EXAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(prompt)}
                  className="w-full text-left text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
            <h4 className="font-bold text-blue-300 mb-1 text-xs">How generation works</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mossy AI (Groq) generates custom scripts from your description when online.
              If AI is unavailable, keywords are scored against{' '}
              <span className="text-white">{PATTERNS.length - 1} local patterns</span> as fallback.
              AI results are marked with a{' '}
              <span className="text-violet-300 font-bold">✦ AI</span> badge.
            </p>
          </div>
        </div>

        {/* Right: generated code */}
        <div ref={outputRef} className="flex-1 min-h-0 flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          {!generated && !generating && (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Code className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Describe your script or pick a template from the left</p>
                <p className="text-xs mt-2 text-slate-600">Ctrl+Enter to generate • Mossy AI enabled</p>
              </div>
            </div>
          )}

          {generated && (
            <>
              {/* AI fallback notice */}
              {aiError && (
                <div className="px-4 py-2 bg-amber-900/20 border-b border-amber-500/30 text-xs text-amber-400">
                  ⚠ {aiError}
                </div>
              )}

              {/* Code header */}
              <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center gap-3">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Code className="w-4 h-4 text-emerald-400" />
                    {generated.scriptName}.psc
                    {aiUsed && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-700/50 border border-violet-500/40 text-violet-300 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    )}
                  </h3>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{generated.category}</span>
                    {generated.tags.map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={copyToClipboard}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs transition-colors ${
                      copied ? 'bg-emerald-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadScript}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    .psc
                  </button>
                </div>
              </div>

              {/* Explanation */}
              <div className="p-4 bg-emerald-900/10 border-b border-emerald-500/20">
                <h4 className="text-xs font-bold text-emerald-400 uppercase mb-1">What this does</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{generated.explanation}</p>
              </div>

              {/* Code block */}
              <div ref={outputScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
                <pre className="p-4 text-sm font-mono text-slate-200 whitespace-pre leading-relaxed">
                  {generated.code}
                </pre>
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-slate-700 bg-slate-800/30">
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-slate-400">Next steps:</span>{' '}
                  Copy to <code className="text-slate-300">Data\Scripts\Source\{generated.scriptName}.psc</code>,
                  compile in Creation Kit or with Caprica, then attach to your object in the CK.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateGenerator;
