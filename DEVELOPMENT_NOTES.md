# Development Notes

This document records the key architectural decisions and recent fixes
for the Fallout 4 Tutorial Helper add-on.  It serves as a memorization aid
so future changes don't accidentally reintroduce bugs or regressions.

> **For AI agents / Copilot:** Read this file first at the start of every
> session.  It tells you what has been built, why decisions were made, and
> what rules must not be broken.

---

## Project Purpose

This is a **Blender add-on** for Fallout 4 modding.  Its job is to give
modders a full, guided pipeline inside Blender that prepares their meshes,
materials, and textures so they can:

1. Export a working **NIF file** out of Blender.
2. Open that NIF in **Creation Kit**.
3. Drop the asset straight into the game with all necessary settings already
   set (collision, LOD chain, UV maps, DDS textures, FO4 materials).

The add-on lives entirely inside Blender's N-panel under the "Fallout 4"
category.

---

## AI / LLM Rules — READ BEFORE TOUCHING AI CODE

### ✅ Use Mossy AI (no API key, built-in)
- **Mossy** is the AI tutor that ships with this project.  It runs as a local
  HTTP server on the user's desktop (default port 8080).
- Call it via `mossy_link.ask_mossy(query, context_data, timeout)`.
- No API key is needed; Mossy is always available if the user has it running.
- Mossy is the **first and preferred** AI path for all advisor and auto-fix
  calls.  Fall back to the generic remote LLM only if Mossy is not reachable.

### ❌ Antigravity / Gemini — REMOVED, DO NOT RE-ADD
- Antigravity was a Gemini (Google) backend that required the user to paste
  in an external API key.  This was unwanted — users should not have to load
  API keys.
- **Antigravity has been completely removed** (March 2026).  Do not reference
  it, re-add it, or create any new code that calls the Gemini API.
- Properties `fo4_use_antigravity` and `fo4_antigravity_key` no longer exist
  on the scene.  Do not add them back.

### ❌ No external chatbot / API-key LLMs as primary AI
- The generic remote-LLM path (`query_llm` / `fo4_llm_*` scene props) exists
  as an optional fallback for power users who configure their own endpoint.
- It must never be the default or the first path tried.
- Never add another API-key-gated AI service as a required feature.

---

## Antigravity Removal (March 2026)

**What was done:**

| File | Change |
|------|--------|
| `advisor_helpers.py` | Removed `query_antigravity()`, `ask_antigravity_uv_texture()`, `antigravity_auto_fix_mesh()`. Added `mossy_auto_fix_mesh()`. `analyze_scene()` now tries Mossy first, then remote LLM. |
| `operators.py` | Removed `FO4_OT_AskAntigravityUVAdvice` and `FO4_OT_AntigravityAutoFix`. Added `FO4_OT_MossyAutoFix` (`fo4.mossy_auto_fix`). |
| `ui_panels.py` | All "Ask Antigravity" / "AI Auto-Fix (Antigravity)" buttons replaced with Mossy equivalents. Antigravity settings box removed from the Settings panel. |
| `preferences.py` | Removed `fo4_use_antigravity` and `fo4_antigravity_key` scene properties, their `_PERSISTENT` entries, `_ALIAS_MAP` entries, and `_DEFAULTS` entries. |
| `test_addon_integrity.py` | Removed assertions that checked for the now-deleted Antigravity scene properties. |

**Why:**  The user does not want to use a chatbot that requires loading an
external API key.  Mossy is the AI that comes with the project and works
locally without any key.

---

## Mesh Helper Automatic Buttons Restored (March 2026)

**What was done:**

The Mesh Helpers panel (`FO4_PT_MeshPanel`, both unified and non-unified
layouts) now has a **"Full FO4 Pipeline"** section at the top containing the
complete set of one-click automatic buttons:

| Button | Operator | What it does |
|--------|----------|-------------|
| Convert to Fallout 4 (Full Pipeline) | `fo4.convert_to_fallout4` | One-click: applies transforms, optimises mesh, sets up FO4 material, converts textures to DDS, optionally generates collision, validates |
| Quick Prepare for Export | `fo4.quick_prepare_export` | Faster preparation pass |
| Auto-Fix Common Issues | `fo4.auto_fix_issues` | Applies scale, removes loose verts, recalculates normals, creates UV map if missing |

