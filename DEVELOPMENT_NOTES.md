# Development Notes — Mossy Fallout 4 Blender Add-on

---

## 🟢 WORKING BASELINE — Restore to this if anything breaks

**Branch:** `copilot/add-activation-buttons-n-panel-again`
**Commit:** `b26029915816396e9efcc203a4199ee66c4cdf23`
**Zip on disk:** `D:\SteamLibrary\Blender-add-on.-copilot-add-activation-buttons-n-panel-again.zip`

This is the last confirmed-working version. All N-panel buttons appear, all 22 tests pass.

### How to restore from GitHub

```
git fetch origin copilot/add-activation-buttons-n-panel-again
git checkout origin/copilot/add-activation-buttons-n-panel-again -- __init__.py ui_panels.py operators.py setup_operators.py tutorial_operators.py DEVELOPMENT_NOTES.md
```

### What makes this version work — the 6 non-negotiable rules

1. **`tutorial_operators.py`** — defines all 4 tutorial classes
   (`FO4_OT_ShowDetailedSetup`, `FO4_OT_StartTutorial`, `FO4_OT_ShowHelp`, `FO4_OT_ShowCredits`).
   Its `register()` uses unregister-then-register to survive stale types on reload.

2. **`setup_operators.py`** — defines all 3 setup classes
   (`FO4_OT_InstallPythonDeps`, `FO4_OT_SelfTest`, `FO4_OT_ReloadAddon`).
   Same unregister-then-register pattern. **These MUST NOT exist as class bodies in `operators.py`.**

3. **`__init__.py` import order** — `_try_import()` loads with `importlib.reload()` for stale modules.
   Module list order: `tutorial_operators` → `setup_operators` → `operators` → `ui_panels`.
   **NEVER reverse or drop these.**

4. **`__init__.py` safety nets** — `_ensure_tutorial_operators()` and `_ensure_setup_operators()`
   are called at the end of `register()` AND inside `_deferred_startup()` (2s timer).
   **Do NOT remove these functions.**

5. **`ui_panels.py` — `_activation_op()` helper** — every call to the 7 activation operators
   must go through this helper.  **CRITICAL Blender 5.x note:** `hasattr(bpy.types, 'FO4_OT_X')`
   can return `False` even when the operator IS registered.  The old pattern of wrapping
   operator calls in `if hasattr(...): op() else: label()` caused the buttons to silently
   disappear (replaced by a static "(loading...)" label) on every Blender 5.x reload.
   `_activation_op()` performs the hasattr check but **always draws the button regardless**,
   so the button is never invisible.  Do NOT replace `_activation_op()` calls with a bare
   hasattr if/else that shows a label in the else-branch.

6. **`operators.py`** — does NOT contain class bodies for `FO4_OT_InstallPythonDeps`,
   `FO4_OT_SelfTest`, or `FO4_OT_ReloadAddon`. Duplicate bodies displace `setup_operators.py`
   registrations via Blender's RNAMeta metaclass at definition time.

### Key file sizes (working baseline)

| File | Lines |
|------|-------|
| `__init__.py` | 725 |
| `ui_panels.py` | 4572 |
| `operators.py` | 14136 |
| `setup_operators.py` | 284 |
| `tutorial_operators.py` | 492 |

---

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

`FO4_PT_MainPanel.draw()` in `ui_panels.py` uses the four operators from
`tutorial_operators.py`.  Each call goes through `_activation_op()` (defined near the top
of `ui_panels.py`), which performs a `hasattr(bpy.types, 'ClassName')` check internally.

**Blender 5.x gotcha:** `hasattr(bpy.types, 'FO4_OT_X')` can return `False` even when the
operator IS registered.  The old pattern — `if hasattr(...): op() else: label("loading...")`
— therefore silently replaced every button with a static text label, making the entire
activation panel appear blank.

`_activation_op()` was introduced to fix this: it performs the hasattr check (kept for
correctness on Blender versions where it works) but **always calls `layout.operator()`**
regardless of the result.  The button is always visible.

**Do NOT replace `_activation_op()` calls with a bare `if hasattr / else: label()` block.**
Doing so reintroduces this exact bug on Blender 5.x.  If the operator is missing the user
sees a single "unknown operator" error on click — a recoverable UX issue.  If the button
itself is missing the user has no way to click anything at all.

If `tutorial_operators.register()` fails, `_ensure_tutorial_operators()` in `register()`
attempts a last-ditch re-registration.
The most common reasons the operators fail to register:

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

The `register()` function **must** use the unregister-then-register pattern to handle stale
classes left over from a previous load or dual-install (see operators.py for the same pattern):
```python
def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception:
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
            except Exception as e2:
                print(f"tutorial_operators: ⚠ Failed to register {cls.__name__}: {e2}")
```

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
`bpy.types` and, if not, registers them directly using the unregister-then-register
pattern. It is a last-resort fallback for the dual-install / stale-sys.modules scenarios.

Additionally, `_ensure_tutorial_operators()` is called AGAIN inside `_deferred_startup()`
(2 seconds after startup) to catch cases where another extension (e.g. Fab, BAC) displaces
our classes after initial registration.

Search for `_ensure_tutorial_operators` in `__init__.py`. If it is missing, add it
(see the implementation already present in the file).

#### Step 6 — Run the full test suite

```
python3 -m unittest test_addon_integrity -v
```

All tests must pass. The `TestTutorialOperatorsModule` group specifically guards the
tutorial operators. If any test in that group fails, the code is still broken.

### What NOT to Do

