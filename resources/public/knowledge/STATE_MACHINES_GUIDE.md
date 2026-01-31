# State Machines Guide

## Overview

State machines provide structured, organized control over complex behavior. They separate behavior into discrete **states** where each state handles specific logic, improving maintainability and reducing bugs.

**Key Concepts**:
- **State**: A discrete behavior mode
- **Transitions**: Changes between states
- **Events**: Trigger state changes
- **State Logic**: Unique code per state
- **GotoState**: Function to change states

---

## State Machine Fundamentals

### What is a State?

A **state** in Papyrus is a named section of code within a script:

```papyrus
Scriptname SimpleStateExample extends Actor

State Idle
  Event OnBeginState()
    Debug.Trace("Entered Idle state")
    PlayIdle("IdleMarker")
  EndEvent
  
  Event OnEndState()
    Debug.Trace("Left Idle state")
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    GotoState("Alert")
  EndEvent
EndState

State Alert
  Event OnBeginState()
    Debug.Trace("Entered Alert state")
    PlayIdle("AlertMarker")
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    GotoState("Idle")
  EndEvent
EndState
```

### State Declaration Syntax

```papyrus
; State with events
State StateName
  Event OnBeginState()
    ; Run when entering state
  EndEvent
  
  Event OnEndState()
    ; Run when leaving state
  EndEvent
  
  Event OnSomeEvent()
    ; Handle event in this state
  EndEvent
  
  Function DoAction()
    ; State-specific function
  EndFunction
EndState

; Empty state (inherits global functions)
State EmptyState
EndState
```

### Global Functions

Functions and events defined **outside states** are available in **all states**:

```papyrus
Scriptname StateWithGlobalFunctions extends Actor

; Global - available in all states
Function GlobalFunction()
  Debug.Trace("Available everywhere")
EndFunction

State State1
  Event OnBeginState()
    GlobalFunction()  ; Accessible
  EndEvent
EndState

State State2
  Event OnBeginState()
    GlobalFunction()  ; Also accessible
  EndEvent
EndState
```

---

## State Management

### GotoState

Transition between states:

```papyrus
Scriptname StateTransitionExample extends Actor

State Idle
  Event OnActivate(ObjectReference akActionRef)
    GotoState("Combat")  ; Change states
  EndEvent
EndState

State Combat
  Event OnActivate(ObjectReference akActionRef)
    GotoState("Idle")  ; Return to idle
  EndEvent
EndState
```

### BeginState and EndState Events

```papyrus
Scriptname StateEventsExample extends Actor

State Walking
  Event OnBeginState()
    Debug.Trace("Starting to walk")
    PlayIdle("WalkMarker")
  EndEvent
  
  Event OnEndState()
    Debug.Trace("Stopping walk")
    StopAnimation()
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    GotoState("Running")
  EndEvent
EndState

State Running
  Event OnBeginState()
    Debug.Trace("Starting to run")
    PlayIdle("RunMarker")
  EndEvent
  
  Event OnEndState()
    Debug.Trace("Stopping run")
    StopAnimation()
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    GotoState("Walking")
  EndEvent
EndState
```

---

## State Behavior Patterns

### Traffic Control

```papyrus
Scriptname TrafficLightExample extends ObjectReference

State Red
  Event OnBeginState()
    SetColor(1.0, 0, 0)  ; Red
  EndEvent
  
  Event OnTimer(Int aiTimerID)
    GotoState("Yellow")
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    StartTimer(5.0)
  EndEvent
EndState

State Yellow
  Event OnBeginState()
    SetColor(1.0, 1.0, 0)  ; Yellow
    StartTimer(2.0)
  EndEvent
  
  Event OnTimer(Int aiTimerID)
    GotoState("Green")
  EndEvent
EndState

State Green
  Event OnBeginState()
    SetColor(0, 1.0, 0)  ; Green
    StartTimer(5.0)
  EndEvent
  
  Event OnTimer(Int aiTimerID)
    GotoState("Red")
  EndEvent
EndState
```

### Door Lock System

```papyrus
Scriptname DoorLockStateExample extends ObjectReference

State Locked
  Event OnBeginState()
    Lock(True)
    SetAlert(True)
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    Actor player = akActionRef as Actor
    
    If player != None && player.HasKey(DoorKey)
      GotoState("Unlocked")
    Else
      ShowMessage("Door is locked")
    EndIf
  EndEvent
EndState

State Unlocked
  Event OnBeginState()
    Lock(False)
    SetAlert(False)
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    GotoState("Locked")
  EndEvent
EndState
```

### Quest Progress

