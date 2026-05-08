# Papyrus Profiler & Debugger Guide

## Overview

The Papyrus Profiler and Debugger are essential tools for analyzing script performance, finding bottlenecks, and fixing bugs. This guide covers profiling techniques, debugging strategies, and performance analysis.

**Key Concepts**:
- **Profiler**: Measures performance
- **Debugger**: Identifies logic errors
- **Stack Dump**: Shows call hierarchy
- **Performance Analysis**: Finding bottlenecks
- **Memory Profiling**: Tracking resource usage

---

## Papyrus Profiler

### What is Profiling?

Profiling measures:
- **Execution Time**: How long functions take
- **Call Count**: How often functions execute
- **CPU Usage**: Resource consumption
- **Memory Usage**: Data storage
- **Bottlenecks**: Performance problems

### Using the Profile Analyzer

```papyrus
Scriptname ProfileAnalysisExample extends ObjectReference

Float startTime
Float endTime

Function ProfileFunction()
  ; Start measurement
  startTime = Utility.GetCurrentGameTime()
  
  ExpensiveFunction()
  
  ; End measurement
  endTime = Utility.GetCurrentGameTime()
  Float elapsed = endTime - startTime
  
  Debug.Trace("Function took: " + elapsed + " seconds")
EndFunction

Function ExpensiveFunction()
  ; Simulate expensive work
  Int i = 0
  While i < 100000
    i += 1
  EndWhile
EndFunction
```

### Profiler Output

The Papyrus Profile Analyzer shows:
```
Function: ExpensiveFunction
  Calls: 142
  Total Time: 2.345 seconds
  Average Time: 0.0165 seconds
  Self Time: 1.234 seconds
  
Function: HelperFunction
  Calls: 1420
  Total Time: 1.111 seconds
  Average Time: 0.000782 seconds
  Self Time: 0.890 seconds
```

### Interpreting Results

```papyrus
Scriptname InterpretingProfileResults extends ObjectReference

; Identify bottlenecks
Function AnalyzeResults()
  ; Functions with high "Total Time" are candidates for optimization
  Debug.Trace("Top time consumers:")
  Debug.Trace("1. LoadAssets: 2.5 seconds")
  Debug.Trace("2. ProcessData: 1.8 seconds")
  Debug.Trace("3. ValidateInput: 0.9 seconds")
  
  ; Focus optimization on these
EndFunction

; Optimize identified bottleneck
Function OptimizeLoadAssets()
  ; Original: 2.5 seconds
  ; Optimization: Cache results
  Debug.Trace("Caching assets...")
  
  ; Result: 0.3 seconds (90% improvement)
EndFunction
```

---

## Stack Dumps

### Understanding Stack Dumps

Stack dumps show the call hierarchy when a script error occurs:

```
PAPYRUS STACK TRACE:
  [QuestScript "MyQuest" <00007DCC>]
    Call stack:
      [Function: ProcessQuest]
        > [Function: HandleStageSet]
          > [Function: SpawnEnemies]
            > [Function: GetSpawnLocation] <- ERROR HERE
            
Error: GetSpawnLocation returned None
```

### Reading Stack Dumps

Stack trace shows:
1. **Script and Form ID**: Which script has error
2. **Function Stack**: Call sequence to error
3. **Error Location**: Where crash occurred
4. **Error Message**: What went wrong

### Debugging from Stack Dumps

```papyrus
Scriptname DebugFromStackDump extends Quest

; ERROR: GetSpawnLocation returned None
; SOLUTION: Add validation

Function SpawnEnemies()
  ObjectReference spawnLoc = GetSpawnLocation()
  
  ; Validate result
  If spawnLoc == None
    Debug.Trace("ERROR: Spawn location not found!")
    Return  ; Prevent crash
  EndIf
  
  ; Safe to proceed
  SpawnActorAtLocation(spawnLoc)
EndFunction

Function GetSpawnLocation()
  ; Validate before returning
  If MyLocation == None
    Debug.Trace("ERROR: MyLocation property not set!")
    Return None
  EndIf
  
  Return MyLocation
EndFunction
```

---

## Debugging Techniques

### Debug Tracing

Trace execution flow:

```papyrus
Scriptname DebugTracingExample extends ObjectReference

Event OnInit()
  Debug.Trace("OnInit() called")
  Initialize()
  Debug.Trace("Initialize() complete")
EndEvent

Function Initialize()
  Debug.Trace("  Entering Initialize()")
  
  LoadResources()
  Debug.Trace("  Resources loaded")
  
  SetupEvents()
  Debug.Trace("  Events configured")
  
  Debug.Trace("  Exiting Initialize()")
EndFunction

Function LoadResources()
  Debug.Trace("    Loading resources...")
  ; Do work
  Debug.Trace("    Resources loaded")
EndFunction

Function SetupEvents()
  Debug.Trace("    Setting up events...")
  ; Do work
  Debug.Trace("    Events ready")
EndFunction
```

### Conditional Debugging

Enable/disable debug output:

