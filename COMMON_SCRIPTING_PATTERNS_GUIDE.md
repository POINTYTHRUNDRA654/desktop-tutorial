# Common Scripting Patterns Guide

## Overview

Common scripting patterns are reusable solutions to recurring problems in Papyrus scripting. These patterns improve code quality, maintainability, and consistency across mods.

**Key Concepts**:
- **Design Patterns**: Proven solutions
- **Anti-Patterns**: Common mistakes
- **Best Practices**: Established standards
- **Code Reuse**: Template solutions
- **Maintainability**: Long-term support

---

## Initialization Patterns

### Lazy Initialization

Defer expensive operations until needed:

```papyrus
Scriptname LazyInitExample extends ObjectReference

; Don't initialize immediately
MyExpensiveObject myObject
Bool isInitialized = False

Function GetMyObject()
  ; Initialize on first use
  If !isInitialized
    myObject = CreateExpensiveObject()
    isInitialized = True
    Debug.Trace("Initialized expensive object")
  EndIf
  
  Return myObject
EndFunction

Function CreateExpensiveObject()
  Debug.Trace("Creating expensive object...")
  Return MyExpensiveObject.Create()
EndFunction
```

### Staged Initialization

Initialize in stages to distribute workload:

```papyrus
Scriptname StagedInitExample extends Quest

Event OnQuestInit()
  SetStage(0)  ; Stage 1: Minimal init
EndEvent

Event OnStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 0
    StageOne_Initialization()
    SetStage(1)
    
  ElseIf aiStageID == 1
    StageTwo_LoadAssets()
    SetStage(2)
    
  ElseIf aiStageID == 2
    StageThree_SetupSystems()
    SetStage(10)  ; Ready
  EndIf
EndEvent

Function StageOne_Initialization()
  Debug.Trace("Stage 1: Minimal setup")
EndFunction

Function StageTwo_LoadAssets()
  Debug.Trace("Stage 2: Loading assets")
  Utility.Wait(1.0)  ; Load resources
EndFunction

Function StageThree_SetupSystems()
  Debug.Trace("Stage 3: Setting up systems")
EndFunction
```

### Singleton Pattern

Ensure only one instance exists:

```papyrus
Scriptname SingletonManager extends ObjectReference

; Global reference to singleton
GlobalVariable Property SingletonInstance Auto

Function GetSingleton()
  If SingletonInstance.GetValue() == 0
    CreateSingleton()
  EndIf
  
  Return SingletonInstance
EndFunction

Function CreateSingleton()
  Debug.Trace("Creating singleton instance")
  SingletonInstance.SetValue(1)
EndFunction
```

---

## Caching Patterns

### Simple Cache

Cache frequently accessed values:

```papyrus
Scriptname SimpleCacheExample extends ObjectReference

; Cache storage
String cachedPlayerName
Int cachedPlayerLevel
Float lastCacheTime = 0.0
Float cacheExpireTime = 60.0  ; 60 seconds

Function GetPlayerName()
  If ShouldRefreshCache()
    cachedPlayerName = Game.GetPlayer().GetName()
    lastCacheTime = Utility.GetCurrentGameTime()
  EndIf
  
  Return cachedPlayerName
EndFunction

Function GetPlayerLevel()
  If ShouldRefreshCache()
    cachedPlayerLevel = Game.GetPlayer().GetLevel()
    lastCacheTime = Utility.GetCurrentGameTime()
  EndIf
  
  Return cachedPlayerLevel
EndFunction

Function ShouldRefreshCache()
  Float elapsed = Utility.GetCurrentGameTime() - lastCacheTime
  Return elapsed > cacheExpireTime
EndFunction
```

### Dictionary Pattern

Simulate dictionary/hash map:

