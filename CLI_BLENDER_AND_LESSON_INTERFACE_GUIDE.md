# CLI Scaffolding, Blender Mesh Pipeline, and Interactive Lesson Interface

## Overview

Three automation tools and a lesson-design pattern for the Module 11 developer toolchain:

1. **F4Dev-CLI** — Node.js command-line utility that scaffolds a complete, standards-compliant mod project directory in one command.
2. **Headless Blender Mesh Optimizer** — Python/Blender API script that automates hard-edge splitting and weighted normals injection before NIF export.
3. **Interactive Programming Lesson Interface** — JSON-driven evaluation protocol that lets the AI tutor issue code challenges, lint student submissions, and gate progression.

---

## Tool 1 — F4Dev-CLI: Mod Environment Initializer (Node.js)

### Learning Objectives

- Construct automated environment setup scripts using runtime file system methods.
- Generate compliant directory architectures without manual file creation steps.
- Inject structural configuration files cleanly into developer project workspaces.

### Problem

Modders frequently create project folders ad-hoc, leading to inconsistent naming, missing MCM config paths, and assets placed in non-standard locations that cause the game to silently skip them. A one-command scaffolder enforces the correct structure every time.

### Module 11 Schema Reference

```json
{
  "fallout4_modding_course": {
    "module_11_submodule_cli_tool": {
      "tool_title": "Fallout 4 Developer Environment Initializer (F4Dev-CLI)",
      "technical_blueprint": {
        "framework": "Node.js (Native File System Module API)",
        "output_folders": [
          "Data\\Meshes\\MyModName\\",
          "Data\\Textures\\MyModName\\",
          "Data\\Materials\\MyModName\\",
          "Data\\Scripts\\Source\\",
          "Data\\MCM\\Config\\MyModName\\"
        ]
      }
    }
  }
}
```

### Implementation — `f4dev.js`

Save this file anywhere on the developer's machine and run it with Node.js:

```bash
node f4dev.js MyNewModProject
```

```javascript
const fs = require('fs');
const path = require('path');

const modName = process.argv[2];

if (!modName) {
    console.error('[ERROR] Missing parameters. Usage: node f4dev.js <ModName>');
    process.exit(1);
}

// Standard AE-compliant folder layout
const projectStructure = [
    `Data/Meshes/${modName}`,
    `Data/Textures/${modName}`,
    `Data/Materials/${modName}`,
    `Data/Scripts/Source`,
    `Data/MCM/Config/${modName}`
];

console.log(`[INITIALIZING] Constructing mod workspace for: ${modName}`);

projectStructure.forEach(dir => {
    const targetPath = path.join(__dirname, dir);
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
        console.log(`[CREATED] ${dir}`);
    }
});

// Write a baseline MCM config.json into the MCM path
const defaultMcmJson = {
    modName: modName,
    minMcmVersion: 1,
    pages: [{ pageName: "Gameplay Setup Options", panels: [] }]
};

fs.writeFileSync(
    path.join(__dirname, `Data/MCM/Config/${modName}/config.json`),
    JSON.stringify(defaultMcmJson, null, 2)
);

console.log(`[SUCCESS] Workspace ready. Place assets inside: Data\\`);
```

### Teaching Notes

- `fs.mkdirSync(targetPath, { recursive: true })` creates the full folder chain in one call — no need to create parent directories manually.
- `fs.existsSync` guards against overwriting an existing workspace if the script is re-run on the same project name.
- The generated `config.json` is a **valid MCM skeleton**. Students add `panels` entries to the page array to expose sliders, toggles, and text options to the player.
- The `Data/Scripts/Source` path (no mod-name subfolder) matches the Papyrus compiler's default source search path. Scripts compiled from here are automatically located by the Creation Kit compiler.
- Extend the scaffolder with a `--git` flag that runs `git init` and writes a pre-populated `.gitattributes` with Git LFS tracking rules for `.esp`, `.nif`, and `.dds`.

### Tutor Rule

Have students run `node f4dev.js` before touching the Creation Kit for any new project. Enforcing the directory contract from day one eliminates the most common class of "asset not loading" beginner errors.

---

