# Quest Scripting Guide

## Overview

Quest scripting in Papyrus involves controlling quest progression, managing objectives, handling aliases, and responding to player actions through the quest system. Quests are the primary way to add complex narratives and dynamic gameplay to Fallout 4 mods.

**Key Concepts**:
- **Quest Script**: Main quest behavior controller
- **Quest Aliases**: Dynamic references within quests
- **Stages**: Quest progression checkpoints
- **Objectives**: Player-facing quest goals
- **Fragments**: Auto-generated event handlers

---

## Quest Fundamentals

### What is a Quest?

A **Quest** is a container for gameplay logic, story progression, and player interaction. Quests track:
- Dialogue topics
- Journal entries
- Quest stages
- Objectives and goals
- Actor/location references (via aliases)
- Time-sensitive events

### Quest Types

| Type | Purpose | Example |
|------|---------|---------|
| **Main Story** | Primary campaign | Main faction quest lines |
| **Side Quest** | Optional content | Miscellaneous tasks |
| **Radiant Quest** | Procedurally generated | Repeatable tasks |
| **Activity** | Background system | Companion activities |
| **Dialogue Topic** | Dialogue only | Conversation entries |

### Quest Lifecycle

```
Creation → Initialization → Running → Completion/Failure → Shutdown
   ↓            ↓             ↓           ↓                  ↓
Scripted    OnQuestInit   OnStageSet   OnQuestShutdown   Cleanup
```

---

## Quest Scripts

### Basic Quest Script Structure

```papyrus
Scriptname MyQuestScript extends Quest

; Properties for referenced forms
ReferenceAlias Property PlayerAlias Auto
RefCollectionAlias Property EnemyAliases Auto
LocationAlias Property QuestLocation Auto
Actor Property QuestGiver Auto
ObjectReference Property QuestObject Auto

Event OnInit()
  Debug.Trace("Quest initialized")
EndEvent

Event OnQuestInit()
  Debug.Trace("Quest started")
  ; Initialize aliases, spawn actors, etc.
EndEvent

Event OnStageSet(Int aiStageID, Int aiItemID)
  Debug.Trace("Quest stage " + aiStageID + " set")
  
  If aiStageID == 10
    HandleStage10()
  ElseIf aiStageID == 20
    HandleStage20()
  EndIf
EndEvent

Event OnQuestShutdown()
  Debug.Trace("Quest ending")
  ; Cleanup, disable actors, remove markers, etc.
EndEvent

Function HandleStage10()
  Debug.Trace("Starting stage 10 logic")
EndFunction

Function HandleStage20()
  Debug.Trace("Starting stage 20 logic")
EndFunction
```

### Quest Properties

**Auto-Fill Properties** (automatically populated from editor):
```papyrus
Actor Property QuestGiver Auto
ObjectReference Property TreasureChest Auto
Location Property QuestLocation Auto
```

**Non-Auto Properties** (must be set in script):
```papyrus
Actor Property DynamicNPC
Actor Property EnemyActor

Event OnQuestInit()
  DynamicNPC = GetLinkedRef()
  EnemyActor = PlaceActorAtMe(EnemyBase)
EndEvent
```

### Quest Events

**Initialization**
```papyrus
Event OnQuestInit()
  ; Called when quest starts
  ; Use for one-time setup
  SetStage(10)  ; Advance to first real stage
EndEvent
```

**Stage Set**
```papyrus
Event OnStageSet(Int aiStageID, Int aiItemID)
  ; Called when any stage is set
  ; aiStageID: The stage being set
  ; aiItemID: Quest item ID (0 if none)
  
  If aiStageID == 0
    ; Initialization stage (default)
  ElseIf aiStageID == 10
    ; Player accepted quest
  ElseIf aiStageID == 50
    ; Major checkpoint
  ElseIf aiStageID == 100
    ; Quest complete
  EndIf
EndEvent
```

