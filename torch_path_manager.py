"""
PyTorch Auto-Installation Helper
Automatically installs PyTorch when it is missing or when Windows MAX_PATH errors occur.
"""

import bpy
import sys
import subprocess
import os
import platform
from pathlib import Path

# Module-level guard: prevents concurrent auto-install attempts within one session.
_auto_install_running = False

# Incremented after every installation attempt (success OR failure) so that
# ui_panels._get_torch_status() can detect a state change and invalidate its
# cached "auto_install_started" result.  Without this, a failed background
# install leaves the panel stuck showing "⏳ installing…" forever.
_install_generation = 0

# Non-None after a failed background auto-install during the current Blender
# session.  Prevents an infinite retry loop: without this guard, clearing the
# cache after failure would immediately kick off another install attempt on the
# next panel draw.  Reset to None when the user clicks "Re-check Status".
_auto_install_last_error: str | None = None

# Max bytes of pip stderr/stdout shown in the console on install failure.
_MAX_PIP_ERROR_LEN = 300


class TorchPathManager:
    """Manages PyTorch installation in custom short paths"""

    # Default installation path – keep short on Windows to avoid MAX_PATH issues;
    # on Linux/macOS a user-level directory is fine.
    if platform.system() == "Windows":
        DEFAULT_TORCH_PATH = Path("D:/t")
    else:
        DEFAULT_TORCH_PATH = Path.home() / ".blender_torch"

    @staticmethod
    def get_custom_torch_paths():
        """Get list of potential custom torch installation paths"""
        paths: list[Path] = []
        if platform.system() == "Windows":
            paths = [
                Path("D:/t"),
                Path("C:/t"),
                Path("D:/torch"),
                Path("C:/torch"),
                Path("C:/blender_torch"),
            ]
        # Linux / macOS default
        paths.append(Path.home() / ".blender_torch")
        return paths

    @staticmethod
    def find_existing_torch_install():
        """Check if torch is already installed in a custom path"""
        for path in TorchPathManager.get_custom_torch_paths():
            if (path / "torch" / "__init__.py").exists():
                return path
        return None

    @staticmethod
    def add_torch_to_path(torch_base_path):
        """Add custom torch path to sys.path and the Windows DLL search path.

        On Windows, ``sys.path`` only controls where Python finds *.py / *.pyd
        files.  PyTorch's extension module (``torch._C.pyd``) loads additional
        native DLLs (``torch_cpu.dll``, ``fbgemm.dll``, etc.) from
        ``<install>/torch/lib/`` at import time.  The Windows DLL loader will
        not find those DLLs unless their directory is registered via
        ``os.add_dll_directory()``.  Without this step Blender raises
        ``OSError: [WinError 1114]`` even when sys.path is correct.
        """
        torch_base_path = Path(torch_base_path)
        torch_base_str = str(torch_base_path.resolve())
        added = False
        if torch_base_str not in sys.path:
            sys.path.insert(0, torch_base_str)
            print(f"Added {torch_base_str} to sys.path")
            added = True

        # Register the torch DLL directory with the Windows loader (Python 3.8+).
        if platform.system() == "Windows" and hasattr(os, "add_dll_directory"):
            dll_dir = torch_base_path / "torch" / "lib"
            if dll_dir.is_dir():
                try:
                    os.add_dll_directory(str(dll_dir.resolve()))
                    print(f"Registered Windows DLL directory: {dll_dir}")
                except OSError as _dll_e:
                    print(f"Warning: could not register DLL directory {dll_dir}: {_dll_e}")

        return added

    @staticmethod
    def install_torch_to_custom_path(target_path=None):
        """
        Install PyTorch to a custom short path

        Args:
            target_path: Path object or string for installation location
                        Defaults to D:/t

        Returns:
            (bool success, str message)
        """
        if target_path is None:
            target_path = TorchPathManager.DEFAULT_TORCH_PATH

        target_path = Path(target_path)

        try:
            # Create directory if it doesn't exist
            target_path.mkdir(parents=True, exist_ok=True)
            print(f"Installing PyTorch to: {target_path}")

            # Get Python executable (use Blender's Python)
            python_exe = sys.executable
            print(f"Using Python: {python_exe}")

            # Install PyTorch using pip with --target
            cmd = [
                python_exe,
                "-m", "pip",
                "install",
                "--target", str(target_path),
                "--upgrade",
                "torch",
                "torchvision",
                "--index-url", "https://download.pytorch.org/whl/cpu"  # CPU version for smaller download
            ]

            print(f"Running: {' '.join(cmd)}")
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )

            if result.returncode == 0:
                # Add to sys.path immediately for this session
                TorchPathManager.add_torch_to_path(target_path)

                # Persist the installation path so it is restored on every
                # future Blender startup (no manual reconnect needed).
                try:
                    from . import preferences as _prefs
                    _prefs.set_torch_custom_path(str(target_path))
                    print(f"✓ PyTorch path saved to preferences: {target_path}")
                except Exception as _e:
                    print(f"Warning: PyTorch installed successfully but could not persist path to preferences: {_e}")

                # Bump install generation so ui_panels invalidates its status cache.
                global _install_generation
                _install_generation += 1

                # Verify the installation is importable in this session.
                try:
                    import torch
                    torch_version = torch.__version__
                    return True, f"PyTorch {torch_version} installed successfully to {target_path}"
                except (ImportError, OSError) as e:
                    # DLL dirs were registered by add_torch_to_path() above.
                    # If the error persists (e.g. corrupted install), a Blender
                    # restart is required to fully reload native extensions.
                    return True, (
                        f"PyTorch installed to {target_path} — please reload Blender to activate"
                        f" ({type(e).__name__}: {str(e)[:80]})"
                    )
            else:
                error_msg = result.stderr if result.stderr else result.stdout
                return False, f"Installation failed: {error_msg}"

        except subprocess.TimeoutExpired:
            return False, "Installation timed out (10 minutes). Check your internet connection."
        except Exception as e:
            return False, f"Installation error: {str(e)}"

    @staticmethod
    def _try_auto_install(reason: str) -> "tuple[bool, str, object]":
        """Internal helper: queue a background auto-install when enabled.

        Runs the pip subprocess in a daemon ``threading.Thread`` so the call
        always returns immediately and **never blocks Blender's UI**.  The bpy
        preference write (torch_custom_path / torch_install_attempted) is
        scheduled back on the main thread via ``bpy.app.timers.register()``
        once the subprocess finishes.

        Uses ``_auto_install_running`` to prevent concurrent install attempts.
        Only one install thread runs at a time; subsequent calls while the
        thread is live return ``(False, "auto_install_in_progress", None)``
        immediately.

        Returns:
            ``(False, "auto_install_started", None)``  — thread queued.
            ``(False, "auto_install_in_progress", None)`` — already running.
            ``(False, "auto_install_failed", None)`` — previous attempt failed this session.
            ``(False, original_reason, None)`` — disabled / not needed.
        """
        global _auto_install_running, _auto_install_last_error
        if _auto_install_running:
            return False, "auto_install_in_progress", None

        # A previous auto-install attempt failed during this Blender session.
        # Return "auto_install_failed" so callers can show a specific error in
        # the UI rather than starting another background thread and looping
        # endlessly.  The user can clear this by clicking "Re-check Status",
        # which calls ui_panels.reset_torch_cache() → resets _auto_install_last_error.
        if _auto_install_last_error is not None:
            return False, "auto_install_failed", None

        try:
            from . import preferences
            prefs = preferences.get_preferences()
            if not (prefs and prefs.auto_install_pytorch and not prefs.torch_install_attempted):
                return False, reason, None

            _auto_install_running = True
            _auto_install_last_error = None  # clear any stale failure from a previous attempt
            target_path = TorchPathManager.DEFAULT_TORCH_PATH
            print(f"PyTorch: queuing background auto-install to {target_path} ({reason})…")

            import threading

            def _install_worker():
                global _auto_install_running, _install_generation, _auto_install_last_error
                try:
                    target_path.mkdir(parents=True, exist_ok=True)
                    cmd = [
                        sys.executable, "-m", "pip", "install",
                        "--target", str(target_path),
                        "--upgrade",
                        "torch", "torchvision",
                        "--index-url", "https://download.pytorch.org/whl/cpu",
                    ]
                    print(f"PyTorch auto-install: running pip… ({' '.join(cmd[:5])} …)")
                    result = subprocess.run(
                        cmd, capture_output=True, text=True, timeout=600, check=False
                    )
                    if result.returncode == 0:
                        # sys.path / DLL dirs — safe from a non-main thread
                        TorchPathManager.add_torch_to_path(target_path)
                        _install_generation += 1
                        print(f"✓ PyTorch background install complete to {target_path}")

                        # bpy preference write must happen on the main thread
                        def _save_prefs_on_main():
                            try:
                                from . import preferences as _p
                                _p.set_torch_custom_path(str(target_path))
                                print(f"✓ PyTorch path saved to preferences: {target_path}")
                            except Exception as _e:
                                print(f"Warning: could not save PyTorch path: {_e}")
                            return None  # do not reschedule
                        try:
                            import bpy as _bpy
                            _bpy.app.timers.register(_save_prefs_on_main, first_interval=0.0)
                        except Exception:
                            pass
                    else:
                        err = (result.stderr or result.stdout or "")[:_MAX_PIP_ERROR_LEN]
                        print(f"PyTorch auto-install failed (pip exit {result.returncode}): {err}")
                        # Record the failure so _try_auto_install() won't retry
                        # immediately, and increment _install_generation so the
                        # ui_panels cache is cleared (stops "⏳ installing…" from
                        # showing forever after a failed install).
                        _auto_install_last_error = (
                            f"pip exited with code {result.returncode}: {err}"
                        )
                        _install_generation += 1
                except subprocess.TimeoutExpired:
                    print("PyTorch auto-install timed out (10 minutes).")
                    _auto_install_last_error = "auto-install timed out (10 minutes)"
                    _install_generation += 1
                except Exception as ex:
                    print(f"PyTorch auto-install error: {ex}")
                    _auto_install_last_error = str(ex)
                    _install_generation += 1
                finally:
                    _auto_install_running = False

            t = threading.Thread(
                target=_install_worker,
                name="blender_torch_install",
                daemon=True,
            )
            t.start()
            return False, "auto_install_started", None

        except Exception as ex:
            _auto_install_running = False
            print(f"Auto-install check failed: {ex}")
        return False, reason, None

    @staticmethod
    def try_import_torch():
        """
        Attempt to import torch, trying custom paths first.
        Auto-installs when PyTorch is missing or when a Windows path-length
        error is detected and the user has enabled auto-install in preferences.

        Returns:
            (bool success, str message, object torch_module or None)
        """
        # 1. Check the path saved in preferences (survives Blender restarts)
        try:
            from . import preferences as _prefs
            saved_path = _prefs.get_torch_custom_path()
            if saved_path:
                from pathlib import Path as _Path
                _sp = _Path(saved_path)
                if _sp.is_dir():
                    TorchPathManager.add_torch_to_path(_sp)
        except Exception:
            pass

        # 2. Fall back to scanning well-known short paths
        existing_path = TorchPathManager.find_existing_torch_install()
        if existing_path:
            TorchPathManager.add_torch_to_path(existing_path)

        try:
            import torch
            return True, f"PyTorch {torch.__version__} loaded successfully", torch
        except OSError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                result = TorchPathManager._try_auto_install(
                    "Windows path length error – installing to short path"
                )
                if result[0]:
                    return result
                if result[1] == "auto_install_failed":
                    return False, result[1], None
                return False, "windows_path_error", None
            # Use both attribute check (set on Windows) and string fallback (cross-platform
            # compatibility and cases where winerror attribute may not be populated).
            if getattr(e, 'winerror', None) == 1114 or "WinError 1114" in str(e):
                print(
                    "\n[Blender Game Tools] PyTorch DLL initialisation failed (WinError 1114).\n"
                    "This usually means a CUDA/driver version mismatch.\n"
                    f"Detail: {e}\n"
                    "Suggested fixes:\n"
                    "  1. Reinstall PyTorch matching your CUDA toolkit version:\n"
                    "     https://pytorch.org/get-started/locally/\n"
                    "  2. Install the latest Visual C++ Redistributable from Microsoft:\n"
                    "     https://aka.ms/vs/17/release/vc_redist.x64.exe\n"
                    "  3. Update your GPU driver to one compatible with your CUDA version.\n"
                    "  4. If no GPU is present, install the CPU-only PyTorch build.\n"
                )
                return False, "dll_init_error", None
            return False, f"File error: {str(e)}", None
        except ImportError as e:
            # PyTorch is simply not installed – queue a background auto-install
            result = TorchPathManager._try_auto_install(
                f"PyTorch not found ({e})"
            )
            if result[0]:
                return result
            if result[1] in ("auto_install_started", "auto_install_in_progress",
                             "auto_install_failed"):
                return False, result[1], None
            return False, f"PyTorch not installed: {str(e)}", None
        except Exception as e:
            return False, f"Unknown error: {str(e)}", None


