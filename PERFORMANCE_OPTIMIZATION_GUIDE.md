# Performance Optimization Guide

## Overview

Performance optimization is critical for stable, playable mods. Poor optimization causes frame rate drops, crashes, and memory leaks. This guide covers profiling, optimization techniques, and best practices.

**Key Concepts**:
- **Profiling**: Measuring performance
- **Optimization**: Improving speed/efficiency
- **Memory Management**: Preventing leaks
- **CPU Usage**: Reducing calculations
- **Papyrus Performance**: Script-specific optimizations

---

## Understanding Performance

### Performance Metrics

| Metric | Target | Concern |
|--------|--------|---------|
| **FPS** | 60+ | < 30 = unplayable |
| **Frame Time** | < 16ms | > 33ms = laggy |
| **Memory** | < 3GB | > 3.5GB = crash risk |
| **CPU** | < 80% | > 95% = bottleneck |
| **GPU** | < 90% | > 98% = bottleneck |

### Bottleneck Identification

```papyrus
Scriptname PerformanceMonitor extends Quest

Event OnQuestInit()
  Debug.Trace("Game Load: " + Game.GetLoadedAreaFormList())
  Debug.Trace("Active Actors: " + Game.GetActorsAliases())
  
  ; Monitor performance
  StartTimer(5.0)
EndEvent

Event OnTimer(Int aiTimerID)
  ; Check performance every 5 seconds
  Int actorCount = Game.GetActorsAliases().Length
  
  If actorCount > 1000
    Debug.Trace("WARNING: Too many actors loaded!")
  EndIf
  
  StartTimer(5.0)
EndEvent
```

---

## Papyrus Script Optimization

### Avoid Expensive Operations in Hot Code

**Bad: Repeated lookups**
```papyrus
Event OnUpdate()
  If Game.GetPlayer().GetItemCount(Keycard) > 0
    If Game.GetPlayer().GetItemCount(Tool) > 0
      If Game.GetPlayer().GetItemCount(Component) > 0
        ; Action
      EndIf
    EndIf
  EndIf
EndEvent
```

**Good: Cache values**
```papyrus
Event OnUpdate()
  Actor player = Game.GetPlayer()
  
  If player.GetItemCount(Keycard) > 0 && _
     player.GetItemCount(Tool) > 0 && _
     player.GetItemCount(Component) > 0
    ; Action
  EndIf
EndEvent
```

### Loop Optimization

**Bad: Inefficient loops**
```papyrus
Function FindActor(String asName)
  Int i = 0
  
  While i < 10000  ; Fixed high count
    Actor found = GetActorByIndex(i)
    
    If found != None && found.GetName() == asName
      Return found
    EndIf
    
    i += 1
  EndWhile
  
  Return None
EndFunction
```

**Good: Early exit**
```papyrus
Function FindActor(String asName)
  Int i = 0
  Int maxActors = GetActorCount()
  
  While i < maxActors  ; Dynamic limit
    Actor found = GetActorByIndex(i)
    
    If found != None && found.GetName() == asName
      Return found  ; Exit early
    EndIf
    
    i += 1
  EndWhile
  
  Return None
EndFunction
```

### Array Performance

**Bad: Repeated searches**
```papyrus
Function CheckItems(Form akItem)
  Int i = 0
  
  While i < MyArray.Length
    ; Inefficient: searches entire array repeatedly
    Int index = MyArray.Find(akItem)
    
    If index >= 0
      Return True
    EndIf
    
    i += 1
  EndWhile
  
  Return False
EndFunction
```

**Good: Single search**
```papyrus
Function CheckItems(Form akItem)
  Return MyArray.Find(akItem) >= 0
EndFunction
```

### Event Registration Optimization

**Bad: Register for everything**
```papyrus
Event OnInit()
  RegisterForAllEvents()  ; Expensive!
EndEvent
```

