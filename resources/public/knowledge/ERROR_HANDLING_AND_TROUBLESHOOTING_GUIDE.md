# Error Handling & Troubleshooting Guide

## Overview

Error handling and troubleshooting are critical skills for mod development. This guide covers common errors, solutions, debugging techniques, and best practices for robust scripting.

**Key Concepts**:
- **Error Types**: Different failure modes
- **Error Prevention**: Avoiding problems
- **Error Recovery**: Handling failures gracefully
- **Troubleshooting**: Finding and fixing issues
- **Best Practices**: Robust code patterns

---

## Common Papyrus Errors

### Null Reference Error

**Error Message**:
```
ERROR: GetRef() returned None
```

**Cause**: Accessing property/method on None reference

**Example**:
```papyrus
; BAD: Crash if MyActor is None
Function Risky()
  MyActor.MoveTo(Location)
EndFunction
```

**Solution**:
```papyrus
; GOOD: Check for None
Function Safe()
  If MyActor != None
    MyActor.MoveTo(Location)
  Else
    Debug.Trace("ERROR: MyActor is None")
  EndIf
EndFunction
```

### Property Not Set

**Error Message**:
```
ERROR: Property MyProperty is not set
```

**Cause**: Property required but not assigned in editor

**Solution**:
```papyrus
Scriptname PropertyCheckExample extends ObjectReference

; Make properties required in editor
Quest Property MyQuest Auto  ; User must fill this

Event OnInit()
  If MyQuest == None
    Debug.Trace("ERROR: MyQuest property must be set!")
    Return
  EndIf
  
  ContinueInitialization()
EndEvent

Function ContinueInitialization()
  Debug.Trace("Initialization proceeding safely")
EndFunction
```

### Array Index Out of Bounds

**Error Message**:
```
ERROR: Index out of bounds: 10 (array length is 5)
```

**Cause**: Accessing array index that doesn't exist

**Bad Code**:
```papyrus
Function BadArray()
  Int[] myArray = new Int[5]
  
  Int value = myArray[10]  ; Index 10 doesn't exist
EndFunction
```

**Good Code**:
```papyrus
Function SafeArray()
  Int[] myArray = new Int[5]
  
  If 10 < myArray.Length
    Int value = myArray[10]
  Else
    Debug.Trace("ERROR: Index out of bounds")
  EndIf
EndFunction
```

### Type Mismatch

**Error Message**:
```
ERROR: Cannot cast Actor to Weapon
```

**Cause**: Converting incompatible types

**Bad Code**:
```papyrus
Function TypeMismatch()
  Actor akActor = Game.GetPlayer()
  Weapon w = akActor as Weapon  ; Invalid cast
EndFunction
```

**Good Code**:
```papyrus
Function TypeCheckExample()
  Form akForm = GetFormFromFile(0x00012345, "MyMod.esp")
  
  ; Verify type before casting
  If akForm is Weapon
    Weapon w = akForm as Weapon
    Debug.Trace("Successfully cast to Weapon")
  Else
    Debug.Trace("ERROR: Form is not a Weapon")
  EndIf
EndFunction
```

---

## Error Prevention

### Input Validation

Validate all inputs:

```papyrus
Scriptname InputValidationExample extends ObjectReference

Function ProcessData(Actor akActor, String asData, Int aiCount)
  ; Validate inputs before processing
  If !ValidateInputs(akActor, asData, aiCount)
    Debug.Trace("ERROR: Invalid inputs")
    Return
  EndIf
  
  DoWork(akActor, asData, aiCount)
EndFunction

Function ValidateInputs(Actor akActor, String asData, Int aiCount)
  ; Check each input
  If akActor == None
    Debug.Trace("ERROR: Invalid actor")
    Return False
  EndIf
  
  If asData == ""
    Debug.Trace("ERROR: Empty data string")
    Return False
  EndIf
  
  If aiCount <= 0
    Debug.Trace("ERROR: Invalid count")
    Return False
  EndIf
  
  Return True
EndFunction

Function DoWork(Actor akActor, String asData, Int aiCount)
  Debug.Trace("Processing valid inputs")
EndFunction
```

### Defensive Programming

Check state before actions:

