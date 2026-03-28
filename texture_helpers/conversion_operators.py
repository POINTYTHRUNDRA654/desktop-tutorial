"""
Texture conversion operators for Fallout 4 mod creation.
Moved here from operators.py as part of the texture_helpers sub-package.
"""

import importlib
import sys

import bpy
from bpy.types import Operator
from bpy.props import StringProperty, EnumProperty


def _safe_import(name):
    try:
        return importlib.import_module(f".{name}", package=__package__[: __package__.rfind(".")])
    except Exception as exc:
        print(f"texture_helpers.conversion_operators: Skipped {name}: {exc}")
        return None


nvtt_helpers = _safe_import("nvtt_helpers")
notification_system = _safe_import("notification_system")


class FO4_OT_ConvertTextureToDDS(Operator):
    """Convert a texture to DDS format using NVIDIA Texture Tools"""
    bl_idname = "fo4.convert_texture_to_dds"
    bl_label = "Convert Texture to DDS"
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(
        name="Texture File",
        description="Path to the texture file to convert",
        subtype='FILE_PATH'
    )

    output_path: StringProperty(
        name="Output Path",
        description="Path for the output DDS file (optional)",
        subtype='FILE_PATH',
        default=""
    )

    compression: EnumProperty(
        name="Compression",
        description="DDS compression format",
        items=[
            ('bc1', "BC1 (DXT1)", "For diffuse textures without alpha"),
            ('bc3', "BC3 (DXT5)", "For textures with alpha channel"),
            ('bc5', "BC5 (ATI2)", "For normal maps"),
        ],
        default='bc1'
    )

    quality: EnumProperty(
        name="Quality",
        description="Compression quality",
        items=[
            ('fastest', "Fastest", "Fastest compression"),
            ('normal', "Normal", "Normal quality"),
            ('production', "Production", "Production quality"),
            ('highest', "Highest", "Highest quality (slowest)"),
        ],
        default='production'
    )

    converter: EnumProperty(
        name="Converter",
        description="Select converter binary",
        items=[
            ('auto', "Auto (prefer NVTT)", "Use nvcompress if available, else texconv"),
            ('nvtt', "NVTT (nvcompress)", "Use NVIDIA Texture Tools"),
            ('texconv', "texconv (DirectXTex)", "Use Microsoft texconv"),
        ],
        default='auto'
    )

    def execute(self, context):
        if not self.filepath:
            self.report({'ERROR'}, "No texture file selected")
            return {'CANCELLED'}

        output = self.output_path or None
        success, message = nvtt_helpers.NVTTHelpers.convert_to_dds(
            self.filepath,
            output,
            self.compression,
            self.quality,
            preferred_tool=self.converter
        )

        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                "Texture converted to DDS successfully", 'INFO'
            )
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}

        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ConvertObjectTexturesToDDS(Operator):
    """Convert all textures from selected object to DDS format"""
    bl_idname = "fo4.convert_object_textures_to_dds"
    bl_label = "Convert Object Textures to DDS"
    bl_options = {'REGISTER', 'UNDO'}

    output_dir: StringProperty(
        name="Output Directory",
        description="Directory to save converted DDS files",
        subtype='DIR_PATH'
    )

    converter: EnumProperty(
        name="Converter",
        description="Select converter binary",
        items=[
            ('auto', "Auto (prefer NVTT)", "Use nvcompress if available, else texconv"),
            ('nvtt', "NVTT (nvcompress)", "Use NVIDIA Texture Tools"),
            ('texconv', "texconv (DirectXTex)", "Use Microsoft texconv"),
        ],
        default='auto'
    )

    def execute(self, context):
        obj = context.active_object
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}

        if not self.output_dir:
            self.report({'ERROR'}, "No output directory selected")
            return {'CANCELLED'}

        success, message, converted_files = nvtt_helpers.NVTTHelpers.convert_object_textures(
            obj,
            self.output_dir,
            preferred_tool=self.converter
        )

        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')

            print("\n" + "="*70)
            print("TEXTURE CONVERSION RESULTS")
            print("="*70)
            print(f"Object: {obj.name}")
            print(f"Converted files:")
            for filepath in converted_files:
                print(f"  - {filepath}")
            print("="*70 + "\n")
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}

        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_TestDDSConverters(Operator):
    """Self-test nvcompress/texconv by converting a tiny PNG to DDS"""
    bl_idname = "fo4.test_dds_converters"
    bl_label = "Self-Test DDS Converters"

    def execute(self, context):
        tool, tool_path, msg = nvtt_helpers.NVTTHelpers._find_converter("auto")
        if not tool:
            self.report({'ERROR'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'ERROR')
            return {'CANCELLED'}

        import tempfile
        import base64
        import os

        # Minimal 2x2 PNG (opaque magenta/cyan checker)
        png_bytes = base64.b64decode(
            b"iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAE0lEQVQI12NgYGD4z0AEYBxVSgBf3AHb8QeUkwAAAABJRU5ErkJggg=="
        )

        with tempfile.TemporaryDirectory() as tmp:
            src = os.path.join(tmp, "test.png")
            dst = os.path.join(tmp, "test.dds")
            with open(src, "wb") as f:
                f.write(png_bytes)

            success, message = nvtt_helpers.NVTTHelpers.convert_to_dds(
                src,
                dst,
                compression_format='bc1',
                preferred_tool=tool,
            )

            if success and os.path.exists(dst):
                size_kb = os.path.getsize(dst) / 1024
                detail = f"DDS wrote {size_kb:.1f} KB via {tool_path}"
                self.report({'INFO'}, detail)
                notification_system.FO4_NotificationSystem.notify(detail, 'INFO')
                return {'FINISHED'}

            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}


class FO4_OT_CheckNVTTInstallation(Operator):
    """Check if NVIDIA Texture Tools is installed"""
    bl_idname = "fo4.check_nvtt_installation"
    bl_label = "Check NVTT Installation"

    def execute(self, context):
        success, message = nvtt_helpers.NVTTHelpers.check_nvtt_installation()
        tex_success, tex_message = nvtt_helpers.NVTTHelpers.check_texconv_installation()

        if success:
            self.report({'INFO'}, message)
            print("\n" + "="*70)
            print("NVIDIA TEXTURE TOOLS STATUS")
            print("="*70)
            print("✅ NVIDIA Texture Tools is installed and ready!")
            print(message)
            print("\nYou can now convert textures to DDS format for Fallout 4.")
            print("="*70 + "\n")
        else:
            self.report({'WARNING'}, "NVIDIA Texture Tools not found")
            print("\n" + "="*70)
            print("NVIDIA TEXTURE TOOLS INSTALLATION")
            print("="*70)
            print(message)
            print("\nFor detailed instructions, see NVIDIA_RESOURCES.md")
            print("="*70 + "\n")

        if tex_success:
            print("texconv detected:")
            print(tex_message)
        else:
            print(tex_message)

        return {'FINISHED'}


_CLASSES = (
    FO4_OT_ConvertTextureToDDS,
    FO4_OT_ConvertObjectTexturesToDDS,
    FO4_OT_TestDDSConverters,
    FO4_OT_CheckNVTTInstallation,
)


def register():
    for cls in _CLASSES:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"texture_helpers.conversion_operators: Could not register {cls.__name__}: {exc}")


def unregister():
    for cls in reversed(_CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
