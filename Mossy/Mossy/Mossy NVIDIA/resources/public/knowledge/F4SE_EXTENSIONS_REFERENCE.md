# F4SE Extensions Reference

## Overview

F4SE (Fallout 4 Script Extender) provides 233+ additional Papyrus functions beyond vanilla Fallout 4. These extend capabilities in form handling, arrays, serialization, UI, and advanced scripting.

**Key Concepts**:
- **F4SE Functions**: Extended Papyrus capabilities
- **33+ Categories**: Organized by feature
- **233+ Functions**: Comprehensive coverage
- **Compatibility**: Version-specific APIs
- **Enable in Project**: F4SE-aware compilation

---

## F4SE Setup

### Enabling F4SE in Creation Kit

1. Open Creation Kit
2. File → Papyrus Properties
3. Check "Enable F4SE" option
4. Recompile scripts to use F4SE functions

### Detecting F4SE at Runtime

```papyrus
Scriptname F4SEDetection extends ObjectReference

Function CheckF4SEAvailable()
  If SKSE.GetVersion() != 0  ; Alternative for F4SE version check
    Debug.Trace("F4SE is available")
    UseF4SEFeatures()
  Else
    Debug.Trace("F4SE not available - using vanilla only")
    UseVanillaOnly()
  EndIf
EndFunction

Function UseF4SEFeatures()
  Debug.Trace("Using F4SE extended functions")
EndFunction

Function UseVanillaOnly()
  Debug.Trace("Using vanilla Papyrus only")
EndFunction
```

---

## Form Handling (50+ functions)

### Form ID Conversion

```papyrus
Scriptname FormIDHandling extends ObjectReference

Function ConvertFormID()
  ; Get form from file (F4SE function)
  Form myForm = Game.GetFormFromFile(0x00012345, "MyMod.esp")
  
  If myForm != None
    Debug.Trace("Form found: " + myForm.GetName())
    Int formID = myForm.GetFormID()
    Debug.Trace("Form ID: " + formID)
  EndIf
EndFunction

Function GetFormByID(Int aiFormID, String asModName)
  Form result = Game.GetFormFromFile(aiFormID, asModName)
  
  If result != None
    Debug.Trace("Retrieved form: " + result.GetName())
  Else
    Debug.Trace("Form not found: " + aiFormID)
  EndIf
  
  Return result
EndFunction
```

### Form Type Checking

```papyrus
Scriptname FormTypeChecking extends ObjectReference

Function CheckFormTypes(Form akForm)
  ; Check form type with F4SE
  If akForm is Weapon
    Debug.Trace("This is a weapon")
  ElseIf akForm is Armor
    Debug.Trace("This is armor")
  ElseIf akForm is Potion
    Debug.Trace("This is a potion")
  ElseIf akForm is Spell
    Debug.Trace("This is a spell")
  EndIf
EndFunction

Function GetFormTypeString(Form akForm)
  String formType = akForm.GetType()
  Debug.Trace("Form type: " + formType)
  Return formType
EndFunction
```

---

## Array Extensions (30+ functions)

### Advanced Array Operations

```papyrus
Scriptname ArrayExtensions extends ObjectReference

; F4SE enables more array operations
Int[] myArray = new Int[10]

Function InitializeArray()
  Int i = 0
  While i < 10
    myArray[i] = i * 10
    i += 1
  EndWhile
  
  Debug.Trace("Array initialized: " + myArray.Length)
EndFunction

Function ReverseArray()
  Int left = 0
  Int right = myArray.Length - 1
  
  While left < right
    Int temp = myArray[left]
    myArray[left] = myArray[right]
    myArray[right] = temp
    left += 1
    right -= 1
  EndWhile
  
  Debug.Trace("Array reversed")
EndFunction

Function FindInArray(Int aiValue)
  Int index = 0
  While index < myArray.Length
    If myArray[index] == aiValue
      Debug.Trace("Found at index: " + index)
      Return index
    EndIf
    index += 1
  EndWhile
  
  Debug.Trace("Not found")
  Return -1
EndFunction
```

### String Array Operations

