# Custom Events Guide

## Overview

Custom events allow scripts to communicate with each other without direct references. They enable loose coupling, modularity, and flexible inter-script communication in Papyrus.

**Key Concepts**:
- **Custom Events**: User-defined event types
- **Event Registration**: Subscribing to events
- **Event Sending**: Triggering events
- **Loose Coupling**: Scripts communicate indirectly
- **Event Cleanup**: Proper unregistration

---

## Custom Event Fundamentals

### What Are Custom Events?

Custom events are **script-defined events** that other scripts can listen for:

```papyrus
; Sender script
Scriptname EventSender extends ObjectReference

Function TriggerMyCustomEvent()
  SendCustomEvent("OnMyCustomEvent")
  Debug.Trace("Custom event sent!")
EndFunction

; Receiver script
Scriptname EventReceiver extends ObjectReference

Event OnInit()
  RegisterForCustomEvent(EventSender, "OnMyCustomEvent")
EndEvent

Event OnMyCustomEvent()
  Debug.Trace("Received custom event!")
EndEvent
```

### Advantages of Custom Events

| Advantage | Example |
|-----------|---------|
| **Loose Coupling** | Sender doesn't know receivers |
| **Modularity** | Easy to add/remove listeners |
| **Scalability** | Many receivers, one sender |
| **Flexibility** | Dynamic communication |
| **Maintainability** | Clear event contracts |

---

## Registering for Custom Events

### Basic Registration

```papyrus
Scriptname CustomEventListener extends ObjectReference

ObjectReference Property EventSender Auto

Event OnInit()
  If EventSender != None
    RegisterForCustomEvent(EventSender, "OnMajorEvent")
    Debug.Trace("Registered for custom event")
  EndIf
EndEvent

Event OnMajorEvent()
  Debug.Trace("Major event received!")
EndEvent
```

### Multiple Event Registration

```papyrus
Scriptname MultiEventListener extends ObjectReference

ObjectReference Property EventSource Auto

Event OnInit()
  RegisterForCustomEvent(EventSource, "OnEventA")
  RegisterForCustomEvent(EventSource, "OnEventB")
  RegisterForCustomEvent(EventSource, "OnEventC")
  Debug.Trace("Registered for multiple events")
EndEvent

Event OnEventA()
  Debug.Trace("Event A received")
EndEvent

Event OnEventB()
  Debug.Trace("Event B received")
EndEvent

Event OnEventC()
  Debug.Trace("Event C received")
EndEvent
```

### Conditional Registration

```papyrus
Scriptname ConditionalEventListener extends ObjectReference

ObjectReference Property EventSource Auto
Bool Property IsActive = False Auto

Event OnInit()
  If IsActive
    RegisterForCustomEvent(EventSource, "OnActiveEvent")
  EndIf
EndEvent

Function ActivateListener()
  If !IsActive
    IsActive = True
    RegisterForCustomEvent(EventSource, "OnActiveEvent")
    Debug.Trace("Listener activated")
  EndIf
EndFunction

Function DeactivateListener()
  If IsActive
    IsActive = False
    UnregisterForCustomEvent(EventSource, "OnActiveEvent")
    Debug.Trace("Listener deactivated")
  EndIf
EndFunction
```

---

## Sending Custom Events

### Simple Event Sending

```papyrus
Scriptname SimpleEventSender extends ObjectReference

Function FireEvent()
  SendCustomEvent("OnSimpleEvent")
  Debug.Trace("Simple event sent")
EndFunction

Event OnActivate(ObjectReference akActionRef)
  FireEvent()
EndEvent
```

### Remote Events

For actors that may not be loaded:

```papyrus
Scriptname RemoteEventSender extends Quest

Event OnQuestInit()
  Actor farAwayActor = GetFormFromFile(0x00012345, "MyMod.esp") as Actor
  
  If farAwayActor != None
    SendCustomEvent(farAwayActor, "OnDistantEvent")
    Debug.Trace("Remote event sent")
  EndIf
EndEvent
```

### Event Patterns

```papyrus
Scriptname EventPatterns extends Quest

; Pattern 1: Simple notification
Function NotifyListeners()
  SendCustomEvent("OnStatusChanged")
EndFunction

; Pattern 2: Regular broadcasts
Function BroadcastEverySecond()
  StartTimer(1.0)
EndFunction

Event OnTimer(Int aiTimerID)
  SendCustomEvent("OnSecondPassed")
  StartTimer(1.0)
EndEvent

; Pattern 3: Conditional events
Event OnQuestStageSet(Int aiStageID, Int aiItemID)
  If aiStageID == 100
    SendCustomEvent("OnQuestComplete")
  EndIf
EndEvent
```

---

## Custom Event Architecture

### Event Hub Pattern

Create a central event dispatcher:

```papyrus
Scriptname EventHub extends ObjectReference

; Central dispatcher for all custom events
Function FireEventA()
  SendCustomEvent("OnEventA")
EndFunction

Function FireEventB()
  SendCustomEvent("OnEventB")
EndFunction

Function FireEventC()
  SendCustomEvent("OnEventC")
EndFunction

Event OnInit()
  Debug.Trace("Event hub initialized")
EndEvent
```

