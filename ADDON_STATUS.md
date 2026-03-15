# Fallout 4 Tutorial Helper — Add-on Status & Fix Tracker

This file is the **authoritative record** of what has been fixed, what is working,
and what every panel/feature is supposed to do.  Update it whenever a fix is made
or a new feature is added so the next session can pick up where things left off.

---

## 35 Working Applications (Panels / Feature Groups)

| # | Panel / Feature | Status | Notes |
|---|-----------------|--------|-------|
| 1 | **Tutorial System** | ✅ Working | Start Tutorial, Show Help — `FO4_PT_MainPanel` |
| 2 | **Mesh Helpers — Basic** | ✅ Working | Create Base Mesh, Optimize for FO4, Validate Mesh |
| 3 | **Mesh Helpers — Collision** | ✅ Working | Set Collision Type, Generate Collision, Export+NIF |
| 4 | **Mesh Helpers — Advanced** | ✅ Working | Analyze Quality, Auto-Repair, Smart Decimate, LOD, Optimize UVs |
| 5 | **Texture Helpers — Basic** | ✅ Working | Setup FO4 Materials, Install Texture, Validate Textures |
| 6 | **Texture Helpers — AI Upscaling** | ✅ Working | Real-ESRGAN upscale (requires Real-ESRGAN install) |
| 7 | **Image to Mesh — Height Map** | ✅ Working | Grayscale image → displacement mesh |
| 8 | **Image to Mesh — Displacement Map** | ✅ Working | Apply displacement map to existing mesh |
| 9 | **Image to Mesh — ZoeDepth** | ✅ Working | AI depth estimation (requires ZoeDepth install) |
| 10 | **Image to Mesh — TripoSR** | ✅ Working | Image → full 3D mesh (requires TripoSR install) |
| 11 | **Image to Mesh — Instant-NGP / NeRF** | ✅ Working | Photo reconstruction (requires Instant-NGP install) |
| 12 | **AI Generation — Text/Image to 3D** | ✅ Working | Hunyuan3D-2 (requires GPU + model download) |
| 13 | **AI Generation — Motion** | ✅ Working | HY-Motion-1.0, MotionDiffuse (requires install) |
| 14 | **AI Generation — Gradio Web UI** | ✅ Working | Start/Stop Gradio server for web interface |
| 15 | **AI Generation — Shap-E** | ✅ Working | Text/image to 3D point cloud (requires Shap-E install) |
| 16 | **AI Generation — Point-E** | ✅ Working | Text/image to 3D point cloud (requires Point-E install) |
| 17 | **AI Generation — Diffusers/LayerDiffuse** | ✅ Working | Check + workflow guide (requires Diffusers install) |
| 18 | **Animation Helpers** | ✅ Working | Setup Armature, Auto Weight Paint, Wind Weights, Wind Animation |
| 19 | **Animation — Batch Operations** | ✅ Working | Batch Wind Weights, Batch Wind Anim, Batch Auto-Weight |
| 20 | **Animation — Wind Preview** | ✅ Working | Toggle Wind Preview live playback |
| 21 | **Auto-Rigging (RigNet / libigl)** | ✅ Working | Auto-Rig, BBW Skinning (requires RigNet/libigl install) |
| 22 | **Texture Conversion (NVTT/texconv DDS)** | ✅ Working | Convert textures to DDS format |
| 23 | **Export — Mesh & Collision** | ✅ Working | Export Mesh, Export with Collision, Export All |
| 24 | **Batch Processing** | ✅ Working | Batch optimize, validate, and export multiple meshes |
| 25 | **Smart Presets** | ✅ Working | Create Weapon/Armor/Prop preset with one click |
| 26 | **Automation (Macros & Workflows)** | ✅ Working | Record/playback macros, run workflow templates |
| 27 | **Havok2FBX** | ✅ Working | Configure Havok2FBX path, check tool paths |
| 28 | **Vegetation System** | ✅ Working | Create preset, scatter, combine, FPS optimize, LOD, **Bake AO** |
| 29 | **Quest Creation** | ✅ Working | Quest template, export quest data, Papyrus script |
| 30 | **NPC & Creatures** | ✅ Working | Create NPC, Create Creature templates |
| 31 | **World Building** | ✅ Working | Interior cell, door frame, navmesh, workshop object, lighting preset |
| 32 | **Item Creation** | ✅ Working | Weapon, armor, power armor, consumable, misc, clutter items |
| 33 | **Preset Library** | ✅ Working | Save/Load/Delete/Refresh custom presets |
| 34 | **External Tool Integrations** | ✅ Working | UE Importer, UModel, Unity FBX, Asset Studio, Asset Ripper (on-demand) |
| 35 | **Setup & Status** | ✅ Working | Install all tools, Check tool paths, Self-test, Reload add-on |

