# Workshop & Settlement Scripting Guide

## Overview

The Workshop system enables player settlement building, object crafting, and resource management. It's used for Settlements, Workshops, and player-buildable environments.

**Key Concepts**:
- **Workshop**: Settlement management hub
- **Workshop Objects**: Buildable items
- **Workbenches**: Crafting stations
- **Resources**: Settlement materials
- **Ownership**: Settlement assignment

---

## Workshop Fundamentals

### What is a Workshop?

A **Workshop** is:
- Central point for settlement management
- Container for resources and built objects
- Reference point for settlement systems
- Quest-tied location management

### Workshop Types

| Type | Purpose | Example |
|------|---------|---------|
| **Settlement** | Player settlement | Sanctuary Hills |
| **Workshop** | Crafting location | Chem Lab |
| **Workbench** | Item crafting | Chemistry Station |
| **Industrial** | Resource production | Water Purifier |
| **Defense** | Protection building | Guard Post |

---

## Workshop Management

### Getting Workshop Reference

```papyrus
Scriptname WorkshopScript extends ObjectReference

; Get workshop of current object
Workshop Property MyWorkshop Auto

Event OnInit()
  MyWorkshop = GetWorkshop()
  
  If MyWorkshop != None
    Debug.Trace("Workshop: " + MyWorkshop.GetName())
  EndIf
EndEvent

Function FindNearbyWorkshop()
  Workshop workshop = FindNearestWorkshop()
  
  If workshop != None
    Debug.Trace("Found workshop: " + workshop.GetName())
  EndIf
EndFunction
```

### Workshop Properties

```papyrus
Scriptname WorkshopPropertyScript extends ObjectReference

Workshop Property CurrentWorkshop Auto

Function GetWorkshopData()
  If CurrentWorkshop == None
    Return
  EndIf
  
  ; Get workshop owner
  Int ownerId = CurrentWorkshop.GetOwnerId()
  Debug.Trace("Workshop owned by: " + ownerId)
  
  ; Check workshop state
  Bool isActive = CurrentWorkshop.IsWorkshopActive()
  Debug.Trace("Workshop active: " + isActive)
  
  ; Get location
  Location loc = CurrentWorkshop.GetLocation()
  Debug.Trace("Location: " + loc.GetName())
EndFunction
```

---

## Workshop Objects

### Object Types

```papyrus
Scriptname WorkshopObjectTypes extends ObjectReference

; Different workshop object categories
Keyword Property WorkshopObject_Housing Auto
Keyword Property WorkshopObject_Defense Auto
Keyword Property WorkshopObject_Production Auto
Keyword Property WorkshopObject_Decoration Auto
Keyword Property WorkshopObject_Structure Auto

Function ClassifyObject(ObjectReference akObject)
  If akObject.HasKeyword(WorkshopObject_Housing)
    Debug.Trace("Housing object")
  ElseIf akObject.HasKeyword(WorkshopObject_Defense)
    Debug.Trace("Defense object")
  ElseIf akObject.HasKeyword(WorkshopObject_Production)
    Debug.Trace("Production object")
  ElseIf akObject.HasKeyword(WorkshopObject_Decoration)
    Debug.Trace("Decoration object")
  EndIf
EndFunction
```

### Placing Objects

```papyrus
Scriptname PlaceWorkshopObject extends ObjectReference

Workshop Property TargetWorkshop Auto
ObjectReference Property BuildingTemplate Auto

Function PlaceObject(Float afX, Float afY, Float afZ)
  If TargetWorkshop == None
    Return
  EndIf
  
  ; Place object at workshop
  ObjectReference placed = PlaceAtMe(BuildingTemplate)
  
  If placed != None
    placed.MoveTo(TargetWorkshop, afX, afY, afZ)
    TargetWorkshop.AddWorkshopObject(placed)
    Debug.Trace("Object placed in workshop")
  EndIf
EndFunction

Function PlacePrebuiltStructure()
  ObjectReference house = BuildingTemplate.PlaceAtMe(1)
  TargetWorkshop.AddWorkshopObject(house)
  Debug.Trace("Prebuilt structure added")
EndFunction
```

### Removing Objects