```papyrus
Scriptname QuestProgressExample extends Quest

State Inactive
  Event OnBeginState()
    Debug.Trace("Quest inactive")
  EndEvent
  
  Event OnQuestInit()
    GotoState("Started")
  EndEvent
EndState

State Started
  Event OnBeginState()
    Debug.Trace("Quest started")
    SetObjectiveDisplayed(10)
  EndEvent
  
  Event OnStageSet(Int aiStageID, Int aiItemID)
    If aiStageID == 50
      GotoState("Midpoint")
    EndIf
  EndEvent
EndState

State Midpoint
  Event OnBeginState()
    Debug.Trace("Midpoint reached")
    SetObjectiveCompleted(10)
    SetObjectiveDisplayed(20)
  EndEvent
  
  Event OnStageSet(Int aiStageID, Int aiItemID)
    If aiStageID == 100
      GotoState("Complete")
    EndIf
  EndEvent
EndState

State Complete
  Event OnBeginState()
    Debug.Trace("Quest complete")
    CompleteAllObjectives()
    GotoState("Inactive")
  EndEvent
EndState
```

---

## Complex State Machines

### NPC Behavior State Machine

```papyrus
Scriptname NPCBehaviorStateMachine extends Actor

State Idle
  Event OnBeginState()
    Debug.Trace("NPC: Idle state")
    AddPackage(IdlePackage)
  EndEvent
  
  Event OnEndState()
    RemovePackage(IdlePackage)
  EndEvent
  
  Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
      GotoState("Fighting")
    EndIf
  EndEvent
  
  Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
    GotoState("Alert")
  EndEvent
EndState

State Alert
  Event OnBeginState()
    Debug.Trace("NPC: Alert state")
    SetAlert(True)
    StartTimer(5.0)
  EndEvent
  
  Event OnTimer(Int aiTimerID)
    If !IsInCombat()
      GotoState("Idle")
    EndIf
  EndEvent
  
  Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
      GotoState("Fighting")
    EndIf
  EndEvent
EndState

State Fighting
  Event OnBeginState()
    Debug.Trace("NPC: Fighting state")
    SetAlert(True)
  EndEvent
  
  Event OnEndState()
    SetAlert(False)
  EndEvent
  
  Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 0
      GotoState("Alert")
    EndIf
  EndEvent
  
  Event OnDeath(Actor akKiller)
    GotoState("Dead")
  EndEvent
EndState

State Dead
  Event OnBeginState()
    Debug.Trace("NPC: Dead state")
    ClearPackages()
    StopCombat()
  EndEvent
EndState
```

### Elevator State Machine

```papyrus
Scriptname ElevatorStateMachine extends ObjectReference

Int Property FloorCount = 3 Auto
Int CurrentFloor = 1
Keyword Property ElevatorKeyword Auto

State AtFloor
  Event OnBeginState()
    Debug.Trace("Elevator at floor: " + CurrentFloor)
  EndEvent
  
  Event OnActivate(ObjectReference akActionRef)
    Actor player = akActionRef as Actor
    
    If player != None
      GotoState("SelectingFloor")
    EndIf
  EndEvent
  
  Event OnTimer(Int aiTimerID)
    ; Auto-open door after delay
    SetOpen(True)
  EndEvent
EndState

State SelectingFloor()
  Event OnBeginState()
    Debug.Trace("Selecting floor...")
    ShowMessage(FloorSelectionMessage)
  EndEvent
  
  Event OnMenuItemRun(String asEventName, String asMenuName)
    ; Parse floor selection
    Int selectedFloor = ParseFloorSelection(asEventName)
    
    If selectedFloor != CurrentFloor && selectedFloor > 0 && selectedFloor <= FloorCount
      TargetFloor = selectedFloor
      GotoState("Moving")
    Else
      GotoState("AtFloor")
    EndIf
  EndEvent
EndState

State Moving
  Event OnBeginState()
    Debug.Trace("Moving to floor: " + TargetFloor)
    SetOpen(False)
    StartMoving()
    
    ; Calculate movement time
    Float distance = Utility.Abs(TargetFloor - CurrentFloor) * 100.0
    Float travelTime = distance / 200.0
    
    StartTimer(travelTime)
  EndEvent
  
  Event OnTimer(Int aiTimerID)
    CurrentFloor = TargetFloor
    StopMoving()
    GotoState("AtFloor")
  EndEvent
EndState
```

---

## State Event Handling

### Event Overriding

Events in states override global events:

```papyrus
Scriptname EventOverrideExample extends Actor

; Global event
Event OnActivate(ObjectReference akActionRef)
  Debug.Trace("Global: OnActivate")
EndEvent

State State1
  ; Overrides global OnActivate
  Event OnActivate(ObjectReference akActionRef)
    Debug.Trace("State1: OnActivate")
    ; Global event is NOT called
  EndEvent
EndState

State State2
  ; No OnActivate - uses global version
EndState
```