class TORCH_OT_recheck_status(bpy.types.Operator):
    """Re-check whether PyTorch is importable (clears the cached status)"""
    bl_idname = "torch.recheck_status"
    bl_label = "Re-check PyTorch Status"
    bl_description = "Discard the cached PyTorch availability result and re-check now"

    def execute(self, context):
        try:
            from . import ui_panels as _ui
            _ui.reset_torch_cache()
        except Exception as e:
            self.report({'WARNING'}, f"Could not reset torch cache: {e}")
            return {'CANCELLED'}

        # Also reset the torch_install_attempted flag when torch is still not
        # importable after the re-check.  Without this, a user whose D:/t
        # directory exists but is empty (partial/failed install) would be stuck:
        # re-checking clears the error message but auto-install stays blocked
        # because torch_install_attempted remains True.
        try:
            import torch  # noqa: F401 – check only, result discarded
        except (ImportError, OSError):
            try:
                from . import preferences as _prefs
                _prefs_obj = _prefs.get_preferences()
                if _prefs_obj is not None and _prefs_obj.torch_install_attempted:
                    _prefs_obj.torch_install_attempted = False
                    print(
                        "torch.recheck_status: torch still unavailable — "
                        "reset torch_install_attempted so auto-install can retry"
                    )
            except Exception as _pe:
                print(f"torch.recheck_status: could not reset install flag: {_pe}")

        self.report({'INFO'}, "PyTorch status re-checked — see Settings panel for result.")
        return {'FINISHED'}