- **⛔ Do NOT replace `_activation_op()` calls with `if hasattr / else: label()`** —
  This is the #1 cause of disappearing buttons on Blender 5.x.  `hasattr(bpy.types,
  'FO4_OT_X')` can return `False` even when the operator IS registered; an else-branch
  that shows a label will silently hide the button from the user.  Always use
  `_activation_op()` for the 7 activation operators, or call `layout.operator()` directly.
  **A visible button that fails on click is recoverable. An invisible button is not.**

- **Do NOT delete `tutorial_operators.py`** — even if you think the operators can live in
  `operators.py`. They were deliberately extracted to avoid a 14 000-line file failing to
  load blocking these 4 critical buttons.
- **Do NOT move `tutorial_operators` after `operators` in the modules list** — `ui_panels`
  draws buttons on the very first frame; if the operators are not registered before
  `ui_panels.register()` runs, the first draw will fail.
- **Do NOT remove `_activation_op()` from `ui_panels.py`** — it is the guard that keeps
  the 7 activation buttons always visible even when Blender 5.x hasattr is unreliable.
- **Do NOT merge a PR that changes `__init__.py` without verifying `tutorial_operators` is
  still in the modules list.**
- **Do NOT simplify `tutorial_operators.register()` back to a plain `bpy.utils.register_class(cls)`
  with no fallback** — the unregister-then-register pattern is required to handle the
  stale-class scenario that occurs on addon reload in Blender 5.0 extensions.
- **Do NOT simplify `ui_panels.register()` back to a plain `bpy.utils.register_class(cls)`
  with no fallback** — `ui_panels.register()` also uses the unregister-then-register pattern
  (added in the same PR as this note) so that panel classes are always up-to-date on reload.
  Without this, the old stale `FO4_PT_MainPanel` class stays registered, its draw() method
  may be from an older code version, and the "Fallout 4" N panel tab may behave incorrectly.
- **Do NOT delete `setup_operators.py`** — it contains the three Setup & Status panel
  operators (`FO4_OT_InstallPythonDeps`, `FO4_OT_SelfTest`, `FO4_OT_ReloadAddon`) that
  are registered before operators.py so they appear as real clickable buttons even if
  the larger operators.py bundle fails. See Step 3 / Step 5 above for the same reasoning
  that applies to `tutorial_operators.py`.
- **Do NOT add `FO4_OT_InstallPythonDeps`, `FO4_OT_SelfTest`, or `FO4_OT_ReloadAddon`
  back to the `classes` tuple in `operators.py`** — they are registered by `setup_operators.py`
  first; registering them again from `operators.py` would trigger the stale-class error and
  force the unregister-then-register fallback unnecessarily.
- **CRITICAL — Do NOT redefine `FO4_OT_InstallPythonDeps`, `FO4_OT_SelfTest`, or
  `FO4_OT_ReloadAddon` as class bodies anywhere in `operators.py`** — this is the permanent
  root cause that caused the buttons to vanish on every module reload. Blender's `RNAMeta`
  metaclass processes every `bpy.types.Operator` subclass at definition time. When
  `operators.py` is reloaded via `importlib.reload()` (which happens on every addon
  enable/disable cycle or F8 script reload), it creates a **new, unregistered** class object
  with the same `bl_idname`. This new object silently displaces the correctly-registered class
  from `setup_operators.py` in Blender's internal type map, making `hasattr(bpy.types,
  'FO4_OT_InstallPythonDeps')` return `False` and causing the N-panel buttons to disappear.
  The only correct fix is to have the class body in **exactly one module** (`setup_operators.py`).
  The stubs in `operators.py` must remain as plain comments only — never as class definitions.

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

## ⚠️ RECURRING BUG #2 — `_ensure_*` safety nets fire every startup on Blender 5

### Symptoms

Every Blender launch prints a wall of warnings even though the operators work fine:

```
⚠ _ensure_tutorial_operators: ['FO4_OT_ShowDetailedSetup', ...] not in bpy.types; attempting re-registration…
tutorial_operators: Registered fo4.show_detailed_setup
  ⚠ Failed to register FO4_OT_ShowDetailedSetup directly: already registered as a subclass 'FO4_OT_ShowDetailedSetup'
⚠ _ensure_setup_operators: ['FO4_OT_InstallPythonDeps', ...] not in bpy.types; attempting re-registration…
  ⚠ Failed to register FO4_OT_InstallPythonDeps directly: already registered as a subclass 'FO4_OT_InstallPythonDeps'
```

The operators ARE working — buttons appear and click correctly — but the log is full of
false-positive warnings on every startup and every deferred re-check.

### Root Cause

`hasattr(bpy.types, 'FO4_OT_X')` returns `False` in Blender 5's extension system
(`bl_ext.user_default.*` namespace) even after `bpy.utils.register_class()` has succeeded.
This is a Blender 5 quirk: the `bpy.types` Python attribute map does not always reflect
types registered under the extension namespace.

The old safety-net code used `hasattr(bpy.types, cls_name)` as the sole existence check.
Because this returned `False` on every startup on Blender 5, `_ensure_tutorial_operators()`
and `_ensure_setup_operators()` both concluded the operators were missing, attempted a full
re-registration, and then each individual `bpy.utils.register_class(cls)` raised "already
registered as a subclass" — because the operator WAS registered all along.

This is the **same underlying Blender 5 issue** as Recurring Bug #1's button-disappearance
(where `hasattr` returned `False` and the else-branch showed a label instead of a button),
manifesting here in the safety-net logic instead of the UI layer.

### The Fix

`_is_operator_registered(cls_name, bl_idname)` in `__init__.py` performs a two-step check:
1. `hasattr(bpy.types, cls_name)` — fast path, correct on Blender 4.x.
2. `bpy.ops.<prefix>.<name>` attribute lookup — reliable on Blender 5 extensions.

```python
def _is_operator_registered(cls_name: str, bl_idname: str) -> bool:
    if hasattr(bpy.types, cls_name):
        return True
    try:
        prefix, name = bl_idname.split(".", 1)
        op_ns = getattr(bpy.ops, prefix, None)
        if op_ns is not None and hasattr(op_ns, name):
            return True
    except Exception:
        pass
    return False
