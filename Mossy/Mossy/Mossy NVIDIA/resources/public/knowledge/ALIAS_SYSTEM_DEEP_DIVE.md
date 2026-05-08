# Alias System Deep Dive

## Overview

Quest aliases are one of the most powerful features in Fallout 4 modding. They enable dynamic actor/object references, quest linking, and flexible gameplay mechanics without hardcoding references.

**Key Concepts**:
- **Quest Alias**: Dynamic reference within quest
- **Reference Alias**: Points to single actor/object
- **RefCollectionAlias**: Points to multiple objects
- **Location Alias**: Points to location
- **Alias Filling**: Populating references
- **Linked References**: Object associations

---

## Alias Types

### Reference Alias

Points to **single actor or object**:

```papyrus
Scriptname ReferenceAliasExample extends ReferenceAlias

Event OnLoad()
  ObjectReference ref = GetRef()
  
  If ref != None
    Debug.Trace("Alias loaded: " + ref.GetName())
  EndIf
EndEvent

Function GetTargetActor()
  Return GetRef() as Actor
EndFunction

Function GetTargetObject()
  Return GetRef()
EndFunction
```

### Reference Collection Alias

Points to **multiple objects**:

```papyrus
Scriptname CollectionAliasExample extends RefCollectionAlias

Event OnLoad()
  Int count = GetCount()
  Debug.Trace("Collection loaded with " + count + " refs")
  
  Int i = 0
  While i < count
    ObjectReference ref = GetAt(i)
    Debug.Trace("  [" + i + "]: " + ref.GetName())
    i += 1
  EndWhile
EndEvent

Function IterateAll()
  Int i = 0
  While i < GetCount()
    ObjectReference ref = GetAt(i)
    ref.SetAlert(False)
    i += 1
  EndWhile
EndFunction
```

### Location Alias

Points to **location**:

```papyrus
Scriptname LocationAliasExample extends LocationAlias

Event OnLoad()
  Location loc = GetLocation()
  
  If loc != None
    Debug.Trace("Location alias loaded: " + loc.GetName())
  EndIf
EndEvent

Function CheckPlayerInLocation()
  Location loc = GetLocation()
  
  If loc != None && Game.GetPlayer().IsInLocation(loc)
    Debug.Trace("Player in location!")
    Return True
  EndIf
  
  Return False
EndFunction
```

---

## Filling Aliases

### Manual Filling

```papyrus
Scriptname ManualAliasFilling extends Quest

ReferenceAlias Property TargetAlias Auto

Event OnQuestInit()
  ; Fill with specific reference
  Actor specificActor = GetFormFromFile(0x00012345, "MyMod.esp") as Actor
  TargetAlias.ForceRefTo(specificActor)
  Debug.Trace("Alias manually filled")
EndEvent

Function FillWithLinkedRef(ObjectReference akStartRef)
  ObjectReference linked = akStartRef.GetLinkedRef()
  
  If linked != None
    TargetAlias.ForceRefTo(linked)
    Debug.Trace("Alias filled with linked ref")
  EndIf
EndFunction
```

### Player Selection Filling

Allow player to pick the alias reference:

```papyrus
Scriptname PlayerSelectionFilling extends Quest

ReferenceAlias Property SelectedAlias Auto
Quest Property FillQuest Auto

Event OnQuestInit()
  ; Enable alias filling UI
  ; Player clicks object to select it
  Debug.Trace("Waiting for player to select target...")
EndEvent

Function OnPlayerSelected(ObjectReference akSelected)
  If akSelected != None
    SelectedAlias.ForceRefTo(akSelected)
    Debug.Trace("Player selected: " + akSelected.GetName())
    SetStage(20)
  EndIf
EndFunction
```

### Conditional Filling