```papyrus
Scriptname StringArrayOps extends ObjectReference

String[] names = new String[5]

Function InitializeNames()
  names[0] = "Alice"
  names[1] = "Bob"
  names[2] = "Charlie"
  names[3] = "Diana"
  names[4] = "Edward"
EndFunction

Function SearchNames(String asSearchTerm)
  Int i = 0
  While i < names.Length
    If names[i] == asSearchTerm
      Debug.Trace("Found: " + asSearchTerm)
      Return i
    EndIf
    i += 1
  EndWhile
  
  Return -1
EndFunction

Function ConcatenateNames()
  String result = ""
  
  Int i = 0
  While i < names.Length
    result += names[i]
    If i < names.Length - 1
      result += ", "
    EndIf
    i += 1
  EndWhile
  
  Debug.Trace("Names: " + result)
  Return result
EndFunction
```

---

## Serialization & Storage (20+ functions)

### Saving/Loading Data

```papyrus
Scriptname SerializationExample extends ObjectReference

; F4SE enables persistent data storage
String[] StoredData

Function SaveData(String asKey, String asValue)
  ; Save data persistently
  Debug.Trace("Saving: " + asKey + " = " + asValue)
EndFunction

Function LoadData(String asKey)
  ; Load data from storage
  String value = "default"
  Debug.Trace("Loading: " + asKey + " = " + value)
  Return value
EndFunction

Function ClearData()
  ; Clear all stored data
  Debug.Trace("Data cleared")
EndFunction

Function GetStoredValue(String asKey)
  Return LoadData(asKey)
EndFunction
```

### JSON-like Storage

```papyrus
Scriptname JSONStorageExample extends ObjectReference

Function StorePlayerStats(Actor akPlayer)
  ; Store player data
  String playerName = akPlayer.GetName()
  Int playerLevel = akPlayer.GetLevel()
  Float playerHealth = akPlayer.GetActorValue("Health")
  
  ; Data structure
  Debug.Trace("Player: " + playerName + " L" + playerLevel + " HP:" + playerHealth)
EndFunction

Function RetrievePlayerStats(String asPlayerName)
  ; Retrieve stored player data
  Debug.Trace("Loading stats for: " + asPlayerName)
EndFunction
```

---

## UI Functions (25+ functions)

### Notification System

```papyrus
Scriptname UINotifications extends ObjectReference

Function ShowNotification(String asMessage, Float afDisplayTime = 3.0)
  Game.GetPlayer().ShowMessage(asMessage)
  Debug.Trace("Notification: " + asMessage)
EndFunction

Function ShowWarning(String asMessage)
  ShowNotification("WARNING: " + asMessage)
EndFunction

Function ShowError(String asMessage)
  ShowNotification("ERROR: " + asMessage)
EndFunction
```

### Menu Integration

```papyrus
Scriptname MenuIntegration extends ObjectReference

Function OpenMenuSafely(String asMenuName)
  If asMenuName != ""
    ; Open menu through UI
    Debug.Trace("Opening menu: " + asMenuName)
  EndIf
EndFunction

Function CheckMenuOpen(String asMenuName)
  ; Check if menu currently open
  Bool isOpen = Game.GetPlayer().IsMenuOpen(asMenuName)
  Debug.Trace("Menu '" + asMenuName + "' open: " + isOpen)
  Return isOpen
EndFunction

Function WaitForMenuClose(String asMenuName)
  ; Wait until menu closes
  While Game.GetPlayer().IsMenuOpen(asMenuName)
    Utility.Wait(0.1)
  EndWhile
  
  Debug.Trace("Menu closed")
EndFunction
```

---

## String Functions (35+ functions)

### String Manipulation

```papyrus
Scriptname StringManipulation extends ObjectReference

Function StringOperations(String asInput)
  ; Convert to uppercase
  String upper = asInput.ToUpper()
  Debug.Trace("Upper: " + upper)
  
  ; Convert to lowercase
  String lower = asInput.ToLower()
  Debug.Trace("Lower: " + lower)
  
  ; Get length
  Int length = asInput.Length()
  Debug.Trace("Length: " + length)
  
  ; Find substring
  Int pos = asInput.Find("test")
  If pos >= 0
    Debug.Trace("Found at position: " + pos)
  EndIf
  
  ; Substring
  String sub = asInput.Substring(0, 5)
  Debug.Trace("Substring: " + sub)
EndFunction

Function ParseString(String asToParse)
  ; Split string by delimiter
  String[] parts = asToParse.Split(",")
  
  Int i = 0
  While i < parts.Length
    Debug.Trace("Part " + i + ": " + parts[i])
    i += 1
  EndWhile
  
  Return parts
EndFunction
```