**Shutdown**
```papyrus
Event OnQuestShutdown()
  ; Called when quest stops
  ; Use for cleanup
  
  ; Remove spawned actors
  If EnemyActor != None && !EnemyActor.IsDead()
    EnemyActor.Delete()
  EndIf
  
  ; Clear markers
  If QuestMarker != None
    QuestMarker.Disable()
  EndIf
  
  ; Reset NPCs
  QuestGiver.SetAlert(False)
  QuestGiver.SetRestrained(False)
EndEvent
```

---

## Objectives

### Setting Objectives

```papyrus
; Add new objective
SetObjectiveDisplayed(10, True)

; Mark objective complete
SetObjectiveCompleted(10)

; Mark objective failed
SetObjectiveFailed(10)

; Skip objective
SetObjectiveSkipped(10)

; Check status
If IsObjectiveCompleted(10)
  Debug.Trace("Objective 10 complete!")
EndIf

If IsObjectiveFailed(20)
  Debug.Trace("Objective 20 failed!")
EndIf

If IsObjectiveDisplayed(30)
  Debug.Trace("Objective 30 is active")
EndIf
```

### Objective Workflow

```papyrus
Event OnQuestInit()
  ; Objective 10: Talk to NPC
  SetObjectiveDisplayed(10, True)
EndEvent

Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 10
    ; Player accepted quest
    SetObjectiveCompleted(10)
    SetObjectiveDisplayed(20, True)  ; Next: Retrieve item
    
  ElseIf aiStageID == 20
    ; Player retrieved item
    SetObjectiveCompleted(20)
    SetObjectiveDisplayed(30, True)  ; Next: Return item
    
  ElseIf aiStageID == 30
    ; Player returned item
    SetObjectiveCompleted(30)
    SetObjectiveDisplayed(40, True)  ; Next: Deliver reward
    GivePlayerCaps(100)
    
  ElseIf aiStageID == 100
    ; Quest complete
    SetObjectiveCompleted(40)
  EndIf
EndEvent
```

### Conditional Objectives

```papyrus
; Optional objective that may or may not complete
If Player.GetItemCount(RareItem) > 0
  SetObjectiveCompleted(25)  ; Bonus objective
  GivePlayerCaps(50)  ; Bonus reward
Else
  SetObjectiveSkipped(25)
EndIf
```

---

## Quest Stages

### Understanding Stages

Stages are **checkpoints** in quest progression:
- **Stage 0**: Initialization (automatically set)
- **Stages 1-199**: Custom progression stages
- **Stage 200+**: Terminal stages (quest ends)

**Important**: Higher stages override lower stages. Setting stage 50 moves quest from any earlier stage to stage 50.

### Common Stage Pattern

```papyrus
; Stage 0: Quest initialization (auto)
; Stage 10: Player accepts quest
; Stage 20: Player reaches quest location
; Stage 30: Player retrieves objective
; Stage 40: Player returns to quest giver
; Stage 100: Quest complete (success)
; Stage 200: Quest failed/abandoned

Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 10
    OnQuestAccepted()
  ElseIf aiStageID == 20
    OnLocationReached()
  ElseIf aiStageID == 30
    OnObjectiveRetrieved()
  ElseIf aiStageID == 40
    OnReturned()
  ElseIf aiStageID == 100
    OnQuestComplete()
  ElseIf aiStageID == 200
    OnQuestFailed()
  EndIf
EndEvent

Function OnQuestAccepted()
  SetObjectiveCompleted(10)
  SetObjectiveDisplayed(20)
  AddMapMarker()
EndFunction

Function OnLocationReached()
  Debug.Trace("Player reached location")
  SetObjectiveCompleted(20)
  SetObjectiveDisplayed(30)
EndFunction

Function OnObjectiveRetrieved()
  Debug.Trace("Player has objective")
  SetObjectiveCompleted(30)
  SetObjectiveDisplayed(40)
  Game.GetPlayer().AddItem(QuestItem)
EndFunction

Function OnReturned()
  Debug.Trace("Player returned")
  SetObjectiveCompleted(40)
  SetObjectiveDisplayed(50)
EndFunction

Function OnQuestComplete()
  Debug.Trace("Quest completed!")
  CompleteAllObjectives()
  GiveRewards()
EndFunction

Function OnQuestFailed()
  Debug.Trace("Quest failed")
  FailAllObjectives()
EndFunction

Function GiveRewards()
  Game.GetPlayer().AddItem(GoldForm, 100)
  Game.GetPlayer().AddPerks(QuestRewardPerk)
EndFunction
```