```papyrus
Scriptname ConditionalAliasFilling extends Quest

ReferenceAlias Property TargetAlias Auto

Event OnQuestInit()
  FillAliasConditionally()
EndEvent

Function FillAliasConditionally()
  Actor player = Game.GetPlayer()
  
  ; Find best candidate
  If player.GetItemCount(Gold) > 100
    TargetAlias.ForceRefTo(GetExpensiveTarget())
    Debug.Trace("Rich player: Using expensive target")
  Else
    TargetAlias.ForceRefTo(GetCheapTarget())
    Debug.Trace("Poor player: Using cheap target")
  EndIf
EndFunction

Function GetExpensiveTarget()
  Return GetFormFromFile(0x00012346, "MyMod.esp") as ObjectReference
EndFunction

Function GetCheapTarget()
  Return GetFormFromFile(0x00012347, "MyMod.esp") as ObjectReference
EndFunction
```

---

## Working with Aliases

### Checking Alias State

```papyrus
Scriptname AliasStateChecking extends Quest

ReferenceAlias Property MyAlias Auto

Function CheckAlias()
  If MyAlias.GetRef() == None
    Debug.Trace("Alias not filled")
    Return
  EndIf
  
  ObjectReference ref = MyAlias.GetRef()
  
  If ref.Is3DLoaded()
    Debug.Trace("Alias loaded in world")
  Else
    Debug.Trace("Alias not visible")
  EndIf
  
  If ref.IsDisabled()
    Debug.Trace("Alias is disabled")
  Else
    Debug.Trace("Alias is enabled")
  EndIf
EndFunction
```

### Collection Alias Operations

```papyrus
Scriptname CollectionAliasOperations extends RefCollectionAlias

Function DoToAll(String operation)
  Int i = 0
  
  While i < GetCount()
    ObjectReference ref = GetAt(i)
    
    If operation == "Enable"
      ref.Enable()
    ElseIf operation == "Disable"
      ref.Disable()
    ElseIf operation == "Delete"
      ref.Delete()
    EndIf
    
    i += 1
  EndWhile
  
  Debug.Trace("Applied '" + operation + "' to all aliases")
EndFunction

Function RemoveAliasRef(ObjectReference akRef)
  Int index = Find(akRef)
  
  If index >= 0
    RemoveRef(akRef)
    Debug.Trace("Removed ref from collection")
  EndIf
EndFunction

Function FindAliasRefByName(String asName)
  Int i = 0
  
  While i < GetCount()
    ObjectReference ref = GetAt(i)
    
    If ref.GetName() == asName
      Debug.Trace("Found: " + asName)
      Return ref
    EndIf
    
    i += 1
  EndWhile
  
  Debug.Trace("Not found: " + asName)
  Return None
EndFunction
```

---

## Linked References

Linked references connect related objects:

```papyrus
Scriptname LinkedReferenceExample extends ObjectReference

ObjectReference Property LinkedDoor Auto
ObjectReference Property LinkedKey Auto
ObjectReference Property LinkedQuestItem Auto

Event OnInit()
  ; Objects with linked refs can trigger related behavior
  SetLinkedRef(LinkedDoor)
EndEvent

Function GetAssociatedObject()
  Return GetLinkedRef()
EndFunction

Function ChainedLinks()
  ObjectReference current = Self
  
  ; Follow chain of linked refs
  While current != None
    Debug.Trace("Linked: " + current.GetName())
    current = current.GetLinkedRef()
  EndWhile
EndFunction
```

### Using Linked Refs in Quests

```papyrus
Scriptname LinkedRefQuestExample extends Quest

ReferenceAlias Property DoorAlias Auto
ReferenceAlias Property KeyAlias Auto

Event OnQuestInit()
  ; Quest gets primary reference
  DoorAlias.ForceRefTo(DoorRef)
  
  ; Quest gets secondary reference via link
  ObjectReference linkedKey = DoorRef.GetLinkedRef()
  KeyAlias.ForceRefTo(linkedKey)
  
  Debug.Trace("Quest initialized with linked refs")
EndEvent
```

---

## Alias Events

### Reference Alias Events