```papyrus
Scriptname RemoveWorkshopObject extends ObjectReference

Workshop Property TargetWorkshop Auto

Function RemoveObject(ObjectReference akObject)
  If TargetWorkshop != None && akObject != None
    TargetWorkshop.RemoveWorkshopObject(akObject)
    akObject.Delete()
    Debug.Trace("Object removed from workshop")
  EndIf
EndFunction

Function ClearWorkshop()
  ; Remove all placed objects
  ; Implementation depends on workshop architecture
  Debug.Trace("Workshop cleared")
EndFunction
```

---

## Resources and Production

### Resource Management

```papyrus
Scriptname ResourceManagement extends ObjectReference

Workshop Property MyWorkshop Auto

; Common resources
String[] ResourceNames = new String[8]

Event OnInit()
  ResourceNames[0] = "Wood"
  ResourceNames[1] = "Steel"
  ResourceNames[2] = "Copper"
  ResourceNames[3] = "Aluminum"
  ResourceNames[4] = "Concrete"
  ResourceNames[5] = "Glass"
  ResourceNames[6] = "Rubber"
  ResourceNames[7] = "Food"
EndEvent

Function CheckResources()
  If MyWorkshop == None
    Return
  EndIf
  
  ; Check current resources
  Debug.Trace("Workshop resources:")
  
  Int i = 0
  While i < ResourceNames.Length
    ; Implementation would depend on workshop resource system
    Debug.Trace("  " + ResourceNames[i] + ": [amount]")
    i += 1
  EndWhile
EndFunction
```

### Food and Water Production

```papyrus
Scriptname FoodProductionScript extends ObjectReference

Workshop Property TargetWorkshop Auto

Float Property FoodProductionRate = 1.0 Auto
Float Property WaterProductionRate = 1.0 Auto

Event OnInit()
  StartTimer(1.0)  ; Check production every second
EndEvent

Event OnTimer(Int aiTimerID)
  ProduceFood()
  ProduceWater()
  
  StartTimer(1.0)
EndEvent

Function ProduceFood()
  If TargetWorkshop != None
    ; Food production logic
    Debug.Trace("Producing food: " + FoodProductionRate)
  EndIf
EndFunction

Function ProduceWater()
  If TargetWorkshop != None
    ; Water production logic
    Debug.Trace("Producing water: " + WaterProductionRate)
  EndIf
EndFunction
```

### Resource Storage

```papyrus
Scriptname ResourceStorageScript extends ObjectReference

Workshop Property TargetWorkshop Auto

Function GetStorageCapacity()
  If TargetWorkshop == None
    Return 0
  EndIf
  
  ; Get total storage capacity
  ; Depends on workshop architecture
  Int capacity = 1000  ; Example
  Return capacity
EndFunction

Function GetCurrentStorage()
  If TargetWorkshop == None
    Return 0
  EndIf
  
  ; Sum of all stored resources
  Int current = 0
  Return current
EndFunction

Function IsStorageFull()
  Return GetCurrentStorage() >= GetStorageCapacity()
EndFunction
```

---

## Workbenches and Crafting

### Workbench Types

```papyrus
Scriptname WorkbenchScript extends ObjectReference

; Workbench categories
Keyword Property Workbench_Armor Auto
Keyword Property Workbench_Weapons Auto
Keyword Property Workbench_Chemistry Auto
Keyword Property Workbench_Cooking Auto
Keyword Property Workbench_Power Auto

Function IdentifyWorkbench()
  If HasKeyword(Workbench_Armor)
    Debug.Trace("Armor workbench")
  ElseIf HasKeyword(Workbench_Weapons)
    Debug.Trace("Weapons workbench")
  ElseIf HasKeyword(Workbench_Chemistry)
    Debug.Trace("Chemistry workbench")
  ElseIf HasKeyword(Workbench_Cooking)
    Debug.Trace("Cooking workbench")
  EndIf
EndFunction
```

### Crafting Integration

```papyrus
Scriptname WorkbenchCraftingScript extends ObjectReference

Workshop Property TargetWorkshop Auto

Function EnableCrafting(String asCraftingType)
  If TargetWorkshop != None
    ; Enable crafting at workbench
    Debug.Trace("Crafting enabled: " + asCraftingType)
  EndIf
EndFunction

Function LimitCrafting(String asCraftingType)
  If TargetWorkshop != None
    ; Restrict crafting type
    Debug.Trace("Crafting limited: " + asCraftingType)
  EndIf
EndFunction

Function CheckCraftingRequirements(String asRecipe)
  If TargetWorkshop != None
    Bool canCraft = VerifyResources(asRecipe)
    Debug.Trace("Can craft " + asRecipe + ": " + canCraft)
  EndIf
EndFunction

Function VerifyResources(String asRecipe)
  ; Check if enough resources exist
  Return True  ; Placeholder
EndFunction
```

