# Papyrus Compiler Guide

## Overview

The **Papyrus Compiler** is a command-line utility included with the Creation Kit that compiles Papyrus scripts (.psc source files) into executable .pex format for Fallout 4. It validates syntax, checks for errors, and can optimize/release code for production use.

**Location**: `...\Steam\SteamApps\common\Fallout 4\Papyrus Compiler\PapyrusCompiler.exe`

---

## Running the Compiler

### In the Creation Kit

**Simplest Method**: Use the **Papyrus Manager Window**
1. Right-click on a script in the Script Manager.
2. Select "Compile".
3. Errors appear in the editor output window.

**Command Equivalent**
The Creation Kit uses the following command internally:
```
PapyrusCompiler <file> -i="<scripts folder>" -o="Data\Scripts" -f="Institute_Papyrus_Flags.flg"
```

**Release Modes via Preferences**
- **Release Mode**: Adds `-r` and `-op` flags (removes debugOnly calls, optimizes).
- **Release Final Mode**: Adds `-r`, `-op`, and `-final` flags (also removes betaOnly calls).

---

## Command-Line Usage

### Basic Syntax

```
PapyrusCompiler <script or folder> [options]
```

**First Argument**
- Script filename or folder path (when using `-all` flag).
- Can also accept `.ppj` (Papyrus Project) file for project-based compilation.

**Command-Line Arguments Override** project settings when specified.

---

## Common Command-Line Parameters

### Import

**Flags**: `-import="<folders>"` or `-i="<folder1>;<folder2>"`

Specifies search paths for scripts and flag files (semicolon-separated).

```
PapyrusCompiler MyScript.psc -i="Data\Scripts;Data\Scripts\Source"
```

**Notes**
- Must include game base scripts folder.
- Multiple folders supported; files in earlier folders override later ones.
- For projects: specifies lookup paths, but project's own import folders override when searching.

### Output

**Flags**: `-output="<folder>"` or `-o="<folder>"`

Specifies destination folder for compiled .pex files (usually `Data\Scripts`).

```
PapyrusCompiler MyScript.psc -o="Data\Scripts"
```

### Flags

**Flags**: `-flags="<file>"` or `-f="<file>"`

Specifies the flag (.flg) file for processing conditional flags in scripts.

```
PapyrusCompiler MyScript.psc -f="Institute_Papyrus_Flags.flg"
```

**Standard Flag File**: `Institute_Papyrus_Flags.flg` (use for most Fallout 4 projects)

### Optimize

**Flags**: `-optimize` or `-op`

Enables basic optimizations on compiled scripts (recommended for release builds).

```
PapyrusCompiler MyScript.psc -op
```

**Effect**: Reduces script size and improves performance; removes dead code paths.

### Release

**Flags**: `-release` or `-r`

Removes all `debugOnly` function calls and optimizations.

```
PapyrusCompiler MyScript.psc -r
```

**Use**: Always enable for released/public scripts to reduce size and remove debug overhead.

### Final

**Flags**: `-final`

Removes all `betaOnly` function calls (in addition to `debugOnly` if `-r` is set).

```
PapyrusCompiler MyScript.psc -final
```

**Use**: Enable for final, production-ready scripts.

### All

**Flags**: `-all` or `-a`

Compiles every script in the specified folder (folder replaces filename as first argument).

```
PapyrusCompiler Data\Scripts -a
```

**Advantage**: Faster than individual compilations; compiler reuses data across files.

### Quiet

**Flags**: `-quiet` or `-q`

Suppresses all non-error output; only prints errors.

```
PapyrusCompiler Data\Scripts -a -q
```

**Use**: Reduces spam when compiling many files (pair with `-all`).

---

## Example Commands

### Compile a Single Script (Development)
```
PapyrusCompiler MyScript.psc -i="Data\Scripts" -o="Data\Scripts" -f="Institute_Papyrus_Flags.flg"
```

### Compile a Single Script (Release)
```
PapyrusCompiler MyScript.psc -i="Data\Scripts" -o="Data\Scripts" -f="Institute_Papyrus_Flags.flg" -r -op
```

### Compile a Single Script (Final Release)
```
PapyrusCompiler MyScript.psc -i="Data\Scripts" -o="Data\Scripts" -f="Institute_Papyrus_Flags.flg" -r -op -final
```

### Compile Entire Folder Quietly
```
PapyrusCompiler Data\Scripts -i="Data\Scripts" -o="Data\Scripts" -f="Institute_Papyrus_Flags.flg" -a -q
```

### Compile from Project File
```
PapyrusCompiler MyProject.ppj -r -op
```
(Command-line arguments override project settings)

---

## Batch Compilation

Create a `.bat` file for repeated compilation:

```batch
@echo off
cd /d "D:\Games\Fallout 4"
"Papyrus Compiler\PapyrusCompiler.exe" Data\Scripts -i="Data\Scripts" -o="Data\Scripts" -f="Institute_Papyrus_Flags.flg" -a -q
pause
```