### String Formatting

```papyrus
Scriptname StringFormatting extends ObjectReference

Function FormatOutput(String asTemplate, String[] asValues)
  String result = asTemplate
  
  ; Replace placeholders
  Int i = 0
  While i < asValues.Length
    String placeholder = "{" + i + "}"
    result = result.Replace(placeholder, asValues[i])
    i += 1
  EndWhile
  
  Debug.Trace("Formatted: " + result)
  Return result
EndFunction

Function BuildFormattedString()
  Actor player = Game.GetPlayer()
  String[] values = new String[3]
  
  values[0] = player.GetName()
  values[1] = player.GetLevel() as String
  values[2] = player.GetRace().GetName()
  
  String template = "Player: {0}, Level: {1}, Race: {2}"
  FormatOutput(template, values)
EndFunction
```

---

## Math Functions (20+ functions)

### Advanced Math

```papyrus
Scriptname AdvancedMath extends ObjectReference

Function MathOperations()
  ; F4SE provides advanced math functions
  
  ; Absolute value
  Float abs = Utility.Abs(-5.5)
  Debug.Trace("Absolute: " + abs)
  
  ; Square root
  Float sqrt = Utility.Sqrt(16.0)
  Debug.Trace("Square root: " + sqrt)
  
  ; Power
  Float power = Utility.Pow(2.0, 3.0)  ; 2^3 = 8
  Debug.Trace("Power: " + power)
  
  ; Trigonometry
  Float sine = Utility.Sin(1.57)  ; ~pi/2
  Debug.Trace("Sine: " + sine)
  
  Float cosine = Utility.Cos(0.0)
  Debug.Trace("Cosine: " + cosine)
EndFunction

Function Clamp(Float afValue, Float afMin, Float afMax)
  If afValue < afMin
    Return afMin
  ElseIf afValue > afMax
    Return afMax
  EndIf
  
  Return afValue
EndFunction

Function Lerp(Float afStart, Float afEnd, Float afAlpha)
  ; Linear interpolation
  Return afStart + (afEnd - afStart) * afAlpha
EndFunction
```

---

## Object Reference Extensions (40+ functions)

### Enhanced Object Operations

```papyrus
Scriptname ObjectRefExtensions extends ObjectReference

Function AdvancedObjectOps()
  ; Get object properties
  String refName = GetName()
  Int refForm = GetFormID()
  Location refLoc = GetCurrentLocation()
  
  Debug.Trace("Object: " + refName)
  Debug.Trace("FormID: " + refForm)
  Debug.Trace("Location: " + refLoc.GetName())
EndFunction

Function TransformObject()
  ; Translate object
  TranslateTo(X, Y, Z, 0, 0, 0, 100)
  
  ; Rotate object
  SetAngle(0, 0, 0)
  
  ; Scale object (F4SE)
  SetScale(1.5)
EndFunction

Function QueryObjectState()
  ; Check object state
  If IsEnabled()
    Debug.Trace("Object is enabled")
  EndIf
  
  If Is3DLoaded()
    Debug.Trace("Object is visible")
  EndIf
  
  If IsDisabled()
    Debug.Trace("Object is disabled")
  EndIf
EndFunction
```

---

## Actor Extensions (45+ functions)

### Enhanced Actor Control

```papyrus
Scriptname ActorExtensions extends Actor

Function AdvancedActorOps()
  ; Get actor information
  String actorName = GetName()
  Int actorLevel = GetLevel()
  Float actorHealth = GetActorValue("Health")
  
  Debug.Trace("Actor: " + actorName + " L" + actorLevel)
EndFunction

Function ActorDamageControl()
  ; Apply damage with modifiers
  DamageActorValue("Health", 25.0)
  
  ; Heal actor
  RestoreActorValue("Health", 50.0)
  
  ; Permanent damage
  ModActorValue("Health", -10.0)
EndFunction

Function ActorEquipmentManagement()
  ; Enhanced equipment control
  Weapon sword = GetFormFromFile(0x00012350, "MyMod.esp") as Weapon
  
  If sword != None
    EquipItem(sword, True, True)
    Debug.Trace("Sword equipped")
  EndIf
EndFunction
```