**Good: Register only needed events**
```papyrus
Event OnInit()
  RegisterForAnimationEvent(Self, "PowerAttackStart")
  RegisterForAnimationEvent(Self, "PowerAttackEnd")
EndEvent

Event OnQuestShutdown()
  UnregisterForAnimationEvent(Self, "PowerAttackStart")
  UnregisterForAnimationEvent(Self, "PowerAttackEnd")
EndEvent
```

### Timer Optimization

**Bad: Multiple short timers**
```papyrus
; Running 10 separate timer events every frame
StartTimer(0.1)
StartTimer(0.2)
StartTimer(0.3)
; ... etc
```

**Good: Single timer with logic**
```papyrus
Float lastCheckTime = 0.0

Function OnUpdate()
  Float currentTime = Utility.GetCurrentGameTime()
  
  If currentTime - lastCheckTime > 0.1
    lastCheckTime = currentTime
    DoPeriodicCheck()
  EndIf
EndFunction
```

---

## Memory Management

### Memory Leaks

**Bad: Holding references**
```papyrus
Scriptname MemoryLeakExample extends ObjectReference

Actor[] MyArray  ; Never cleaned!

Event OnQuestInit()
  MyArray = new Actor[100]
  
  Int i = 0
  While i < 100
    MyArray[i] = PlaceActorAtMe(BaseActor)
    i += 1
  EndWhile
EndEvent

; If never cleared, actors stay in memory forever
```

**Good: Clean up resources**
```papyrus
Scriptname ProperCleanupExample extends ObjectReference

Actor[] MyArray

Event OnQuestInit()
  MyArray = new Actor[100]
  
  Int i = 0
  While i < 100
    MyArray[i] = PlaceActorAtMe(BaseActor)
    i += 1
  EndWhile
EndEvent

Event OnQuestShutdown()
  ; Clear references
  Int i = 0
  While i < MyArray.Length
    If MyArray[i] != None
      MyArray[i].Delete()
    EndIf
    i += 1
  EndWhile
  
  MyArray.Clear()
EndEvent
```

### Array Management

**Bad: Unlimited growth**
```papyrus
Int[] counts

Event OnUpdate()
  counts.InsertAt(Utility.RandomInt(1, 100), 0)
  
  If counts.Length > 10000
    Debug.Trace("Array is huge!")
  EndIf
EndEvent
```

**Good: Fixed size**
```papyrus
Int[] counts = new Int[100]
Int currentIndex = 0

Event OnUpdate()
  counts[currentIndex] = Utility.RandomInt(1, 100)
  currentIndex = (currentIndex + 1) % counts.Length
EndEvent
```

---

## Optimization Techniques

### Object Caching

```papyrus
Scriptname ObjectCachingExample extends Quest

Actor Property CachedPlayer Auto  ; Cache player reference
Location Property CachedPlayerLocation Auto

Event OnQuestInit()
  CachedPlayer = Game.GetPlayer()
  CachedPlayerLocation = CachedPlayer.GetCurrentLocation()
EndEvent

; Use cached values
Function CheckPlayerLocation()
  Location current = CachedPlayer.GetCurrentLocation()
  
  If current != CachedPlayerLocation
    CachedPlayerLocation = current
    OnLocationChanged()
  EndIf
EndFunction
```

### Lazy Initialization

```papyrus
Scriptname LazyInitExample extends ObjectReference

MyCustomObject Property ExpensiveObject

Function GetExpensiveObject()
  If ExpensiveObject == None
    ExpensiveObject = CreateExpensiveObject()  ; Only create when needed
  EndIf
  
  Return ExpensiveObject
EndFunction

Function CreateExpensiveObject()
  ; Heavy initialization
  Debug.Trace("Initializing expensive object...")
  Return MyCustomObject.Create()
EndFunction
```

### Conditional Processing

