# Blender Add-ons for Fallout 4 Modding

This folder contains **21 Blender automation scripts** specifically designed for Fallout 4 modding workflows.

## Quick Start Scripts
- `blender_move_x.py`: Adds "Move X by One" operator to Object menu and Operator Search
- `blender_cursor_array.py`: Adds "Cursor Array" operator with a `Steps` property, menu entry, and optional keymap `Ctrl+Shift+T` (Object Mode)
- `f4_setup.py`: Basic FO4 scene setup

## FO4 Standards & Validation (8 scripts)
- `fo4_standards_enforcer.py`: Enforces FO4 standards (1.0 scale, proper naming, poly count)
- `animation_fps_validator.py`: Ensures animations are at exactly 30 FPS for Fallout 4
- `texture_path_fixer.py`: Converts absolute texture paths to relative for portability
- `uv_map_checker.py`: Validates UV maps and reports issues
- `bone_naming_validator.py`: Ensures bone names follow FO4 conventions
- `export_validator.py`: Complete validation before exporting to Fallout 4
- `creature_rig_validator.py`: Validates creature rigs for Fallout 4
- `weapon_rig_setup.py`: Quick setup for weapon rigging in Fallout 4

## Optimization Tools (3 scripts)
- `poly_count_optimizer.py`: Reduces polygon count while preserving shape
- `collision_mesh_generator.py`: Creates collision meshes for Fallout 4 objects
- `lod_generator.py`: Generates Level of Detail meshes for Fallout 4

## Workflow Tools (6 scripts)
- `batch_renamer.py`: Batch rename objects with patterns
- `smart_duplicator.py`: Duplicate objects with smart positioning
- `hierarchy_organizer.py`: Organize scene hierarchy into collections
- `material_batch_applier.py`: Apply materials to multiple objects at once
- `texture_packer.py`: Pack all external textures into .blend file
- `armor_weight_paint_helper.py`: Tools for armor weight painting

## Asset Type Scripts (1 script)
- `building_snap_points.py`: Add snap points for building pieces

## Install Steps
1. Open Blender → Text Editor or Preferences → Add-ons.
2. Save the script to disk (already in this repo). For install:
   - Preferences → Add-ons → Install… → select the file.
   - Enable the add-on; optional: Save as Default for auto-load.
3. Alternatively, open script in Text Editor, then click "Run Script" to register (temporary session).

## Run Operators
- Operator Search (`F3`): type the label, e.g. "Move X by One", "Cursor Array".
- Object menu: visible under Object when registered.
- Keymap (Cursor Array): `Ctrl+Shift+T` in Object Mode (if keyconfigs are available).

## Headless / Command Line (Windows)
Use `--enable-autoexec` to allow drivers/registered scripts during batch runs.

```powershell
# Render animation with auto-exec enabled
blender --background --enable-autoexec "C:\Path\To\my_scene.blend" --python "C:\Path\To\blender_cursor_array.py" --render-anim

# Audit run with auto-exec disabled
blender --background --disable-autoexec "C:\Path\To\my_scene.blend" --render-anim
```

Notes:
- `--python` executes a script before rendering; use when you need to register operators or run custom code.
- Keyconfigs (for shortcuts) are not available in background mode; menu/Operator Search still work when registered.

## Trusted Paths / Auto-Exec
- Preferences → Save & Load → Security:
  - Auto Run Python Scripts: ON for trusted workflows; OFF for cautious review.
  - Allowed Paths: add your project directory; typical setup is trust-all except Downloads.
  - Excluded Paths: block specific locations.

## Uninstall
- Preferences → Add-ons: uncheck to disable; remove to uninstall.

## Development Tips
- Prefer `context.scene` in operators over `bpy.context.scene`.
- Avoid re-appending menus on multiple runs; uninstall cleans up via `unregister()`.
- For arrays/placement, leverage `mathutils.Vector` for clean math operations.