```papyrus
Scriptname DictionaryPattern extends ObjectReference

String[] keys
Int[] values

Function Set(String asKey, Int aiValue)
  Int index = Find(asKey)
  
  If index >= 0
    values[index] = aiValue
  Else
    keys.InsertAt(asKey, keys.Length)
    values.InsertAt(aiValue, values.Length)
  EndIf
EndFunction

Function Get(String asKey)
  Int index = Find(asKey)
  
  If index >= 0
    Return values[index]
  EndIf
  
  Return 0  ; Default
EndFunction

Function Find(String asKey)
  Int i = 0
  While i < keys.Length
    If keys[i] == asKey
      Return i
    EndIf
    i += 1
  EndWhile
  
  Return -1
EndFunction
```

---

## Event Handling Patterns

### Event Cleanup Pattern

Always clean up event registrations:

```papyrus
Scriptname EventCleanupPattern extends ObjectReference

ObjectReference Property EventSource Auto

Event OnInit()
  RegisterForAnimationEvent(EventSource, "PowerAttackStart")
  Debug.Trace("Event registered")
EndEvent

Event OnDelete()
  UnregisterForAnimationEvent(EventSource, "PowerAttackStart")
  Debug.Trace("Event unregistered")
EndEvent

Event OnAnimationEvent(ObjectReference akSource, String asEventName)
  If asEventName == "PowerAttackStart"
    OnPowerAttackStart()
  EndIf
EndEvent

Function OnPowerAttackStart()
  Debug.Trace("Power attack detected")
EndFunction
```

### Remote Event Pattern

Handle events from distant or unloaded objects:

```papyrus
Scriptname RemoteEventPattern extends Quest

ObjectReference Property DistantObject Auto

Event OnQuestInit()
  If DistantObject != None
    RegisterForCustomEvent(DistantObject, "OnDistantEvent")
  EndIf
EndEvent

Event OnDistantEvent()
  Debug.Trace("Received event from distant object")
  HandleRemoteEvent()
EndEvent

Function HandleRemoteEvent()
  ; Logic for handling remote event
  Debug.Trace("Processing remote event")
EndFunction
```

### Event Batching Pattern

Process multiple events efficiently:

```papyrus
Scriptname EventBatchingPattern extends ObjectReference

Int[] eventQueue
Int eventCount = 0

Function QueueEvent(Int aiEventType)
  If eventCount < eventQueue.Length
    eventQueue[eventCount] = aiEventType
    eventCount += 1
  EndIf
  
  If eventCount >= 10
    ProcessEventBatch()
  EndIf
EndFunction

Function ProcessEventBatch()
  Int i = 0
  While i < eventCount
    HandleEvent(eventQueue[i])
    i += 1
  EndWhile
  
  eventCount = 0
  Debug.Trace("Processed batch: " + eventCount + " events")
EndFunction

Function HandleEvent(Int aiEventType)
  ; Handle individual event
EndFunction
```

---

## State Management Patterns

### State Machine Pattern

Organize behavior into discrete states:

```papyrus
Scriptname StateMachinePattern extends Actor

State Idle
  Event OnBeginState()
    Debug.Trace("Entering Idle")
  EndEvent
  
  Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
      GotoState("Combat")
    EndIf
  EndEvent
EndState

State Combat
  Event OnBeginState()
    Debug.Trace("Entering Combat")
  EndEvent
  
  Event OnCombatStateChanged(Actor akTarget, Int aeCombatState)
    If aeCombatState == 0
      GotoState("Idle")
    EndIf
  EndEvent
EndState
```

### Flag-Based State

Track state with flags:

```papyrus
Scriptname FlagBasedStatePattern extends ObjectReference

; State flags
Bool isActive = False
Bool isInitialized = False
Bool isProcessing = False

Function Initialize()
  If isInitialized
    Return
  EndIf
  
  isInitialized = True
  Debug.Trace("Initialized")
EndFunction

Function Activate()
  If !isInitialized || isActive
    Return
  EndIf
  
  isActive = True
  Debug.Trace("Activated")
EndFunction

Function Deactivate()
  If !isActive
    Return
  EndIf
  
  isActive = False
  Debug.Trace("Deactivated")
EndFunction
```

