# PaperScript Quick Start & Syntax Reference

**Version:** 1.0  
**Last Updated:** January 24, 2026  
**Scope:** Quick start guide and comprehensive syntax reference for PaperScript  
**Audience:** New users, scripters migrating from Papyrus, developers

## Table of Contents

1. [Quick Start](#quick-start)
2. [Requirements](#requirements)
3. [Project Setup](#project-setup)
4. [Writing Your First Script](#writing-your-first-script)
5. [Compilation](#compilation)
6. [Syntax Reference](#syntax-reference)
7. [Project Configuration](#project-configuration)
8. [Preprocessor System](#preprocessor-system)
9. [Feature Matrix](#feature-matrix)
10. [Common Patterns](#common-patterns)

---

## Quick Start

This guide will walk you through setting up PaperScript, initializing a project, and building your first script in under 15 minutes.

### Prerequisites Check

Before starting, ensure you have:

- ✓ PaperScript installed (download from official repository)
- ✓ Skyrim SE/AE or Fallout 4 with Creation Kit
- ✓ Papyrus Compiler (automatically installed with CK)
- ✓ A text editor (Visual Studio Code recommended)

**Important:** Run Creation Kit at least once before starting. This copies the script sources you'll need.

### Step 1: Create Project Directory

Create a folder for your project and navigate to it:

```bash
mkdir MyPaperScriptProject
cd MyPaperScriptProject
```

### Step 2: Initialize Project

Run the PaperScript initializer:

```bash
paperscript init
```

**Note:** Run as Administrator for automatic path detection. Otherwise, you'll need to manually configure paths in `project.yaml`.

### Step 3: Configure project.yaml

Open the generated `project.yaml` file and update:

```yaml
projectName: My First Project
projectVersion: 1.0.0
game: SkyrimSE  # or FO4 for Fallout 4
```

Verify all paths are correct:
- `scriptFolderPath` - Points to your game's Scripts/Source folder
- `scriptOutputPath` - Points to your game's Scripts folder
- `papyrusCompilerPath` - Points to PapyrusCompiler.exe

### Step 4: Create Source File

Create a `src/` directory if it doesn't exist, then create `src/HelloWorld.pps`:

```paperscript
script HelloWorldQuest : Quest {
  auto property PlayerREF: Actor
  auto property Gold001: MiscItem
  
  event OnInit() {
    RegisterForSingleUpdate()
  }
  
  event OnUpdate() {
    GiveGoldToActor(PlayerREF, 10)
  }
  
  def GiveGoldToActor(actor: Actor, amount: Int) {
    actor.AddItem(Gold001, amount)
  }
}
```

### Step 5: Build Your Script

Run the one-time build to test everything:

```bash
paperscript build .
```

You should see output showing:
- Files transpiled
- Any errors or warnings
- Success message

### Step 6: Compile in Creation Kit

1. Open Creation Kit
2. Load your plugin
3. Creation Kit will compile the generated `.psc` files to `.pex`
4. Test your script in-game

### Step 7: Watch Mode (Optional)

For development, use watch mode for automatic recompilation:

```bash
paperscript watch
```

Any `.pps` file changes will automatically trigger transpilation. This is coming soon - watch GitHub for updates.

---

## Requirements

### PaperScript Installation

1. Download latest release from official GitHub repository
2. Extract to your development folder
3. Add to PATH (optional, or reference directly)

### Game & Tools

**For Skyrim SE/AE:**
- Skyrim Special Edition or Anniversary Edition
- Creation Kit (CK)
- Script sources copied (run CK once first)
- Papyrus Compiler (included with CK)

**For Fallout 4:**
- Fallout 4
- Creation Kit
- Script sources
- Papyrus Compiler

### Text Editor Setup

**Recommended: Visual Studio Code**

1. Install VS Code
2. Install PaperScript VSCode Extension
3. Get syntax highlighting and error detection
4. Optional: Configure file associations for `.pps`

**Alternative Editors:**
- Notepad++ with custom syntax definition
- Sublime Text with appropriate package
- Any text editor (basic editing, no highlighting)

---

## Project Setup

### Folder Structure

After initialization, your project should look like:

```
MyProject/
├── project.yaml           # Configuration file
├── src/                   # PaperScript source files
│   ├── HelloWorld.pps
│   └── Utils.pps
├── build/                 # Generated Papyrus files (optional)
│   ├── HelloWorld.psc
│   └── Utils.psc
├── dist/                  # Compiled scripts (if using packaging)
└── README.md             # Project documentation
```

### Best Practices for Organization

**By Functionality:**
```
src/
├── quests/
│   ├── MainQuest.pps
│   └── SideQuests.pps
├── items/
│   ├── Weapons.pps
│   └── Armor.pps
└── utils/
    └── Helpers.pps
```

**By System:**
```
src/
├── combat/
├── dialogue/
├── player/
├── world/
└── util/
```

**Flat Structure (for small projects):**
```
src/
├── Script1.pps
├── Script2.pps
└── Script3.pps
```

---

## Writing Your First Script

### Minimal Script Example

The simplest valid PaperScript script:

```paperscript
script MyScript {
  // Empty script is valid
}
```

### Event Handler Script

```paperscript
script ItemEquipHandler : ObjectReference {
  auto property BonusItem: MiscItem
  auto property PlayerREF: Actor
  
  event OnEquipped(actor: Actor) {
    if (actor == PlayerREF) {
      actor.AddItem(BonusItem, 1)
      Debug.Notification("Item equipped!")
    }
  }
  
  event OnUnequipped(actor: Actor) {
    if (actor == PlayerREF) {
      actor.RemoveItem(BonusItem, 1)
      Debug.Notification("Item unequipped!")
    }
  }
}
```

### Quest Script Example

```paperscript
script MainQuestScript : Quest {
  auto property StartMarker: ObjectReference
  auto property Player: Actor
  auto property QuestStage: Int = 0
  
  event OnInit() {
    RegisterForSingleUpdate(5.0)
  }
  
  event OnUpdate() {
    CheckQuestProgress()
    RegisterForSingleUpdate(5.0)
  }
  
  def CheckQuestProgress() {
    if (Player.GetDistance(StartMarker) < 100.0) {
      if (QuestStage == 0) {
        AdvanceQuest()
      }
    }
  }
  
  def AdvanceQuest() {
    QuestStage = 1
    Debug.Notification("Quest advanced!")
  }
}
```

### Script with Multiple Functions

```paperscript
script UtilityScript {
  auto property Target: Actor
  auto property BonusItem: MiscItem
  
  event OnInit() {
    InitializeSettings()
  }
  
  def InitializeSettings() {
    Target = Game.GetPlayer()
  }
  
  def GiveReward(amount: Int) {
    Target.AddItem(BonusItem, amount)
    ShowNotification("Reward given!")
  }
  
  def TakeItem(count: Int) -> Bool {
    if (Target.GetItemCount(BonusItem) >= count) {
      Target.RemoveItem(BonusItem, count)
      return true
    }
    return false
  }
  
  def ShowNotification(message: String) {
    Debug.Notification(message)
  }
}
```

---

## Compilation

### One-Time Build

For testing or single compilation:

```bash
paperscript build .
```

This will:
1. Transpile all `.pps` files to `.psc`
2. Output to configured `scriptOutputPath`
3. Run Papyrus compiler if configured
4. Report any errors

### Watch Mode

For active development (coming soon):

```bash
paperscript watch
```

Watches for changes and automatically recompiles. Currently in development.

### Build Flags

Check `paperscript build --help` for available options:

```bash
paperscript build --help
```

Common flags:
- `--config <path>` - Specify project.yaml location
- `--verbose` - Verbose output
- `--game <game>` - Override game setting

### Troubleshooting Compilation

**"PapyrusCompiler not found"**
→ Check path in project.yaml
→ Ensure PapyrusCompiler.exe exists at specified location

**"Script sources not found"**
→ Verify scriptFolderPath in project.yaml
→ Run Creation Kit to generate script sources

**Type errors in output**
→ Check function parameter types match game API
→ Verify property types are correct
→ Review Papyrus documentation for functions used

---

## Syntax Reference

### Script Block

The root container for all script code. Equivalent to `ScriptName extends...` in Papyrus.

**Syntax:**
```paperscript
script ScriptName : ExtendScript {
  // script body
}

script StandaloneScript {
  // no extension
}
```

**Notes:**
- Must be named (no anonymous scripts)
- Only comments and defines can appear before script block
- Extends can be omitted (extends ObjectReference by default)

**Papyrus Equivalent:**
```papyrus
ScriptName ScriptName extends ExtendScript
```

### States

Named blocks of code that can override behavior. States can be marked as `auto` to become active immediately.

**Syntax:**
```paperscript
auto state DefaultState {
  event OnInit() {
    // Runs immediately
  }
}

state OtherState {
  event OnInit() {
    // Only runs if state is active
  }
}
```

**Common States:**
- `DefaultState` - Auto state, active on initialization
- `Disabled` - Disabled state for conditional behavior
- Custom states for specific conditions

**More Info:** See CK Wiki State Documentation

### Imports

Import script Global functions to use without script name prefix.

**Syntax:**
```paperscript
import Debug
import Utility

def Demo() {
  MessageBox("Hello")  // Debug.MessageBox implied
  Wait(1.0)            // Utility.Wait implied
}
```

**Commonly Imported:**
- `Debug` - MessageBox, Notification
- `Utility` - Wait, RandomInt
- `Game` - GetPlayer, GetRandom
- Custom script modules

**Without Import:**
```paperscript
def Demo() {
  Debug.MessageBox("Hello")
  Utility.Wait(1.0)
}
```

### Properties

Script-scoped variables accessible from external scripts. Properties are interfaces between private variables and the outside world.

**Full Property Syntax:**
```paperscript
_player: Actor = None

property Player: Actor {
    get {
        return _player
    }
    
    set {
        _player = value  // 'value' is implicit setter parameter
    }
}
```

**Usage:**
```paperscript
script MyScript {
  // Read property
  player_actor = SomeScript.Player
  
  // Write property
  SomeScript.Player = Game.GetPlayer()
}
```

### Auto Properties

Simplified properties that create a private variable with basic getter/setter automatically.

**Syntax:**
```paperscript
auto property PlayerREF: Actor
auto property Count: Int = 0
auto property Name: String = "Default"
```

**Equivalent Full Property:**
```paperscript
_playerref: Actor = None

property PlayerREF: Actor {
    get { return _playerref }
    set { _playerref = value }
}
```

**Features:**
- `auto` prefix required
- Optional default value
- Visible in editor
- Can't have custom getter/setter logic

### Variables

Local script variables with explicit types. Default values provided if not specified.

**Syntax:**
```paperscript
myInt: Int
myFloat: Float = 3.14
myString: String = "hello"
myBool: Bool = true
myActor: Actor = none
```

**Type Defaults:**
```paperscript
myBool: Bool        // = false
myInt: Int          // = 0
myFloat: Float      // = 0.0
myString: String    // = ""
myArray: Int[]      // = None
myActor: Actor      // = None
```

**Papyrus Equivalent:**
```papyrus
int myInt
float myFloat = 3.14
string myString = "hello"
bool myBool = true
Actor myActor = None
```

### Functions

Reusable blocks of code with optional parameters and return types.

**Syntax:**
```paperscript
def NoArgsNoReturn() {
  Debug.Notification("Hello")
}

def WithArgs(message: String, count: Int) {
  Debug.Notification(message)
}

def WithReturn() -> Bool {
  return true
}

def ArgsAndReturn(a: Int, b: Int) -> Int {
  return a + b
}
```

**Papyrus Equivalent:**
```papyrus
Function NoArgsNoReturn()
  Debug.Notification("Hello")
EndFunction

Function WithArgs(string message, int count)
  Debug.Notification(message)
EndFunction

Function WithReturn() returns bool
  return true
EndFunction

Function ArgsAndReturn(int a, int b) returns int
  return a + b
EndFunction
```

### Events

Like functions but triggered by game systems. Cannot have return types.

**Syntax:**
```paperscript
event OnInit() {
  Debug.Notification("Script initialized")
}

event OnEquipped(actor: Actor) {
  Debug.Notification("Item equipped by " + actor.GetName())
}

event OnUpdate() {
  CheckSomeCondition()
}
```

**Common Events:**
- `OnInit()` - Script initialization
- `OnUpdate()` - Periodic updates
- `OnEquipped(Actor)` - Item equipped
- `OnUnequipped(Actor)` - Item unequipped
- `OnTimer(Int)` - Timer completion
- `OnHit()` - Physical collision
- `OnCombatStateChanged()` - Combat state change

**More Info:** See CK Event Documentation

### Conditionals

If/ElseIf/Else blocks for conditional execution. Parentheses optional (used for precedence).

**Syntax:**
```paperscript
if (player.GetHealth() > 0) {
  Debug.Notification("Player alive")
} elseif (player.GetLevel() > 10) {
  Debug.Notification("Player high level")
} else {
  Debug.Notification("Player dead or low level")
}
```

**Without Parentheses:**
```paperscript
if a == b {
  // Equal
} elseif a > b {
  // Greater than
} else {
  // Less than
}
```

**Complex Conditions:**
```paperscript
if (actor1.IsDead() || actor2.IsDead()) {
  // At least one is dead
}

if (location && location.IsLoaded()) {
  // Location exists and is loaded
}
```

**Papyrus Equivalent:**
```papyrus
If player.GetHealth() > 0
  Debug.Notification("Player alive")
ElseIf player.GetLevel() > 10
  Debug.Notification("Player high level")
Else
  Debug.Notification("Player dead or low level")
EndIf
```

### While Loops

Repeat code while condition is true. Parentheses optional.

**Syntax:**
```paperscript
while (condition) {
  DoSomething()
}

counter: Int = 0
while counter < 10 {
  counter += 1
  Debug.Notification("Count: " + counter)
}
```

**With Break (Not Supported):**
PaperScript doesn't support `break` keyword. Use flag variables instead:

```paperscript
running: Bool = true
counter: Int = 0

while running {
  counter += 1
  if counter >= 10 {
    running = false
  }
}
```

### Increment & Decrement

Shorthand for adding/subtracting 1 from integers.

**Syntax:**
```paperscript
counter: Int = 0

counter++      // Equivalent to counter += 1
counter--      // Equivalent to counter -= 1

counter += 5   // Add 5
counter -= 3   // Subtract 3
```

**Note:** Only works with `Int`. For floats use `+= 1.0`.

### Switch Statements

Match a value against multiple cases. Cases don't fall through.

**Syntax:**
```paperscript
switch someVar {
    case 1 => Debug.Notification("One");
    case 2 => {
      Debug.Notification("Two")
      Debug.Notification("Still two")
    }
    case 3 => DoSomething();
    default => Debug.Notification("Other");
}
```

**Single-Line Cases:**
```paperscript
switch status {
    case 0 => Debug.Notification("Off");
    case 1 => Debug.Notification("On");
    default => Debug.Notification("Unknown");
}
```

**Multi-Line Cases:**
```paperscript
switch itemType {
    case ItemType.WEAPON => {
      Debug.Notification("It's a weapon")
      EquipWeapon()
    }
    case ItemType.ARMOR => {
      Debug.Notification("It's armor")
      EquipArmor()
    }
}
```

**Important Notes:**
- No fall-through behavior
- No `break` keyword needed
- Gets translated to if/elseif/else in Papyrus
- Edge cases may exist (see Feature Deep Dive)

### Range Loops

Iterate over array elements. Equivalent to foreach in other languages.

**Syntax:**
```paperscript
items: MiscItem[] = [item1, item2, item3]

range item in items {
  Debug.Notification(item.GetName())
}

range i in [1, 2, 3, 4, 5] {
  Debug.Notification("Number: " + i)
}
```

**Papyrus Equivalent:**
```papyrus
MiscItem[] items = new MiscItem[3]
int i = 0
while i < items.Length
  Debug.Notification(items[i].GetName())
  i += 1
endwhile
```

**Important Notes:**
- Translated to while loops in Papyrus
- Variable is read-only (no modification in loop)
- Edge cases may exist (see Feature Deep Dive)

### Array Initializers

Convenient syntax for creating arrays with initial values.

**Syntax:**
```paperscript
numbers: Int[] = [1, 2, 3, 4, 5]

strings: String[] = [
  "Hello",
  "World",
  "!"
]

items: MiscItem[] = [
  Gold001,
  SilverCoin,
  IronOre
]
```

**Papyrus Equivalent:**
```papyrus
int[] numbers = new int[5]
numbers[0] = 1
numbers[1] = 2
numbers[2] = 3
numbers[3] = 4
numbers[4] = 5
```

**Advantages:**
- Cleaner syntax
- Less boilerplate
- More readable
- Less error-prone

### Struct Initializers

Initialize Fallout 4 structs with cleaner syntax. **Skyrim doesn't support structs.**

**Syntax:**
```paperscript
point: Point = { x: 1, y: 2 }

message: Message = {
  title: "Welcome",
  body: "Hello world",
  icon: "Icons/Misc/message"
}
```

**Papyrus Equivalent:**
```papyrus
Point point = new Point
point.x = 1
point.y = 2

Message message = new Message
message.title = "Welcome"
message.body = "Hello world"
message.icon = "Icons/Misc/message"
```

---

## Project Configuration

### project.yaml Reference

**Complete Example:**
```yaml
projectName: My Awesome Project
projectVersion: 2.1.5

scriptFolderPath: "Q:/SteamLibrary/steamapps/common/Skyrim Special Edition/Data/Scripts/Source"
scriptOutputPath: "Q:/SteamLibrary/steamapps/common/Skyrim Special Edition/Data/Scripts"
papyrusFlagsPath: "Q:/SteamLibrary/steamapps/common/Skyrim Special Edition/Data/Scripts/Source/TESV_Papyrus_Flags.flg"
papyrusCompilerPath: "Q:/SteamLibrary/steamapps/common/Skyrim Special Edition/Papyrus Compiler/PapyrusCompiler.exe"

sourceGlob: "src/**/*.pps"
game: SkyrimSE

globalDefines:
  DEBUG: true
  LOG_LEVEL: "2"
  AUTHOR: "YourName"
```

### Configuration Fields

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `projectName` | Yes | Project display name | `"My Project"` |
| `projectVersion` | Yes | Version string | `"1.0.0"` |
| `scriptFolderPath` | Yes | Script source folder path | `"C:/...../Scripts/Source"` |
| `scriptOutputPath` | Yes | Compiled scripts folder | `"C:/...../Scripts"` |
| `papyrusFlagsPath` | Yes | Flags file location | `".../TESV_Papyrus_Flags.flg"` |
| `papyrusCompilerPath` | Yes | Compiler executable path | `".../PapyrusCompiler.exe"` |
| `sourceGlob` | No | File pattern to match | `"src/**/*.pps"` |
| `game` | Yes | Target game version | `SkyrimSE` or `FO4` |
| `globalDefines` | No | Preprocessor defines | `{DEBUG: true}` |

### Path Configuration

**Skyrim SE Example:**
```yaml
scriptFolderPath: "Q:/Games/Skyrim SE/Data/Scripts/Source"
scriptOutputPath: "Q:/Games/Skyrim SE/Data/Scripts"
papyrusFlagsPath: "Q:/Games/Skyrim SE/Data/Scripts/Source/TESV_Papyrus_Flags.flg"
papyrusCompilerPath: "Q:/Games/Skyrim SE/Papyrus Compiler/PapyrusCompiler.exe"
```

**Fallout 4 Example:**
```yaml
scriptFolderPath: "C:/Games/Fallout4/Data/Scripts/Source"
scriptOutputPath: "C:/Games/Fallout4/Data/Scripts"
papyrusFlagsPath: "C:/Games/Fallout4/Data/Scripts/Source/FO4_Papyrus_Flags.flg"
papyrusCompilerPath: "C:/Games/Fallout4/Papyrus Compiler/PapyrusCompiler.exe"
```

**Tips:**
- Use forward slashes `/` even on Windows
- Use quotes for paths with spaces
- Run `paperscript init` as Administrator for auto-detection
- Manually verify paths after initialization

### Global Defines

Define preprocessor variables accessible in all scripts.

**In project.yaml:**
```yaml
globalDefines:
  DEBUG: true
  VERSION: "1.0.0"
  LOG_ENABLED: false
  AUTHOR: "Your Name"
```

**Usage in Scripts:**
```paperscript
#if DEBUG
Debug.Notification("Debug mode enabled")
#endif

Debug.Notification("Running " + AUTHOR + " version " + VERSION)
```

---

## Preprocessor System

The PaperScript preprocessor is a post-processor that runs after transpilation.

### Defines

Create preprocessor variables that can be substituted throughout code.

**Syntax:**
```paperscript
#define DEBUG
#define VERSION "1.0.0"
```

**Value-less Define:**
```paperscript
#define DEBUG  // Value is 'true' internally
```

**Valued Define:**
```paperscript
#define PROJECT_NAME "My Project"
#define LOG_LEVEL "3"
```

### Conditional Compilation

Include/exclude code blocks based on define values.

**Syntax:**
```paperscript
#define DEBUG

#if DEBUG
Debug.Notification("Debug enabled")
#endif
```

**Complex Conditions:**
```paperscript
#define DEBUG
#define LOG_LEVEL 2

#if DEBUG
Debug.Notification("In debug mode")
#if LOG_LEVEL >= 2
Debug.MessageBox("Verbose logging enabled")
#endif
#endif
```

### Substitution

Preprocessor replaces define usage with defined values.

**Example:**
```paperscript
#define PROJECT_NAME "Demo"
#define VERSION "1.0.0"

script VersionInfo : Quest {
  event OnInit() {
    Debug.Notification("Running " + PROJECT_NAME + " v" + VERSION)
  }
}
```

**Result (after preprocessing):**
```papyrus
script VersionInfo : Quest {
  event OnInit() {
    Debug.Notification("Running Demo v1.0.0")
  }
}
```

**Caution:** Ensure unique define names to avoid accidental replacements.

### Special Defines

Reserved defines set by the system or used for transpiler instructions.

| Define Name | Description | Set By |
|------------|-------------|--------|
| `OUTPUT_FILE_NAME` | Override output filename | Script |
| `DEBUG` | Debug mode flag | project.yaml or script |
| `PROJECT_NAME` | Project name | project.yaml |
| `PROJECT_VERSION` | Project version | project.yaml |

**Example: OUTPUT_FILE_NAME**
```paperscript
#define OUTPUT_FILE_NAME "CustomName.psc"

script MyScript : Quest {
  // This script outputs as CustomName.psc
}
```

### Includes

Include contents of external files. Included code must already be Papyrus (not PaperScript).

**Syntax:**
```paperscript
#include "fragment.psc"
```

**Path:** Relative to the including file.

**Limitations:**
- Included code not processed by PaperScript
- Must be valid Papyrus, not PaperScript
- Will improve in future versions

---

## Feature Matrix

### Implemented Features

| Feature | Status | Version | Notes |
|---------|--------|---------|-------|
| Script blocks | ✓ | v1.0 | Full support |
| States | ✓ | v1.0 | Including auto states |
| Imports | ✓ | v1.0 | Full support |
| Auto properties | ✓ | v1.0 | Recommended approach |
| Variables | ✓ | v1.0 | All types supported |
| Functions | ✓ | v1.0 | Full support with returns |
| Events | ✓ | v1.0 | All game events |
| Conditionals | ✓ | v1.0 | if/elseif/else |
| While loops | ✓ | v1.0 | Full support |
| Increment/Decrement | ✓ | v1.0 | `++` and `--` operators |
| Switch statements | ✓ | v1.0 | No fall-through |
| Range loops | ✓ | v1.0 | foreach-style iteration |
| Array initializers | ✓ | v1.0 | Convenient syntax |
| Struct initializers | ✓ | v1.0 | Fallout 4 only |
| Preprocessor | ✓ | v1.0 | Basic C-like preprocessor |

### Planned Features

| Feature | Status | Version | Proposed Syntax |
|---------|--------|---------|-----------------|
| Full Properties | 🔄 | v1.0.2+ | `property X { get {} set {} }` |
| AutoReadOnly Properties | 🔄 | v1.0.2+ | `auto readonly property X: Type` |
| Conditional Properties | 🔄 | v1.0.2+ | `auto conditional property X: Type` |
| Script Flags | 🔄 | v1.0.2+ | `hidden script` / `conditional script` |
| Variable Flags | 🔄 | v1.0.2+ | `conditional myVar: Bool` |
| Function Flags | 🔄 | v1.0.2+ | `native def` / `global def` |
| Ternary Operator | 🔄 | Future | `condition ? val1 : val2` |
| String Formatting | 🔄 | v2.0 | `"{} {}".format(a, b)` |
| Direct PEX Compilation | 🔄 | v2.0 | Compile to bytecode directly |

---

## Common Patterns

### Initialization Pattern

```paperscript
script MyScript : ObjectReference {
  auto property Settings: FormList
  auto property Player: Actor
  
  event OnInit() {
    InitializeScript()
  }
  
  def InitializeScript() {
    if (Player == none) {
      Player = Game.GetPlayer()
    }
  }
}
```

### Update Loop Pattern

```paperscript
script PeriodicUpdater : Quest {
  auto property UpdateInterval: Float = 5.0
  
  event OnInit() {
    RegisterForUpdate(UpdateInterval)
  }
  
  event OnUpdate() {
    DoPeriodicCheck()
    RegisterForUpdate(UpdateInterval)
  }
  
  def DoPeriodicCheck() {
    // Your logic here
  }
}
```

### Conditional State Pattern

```paperscript
script ConditionalScript : ObjectReference {
  auto property Enabled: Bool = false
  
  event OnInit() {
    GoToState(if Enabled { "Active" } else { "Inactive" })
  }
  
  state Active {
    event OnUpdate() {
      // Active logic
    }
  }
  
  state Inactive {
    event OnUpdate() {
      // Inactive logic
    }
  }
}
```

### Array Iteration Pattern

```paperscript
script ArrayIterator {
  auto property Items: MiscItem[]
  auto property Player: Actor
  
  def GiveAllItems() {
    range item in Items {
      Player.AddItem(item, 1)
    }
  }
  
  def CountItems() -> Int {
    count: Int = 0
    range item in Items {
      count += Player.GetItemCount(item)
    }
    return count
  }
}
```

### Error Handling Pattern

```paperscript
script SafeScript : Quest {
  auto property Target: Actor
  
  def SafeGiveItem(item: MiscItem, count: Int) {
    if (Target && item && count > 0) {
      Target.AddItem(item, count)
      Debug.Notification("Item given")
    } else {
      Debug.Notification("Invalid parameters")
    }
  }
}
```

### Debug Pattern

```paperscript
#define DEBUG
#define DEBUG_LEVEL 2

script DebugScript {
  def LogDebug(message: String) {
    #if DEBUG
    Debug.Notification(message)
    #if DEBUG_LEVEL >= 2
    Debug.MessageBox(message)
    #endif
    #endif
  }
  
  event OnInit() {
    LogDebug("Script initialized")
  }
}
```

---

## Troubleshooting

### Common Errors

**"Unknown identifier" error**
→ Check spelling of functions and variables
→ Verify imports are included
→ Ensure property names are correct

**Type mismatch errors**
→ Check parameter types match function signature
→ Verify property types are correct
→ Review game API documentation

**Compilation fails silently**
→ Run with `--verbose` flag
→ Check configuration paths in project.yaml
→ Ensure Papyrus Compiler can be found

**Scripts don't update in-game**
→ Verify you compiled the .pex files
→ Check scripts were placed in correct folder
→ Recompile in Creation Kit
→ Restart Skyrim/Fallout 4

### Debug Workflow

1. **Write and transpile** - `paperscript build .`
2. **Check output** - Review generated `.psc` files
3. **Verify paths** - Ensure files in correct location
4. **Compile in CK** - Let CK compile to `.pex`
5. **Test in-game** - Load plugin and test functionality

---

## Next Steps

- **Read the Syntax Reference** - Full language documentation
- **Explore Examples** - See community projects on GitHub
- **Join Community** - Ask questions in forums/Discord
- **Build Projects** - Start with small scripts and expand
- **Contribute** - Share your creations and improvements

---

**Document Version:** 1.0  
**Last Updated:** January 24, 2026  
**Maintained By:** Mossy Documentation Team

For the latest information, visit the official PaperScript repository on GitHub.