### Multiple Listeners

```papyrus
; Hub sends events
Scriptname EventHub extends Quest

Event OnQuestInit()
  Debug.Trace("Hub started")
EndEvent

Function TriggerSystemUpdate()
  SendCustomEvent("OnSystemUpdate")
  Debug.Trace("System update event sent")
EndFunction

; Listener 1 receives event
Scriptname SystemMonitor extends ObjectReference

EventHub Property Hub Auto

Event OnInit()
  RegisterForCustomEvent(Hub, "OnSystemUpdate")
EndEvent

Event OnSystemUpdate()
  Debug.Trace("Monitor: Received system update")
  UpdateMonitoring()
EndEvent

Function UpdateMonitoring()
  ; Monitor-specific logic
EndFunction

; Listener 2 receives same event
Scriptname SystemLogger extends ObjectReference

EventHub Property Hub Auto

Event OnInit()
  RegisterForCustomEvent(Hub, "OnSystemUpdate")
EndEvent

Event OnSystemUpdate()
  Debug.Trace("Logger: Received system update")
  LogEvent()
EndEvent

Function LogEvent()
  ; Logger-specific logic
EndFunction
```

### Broadcast Pattern

```papyrus
Scriptname BroadcasterQuest extends Quest

; Broadcast to all listeners
Function BroadcastPlayerState(Int playerState)
  SendCustomEvent("OnPlayerStateChanged")
  Debug.Trace("Player state broadcast: " + playerState)
EndFunction

Event OnUpdate()
  ; Periodically broadcast
  Int currentState = GetPlayerCurrentState()
  
  If currentState != LastPlayerState
    BroadcastPlayerState(currentState)
    LastPlayerState = currentState
  EndIf
EndEvent
```

---

## Advanced Custom Events

### Event Handler Validation

```papyrus
Scriptname ValidatedEventReceiver extends ObjectReference

ObjectReference Property EventSource Auto
Bool Property IsListening = False Auto

Event OnInit()
  If EventSource != None
    RegisterForCustomEvent(EventSource, "OnValidEvent")
    IsListening = True
    Debug.Trace("Validated receiver ready")
  Else
    Debug.Trace("ERROR: Event source not set!")
  EndIf
EndEvent

Event OnValidEvent()
  If !IsListening
    Debug.Trace("ERROR: Received event while not listening")
    Return
  EndIf
  
  HandleEvent()
EndEvent

Function HandleEvent()
  Debug.Trace("Event handled successfully")
EndFunction
```

### Error Handling in Events

```papyrus
Scriptname RobustEventReceiver extends ObjectReference

ObjectReference Property EventSource Auto

Event OnInit()
  If EventSource != None
    RegisterForCustomEvent(EventSource, "OnRiskyEvent")
  EndIf
EndEvent

Event OnRiskyEvent()
  If !ValidateState()
    Debug.Trace("ERROR: Invalid state for event handling")
    Return
  EndIf
  
  If !ExecuteSafely()
    Debug.Trace("ERROR: Event handling failed")
    Return
  EndIf
  
  Debug.Trace("Event handled successfully")
EndEvent

Function ValidateState()
  Return IsLoaded() && HasRequiredData()
EndFunction

Function ExecuteSafely()
  Try
    DoWork()
    Return True
  Catch
    Debug.Trace("ERROR: Exception in event handler")
    Return False
  EndTry
EndFunction

Function DoWork()
  ; Event-specific logic with error checking
EndFunction
```

### Event Chaining

```papyrus
Scriptname EventChain extends ObjectReference

; Event 1 triggers
Scriptname EventChainStarter extends ObjectReference

Event OnActivate(ObjectReference akActionRef)
  SendCustomEvent("OnChainStart")
  Debug.Trace("Chain started")
EndEvent

; Event 2 triggered by Event 1
Scriptname EventChainMiddle extends ObjectReference

ObjectReference Property Starter Auto
ObjectReference Property Finalizer Auto

Event OnInit()
  RegisterForCustomEvent(Starter, "OnChainStart")
EndEvent

Event OnChainStart()
  Debug.Trace("Chain middle: Processing")
  DoWork()
  SendCustomEvent(Finalizer, "OnChainFinish")
EndEvent

; Event 3 triggered by Event 2
Scriptname EventChainFinalizer extends ObjectReference

Event OnChainFinish()
  Debug.Trace("Chain finalized")
  CompleteChain()
EndEvent
```

---

## Event Cleanup

### Proper Unregistration

```papyrus
Scriptname ProperCleanup extends ObjectReference

ObjectReference Property EventSource Auto

Event OnInit()
  RegisterForCustomEvent(EventSource, "OnMyEvent")
EndEvent

Event OnDelete()
  UnregisterForCustomEvent(EventSource, "OnMyEvent")
  Debug.Trace("Unregistered from custom event")
EndEvent

Event OnMyEvent()
  Debug.Trace("Event received")
EndEvent
```

### Cleanup Strategies