```papyrus
Scriptname ReferenceAliasEvents extends ReferenceAlias

Event OnLoad()
  ObjectReference ref = GetRef()
  Debug.Trace("Alias loaded: " + ref.GetName())
EndEvent

Event OnUnload()
  ObjectReference ref = GetRef()
  Debug.Trace("Alias unloaded: " + ref.GetName())
EndEvent

Event OnDeath(Actor akDeadActor)
  Debug.Trace("Aliased actor died: " + akDeadActor.GetName())
  GetOwningQuest().SetStage(200)  ; Quest failed
EndEvent

Event OnActivate(ObjectReference akActionRef)
  Debug.Trace("Alias activated by: " + akActionRef.GetName())
  GetOwningQuest().SetStage(50)  ; Progress quest
EndEvent

Event OnEquipped(Actor akActor)
  Debug.Trace("Aliased item equipped")
EndEvent

Event OnUnequipped(Actor akActor)
  Debug.Trace("Aliased item unequipped")
EndEvent
```

### Collection Alias Events

```papyrus
Scriptname CollectionAliasEvents extends RefCollectionAlias

Event OnLoad()
  Debug.Trace("Collection loaded with " + GetCount() + " refs")
EndEvent

Event OnUnload()
  Debug.Trace("Collection unloaded")
EndEvent

Event OnContainerChanged(ObjectReference akNewContainer, ObjectReference akOldContainer)
  Debug.Trace("Item moved between containers")
EndEvent
```

### Location Alias Events

```papyrus
Scriptname LocationAliasEvents extends LocationAlias

Event OnLoad()
  Debug.Trace("Location loaded: " + GetLocation().GetName())
EndEvent

Event OnUnload()
  Debug.Trace("Location unloaded")
EndEvent

Event OnLocationChange(Location akOldLoc, Location akNewLoc)
  Debug.Trace("Location changed")
EndEvent
```

---

## Advanced Alias Patterns

### Quest Linking with Aliases

```papyrus
Scriptname ParentQuest extends Quest

ReferenceAlias Property SharedTarget Auto

Event OnQuestInit()
  ; Fill alias with shared reference
  Actor target = Game.GetPlayer()
  SharedTarget.ForceRefTo(target)
  
  ; Start linked quest
  StartChildQuest()
EndEvent

Function StartChildQuest()
  Quest childQuest = Game.GetFormFromFile(0x00012348, "MyMod.esp") as Quest
  
  If childQuest != None
    childQuest.Start()
    Debug.Trace("Child quest started")
  EndIf
EndFunction

; Child quest accesses parent's alias
Scriptname ChildQuest extends Quest

Function AccessParentAlias()
  Quest parentQuest = GetLinkedQuest()
  ReferenceAlias shared = parentQuest.GetAlias(0) as ReferenceAlias
  
  If shared != None
    ObjectReference ref = shared.GetRef()
    Debug.Trace("Child accessing parent's alias: " + ref.GetName())
  EndIf
EndFunction
```

### Dynamic Alias Management

```papyrus
Scriptname DynamicAliasManagement extends Quest

RefCollectionAlias Property DynamicTargets Auto

Event OnQuestInit()
  DynamicTargets.Clear()
  PopulateDynamicTargets()
EndEvent

Function PopulateDynamicTargets()
  ; Find all actors of specific type
  ObjectReference[] foundActors = FindActorsOfType(EnemyBase)
  
  Int i = 0
  While i < foundActors.Length
    DynamicTargets.AddRef(foundActors[i])
    i += 1
  EndWhile
  
  Debug.Trace("Dynamic targets populated: " + DynamicTargets.GetCount())
EndFunction

Function RemoveDeadTargets()
  ; Clean up dead actors from collection
  Int i = DynamicTargets.GetCount() - 1
  
  While i >= 0
    Actor ref = DynamicTargets.GetAt(i) as Actor
    
    If ref != None && ref.IsDead()
      DynamicTargets.RemoveRef(ref)
    EndIf
    
    i -= 1
  EndWhile
EndFunction
```

### Alias as Quest Parameter

