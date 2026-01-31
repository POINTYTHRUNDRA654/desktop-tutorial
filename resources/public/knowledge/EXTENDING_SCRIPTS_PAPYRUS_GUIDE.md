# Extending Scripts (Papyrus)

## Overview

**Script extending** is the practice of creating specialized scripts based on more general ones, allowing you to modify behavior without editing the original. This is a core object-oriented programming concept that promotes code reuse and maintainability.

**Basic Concept**: Take a script that almost does what you want, extend it, and override only the parts you need to change.

**Hierarchy**
- **Parent Scripts**: More general, foundational behavior
- **Child Scripts**: More specific, derived behavior
- Example: `Actor Script` extends `ObjectReference Script`, which extends `Form Script`

**Benefits**
- Code reuse: Inherit all parent functionality automatically
- Maintainability: Fix bugs in parent once; all children benefit
- Flexibility: Override specific behaviors without rewriting
- Clarity: Child script name implies its purpose and relationship

---

## Terminology

### Parent Script
The original, general-purpose script being extended. Contains base functionality that child scripts inherit.

**Characteristics**
- Can be extended by multiple child scripts
- Unmodified by child scripts (not affected by child changes)
- Provides the foundation that children build upon

### Child Script
A specialized script that extends a parent. Inherits all parent functionality and can override specific parts.