---

## Settlement Management

### Settlement Happiness

```papyrus
Scriptname SettlementHappinessScript extends Quest

Workshop Property Settlement Auto

Float Property CurrentHappiness = 50.0 Auto

Event OnUpdate()
  UpdateHappiness()
  StartTimer(60.0)  ; Update every 60 seconds
EndEvent

Event OnTimer(Int aiTimerID)
  UpdateHappiness()
  StartTimer(60.0)
EndEvent

Function UpdateHappiness()
  If Settlement == None
    Return
  EndIf
  
  Float foodProvided = GetFoodProduction()
  Float waterProvided = GetWaterProduction()
  Float defenseLevel = GetDefenseLevel()
  Float populationCount = GetPopulation()
  
  ; Calculate happiness
  CurrentHappiness += (foodProvided * 0.1)
  CurrentHappiness += (waterProvided * 0.05)
  CurrentHappiness += (defenseLevel * 0.1)
  
  ; Limit bounds
  If CurrentHappiness > 100.0
    CurrentHappiness = 100.0
  EndIf
  
  If CurrentHappiness < 0.0
    CurrentHappiness = 0.0
  EndIf
  
  Debug.Trace("Settlement happiness: " + CurrentHappiness)
EndFunction

Function GetFoodProduction()
  Return 10.0  ; Placeholder
EndFunction

Function GetWaterProduction()
  Return 5.0  ; Placeholder
EndFunction

Function GetDefenseLevel()
  Return 20.0  ; Placeholder
EndFunction

Function GetPopulation()
  Return 5.0  ; Placeholder
EndFunction
```

### Settlement Quests

```papyrus
Scriptname SettlementQuestScript extends Quest

Workshop Property TargetSettlement Auto

Event OnQuestInit()
  If TargetSettlement != None
    Debug.Trace("Settlement quest started: " + TargetSettlement.GetName())
    AssignSettlementLeader()
  EndIf
EndEvent

Function AssignSettlementLeader()
  If TargetSettlement == None
    Return
  EndIf
  
  ; Assign quest-specific leader
  Debug.Trace("Settlement leader assigned")
EndFunction

Function CheckSettlementStatus()
  If TargetSettlement != None
    Location loc = TargetSettlement.GetLocation()
    Bool isUnderAttack = TargetSettlement.IsUnderAttack()
    
    If isUnderAttack
      Debug.Trace("Settlement under attack!")
      HandleAttack()
    EndIf
  EndIf
EndFunction

Function HandleAttack()
  Debug.Trace("Defending settlement")
EndFunction
```

---

## Advanced Workshop Patterns

### Dynamic Settlement Building

```papyrus
Scriptname DynamicSettlementBuilding extends ObjectReference

Workshop Property TargetWorkshop Auto

Function BuildStructures(String asStructureType, Int aiCount)
  If TargetWorkshop == None
    Return
  EndIf
  
  Int i = 0
  While i < aiCount
    PlaceStructure(asStructureType)
    i += 1
  EndWhile
  
  Debug.Trace("Built " + aiCount + " " + asStructureType + " structures")
EndFunction

Function PlaceStructure(String asType)
  ; Determine structure template
  ObjectReference template = GetStructureTemplate(asType)
  
  If template != None
    ; Find valid placement
    ObjectReference newStructure = PlaceAtMe(template)
    TargetWorkshop.AddWorkshopObject(newStructure)
  EndIf
EndFunction

Function GetStructureTemplate(String asType)
  If asType == "House"
    Return GetFormFromFile(0x00012349, "MyMod.esp") as ObjectReference
  ElseIf asType == "Farm"
    Return GetFormFromFile(0x0001234A, "MyMod.esp") as ObjectReference
  ElseIf asType == "Defense"
    Return GetFormFromFile(0x0001234B, "MyMod.esp") as ObjectReference
  EndIf
  
  Return None
EndFunction
```

### Workshop Defense System