```papyrus
Scriptname ConditionalProcessing extends Actor

Bool Property IsOptimizationDisabled = False Auto

Event OnUpdate()
  ; Skip processing if not needed
  If GetDistance(Game.GetPlayer()) > 5000
    Return
  EndIf
  
  If IsOptimizationDisabled
    Return
  EndIf
  
  DoHeavyProcessing()
EndEvent

Function DoHeavyProcessing()
  ; CPU intensive work only when close to player
  Debug.Trace("Processing near player")
EndFunction
```

### Batch Processing

**Bad: Processing scattered over frames**
```papyrus
Int processIndex = 0

Event OnUpdate()
  If processIndex < MyArray.Length
    ProcessItem(MyArray[processIndex])
    processIndex += 1
  EndIf
EndEvent
```

**Good: Process in batches**
```papyrus
Int processIndex = 0
Int BatchSize = 50

Event OnUpdate()
  Int processed = 0
  
  While processed < BatchSize && processIndex < MyArray.Length
    ProcessItem(MyArray[processIndex])
    processIndex += 1
    processed += 1
  EndWhile
EndEvent
```

---

## Animation and Graphics Optimization

### LOD (Level of Detail)

```papyrus
Scriptname LODExample extends ObjectReference

ObjectReference[] LODVersions

Event OnLoadGame()
  ; Show/hide based on distance
  Float distance = GetDistance(Game.GetPlayer())
  
  If distance < 1000
    LODVersions[0].Enable()  ; High detail
    LODVersions[1].Disable()
    LODVersions[2].Disable()
  ElseIf distance < 5000
    LODVersions[0].Disable()
    LODVersions[1].Enable()  ; Medium detail
    LODVersions[2].Disable()
  Else
    LODVersions[0].Disable()
    LODVersions[1].Disable()
    LODVersions[2].Enable()  ; Low detail
  EndIf
EndEvent
```

### Culling

```papyrus
Scriptname CullingExample extends Quest

ObjectReference[] VisibleObjects

Event OnUpdate()
  Actor player = Game.GetPlayer()
  
  Int i = 0
  While i < VisibleObjects.Length
    ObjectReference obj = VisibleObjects[i]
    
    ; Disable if far away
    If obj.GetDistance(player) > 10000
      obj.Disable()
    Else
      obj.Enable()
    EndIf
    
    i += 1
  EndWhile
EndEvent
```

---

## Load Time Optimization

### Asset Management

```papyrus
Scriptname LoadTimeOptimization extends Quest

; Load expensive assets after startup
Event OnQuestInit()
  SetStage(0)  ; Initialize
  StartTimer(5.0)  ; Delay heavy work
EndEvent

Event OnTimer(Int aiTimerID)
  ; Load complex assets after 5 seconds
  LoadExpensiveAssets()
EndEvent

Function LoadExpensiveAssets()
  Debug.Trace("Loading expensive assets...")
  
  ; Precache textures, meshes, etc.
EndFunction
```

### Streaming

```papyrus
Scriptname StreamingExample extends Quest

String[] LargeDataSet
Int loadIndex = 0

Function StartStreamingLoad()
  StartTimer(0.1)
EndFunction

Event OnTimer(Int aiTimerID)
  ; Load one item per frame
  If loadIndex < LargeDataSet.Length
    ProcessDataItem(LargeDataSet[loadIndex])
    loadIndex += 1
    StartTimer(0.1)
  EndIf
EndEvent
```

---

## Profiling and Measurement

### Performance Monitoring

```papyrus
Scriptname PerformanceProfiler extends Quest

Float startTime

Event OnQuestInit()
  startTime = Utility.GetCurrentGameTime()
  
  ExpensiveOperation()
  
  Float elapsed = Utility.GetCurrentGameTime() - startTime
  Debug.Trace("Operation took: " + elapsed + " seconds")
EndEvent

Function ExpensiveOperation()
  ; Heavy computation
  Int i = 0
  While i < 1000000
    i += 1
  EndWhile
EndFunction
```

### Memory Profiling