```

Both `_ensure_tutorial_operators()` and `_ensure_setup_operators()` now call
`_is_operator_registered(cls_name, bl_idname)` instead of bare `hasattr(bpy.types, ...)`.

### What NOT to Do

- **Do NOT revert `_is_operator_registered()` back to bare `hasattr(bpy.types, ...)`.**
  On Blender 5 extensions, `hasattr(bpy.types, 'FO4_OT_X')` is unreliable.  The two-step
  check is the correct and permanent solution.
- **Do NOT remove the `bl_idname` parameter from `_is_operator_registered()`.**  The
  `bpy.ops` fallback requires knowing the operator's id (e.g. `"fo4.self_test"`).

---

## ⚠️ RECURRING BUG #3 — Install operators crash with `AttributeError` on click

### Symptoms

Clicking any of the AI/tool install buttons in the N-panel prints to the console:

```
Exception in thread Thread-N (_run):
AttributeError: module '...blender_game_tools.tool_installers' has no attribute 'install_hunyuan3d'
AttributeError: module '...blender_game_tools.tool_installers' has no attribute 'install_hymotion'
AttributeError: module '...blender_game_tools.tool_installers' has no attribute 'install_shap_e'
AttributeError: module '...blender_game_tools.tool_installers' has no attribute 'install_point_e'
AttributeError: module '...blender_game_tools.tool_installers' has no attribute 'install_zoedepth'
AttributeError: module '...blender_game_tools.tool_installers' has no attribute 'install_triposr'
```

The install dialog appears to do nothing; the background thread crashes silently.

### Root Cause

`operators.py` defines install operator classes (e.g. `FO4_OT_InstallHunyuan3D`) whose
`_run()` thread bodies call `tool_installers.install_hunyuan3d()`, but those functions
were never implemented in `tool_installers.py`.  The operators existed; the backing
functions did not.

### The Fix

Six functions were added to `tool_installers.py` (before `install_collective_modding_toolkit`):

| Function | Method |
|---|---|
| `install_shap_e()` | `pip install shap-e` |
| `install_point_e()` | `pip install point-e` |
| `install_zoedepth()` | `git clone isl-org/ZoeDepth` + pip deps |
| `install_triposr()` | `git clone VAST-AI-Research/TripoSR` + pip deps |
| `install_hunyuan3d()` | `git clone Tencent/Hunyuan3D-2` + pip deps |
| `install_hymotion()` | `git clone Tencent/HunyuanVideo-Avatar` + pip deps |

### What NOT to Do

- **Do NOT add a new install operator in `operators.py` without implementing the
  corresponding `install_*()` function in `tool_installers.py`.**  The operator's
  `_run()` thread will crash silently on first click.
- When adding a new install function, follow the existing pattern: check for existing
  install first (`dest.exists()`), handle `git not found`, set a reasonable timeout,
  and return `(True, message)` or `(False, reason)`.

---

## ⚠️ RECURRING BUG #4 — `notification_system.notify()` crashes from background threads

### Symptoms

Background install threads (e.g. `FO4_OT_InstallUEImporter._run`) crash with:

```
RuntimeError: Operator bpy.ops.fo4.show_message.poll() Missing 'window' in context
```

The install itself may complete successfully, but the success/failure popup never appears.

### Root Cause

`FO4_NotificationSystem.notify()` used to call `bpy.ops.fo4.show_message('INVOKE_DEFAULT', …)`
directly.  All install operators run their work on daemon background threads.
`INVOKE_DEFAULT` operators require a window context that only exists on Blender's main
thread.  Blender 5 is stricter about this than earlier versions.

### The Fix

In `notification_system.py`, the direct `bpy.ops` call was replaced with
`bpy.app.timers.register()`:

```python
def _show_popup():
    try:
        bpy.ops.fo4.show_message('INVOKE_DEFAULT', message=_msg, icon=_icon)
    except Exception:
        pass
    return None  # returning None de-registers the timer

bpy.app.timers.register(_show_popup, first_interval=0.0, persistent=False)
```

Timers always execute on Blender's main thread, so `INVOKE_DEFAULT` gets the window
context it needs.

### What NOT to Do

- **Do NOT call `bpy.ops.X('INVOKE_DEFAULT', …)` directly from any background thread.**
  Always wrap it in `bpy.app.timers.register(lambda: bpy.ops.X('INVOKE_DEFAULT', …))`.
- **Do NOT call `bpy.context.scene` or any `bpy.data` property from a background thread**
  without guarding with `bpy.app.timers.register()` — same restriction applies.

---

## ⚠️ RECURRING BUG #5 — Instant-NGP reports "not found" when source IS cloned

### Symptoms

The user has already clicked "Auto-Install Instant-NGP" (source cloned to
`D:\Blender addon\tools\instant-ngp\`), but clicking "Check Instant-NGP Installation"
shows:

```
WARNING Instant-NGP not found
```

The panel says "not found" even though the source is present and just needs to be built
with cmake.

### Root Cause

Three operators (`FO4_OT_ReconstructFromImages`, `FO4_OT_ShowInstantNGPInfo`,
`FO4_OT_CheckInstantNGPInstallation`) all had hardcoded:

```python
self.report({'WARNING'}, "Instant-NGP not found")
```

This string was used regardless of what `check_instantngp_installation()` actually
returned.  That function correctly distinguishes "source found but not built" from
"not installed at all" in its returned message — but the operator discarded that
information and showed the same string either way.

### The Fix

`_instantngp_status_report(message)` in `operators.py` maps the real message to a
correct summary:

```python
def _instantngp_status_report(message: str) -> str:
    msg_lower = message.lower()
    if "source found" in msg_lower or "already cloned" in msg_lower:
        return "Instant-NGP source found — needs building (see console for cmake instructions)"
    if "already built" in msg_lower or "instant-ngp ready" in msg_lower:
        return "Instant-NGP is ready"
    return "Instant-NGP not found — see console for install instructions"
```

All three operators now call `self.report({'WARNING'}, _instantngp_status_report(message))`.

### What NOT to Do

- **Do NOT hardcode "not found" strings in operator reports** when the underlying helper
  already returns a status message.  Always forward or summarise the message that the
  helper returns.

---

## ⚠️ RECURRING BUG #7 — Knowledge base directory missing causes false-positive WARN

### Symptoms

Diagnostics shows a warning about the knowledge base even on a fresh install:

```
⚠ [Knowledge]  knowledge_base/ directory not found
```

Even though no custom snippets directory was configured and the Advisor AI still works.

### Root Cause

`knowledge_helpers._kb_root()` returned the default path `<addon_dir>/knowledge_base/` but
did not create it if absent. `addon_diagnostics.py` check #12 then tested `os.path.isdir()`
and emitted a WARN when the directory did not exist on disk.  An empty-but-absent directory
is not an error — the Advisor still works without any snippets.

### The Fix

1. `knowledge_helpers._kb_root()` now calls `os.makedirs(default_path, exist_ok=True)` when
   the default (non-custom) path is used, so the directory always exists after the first run.
2. `knowledge_helpers.status()` returns `(True, "…no snippets loaded…")` for an
   **empty-but-existing** directory instead of `(False, "empty")`.  No snippets is INFO, not
   an error.
3. A `knowledge_base/README.md` placeholder is shipped in the repo so the directory is never
   absent on a fresh clone.
4. `addon_diagnostics.py` check #12 mirrors `_kb_root()` by calling `os.makedirs` (gated on
   `_kb_is_default`) before the `os.path.isdir` test.

### Key Files

- `knowledge_helpers.py` — `_kb_root()` auto-create; `status()` empty-dir true result
- `addon_diagnostics.py` — check #12 pre-create guard
- `knowledge_base/README.md` — bundled placeholder

### Test

`test_addon_integrity.py` — `TestKnowledgeBaseDirectoryBundled`,
`TestKnowledgeBaseDiagnosticAutoCreate`

---

## ⚠️ RECURRING BUG #8 — Dual-install warning lists every sub-module (30+ entries)

### Symptoms

Diagnostics check #3 emits a warning that lists every sub-module key:

```
⚠ [Addon]  Dual install detected: ['bl_ext.blender_org.blender_game_tools.operators',
   'bl_ext.blender_org.blender_game_tools.ui_panels', … 28 more …]
