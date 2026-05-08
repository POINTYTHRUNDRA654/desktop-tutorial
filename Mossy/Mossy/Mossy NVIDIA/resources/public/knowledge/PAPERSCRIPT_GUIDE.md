# PaperScript: Modern Scripting for Fallout 4 & Skyrim

**Version:** 1.0  
**Last Updated:** January 24, 2026  
**Scope:** Introduction and reference guide for PaperScript scripting language  
**Audience:** Scripters, addon developers, advanced modders

## Table of Contents

1. [Introduction](#introduction)
2. [What is PaperScript](#what-is-paperscript)
3. [Why Use PaperScript](#why-use-paperscript)
4. [Getting Started](#getting-started)
5. [Basic Syntax](#basic-syntax)
6. [Features & Examples](#features--examples)
7. [Comparison with Papyrus](#comparison-with-papyrus)
8. [Advanced Topics](#advanced-topics)
9. [Resources & Community](#resources--community)

---

## Introduction

PaperScript is a modern scripting language that transpiles into valid Papyrus code, offering a more developer-friendly alternative to writing Papyrus directly. It's inspired by C#, Rust, and Scala, bringing modern language features to Fallout 4 and Skyrim modding.

### Key Facts

- **Status:** Early development (V1), with V2 planned to compile directly to PEX bytecode
- **Supported Games:** Skyrim SE/AE, Fallout 4
- **Output:** Transpiles to valid Papyrus .psc files
- **License:** Check official repository for current license
- **Community:** Active development with community contributions

### What You Need to Know

PaperScript is not a replacement for Papyrus *yet*, but it provides significant improvements to the developer experience while maintaining full compatibility with existing Papyrus code and game systems.

---

## What is PaperScript

### Core Definition

PaperScript is a transpiler that converts modern, user-friendly code into valid Papyrus code. Think of it as a "better way to write Papyrus" that compiles down to what the game actually runs.

```
PaperScript Code → Transpiler → Papyrus Code → Game Engine
```

### What PaperScript Adds

**Modern Syntax:**
- C#/Rust-inspired syntax
- Type inference
- Simplified function declarations
- Modern control flow

**Better Developer Experience:**
- Clearer code organization
- More intuitive syntax
- Reduced boilerplate
- Better error messages

**Maintained Compatibility:**
- 100% compatible with Papyrus
- Can mix with regular Papyrus if needed
- All game functions available
- All existing plugins work with PaperScript

### What PaperScript Is NOT

- **Not a standalone language** - Requires transpilation to Papyrus
- **Not a complete Papyrus replacement** - Yet. V2 aims for PEX bytecode compilation
- **Not removing Papyrus knowledge** - Understanding Papyrus still essential
- **Not faster than Papyrus** - Same runtime performance (compiles to same code)
- **Not changing game limitations** - Same function set and constraints as Papyrus

---

## Why Use PaperScript

### Development Speed

**Papyrus:**
```papyrus
ScriptName EquipHandler extends ObjectReference

Actor Property PlayerREF Auto
MiscItem Property Gold001 Auto

Event OnEquipped(Actor akActor)
    PlayerREF.AddItem(Gold001, 10)
    Debug.MessageBox("The magical armor grants you money")
EndEvent

Event OnUnequipped(Actor akActor)
    PlayerREF.RemoveItem(Gold001, 10)
    Debug.MessageBox("The magical armor takes your money")
EndEvent
```

**PaperScript:**
```paperscript
script EquipHandler : ObjectReference {
    auto property PlayerREF: Actor
    auto property Gold001: MiscItem
    
    event OnEquipped(actor: Actor) {
        PlayerREF.AddItem(Gold001, 10)
        Debug.MessageBox("The magical armor grants you money")
    }
    
    event OnUnequipped(actor: Actor) {
        PlayerREF.RemoveItem(Gold001, 10)
        Debug.MessageBox("The magical armor takes your money")
    }
}
```

**Benefits:**
- More concise syntax
- Less boilerplate
- Clearer intent
- Faster to write

### Code Clarity

PaperScript's modern syntax makes complex logic easier to understand:
- Type inference reduces redundant type declarations
- Arrow functions (`->`) for returns
- Unified naming conventions
- Consistent structure

### Better Tooling Potential

As PaperScript develops:
- IDE support and syntax highlighting
- Better error detection
- Automated refactoring
- Code analysis tools

### Future-Proofing

Learning PaperScript prepares you for:
- V2 bytecode compilation (when released)
- Potential performance improvements
- Advanced features not possible in Papyrus
- Easier migration from other languages

---

## Getting Started

### Installation

**Step 1: Get PaperScript**
- Visit official GitHub repository
- Download latest release
- Extract to your development folder

**Step 2: Configure Your Setup**
- Add PaperScript transpiler to your PATH (optional)
- Or reference directly in batch scripts
- Set up output folder for generated .psc files

**Step 3: Create Your First Script**
- Create `.paper` file with PaperScript code
- Run transpiler
- Output .psc file goes to Creation Kit scripts folder
- Compile normally in Creation Kit

### Project Structure

```
MyMod/
├── PaperScript/
│   ├── src/
│   │   ├── EquipHandler.paper
│   │   └── ItemFunctions.paper
│   └── build/
│       ├── EquipHandler.psc
│       └── ItemFunctions.psc
├── Scripts/
│   ├── (generated .psc files copied here)
│   └── (for Creation Kit)
└── README.md
```

### Basic Workflow

1. Write PaperScript code (`.paper` files)
2. Run transpiler (generates `.psc` files)
3. Copy `.psc` to Fallout 4/Data/Scripts/Source/
4. Compile in Creation Kit as normal
5. Package mod with compiled `.pex` files

### IDE Setup

**Recommended Editors:**
- Visual Studio Code with syntax highlighting extension (if available)
- Notepad++ with custom language definition
- Any text editor (syntax highlighting helps but not required)

**Best Practice:**
- Edit `.paper` files
- Keep `.psc` files in separate build folder
- Don't edit `.psc` files directly
- Regenerate when updating

---

## Basic Syntax

### Script Declaration

**Papyrus:**
```papyrus
ScriptName MyScript extends ObjectReference
```

**PaperScript:**
```paperscript
script MyScript : ObjectReference {
    // script body
}
```

### Properties

**Papyrus:**
```papyrus
Actor Property PlayerREF Auto
Int Property MyInteger = 10 Auto
Float Property MyFloat Auto Hidden
```

**PaperScript:**
```paperscript
auto property PlayerREF: Actor
auto property MyInteger: Int = 10
property MyFloat: Float  // hidden by default
```

### Function/Event Definition

**Papyrus:**
```papyrus
Function MyFunction(int param1, float param2)
    Debug.MessageBox("Hello")
EndFunction

Function ReturnValue() returns Int
    return 42
EndFunction

Event OnEquipped(Actor akActor)
    Debug.MessageBox("Equipped!")
EndEvent
```

**PaperScript:**
```paperscript
def MyFunction(param1: Int, param2: Float) {
    Debug.MessageBox("Hello")
}

def ReturnValue() -> Int {
    return 42
}

event OnEquipped(actor: Actor) {
    Debug.MessageBox("Equipped!")
}
```

### Variables & Types

**Papyrus:**
```papyrus
int myInt = 10
float myFloat = 3.14
string myString = "hello"
bool myBool = true
Actor myActor
```

**PaperScript:**
```paperscript
myInt: Int = 10
myFloat: Float = 3.14
myString: String = "hello"
myBool: Bool = true
myActor: Actor = none
```

### Control Flow

**Papyrus:**
```papyrus
If (condition)
    DoSomething()
ElseIf (other)
    DoOther()
Else
    DoDefault()
EndIf

While (condition)
    DoLoop()
EndWhile
```

**PaperScript:**
```paperscript
if (condition) {
    DoSomething()
} else if (other) {
    DoOther()
} else {
    DoDefault()
}

while (condition) {
    DoLoop()
}
```

### Preprocessor Directives

PaperScript includes a simple C-like preprocessor:

```paperscript
#define DEBUG
#define VERSION "1.0"

script MyScript {
    #if DEBUG
    event OnInit() {
        Debug.Notification("Debug mode enabled")
    }
    #endif
}
```

---

## Features & Examples

### Example 1: Simple Event Handler

**PaperScript:**
```paperscript
script OnEquipHandler : ObjectReference {
    auto property PlayerREF: Actor
    auto property Gold001: MiscItem
    
    event OnEquipped(actor: Actor) {
        PlayerREF.AddItem(Gold001, 10)
        Debug.MessageBox("The magical armor grants you money")
    }
    
    event OnUnequipped(actor: Actor) {
        PlayerREF.RemoveItem(Gold001, 10)
        Debug.MessageBox("The magical armor takes your money")
    }
}
```

**Equivalent Papyrus:**
```papyrus
ScriptName OnEquipHandler extends ObjectReference

Actor Property PlayerREF Auto
MiscItem Property Gold001 Auto

Event OnEquipped(Actor akActor)
    PlayerREF.AddItem(Gold001, 10)
    Debug.MessageBox("The magical armor grants you money")
EndEvent

Event OnUnequipped(Actor akActor)
    PlayerREF.RemoveItem(Gold001, 10)
    Debug.MessageBox("The magical armor takes your money")
EndEvent
```

### Example 2: Functions with Return Types

**PaperScript:**
```paperscript
script SomeFunctions : ObjectReference {
    auto property Gold001: MiscItem

    def VoidWithNoArgs() {
        Debug.MessageBox("Hello World")
    }
    
    def VoidWithArgs(player: Actor, amount: Int) {
        player.AddItem(Gold001, amount)
    }
    
    def BoolWithNoArgs() -> Bool {
        return true
    }
    
    def FloatWithArgs(first: Float, second: Float) -> Float {
        return first + second
    }
}
```

### Example 3: Conditional Compilation

**PaperScript:**
```paperscript
#define DEBUG
#define LOG_LEVEL 2

script DebugScript {
    
    def LogMessage(msg: String) {
        #if DEBUG
        Debug.Notification(msg)
        #if LOG_LEVEL >= 2
        Debug.MessageBox(msg)
        #endif
        #endif
    }
    
    event OnInit() {
        LogMessage("Script initialized")
    }
}
```

### Example 4: Type Inference

**PaperScript:**
```paperscript
script TypeInference {
    
    def ProcessData(data: Int) {
        // Type is inferred from assignment
        result = data * 2
        name = "Output"
        active = true
        
        // Can still be explicit if desired
        explicit_int: Int = data * 3
    }
}
```

### Example 5: Arrays and Collections

**PaperScript:**
```paperscript
script ArrayExample {
    
    def ArrayOperations() {
        items: MiscItem[] = new MiscItem[10]
        actors: Actor[] = new Actor[5]
        
        // Populate array
        i = 0
        while (i < items.length) {
            items[i] = none
            i += 1
        }
    }
}
```

---

## Comparison with Papyrus

### Syntax Differences

| Aspect | Papyrus | PaperScript |
|--------|---------|------------|
| Script Declaration | `ScriptName X extends Y` | `script X : Y { }` |
| Properties | `Type Property Name Auto` | `auto property Name: Type` |
| Functions | `Function Name()` | `def Name()` |
| Return Type | `returns Type` | `-> Type` |
| End Block | `EndFunction/EndIf/EndWhile` | `}` (brace-based) |
| Comments | `; comment` | `// comment` |
| Type Position | `Type variable` | `variable: Type` |

### Feature Comparison

| Feature | Papyrus | PaperScript |
|---------|---------|------------|
| Basic scripting | ✓ | ✓ |
| Events | ✓ | ✓ |
| Properties | ✓ | ✓ |
| Functions | ✓ | ✓ |
| Conditionals | ✓ | ✓ |
| Loops | ✓ | ✓ |
| Type inference | ✗ | ✓ |
| Preprocessor | Limited | Full C-like |
| Modern syntax | ✗ | ✓ |
| Transpile only | N/A | ✓ |
| Direct to PEX | N/A | Planned V2 |

### Learning Curve

**Papyrus Experience:**
- Familiar with game scripting
- Different syntax but same concepts
- Quick transition (1-2 hours)
- Can reference Papyrus guides

**New to Scripting:**
- PaperScript more accessible
- Modern syntax is more intuitive
- May need Papyrus reference for game-specific functions
- Learning both is beneficial

---

## Advanced Topics

### Custom Build System

Create a batch file for automated transpilation:

```batch
@echo off
echo Transpiling PaperScript files...

set PAPERSCRIPT_PATH=C:\PaperScript\transpiler
set SOURCE_DIR=PaperScript\src
set BUILD_DIR=Scripts\Source

for %%f in (%SOURCE_DIR%\*.paper) do (
    echo Transpiling %%f
    %PAPERSCRIPT_PATH%\paperscript.exe %%f -o %BUILD_DIR%\
)

echo Build complete!
pause
```

### Integration with Creation Kit Workflow

1. **Development Phase:**
   - Edit `.paper` files
   - Run transpiler
   - Verify `.psc` output

2. **Creation Kit Phase:**
   - Open plugin in CK
   - Creation Kit compiles `.psc` to `.pex`
   - Test in-game

3. **Distribution Phase:**
   - Package only `.pex` files
   - Source `.paper` files optional (for open source)

### Mixing Papyrus and PaperScript

You can use both in the same project:

```paperscript
#define USE_EXTERNAL_UTILS

script MyMixedScript {
    
    event OnInit() {
        #if USE_EXTERNAL_UTILS
        ; Can call functions from regular Papyrus scripts
        CallPapyrusFunction()
        #endif
    }
}
```

### Version Management

Track PaperScript version in your mod:

```paperscript
#define PAPERSCRIPT_VERSION "1.0"
#define MOD_VERSION "1.0"

script VersionInfo {
    string property ModVersion = MOD_VERSION
    string property ScriptLanguage = "PaperScript " + PAPERSCRIPT_VERSION
}
```

---

## Best Practices

### Code Organization

**Good:**
```paperscript
script EventHandler : ObjectReference {
    auto property Item: MiscItem
    auto property TargetActor: Actor
    
    event OnInit() {
        // Initialization
    }
    
    event OnEquipped(actor: Actor) {
        HandleEquip(actor)
    }
    
    event OnUnequipped(actor: Actor) {
        HandleUnequip(actor)
    }
    
    def HandleEquip(actor: Actor) {
        // Implementation
    }
    
    def HandleUnequip(actor: Actor) {
        // Implementation
    }
}
```

**Bad:**
```paperscript
script EventHandler : ObjectReference {
    // Mixed events and helper code
    // No clear organization
}
```

### Naming Conventions

**Variables:**
```paperscript
camelCaseForVariables: Int = 10
```

**Functions:**
```paperscript
def DoSomethingImportant() { }
```

**Properties:**
```paperscript
auto property MyProperty: Actor
```

### Documentation

Use comments for clarity:

```paperscript
script EquipHandler : ObjectReference {
    ; Equipment to grant
    auto property BonusItem: MiscItem
    
    ; Player reference for additions
    auto property PlayerREF: Actor
    
    ; Grants bonus item to player on equip
    event OnEquipped(actor: Actor) {
        PlayerREF.AddItem(BonusItem, 1)
    }
}
```

### Error Prevention

**Type checking:**
```paperscript
def SafeAddItem(actor: Actor, item: MiscItem, count: Int) {
    if (actor && item && count > 0) {
        actor.AddItem(item, count)
    }
}
```

**Null checking:**
```paperscript
def Initialize() {
    if (PlayerREF == none) {
        PlayerREF = Game.GetPlayer()
    }
}
```

---

## Troubleshooting

### Common Issues

**"Transpiler not found"**
→ Ensure PaperScript is in PATH or referenced correctly
→ Check installation is complete

**"Generated .psc won't compile"**
→ Verify input `.paper` syntax is correct
→ Check for unsupported features
→ Review transpiler output for errors

**"Missing function references"**
→ Ensure all referenced game functions exist in target game
→ Check Creation Kit documentation
→ Some functions require specific DLC

**"Type mismatch errors"**
→ Verify type declarations match usage
→ Check function signatures
→ Confirm property types

### Getting Help

1. Check official PaperScript documentation
2. Review generated `.psc` files for clues
3. Test with simple examples first
4. Consult Papyrus documentation for game-specific issues
5. Ask in community forums/Discord

---

## Resources & Community

### Official Resources

- **GitHub Repository** - Source code and issue tracking
- **Documentation** - Official docs and examples
- **Release Notes** - Latest features and changes
- **Issue Tracker** - Report bugs and suggest features

### Community Resources

**Forums:**
- Nexus Mods Fallout 4 modding forums
- r/modding subreddits
- Game-specific modding communities

**Discord Servers:**
- Official PaperScript server (if available)
- Fallout modding communities
- Skyrim modding communities

### Learning Path

1. **Familiarize with Papyrus** (if new to scripting)
   - Understand game functions
   - Learn basic concepts
   - Review existing mods

2. **Learn PaperScript Syntax**
   - Read documentation
   - Study examples
   - Practice with simple scripts

3. **Start Small Projects**
   - Event handlers
   - Simple functions
   - Item/NPC modifications

4. **Expand to Complex Scripts**
   - Multi-function systems
   - Conditional logic
   - Advanced game integration

### Staying Updated

- Watch GitHub for releases
- Check official documentation
- Join community discussions
- Participate in feedback

---

## Future of PaperScript

### V2 Roadmap

**Planned Features:**
- Direct PEX bytecode compilation (no Papyrus intermediate)
- Advanced language features not in Papyrus
- Potential performance improvements
- Enhanced tooling and IDE support

**Benefits:**
- Possible new capabilities
- Better error detection
- Faster compilation
- More powerful language constructs

### Migration Path

Scripts written for V1 should be largely compatible with V2:
- Same input syntax (likely)
- Same game function calls
- Smooth upgrade path
- Backward compatibility expected

---

## Quick Reference

### File Extension
- `.paper` - PaperScript source files
- `.psc` - Generated Papyrus files
- `.pex` - Compiled (from Creation Kit)

### Comment Syntax
```paperscript
// Single line comment
/* Multi-line
   comment */
```

### Basic Structure
```paperscript
#define FEATURE_FLAG

script ScriptName : ExtendScript {
    auto property Prop1: Type
    property Prop2: Type
    
    event OnInit() {
        // Initialization
    }
    
    def PublicFunction() {
        // Implementation
    }
}
```

### Common Patterns

**Property with Default:**
```paperscript
auto property Count: Int = 0
```

**Function with Return:**
```paperscript
def GetValue() -> Int {
    return 42
}
```

**Conditional Compilation:**
```paperscript
#if DEBUG
Debug.Notification("Debug info")
#endif
```

---

**Document Version:** 1.0  
**Last Updated:** January 24, 2026  
**Maintained By:** Mossy Documentation Team  
**Source:** PaperScript Project, Community Resources

## Additional Resources

- **Official GitHub:** Check PaperScript official repository
- **Documentation:** Official PaperScript docs
- **Papyrus Reference:** Creation Kit documentation
- **Community:** Modding forums and Discord servers

