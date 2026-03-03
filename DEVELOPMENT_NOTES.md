# Development Notes

This document records the key architectural decisions and recent fixes
for the Fallout 4 Tutorial Helper add-on.  It serves as a memorization aid
so future changes don't accidentally reintroduce bugs or regressions.

## Policy Violation Fix (Feb 2026)

- Blender issued warnings about `policy violation with top level module`
  when the add-on was enabled.  Investigation showed the warnings were
  triggered by embedded third-party helpers (UE4 importer, UModel Tools,
  AssetStudio, AssetRipper, etc.) which performed heavy work at import time.

- **Resolution:**
  1. Removed external helper modules from the top-level `modules` list in
     `__init__.py` and from the initial import section.
  2. Modified `_post_register()` to only *query* status of those helpers,
     never to register or load them unless the user explicitly requests it.
  3. Added a new preference `auto_register_tools` (default `False`) to
     optionally restore the original auto-download/registration behaviour.
  4. Updated preference UI and documentation accordingly.

- Result: enabling the add-on no longer produces policy warnings; external
  integrations only load on demand.

## Mossy Link Integration

- `mossy_link.py` implements a small TCP JSON server that the external
  *Mossy* application can use to control Blender.

- Key components:
  * `MossyLinkServer` class with handlers for `status`, `script`, `text`,
    `get_object`, and `run_operator` commands.
  * `_get_prefs()` helper returns the add-on preferences (port/token/autostart).
  * `send_to_mossy()` client helper for scripts or external processes.
  * An operator (`WM_OT_MossyLinkToggle`) and panel in the 3D-view sidebar
    that allow the user to start/stop the server and show connection state.
  * Preferences (ported into `FO4AddonPreferences`) for port, token,
    and autostart behaviour.

- Server startup/shutdown is handled in `register()`/`unregister()`;
  tests have been performed using a simulated `bpy` environment outside of
  Blender (see notes above).  The module is self-contained and may be
  imported independently for unit testing.

## Notes for Future Work

- When adding new external integrations, consult this document first to
  avoid reintroducing top-level imports.  New heavy helpers should follow
  the lazy-load pattern used above.

- Any extension to the Mossy protocol should add new `_handle_*` methods
  in `MossyLinkServer` and update the client helper accordingly.

- Keep the preference lookup (`_get_prefs()`) consistent across modules to
  avoid duplicated logic.

- Remember to stop the mossy server thread in `unregister()` and when
  toggling off; the current implementation handles this correctly but
  modifications may break it.

- This file should be updated whenever similar platform-specific workarounds
  or new high-level features are introduced.

## Blender Version Smoke‑Testing

- To help ensure compatibility across the many Blender releases we support,
  a helper script has been added at `tools/check_blenders.py`.

  Usage example:

  ```powershell
  python tools/check_blenders.py \
      "C:\Program Files\Blender Foundation\Blender 2.93\blender.exe" \
      "C:\Program Files\Blender Foundation\Blender 3.6\blender.exe" \
      "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"
  ```

  The script will launch each specified executable in background mode, import
  the add-on, register it, and report whether the operation succeeded.  Any
  exceptions are printed to the console along with the version string.  The
  exit status is zero only if *all* builds passed.

- This makes it easy for developers and automated CI jobs to verify that a
  single ZIP build works on every tested Blender version (2.80‑4.x‑5.x).
  There is no need to produce separate zip files per version: the same
  package is used everywhere.