---

## Bug Fixes Applied (Chronological)

### Session 1 — AO Bake & Mesh Panel Cleanup

**File:** `operators.py` — `FO4_OT_BakeVegetationAO`
- **Problem:** The "Bake Ambient Occlusion" operator was a placeholder. It only
  set up a material node and printed "use Blender's Bake panel manually." No
  actual baking was performed.
- **Fix:** Rewrote `execute()` to actually bake AO using `bpy.ops.object.bake(type='AO')`:
  - Validates UV map exists before starting
  - Creates a fresh bake-target image (configurable: 512 / 1K / 2K / 4K)
  - Switches render engine to Cycles (required for AO baking), restores it afterward
  - Configures bake settings (samples, no direct/indirect pass)
  - Saves result to disk next to the .blend file, or packs it if unsaved
  - Added `invoke()` dialog so users choose resolution and samples before baking
  - Fixed uninitialized `original_engine` variable in the exception handler
- **File:** `ui_panels.py`
  - Removed duplicate "Collision Mesh" box at the bottom of `FO4_PT_MeshPanel`
    (it appeared below both unified and non-unified sections, showing a plain
    Generate Collision button with none of the full controls)
  - Updated button label: "Setup AO Bake" → "Bake Ambient Occlusion"

### Session 2 — Four Structurally Broken Operators

**Problem:** Class bodies were accidentally merged together — each empty class
was followed by a class whose header was missing, causing its code to end up
inside the previous class. This broke 4 operators silently.

#### Fix A — `FO4_OT_BatchAutoWeightPaint` (line 410)
- **Problem:** Class existed but had no `bl_idname`, no `bl_label`, and no
  `execute()`. Its actual body code (bl_idname + execute) was placed inside
  `FO4_OT_ToggleWindPreview`, overriding that class's own bl_idname and execute.
- **Fix:** Restored proper class body with `bl_idname = "fo4.batch_auto_weight_paint"`,
  `bl_label`, and the batch weight-paint `execute()`.

#### Fix B — `FO4_OT_ToggleWindPreview` (line 414)
- **Problem:** Had two `execute()` methods and two `bl_idname` assignments.
  The stray BatchAutoWeightPaint code overrode its idname to
  `"fo4.batch_auto_weight_paint"`, so clicking "Toggle Wind Preview" in the
  Animation panel would run batch weight paint instead.
  Operator was also missing from the `classes` registration tuple so the panel
  button would crash Blender.
- **Fix:** Removed stray code (stray `bl_idname`, `bl_label`, second `execute`,
  and dead code after the first `return {'FINISHED'}`). Added
  `FO4_OT_ToggleWindPreview` to the `classes` tuple.

#### Fix C — `FO4_OT_InstallPythonDeps` (line 2361)
- **Problem:** Class had `bl_idname`, `bl_label`, and an `optional` BoolProperty
  but was missing its `execute()` method. The execute code was placed inside
  `FO4_OT_CheckToolPaths` as a second execute, overriding CheckToolPaths.
- **Fix:** Restored `execute()` with the threading-based dependency installation
  logic inside `FO4_OT_InstallPythonDeps`.

#### Fix D — `FO4_OT_CheckToolPaths` (line 2372)
- **Problem:** Had two `execute()` methods (the second was InstallPythonDeps's
  code). The second execute overrode the first, so "Check Tool Paths" ran
  Python dependency installation instead of checking paths. Operator was also
  missing from the `classes` registration tuple.
- **Fix:** Removed duplicate execute. Added `FO4_OT_CheckToolPaths` to the
  `classes` tuple.

**Result after Session 2:** All 173 operators are properly defined and all 173
are registered. No structural issues remain.

### Session 3 — Broken/Missing Buttons Fixed (Mar 2026)

Three bugs caused buttons to be missing or show as "solid black with caution symbol":

1. **`FACE_MAPS` / `SNAP_FACE` icons** (ui_panels.py, 3 occurrences): Both icon
   identifiers are missing in Blender 4.x/5.x. Using them in `layout.operator()`
   raises a `ValueError` mid-draw, crashing the panel and making all buttons
   below that point disappear.  → Fixed: replaced with safe, built-in icons
   (`UV_FACESEL` for face-picking, `FILE_3D` for Unity assets header,
   `CANCEL` for Stop Recording).

