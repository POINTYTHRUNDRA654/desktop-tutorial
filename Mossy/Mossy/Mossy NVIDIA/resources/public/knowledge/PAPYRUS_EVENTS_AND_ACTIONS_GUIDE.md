# Papyrus Events and Actions Guide

## Overview

Papyrus provides a comprehensive event system and action functions for responding to game state changes and performing scripted actions. This guide covers 200+ events and action functions organized by purpose.

**Total Functions Covered**: 1,358+ (partial listing of major categories)
**Event Categories**: 100+ event handlers
**Action Categories**: 150+ action/utility functions

---

## Event System (On* Functions)

Events allow scripts to respond to game events. Scripts register for events they care about and implement event handler functions.

### Basic Event Pattern

```papyrus
; Register for event in OnInit or startup
Event OnInit()
  RegisterForRemoteEvent(akTarget, "OnDeath")
EndEvent

; Handle event when triggered
Event OnDeath(Actor akDeadActor)
  Debug.Trace(akDeadActor.GetName() + " died")
EndEvent
```

### Core Lifecycle Events

**Initialization & Shutdown**
- `OnInit - ScriptObject`: Script initialization (called once when script attaches)
- `OnBeginState - ScriptObject`: State entry event
- `OnEndState - ScriptObject`: State exit event
- `OnAliasInit - Alias`: Alias initialization
- `OnAliasReset - Alias`: Alias reset during quest
- `OnAliasShutdown - Alias`: Alias cleanup
- `OnQuestInit - Quest`: Quest initialization
- `OnQuestShutdown - Quest`: Quest cleanup

**Load/Unload Events**
- `OnLoad - ObjectReference`: Object loaded into memory
- `OnUnload - ObjectReference`: Object unloaded from memory
- `OnCellLoad - ObjectReference`: Object's cell loaded
- `OnCellDetach - ObjectReference`: Object's cell unloading
- `OnLocationLoaded - Location`: Location loaded
- `OnLocationCleared - Location`: Location cleared state

### Actor Events

**Combat & Damage**
- `OnCombatStateChanged - Actor`: Combat start/end
- `OnHit - ScriptObject`: Damage taken event
- `OnDying - Actor`: Actor about to die
- `OnDeath - Actor`: Actor died
- `OnDeferredKill - Actor`: Deferred death handling
- `OnKill - Actor`: This actor killed another
- `OnEnterBleedout - Actor`: Bleedout state entered
- `OnCripple - Actor`: Limb crippled
- `OnPartialCripple - Actor`: Partial cripple state

**State Changes**
- `OnAlarmed - Actor`: Alarmed state
- `OnAlerted - Actor`: Alert state triggered
- `OnConsciousnessStateChanged - Actor`: Consciousness change
- `OnEnterSneaking - Actor`: Sneaking started
- `OnGetUp - Actor`: Standing from prone
- `OnLocationChange - Actor`: Location changed
- `OnRaceSwitchComplete - Actor`: Race change complete
- `OnDifficultyChanged - Actor`: Difficulty level changed

**Command & Control**
- `OnCommandModeEnter - Actor`: Command mode started
- `OnCommandModeExit - Actor`: Command mode ended
- `OnCommandModeGiveCommand - Actor`: Command issued
- `OnCommandModeCompleteCommand - Actor`: Command completed
- `OnCompanionDismiss - Actor`: Follower dismissed
- `OnSpeechChallengeAvailable - Actor`: Speech challenge available

**Animations & Actions**
- `OnAnimationEvent - ScriptObject`: Animation event triggered
- `OnAnimationEventUnregistered - ScriptObject`: Animation deregistration
- `OnPlayIdle - Actor`: Idle animation playing
- `OnFurnitureEvent - ScriptObject`: Furniture interaction
- `OnExitFurniture - ObjectReference`: Left furniture
- `OnSit - Actor`: Sat on furniture
- `OnGrab - ObjectReference`: Grabbed object
- `OnRelease - ObjectReference`: Released object
- `OnSittingRotation - Game`: Sitting rotation