### Branching Stages

```papyrus
Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 30
    ; Player choice: Kill or spare enemy
    
    If Player.GetItemCount(MercyItem) > 0
      Debug.Trace("Mercy path")
      SetStage(50)  ; Mercy ending
    Else
      Debug.Trace("Combat path")
      SetStage(40)  ; Combat path
    EndIf
  EndIf
EndEvent
```

---

## Aliases

### Quest Alias Types

**ReferenceAlias**: Points to a single object
```papyrus
ReferenceAlias Property TargetRef Auto

Event OnQuestInit()
  ; Fill alias with specific reference
  TargetRef.ForceRefTo(SomeActor)
  
  ; Or let player click
  TargetRef.TryToFill(akPickedRef)
EndEvent
```

**RefCollectionAlias**: Points to multiple objects
```papyrus
RefCollectionAlias Property EnemyGroup Auto

Event OnQuestInit()
  EnemyGroup.Clear()
  EnemyGroup.AddRef(Enemy1)
  EnemyGroup.AddRef(Enemy2)
  EnemyGroup.AddRef(Enemy3)
EndEvent

Function KillAllEnemies()
  Int i = 0
  While i < EnemyGroup.GetCount()
    Actor enemy = EnemyGroup.GetAt(i) as Actor
    If enemy != None && !enemy.IsDead()
      enemy.Kill(Game.GetPlayer())
    EndIf
    i += 1
  EndWhile
EndFunction
```

**LocationAlias**: Points to a location
```papyrus
LocationAlias Property QuestLocation Auto

Event OnQuestInit()
  QuestLocation.ForceLocationTo(TargetLocation)
EndEvent

Function CheckIfPlayerInLocation()
  If Game.GetPlayer().IsInLocation(QuestLocation.GetLocation())
    Debug.Trace("Player in quest location!")
    SetStage(20)
  EndIf
EndFunction
```

### Alias Events

Aliases can have their own scripts with event handlers:

```papyrus
; In ReferenceAlias script
Event OnInit()
  ; Alias initialized
EndEvent

Event OnLoad()
  ; Referenced object loaded
  GetRef().SetOutfit(QuestOutfit)
EndEvent

Event OnUnload()
  ; Referenced object unloaded
  Debug.Trace("Alias unloaded")
EndEvent

Event OnDeath(Actor akDeadActor)
  ; Referenced actor died
  GetOwningQuest().SetStage(200)  ; Quest failed
EndEvent

Event OnEquipped(Actor akActor)
  ; Alias item was equipped
  GetRef().AddKeyword(MarkedForDeath)
EndEvent
```

### Working with Aliases

```papyrus
ReferenceAlias Property TargetAlias Auto

Function UseAlias()
  ; Check if filled
  If TargetAlias.GetRef() == None
    Debug.Trace("Alias not filled!")
    Return
  EndIf
  
  ; Get referenced actor
  Actor target = TargetAlias.GetRef() as Actor
  
  ; Work with reference
  target.MoveTo(Location)
  target.StartCombat(Player)
  
  ; Clear alias
  TargetAlias.Clear()
EndFunction
```

---

## Stage Fragments

Fragments are **auto-generated** event handlers for quest stages. In the editor:

1. Right-click on stage → **Create Script Fragment**
2. Script is auto-created with `OnStageSet` handler
3. Editor manages the script location

### Fragment Pattern

```papyrus
; Auto-generated by editor
ScriptName QuestName_Fragment_010 extends Quest

Event OnStageSet(Int aiStageID, Int aiItemID)
  If (aiStageID == 10)
    ; Stage 10 logic here
    Quest.SetStage(20)
  EndIf
EndEvent
```