```papyrus
Scriptname AliasAsParameter extends Quest

ReferenceAlias Property ActionTarget Auto

; Pass alias to function
Function ProcessTarget()
  ProcessAliasReference(ActionTarget)
EndFunction

Function ProcessAliasReference(ReferenceAlias akAlias)
  ObjectReference ref = akAlias.GetRef()
  
  If ref != None
    ApplyEffect(ref)
    Debug.Trace("Processed: " + ref.GetName())
  EndIf
EndFunction

Function ApplyEffect(ObjectReference akRef)
  ; Apply quest-specific effect to reference
  akRef.SetOutfit(QuestOutfit)
  akRef.MoveTo(QuestLocation)
EndFunction
```

---

## Best Practices

### 1. Check Alias Before Use
```papyrus
; Good
If MyAlias.GetRef() != None
  MyAlias.GetRef().Enable()
EndIf

; Bad
MyAlias.GetRef().Enable()  ; May crash if alias empty
```

### 2. Clear Aliases on Quest End
```papyrus
; Good
Event OnQuestShutdown()
  MyAlias.Clear()
  MyCollection.Clear()
EndEvent

; Bad
Event OnQuestShutdown()
  ; Aliases still holding references
EndEvent
```

### 3. Use Meaningful Alias Names
```papyrus
; Good: In CK
ReferenceAlias Property QuestTarget Auto
ReferenceAlias Property NPCCompanion Auto
RefCollectionAlias Property EnemyGroup Auto

; Bad
ReferenceAlias Property Alias01 Auto
ReferenceAlias Property Alias02 Auto
```

### 4. Validate Before Filling
```papyrus
; Good
Function SafeFill(ObjectReference akRef)
  If akRef != None
    MyAlias.ForceRefTo(akRef)
  Else
    Debug.Trace("ERROR: Attempted to fill with None")
  EndIf
EndFunction

; Bad
Function UnsafeFill(ObjectReference akRef)
  MyAlias.ForceRefTo(akRef)
EndFunction
```

### 5. Use Collection for Groups
```papyrus
; Good: Use collection for multiple refs
RefCollectionAlias Property Targets Auto

Event OnQuestInit()
  Targets.AddRef(Actor1)
  Targets.AddRef(Actor2)
  Targets.AddRef(Actor3)
EndEvent

; Bad: Individual aliases for each
ReferenceAlias Property Target1 Auto
ReferenceAlias Property Target2 Auto
ReferenceAlias Property Target3 Auto
```

---

## Alias Workflow

### 1. Create Alias in Editor
- Right-click on Quest → Add Alias
- Choose alias type (Reference, Collection, Location)
- Set name and properties

### 2. Configure in Script
```papyrus
ReferenceAlias Property MyAlias Auto  ; Auto-fill in editor
```

### 3. Fill with Data
```papyrus
Event OnQuestInit()
  MyAlias.ForceRefTo(akSomeRef)
EndEvent
```

### 4. Use in Logic
```papyrus
Event OnStageSet(Int aiStageID, Int aiItemID)
  ObjectReference target = MyAlias.GetRef()
  
  If target != None
    ProcessTarget(target)
  EndIf
EndEvent
```

### 5. Clean Up
```papyrus
Event OnQuestShutdown()
  MyAlias.Clear()
EndEvent
```

---

## Related Resources

- **QUEST_SCRIPTING_GUIDE.md**: Quest system overview
- **PAPYRUS_FUNCTION_REFERENCE_INDEX.md**: Alias functions
- **CREATION_KIT_RESOURCES_INDEX.md**: Alias documentation

---

## Quick Reference

| Task | Function |
|------|----------|
| Get alias ref | `GetRef()` |
| Fill alias | `ForceRefTo(ObjectReference akRef)` |
| Clear alias | `Clear()` |
| Get collection count | `GetCount()` |
| Get collection item | `GetAt(Int aiIndex)` |
| Add to collection | `AddRef(ObjectReference akRef)` |
| Remove from collection | `RemoveRef(ObjectReference akRef)` |
| Find in collection | `Find(ObjectReference akRef)` |
| Get location | `GetLocation()` |
| Get owning quest | `GetOwningQuest()` |