**Dialogue & Speech**
- `OnPlayerDialogueTarget - ObjectReference`: Player targets in dialogue
- `OnDialogueTarget - Actor`: Dialogue target set
- `OnPickpocketFailed - Actor`: Pickpocket detection
- `OnSpeechChallengeAvailable - Actor`: Speech challenge available
- `OnPlayerCreateRobot - Actor`: Robot created

**Faction & Relations**
- `OnCrimeFaction - Actor`: Crime faction related
- `OnTrespassAlarm - Actor`: Trespassing detected

**Health & Resources**
- `OnRadiationDamage - ScriptObject`: Radiation damage taken

### Object Reference Events

**Activation & Interaction**
- `OnActivate - ObjectReference`: Object activated
- `OnOpen - ObjectReference`: Container/door opened
- `OnClose - ObjectReference`: Container/door closed
- `OnRead - ObjectReference`: Book/item read
- `OnEquipped - ObjectReference`: Item equipped
- `OnUnequipped - ObjectReference`: Item unequipped
- `OnItemAdded - ObjectReference`: Item added to container
- `OnItemRemoved - ObjectReference`: Item removed from container
- `OnContainerChanged - ObjectReference`: Container contents changed
- `OnTriggerEnter - ObjectReference`: Trigger entered
- `OnTriggerLeave - ObjectReference`: Trigger exited
- `OnLockStateChanged - ObjectReference`: Lock toggled
- `OnDestructionStageChanged - ObjectReference`: Destruction state
- `OnTrapHitStart - ObjectReference`: Trap triggered
- `OnTrapHitStop - ObjectReference`: Trap hit ended
- `OnReset - ObjectReference`: Object reset to default

**Power & Resources**
- `OnPowerOn - ObjectReference`: Power activated
- `OnPowerOff - ObjectReference`: Power deactivated
- `OnWorkshopMode - ObjectReference`: Workshop mode toggled
- `OnWorkshopObjectPlaced - ObjectReference`: Object placed in workshop
- `OnWorkshopObjectGrabbed - ObjectReference`: Object grabbed
- `OnWorkshopObjectMoved - ObjectReference`: Object moved
- `OnWorkshopObjectDestroyed - ObjectReference`: Object destroyed
- `OnWorkshopObjectRepaired - ObjectReference`: Object repaired
- `OnWorkshopNPCTransfer - ObjectReference`: NPC transferred

**Misc Events**
- `OnSell - ObjectReference`: Item sold
- `OnSpellCast - ObjectReference`: Spell cast
- `OnHolotapePlay - ObjectReference`: Holotape started
- `OnHolotapeChatter - ObjectReference`: Holotape dialog
- `OnPipboyRadioDetection - ObjectReference`: Radio signal detected
- `OnTranslationComplete - ObjectReference`: Translation finished
- `OnTranslationAlmostComplete - ObjectReference`: Translation nearly done
- `OnTranslationFailed - ObjectReference`: Translation failed

### Magic & Effect Events

**Magic Application**
- `OnEffectStart - ActiveMagicEffect`: Spell/potion applied
- `OnEffectFinish - ActiveMagicEffect`: Effect ended
- `OnMagicEffectApply - ScriptObject`: Magic effect applied
- `OnItemEquipped - Actor`: Item equipped (equipment events)
- `OnItemUnequipped - Actor`: Item unequipped

### Input & Control Events

**Keyboard/Control**
- `OnControlDown - ScriptObject`: Control pressed
- `OnControlUp - ScriptObject`: Control released
- `OnKeyDown - ScriptObject`: Key pressed
- `OnKeyUp - ScriptObject`: Key released

**Camera & View**
- `OnPlayerCameraState - ScriptObject`: Camera mode changed
- `OnLooksMenuEvent - ScriptObject`: Character creation menu

### Quest & Scene Events

