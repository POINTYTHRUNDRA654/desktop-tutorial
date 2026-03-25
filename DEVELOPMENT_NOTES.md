# Development Notes — Fallout 4 Mod Assistant

## ⚠️ RECURRING BUG #1 — "No activation buttons" / `rna_uiItemO: unknown operator`

**This is the single most common issue. It has been fixed 10+ times. Read this before touching anything.**

### Symptoms

Blender console shows (repeatedly, every UI redraw):
```
rna_uiItemO: unknown operator 'fo4.start_tutorial'
rna_uiItemO: unknown operator 'fo4.show_help'
rna_uiItemO: unknown operator 'fo4.show_credits'
rna_uiItemO: unknown operator 'fo4.show_detailed_setup'
```

The main panel shows "(Tutorial loading...)" / "(Setup Guide loading...)" labels instead of
clickable buttons, or the buttons are missing entirely.

### Root Cause

`FO4_PT_MainPanel.draw()` in `ui_panels.py` calls four operators unconditionally. Those
operators live in `tutorial_operators.py`. If that module fails to register for **any** reason,
Blender prints the above errors on every single UI redraw (hundreds of times per second) and
the buttons never appear.

**Common reasons `tutorial_operators.register()` fails silently:**

1. **Dual-install conflict** — The user has both `blender_org/blender_game_tools` AND
   `user_default/fallout4_tutorial_helper` installed. Both try to register
   `FO4_OT_StartTutorial` etc. The second registration raises an exception; the inner
   fallback also fails if Blender's type ownership check blocks unregistering a class that
   "belongs" to a different extension.

2. **Stale `sys.modules` entry** — An old or partial import from a previous Blender session
   is cached. `importlib.import_module()` returns the stale/broken module object; `register()`
   is called on it but does nothing or raises.
   **Fixed (permanently):** `_try_import()` in `__init__.py` now calls `importlib.reload()`
   when the module is already in `sys.modules`, ensuring fresh class objects are always used.
   Do NOT remove this reload — it is the root-cause fix for the extension-reload scenario.

3. **`tutorial_operators` accidentally removed from `modules` list in `__init__.py`** — Every
   time an agent edits `__init__.py` to add a new module without reading this file first, they
   risk reordering or dropping `tutorial_operators` from the list. It **must** appear in the
   list **before** `operators` and `ui_panels`.

4. **`tutorial_operators` accidentally removed from the `_try_import` calls at the top of
   `__init__.py`** — The module must be imported at line ~132 AND be in the `modules` list.

### The Fix (do ALL of these, in order)

#### Step 1 — Verify `tutorial_operators.py` exists and is correct

```
ls tutorial_operators.py          # must exist
python3 -m unittest test_addon_integrity.TestTutorialOperatorsModule -v
```

All 4 tests must pass. If the file is missing, restore it from git history. It must define:
- `FO4_OT_ShowDetailedSetup` with `bl_idname = "fo4.show_detailed_setup"`
- `FO4_OT_StartTutorial`     with `bl_idname = "fo4.start_tutorial"`
- `FO4_OT_ShowHelp`          with `bl_idname = "fo4.show_help"`
- `FO4_OT_ShowCredits`       with `bl_idname = "fo4.show_credits"`
- A `classes` tuple containing all four
- A `register()` and `unregister()` function

#### Step 2 — Verify the import in `__init__.py`

Find the line (currently ~132):
```python
tutorial_operators = _try_import("tutorial_operators")
```
If it is missing, add it after the other `_try_import` calls near the top.

#### Step 3 — Verify the position in the `modules` list in `__init__.py`

The `modules = list(filter(..., [ ... ]))` block **must** contain:
```python
            # ── CRITICAL: tutorial_operators MUST be here, BEFORE operators ──
            # Removing or reordering this line is the #1 cause of the
            # "no activation buttons" bug. See DEVELOPMENT_NOTES.md.
            tutorial_operators,
            operators,
            ui_panels,
```

If `tutorial_operators` is missing, add it. If it is AFTER `operators`, move it before.

#### Step 4 — Verify `hasattr` guards in `ui_panels.py`

`FO4_PT_MainPanel.draw()` must guard every call to these 4 operators with `hasattr`:
```python
if hasattr(bpy.types, 'FO4_OT_StartTutorial'):
    box.operator("fo4.start_tutorial", ...)
else:
    box.label(text="(Tutorial loading...)", ...)
```

Blender logs the `rna_uiItemO` error on every redraw (many times per second),
flooding the log. The guard is already present (lines ~235–263); do not remove it.

#### Step 5 — Verify the safety-net in `__init__.py register()`

After the `for module in modules` registration loop there must be a call to
`_ensure_tutorial_operators()`. This function checks whether the 4 operators landed in
`bpy.types` and, if not, registers them directly. It is a last-resort fallback for the
dual-install / stale-sys.modules scenarios.

Search for `_ensure_tutorial_operators` in `__init__.py`. If it is missing, add it
(see the implementation already present in the file).

#### Step 6 — Run the full test suite

```
python3 -m unittest test_addon_integrity -v
```

All tests must pass. The `TestTutorialOperatorsModule` group specifically guards the
tutorial operators. If any test in that group fails, the code is still broken.

### What NOT to Do

- **Do NOT delete `tutorial_operators.py`** — even if you think the operators can live in
  `operators.py`. They were deliberately extracted to avoid a 14 000-line file failing to
  load blocking these 4 critical buttons.
- **Do NOT move `tutorial_operators` after `operators` in the modules list** — `ui_panels`
  draws buttons on the very first frame; if the operators are not registered before
  `ui_panels.register()` runs, the first draw will fail.
- **Do NOT remove the `hasattr` guards from `ui_panels.py`** — they prevent hundreds of
  error lines per second while the addon is still loading.
- **Do NOT merge a PR that changes `__init__.py` without verifying `tutorial_operators` is
  still in the modules list.**

---

## Extension ID / Folder Name Mismatch

`blender_manifest.toml` uses `id = "blender_game_tools"`. The user installs the addon into
a folder named `fallout4_tutorial_helper`. Blender 5.0 uses the **folder name** as the
package identifier (`bl_ext.user_default.fallout4_tutorial_helper`), not the manifest id.

If the user also has `blender_org/blender_game_tools` installed, both extensions will
define the same Blender type names (e.g. `FO4_OT_StartTutorial`). The dual-registration
conflict is handled by the safety net and the fallback in `tutorial_operators.register()`,
but the cleanest fix is to have only one copy installed at a time.

---

## How to Add a New Module Without Breaking Things

1. Add `new_module = _try_import("new_module")` near the top of `__init__.py`.
2. Add `new_module,` to the `modules` list. Keep `tutorial_operators` **before** `operators`.
3. Run `python3 -m unittest test_addon_integrity -v` — all tests must pass.
4. Do NOT reorder existing entries in the modules list.
