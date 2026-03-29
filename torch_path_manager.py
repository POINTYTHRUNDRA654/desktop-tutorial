"""
PyTorch External-Install Bridge
================================
PyTorch is no longer auto-installed inside Blender.  All AI features that
previously required an embedded torch install are now routed through the
Mossy Link connection (mossy_link.py → ask_mossy()).

To use a local torch build alongside Blender:
  1. Install PyTorch in a regular Python environment:
       https://pytorch.org/get-started/locally/
  2. Open the Settings panel (N-panel → Fallout 4 → Settings) and set
     "PyTorch Custom Path" to the directory that contains the ``torch/``
     package folder (e.g. D:/t or ~/.local/lib/python3.12/site-packages).
  3. Restart Blender — the custom path is added to sys.path on startup.

The two operator classes below are kept so that existing UI layout code and
test_addon_integrity.py continue to find ``torch.recheck_status`` and
``torch.install_custom_path`` registered with Blender.
"""

import bpy
import re as _re
import subprocess as _subprocess


# ── CUDA version detection ─────────────────────────────────────────────────
# Module-level cache so nvidia-smi is only queried once per Blender session.
_cuda_version_detected: "str | None" = None
_cuda_detection_done: bool = False


def detect_cuda_version() -> "str | None":
    """Return the CUDA version supported by the installed GPU driver, or None.

    Runs ``nvidia-smi`` once and caches the result for the lifetime of the
    Blender session.  Returns a string such as ``"12.4"`` or ``"11.8"``.

    Returns ``None`` when nvidia-smi is not available, times out, or the
    output cannot be parsed (e.g. no NVIDIA GPU present).
    """
    global _cuda_version_detected, _cuda_detection_done
    if _cuda_detection_done:
        return _cuda_version_detected
    _cuda_detection_done = True
    try:
        result = _subprocess.run(
            ["nvidia-smi"],
            capture_output=True, text=True, timeout=5,
        )
        match = _re.search(r"CUDA Version:\s*(\d+\.\d+)", result.stdout)
        if match:
            _cuda_version_detected = match.group(1)
    except (FileNotFoundError, _subprocess.TimeoutExpired, OSError):
        pass
    return _cuda_version_detected


# Maps the nearest supported CUDA toolkit version to a PyTorch wheel index tag.
# Sorted highest-first so _pytorch_wheel_tag() picks the best match.
_CUDA_WHEEL_TAGS: "list[tuple[tuple[int,int], str]]" = [
    ((12, 6), "cu126"),
    ((12, 4), "cu124"),
    ((12, 1), "cu121"),
    ((11, 8), "cu118"),
    ((11, 7), "cu117"),
    ((11, 6), "cu116"),
]