**Quest Events**
- `OnStageSet - Quest`: Quest stage advanced
- `OnQuestInit - Quest`: Quest started
- `OnQuestShutdown - Quest`: Quest ended
- `OnStoryIncreaseLevel - Quest`: Level up triggered

**Scene Events**
- `OnBegin - Scene`: Scene started
- `OnEnd - Scene`: Scene finished
- `OnAction - Scene`: Scene action triggered
- `OnPhaseBegin - Scene`: Scene phase started
- `OnPhaseEnd - Scene`: Scene phase ended

**Dialogue Events**
- `OnBegin - TopicInfo`: Dialogue line starting
- `OnEnd - TopicInfo`: Dialogue line ending

### Package Events

**Package Management**
- `OnStart - Package`: Package started
- `OnEnd - Package`: Package ended
- `OnChange - Package`: Package changed
- `OnPackageStart - Actor`: Actor started package
- `OnPackageEnd - Actor`: Actor finished package
- `OnPackageChange - Actor`: Actor changed package

### Player-Specific Events

**Player Actions**
- `OnPlayerFireWeapon - Actor`: Player fired weapon
- `OnPlayerSwimming - Actor`: Player swimming
- `OnPlayerFallLongDistance - Actor`: Player long fall
- `OnPlayerModArmorWeapon - Actor`: Player crafted item
- `OnPlayerModRobot - Actor`: Robot modified
- `OnPlayerLoadGame - Actor`: Game loaded
- `OnPlayerUseWorkBench - Actor`: Workbench used
- `OnPlayerHealTeammate - Actor`: Teammate healed
- `OnPlayerCreateRobot - Actor`: Robot created
- `OnPlayerEnterVertibird - Actor`: Vertibird entered
- `OnPlayerTeleport - ScriptObject`: Player teleported
- `OnPlayerSleepStart - ScriptObject`: Sleep started
- `OnPlayerSleepStop - ScriptObject`: Sleep ended
- `OnPlayerWaitStart - ScriptObject`: Wait started
- `OnPlayerWaitStop - ScriptObject`: Wait stopped

### Tutorial & UI Events

**Special Events**
- `OnTutorialEvent - ScriptObject`: Tutorial triggered
- `OnTrackedStatsEvent - ScriptObject`: Stat tracked
- `OnMenuItemRun - Terminal`: Terminal menu selected
- `OnMenuOpenCloseEvent - ScriptObject`: Menu opened/closed

### Distance Events

**Proximity Detection**
- `OnDistanceLessThan - ScriptObject`: Object within distance
- `OnDistanceGreaterThan - ScriptObject`: Object beyond distance
- `OnGainLOS - ScriptObject`: Line of sight gained
- `OnLostLOS - ScriptObject`: Line of sight lost

---

## Event Registration & Unregistration

### Registration Functions

**Self Registration** (script registers for its own events)
```papyrus
RegisterForAnimationEvent(ObjectRef, "AnimEventName")
RegisterForControl(InputKeyCode)
RegisterForKey(DirectXKeyCode)
RegisterForMenuOpenCloseEvent("MenuName")
RegisterForPlayerSleep()
RegisterForPlayerWait()
RegisterForPlayerTeleport()
RegisterForDistanceLessThanEvent(akTarget, 100.0)
RegisterForDistanceGreaterThanEvent(akTarget, 500.0)
RegisterForDetectionLOSGain(akTarget)
RegisterForDetectionLOSLost(akTarget)
RegisterForDirectLOSGain(akTarget)
RegisterForDirectLOSLost(akTarget)
RegisterForHitEvent(akTarget)
RegisterForCameraState()
RegisterForMagicEffectApplyEvent(akTarget)
RegisterForFurnitureEvent(akFurniture)
RegisterForRadiationDamageEvent(akActor)
RegisterForTrackedStatsEvent(akTopic)
RegisterForTutorialEvent(akTopic)
RegisterForLooksMenuEvent()
RegisterForExternalEvent("EventName", "SourceScript")
RegisterForCustomEvent(akTarget, "CustomEventName")
```