### Fragments vs Quest Script

**Fragments** (in editor):
- Auto-generated by editor
- One per stage
- Better for stage-specific logic
- Easier to manage in editor

**Quest Script** (manual):
- Hand-written
- Centralizes all logic
- Better for complex workflows
- More control

**Best Practice**: Use fragments for simple logic, quest script for complex workflows.

---

## Quest Dialogue Integration

### Dialogue Topics

Quests can add dialogue topics:

```papyrus
Event OnQuestInit()
  ; Make dialogue topic available
  Topic MyQuestTopic = Game.GetFormFromFile(0x00001234, "MyMod.esp")
  
  ; Add to NPC dialogue list
  QuestGiver.AddTopic(MyQuestTopic)
EndEvent
```

### Dialogue Conditions

Conditions check quest state:

```
GetStage(QuestName) == 10
GetObjectiveCompleted(QuestName, 10)
GetObjectiveFailed(QuestName, 20)
IsActive(QuestName)
IsCompleted(QuestName)
```

### Dialogue Results (Info Fragments)

```papyrus
; Auto-generated for dialogue response
ScriptName QuestName_TopicInfo_Fragment_0001 extends TopicInfo

Event OnBegin(Subject akSpeaker, Actor akListener)
  ; Dialogue starts
  akListener.ShowMessage(Message)
EndEvent

Event OnEnd(Subject akSpeaker, Actor akListener)
  ; Dialogue ends
  akListener.GetOwningQuest().SetStage(20)
EndEvent
```

---

## Quest Completion Patterns

### Simple Linear Quest

```papyrus
Scriptname SimpleQuest extends Quest

Event OnQuestInit()
  SetObjectiveDisplayed(10)
EndEvent

Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 10
    ; Player accepted
    SetObjectiveCompleted(10)
    SetObjectiveDisplayed(20)
    
  ElseIf aiStageID == 20
    ; Player completed task
    SetObjectiveCompleted(20)
    SetObjectiveDisplayed(30)
    GivePlayerCaps(50)
    
  ElseIf aiStageID == 100
    ; Quest complete
    CompleteAllObjectives()
    GivePlayerCaps(100)
  EndIf
EndEvent
```

### Branching Quest

```papyrus
Scriptname BranchingQuest extends Quest

Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 20
    ; Choice point
    ShowMessage(ChoiceMessage)
    
  ElseIf aiStageID == 30
    ; Good path
    HandleGoodPath()
    
  ElseIf aiStageID == 40
    ; Evil path
    HandleEvilPath()
    
  ElseIf aiStageID == 100
    ; Good ending
    GiveGoodRewards()
    
  ElseIf aiStageID == 101
    ; Evil ending
    GiveEvilRewards()
  EndIf
EndEvent

Function HandleGoodPath()
  Debug.Trace("Good path selected")
  SetObjectiveCompleted(20)
  SetObjectiveDisplayed(30)
EndFunction

Function HandleEvilPath()
  Debug.Trace("Evil path selected")
  SetObjectiveCompleted(20)
  SetObjectiveDisplayed(40)
EndFunction

Function GiveGoodRewards()
  Game.GetPlayer().AddPerk(GoodPerk)
  Game.GetPlayer().AddItem(GoodItem)
EndFunction

Function GiveEvilRewards()
  Game.GetPlayer().AddPerk(EvilPerk)
  Game.GetPlayer().ModCrimeGold(250)
EndFunction
```

### Timed Quest

```papyrus
Scriptname TimedQuest extends Quest

Int Property TimeLimit = 300 Auto  ; 5 minutes game time

Event OnQuestInit()
  StartTimerGameTime(TimeLimit)
EndEvent

Event OnTimerGameTime(Float afGameTime)
  If GetCurrentStageID() < 100
    Debug.Trace("Time's up!")
    SetStage(200)  ; Quest failed
  EndIf
EndEvent

Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 100
    ; Quest completed before time limit
    CancelTimer()
    GiveRewards()
  ElseIf aiStageID == 200
    ; Quest failed/timeout
    CancelTimer()
    FailAllObjectives()
  EndIf
EndEvent
```

