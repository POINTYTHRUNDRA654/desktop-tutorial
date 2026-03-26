"""
Critical setup / environment operators for the Fallout 4 Mod Assistant.

These three operators are registered as a standalone module *before* the main
operators.py bundle so they are always available in the UI (Setup & Status
panel) even if the larger operators.py fails to import on a particular Blender
build.

The operators defined here are referenced in FO4_PT_SetupPanel
(ui_panels.py) with ``hasattr`` guards:
  - FO4_OT_InstallPythonDeps  →  "Install Core Dependencies" button
  - FO4_OT_SelfTest           →  "Environment Check" button
  - FO4_OT_ReloadAddon        →  "Restart Blender" button

Keeping them in a separate, minimal module mirrors the pattern used for
tutorial_operators.py and prevents the fallback "(loading...)" labels that
appear when operators.py fails to load on a particular Blender build.

See DEVELOPMENT_NOTES.md — *RECURRING BUG #1* — for full context.
Do NOT delete this file or remove these operators from the classes tuple.
"""

import bpy
from bpy.types import Operator
from bpy.props import BoolProperty


# ---------------------------------------------------------------------------
# FO4_OT_InstallPythonDeps
# ---------------------------------------------------------------------------

class FO4_OT_InstallPythonDeps(Operator):
    """Install required Python dependencies for the add-on."""
    bl_idname = "fo4.install_python_deps"
    bl_label = "Install Python Requirements"

    optional: BoolProperty(
        name="Include Optional",
        default=False,
    )

    def execute(self, context):
        import threading
        import importlib
        import sys as _sys

        optional = self.optional

        def _run():
            try:
                tool_installers = importlib.import_module(
                    ".tool_installers", package=__package__
                )
                ok, msg = tool_installers.install_python_requirements(optional)
            except Exception as exc:
                ok, msg = False, f"install_python_requirements failed: {exc}"

            level = 'INFO' if ok else 'ERROR'
            print("PYTHON DEPS", msg)
            _sys.stdout.flush()

            def _notify():
                try:
                    ns = importlib.import_module(
                        ".notification_system", package=__package__
                    )
                    ns.FO4_NotificationSystem.notify(msg, level)
                except Exception:
                    pass
            try:
                if bpy.app.timers:
                    bpy.app.timers.register(_notify, first_interval=0.1)
            except Exception as e:
                print(f"Failed to register notification timer: {e}")

        # Start the installation in a background thread
        try:
            thread = threading.Thread(target=_run, daemon=True)
            thread.start()
        except Exception as e:
            print(f"Failed to start installation thread: {e}")
            return {'CANCELLED'}

        self.report(
            {'INFO'},
            "Python dependency installation started in the background."
            " Check the console for progress.",
        )
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# FO4_OT_SelfTest
# ---------------------------------------------------------------------------

