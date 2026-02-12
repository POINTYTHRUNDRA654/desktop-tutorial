# Blender Script Execution Checklist

**Updated for Mossy v5.4.23**

A quick, practical reference to control and audit script execution in .blend files. Now includes Mossy direct-write, headless automation, and onboarding for new users.

---

## 🚀 Mossy Integration & Onboarding (v5.4.23)

Mossy now supports:
- Direct script installation and execution via The Scribe (IDE)
- Headless automation with [run_blender_ops.ps1](../../scripts/blender/run_blender_ops.ps1)
- Real-time monitoring and session awareness (Neural Link)
- Explicit user permission for all script execution and file writes

---

## When Opening a .blend
- Use File Browser: enable "Trusted Source" for that file if you intend scripts to auto-run.
- Security prompt: if shown, choose "Reload Trusted" to allow registered scripts and Python drivers.

## Global Security Settings
- Edit → Preferences → Save & Load → Security:
  - Auto Run Python Scripts: toggle ON for trusted workflows; OFF for cautious inspection.
  - Allowed Paths: add your project folder so files there auto-run even if global auto-run is OFF.
  - Excluded Paths: optionally block specific locations.
- Drivers: Python-based drivers may be muted when auto-run is OFF; trust file or enable auto-run to restore.
- Typical setup: trust all paths except your downloads folder.

**Mossy v5.4.23:**
- All direct-write and automation features require explicit user permission
- Mossy respects Blender's auto-exec and trust settings

## Audit Inside the File
- Text Editor → Registered Text Blocks:
  - Review text data-blocks with "Register" enabled; toggle off if not needed.
- Handlers & Side Effects:
  - Search for `bpy.app.handlers` usage in registered scripts to understand load-time actions.
- Freestyle Scripts:
  - Check style modules used by Freestyle rendering; confirm they're expected.

## Manual Execution (Runs Regardless of Auto-Exec)
- Running scripts from the Text Editor.
- Freestyle render execution when using style modules.
- Any explicit operator/button invoking Python.

## Team Practices
- Prefer external `.py` modules in a versioned folder under an Allowed Path for easier review.
- Document script entry points and driver expressions in your repo (e.g., README section).
- Keep unneeded registered text blocks disabled to avoid surprise side effects.

## Troubleshooting
- Scripts not running: verify Trusted Source, global Auto Run, and that the file lives under an Allowed Path.
- Drivers muted: trust the file or enable auto-run; look for security icons in the Drivers panel.
- Unexpected execution: disable auto-run globally, remove/adjust Allowed Paths, and un-register suspicious text blocks.

## Command-Line Overrides
- Overview: Preferences still apply in headless/batch runs, but you can override them per-invocation.
- Enable auto-exec: use `-y` or `--enable-autoexec` to allow registered scripts, drivers, and handlers.
- Disable auto-exec: use `-Y` or `--disable-autoexec` to block automatic script execution for that run.
- UI sessions: these flags also override Preferences even when launching Blender with its interface.

### Examples (Windows)

Render animation in background mode with auto-exec enabled (drivers/scripts run):

```powershell
blender --background --enable-autoexec "C:\Path\To\my_movie.blend" --render-anim
```

Run headless while blocking auto-exec (useful for auditing):

```powershell
blender --background --disable-autoexec "C:\Path\To\my_movie.blend" --render-anim
```

Notes:
- If your workflow relies on Python drivers or registered startup scripts, ensure auto-exec is enabled for that run.
- Combine with Allowed/Excluded Paths in Preferences to fine-tune trust while batch rendering.

---

## Mossy Direct-Write & Automation (v5.4.23)

Mossy can:
- Write scripts directly to your Blender add-ons folder
- Launch Blender in headless mode with custom operators
- Use [run_blender_ops.ps1](../../scripts/blender/run_blender_ops.ps1) for automated batch runs

All direct-write and automation features are opt-in and logged for audit.

---

Notes: Menu names may vary slightly across Blender 3.x/4.x; the concepts remain the same.