```

instead of just the foreign root package name.

### Root Cause

The check iterated `sys.modules` and collected **all** keys whose module object had a
different `__file__` path.  Sub-modules share their root's `__file__` path so all 30+
sub-module keys were included in the detail string.

Additionally, same-directory installs (stale namespace, e.g. after a rename) were reported
as genuine dual-install warnings instead of INFO-level stale-namespace notices.

### The Fix

1. Collect only **root keys** (keys ending with `"." + name_base`, i.e. the top-level
   package entry) when building `foreign_roots`.  Sub-module keys are discarded.
2. Compare `os.path` of each foreign root's `__file__` against the current addon's directory:
   - **Same physical path** → stale namespace, same install → INFO (not a warning).
   - **Different physical path** → genuine dual install → WARN.
3. Auto-Fix Step 0 purges stale same-directory entries from `sys.modules`.
4. `register()` Step 0b also proactively purges stale entries at every startup.

### Key Files

- `addon_diagnostics.py` — check #3 (`foreign_roots` extraction, `stale_roots` /
  `genuine_roots` classification); Auto-Fix Step 0 purge; `register()` Step 0b purge
- `__init__.py` — Step 0b purge in `register()`

### Test

`test_addon_integrity.py` — `TestDualInstallDetection`

---

## ⚠️ RECURRING BUG #9 — pip-installed packages (trimesh/pypdf) missing after restart

### Symptoms

After installing trimesh or pypdf via the Setup panel:

```
[MISSING]  trimesh
[MISSING]  pypdf
```

The packages show as MISSING on the next Blender startup even though they were successfully
installed.

### Root Cause

Blender's bundled Python omits the user site-packages directory from `sys.path` at boot.
`pip install` without `--target` placed packages into user site-packages, which is never
searched.

Additionally, `_pip_install()` used `subprocess.check_call()` which swallowed output and
did not update `sys.path` after installation, so even within the same session the packages
could appear missing.

### The Fix

1. `_pip_install()` and `_pip_install_requirements()` now use `--target str(_PIP_LIB_DIR)`
   where `_PIP_LIB_DIR = ADDON_ROOT / "lib"`.  Packages land in the addon's own `lib/`
   folder, which Blender always loads.
2. `_refresh_import_paths()` appends `_PIP_LIB_DIR` to `sys.path` and calls
   `site.addsitedir()` on the user site as a backward-compat fallback.
3. `register()` in `__init__.py` calls `_refresh_import_paths()` at the very top (Step 0,
   before the module registration loop) so paths are restored every startup.
4. `setup_operators._run()` calls `ui_panels.invalidate_dep_cache()` after a successful
   install so the UI clears the stale MISSING status immediately.

### Key Files

- `tool_installers.py` — `_PIP_LIB_DIR`, `_ensure_pip_lib_dir()`, `_pip_install()`,
  `_pip_install_requirements()`, `_refresh_import_paths()`
- `__init__.py` — Step 0 `_refresh_import_paths()` call in `register()`
- `ui_panels.py` — `invalidate_dep_cache()`
- `setup_operators.py` — `invalidate_dep_cache()` call after successful install

### Test

`test_addon_integrity.py` — `TestPipInstallRobustness`

---

## ⚠️ RECURRING BUG #10 — libigl install fails silently (Blender Python has no dev headers)

### Symptoms

Clicking "Install libigl" appears to do something but libigl remains missing.  No clear
error message is shown.  The underlying `pip install` fails because libigl requires a
source build (C++ compilation) and Blender's bundled Python has no `Include/` headers.

### Root Cause

`install_libigl()` called `pip install igl` directly without checking for Python development
headers first.  On Blender's Python (which ships without `Include/`), any source-build pip
package silently fails.  The failure exit code from pip was not surfaced to the user.

### The Fix

`install_libigl()` now pre-checks `sysconfig.get_path("include")` before calling pip:

```python
inc_dir = sysconfig.get_path("include")
if not (inc_dir and os.path.isdir(inc_dir)):
    return False, ("Python dev headers not found. Blender's bundled Python cannot "
                   "build C extensions. Install libigl manually or use a system Python.")