class FO4_OT_SelfTest(Operator):
    """Run a comprehensive environment self-test and log results."""
    bl_idname = "fo4.self_test"
    bl_label = "Environment Self-Test"

    def execute(self, context):
        import importlib
        import importlib.util
        import sys as _sys

        lines = []

        # ── Blender / Python versions ─────────────────────────────────────
        blender_ver = ".".join(str(v) for v in bpy.app.version)
        py_ver = (
            f"{_sys.version_info.major}.{_sys.version_info.minor}"
            f".{_sys.version_info.micro}"
        )
        lines.append(f"Blender: {blender_ver}  |  Python: {py_ver}")

        # ── Core Python packages ──────────────────────────────────────────
        core_pkgs = {
            "PIL":      "Pillow (image processing)",
            "numpy":    "NumPy (math / 3D data)",
            "requests": "Requests (HTTP / downloads)",
            "trimesh":  "trimesh (3D mesh processing)",
            "PyPDF2":   "PyPDF2 (PDF parsing)",
        }
        missing = []
        for mod, label in core_pkgs.items():
            found = importlib.util.find_spec(mod) is not None
            status = "OK" if found else "MISSING"
            lines.append(f"  [{status}] {label}")
            if not found:
                missing.append(mod)

        if missing:
            lines.append(f"  → Missing packages: {', '.join(missing)}")
            lines.append(
                "  → Click 'Install Core Dependencies' in the Setup & Status panel."
            )

        # ── pip availability ──────────────────────────────────────────────
        pip_ok = importlib.util.find_spec("pip") is not None
        lines.append(f"  [{'OK' if pip_ok else 'MISSING'}] pip (package installer)")
        if not pip_ok:
            lines.append(
                "  → pip not found; will be bootstrapped via ensurepip on install."
            )

        # ── Version-specific notes ────────────────────────────────────────
        py = (_sys.version_info.major, _sys.version_info.minor)
        if py < (3, 8):
            lines.append("  NOTE: Python 3.7 detected (Blender 2.90-2.92).")
            lines.append(
                "        Pillow<10 and numpy<2 will be installed automatically."
            )
        if py >= (3, 11):
            lines.append("  NOTE: Python 3.11+ detected.")
            lines.append(
                "        --break-system-packages is used automatically when installing."
            )

        # ── External tool status (best-effort, won't crash if modules missing) ─
        for mod_name in (
            "knowledge_helpers",
            "ue_importer_helpers",
            "umodel_tools_helpers",
            "unity_fbx_importer_helpers",
            "asset_studio_helpers",
            "asset_ripper_helpers",
        ):
            try:
                m = importlib.import_module(f".{mod_name}", package=__package__)
                lines.append(f"{mod_name}: {m.status()}")
            except Exception as exc:
                lines.append(f"{mod_name}: unavailable ({exc})")

        summary = "\n".join(lines)
        print("=== ENVIRONMENT SELF-TEST ===")
        print(summary)
        print("=== END SELF-TEST ===")
        self.report({'INFO'}, "Self-test completed; see System Console for details")

        try:
            ns = importlib.import_module(".notification_system", package=__package__)
            ns.FO4_NotificationSystem.notify(
                "Environment self-test complete — see System Console", 'INFO'
            )
        except Exception:
            pass

        return {'FINISHED'}


# ---------------------------------------------------------------------------
# FO4_OT_ReloadAddon
# ---------------------------------------------------------------------------

class FO4_OT_ReloadAddon(Operator):
    """Restart Blender so installed add-on updates take effect.

    Calling bpy.ops.wm.quit_blender() directly from inside an invoke_confirm
    popup handler crashes Blender 5.0.1 (EXCEPTION_ACCESS_VIOLATION in
    BLI_addhead / WM_event_add_ui_handler / wm_exit_schedule_delayed) because
    the window-manager handler list is invalid while the popup is still active.

    The fix is to schedule the quit via bpy.app.timers so it runs after the
    popup has been fully torn down, when the window context is valid again.
    """
    bl_idname = "fo4.reload_addon"
    bl_label = "Restart Blender"
    bl_description = (
        "Quit Blender so any installed add-on updates take effect on next launch. "
        "A confirmation dialog will appear first."
    )
    bl_options = {'REGISTER'}

    def execute(self, context):
        import subprocess
        from pathlib import Path

        def _restart_and_quit():
            try:
                exe = Path(bpy.app.binary_path)
                cmd = [str(exe)]
                blend_path = bpy.data.filepath
                if blend_path:
                    cmd.append(blend_path)
                subprocess.Popen(cmd)
            except Exception as e:  # pragma: no cover - best-effort relaunch
                print(f"Restart launch failed: {e}")
            finally:
                bpy.ops.wm.quit_blender()

        self.report({'INFO'}, "Restarting Blender…")
        bpy.app.timers.register(lambda: _restart_and_quit(), first_interval=0.01)
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

classes = (
    FO4_OT_InstallPythonDeps,
    FO4_OT_SelfTest,
    FO4_OT_ReloadAddon,
)


def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
            print(f"setup_operators: Registered {cls.bl_idname}")
        except Exception:
            # A stale class object (from a previous load or dual-install) may
            # already occupy this type name.  Unregister the old object first
            # then register the fresh one so the UI always runs current code.
            # This mirrors the pattern used in tutorial_operators.py and
            # operators.py register() — see DEVELOPMENT_NOTES.md.
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
                print(
                    f"setup_operators: Registered {cls.bl_idname} "
                    "(replaced stale class)"
                )
            except Exception as e2:
                print(
                    f"setup_operators: ⚠ Failed to register "
                    f"{cls.__name__}: {e2}"
                )


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception as e:
            print(
                f"setup_operators: Unregister by object failed for "
                f"{cls.__name__}: {e}; trying by type name"
            )
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
            except Exception as e2:
                print(
                    f"setup_operators: Could not unregister "
                    f"{cls.__name__}: {e2}"
                )
