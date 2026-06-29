"""
Fallout 4 Tutorial Helper — Blender 4.2+ Extension
Provides a full Fallout 4 asset-pipeline panel inside Blender's 3D Viewport.

Features:
  • One-click FO4 scene setup (units, FPS, scale)
  • NIF export preparation checker
  • Collision mesh generator  
  • Texture / UV validation
  • "Convert to FO4 Complete Pipeline" operator (mesh → NIF-ready)

Installation (Blender 4.2+ Extensions):
  Edit → Preferences → Extensions → Install from Disk → select the .zip

Installation (legacy Add-on, Blender ≤4.1):
  Edit → Preferences → Add-ons → Install → select __init__.py
"""

bl_info = {
    "name": "Fallout 4 Tutorial Helper",
    "author": "Mossy AI Assistant",
    "version": (1, 4, 0),
    "blender": (4, 4, 0),
    "location": "View3D > Sidebar > FO4 Pipeline",
    "description": "Complete Fallout 4 asset pipeline — FO4 setup, PyNifly 25+ NIF export, CK cell ↔ Blender roundtrip, collision & UV checks. Connects to Mossy for AI, paths, PyTorch and live logging.",
    "warning": "Requires PyNifly 25+ (Nexus #52319) installed as a Blender Extension",
    "category": "Import-Export",
}

import bpy

from . import mossy_link
from . import ui_panels
from . import operators
from . import preferences
from . import fo4_scanner


def register():
    preferences.register()
    operators.register()
    ui_panels.register()
    fo4_scanner.register()
    mossy_link.register()
    mossy_link.setup_pytorch()


def unregister():
    fo4_scanner.unregister()
    ui_panels.unregister()
    operators.unregister()
    preferences.unregister()
    mossy_link.unregister()