```

This guard surfaces a clear, actionable message instead of a silent failure.

### Key Files

- `tool_installers.py` — `install_libigl()` pre-flight header check (lines ~1369–1415)

### Test

`test_addon_integrity.py` — `TestInstallLibiglHeadersCheck`

---

## ⚠️ RECURRING BUG #11 — AI tool cache stale / pytorch_path not persisted in Diagnostics

### Symptoms

The Diagnostics panel shows AI tools as "unknown" or "not installed" even though they are
installed.  After running Auto-Fix, the status refreshes but reverts to stale on next open.
`prefs.pytorch_path` is empty in Diagnostics even though it was set via Mossy.

### Root Cause

The Diagnostics Auto-Fix had no steps to:
1. Refresh AI tool status caches (each tool helper has its own cached status).
2. Apply the saved `pytorch_path` from preferences to `sys.path`.

Without these steps, Diagnostics showed stale cache values and did not benefit from the
pytorch_path persistence fix (Bug #12).

Additionally, Auto-Fix Step 5 was unconditionally refreshing ALL AI caches on every run,
causing unnecessary slowdowns, and Step 0 was leaving ghost `sys.modules` entries for
add-on sub-modules whose `__file__` no longer existed on disk.

### The Fix

1. Added diagnostic check #13 — AI tool stale cache detection.
2. Added diagnostic check #14 — Mossy `pytorch_path` persistence check.
3. Added Auto-Fix Step 5 — refresh all AI tool caches, **conditional** (only fires when
   status is `None` or stale, not on every run).
4. Added Auto-Fix Step 6 — apply saved `pytorch_path` to `sys.path`.
5. Added Auto-Fix Step 7 — auto-create `knowledge_base/` directory if missing.
6. Auto-Fix Step 0 now purges ghost `sys.modules` entries where `__file__` no longer exists.
7. Diagnostic check #3 classifies ghost entries (same path, file gone) as stale, not genuine
   dual-install warnings.

### Key Files

- `addon_diagnostics.py` — check #13 (AI cache), check #14 (pytorch_path pref),
  Auto-Fix Steps 0 (ghost purge), 5 (conditional cache refresh), 6 (pytorch_path),
  7 (knowledge_base mkdir)

### Tests

`test_addon_integrity.py` — `TestAutoFixStep5Conditional`, `TestAutoFixStep7KnowledgeBase`,
`TestDualInstallGhostEntriesClassifiedAsStale`, `TestAutoFixStep0PurgesGhostEntries`

---

## ⚠️ RECURRING BUG #12 — Mossy PyTorch path lost on Blender restart

### Symptoms

The user connects Mossy and PyTorch works correctly during that Blender session.
After restarting Blender, `prefs.pytorch_path` is empty and torch is not
importable.  The user must connect Mossy again every session.

### Root Cause

`_store_pytorch_path_in_prefs()` in `mossy_link.py` called
`bpy.ops.wm.save_userpref()` **directly without a window-context override**.
When this function is invoked from inside a `bpy.app.timers` callback
(the `_process_command_queue` timer that runs every 0.1 s while the server is
active), `bpy.context.window` can be `None`.  Blender operators that lack a
valid context return `{'CANCELLED'}` — they do **not** raise an exception.
Because the code only wraps the call in `except Exception`, the silent
`CANCELLED` result was never detected, and the preferences file was never
written to disk.

### The Fix

Three complementary layers, all required:

1. **JSON keys file backup** — `_store_pytorch_path_in_prefs()` now calls
   `preferences.save_api_keys()` immediately after setting `prefs.pytorch_path`.
   `save_api_keys()` writes the path to `~/.blender_game_tools_keys.json` using
   plain file I/O that requires no Blender operator context.

2. **Deferred Blender prefs save** — `_store_pytorch_path_in_prefs()` now calls
   `preferences.save_prefs_deferred()` instead of bare `wm.save_userpref()`.
   `save_prefs_deferred()` schedules the save via a timer and applies
   `bpy.context.temp_override(window=wins[0])` so the operator always has a
   valid window context.

3. **JSON restore on startup** — `load_api_keys()` now reads `pytorch_path` from
   the JSON file.  If `prefs.pytorch_path` is empty (because the Blender prefs
   save failed), it is populated from JSON and the path is added to `sys.path`
   immediately.  Additionally, `restore_extra_python_paths()` now also applies
   `prefs.pytorch_path` to `sys.path` so the path is active before any
   torch-dependent module draws.

### What NOT to Do

- **Do NOT add a bare `bpy.ops.wm.save_userpref()` call** inside any timer
  callback or function called from a timer.  Always use `save_prefs_deferred()`.
- **Do NOT remove `pytorch_path` from `save_api_keys()`** — the JSON file is the
  only reliable cross-restart persistence that does not depend on Blender's
  operator context.
- The regression tests in `TestMossyPytorchPathJsonPersistence` in
  `test_addon_integrity.py` enforce all three layers — keep them passing.

---

## ⚠️ RECURRING BUG #13 — Mossy PyTorch path not applied when Blender opens

### Symptoms

AI tools (RigNet, Shape-E, Point-E, Hunyuan3D, HY-Motion, ZoeDepth) show as
unavailable on first startup even though the user has previously connected Mossy
and Mossy sent a `set_pytorch_path` command that was saved to preferences.  The
Blender System Console contains no error from `mossy_link`, but also no
`[Mossy Link] Loaded PyTorch path from preferences:` message.

### Root Cause

`mossy_link.register()` calls `_load_pytorch_path_from_prefs()` synchronously
during the modules registration loop.  `_load_pytorch_path_from_prefs()` calls
`get_preferences()`, which internally does:

```python
addon = bpy.context.preferences.addons.get(_addon_name())
return addon.preferences if addon else None
```

On some Blender builds / platforms `bpy.context.preferences.addons` is not yet
fully populated at the time the addon's own `register()` loop runs.  When that
happens `get_preferences()` returns `None`, the path is silently not applied, and
the AI tool caches that run later in `deferred_startup()` step 6b see no torch.

### The Fix

`startup_helpers.deferred_startup()` now calls `_load_pytorch_path_from_prefs()`
as a **safety-net** at the very beginning of step 6b — 2 seconds after Blender
finishes loading, when `get_preferences()` is guaranteed to return the real prefs
object.  The call is idempotent: if the path was already in `sys.path` (because
`register()` succeeded), nothing changes.

```python
# Safety net: re-apply the Mossy-provided PyTorch path before the tool
# caches below run.
try:
    from . import mossy_link as _ml
    if _ml:
        _ml._load_pytorch_path_from_prefs()
except Exception as _e:
    print(f"Mossy PyTorch path re-apply skipped: {_e}")
```

### What NOT to Do

- **Do NOT remove the `_load_pytorch_path_from_prefs()` call from
  `mossy_link.register()`**.  It handles the normal case where preferences are
  ready at register time and must run before any torch-dependent module registers.
- **Do NOT remove the safety-net call from `deferred_startup()` step 6b**.  It
  handles the edge case where `get_preferences()` returned `None` during
  `register()`.  Both calls are necessary.
- The regression test `test_deferred_startup_reapplies_mossy_pytorch_path` in
  `test_addon_integrity.py` enforces the safety-net call — keep it passing.

---

## ⚠️ RECURRING BUG #14 — trimesh / pypdf show [MISSING] after every Blender restart

### Symptoms

The self-test ("Run Environment Self-Test") shows:

```
[MISSING] trimesh (3D mesh processing)
[MISSING] pypdf (PDF parsing)
```

…even though clicking "Install Core Dependencies" succeeds and shows `[OK]` in the
*same* Blender session.  After restarting Blender the packages are [MISSING] again.

### Root Cause

Earlier fix attempts added `_refresh_import_paths()` (which calls
`site.addsitedir(getusersitepackages())`) to the top of `register()`.  This was
meant to add the user site-packages directory to `sys.path` so that pip-installed
packages would be found.  It works when pip installs to user site-packages, but
Blender's embedded Python can be configured with `PYTHONNOUSERSITE=1` (or the
equivalent Blender-internal isolation mechanism for the extension system in
Blender 5.x), which means:
  1. `getusersitepackages()` may return a path that is NOT where pip actually
     installed the packages, and
  2. even if it returns the right path, the packages may not be there because pip
     chose a different install scheme (e.g. the prefix scheme into Blender's own
     `lib/site-packages` which might be read-only, causing pip to silently fail
     or fall back to an unexpected location).

### The Fix

Instead of relying on guessing which site-packages directory pip used, we now
pass `--target <addon_root>/lib/` to every `pip install` command.  This means:

- Packages are **always** installed into a single known directory
  (`ADDON_ROOT/lib/`, i.e. the `lib/` subdirectory of the add-on itself).
- `_refresh_import_paths()` appends `str(_PIP_LIB_DIR)` to `sys.path` on
  every Blender startup (via the call in `register()`), so the packages are
  importable immediately without any further guessing.
- The old `site.addsitedir(getusersitepackages())` call is kept as a
  backward-compat fallback for users who installed packages before this fix.

### Key Files

- `tool_installers.py`: `_PIP_LIB_DIR` constant; `_pip_install()` and
  `_pip_install_requirements()` now both pass `--target str(_PIP_LIB_DIR)`;
  `_refresh_import_paths()` appends the lib dir before the user-site fallback.
- `__init__.py` `register()`: unchanged — already calls
  `tool_installers._refresh_import_paths()` as Step 0.

### Do NOT

- Remove the `--target` flag from `_pip_install()` or `_pip_install_requirements()`.
- Remove the `_PIP_LIB_DIR.exists()` guard + `sys.path.append` from
  `_refresh_import_paths()` (this is the primary path-addition, not a fallback).
- Remove the `_refresh_import_paths()` call from `register()` in `__init__.py`
  (Step 0) — this must run before any `importlib.find_spec()` calls.

### Tests

`TestPipInstallRobustness` in `test_addon_integrity.py` now includes:
- `test_pip_install_uses_target_dir` — verifies `--target` is in `_pip_install`.
- `test_pip_install_requirements_uses_target_dir` — verifies `--target` is in
  `_pip_install_requirements`.
- `test_refresh_import_paths_adds_lib_dir` — verifies `_PIP_LIB_DIR` is appended
  to `sys.path` in `_refresh_import_paths`.

---

## ⚠️ RECURRING BUG #6 — `ModuleNotFoundError: No module named 'bpy'` in multiprocessing workers

### Symptoms

Clicking "Generate from Text" or "Generate from Image" in the Shap-E or Point-E panels
produces a silent crash.  Blender's System Console shows:

```
Python: Traceback (most recent call last):
  File "...shap_e_helpers.py", line N, in <module>
    from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty
ModuleNotFoundError: No module named 'bpy'
```

The generation never completes and no result is returned.

### Root Cause

`shap_e_helpers.py` and `point_e_helpers.py` both spawn a child process using
`multiprocessing.get_context("spawn").Process(...)`.  In the child process, Python
starts fresh with no Blender environment — `bpy` is not available.

Before the fix both files had:

```python
try:
    import bpy  # type: ignore
except ImportError:
    bpy = None
from bpy.props import StringProperty, ...   # ← OUTSIDE the try block
```

When the child process reimported the module, the `try/except` caught `import bpy`, set
`bpy = None`, and then immediately crashed at the bare `from bpy.props import ...` line
because `bpy` (and therefore `bpy.props`) does not exist in the child.

### The Fix

Move **every** `from bpy.props import ...` statement inside the same `try` block that
guards `import bpy`, and add stub fallbacks in the `except` branch:

```python
try:
    import bpy  # type: ignore
    from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty
except ImportError:  # worker processes run without Blender
    bpy = None
    StringProperty = EnumProperty = IntProperty = FloatProperty = BoolProperty = None
```

This was applied to `shap_e_helpers.py` and `point_e_helpers.py` (in the import section near the top of each file).

### What NOT to Do

- **Do NOT put `from bpy.props import ...` outside the `try: import bpy` block** in any
  file that uses `multiprocessing.Process`.  The child process does not have Blender, so
  any bare `bpy.*` import at module level will crash the worker on startup.
- The regression test `test_bpy_props_inside_try_in_worker_modules` in
  `test_addon_integrity.py` enforces this — keep it passing.

---

## UModel Auto-Download — `umodel_install_attempted` Flag

UModel cannot be auto-downloaded (no reliable public URL as of Blender 5.0).
The `umodel_install_attempted` flag in preferences **must** be set to `True` after a
**failed** download attempt, not only after a successful one.  Without this, the deferred
startup tries to download UModel on *every* Blender launch, spamming the console with
network timeout / 404 errors.

The fix is in `__init__.py _deferred_startup()` — after a failed `download_latest()` call,
`_prefs.umodel_install_attempted = True` is set so subsequent startups skip the attempt.
The user can reset this flag by toggling *Auto-install tools* in preferences if they want
to retry after manually visiting https://www.gildor.org/en/projects/umodel.

### UModel win32 URL returns HTTP 404 (Blender 5 / 2026)

The download page at `gildor.org/en/projects/umodel` still lists a `umodel_win32.zip`
path in its HTML, but that file returns HTTP 404 — the site switched to 64-bit only builds.

`_find_download_url()` in `umodel_helpers.py` now:
1. When a scraped URL contains `win32`, automatically constructs and tries `win64` and
   `x64` variants before giving up.
2. The static GitHub fallback list now tries `UModel_Win64.zip` and `UModel_win64.zip`
   before the generic `UModel.zip`.

If UModel download fails again in future, check whether the URL pattern has changed by
visiting `https://www.gildor.org/en/projects/umodel` and inspecting the download links.

---

## `texture_helpers/` — Package Sub-Module Pattern

`texture_helpers` is a **Python package** (a folder with `__init__.py`), not a flat `.py` file.
This is the same pattern used by `mesh_helpers` sub-panels: related operators live inside the
package rather than being scattered across the giant `operators.py`.

### Structure

```
texture_helpers/
  __init__.py              # TextureHelpers class (setup_fo4_material, install_texture,
  │                        # validate_textures). register() calls conversion_operators.register().
  conversion_operators.py  # FO4_OT_ConvertTextureToDDS, FO4_OT_ConvertObjectTexturesToDDS,
                           # FO4_OT_TestDDSConverters, FO4_OT_CheckNVTTInstallation
```

### Rules — do NOT break these

- **Do NOT flatten `texture_helpers/` back to `texture_helpers.py`.**  
  If `texture_helpers/__init__.py` is replaced by a flat `.py` file, the four DDS conversion
  operators will no longer be registered (their `register()` call lives inside the package's
  `__init__.py` which calls `conversion_operators.register()`).

- **Do NOT delete `texture_helpers/conversion_operators.py`.**  
  The four conversion operators (`fo4.convert_texture_to_dds`, `fo4.convert_object_textures_to_dds`,
  `fo4.test_dds_converters`, `fo4.check_nvtt_installation`) are defined here and registered by
  `texture_helpers/__init__.py register()`.  Deleting this file removes all DDS conversion
  buttons from the UI.

- **Do NOT move those four operators back into `operators.py`.**  
  They were deliberately moved out to keep `operators.py` maintainable and to follow the
  helpers-subfolder pattern established for mesh sub-panels.

- **`FO4_PT_NVTTPanel` is a child sub-panel of `FO4_PT_texture_panel`** (not a top-level
  panel).  Its `bl_parent_id = "FO4_PT_texture_panel"`.  Do NOT change this to
  `"FO4_PT_main_panel"` — that would make it a duplicate top-level panel and break the
  Texture Helpers hierarchy.