```papyrus
Scriptname DefensiveProgrammingExample extends ObjectReference

Function SafeMovement(Actor akActor, ObjectReference akTarget)
  ; Check preconditions
  If akActor == None
    Debug.Trace("ERROR: Actor is None")
    Return
  EndIf
  
  If akTarget == None
    Debug.Trace("ERROR: Target is None")
    Return
  EndIf
  
  If akActor.IsDead()
    Debug.Trace("ERROR: Actor is dead")
    Return
  EndIf
  
  ; Safe to proceed
  akActor.MoveTo(akTarget)
  Debug.Trace("Actor moved safely")
EndFunction
```

### Boundary Checking

Prevent out-of-bounds access:

```papyrus
Scriptname BoundaryCheckingExample extends ObjectReference

Int[] myArray = new Int[100]

Function SafeArrayAccess(Int aiIndex)
  If aiIndex < 0 || aiIndex >= myArray.Length
    Debug.Trace("ERROR: Index " + aiIndex + " out of bounds")
    Return -1
  EndIf
  
  Return myArray[aiIndex]
EndFunction

Function SafeIteration()
  Int i = 0
  While i < myArray.Length
    ProcessElement(myArray[i])
    i += 1
  EndWhile
EndFunction
```

---

## Error Recovery

### Graceful Degradation

Degrade functionality instead of crashing:

```papyrus
Scriptname GracefulDegradationExample extends ObjectReference

Function AttemptOptimalPath()
  If CanUseOptimalPath()
    Debug.Trace("Using optimal path")
    DoOptimalPath()
  Else
    Debug.Trace("Optimal path unavailable, using fallback")
    DoFallbackPath()
  EndIf
EndFunction

Function CanUseOptimalPath()
  ; Check if requirements met
  Return TargetLocation != None
EndFunction

Function DoOptimalPath()
  Debug.Trace("Optimal path: Direct route")
EndFunction

Function DoFallbackPath()
  Debug.Trace("Fallback path: Alternate route")
EndFunction
```

### Recovery Attempts

Try recovery before giving up:

```papyrus
Scriptname RecoveryAttemptsExample extends ObjectReference

Int Property MaxRetries = 3 Auto

Function ReliableOperation()
  Int attempts = 0
  
  While attempts < MaxRetries
    If AttemptOperation()
      Debug.Trace("Operation succeeded")
      Return
    EndIf
    
    attempts += 1
    Debug.Trace("Attempt " + attempts + " failed, retrying...")
    Utility.Wait(0.5)
  EndWhile
  
  Debug.Trace("ERROR: Operation failed after " + MaxRetries + " attempts")
EndFunction

Function AttemptOperation()
  Try
    DoRiskyWork()
    Return True
  Catch
    Debug.Trace("ERROR: Operation failed")
    Return False
  EndTry
EndFunction

Function DoRiskyWork()
  ; May throw error
  Debug.Trace("Attempting work...")
EndFunction
```

---

## Troubleshooting Guide

### Diagnosing Issues

Systematic troubleshooting:

```papyrus
Scriptname DiagnosticsExample extends ObjectReference

Function DiagnoseIssue()
  Debug.Trace("=== DIAGNOSTICS START ===")
  
  ; Check environment
  CheckEnvironment()
  
  ; Check resources
  CheckResources()
  
  ; Check state
  CheckState()
  
  ; Check functionality
  CheckFunctionality()
  
  Debug.Trace("=== DIAGNOSTICS END ===")
EndFunction

Function CheckEnvironment()
  Debug.Trace("Environment Check:")
  Debug.Trace("  Game loaded: " + Game.IsGameRunning())
  Debug.Trace("  Player exists: " + (Game.GetPlayer() != None))
  Debug.Trace("  Current location: " + Game.GetPlayer().GetCurrentLocation().GetName())
EndFunction

Function CheckResources()
  Debug.Trace("Resource Check:")
  Debug.Trace("  Required quest: " + (MyQuest != None))
  Debug.Trace("  Target actor: " + (TargetActor != None))
  Debug.Trace("  Target location: " + (TargetLocation != None))
EndFunction

Function CheckState()
  Debug.Trace("State Check:")
  Debug.Trace("  Quest running: " + MyQuest.IsRunning())
  Debug.Trace("  Quest stage: " + MyQuest.GetCurrentStageID())
  Debug.Trace("  Module active: " + IsActive())
EndFunction

Function CheckFunctionality()
  Debug.Trace("Functionality Check:")
  Debug.Trace("  Test function A: " + TestFunctionA())
  Debug.Trace("  Test function B: " + TestFunctionB())
  Debug.Trace("  Test function C: " + TestFunctionC())
EndFunction

Function TestFunctionA()
  Return "OK"
EndFunction

Function TestFunctionB()
  Return "OK"
EndFunction

Function TestFunctionC()
  Return "OK"
EndFunction
```