The **Advanced Mesh Tools** section now has:
- **AI Auto-Fix (Mossy)** (`fo4.mossy_auto_fix`) — sends mesh validation
  issues to Mossy, gets back a JSON list of fix actions, applies them
  automatically.  No API key required.
- "Validate Before Export" button (`fo4.validate_export`) added alongside
  "Validate Mesh".
- All other advanced buttons remain: Analyze Quality, Auto-Repair, Smart
  Decimate, Split at Poly Limit, Generate LOD Chain.

The UV & Texture section now shows only the "Ask Mossy" UV advice button
(the "Ask Antigravity" button has been removed).

**Why:**  The mesh helper buttons exist to take any mesh and make it meet
Fallout 4's standards automatically — so it can export as a NIF, open in
Creation Kit, and go straight into the game.  Previously, the only "AI
automatic" button used Antigravity (required API key, broken for most users).
Now everything works out of the box via Mossy.

---

## mossy_auto_fix_mesh() — How It Works

```
AdvisorHelpers.mossy_auto_fix_mesh(obj)
  1. Calls MeshHelpers.validate_mesh(obj) → list of issue strings
  2. Builds a query string that includes the issue list inline
  3. Calls mossy_link.ask_mossy(query, context_data, timeout=15)
  4. Parses Mossy's JSON array response, e.g. ["APPLY_TRANSFORMS", "DELETE_LOOSE"]
  5. Returns {"success": True, "actions": [...]}
  6. Caller (FO4_OT_MossyAutoFix) iterates actions and calls apply_quick_fix()
```

Allowed actions (same set as `apply_quick_fix`):
`REMOVE_DOUBLES`, `DELETE_LOOSE`, `MAKE_MANIFOLD`, `APPLY_TRANSFORMS`,
`TRIANGULATE`, `SHADE_SMOOTH_AUTOSMOOTH`

---

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

- **Historical quirk:** older versions stored the server on the current
  `Scene` datablock.  As a result a fresh mesh import or opening a blank
  file would break the connection and users had to manually click the
  panel’s “Disconnect / Connect to Mossy” button before the external app
  would talk to Blender again.  The server is now kept at module scope and
  a `load_post` handler automatically restarts it, so the connection
  survives new scenes; the helper UI still offers a manual toggle for
  debugging.

## Session 2 — Four Structurally Broken Operators Fixed (Mar 2026)

Four operator classes had their bodies accidentally merged together.  This
caused silent misbehaviour: wrong operators ran when buttons were clicked, and
clicking some buttons crashed Blender.

### `FO4_OT_BatchAutoWeightPaint` + `FO4_OT_ToggleWindPreview`
- `FO4_OT_BatchAutoWeightPaint` existed but had no `bl_idname` or `execute()`.
  Its code was placed inside `FO4_OT_ToggleWindPreview`, overriding that
  class's `bl_idname` to `"fo4.batch_auto_weight_paint"` and its `execute()`
  with batch weight-paint logic.  Clicking "Toggle Wind Preview" ran batch
  weight paint instead.
- `FO4_OT_ToggleWindPreview` was also missing from the `classes` tuple, so
  the button crashed Blender when clicked.
- **Fix:** Restored proper bodies in both classes.  Added
  `FO4_OT_ToggleWindPreview` to the `classes` tuple.

### `FO4_OT_InstallPythonDeps` + `FO4_OT_CheckToolPaths`
- `FO4_OT_InstallPythonDeps` had `bl_idname` and `bl_label` but no `execute()`.
  Its execute code (threading-based pip install) was placed inside
  `FO4_OT_CheckToolPaths` as a second `execute()`, overriding that class's
  tool-path reporting logic.
- `FO4_OT_CheckToolPaths` was also missing from the `classes` tuple.
- **Fix:** Moved execute back to `FO4_OT_InstallPythonDeps`.  Removed duplicate
  execute from `FO4_OT_CheckToolPaths`.  Added `FO4_OT_CheckToolPaths` to the
  `classes` tuple.