```papyrus
Scriptname ConditionalDebugExample extends ObjectReference

Bool Property DEBUG_ENABLED = True Auto

Function DebugPrint(String asMessage)
  If DEBUG_ENABLED
    Debug.Trace("[DEBUG] " + asMessage)
  EndIf
EndFunction

Function ProcessData()
  DebugPrint("Processing started")
  
  Do Work
  
  DebugPrint("Processing complete")
EndFunction
```

### Breakpoint-Style Debugging

Pause execution at critical points:

```papyrus
Scriptname BreakpointDebugging extends ObjectReference

Bool Property DEBUG_PAUSE = False Auto
Float Property DEBUG_PAUSE_TIME = 5.0 Auto

Function CriticalOperation()
  Debug.Trace("Entering critical operation")
  
  If DEBUG_PAUSE
    Debug.Trace("DEBUG: Pausing execution for " + DEBUG_PAUSE_TIME + " seconds")
    Utility.Wait(DEBUG_PAUSE_TIME)
  EndIf
  
  DoRiskyWork()
  
  Debug.Trace("Critical operation complete")
EndFunction

Function DoRiskyWork()
  Debug.Trace("Performing risky work...")
EndFunction
```

---

## Memory Profiling

### Tracking Memory Usage

```papyrus
Scriptname MemoryProfilingExample extends ObjectReference

Actor[] trackedActors

Function TrackMemory(String asLabel)
  Int arraySize = trackedActors.Length
  
  Debug.Trace(asLabel + " - Array size: " + arraySize)
  Debug.Trace(asLabel + " - Approx memory: " + (arraySize * 8) + " bytes")
EndFunction

Event OnInit()
  trackedActors = new Actor[100]
  TrackMemory("Initial allocation")
EndEvent

Function GrowArray()
  Actor[] newArray = new Actor[200]
  Int i = 0
  
  While i < trackedActors.Length
    newArray[i] = trackedActors[i]
    i += 1
  EndWhile
  
  trackedActors = newArray
  TrackMemory("After resize")
EndFunction
```

### Identifying Memory Leaks

```papyrus
Scriptname MemoryLeakDetection extends ObjectReference

ObjectReference[] createdObjects

Function CreateObjects(Int aiCount)
  createdObjects = new ObjectReference[aiCount]
  
  Int i = 0
  While i < aiCount
    createdObjects[i] = PlaceAtMe(BaseObject)
    i += 1
  EndWhile
  
  Debug.Trace("Created " + aiCount + " objects")
EndFunction

Function CleanupObjects()
  ; Cleanup is critical
  Int i = createdObjects.Length - 1
  
  While i >= 0
    If createdObjects[i] != None
      createdObjects[i].Delete()
    EndIf
    i -= 1
  EndWhile
  
  createdObjects.Clear()
  Debug.Trace("Objects cleaned up")
EndFunction

Event OnQuestShutdown()
  ; Always cleanup in shutdown
  CleanupObjects()
EndEvent
```

---

## Performance Bottleneck Analysis

### Identifying Hot Spots

```papyrus
Scriptname HotSpotAnalysis extends ObjectReference

Float[] functionTimes = new Float[10]
String[] functionNames = new String[10]

Function ProfileMultipleFunctions()
  MeasureFunction("UpdateAI", "UpdateAI")
  MeasureFunction("RenderUI", "RenderUI")
  MeasureFunction("ProcessInput", "ProcessInput")
  
  PrintResults()
EndFunction

Function MeasureFunction(String asFunctionName, String asLabel)
  Float start = Utility.GetCurrentGameTime()
  
  CallFunction(asFunctionName)
  
  Float elapsed = Utility.GetCurrentGameTime() - start
  Debug.Trace(asLabel + ": " + elapsed + " ms")
EndFunction

Function CallFunction(String asFunctionName)
  ; Dynamically call function
  If asFunctionName == "UpdateAI"
    UpdateAI()
  ElseIf asFunctionName == "RenderUI"
    RenderUI()
  ElseIf asFunctionName == "ProcessInput"
    ProcessInput()
  EndIf
EndFunction

Function UpdateAI()
  ; Simulate AI update
EndFunction

Function RenderUI()
  ; Simulate UI rendering
EndFunction

Function ProcessInput()
  ; Simulate input processing
EndFunction

Function PrintResults()
  Debug.Trace("Performance Summary:")
  Debug.Trace("  UpdateAI: Highest time consumer")
  Debug.Trace("  RenderUI: Medium time")
  Debug.Trace("  ProcessInput: Lowest time")
EndFunction
```

### Optimization Verification