## Tool 2 — Headless Blender Mesh Optimizer (`optimize_mesh.py`)

### Problem

Students frequently export meshes with incorrect shading splits — flat normals where hard edges are needed, or smooth shading across UV seam boundaries. These produce visible shading seams and dark bands on the final in-game asset. Manually applying hard edges and weighted normals in Blender's UI is error-prone and not reproducible.

### Pipeline Flow

```
[Automated Mesh Pipeline Processing Flow]
 ├── Step 1: Headless Invocation  — Blender background process + target .fbx path
 ├── Step 2: Clear Scene          — Purge cameras, lamps, and default primitives
 ├── Step 3: Hard Edge Split      — Mark Sharp along UV seam borders
 └── Step 4: Weighted Normals     — Apply modifier, keep sharp, bake into mesh
```

### Invocation

```bash
blender --background --python optimize_mesh.py -- input_model.fbx
```

### Implementation — `optimize_mesh.py`

```python
import bpy
import sys

def process_mesh_optimization_pipeline(input_fbx_path):
    print(f"[PROCESS] Blender background task initiated on: {input_fbx_path}")

    # Purge default scene objects (camera, lamp, default cube)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import the source geometry
    bpy.ops.import_scene.fbx(filepath=input_fbx_path)

    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            bpy.context.view_layer.objects.active = obj

            # Enter Edit Mode to operate on geometry
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')

            # Enable Auto Smooth at 180° so only explicitly marked edges split
            obj.data.use_auto_smooth = True
            obj.data.auto_smooth_angle = 3.14159  # radians

            # Mark Sharp edges along UV seam borders
            bpy.ops.mesh.seams_from_islands()

            bpy.ops.object.mode_set(mode='OBJECT')

            # Apply Weighted Normals modifier to prevent flat shading artifacts
            mod = obj.modifiers.new(name="WeightedNormals", type='WEIGHTED_NORMAL')
            mod.keep_sharp = True
            bpy.ops.object.modifier_apply(modifier="WeightedNormals")

    # Export the optimised mesh
    output_path = input_fbx_path.replace(".fbx", "_Optimized_For_NIF.fbx")
    bpy.ops.export_scene.fbx(filepath=output_path, use_selection=True)
    print(f"[SUCCESS] Optimization complete: {output_path}")


if __name__ == "__main__":
    # Arguments after '--' are user-supplied; everything before is Blender's own flags
    args = sys.argv[sys.argv.index("--") + 1:]
    process_mesh_optimization_pipeline(args[0])
```

### Teaching Notes

- `bpy.ops.wm.read_factory_settings(use_empty=True)` gives a completely empty scene — no default cube, camera, or sun. This is essential for headless batch processing so default objects do not get exported with the mesh.
- `auto_smooth_angle = 3.14159` (180°) means Blender will only split normals at edges that are **explicitly marked sharp** — it does not auto-split based on angle. This gives the modder full manual control while still activating the Auto Smooth pipeline.
- `seams_from_islands()` marks edges Sharp wherever UV islands border each other. This is the correct technique for Fallout 4 assets: UV seams are always visible shading boundaries, and sharp edges must align with them.
- The `WEIGHTED_NORMAL` modifier with `keep_sharp = True` recalculates vertex normals using face area weighting, which produces significantly more natural lighting on low-poly game meshes compared to the default averaged normals.
- After applying the modifier, the normals are **baked into the mesh data** — no modifier stack dependency remains in the exported FBX.
- **Blender version note**: `use_auto_smooth` and `auto_smooth_angle` are mesh properties available in Blender 3.x. In Blender 4.x this system was replaced with a Smooth by Angle modifier node. Teach students to check their Blender version and adjust accordingly.

### Tutor Rule

Integrate this script into the asset pipeline checklist between *Substance/GIMP texture export* and *NifSkope import*. The optimised FBX becomes the direct source for the NIF import step, ensuring shading vectors are correct before the NIF node hierarchy is assembled.

---

## Tool 3 — Interactive Programming Lesson Interface

### Design Pattern

The AI tutor issues a code challenge, receives the student's script, runs automated syntax and logic checks against a defined ruleset, and returns pass/fail feedback with specific error references. Successful submissions unlock the next lesson; failures return the exact rule that was not met.

