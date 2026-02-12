# Blender Add-on Tutorial (Practical Guide)

**Updated for Mossy v5.4.23**

This guide helps technical artists and developers extend Blender with Python add-ons, from first operator to headless automation. Now includes direct-write and headless execution via Mossy.

---

## 🚀 Mossy Integration & Onboarding (v5.4.23)

Mossy now supports:
- Direct script installation to Blender via The Scribe (IDE)
- Headless automation with [run_blender_ops.ps1](../../scripts/blender/run_blender_ops.ps1)
- Real-time monitoring and session awareness (Neural Link)
- Script execution controls and trust management (see checklist below)

**New users:**
- Use The Scribe to write and install Python scripts directly into Blender
- Use the headless runner for batch automation and CI workflows
- All features are production-ready and tested

---

## Intended Audience
- Comfortable with Blender basics (navigation, objects, Text Editor).
- Familiar with running scripts in Blender’s Text Editor.
- Basic Python knowledge: primitives (int, bool, str, list, tuple, dict, set), modules, simple classes.

## Prerequisites & Tips
- Suggested reading: “Dive Into Python” (sections 1, 2, 3, 4, 7), Blender API Quickstart.
- Run Blender from a terminal to see Python output (errors, prints).
- Preferences → Interface → enable Developer Extras to reveal dev-friendly UI.

## Reference Links (handy during the tutorial)
- Blender API Overview (concepts and architecture)
- `bpy.context` reference (data available to scripts)
- `bpy.types.Operator` (defining tools/operators)

## What is an Add-on?
An add-on is a Python module with metadata (`bl_info`) and two functions: `register()` and `unregister()`. Installing via Preferences lets users enable/disable it cleanly.

Minimal add-on:

```python
bl_info = {
    "name": "My Test Add-on",
    "blender": (2, 80, 0),
    "category": "Object",
}

def register():
    print("Hello World")

def unregister():
    print("Goodbye World")
```

Notes:
- `bl_info` identifies and classifies the add-on; Blender uses it in the Add-ons list.
- `register()` runs when enabling; `unregister()` runs when disabling.
- Printing is visible when enabling/disabling via Preferences or when running Blender from a terminal.

## Your First Operator: Move All Objects +1 on X
A simple operator that moves every object in the active scene by 1 unit on X.

- Code: see [scripts/blender/blender_move_x.py](scripts/blender/blender_move_x.py)
- Key points:
  - Uses `context.scene` inside `execute()` (prefer over `bpy.context.scene` for operator calls).
  - Registered into the Object menu and available via Operator Search.

### Install & Run
1. Save the script file and install:
   - Preferences → Add-ons → Install… → select `blender_move_x.py` → enable.
   - Or open in Text Editor and click Run Script (session-only registration).
2. Run the operator:
   - Press `F3` (Operator Search) → type “Move X by One” → Enter.
   - Or find it in the Object menu.

## Your Second Operator: Cursor Array
Creates linked duplicates of the active object, interpolated between the object and the 3D cursor.

- Code: see [scripts/blender/blender_cursor_array.py](scripts/blender/blender_cursor_array.py)
- Features:
  - `total: bpy.props.IntProperty(name="Steps", default=2, min=1, max=100)` appears as an operator property.
  - Adds menu entry to the Object menu.
  - Optional keymap `Ctrl+Shift+T` in Object Mode (guarded for background/headless runs).

### Try It
- Place the 3D cursor in the scene, select an object, and run “Cursor Array”.
- Adjust `Steps` to control how many instances are created.

## Menus, Tooltips, and Keymaps
- Menu entry: append a draw function with `self.layout.operator(MyOperator.bl_idname)`.
- Tooltips: class docstring shows in UI.
- Keymaps: create keymap items via `wm.keyconfigs.addon` → `keymaps.new` → `keymap_items.new`; set `kmi.properties.total` to override defaults.
- Background mode: keyconfigs are not available; guard with `if wm.keyconfigs.addon:`.

## Installing Add-ons (Preferences)
1. Save your `.py` file with a valid module name.
2. Preferences → Add-ons → Install… → select file → enable (optionally Save as Default).
3. Enabling runs `register()`. Disabling runs `unregister()`.
4. To discover add-on paths:

```python
import addon_utils
print(addon_utils.paths())
```

## Headless / Command-Line Usage (Windows)
Preferences still apply in headless runs; override auto-exec per invocation.

- Enable auto-exec: `-y` or `--enable-autoexec`
- Disable auto-exec: `-Y` or `--disable-autoexec`

Examples:

```powershell
# Render animation in background with scripts/drivers enabled
blender --background --enable-autoexec "C:\Path\To\my_scene.blend" --render-anim
```

## Mossy Direct-Write & Automation (v5.4.23)

Mossy can:
- Write scripts directly to your Blender add-ons folder
- Launch Blender in headless mode with custom operators
- Use [run_blender_ops.ps1](../../scripts/blender/run_blender_ops.ps1) for automated batch runs

Example (PowerShell):

```powershell
# Move X on all objects
./scripts/blender/run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator move_x -EnableAutoExec

# Cursor Array with 8 steps
./scripts/blender/run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator cursor_array -Total 8 -EnableAutoExec
```

---

# Execute one of our add-ons and invoke its operator
blender --background --enable-autoexec "C:\Path\To\my_scene.blend" \
  --python "C:\Path\To\repo\scripts\blender\blender_cursor_array.py" \
  --python-expr "import bpy; bpy.ops.object.cursor_array(total=8)" 
```

Helper script (recommended): [scripts/blender/run_blender_ops.ps1](scripts/blender/run_blender_ops.ps1)

```powershell
# Move X on all objects
./scripts/blender/run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator move_x -EnableAutoExec

# Cursor Array with 8 steps
./scripts/blender/run_blender_ops.ps1 -BlendFile "C:\scene.blend" -Operator cursor_array -Total 8 -EnableAutoExec
```

## Script Auto-Execution & Trust
Control auto-exec globally and per-file:
- Preferences → Save & Load → Security:
  - Toggle Auto Run Python Scripts.
  - Allowed Paths / Excluded Paths (typical: trust all except Downloads).
- File Browser: “Trusted Source” on open.

See the checklist: [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](BLENDER_SCRIPT_EXECUTION_CHECKLIST.md)

**Mossy v5.4.23:**
- The Scribe and Neural Link modules respect Blender's auto-exec and trust settings
- All direct-write operations are logged and require explicit user permission

## Troubleshooting
- Operator not found: confirm add-on is enabled or script was run; check Operator Search.
- Properties not showing: ensure `bpy.props` definitions are in the class body and the class is registered.
- Headless errors: avoid keymap registration when `wm.keyconfigs.addon` is unavailable.
- Scripts not running: verify auto-exec settings, trusted paths, and command-line overrides.

## Where to Go Next
- Explore `mathutils.Vector` operations, matrix transforms, and geometry utilities.
- Add panels (`bpy.types.Panel`) for operator UIs.
- Persist settings via `AddonPreferences`.
- Package your add-on with versioning and documentation for teammates.

---

**See also:**
- [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](BLENDER_SCRIPT_EXECUTION_CHECKLIST.md) for security and automation
- [scripts/blender/README_BLENDER_ADDONS.md](../../scripts/blender/README_BLENDER_ADDONS.md) for advanced automation

---