**Remote Event Registration** (script registers for another script's events)
```papyrus
RegisterForRemoteEvent(akTarget, "OnDeath")
RegisterForRemoteEvent(akTarget, "OnCellLoad")
RegisterForRemoteEvent(akTarget, "OnItemAdded")
RegisterForRemoteEvent(akTarget, "OnContainerChanged")
RegisterForRemoteEvent(akTarget, "OnEquipped")
RegisterForRemoteEvent(akTarget, "OnUnequipped")
```

### Unregistration Functions

**Unregister Specific Events**
```papyrus
UnregisterForAnimationEvent(ObjectRef, "AnimEventName")
UnregisterForControl(InputKeyCode)
UnregisterForKey(DirectXKeyCode)
UnregisterForFurnitureEvent(akFurniture)
UnregisterForHitEvent(akTarget)
UnregisterForLOS(akTarget)  ; Both LOS events
UnregisterForDistanceEvents(akTarget)  ; Both distance events
UnregisterForMagicEffectApplyEvent(akTarget)
UnregisterForExternalEvent("EventName", "SourceScript")
UnregisterForRemoteEvent(akTarget, "OnDeath")
UnregisterForCustomEvent(akTarget, "CustomEventName")
```

**Unregister All Events**
```papyrus
UnregisterForAllEvents()  ; All event types
UnregisterForAllHitEvents()
UnregisterForAllMagicEffectApplyEvents()
UnregisterForAllMenuOpenCloseEvents()
UnregisterForAllRemoteEvents()
UnregisterForAllRadiationDamageEvents()
UnregisterForAllTrackedStatsEvents()
UnregisterForAllCustomEvents()
```

### Event Registration Pattern

```papyrus
Scriptname MyScript extends ObjectReference

Event OnInit()
  ; Register for events we care about
  RegisterForRemoteEvent(GetLinkedRef(), "OnDeath")
  RegisterForControl(DIK_E)
  RegisterForKey(DIK_Space)
  RegisterForDistanceLessThanEvent(Game.GetPlayer(), 200.0)
EndEvent

Event OnDeath(Actor akDeadActor)
  Debug.Trace(akDeadActor.GetName() + " died!")
  ; Handle death
EndEvent

Event OnControlDown(String asControl)
  If asControl == "Activate"
    ; Handle key press
  EndIf
EndEvent

Event OnDistanceLessThan(ObjectReference akObj1, ObjectReference akObj2, Float afDistance)
  If akObj1 == Game.GetPlayer()
    Debug.Trace("Player near object!")
  EndIf
EndEvent

Event OnUnload()
  ; Clean up on unload
  UnregisterForAllEvents()
EndEvent
```

---

## Action Functions

### Kill/Death Functions

**Killing Actors**
- `Kill - Actor`: Kill actor instantly
- `KillSilent - Actor`: Kill without alarm
- `KillEssential - Actor`: Force kill (even if essential)
- `KillAll - RefCollectionAlias`: Kill all in collection
- `StartDeferredKill - Actor`: Schedule death
- `EndDeferredKill - Actor`: Cancel deferred death
- `TrapSoul - Actor`: Trap soul in gem

**Revival**
- `Resurrect - Actor`: Restore to life
- `ResetHealthAndLimbs - Actor`: Full restoration

### Movement & Positioning

**Movement Functions**
- `MoveTo - ObjectReference`: Move to location/reference
- `MoveToIfUnloaded - ObjectReference`: Move if unloaded
- `MoveToMyEditorLocation - ObjectReference`: Move to editor location
- `MoveToNode - ObjectReference`: Move to bone/node
- `MoveToNearestNavmeshLocation - ObjectReference`: Find navigation path
- `TranslateTo - ObjectReference`: Smooth translation
- `TranslateToRef - ObjectReference`: Smooth to reference
- `SplineTranslateTo - ObjectReference`: Spline movement
- `SplineTranslateToRef - ObjectReference`: Spline to reference
- `SplineTranslateToRefNode - ObjectReference`: Spline to bone
- `PushActorAway - ObjectReference`: Knockback

**Position Queries**
- `SetPosition - ObjectReference`: Set XYZ coordinates
- `GetPositionX/Y/Z - ObjectReference`: Get coordinates
- `SetAngle - ObjectReference`: Set rotation
- `GetAngleX/Y/Z - ObjectReference`: Get rotation
- `GetDistance - ObjectReference`: Distance to target
- `GetSafePosition - ObjectReference`: Find safe spawn location

**Teleportation**
- `GetTeleportCell - ObjectReference`: Teleport destination cell
- `GetTransitionCell - ObjectReference`: Interior/exterior boundary
- `IsRefInTransitionCell - ObjectReference`: In boundary check
- `SetLinkedRef - ObjectReference`: Link to another reference
- `GetLinkedRef - ObjectReference`: Get linked reference
- `GetNthLinkedRef - ObjectReference`: Get numbered link

### Combat Functions

**Combat Management**
- `StartCombat - Actor`: Begin combat
- `StartCombatAll - RefCollectionAlias`: Combat with all in list
- `StopCombat - Actor`: End combat
- `StopCombatAlarm - Actor`: Stop alarm
- `SendAssaultAlarm - Actor`: Trigger assault
- `SendAssaultAlarm - Faction`: Faction assault
- `SendStealAlarm - ObjectReference`: Theft detected
- `SendTrespassAlarm - Actor`: Trespassing alarm
- `WillIntimidateSucceed - Actor`: Intimidation check
- `IsHostileToActor - Actor`: Faction hostility check

**Combat Status**
- `GetCombatState - Actor`: Current combat state
- `GetCombatTarget - Actor`: Primary target
- `GetAllCombatTargets - Actor`: All combat targets
- `IsInCombat - Actor`: In combat check

### Inventory & Items

**Item Management**
- `AddItem - ObjectReference`: Add to inventory
- `RemoveItem - ObjectReference`: Remove item
- `RemoveAllItems - ObjectReference`: Clear inventory
- `DropObject - ObjectReference`: Drop item
- `DropFirstObject - ObjectReference`: Drop first item
- `EquipItem - Actor`: Equip item
- `EquipSpell - Actor`: Equip spell
- `UnequipItem - Actor`: Unequip item
- `UnequipSpell - Actor`: Unequip spell
- `UnequipAll - Actor`: Unequip everything
- `UnequipItemSlot - Actor`: Unequip slot

**Item Inspection**
- `GetItemCount - ObjectReference`: Count in inventory
- `GetWornItem - Actor`: Equipped item
- `GetWornItemMods - Actor`: Item modifications
- `GetEquippedWeapon - Actor`: Current weapon
- `GetEquippedShield - Actor`: Current shield
- `GetEquippedSpell - Actor`: Current spell
- `GetEquippedItemType - Actor`: Equipped type
- `HasKeyword - Form`: Item has keyword
- `GetKeywords - Form`: All keywords on form

**Crafting & Modification**
- `AttachMod - ObjectReference`: Attach weapon mod
- `AttachModToInventoryItem - ObjectReference`: Craft mod
- `RemoveMod - ObjectReference`: Remove mod
- `RemoveModFromInventoryItem - ObjectReference`: Uncraft mod
- `RemoveAllMods - ObjectReference`: Remove all mods
- `RemoveAllModsFromInventoryItem - ObjectReference`: Remove all crafted mods
- `GetAllMods - ObjectReference`: List all mods
- `SetMaterialSwap - ObjectReference`: Material override
- `GetMaterialSwap - ObjectReference`: Get material override
- `RemoveComponents - ObjectReference`: Remove parts

### Magic & Spells

**Spell Casting**
- `Cast - Spell`: Cast spell at target
- `RemoteCast - Spell`: Cast without animation
- `DispelAllSpells - Actor`: Remove all spells
- `DispelSpell - Actor`: Remove specific spell
- `Dispel - ActiveMagicEffect`: End specific effect
- `AddSpell - Actor`: Learn spell
- `RemoveSpell - Actor`: Forget spell

**Effect Management**
- `HasMagicEffect - Actor`: Has effect check
- `HasMagicEffectWithKeyword - Actor`: Effect with keyword
- `GetAssociatedSkill - MagicEffect`: Skill link

**Potion & Ingredient**
- `LearnEffect - Ingredient`: Discover effect
- `LearnNextEffect - Ingredient`: Learn next effect
- `LearnAllEffects - Ingredient`: Learn all effects

### Faction & Relations

**Faction Management**
- `AddToFaction - Actor`: Join faction
- `RemoveFromFaction - Actor`: Leave faction
- `RemoveFromAllFactions - Actor`: Leave all factions
- `RemoveFromAllFactions - RefCollectionAlias`: Group faction removal
- `TryToAddToFaction - ReferenceAlias`: Conditional join
- `TryToRemoveFromFaction - ReferenceAlias`: Conditional leave
- `SetFactionRank - Actor`: Set rank in faction
- `GetFactionRank - Actor`: Current rank
- `GetFactionReaction - Actor`: Faction opinion
- `GetFactionReaction - Faction`: Reaction level
- `SetFactionOwner - ObjectReference`: Ownership by faction
- `GetFactionOwner - ObjectReference`: Owning faction

**Crime & Reputation**
- `GetCrimeFaction - Actor`: Crime faction
- `SetCrimeFaction - Actor`: Set crime faction
- `GetCrimeGold - Faction`: Bounty amount
- `SetCrimeGold - Faction`: Set bounty
- `ModCrimeGold - Faction`: Adjust bounty
- `GetCrimeGoldViolent - Faction`: Violent bounty
- `SetCrimeGoldViolent - Faction`: Set violent bounty
- `CanPayCrimeGold - Faction`: Payment check
- `PlayerPayCrimeGold - Faction`: Player pays bounty
- `SendPlayerToJail - Faction`: Arrest player
- `ClearPrison - Game`: Clear jail state
- `SetPlayerReportCrime - Game`: Crime reporting

**Diplomacy**
- `SetAlly - Faction`: Set as ally
- `SetEnemy - Faction`: Set as enemy
- `IsPlayerEnemy - Faction`: Enemy check
- `SetPlayerEnemy - Faction`: Make enemy
- `IsPlayerExpelled - Faction`: Expulsion check
- `SetPlayerExpelled - Faction`: Expel player

### Quest Functions

**Quest Management**
- `Start - Quest`: Begin quest
- `Stop - Quest`: End quest
- `Reset - Quest`: Reset to initial state
- `SetActive - Quest`: Activate/deactivate
- `SetQuestStage - Quest`: Set current stage
- `GetCurrentStageID - Quest`: Current stage
- `CompleteAllObjectives - Quest`: Mark all done
- `FailAllObjectives - Quest`: Mark all failed
- `SetObjectiveCompleted - Quest`: Mark objective done
- `SetObjectiveFailed - Quest`: Mark objective failed
- `SetObjectiveDisplayed - Quest`: Show objective
- `SetObjectiveSkipped - Quest`: Skip objective
- `IsObjectiveCompleted - Quest`: Completion check
- `IsObjectiveFailed - Quest`: Failure check
- `IsObjectiveDisplayed - Quest`: Display check
- `HasObjective - Quest`: Objective exists check
- `IsCompleted - Quest`: Quest complete check
- `IsRunning - Quest`: Running state check
- `IsStarting - Quest`: Starting state check
- `GetAlias - Quest`: Get quest alias by name
- `GetOwningQuest - Alias`: Get quest from alias
- `UpdateCurrentInstanceGlobal - Quest`: Update global variable
- `ResetSpeechChallenges - Quest`: Clear challenges

### Scene Functions

**Scene Playback**
- `Start - Scene`: Begin scene
- `Stop - Scene`: End scene
- `Pause - Scene`: Pause scene
- `IsPlaying - Scene`: Playback check
- `IsActionComplete - Scene`: Action complete check
- `ForceStart - Scene`: Force start immediately
- `OnAction - Scene`: Custom scene action
- `GetOwningQuest - Scene`: Get parent quest

### State Management

**State Control**
- `GotoState - ScriptObject`: Change state
- `GetState - ScriptObject`: Current state name

**Enable/Disable**
- `Enable - ObjectReference`: Enable object
- `Disable - ObjectReference`: Disable object
- `EnableNoWait - ObjectReference`: Async enable
- `DisableNoWait - ObjectReference`: Async disable
- `IsEnabled - ObjectReference`: Enabled check
- `IsDisabled - ObjectReference`: Disabled check
- `BlockActivation - ObjectReference`: Block activation
- `BlockActivation - RefCollectionAlias`: Block group

### Timer Functions

**Timer Management** (Real-Time)
- `StartTimer - ScriptObject`: Start timer
- `CancelTimer - ScriptObject`: Stop timer
- `OnTimer - ScriptObject`: Timer event handler

**Game-Time Timers**
- `StartTimerGameTime - ScriptObject`: Game-time timer
- `CancelTimerGameTime - ScriptObject`: Cancel game timer
- `OnTimerGameTime - ScriptObject`: Game timer event

### UI & Messages

**Message Display**
- `ShowMessage - Message`: Show message box/notification
- `ShowAsHelpMessage - Message`: Help message
- `Show - Message`: Generic show
- `MessageBox - Debug`: Debug popup
- `Notification - Debug`: Debug notification
- `Trace - Debug`: Console/log message

**Menu Management**
- `OpenMenu - UI`: Open menu by name
- `CloseMenu - UI`: Close menu by name
- `IsMenuOpen - UI`: Menu open check
- `IsMenuRegistered - UI`: Menu registration check
- `Load - UI`: Load menu SWF
- `RegisterCustomMenu - UI`: Register custom menu
- `RegisterBasicCustomMenu - UI`: Register simple menu
- `Invoke - UI`: Call menu function

**Dialog & Interaction**
- `OpenInventory - Actor`: Show inventory
- `ShowBarterMenu - Actor`: Bartering interface
- `ShowTrainingMenu - Actor`: Training interface

---

## Common Action Patterns

### Combat Setup Pattern
```papyrus
; Prepare actor for combat
Function SetupCombat(Actor akActor, Actor akTarget)
  akActor.StartCombat(akTarget)
  akActor.EquipItem(Weapon)
  akActor.SetCombatStyle(CombatStyle)
EndFunction
```

### Inventory Management Pattern
```papyrus
; Safe inventory manipulation
Function TransferItems(ObjectReference akSource, ObjectReference akDest, Form akItem, Int aiCount)
  Int count = akSource.GetItemCount(akItem)
  If count > 0
    Int toTransfer = Math.Min(count, aiCount)
    akSource.RemoveItem(akItem, toTransfer)
    akDest.AddItem(akItem, toTransfer)
  EndIf
EndFunction
```

### Movement Pattern
```papyrus
; Move with delay for animation
Function MoveWithAnimation(ObjectReference akRef, ObjectReference akTarget)
  akRef.MoveTo(akTarget)
  Utility.Wait(1.0)  ; Wait for movement
  Debug.Trace("Movement complete")
EndFunction
```

### Event Registration Pattern
```papyrus
; Proper registration and cleanup
Event OnInit()
  RegisterForRemoteEvent(TargetRef, "OnDeath")
  RegisterForControl(DIK_E)
EndEvent

Event OnDeath(Actor akDeadActor)
  HandleDeath()
EndEvent

Event OnUnload()
  UnregisterForAllEvents()
EndEvent
```

---

## Best Practices

### 1. Always Clean Up Events
```papyrus
; Good: Unregister on cleanup
Event OnUnload()
  UnregisterForAllEvents()
EndEvent

; Avoid: Leaving events registered
Event OnUnload()
  ; Memory leak!
EndEvent
```

### 2. Register Specific Events Only
```papyrus
; Good: Register for needed events
RegisterForRemoteEvent(akTarget, "OnDeath")
RegisterForKey(DIK_E)

; Avoid: Registering for everything
RegisterForAllEvents()  ; Doesn't exist, but bad if it did
```

### 3. Check State Before Actions
```papyrus
; Good: Verify before acting
If !Actor.IsDead()
  Actor.StartCombat(Target)
EndIf

; Avoid: Blind actions
Actor.StartCombat(Target)  ; May fail if dead
```

### 4. Use Remote Events for Loose Coupling
```papyrus
; Good: Remote event (loose coupling)
RegisterForRemoteEvent(akTarget, "OnDeath")

; Avoid: Direct function calls
akTarget.OnDeath()  ; Direct coupling
```

### 5. Handle Event Parameters Safely
```papyrus
; Good: Verify event parameters
Event OnDeath(Actor akDeadActor)
  If akDeadActor != None
    Debug.Trace(akDeadActor.GetName() + " died")
  EndIf
EndEvent

; Avoid: Blind parameter use
Event OnDeath(Actor akDeadActor)
  Debug.Trace(akDeadActor.GetName())  ; Crash if None
EndEvent
```

---

## Related Resources

- **PAPYRUS_FUNCTION_REFERENCE_INDEX.md**: Complete function index (1,358+ functions)
- **EXTENDING_SCRIPTS_PAPYRUS_GUIDE.md**: Script inheritance and extension
- **SCRIPT_FILES_GUIDE.md**: Script file types and compilation
- **PAPYRUS_COMPILER_GUIDE.md**: Compilation reference
- **CREATION_KIT_RESOURCES_INDEX.md**: Full Creation Kit resource index

---

## Quick Event Reference

| Event Category | Common Events | Used For |
|---|---|---|
| **Lifecycle** | OnInit, OnLoad, OnUnload | Setup/cleanup |
| **Combat** | OnCombatStateChanged, OnHit, OnDeath | Combat handling |
| **Actor State** | OnAlarmed, OnAlerted, OnLocationChange | NPC behavior |
| **Containers** | OnItemAdded, OnItemRemoved, OnContainerChanged | Inventory changes |
| **Interaction** | OnActivate, OnEquipped, OnUnequipped | Player interaction |
| **Magic** | OnEffectStart, OnEffectFinish, OnMagicEffectApply | Spell effects |
| **Input** | OnControlDown, OnKeyDown, OnMenuOpenCloseEvent | Player input |
| **Triggers** | OnTriggerEnter, OnTriggerLeave, OnDistanceLessThan | Proximity |
| **Quest** | OnStageSet, OnQuestInit, OnQuestShutdown | Quest progress |
| **Scene** | OnBegin, OnEnd, OnPhaseBegin, OnPhaseEnd | Scene playback |

---

## Quick Action Reference

| Action Type | Key Functions | Use Case |
|---|---|---|
| **Combat** | StartCombat, StopCombat, SendAssaultAlarm | Combat engagement |
| **Movement** | MoveTo, TranslateTo, MoveToNearestNavmeshLocation | Navigation |
| **Inventory** | AddItem, RemoveItem, EquipItem | Item manipulation |
| **Spells** | Cast, AddSpell, RemoveSpell, DispelAllSpells | Magic casting |
| **Factions** | AddToFaction, SetFactionRank, SetCrimeGold | Relationship/crime |
| **Quest** | Start, SetQuestStage, SetObjectiveCompleted | Quest progression |
| **State** | GotoState, Enable, Disable | Object state |
| **UI** | ShowMessage, OpenMenu, Notification | Player feedback |
| **Timer** | StartTimer, StartTimerGameTime, CancelTimer | Delayed actions |
| **Kill** | Kill, KillSilent, Resurrect | Actor death |