```papyrus
Scriptname OptimizationVerification extends ObjectReference

Float originalTime
Float optimizedTime

Function MeasurePerformance()
  originalTime = MeasureOriginal()
  optimizedTime = MeasureOptimized()
  
  Float improvement = (1.0 - (optimizedTime / originalTime)) * 100.0
  Debug.Trace("Improvement: " + improvement + "%")
EndFunction

Function MeasureOriginal()
  Float start = Utility.GetCurrentGameTime()
  OriginalImplementation()
  Return Utility.GetCurrentGameTime() - start
EndFunction

Function MeasureOptimized()
  Float start = Utility.GetCurrentGameTime()
  OptimizedImplementation()
  Return Utility.GetCurrentGameTime() - start
EndFunction

Function OriginalImplementation()
  ; Slow version
  Int i = 0
  While i < 100000
    Int result = SlowOperation(i)
    i += 1
  EndWhile
EndFunction

Function OptimizedImplementation()
  ; Fast version with caching
  Int[] cache = new Int[100000]
  
  Int i = 0
  While i < 100000
    cache[i] = FastOperation(i)
    i += 1
  EndWhile
EndFunction

Function SlowOperation(Int aiValue)
  Return aiValue * 2
EndFunction

Function FastOperation(Int aiValue)
  Return aiValue * 2
EndFunction
```

---

## Common Profiling Metrics

### Metrics to Track

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| **FPS** | 60+ | 30-60 | <30 |
| **Frame Time** | <16ms | 16-33ms | >33ms |
| **Script Load** | <10ms | 10-50ms | >50ms |
| **Memory** | <2GB | 2-3GB | >3GB |
| **Function Time** | <1ms | 1-10ms | >10ms |

### Performance Thresholds

```papyrus
Scriptname PerformanceThresholds extends ObjectReference

Float Property FRAME_TIME_WARNING = 33.0 Auto  ; milliseconds
Float Property MEMORY_WARNING = 2000.0 Auto    ; megabytes
Float Property FUNCTION_TIME_WARNING = 10.0 Auto

Function CheckPerformance()
  Float frameTime = GetFrameTime()
  
  If frameTime > FRAME_TIME_WARNING
    Debug.Trace("WARNING: Frame time exceeded: " + frameTime)
  EndIf
  
  Float memory = GetMemoryUsage()
  
  If memory > MEMORY_WARNING
    Debug.Trace("WARNING: Memory usage high: " + memory)
  EndIf
EndFunction

Function GetFrameTime()
  Return 16.5  ; Example
EndFunction

Function GetMemoryUsage()
  Return 1800.0  ; Example
EndFunction
```

---

## Debugging Tools

### Debug Script Setup

```papyrus
Scriptname DebugHelper extends ObjectReference

; Central debug configuration
Bool Property DEBUG_ENABLED = True Auto
Bool Property DEBUG_VERBOSE = False Auto
String Property DEBUG_PREFIX = "[DEBUG] " Auto

Function Log(String asMessage, String asLevel = "INFO")
  If !DEBUG_ENABLED
    Return
  EndIf
  
  Debug.Trace(DEBUG_PREFIX + asLevel + ": " + asMessage)
EndFunction

Function LogVerbose(String asMessage)
  If DEBUG_VERBOSE
    Log(asMessage, "VERBOSE")
  EndIf
EndFunction

Function LogError(String asMessage)
  Log(asMessage, "ERROR")
EndFunction

Function LogWarning(String asMessage)
  Log(asMessage, "WARNING")
EndFunction

Function Assert(Bool abCondition, String asMessage)
  If !abCondition
    LogError("ASSERTION FAILED: " + asMessage)
  EndIf
EndFunction
```

---

## Best Practices

### 1. Profile Before Optimizing
```papyrus
; Good: Measure first
Float time = ProfileFunction()

If time > THRESHOLD
  OptimizeFunction()
EndIf

; Bad: Optimize blindly
OptimizeFunction()  ; Might not help
```

### 2. Use Meaningful Debug Names
```papyrus
; Good: Clear labels
Debug.Trace("UpdateAI: Started")
Debug.Trace("UpdateAI: Processing " + actorCount + " actors")
Debug.Trace("UpdateAI: Complete")

; Bad: Vague messages
Debug.Trace("Update")
Debug.Trace("Processing")
Debug.Trace("Done")
```

### 3. Remove Debug Statements Before Release
```papyrus
; Good: Debug flag controls output
If DEBUG_ENABLED
  Debug.Trace("Debug message")
EndIf

; Bad: Debug statements left in
Debug.Trace("Debug message")  ; Clutters log
```

### 4. Capture Performance Baselines
```papyrus
Scriptname BaselineCapture extends ObjectReference

Function CaptureBaseline()
  ; Measure reference performance
  Float baseline = MeasurePerformance()
  
  Debug.Trace("Baseline performance: " + baseline)
  ; Compare future measurements against this
EndFunction
```

---

## Related Resources

- **PERFORMANCE_OPTIMIZATION_GUIDE.md**: Optimization techniques
- **ERROR_HANDLING_AND_TROUBLESHOOTING_GUIDE.md**: Error debugging
- **COMMON_SCRIPTING_PATTERNS_GUIDE.md**: Debugging patterns

---

## Quick Reference

| Task | Method |
|------|--------|
| Measure time | `Utility.GetCurrentGameTime()` |
| Log message | `Debug.Trace(String asMessage)` |
| Check stack | Stack dumps in logs |
| Profile function | Timer measurement |
| Memory check | Array size tracking |
| Bottleneck ID | Timing comparison |
| Performance verify | Before/after measurement |