---

## Looping Patterns

### Safe Iteration

Safely iterate through arrays:

```papyrus
Scriptname SafeIterationPattern extends ObjectReference

Actor[] myActors

Function IterateSafely()
  Int i = 0
  
  While i < myActors.Length
    Actor actor = myActors[i]
    
    If actor != None
      ProcessActor(actor)
    EndIf
    
    i += 1
  EndWhile
EndFunction

Function ProcessActor(Actor akActor)
  Debug.Trace("Processing: " + akActor.GetName())
EndFunction
```

### Efficient Removal

Remove items while iterating:

```papyrus
Scriptname EfficientRemovalPattern extends ObjectReference

Actor[] myActors

Function RemoveDeadActors()
  ; Iterate backwards to avoid index shifts
  Int i = myActors.Length - 1
  
  While i >= 0
    Actor actor = myActors[i]
    
    If actor != None && actor.IsDead()
      myActors.RemoveAt(i)
      Debug.Trace("Removed dead actor")
    EndIf
    
    i -= 1
  EndWhile
EndFunction
```

### Early Exit

Exit loops when condition met:

```papyrus
Scriptname EarlyExitPattern extends ObjectReference

Actor[] myActors

Function FindActor(String asName)
  Int i = 0
  
  While i < myActors.Length
    Actor actor = myActors[i]
    
    If actor != None && actor.GetName() == asName
      Debug.Trace("Found: " + asName)
      Return actor  ; Exit early
    EndIf
    
    i += 1
  EndWhile
  
  Debug.Trace("Not found: " + asName)
  Return None
EndFunction
```

---

## Timer Patterns

### Simple Timer

Basic timer usage:

```papyrus
Scriptname SimpleTimerPattern extends ObjectReference

Float Property TimerInterval = 1.0 Auto

Event OnInit()
  StartTimer(TimerInterval)
EndEvent

Event OnTimer(Int aiTimerID)
  DoPeriodicWork()
  StartTimer(TimerInterval)
EndEvent

Function DoPeriodicWork()
  Debug.Trace("Periodic work executed")
EndFunction
```

### Multi-Timer Pattern

Handle multiple timers:

```papyrus
Scriptname MultiTimerPattern extends ObjectReference

; Timer IDs
Int TIMER_UPDATE = 1
Int TIMER_CLEANUP = 2
Int TIMER_SAVE = 3

Event OnInit()
  StartTimer(1.0, TIMER_UPDATE)
  StartTimer(60.0, TIMER_CLEANUP)
  StartTimer(300.0, TIMER_SAVE)
EndEvent

Event OnTimer(Int aiTimerID)
  If aiTimerID == TIMER_UPDATE
    OnUpdateTimer()
    StartTimer(1.0, TIMER_UPDATE)
    
  ElseIf aiTimerID == TIMER_CLEANUP
    OnCleanupTimer()
    StartTimer(60.0, TIMER_CLEANUP)
    
  ElseIf aiTimerID == TIMER_SAVE
    OnSaveTimer()
    StartTimer(300.0, TIMER_SAVE)
  EndIf
EndEvent

Function OnUpdateTimer()
  Debug.Trace("Update timer")
EndFunction

Function OnCleanupTimer()
  Debug.Trace("Cleanup timer")
EndFunction

Function OnSaveTimer()
  Debug.Trace("Save timer")
EndFunction
```

---

## Error Handling Patterns

### Try-Catch Pattern

Handle errors gracefully:

```papyrus
Scriptname TryCatchPattern extends ObjectReference

Function SafeOperation()
  Try
    RiskyOperation()
  Catch
    Debug.Trace("ERROR: Operation failed")
    HandleError()
  EndTry
EndFunction

Function RiskyOperation()
  ; May throw error
  Debug.Trace("Performing risky operation")
EndFunction

Function HandleError()
  Debug.Trace("Attempting recovery")
EndFunction
```

### Validation Pattern

Validate inputs before processing:

