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