### Log Analysis

Analyze debug output:

```papyrus
Scriptname LogAnalysisExample extends ObjectReference

; Common log patterns and their meanings:

; Pattern 1: Property not set
; "ERROR: Property MyQuest is not set"
; Solution: Set property in Creation Kit

; Pattern 2: None reference
; "ERROR: GetRef() returned None"
; Solution: Add None checks

; Pattern 3: Array bounds
; "ERROR: Index out of bounds: 10 (array length is 5)"
; Solution: Add boundary checking

; Pattern 4: Type mismatch
; "ERROR: Cannot cast Actor to Weapon"
; Solution: Verify type before casting

Function AnalyzeLogs()
  Debug.Trace("Analyzing recent logs for patterns...")
  
  ; Look for error patterns
  ; Count occurrences
  ; Identify root cause
EndFunction
```

---

## Debugging Strategies

### Incremental Testing

Test in small increments:

```papyrus
Scriptname IncrementalTestingExample extends ObjectReference

Function InitializeWithTests()
  Debug.Trace("Stage 1: Basic setup")
  If !StageOne()
    Return
  EndIf
  
  Debug.Trace("Stage 2: Load resources")
  If !StageTwo()
    Return
  EndIf
  
  Debug.Trace("Stage 3: Configure systems")
  If !StageThree()
    Return
  EndIf
  
  Debug.Trace("Initialization complete")
EndFunction

Function StageOne()
  Try
    Debug.Trace("  Initializing basic components")
    Return True
  Catch
    Debug.Trace("  ERROR in stage 1")
    Return False
  EndTry
EndFunction

Function StageTwo()
  Try
    Debug.Trace("  Loading resources")
    Return True
  Catch
    Debug.Trace("  ERROR in stage 2")
    Return False
  EndTry
EndFunction

Function StageThree()
  Try
    Debug.Trace("  Configuring systems")
    Return True
  Catch
    Debug.Trace("  ERROR in stage 3")
    Return False
  EndTry
EndFunction
```

### Isolation Testing

Test components independently:

```papyrus
Scriptname IsolationTestingExample extends ObjectReference

; Test individual components without dependencies

Function TestActor()
  Debug.Trace("Testing actor functionality...")
  
  Actor testActor = PlaceAtMe(BaseActor)
  
  If testActor == None
    Debug.Trace("  FAIL: Could not create actor")
    Return
  EndIf
  
  testActor.MoveTo(Self)
  Debug.Trace("  PASS: Actor created and moved")
  
  testActor.Delete()
EndFunction

Function TestInventory()
  Debug.Trace("Testing inventory functionality...")
  
  Actor player = Game.GetPlayer()
  Int startCount = player.GetItemCount(TestItem)
  
  player.AddItem(TestItem, 10)
  
  Int endCount = player.GetItemCount(TestItem)
  
  If endCount == startCount + 10
    Debug.Trace("  PASS: Inventory test successful")
  Else
    Debug.Trace("  FAIL: Inventory test failed")
  EndIf
EndFunction
```

---

## Stack Trace Analysis

### Reading Stack Traces

```
PAPYRUS STACK TRACE:
  [MyScript "MyObject" <00012345>]
    Call stack:
      [OnInit] <- where error occurred
        > [Initialize]
          > [LoadResources]
            > [GetResource] <- returned None
            
Error: None reference error in Initialize
```

**What this means**:
1. Error in `MyScript` script
2. Called from `OnInit` event
3. Which called `Initialize` function
4. Which called `LoadResources` function
5. Which called `GetResource` function
6. Which returned None (invalid reference)