**Features**
- `/d` flag changes drive if needed.
- `-a` compiles all scripts in folder.
- `-q` suppresses non-error output.
- `pause` keeps window open for result review.

---

## Papyrus Projects (.ppj)

Projects allow pre-configured build settings:

```xml
<?xml version="1.0" encoding="utf-8"?>
<Project>
  <Include>Data\Scripts</Include>
  <Flags>Institute_Papyrus_Flags.flg</Flags>
  <Output>Data\Scripts</Output>
  <Optimize>true</Optimize>
  <Release>true</Release>
</Project>
```

**Usage**: `PapyrusCompiler MyProject.ppj` (or override with command-line arguments)

See **Resource:Creation Kit/Papyrus Projects** for detailed project configuration.

---

## Common Errors

Compilation failures are reported with line numbers and descriptions. Common issues include:

- **Syntax Errors**: Mismatched brackets, invalid operators, type mismatches.
- **Undefined References**: Missing script imports, undefined variables/functions.
- **Type Mismatches**: Passing wrong type to function parameter.
- **Missing Imports**: Required script not in import path.

**Debug Strategy**
1. Check import paths (`-i` flag includes game scripts).
2. Verify flag file is correct (`-f` points to `Institute_Papyrus_Flags.flg`).
3. Review script for syntax (missing semicolons, unmatched quotes).
4. Ensure parent classes/dependencies are in import path.

**See Also**: Papyrus Compiler Error (detailed error reference)

---

## Integration with Text Editors

### Visual Studio Code / Sublime Text

Configure external tool to run compiler on save:

**VS Code (.vscode/tasks.json)**
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Compile Papyrus Script",
      "type": "shell",
      "command": "D:\\Games\\Fallout 4\\Papyrus Compiler\\PapyrusCompiler.exe",
      "args": [
        "${file}",
        "-i=Data\\Scripts",
        "-o=Data\\Scripts",
        "-f=Institute_Papyrus_Flags.flg"
      ],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": []
    }
  ]
}
```

Run with `Ctrl-Shift-B` or task command.

---

## Best Practices

1. **Always Compile in Creation Kit First**: Catches immediate syntax errors; Creation Kit auto-compiles.
2. **Use Import Paths Correctly**: Include base game scripts folder and all project dependencies.
3. **Enable Optimize & Release for Distribution**: Reduces size, removes debug overhead.
4. **Use Batch Compilation for Multiple Scripts**: Faster than individual compiles; saves compilation state.
5. **Flag File Must Match Game**: Use `Institute_Papyrus_Flags.flg` for Fallout 4.
6. **Test Compiled Scripts**: Verify .pex files work in-game; Papyrus can compile without runtime being correct.
7. **Version Control .psc Files**: Keep source scripts in version control, not .pex (they're generated).
8. **Use Quiet Mode in Automation**: Reduces output spam in batch/CI builds.
9. **Check Error Output**: Even with `-q`, errors still print; review them before release.
10. **Clean Build Occasionally**: Delete old .pex files to ensure fresh compilation.

---

## Related Resources

- **Resource:Creation Kit/Script File**: Papyrus script syntax and structure.
- **Resource:Creation Kit/Papyrus Manager Window**: In-editor compilation interface.
- **Resource:Creation Kit/Papyrus Projects**: Project configuration reference.
- **Papyrus Compiler Error**: Detailed error codes and solutions.
- **Creation Kit**: Main editor using the compiler internally.

---

## Quick Reference

| Flag | Short | Purpose | Example |
|------|-------|---------|---------|
| `-import=` | `-i=` | Script search paths (semicolon-separated) | `-i="Data\Scripts;Data\Scripts\Source"` |
| `-output=` | `-o=` | Output folder for .pex files | `-o="Data\Scripts"` |
| `-flags=` | `-f=` | Flag file for conditionals | `-f="Institute_Papyrus_Flags.flg"` |
| `-optimize` | `-op` | Enable optimizations | `-op` |
| `-release` | `-r` | Remove debugOnly calls | `-r` |
| `-final` | — | Remove betaOnly calls (plus debugOnly if -r set) | `-final` |
| `-all` | `-a` | Compile all scripts in folder | `-a` |
| `-quiet` | `-q` | Suppress non-error output | `-q` |

---

## Troubleshooting

**Compiler not found**: Verify path to `PapyrusCompiler.exe` (usually `Fallout 4\Papyrus Compiler\`).

**Import errors**: Check `-i` paths include base `Data\Scripts` folder and all dependencies.

**Flag file not found**: Ensure `-f` points to correct `.flg` file (usually `Institute_Papyrus_Flags.flg`).

**Output folder doesn't exist**: Create `Data\Scripts` folder if missing; use absolute paths if relative paths fail.

**Scripts not updating in-game**: Delete cached .pex files; recompile; ensure output folder is correct.

**Batch file won't run**: Use absolute paths; ensure `cd /d` matches game directory; check User Account Control permissions.