### How the test suite handles packages

`test_addon_integrity.py` has a `_module_exists()` helper that accepts both flat `.py` files
**and** packages (folders with `__init__.py`).  Both `test_init_try_imports` and
`test_modules_list_files_exist` use this helper, so `texture_helpers` passes even though
there is no `texture_helpers.py` on disk.

If you add another module as a package (e.g. `foo_helpers/`), add the `__init__.py` path to
`_collect_registered_ids`'s `files_to_scan` list in `test_addon_integrity.py` if it defines
and registers its own operator classes.

---

## ⚠️ RECURRING BUG #15 — Havok2FBX "folder found but expected files missing" false-positive

### Symptoms

The Diagnostics panel shows:

```
⚠ [Tools]  Havok2FBX: folder found but expected files missing - D:\blender_tools\havok2fbx\
```

even though the folder contains a valid `havok2fbx.exe`.

### Root Cause

The Havok2FBX diagnostic block in `addon_diagnostics.py` delegated the exe check entirely
to `_ti.check_havok2fbx()`:

```python
elif _ti and hasattr(_ti, "check_havok2fbx") and _ti.check_havok2fbx(_p):
    results.append(("OK", ...))
elif os.path.isdir(_p):
    results.append(("WARN", "...: folder found but expected files missing - {_p}"))
```

When `tool_installers` fails to load (`_ti is None`), the guard `_ti and …` evaluates
to `False` immediately and the check is skipped entirely.  The code falls straight to
`os.path.isdir(_p)`, which is `True`, so it emits the false-positive warning even though
no file check was ever performed.

The UModel block already used an inline `os.walk` loop that does not touch `_ti` at all;
the Havok2FBX block was inconsistent with this pattern.

### The Fix

Replace the `_ti`-dependent guard with an inline `os.walk` loop, matching the UModel
pattern exactly:

```python
elif (os.path.isfile(os.path.join(_p, "havok2fbx.exe"))
      or os.path.isfile(os.path.join(_p, "havok2fbx"))
      or any(f in ("havok2fbx.exe", "havok2fbx")
             for _, _, files in os.walk(_p) for f in files)):
    results.append(("OK", "Tools", f"Havok2FBX: verified at {_p}"))
```

This is independent of `_ti`, handles both the direct top-level case (fast path) and
nested sub-directories (e.g. a GitHub zip that extracts to `havok2fbx-win64/`), and
covers both Windows (`.exe`) and Linux/Mac (no extension) executables.

### Test

`test_addon_integrity.py` — `TestHavok2FBXDiagnosticInlineCheck`

---

## How to Add a New Module Without Breaking Things

1. Add `new_module = _try_import("new_module")` near the top of `__init__.py`.
   - If it is a **package** (`new_module/__init__.py`), `_try_import("new_module")` still works —
     Python imports the package's `__init__.py` automatically.
2. Add `new_module,` to the `modules` list. Keep `tutorial_operators` **before** `operators`.
3. If the package registers its own operator classes, add its sub-module path (e.g.
   `"new_module/operators.py"`) to `_collect_registered_ids`'s `files_to_scan` list in
   `test_addon_integrity.py`.
4. Run `python3 -m unittest test_addon_integrity -v` — all tests must pass.
5. Do NOT reorder existing entries in the modules list.


---

## ⚠️ RECURRING BUG #16 — Credits popup shows only 2 entries; nav buttons cut off

### Symptoms

Clicking the "Credits" button in the main panel opens a popup that shows only **2** entries
out of 59 total tools.  The popup has no obvious way to see the remaining 57 entries.  In
earlier versions the "Next >" nav button was present but rendered below the visible popup
area and could not be clicked.

### Root Cause

`_CREDITS_PAGE_SIZE` was set to 2 (previously 4, then reduced to 2 to "fix" the cut-off
nav button).  With 59 entries / 2 per page = **30 pages** of navigation.  Users see page
1 of 30 and reasonably conclude only 2 tools are credited.

The root issue with the cut-off nav button was that the navigation row was placed **at the
bottom** of the popup.  When the popup content exceeded the screen height, Blender clipped
the bottom rather than adding a scrollbar (version-dependent behaviour), so the nav buttons
disappeared below the visible area.  Reducing the page size to 2 "fixed" the cut-off but
made the content useless.

### The Fix

1. **`_CREDITS_PAGE_SIZE` raised to 8** — 59 entries / 8 per page = 8 pages, which is
   navigable and shows meaningful content per page.
2. **Navigation row moved to the TOP** of the popup, immediately below the title.  This
   guarantees "< Prev" and "Next >" are always visible regardless of how tall the entry
   boxes are or where Blender clips the popup bottom.
3. Page indicator now shows total tool count: `"Page 1 / 8  (59 tools total)"` so users
   know the full scope at a glance.

### What NOT to Do

- **Do NOT reduce `_CREDITS_PAGE_SIZE` to fix cut-off nav buttons.**  The correct fix is
  to move the nav row to the top of the popup.
- **Do NOT move the nav row back to the bottom.**  It will be clipped on smaller displays
  or in Blender versions that do not scroll popup content.

### Key Files

- `tutorial_operators.py` — `_CREDITS_PAGE_SIZE = 8`; `FO4_OT_ShowCredits.draw()` nav row
  at top

---

## ⚠️ RECURRING BUG #17 — Credits popup crashes: `enum "STAR" not found`

### Symptoms

Opening the Credits popup in Blender 5.0 immediately throws:

```
TypeError: UILayout.label(): error with keyword argument "icon" -
enum "STAR" not found in (...)
Python script error in FO4_OT_show_credits.draw
```

The popup fails to draw at all.

### Root Cause

`_CREDITS_SECTIONS` in `tutorial_operators.py` used `'STAR'` as the icon for two
"primary/recommended" entries:

```python
('STAR', "PyNifly  ★  PRIMARY NIF EXPORTER", [...])
('STAR', "ComfyUI-BlenderAI-node  ★  RECOMMENDED AI WORKFLOW", [...])
```

The `STAR` icon was removed from Blender's icon enum between Blender 4.x and 5.0.
Any call to `layout.label(icon='STAR')` crashes the entire `draw()` method, making
the popup completely unusable.

### The Fix

Replace both `'STAR'` occurrences with `'FUND'` (the heart/donate icon already used
for the Credits button itself — a natural match for "featured/important" items):

```python
('FUND', "PyNifly  ★  PRIMARY NIF EXPORTER", [...])
('FUND', "ComfyUI-BlenderAI-node  ★  RECOMMENDED AI WORKFLOW", [...])
```