**Fix**:
```papyrus
Function GetResource()
  If MyResource == None
    Debug.Trace("ERROR: Resource not found")
    Return None
  EndIf
  
  Return MyResource
EndFunction

Function LoadResources()
  MyResource = GetResource()
  
  If MyResource == None
    Debug.Trace("ERROR: Failed to load resources")
    Return  ; Early exit instead of continuing
  EndIf
  
  DoMoreWork()
EndFunction
```

---

## Common Issues and Solutions

### Issue: Script Not Running

**Symptoms**:
- Functions don't execute
- Events don't trigger

**Diagnosis**:
```papyrus
Function Diagnose()
  ; Add tracing
  Debug.Trace("Script initialized")
  
  ; Check if running
  If GetState() == "default" || GetState() == "Running"
    Debug.Trace("Script is running")
  Else
    Debug.Trace("Script not running: " + GetState())
  EndIf
EndFunction
```

**Solutions**:
- Check quest is started (for quest scripts)
- Check object is enabled
- Check script is compiled
- Check for script errors

### Issue: Performance Problems

**Symptoms**:
- FPS drops
- Game stutters
- Lag spikes

**Diagnosis**:
```papyrus
Function DiagnosePerformance()
  Float start = Utility.GetCurrentGameTime()
  
  DoWork()
  
  Float elapsed = Utility.GetCurrentGameTime() - start
  
  If elapsed > 0.05
    Debug.Trace("WARNING: Slow operation took " + elapsed + " seconds")
  EndIf
EndFunction
```

**Solutions**:
- Cache frequently accessed values
- Reduce loop iterations
- Move heavy work to timers
- Use LOD systems

### Issue: Memory Leaks

**Symptoms**:
- Memory usage grows over time
- Game slows down progressively
- Eventually crashes

**Diagnosis**:
```papyrus
Function DiagnoseMemoryLeak()
  Debug.Trace("Array size before: " + MyArray.Length)
  
  MyArray.InsertAt(NewObject, MyArray.Length)
  
  Debug.Trace("Array size after: " + MyArray.Length)
EndFunction
```

**Solutions**:
- Clear arrays properly
- Delete spawned objects
- Unregister events
- Remove references

---

## Best Practices

### 1. Fail Fast
```papyrus
; Good: Early validation
Function DoWork(Actor akActor)
  If akActor == None
    Return
  EndIf
  
  ; Continue with valid data
EndFunction

; Bad: Proceed with invalid data
Function DoWork(Actor akActor)
  ContinueWithMaybeInvalidData()
EndFunction
```

### 2. Be Specific with Errors
```papyrus
; Good: Clear error messages
Debug.Trace("ERROR: Could not load quest MyQuest (FormID 0x12345)")

; Bad: Vague messages
Debug.Trace("ERROR: Failed")
```

### 3. Use Try-Catch for Risky Operations
```papyrus
; Good: Handle expected errors
Try
  RiskyOperation()
Catch
  HandleError()
EndTry

; Bad: No error handling
RiskyOperation()
```

### 4. Log Assumptions
```papyrus
; Good: Document expectations
Function ProcessArray()
  ; Assuming MyArray is initialized
  If MyArray == None
    Debug.Trace("ERROR: MyArray not initialized")
    Return
  EndIf
  
  Int i = 0
  While i < MyArray.Length
    ProcessElement(MyArray[i])
    i += 1
  EndWhile
EndFunction
```

---

## Related Resources

- **COMMON_SCRIPTING_PATTERNS_GUIDE.md**: Error handling patterns
- **PAPYRUS_PROFILER_AND_DEBUGGER_GUIDE.md**: Debugging tools
- **PERFORMANCE_OPTIMIZATION_GUIDE.md**: Performance troubleshooting

---

## Quick Reference

| Error | Cause | Solution |
|-------|-------|----------|
| **Null Reference** | Accessing None | Add None check |
| **Array Bounds** | Invalid index | Check bounds |
| **Type Mismatch** | Invalid cast | Verify type |
| **Property Not Set** | Missing property | Set in editor |
| **Stack Overflow** | Infinite recursion | Fix logic |
| **Memory Leak** | Unreleased resources | Clean up |
| **Slow Script** | Inefficient code | Optimize |