```papyrus
Scriptname WorkshopDefenseScript extends ObjectReference

Workshop Property TargetWorkshop Auto

Int Property DefenseRating = 0 Auto

Function AddDefense(Int aiDefensePoints)
  DefenseRating += aiDefensePoints
  Debug.Trace("Defense increased to: " + DefenseRating)
  
  If DefenseRating > 100
    DefenseRating = 100
  EndIf
EndFunction

Function RemoveDefense(Int aiDefensePoints)
  DefenseRating -= aiDefensePoints
  
  If DefenseRating < 0
    DefenseRating = 0
  EndIf
  
  Debug.Trace("Defense lowered to: " + DefenseRating)
EndFunction

Function CheckDefenseLevel()
  If DefenseRating < 20
    Debug.Trace("Settlement dangerously undefended!")
    SendWarningToPlayer()
  EndIf
EndFunction

Function SendWarningToPlayer()
  Game.GetPlayer().ShowMessage(DefenseWarningMessage)
EndFunction
```

### Resource Trading

```papyrus
Scriptname ResourceTradingScript extends ObjectReference

Workshop Property SourceWorkshop Auto
Workshop Property TargetWorkshop Auto

Function TradeResources(String asResourceType, Int aiAmount)
  If SourceWorkshop == None || TargetWorkshop == None
    Return
  EndIf
  
  ; Transfer resources
  Debug.Trace("Trading " + aiAmount + " " + asResourceType)
  
  RemoveResourceFromSource(asResourceType, aiAmount)
  AddResourceToTarget(asResourceType, aiAmount)
EndFunction

Function RemoveResourceFromSource(String asResource, Int aiAmount)
  Debug.Trace("Removed " + aiAmount + " " + asResource)
EndFunction

Function AddResourceToTarget(String asResource, Int aiAmount)
  Debug.Trace("Added " + aiAmount + " " + asResource)
EndFunction

Function EstimateTradeTime()
  ; Calculate travel time between workshops
  Float distance = SourceWorkshop.GetDistance(TargetWorkshop)
  Float travelTime = distance / 200.0  ; Assume ~200 units/second
  Return travelTime
EndFunction
```

---

## Best Practices

### 1. Always Validate Workshop Reference
```papyrus
; Good
If TargetWorkshop != None
  TargetWorkshop.AddWorkshopObject(akObject)
EndIf

; Bad
TargetWorkshop.AddWorkshopObject(akObject)
```

### 2. Clean Up Objects
```papyrus
; Good
Function RemoveAllObjects()
  Int count = GetWorkshopObjectCount()
  
  Int i = count - 1
  While i >= 0
    ObjectReference obj = GetWorkshopObject(i)
    RemoveObject(obj)
    i -= 1
  EndWhile
EndFunction

; Bad
; Objects left in workshop
```

### 3. Document Settlement Rules
```papyrus
Scriptname DocumentedSettlement extends Quest

; Settlement Rules:
; - Maximum population: 20
; - Happiness range: 0-100
; - Food production: 1 per minute
; - Water production: 0.5 per minute
; - Defense requirement: 1 per population

Property MaxPopulation = 20 Auto
Property MinHappiness = 0.0 Auto
Property MaxHappiness = 100.0 Auto
```

### 4. Use Keywords for Organization
```papyrus
; Good: Use keywords
Keyword Property SettlementKeyword Auto
Keyword Property DefenseObjectKeyword Auto

; Bad: Hardcoded checks
If GetName() == "Settlement A"
  ; Fragile
EndIf
```

### 5. Limit Workshop Modifications
```papyrus
; Good: Control scope
Function SafeModifyWorkshop()
  If TargetWorkshop.IsWorkshopActive()
    TargetWorkshop.AddWorkshopObject(akObject)
  EndIf
EndFunction

; Bad: Uncontrolled modifications
Function RiskyModifyWorkshop()
  TargetWorkshop.AddWorkshopObject(akObject)
EndFunction
```

---

## Related Resources

- **QUEST_SCRIPTING_GUIDE.md**: Quest system integration
- **PAPYRUS_FUNCTION_REFERENCE_INDEX.md**: Workshop functions
- **CREATION_KIT_RESOURCES_INDEX.md**: Workshop documentation

---

## Quick Reference

| Task | Function |
|------|----------|
| Get workshop | `GetWorkshop()` |
| Add object to workshop | `AddWorkshopObject(ObjectReference akObject)` |
| Remove object from workshop | `RemoveWorkshopObject(ObjectReference akObject)` |
| Check if workshop active | `IsWorkshopActive()` |
| Get workshop location | `GetLocation()` |
| Check if under attack | `IsUnderAttack()` |
| Get workshop objects | `GetWorkshopObjectList()` |
| Get workshop resources | Workshop resource functions |
