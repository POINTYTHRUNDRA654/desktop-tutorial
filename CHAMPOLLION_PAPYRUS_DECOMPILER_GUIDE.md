# Champollion — Papyrus Decompiler (Reading Compiled Scripts)

**Tool type:** Command-line Papyrus decompiler · **Author:** Orvid · **Input:** `.pex` → **Output:** `.psc`

## What it does
Champollion converts **compiled** Papyrus bytecode (`.pex`) back into **readable source** (`.psc`). Use it when a mod ships only compiled scripts and you need to learn from, debug, or patch its logic.

## When you need it
- A mod you depend on has a bug and the author is gone — you want to make a personal fix.
- You are learning and want to see how a well-made mod implements a system.
- You lost your own source and only have the compiled output.

## Usage
```
Champollion.exe "Path\To\Script.pex" -p "OutputDir"
```
It reconstructs functions, events, properties, and control flow faithfully. Caveats:
- Original **local variable names are lost** (they become `temp0`, `temp1`, …).
- **Comments are gone**.
- **F4SE native functions** cannot be decompiled — they live in the DLL, not the `.pex`; they appear as external calls.

## Round-trip (decompile → edit → recompile)
1. Decompile with Champollion.
2. Edit the `.psc`.
3. Recompile with **Caprica** (fast open-source compiler) or the **Creation Kit PapyrusCompiler**.
4. Set the compiler **import path** to the base game scripts: extract `Fallout 4 - Misc.ba2` → `Scripts/Source/...`, or use `Data/Scripts/Source/Base`.

## Ethics & permissions
Only decompile for **personal learning or private fixes**. Do **not** redistribute another author's scripts or a patched version without explicit permission — that is a permissions violation on Nexus and Bethesda.net.

## Common issues
- Missing base-script imports → decompile or recompile errors. Point the import path at the base sources.
- Trying to decompile a script that is mostly F4SE native calls → little useful output.

## Related
See: `PAPYRUS_COMPILER_GUIDE`, `EXTENDING_SCRIPTS_PAPYRUS_GUIDE`, and the F4SE plugin development notes in Mossy's brain.