def _pytorch_wheel_tag(cuda_ver: str) -> str:
    """Return the best PyTorch wheel index tag for *cuda_ver* (e.g. ``"cu124"``).

    Picks the highest wheel tag whose CUDA version does not exceed the
    driver's reported CUDA support level.  Returns ``""`` if no match.
    """
    try:
        parts = cuda_ver.split(".")
        driver_key = (int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        return ""
    for key, tag in _CUDA_WHEEL_TAGS:
        if key <= driver_key:
            return tag
    return ""


def dll_init_error_message(torch_path: str = "") -> str:
    """Return a user-friendly message when WinError 1114 (DLL init failure) occurs.

    Attempts to auto-detect the GPU driver's CUDA version via ``nvidia-smi``
    and, when successful, adds the exact ``pip install`` command the user
    should run to resolve the CUDA/driver mismatch.

    This is the single canonical implementation; all helper modules
    (hunyuan3d_helpers, hymotion_helpers, zoedepth_helpers, shap_e_helpers,
    point_e_helpers, rignet_helpers) delegate to this function.

    Args:
        torch_path: The user-configured PyTorch directory
                    (e.g. ``"D:\\blender_torch"``).  When provided the
                    failing DLL path is shown more precisely.
    """
    if torch_path:
        dll_line = (
            f"A file such as {torch_path}\\torch\\lib\\c10.dll could not be loaded."
        )
    else:
        dll_line = "A torch DLL (e.g. torch\\lib\\c10.dll) could not be loaded."

    cuda_ver = detect_cuda_version()
    if cuda_ver:
        tag = _pytorch_wheel_tag(cuda_ver)
        if tag:
            whl_url = f"https://download.pytorch.org/whl/{tag}"
            fix1 = (
                f"1. Reinstall PyTorch matching your CUDA toolkit version.\n"
                f"   Detected GPU driver CUDA support: {cuda_ver}\n"
                f"   Run: pip install torch torchvision torchaudio"
                f" --index-url {whl_url}"
            )
        else:
            fix1 = (
                f"1. Reinstall PyTorch matching your CUDA toolkit version.\n"
                f"   Detected GPU driver CUDA support: {cuda_ver}\n"
                f"   Visit: https://pytorch.org/get-started/locally/"
            )
    else:
        fix1 = (
            "1. Reinstall PyTorch matching your CUDA toolkit version:\n"
            "   https://pytorch.org/get-started/locally/"
        )

    return (
        "PyTorch DLL initialisation failed (WinError 1114).\n"
        "This usually means a CUDA/driver version mismatch.\n"
        f"{dll_line}\n\n"
        "Suggested fixes:\n"
        f"{fix1}\n"
        "2. Install the latest Visual C++ Redistributable from Microsoft:\n"
        "   https://aka.ms/vs/17/release/vc_redist.x64.exe\n"
        "3. Update your GPU driver to one compatible with your CUDA version.\n"
        "4. If no GPU is present, install the CPU-only PyTorch build:\n"
        "   pip install torch torchvision torchaudio"
        " --index-url https://download.pytorch.org/whl/cpu"
    )

# Width (px) of the setup-instructions pop-up dialog.
_DIALOG_WIDTH = 480


class TORCH_OT_recheck_status(bpy.types.Operator):
    """Re-check whether PyTorch is importable from the configured custom path"""

    bl_idname = "torch.recheck_status"
    bl_label = "Re-check PyTorch Status"
    bl_description = (
        "Refresh the PyTorch availability indicator in the Settings panel. "
        "Configure 'PyTorch Custom Path' in the Settings panel to point at "
        "your external PyTorch installation directory."
    )

    def execute(self, context):
        # Invalidate the ui_panels cache so the next draw re-probes sys.path.
        try:
            from . import ui_panels as _ui
            _ui.reset_torch_cache()
        except Exception as e:
            self.report({'WARNING'}, f"Could not reset torch cache: {e}")
        self.report({'INFO'}, "PyTorch status refreshed — see Settings panel.")
        return {'FINISHED'}


class TORCH_OT_install_custom_path(bpy.types.Operator):
    """Show instructions for setting up PyTorch externally"""

    bl_idname = "torch.install_custom_path"
    bl_label = "PyTorch Setup Instructions"
    bl_description = (
        "PyTorch is no longer installed inside Blender. "
        "This dialog explains how to set it up in an external Python environment "
        "and point Blender at it via the Settings panel."
    )

    def execute(self, context):
        self.report(
            {'INFO'},
            "Install PyTorch externally (https://pytorch.org/get-started/locally/), "
            "then set the directory in Settings > PyTorch Custom Path.",
        )
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=_DIALOG_WIDTH)

    def draw(self, context):
        layout = self.layout
        layout.label(
            text="PyTorch is managed externally — not installed inside Blender.",
            icon='INFO',
        )
        layout.separator()
        layout.label(text="Step 1 — Install PyTorch in a normal Python environment:")
        layout.label(text="  https://pytorch.org/get-started/locally/", icon='URL')
        layout.separator()
        layout.label(text="Step 2 — Open Settings panel, set 'PyTorch Custom Path' to")
        layout.label(text="  the directory that contains the torch/ package folder.")
        layout.separator()
        layout.label(
            text="Alternatively, use Mossy AI (mossy_link) for all AI features.",
            icon='PLUGIN',
        )


def register():
    bpy.utils.register_class(TORCH_OT_recheck_status)
    bpy.utils.register_class(TORCH_OT_install_custom_path)


def unregister():
    bpy.utils.unregister_class(TORCH_OT_install_custom_path)
    bpy.utils.unregister_class(TORCH_OT_recheck_status)


if __name__ == "__main__":
    register()
