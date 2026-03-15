"""
PyNifly V25.5 downloader and installer for Fallout 4 Blender add-on
"""

import bpy
from bpy.types import Operator
import os
import sys
import tempfile
import urllib.request
import zipfile

PY_NIFLY_V255_URL = "https://github.com/BadDogSkyrim/PyNifly/releases/download/V25.5/pynifly-25.5.zip"
PY_NIFLY_V255_FOLDER = "pynifly_v255"

class FO4_OT_InstallPyNiflyV255(Operator):
    bl_idname = "fo4.install_pynifly_v255"
    bl_label = "Download & Install PyNifly V25.5"
    bl_description = "Download and install PyNifly V25.5 (HKX animation support) into the add-on folder."

    def execute(self, context):
        addon_dir = os.path.dirname(os.path.abspath(__file__))
        target_dir = os.path.join(addon_dir, PY_NIFLY_V255_FOLDER)
        tmp_zip = None
        try:
            # Download zip
            self.report({'INFO'}, f"Downloading PyNifly V25.5 from {PY_NIFLY_V255_URL}")
            with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
                tmp_zip = tmp.name
                with urllib.request.urlopen(PY_NIFLY_V255_URL, timeout=60) as resp:
                    tmp.write(resp.read())
            # Extract zip
            if os.path.exists(target_dir):
                import shutil
                shutil.rmtree(target_dir)
            with zipfile.ZipFile(tmp_zip, 'r') as zip_ref:
                zip_ref.extractall(target_dir)
            self.report({'INFO'}, f"PyNifly V25.5 installed to {target_dir}")
            # Add to sys.path if not present
            if target_dir not in sys.path:
                sys.path.append(target_dir)
            return {'FINISHED'}
        except Exception as exc:
            self.report({'ERROR'}, f"PyNifly V25.5 install failed: {exc}")
            return {'CANCELLED'}
        finally:
            if tmp_zip and os.path.exists(tmp_zip):
                try:
                    os.unlink(tmp_zip)
                except Exception:
                    pass

def register():
    bpy.utils.register_class(FO4_OT_InstallPyNiflyV255)

def unregister():
    bpy.utils.unregister_class(FO4_OT_InstallPyNiflyV255)