```papyrus
Scriptname MemoryProfiler extends Quest

Function CheckMemory()
  ; Monitor array sizes
  Debug.Trace("MyArray size: " + MyArray.Length)
  Debug.Trace("Active actors: " + Game.GetActorsAliases().Length)
  Debug.Trace("Loaded forms: " + Game.GetFormList().Length)
EndFunction
```

---

## Fallout 4 Specific Optimizations

### F4SE Performance

F4SE provides faster alternatives:

```papyrus
Scriptname F4SEOptimization extends Quest

; Traditional Papyrus (slower)
Function GetPlayerOldWay()
  Actor player = Game.GetPlayer()
EndFunction

; F4SE (faster)
Function GetPlayerF4SEWay()
  ; If F4SE available, use native functions
  ; Check in CK: Papyrus Properties → F4SE
EndFunction
```

### Shared Data Structures

```papyrus
Scriptname SharedDataExample extends Quest

; Use one instance for all scripts
GlobalVariable Property SharedCounter Auto
GlobalVariable Property SharedState Auto

Event OnQuestInit()
  SharedCounter.SetValue(0)
  SharedState.SetValue(0)
EndEvent
```

### Distant Object Loading

```papyrus
Scriptname DistantLoadingExample extends Quest

ObjectReference[] DistantObjects

Event OnUpdate()
  Actor player = Game.GetPlayer()
  
  Int i = 0
  While i < DistantObjects.Length
    ObjectReference obj = DistantObjects[i]
    Float distance = obj.GetDistance(player)
    
    ; Lazy load based on distance
    If distance < 2000 && !obj.Is3DLoaded()
      obj.SetOpen(True)
    ElseIf distance > 5000 && obj.Is3DLoaded()
      obj.SetOpen(False)
    EndIf
    
    i += 1
  EndWhile
EndEvent
```

---

## Best Practices

### 1. Profile Before Optimizing
```papyrus
; Good: Measure first
Float startTime = Utility.GetCurrentGameTime()
TargetFunction()
Float elapsed = Utility.GetCurrentGameTime() - startTime
Debug.Trace("Time: " + elapsed)

; Bad: Guess and optimize
TargetFunction()
```

### 2. Avoid Premature Optimization
```papyrus
; Focus on high-impact optimizations first
; - Don't optimize loops that run once per load
; - Do optimize loops that run every frame
```

### 3. Use Proper Data Structures
```papyrus
; Good: Appropriate type
Int[] CountArray = new Int[100]
String MyString = "efficient"

; Bad: Wrong type
Int[] StringArray = new Int[100]  ; Can't store strings
```

### 4. Clean Up Events
```papyrus
; Good: Unregister when done
Event OnQuestShutdown()
  UnregisterForAllEvents()
EndEvent

; Bad: Leave events registered
Event OnQuestShutdown()
  ; Events still active!
EndEvent
```

### 5. Distance Checks Before Heavy Work
```papyrus
; Good: Check distance first
If GetDistance(Game.GetPlayer()) > 5000
  Return  ; Skip expensive work
EndIf
DoExpensiveWork()

; Bad: Always do expensive work
DoExpensiveWork()
If GetDistance(Game.GetPlayer()) > 5000
  DiscardResults()
EndIf
```

---

## Related Resources

- **PAPYRUS_FUNCTION_REFERENCE_INDEX.md**: Performance functions
- **CREATION_KIT_RESOURCES_INDEX.md**: Optimization guides
- **PAPYRUS_EVENTS_AND_ACTIONS_GUIDE.md**: Event best practices

---

## Quick Reference

| Optimization | Impact | Effort |
|--------------|--------|--------|
| **Cache values** | High | Low |
| **Early loop exit** | High | Low |
| **Event cleanup** | Medium | Low |
| **Distance checks** | Medium | Low |
| **Array management** | Medium | Medium |
| **LOD systems** | High | High |
| **Async loading** | High | High |
| **Memory pooling** | Medium | High |
