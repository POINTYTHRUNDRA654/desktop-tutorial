# Blender Add-ons: Move X & Cursor Array

This folder contains two example Blender add-ons you can install directly.

- `blender_move_x.py`: Adds "Move X by One" operator to Object menu and Operator Search.
- `blender_cursor_array.py`: Adds "Cursor Array" operator with a `Steps` property, menu entry, and optional keymap `Ctrl+Shift+T` (Object Mode).

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