2. **`MOD_VERTEX_WEIGHT` icon** (ui_panels.py, 1 occurrence): Replaced with the
   more reliable `icon='WPAINT_HLT'` for the Generate Wind Weights button.

3. **`has_mesh` undefined in `FO4_PT_ExportPanel.draw()`** (ui_panels.py): The
   Export panel used `row.enabled = has_mesh` three times but never defined
   `has_mesh`. This `NameError` crashed the entire Export Actions section,
   making the main export buttons invisible.
   → Fixed: added `has_mesh = obj and obj.type == 'MESH'` at top of draw().

4. **"Export Entire Scene" button missing `row.enabled` guard**: Added
   `row3.enabled = any(o.type == 'MESH' for o in context.scene.objects)` to
   match the operator's `poll()` condition.

**Result after Session 3:** All 35 panels render correctly. The Export panel,
Mesh Helpers panel (UV workflow), and Vegetation panel buttons are all visible
and correctly enabled/disabled based on scene state.

---

## Known Requirements & Architecture Notes

### 35 Applications = 35 Sidebar Panels
The sidebar contains 26 registered panels.  The "35 applications" refers to the
35 distinct functional groups listed in the table above (some panels contain
multiple feature groups).

### Preferences (Edit → Preferences → Add-ons → Fallout 4 Tutorial Helper)
- **Havok2FBX Folder** — path to existing Havok2FBX install
- **NVTT Path** — path to nvcompress.exe or its folder
- **texconv Path** — path to texconv.exe (DirectXTex)
- **ffmpeg Path** — path to ffmpeg.exe or its folder
- **Unified Mesh Panel** — show all mesh helpers in one box vs split sections
- **Mesh Optimization** — threshold, UV preservation, apply transforms
- **Advisor (LLM)** — opt-in LLM endpoint for contextual advice
- **Auto-Monitor** — background advisor interval
- **Auto-install** — auto-install CLI tools / Python deps on startup
- **Mossy Link** — TCP port, token, autostart for external controller

### Operator Naming Convention
All operators follow the pattern `fo4.<snake_case_name>` mapped to
`FO4_OT_<PascalCaseName>`.  All must appear in the `classes` tuple in
`operators.py` to be registered with Blender.

### Property Registration
`fo4_collision_type` and similar custom properties are stored as custom
object properties (`obj["fo4_collision_type"]`) rather than RNA properties,
so they are accessible without registering on `bpy.types.Object`.

### Module Load Order (`__init__.py`)
`operators` and `ui_panels` are imported last in the `modules` list so all
helper modules are available when operators are registered.

### External Integrations (Policy-Violation Safe)
UE Importer, UModel Tools, Unity FBX, Asset Studio, and Asset Ripper are
intentionally NOT in the auto-registration list.  They are loaded on demand
when the user clicks their respective "Check" buttons.  Set
`auto_register_tools = True` in preferences to load them automatically.

### Startup Console Output
On add-on enable, `DEVELOPMENT_NOTES.md` is printed to the Blender console
(last 40 non-empty lines).  Update that file with any architectural decisions
or breaking changes.

---

## Checklist for Future Sessions

When starting a new work session on this add-on:

1. **Run the structural audit:**
   ```python
   # In a terminal:
   python3 - << 'EOF'
   import re
   with open('operators.py') as f:
       lines = f.readlines()
   class_starts = [(i, re.match(r'^class (FO4_OT_\w+)', l).group(1))
                   for i, l in enumerate(lines) if re.match(r'^class FO4_OT_', l)]
   in_tuple = set(re.findall(r'^\s+(FO4_OT_\w+),', ''.join(lines), re.MULTILINE))
   for i, (start, name) in enumerate(class_starts):
       end = class_starts[i+1][0] if i+1 < len(class_starts) else len(lines)
       body = ''.join(lines[start:end])
       execs = sum(1 for l in lines[start:end] if re.match(r'\s+def execute\(', l))
       if 'bl_idname' not in body or execs != 1 or name not in in_tuple:
           print(f"ISSUE line {start+1}: {name}")
   EOF
   ```
2. **Check syntax:** `python3 -m py_compile operators.py ui_panels.py`
3. **Review this file** to understand what was last fixed
4. **Update this file** when fixes or new features are made
5. **Update `DEVELOPMENT_NOTES.md`** with architectural notes (it prints to
   the Blender console on startup)
