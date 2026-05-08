"""
Fallout 4 Tutorial Helper — preferences.py
Add-on preferences: PyNifly path, assets root, default game type.
"""

import bpy
from bpy.props import StringProperty, EnumProperty
from bpy.types import AddonPreferences


class FO4TutorialHelperPreferences(AddonPreferences):
    bl_idname = __package__

    assets_root: StringProperty(
        name="FO4 Assets Root",
        description="Root folder containing extracted Meshes\\ and Textures\\ directories",
        subtype='DIR_PATH',
        default="",
    )

    game_type: EnumProperty(
        name="Game Type",
        description="Game type passed to PyNifly on NIF import/export",
        items=[
            ('FO4', "Fallout 4", "Fallout 4 / FO4"),
            ('FO4NV', "Fallout 4 NV", "Fallout 4 New Vegas conversion"),
            ('SKYRIM', "Skyrim", "Skyrim LE"),
            ('SKYRIMSE', "Skyrim SE", "Skyrim Special/Anniversary Edition"),
        ],
        default='FO4',
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "assets_root")
        layout.prop(self, "game_type")
        layout.separator()
        layout.label(text="PyNifly must be installed separately:", icon='INFO')
        layout.label(text="  Nexus: nexusmods.com/fallout4/mods/52319")
        layout.label(text="  GitHub: github.com/BadDogSkyrim/PyNifly")
        layout.separator()
        layout.operator("fo4.sync_from_mossy", icon='FILE_REFRESH')


def register():
    bpy.utils.register_class(FO4TutorialHelperPreferences)


def unregister():
    bpy.utils.unregister_class(FO4TutorialHelperPreferences)