**Cleanup on Quest Shutdown**:
```papyrus
Scriptname QuestEventListener extends Quest

Event OnQuestInit()
  RegisterForCustomEvent(EventSource, "OnEvent")
EndEvent

Event OnQuestShutdown()
  UnregisterForCustomEvent(EventSource, "OnEvent")
EndEvent
```

**Cleanup on Disable**:
```papyrus
Scriptname DisableableListener extends ObjectReference

ObjectReference Property EventSource Auto

Event OnInit()
  RegisterForCustomEvent(EventSource, "OnEvent")
EndEvent

Event OnDisable()
  UnregisterForCustomEvent(EventSource, "OnEvent")
EndEvent
```

**Cleanup All**:
```papyrus
Scriptname CompleteCleanup extends ObjectReference

Event OnQuestShutdown()
  UnregisterForAllCustomEvents()
  Debug.Trace("All custom events unregistered")
EndEvent
```

---

## Common Event Patterns

### Quest Event Broadcasting

```papyrus
Scriptname QuestEventBroadcaster extends Quest

; Notify all listeners when quest stage changes
Event OnStageSet(Int aiStageID, Int aiItemID)
  SendCustomEvent("OnQuestProgressed")
  Debug.Trace("Quest stage: " + aiStageID)
EndEvent

Event OnQuestInit()
  SendCustomEvent("OnQuestStarted")
EndEvent

Event OnQuestShutdown()
  SendCustomEvent("OnQuestEnded")
EndEvent
```

### System State Notification

```papyrus
Scriptname SystemEventNotifier extends Quest

Bool Property SystemOnline = False Auto
Bool Property LastSystemState = False Auto

Event OnUpdate()
  If SystemOnline != LastSystemState
    LastSystemState = SystemOnline
    
    If SystemOnline
      SendCustomEvent("OnSystemOnline")
    Else
      SendCustomEvent("OnSystemOffline")
    EndIf
  EndIf
EndEvent
```

### Player Action Broadcasting

```papyrus
Scriptname PlayerActionBroadcaster extends Quest

Event OnPlayerLoadGame()
  SendCustomEvent("OnPlayerLoaded")
EndEvent

Event OnPlayerFastTravel()
  SendCustomEvent("OnPlayerTravelStarted")
EndEvent

Event OnPlayerSwimming(Bool abSwimming)
  If abSwimming
    SendCustomEvent("OnPlayerSwimmingStart")
  Else
    SendCustomEvent("OnPlayerSwimmingStop")
  EndIf
EndEvent
```

---

## Best Practices

### 1. Use Meaningful Event Names
```papyrus
; Good: Clear intent
SendCustomEvent("OnObjectiveComplete")
SendCustomEvent("OnPlayerEquippedWeapon")
SendCustomEvent("OnEnemyDefeated")

; Bad: Vague names
SendCustomEvent("OnEvent")
SendCustomEvent("OnUpdate")
SendCustomEvent("OnChange")
```

### 2. Always Clean Up
```papyrus
; Good: Always unregister
Event OnDelete()
  UnregisterForCustomEvent(EventSource, "OnMyEvent")
EndEvent

; Bad: Leak listeners
Event OnDelete()
  ; Listener still active!
EndEvent
```

### 3. Validate Before Sending
```papyrus
; Good: Check preconditions
Function SafeSendEvent()
  If EventSource != None && IsReady()
    SendCustomEvent("OnEvent")
  EndIf
EndFunction

; Bad: Send without checking
Function UnsafeSendEvent()
  SendCustomEvent("OnEvent")
EndFunction
```

### 4. Document Events
```papyrus
Scriptname DocumentedEventSender extends ObjectReference

; Events sent by this script:
; - OnConfigLoaded: Fired when configuration is loaded
; - OnProcessingStarted: Fired when processing begins
; - OnProcessingComplete: Fired when processing ends

Function LoadConfig()
  SendCustomEvent("OnConfigLoaded")
EndFunction
```

### 5. Use Hub Pattern for Organization
```papyrus
; Centralize all events in one place
Scriptname EventHub extends Quest

Function OnGameStart()
  SendCustomEvent("OnGameStart")
EndFunction

Function OnGameEnd()
  SendCustomEvent("OnGameEnd")
EndFunction

Function OnDataUpdated()
  SendCustomEvent("OnDataUpdated")
EndFunction
```

---

## Related Resources

- **PAPYRUS_EVENTS_AND_ACTIONS_GUIDE.md**: Built-in events
- **COMMON_SCRIPTING_PATTERNS_GUIDE.md**: Communication patterns
- **CREATION_KIT_RESOURCES_INDEX.md**: Event resources

---

## Quick Reference

| Task | Function |
|------|----------|
| Register for custom event | `RegisterForCustomEvent(ObjectReference akSource, String asEventName)` |
| Unregister from custom event | `UnregisterForCustomEvent(ObjectReference akSource, String asEventName)` |
| Send custom event | `SendCustomEvent(String asEventName)` |
| Send remote custom event | `SendCustomEvent(ObjectReference akTarget, String asEventName)` |
| Unregister from all | `UnregisterForAllCustomEvents()` |
| Event declaration | `Event OnCustomEventName()` |
| Event handler | `Function OnCustomEventName() ... EndFunction` |
