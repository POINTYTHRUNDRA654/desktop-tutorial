"""
PyTorch Auto-Installation Helper for Windows Path Length Issues
Automatically installs PyTorch to a short path when Windows MAX_PATH errors occur
"""

import bpy
import sys
import subprocess
import os
from pathlib import Path

class TorchPathManager:
    """Manages PyTorch installation in custom short paths"""

    # Default path on D: drive, aligned with user-provided location.
    DEFAULT_TORCH_PATH = Path("D:/blender_torch")

    @staticmethod
    def get_custom_torch_paths():
        """Get list of potential custom torch installation paths"""
        pref_path = None
        try:
            from . import preferences  # type: ignore
            pref_path = getattr(preferences.get_preferences(), "torch_root", "") or None
        except Exception:
            pref_path = None

        return [
            Path(pref_path) if pref_path else None,
            Path("D:/blender_torch"),
            Path("D:/blender_tools/blender_torch"),
            Path("D:/blender_tools/torch"),
            Path("D:/torch"),
            Path("D:/t"),
            Path("C:/blender_torch"),
            Path("C:/blender_tools/blender_torch"),
            Path("C:/torch"),
            Path("C:/t"),
        ]

    @staticmethod
    def find_existing_torch_install():
        """Check if torch is already installed in a custom path"""
        for path in TorchPathManager.get_custom_torch_paths():
            if path is None:
                continue
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
                "--no-warn-script-location",
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
                # Add to sys.path
                TorchPathManager.add_torch_to_path(target_path)

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
    def try_import_torch():
        """
        Attempt to import torch, trying custom paths first
        Optionally auto-installs if Windows path error is detected and user has enabled it

        Returns:
            (bool success, str message, object torch_module or None)
        """
        # First, check if there's an existing custom installation
        existing_path = TorchPathManager.find_existing_torch_install()
        if existing_path:
            TorchPathManager.add_torch_to_path(existing_path)

        try:
            import torch
            return True, f"PyTorch {torch.__version__} loaded successfully", torch
        except FileNotFoundError as e:
            if "WinError 206" in str(e) or "filename or extension is too long" in str(e):
                # Check if auto-install is enabled and not yet attempted
                try:
                    from . import preferences
                    prefs = preferences.get_preferences()
                    if prefs and prefs.auto_install_pytorch and not prefs.torch_install_attempted:
                        print("Auto-installing PyTorch to D:/t due to Windows path error...")
                        # Mark as attempted before installing
                        prefs.torch_install_attempted = True

                        success, msg = TorchPathManager.install_torch_to_custom_path()
                        if success:
                            # Try importing again
                            try:
                                import torch
                                return True, f"PyTorch auto-installed successfully: {torch.__version__}", torch
                            except:
                                pass
                        else:
                            print(f"Auto-install failed: {msg}")
                except Exception as ex:
                    print(f"Auto-install check failed: {ex}")

                return False, "windows_path_error", None
            return False, f"File error: {str(e)}", None
        except OSError as e:
            if getattr(e, 'winerror', None) == 1114 or "WinError 1114" in str(e):
                return False, "dll_init_error", None
            return False, f"OS error loading PyTorch: {str(e)}", None
        except ImportError as e:
            return False, f"PyTorch not installed: {str(e)}", None
        except Exception as e:
            return False, f"Unknown error: {str(e)}", None


class TORCH_OT_install_custom_path(bpy.types.Operator):
    """Install PyTorch to custom short path (D:/t)"""
    bl_idname = "torch.install_custom_path"
    bl_label = "Install PyTorch to Short Path"
    bl_description = "Automatically install PyTorch to D:/t to avoid Windows path length issues"

    target_path: bpy.props.StringProperty(
        name="Installation Path",
        default="D:/blender_torch",
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
        layout.label(text="This will install PyTorch to a short path", icon='INFO')
        layout.label(text="to avoid Windows MAX_PATH limitations.")
        layout.separator()
        layout.prop(self, "target_path")
        layout.label(text="Installation may take several minutes.", icon='TIME')


def register():
    bpy.utils.register_class(TORCH_OT_install_custom_path)


def unregister():
    bpy.utils.unregister_class(TORCH_OT_install_custom_path)


if __name__ == "__main__":
    register()
