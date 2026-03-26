# Development Notes — Fallout 4 Mod Assistant
# READ THIS FIRST every session before touching any code.

---

## ⚡ Current Status — Where We Are Right Now

| # | Piece | Status | Notes |
|---|-------|--------|-------|
| 1 | **Core + Mesh Tools** | ✅ Built · ⏳ Awaiting user test | See Piece 1 section below |
| 2 | NIF v25 Export (PyNifly) | 🔲 Not started — build after Piece 1 passes | |
| 3 | Textures / DDS (NVTT / texconv) | 🔲 Not started | |
| 4 | Animation / Rigging | 🔲 Not started | |
| 5 | Advanced tools (AI, Quest, NPC…) | 🔲 Not started | |

**The user will test Piece 1 in Blender 5 first.
Do NOT start Piece 2 until the user confirms Piece 1 works.**

---

## 🎯 Project Identity

| Item | Value |
|------|-------|
| **What it is** | Professional Blender add-on for modding Fallout 4 |
| **Blender target** | **5.x only** (Extension format, `blender_manifest.toml`) |
| **NIF format** | Version 25 (Fallout 4 / Fallout 4 Next-Gen) |
| **NIF exporter** | **PyNifly v25** by BadDog / BadDogSkyrim |
| **Key game limits** | BSTriShape: max 65,535 vertices, max 65,535 triangles (16-bit index) |
| **Collision naming** | `UCX_<meshname>` — convex hull, triangulated, parented to source |
| **Addon id** | `blender_game_tools` (in `blender_manifest.toml`) |
| **N-panel tab** | "Fallout 4" |

---

## 📦 Piece 1 — Core + Mesh Tools

### What was rewritten (completely)

| File | Lines | What changed |
|------|-------|--------------|
| `__init__.py` | 118 | Full rewrite — clean entry point, simple `_import()`, flat `_MODULES` list |
| `operators.py` | 322 | Full rewrite — 5 mesh operators only; thin wrappers over `mesh_helpers.py` |
| `ui_panels.py` | 255 | Full rewrite — 3 panels only; Blender 5 compatible |
| `blender_manifest.toml` | 18 | `blender_version_min = "5.0.0"`, `version = "5.1.0"` |
| `DEVELOPMENT_NOTES.md` | this file | Complete rewrite — rebuild roadmap replaces old bug notes |

### What was NOT changed

These files are correct and working — do not modify them unless a specific
bug is found:

| File | Purpose |
|------|---------|
| `mesh_helpers.py` | `MeshHelpers.optimize_mesh()`, `validate_mesh()`, `add_collision_mesh()` |
| `preferences.py` | `FO4AddonPreferences`, `get_preferences()` |
| `tutorial_operators.py` | `FO4_OT_StartTutorial`, `FO4_OT_ShowHelp`, `FO4_OT_ShowCredits`, `FO4_OT_ShowDetailedSetup` |
| `setup_operators.py` | `FO4_OT_InstallPythonDeps`, `FO4_OT_SelfTest`, `FO4_OT_ReloadAddon` |
| All `*_helpers.py` | Contain real business logic — not registered directly by `__init__.py` in Piece 1 |

### Operators in Piece 1 (`operators.py`)

| Class | bl_idname | Function |
|-------|-----------|----------|
| `FO4_OT_CreateBaseMesh` | `fo4.create_base_mesh` | New cube with applied scale + UV map |
| `FO4_OT_OptimizeMesh` | `fo4.optimize_mesh` | Apply transforms, UV-safe doubles removal, normals, triangulate |
| `FO4_OT_ValidateMesh` | `fo4.validate_mesh` | Check NIF v25 BSTriShape limits (65k verts/tris, UV, non-manifold, scale) |
| `FO4_OT_GenerateCollision` | `fo4.generate_collision` | UCX_ convex-hull collision mesh (dialog: type + simplify ratio) |
| `FO4_OT_SetMeshType` | `fo4.set_mesh_type` | Dialog to set NIF classification (STATIC / SKINNED / ARMOR / LOD / etc.) |

### Per-object properties registered in Piece 1

| Property | Type | Purpose |
|----------|------|---------|
| `bpy.types.Object.fo4_collision_type` | EnumProperty | Havok collision category |
| `bpy.types.Object.fo4_mesh_type` | EnumProperty | NIF export classification |

### Panels in Piece 1 (`ui_panels.py`)

| Class | bl_idname | What it shows |
|-------|-----------|---------------|
| `FO4_PT_MainPanel` | `FO4_PT_main_panel` | Addon header + Getting Started buttons |
| `FO4_PT_MeshPanel` | `FO4_PT_mesh_panel` | Mesh info, Prep/Validate/Collision/Type operators, NIF v25 limits box |
| `FO4_PT_SetupPanel` | `FO4_PT_setup_panel` | Install Core Deps, Environment Check, Restart/Reload |

---

## 🧱 Architecture Rules — Follow Every Time

### 1. Registration order (CRITICAL — never change)

```
preferences
  → tutorial_operators   (MUST be before ui_panels)
  → setup_operators      (MUST be before ui_panels)
  → operators
  → ui_panels
```

