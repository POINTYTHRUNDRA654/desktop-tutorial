# PaperScript Fallout 4 Features & Installation Guide

**Version:** 1.0  
**Last Updated:** January 24, 2026  
**Scope:** Fallout 4 specific features, installation guide, and complete examples  
**Audience:** FO4 modders, advanced scripters, addon developers

## Table of Contents

1. [Fallout 4 Specific Features](#fallout-4-specific-features)
2. [Property Groups](#property-groups)
3. [Namespaces](#namespaces)
4. [Structs](#structs)
5. [The `is` Operator](#the-is-operator)
6. [The `var` Type](#the-var-type)
7. [Fallout 4 Flags](#fallout-4-flags)
8. [Installation Guide](#installation-guide)
9. [CLI Reference](#cli-reference)
10. [Complete Examples](#complete-examples)
11. [Optimization Tips](#optimization-tips)

---

## Fallout 4 Specific Features

PaperScript has full support for all Papyrus features introduced with Fallout 4, as of version 1.0.4-alpha.1.

### Enable Fallout 4 Support

**In project.yaml:**
```yaml
game: FO4
```

**For one-off builds:**
```bash
paperscript build --game=FO4
```

### What's New in Fallout 4 Papyrus

| Feature | Skyrim | FO4 | Description |
|---------|--------|-----|-------------|
| Property Groups | ✗ | ✓ | Organize properties visually |
| Namespaces | ✗ | ✓ | Scope scripts with `::` separator |
| Structs | ✗ | ✓ | Define custom data types |
| `is` operator | ✗ | ✓ | Type checking with `is Type` |
| `var` type | ✗ | ✓ | Dynamic variable typing |
| Const properties | ✗ | ✓ | Read-only properties |
| Mandatory properties | ✗ | ✓ | Required property assignment |
| New function flags | ✗ | ✓ | DebugOnly, BetaOnly |
| Script flags | ✗ | ✓ | Native, Const on scripts |

---

## Property Groups

Property groups organize related properties into visually separated sections in Creation Kit. They have no runtime effect but significantly improve usability.

### Basic Syntax

```paperscript
script ItemScript : ObjectReference {
  group Settings {
    auto property Enabled: Bool = true
    auto property Delay: Float = 5.0
    auto property MaxActivations: Int = 3
  }
  
  group References {
    auto property Player: Actor
    auto property TargetQuest: Quest
    auto property LinkedRef: ObjectReference
  }
  
  group Debug {
    auto property DebugMode: Bool = false
    auto property LogLevel: Int = 1
  }
}
```

### Multiple Groups

```paperscript
script ComplexScript : ObjectReference {
  group General {
    auto property Name: String = "Default"
    auto property Enabled: Bool = true
  }
  
  group Timers {
    auto property UpdateInterval: Float = 5.0
    auto property CheckInterval: Float = 10.0
  }
  
  group Items {
    auto property Item1: MiscItem
    auto property Item2: MiscItem
    auto property Item3: MiscItem
  }
  
  group Actors {
    auto property TargetActor: Actor
    auto property FollowerActor: Actor
  }
}
```

### Best Practices

**Do:**
- Use descriptive group names
- Group related properties logically
- Keep groups small (3-8 properties each)
- Order groups by importance

**Don't:**
- Create too many groups (more than 6)
- Mix unrelated properties in one group
- Nest groups (not supported)
- Use very long group names

### Creation Kit Display

When you load a script with property groups in Creation Kit:

1. Properties appear in organized sections
2. Each group has a collapsible header
3. Makes configuration much easier
4. Improves mod user experience

---

## Namespaces

Namespaces prevent name conflicts and organize related scripts into logical units.

### Basic Syntax

```paperscript
script MyNamespace::UtilityScript {
  def DoSomething() {
    Debug.Notification("Doing something")
  }
}

script MyNamespace::AnotherScript {
  def DoOtherThing() {
    Debug.Notification("Doing other thing")
  }
}
```

### Using Namespaces

**Without Import (fully qualified):**
```paperscript
MyNamespace::UtilityScript.DoSomething()
MyNamespace::AnotherScript.DoOtherThing()
```

**With Import (simplified):**
```paperscript
import MyNamespace

UtilityScript.DoSomething()
AnotherScript.DoOtherThing()
```

### Practical Example

```paperscript
// Namespace for quest utilities
script QuestUtils::Helpers {
  def SetQuestStage(quest: Quest, stage: Int) {
    quest.SetStage(stage)
  }
  
  def GetQuestProgress(quest: Quest) -> Int {
    return quest.GetStage()
  }
}

// Namespace for item utilities
script ItemUtils::Helpers {
  def GiveItem(actor: Actor, item: Form, count: Int) {
    actor.AddItem(item, count)
  }
  
  def TakeItem(actor: Actor, item: Form, count: Int) {
    actor.RemoveItem(item, count)
  }
}

// Usage in main script
import QuestUtils
import ItemUtils

script MainScript : Quest {
  event OnInit() {
    // Can call both Helpers with their namespace
    Helpers.SetQuestStage(self, 10)
  }
}
```

### Multiple Namespaces

```paperscript
import MyMod::Quest
import MyMod::Items
import MyMod::Utilities

script MyScript {
  event OnInit() {
    Quest.HelperFunction()
    Items.HelperFunction()
    Utilities.HelperFunction()
  }
}
```

### Namespace Organization

For large projects, organize with directory structure:

```
src/
├── Core/
│   ├── CoreUtils.pps
│   └── CoreHelpers.pps
├── Quest/
│   ├── QuestMain.pps
│   └── QuestHelpers.pps
└── Items/
    ├── ItemManager.pps
    └── ItemUtils.pps
```

Then in scripts:

```paperscript
import Core
import Quest
import Items
```

---

## Structs

Structs are custom data types that group related variables together. **Only available in Fallout 4.**

### Defining Structs

```paperscript
struct Point {
    x: Int
    y: Int
}

struct Color {
    r: Int
    g: Int
    b: Int
}

struct PlayerStats {
    health: Int
    mana: Int
    stamina: Int
    level: Int
}
```

### Creating Struct Instances

**Method 1: Default initialization with property assignment**
```paperscript
point1: Point = new Point
point1.x = 10
point1.y = 20
```

**Method 2: Struct initializer (recommended)**
```paperscript
point1: Point = { x: 10, y: 20 }

color: Color = { r: 255, g: 128, b: 64 }

stats: PlayerStats = {
  health: 100,
  mana: 50,
  stamina: 75,
  level: 20
}
```

### Using Structs in Functions

```paperscript
struct Vector {
  x: Float
  y: Float
  z: Float
}

script MathScript {
  def Distance(from: Vector, to: Vector) -> Float {
    dx: Float = to.x - from.x
    dy: Float = to.y - from.y
    dz: Float = to.z - from.z
    
    return (dx * dx + dy * dy + dz * dz) as Float
  }
  
  def MovePoint(point: Vector, offset: Vector) -> Vector {
    return {
      x: point.x + offset.x,
      y: point.y + offset.y,
      z: point.z + offset.z
    }
  }
}
```

### Structs in Properties

```paperscript
struct LocationData {
  cellName: String
  x: Float
  y: Float
  z: Float
}

script LocationTracker : Quest {
  auto property CurrentLocation: LocationData
  auto property PreviousLocation: LocationData
  
  def RecordLocation(cell: String, x: Float, y: Float, z: Float) {
    PreviousLocation = CurrentLocation
    CurrentLocation = {
      cellName: cell,
      x: x,
      y: y,
      z: z
    }
  }
}
```

### Nested Structs

```paperscript
struct Point {
  x: Float
  y: Float
}

struct Rectangle {
  topLeft: Point
  bottomRight: Point
}

def CreateRectangle(x1: Float, y1: Float, x2: Float, y2: Float) -> Rectangle {
  return {
    topLeft: { x: x1, y: y1 },
    bottomRight: { x: x2, y: y2 }
  }
}
```

### Best Practices

**Do:**
- Name structs in PascalCase
- Keep structs focused (5-8 fields max)
- Use descriptive field names
- Document struct purpose

**Don't:**
- Create deeply nested structures
- Use overly complex structs
- Mix related and unrelated fields
- Name structs like types (e.g., `String`, `Array`)

---

## The `is` Operator

The `is` operator checks if a variable is of a particular type.

### Basic Usage

```paperscript
var1: Int = 0
if var1 is Int {
    Debug.Notification("It's an integer")
}

actor: Actor = Game.GetPlayer()
if actor is Actor {
    Debug.Notification("It's an actor")
}
```

### Type Checking

```paperscript
def ProcessObject(obj: ObjectReference) {
  if obj is Actor {
    actor: Actor = obj as Actor
    actor.SetHealth(100)
  } elseif obj is MiscItem {
    Debug.Notification("It's a misc item")
  }
}
```

### Skyrim PaperScript Support

The `is` operator is also available in Skyrim PaperScript! It translates to a cast and null check internally.

```paperscript
script SkyrimScript : ObjectReference {
  def CheckType(ref: ObjectReference) {
    // Works in both Skyrim and Fallout 4
    if ref is Actor {
      Debug.Notification("Found an actor")
    }
  }
}
```

### Practical Examples

**Safe Type Conversion:**
```paperscript
def SafeGetActorName(obj: ObjectReference) -> String {
  if obj is Actor {
    actor: Actor = obj as Actor
    return actor.GetName()
  }
  return "Unknown"
}
```

**Type-Based Logic:**
```paperscript
def InteractWith(obj: ObjectReference) {
  if obj is Actor {
    actor: Actor = obj as Actor
    actor.SetAlert(true)
  } elseif obj is Container {
    container: Container = obj as Container
    container.Open(Game.GetPlayer())
  } else {
    obj.Activate(Game.GetPlayer(), Game.GetPlayer())
  }
}
```

---

## The `var` Type

The `var` type allows dynamic typing (similar to `object` in C#).

### Basic Usage

```paperscript
var1: Var = 123
var2: Var = "hello"
var3: Var = true
var4: Var = Game.GetPlayer()
```

### Practical Use Cases

**Flexible Function Parameters:**
```paperscript
def LogValue(value: Var) {
  Debug.Notification("Value: " + value)
}

LogValue(42)
LogValue("test")
LogValue(3.14)
LogValue(Game.GetPlayer())
```

**Dynamic Collections:**
```paperscript
script DynamicArray {
  def ProcessMixedArray(items: Var[]) {
    range item in items {
      Debug.Notification("Item: " + item)
    }
  }
}
```

**Note:** Use `var` sparingly. Type-specific variables are safer and more efficient.

---

## Fallout 4 Flags

Fallout 4 introduces new flags for functions, properties, variables, and scripts.

### Function Flags

**DebugOnly**
```paperscript
script MyScript {
  def DebugOnly Log(message: String) {
    Debug.MessageBox(message)
  }
  
  event OnInit() {
    Log("This only runs in debug builds")
  }
}
```

**BetaOnly**
```paperscript
script MyScript {
  def BetaOnly TestFeature() {
    Debug.Notification("Beta feature")
  }
}
```

### Property Flags

**Const**
```paperscript
auto const property MaxHealth: Int = 100
// Value cannot be changed after initialization
```

**Mandatory**
```paperscript
auto mandatory property PlayerREF: Actor
// Must be assigned in Creation Kit editor
```

**Combined:**
```paperscript
auto const mandatory property GameVersion: String = "1.10.162"
```

### Variable Flags

**Const**
```paperscript
script MyScript {
  def Example() {
    const MaxRetries: Int = 3
    // MaxRetries cannot be changed
  }
}
```

### Script Flags

**Native**
```paperscript
native script ExternalFunction {
  // Implemented externally
}
```

**Const**
```paperscript
const script ReadOnlyScript {
  // Script properties are constant
}
```

---

## Installation Guide

### Requirements

- Windows, Linux, or macOS
- .NET Runtime (Windows binary is standalone)
- Creation Kit installed for Papyrus compiler

### Windows Installation

**Option 1: Binary from GitHub**

1. Visit [PaperScript GitHub Releases](https://github.com/PaperScript/PaperScript)
2. Download latest Windows build
3. Extract to a folder (e.g., `C:\PaperScript`)
4. Add folder to Windows PATH:
   - Press `Win + X` → Settings
   - Search "Environment Variables"
   - Click "Edit environment variables for your account"
   - Under "User variables", select `Path` → Edit
   - Click "New" and add your PaperScript folder
   - Click OK

5. Open PowerShell and verify:
```powershell
paperscript version
```

**Option 2: Package Manager (Coming Soon)**

- WinGet package (coming soon)
- Chocolatey package (coming soon)

**Option 3: Installer (Coming Soon)**

A dedicated Windows installer will be available soon.

### Linux Installation

**From Binary:**

1. Download latest Linux build from GitHub
2. Extract to a folder:
```bash
tar -xzf paperscript-linux.tar.gz
cd paperscript
```

3. Add to PATH:
```bash
export PATH="$PATH:$(pwd)"
```

4. Or copy to `/usr/local/bin`:
```bash
sudo cp paperscript /usr/local/bin/
```

5. Verify:
```bash
paperscript version
```

**Option 2: Package Manager (Coming Soon)**

- apt packages (coming soon)
- rpm packages (coming soon)

### macOS Installation

**From Binary:**

1. Download latest macOS build from GitHub
2. Extract:
```bash
tar -xzf paperscript-macos.tar.gz
cd paperscript
```

3. Add to PATH:
```bash
export PATH="$PATH:$(pwd)"
```

4. Make executable:
```bash
chmod +x paperscript
```

5. Verify:
```bash
paperscript version
```

**Option 2: Package Manager (Coming Soon)**

- HomeBrew package (coming soon)

### Troubleshooting Installation

**"paperscript: command not found"**

→ Make sure it's in your PATH
→ Try full path: `/path/to/paperscript version`
→ Restart terminal after PATH changes

**"Cannot find .NET Runtime"**

→ Windows: Binary is standalone, shouldn't happen
→ Linux/Mac: Install .NET Runtime 6.0+

**Permission denied**

→ Linux/Mac: Run `chmod +x paperscript`
→ Windows: Run PowerShell as Administrator

---

## CLI Reference

### Main Commands

```
USAGE:
    paperscript [OPTIONS] <COMMAND>

OPTIONS:
    -h, --help    Print help information

COMMANDS:
    build         Build a project
    transpile     Transpile a single file
    init          Initialize new project
    version       Print version info
```

### `paperscript init`

Creates a new PaperScript project with directory structure.

```bash
USAGE:
    paperscript init [OPTIONS]

OPTIONS:
    -h, --help    Print help information
    -f, --force   Force creation in non-empty directory
```

**Example:**
```bash
paperscript init
# Generates project.yaml and src/ folder
```

### `paperscript build`

Builds a project in the current directory.

```bash
USAGE:
    paperscript build [OPTIONS] [PATH]

OPTIONS:
    -h, --help          Print help information
    -n, --no-compile    Skip Papyrus compiler step
    --game=<GAME>       Override game (SkyrimSE or FO4)
    --verbose           Verbose output

ARGUMENTS:
    [PATH]              Project directory (default: current)
```

**Examples:**
```bash
# Build current project
paperscript build

# Build specific directory
paperscript build ./MyProject

# Build without compilation
paperscript build --no-compile

# Build for Fallout 4
paperscript build --game=FO4

# Verbose output
paperscript build --verbose
```

### `paperscript transpile`

Transpiles a single file from PaperScript to Papyrus.

```bash
USAGE:
    paperscript transpile [INPUT] [OPTIONS]

ARGUMENTS:
    [INPUT]             Input .pps file

OPTIONS:
    -h, --help              Print help information
    -o, --output <OUTPUT>   Output file path
    -s, --stdout            Output to STDOUT
    --game=<GAME>          Override game setting
```

**Examples:**
```bash
# Transpile to file
paperscript transpile script.pps -o script.psc

# Transpile to STDOUT
paperscript transpile script.pps -s

# Transpile for Fallout 4
paperscript transpile script.pps -o script.psc --game=FO4
```

### `paperscript version`

Prints version information.

```bash
USAGE:
    paperscript version [OPTIONS]

OPTIONS:
    -h, --help    Print help information
```

**Example:**
```bash
paperscript version
# Output: PaperScript v1.0.4-alpha.1
```

---

## Complete Examples

### Example 1: Simple Toggle

A simple on/off switch that can be attached to a button or lever.

```paperscript
script SimpleToggle : ObjectReference {
  toggle: Bool = false
  
  event OnActivate(actionRef: ObjectReference) {
    toggle = !toggle  // Flip the toggle
    
    if toggle {
      Debug.Notification("Enabled")
      // Do stuff when toggled ON
    } else {
      Debug.Notification("Disabled")
      // Do stuff when toggled OFF
    }
  }
}
```

**Usage:** Attach to an activator like a button, lever, or container.

### Example 2: Quest Item Tracker

Tracks when a quest item is picked up or dropped.

```paperscript
script DroppableQuestObject : ObjectReference {
    auto property PlayerREF: Actor
    auto property FromQuest: Quest
    auto property UncompleteEnabled: Bool = true
    auto property StageToStopQuestItem: Int = 99999
    auto property StageToSetOnPickup: Int = -1
    auto property ObjectiveToDisplayOnPickup: Int
    auto property ObjectiveToCompleteOnPickup: Int
    auto property StageToSetOnDrop: Int = -1
    auto property ObjectiveToDisplayOnDrop: Int
    auto property ObjectiveToHideOnDrop: Int = -1

    event OnContainerChanged(newContainer: ObjectReference, oldContainer: ObjectReference) {
        if FromQuest.GetStage() < StageToStopQuestItem {
            if oldContainer == PlayerREF {
                FromQuest.SetObjectiveDisplayed(ObjectiveToDisplayOnDrop, true, true)
                FromQuest.SetObjectiveDisplayed(ObjectiveToHideOnDrop, false)

                if UncompleteEnabled {
                    FromQuest.SetObjectiveCompleted(ObjectiveToCompleteOnPickup, false)
                }

                if StageToSetOnDrop >= 0 {
                    FromQuest.SetStage(StageToSetOnDrop)
                }
            } elseif newContainer == PlayerREF {
                FromQuest.SetObjectiveDisplayed(ObjectiveToDisplayOnPickup, true, true)
                FromQuest.SetObjectiveCompleted(ObjectiveToCompleteOnPickup)

                if StageToSetOnPickup >= 0 {
                    FromQuest.SetStage(StageToSetOnPickup)
                }
            }
        }
    }
}
```

**Usage:** Attach to a quest item. Configure properties:
- FromQuest: The quest this tracks
- StageToSetOnPickup: Quest stage when picked up
- StageToSetOnDrop: Quest stage when dropped

### Example 3: Trigger Zone

A trigger that activates when the player enters it.

```paperscript
script ExampleTrigger : ObjectReference {
    auto property PlayerREF: Actor

    event OnTriggerEnter(actionRef: ObjectReference) {
        if actionRef == PlayerREF {
            Debug.MessageBox("Player Entered!")
            OnPlayerEntered()
        }
    }
    
    event OnTriggerLeave(actionRef: ObjectReference) {
        if actionRef == PlayerREF {
            Debug.MessageBox("Player Left!")
            OnPlayerExited()
        }
    }
    
    def OnPlayerEntered() {
        // Custom logic when player enters
    }
    
    def OnPlayerExited() {
        // Custom logic when player exits
    }
}
```

**Usage:** Attach to a trigger volume in the CK.

### Example 4: Advanced with Property Groups

```paperscript
script AdvancedItemScript : ObjectReference {
  group Settings {
    auto property Enabled: Bool = true
    auto property MaxUses: Int = 10
    auto property RechargeTime: Float = 24.0
  }
  
  group References {
    auto property Player: Actor
    auto property LinkedQuest: Quest
    auto property RewardItem: MiscItem
  }
  
  group State {
    UseCount: Int = 0
    LastUseTime: Float = 0.0
  }
  
  event OnInit() {
    Player = Game.GetPlayer()
  }
  
  event OnActivate(actionRef: ObjectReference) {
    if Enabled && CanUse() {
      UseItem()
      UseCount += 1
    } else {
      Debug.Notification("Item cannot be used")
    }
  }
  
  def CanUse() -> Bool {
    if UseCount >= MaxUses {
      return false
    }
    return true
  }
  
  def UseItem() {
    Player.AddItem(RewardItem, 1)
    LinkedQuest.SetStage(10)
    Debug.Notification("Item used!")
  }
}
```

---

## Optimization Tips

### Naive Optimizations in PaperScript

The transpiler includes some simple optimizations, with more planned.

### GetActorRef / GetActorReference

**Proposal (Not Yet Implemented):**

Instead of:
```paperscript
actor: Actor = SomeRef.GetActorReference()
```

The transpiler could optimize to:
```papyrus
actor: Actor = SomeRef.GetReference() as Actor
```

This performs better in many cases.

### Performance Best Practices

**Use Property Groups**
- Better organization
- Faster to find properties in CK
- No performance impact

**Use Structs for Related Data**
- Cleaner code organization
- Easier to manage related values
- Makes code more maintainable

**Use Namespaces**
- Prevent naming conflicts
- Organize large projects
- No runtime overhead

**Minimize Update Events**
```paperscript
// Bad: Updates every frame
event OnUpdate() {
  CheckCondition()
}

// Good: Periodic updates
event OnInit() {
  RegisterForUpdate(5.0)
}

event OnUpdate() {
  CheckCondition()
  RegisterForUpdate(5.0)
}
```

**Cache References**
```paperscript
// Bad: Gets player every time
def DoSomething() {
  Game.GetPlayer().AddItem(Gold001, 10)
  Game.GetPlayer().RemoveItem(Gold001, 5)
}

// Good: Cache player reference
def DoSomething() {
  player: Actor = Game.GetPlayer()
  player.AddItem(Gold001, 10)
  player.RemoveItem(Gold001, 5)
}
```

---

## Migration from Papyrus

### Converting Papyrus to PaperScript (Fallout 4)

**Papyrus:**
```papyrus
ScriptName MyScript extends ObjectReference

Group Settings
    Bool Property Enabled = True AutoReadOnly
    Int Property MaxUses = 10 AutoReadOnly
EndGroup

Group References
    Actor Property PlayerREF Auto
    Quest Property MyQuest Auto
EndGroup

Event OnActivate(ObjectReference akActionRef)
    If Enabled
        DoSomething()
    EndIf
EndEvent

Function DoSomething()
    PlayerREF.AddItem(Gold001, 1)
EndFunction
```

**PaperScript:**
```paperscript
script MyScript : ObjectReference {
  group Settings {
    auto readonly property Enabled: Bool = true
    auto readonly property MaxUses: Int = 10
  }
  
  group References {
    auto property PlayerREF: Actor
    auto property MyQuest: Quest
  }
  
  event OnActivate(actionRef: ObjectReference) {
    if Enabled {
      DoSomething()
    }
  }
  
  def DoSomething() {
    PlayerREF.AddItem(Gold001, 1)
  }
}
```

---

**Document Version:** 1.0  
**Last Updated:** January 24, 2026  
**Maintained By:** Mossy Documentation Team

For the latest updates, check the official PaperScript repository on GitHub.