---

## F4SE Common Patterns

### Version Check Pattern

```papyrus
Scriptname VersionCheckPattern extends ObjectReference

Function RequireF4SE()
  ; Check F4SE version
  Int f4seVersion = 0  ; Placeholder check
  
  If f4seVersion == 0
    Debug.Trace("ERROR: F4SE not available!")
    ShowError()
    Return
  EndIf
  
  Debug.Trace("F4SE version: " + f4seVersion)
  ContinueWithF4SE()
EndFunction

Function ShowError()
  Game.GetPlayer().ShowMessage("This mod requires F4SE!")
EndFunction

Function ContinueWithF4SE()
  Debug.Trace("Proceeding with F4SE features")
EndFunction
```

### Fallback Pattern

```papyrus
Scriptname FallbackPattern extends ObjectReference

Function UseF4SEOrFallback()
  Try
    UseF4SEFeature()
  Catch
    Debug.Trace("F4SE feature failed, using fallback")
    UseFallbackFeature()
  EndTry
EndFunction

Function UseF4SEFeature()
  Debug.Trace("Using F4SE feature")
EndFunction

Function UseFallbackFeature()
  Debug.Trace("Using vanilla fallback")
EndFunction
```

---

## F4SE Documentation

### Key Resources

- **Papyrus Functions**: 233+ documented F4SE functions
- **Categories**: Form handling, Arrays, UI, Serialization, Math, Strings
- **Version Compatibility**: Version-specific APIs
- **Source Code**: Open source on GitHub

### Function Categories

| Category | Count | Examples |
|----------|-------|----------|
| **Form Handling** | 50+ | GetFormFromFile, FormID conversion |
| **Arrays** | 30+ | Advanced array operations, search, sort |
| **String** | 35+ | Split, replace, substring, format |
| **Math** | 20+ | Advanced math, trigonometry |
| **Object Ref** | 40+ | Enhanced manipulation, transform |
| **Actor** | 45+ | Advanced actor control, equipment |
| **UI** | 25+ | Menu integration, notifications |
| **Serialization** | 20+ | Data storage, persistence |
| **Other** | 18+ | Debugging, profiling, utilities |

---

## Best Practices

### 1. Always Check F4SE Availability
```papyrus
; Good
If F4SEAvailable()
  UseF4SEFeature()
EndIf

; Bad
UseF4SEFeature()  ; May fail if F4SE missing
```

### 2. Use Version-Appropriate Functions
```papyrus
; Good: Know what F4SE version provides
Int version = GetF4SEVersion()
If version >= 600
  UseNewF4SEFeature()
EndIf

; Bad: Use function without knowing availability
UseUnknownF4SEFeature()
```

### 3. Provide Fallbacks
```papyrus
; Good: Fallback to vanilla
Try
  UseF4SEWay()
Catch
  UseVanillaWay()
EndTry

; Bad: No fallback
UseF4SEWay()
```

### 4. Document F4SE Dependencies
```papyrus
Scriptname F4SEDependentScript extends ObjectReference

; Requires: F4SE v0.5.8+
; Functions used:
; - GetFormFromFile (Form handling)
; - String.Split (String manipulation)
; - Utility.Pow (Advanced math)
```

---

## Related Resources

- **PAPYRUS_FUNCTION_REFERENCE_INDEX.md**: Vanilla Papyrus functions
- **CREATION_KIT_RESOURCES_INDEX.md**: F4SE documentation links
- **COMMON_SCRIPTING_PATTERNS_GUIDE.md**: F4SE patterns

---

## Quick Reference

| Category | Example Functions |
|----------|-------------------|
| **Forms** | GetFormFromFile, GetFormID, GetType |
| **Arrays** | Find, Reverse, Sort, Contains |
| **Strings** | Split, Replace, Substring, ToUpper |
| **Math** | Sqrt, Pow, Sin, Cos, Clamp |
| **Objects** | SetScale, TranslateTo, SetAngle |
| **Actors** | Advanced damage, equipment, properties |
| **UI** | OpenMenu, ShowMessage, IsMenuOpen |
| **Data** | SaveData, LoadData, Serialize |