### Repeatable Quest

```papyrus
Scriptname RepeatableQuest extends Quest

Event OnQuestInit()
  Reset()
EndEvent

Event OnQuestShutdown()
  ; Allow restart
  Stop()
EndEvent

Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 10
    SetObjectiveDisplayed(10)
    PlaceNewObjective()
    
  ElseIf aiStageID == 100
    CompleteAllObjectives()
    GiveRewards()
    Utility.Wait(2.0)
    
    ; Reset for next run
    Reset()
  EndIf
EndEvent

Function PlaceNewObjective()
  ; Randomize objective each run
  Int randomLocation = Utility.RandomInt(0, 5)
  Location newLoc = LocationArray[randomLocation]
  QuestLocation.ForceLocationTo(newLoc)
EndFunction

Function GiveRewards()
  Int gold = Utility.RandomInt(50, 200)
  Game.GetPlayer().AddItem(GoldForm, gold)
EndFunction
```

---

## Best Practices

### 1. Always Set Stage 0 First
```papyrus
; Good
Event OnQuestInit()
  SetStage(0)  ; Ensures initialization
  SetStage(10)  ; Then advance
EndEvent

; Risky
Event OnQuestInit()
  SetStage(10)  ; May skip init logic
EndEvent
```

### 2. Use Meaningful Stage Numbers
```papyrus
; Good: Clear progression
Stage 0:   Init
Stage 10:  Quest accepted
Stage 20:  At location
Stage 30:  Objective complete
Stage 100: Quest success
Stage 200: Quest failed

; Confusing
Stage 1: Init
Stage 2: Next
Stage 3: Another
```

### 3. Clean Up on Shutdown
```papyrus
Event OnQuestShutdown()
  ; Cancel timers
  CancelTimer()
  CancelTimerGameTime()
  
  ; Clear objectives
  FailAllObjectives()
  
  ; Remove actors
  If QuestActor != None
    QuestActor.Delete()
  EndIf
  
  ; Disable markers
  QuestMarker.Disable()
EndEvent
```

### 4. Handle Missing References
```papyrus
Function SetupQuest()
  If TargetAlias.GetRef() == None
    Debug.Trace("ERROR: Target alias not filled!")
    SetStage(200)  ; Fail quest
    Return
  EndIf
  
  ; Continue setup
EndFunction
```

### 5. Use Objective Count Strategically
```papyrus
; Good: Right number for clarity
Int currentObjective = 10
SetObjectiveDisplayed(currentObjective)

; Avoid: Too many objectives
SetObjectiveDisplayed(1)
SetObjectiveDisplayed(2)
SetObjectiveDisplayed(3)
; ... too many to track
```

---

## Related Resources

- **PAPYRUS_EVENTS_AND_ACTIONS_GUIDE.md**: Quest events and functions
- **EXTENDING_SCRIPTS_PAPYRUS_GUIDE.md**: Quest script inheritance
- **PAPYRUS_FUNCTION_REFERENCE_INDEX.md**: Quest functions
- **CREATION_KIT_RESOURCES_INDEX.md**: Quest-related resources

---

## Quick Reference

| Task | Function |
|------|----------|
| Set quest stage | `SetStage(aiStageID)` |
| Get current stage | `GetCurrentStageID()` |
| Display objective | `SetObjectiveDisplayed(aiObjectiveID)` |
| Complete objective | `SetObjectiveCompleted(aiObjectiveID)` |
| Fail objective | `SetObjectiveFailed(aiObjectiveID)` |
| Start quest | `Start()` |
| Stop quest | `Stop()` |
| Reset quest | `Reset()` |
| Fill alias | `MyAlias.ForceRefTo(akRef)` |
| Clear alias | `MyAlias.Clear()` |
| Get alias ref | `MyAlias.GetRef()` |
| Check completion | `IsCompleted()` |
| Check if running | `IsRunning()` |