class TORCH_OT_install_custom_path(bpy.types.Operator):
    """Install PyTorch to a custom path"""
    bl_idname = "torch.install_custom_path"
    bl_label = "Install PyTorch"
    bl_description = "Automatically install PyTorch (CPU build). On Windows installs to D:/t to avoid MAX_PATH issues; on Linux/macOS to ~/.blender_torch"

    target_path: bpy.props.StringProperty(
        name="Installation Path",
        default=str(TorchPathManager.DEFAULT_TORCH_PATH),
        description="Path where PyTorch will be installed"
    )

    def execute(self, context):
        self.report({'INFO'}, f"Installing PyTorch to {self.target_path}...")

        success, message = TorchPathManager.install_torch_to_custom_path(self.target_path)

        if success:
            self.report({'INFO'}, message)
            # Reset the ui_panels torch status cache so the panel reflects the
            # new installation immediately without requiring a Blender restart.
            try:
                from . import ui_panels as _ui
                _ui.reset_torch_cache()
            except (ImportError, AttributeError) as _e:
                print(f"torch_path_manager: could not reset ui_panels torch cache: {_e}")
        else:
            self.report({'ERROR'}, message)

        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)

    def draw(self, context):
        layout = self.layout
        layout.label(text="PyTorch (CPU build) will be installed to:", icon='INFO')
        layout.prop(self, "target_path")
        layout.label(text="Installation may take several minutes.", icon='TIME')


def register():
    bpy.utils.register_class(TORCH_OT_recheck_status)
    bpy.utils.register_class(TORCH_OT_install_custom_path)


def unregister():
    bpy.utils.unregister_class(TORCH_OT_install_custom_path)
    bpy.utils.unregister_class(TORCH_OT_recheck_status)


if __name__ == "__main__":
    register()
