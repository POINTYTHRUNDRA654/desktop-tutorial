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
        """Add custom torch path to sys.path if not already added"""
        torch_base_str = str(torch_base_path.resolve())
        if torch_base_str not in sys.path:
            sys.path.insert(0, torch_base_str)
            print(f"Added {torch_base_str} to sys.path")
            return True
        return False

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

                # Verify installation
                try:
                    import torch
                    torch_version = torch.__version__
                    return True, f"PyTorch {torch_version} installed successfully to {target_path}"
                except ImportError as e:
                    return False, f"Installation completed but import failed: {str(e)}"
            else:
                error_msg = result.stderr if result.stderr else result.stdout
                return False, f"Installation failed: {error_msg}"

        except subprocess.TimeoutExpired:
            return False, "Installation timed out (10 minutes). Check your internet connection."
        except Exception as e:
            return False, f"Installation error: {str(e)}"

    @staticmethod
    def _try_auto_install(reason: str) -> "tuple[bool, str, object]":
        """Internal helper: run auto-install when enabled and not yet attempted.

        Uses a module-level flag to prevent re-entrant calls within one
        Blender session, and only persists ``torch_install_attempted`` after a
        *successful* install so that failed attempts are retried on the next
        Blender startup.

        Returns the same 3-tuple as try_import_torch() on success, or
        (False, original_reason, None) when auto-install is disabled / already
        running / fails.
        """
        global _auto_install_running
        if _auto_install_running:
            return False, reason, None

        try:
            from . import preferences
            prefs = preferences.get_preferences()
            if prefs and prefs.auto_install_pytorch and not prefs.torch_install_attempted:
                _auto_install_running = True
                print(f"Auto-installing PyTorch ({reason})...")
                try:
                    success, msg = TorchPathManager.install_torch_to_custom_path()
                    if success:
                        try:
                            import torch
                            return True, f"PyTorch auto-installed successfully: {torch.__version__}", torch
                        except ImportError as import_err:
                            print(f"Auto-install succeeded but import still failed: {import_err}")
                            return False, f"Auto-install succeeded but import failed: {import_err}", None
                    else:
                        print(f"Auto-install failed: {msg}")
                finally:
                    _auto_install_running = False
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
                return False, "windows_path_error", None
            # Use both attribute check (set on Windows) and string fallback (cross-platform
            # compatibility and cases where winerror attribute may not be populated).
            if getattr(e, 'winerror', None) == 1114 or "WinError 1114" in str(e):
                return False, "dll_init_error", None
            return False, f"File error: {str(e)}", None
        except ImportError as e:
            # PyTorch is simply not installed – attempt auto-install
            result = TorchPathManager._try_auto_install(
                f"PyTorch not found ({e})"
            )
            if result[0]:
                return result
            return False, f"PyTorch not installed: {str(e)}", None
        except Exception as e:
            return False, f"Unknown error: {str(e)}", None


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
    bpy.utils.register_class(TORCH_OT_install_custom_path)


def unregister():
    bpy.utils.unregister_class(TORCH_OT_install_custom_path)


if __name__ == "__main__":
    register()