**Characteristics**
- Extends exactly one parent script
- Can override functions, events, and states from parent
- Cannot override properties or variables (they're inherited as-is)
- Can still call parent versions via `parent` keyword

### Inherit
When a child script **inherits**, it gains functionality from the parent without modifying it. Any function or event not explicitly defined in the child is inherited from the parent.

**Example**
```papyrus
Scriptname ParentScript
Function MyFunction()
  Debug.Trace("Parent version")
EndFunction

Scriptname ChildScript extends ParentScript
; ChildScript inherits MyFunction from ParentScript
; MyFunction automatically available without defining it
```

### Override
When a child script **overrides** a parent function/event, it replaces the parent version with its own. When that function/event is called on the child script, the child's version executes.

**Requirement**: Must match parent's signature (name, parameters, return type) exactly.

**Example**
```papyrus
Scriptname ParentScript
Function MyFunction()
  Debug.Trace("Parent version")
EndFunction

Scriptname ChildScript extends ParentScript
Function MyFunction()  ; Override: same signature as parent
  Debug.Trace("Child version")
EndFunction
```

**Result**
- Calling on child script: "Child version"
- Calling on parent script: "Parent version"

---

## How to Extend

### Basic Syntax

Add `extends <ParentScript>` after the scriptname declaration:

```papyrus
Scriptname MyChildScript extends MyParentScript
```

**Parts**
- `Scriptname`: Script declaration keyword
- `MyChildScript`: Name of your new child script
- `extends`: Keyword indicating inheritance
- `MyParentScript`: Name of the parent script to extend

### Simple Example

```papyrus
; Parent script: Generic trap behavior
Scriptname Trap

Function OnActivate()
  Debug.Trace("Trap triggered!")
EndFunction

Function DealDamage(Actor target)
  target.DamageValue(10)
EndFunction
```

```papyrus
; Child script: Specialized spike trap
Scriptname SpikeTrap extends Trap

; Relationship: SpikeTrap "is a" Trap
; Inherits OnActivate() and DealDamage() from Trap

Function DealDamage(Actor target)  ; Override parent version
  target.DamageValue(20)            ; Spikes deal more damage
EndFunction
```

**What SpikeTrap Gets**
- `OnActivate()` from Trap (inherited)
- `DealDamage()` overridden with custom version (20 damage instead of 10)

### Real-World Hierarchy

```
Form Script
  ├─ ObjectReference Script
  │   ├─ Actor Script
  │   │   ├─ Player (specialized player behavior)
  │   ├─ Furniture Script
  │   ├─ Door Script
  │   └─ Container Script
  └─ ActorBase Script
```

Each child inherits from its parent and can override/extend behavior.

---

## What an Extended Script Can Do

### Functions and Events

**Inheritance**: Child scripts automatically have all parent functions and events available.

**Override**: Child can redefine parent functions/events with same signature.

**Signature Must Match**
```papyrus
; Parent
Function MyFunction(int x, float y) returns bool
  ...
EndFunction

; Child - MUST match exactly
Function MyFunction(int x, float y) returns bool  ; Correct override
  ...
EndFunction

; This would NOT compile (different parameters)
; Function MyFunction(int x) returns bool
```

#### Override Example

```papyrus
Scriptname ParentScript

Function MyFunction()
  Debug.Trace("Parent MyFunction!")
EndFunction

Function MyOtherFunction()
  Debug.Trace("Parent MyOtherFunction!")
EndFunction


Scriptname ChildScript extends ParentScript

Function MyFunction()
  Debug.Trace("Child MyFunction!")
EndFunction
; MyOtherFunction is inherited, not overridden
```

**Behavior**
- `ChildScript.MyFunction()` → "Child MyFunction!"
- `ChildScript.MyOtherFunction()` → "Parent MyOtherFunction!"
- `ParentScript.MyFunction()` → "Parent MyFunction!"

#### Calling Parent Functions

Use the special `parent` keyword to call the parent version of a function from within the child script.

**Syntax**
```papyrus
parent.FunctionName(parameters)
```

**Important**: `parent` keyword only works on `self` (the current script); cannot call parent on different objects.

**Example**
```papyrus
Scriptname ParentScript

Function MyFunction()
  Debug.Trace("Parent MyFunction!")
EndFunction

Function Setup()
  Debug.Trace("Setting up...")
  MyFunction()
EndFunction


Scriptname ChildScript extends ParentScript

Function MyFunction()
  Debug.Trace("Child MyFunction!")
  parent.MyFunction()  ; Call parent version explicitly
EndFunction
```

**Output When Calling ChildScript.MyFunction()**
```
Child MyFunction!
Parent MyFunction!
```

#### Common Pattern: Minor Tweak + Parent

```papyrus
Scriptname ParentScript

Function DoHeavyWork()
  Debug.Trace("Doing heavy work...")
  ; ... lots of logic ...
EndFunction


Scriptname ChildScript extends ParentScript

Function DoHeavyWork()
  ; Minor customization before parent logic
  Debug.Trace("Child setup...")
  
  ; Call parent to do the main work
  parent.DoHeavyWork()
  
  ; Cleanup after parent logic
  Debug.Trace("Child cleanup...")
EndFunction
```

**Benefit**: Avoid duplicating parent logic; just add your customization around it.

---

### States

States in child scripts **merge** with parent states. Functions in states follow override rules.

**State Merging Rules**

| Scenario | Result |
|----------|--------|
| Parent has state, child does not | Parent functions in that state available |
| Child has state, parent does not | Child functions in that state available |
| Both have state with different functions | Both sets of functions available (merged) |
| Both have state with same function name | Child version overrides parent version |
| Parent has function in state, child does not | Parent version used |
| Child has function in state, parent does not | Child version used |
| Both have function in same state | Child version used (override) |

#### State Override Example

```papyrus
Scriptname ParentScript

State Active
  Function DoWork()
    Debug.Trace("Parent Active DoWork")
  EndFunction
EndState

State Inactive
  Function Wait()
    Debug.Trace("Parent Inactive Wait")
  EndFunction
EndState


Scriptname ChildScript extends ParentScript

State Active
  Function DoWork()
    Debug.Trace("Child Active DoWork")  ; Override parent
  EndFunction
  
  Function OnActivate()
    Debug.Trace("Child Active OnActivate")  ; New function
  EndFunction
EndState

; No Inactive state in child; parent's Inactive state available
```

**Behavior**
- `ChildScript` in `Active` state calls `DoWork()` → Child version
- `ChildScript` in `Active` state calls `OnActivate()` → Child's new function
- `ChildScript` in `Inactive` state calls `Wait()` → Parent version (inherited)

#### State Calling Parent

```papyrus
Scriptname ParentScript

State Active
  Function Activate()
    Debug.Trace("Parent Active Activate")
  EndFunction
EndState


Scriptname ChildScript extends ParentScript

State Active
  Function Activate()
    Debug.Trace("Child Active Activate")
    parent.Activate()  ; Call parent state function
  EndFunction
EndState
```

---

### Properties

Properties in parent scripts are **inherited** but **cannot be overridden** in child scripts. Child can read/use them, but not redefine them.

**Key Points**
- Child scripts automatically have access to parent properties
- Use inherited properties as if they were defined locally
- Attempting to override will cause compilation error
- Child can set property values normally

#### Property Inheritance Example

```papyrus
Scriptname ParentScript

Int Property Damage Auto
Float Property CooldownTime Auto
Bool Property IsEnabled Auto


Scriptname ChildScript extends ParentScript

Function DoDamage(Actor target)
  Debug.Trace("Damage property = " + Damage)
  target.DamageValue(Damage)  ; Use inherited property
EndFunction

Function SetupCooldown()
  Utility.Wait(CooldownTime)  ; Use inherited property
EndFunction
```

**What You Can Do**
- Read parent properties ✓
- Use in calculations ✓
- Pass to functions ✓
- Set new values ✓

**What You Cannot Do**
- Redefine/override properties ✗

```papyrus
; This will NOT compile:
Scriptname ChildScript extends ParentScript

Int Property Damage Auto  ; Error: Cannot override property
```

#### Property Usage Pattern

```papyrus
Scriptname BaseWeapon

Int Property BaseDamage Auto
Bool Property IsEquipped Auto

Function GetDamage()
  Return BaseDamage
EndFunction


Scriptname FireSword extends BaseWeapon

Function GetDamage()
  Int bonusDamage = 5
  Return BaseDamage + bonusDamage  ; Use inherited property
EndFunction

Event OnEquip(Actor akActor)
  Debug.Trace("Fire Sword equipped by " + akActor.GetName())
  Debug.Trace("Damage is " + GetDamage())
EndEvent
```

---

### Variables

Variables are **private** and cannot be inherited or accessed by other scripts (including parent and child). However, child scripts can declare variables with the same name as parent variables, which will **hide** (shadow) the parent variable in child scope.

**Key Points**
- Variables are script-private (scope isolation)
- Child declaring same-named variable hides parent's variable in child
- Parent and child functions each see their own variable
- Can lead to confusion; generally avoid shadowing

#### Variable Shadowing Example

```papyrus
Scriptname ParentScript

Int MyVar = 1

Function MyFunction()
  Debug.Trace("Parent MyVar = " + MyVar)  ; Uses parent's MyVar
EndFunction


Scriptname ChildScript extends ParentScript

String MyVar = "Hello World!"  ; Shadows parent's MyVar

Function MyFunction()
  Debug.Trace("Child MyVar = " + MyVar)   ; Uses child's MyVar
  parent.MyFunction()                      ; Parent sees its own MyVar
EndFunction
```

**Execution**
```
Calling ChildScript.MyFunction():
Child MyVar = Hello World!
Parent MyVar = 1
```

**Why This Happens**
- `ChildScript.MyFunction()` accesses child's `MyVar` ("Hello World!")
- `parent.MyFunction()` in parent sees parent's `MyVar` (1)
- Each script maintains its own variable scope

#### Best Practice

**Avoid shadowing** unless intentional. If parent and child both need a variable:

```papyrus
; Better: Different names
Scriptname ParentScript
Int BaseValue = 1

Scriptname ChildScript extends ParentScript
Int ChildValue = 5

Function Calculate()
  Return BaseValue + ChildValue  ; Clear which is which
EndFunction
```

---

## Complete Example: Weapon System

### Parent Script: Base Weapon

```papyrus
Scriptname BaseWeapon extends ObjectReference

Int Property BaseDamage = 10 Auto
Float Property AttackSpeed = 1.0 Auto
Bool Property IsEnchanted = False Auto

State Ready
  Function Equip(Actor owner)
    Debug.Trace(GetName() + " equipped by " + owner.GetName())
    GoToState("Armed")
  EndFunction
EndState

State Armed
  Function Unequip()
    Debug.Trace(GetName() + " unequipped")
    GoToState("Ready")
  EndFunction
  
  Function Strike(Actor target)
    Debug.Trace(GetName() + " strikes " + target.GetName())
    Int damage = CalculateDamage()
    target.DamageValue(damage)
  EndFunction
EndState

Function CalculateDamage()
  Int damage = BaseDamage
  If IsEnchanted
    damage = damage * 2
  EndIf
  Return damage
EndFunction

Function GetName()
  Return "Unknown Weapon"
EndFunction
```

### Child Script 1: Fire Sword

```papyrus
Scriptname FireSword extends BaseWeapon

Function GetName()
  Return "Fire Sword"
EndFunction

Function CalculateDamage()
  Int damage = parent.CalculateDamage()
  damage = damage + 5  ; Bonus fire damage
  Return damage
EndFunction

State Armed
  Function Strike(Actor target)
    Debug.Trace("Fire Sword burns " + target.GetName() + "!")
    parent.Strike(target)  ; Do base strike plus custom effect
    target.AddSpell(Flame_Rune)  ; Apply fire effect
  EndFunction
EndState
```

### Child Script 2: Frost Axe

```papyrus
Scriptname FrostAxe extends BaseWeapon

Float Property CooldownReduction = 0.8 Auto

Function GetName()
  Return "Frost Axe"
EndFunction

Function CalculateDamage()
  Int damage = BaseDamage * 2  ; Axes deal 2x base damage
  If IsEnchanted
    damage = damage + 10  ; Frost bonus
  EndIf
  Return damage
EndFunction

State Armed
  Function Strike(Actor target)
    Debug.Trace("Frost Axe freezes " + target.GetName() + "!")
    parent.Strike(target)
    target.DamageValue(5)  ; Extra frost damage
    Float reducedCooldown = AttackSpeed * CooldownReduction
    Utility.Wait(reducedCooldown)
  EndFunction
EndState
```

**Usage**
```papyrus
; Base weapon behavior
Weapon1 = CreateReference(BaseWeapon)
Weapon1.BaseDamage = 10
Weapon1.IsEnchanted = False
Weapon1.Strike(Enemy)  ; 10 damage

; Fire sword (specialized)
Weapon2 = CreateReference(FireSword)
Weapon2.BaseDamage = 10
Weapon2.IsEnchanted = False
Weapon2.Strike(Enemy)  ; 10 + 5 = 15 damage, plus fire effect

; Frost axe (specialized)
Weapon3 = CreateReference(FrostAxe)
Weapon3.BaseDamage = 10
Weapon3.IsEnchanted = True
Weapon3.Strike(Enemy)  ; (10 * 2 + 10) + 5 = 35 damage, reduced cooldown
```

---

## Best Practices

### 1. Keep Hierarchies Shallow
```papyrus
; Good: 2-3 levels deep
ObjectReference → Actor → Player
ObjectReference → Container → ChestContainer

; Avoid: Too deep
Base → Level1 → Level2 → Level3 → Level4
```

**Reason**: Deeper hierarchies are harder to debug and understand.

### 2. Override Only What You Need
```papyrus
; Good: Override only the specific function
Scriptname ChildScript extends ParentScript

Function CustomBehavior()
  Debug.Trace("Custom behavior")
  parent.CustomBehavior()  ; Call parent to avoid duplication
EndFunction

; Avoid: Rewriting parent logic
Scriptname BadChildScript extends ParentScript

Function CustomBehavior()
  ; Entire parent logic duplicated here
  ; If parent changes, this breaks
EndFunction
```

### 3. Document Inheritance
```papyrus
; Good: Clear documentation
Scriptname FireSword extends BaseWeapon
; Extends BaseWeapon with fire damage bonus and flame effect on strike.
; Overrides: CalculateDamage(), Strike()

Function CalculateDamage()
  ; Fire sword deals base damage + 5 fire bonus
  Int damage = parent.CalculateDamage()
  damage = damage + 5
  Return damage
EndFunction
```

### 4. Match Parent Signatures Exactly
```papyrus
; Parent signature
Function DoSomething(Int x, Float y) returns Bool
  Return x > y
EndFunction

; Child override - MUST match
Function DoSomething(Int x, Float y) returns Bool
  Debug.Trace("Child version")
  Return parent.DoSomething(x, y)
EndFunction

; This would NOT compile (different return type)
; Function DoSomething(Int x, Float y) returns Int
```

### 5. Avoid Variable Shadowing
```papyrus
; Parent
Scriptname ParentScript
Int Value = 1

; Child - Avoid shadowing
Scriptname BadChildScript extends ParentScript
Int Value = 5  ; Confusing! Hides parent's Value

; Better: Use different names
Scriptname GoodChildScript extends ParentScript
Int ChildValue = 5  ; Clear this is child-specific
```

### 6. Use States for Behavior Modes
```papyrus
; Parent provides base states
Scriptname Container extends ObjectReference
State Closed
  ; Closed behavior
EndState

State Open
  ; Open behavior
EndState

; Child extends with more states
Scriptname LinkedContainer extends Container
State Linked
  ; Special linked behavior
EndState
```

### 7. Test Inheritance Chain
```papyrus
; Test that child properly inherits
Function TestInheritance()
  MyChild child = CreateReference(MyChild)
  
  ; Test inherited function
  child.InheritedFunction()  ; Should work
  
  ; Test overridden function
  child.OverriddenFunction()  ; Should use child version
  
  ; Test parent function access
  child.parent.OverriddenFunction()  ; Should use parent version
EndFunction
```

---

## Troubleshooting

### "Script not found" Compilation Error
**Cause**: Parent script name is spelled incorrectly or doesn't exist.

**Solution**: Verify parent script name matches exactly (case-sensitive).

```papyrus
; Wrong
Scriptname MyScript extends parentscript  ; Not found

; Correct
Scriptname MyScript extends ParentScript  ; Exact match
```

### "Function signature doesn't match"
**Cause**: Overridden function has different parameters or return type than parent.

**Solution**: Match parent signature exactly.

```papyrus
; Parent
Function DoWork(Int x) returns Bool
  Return x > 0
EndFunction

; Child - Wrong
Function DoWork(Float x) returns Bool  ; Different parameter type
  Return x > 0.0
EndFunction

; Child - Correct
Function DoWork(Int x) returns Bool
  Return x > 100
EndFunction
```

### Child Function Not Being Called
**Cause**: Function signature doesn't match parent, so it's not actually an override.

**Solution**: Ensure exact parameter and return type match.

```papyrus
; Parent
Function OnActivate(ObjectReference akSelf)
  Debug.Trace("Parent activated")
EndFunction

; Child - If this doesn't match, parent version is always called
Function OnActivate(ObjectReference akSelf)  ; Correct
  Debug.Trace("Child activated")
EndFunction
```

### Can't Access Child Variable from Parent
**Expected behavior**: Variables are private and scope-isolated.

**Solution**: If parent needs to access data, use properties instead.

```papyrus
; Parent cannot access this
Scriptname ChildScript extends ParentScript
Int PrivateVar = 5

; Better: Use property so parent can access if needed
Int Property PublicValue Auto
```

---

## Related Resources

- **SCRIPT_FILES_GUIDE.md**: Script file types and compilation
- **PAPYRUS_COMPILER_GUIDE.md**: Compilation and error reference
- **CREATION_KIT_RESOURCES_INDEX.md**: Script resources and function reference
- **Script File Structure**: Papyrus syntax and structure
- **Default Scripts**: Built-in template scripts for common behaviors
- **Differences from Skyrim to Fallout 4**: Migration notes on inheritance changes

---

## Quick Reference

| Concept | Syntax | Example |
|---------|--------|---------|
| Extend script | `Scriptname Child extends Parent` | `Scriptname FireSword extends BaseWeapon` |
| Override function | `Function Name() ... EndFunction` | `Function Strike() ... EndFunction` |
| Call parent function | `parent.FunctionName()` | `parent.Strike(target)` |
| Inherit property | Use parent property name | `BaseDamage` (from parent) |
| Inherit state | State merged automatically | States combine from parent and child |
| Hide variable | Declare same name in child | `Int MyVar` shadows parent's `MyVar` |
| State override | `State Name ... EndState` in child | Override functions in states |