### Calling Base Events

```papyrus
Scriptname CallBaseEventExample extends Actor

Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
  Debug.Trace("Base: Hit")
EndEvent

State Invulnerable
  Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
    Debug.Trace("In invulnerable state - ignoring hit")
    ; Doesn't call base event
  EndEvent
EndState

State Normal
  Event OnHit(ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked)
    Debug.Trace("State: Hit")
    ; To call base: would need separate function
  EndEvent
EndState
```

---

## State Machine Best Practices

### 1. Clear State Names
```papyrus
; Good: Descriptive
State Walking
State Running
State Combat
State Dead

; Bad: Vague
State S1
State S2
State Active
```

### 2. Always Use OnBeginState/OnEndState
```papyrus
; Good: Setup and cleanup
State Alert
  Event OnBeginState()
    SetAlert(True)
    StartTimer(30.0)
  EndEvent
  
  Event OnEndState()
    SetAlert(False)
    CancelTimer()
  EndEvent
EndState

; Bad: Missing cleanup
State Alert
  Event OnBeginState()
    SetAlert(True)
    StartTimer(30.0)
  EndEvent
EndState
```

### 3. Prevent Invalid Transitions
```papyrus
; Good: Only valid transitions
State Idle
  Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
      GotoState("Combat")
    EndIf
  EndEvent
EndState

; Bad: Allows invalid states
State Idle
  Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    GotoState("InvalidState")  ; Doesn't exist
  EndEvent
EndState
```

### 4. Use Shared Properties
```papyrus
; Good: Store data outside states
Scriptname StateData extends Actor

Float Property LastEventTime = 0.0 Auto
String Property CurrentTarget = "" Auto

State State1
  Event OnLoad()
    LastEventTime = Utility.GetCurrentGameTime()
  EndEvent
EndState

; Bad: Duplicate data in each state
State State1
  Float LastEventTime = 0.0
EndState

State State2
  Float LastEventTime = 0.0
EndState
```

### 5. Document State Transitions
```papyrus
Scriptname DocumentedStateMachine extends Actor

; State Transition Map:
; Idle -> Alert (on hit)
; Alert -> Combat (on combat start)
; Alert -> Idle (on timer)
; Combat -> Alert (on combat end)
; Combat -> Dead (on death)
; Dead -> (no transitions)

State Idle
  ; ...
EndState
```

---

## State Machine Architecture

### Three-Tier Pattern

**Tier 1: Initialize**
```papyrus
State Initializing
  Event OnBeginState()
    SetupResources()
    GotoState("Ready")
  EndEvent
EndState
```

**Tier 2: Running**
```papyrus
State Ready
  Event OnBeginState()
    StartMainLoop()
  EndEvent
  
  Event OnUpdate()
    MainLogic()
  EndEvent
EndState
```

**Tier 3: Cleanup**
```papyrus
State Shutting
  Event OnBeginState()
    Cleanup()
    GotoState("Done")
  EndEvent
EndState

State Done
  ; Terminal state
EndState
```

### Hierarchical States (Simulation)

```papyrus
Scriptname HierarchicalStateExample extends Actor

State Combat
  Event OnBeginState()
    Debug.Trace("Combat: Begin")
    AddPackage(CombatPackage)
  EndEvent
  
  Event OnEndState()
    Debug.Trace("Combat: End")
    RemovePackage(CombatPackage)
  EndEvent
  
  ; Detailed combat substates handled via timers
  Function OnOffensive()
    Debug.Trace("Combat: Offensive")
  EndFunction
  
  Function OnDefensive()
    Debug.Trace("Combat: Defensive")
  EndFunction
EndState

State NonCombat
  Event OnBeginState()
    Debug.Trace("NonCombat: Begin")
  EndEvent
  
  Function OnExplore()
    Debug.Trace("NonCombat: Explore")
  EndFunction
  
  Function OnSocialize()
    Debug.Trace("NonCombat: Socialize")
  EndFunction
EndState
```

---

## Related Resources

- **PAPYRUS_EVENTS_AND_ACTIONS_GUIDE.md**: State events
- **EXTENDING_SCRIPTS_PAPYRUS_GUIDE.md**: State inheritance
- **QUEST_SCRIPTING_GUIDE.md**: Quest state management

---

## Quick Reference

| Task | Syntax |
|------|--------|
| Declare state | `State StateName ... EndState` |
| Change state | `GotoState("StateName")` |
| Begin state event | `Event OnBeginState()` |
| End state event | `Event OnEndState()` |
| Global function | Define outside states |
| State function | Define inside state |
| Access property | `Property.Value` |
| Check current state | `GetState()` (returns string) |
