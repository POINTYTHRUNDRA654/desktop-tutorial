# Blender Preferences (Overview)

Blender's Preferences panel controls application behavior, workflow settings, and hardware configuration. Access via Edit → Preferences (Windows/Linux) or Blender → Preferences (macOS), or press `Ctrl+,` (Comma).

## Quick Setup Recommendations

### Auto-Save Preferences
By default, preference changes are auto-saved. To disable:
1. Edit → Preferences → Click the menu (⋯) at lower left.
2. Uncheck "Auto-Save Preferences".
3. Click "Save Preferences" to apply the change.

To re-enable, follow steps 1–2 and check the box.

### Language
Enable multilingual UI:
1. Edit → Preferences → Interface → Translation.
2. Choose Language and what to translate (Interface, Tooltips, New Data).

### Input Setup
**Keyboard without Numpad:**
- Preferences → Input → Keyboard → Enable "Emulate Numpad" for 3D view shortcuts.

**Mouse without Middle Button:**
- Preferences → Input → Mouse → Enable "Emulate 3 Button Mouse" to use Alt/Super+drag for orbiting.

### File and Paths
Configure at Preferences → File Paths:
- Image Editor: GIMP, Krita, or other external editor.
- Animation Player: choose your video player.
- Temporary Directory: location for renders, auto-saves, and temporary files.

**Tip:** Paths starting with `//` refer to the current `.blend` file's directory (relative path).

### Save & Load
**Auto Run Python Scripts:**
- If you trust your `.blend` source, enable: Preferences → Save & Load → Security → Auto Run Python Scripts.
- ⚠️ Warning: this is a global setting; untrusted `.blend` files may contain malicious scripts. Use caution.
- See [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](BLENDER_SCRIPT_EXECUTION_CHECKLIST.md) for auto-exec control and trusted paths.

---

## Full Preference Sections

## Auto-Save
- Enable automatic backups and recovery saves.
- Configure save intervals (default: every 2 minutes).
- Set backup file count and location.

## Language
- Change the UI language (supports 30+ languages).
- Set tooltips and documentation language.

## Input
- Customize keymap (default: Blender or Emulate 3-Button Mouse).
- Import/export custom keymaps.
- Adjust mouse sensitivity and scroll direction.
- Set repeat delay and interval for held keys.

## File and Paths
- Configure default file save locations.
- Set paths for textures, scripts, and startup files.
- Choose auto-save folder and backup location.

## Save & Load
- Enable/disable auto-save and recovery.
- Choose automatic backup count.
- Control default import/export settings.
- Set versioning and compression options.

## Configuring Peripherals
- Tablet pressure sensitivity and curve.
- 3D mouse settings and navigation modes.
- Game controller axis mapping.

## Displays
- Theme (light/dark) and editor colors.
- UI scale and font size.
- Viewport shading defaults.
- Gizmo appearance and behavior.

## Input Devices
- Keyboard layout and repeat settings.
- Mouse and trackpad configuration.
- Tablet driver setup.
- NDOF (3D mouse) configuration.

## Head-Mounted Displays (Virtual Reality)
- Enable/disable VR support.
- Configure headset tracking and controllers.
- Set VR viewport options (mirror, guides).

## Defaults
- Scene defaults (units, gravity, etc.).
- Render settings (engine, device, samples).
- Object defaults (smooth shading, dimensions).
- Animation defaults (frame rate, playback speed).

## Initial Setup (First Launch)

When starting Blender for the first time or after a major version update, an initial preferences dialog appears:

### Import Preferences From Previous Version
- Copies preferences, keymaps, add-ons, and extensions from an older Blender version.
- Stores each Blender version's config in separate folders (see Directory Layout documentation).
- **Caution:** Some add-ons/extensions may not be compatible with the new version; if errors occur, try Loading Factory Settings.

### Create New Preferences
Start fresh with the current version. Options:

**Language:**
- Choose UI language (30+ translations available).
- Additional languages available in Preferences → Interface → Translation.

**Theme:**
- Light or Dark theme.
- Customizable in Preferences; additional themes from Blender Extensions Platform (requires internet).

**Keymap:**
- **Blender (default):** modern Blender keymap.
- **Blender 2.7x:** legacy keymap for users upgrading from older versions.
- **Industry Compatible:** matches common commercial 3D software (Maya, 3ds Max, etc.).

**Mouse Select:**
- Choose left-click (default) or right-click for selection.

**Spacebar Action:**
- **Play:** start/stop animation (good for animation/video work).
- **Tools:** open Toolbar for quick tool switching (good for modeling/rigging).
- **Search:** open Menu Search (good for new users).

### Save New Preferences
Saves your initial choices and opens the regular Splash Screen.

## Saving Defaults

### Auto-Save
Preferences are automatically saved when changed. Disable via Preferences → lower left menu (⋯) → uncheck "Auto-Save Preferences" → click "Save Preferences".

### Startup File
Save your custom scene and UI layout as the default:
1. Set up your workspace, add objects, configure lights, etc.
2. File → Defaults → Save Startup File.
3. Blender loads your setup on next launch and when creating a new file (File → New).

### Preferences vs Startup File
- **Preferences:** keymap, add-ons, theme, language, input settings.
- **Startup File:** scene, objects, UI layout, workspace configuration.

## Loading Factory Settings

Revert to Blender defaults:

**Preferences only:**
- Preferences → lower left menu (⋯) → Revert to Factory Settings.

**Startup File & Preferences:**
- File → Defaults → Load Factory Settings.

**Note:** After loading factory settings, auto-save is disabled; remember to save your preferences if making further customizations.

## Defaults

## Import Preferences From Previous Version
- Migrate settings from an earlier Blender installation.
- Useful when upgrading major versions.
- Path selection dialog appears on first launch.

## Create New Preferences
- Reset to factory defaults with fresh config.
- Start with a clean workspace and keymaps.

## Saving Defaults
- Overwrite Blender startup defaults (File → Save Startup File).
- Custom scene, workspace, and preferences are saved.
- Blender loads your defaults on next launch.

## Loading Factory Settings
- Reset all preferences to Blender defaults (Preferences → bottom left → Revert to Factory Settings).
- Useful for troubleshooting or starting fresh.

## Access Preferences
Edit → Preferences (Windows/Linux) or Blender → Preferences (macOS).

## Tips
- Custom keymaps: create variants and export for sharing.
- Theme colors: save custom themes for multiple machines.
- Startup file: save your preferred workspace and object defaults.

## Related Docs
- Add-on preferences: [BLENDER_ADDON_TUTORIAL.md](BLENDER_ADDON_TUTORIAL.md)
- Script execution security: [BLENDER_SCRIPT_EXECUTION_CHECKLIST.md](BLENDER_SCRIPT_EXECUTION_CHECKLIST.md)
- Installing Blender: [BLENDER_INSTALLING.md](BLENDER_INSTALLING.md)