`tutorial_operators` and `setup_operators` must be **first** so their
operator classes exist in `bpy.types` before any panel `draw()` runs.
Changing this order re-introduces the "unknown operator" console spam.

### 2. `operators.py` stays thin

Each operator's `execute()` calls a `*_helpers.py` function — it does not
contain business logic itself. This keeps the file manageable and testable.

### 3. `ui_panels.py` is layout only

No business logic. No imports of helper classes. Just `bpy.types.Panel`
subclasses with `draw()` methods that call `_op_or_label()` for buttons.

### 4. Every operator button uses a `hasattr` guard

```python
# ✓ Correct — degrades gracefully if operator not yet registered
_op_or_label(col, 'FO4_OT_SomeOp', 'fo4.some_op', 'Label', 'ICON')

# ✗ Wrong — floods console with rna_uiItemO errors on every redraw
col.operator("fo4.some_op", text="Label")
```

`_op_or_label()` is defined at the top of `ui_panels.py`.

### 5. `_import()` in `__init__.py` reloads stale sys.modules

The `_import()` function calls `importlib.reload()` when a module is
already in `sys.modules`. **Do not remove this reload** — it is the fix
for the stale-class / "no active buttons" symptom on F8 or addon disable→enable.

### 6. Blender 5 API only

- Do **not** use `use_auto_smooth` (removed in 4.1 — already try/except-guarded in `export_helpers.py`)
- Do **not** use `vertex_colors` (replaced by `color_attributes` in 4.0+)
- Do **not** add Blender 3.x / 4.x compatibility branches to new code

---

## ✅ Testing Checklist — Piece 1

Run this in Blender 5 after installing the add-on:

- [ ] "Fallout 4" tab appears in the 3D Viewport N-panel (press N)
- [ ] `FO4_PT_MainPanel` shows addon name + version + Getting Started buttons (all clickable, not "loading…")
- [ ] `FO4_PT_MeshPanel` (expand it) — select a mesh: info box shows vert/poly/UV/tri count
- [ ] `New FO4 Base Mesh` button — creates cube named "FO4_Mesh" with UV map
- [ ] `Prep Mesh for FO4` — select a mesh, click: applies transforms, triangulates, cleans normals
- [ ] `Validate (NIF v25 Limits)` — reports pass or lists specific issues
- [ ] `Generate UCX_ Collision` — dialog shows inferred type + simplify slider; creates `UCX_<name>`
- [ ] `Set FO4 Mesh Type` — dialog opens; sets `fo4_mesh_type` on object; dropdown shows in panel
- [ ] `FO4_PT_SetupPanel` (expand it) — Install/Check/Reload buttons all clickable
- [ ] Blender **console** shows `[FO4] ✓ <module>` for each module at startup
- [ ] **No** `rna_uiItemO: unknown operator` errors in the console

---

## 🔜 Piece 2 — NIF v25 Export (build after Piece 1 is confirmed working)

### Operators to add to `operators.py`

| Class | bl_idname | What it does |
|-------|-----------|--------------|
| `FO4_OT_ExportMesh` | `fo4.export_mesh` | Export active object as `.nif` via PyNifly v25 |
| `FO4_OT_ExportAll` | `fo4.export_all` | Export all visible FO4-tagged meshes |
| `FO4_OT_ValidateBeforeExport` | `fo4.validate_before_export` | Full pre-export check (mesh + UV + scale + collision) |
| `FO4_OT_CheckPyNifly` | `fo4.check_pynifly` | Detect PyNifly v25 install and print status |

### Panel to add to `ui_panels.py`

```python
class FO4_PT_ExportPanel(_FO4Panel):
    bl_idname    = "FO4_PT_export_panel"
    bl_label     = "Export to Fallout 4"
    bl_parent_id = "FO4_PT_main_panel"
    bl_options   = {'DEFAULT_CLOSED'}
```

### Key PyNifly detection

```python
# PyNifly v25 registers this operator when installed:
bpy.ops.export_scene.pynifly   # for NIF export
# Detection:
available = hasattr(bpy.ops.export_scene, "pynifly")
```

### Key export workflow

1. Validate mesh (vert count, UV, non-manifold, scale)
2. Call `bpy.ops.export_scene.pynifly(filepath=path, game="FO4")`
3. If PyNifly not installed: export FBX as fallback + instructions

### Scene properties to register in Piece 2

```python
bpy.types.Scene.fo4_export_path   # StringProperty, subtype='DIR_PATH'
bpy.types.Scene.fo4_game_version  # EnumProperty: FO4 / FO4NG / FO76
```

---

## 📋 How to Start a New Session

1. **Read this file first** — understand current status before touching any code.
2. Check the roadmap table at the top — find the first 🔲 piece.
3. Read that piece's section in this file for the exact plan.
4. Check with the user: has the previous piece been tested and confirmed?
5. If confirmed, build the next piece.
6. After building, update this file:
   - Change the piece status from 🔲 to `✅ Built · ⏳ Awaiting user test`
   - Fill in the "What was rewritten" and "What was NOT changed" sections
   - Add the testing checklist for that piece
7. Use `report_progress` to commit and push.