Result: All 173 operators are properly defined and all 173 are registered.

## Session 2 — AO Bake Placeholder Replaced (same session)

- `FO4_OT_BakeVegetationAO` only set up a material node and told the user to
  bake manually.  Replaced with a full implementation that calls
  `bpy.ops.object.bake(type='AO')` via Cycles, saves the result, and restores
  the render engine.  An `invoke()` dialog lets users choose resolution and
  sample count before baking.
- Removed a duplicate "Collision Mesh" box at the bottom of the Mesh Helpers
  panel that duplicated controls already present in the unified/non-unified
  section above it.

See `ADDON_STATUS.md` for the complete 35-application status table and a
checklist for future sessions.


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

## Advanced Weighting Features (Mar 2026)

- Vegetation artists were repeatedly hand‑painting "vortex" or "vortex weight"
  channels for plants and trees so that Fallout 4’s wind system could bend
  leaves/branches.  The add-on now provides three automatic helpers:
  * `AnimationHelpers.generate_wind_weights()` / **Generate Wind Weights**
    operator – computes a simple linear falloff along a chosen axis and stores
    it in a vertex group (default name "Wind").  Works on arbitrary meshes and
    requires no manual painting.
  * `AnimationHelpers.apply_wind_animation()` / **Apply Wind Animation**
    operator – one click to create a minimal armature with a "Wind" bone and
    a looping noise‑driven rotation action.  Play the timeline to see the
    mesh sway; the resulting animation is exported for FO4.
  * `AnimationHelpers.auto_weight_paint()` / **Auto Weight Paint** operator –
    skins a mesh to an FO4 armature.  By default it uses Blender’s
    `ARMATURE_AUTO` parent operation, but if the `libigl` Python package is
    installed (the operator will attempt to `pip install` it automatically)
    it instead computes bounded biharmonic weights (BBW) for cleaner
    deformations.  This brings the add-on in line with the latest community
    workflows and removes the need for external tools or manual weight
    painting.

- Both operators are accessible via the **Animation Helpers** sidebar panel
  and are fully scriptable.  They have been tested on Blender 3.6–5.0 and
  correctly handle missing dependencies by falling back to built-in behaviour.

- **Mesh optimization issue:** the previous `Optimize Mesh` routine could
  collapse vertices across UV seams and corrupt textures when the user
  reported "eating" of texture.  The function has been rewritten to use a
  UV-aware bmesh remove‑doubles operation; textures are now preserved after
  optimization.  Additionally, the operation is now driven by preferences
  (threshold, UV preservation toggle, apply transforms flag) under the
  "Mesh Optimization" section in the add-on settings so users may fine-tune
  behaviour for their assets.  The optimizer button also exposes these
  options directly via a popup for per-object overrides.

- When modifying or extending these helpers later, remember:
  * weight computation should always be deterministic and not rely on external
    network resources except for optional `pip` installs;
  * keep the panel buttons and API methods in sync to avoid UX drift;
  * update `API_REFERENCE.md`, `CHANGELOG.md` and `RIGGING_AND_MOTION_INTEGRATION.md`
    when changes are made (this file tracks the rationale).
  * if new batch or preset functionality is added, consider expanding the
    smoke-test script so CI exercises the new operators automatically.

## Other recent improvements

- Added batch processing operators for wind weights, wind animation and
  auto-weight painting; these are exposed in the UI and allow multi-selection
  workflows.
- Wind animation operator now supports built-in presets (Grass, Shrub, Tree)
  for one-click styling.
- Added **Toggle Wind Preview** operator and handler; can be toggled from the
  panel to see a live swaying effect without playing the timeline.
- `tools/check_blenders.py` was extended to instantiate a test mesh, run the
  new operators (including batch and preview toggle) and verify they complete
  without error, ensuring CI catches regressions in automation logic.
- Automatic dependency installation will prefer local wheel files placed in
  `tools/`, enabling offline setups.

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