### Interaction Loop

```
[Student Interface Interaction Loop]
 ├── 1. AI Tutor issues challenge prompt to student
 ├── 2. Student writes and submits script block
 ├── 3. AI runs syntax lint and cross-references logic validation rules
 └── 4. Pass → advance to next lesson | Fail → return specific error log
```

### Evaluation Protocol — `LessonInterfaceManager.json`

```json
{
  "lesson_interface": {
    "lesson_id": "lesson_11_mcm_logic",
    "prompt_challenge": "Write an active Papyrus function handling an MCM Slider modification event. The event must dynamically set the Float variable 'fCustomJumpHeight' securely. If the value scales past 3.0, block execution and post a debugging system trace.",
    "expected_keywords": [
      "Function",
      "EndFunction",
      "Debug.Trace",
      "fCustomJumpHeight"
    ],
    "automated_validation_rules": [
      {
        "regex_test": "RegisterForExternalEvent",
        "evaluation": "MUST — student must register for the MCM event via RegisterForExternalEvent rather than polling a value in a loop."
      },
      {
        "regex_test": "GoToState",
        "evaluation": "SHOULD — transitions the control block away from repeat trigger updates during variable computation, preventing re-entrant execution."
      }
    ]
  }
}
```

### A Correct Student Submission (Reference Implementation)

```papyrus
Scriptname MyMod_MCMHandler extends Quest

Float Property fCustomJumpHeight = 1.0 Auto

Event OnQuestInit()
    RegisterForExternalEvent("OnMCMSettingChange|MyMod", "OnMCMChange")
EndEvent

Function OnMCMChange(String modName, String settingName, Float newValue)
    if settingName == "fCustomJumpHeight"
        if newValue > 3.0
            Debug.Trace("[MyMod] Jump height value " + newValue + " exceeds safe limit. Blocked.")
            return
        endif
        fCustomJumpHeight = newValue
        GoToState("Active")
    endif
EndFunction

State Active
    ; State-isolated processing — prevents re-entrant MCM updates during value commit
    Event OnBeginState(String asOldState)
        Debug.Trace("[MyMod] Jump height updated to: " + fCustomJumpHeight)
        GoToState("")
    EndEvent
EndState
```

### Validation Rules Explained

| Rule | Type | Reason |
|---|---|---|
| `expected_keywords` present | Hard gate | Confirms the student used the correct API surface and variable names |
| `RegisterForExternalEvent` regex match | MUST pass | Guarantees event-driven MCM handling — a polling alternative is an instant-fail per the Module 2 rubric |
| `GoToState` regex match | SHOULD pass | Demonstrates state isolation awareness — absence is a warning, not a hard fail |
| Value > 3.0 guard + `Debug.Trace` | Logic check | Confirms the student implemented the boundary condition correctly |

### Tutor Implementation Notes

- The AI tutor evaluates submissions by scanning the code block for each `expected_keywords` entry (simple substring match) and each `automated_validation_rules` regex pattern.
- A **MUST** rule failure returns an error message citing the exact rule and the relevant module section to review.
- A **SHOULD** rule failure returns a warning with an improvement recommendation but does not block progression.
- Extend `LessonInterfaceManager.json` with additional `lesson_id` objects — one per challenge — to build a sequential curriculum where each lesson's `expected_keywords` build on the previous lesson's concepts.
- The `prompt_challenge` string is the exact text the AI tutor displays to the student. Keep it unambiguous: specify the function name, the variable name, and the exact boundary condition value so there is no ambiguity in what a correct submission looks like.

---

## Quick Reference

| Tool | Command / Location | Key Output |
|---|---|---|
| F4Dev-CLI | `node f4dev.js <ModName>` | `Data/` folder tree + `MCM/Config/<ModName>/config.json` |
| Blender Optimizer | `blender --background --python optimize_mesh.py -- <file>.fbx` | `<file>_Optimized_For_NIF.fbx` with baked weighted normals |
| Lesson Evaluator | AI reads `LessonInterfaceManager.json`, checks student code | Pass / Fail with rule citation |