```papyrus
Scriptname ValidationPattern extends ObjectReference

Function ProcessActor(Actor akActor, String asName, Int aiLevel)
  If !ValidateInputs(akActor, asName, aiLevel)
    Return
  EndIf
  
  DoWork(akActor, asName, aiLevel)
EndFunction

Function ValidateInputs(Actor akActor, String asName, Int aiLevel)
  If akActor == None
    Debug.Trace("ERROR: Invalid actor")
    Return False
  EndIf
  
  If asName == ""
    Debug.Trace("ERROR: Invalid name")
    Return False
  EndIf
  
  If aiLevel <= 0
    Debug.Trace("ERROR: Invalid level")
    Return False
  EndIf
  
  Return True
EndFunction

Function DoWork(Actor akActor, String asName, Int aiLevel)
  Debug.Trace("Processing valid inputs")
EndFunction
```

---

## Anti-Patterns

### ❌ Infinite Loop

```papyrus
; BAD: Infinite loop freezes game
Function InfiniteLoop()
  While True
    DoSomething()
  EndWhile
EndFunction

; GOOD: Use timers instead
Event OnInit()
  StartTimer(1.0)
EndEvent

Event OnTimer(Int aiTimerID)
  DoSomething()
  StartTimer(1.0)
EndEvent
```

### ❌ Memory Leaks

```papyrus
; BAD: References never cleared
Scriptname MemoryLeak extends ObjectReference

Actor[] myArray

Event OnQuestInit()
  myArray = new Actor[1000]
  ; Never cleared - memory leak!
EndEvent

; GOOD: Always clean up
Event OnQuestShutdown()
  myArray.Clear()
EndEvent
```

### ❌ Missing None Checks

```papyrus
; BAD: May crash if None
Function Risky(Actor akActor)
  akActor.MoveTo(MyLocation)  ; Crash if akActor is None
EndFunction

; GOOD: Always check
Function Safe(Actor akActor)
  If akActor != None
    akActor.MoveTo(MyLocation)
  EndIf
EndFunction
```

### ❌ Hardcoded Values

```papyrus
; BAD: Hardcoded values
Function CountEnemies()
  If enemies > 10  ; Hardcoded
    StartBattle()
  EndIf
EndFunction

; GOOD: Use properties
Int Property MaxEnemyThreshold = 10 Auto

Function CountEnemies()
  If enemies > MaxEnemyThreshold
    StartBattle()
  EndIf
EndFunction
```

---

## Design Patterns Summary

| Pattern | Use Case | Benefit |
|---------|----------|---------|
| **Lazy Init** | Expensive resources | Deferred initialization |
| **Singleton** | Global instance | Single reference point |
| **Cache** | Frequent lookups | Performance improvement |
| **State Machine** | Complex behavior | Clear state transitions |
| **Event Cleanup** | Event listeners | Prevents memory leaks |
| **Try-Catch** | Error handling | Graceful failure |
| **Validation** | Input checking | Prevents bad data |
| **Multi-Timer** | Multiple tasks | Event-driven scheduling |

---

## Related Resources

- **STATE_MACHINES_GUIDE.md**: Detailed state pattern
- **PERFORMANCE_OPTIMIZATION_GUIDE.md**: Performance patterns
- **CUSTOM_EVENTS_GUIDE.md**: Event patterns
- **ERROR_HANDLING_AND_TROUBLESHOOTING_GUIDE.md**: Error patterns

---

## Quick Reference

| Pattern | Key Functions |
|---------|---------------|
| **Initialization** | OnInit, StartTimer, SetStage |
| **Caching** | Store values, check expiration |
| **Events** | RegisterForEvent, UnregisterForEvent |
| **States** | GotoState, OnBeginState, OnEndState |
| **Timers** | StartTimer, CancelTimer, OnTimer |
| **Errors** | Try-Catch, Debug.Trace, Validation |
| **Iteration** | While loops, array methods |
| **Cleanup** | OnDelete, OnQuestShutdown, Clear |