### What NOT to Do

- **Do NOT use `'STAR'`** — it does not exist in Blender 5.0.
- **Always cross-check new icons** against Blender's actual enum before adding them.
  The full valid enum is visible in the traceback when an invalid icon is used, or
  by running `bpy.types.UILayout.bl_rna.properties['icon'].enum_items.keys()` in the
  Blender Python console.
- If adding new "featured" entries to `_CREDITS_SECTIONS`, use `'FUND'` or `'CHECKMARK'`
  as the highlight icon — both are confirmed present in Blender 5.0.

### Key Files

- `tutorial_operators.py` — `_CREDITS_SECTIONS` (two `'STAR'` → `'FUND'` replacements)
- `test_addon_integrity.py` — `TestNoInvalidIcons.REMOVED_ICONS` now includes `'STAR'`; `test_no_removed_icons_in_tutorial_operators` guards `tutorial_operators.py`


## ⚠️ RECURRING BUG #18 — Extension policy violations from UE4 importer (fo4_blender_ue4_importer, uasset, umat, umesh, umap, register_helper, sys.path)

### Symptom

After packaging the add-on as a Blender 4.2+/5.x extension (.zip) and installing
via "Install from Disk", Blender's Preferences → Add-ons panel shows a warning
triangle with multiple "Policy violation" messages:

```
Policy violation with top level module: fo4_blender_ue4_importer
Policy violation with top level module: uasset
Policy violation with top level module: register_helper
Policy violation with top level module: umat
Policy violation with top level module: umesh
Policy violation with top level module: umap
Policy violation with sys.path: .\tools\Blender-UE4-Importer
```

### Root cause

`ue_importer_helpers._load_module()` used to call:

```python
spec = importlib.util.spec_from_file_location("fo4_blender_ue4_importer", ...)
sys.modules["fo4_blender_ue4_importer"] = module
spec.loader.exec_module(module)
```

Blender's Extension policy checker (introduced in 4.2) forbids extensions from:
1. Registering **bare top-level names** in `sys.modules` (must be namespaced under
   the extension's own package, e.g. `bl_ext.user_default.blender_game_tools.*`).
2. **Mutating `sys.path`** to add directories outside the extension folder.

The upstream Blender-UE4-Importer add-on does both: it inserts its own folder into
`sys.path` and imports `uasset`, `umat`, `umesh`, `umap`, `register_helper` as bare
top-level module names.  Our old loader made it worse by also registering
`fo4_blender_ue4_importer` as a bare name.

### Root cause (updated analysis)

Blender's Extension policy checker does **not** merely diff `sys.modules` before
and after `register()`.  It monitors writes to `sys.modules` and `sys.path`
**in real-time** during the `register()` call (using internal tracking hooks).
Even if cleanup code runs *after* `exec_module()` inside `register()`, Blender
has already recorded the violations by the time the cleanup fires.

The upstream `Blender-UE4-Importer/__init__.py` does:
```python
cur_dir = os.path.dirname(__file__)
if cur_dir not in sys.path: sys.path.append(cur_dir)
import umap, umesh, umat
```
and `umat.py` / `umesh.py` each repeat the same pattern and also
`import uasset, register_helper`.  Every one of those writes and path mutations
is caught by Blender's tracker.

### Fix (applied)

**The only reliable fix is to not call `_load_module()` (i.e. `exec_module()`)
inside the extension's `register()` at all.**

`ue_importer_helpers.register()` is now a deliberate no-op.  A new function
`load_and_register()` performs the download (if the tools folder is absent),
load, and upstream `register()`.  It is called exclusively from operator
`execute()` — which runs *after* Blender's policy-check window has closed.

**A – `register()` is a no-op (CRITICAL)**
```python
def register():
    # deliberate no-op — loading deferred to load_and_register()
```

**B – `load_and_register()` — the real entry-point**
Called by `FO4_OT_InstallUEImporter` and `FO4_OT_CheckUEImporter`.
Auto-downloads the upstream repo if `tools/Blender-UE4-Importer/` is absent,
then loads and registers it.

**C – `_load_module()` auto-downloads**
If `IMPORTER_INIT` doesn't exist, `_load_module()` now calls `download_latest()`
before attempting to load, so the folder is never required to be pre-populated.

**D – `deferred_startup()` provides cross-session persistence**
`startup_helpers.deferred_startup()` (the `bpy.app.timers` callback that runs
2 s after Blender loads) now includes a step that checks
`ue_importer_helpers.IMPORTER_INIT.exists()`.  If the importer was downloaded
in a previous session, `load_and_register()` is called automatically so the
UE4 importer is fully ready every startup without re-downloading or requiring
the user to click "Auto-Install" again.

For other tools (AssetStudio, AssetRipper, Unity FBX Importer, UModel Tools),
`deferred_startup()` calls `download_latest()` automatically when
`auto_install_tools` is enabled.  Their persistence record is the filesystem
itself — `download_latest()` returns early when the directory already exists,
so no network request is made on subsequent startups.

The earlier A/B/C fixes (namespaced `_module_key`, `sys.path` snapshot, bare
sub-module relocation) remain in `_load_module()` as a secondary defence against
any stale-entry or ghost-module edge cases.

`unregister()` still purges all namespaced `sys.modules` entries on unload.

### Tests

`TestUEImporterPolicyCompliance` in `test_addon_integrity.py` (Section S) —
tests A–F now guard:

- A: namespaced `_module_key` (not bare `fo4_blender_ue4_importer`)
- B: `__name__`-derived package prefix
- C: `_module_key` variable used in `sys.modules`
- D (path): `_path_before` snapshot + `sys.path[:] =` cleanup
- D (subs): `_new_keys` relocation + `del sys.modules[key]` + `sys.modules.pop`
- E: `register()` must NOT contain `_load_module()` call; `load_and_register()` must exist; `install_operators.py` must use it
- **F (new): `deferred_startup()` must call `load_and_register()` and check `IMPORTER_INIT.exists()`**

### Key files

- `ue_importer_helpers.py` — `register()` (no-op); `load_and_register()` (deferred entry-point with auto-download); `_load_module()` (namespaced key, sys.path cleanup, sub-module relocation, auto-download); `unregister()` (cleanup loop)
- `install_operators.py` — `FO4_OT_CheckUEImporter`, `FO4_OT_InstallUEImporter` (both delegate to `load_and_register()`)
- `startup_helpers.py` — `deferred_startup()` Step 5b (UE4 auto-load from disk) + Step 5c (other tools auto-download)
- `test_addon_integrity.py` — `TestUEImporterPolicyCompliance` (Section S, fixes A–F)
