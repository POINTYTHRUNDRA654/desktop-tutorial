"""
Operators for the Fallout 4 Tutorial Add-on
"""

import bpy
import sys
import importlib
import threading
import os as _os
from bpy.types import Operator
from bpy.props import StringProperty, EnumProperty, IntProperty, FloatProperty, BoolProperty


def _safe_import(name):
    """Import a submodule of this package safely; returns None on failure."""
    try:
        return importlib.import_module(f".{name}", package=__package__)
    except Exception as exc:
        sys.modules.pop(f"{__package__}.{name}", None)
        print(f"operators: Skipped module {name} due to error: {exc}")
        return None


# Core modules – imported individually with try/except so that a single
# broken module NEVER prevents the others from registering.  Operators that
# depend on a failed module will report an error on invoke rather than
# vanishing from the UI entirely.
_CORE_MODULE_NAMES = [
    "preferences", "tutorial_system", "mesh_helpers", "texture_helpers",
    "animation_helpers", "export_helpers", "notification_system",
    "image_to_mesh_helpers", "hunyuan3d_helpers", "gradio_helpers",
    "hymotion_helpers", "nvtt_helpers", "realesrgan_helpers",
    "get3d_helpers", "stylegan2_helpers", "instantngp_helpers",
    "imageto3d_helpers", "advanced_mesh_helpers", "rignet_helpers",
    "motion_generation_helpers", "quest_helpers", "npc_helpers",
    "world_building_helpers", "item_helpers", "preset_library",
    "automation_system", "desktop_tutorial_client",
    "shap_e_helpers", "point_e_helpers", "advisor_helpers",
    "ue_importer_helpers", "umodel_tools_helpers", "unity_fbx_importer_helpers",
    "post_processing_helpers", "fo4_material_browser", "fo4_reference_helpers",
    "bgsm_helpers",
]
for _mod_name in _CORE_MODULE_NAMES:
    try:
        globals()[_mod_name] = importlib.import_module(
            f".{_mod_name}", package=__package__
        )
    except Exception as _e:
        globals()[_mod_name] = None
        print(f"operators: Could not import {_mod_name}: {_e}")
del _mod_name, _CORE_MODULE_NAMES

# ── Class-level EnumProperty fallbacks ───────────────────────────────────────
# Some Operator classes reference module attributes in their class body (before
# any method is called).  We define safe fallbacks here so that if a module
# failed to load the class can still be defined and registered.
_COLLISION_TYPES = (
    mesh_helpers.MeshHelpers.COLLISION_TYPES
    if mesh_helpers
    else [
        ('DEFAULT', 'Default', 'Standard collision'),
        ('NONE',    'None',    'No collision'),
    ]
)
_PP_PRESET_ITEMS = (
    post_processing_helpers.PRESET_ENUM_ITEMS
    if post_processing_helpers
    else [('NONE', 'None', 'No preset')]
)
_MAT_PRESET_ITEMS = (
    fo4_material_browser.PRESET_ENUM_ITEMS
    if fo4_material_browser
    else [('NONE', 'None', 'No preset')]
)
_REF_ENUM_ITEMS = (
    fo4_reference_helpers.REFERENCE_ENUM_ITEMS
    if fo4_reference_helpers
    else [('NONE', 'None', 'No reference')]
)

_WIND_ANIM_PRESETS = {
    'GRASS': (0.10, 40.0),
    'SHRUB': (0.15, 80.0),
    'TREE': (0.30, 120.0),
    'SHRUB_SOFT': (0.10, 95.0),
    'SHRUB_STORM': (0.24, 55.0),
    'TREE_CALM': (0.20, 150.0),
    'TREE_STORM': (0.42, 85.0),
}

_SMART_WIND_TUNING_PRESETS = {
    'CALM': {
        'SHRUB': (0.10, 95.0, "calm"),
        'TREE':  (0.20, 150.0, "calm"),
    },
    'BALANCED': {
        'SHRUB': (0.15, 80.0, "balanced"),
        'TREE':  (0.30, 120.0, "balanced"),
    },
    'STORM': {
        'SHRUB': (0.24, 55.0, "storm"),
        'TREE':  (0.42, 85.0, "storm"),
    },
}

# Optional / extended modules – imported safely so a missing or broken module
# does NOT prevent the core operators from being registered.
knowledge_helpers     = _safe_import("knowledge_helpers")
umodel_helpers        = _safe_import("umodel_helpers")
asset_studio_helpers  = _safe_import("asset_studio_helpers")
asset_ripper_helpers  = _safe_import("asset_ripper_helpers")
fo4_game_assets       = _safe_import("fo4_game_assets")
unity_game_assets     = _safe_import("unity_game_assets")
unreal_game_assets    = _safe_import("unreal_game_assets")
fo4_scene_diagnostics = _safe_import("fo4_scene_diagnostics")
asset_library         = _safe_import("asset_library")
tri_export_helpers    = _safe_import("tri_export_helpers")
navmesh_helpers_mod   = _safe_import("navmesh_helpers")


class FO4_OT_NextTutorialStep(Operator):
    """Advance to the next tutorial step"""
    bl_idname = "fo4.next_tutorial_step"
    bl_label = "Next Tutorial Step"
    bl_options = {'REGISTER'}

    def execute(self, context):
        if not tutorial_system:
            self.report({'WARNING'}, "Tutorial system not available")
            return {'CANCELLED'}
        if not tutorial_system.TUTORIALS:
            tutorial_system.initialize_tutorials()

        tutorial = tutorial_system.get_current_tutorial(context)
        if not tutorial:
            self.report({'ERROR'}, "No active tutorial. Click Start Tutorial first.")
            return {'CANCELLED'}

        if not tutorial.next_step():
            self.report({'INFO'}, "Already at the final step.")
            return {'CANCELLED'}

        context.scene.fo4_tutorial_step = tutorial.current_step
        step = tutorial.get_current_step()

        print("\n" + "-" * 50)
        print(f"TUTORIAL: {tutorial.name}")
        print(f"Step {tutorial.current_step + 1}/{len(tutorial.steps)} - {step.title}")
        if step and step.description:
            print(f"-> {step.description}")
        print("-" * 50 + "\n")

        self.report({'INFO'}, f"Step {tutorial.current_step + 1}: {step.title}")
        try:
            if notification_system:
                notification_system.FO4_NotificationSystem.notify(
                    f"Step {tutorial.current_step + 1}: {step.title}",
                    'INFO'
                )
        except Exception:
            pass
        return {'FINISHED'}


class FO4_OT_PreviousTutorialStep(Operator):
    """Go back to the previous tutorial step"""
    bl_idname = "fo4.previous_tutorial_step"
    bl_label = "Previous Tutorial Step"
    bl_options = {'REGISTER'}

    def execute(self, context):
        if not tutorial_system:
            self.report({'WARNING'}, "Tutorial system not available")
            return {'CANCELLED'}
        if not tutorial_system.TUTORIALS:
            tutorial_system.initialize_tutorials()

        tutorial = tutorial_system.get_current_tutorial(context)
        if not tutorial:
            self.report({'ERROR'}, "No active tutorial. Click Start Tutorial first.")
            return {'CANCELLED'}

        if not tutorial.previous_step():
            self.report({'INFO'}, "Already at the first step.")
            return {'CANCELLED'}

        context.scene.fo4_tutorial_step = tutorial.current_step
        step = tutorial.get_current_step()

        print("\n" + "-" * 50)
        print(f"TUTORIAL: {tutorial.name}")
        print(f"Step {tutorial.current_step + 1}/{len(tutorial.steps)} - {step.title}")
        if step and step.description:
            print(f"-> {step.description}")
        print("-" * 50 + "\n")

        self.report({'INFO'}, f"Step {tutorial.current_step + 1}: {step.title}")
        try:
            if notification_system:
                notification_system.FO4_NotificationSystem.notify(
                    f"Step {tutorial.current_step + 1}: {step.title}",
                    'INFO'
                )
        except Exception:
            pass
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Shiagur Animation Rig operators
# ---------------------------------------------------------------------------

class FO4_OT_OpenShiagurPowerArmorRig(Operator):
    """Open Shiagur's Blender Power Armor Animation Rig (Nexus mod 81279) in browser."""
    bl_idname = "fo4.open_shiagur_power_armor_rig"
    bl_label  = "Download Power Armor Rig (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/81279")
        self.report({'INFO'}, "Opened Nexus Mods - Blender Power Armor Animation Rig by Shiagur")
        return {'FINISHED'}


class FO4_OT_OpenShiagurAnimRig(Operator):
    """Open Shiagur's Blender Animation Rig 1st/3rd Person (Nexus mod 82537) in browser."""
    bl_idname = "fo4.open_shiagur_anim_rig"
    bl_label  = "Download 1st/3rd Person Rig (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/82537")
        self.report({'INFO'}, "Opened Nexus Mods - Blender Animation Rig & Guide by Shiagur")
        return {'FINISHED'}


class FO4_OT_OpenFBXImporter(Operator):
    """Open the FBXImporter Nexus page (FBX → HKT conversion tool by andrelo1)."""
    bl_idname = "fo4.open_fbximporter"
    bl_label  = "Get FBXImporter (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/59849")
        self.report({'INFO'}, "Opened Nexus Mods - FBXImporter by andrelo1")
        return {'FINISHED'}


class FO4_OT_ShowShiagurWorkflow(Operator):
    """Show the complete FO4 animation pipeline using Shiagur's rigs."""
    bl_idname = "fo4.show_shiagur_workflow"
    bl_label  = "FO4 Animation Workflow Guide"

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_popup(self, width=520)

    def draw(self, context):
        layout = self.layout

        # ── Title ────────────────────────────────────────────────────────────
        layout.label(text="Fallout 4 Animation Workflow (Shiagur's Rigs)", icon='ARMATURE_DATA')
        layout.separator()

        def _box(icon, heading, lines):
            b = layout.box()
            b.label(text=heading, icon=icon)
            col = b.column(align=True)
            col.scale_y = 0.82
            for ln in lines:
                col.label(text=ln)

        # ── Rig downloads ────────────────────────────────────────────────────
        _box('ARMATURE_DATA', "Step 0 - Download Shiagur's Rig (Nexus Mods - requires free account)", [
            "Power Armor rig:   nexusmods.com/fallout4/mods/81279",
            "1st/3rd person:    nexusmods.com/fallout4/mods/82537",
            "Use the buttons below the guide to open each page.",
        ])

        # ── Required tools ───────────────────────────────────────────────────
        _box('TOOL_SETTINGS', "Step 1 - Install Required Tools", [
            "• Blender 4.1+             - blender.org  (free)",
            "• PyNifly (in addon)       - BadDog/BadDogSkyrim  ← RECOMMENDED PATH",
            "  PyNifly exports HKX natively - no extra tools needed!",
            "",
            "Traditional pipeline (if not using PyNifly HKX export):",
            "• FBXImporter              - nexusmods.com/fallout4/mods/59849",
            "  Converts Blender FBX → Havok HKT intermediate format",
            "• Havok Content Tools 2014.1.1 64-bit",
            "  Converts HKT → HKX (community-sourced; no public download)",
            "• hkxcmd (optional)        - github.com/figment/hkxcmd",
            "• HKXPack (optional)       - dexesttp.github.io/hkxpack",
        ])

        # ── Animation workflow ───────────────────────────────────────────────
        _box('ANIM', "Step 2 - Create Your Animation in Blender", [
            "1. Open the .blend rig file from Shiagur's download.",
            "2. Pose and keyframe using Blender's NLA/Action editor.",
            "   • IK/FK toggle panels are included in the rig.",
            "   • 1st person: animate arms/hands and weapon.",
            "   • 3rd person: animate full body motion.",
            "   • Power Armor: use dedicated PA skeleton included.",
        ])

        # ── Export paths ─────────────────────────────────────────────────────
        _box('EXPORT', "Step 3 - Export to HKX", [
            "PATH A - PyNifly (recommended, simplest):",
            "  File > Export > HKX Animation (.hkx)",
            "  Set target_game = FO4, then export directly.",
            "  No FBX conversion step needed.",
            "",
            "PATH B - FBX → HKT → HKX (traditional):",
            "  1. File > Export > FBX (Blender built-in)",
            "     Settings: Apply transforms, Bake animation ON",
            "  2. Run FBXImporter.exe on the exported .fbx",
            "     → produces a .hkt file",
            "  3. Open Havok Content Tools 2014.1.1",
            "     Load .hkt → Preview → Package & Export → .hkx",
            "     Use 48-bit compression preset (recommended by Shiagur)",
        ])

        # ── Game integration ─────────────────────────────────────────────────
        _box('GAME', "Step 4 - Add to Fallout 4", [
            "1. Place .hkx in Data\\Meshes\\Actors\\Character\\Animations\\",
            "   (or relevant subfolder for weapon/power armor)",
            "2. Register the animation in Creation Kit or FO4Edit.",
            "   CK: Actor > Animation Graph tab > Add animation event",
            "   FO4Edit: find/create the correct record in your .esp",
            "3. Test in-game; check Havok compression if animation jitters.",
        ])

        # ── Resources ────────────────────────────────────────────────────────
        _box('INFO', "Shiagur's Tutorial Videos (YouTube)", [
            "Setup & Installation:  youtube.com/watch?v=R9NZraXPVGU",
            "Rig & Guide overview:  youtube.com/watch?v=E83Iuy8SuyA",
            "Power Armor rig demo:  youtube.com/watch?v=JkheIassgUY",
            "Full channel:          youtube.com/@shiagur/videos",
            "Nexus forum thread:    forums.nexusmods.com/topic/13485163",
        ])

        layout.separator()
        layout.label(
            text="Credit: Shiagur (rig author) · BadDog (PyNifly) · andrelo1 (FBXImporter)",
            icon='FUND',
        )


# ---------------------------------------------------------------------------
# Mod packaging / distribution tool operators
# ---------------------------------------------------------------------------

class FO4_OT_OpenFOMODCreationTool(Operator):
    """Open the FOMOD Creation Tool Nexus page (mod 6821) in browser."""
    bl_idname = "fo4.open_fomod_creation_tool"
    bl_label  = "Get FOMOD Creation Tool (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/6821")
        self.report({'INFO'}, "Opened Nexus Mods - FOMOD Creation Tool by Wenderer")
        return {'FINISHED'}


class FO4_OT_OpenCathedralAssetsOptimizer(Operator):
    """Open the Cathedral Assets Optimizer Nexus page in browser."""
    bl_idname = "fo4.open_cathedral_assets_optimizer"
    bl_label  = "Get Cathedral Assets Optimizer (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/skyrimspecialedition/mods/23316")
        self.report({'INFO'}, "Opened Nexus Mods - Cathedral Assets Optimizer")
        return {'FINISHED'}


class FO4_OT_OpenFO4Edit(Operator):
    """Open the FO4Edit / xEdit Nexus page in browser."""
    bl_idname = "fo4.open_fo4edit"
    bl_label  = "Get FO4Edit / xEdit (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/2737")
        self.report({'INFO'}, "Opened Nexus Mods - FO4Edit / xEdit")
        return {'FINISHED'}


class FO4_OT_ShowFOMODGuide(Operator):
    """Show the complete Fallout 4 mod packaging and distribution workflow."""
    bl_idname = "fo4.show_fomod_guide"
    bl_label  = "Mod Packaging & Distribution Guide"

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_popup(self, width=540)

    def draw(self, context):
        layout = self.layout

        layout.label(text="Fallout 4 Mod Packaging & Distribution Workflow", icon='PACKAGE')
        layout.separator()

        def _box(icon, heading, lines):
            b = layout.box()
            b.label(text=heading, icon=icon)
            col = b.column(align=True)
            col.scale_y = 0.82
            for ln in lines:
                col.label(text=ln)

        _box('TOOL_SETTINGS', "Required Tools (download all before starting)", [
            "• FO4Edit / xEdit      nexusmods.com/fallout4/mods/2737",
            "  Edit .esp/.esm plugins, clean masters, resolve conflicts.",
            "",
            "• Creation Kit         Via Steam → Library → Tools → Fallout 4 CK",
            "  Bethesda's official tool. Also installs Archive2.exe.",
            "",
            "• Archive2             Ships with the Creation Kit",
            "  Path: Fallout4\\Tools\\Archive2\\Archive2.exe",
            "  Packs loose files into .ba2 archives for distribution.",
            "",
            "• Cathedral Assets Optimizer   nexusmods.com/skyrimspecialedition/mods/23316",
            "  Optimize textures (DDS), meshes, and BSA/BA2 for FO4.",
            "",
            "• FOMOD Creation Tool  nexusmods.com/fallout4/mods/6821  (by Wenderer)",
            "  GUI for building multi-option FOMOD installers.",
            "  No XML knowledge required. Supports images, conditions,",
            "  flags, plugin detection, file priorities.",
            "",
            "• Mod Organizer 2 / Vortex   Test your FOMOD before upload.",
        ])

        _box('FILEBROWSER', "Step 1 - Build Your Mod Folder Structure", [
            "Use 'Create Data/ + FOMOD Folders' button above.",
            "Expected layout:",
            "  MyMod/",
            "    Data/",
            "      meshes/     ← .nif files",
            "      textures/   ← .dds files",
            "      scripts/    ← .pex compiled scripts",
            "      sound/      ← .wav / .xwm audio",
            "    fomod/        ← info.xml + ModuleConfig.xml",
        ])

        _box('TOOL_SETTINGS', "Step 2 - Edit Plugin in FO4Edit / Creation Kit", [
            "1. Create or edit your .esp / .esm / .esl plugin.",
            "2. Add records: weapons, armor, NPCs, quests, etc.",
            "3. Clean with FO4Edit (Quick Auto Clean) before release.",
            "4. ESL-flag small plugins to save plugin slots (FO4Edit).",
        ])

        _box('IMAGE_DATA', "Step 3 - Optimize Assets (Cathedral Assets Optimizer)", [
            "1. Open CAO. Select 'Fallout 4' as target game.",
            "2. Set input folder to Data/textures/ (and/or meshes/).",
            "3. Run optimization: compresses textures to BC7/BC1 DDS,",
            "   fixes mesh headers, and reduces file size.",
            "4. Optimized files replace originals in-place.",
        ])

        _box('PACKAGE', "Step 4 - Pack into BA2 (Archive2)", [
            "  Archive2.exe Data\\textures\\ -root=Data -format=DX10",
            "    → MyMod - Textures.ba2",
            "  Archive2.exe Data\\meshes\\   -root=Data -format=GNRL",
            "    → MyMod - Main.ba2",
            "pack_ba2.bat / .sh scripts are written by 'Create Structure'.",
        ])

        _box('FILE_TICK', "Step 5 - Create FOMOD Installer", [
            "Simple mod (no options):",
            "  Use 'Generate info.xml + ModuleConfig.xml' above.",
            "  Result: always-install single-option installer.",
            "",
            "Complex mod (multiple options / patches):",
            "  Download FOMOD Creation Tool (Wenderer, Nexus 6821).",
            "  Open your fomod/ folder in the tool.",
            "  Add pages, groups, options, conditions, screenshots.",
            "  Supports: plugin detection, flag conditions, BA2 choice.",
            "  Generates correct XML automatically - no hand-coding needed.",
        ])

        _box('EXPORT', "Step 6 - Package & Upload to Nexus", [
            "1. Create a .zip or .7z archive of your mod root folder.",
            "2. Test install in MO2 or Vortex before uploading.",
            "3. Upload to nexusmods.com/fallout4.",
            "4. Add screenshots, description, requirements on mod page.",
        ])

        _box('INFO', "FOMOD XML Reference", [
            "Schema:     qconsulting.ca/fo3/ModConfig5.0.xsd",
            "Docs:       fomod-docs.readthedocs.io/en/latest/tutorial.html",
            "STEP guide: stepmodifications.org/wiki/Guide:FOMOD",
            "Nexus guide: forums.nexusmods.com/index.php?/forum/4309",
        ])

        layout.separator()
        layout.label(
            text="Tools: Wenderer (FOMOD tool) · Bethesda (CK/Archive2) · xEdit team",
            icon='FUND',
        )




class FO4_OT_OpenCollectiveModdingToolkit(Operator):
    """Open the Collective Modding Toolkit Nexus page (mod 87441) in browser."""
    bl_idname = "fo4.open_collective_modding_toolkit"
    bl_label  = "Get Collective Modding Toolkit (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/87441")
        self.report({'INFO'}, "Opened Nexus - Collective Modding Toolkit by wxMichael")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Story Action Poses + pose framework operators
# ---------------------------------------------------------------------------

class FO4_OT_OpenStoryActionPoses(Operator):
    """Open Story Action Poses Nexus page (mod 58448, EngineGaming) in browser."""
    bl_idname = "fo4.open_story_action_poses"
    bl_label  = "Get Story Action Poses (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/58448")
        self.report({'INFO'}, "Opened Nexus - Story Action Poses by EngineGaming")
        return {'FINISHED'}


class FO4_OT_OpenAAF(Operator):
    """Open Advanced Animation Framework Nexus page (mod 31304, dagobaking) in browser."""
    bl_idname = "fo4.open_aaf"
    bl_label  = "Get AAF - Advanced Animation Framework (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/31304")
        self.report({'INFO'}, "Opened Nexus - Advanced Animation Framework by dagobaking")
        return {'FINISHED'}


class FO4_OT_OpenPoserHotkeys(Operator):
    """Open Poser Hotkeys Nexus page (mod 45967, opparco) in browser."""
    bl_idname = "fo4.open_poser_hotkeys"
    bl_label  = "Get Poser Hotkeys (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/45967")
        self.report({'INFO'}, "Opened Nexus - Poser Hotkeys by opparco")
        return {'FINISHED'}


class FO4_OT_ShowStoryActionPosesGuide(Operator):
    """Show the Story Action Poses setup guide and full requirement list."""
    bl_idname = "fo4.show_story_action_poses_guide"
    bl_label  = "Story Action Poses Setup Guide"

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_popup(self, width=500)

    def draw(self, context):
        layout = self.layout
        layout.label(text="Story Action Poses  (mod 58448)  by EngineGaming", icon='ARMATURE_DATA')
        layout.separator()

        def _box(icon, heading, lines):
            b = layout.box()
            b.label(text=heading, icon=icon)
            col = b.column(align=True)
            col.scale_y = 0.82
            for ln in lines:
                col.label(text=ln)

        _box('INFO', "What it is", [
            "1,700+ action poses for storytelling, screenshots, and machinima.",
            "Covers standard characters, power armor, and creatures.",
            "ESL-flagged - consumes no plugin slot in your load order.",
            "NEXT-GEN version (v4.0) at Nexus mod 68000.",
        ])

        _box('TOOL_SETTINGS', "Required Tools (install in this order)", [
            "1. F4SE (Fallout 4 Script Extender)  - f4se.silverlock.org",
            "   Required by everything below. Launch FO4 via f4se_loader.exe.",
            "",
            "2. AAF (Advanced Animation Framework)  - Nexus mod 31304",
            "   by dagobaking. Core pose/animation manager.",
            "   Use the buttons below to open each Nexus page.",
            "",
            "3. Poser Hotkeys  - Nexus mod 45967  by opparco",
            "   Trigger poses in-game with arrow keys. Optional but recommended.",
            "",
            "4. LooksMenu  - Nexus mod 12631  by expired6978",
            "   Required for face/expression control in posed scenes.",
        ])

        _box('ANIM', "Optional / Creature Poses", [
            "Animal Posing Framework - needed for creature/animal poses.",
            "Story Action Poses NEXT-GEN (v4.0) - Nexus mod 68000",
            "  Updated for NG Fallout 4 (post May 2024 patch).",
        ])

        _box('CHECKMARK', "Using Poses in Blender (for mod authors)", [
            "To create custom poses for SAP-style distribution:",
            "1. Use Shiagur's animation rig (Nexus 82537) in Blender.",
            "2. Create a static key-pose (single frame) animation.",
            "3. Export via PyNifly or FBX → HKT → HKX pipeline.",
            "4. Register the .hkx in an AAF XML pose pack.",
            "5. Distribute with AAF as a dependency in your FOMOD.",
        ])

        _box('INFO', "Resources", [
            "Mod page: nexusmods.com/fallout4/mods/58448",
            "NEXT-GEN: nexusmods.com/fallout4/mods/68000",
            "YouTube:  youtube.com/watch?v=EFuUMsfAkdc  (showcase)",
            "AAF docs: nexusmods.com/fallout4/mods/31304",
        ])

        layout.separator()
        layout.label(
            text="Credit: EngineGaming (SAP) · dagobaking (AAF) · opparco (Poser Hotkeys)",
            icon='FUND',
        )


# ---------------------------------------------------------------------------
# Armor & Clothing operators
# ---------------------------------------------------------------------------

class FO4_OT_OpenBodySlideOutfitStudio(Operator):
    """Open BodySlide and Outfit Studio Nexus page (mod 25) in browser."""
    bl_idname = "fo4.open_bodyslide_outfit_studio"
    bl_label  = "Get BodySlide & Outfit Studio (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/25")
        self.report({'INFO'}, "Opened Nexus - BodySlide and Outfit Studio by ousnius/Caliente")
        return {'FINISHED'}


class FO4_OT_OpenCBBE(Operator):
    """Open CBBE Nexus page (mod 15, Caliente) in browser."""
    bl_idname = "fo4.open_cbbe"
    bl_label  = "Get CBBE Body (Nexus)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/15")
        self.report({'INFO'}, "Opened Nexus - CBBE by Caliente")
        return {'FINISHED'}


class FO4_OT_ShowArmorClothingWorkflow(Operator):
    """Show the complete FO4 armor and clothing creation workflow."""
    bl_idname = "fo4.show_armor_clothing_workflow"
    bl_label  = "Armor & Clothing Workflow Guide"

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_popup(self, width=540)

    def draw(self, context):
        layout = self.layout
        layout.label(text="FO4 Armor & Clothing Creation Workflow", icon='MESH_DATA')
        layout.separator()

        def _box(icon, heading, lines):
            b = layout.box()
            b.label(text=heading, icon=icon)
            col = b.column(align=True)
            col.scale_y = 0.82
            for ln in lines:
                col.label(text=ln)

        _box('TOOL_SETTINGS', "Required Tools", [
            "• Blender 4.1+            - blender.org",
            "• PyNifly                 - use 'Auto-Install PyNifly (Latest)' in Setup panel",
            "  Imports/exports NIF meshes with full skeleton support.",
            "• NifSkope               - github.com/niftools/nifskope",
            "  Inspect/tweak NIF shader flags and texture paths.",
            "• BodySlide & Outfit Studio  - Nexus mod 25  (ousnius/Caliente)",
            "  Conform armor to CBBE body, create morph sliders for users.",
            "• CBBE body              - Nexus mod 15  (Caliente)",
            "  Body reference mesh for fitting and weight transfer.",
            "• Fallout 4 Creation Kit - Steam → Library → Tools",
            "  Create ArmorAddon + Armor records, set body slots.",
            "• FO4Edit / xEdit        - Nexus mod 2737",
            "  Edit plugin records, ESL-flag, clean masters.",
        ])

        _box('MESH_DATA', "Step 1 - Model Your Armor in Blender", [
            "1. Import body reference (CBBE or vanilla) via PyNifly.",
            "   File > Import > NetImmerse/Gambryo NIF → pick body NIF.",
            "2. Model armor/clothing on top of the reference body.",
            "   Keep polygons reasonable - FO4 runs best under 5,000 tris/piece.",
            "3. Ensure clean topology: no N-gons, no overlapping UVs.",
            "4. Scale: match existing FO4 armor scale (1 Blender unit = 1 unit).",
        ])

        _box('WPAINT_FACE', "Step 2 - Weight Paint", [
            "Armor must deform with the body skeleton to animate correctly.",
            "1. Parent armor mesh to the body armature (Ctrl+P > Armature Deform).",
            "2. Use Data Transfer modifier to copy weights from CBBE body:",
            "   Source: CBBE body | Vertex Data: Vertex Groups | Nearest face.",
            "3. Clean up weights: merge very small groups, check deformation.",
            "4. Required bones for upper body armor: Spine1, Spine2, LUpperArm,",
            "   RUpperArm, LForeArm, RForeArm, LHand, RHand.",
            "5. Required bones for lower body / legs: Pelvis, LThigh, RThigh,",
            "   LCalf, RCalf, LFoot, RFoot.",
        ])

        _box('UV', "Step 3 - UV Unwrap & Textures", [
            "1. UV unwrap the armor (Smart UV Project is a good start).",
            "2. Create textures in 512×512, 1024×1024, or 2048×2048:",
            "   _d.dds = diffuse/albedo (BC1 or BC7)",
            "   _n.dds = normal map     (BC5 or BC7)",
            "   _s.dds = specular       (BC1 or BC7)",
            "3. Use Cathedral Assets Optimizer to compress textures for FO4.",
        ])

        _box('EXPORT', "Step 4 - Export as NIF via PyNifly", [
            "1. Select armor mesh + armature.",
            "2. File > Export > NetImmerse/Gambryo NIF (.nif)",
            "   target_game = FO4",
            "   export_modifiers = True  (applies modifiers)",
            "   rename_bones = True      (uses FO4 bone names)",
            "   blender_xf = False       (preserves world transform)",
            "3. Place NIF at: Data\\Meshes\\Actors\\Character\\",
            "   CharacterAssets\\YourMod\\YourArmor.nif",
        ])

        _box('MODIFIER', "Step 5 - Outfit Studio (BodySlide Conforming)", [
            "1. Open Outfit Studio. File > New Project.",
            "2. Load CBBE body as reference (From Template > CBBE Body).",
            "3. File > Import > From NIF → import your armor NIF.",
            "4. Use 'Conform All' to fit armor to CBBE sliders.",
            "5. Fine-tune skin weights in Outfit Studio if needed.",
            "6. File > Export > To NIF → export final conformed NIF.",
            "7. File > Export > Project… → creates BodySlide XML",
            "   so users can batch-build your armor to their body shape.",
        ])

        _box('GAME', "Step 6 - Creation Kit (ArmorAddon + Armor Records)", [
            "1. Open Creation Kit. File > Data > tick your mod .esp.",
            "2. Create ArmorAddon record:",
            "   Actors > Armor > ArmorAddon > New",
            "   Set Male/Female World Model → path to your NIF.",
            "   Body slots (Biped Object slots) - see slot table below.",
            "3. Create Armor record:",
            "   Actors > Armor > Armor > New",
            "   Link to ArmorAddon. Set keywords (ArmorTypePower etc.).",
            "4. Save .esp. Test in-game.",
        ])

        _box('INFO', "FO4 Body Slot Reference", [
            "Slot 30 = Body/Torso (main clothing, full outfits)",
            "Slot 31 = Head      (helmets, hats)",
            "Slot 32 = Hair      (hair-hiding helmets)",
            "Slot 33 = Hands     (gloves)",
            "Slot 34 = Forearms",
            "Slot 35 = Amulet/Neck",
            "Slot 36 = Ring",
            "Slot 37 = Feet/Boots",
            "Slot 38 = Calves/Greaves",
            "Slot 39 = Shield/Back  (backpacks, back accessories)",
            "Slot 40 = Tail (unused vanilla)",
            "Slot 41 = Long Hair / Misc",
            "Slots 44-60 = Custom/mod-defined accessories",
            "Power Armor pieces use slots 55-60 by convention.",
        ])

        layout.separator()
        layout.label(
            text="Tools: ousnius/Caliente (BodySlide+CBBE) · BadDog (PyNifly) · Bethesda (CK)",
            icon='FUND',
        )


class FO4_OT_OpenFO4ArmorBlenderGuide(Operator):
    """Open mod 17785 - FO4 Armor/Outfit Creation with Blender (free tools guide)."""
    bl_idname = "fo4.open_fo4_armor_blender_guide"
    bl_label  = "FO4 Armor/Outfit Blender Guide (Nexus 17785)"

    def execute(self, context):
        import webbrowser
        webbrowser.open("https://www.nexusmods.com/fallout4/mods/17785")
        self.report({'INFO'}, "Opened Nexus - FO4 Armor/Outfit with Blender (free tools guide)")
        return {'FINISHED'}


class FO4_OT_SetArmorOrigin(Operator):
    """Set selected mesh origin to X=0, Y=0, Z=1.2 (FO4 body origin, per Nexus 17785 guide)."""
    bl_idname  = "fo4.set_armor_origin"
    bl_label   = "Set FO4 Armor Origin (0, 0, 120)"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        import bpy
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Apply all transforms first so origin placement is clean
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Move object so its origin is at (0, 0, 120) in Blender units
        # (FO4 body NIF origin after import via Outfit Studio / PyNifly)
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
        obj.location = (0.0, 0.0, 120.0)
        bpy.ops.object.transform_apply(location=True)

        self.report({'INFO'}, f"Origin set to (0, 0, 120) on '{obj.name}'")
        return {'FINISHED'}


class FO4_OT_SplitUVSeamEdges(Operator):
    """Split edges at UV seams before FBX export to prevent UV corruption in Outfit Studio.

    Per the mod 17785 guide: UV coordinates may be exported incorrectly via FBX
    unless edges matching UV seams are split beforehand.
    """
    bl_idname  = "fo4.split_uv_seam_edges"
    bl_label   = "Split UV Seam Edges (for FBX Export)"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        import bpy
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Go to edit mode, select seam edges, then split them
        prev_mode = obj.mode
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')

        # Select all seam edges
        bpy.ops.uv.seams_from_islands()
        bpy.ops.mesh.select_all(action='DESELECT')

        # Use bmesh to select seam edges
        import bmesh
        me = obj.data
        bm = bmesh.from_edit_mesh(me)
        seam_count = 0
        for edge in bm.edges:
            if edge.seam:
                edge.select = True
                seam_count += 1
        bmesh.update_edit_mesh(me)

        if seam_count == 0:
            bpy.ops.object.mode_set(mode=prev_mode)
            self.report({'WARNING'}, "No UV seams found. Mark seams first (Edge > Mark Seam).")
            return {'CANCELLED'}

        # Edge split at selected seam edges
        bpy.ops.mesh.edge_split(type='EDGE')
        bpy.ops.object.mode_set(mode=prev_mode)

        self.report({'INFO'}, f"Split {seam_count} UV seam edge(s) on '{obj.name}'. "
                              "Safe to export as FBX to Outfit Studio now.")
        return {'FINISHED'}


class FO4_OT_TransferArmorWeights(Operator):
    """Transfer vertex weights from a reference body to the active armor mesh.

    Implements the Data Transfer approach from the mod 17785 guide:
    select armor mesh (active), then shift-select the reference body (source),
    and run this operator.
    """
    bl_idname  = "fo4.transfer_armor_weights"
    bl_label   = "Transfer Weights from Body Reference"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        import bpy
        selected = context.selected_objects
        active   = context.active_object

        if not active or active.type != 'MESH':
            self.report({'ERROR'}, "Active object must be the armor mesh")
            return {'CANCELLED'}

        sources = [o for o in selected if o != active and o.type == 'MESH']
        if not sources:
            self.report({'ERROR'}, "Also select the reference body mesh (shift-click it first)")
            return {'CANCELLED'}

        source = sources[0]

        # Add Data Transfer modifier if not already present
        mod_name = "FO4_WeightTransfer"
        if mod_name in active.modifiers:
            active.modifiers.remove(active.modifiers[mod_name])

        mod = active.modifiers.new(name=mod_name, type='DATA_TRANSFER')
        mod.object              = source
        mod.use_vert_data       = True
        mod.data_types_verts    = {'VGROUP_WEIGHTS'}
        mod.vert_mapping        = 'NEAREST'
        mod.layers_vgroup_select_src = 'ALL'
        mod.layers_vgroup_select_dst = 'NAME'

        # Apply the modifier
        try:
            bpy.ops.object.modifier_apply(modifier=mod_name)
        except Exception as exc:
            self.report({'WARNING'}, f"Could not apply modifier: {exc}. Apply manually.")
            return {'FINISHED'}

        self.report({'INFO'},
                    f"Weights transferred from '{source.name}' to '{active.name}'. "
                    "Check weight paint and clean up small groups.")
        return {'FINISHED'}


class FO4_OT_CleanImportedArmature(Operator):
    """Unparent active mesh from its armature and delete the malformed armature.

    Per the mod 17785 guide: FBX bodies exported from Outfit Studio arrive in
    Blender with a malformed armature. Unparent the mesh and delete it - the
    body will look correct once freed.
    """
    bl_idname  = "fo4.clean_imported_armature"
    bl_label   = "Remove Malformed FBX Armature"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        import bpy
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select the imported mesh first")
            return {'CANCELLED'}

        # Find armature parent
        bad_armatures = []
        if obj.parent and obj.parent.type == 'ARMATURE':
            bad_armatures.append(obj.parent)

        # Also find armature modifiers
        arm_mods = [m for m in obj.modifiers if m.type == 'ARMATURE']

        # Clear parent keeping transforms
        if obj.parent:
            bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')

        # Remove armature modifiers
        for m in arm_mods:
            obj.modifiers.remove(m)

        # Delete malformed armature objects
        for arm in bad_armatures:
            bpy.data.objects.remove(arm, do_unlink=True)

        self.report({'INFO'},
                    f"Malformed armature removed from '{obj.name}'. "
                    "Body should now appear correct. Re-parent to the fo4.blend skeleton.")
        return {'FINISHED'}


class FO4_OT_ShowMessage(Operator):
    """Show a message to the user"""
    bl_idname = "fo4.show_message"
    bl_label = "Message"
    
    message: StringProperty(name="Message")
    icon: StringProperty(name="Icon", default='INFO')
    
    def execute(self, context):
        self.report({'INFO'}, self.message)
        return {'FINISHED'}

# Mesh Operators

class FO4_OT_CreateBaseMesh(Operator):
    """Create a base mesh for Fallout 4"""
    bl_idname = "fo4.create_base_mesh"
    bl_label = "Create Base Mesh"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        try:
            obj = mesh_helpers.MeshHelpers.create_base_mesh()
            self.report({'INFO'}, f"Created base mesh: {obj.name}")
            notification_system.FO4_NotificationSystem.notify(
                f"Created base mesh: {obj.name}", 'INFO'
            )
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create mesh: {str(e)}")
            notification_system.FO4_NotificationSystem.notify(
                f"Error creating mesh: {str(e)}", 'ERROR'
            )
            return {'CANCELLED'}
        
        return {'FINISHED'}

class FO4_OT_OptimizeMesh(Operator):
    """Optimize mesh for Fallout 4"""
    bl_idname = "fo4.optimize_mesh"
    bl_label = "Optimize Mesh"
    bl_options = {'REGISTER', 'UNDO'}

    apply_transforms: bpy.props.BoolProperty(
        name="Apply Transforms",
        default=True,
        description="Apply object transformations before optimization",
    )
    threshold: bpy.props.FloatProperty(
        name="Remove Doubles Thresh",
        default=0.0001,
        min=0.0,
        max=0.01,
        description="Distance under which vertices are merged",
    )
    preserve_uvs: bpy.props.BoolProperty(
        name="Preserve UVs",
        default=True,
        description="Avoid collapsing vertices across UV seams",
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "apply_transforms")
        layout.prop(self, "threshold")
        layout.prop(self, "preserve_uvs")

    def invoke(self, context, event):
        # load current preferences as defaults so the dialog reflects saved settings
        prefs = preferences.get_preferences()
        if prefs:
            self.apply_transforms = prefs.optimize_apply_transforms
            self.threshold = prefs.optimize_remove_doubles_threshold
            self.preserve_uvs = prefs.optimize_preserve_uvs
        return context.window_manager.invoke_props_dialog(self)

    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        # override global preferences with operator values
        prefs = preferences.get_preferences()
        if prefs:
            prefs.optimize_apply_transforms = self.apply_transforms
            prefs.optimize_remove_doubles_threshold = self.threshold
            prefs.optimize_preserve_uvs = self.preserve_uvs
        success, message = mesh_helpers.MeshHelpers.optimize_mesh(obj)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}
        
        return {'FINISHED'}

class FO4_OT_ValidateMesh(Operator):
    """Validate mesh for Fallout 4 compatibility"""
    bl_idname = "fo4.validate_mesh"
    bl_label = "Validate Mesh"
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        success, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
        
        if success:
            self.report({'INFO'}, "Mesh is valid for Fallout 4!")
            notification_system.FO4_NotificationSystem.notify(
                "Mesh validation passed!", 'INFO'
            )
        else:
            self.report({'WARNING'}, "Mesh validation found issues:")
            for issue in issues:
                self.report({'WARNING'}, f"  - {issue}")
                notification_system.FO4_NotificationSystem.notify(issue, 'WARNING')
        
        return {'FINISHED'}

# Texture Operators

class FO4_OT_SetupTextures(Operator):
    """Setup Fallout 4 materials"""
    bl_idname = "fo4.setup_textures"
    bl_label = "Setup FO4 Materials"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        try:
            mat = texture_helpers.TextureHelpers.setup_fo4_material(obj)
            self.report({'INFO'}, f"Created FO4 material: {mat.name}")
            notification_system.FO4_NotificationSystem.notify(
                f"Material created: {mat.name}", 'INFO'
            )
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create material: {str(e)}")
            return {'CANCELLED'}
        
        return {'FINISHED'}

class FO4_OT_InstallTexture(Operator):
    """Install texture into material"""
    bl_idname = "fo4.install_texture"
    bl_label = "Install Texture"
    bl_options = {'REGISTER'}
    
    filepath: StringProperty(subtype='FILE_PATH')
    
    texture_type: EnumProperty(
        name="Texture Type",
        items=[
            ('DIFFUSE',     "Diffuse",          "Diffuse/albedo colour map (_d) - BC1 or BC3 with alpha"),
            ('NORMAL',      "Normal Map",        "Tangent-space normal map (_n) - BC5 (ATI2)"),
            ('SPECULAR',    "Specular",          "Specular/smoothness map (_s) - BC1"),
            ('GLOW',        "Glow/Emissive",     "Glow / emissive mask (_g) - BC1"),
            ('ENVIRONMENT', "Environment Mask",  "Cube-map environment mask (_e) - BC1"),
        ]
    )
    
    def execute(self, context):
        obj = context.active_object

        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        success, message = texture_helpers.TextureHelpers.install_texture(
            obj, self.filepath, self.texture_type
        )

        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')

            # Warn if the installed file is not DDS – FO4 requires DDS in-game.
            import os
            if os.path.splitext(self.filepath)[1].lower() != '.dds':
                dds_hint = {
                    'DIFFUSE':     'BC1 (DXT1) or BC3 if alpha needed',
                    'NORMAL':      'BC5 (ATI2) – two-channel tangent-space',
                    'SPECULAR':    'BC1 (DXT1)',
                    'GLOW':        'BC1 (DXT1)',
                    'EMISSIVE':    'BC1 (DXT1)',
                    'ENVIRONMENT': 'BC1 (DXT1)',
                }.get(self.texture_type, 'BC1 (DXT1)')
                self.report(
                    {'WARNING'},
                    f"Non-DDS texture installed. For Fallout 4 NIF export convert to DDS "
                    f"({dds_hint}) using 'Convert to DDS' in the Texture Helpers panel."
                )
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}

        return {'FINISHED'}
    
    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

class FO4_OT_ValidateTextures(Operator):
    """Validate textures for Fallout 4"""
    bl_idname = "fo4.validate_textures"
    bl_label = "Validate Textures"
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        success, issues = texture_helpers.TextureHelpers.validate_textures(obj)
        
        if success:
            self.report({'INFO'}, "Textures are valid for Fallout 4!")
            notification_system.FO4_NotificationSystem.notify(
                "Texture validation passed!", 'INFO'
            )
        else:
            self.report({'WARNING'}, "Texture validation found issues:")
            for issue in issues:
                self.report({'WARNING'}, f"  - {issue}")
                notification_system.FO4_NotificationSystem.notify(issue, 'WARNING')
        
        return {'FINISHED'}

# Animation Operators

class FO4_OT_SetupArmature(Operator):
    """Setup Fallout 4 armature"""
    bl_idname = "fo4.setup_armature"
    bl_label = "Setup FO4 Armature"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        try:
            armature = animation_helpers.AnimationHelpers.setup_fo4_armature()
            self.report({'INFO'}, f"Created FO4 armature: {armature.name}")
            notification_system.FO4_NotificationSystem.notify(
                f"Armature created: {armature.name}", 'INFO'
            )
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create armature: {str(e)}")
            return {'CANCELLED'}
        
        return {'FINISHED'}

class FO4_OT_ValidateAnimation(Operator):
    """Validate animation for Fallout 4"""
    bl_idname = "fo4.validate_animation"
    bl_label = "Validate Animation"
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'ARMATURE':
            self.report({'ERROR'}, "No armature selected")
            return {'CANCELLED'}
        
        success, issues = animation_helpers.AnimationHelpers.validate_animation(obj)
        
        if success:
            self.report({'INFO'}, "Animation is valid for Fallout 4!")
            notification_system.FO4_NotificationSystem.notify(
                "Animation validation passed!", 'INFO'
            )
        else:
            self.report({'WARNING'}, "Animation validation found issues:")
            for issue in issues:
                self.report({'WARNING'}, f"  - {issue}")
                notification_system.FO4_NotificationSystem.notify(issue, 'WARNING')
        
        return {'FINISHED'}


class FO4_OT_CreateIdleAnimation(Operator):
    """Create a simple idle animation on the selected FO4 armature"""
    bl_idname = "fo4.create_idle_animation"
    bl_label = "Create Idle Animation"
    bl_options = {'REGISTER', 'UNDO'}

    duration: IntProperty(
        name="Duration (frames)",
        description="Length of the idle animation in frames (FO4 standard is 30 FPS)",
        default=60,
        min=1,
        max=9999,
    )

    def draw(self, context):
        self.layout.prop(self, "duration")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'ARMATURE':
            self.report({'ERROR'}, "Select an armature first")
            return {'CANCELLED'}
        ok, msg = animation_helpers.AnimationHelpers.create_idle_animation(obj, self.duration)
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        else:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_GenerateWindWeights(Operator):
    """Generate a wind/vortex weight group for the active mesh"""
    bl_idname = "fo4.generate_wind_weights"
    bl_label = "Generate Wind Weights"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object")
            return {'CANCELLED'}

        ok, msg = animation_helpers.AnimationHelpers.generate_wind_weights(obj)
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'ERROR')
            return {'CANCELLED'}


class FO4_OT_AutoWeightPaint(Operator):
    """Automatically skin a mesh to the selected FO4 armature"""
    bl_idname = "fo4.auto_weight_paint"
    bl_label = "Auto Weight Paint"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        mesh = context.active_object
        if not mesh or mesh.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # try to find an armature in the selection or parent
        arm = None
        for obj in context.selected_objects:
            if obj.type == 'ARMATURE':
                arm = obj
                break
        if arm is None and mesh.parent and mesh.parent.type == 'ARMATURE':
            arm = mesh.parent

        if arm is None:
            self.report({'ERROR'}, "No armature selected or parented")
            return {'CANCELLED'}

        ok, msg = animation_helpers.AnimationHelpers.auto_weight_paint(mesh, arm)
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'ERROR')
            return {'CANCELLED'}


class FO4_OT_BatchGenerateWindWeights(Operator):
    """Generate wind weights on all selected mesh objects"""
    bl_idname = "fo4.batch_generate_wind_weights"
    bl_label = "Batch: Wind Weights"

    def execute(self, context):
        meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not meshes:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}
        for m in meshes:
            animation_helpers.AnimationHelpers.generate_wind_weights(m)
        self.report({'INFO'}, f"Processed {len(meshes)} meshes")
        return {'FINISHED'}

class FO4_OT_BatchApplyWindAnimation(Operator):
    """Apply wind animation to all selected mesh objects"""
    bl_idname = "fo4.batch_apply_wind_animation"
    bl_label = "Batch: Wind Animation"

    def execute(self, context):
        meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not meshes:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}
        for m in meshes:
            animation_helpers.AnimationHelpers.apply_wind_animation(m)
        self.report({'INFO'}, f"Processed {len(meshes)} meshes")
        return {'FINISHED'}

class FO4_OT_BatchAutoWeightPaint(Operator):
    """Auto weight paint all selected meshes to the first armature found"""
    bl_idname = "fo4.batch_auto_weight_paint"
    bl_label = "Batch: Auto Weight Paint"

    def execute(self, context):
        meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        arm = next((o for o in context.selected_objects if o.type == 'ARMATURE'), None)
        if not arm and meshes:
            # try parent of first mesh
            if meshes[0].parent and meshes[0].parent.type == 'ARMATURE':
                arm = meshes[0].parent
        if not meshes or not arm:
            self.report({'ERROR'}, "Need at least one mesh and an armature")
            return {'CANCELLED'}
        for m in meshes:
            animation_helpers.AnimationHelpers.auto_weight_paint(m, arm)
        self.report({'INFO'}, f"Processed {len(meshes)} meshes")
        return {'FINISHED'}


class FO4_OT_ToggleWindPreview(Operator):
    """Toggle live wind preview (rotates Wind bone slightly each frame)"""
    bl_idname = "fo4.toggle_wind_preview"
    bl_label = "Toggle Wind Preview"

    enabling: bpy.props.BoolProperty(default=False)

    def execute(self, context):
        if not self.enabling:
            ok, msg = animation_helpers.AnimationHelpers.start_wind_preview()
            if ok:
                self.enabling = True
                self.report({'INFO'}, msg)
            else:
                self.report({'WARNING'}, msg)
        else:
            ok, msg = animation_helpers.AnimationHelpers.stop_wind_preview()
            if ok:
                self.enabling = False
                self.report({'INFO'}, msg)
            else:
                self.report({'WARNING'}, msg)
        return {'FINISHED'}


class FO4_OT_ApplyWindAnimation(Operator):
    """Add wind armature and animation to the selected mesh"""
    bl_idname = "fo4.apply_wind_animation"
    bl_label = "Apply Wind Animation"
    bl_options = {'REGISTER', 'UNDO'}

    preset: bpy.props.EnumProperty(
        name="Preset",
        items=[
            ('NONE', 'Custom', ''),
            ('GRASS', 'Grass', 'Light, fast swaying'),
            ('SHRUB', 'Shrub', 'Medium amplitude/period'),
            ('TREE', 'Tree', 'Slow, heavy movement'),
            ('SHRUB_SOFT', 'Shrub (Calm)', 'Subtle shrub sway for calm weather'),
            ('SHRUB_STORM', 'Shrub (Storm)', 'Aggressive shrub sway for windy weather'),
            ('TREE_CALM', 'Tree (Calm)', 'Subtle heavy-tree sway'),
            ('TREE_STORM', 'Tree (Storm)', 'Stronger tree sway for storm scenes'),
        ],
        default='NONE',
    )
    amplitude: bpy.props.FloatProperty(
        name="Amplitude",
        default=0.2,
        description="Rotation strength in radians for the wind bone"
    )
    period: bpy.props.FloatProperty(
        name="Period",
        default=60.0,
        description="Frame length of the wind animation loop"
    )
    axis: bpy.props.EnumProperty(
        name="Axis",
        items=[('X','X',''),('Y','Y',''),('Z','Z','')],
        default='X',
        description="Axis to rotate for wind motion"
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "preset")
        if self.preset == 'NONE':
            layout.prop(self, "amplitude")
            layout.prop(self, "period")
            layout.prop(self, "axis")
    
    def execute(self, context):
        # apply presets if selected
        if self.preset in _WIND_ANIM_PRESETS:
            self.amplitude, self.period = _WIND_ANIM_PRESETS[self.preset]

        mesh = context.active_object
        if not mesh or mesh.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        ok, msg = animation_helpers.AnimationHelpers.apply_wind_animation(
            mesh, self.amplitude, self.period, self.axis
        )
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'ERROR')
            return {'CANCELLED'}

# RigNet Auto-Rigging Operators

class FO4_OT_CheckRigNetInstallation(Operator):
    """Check if RigNet is installed and available"""
    bl_idname = "fo4.check_rignet"
    bl_label = "Check RigNet Installation"
    
    def execute(self, context):
        available, message = rignet_helpers.RigNetHelpers.check_rignet_available()
        
        if available:
            self.report({'INFO'}, f"✓ RigNet available at: {message}")
            notification_system.FO4_NotificationSystem.notify(
                "RigNet is installed and ready!", 'INFO'
            )
        else:
            self.report({'WARNING'}, f"✗ RigNet not available: {message}")
            notification_system.FO4_NotificationSystem.notify(
                f"RigNet not available: {message}", 'WARNING'
            )
        
        return {'FINISHED'}

class FO4_OT_ShowRigNetInfo(Operator):
    """Show RigNet installation information"""
    bl_idname = "fo4.show_rignet_info"
    bl_label = "RigNet Installation Info"
    
    def execute(self, context):
        instructions = rignet_helpers.RigNetHelpers.get_installation_instructions()
        
        # Print to console
        print("\n" + "="*70)
        print("RIGNET INSTALLATION INSTRUCTIONS")
        print("="*70)
        print(instructions)
        print("="*70 + "\n")
        
        self.report({'INFO'}, "Installation instructions printed to console (Window > Toggle System Console)")
        return {'FINISHED'}

class FO4_OT_PrepareForRigNet(Operator):
    """Prepare mesh for RigNet auto-rigging (simplify to 1K-5K vertices)"""
    bl_idname = "fo4.prepare_for_rignet"
    bl_label = "Prepare for Auto-Rig"
    bl_options = {'REGISTER', 'UNDO'}
    
    target_vertices: IntProperty(
        name="Target Vertices",
        description="Target vertex count for RigNet (1000-5000)",
        default=3000,
        min=1000,
        max=5000
    )
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        # Prepare mesh
        success, message, prepared_mesh = rignet_helpers.RigNetHelpers.prepare_mesh_for_rignet(
            obj, self.target_vertices
        )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
            # Select the prepared mesh
            bpy.ops.object.select_all(action='DESELECT')
            prepared_mesh.select_set(True)
            context.view_layer.objects.active = prepared_mesh
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}
        
        return {'FINISHED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)

class FO4_OT_AutoRigMesh(Operator):
    """Automatically rig mesh using RigNet"""
    bl_idname = "fo4.auto_rig_mesh"
    bl_label = "Auto-Rig with RigNet"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        # Check if RigNet is available
        available, message = rignet_helpers.RigNetHelpers.check_rignet_available()
        if not available:
            self.report({'ERROR'}, f"RigNet not available: {message}")
            self.report({'INFO'}, "Use 'Show Installation Info' for setup instructions")
            return {'CANCELLED'}
        
        # Run auto-rigging
        success, message, armature = rignet_helpers.RigNetHelpers.auto_rig_mesh(obj)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'WARNING'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'WARNING')
            return {'CANCELLED'}
        
        return {'FINISHED'}

class FO4_OT_ExportForRigNet(Operator):
    """Export mesh for external RigNet processing"""
    bl_idname = "fo4.export_for_rignet"
    bl_label = "Export for RigNet"
    
    filepath: StringProperty(subtype='FILE_PATH')
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        # Use provided filepath or generate one
        output_path = self.filepath or None
        
        success, message, file_path = rignet_helpers.RigNetHelpers.export_for_rignet(
            obj, output_path
        )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}
        
        return {'FINISHED'}
    
    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

class FO4_OT_CheckLibiglInstallation(Operator):
    """Check if libigl is installed and available"""
    bl_idname = "fo4.check_libigl"
    bl_label = "Check libigl Installation"
    
    def execute(self, context):
        available, message = rignet_helpers.RigNetHelpers.check_libigl_available()
        
        if available:
            self.report({'INFO'}, f"✓ libigl available: {message}")
            notification_system.FO4_NotificationSystem.notify(
                "libigl is installed and ready!", 'INFO'
            )
        else:
            self.report({'WARNING'}, f"✗ libigl not available: {message}")
            notification_system.FO4_NotificationSystem.notify(
                f"libigl not available: {message}", 'WARNING'
            )
        
        return {'FINISHED'}

class FO4_OT_ComputeBBWSkinning(Operator):
    """Compute skinning weights using libigl's Bounded Biharmonic Weights"""
    bl_idname = "fo4.compute_bbw_skinning"
    bl_label = "Compute BBW Skinning"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        # Find armature (either selected or parent)
        armature = None
        if obj.parent and obj.parent.type == 'ARMATURE':
            armature = obj.parent
        else:
            # Look for selected armature
            for selected_obj in context.selected_objects:
                if selected_obj.type == 'ARMATURE':
                    armature = selected_obj
                    break
        
        if not armature:
            self.report({'ERROR'}, "No armature found. Select mesh and armature, or parent mesh to armature")
            return {'CANCELLED'}
        
        # Check if libigl is available
        available, message = rignet_helpers.RigNetHelpers.check_libigl_available()
        if not available:
            self.report({'ERROR'}, f"libigl not available: {message}")
            self.report({'INFO'}, "Install with: pip install libigl")
            return {'CANCELLED'}
        
        # Compute BBW skinning
        success, message = rignet_helpers.RigNetHelpers.compute_bbw_skinning(obj, armature)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'WARNING'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'WARNING')
            return {'CANCELLED'}
        
        return {'FINISHED'}

# Export Operators

class FO4_OT_ExportMesh(Operator):
    """Export mesh to NIF format"""
    bl_idname = "fo4.export_mesh"
    bl_label = "Export Mesh"

    filepath: StringProperty(subtype='FILE_PATH')
    filter_glob: StringProperty(default="*.nif", options={'HIDDEN'})
    source_object: StringProperty(options={'HIDDEN'})

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        # Use the object captured at invoke time when possible
        if self.source_object:
            obj = context.scene.objects.get(self.source_object)
            if obj is None:
                self.report({'ERROR'}, f"Source object '{self.source_object}' no longer exists in the scene")
                return {'CANCELLED'}
        else:
            obj = context.active_object

        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        # avoid exporting a generated collision mesh by mistake
        if obj.get("fo4_collision") or obj.name.upper().endswith("_COLLISION") or obj.name.upper().startswith("UCX_"):
            self.report({'ERROR'}, "Active object looks like a collision mesh; select the original mesh instead")
            return {'CANCELLED'}

        success, message = export_helpers.ExportHelpers.export_mesh_to_nif(
            obj, self.filepath
        )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}
        
        return {'FINISHED'}
    
    def invoke(self, context, event):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        # avoid exporting a generated collision mesh by mistake
        if obj.get("fo4_collision") or obj.name.upper().endswith("_COLLISION") or obj.name.upper().startswith("UCX_"):
            self.report({'ERROR'}, "Active object looks like a collision mesh; select the original mesh instead")
            return {'CANCELLED'}
        # Store the name now so execute() can find it after the file dialog
        self.source_object = obj.name
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_SetCollisionType(Operator):
    """Choose and assign a collision category to the selected mesh"""
    bl_idname = "fo4.set_collision_type"
    bl_label = "Set Collision Type"
    bl_options = {'REGISTER', 'UNDO'}

    collision_type: EnumProperty(
        name="Collision Type",
        description="Category used when generating/exporting collision meshes",
        items=_COLLISION_TYPES,
        default='DEFAULT'
    )

    apply_to_all: bpy.props.BoolProperty(
        name="Apply to Selected",
        description="Also set the type for all selected mesh objects",
        default=False
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        # determine presets for chosen type
        sound = mesh_helpers.MeshHelpers._SOUND_PRESETS.get(self.collision_type)
        weight = mesh_helpers.MeshHelpers._WEIGHT_PRESETS.get(self.collision_type)
        objs = [obj]
        if self.apply_to_all:
            objs = [o for o in context.selected_objects if o.type == 'MESH']
        for o in objs:
            o.fo4_collision_type = self.collision_type
            if sound is not None:
                o["fo4_collision_sound"] = sound
            if weight is not None:
                o["fo4_collision_weight"] = weight
        self.report({'INFO'}, f"Collision type set to {self.collision_type} on {len(objs)} object(s)")
        return {'FINISHED'}

    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == 'MESH':
            inferred = mesh_helpers.MeshHelpers.infer_collision_type(obj)
            self.collision_type = mesh_helpers.MeshHelpers.resolve_collision_type(
                getattr(obj, 'fo4_collision_type', inferred), inferred)
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_ExportMeshWithCollision(Operator):
    """Generate a collision mesh and export both original and collision to NIF"""
    bl_idname = "fo4.export_mesh_with_collision"
    bl_label = "Export Mesh + Collision"

    filepath: StringProperty(subtype='FILE_PATH')
    filter_glob: StringProperty(default="*.nif", options={'HIDDEN'})
    source_object: StringProperty(options={'HIDDEN'})
    simplify_ratio: FloatProperty(
        name="Simplification",
        description="How much to simplify the generated collision mesh",
        default=0.25,
        min=0.01,
        max=1.0
    )
    collision_type: EnumProperty(
        name="Collision Type",
        description="Category of physics collision to create",
        items=_COLLISION_TYPES,
        default='DEFAULT'
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        # Use the object captured at invoke time when possible
        if self.source_object:
            obj = context.scene.objects.get(self.source_object)
            if obj is None:
                self.report({'ERROR'}, f"Source object '{self.source_object}' no longer exists in the scene")
                return {'CANCELLED'}
        else:
            obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        # record choice on the source object
        obj.fo4_collision_type = self.collision_type

        # create/update collision mesh
        try:
            collision = mesh_helpers.MeshHelpers.add_collision_mesh(
                obj,
                simplify_ratio=self.simplify_ratio,
                collision_type=self.collision_type
            )
            if self.collision_type in ('NONE','GRASS','MUSHROOM'):
                # nothing to build, skip but still proceed to export
                collision = None
        except Exception as e:
            self.report({'ERROR'}, f"Collision generation failed: {e}")
            return {'CANCELLED'}

        # perform export which will automatically include any collision mesh found
        success, message = export_helpers.ExportHelpers.export_mesh_to_nif(obj, self.filepath)
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}
        
        return {'FINISHED'}
    
    def invoke(self, context, event):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        # Store the name now so execute() can find it after the file dialog
        self.source_object = obj.name
        inferred = mesh_helpers.MeshHelpers.infer_collision_type(obj)
        self.collision_type = mesh_helpers.MeshHelpers.resolve_collision_type(
            getattr(obj, 'fo4_collision_type', inferred), inferred)
        if self.simplify_ratio == 0.25:
            self.simplify_ratio = mesh_helpers.MeshHelpers._TYPE_DEFAULT_RATIOS.get(self.collision_type, 0.25)
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

class FO4_OT_ExportAll(Operator):
    """Export complete mod"""
    bl_idname = "fo4.export_all"
    bl_label = "Export Complete Mod"
    
    directory: StringProperty(subtype='DIR_PATH')
    
    def execute(self, context):
        success, results = export_helpers.ExportHelpers.export_complete_mod(
            context.scene, self.directory
        )
        
        if success:
            info_msg = f"Exported {len(results['meshes'])} meshes"
            if results.get('skipped'):
                info_msg += f", skipped {len(results['skipped'])} collision meshes"
            self.report({'INFO'}, info_msg)
            notification_system.FO4_NotificationSystem.notify(
                "Mod exported successfully!", 'INFO'
            )
        else:
            self.report({'ERROR'}, "Export failed")
            return {'CANCELLED'}
        
        return {'FINISHED'}
    
    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

class FO4_OT_ExportCKAssetBundle(Operator):
    """Export selected meshes and linked files to CK's Data folder layout."""
    bl_idname = "fo4.export_ck_asset_bundle"
    bl_label = "Export CK Asset Bundle"
    bl_options = {'REGISTER'}

    directory: StringProperty(
        name="FO4 Data Folder",
        description="Fallout 4 Data folder root (contains Meshes/Materials/Textures)",
        subtype='DIR_PATH',
    )
    mod_subpath: StringProperty(
        name="Mod Subpath",
        description=r"Relative folder under Meshes/Materials/Textures (e.g. MyMod/Forest)",
        default="MyMod",
    )
    selected_only: BoolProperty(
        name="Selected Meshes Only",
        description="Export only selected mesh objects",
        default=True,
    )
    export_bgsm: BoolProperty(
        name="Export BGSM",
        description="Export BGSM file(s) for each mesh material",
        default=True,
    )
    copy_textures: BoolProperty(
        name="Copy Linked Textures",
        description="Copy linked Diffuse/Normal/Specular/Glow/EnvMap textures",
        default=True,
    )

    def _iter_target_meshes(self, context):
        if self.selected_only:
            return [o for o in context.selected_objects if o.type == 'MESH']
        return [o for o in context.scene.objects if o.type == 'MESH']

    @staticmethod
    def _safe_name(name: str) -> str:
        safe = "".join(c if c.isalnum() or c in "._-" else "_" for c in (name or "Asset"))
        return safe.strip("._") or "Asset"

    @staticmethod
    def _collect_material_texture_paths(mat) -> list[str]:
        if mat is None or not getattr(mat, "use_nodes", False) or not mat.node_tree:
            return []
        wanted = {"Diffuse", "Normal", "Specular", "Glow", "EnvMap", "Environment"}
        paths = []
        for node in mat.node_tree.nodes:
            if node.type != 'TEX_IMAGE':
                continue
            if node.name not in wanted and node.label not in wanted:
                continue
            img = getattr(node, "image", None)
            if not img:
                continue
            p = getattr(img, "filepath", "") or ""
            if p:
                paths.append(bpy.path.abspath(p))
        return paths

    def execute(self, context):
        if not self.directory:
            self.report({'ERROR'}, "Select a FO4 Data folder")
            return {'CANCELLED'}

        objs = self._iter_target_meshes(context)
        if not objs:
            self.report({'ERROR'}, "No mesh objects to export")
            return {'CANCELLED'}

        import shutil
        data_root = bpy.path.abspath(self.directory)
        sub = (self.mod_subpath or "MyMod").strip().strip("/\\")
        meshes_dir = _os.path.join(data_root, "Meshes", sub)
        mats_dir = _os.path.join(data_root, "Materials", sub)
        tex_dir = _os.path.join(data_root, "Textures", sub)
        for d in (meshes_dir, mats_dir, tex_dir):
            _os.makedirs(d, exist_ok=True)

        n_mesh_ok = 0
        n_bgsm_ok = 0
        n_tex_ok = 0
        warns = []
        copied_src = set()

        for obj in objs:
            safe_obj = self._safe_name(obj.name)
            mesh_path = _os.path.join(meshes_dir, f"{safe_obj}.nif")
            ok, msg = export_helpers.ExportHelpers.export_mesh_to_nif(obj, mesh_path)
            if ok:
                n_mesh_ok += 1
            else:
                warns.append(f"{obj.name}: NIF export failed ({msg})")

            if self.export_bgsm and bgsm_helpers and obj.data.materials:
                try:
                    results = bgsm_helpers.export_bgsm_for_object(obj, mats_dir, all_slots=False)
                    n_bgsm_ok += sum(1 for r_ok, _ in results if r_ok)
                    for r_ok, r_msg in results:
                        if not r_ok:
                            warns.append(f"{obj.name}: BGSM warning ({r_msg})")
                except Exception as exc:
                    warns.append(f"{obj.name}: BGSM export error ({exc})")

            if self.copy_textures and obj.data.materials:
                for mat in obj.data.materials:
                    for src in self._collect_material_texture_paths(mat):
                        src_norm = _os.path.normcase(_os.path.normpath(src))
                        if src_norm in copied_src:
                            continue
                        if not _os.path.isfile(src):
                            warns.append(f"{obj.name}: texture missing ({src})")
                            continue
                        try:
                            dst = _os.path.join(tex_dir, _os.path.basename(src))
                            shutil.copy2(src, dst)
                            copied_src.add(src_norm)
                            n_tex_ok += 1
                        except Exception as exc:
                            warns.append(f"{obj.name}: texture copy failed ({src} → {exc})")

        summary = (
            f"CK bundle export: {n_mesh_ok}/{len(objs)} mesh(es), "
            f"{n_bgsm_ok} BGSM file(s), {n_tex_ok} texture(s)"
        )
        self.report({'INFO' if not warns else 'WARNING'}, summary)
        if warns:
            for w in warns[:10]:
                self.report({'WARNING'}, w)
            if len(warns) > 10:
                self.report({'WARNING'}, f"... and {len(warns) - 10} more warning(s)")
            print("CK ASSET BUNDLE WARNINGS:")
            for w in warns:
                print(f"  - {w}")
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                summary, 'INFO' if not warns else 'WARNING'
            )
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}

class FO4_OT_ExportSceneAsNif(Operator):
    """Export the entire scene – all meshes with their collision proxies – as a single NIF file.

    This is the primary workflow for plant/vegetation scenes:
    import a NIF, add collision to the objects that need it, then use this
    operator to export everything back out as one game-ready NIF.
    """
    bl_idname = "fo4.export_scene_as_nif"
    bl_label = "Export Scene as NIF"

    filepath: StringProperty(subtype='FILE_PATH')
    filter_glob: StringProperty(default="*.nif", options={'HIDDEN'})

    @classmethod
    def poll(cls, context):
        return any(
            obj.type == 'MESH' and not (
                obj.get("fo4_collision")
                or obj.name.upper().startswith("UCX_")
                or obj.name.upper().endswith("_COLLISION")
            )
            for obj in context.scene.objects
        )

    def execute(self, context):
        success, message = export_helpers.ExportHelpers.export_scene_as_single_nif(
            context.scene, self.filepath
        )
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ValidateExport(Operator):
    """Validate before export"""
    bl_idname = "fo4.validate_export"
    bl_label = "Validate Before Export"
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}
        
        success, issues = export_helpers.ExportHelpers.validate_before_export(obj)
        
        if success:
            self.report({'INFO'}, "Object is ready for export!")
            notification_system.FO4_NotificationSystem.notify(
                "Validation passed! Ready to export.", 'INFO'
            )
        else:
            self.report({'WARNING'}, "Validation found issues:")
            for issue in issues:
                self.report({'WARNING'}, f"  - {issue}")
                notification_system.FO4_NotificationSystem.notify(issue, 'WARNING')
        
        return {'FINISHED'}

# Image to Mesh Operators

























# Installation Operators ----------------------------------------------------










class FO4_OT_ExportAnimationHavok2FBX(Operator):
    """Export the active armature animation to FBX and optionally convert to HKX via ck-cmd or Havok2FBX."""
    bl_idname = "fo4.export_animation_havok2fbx"
    bl_label = "Export Animation (FBX → HKX)"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        import os
        import tempfile

        scene = context.scene
        obj = context.active_object

        if obj is None or obj.type != 'ARMATURE':
            self.report({'ERROR'}, "Select an armature object before exporting.")
            return {'CANCELLED'}

        # Read export settings from scene properties
        anim_type = scene.fo4_havok_anim_type
        fps = scene.fo4_havok_fps
        loop = scene.fo4_havok_loop
        root_motion = scene.fo4_havok_root_motion
        bake_anim = scene.fo4_havok_bake_anim
        key_all_bones = scene.fo4_havok_key_all_bones
        apply_transforms = scene.fo4_havok_apply_transforms
        scale = scene.fo4_havok_scale
        output_dir = bpy.path.abspath(scene.fo4_havok_output_dir).strip()
        anim_name_override = scene.fo4_havok_anim_name.strip()
        simplify_value = scene.fo4_havok_simplify_value
        force_frame_range = scene.fo4_havok_force_frame_range
        skeleton_path = bpy.path.abspath(
            getattr(scene, "fo4_havok_skeleton_path", "")
        ).strip()

        # Resolve animation name
        anim_name = anim_name_override
        if not anim_name:
            if obj.animation_data and obj.animation_data.action:
                anim_name = obj.animation_data.action.name
            else:
                anim_name = obj.name + "_anim"

        # Resolve output directory
        if not output_dir:
            output_dir = tempfile.gettempdir()
        os.makedirs(output_dir, exist_ok=True)

        fbx_path = os.path.join(output_dir, anim_name + ".fbx")
        hkx_path = os.path.join(output_dir, anim_name + ".hkx")

        # Determine frame range
        if force_frame_range and obj.animation_data and obj.animation_data.action:
            action = obj.animation_data.action
            frame_start = int(action.frame_range[0])
            frame_end = int(action.frame_range[1])
        else:
            frame_start = scene.frame_start
            frame_end = scene.frame_end

        # Temporarily set the scene FPS so the FBX file embeds the correct rate
        orig_fps = scene.render.fps
        orig_fps_base = scene.render.fps_base
        scene.render.fps = fps
        scene.render.fps_base = 1.0

        # Optionally apply transforms to a temporary copy so the source is not modified
        export_obj = obj
        temp_copy = None
        if apply_transforms:
            try:
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                context.view_layer.objects.active = obj
                bpy.ops.object.duplicate(linked=False)
                temp_copy = context.active_object
                bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
                export_obj = temp_copy
            except Exception:
                # If duplicating/applying fails, fall back to exporting the original
                if temp_copy is not None:
                    try:
                        bpy.data.objects.remove(temp_copy, do_unlink=True)
                    except Exception:
                        pass
                temp_copy = None
                export_obj = obj

        # Export FBX with animation settings
        try:
            bpy.ops.object.select_all(action='DESELECT')
            export_obj.select_set(True)
            context.view_layer.objects.active = export_obj

            bpy.ops.export_scene.fbx(
                filepath=fbx_path,
                use_selection=True,
                apply_scale_options='FBX_SCALE_ALL',
                axis_forward='-Z',
                axis_up='Y',
                apply_unit_scale=True,
                global_scale=scale,
                object_types={'ARMATURE'},
                use_mesh_modifiers=False,
                add_leaf_bones=False,
                primary_bone_axis='Y',
                secondary_bone_axis='X',
                use_armature_deform_only=not key_all_bones,
                bake_anim=bake_anim,
                bake_anim_use_all_bones=key_all_bones,
                bake_anim_use_nla_strips=bake_anim,
                bake_anim_use_all_actions=False,
                bake_anim_force_startend_keying=True,
                bake_anim_step=1.0,
                bake_anim_simplify_factor=simplify_value,
                path_mode='AUTO',
            )
        except Exception as exc:
            self.report({'ERROR'}, f"FBX export failed: {exc}")
            return {'CANCELLED'}
        finally:
            # Restore scene FPS and remove any temp copy regardless of success
            scene.render.fps = orig_fps
            scene.render.fps_base = orig_fps_base
            if temp_copy is not None:
                try:
                    bpy.data.objects.remove(temp_copy, do_unlink=True)
                except Exception:
                    pass

        self.report({'INFO'}, f"FBX exported: {fbx_path}")

        # Attempt HKX conversion — try ck-cmd first (open-source, no SDK required),
        # then fall back to Havok2FBX if configured.
        ckcmd_dir = preferences.get_ckcmd_path()
        havok_dir = preferences.get_havok2fbx_path()

        if ckcmd_dir and skeleton_path and os.path.isfile(skeleton_path):
            from . import tool_installers
            if tool_installers.check_ckcmd(ckcmd_dir):
                # Locate ck-cmd.exe (may be in a sub-folder)
                from pathlib import Path as _Path
                _ckcmd_root = _Path(ckcmd_dir)
                exe_direct = _ckcmd_root / "ck-cmd.exe"
                if exe_direct.is_file():
                    exe = str(exe_direct)
                else:
                    _found = next(_ckcmd_root.rglob("ck-cmd.exe"), None)
                    exe = str(_found) if _found else str(exe_direct)

                cmd = [exe, "importanimation", skeleton_path, fbx_path,
                       f"--e={output_dir}"]

                def _convert_ckcmd(cmd=cmd, exe=exe, fbx_path=fbx_path, hkx_path=hkx_path):
                    import subprocess
                    try:
                        result = subprocess.run(
                            cmd,
                            capture_output=True,
                            text=True,
                            timeout=120,
                        )
                        if result.returncode == 0:
                            msg, level = f"HKX created via ck-cmd: {output_dir}", 'INFO'
                        else:
                            err = (result.stderr or result.stdout or "unknown error").strip()
                            msg = f"ck-cmd conversion failed: {err}. FBX saved at {fbx_path}"
                            level = 'WARNING'
                    except FileNotFoundError:
                        msg = f"ck-cmd.exe not found at {exe}. FBX saved at {fbx_path}"
                        level = 'WARNING'
                    except subprocess.TimeoutExpired:
                        msg = f"ck-cmd timed out. FBX saved at {fbx_path}"
                        level = 'WARNING'
                    except Exception as exc:
                        msg = f"ck-cmd error: {exc}. FBX saved at {fbx_path}"
                        level = 'WARNING'

                    def _notify(msg=msg, level=level):
                        notification_system.FO4_NotificationSystem.notify(msg, level)
                        print(f"CK-CMD [{level}]", msg)

                    bpy.app.timers.register(_notify, first_interval=0.0)

                threading.Thread(target=_convert_ckcmd, daemon=True).start()
                self.report({'INFO'}, "HKX conversion (ck-cmd) started in background - Blender stays responsive")
            else:
                self.report({'WARNING'}, f"ck-cmd binaries missing from {ckcmd_dir}. FBX saved at {fbx_path}")

        elif ckcmd_dir and not skeleton_path:
            self.report({'WARNING'},
                        "ck-cmd is configured but no Skeleton HKX path is set — "
                        f"set it in the Havok panel or preferences. FBX saved at {fbx_path}.")

        elif havok_dir:
            from . import tool_installers
            if tool_installers.check_havok2fbx(havok_dir):
                exe = os.path.join(havok_dir, "havok2fbx.exe")
                cmd = [exe, fbx_path, hkx_path]
                # Pass animation type flag if tool supports it
                if anim_type != 'CHARACTER':
                    cmd += ["--type", anim_type.lower()]
                if loop:
                    cmd += ["--loop"]
                if root_motion:
                    cmd += ["--rootmotion"]
                cmd += ["--fps", str(fps)]

                def _convert(cmd=cmd, exe=exe, fbx_path=fbx_path, hkx_path=hkx_path):
                    import subprocess
                    try:
                        result = subprocess.run(
                            cmd,
                            capture_output=True,
                            text=True,
                            timeout=120,
                        )
                        if result.returncode == 0:
                            msg, level = f"HKX created: {hkx_path}", 'INFO'
                        else:
                            err = (result.stderr or result.stdout or "unknown error").strip()
                            msg = f"havok2fbx conversion failed: {err}. FBX saved at {fbx_path}"
                            level = 'WARNING'
                    except FileNotFoundError:
                        msg = f"havok2fbx.exe not found at {exe}. FBX saved at {fbx_path}"
                        level = 'WARNING'
                    except subprocess.TimeoutExpired:
                        msg = f"havok2fbx timed out. FBX saved at {fbx_path}"
                        level = 'WARNING'
                    except Exception as exc:
                        msg = f"havok2fbx error: {exc}. FBX saved at {fbx_path}"
                        level = 'WARNING'

                    def _notify(msg=msg, level=level):
                        notification_system.FO4_NotificationSystem.notify(msg, level)
                        print(f"HAVOK2FBX [{level}]", msg)

                    bpy.app.timers.register(_notify, first_interval=0.0)

                threading.Thread(target=_convert, daemon=True).start()
                self.report({'INFO'}, "HKX conversion started in background - Blender stays responsive")
            else:
                self.report({'WARNING'}, f"Havok2FBX binaries missing from {havok_dir}. FBX saved at {fbx_path}")
        else:
            self.report({'INFO'},
                        f"No HKX converter configured — FBX saved at {fbx_path}. "
                        "Install ck-cmd from the Setup & Status panel and set a Skeleton HKX path "
                        "to enable automatic HKX conversion.")

        return {'FINISHED'}








class FO4_OT_ConvertToFallout4(Operator):
    """Convert selected asset to Fallout 4 format (one-click conversion)"""
    bl_idname = "fo4.convert_to_fallout4"
    bl_label = "Convert to Fallout 4"
    bl_description = (
        "One-click conversion: Prepares mesh, converts materials to FO4, "
        "converts textures to DDS, and validates for NIF export"
    )
    bl_options = {'REGISTER', 'UNDO'}

    convert_textures: BoolProperty(
        name="Convert Textures to DDS",
        description="Automatically convert textures to DDS format for FO4",
        default=True,
    )

    create_collision: BoolProperty(
        name="Generate Collision Mesh",
        description="Create UCX_ collision mesh from simplified geometry",
        default=False,
    )

    def execute(self, context):
        from . import mesh_helpers, texture_helpers, nvtt_helpers

        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        messages = []
        warnings = []

        try:
            # Step 1: Mesh Preparation
            self.report({'INFO'}, f"Converting {obj.name} to Fallout 4 format...")
            messages.append(f"Converting: {obj.name}")

            # Apply scale and rotation transforms
            if any([s != 1.0 for s in obj.scale]) or any([r != 0.0 for r in obj.rotation_euler]):
                bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
                messages.append("✓ Applied transforms")

            # Optimize mesh for FO4
            success, msg = mesh_helpers.MeshHelpers.optimize_mesh(obj)
            if success:
                messages.append(f"✓ Mesh optimized: {msg}")
            else:
                warnings.append(f"⚠ Optimization warning: {msg}")

            # Validate mesh for FO4
            success, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
            if not success:
                for issue in issues:
                    warnings.append(f"⚠ {issue}")
            else:
                messages.append("✓ Mesh validated for FO4")

            # Step 2: Material Setup
            if not obj.data.materials:
                mat = texture_helpers.TextureHelpers.setup_fo4_material(obj)
                messages.append("✓ Created FO4 material")
            else:
                messages.append("✓ Materials present")

            # Step 3: Texture Conversion (if enabled)
            if self.convert_textures:
                # Check if nvtt or texconv available
                from . import preferences
                nvtt_path = preferences.get_configured_nvcompress_path()
                texconv_path = preferences.get_configured_texconv_path()

                if nvtt_path or texconv_path:
                    # Get temporary output directory
                    import tempfile
                    temp_dir = tempfile.mkdtemp(prefix="fo4_textures_")

                    try:
                        success, msg, converted = nvtt_helpers.NVTTHelpers.convert_object_textures(
                            obj, temp_dir, preferred_tool='auto'
                        )
                        if success:
                            messages.append(f"✓ Converted textures to DDS: {msg}")
                        else:
                            warnings.append(f"⚠ Texture conversion: {msg}")
                    except Exception as e:
                        warnings.append(f"⚠ Texture conversion failed: {str(e)}")
                else:
                    warnings.append("⚠ NVTT/texconv not installed - skipping texture conversion")

            # Step 4: Collision Mesh (if enabled)
            if self.create_collision:
                try:
                    inferred = mesh_helpers.MeshHelpers.infer_collision_type(obj)
                    ctype = mesh_helpers.MeshHelpers.resolve_collision_type(
                        getattr(obj, 'fo4_collision_type', inferred), inferred)
                    if ctype in ('NONE', 'GRASS', 'MUSHROOM'):
                        warnings.append(
                            f"⚠ Collision skipped: '{ctype}' type has no collision footprint. "
                            "To add collision, use Mesh Helpers → Collision → Change Type and "
                            "select DEFAULT, ROCK, TREE, BUILDING, or VEGETATION, then run "
                            "Generate Collision Mesh."
                        )
                    else:
                        collision_obj = mesh_helpers.MeshHelpers.add_collision_mesh(
                            obj, collision_type=ctype
                        )
                        if collision_obj:
                            messages.append(f"✓ Created collision mesh: {collision_obj.name}")
                        else:
                            warnings.append("⚠ Collision mesh helper returned nothing")
                except Exception as e:
                    warnings.append(f"⚠ Collision generation failed: {str(e)}")

            # Step 5: Final Validation
            success, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
            if not success:
                self.report({'WARNING'}, "Conversion complete but validation found issues")
                for issue in issues:
                    warnings.append(f"⚠ {issue}")
            else:
                messages.append("✓ Final validation passed")

            # Report results
            summary = "\n".join(messages)
            if warnings:
                summary += "\n\nWarnings:\n" + "\n".join(warnings)

            print("\n" + "="*70)
            print("FALLOUT 4 CONVERSION COMPLETE")
            print("="*70)
            print(summary)
            print("="*70)

            if warnings:
                self.report({'WARNING'}, f"Converted {obj.name} with {len(warnings)} warning(s) - see console")
            else:
                self.report({'INFO'}, f"Successfully converted {obj.name} to Fallout 4 format")

            notification_system.FO4_NotificationSystem.notify(
                f"{obj.name} ready for FO4 export", 'INFO'
            )
            return {'FINISHED'}

        except Exception as e:
            self.report({'ERROR'}, f"Conversion failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return {'CANCELLED'}


# FO4_OT_InstallPythonDeps is defined in setup_operators.py and registered
# before this module.  Do NOT redefine it here - a duplicate class body with
# the same bl_idname causes Blender's metaclass to displace the already-
# registered version on every module reload, making the N-panel button vanish.






# FO4_OT_SelfTest is defined in setup_operators.py and registered before this
# module.  Do NOT redefine it here - see the FO4_OT_InstallPythonDeps comment
# above for the same reason.

# Real-ESRGAN Operators



























class FO4_OT_ShowQuickReference(Operator):
    """Show FO4 modding quick reference cheat-sheet in Blender (no browser needed)."""
    bl_idname = "fo4.show_quick_reference"
    bl_label = "Quick Reference"
    bl_options = {'REGISTER'}

    def execute(self, context):
        REF = [
            "══════════════════════════════════════════════════",
            "  FALLOUT 4 MODDING QUICK REFERENCE",
            "══════════════════════════════════════════════════",
            "NIF EXPORT SETTINGS",
            "  Version : 20.2.0.7  |  User ver : 12  |  UV2 : 130",
            "  Geometry: BSTriShape  |  Shader: BSLightingShaderProperty",
            "  Tangents: ON  |  Scale correction: 1.0  |  Root: BSFadeNode",
            "",
            "TEXTURE FORMATS (DDS)",
            "  Diffuse (no alpha) : BC1 / DXT1",
            "  Diffuse (alpha)    : BC3 / DXT5",
            "  Normal map         : BC5 / ATI2",
            "  Specular / Gloss   : BC1 / DXT1",
            "  Power of 2 sizes only: 256, 512, 1024, 2048, 4096",
            "",
            "SCALE",
            "  1 Blender Unit = 1 NIF unit ≈ 1.4375 cm in-game",
            "  Human (male NPC)   = 1.28 BU tall",
            "  Human (female NPC) = 1.22 BU tall",
            "  Power Armor (T-60) = 1.72 BU tall",
            "  Door frame         = 1.10 × 1.80 BU (w × h)",
            "",
            "MESH REQUIREMENTS",
            "  ✓ Apply ALL transforms (Ctrl+A > All Transforms)",
            "  ✓ Triangulate faces (modifier or Ctrl+T in edit mode)",
            "  ✓ UV-unwrap every mesh (UV > Unwrap)",
            "  ✓ No loose vertices, no overlapping faces",
            "  ✓ Normals must point outward (Overlay > Face Orientation)",
            "  ✓ Vertex count per mesh: recommended <65 535",
            "",
            "EXPORT PATHS (relative to game Data folder)",
            r"  Meshes  : Data\Meshes\<mod>\<asset>.nif",
            r"  Textures: Data\Textures\<mod>\<asset>_d.dds (diffuse)",
            r"            Data\Textures\<mod>\<asset>_n.dds (normal)",
            r"            Data\Textures\<mod>\<asset>_s.dds (specular)",
            "",
            "CREATION KIT WORKFLOW",
            "  1. Export NIF → Data\\Meshes\\",
            "  2. Convert textures to DDS → Data\\Textures\\",
            "  3. Open CK → File > Data → check your ESP",
            "  4. Object Window > Static (or Armor/Weapon) > New",
            "  5. Set Model path, save as ESP, test in-game",
            "══════════════════════════════════════════════════",
        ]
        import sys
        print("\n" + "\n".join(REF) + "\n", file=sys.stdout)
        self.report({'INFO'}, "FO4 Quick Reference printed to System Console (Window > Toggle System Console)")
        return {'FINISHED'}


class FO4_OT_ShowFoliageLODChecklist(Operator):
    """Show a concise LOD/export checklist for heavy foliage sets."""
    bl_idname = "fo4.show_foliage_lod_checklist"
    bl_label = "Show Foliage LOD Checklist"
    bl_options = {'REGISTER'}

    def execute(self, context):
        lines = [
            "FO4 Foliage LOD + Export Checklist",
            "1) Keep hero foliage selective at 4K; use 2K/1K for background sets.",
            "2) Build LOD chain (LOD0-LOD3) and verify silhouette retention.",
            "3) Use Alpha Clip + Two-Sided vegetation material with DDS textures.",
            "4) Run Smart Wind + Export Prep and confirm diagnostics are export-ready.",
            "5) Export NIF + BGSM + textures into Data/Meshes|Materials|Textures.",
            "6) In CK: generate LOD and previs/precombine for dense worldspaces.",
        ]
        block_name = "FO4 Foliage LOD Checklist"
        text_block = bpy.data.texts.get(block_name)
        if text_block is None:
            text_block = bpy.data.texts.new(block_name)
        text_block.clear()
        text_block.write("\n".join(lines))
        self.report({'INFO'}, f"Checklist written to text block: {block_name}")
        return {'FINISHED'}


# NVIDIA GET3D Operators


# Instant-NGP Operators


# Image-to-3D Comparison and Status Operators


# Advanced Mesh Analysis and Repair Operators

class FO4_OT_AnalyzeMeshQuality(Operator):
    """Analyze mesh quality and identify issues"""
    bl_idname = "fo4.analyze_mesh_quality"
    bl_label = "Analyze Mesh Quality"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}
        
        # Analyze mesh
        scores, issues, details = advanced_mesh_helpers.AdvancedMeshHelpers.analyze_mesh_quality(obj)
        
        if scores is None:
            self.report({'ERROR'}, issues[0])
            return {'CANCELLED'}
        
        # Report results
        self.report({'INFO'}, f"Overall Quality: {scores['overall']:.1f}/100")
        
        print("\n" + "="*70)
        print("MESH QUALITY ANALYSIS")
        print("="*70)
        print(f"Object: {obj.name}")
        print(f"\nQuality Scores:")
        print(f"  Overall:  {scores['overall']:.1f}/100")
        print(f"  Topology: {scores['topology']:.1f}/100")
        print(f"  Geometry: {scores['geometry']:.1f}/100")
        print(f"  UV:       {scores['uv']:.1f}/100")
        print(f"\nMesh Statistics:")
        print(f"  Vertices: {details['vertex_count']}")
        print(f"  Edges:    {details['edge_count']}")
        print(f"  Faces:    {details['face_count']}")
        print(f"    - Tris:  {details['tris']}")
        print(f"    - Quads: {details['quads']}")
        print(f"    - N-gons: {details['ngons']}")
        print(f"\nIssues Found:")
        for issue in issues:
            print(f"  • {issue}")
        print("="*70 + "\n")
        
        notification_system.FO4_NotificationSystem.notify(
            f"Mesh quality: {scores['overall']:.1f}/100", 
            'INFO' if scores['overall'] > 70 else 'WARNING'
        )
        
        return {'FINISHED'}


class FO4_OT_AutoRepairMesh(Operator):
    """Automatically repair common mesh issues"""
    bl_idname = "fo4.auto_repair_mesh"
    bl_label = "Auto-Repair Mesh"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}
        
        # Repair mesh
        success, message, repairs = advanced_mesh_helpers.AdvancedMeshHelpers.auto_repair_mesh(obj)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                "Mesh repaired successfully", 'INFO'
            )
            
            print("\n" + "="*70)
            print("MESH REPAIR RESULTS")
            print("="*70)
            print(f"Object: {obj.name}")
            print(f"\nRepairs Made:")
            for key, value in repairs.items():
                print(f"  {key}: {value}")
            print("="*70 + "\n")
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}
        
        return {'FINISHED'}


class FO4_OT_SmartDecimate(Operator):
    """Intelligently reduce polygon count with feature preservation"""
    bl_idname = "fo4.smart_decimate"
    bl_label = "Smart Decimate"
    bl_options = {'REGISTER', 'UNDO'}
    
    method: EnumProperty(
        name="Method",
        items=[
            ('RATIO', "Ratio", "Use reduction ratio"),
            ('TARGET', "Target Count", "Target specific polygon count"),
        ],
        default='RATIO'
    )
    
    ratio: FloatProperty(
        name="Ratio",
        description="Reduction ratio (0.5 = 50% reduction)",
        default=0.5,
        min=0.01,
        max=1.0
    )
    
    target_poly_count: IntProperty(
        name="Target Poly Count",
        description="Target polygon count",
        default=10000,
        min=100,
        max=1000000
    )
    
    preserve_uvs: BoolProperty(
        name="Preserve UVs",
        description="Preserve UV seams during decimation",
        default=True
    )
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}
        
        # Decimate mesh
        if self.method == 'TARGET':
            success, message, stats = advanced_mesh_helpers.AdvancedMeshHelpers.smart_decimate(
                obj, target_poly_count=self.target_poly_count, preserve_uvs=self.preserve_uvs
            )
        else:
            success, message, stats = advanced_mesh_helpers.AdvancedMeshHelpers.smart_decimate(
                obj, ratio=self.ratio, preserve_uvs=self.preserve_uvs
            )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                f"Decimated: {stats['reduction_percent']:.1f}% reduction", 'INFO'
            )
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}
        
        return {'FINISHED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)
    
    def draw(self, context):
        layout = self.layout
        layout.prop(self, "method")
        if self.method == 'RATIO':
            layout.prop(self, "ratio")
        else:
            layout.prop(self, "target_poly_count")
        layout.prop(self, "preserve_uvs")


class FO4_OT_DecimateToFO4(Operator):
    """Reduce the active mesh to the FO4 target poly count set in the Image-to-3D panel.

    Shows the current triangle count alongside the target so you can judge
    how much reduction will happen before confirming.  Uses Smart Decimate
    with UV-seam preservation enabled.
    """
    bl_idname = "fo4.decimate_to_fo4"
    bl_label = "Decimate to FO4 Target"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        target = context.scene.fo4_imageto3d_target_poly

        if not advanced_mesh_helpers:
            self.report({'ERROR'}, "advanced_mesh_helpers unavailable - restart Blender")
            return {'CANCELLED'}

        current = len(obj.data.polygons)
        if current <= target:
            self.report({'INFO'}, f"Already at or below target ({current:,} tris ≤ {target:,})")
            return {'FINISHED'}

        success, message, stats = advanced_mesh_helpers.AdvancedMeshHelpers.smart_decimate(
            obj, target_poly_count=target, preserve_uvs=True
        )
        if success:
            after = stats.get('poly_count_after', '?')
            pct = stats.get('reduction_percent', 0)
            self.report(
                {'INFO'},
                f"Decimated: {current:,} → {after:,} tris ({pct:.1f}% reduction)",
            )
            notification_system.FO4_NotificationSystem.notify(
                f"Mesh ready for FO4: {after:,} tris", 'INFO'
            )
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=360)

    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        col = layout.column(align=True)

        if obj and obj.type == 'MESH':
            current = len(obj.data.polygons)
            target = context.scene.fo4_imageto3d_target_poly
            budget_ok = current <= 65535
            col.label(
                text=f"Current:  {current:,} tris",
                icon='CHECKMARK' if budget_ok else 'ERROR',
            )
            col.label(text=f"Target:   {target:,} tris  (FO4 hard limit: 65,535)", icon='INFO')
            if current > target:
                pct = 100.0 * (1.0 - target / current)
                col.label(text=f"Will remove ~{pct:.0f}% of faces", icon='MOD_DECIM')
        else:
            col.label(text="No mesh selected", icon='ERROR')

        layout.separator()
        layout.prop(context.scene, "fo4_imageto3d_target_poly")


class FO4_OT_SplitMeshPolyLimit(Operator):
    """Split the active mesh into sub-meshes each under the FO4 65,535-triangle limit"""
    bl_idname = "fo4.split_mesh_poly_limit"
    bl_label = "Split at Poly Limit"
    bl_options = {'REGISTER', 'UNDO'}

    tri_limit: IntProperty(
        name="Triangle Limit",
        description="Maximum triangles per output mesh (FO4 BSTriShape limit is 65,535)",
        default=65535,
        min=1000,
        max=65535,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        # Fast path: check if split is actually needed
        tri_estimate = sum(max(1, len(p.vertices) - 2) for p in obj.data.polygons)
        if tri_estimate <= self.tri_limit:
            self.report({'INFO'}, f"Mesh is already within limit ({tri_estimate:,} tris ≤ {self.tri_limit:,}) – no split needed")
            return {'FINISHED'}

        try:
            parts = mesh_helpers.MeshHelpers.split_mesh_at_poly_limit(obj, self.tri_limit)
        except Exception as e:
            self.report({'ERROR'}, f"Split failed: {e}")
            return {'CANCELLED'}

        msg = f"Split into {len(parts)} part(s): {', '.join(p.name for p in parts)}"
        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(
            f"Mesh split into {len(parts)} FO4-compatible parts", 'INFO'
        )

        print("\n" + "="*70)
        print("MESH SPLIT RESULTS")
        print("="*70)
        print(f"Source object:  {obj.name}  ({tri_estimate:,} estimated tris)")
        print(f"Parts produced: {len(parts)}")
        for part in parts:
            est = sum(max(1, len(p.vertices) - 2) for p in part.data.polygons)
            print(f"  {part.name}: ~{est:,} tris")
        print("="*70 + "\n")
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_GenerateLOD(Operator):
    """Generate Level of Detail mesh chain"""
    bl_idname = "fo4.generate_lod"
    bl_label = "Generate LOD Chain"
    bl_options = {'REGISTER', 'UNDO'}
    
    num_levels: IntProperty(
        name="LOD Levels",
        description="Number of LOD levels to generate",
        default=4,
        min=1,
        max=6
    )
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}
        
        # Generate LOD chain
        success, message, lod_objects = advanced_mesh_helpers.AdvancedMeshHelpers.generate_lod_chain(obj)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                f"Generated {len(lod_objects)} LOD levels", 'INFO'
            )
            
            print("\n" + "="*70)
            print("LOD GENERATION RESULTS")
            print("="*70)
            print(f"Source Object: {obj.name}")
            print(f"\nLOD Meshes Created:")
            for lod_obj, poly_count in lod_objects:
                print(f"  {lod_obj.name}: {poly_count} polygons")
            print("="*70 + "\n")
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}
        
        return {'FINISHED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_GenerateLODAndCollision(Operator):
    """Generate both a LOD chain and a collision mesh in one step.

    Treats the active object as LOD0 (full detail), creates LOD1–LOD4
    simplified copies, then builds the collision mesh from the lowest LOD
    (LOD4 / the most simplified copy) rather than re-decimating the full
    mesh.  This produces a tighter, more accurate collision shape and avoids
    unnecessary polygon reduction passes.  The recommended one-click workflow
    for static props and vegetation that need both distance rendering and
    physics collision in-game.
    """
    bl_idname = "fo4.generate_lod_and_collision"
    bl_label = "Generate LOD Chain + Collision"
    bl_options = {'REGISTER', 'UNDO'}

    collision_type: EnumProperty(
        name="Collision Type",
        description="Category of physics collision to create",
        items=_COLLISION_TYPES,
        default='DEFAULT'
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        results = []

        # --- LOD chain ---
        success, message, lod_objects = advanced_mesh_helpers.AdvancedMeshHelpers.generate_lod_chain(obj)
        if success:
            results.append(f"LOD: {len(lod_objects)} levels created")
            print("\n" + "="*70)
            print("LOD GENERATION")
            print("="*70)
            print(f"Source: {obj.name} (LOD0)")
            for lod_obj, poly_count in lod_objects:
                print(f"  {lod_obj.name}: {poly_count} polygons")
            print("="*70 + "\n")
        else:
            results.append(f"LOD failed: {message}")

        # --- Collision mesh from the lowest LOD ---
        # Using the most-simplified LOD as the collision base produces a
        # tighter shape than re-decimating the full mesh, and avoids an
        # extra polygon-reduction pass.
        obj.fo4_collision_type = self.collision_type
        if self.collision_type not in ('NONE', 'GRASS', 'MUSHROOM'):
            try:
                # Pick the lowest LOD object that was successfully generated.
                lowest_lod = lod_objects[-1][0] if lod_objects else None
                if lowest_lod:
                    collision_obj = mesh_helpers.MeshHelpers.collision_from_lod_mesh(
                        lowest_lod, obj, collision_type=self.collision_type
                    )
                    collision_source = lowest_lod.name
                else:
                    # Fallback: generate directly from source if no LOD was produced.
                    collision_obj = mesh_helpers.MeshHelpers.add_collision_mesh(
                        obj, collision_type=self.collision_type
                    )
                    collision_source = obj.name
                if collision_obj:
                    results.append(f"Collision: {collision_obj.name} built from {collision_source}")
                else:
                    results.append("Collision: skipped (type has no collision)")
            except Exception as e:
                results.append(f"Collision failed: {str(e)}")
        else:
            results.append(f"Collision: skipped for type '{self.collision_type}'")

        summary = " | ".join(results)
        self.report({'INFO'}, summary)
        notification_system.FO4_NotificationSystem.notify(summary, 'INFO')
        return {'FINISHED'}

    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == 'MESH':
            inferred = mesh_helpers.MeshHelpers.infer_collision_type(obj)
            self.collision_type = mesh_helpers.MeshHelpers.resolve_collision_type(
                getattr(obj, 'fo4_collision_type', inferred), inferred)
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CollisionFromLowestLOD(Operator):
    """Convert the lowest LOD mesh into a collision mesh for the active object.

    Finds the most-simplified LOD copy (e.g. ``{name}_LOD4``) for the
    active object and builds a convex-hull collision mesh from it.  Because
    the LOD mesh is already heavily decimated, no further polygon reduction
    is needed — only a convex hull is built and the rigid body is configured
    for FO4 Havok export.

    The resulting ``UCX_{name}`` collision object is:
      - Parented to the full-detail source mesh
      - Named ``UCX_{name}`` (FO4 / FBX collision naming convention)
      - Configured as a PASSIVE Rigid Body (bhkConvexVerticesShape)
      - Stamped with ``PYN_GAME = "FO4"`` for direct PyNifly export

    This is the recommended workflow when a LOD chain already exists.  If no
    LOD meshes are found, it falls back to generating collision from the full
    source mesh.
    """
    bl_idname = "fo4.collision_from_lowest_lod"
    bl_label = "Collision from Lowest LOD"
    bl_options = {'REGISTER', 'UNDO'}

    collision_type: EnumProperty(
        name="Collision Type",
        description="Category of physics collision to create",
        items=_COLLISION_TYPES,
        default='DEFAULT'
    )

    @classmethod
    def poll(cls, context):
        return context.active_object is not None and context.active_object.type == 'MESH'

    def execute(self, context):
        import re
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        if self.collision_type in ('NONE', 'GRASS', 'MUSHROOM'):
            self.report({'INFO'}, f"Collision skipped for type '{self.collision_type}'")
            return {'FINISHED'}

        # Strip any existing _LOD* suffix to get the base name.
        base_name = re.sub(r'_LOD\d+$', '', obj.name)

        # Find the lowest LOD available (prefer LOD4 → LOD3 → LOD2 → LOD1).
        scene_objects = {o.name: o for o in context.scene.objects if o.type == 'MESH'}
        lowest_lod = None
        lowest_level = 0
        found_lod_level = 0
        for i in range(4, 0, -1):
            candidate = scene_objects.get(f"{base_name}_LOD{i}")
            if candidate:
                lowest_lod = candidate
                found_lod_level = i
                break

        try:
            if lowest_lod:
                collision_obj = mesh_helpers.MeshHelpers.collision_from_lod_mesh(
                    lowest_lod, obj, collision_type=self.collision_type
                )
                source_label = f"{lowest_lod.name} (LOD{found_lod_level})"
            else:
                # No LOD chain found — fall back to decimating the full source.
                self.report({'WARNING'},
                    f"No LOD meshes found for '{base_name}' — building collision from full mesh")
                collision_obj = mesh_helpers.MeshHelpers.add_collision_mesh(
                    obj, collision_type=self.collision_type
                )
                source_label = obj.name

            if collision_obj:
                msg = f"Collision mesh '{collision_obj.name}' created from {source_label}"
                self.report({'INFO'}, msg)
                notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                print(f"\n{'='*70}\nCOLLISION FROM LOD\n{'='*70}")
                print(f"Source: {source_label}")
                print(f"Collision: {collision_obj.name} "
                      f"({len(collision_obj.data.vertices)} verts, "
                      f"type={self.collision_type})")
                print(f"{'='*70}\n")
                return {'FINISHED'}
            else:
                self.report({'ERROR'}, "Failed to create collision mesh")
                return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Collision from LOD failed: {str(e)}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == 'MESH':
            inferred = mesh_helpers.MeshHelpers.infer_collision_type(obj)
            self.collision_type = mesh_helpers.MeshHelpers.resolve_collision_type(
                getattr(obj, 'fo4_collision_type', inferred), inferred)
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_BatchGenerateLOD(Operator):
    """Generate a LOD chain for every selected mesh object.

    Each selected mesh is treated as LOD0.  Simplified LOD1–LOD4 copies are
    created and named ``{object}_LOD1`` … ``{object}_LOD4``.  Use *Export LOD
    Chain as NIF* afterwards to export the full chain to your mod's
    ``meshes/`` folder.
    """
    bl_idname = "fo4.batch_generate_lod"
    bl_label = "Batch Generate LOD"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        selected_meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not selected_meshes:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}

        success_count = 0
        fail_count = 0

        for obj in selected_meshes:
            context.view_layer.objects.active = obj
            try:
                ok, msg, lod_objects = advanced_mesh_helpers.AdvancedMeshHelpers.generate_lod_chain(obj)
                if ok:
                    success_count += 1
                    print(f"[LOD] {obj.name}: {len(lod_objects)} levels")
                    for lod_obj, poly_count in lod_objects:
                        print(f"  {lod_obj.name}: {poly_count} polygons")
                else:
                    fail_count += 1
                    self.report({'WARNING'}, f"{obj.name}: {msg}")
            except Exception as e:
                fail_count += 1
                self.report({'WARNING'}, f"{obj.name}: {str(e)}")

        msg = f"LOD generated for {success_count} mesh(es)"
        if fail_count:
            msg += f", {fail_count} failed"
        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        return {'FINISHED'}


class FO4_OT_BatchGenerateCollision(Operator):
    """Generate a collision mesh for every selected mesh object.

    Each selected mesh gets a ``UCX_`` collision object built with the
    Fallout 4–correct convex hull pipeline (same as *Generate Collision
    Mesh*).  Objects whose collision type is set to *GRASS*, *MUSHROOM*, or
    *NONE* are skipped automatically.
    """
    bl_idname = "fo4.batch_generate_collision"
    bl_label = "Batch Generate Collision"
    bl_options = {'REGISTER', 'UNDO'}

    collision_type: EnumProperty(
        name="Collision Type",
        description="Collision type to apply to all selected meshes",
        items=_COLLISION_TYPES,
        default='DEFAULT'
    )

    use_per_object_type: BoolProperty(
        name="Use Per-Object Type",
        description=(
            "When enabled, each object's existing fo4_collision_type is used "
            "(inferred from name if not set).  When disabled, the Collision "
            "Type above is applied to every object"
        ),
        default=True,
    )

    def execute(self, context):
        selected_meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not selected_meshes:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}

        success_count = 0
        skip_count = 0
        fail_count = 0

        for obj in selected_meshes:
            context.view_layer.objects.active = obj
            try:
                if self.use_per_object_type:
                    inferred = mesh_helpers.MeshHelpers.infer_collision_type(obj)
                    ctype = mesh_helpers.MeshHelpers.resolve_collision_type(
                        getattr(obj, 'fo4_collision_type', inferred), inferred)
                else:
                    ctype = self.collision_type

                if ctype in ('NONE', 'GRASS', 'MUSHROOM'):
                    skip_count += 1
                    continue

                collision_obj = mesh_helpers.MeshHelpers.add_collision_mesh(
                    obj, collision_type=ctype
                )
                if collision_obj:
                    success_count += 1
                else:
                    skip_count += 1
            except Exception as e:
                fail_count += 1
                self.report({'WARNING'}, f"{obj.name}: {str(e)}")

        msg = f"Collision created for {success_count} mesh(es)"
        if skip_count:
            msg += f", {skip_count} skipped (no-collision type)"
        if fail_count:
            msg += f", {fail_count} failed"
        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_OptimizeUVs(Operator):
    """Re-unwrap and pack UV islands using the selected algorithm.

    Use this as a standalone 'Pack Islands' button when UV islands only need
    repacking, or choose a different algorithm to fully re-unwrap the mesh."""
    bl_idname = "fo4.optimize_uvs"
    bl_label = "Optimize UVs"
    bl_options = {'REGISTER', 'UNDO'}

    method: EnumProperty(
        name="Method",
        items=[
            ('MIN_STRETCH', "Minimum Stretch",
             "CONFORMAL (LSCM) initial layout + minimize_stretch to convergence "
             "(100 iterations) - lowest distortion, best texture match; "
             "Blender's recommended method for accuracy"),
            ('SMART', "Smart UV Project",
             "Automatic seam detection – recommended for most meshes"),
            ('ANGLE', "Angle-Based + Stretch Minimize",
             "Conformal unwrap with stretch-minimize pass – "
             "best for organic shapes where low distortion matters"),
            ('CUBE',  "Cube Projection",
             "Box projection – fastest; ideal for architecture"),
        ],
        default='MIN_STRETCH',
    )

    margin: FloatProperty(
        name="Margin",
        description="Space between UV islands",
        default=0.01,
        min=0.0,
        max=0.1,
    )
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj:
            self.report({'ERROR'}, "No object selected")
            return {'CANCELLED'}
        
        # Optimize UVs
        success, message = advanced_mesh_helpers.AdvancedMeshHelpers.optimize_uvs(
            obj, self.method, self.margin
        )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                "UVs optimized", 'INFO'
            )
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}
        
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# UV + Texture Workflow Operators

class FO4_OT_SetupUVWithTexture(Operator):
    """One-click UV unwrap + texture binding for Fallout 4 NIF export.

    Creates (or keeps) a UV map, unwraps the mesh, sets up a full FO4
    PBR material node tree, and binds the selected texture - all in one
    step. The viewport is automatically switched to Material Preview so
    you can see the result immediately. Use 'Edit UV Map' to fine-tune
    UV islands if the texture does not sit correctly."""
    bl_idname = "fo4.setup_uv_with_texture"
    bl_label = "Setup UV + Texture"
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(
        name="Texture File",
        description="Path to the texture file to bind (PNG, TGA, DDS …)",
        subtype='FILE_PATH',
    )

    filter_glob: StringProperty(
        default="*.png;*.jpg;*.jpeg;*.tga;*.tiff;*.bmp;*.dds;*.exr",
        options={'HIDDEN'},
    )

    texture_type: EnumProperty(
        name="Texture Type",
        description="Which FO4 material slot to bind the texture to",
        items=[
            ('DIFFUSE',  "Diffuse",      "Base colour / albedo texture"),
            ('NORMAL',   "Normal Map",   "Tangent-space normal map (_n)"),
            ('SPECULAR', "Specular Map", "Specular / smoothness map (_s)"),
            ('GLOW',     "Glow/Emissive","Emissive / glow mask (_g)"),
        ],
        default='DIFFUSE',
    )

    unwrap_method: EnumProperty(
        name="Unwrap Method",
        description="UV unwrapping algorithm to use",
        items=[
            ('MIN_STRETCH', "Minimum Stretch",
             "CONFORMAL (LSCM) initial layout + minimize_stretch to convergence "
             "(100 iterations) - lowest distortion, best texture match; "
             "Blender's recommended method for accuracy"),
            ('SMART',    "Smart UV Project",
             "Automatic seam detection – best for most meshes (recommended default)"),
            ('ANGLE',    "Angle-Based + Stretch Minimize",
             "Conformal unwrap: primes with Smart UV then refines with angle-based "
             "solver and a stretch-minimize pass – best for organic shapes and "
             "meshes where texture distortion matters"),
            ('CUBE',     "Cube Projection",
             "Box projection – fastest option; best for architecture and "
             "hard-surface objects with mostly flat faces"),
            ('EXISTING', "Keep Existing UVs",
             "Skip unwrap – only bind the texture to the current UV map"),
        ],
        default='MIN_STRETCH',
    )

    island_margin: FloatProperty(
        name="Island Margin",
        description=(
            "Gap between UV islands (0–10 %). 2 % is recommended for "
            "1024 × 1024 DDS textures to prevent mip-map bleed"
        ),
        default=0.02,
        min=0.0,
        max=0.1,
        subtype='FACTOR',
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "texture_type")
        layout.prop(self, "unwrap_method")
        layout.prop(self, "island_margin")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        success, message = mesh_helpers.MeshHelpers.setup_uv_with_texture(
            obj,
            self.filepath,
            self.texture_type,
            self.unwrap_method,
            self.island_margin,
        )

        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
            import os
            if self.filepath and os.path.splitext(self.filepath)[1].lower() != '.dds':
                self.report(
                    {'WARNING'},
                    "Non-DDS texture installed. Convert to DDS before exporting the NIF "
                    "(use 'Convert to DDS' in the Texture Helpers panel)."
                )
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}

        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ReUnwrapUV(Operator):
    """Re-unwrap the active mesh's UV map without changing its material or textures.

    Use this when the initial unwrap did not look right. Texture bindings
    are preserved - only the UV coordinates are recalculated."""
    bl_idname = "fo4.re_unwrap_uv"
    bl_label = "Re-Unwrap UV"
    bl_options = {'REGISTER', 'UNDO'}

    method: EnumProperty(
        name="Unwrap Method",
        description="UV unwrapping algorithm",
        items=[
            ('MIN_STRETCH', "Minimum Stretch",
             "CONFORMAL (LSCM) initial layout + minimize_stretch to convergence "
             "(100 iterations) - lowest distortion, best texture match; "
             "Blender's recommended method for accuracy"),
            ('SMART', "Smart UV Project",
             "Automatic seam detection – recommended for most meshes"),
            ('ANGLE', "Angle-Based + Stretch Minimize",
             "Conformal unwrap with stretch-minimize pass – "
             "best for organic shapes where low distortion matters"),
            ('CUBE',  "Cube Projection",
             "Box projection – fastest; ideal for architecture"),
        ],
        default='MIN_STRETCH',
    )

    island_margin: FloatProperty(
        name="Island Margin",
        description="Gap between UV islands",
        default=0.02,
        min=0.0,
        max=0.1,
        subtype='FACTOR',
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "method")
        layout.prop(self, "island_margin")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        success, message = advanced_mesh_helpers.AdvancedMeshHelpers.optimize_uvs(
            obj, self.method, self.island_margin
        )

        if success:
            self.report({'INFO'}, f"UV re-unwrapped: {message}")
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'ERROR'}, message)
            return {'CANCELLED'}

        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_OpenUVEditing(Operator):
    """Enter UV Editing mode for the active mesh.

    Switches to Edit Mode with all faces selected so you can immediately
    see and adjust UV islands in the UV Editor (visible in Blender's built-in
    UV Editing workspace). Use G/R/S to move, rotate, and scale islands;
    press Tab or Ctrl+Tab to exit when done."""
    bl_idname = "fo4.open_uv_editing"
    bl_label = "Edit UV Map"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        if not obj.data.uv_layers:
            self.report({'ERROR'}, "Object has no UV map - run 'Setup UV + Texture' first")
            return {'CANCELLED'}

        # Switch to Edit Mode with all geometry selected so UV islands appear
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')

        # Try to switch to the built-in UV Editing workspace
        uv_ws = bpy.data.workspaces.get("UV Editing")
        if uv_ws:
            context.window.workspace = uv_ws

        self.report(
            {'INFO'},
            "UV Editing mode active. Use G/R/S to adjust islands. "
            "Tab to return to Object Mode when done."
        )
        return {'FINISHED'}


class FO4_OT_AskMossyForUVAdvice(Operator):
    """Ask Mossy's AI brain for UV map and texture setup advice.

    Analyses the active mesh's UV map, material node tree, and texture
    slots, then sends a structured report to Mossy's local AI server for
    prioritised, step-by-step recommendations.

    Mossy must be running on the desktop with its HTTP server enabled
    (port 8080 by default). If Mossy is not reachable, the built-in
    rules-based analysis is shown instead so you always get useful feedback."""
    bl_idname = "fo4.ask_mossy_uv_advice"
    bl_label = "Ask Mossy for UV/Texture Advice"
    bl_options = {'REGISTER'}

    _thread = None
    _result = None
    _timer = None
    _analysis = None
    _obj_name: str = ""
    _deadline = None

    def _start(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Run the fast (non-network) UV/texture analysis on the main thread
        self._analysis = advisor_helpers.AdvisorHelpers.analyze_uv_texture(obj)
        self._obj_name = obj.name
        self._result = None

        # Dispatch the slow Mossy HTTP call to a background thread
        import time
        self._deadline = time.monotonic() + 25  # 25s hard cap (> urllib timeout=15)
        self._thread = threading.Thread(target=self._run_mossy, daemon=True)
        self._thread.start()
        self._timer = context.window_manager.event_timer_add(0.1, window=context.window)
        context.window_manager.modal_handler_add(self)
        self.report({'INFO'}, "Asking Mossy for UV/texture advice…")
        return {'RUNNING_MODAL'}

    def _run_mossy(self):
        """Run in background thread: POST analysis to Mossy's HTTP /ask endpoint."""
        try:
            from . import mossy_link as _ml
            query = (
                "I am setting up a Fallout 4 mod mesh in Blender and need help with "
                "UV mapping and textures for NIF export. "
                "Review the analysis below and give me clear, numbered, "
                "beginner-friendly steps to fix any issues and get this ready for export."
            )
            self._result = _ml.ask_mossy(query, context_data=self._analysis, timeout=15)
        except Exception:
            self._result = None

    def invoke(self, context, event):
        return self._start(context)

    def execute(self, context):
        return self._start(context)

    def modal(self, context, event):
        if event.type != 'TIMER':
            return {'PASS_THROUGH'}
        import time
        if self._thread and self._thread.is_alive() and time.monotonic() < self._deadline:
            return {'PASS_THROUGH'}
        # Hard timeout reached - stop waiting and use whatever result we have
        context.window_manager.event_timer_remove(self._timer)
        self._timer = None
        self._display_result()
        return {'FINISHED'}

    def _display_result(self):
        advice = self._result
        if advice:
            self.report({'INFO'}, "Mossy responded - see Blender console for full advice")
            print("\n" + "=" * 60)
            print(f"MOSSY UV/TEXTURE ADVICE - {self._obj_name}")
            print("=" * 60)
            print(advice)
            print("=" * 60 + "\n")
            notification_system.FO4_NotificationSystem.notify(
                "Mossy: " + advice[:100] + ("…" if len(advice) > 100 else ""),
                'INFO'
            )
        else:
            # Mossy unavailable - fall back to built-in rules analysis
            analysis = self._analysis or {}
            issues = analysis.get("issues", [])
            suggestions = analysis.get("suggestions", [])
            lines = []
            if issues:
                lines.append("Issues found:")
                for i, iss in enumerate(issues, 1):
                    lines.append(f"  {i}. {iss}")
            if suggestions:
                lines.append("Suggestions:")
                for i, sug in enumerate(suggestions, 1):
                    lines.append(f"  {i}. {sug}")
            if not lines:
                lines.append("UV map and textures look good for FO4 export!")

            full = "\n".join(lines)
            print("\n" + "=" * 60)
            print(f"UV/TEXTURE ANALYSIS - {self._obj_name}")
            print("=" * 60)
            print(full)
            print("(Mossy not available - showing built-in analysis)")
            print("=" * 60 + "\n")
            self.report({'INFO'}, lines[0] if lines else "Analysis complete - see console")


class FO4_OT_MossyAutoFix(Operator):
    """Ask Mossy's AI to automatically fix mesh export issues.

    Sends a validation report to Mossy (running locally - no API key needed),
    which decides the correct Blender operations to run to automatically fix
    your mesh for Fallout 4 NIF export."""
    bl_idname = "fo4.mossy_auto_fix"
    bl_label = "Auto-Fix Mesh (Mossy AI)"
    bl_options = {'REGISTER', 'UNDO'}

    _thread = None
    _result = None
    _timer = None
    _issues = None
    _deadline = None

    def _start(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Run the fast (non-network) mesh validation on the main thread
        ok, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
        if ok:
            self.report({'INFO'}, "Mesh is completely valid. No fixes needed!")
            return {'FINISHED'}

        self._issues = issues
        self._result = None

        # Dispatch the slow Mossy HTTP call to a background thread
        import time
        self._deadline = time.monotonic() + 25  # 25s hard cap (> urllib timeout=15)
        self._thread = threading.Thread(target=self._run_mossy, daemon=True)
        self._thread.start()
        self._timer = context.window_manager.event_timer_add(0.1, window=context.window)
        context.window_manager.modal_handler_add(self)
        self.report({'INFO'}, "Asking Mossy for auto-fix instructions…")
        return {'RUNNING_MODAL'}

    def _run_mossy(self):
        """Run in background thread: send issues to Mossy, get back action list."""
        try:
            from . import mossy_link as _ml
            import json as _json
            query = (
                "You are an expert AI fixing Blender meshes for Fallout 4 NIF export. "
                "The following issues were found during validation of the mesh:\n"
                f"{_json.dumps(self._issues, indent=2)}\n\n"
                "Respond ONLY with a valid JSON array of action strings to fix these issues. "
                "Allowed actions: ['REMOVE_DOUBLES', 'DELETE_LOOSE', 'MAKE_MANIFOLD', "
                "'APPLY_TRANSFORMS', 'TRIANGULATE', 'SHADE_SMOOTH_AUTOSMOOTH']. "
                "Example response: [\"APPLY_TRANSFORMS\", \"DELETE_LOOSE\"]"
            )
            context_data = {"issues": self._issues}
            self._result = _ml.ask_mossy(query, context_data=context_data, timeout=15)
        except Exception:
            self._result = None

    def invoke(self, context, event):
        return self._start(context)

    def execute(self, context):
        return self._start(context)

    def modal(self, context, event):
        if event.type != 'TIMER':
            return {'PASS_THROUGH'}
        import time
        if self._thread and self._thread.is_alive() and time.monotonic() < self._deadline:
            return {'PASS_THROUGH'}
        # Hard timeout reached - stop waiting and use whatever result we have
        context.window_manager.event_timer_remove(self._timer)
        self._timer = None

        response = self._result
        if not response:
            self.report({'WARNING'}, "Mossy is not reachable. Make sure Mossy is running.")
            return {'CANCELLED'}

        # Strip markdown fences if present
        text = response.strip()
        if text.startswith("```json"):
            text = text.split("```json")[1].split("```")[0].strip()
        elif text.startswith("```"):
            text = text.split("```")[1].split("```")[0].strip()

        import json as _json
        try:
            actions = _json.loads(text)
        except _json.JSONDecodeError:
            self.report({'WARNING'}, f"Mossy returned unexpected format: {text[:200]}")
            return {'CANCELLED'}

        if not isinstance(actions, list):
            self.report({'WARNING'}, "Mossy returned invalid format (expected a list).")
            return {'CANCELLED'}

        if not actions:
            self.report({'INFO'}, "Mesh is completely valid. No fixes needed!")
            return {'FINISHED'}

        success_count = 0
        for act in actions:
            ok, msg = advisor_helpers.AdvisorHelpers.apply_quick_fix(context, act)
            if ok:
                success_count += 1

        self.report({'INFO'}, f"Applied {success_count} auto-fix(es) via Mossy AI.")
        return {'FINISHED'}


# ── Hybrid UV Workflow Operators ────────────────────────────────────────────
# These three operators implement the semi-automatic workflow for complex
# meshes (plants, foliage, armour with many panels, etc.) where neither pure
# automation nor pure manual work gives optimal results.  The intended steps:
#   1. FO4_OT_ScanUVComplexity  - understand how hard the mesh is to unwrap
#   2. FO4_OT_SmartSeamMark     - auto-mark seams, then refine interactively
#   3. FO4_OT_HybridUnwrap      - finalise with MIN_STRETCH, honouring seams
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_ScanUVComplexity(Operator):
    """Scan the active mesh for UV unwrapping complexity.

    Analyses topology (sharp edges, branching vertices, thin triangles) and
    returns a complexity score plus actionable recommendations.  Use this
    before deciding whether to unwrap automatically or to use the Hybrid
    workflow for complex organic meshes such as plants or foliage."""
    bl_idname = "fo4.scan_uv_complexity"
    bl_label = "Scan UV Complexity"
    bl_options = {'REGISTER'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        report = advanced_mesh_helpers.AdvancedMeshHelpers.scan_uv_complexity(obj)
        score = report['complexity_score']
        problems = report['problem_areas']
        recs = report['recommendations']

        # Always print the full report to the console
        print("\n" + "=" * 60)
        print(f"UV COMPLEXITY SCAN - {obj.name}")
        print("=" * 60)
        print(f"  Complexity score : {score}/100")
        print(f"  Seam candidates  : {report['seam_candidates']}")
        print(f"  Island estimate  : {report['island_estimate']}")
        if problems:
            print("  Issues detected:")
            for p in problems:
                print(f"    • {p}")
        print("  Recommendations:")
        for i, r in enumerate(recs, 1):
            print(f"    {i}. {r}")
        print("=" * 60 + "\n")

        # Notify in Blender header
        level = 'WARNING' if score >= 50 else 'INFO'
        first_rec = recs[0] if recs else "See console for full report."
        self.report(
            {level},
            f"Complexity {score}/100 - {first_rec}"
        )
        notification_system.FO4_NotificationSystem.notify(
            f"UV scan: {score}/100. See console.", level
        )
        return {'FINISHED'}


class FO4_OT_SmartSeamMark(Operator):
    """Auto-mark UV seams at sharp edges, then enter interactive Edge Select.

    Step 1 of the Hybrid UV Workflow for complex meshes.

    The operator:
      1. Analyses the mesh for dihedral angle fold lines and boundary edges.
      2. Marks those edges as UV seams (preserving any seams you have already
         placed by hand).
      3. Enters Edit Mode in Edge Select so you can immediately click any
         additional edge to mark/clear seams manually.

    When you are happy with the seam layout, exit Edit Mode (Tab) and run
    'Hybrid Unwrap' to produce the final UV map."""
    bl_idname = "fo4.smart_seam_mark"
    bl_label = "Scan & Mark Seams"
    bl_options = {'REGISTER', 'UNDO'}

    sharp_threshold: bpy.props.FloatProperty(
        name="Sharp Edge Angle",
        description=(
            "Dihedral angle (degrees) above which an edge is treated as a "
            "fold line and marked as a seam.  Lower values (e.g. 20) are "
            "better for high-detail foliage; 30 suits most hard-surface meshes"
        ),
        default=30.0,
        min=5.0,
        max=90.0,
    )

    clear_existing: bpy.props.BoolProperty(
        name="Clear Existing Seams",
        description=(
            "Remove all previously marked seams before adding new ones.  "
            "Leave disabled to keep hand-placed seams alongside auto seams"
        ),
        default=False,
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "sharp_threshold")
        layout.prop(self, "clear_existing")
        layout.separator()
        layout.label(
            text="After clicking OK: adjust seams in Edit Mode,",
            icon='INFO',
        )
        layout.label(text="then run 'Hybrid Unwrap' to finalise.")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        success, msg, total = advanced_mesh_helpers.AdvancedMeshHelpers.auto_mark_seams(
            obj,
            sharp_threshold_deg=self.sharp_threshold,
            clear_existing=self.clear_existing,
        )
        if not success:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}

        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(msg, 'INFO')

        # Drop the user into Edge Select edit mode so they can refine seams
        # immediately without a separate step.
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')

        # Switch to edge-select mode - the natural mode for seam editing
        bpy.context.tool_settings.mesh_select_mode = (False, True, False)

        # Navigate to UV Editing workspace if it exists so the seam preview
        # is immediately visible next to the 3-D viewport.
        uv_ws = bpy.data.workspaces.get("UV Editing")
        if uv_ws:
            context.window.workspace = uv_ws

        self.report(
            {'INFO'},
            f"{total} seam(s) marked. Click edges to add/remove seams "
            "(Edge menu > Mark/Clear Seam), then Tab to exit and run 'Hybrid Unwrap'."
        )
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_HybridUnwrap(Operator):
    """Finalise the UV map using Minimum Stretch, honouring all seams.

    Step 3 of the Hybrid UV Workflow for complex meshes.

    Runs the full Minimum Stretch pipeline (CONFORMAL initial layout +
    uv.minimize_stretch convergence pass) but does NOT reset the seams you
    have placed - every island boundary set by 'Scan & Mark Seams' or by
    hand is respected.  The result is the lowest-distortion unwrap achievable
    for your seam layout.

    After running, switch to Material Preview (press Z > Material Preview)
    or use 'Edit UV Map' to inspect the islands before exporting."""
    bl_idname = "fo4.hybrid_unwrap"
    bl_label = "Hybrid Unwrap"
    bl_options = {'REGISTER', 'UNDO'}

    island_margin: bpy.props.FloatProperty(
        name="Island Margin",
        description="Gap between UV islands (2 % recommended for 1024 DDS textures)",
        default=0.02,
        min=0.0,
        max=0.1,
        subtype='FACTOR',
    )

    stretch_iterations: bpy.props.IntProperty(
        name="Stretch Iterations",
        description=(
            "Number of minimize_stretch iterations.  100 reaches convergence "
            "for most meshes; increase to 200 for very high-poly foliage"
        ),
        default=100,
        min=10,
        max=500,
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "island_margin")
        layout.prop(self, "stretch_iterations")
        layout.separator()
        layout.label(
            text="Seams placed by 'Scan & Mark Seams' or by hand are kept.",
            icon='INFO',
        )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")

        prev_active = bpy.context.view_layer.objects.active
        bpy.context.view_layer.objects.active = obj

        try:
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')

            # CONFORMAL (LSCM) gives the best analytical starting layout for
            # the minimize_stretch relaxation; seams already present in the
            # mesh data are automatically honoured by uv.unwrap.
            bpy.ops.uv.unwrap(method='CONFORMAL', margin=self.island_margin)

            # Iterative relaxation - minimises stretch in every island.
            try:
                bpy.ops.uv.minimize_stretch(
                    fill_holes=True, iterations=self.stretch_iterations
                )
            except Exception:
                pass  # unavailable on older Blender builds

            # Pack islands into the 0–1 tile with rotation for tight fit.
            try:
                bpy.ops.uv.pack_islands(rotate=True, margin=self.island_margin)
            except TypeError:
                bpy.ops.uv.pack_islands(margin=self.island_margin)

        finally:
            try:
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                pass
            bpy.context.view_layer.objects.active = prev_active

        # Switch viewport to Material Preview so the texture is immediately
        # visible without any extra steps.
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for space in area.spaces:
                    if space.type == 'VIEW_3D':
                        space.shading.type = 'MATERIAL'
                break

        msg = (
            "Hybrid Unwrap complete - Minimum Stretch applied, seams preserved. "
            "Use 'Edit UV Map' to inspect islands, then export with "
            "'Export Mesh (.nif)'."
        )
        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# ── Face-Selective UV Unwrap Operators ──────────────────────────────────────
# These two operators implement the face-picking workflow the user requested:
#   1. FO4_OT_PickFacesForUnwrap   - enter Face Select in Edit Mode so the
#      user can click individual faces to choose what gets unwrapped.
#   2. FO4_OT_UnwrapSelectedFaces  - apply Minimum Stretch UV unwrap to only
#      the currently selected faces, leaving the rest of the UV map intact.
# ─────────────────────────────────────────────────────────────────────────────

class FO4_OT_PickFacesForUnwrap(Operator):
    """Enter Face Select mode so you can click faces to choose which ones to UV-unwrap.

    After clicking this button the 3-D viewport switches to Edit Mode with Face
    Select active and all faces deselected.  Click (or box/lasso select) the
    faces you want to unwrap, then click **'Unwrap Selected Faces'** to apply
    Minimum Stretch UV unwrapping to only those faces.

    Tip: hold Shift while clicking to add faces to the selection.  Press A to
    select all, Alt+A to deselect all.  When you are done, click 'Unwrap
    Selected Faces' - you do NOT need to exit Edit Mode first."""
    bl_idname = "fo4.pick_faces_for_unwrap"
    bl_label = "Pick Faces to Unwrap"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Enter Edit Mode and switch to Face Select with nothing selected so
        # the user can click exactly the faces they want to unwrap.
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.context.tool_settings.mesh_select_mode = (False, False, True)

        # Switch to UV Editing workspace if available so the UV and 3-D
        # viewports are both visible, which helps when selecting faces.
        uv_ws = bpy.data.workspaces.get("UV Editing")
        if uv_ws:
            try:
                context.window.workspace = uv_ws
            except Exception:
                pass

        self.report(
            {'INFO'},
            "Face Select active - click faces to select them, then click "
            "'Unwrap Selected Faces'."
        )
        return {'FINISHED'}


class FO4_OT_UnwrapSelectedFaces(Operator):
    """Apply Minimum Stretch UV unwrap to the currently selected faces only.

    Run this after selecting faces with **'Pick Faces to Unwrap'**.  Only the
    selected faces are unwrapped; the rest of the UV map is left unchanged.

    The unwrap uses the CONFORMAL (LSCM) method followed by a
    ``uv.minimize_stretch`` relaxation pass for the lowest possible UV
    distortion.  A UV layer is created automatically if none exists yet."""
    bl_idname = "fo4.unwrap_selected_faces"
    bl_label = "Unwrap Selected Faces"
    bl_options = {'REGISTER', 'UNDO'}

    island_margin: bpy.props.FloatProperty(
        name="Island Margin",
        description="Gap between UV islands (2 % is recommended for 1024 DDS textures)",
        default=0.02,
        min=0.0,
        max=0.1,
        subtype='FACTOR',
    )

    stretch_iterations: bpy.props.IntProperty(
        name="Stretch Iterations",
        description=(
            "Number of minimize_stretch iterations.  100 is enough for most "
            "meshes; increase to 200 for high-poly foliage."
        ),
        default=100,
        min=10,
        max=500,
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "island_margin")
        layout.prop(self, "stretch_iterations")
        layout.separator()
        layout.label(
            text="Only selected faces will be unwrapped.",
            icon='INFO',
        )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        # Must be in Edit Mode - enter it if the user clicked from Object Mode
        if context.mode != 'EDIT_MESH':
            if obj.type == 'MESH':
                bpy.ops.object.mode_set(mode='EDIT')
            else:
                self.report(
                    {'ERROR'},
                    "Enter Face Select Edit Mode first (use 'Pick Faces to Unwrap')"
                )
                return {'CANCELLED'}

        # Ensure Face Select so the unwrap operates on the visible selection
        bpy.context.tool_settings.mesh_select_mode = (False, False, True)

        # Create a UV layer if needed - the unwrap operator requires one
        if not obj.data.uv_layers:
            bpy.ops.object.mode_set(mode='OBJECT')
            obj.data.uv_layers.new(name="UVMap")
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.context.tool_settings.mesh_select_mode = (False, False, True)

        # CONFORMAL (LSCM) gives the best analytical starting point
        bpy.ops.uv.unwrap(method='CONFORMAL', margin=self.island_margin)

        # Iterative relaxation - minimises stretch in every island
        try:
            bpy.ops.uv.minimize_stretch(
                fill_holes=True, iterations=self.stretch_iterations
            )
        except Exception:
            pass  # unavailable on older Blender builds

        msg = (
            f"Unwrapped selected faces with Minimum Stretch "
            f"({self.stretch_iterations} iterations). "
            "Use 'Edit UV Map' to inspect the result."
        )
        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# Batch Processing Operators

class FO4_OT_BatchOptimizeMeshes(Operator):
    """Optimize all selected meshes for Fallout 4"""
    bl_idname = "fo4.batch_optimize_meshes"
    bl_label = "Batch Optimize Meshes"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        selected_objects = [obj for obj in context.selected_objects if obj.type == 'MESH']
        
        if not selected_objects:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        success_count = 0
        failed_count = 0
        
        for obj in selected_objects:
            context.view_layer.objects.active = obj
            try:
                success, message = mesh_helpers.MeshHelpers.optimize_mesh(obj)
                if success:
                    success_count += 1
                else:
                    failed_count += 1
                    self.report({'WARNING'}, f"{obj.name}: {message}")
            except Exception as e:
                failed_count += 1
                self.report({'WARNING'}, f"{obj.name}: {str(e)}")
        
        self.report({'INFO'}, f"Optimized {success_count} meshes, {failed_count} failed")
        notification_system.FO4_NotificationSystem.notify(
            f"Batch optimized {success_count} meshes", 'INFO'
        )
        return {'FINISHED'}


class FO4_OT_BatchValidateMeshes(Operator):
    """Validate all selected meshes for Fallout 4"""
    bl_idname = "fo4.batch_validate_meshes"
    bl_label = "Batch Validate Meshes"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        selected_objects = [obj for obj in context.selected_objects if obj.type == 'MESH']
        
        if not selected_objects:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        all_valid = True
        issues = []
        
        for obj in selected_objects:
            context.view_layer.objects.active = obj
            success, message = mesh_helpers.MeshHelpers.validate_mesh(obj)
            if not success:
                all_valid = False
                issues.append(f"{obj.name}: {message}")
        
        if all_valid:
            self.report({'INFO'}, f"All {len(selected_objects)} meshes are valid")
        else:
            self.report({'WARNING'}, f"Found issues in {len(issues)} meshes")
            for issue in issues[:5]:  # Show first 5 issues
                self.report({'WARNING'}, issue)
        
        return {'FINISHED'}


class FO4_OT_BatchExportMeshes(Operator):
    """Export all selected meshes to NIF with Fallout 4 settings"""
    bl_idname = "fo4.batch_export_meshes"
    bl_label = "Batch Export Meshes"
    bl_options = {'REGISTER'}

    directory: StringProperty(
        name="Export Directory",
        description="Directory to export meshes to",
        subtype='DIR_PATH'
    )

    def execute(self, context):
        if not self.directory:
            self.report({'ERROR'}, "No export directory specified")
            return {'CANCELLED'}

        selected_objects = [obj for obj in context.selected_objects if obj.type == 'MESH']

        if not selected_objects:
            self.report({'ERROR'}, "No mesh objects selected")
            return {'CANCELLED'}

        success_count = 0

        for obj in selected_objects:
            try:
                filepath = f"{self.directory}/{obj.name}.nif"
                success, message = export_helpers.ExportHelpers.export_mesh_to_nif(obj, filepath)
                if success:
                    success_count += 1
            except Exception as e:
                self.report({'WARNING'}, f"{obj.name}: {str(e)}")

        self.report({'INFO'}, f"Exported {success_count} of {len(selected_objects)} meshes")
        notification_system.FO4_NotificationSystem.notify(
            f"Batch exported {success_count} meshes", 'INFO'
        )
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


# Game Asset Import Operators

class FO4_OT_SetFO4AssetsPath(Operator):
    """Open a folder picker to set the Fallout 4 assets path directly from the panel"""
    bl_idname = "fo4.set_fo4_assets_path"
    bl_label = "Set FO4 Assets Path"
    bl_description = (
        "Choose the folder containing your extracted Fallout 4 meshes, "
        "materials, and textures (sets the path in addon preferences)"
    )

    directory: StringProperty(
        name="Assets Directory",
        description="Path to the Fallout 4 assets folder",
        subtype='DIR_PATH',
    )

    def execute(self, context):
        from . import preferences as _prefs
        prefs = _prefs.get_preferences()

        chosen = self.directory.rstrip("/\\")
        if not chosen:
            self.report({'ERROR'}, "No directory selected")
            return {'CANCELLED'}

        # Always save to scene property so the panel reflects the choice
        if hasattr(context.scene, 'fo4_assets_path'):
            context.scene.fo4_assets_path = chosen

        # Also persist in addon preferences when available
        if prefs is not None:
            prefs.fo4_assets_path = chosen

        # Auto-populate sub-paths when they are still empty
        from pathlib import Path as _Path
        root = _Path(chosen)
        for prop, subdir in (
            ('fo4_assets_mesh_path', 'meshes'),
            ('fo4_assets_tex_path',  'textures'),
            ('fo4_assets_mat_path',  'materials'),
        ):
            if not getattr(context.scene, prop, '').strip():
                candidate = root / subdir
                if candidate.is_dir():
                    setattr(context.scene, prop, str(candidate))
                    # Persist sub-path in preferences too
                    if prefs is not None:
                        setattr(prefs, prop, str(candidate))

        # Persist all path changes to disk
        if prefs is not None:
            try:
                bpy.ops.wm.save_userpref()
            except RuntimeError:
                _prefs.save_prefs_deferred()

        # Invalidate cached game dir so next detection uses the new path
        if fo4_game_assets:
            fo4_game_assets.FO4GameAssets._game_dir = None
            fo4_game_assets.FO4GameAssets._asset_index = None

        self.report({'INFO'}, f"FO4 assets path set to: {chosen}")
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                f"FO4 assets path set: {chosen}", 'INFO'
            )
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_SetFO4SubPath(Operator):
    """Open a folder picker to set an individual FO4 asset sub-folder (Meshes, Textures, or Materials)"""
    bl_idname = "fo4.set_fo4_sub_path"
    bl_label = "Set FO4 Sub-Folder"
    bl_description = (
        "Choose the folder for this asset type - the path is saved directly "
        "in the scene so you can use it straight away without opening Preferences"
    )

    slot: StringProperty(
        name="Slot",
        description="Which sub-path to set: 'meshes', 'textures', or 'materials'",
        default='meshes',
        options={'SKIP_SAVE'},
    )
    directory: StringProperty(subtype='DIR_PATH')

    _prop_map = {
        'meshes':    'fo4_assets_mesh_path',
        'textures':  'fo4_assets_tex_path',
        'materials': 'fo4_assets_mat_path',
    }

    def execute(self, context):
        chosen = self.directory.rstrip("/\\")
        if not chosen:
            self.report({'ERROR'}, "No folder selected")
            return {'CANCELLED'}

        prop = self._prop_map.get(self.slot, 'fo4_assets_mesh_path')
        if hasattr(context.scene, prop):
            setattr(context.scene, prop, chosen)

        # Persist in addon preferences so the path survives restarts
        from . import preferences as _prefs
        prefs = _prefs.get_preferences()
        if prefs is not None and hasattr(prefs, prop):
            setattr(prefs, prop, chosen)
            try:
                bpy.ops.wm.save_userpref()
            except RuntimeError:
                _prefs.save_prefs_deferred()

        if fo4_game_assets:
            fo4_game_assets.FO4GameAssets._asset_index = None

        self.report({'INFO'}, f"FO4 {self.slot} path set to: {chosen}")
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_SetUnityAssetsPath(Operator):
    """Open a folder picker to set the Unity assets path directly from the panel"""
    bl_idname = "fo4.set_unity_assets_path"
    bl_label = "Set Unity Assets Path"
    bl_description = (
        "Choose the folder containing your Unity project assets or exported models. "
        "The path is saved in addon preferences and the scene."
    )

    directory: StringProperty(
        name="Unity Assets Directory",
        description="Path to the Unity assets folder",
        subtype='DIR_PATH',
    )

    def execute(self, context):
        from . import preferences as _prefs
        prefs = _prefs.get_preferences()

        chosen = self.directory.rstrip("/\\")
        if not chosen:
            self.report({'ERROR'}, "No directory selected")
            return {'CANCELLED'}

        if hasattr(context.scene, 'fo4_unity_assets_path'):
            context.scene.fo4_unity_assets_path = chosen

        if prefs is not None:
            prefs.unity_assets_path = chosen
            try:
                bpy.ops.wm.save_userpref()
            except RuntimeError:
                _prefs.save_prefs_deferred()

        if unity_game_assets:
            unity_game_assets.UnityAssets._assets_dir = None

        self.report({'INFO'}, f"Unity assets path set to: {chosen}")
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                f"Unity assets path set: {chosen}", 'INFO'
            )
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_SetUnrealAssetsPath(Operator):
    """Open a folder picker to set the Unreal Engine assets path directly from the panel"""
    bl_idname = "fo4.set_unreal_assets_path"
    bl_label = "Set Unreal Assets Path"
    bl_description = (
        "Choose the folder containing your Unreal Engine project content or exported assets. "
        "The path is saved in addon preferences and the scene."
    )

    directory: StringProperty(
        name="Unreal Assets Directory",
        description="Path to the Unreal Engine assets folder",
        subtype='DIR_PATH',
    )

    def execute(self, context):
        from . import preferences as _prefs
        prefs = _prefs.get_preferences()

        chosen = self.directory.rstrip("/\\")
        if not chosen:
            self.report({'ERROR'}, "No directory selected")
            return {'CANCELLED'}

        if hasattr(context.scene, 'fo4_unreal_assets_path'):
            context.scene.fo4_unreal_assets_path = chosen

        if prefs is not None:
            prefs.unreal_assets_path = chosen
            try:
                bpy.ops.wm.save_userpref()
            except Exception:
                _prefs.save_prefs_deferred()

        if unreal_game_assets:
            unreal_game_assets.UnrealAssets._assets_dir = None

        self.report({'INFO'}, f"Unreal assets path set to: {chosen}")
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                f"Unreal assets path set: {chosen}", 'INFO'
            )
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ImportFO4AssetFile(Operator):
    """Import a mesh, texture, or material file from the game assets folder into Blender"""
    bl_idname = "fo4.import_fo4_asset_file"
    bl_label = "Import Game Asset"
    bl_description = (
        "Browse to a mesh (FBX/OBJ/NIF), texture (DDS/PNG/TGA), or material file "
        "from your Fallout 4 (or other game) assets folder and import it into Blender"
    )
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(
        name="File Path",
        description="Path to the asset file to import",
        subtype='FILE_PATH',
    )
    filter_glob: StringProperty(
        default="*.fbx;*.obj;*.nif;*.dds;*.png;*.tga;*.bmp;*.jpg;*.jpeg",
        options={'HIDDEN'},
    )

    def execute(self, context):
        import os

        if not self.filepath:
            self.report({'ERROR'}, "No file selected")
            return {'CANCELLED'}

        filepath = bpy.path.abspath(self.filepath)
        if not os.path.isfile(filepath):
            self.report({'ERROR'}, f"File not found: {filepath}")
            return {'CANCELLED'}

        ext = os.path.splitext(filepath)[1].lower()
        filename = os.path.basename(filepath)

        # ── Mesh import ──────────────────────────────────────────────────────
        if ext == '.fbx':
            try:
                bpy.ops.import_scene.fbx(filepath=filepath)
                self.report({'INFO'}, f"Imported FBX: {filename}")
                notification_system.FO4_NotificationSystem.notify(
                    f"Imported {filename}", 'INFO'
                )
                return {'FINISHED'}
            except Exception as e:
                self.report({'ERROR'}, f"FBX import failed: {e}")
                return {'CANCELLED'}

        if ext == '.obj':
            try:
                # Blender 3.3+ uses wm.obj_import; older uses import_scene.obj
                if hasattr(bpy.ops.wm, 'obj_import'):
                    bpy.ops.wm.obj_import(filepath=filepath)
                else:
                    bpy.ops.import_scene.obj(filepath=filepath)
                self.report({'INFO'}, f"Imported OBJ: {filename}")
                notification_system.FO4_NotificationSystem.notify(
                    f"Imported {filename}", 'INFO'
                )
                return {'FINISHED'}
            except Exception as e:
                self.report({'ERROR'}, f"OBJ import failed: {e}")
                return {'CANCELLED'}

        if ext == '.nif':
            # Requires Niftools addon
            if hasattr(bpy.ops, 'import_scene') and hasattr(bpy.ops.import_scene, 'nif'):
                try:
                    bpy.ops.import_scene.nif(filepath=filepath)
                    self.report({'INFO'}, f"Imported NIF: {filename}")
                    notification_system.FO4_NotificationSystem.notify(
                        f"Imported {filename}", 'INFO'
                    )
                    return {'FINISHED'}
                except Exception as e:
                    self.report({'ERROR'}, f"NIF import failed: {e}")
                    return {'CANCELLED'}
            else:
                self.report({'ERROR'},
                    "NIF import requires the Niftools add-on. "
                    "Install it via Preferences → Add-ons."
                )
                return {'CANCELLED'}

        # ── Texture / image import ────────────────────────────────────────────
        if ext in {'.dds', '.png', '.tga', '.bmp', '.jpg', '.jpeg'}:
            try:
                img = bpy.data.images.load(filepath, check_existing=True)
                # Attach to the active object's material if one exists
                obj = context.active_object
                if obj and obj.type == 'MESH' and obj.data.materials:
                    mat = obj.data.materials[0]
                    if mat and mat.use_nodes:
                        nodes = mat.node_tree.nodes
                        # Look for an existing Image Texture node to replace, or add one
                        tex_node = next(
                            (n for n in nodes if n.type == 'TEX_IMAGE'), None
                        )
                        if tex_node is None:
                            tex_node = nodes.new('ShaderNodeTexImage')
                            tex_node.location = (-300, 300)
                        tex_node.image = img
                        self.report({'INFO'},
                            f"Loaded texture '{filename}' and applied to material '{mat.name}'"
                        )
                    else:
                        self.report({'INFO'},
                            f"Loaded texture '{filename}' into Image data-block"
                        )
                else:
                    self.report({'INFO'},
                        f"Loaded texture '{filename}' into Image data-block"
                    )
                notification_system.FO4_NotificationSystem.notify(
                    f"Loaded {filename}", 'INFO'
                )
                return {'FINISHED'}
            except Exception as e:
                self.report({'ERROR'}, f"Texture load failed: {e}")
                return {'CANCELLED'}

        self.report({'ERROR'},
            f"Unsupported file type '{ext}'. "
            "Supported: FBX, OBJ, NIF, DDS, PNG, TGA, BMP, JPG"
        )
        return {'CANCELLED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_PrepareThirdPartyMesh(Operator):
    """Convert a mesh created by any other add-on so it can be exported to Fallout 4"""
    bl_idname = "fo4.prepare_third_party_mesh"
    bl_label = "Prepare Third-Party Mesh for FO4"
    bl_description = (
        "Converts a custom mesh made with another add-on to Fallout 4 export standards: "
        "applies transforms, cleans UV maps, sets up materials, and validates the result"
    )
    bl_options = {'REGISTER', 'UNDO'}

    apply_transforms: BoolProperty(
        name="Apply Rotation & Scale",
        description=(
            "Apply rotation and scale (required for correct NIF export). "
            "Location is intentionally left as-is - FO4 meshes are positioned via the NIF node transform"
        ),
        default=True,
    )
    clean_uv_maps: BoolProperty(
        name="Clean Up UV Maps",
        description=(
            "Keep only the first UV map (renamed to 'UVMap'). "
            "FO4 NIF files use a single UV channel"
        ),
        default=True,
    )
    remove_vertex_colors: BoolProperty(
        name="Remove Vertex Colors",
        description="Remove vertex color layers that are not used by FO4 shaders",
        default=False,
    )
    setup_material: BoolProperty(
        name="Set Up FO4 Material",
        description="Create a basic Fallout 4 material if the mesh has none",
        default=True,
    )
    clear_custom_normals: BoolProperty(
        name="Clear Custom Normals",
        description=(
            "Remove custom split normals data that may conflict with NIF export. "
            "Blender will recalculate smooth normals automatically"
        ),
        default=False,
    )
    fix_non_manifold: BoolProperty(
        name="Auto-Fix Non-Manifold Edges",
        description=(
            "Attempt to automatically repair non-manifold edges by merging nearby "
            "vertices and filling open holes. Any edges that cannot be fixed "
            "automatically will be reported so you can resolve them manually"
        ),
        default=True,
    )

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}

        import bmesh as _bmesh

        steps = []
        warnings = []

        # ── Step 1: Apply transforms ─────────────────────────────────────────
        if self.apply_transforms:
            # Ensure object is selected and active in OBJECT mode so the
            # transform_apply poll() passes (it fails if mode is wrong or the
            # object is not the active selection).
            prev_mode = obj.mode
            if prev_mode != 'OBJECT':
                bpy.ops.object.mode_set(mode='OBJECT')
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(
                location=False, rotation=True, scale=True
            )
            if prev_mode != 'OBJECT':
                bpy.ops.object.mode_set(mode=prev_mode)
            steps.append("✓ Transforms applied")

        mesh = obj.data

        # ── Step 2: Clean UV maps ────────────────────────────────────────────
        if self.clean_uv_maps:
            uv_layers = mesh.uv_layers
            if len(uv_layers) == 0:
                # No UV map – unwrap automatically
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
                bpy.ops.object.mode_set(mode='OBJECT')
                if mesh.uv_layers:
                    mesh.uv_layers[0].name = "UVMap"
                steps.append("✓ Auto-unwrapped (no UV map found) and named 'UVMap'")
            else:
                # Rename first UV map and remove extras
                first_name = uv_layers[0].name
                if first_name != "UVMap":
                    uv_layers[0].name = "UVMap"
                extras = [l.name for l in uv_layers if l.name != "UVMap"]
                for name in extras:
                    layer = uv_layers.get(name)
                    if layer:
                        uv_layers.remove(layer)
                if extras:
                    steps.append(
                        f"✓ UV maps cleaned: kept 'UVMap', removed {len(extras)} extra layer(s)"
                    )
                else:
                    steps.append("✓ UV map already clean ('UVMap')")

        # ── Step 3: Remove vertex colors ─────────────────────────────────────
        if self.remove_vertex_colors:
            attr_names = [
                a.name for a in mesh.attributes
                if a.domain == 'CORNER' and a.data_type == 'FLOAT_COLOR'
            ]
            # Also handle legacy vertex_colors API
            vc_names = [vc.name for vc in mesh.vertex_colors] if hasattr(mesh, 'vertex_colors') else []
            removed = 0
            for name in vc_names:
                vc = mesh.vertex_colors.get(name)
                if vc:
                    mesh.vertex_colors.remove(vc)
                    removed += 1
            for name in attr_names:
                if name not in vc_names:
                    attr = mesh.attributes.get(name)
                    if attr:
                        mesh.attributes.remove(attr)
                        removed += 1
            if removed:
                steps.append(f"✓ Removed {removed} vertex color layer(s)")

        # ── Step 4: Clear custom split normals ───────────────────────────────
        if self.clear_custom_normals and mesh.has_custom_normals:
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.customdata_custom_splitnormals_clear()
                bpy.ops.object.mode_set(mode='OBJECT')
                steps.append("✓ Cleared custom split normals")

        # ── Step 5: Ensure material ──────────────────────────────────────────
        if self.setup_material:
            if not obj.data.materials:
                mat = texture_helpers.TextureHelpers.setup_fo4_material(obj)
                steps.append(f"✓ Created FO4 material: {mat.name}")
            else:
                steps.append("✓ Materials present (skipped)")

        # ── Step 6: Mesh optimisation ────────────────────────────────────────
        ok, msg = mesh_helpers.MeshHelpers.optimize_mesh(obj)
        if ok:
            steps.append(f"✓ Mesh optimised: {msg}")
        else:
            warnings.append(f"⚠ Optimise warning: {msg}")

        # ── Step 7: Auto-fix non-manifold edges ──────────────────────────────
        # non-manifold = edges shared by ≠2 faces (holes, open shells, T-junctions).
        # We attempt a fill-holes + merge-by-distance pass and report the result.
        _nm_fix_attempted = False
        if self.fix_non_manifold:
            bm_pre = _bmesh.new()
            bm_pre.from_mesh(obj.data)
            bm_pre.edges.ensure_lookup_table()
            pre_nm = sum(1 for e in bm_pre.edges if not e.is_manifold)
            bm_pre.free()
            if pre_nm > 0:
                _nm_fix_attempted = True
                prev_mode = obj.mode
                if prev_mode != 'OBJECT':
                    bpy.ops.object.mode_set(mode='OBJECT')
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                context.view_layer.objects.active = obj
                bpy.ops.object.mode_set(mode='EDIT')
                # Merge near vertices first (catches duplicate-vert open edges)
                bpy.ops.mesh.select_all(action='SELECT')
                try:
                    bpy.ops.mesh.merge_by_distance(threshold=0.0001)
                except AttributeError:
                    bpy.ops.mesh.remove_doubles(threshold=0.0001)
                # Fill remaining holes
                bpy.ops.mesh.select_all(action='DESELECT')
                bpy.ops.mesh.select_non_manifold()
                bpy.ops.mesh.fill_holes(sides=4)
                bpy.ops.object.mode_set(mode='OBJECT')

                bm_post = _bmesh.new()
                bm_post.from_mesh(obj.data)
                bm_post.edges.ensure_lookup_table()
                post_nm = sum(1 for e in bm_post.edges if not e.is_manifold)
                bm_post.free()

                fixed = pre_nm - post_nm
                if post_nm == 0:
                    steps.append(f"✓ Auto-fixed all {fixed} non-manifold edge(s)")
                else:
                    if fixed > 0:
                        steps.append(f"✓ Auto-fixed {fixed} of {pre_nm} non-manifold edge(s)")
                    warnings.append(
                        f"⚠ {post_nm} non-manifold edge(s) could not be fixed automatically "
                        f"(complex topology). To fix manually: "
                        f"enter Edit Mode → select non-manifold edges with "
                        f"Alt+Ctrl+Shift+M → use Mesh > Clean Up > Fill Holes to close "
                        f"open holes, or Merge by Distance to weld nearby vertices. "
                        f"T-junctions (edges shared by 3+ faces) must be manually "
                        f"split or dissolved"
                    )

        # ── Step 8: Validate ─────────────────────────────────────────────────
        ok, issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
        if ok:
            steps.append("✓ Mesh validated for FO4 export")
        else:
            for issue in issues:
                # Suppress the non-manifold hint when we already tried to fix
                # it above (the fix step already reported the outcome).
                if _nm_fix_attempted and "non-manifold" in issue:
                    continue
                warnings.append(f"⚠ {issue}")

        # ── Report ───────────────────────────────────────────────────────────
        summary = "; ".join(steps)
        if warnings:
            summary += " | Warnings: " + "; ".join(warnings)
            self.report({'WARNING'}, summary)
        else:
            self.report({'INFO'}, summary)

        notification_system.FO4_NotificationSystem.notify(
            f"Third-party mesh '{obj.name}' prepared for FO4", 'INFO'
        )
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=400)

    def draw(self, context):
        layout = self.layout
        layout.label(text="Prepare Third-Party Mesh for Fallout 4 Export", icon='MODIFIER')
        layout.separator()
        col = layout.column(align=True)
        col.prop(self, "apply_transforms")
        col.prop(self, "clean_uv_maps")
        col.prop(self, "remove_vertex_colors")
        col.prop(self, "setup_material")
        col.prop(self, "clear_custom_normals")
        col.prop(self, "fix_non_manifold")
        layout.separator()
        layout.label(text="After this, use 'Convert to Fallout 4' for final prep.", icon='INFO')


class FO4_OT_BrowseFO4Assets(Operator):
    """Browse and import Fallout 4 game assets"""
    bl_idname = "fo4.browse_fo4_assets"
    bl_label = "Browse FO4 Assets"
    bl_description = "Browse and import assets from Fallout 4 game files"

    search_query: StringProperty(
        name="Search",
        description="Search for assets by name",
        default=""
    )

    category: EnumProperty(
        name="Category",
        items=[
            ('ALL', "All Assets", "Show all assets"),
            ('Weapons', "Weapons", "Weapon meshes"),
            ('Armor', "Armor", "Armor and clothing"),
            ('Creatures', "Creatures", "Creature models"),
            ('Furniture', "Furniture", "Furniture and props"),
            ('Architecture', "Architecture", "Building pieces"),
        ],
        default='ALL'
    )

    def execute(self, context):
        if not fo4_game_assets:
            self.report({'ERROR'}, "fo4_game_assets module unavailable")
            return {'CANCELLED'}
        # This will be a modal operator with search UI
        # For now, show status
        ready, message = fo4_game_assets.FO4GameAssets.get_status()

        if not ready:
            self.report({'ERROR'}, message)
            self.report({'INFO'}, "Set 'Fallout 4 Assets Path' in addon preferences")
            return {'CANCELLED'}

        self.report({'INFO'}, f"FO4 Assets: {message}")
        self.report({'INFO'}, "Asset browser coming soon - use file import for now")
        return {'FINISHED'}


class FO4_OT_BrowseUnityAssets(Operator):
    """Browse and import Unity project assets"""
    bl_idname = "fo4.browse_unity_assets"
    bl_label = "Browse Unity Assets"
    bl_description = "Browse and import assets from Unity project"

    search_query: StringProperty(
        name="Search",
        description="Search for assets by name",
        default=""
    )

    category: EnumProperty(
        name="Category",
        items=[
            ('ALL', "All Assets", "Show all assets"),
            ('Characters', "Characters", "Character models"),
            ('Weapons', "Weapons", "Weapon models"),
            ('Props', "Props", "Props and items"),
            ('Environment', "Environment", "Environment pieces"),
            ('Vehicles', "Vehicles", "Vehicle models"),
        ],
        default='ALL'
    )

    def execute(self, context):
        if not unity_game_assets:
            self.report({'ERROR'}, "unity_game_assets module unavailable")
            return {'CANCELLED'}
        ready, message = unity_game_assets.UnityAssets.get_status()

        if not ready:
            self.report({'ERROR'}, message)
            self.report({'INFO'}, "Set 'Unity Assets Path' in addon preferences")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Unity Assets: {message}")
        self.report({'INFO'}, "Asset browser coming soon - use file import for now")
        return {'FINISHED'}


class FO4_OT_ImportUnityAsset(Operator):
    """Deep-scan Unity assets folder, search, and import into Blender."""
    bl_idname = "fo4.import_unity_asset"
    bl_label = "Import Unity Asset"
    bl_options = {'REGISTER', 'UNDO'}

    search_query: StringProperty(
        name="Search",
        description="Name fragment to search for in Unity asset filenames",
        default="",
    )

    category: EnumProperty(
        name="Category",
        items=[
            ('ALL', "All", "Search all categories"),
            ('Characters', "Characters", "Character models"),
            ('Weapons', "Weapons", "Weapon models"),
            ('Props', "Props", "Props and items"),
            ('Environment', "Environment", "Environment pieces"),
            ('Vehicles', "Vehicles", "Vehicle models"),
        ],
        default='ALL',
    )

    def _pick_asset(self):
        from . import unity_game_assets

        ready, msg = unity_game_assets.UnityAssets.get_status()
        if not ready:
            return None, msg

        # Force index build and search
        if self.search_query.strip():
            results = unity_game_assets.UnityAssets.search_assets(
                self.search_query, None if self.category == 'ALL' else self.category
            )
        else:
            # Default: take the first indexed asset in category
            index = unity_game_assets.UnityAssets.index_assets()
            cat = self.category if self.category != 'ALL' else next(iter(index), None)
            results = index.get(cat, []) if cat else []

        if not results:
            return None, "No Unity assets matched the search."

        # Prefer shortest path/name combo as a simple tie-breaker
        results.sort(key=lambda r: (len(r.get("name", "")), len(r.get("asset_path", ""))))
        return results[0], None

    def _import_asset_file(self, path):
        ext = path.suffix.lower()
        if ext == ".fbx" and hasattr(bpy.ops.import_scene, "fbx"):
            bpy.ops.import_scene.fbx(filepath=str(path))
            return True, "Imported FBX via Blender importer"
        if ext == ".obj" and hasattr(bpy.ops.import_scene, "obj"):
            bpy.ops.import_scene.obj(filepath=str(path))
            return True, "Imported OBJ via Blender importer"
        if ext in (".gltf", ".glb") and hasattr(bpy.ops.import_scene, "gltf"):
            bpy.ops.import_scene.gltf(filepath=str(path))
            return True, "Imported GLTF via Blender importer"
        if ext == ".dae" and hasattr(bpy.ops.wm, "collada_import"):
            bpy.ops.wm.collada_import(filepath=str(path))
            return True, "Imported DAE via Blender importer"
        return False, f"Unsupported format {ext}; import manually from {path}"

    def execute(self, context):
        asset, err = self._pick_asset()
        if err:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        from pathlib import Path
        asset_path = Path(asset["full_path"])
        if not asset_path.exists():
            self.report({'ERROR'}, f"Asset not found on disk: {asset_path}")
            return {'CANCELLED'}

        ok, msg = self._import_asset_file(asset_path)
        level = 'INFO' if ok else 'WARNING'
        self.report({level}, f"{asset['name']}: {msg}")
        notification_system.FO4_NotificationSystem.notify(f"Unity import: {msg}", level)

        # Apply textures when available
        textures = asset.get("texture_paths") or []
        if textures:
            from . import unity_game_assets
            root = unity_game_assets.UnityAssets.detect_unity_assets()
            mesh_helpers.SmartPresets.apply_textures_to_active(textures, str(root) if root else None)

        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=400)


class FO4_OT_BrowseUnrealAssets(Operator):
    """Browse and import Unreal Engine assets"""
    bl_idname = "fo4.browse_unreal_assets"
    bl_label = "Browse Unreal Assets"
    bl_description = "Browse and import assets from Unreal Engine project"

    search_query: StringProperty(
        name="Search",
        description="Search for assets by name",
        default=""
    )

    category: EnumProperty(
        name="Category",
        items=[
            ('ALL', "All Assets", "Show all assets"),
            ('Characters', "Characters", "Character models"),
            ('Weapons', "Weapons", "Weapon models"),
            ('Props', "Props", "Props and items"),
            ('Environment', "Environment", "Environment pieces"),
            ('Vehicles', "Vehicles", "Vehicle models"),
        ],
        default='ALL'
    )

    def execute(self, context):
        if not unreal_game_assets:
            self.report({'ERROR'}, "unreal_game_assets module unavailable")
            return {'CANCELLED'}
        ready, message = unreal_game_assets.UnrealAssets.get_status()

        if not ready:
            self.report({'ERROR'}, message)
            self.report({'INFO'}, "Set 'Unreal Engine Assets Path' in addon preferences")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Unreal Assets: {message}")
        self.report({'INFO'}, "Asset browser coming soon - use file import for now")
        return {'FINISHED'}


class FO4_OT_ImportUnrealAsset(Operator):
    """Deep-scan Unreal assets folder, search, and import into Blender."""
    bl_idname = "fo4.import_unreal_asset"
    bl_label = "Import Unreal Asset"
    bl_options = {'REGISTER', 'UNDO'}

    search_query: StringProperty(
        name="Search",
        description="Name fragment to search for in Unreal asset filenames",
        default="",
    )

    category: EnumProperty(
        name="Category",
        items=[
            ('ALL', "All", "Search all categories"),
            ('Characters', "Characters", "Character models"),
            ('Weapons', "Weapons", "Weapon models"),
            ('Props', "Props", "Props and items"),
            ('Environment', "Environment", "Environment pieces"),
            ('Vehicles', "Vehicles", "Vehicle models"),
        ],
        default='ALL',
    )

    def _pick_asset(self):
        from . import unreal_game_assets

        ready, msg = unreal_game_assets.UnrealAssets.get_status()
        if not ready:
            return None, msg

        # Force index build and search
        if self.search_query.strip():
            results = unreal_game_assets.UnrealAssets.search_assets(
                self.search_query, None if self.category == 'ALL' else self.category
            )
        else:
            index = unreal_game_assets.UnrealAssets.index_assets()
            cat = self.category if self.category != 'ALL' else next(iter(index), None)
            results = index.get(cat, []) if cat else []

        if not results:
            return None, "No Unreal assets matched the search."

        # Prefer shortest path/name combo
        results.sort(key=lambda r: (len(r.get("name", "")), len(r.get("asset_path", ""))))
        return results[0], None

    def _import_asset_file(self, path, asset_type: str):
        ext = path.suffix.lower()

        # Common mesh formats
        if ext == ".fbx" and hasattr(bpy.ops.import_scene, "fbx"):
            bpy.ops.import_scene.fbx(filepath=str(path))
            return True, "Imported FBX via Blender importer"
        if ext == ".obj" and hasattr(bpy.ops.import_scene, "obj"):
            bpy.ops.import_scene.obj(filepath=str(path))
            return True, "Imported OBJ via Blender importer"
        if ext in (".gltf", ".glb") and hasattr(bpy.ops.import_scene, "gltf"):
            bpy.ops.import_scene.gltf(filepath=str(path))
            return True, "Imported GLTF via Blender importer"
        if ext == ".dae" and hasattr(bpy.ops.wm, "collada_import"):
            bpy.ops.wm.collada_import(filepath=str(path))
            return True, "Imported DAE via Blender importer"

        # UE-specific formats: inform user to extract first
        if ext in (".uasset", ".psk", ".pskx", ".usd"):
            return False, (
                f"{ext.upper()} requires UE extraction (UModel/FModel/UE export). "
                f"Convert to FBX/OBJ/GLTF then re-run import. Source: {path}"
            )

        return False, f"Unsupported format {ext}; import manually from {path}"

    def execute(self, context):
        asset, err = self._pick_asset()
        if err:
            self.report({'ERROR'}, err)
            return {'CANCELLED'}

        from pathlib import Path
        asset_path = Path(asset["full_path"])
        if not asset_path.exists():
            self.report({'ERROR'}, f"Asset not found on disk: {asset_path}")
            return {'CANCELLED'}

        ok, msg = self._import_asset_file(asset_path, asset.get("type"))
        level = 'INFO' if ok else 'WARNING'
        self.report({level}, f"{asset['name']}: {msg}")
        notification_system.FO4_NotificationSystem.notify(f"Unreal import: {msg}", level)

        textures = asset.get("texture_paths") or []
        if textures:
            from . import unreal_game_assets
            root = unreal_game_assets.UnrealAssets.detect_unreal_assets()
            mesh_helpers.SmartPresets.apply_textures_to_active(textures, str(root) if root else None)

        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=400)


# Smart Preset Operators
# ---------------------------------------------------------------------------
# Data and helper logic live in mesh_helpers.SmartPresets.
# These operators are thin delegates that call into that class.
# ---------------------------------------------------------------------------

class FO4_OT_CreateWeaponPreset(Operator):
    """Create a weapon starting from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_weapon_preset"
    bl_label = "Create Weapon Preset"
    bl_options = {'REGISTER', 'UNDO'}

    weapon_type: EnumProperty(
        name="Weapon",
        description="Select the Fallout 4 weapon to use as a base mesh",
        items=[
            ('10MM',        "10mm Pistol",      "Semi-auto pistol (meshes/weapons/10mmpistol)"),
            ('44',          ".44 Revolver",     "Powerful revolver (meshes/weapons/44pistol)"),
            ('DELIVERER',   "Deliverer",        "Railroad silenced pistol"),
            ('PIPE',        "Pipe Pistol",      "Makeshift pipe gun"),
            ('ASSAULT',     "Assault Rifle",    "Standard automatic rifle"),
            ('COMBAT_RIFLE',"Combat Rifle",     "Full-auto combat rifle"),
            ('SHOTGUN',     "Combat Shotgun",   "Pump/auto shotgun"),
            ('HUNTING',     "Hunting Rifle",    "Bolt-action rifle"),
            ('LASER',       "Laser Rifle",      "Energy rifle"),
            ('PLASMA',      "Plasma Rifle",     "Plasma weapon"),
            ('SMG',         "Submachine Gun",   "Compact automatic"),
            ('MINIGUN',     "Minigun",          "Heavy rotary cannon"),
            ('FATMAN',      "Fat Man",          "Tactical nuke launcher"),
            ('FLAMER',      "Flamer",           "Flamethrower"),
            ('MISSILE',     "Missile Launcher", "Rocket launcher"),
            ('GAUSS',       "Gauss Rifle",      "Magnetic rail rifle"),
            ('RAILWAY',     "Railway Rifle",    "Compressed-air spike rifle"),
        ],
        default='ASSAULT',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.weapon_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Weapon_{self.weapon_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.weapon_type)
                    mesh_helpers.SmartPresets.auto_apply_textures_from_game_asset(nif_path)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - preset cancelled (no game mesh)")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.weapon_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create preset: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateArmorPreset(Operator):
    """Create armor starting from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_armor_preset"
    bl_label = "Create Armor Preset"
    bl_options = {'REGISTER', 'UNDO'}

    armor_type: EnumProperty(
        name="Armor",
        description="Select the Fallout 4 armor to use as a base mesh",
        items=[
            ('ARMOR_LEATHER', "Leather Armor",   "Light leather armor body"),
            ('ARMOR_COMBAT',  "Combat Armor",    "Medium combat armor body"),
            ('ARMOR_METAL',   "Metal Armor",     "Heavy metal armor body"),
            ('ARMOR_RAIDER',  "Raider Armor",    "Makeshift raider armor"),
            ('ARMOR_SYNTH',   "Synth Armor",     "Institute synth armor"),
            ('POWER_T60',     "T-60 Power Armor Torso", "Advanced power armor torso"),
            ('POWER_T45',     "T-45 Power Armor Torso", "Classic power armor torso"),
            ('VAULT_SUIT',    "Vault 111 Suit",  "Vault-Tec jumpsuit"),
        ],
        default='ARMOR_COMBAT',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.armor_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Armor_{self.armor_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.armor_type)
                    mesh_helpers.SmartPresets.auto_apply_textures_from_game_asset(nif_path)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - preset cancelled (no game mesh)")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.armor_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create preset: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreatePropPreset(Operator):
    """Create a prop starting from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_prop_preset"
    bl_label = "Create Prop Preset"
    bl_options = {'REGISTER', 'UNDO'}

    prop_type: EnumProperty(
        name="Prop",
        description="Select the Fallout 4 prop to use as a base mesh",
        items=[
            ('PROP_CRATE',      "Wooden Crate",  "Wooden shipping crate (setdressing/crates)"),
            ('PROP_METALCRATE', "Metal Crate",   "Metal storage crate"),
            ('PROP_BARREL',     "Barrel",        "Storage barrel"),
            ('PROP_DESK',       "Desk",          "Office/workshop desk (furniture)"),
            ('PROP_CHAIR',      "Chair",         "Sitting chair"),
            ('PROP_SHELF',      "Shelf",         "Storage shelf"),
            ('PROP_TABLE',      "Table",         "Flat-surface table"),
        ],
        default='PROP_CRATE',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.prop_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Prop_{self.prop_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.prop_type)
                    mesh_helpers.SmartPresets.auto_apply_textures_from_game_asset(nif_path)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - preset cancelled (no game mesh)")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.prop_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create preset: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# Automation Operators

class FO4_OT_QuickPrepareForExport(Operator):
    """One-click preparation for export (optimize, validate, setup)"""
    bl_idname = "fo4.quick_prepare_export"
    bl_label = "Quick Prepare for Export"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        try:
            # Step 1: Optimize mesh
            self.report({'INFO'}, "Step 1/4: Optimizing mesh...")
            success, message = mesh_helpers.MeshHelpers.optimize_mesh(obj)
            if not success:
                self.report({'WARNING'}, f"Optimization warning: {message}")
            
            # Step 2: Setup materials if needed
            self.report({'INFO'}, "Step 2/4: Checking materials...")
            if not obj.data.materials:
                texture_helpers.TextureHelpers.setup_fo4_material(obj)
                self.report({'INFO'}, "Created FO4 material")
            
            # Step 3: Validate mesh
            self.report({'INFO'}, "Step 3/4: Validating mesh...")
            success, message = mesh_helpers.MeshHelpers.validate_mesh(obj)
            if not success:
                self.report({'WARNING'}, f"Validation warning: {message}")
            
            # Step 4: Validate textures
            self.report({'INFO'}, "Step 4/4: Validating textures...")
            success, message = texture_helpers.TextureHelpers.validate_textures(obj)
            if not success:
                self.report({'WARNING'}, f"Texture warning: {message}")
            
            self.report({'INFO'}, "Mesh prepared for export!")
            notification_system.FO4_NotificationSystem.notify(
                f"{obj.name} ready for export", 'INFO'
            )
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Preparation failed: {str(e)}")
            return {'CANCELLED'}


class FO4_OT_AutoFixCommonIssues(Operator):
    """Automatically fix common Fallout 4 mesh issues"""
    bl_idname = "fo4.auto_fix_issues"
    bl_label = "Auto-Fix Common Issues"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        fixes_applied = []
        
        try:
            # Fix 1: Apply unapplied transformations
            if any([s != 1.0 for s in obj.scale]):
                bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
                fixes_applied.append("Applied scale")
            
            # Fix 2: Remove loose vertices
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.delete_loose()
            bpy.ops.object.mode_set(mode='OBJECT')
            fixes_applied.append("Removed loose geometry")
            
            # Fix 3: Recalculate normals
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.mesh.normals_make_consistent(inside=False)
            bpy.ops.object.mode_set(mode='OBJECT')
            fixes_applied.append("Fixed normals")
            
            # Fix 4: Create UV map if missing
            if not obj.data.uv_layers:
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.uv.smart_project()
                bpy.ops.object.mode_set(mode='OBJECT')
                fixes_applied.append("Created UV map")
            
            self.report({'INFO'}, f"Applied {len(fixes_applied)} fixes")
            for fix in fixes_applied:
                self.report({'INFO'}, f"  - {fix}")
            
            notification_system.FO4_NotificationSystem.notify(
                f"Auto-fixed {len(fixes_applied)} issues", 'INFO'
            )
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Auto-fix failed: {str(e)}")
            return {'CANCELLED'}


class FO4_OT_GenerateCollisionMesh(Operator):
    """Generate a collision mesh for the selected object"""
    bl_idname = "fo4.generate_collision_mesh"
    bl_label = "Generate Collision Mesh"
    bl_options = {'REGISTER', 'UNDO'}
    
    simplify_ratio: FloatProperty(
        name="Simplification",
        description="How much to simplify the collision mesh",
        default=0.25,
        min=0.01,
        max=1.0
    )
    collision_type: EnumProperty(
        name="Collision Type",
        description="Category of physics collision to create",
        items=_COLLISION_TYPES,
        default='DEFAULT'
    )
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        # remember the selected collision type on the source object
        obj.fo4_collision_type = self.collision_type

        # skip generation for types that don't require it
        if self.collision_type in ('NONE', 'GRASS', 'MUSHROOM'):
            self.report({'INFO'}, f"Collision type '{self.collision_type}' skips creation")
            return {'FINISHED'}

        try:
            # use the helper; it duplicates, simplifies, clears materials/vertex
            # groups, parents to source, and configures the Rigid Body for us
            collision_obj = mesh_helpers.MeshHelpers.add_collision_mesh(
                obj,
                simplify_ratio=self.simplify_ratio,
                collision_type=self.collision_type
            )
            if not collision_obj:
                raise RuntimeError("helper failed to create collision mesh")
            
            self.report({'INFO'}, f"Created collision mesh: {collision_obj.name}")
            notification_system.FO4_NotificationSystem.notify(
                f"Collision mesh generated: {collision_obj.name}", 'INFO'
            )
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Failed to generate collision mesh: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        obj = context.active_object
        if obj and obj.type == 'MESH':
            inferred = mesh_helpers.MeshHelpers.infer_collision_type(obj)
            self.collision_type = mesh_helpers.MeshHelpers.resolve_collision_type(
                getattr(obj, 'fo4_collision_type', inferred), inferred)
            if self.simplify_ratio == 0.25:
                self.simplify_ratio = mesh_helpers.MeshHelpers._TYPE_DEFAULT_RATIOS.get(self.collision_type, 0.25)
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_SmartMaterialSetup(Operator):
    """Intelligently setup materials based on available textures"""
    bl_idname = "fo4.smart_material_setup"
    bl_label = "Smart Material Setup"
    bl_options = {'REGISTER', 'UNDO'}
    
    texture_directory: StringProperty(
        name="Texture Directory",
        description="Directory containing textures",
        subtype='DIR_PATH'
    )
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        if not self.texture_directory:
            self.report({'ERROR'}, "No texture directory specified")
            return {'CANCELLED'}
        
        try:
            import os
            
            # Setup FO4 material
            texture_helpers.TextureHelpers.setup_fo4_material(obj)
            
            # Look for common texture names
            texture_files = os.listdir(self.texture_directory)
            textures_found = []
            
            for filename in texture_files:
                filepath = os.path.join(self.texture_directory, filename)
                lower_name = filename.lower()
                
                # Try to identify texture type by name
                if any(x in lower_name for x in ['diffuse', 'color', 'albedo', '_d.']):
                    texture_helpers.TextureHelpers.install_texture(obj, filepath, 'Diffuse')
                    textures_found.append("Diffuse")
                elif any(x in lower_name for x in ['normal', 'norm', '_n.']):
                    texture_helpers.TextureHelpers.install_texture(obj, filepath, 'Normal')
                    textures_found.append("Normal")
                elif any(x in lower_name for x in ['specular', 'spec', '_s.', 'rough']):
                    texture_helpers.TextureHelpers.install_texture(obj, filepath, 'Specular')
                    textures_found.append("Specular")
            
            if textures_found:
                self.report({'INFO'}, f"Loaded textures: {', '.join(textures_found)}")
                notification_system.FO4_NotificationSystem.notify(
                    f"Loaded {len(textures_found)} textures", 'INFO'
                )
            else:
                self.report({'WARNING'}, "No textures found in directory")
            
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Smart material setup failed: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


# Landscaping and Vegetation Operators

class FO4_OT_CreateVegetationPreset(Operator):
    """Create vegetation starting from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_vegetation_preset"
    bl_label = "Create Vegetation"
    bl_options = {'REGISTER', 'UNDO'}

    vegetation_type: EnumProperty(
        name="Vegetation",
        description="Select the Fallout 4 vegetation/plant to use as a base",
        items=[
            ('VEG_PINE',      "Pine Tree",    "Living pine tree (landscape/trees)"),
            ('VEG_DEAD_TREE', "Dead Tree",    "Dead/wasteland tree"),
            ('VEG_BUSH',      "Bush/Shrub",   "Bush or shrub plant"),
            ('VEG_GRASS',     "Grass Clump",  "Ground-cover grass"),
            ('VEG_FERN',      "Fern/Plant",   "Fern or leafy plant"),
            ('VEG_ROCK',      "Rock",         "Decorative landscape rock"),
            ('VEG_MUTFRUIT',  "Mutfruit",     "Mutated fruit plant"),
        ],
        default='VEG_PINE',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.vegetation_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Veg_{self.vegetation_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.vegetation_type)
                    mesh_helpers.SmartPresets.auto_apply_textures_from_game_asset(nif_path)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.vegetation_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create vegetation: {e}")
            return {'CANCELLED'}

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "vegetation_type")

        # Show current FO4 data-path status so the user knows whether
        # the real game mesh will be imported.
        box = layout.box()
        try:
            ready, _ = fo4_game_assets.FO4GameAssets.get_status()
            if ready:
                box.label(text="Game files found - real mesh will be imported",
                          icon='CHECKMARK')
            else:
                box.label(text="Game files not found - set path to import real mesh",
                          icon='INFO')
                sub = box.column(align=True)
                sub.scale_y = 0.8
                sub.label(text="Set FO4 Data Folder in any Fallout 4 panel,",
                          icon='DOT')
                sub.label(text="then click Create again to import the real mesh.",
                          icon='DOT')
                sub.prop(context.scene, "fo4_assets_path", text="Data Folder")
                sub.operator("fo4.set_fo4_assets_path", text="Browse…",
                             icon='FILE_FOLDER')
        except Exception:
            pass

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=400)


class FO4_OT_CombineVegetationMeshes(Operator):
    """Combine selected vegetation meshes into one optimized mesh"""
    bl_idname = "fo4.combine_vegetation_meshes"
    bl_label = "Combine Vegetation"
    bl_options = {'REGISTER', 'UNDO'}
    
    merge_materials: BoolProperty(
        name="Merge Materials",
        description="Combine materials into one (better performance)",
        default=True
    )
    
    generate_lod: BoolProperty(
        name="Generate LOD",
        description="Generate simplified LOD version",
        default=True
    )
    
    def execute(self, context):
        selected_objects = [obj for obj in context.selected_objects if obj.type == 'MESH']
        
        if len(selected_objects) < 2:
            self.report({'ERROR'}, "Select at least 2 mesh objects to combine")
            return {'CANCELLED'}
        
        try:
            # Store original selection
            original_count = len(selected_objects)
            
            # Join all meshes
            context.view_layer.objects.active = selected_objects[0]
            bpy.ops.object.join()
            combined_obj = context.active_object
            combined_obj.name = "FO4_Vegetation_Combined"
            
            # After joining, any wind vertex groups from the component meshes are
            # merged together.  Without an armature the Niftools exporter treats
            # these as orphaned weights and can produce corrupted geometry.
            # We specifically remove groups whose names indicate they were created
            # by the add-on's wind animation pipeline ("Wind", "wind*") while
            # leaving any other custom vertex groups intact.
            if combined_obj.vertex_groups and not any(
                mod.type == 'ARMATURE' for mod in combined_obj.modifiers
            ):
                groups_to_remove = [
                    vg for vg in combined_obj.vertex_groups
                    if vg.name.lower() == 'wind' or vg.name.lower().startswith('wind')
                ]
                for vg in groups_to_remove:
                    combined_obj.vertex_groups.remove(vg)
            
            # Optimize the combined mesh
            success, message = mesh_helpers.MeshHelpers.optimize_mesh(combined_obj)
            
            if self.merge_materials and len(combined_obj.data.materials) > 1:
                # Keep only the first material for better performance
                while len(combined_obj.data.materials) > 1:
                    combined_obj.data.materials.pop()
            
            # Generate LOD if requested
            if self.generate_lod:
                bpy.ops.object.duplicate()
                lod_obj = context.active_object
                lod_obj.name = f"{combined_obj.name}_LOD"
                
                # Add decimate modifier for LOD
                modifier = lod_obj.modifiers.new(name="Decimate_LOD", type='DECIMATE')
                modifier.ratio = 0.3  # 30% of original poly count
                bpy.ops.object.modifier_apply(modifier="Decimate_LOD")
                
                # Move LOD to the side
                lod_obj.location.x += 5.0
                
                self.report({'INFO'}, f"Combined {original_count} meshes + generated LOD")
            else:
                self.report({'INFO'}, f"Combined {original_count} meshes into one")
            
            notification_system.FO4_NotificationSystem.notify(
                f"Combined {original_count} vegetation meshes", 'INFO'
            )
            
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Failed to combine meshes: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_ScatterVegetation(Operator):
    """Scatter vegetation objects across a surface"""
    bl_idname = "fo4.scatter_vegetation"
    bl_label = "Scatter Vegetation"
    bl_options = {'REGISTER', 'UNDO'}
    
    count: IntProperty(
        name="Count",
        description="Number of vegetation instances to create",
        default=20,
        min=1,
        max=500
    )
    
    radius: FloatProperty(
        name="Scatter Radius",
        description="Radius to scatter objects within",
        default=10.0,
        min=1.0,
        max=100.0
    )
    
    random_scale: BoolProperty(
        name="Random Scale",
        description="Randomly scale each instance",
        default=True
    )
    
    random_rotation: BoolProperty(
        name="Random Rotation",
        description="Randomly rotate each instance",
        default=True
    )
    
    def execute(self, context):
        source_obj = context.active_object
        
        if not source_obj or source_obj.type != 'MESH':
            self.report({'ERROR'}, "Select a vegetation mesh to scatter")
            return {'CANCELLED'}
        
        try:
            import random
            import math
            
            instances = []
            
            for i in range(self.count):
                # Duplicate the object
                new_obj = source_obj.copy()
                new_obj.data = source_obj.data.copy()
                context.collection.objects.link(new_obj)
                
                # Random position within radius
                angle = random.uniform(0, 2 * math.pi)
                distance = random.uniform(0, self.radius)
                x = math.cos(angle) * distance
                y = math.sin(angle) * distance
                new_obj.location = (x, y, 0)
                
                # Random scale
                if self.random_scale:
                    scale_factor = random.uniform(0.7, 1.3)
                    new_obj.scale = (scale_factor, scale_factor, scale_factor)
                
                # Random rotation (Z-axis)
                if self.random_rotation:
                    new_obj.rotation_euler[2] = random.uniform(0, 2 * math.pi)
                
                instances.append(new_obj)
            
            self.report({'INFO'}, f"Scattered {self.count} vegetation instances")
            notification_system.FO4_NotificationSystem.notify(
                f"Scattered {self.count} instances", 'INFO'
            )
            
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Failed to scatter vegetation: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_OptimizeVegetationForFPS(Operator):
    """Optimize vegetation for better FPS in Fallout 4"""
    bl_idname = "fo4.optimize_vegetation_fps"
    bl_label = "Optimize for FPS"
    bl_options = {'REGISTER', 'UNDO'}
    
    target_poly_count: IntProperty(
        name="Target Poly Count",
        description="Target polygon count for the mesh",
        default=5000,
        min=100,
        max=65000
    )
    
    remove_hidden_faces: BoolProperty(
        name="Remove Hidden Faces",
        description="Remove faces that won't be visible",
        default=True
    )
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        try:
            import bmesh
            
            original_poly_count = len(obj.data.polygons)
            
            # Remove hidden faces (faces pointing down for vegetation)
            if self.remove_hidden_faces:
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='DESELECT')
                bpy.ops.object.mode_set(mode='OBJECT')
                
                # Select faces pointing downward (won't be visible from above)
                for poly in obj.data.polygons:
                    if poly.normal.z < -0.5:  # Facing down
                        poly.select = True
                
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.delete(type='FACE')
                bpy.ops.object.mode_set(mode='OBJECT')
            
            # Decimate if needed
            current_poly_count = len(obj.data.polygons)
            if current_poly_count > self.target_poly_count:
                ratio = self.target_poly_count / current_poly_count
                modifier = obj.modifiers.new(name="Decimate_FPS", type='DECIMATE')
                modifier.ratio = ratio
                bpy.ops.object.modifier_apply(modifier="Decimate_FPS")
            
            # Optimize mesh
            mesh_helpers.MeshHelpers.optimize_mesh(obj)
            
            final_poly_count = len(obj.data.polygons)
            reduction = ((original_poly_count - final_poly_count) / original_poly_count) * 100
            
            self.report({'INFO'}, f"Reduced polys by {reduction:.1f}% ({original_poly_count} → {final_poly_count})")
            notification_system.FO4_NotificationSystem.notify(
                f"Optimized vegetation: {reduction:.1f}% reduction", 'INFO'
            )
            
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Failed to optimize: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateVegetationLODChain(Operator):
    """Create LOD chain for vegetation (LOD0, LOD1, LOD2)"""
    bl_idname = "fo4.create_vegetation_lod_chain"
    bl_label = "Create LOD Chain"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        obj = context.active_object
        
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        
        try:
            lod_ratios = [1.0, 0.5, 0.25, 0.1]  # LOD0, LOD1, LOD2, LOD3
            lod_names = ['LOD0', 'LOD1', 'LOD2', 'LOD3']
            
            original_name = obj.name
            lod_objects = []
            
            for i, (ratio, name) in enumerate(zip(lod_ratios, lod_names)):
                if i == 0:
                    # LOD0 is the original
                    obj.name = f"{original_name}_{name}"
                    lod_objects.append(obj)
                else:
                    # Create duplicates for other LODs
                    bpy.ops.object.duplicate()
                    lod_obj = context.active_object
                    lod_obj.name = f"{original_name}_{name}"
                    
                    # Apply decimation
                    modifier = lod_obj.modifiers.new(name="Decimate", type='DECIMATE')
                    modifier.ratio = ratio
                    bpy.ops.object.modifier_apply(modifier="Decimate")
                    
                    # Move to the side for visibility
                    lod_obj.location.x = obj.location.x + (i * 3.0)
                    
                    lod_objects.append(lod_obj)
                    
                    poly_count = len(lod_obj.data.polygons)
                    self.report({'INFO'}, f"{name}: {poly_count} polygons")
            
            self.report({'INFO'}, f"Created LOD chain with {len(lod_objects)} levels")
            notification_system.FO4_NotificationSystem.notify(
                f"Created {len(lod_objects)} LOD levels", 'INFO'
            )
            
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create LOD chain: {str(e)}")
            return {'CANCELLED'}


class FO4_OT_BakeVegetationAO(Operator):
    """Bake ambient occlusion for the selected mesh using Cycles"""
    bl_idname = "fo4.bake_vegetation_ao"
    bl_label = "Bake Ambient Occlusion"
    bl_options = {'REGISTER', 'UNDO'}

    samples: IntProperty(
        name="Samples",
        description="Number of AO samples",
        default=32,
        min=1,
        max=256
    )

    resolution: EnumProperty(
        name="Resolution",
        description="Bake image resolution",
        items=[
            ('512', "512", "512x512"),
            ('1024', "1K (1024)", "1024x1024"),
            ('2048', "2K (2048)", "2048x2048"),
            ('4096', "4K (4096)", "4096x4096"),
        ],
        default='1024'
    )

    save_image: BoolProperty(
        name="Save Image",
        description="Save the baked AO image to disk alongside the .blend file",
        default=True
    )

    def execute(self, context):
        obj = context.active_object

        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        if not obj.data.uv_layers:
            self.report({'ERROR'}, "Mesh has no UV map – unwrap the mesh first")
            return {'CANCELLED'}

        original_engine = context.scene.render.engine
        try:
            res = int(self.resolution)
            image_name = f"{obj.name}_AO"

            # Replace existing bake image so results are always fresh
            if image_name in bpy.data.images:
                bpy.data.images.remove(bpy.data.images[image_name])
            image = bpy.data.images.new(image_name, width=res, height=res, alpha=False)
            image.colorspace_settings.name = 'Non-Color'

            # Ensure the object has a material with nodes
            if not obj.data.materials:
                mat = bpy.data.materials.new(name=f"{obj.name}_AO_Material")
                obj.data.materials.append(mat)

            mat = obj.data.materials[0]
            mat.use_nodes = True
            nodes = mat.node_tree.nodes

            # Add / reuse the image texture node used as the bake target
            bake_node_name = "AO_Bake_Target"
            if bake_node_name in nodes:
                tex_node = nodes[bake_node_name]
            else:
                tex_node = nodes.new('ShaderNodeTexImage')
                tex_node.name = bake_node_name
            tex_node.image = image
            # Make it the active node so Blender knows where to bake
            nodes.active = tex_node

            # Switch to Cycles – AO baking is not supported in EEVEE
            context.scene.render.engine = 'CYCLES'

            # Configure bake settings
            context.scene.render.bake.use_pass_direct = False
            context.scene.render.bake.use_pass_indirect = False
            context.scene.render.bake.use_pass_color = False
            context.scene.cycles.samples = self.samples

            # Select only this object and make it active
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            context.view_layer.objects.active = obj

            # Bake
            bpy.ops.object.bake(type='AO')

            # Restore render engine
            context.scene.render.engine = original_engine

            # Optionally save the image
            if self.save_image:
                import os
                blend_path = bpy.data.filepath
                if blend_path:
                    save_dir = os.path.dirname(blend_path)
                    save_path = os.path.join(save_dir, f"{image_name}.png")
                    image.filepath_raw = save_path
                    image.file_format = 'PNG'
                    image.save()
                    self.report({'INFO'}, f"AO baked and saved: {save_path}")
                else:
                    image.pack()
                    self.report({'INFO'}, "AO baked and packed into .blend (save the file to keep it)")
            else:
                image.pack()
                self.report({'INFO'}, f"AO baked to image '{image_name}'")

            notification_system.FO4_NotificationSystem.notify(
                f"Ambient occlusion baked: {image_name}", 'INFO'
            )

            return {'FINISHED'}

        except Exception as e:
            # Try to restore the render engine even on failure
            try:
                context.scene.render.engine = original_engine
            except Exception:
                pass
            self.report({'ERROR'}, f"AO bake failed: {str(e)}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_SetupVegetationMaterial(Operator):
    """Setup a Fallout 4 vegetation material with alpha clip and two-sided rendering.

    Use this on any custom plant, tree, grass, or foliage mesh.  The operator:
    - Creates (or replaces) the material with FO4-compatible texture slots.
    - Sets Blend Mode to **Alpha Clip** so transparent leaf edges are masked
      correctly in-game (maps to BSLightingShaderProperty Alpha_Testing).
    - Disables backface culling so single-face leaf/grass quads are visible from
      both sides (maps to BSLightingShaderProperty Two_Sided flag).
    - Sets alpha threshold to 0.5 (= 128/255, the FO4 default cutoff).

    After running this operator install your textures with the **Install Texture**
    button or via the Texture tab.  For the alpha test to work, your diffuse
    texture must have an alpha channel (BC3 / DXT5 DDS format).
    """
    bl_idname = "fo4.setup_vegetation_material"
    bl_label = "Setup Vegetation Material"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}
        mat = texture_helpers.TextureHelpers.setup_vegetation_material(obj)
        if mat is None:
            self.report({'ERROR'}, "Failed to create vegetation material")
            return {'CANCELLED'}
        msg = (
            f"Vegetation material set up on '{obj.name}': "
            "Alpha Clip enabled (threshold 0.5 = 128/255), backface culling disabled. "
            "Now install a diffuse texture with an alpha channel (BC3 / DXT5 DDS)."
        )
        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(
            "Vegetation material (alpha clip + two-sided) applied", 'INFO'
        )
        return {'FINISHED'}


class FO4_OT_ExportVegetationAsNif(Operator):
    """Export the active mesh as a vegetation NIF (no collision, alpha-test ready).

    This is the correct export path for plants, trees, grass, and custom foliage:
    - Applies all pending transforms.
    - Ensures a UV map exists (smart-unwrap if missing).
    - Temporarily triangulates quads/n-gons for FO4 BSTriShape.
    - Skips collision mesh generation (most FO4 vegetation has no collision).
    - Validates that the material uses Alpha Clip / Alpha Blend so that the
      exporter writes the correct BSLightingShaderProperty flags.
    - Exporter priority: PyNifly → Niftools v0.1.1 → FBX fallback (for
      Cathedral Assets Optimizer conversion).

    After export, open the NIF in NifSkope to verify:
    - Root node is a BSFadeNode.
    - Geometry nodes are BSTriShape (not NiTriShape).
    - BSLightingShaderProperty has Alpha_Testing flag set.
    """
    bl_idname = "fo4.export_vegetation_as_nif"
    bl_label = "Export Vegetation NIF"
    bl_options = {'REGISTER'}

    filepath: bpy.props.StringProperty(subtype='FILE_PATH')
    filter_glob: bpy.props.StringProperty(default="*.nif;*.fbx", options={'HIDDEN'})

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        # Warn if the material is not set up for alpha clip (but don't block).
        has_alpha_mat = False
        for mat in (obj.data.materials or []):
            if mat and mat.blend_mode in ('CLIP', 'BLEND'):
                has_alpha_mat = True
                break
        if not has_alpha_mat:
            self.report({'WARNING'},
                "Material blend mode is not Alpha Clip or Blend. "
                "Run 'Setup Vegetation Material' first for correct transparency in-game.")

        # Mark this mesh so the export pipeline skips collision generation.
        # Vegetation in FO4 uses GRASS/MUSHROOM collision type (= no collision).
        prev_ctype = getattr(obj, 'fo4_collision_type', None)
        try:
            obj.fo4_collision_type = 'GRASS'
        except Exception:
            pass

        success, message = export_helpers.ExportHelpers.export_mesh_to_nif(obj, self.filepath)

        # Restore original collision type
        try:
            if prev_ctype is not None:
                obj.fo4_collision_type = prev_ctype
        except Exception:
            pass

        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
            return {'FINISHED'}
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')
            return {'CANCELLED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ExportLODChainAsNif(Operator):
    """Export the full LOD chain for the active object as separate NIF files.

    The operator looks for objects named ``{base}_LOD0``, ``{base}_LOD1``,
    ``{base}_LOD2``, ``{base}_LOD3`` in the current scene (where *base* is
    the name of the active object without any ``_LOD0`` suffix).  If the
    active object itself is the LOD0 source (un-suffixed name) it is treated
    as LOD0 and the remaining LODs are exported alongside it.

    Each LOD is exported to the chosen directory using the Niftools NIF
    exporter (or FBX fallback) with the same settings as the main export
    pipeline.  File names follow the FO4 LOD convention::

        meshes/{name}.nif       ← LOD0 (full detail)
        meshes/{name}_LOD1.nif  ← 75% reduction
        meshes/{name}_LOD2.nif  ← 50% reduction
        meshes/{name}_LOD3.nif  ← 25% reduction
        meshes/{name}_LOD4.nif  ← 10% reduction  (if present)

    Place the exported files in your mod's ``meshes/`` folder and reference
    them from a Creation Kit Static / Grass record.
    """
    bl_idname = "fo4.export_lod_chain_as_nif"
    bl_label = "Export LOD Chain as NIF"
    bl_options = {'REGISTER'}

    directory: bpy.props.StringProperty(subtype='DIR_PATH')

    @classmethod
    def poll(cls, context):
        return context.active_object is not None and context.active_object.type == 'MESH'

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        # Determine the base name (strip any existing _LOD* suffix so both the
        # raw source mesh and a renamed LOD0 object work as the starting point).
        import re
        base_name = re.sub(r'_LOD\d+$', '', obj.name)

        # Collect LOD objects: active object (LOD0 / source) + suffixed siblings.
        scene_objects = {o.name: o for o in context.scene.objects if o.type == 'MESH'}

        lod_map = {}  # LOD index → object
        if obj.name == base_name or obj.name == f"{base_name}_LOD0":
            lod_map[0] = obj

        for i in range(1, 5):  # LOD1 – LOD4
            candidate = scene_objects.get(f"{base_name}_LOD{i}")
            if candidate:
                lod_map[i] = candidate

        if not lod_map:
            self.report({'ERROR'}, f"No LOD objects found for '{base_name}'")
            return {'CANCELLED'}

        import os
        exported = []
        failed = []

        for lod_idx, lod_obj in sorted(lod_map.items()):
            if lod_idx == 0:
                filename = f"{base_name}.nif"
            else:
                filename = f"{base_name}_LOD{lod_idx}.nif"
            filepath = os.path.join(self.directory, filename)

            success, message = export_helpers.ExportHelpers.export_mesh_to_nif(lod_obj, filepath)
            if success:
                exported.append(filename)
            else:
                failed.append(f"{filename}: {message}")

        if exported:
            msg = f"Exported {len(exported)} LOD(s): {', '.join(exported)}"
            if failed:
                msg += f" | {len(failed)} failed: {'; '.join(failed)}"
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        else:
            err = "All LOD exports failed: " + "; ".join(failed)
            self.report({'ERROR'}, err)
            notification_system.FO4_NotificationSystem.notify(err, 'ERROR')
            return {'CANCELLED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}



class FO4_OT_CreateQuestTemplate(Operator):
    """Create a quest template with stages and objectives"""
    bl_idname = "fo4.create_quest_template"
    bl_label = "Create Quest Template"
    bl_options = {'REGISTER'}
    
    quest_name: StringProperty(
        name="Quest Name",
        description="Name of the quest",
        default="My Quest"
    )
    
    def execute(self, context):
        try:
            quest_data = quest_helpers.QuestHelpers.create_quest_template()
            quest_data["quest_name"] = self.quest_name
            
            self.report({'INFO'}, f"Created quest template: {self.quest_name}")
            self.report({'INFO'}, "Add stages and objectives in the Quest panel")
            
            notification_system.FO4_NotificationSystem.notify(
                f"Quest template created: {self.quest_name}", 'INFO'
            )
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create quest: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_ExportQuestData(Operator):
    """Export quest data to JSON file"""
    bl_idname = "fo4.export_quest_data"
    bl_label = "Export Quest Data"
    bl_options = {'REGISTER'}
    
    filepath: StringProperty(subtype='FILE_PATH')
    
    def execute(self, context):
        try:
            quest_data = quest_helpers.QuestHelpers.create_quest_template()
            # Add quest stages and objectives from scene
            success, message = quest_helpers.QuestHelpers.export_quest_data(quest_data, self.filepath)
            
            if success:
                self.report({'INFO'}, "Quest data exported successfully")
                notification_system.FO4_NotificationSystem.notify("Quest exported", 'INFO')
                return {'FINISHED'}
            else:
                self.report({'ERROR'}, message)
                return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Export failed: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_QuestGeneratePapyrusScript(Operator):
    """Generate Papyrus script template for a quest (dialog prompts Quest ID and Name)"""
    bl_idname = "fo4.quest_generate_papyrus_script"
    bl_label = "Quest Papyrus Script"
    bl_options = {'REGISTER'}

    quest_id: StringProperty(
        name="Quest ID",
        description="Quest Editor ID",
        default="MyQuest01"
    )

    quest_name: StringProperty(
        name="Quest Name",
        description="Quest display name",
        default="My Quest"
    )

    def execute(self, context):
        try:
            script = quest_helpers.QuestHelpers.generate_papyrus_script(self.quest_id, self.quest_name)

            # Create text block in Blender
            text = bpy.data.texts.new(f"{self.quest_id}Script.psc")
            text.write(script)

            self.report({'INFO'}, f"Generated Papyrus script: {self.quest_id}Script.psc")
            self.report({'INFO'}, "Check Text Editor for script")

            notification_system.FO4_NotificationSystem.notify(
                "Papyrus script generated", 'INFO'
            )
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to generate script: {str(e)}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# NPC and Creature Operators

class FO4_OT_CreateNPC(Operator):
    """Create NPC starting from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_npc"
    bl_label = "Create NPC"
    bl_options = {'REGISTER', 'UNDO'}

    npc_type: EnumProperty(
        name="NPC Type",
        items=[
            ('NPC_HUMAN',       "Human",       "Human NPC (actors/character)"),
            ('NPC_GHOUL',       "Ghoul",        "Feral ghoul (actors/feral)"),
            ('NPC_SUPERMUTANT', "Super Mutant", "Super Mutant (actors/supermutant)"),
            ('NPC_PROTECTRON',  "Protectron",   "Protectron robot (actors/protectron)"),
            ('NPC_SYNTH',       "Synth",        "Institute synth (actors/synth)"),
        ],
        default='NPC_HUMAN',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.npc_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_NPC_{self.npc_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.npc_type)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.npc_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create NPC: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateCreature(Operator):
    """Create creature starting from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_creature"
    bl_label = "Create Creature"
    bl_options = {'REGISTER', 'UNDO'}

    creature_type: EnumProperty(
        name="Creature",
        items=[
            ('CR_RADROACH',    "Radroach",    "Small radroach insect (actors/radroach)"),
            ('CR_MOLERAT',     "Mole Rat",    "Burrowing mole rat (actors/molerat)"),
            ('CR_DEATHCLAW',   "Deathclaw",   "Large apex predator (actors/deathclaw)"),
            ('CR_MIRELURK',    "Mirelurk",    "Crab-like creature (actors/mirelurk)"),
            ('CR_RADSCORPION', "Radscorpion", "Giant radscorpion (actors/radscorpion)"),
            ('CR_BRAHMIN',     "Brahmin",     "Two-headed cow (actors/brahmin)"),
        ],
        default='CR_DEATHCLAW',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.creature_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Creature_{self.creature_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.creature_type)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.creature_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create creature: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# World Building Operators

class FO4_OT_CreateInteriorCell(Operator):
    """Create architecture piece from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_interior_cell"
    bl_label = "Create Interior Cell"
    bl_options = {'REGISTER', 'UNDO'}

    cell_type: EnumProperty(
        name="Architecture",
        items=[
            ('WB_VAULT_WALL',  "Vault Wall",         "Concrete vault wall panel"),
            ('WB_VAULT_FLOOR', "Vault Floor",         "Vault floor tile"),
            ('WB_COMM_WALL',   "Commonwealth Wall",   "Commonwealth brick wall section"),
            ('WB_DOOR',        "Door Frame",          "Standard door frame"),
        ],
        default='WB_VAULT_WALL',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.cell_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Arch_{self.cell_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.cell_type)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.cell_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create cell: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateDoorFrame(Operator):
    """Create door frame marker"""
    bl_idname = "fo4.create_door_frame"
    bl_label = "Create Door Frame"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        try:
            obj = world_building_helpers.WorldBuildingHelpers.create_door_frame()
            
            self.report({'INFO'}, "Created door frame marker")
            notification_system.FO4_NotificationSystem.notify("Door frame created", 'INFO')
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create door frame: {str(e)}")
            return {'CANCELLED'}


class FO4_OT_CreateNavMesh(Operator):
    """Create navmesh helper plane"""
    bl_idname = "fo4.create_navmesh"
    bl_label = "Create NavMesh Helper"
    bl_options = {'REGISTER', 'UNDO'}
    
    width: FloatProperty(name="Width", default=10.0, min=1.0, max=100.0)
    length: FloatProperty(name="Length", default=10.0, min=1.0, max=100.0)
    
    def execute(self, context):
        try:
            obj = world_building_helpers.WorldBuildingHelpers.create_navmesh_helper((self.width, self.length))
            
            self.report({'INFO'}, "Created navmesh helper")
            notification_system.FO4_NotificationSystem.notify("NavMesh helper created", 'INFO')
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create navmesh: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateWorkshopObject(Operator):
    """Create workshop object from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_workshop_object"
    bl_label = "Create Workshop Object"
    bl_options = {'REGISTER', 'UNDO'}

    object_type: EnumProperty(
        name="Object",
        items=[
            ('WB_BED',        "Bed",         "Sleeping bed / sleeping bag"),
            ('WB_WORKBENCH',  "Workbench",   "Crafting workbench"),
            ('WB_CHAIR',      "Chair",       "Sitting chair"),
            ('WB_GENERATOR',  "Generator",   "Power generator"),
        ],
        default='WB_WORKBENCH',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.object_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Workshop_{self.object_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.object_type)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.object_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create object: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateLightingPreset(Operator):
    """Create lighting preset for scene"""
    bl_idname = "fo4.create_lighting_preset"
    bl_label = "Create Lighting Preset"
    bl_options = {'REGISTER', 'UNDO'}
    
    preset: EnumProperty(
        name="Preset",
        items=[
            ('INTERIOR', "Interior", "Standard interior lighting"),
            ('VAULT', "Vault", "Cold vault lighting"),
            ('WASTELAND', "Wasteland", "Harsh outdoor lighting"),
        ]
    )
    
    def execute(self, context):
        try:
            lights = world_building_helpers.LightingHelpers.create_light_preset(self.preset)
            
            self.report({'INFO'}, f"Created {self.preset} lighting preset ({len(lights)} lights)")
            notification_system.FO4_NotificationSystem.notify(
                f"Lighting preset: {self.preset}", 'INFO'
            )
            return {'FINISHED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create lighting: {str(e)}")
            return {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# Item Creation Operators

class FO4_OT_CreateWeaponItem(Operator):
    """Create weapon item from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_weapon_item"
    bl_label = "Create Weapon Item"
    bl_options = {'REGISTER', 'UNDO'}

    weapon_category: EnumProperty(
        name="Weapon",
        items=[
            ('10MM',        "10mm Pistol",   "Semi-auto pistol"),
            ('ASSAULT',     "Assault Rifle", "Automatic rifle"),
            ('COMBAT_RIFLE',"Combat Rifle",  "Full-auto rifle"),
            ('LASER',       "Laser Rifle",   "Energy weapon"),
            ('MINIGUN',     "Minigun",       "Heavy cannon"),
            ('FATMAN',      "Fat Man",       "Nuke launcher"),
        ],
        default='ASSAULT',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.weapon_category)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_WeaponItem_{self.weapon_category}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.weapon_category)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.weapon_category}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create weapon: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateArmorItem(Operator):
    """Create armor item from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_armor_item"
    bl_label = "Create Armor Item"
    bl_options = {'REGISTER', 'UNDO'}

    armor_slot: EnumProperty(
        name="Armor",
        items=[
            ('ARMOR_LEATHER', "Leather Armor",  "Light leather armor body"),
            ('ARMOR_COMBAT',  "Combat Armor",   "Medium combat armor body"),
            ('ARMOR_METAL',   "Metal Armor",    "Heavy metal armor body"),
            ('ARMOR_RAIDER',  "Raider Armor",   "Makeshift raider armor"),
            ('VAULT_SUIT',    "Vault Suit",     "Vault-Tec jumpsuit"),
        ],
        default='ARMOR_COMBAT',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.armor_slot)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_ArmorItem_{self.armor_slot}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.armor_slot)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.armor_slot}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create armor: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreatePowerArmorPiece(Operator):
    """Create power armor piece from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_power_armor_piece"
    bl_label = "Create Power Armor Piece"
    bl_options = {'REGISTER', 'UNDO'}

    piece: EnumProperty(
        name="Piece",
        items=[
            ('PA_TORSO_T60',  "T-60 Torso",      "T-60 chest/torso piece"),
            ('PA_HELMET_T60', "T-60 Helmet",      "T-60 helmet"),
            ('PA_LARM_T60',   "T-60 Left Arm",    "T-60 left arm"),
            ('PA_RARM_T60',   "T-60 Right Arm",   "T-60 right arm"),
            ('PA_LLEG_T60',   "T-60 Left Leg",    "T-60 left leg"),
            ('PA_RLEG_T60',   "T-60 Right Leg",   "T-60 right leg"),
        ],
        default='PA_TORSO_T60',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.piece)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_PA_{self.piece}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.piece)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.piece}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create power armor: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateConsumable(Operator):
    """Create consumable item from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_consumable"
    bl_label = "Create Consumable"
    bl_options = {'REGISTER', 'UNDO'}

    item_type: EnumProperty(
        name="Item",
        items=[
            ('ITEM_STIMPAK',  "Stimpak",   "Healing stimpak (clutter/junk)"),
            ('ITEM_NUKACOLA', "Nuka-Cola", "Nuka-Cola bottle"),
            ('ITEM_FOOD',     "Food",      "Packaged food item"),
            ('ITEM_CHEM',     "Chem",      "Chemical/drug item"),
        ],
        default='ITEM_STIMPAK',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.item_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Consumable_{self.item_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.item_type)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.item_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create consumable: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateMiscItem(Operator):
    """Create miscellaneous item from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_misc_item"
    bl_label = "Create Misc Item"
    bl_options = {'REGISTER', 'UNDO'}

    item_type: EnumProperty(
        name="Item",
        items=[
            ('ITEM_TOOL',      "Tool",       "Wrench or hand tool"),
            ('ITEM_COMPONENT', "Component",  "Crafting component (screws etc.)"),
            ('ITEM_JUNK',      "Junk",       "Generic junk item"),
            ('ITEM_KEY',       "Key",        "Key or access card"),
            ('ITEM_HOLOTAPE',  "Holotape",   "Holotape data recording"),
        ],
        default='ITEM_TOOL',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.item_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_MiscItem_{self.item_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.item_type)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.item_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create misc item: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_CreateClutterObject(Operator):
    """Create clutter object from an actual FO4 game mesh (requires loose NIF files)"""
    bl_idname = "fo4.create_clutter_object"
    bl_label = "Create Clutter Object"
    bl_options = {'REGISTER', 'UNDO'}

    clutter_type: EnumProperty(
        name="Clutter",
        items=[
            ('ITEM_BOTTLE', "Bottle",  "Drink bottle (clutter/junk)"),
            ('ITEM_CAN',    "Can",     "Empty food can"),
            ('ITEM_BOX',    "Box",     "Cardboard/wooden box"),
            ('ITEM_JUNK',   "Junk",    "Generic junk item"),
        ],
        default='ITEM_BOTTLE',
    )

    def execute(self, context):
        try:
            nif_path = mesh_helpers.SmartPresets.resolve_game_nif(self.clutter_type)
            if nif_path:
                ok, msg = mesh_helpers.SmartPresets.import_game_nif(nif_path)
                if ok:
                    if context.active_object:
                        context.active_object.name = f"FO4_Clutter_{self.clutter_type}"
                    mesh_helpers.SmartPresets.apply_nif_v25_settings(context, self.clutter_type)
                    self.report({'INFO'}, msg)
                    notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
                    return {'FINISHED'}
                self.report({'ERROR'}, f"{msg} - game mesh import failed")
                return {'CANCELLED'}

            self.report({'ERROR'}, f"No game mesh found for {self.clutter_type}. {mesh_helpers.SmartPresets.FALLBACK_MSG}")
            return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Failed to create clutter: {e}")
            return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# Preset Library Operators

class FO4_OT_SavePreset(Operator):
    """Save current object(s) as a preset"""
    bl_idname = "fo4.save_preset"
    bl_label = "Save Preset"
    bl_options = {'REGISTER', 'UNDO'}
    
    preset_name: StringProperty(
        name="Preset Name",
        description="Name for this preset",
        default="New Preset"
    )
    
    category: EnumProperty(
        name="Category",
        items=[
            ('MESH', "Mesh", "Mesh preset"),
            ('MATERIAL', "Material", "Material preset"),
            ('VEGETATION', "Vegetation", "Vegetation preset"),
            ('WEAPON', "Weapon", "Weapon preset"),
            ('ARMOR', "Armor", "Armor preset"),
            ('NPC', "NPC", "NPC preset"),
            ('ITEM', "Item", "Item preset"),
            ('WORLD', "World Building", "World building preset"),
            ('WORKFLOW', "Workflow", "Complete workflow preset"),
        ],
        default='MESH'
    )
    
    description: StringProperty(
        name="Description",
        description="Description of this preset",
        default=""
    )
    
    tags: StringProperty(
        name="Tags",
        description="Search tags (comma separated)",
        default=""
    )
    
    def execute(self, context):
        selected = context.selected_objects
        
        if not selected:
            self.report({'ERROR'}, "No objects selected")
            return {'CANCELLED'}
        
        # Collect data from selected objects
        preset_data = {
            'objects': [],
            'blender_version': bpy.app.version_string
        }
        
        for obj in selected:
            obj_data = {
                'name': obj.name,
                'type': obj.type,
                'location': list(obj.location),
                'rotation': list(obj.rotation_euler),
                'scale': list(obj.scale),
            }
            
            if obj.type == 'MESH':
                obj_data['vertex_count'] = len(obj.data.vertices)
                obj_data['polygon_count'] = len(obj.data.polygons)
            
            # Save materials
            if obj.data.materials:
                obj_data['materials'] = [mat.name for mat in obj.data.materials if mat]
            
            preset_data['objects'].append(obj_data)
        
        # Save preset
        success, message = preset_library.PresetLibrary.save_preset(
            self.preset_name,
            self.category,
            preset_data,
            self.description,
            self.tags
        )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                f"Preset saved: {self.preset_name}", 'INFO'
            )
        else:
            self.report({'ERROR'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_LoadPreset(Operator):
    """Load a preset from the library"""
    bl_idname = "fo4.load_preset"
    bl_label = "Load Preset"
    bl_options = {'REGISTER', 'UNDO'}
    
    filepath: StringProperty(
        name="Preset File",
        description="Path to preset file",
        subtype='FILE_PATH'
    )
    
    def execute(self, context):
        if not self.filepath:
            self.report({'ERROR'}, "No preset file specified")
            return {'CANCELLED'}
        
        preset_data = preset_library.PresetLibrary.load_preset(self.filepath)
        
        if not preset_data:
            self.report({'ERROR'}, "Failed to load preset")
            return {'CANCELLED'}
        
        # Increment use count
        preset_library.PresetLibrary.increment_use_count(self.filepath)
        
        self.report({'INFO'}, f"Loaded preset with {len(preset_data.get('objects', []))} objects")
        notification_system.FO4_NotificationSystem.notify("Preset loaded", 'INFO')
        
        return {'FINISHED'}


class FO4_OT_DeletePreset(Operator):
    """Delete a preset from the library"""
    bl_idname = "fo4.delete_preset"
    bl_label = "Delete Preset"
    bl_options = {'REGISTER'}
    
    filepath: StringProperty(
        name="Preset File",
        description="Path to preset file",
        subtype='FILE_PATH'
    )
    
    def execute(self, context):
        if not self.filepath:
            self.report({'ERROR'}, "No preset file specified")
            return {'CANCELLED'}
        
        success, message = preset_library.PresetLibrary.delete_preset(self.filepath)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify("Preset deleted", 'INFO')
        else:
            self.report({'ERROR'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)


class FO4_OT_RefreshPresetLibrary(Operator):
    """Refresh the preset library"""
    bl_idname = "fo4.refresh_preset_library"
    bl_label = "Refresh Library"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        # Reload index
        index = preset_library.PresetLibrary.load_index()
        preset_count = len(index.get('presets', []))
        
        self.report({'INFO'}, f"Library refreshed: {preset_count} presets")
        return {'FINISHED'}


# Automation System Operators

class FO4_OT_StartRecording(Operator):
    """Start recording actions for macro creation"""
    bl_idname = "fo4.start_recording"
    bl_label = "Start Recording"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        automation_system.AutomationSystem.start_recording()
        context.scene.fo4_is_recording = True
        
        self.report({'INFO'}, "Recording started")
        notification_system.FO4_NotificationSystem.notify(
            "Recording started - perform actions to record", 'INFO'
        )
        
        return {'FINISHED'}


class FO4_OT_StopRecording(Operator):
    """Stop recording actions"""
    bl_idname = "fo4.stop_recording"
    bl_label = "Stop Recording"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        automation_system.AutomationSystem.stop_recording()
        context.scene.fo4_is_recording = False
        
        action_count = len(automation_system.AutomationSystem.recorded_actions)
        self.report({'INFO'}, f"Recording stopped: {action_count} actions captured")
        notification_system.FO4_NotificationSystem.notify(
            f"Recorded {action_count} actions", 'INFO'
        )
        
        return {'FINISHED'}


class FO4_OT_SaveMacro(Operator):
    """Save recorded actions as a macro"""
    bl_idname = "fo4.save_macro"
    bl_label = "Save Macro"
    bl_options = {'REGISTER'}
    
    macro_name: StringProperty(
        name="Macro Name",
        description="Name for this macro",
        default="New Macro"
    )
    
    description: StringProperty(
        name="Description",
        description="Description of what this macro does",
        default=""
    )
    
    def execute(self, context):
        success, message = automation_system.AutomationSystem.save_macro(
            self.macro_name,
            self.description
        )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                f"Macro saved: {self.macro_name}", 'INFO'
            )
        else:
            self.report({'ERROR'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_ExecuteMacro(Operator):
    """Execute a saved macro"""
    bl_idname = "fo4.execute_macro"
    bl_label = "Execute Macro"
    bl_options = {'REGISTER', 'UNDO'}
    
    filepath: StringProperty(
        name="Macro File",
        description="Path to macro file",
        subtype='FILE_PATH'
    )
    
    def execute(self, context):
        if not self.filepath:
            self.report({'ERROR'}, "No macro file specified")
            return {'CANCELLED'}
        
        success, message = automation_system.AutomationSystem.execute_macro(self.filepath)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify("Macro executed", 'INFO')
        else:
            self.report({'ERROR'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}


class FO4_OT_DeleteMacro(Operator):
    """Delete a macro"""
    bl_idname = "fo4.delete_macro"
    bl_label = "Delete Macro"
    bl_options = {'REGISTER'}
    
    filepath: StringProperty(
        name="Macro File",
        description="Path to macro file",
        subtype='FILE_PATH'
    )
    
    def execute(self, context):
        success, message = automation_system.AutomationSystem.delete_macro(self.filepath)
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify("Macro deleted", 'INFO')
        else:
            self.report({'ERROR'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)


class FO4_OT_ExecuteWorkflowTemplate(Operator):
    """Execute a pre-defined workflow template"""
    bl_idname = "fo4.execute_workflow_template"
    bl_label = "Execute Workflow Template"
    bl_options = {'REGISTER', 'UNDO'}
    
    template_id: EnumProperty(
        name="Template",
        items=[
            ('complete_weapon', "Complete Weapon", "Full weapon creation workflow"),
            ('vegetation_patch', "Vegetation Patch", "Create optimized vegetation area"),
            ('npc_creation', "NPC Creation", "Create and setup an NPC"),
            ('batch_export', "Batch Export", "Optimize and export multiple objects"),
        ]
    )
    
    def execute(self, context):
        success, message = automation_system.WorkflowTemplate.execute_template(
            self.template_id,
            context
        )
        
        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(
                "Workflow template executed", 'INFO'
            )
        else:
            self.report({'ERROR'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}
    
    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# Desktop Tutorial App Integration Operators

class FO4_OT_ConnectDesktopApp(Operator):
    """Connect to desktop tutorial application"""
    bl_idname = "fo4.connect_desktop_app"
    bl_label = "Connect to Desktop App"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        scene = context.scene
        
        # Set server URL
        desktop_tutorial_client.DesktopTutorialClient.set_server_url(
            scene.fo4_desktop_server_host,
            scene.fo4_desktop_server_port
        )
        
        # Attempt connection
        success, message = desktop_tutorial_client.DesktopTutorialClient.connect()
        
        if success:
            scene.fo4_desktop_connected = True
            self.report({'INFO'}, f"Connected: {message}")
            notification_system.FO4_NotificationSystem.notify(
                "Connected to desktop tutorial app", 'INFO'
            )
        else:
            scene.fo4_desktop_connected = False
            self.report({'ERROR'}, f"Connection failed: {message}")
            notification_system.FO4_NotificationSystem.notify(
                f"Connection failed: {message}", 'ERROR'
            )
        
        return {'FINISHED'} if success else {'CANCELLED'}


class FO4_OT_DisconnectDesktopApp(Operator):
    """Disconnect from desktop tutorial application"""
    bl_idname = "fo4.disconnect_desktop_app"
    bl_label = "Disconnect from Desktop App"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        scene = context.scene
        
        success, message = desktop_tutorial_client.DesktopTutorialClient.disconnect()
        
        scene.fo4_desktop_connected = False
        self.report({'INFO'}, message)
        notification_system.FO4_NotificationSystem.notify(
            "Disconnected from desktop app", 'INFO'
        )
        
        return {'FINISHED'}


class FO4_OT_CheckDesktopConnection(Operator):
    """Check connection status with desktop tutorial app"""
    bl_idname = "fo4.check_desktop_connection"
    bl_label = "Check Connection"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        status = desktop_tutorial_client.DesktopTutorialClient.get_connection_status()
        
        if status['connected']:
            self.report({'INFO'}, f"Connected to {status['server_url']}")
        else:
            error_msg = status.get('last_error', 'Not connected')
            self.report({'WARNING'}, f"Not connected: {error_msg}")
        
        return {'FINISHED'}


class FO4_OT_SyncDesktopStep(Operator):
    """Synchronize current tutorial step with desktop app"""
    bl_idname = "fo4.sync_desktop_step"
    bl_label = "Sync Tutorial Step"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        scene = context.scene
        
        if not scene.fo4_desktop_connected:
            self.report({'ERROR'}, "Not connected to desktop app")
            return {'CANCELLED'}
        
        # Get current step from server
        step_data, message = desktop_tutorial_client.DesktopTutorialClient.get_current_step()
        
        if step_data:
            scene.fo4_desktop_current_step_id = step_data.get('step_id', 0)
            scene.fo4_desktop_current_step_title = step_data.get('title', '')
            
            import datetime
            scene.fo4_desktop_last_sync = datetime.datetime.now().strftime("%H:%M:%S")
            
            self.report({'INFO'}, f"Synced: {step_data.get('title', 'Step')}")
            notification_system.FO4_NotificationSystem.notify(
                f"Tutorial step synced: {step_data.get('title', '')}", 'INFO'
            )
        else:
            self.report({'ERROR'}, f"Sync failed: {message}")
        
        return {'FINISHED'} if step_data else {'CANCELLED'}


class FO4_OT_DesktopNextStep(Operator):
    """Move to next tutorial step on desktop app"""
    bl_idname = "fo4.desktop_next_step"
    bl_label = "Next Step (Desktop)"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        scene = context.scene
        
        if not scene.fo4_desktop_connected:
            self.report({'ERROR'}, "Not connected to desktop app")
            return {'CANCELLED'}
        
        success, message = desktop_tutorial_client.DesktopTutorialClient.next_step()
        
        if success:
            # Sync to get updated step
            bpy.ops.fo4.sync_desktop_step()
            self.report({'INFO'}, "Moved to next step")
        else:
            self.report({'WARNING'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}


class FO4_OT_DesktopPreviousStep(Operator):
    """Move to previous tutorial step on desktop app"""
    bl_idname = "fo4.desktop_previous_step"
    bl_label = "Previous Step (Desktop)"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        scene = context.scene
        
        if not scene.fo4_desktop_connected:
            self.report({'ERROR'}, "Not connected to desktop app")
            return {'CANCELLED'}
        
        success, message = desktop_tutorial_client.DesktopTutorialClient.previous_step()
        
        if success:
            # Sync to get updated step
            bpy.ops.fo4.sync_desktop_step()
            self.report({'INFO'}, "Moved to previous step")
        else:
            self.report({'WARNING'}, message)
        
        return {'FINISHED'} if success else {'CANCELLED'}


class FO4_OT_SendEventToDesktop(Operator):
    """Send event to desktop tutorial app"""
    bl_idname = "fo4.send_event_to_desktop"
    bl_label = "Send Event to Desktop"
    bl_options = {'REGISTER'}
    
    event_type: StringProperty(
        name="Event Type",
        description="Type of event to send",
        default="action_completed"
    )
    
    event_data: StringProperty(
        name="Event Data",
        description="Event data",
        default=""
    )
    
    def execute(self, context):
        scene = context.scene
        
        if not scene.fo4_desktop_connected:
            self.report({'ERROR'}, "Not connected to desktop app")
            return {'CANCELLED'}
        
        success, message = desktop_tutorial_client.DesktopTutorialClient.send_event(
            self.event_type,
            self.event_data
        )
        
        if success:
            self.report({'INFO'}, f"Event sent: {self.event_type}")
        else:
            self.report({'ERROR'}, f"Failed to send event: {message}")
        
        return {'FINISHED'} if success else {'CANCELLED'}


class FO4_OT_PullOriginalToDesktop(Operator):
    """Copy the addon zip to the user's Desktop folder for easy installation"""
    bl_idname = "fo4.pull_original_to_desktop"
    bl_label = "Pull Original to Desktop"
    bl_options = {'REGISTER'}

    def execute(self, context):
        if desktop_tutorial_client is None:
            self.report({'ERROR'}, "Desktop tutorial client module not available")
            return {'CANCELLED'}

        success, message, dest_path = desktop_tutorial_client.DesktopTutorialClient.pull_original_to_desktop()

        if success:
            self.report({'INFO'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'INFO')
        else:
            self.report({'ERROR'}, message)
            notification_system.FO4_NotificationSystem.notify(message, 'ERROR')

        return {'FINISHED'} if success else {'CANCELLED'}


class FO4_OT_GetDesktopProgress(Operator):
    """Get tutorial progress from desktop app"""
    bl_idname = "fo4.get_desktop_progress"
    bl_label = "Get Tutorial Progress"
    bl_options = {'REGISTER'}
    
    def execute(self, context):
        scene = context.scene
        
        if not scene.fo4_desktop_connected:
            self.report({'ERROR'}, "Not connected to desktop app")
            return {'CANCELLED'}
        
        progress, message = desktop_tutorial_client.DesktopTutorialClient.get_progress()
        
        if progress:
            completed = progress.get('completed', 0)
            total = progress.get('total', 0)
            percentage = progress.get('percentage', 0)
            
            self.report({'INFO'}, f"Progress: {completed}/{total} steps ({percentage:.0f}%)")
            notification_system.FO4_NotificationSystem.notify(
                f"Tutorial progress: {completed}/{total} steps", 'INFO'
            )
        else:
            self.report({'ERROR'}, f"Failed to get progress: {message}")
        
        return {'FINISHED'} if progress else {'CANCELLED'}


# Shap-E AI Generation Operators



# Register all operators

class FO4_OT_ClearOperationLog(Operator):
    """Clear the persistent operation log"""
    bl_idname = "fo4.clear_operation_log"
    bl_label = "Clear Operation Log"
    bl_options = {'REGISTER'}

    def execute(self, context):
        notification_system.OperationLog.clear()
        self.report({'INFO'}, "Operation log cleared")
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)


# FO4_OT_ReloadAddon is defined in setup_operators.py and registered before
# this module.  Do NOT redefine it here - see the FO4_OT_InstallPythonDeps
# comment above for the same reason.


class FO4_OT_ImportModFolder(Operator):
    """Import entire mod folder structure into Blender"""
    bl_idname = "fo4.import_mod_folder"
    bl_label = "Import Mod Folder"
    bl_description = "Import all NIF files from a mod folder, organized as collections"
    bl_options = {'REGISTER', 'UNDO'}

    directory: StringProperty(
        name="Mod Folder",
        description="Path to mod folder containing meshes",
        subtype='DIR_PATH'
    )

    import_textures: BoolProperty(
        name="Import Textures",
        description="Try to import associated textures",
        default=True
    )

    def execute(self, context):
        import os
        from pathlib import Path

        if not self.directory:
            self.report({'ERROR'}, "No folder selected")
            return {'CANCELLED'}

        mod_root = Path(self.directory)
        if not mod_root.exists():
            self.report({'ERROR'}, f"Folder does not exist: {mod_root}")
            return {'CANCELLED'}

        # Find all NIF files recursively
        nif_files = list(mod_root.rglob("*.nif"))

        if not nif_files:
            self.report({'WARNING'}, f"No NIF files found in {mod_root}")
            return {'CANCELLED'}

        self.report({'INFO'}, f"Found {len(nif_files)} NIF files")

        # Check if NIF importer is available
        try:
            import bpy
            # Try to check if nif import operator exists
            if not hasattr(bpy.ops, 'import_scene') or not hasattr(bpy.ops.import_scene, 'nif'):
                self.report({'ERROR'}, "NIF importer not available. Install Niftools addon first.")
                return {'CANCELLED'}
        except Exception as e:
            self.report({'ERROR'}, f"Cannot check NIF importer: {e}")
            return {'CANCELLED'}

        # Create root collection for this mod
        mod_name = mod_root.name
        root_collection = bpy.data.collections.new(f"MOD_{mod_name}")
        context.scene.collection.children.link(root_collection)

        imported_count = 0
        failed_count = 0
        collection_cache = {}

        for nif_path in nif_files:
            try:
                # Get relative path from mod root
                rel_path = nif_path.relative_to(mod_root)

                # Create collection hierarchy based on folder structure
                folders = list(rel_path.parent.parts)
                current_collection = root_collection

                for folder in folders:
                    collection_key = "/".join([current_collection.name, folder])

                    if collection_key not in collection_cache:
                        new_collection = bpy.data.collections.new(folder)
                        current_collection.children.link(new_collection)
                        collection_cache[collection_key] = new_collection

                    current_collection = collection_cache[collection_key]

                # Import the NIF file
                before_objects = set(context.scene.objects)

                try:
                    bpy.ops.import_scene.nif(filepath=str(nif_path))
                except Exception as import_error:
                    self.report({'WARNING'}, f"Failed to import {nif_path.name}: {import_error}")
                    failed_count += 1
                    continue

                # Find newly imported objects
                after_objects = set(context.scene.objects)
                new_objects = after_objects - before_objects

                # Move objects to the correct collection and store original path
                for obj in new_objects:
                    # Store original file path as custom property
                    obj["fo4_original_path"] = str(nif_path)
                    obj["fo4_mod_root"] = str(mod_root)

                    # Move to correct collection
                    for col in obj.users_collection:
                        col.objects.unlink(obj)
                    current_collection.objects.link(obj)

                imported_count += 1

            except Exception as e:
                self.report({'WARNING'}, f"Error processing {nif_path.name}: {e}")
                failed_count += 1
                continue

        self.report({'INFO'}, f"Import complete: {imported_count} files imported, {failed_count} failed")
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ExportModFolder(Operator):
    """Export all meshes back to their original mod folder locations"""
    bl_idname = "fo4.export_mod_folder"
    bl_label = "Export Mod Folder"
    bl_description = "Export all meshes back to their original file paths"
    bl_options = {'REGISTER'}

    def execute(self, context):
        from pathlib import Path

        exported_count = 0
        skipped_count = 0
        failed_count = 0

        # Find all objects with original path stored
        for obj in context.scene.objects:
            if "fo4_original_path" not in obj:
                skipped_count += 1
                continue

            original_path = Path(obj["fo4_original_path"])

            try:
                # Make sure parent directories exist
                original_path.parent.mkdir(parents=True, exist_ok=True)

                # Select only this object
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                context.view_layer.objects.active = obj

                # Export using the addon's export functionality with proper FO4 NIF settings
                result, message = export_helpers.ExportHelpers.export_mesh_to_nif(
                    obj,
                    str(original_path)
                )

                if result:
                    exported_count += 1
                else:
                    self.report({'WARNING'}, f"Failed to export {obj.name}: {message}")
                    failed_count += 1

            except Exception as e:
                self.report({'WARNING'}, f"Error exporting {obj.name}: {e}")
                failed_count += 1
                continue

        if skipped_count > 0:
            self.report({'INFO'}, f"Export complete: {exported_count} exported, {skipped_count} skipped (no original path), {failed_count} failed")
        else:
            self.report({'INFO'}, f"Export complete: {exported_count} exported, {failed_count} failed")

        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Post-Processing Operators
# ---------------------------------------------------------------------------

class FO4_OT_SetupPostProcessingCompositor(Operator):
    """Set up Blender's compositor to preview Fallout 4-style post-processing.

    Creates a chain of compositor nodes that simulates the bloom, colour
    grading, tint, and vignette effects that Fallout 4 applies in-engine via
    its ImageSpace (IMGS) record.  The setup is non-destructive – all nodes
    are tagged with 'FO4_PP_' and can be removed at any time with the
    'Clear Post-Processing' button.

    After running this operator:
    1. Switch the 3-D viewport to 'Rendered' mode to see the effect.
    2. Adjust the sliders in the 'Post-Processing' panel.
    3. When happy, use 'Export ImageSpace Data' to save a JSON file with the
       Creation Kit record values ready to enter in CK.
    """
    bl_idname = "fo4.setup_post_processing"
    bl_label = "Setup Post-Processing"
    bl_options = {'REGISTER', 'UNDO'}

    preset: bpy.props.EnumProperty(
        name="Preset",
        description="Starting post-processing preset",
        items=_PP_PRESET_ITEMS,
        default="VANILLA",
    )

    def execute(self, context):
        scene = context.scene
        # Write the chosen preset values into scene properties first so that
        # sync_from_scene_props() (called inside setup_compositor) picks them up.
        p = post_processing_helpers.PostProcessingHelpers.get_preset(self.preset)
        try:
            scene.fo4_pp_preset           = self.preset
            scene.fo4_pp_bloom_strength   = p["bloom_strength"]
            scene.fo4_pp_bloom_threshold  = p["bloom_threshold"]
            scene.fo4_pp_bloom_radius     = p["bloom_radius"]
            scene.fo4_pp_saturation       = p["saturation"]
            scene.fo4_pp_contrast         = p["contrast"]
            scene.fo4_pp_brightness       = p["brightness"]
            scene.fo4_pp_tint_r           = p["tint_r"]
            scene.fo4_pp_tint_g           = p["tint_g"]
            scene.fo4_pp_tint_b           = p["tint_b"]
            scene.fo4_pp_tint_strength    = p["tint_strength"]
            scene.fo4_pp_vignette         = p["vignette"]
            scene.fo4_pp_cinematic_bars   = p["cinematic_bars"]
            scene.fo4_pp_dof_enabled      = p["dof_enabled"]
            scene.fo4_pp_dof_fstop        = p["dof_fstop"]
            scene.fo4_pp_eye_adapt_speed  = p["eye_adapt_speed"]
            scene.fo4_pp_eye_adapt_strength = p["eye_adapt_strength"]
            scene.fo4_pp_white            = p["white"]
        except Exception:
            pass  # properties may not yet be registered in certain edge-cases

        ok, msg = post_processing_helpers.PostProcessingHelpers.setup_compositor(
            scene, self.preset
        )
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_ApplyPostProcessingPreset(Operator):
    """Apply a named Fallout 4 post-processing preset to the compositor."""
    bl_idname = "fo4.apply_pp_preset"
    bl_label = "Apply Preset"
    bl_options = {'REGISTER', 'UNDO'}

    preset: bpy.props.EnumProperty(
        name="Preset",
        description="Post-processing preset to apply",
        items=_PP_PRESET_ITEMS,
        default="VANILLA",
    )

    def execute(self, context):
        scene = context.scene
        p = post_processing_helpers.PostProcessingHelpers.get_preset(self.preset)
        # Sync preset values to scene properties
        try:
            scene.fo4_pp_preset           = self.preset
            scene.fo4_pp_bloom_strength   = p["bloom_strength"]
            scene.fo4_pp_bloom_threshold  = p["bloom_threshold"]
            scene.fo4_pp_bloom_radius     = p["bloom_radius"]
            scene.fo4_pp_saturation       = p["saturation"]
            scene.fo4_pp_contrast         = p["contrast"]
            scene.fo4_pp_brightness       = p["brightness"]
            scene.fo4_pp_tint_r           = p["tint_r"]
            scene.fo4_pp_tint_g           = p["tint_g"]
            scene.fo4_pp_tint_b           = p["tint_b"]
            scene.fo4_pp_tint_strength    = p["tint_strength"]
            scene.fo4_pp_vignette         = p["vignette"]
            scene.fo4_pp_cinematic_bars   = p["cinematic_bars"]
            scene.fo4_pp_dof_enabled      = p["dof_enabled"]
            scene.fo4_pp_dof_fstop        = p["dof_fstop"]
            scene.fo4_pp_eye_adapt_speed  = p["eye_adapt_speed"]
            scene.fo4_pp_eye_adapt_strength = p["eye_adapt_strength"]
            scene.fo4_pp_white            = p["white"]
        except Exception:
            pass

        ok, msg = post_processing_helpers.PostProcessingHelpers.apply_preset_to_compositor(
            scene, self.preset
        )
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_ClearPostProcessing(Operator):
    """Remove all FO4 post-processing compositor nodes.

    Only nodes created by the 'Setup Post-Processing' operator (tagged with
    'FO4_PP_*') are removed.  Any user-created compositor nodes are untouched.
    """
    bl_idname = "fo4.clear_post_processing"
    bl_label = "Clear Post-Processing"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        ok, msg = post_processing_helpers.PostProcessingHelpers.clear_compositor(
            context.scene
        )
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}


class FO4_OT_ExportImageSpaceData(Operator):
    """Export current post-processing settings as a Fallout 4 ImageSpace JSON.

    The exported JSON contains the exact field names used by the Creation Kit
    ImageSpace (IMGS) and ImageSpace Modifier (IMAD) record editors.  Enter
    the values manually in CK, or use an xEdit Papyrus import script.

    IMGS fields exported:
      EyeAdaptSpeed, EyeAdaptStrength, BloomBlurRadius, BloomThreshold,
      BloomScale, ReceiveBloomThreshold, White, SunlightScale, SkyScale,
      Saturation, Contrast, TintColor (R/G/B/A), CinematicBars

    IMAD (start-state) fields exported:
      Duration, DepthOfField (Strength, Distance, Range),
      Bloom (Strength), Tint (R/G/B/A), Saturation, Contrast
    """
    bl_idname = "fo4.export_imagespace_data"
    bl_label = "Export ImageSpace Data"
    bl_options = {'REGISTER'}

    filepath: bpy.props.StringProperty(subtype='FILE_PATH')
    filter_glob: bpy.props.StringProperty(default="*.json", options={'HIDDEN'})

    def execute(self, context):
        ok, msg = post_processing_helpers.PostProcessingHelpers.export_imagespace_data(
            context.scene, self.filepath
        )
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_SyncPostProcessingProps(Operator):
    """Manually sync scene property sliders to the compositor nodes.

    This is called automatically when any fo4_pp_* property changes.  Run it
    manually if the compositor preview seems out of sync with the sliders.
    """
    bl_idname = "fo4.sync_pp_props"
    bl_label = "Sync to Compositor"

    def execute(self, context):
        ok, msg = post_processing_helpers.PostProcessingHelpers.sync_from_scene_props(
            context.scene
        )
        if ok:
            self.report({'INFO'}, msg)
            return {'FINISHED'}
        self.report({'WARNING'}, msg)
        return {'CANCELLED'}


# ---------------------------------------------------------------------------
# Material Browser Operators
# ---------------------------------------------------------------------------

class FO4_OT_ApplyCoreMaterialProfile(Operator):
    """Apply quick FO4 core material profiles for foliage/wet/metal/skin."""
    bl_idname = "fo4.apply_core_material_profile"
    bl_label = "Apply Core Material Profile"
    bl_options = {'REGISTER', 'UNDO'}

    profile: EnumProperty(
        name="Profile",
        items=[
            ('FOLIAGE', "Foliage", "Alpha-clip/two-sided foliage setup"),
            ('WET', "Wet Surface", "Lower roughness + envmap-ready setup"),
            ('METAL', "Metal", "FO4 metal baseline preset"),
            ('SKIN', "Skin", "FO4 skin baseline preset"),
        ],
        default='FOLIAGE',
    )
    apply_all_selected: BoolProperty(
        name="Apply to All Selected",
        default=True,
    )

    def _targets(self, context):
        if self.apply_all_selected:
            return [o for o in context.selected_objects if o.type == 'MESH']
        obj = context.active_object
        return [obj] if obj and obj.type == 'MESH' else []

    @staticmethod
    def _set_bsdf_defaults(mat, roughness=None, metallic=None, emission=None):
        if not mat or not mat.use_nodes or not mat.node_tree:
            return
        pbsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not pbsdf:
            return
        if roughness is not None and pbsdf.inputs.get("Roughness"):
            pbsdf.inputs["Roughness"].default_value = roughness
        if metallic is not None and pbsdf.inputs.get("Metallic"):
            pbsdf.inputs["Metallic"].default_value = metallic
        if emission is not None:
            emit = pbsdf.inputs.get("Emission Strength")
            if emit:
                emit.default_value = emission

    def execute(self, context):
        targets = self._targets(context)
        if not targets:
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        applied = 0
        errors = []
        for obj in targets:
            try:
                mat = None
                if self.profile == 'FOLIAGE':
                    mat = texture_helpers.TextureHelpers.setup_vegetation_material(obj) if texture_helpers else None
                elif self.profile == 'WET':
                    ok, _ = fo4_material_browser.MaterialBrowser.apply_preset(obj, "CLEAN_METAL")
                    if not ok:
                        errors.append(f"{obj.name}: failed to apply wet profile base")
                        continue
                    mat = obj.data.materials[0] if obj.data.materials else None
                    self._set_bsdf_defaults(mat, roughness=0.08, metallic=0.0, emission=0.0)
                    if mat:
                        mat["fo4_shader_type"] = "envmap"
                elif self.profile == 'METAL':
                    ok, _ = fo4_material_browser.MaterialBrowser.apply_preset(obj, "RUSTY_METAL")
                    if not ok:
                        errors.append(f"{obj.name}: failed to apply metal profile")
                        continue
                    mat = obj.data.materials[0] if obj.data.materials else None
                else:  # SKIN
                    ok, _ = fo4_material_browser.MaterialBrowser.apply_preset(obj, "HUMAN_SKIN")
                    if not ok:
                        errors.append(f"{obj.name}: failed to apply skin profile")
                        continue
                    mat = obj.data.materials[0] if obj.data.materials else None

                if mat:
                    mat["fo4_core_profile"] = self.profile.lower()
                applied += 1
            except Exception as exc:
                errors.append(f"{obj.name}: {exc}")

        msg = f"Applied {self.profile.title()} profile to {applied}/{len(targets)} mesh(es)"
        if errors:
            self.report({'WARNING'}, msg)
            for err in errors[:6]:
                self.report({'WARNING'}, err)
            if len(errors) > 6:
                self.report({'WARNING'}, f"... and {len(errors) - 6} more")
            return {'FINISHED'}

        self.report({'INFO'}, msg)
        return {'FINISHED'}


class FO4_OT_ApplyMaterialPreset(Operator):
    """Apply a Fallout 4 material preset to the selected mesh object(s).

    Each preset creates a correctly structured Blender material with Diffuse,
    Normal, Specular, and Glow texture nodes (Niftools-compatible naming),
    pre-configured PBR values (roughness, metallic, base colour) tuned to
    match the vanilla FO4 look.  Connect your own textures to the image nodes
    afterwards.

    The preset ID is stored as the ``fo4_material_preset`` custom property on
    the object so export scripts can generate the corresponding ``.bgsm`` stub.
    """
    bl_idname = "fo4.apply_material_preset"
    bl_label  = "Apply Material Preset"
    bl_options = {'REGISTER', 'UNDO'}

    preset: bpy.props.EnumProperty(
        name="Preset",
        description="Material surface type to apply",
        items=_MAT_PRESET_ITEMS,
        default="RUSTY_METAL",
    )
    apply_all_selected: BoolProperty(
        name="Apply to All Selected",
        description="Apply to every selected mesh, not just the active object",
        default=True,
    )

    def execute(self, context):
        if self.apply_all_selected:
            ok, msg = fo4_material_browser.MaterialBrowser.apply_preset_to_selection(
                context, self.preset
            )
        else:
            obj = context.active_object
            ok, msg = fo4_material_browser.MaterialBrowser.apply_preset(obj, self.preset)

        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}

    def invoke(self, context, event):
        # Pre-populate preset from scene property
        try:
            self.preset = context.scene.fo4_mat_preset
        except Exception:
            pass
        return context.window_manager.invoke_props_dialog(self)


# ---------------------------------------------------------------------------
# Scene Diagnostics Operators
# ---------------------------------------------------------------------------

class FO4_OT_RunSceneDiagnostics(Operator):
    """Run a comprehensive FO4 export-readiness check on the entire scene.

    Checks every mesh object for:
    • Polygon count within the FO4 limit (65 535)
    • UV map present
    • Scale applied
    • Unapplied geometry modifiers
    • Mesh triangulation
    • Loose vertices
    • Material assignment and node setup (Diffuse/Normal/Specular nodes)
    • Collision mesh presence (UCX_ prefix)
    • Rigging: bone count, root bone, vertex group names
    • Object naming (no spaces or non-ASCII)

    Results are shown as a score (0-100) and grouped by severity.
    Click 'Auto-Fix' to automatically resolve all fixable issues.
    """
    bl_idname = "fo4.run_scene_diagnostics"
    bl_label  = "Run Scene Diagnostics"
    bl_options = {'REGISTER'}

    def execute(self, context):
        if not fo4_scene_diagnostics:
            self.report({'ERROR'}, "Scene diagnostics module unavailable")
            return {'CANCELLED'}
        scene = context.scene
        report = fo4_scene_diagnostics.SceneDiagnostics.run_full_check(scene)

        # Persist report for the UI panel
        fo4_scene_diagnostics.store_report(report)

        # Update scene shortcut properties
        s = report.get("summary", {})
        try:
            scene.fo4_diag_last_score    = s.get("score",         0)
            scene.fo4_diag_last_errors   = s.get("error_count",   0)
            scene.fo4_diag_last_warnings = s.get("warning_count", 0)
            scene.fo4_diag_export_ready  = s.get("export_ready",  False)
        except Exception:
            pass

        errors   = s.get("error_count",   0)
        warnings = s.get("warning_count", 0)
        score    = s.get("score",         0)
        ready    = s.get("export_ready",  False)

        msg = (f"Score {score}/100 – "
               f"{errors} error(s), {warnings} warning(s). "
               f"{'✅ Export ready' if ready else '❌ Fix errors before export'}")
        self.report({'INFO' if ready else 'WARNING'}, msg)
        notification_system.FO4_NotificationSystem.notify(msg, 'INFO' if ready else 'WARNING')
        return {'FINISHED'}


class FO4_OT_AutoFixDiagnostics(Operator):
    """Automatically fix all auto-fixable issues found by Run Scene Diagnostics.

    Fixable issues include:
    • Apply scale (Ctrl+A)
    • Triangulate mesh (removes quads / N-gons)
    • Remove loose vertices
    • Smart UV unwrap (for objects with no UV map)
    • Remove spaces from object names

    Run 'Run Scene Diagnostics' first to populate the issue list.
    """
    bl_idname = "fo4.auto_fix_diagnostics"
    bl_label  = "Auto-Fix Issues"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        if not fo4_scene_diagnostics:
            self.report({'ERROR'}, "Scene diagnostics module unavailable")
            return {'CANCELLED'}
        report = fo4_scene_diagnostics.load_report()
        if report is None:
            self.report({'WARNING'},
                "No diagnostic report found. Run 'Run Scene Diagnostics' first.")
            return {'CANCELLED'}

        fix_count, messages = fo4_scene_diagnostics.SceneDiagnostics.auto_fix(
            context, report
        )

        # Re-run diagnostics so the panel updates
        new_report = fo4_scene_diagnostics.SceneDiagnostics.run_full_check(context.scene)
        fo4_scene_diagnostics.store_report(new_report)
        s = new_report.get("summary", {})
        try:
            context.scene.fo4_diag_last_score    = s.get("score",         0)
            context.scene.fo4_diag_last_errors   = s.get("error_count",   0)
            context.scene.fo4_diag_last_warnings = s.get("warning_count", 0)
            context.scene.fo4_diag_export_ready  = s.get("export_ready",  False)
        except Exception:
            pass

        for m in messages:
            print(m)

        msg = f"Auto-fixed {fix_count} issue(s). New score: {s.get('score', 0)}/100"
        self.report({'INFO'}, msg)
        notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        return {'FINISHED'}


class FO4_OT_ExportDiagnosticsReport(Operator):
    """Save the Scene Diagnostics report as a human-readable text file.

    The report lists every check result (OK / WARNING / ERROR) for every
    object in the scene with actionable fix suggestions.  Useful for
    documenting issues before sharing a project or asking for help.
    """
    bl_idname  = "fo4.export_diagnostics_report"
    bl_label   = "Export Diagnostics Report"
    bl_options = {'REGISTER'}

    filepath: StringProperty(subtype='FILE_PATH')
    filter_glob: StringProperty(default="*.txt", options={'HIDDEN'})

    def execute(self, context):
        if not fo4_scene_diagnostics:
            self.report({'ERROR'}, "Scene diagnostics module unavailable")
            return {'CANCELLED'}
        report = fo4_scene_diagnostics.load_report()
        if report is None:
            # Run diagnostics first
            report = fo4_scene_diagnostics.SceneDiagnostics.run_full_check(context.scene)
            fo4_scene_diagnostics.store_report(report)

        ok, msg = fo4_scene_diagnostics.SceneDiagnostics.export_report(
            report, self.filepath
        )
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


# ---------------------------------------------------------------------------
# HD Material Setup Operator (4K textures + glow maps + PBR flags)
# ---------------------------------------------------------------------------

class FO4_OT_SetupHDMaterial(Operator):
    """Configure a full HD PBR material on the active mesh for 4K export.

    Creates (or replaces) the Blender material with all five FO4 texture slots,
    wires the glow/emissive channel correctly so the BGSM exporter writes the
    right shader flags, and sets PBR-accurate roughness / specular defaults.

    Texture slots set up
    --------------------
    • **Diffuse** (_d.dds)  – BC3/DXT5 with alpha, or BC1/DXT1 for opaque
    • **Normal**  (_n.dds)  – BC5/ATI2 (two-channel tangent-space)
    • **Specular** (_s.dds) – BC1 (RGB glossiness/specular)
    • **Glow**    (_g.dds)  – BC1 glow/emissive mask; auto-enables BGSM emit
    • **EnvMap**  (_e.dds)  – BC1 cube-map reflection mask (optional)

    4K / HD guidance
    ----------------
    FO4's BSLightingShaderProperty and DDS texture streaming support up to
    4096×4096 (4K) per slot.  Use BC7 (``HIGH_QUAL`` in the NVTT converter)
    for the diffuse when quality matters most – it offers better fidelity at
    the same file size as BC3.  Keep normal maps at BC5 regardless of resolution.

    Glow maps
    ---------
    The ``_g.dds`` texture is a greyscale or RGB mask where white = maximum
    emissive brightness and black = no glow.  After clicking this button:
    1. Install your ``_g.dds`` via the **Install Glow Mask** button in the
       Texture panel.
    2. Adjust ``Emission Strength`` on the Principled BSDF (1.0–5.0 for subtle;
       10–30 for neon/screens).
    3. Export the BGSM – ``emit_enabled``, ``glowmap``, and SF1_EMIT_ENABLED /
       SF2_GLOW_MAP shader flags will be written automatically.

    F4SE / Papyrus note
    -------------------
    The Fallout 4 engine does not expose BGSM material properties to Papyrus
    or F4SE at runtime.  To vary glow intensity dynamically, author two
    material variants (e.g. ``mesh_off.bgsm`` / ``mesh_on.bgsm``) and swap
    the NIF's BSLightingShaderProperty path from a Papyrus script using
    ObjectReference::SetTextureSet or a shader-swap workaround.
    """
    bl_idname  = "fo4.setup_hd_material"
    bl_label   = "Setup HD Material (4K + Glow)"
    bl_options = {'REGISTER', 'UNDO'}

    emission_strength: bpy.props.FloatProperty(
        name="Emission Strength",
        description=(
            "Default Principled BSDF Emission Strength for the glow channel. "
            "0 = no glow preview (glow still exported if _g.dds is installed). "
            "1–5 = subtle ambient. 10–30 = neon/tech glow."
        ),
        default=0.0,
        min=0.0,
        max=100.0,
        soft_max=30.0,
    )
    roughness: bpy.props.FloatProperty(
        name="Default Roughness",
        description=(
            "Sets the Principled BSDF Roughness default. "
            "0.0 = mirror-smooth (metal/glass). "
            "0.5 = mid-range (painted surface). "
            "1.0 = fully rough (unpolished stone/wood)."
        ),
        default=0.5,
        min=0.0,
        max=1.0,
    )
    use_alpha_clip: bpy.props.BoolProperty(
        name="Alpha Clip (vegetation / foliage)",
        description=(
            "Enable Alpha Clip blend mode and disable backface culling. "
            "Required for grass, leaves, and any mesh with transparency cut-out."
        ),
        default=False,
    )
    replace_existing: bpy.props.BoolProperty(
        name="Replace Existing Material",
        description=(
            "If the object already has a material, replace it with a fresh "
            "HD material.  Disable to skip objects that already have a material."
        ),
        default=True,
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self, width=380)

    def draw(self, context):
        layout = self.layout
        col = layout.column(align=True)
        col.scale_y = 0.8
        col.label(text="4K Texture Format Recommendations:", icon='INFO')
        col.label(text="  Diffuse (_d): BC3/DXT5 (with alpha) or BC1/DXT1 (opaque)")
        col.label(text="  Normal  (_n): BC5/ATI2  ← always, regardless of resolution")
        col.label(text="  Specular (_s): BC1/DXT1")
        col.label(text="  Glow    (_g): BC1/DXT1")
        col.label(text="  EnvMap  (_e): BC1/DXT1")
        col.separator(factor=0.5)
        col.label(text="For highest quality at 4K: use BC7 for diffuse (texconv).", icon='CHECKMARK')
        layout.separator(factor=0.5)
        layout.prop(self, "emission_strength")
        layout.prop(self, "roughness")
        layout.prop(self, "use_alpha_clip")
        layout.prop(self, "replace_existing")

    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        # Skip if the object already has a material and replace_existing is off.
        if obj.data.materials and not self.replace_existing:
            self.report({'INFO'},
                f"'{obj.name}' already has a material – skipped "
                "(enable 'Replace Existing Material' to override)"
            )
            return {'FINISHED'}

        # Build the material.
        if texture_helpers:
            mat = texture_helpers.TextureHelpers.setup_fo4_material(obj)
        else:
            # Minimal fallback – create a plain Principled BSDF material.
            mat_name = f"{obj.name}_HD_Material"
            mat = bpy.data.materials.new(name=mat_name)
            mat.use_nodes = True
            if obj.data.materials:
                obj.data.materials[0] = mat
            else:
                obj.data.materials.append(mat)

        if mat is None:
            self.report({'ERROR'}, "Failed to create material")
            return {'CANCELLED'}

        # ── PBR defaults ──────────────────────────────────────────────────────
        pbsdf = None
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                pbsdf = node
                break

        if pbsdf:
            rough = pbsdf.inputs.get("Roughness")
            if rough:
                rough.default_value = self.roughness

            # Emission strength (applied to the emission channel; the actual
            # glow is only visible after installing a _g.dds image).
            emit_str = pbsdf.inputs.get("Emission Strength")
            if emit_str:
                emit_str.default_value = self.emission_strength

            # Metallic set to 0 by default (non-metallic PBR baseline).
            metallic = pbsdf.inputs.get("Metallic")
            if metallic:
                metallic.default_value = 0.0

        # ── Alpha settings for vegetation ────────────────────────────────────
        if self.use_alpha_clip:
            mat.blend_method = 'CLIP'
            mat.alpha_threshold = 0.5
            mat.use_backface_culling = False
        else:
            mat.blend_method = 'OPAQUE'
            mat.use_backface_culling = True

        # ── Tag material so BGSM exporter picks up the right shader hints ──
        # "glowmap" hint ensures SF1_EMIT_ENABLED + SF2_GLOW_MAP are written
        # even before the _g.dds image is loaded into the Glow node.
        try:
            mat["fo4_shader_type"] = "glowmap" if self.emission_strength > 0.0 else "default"
        except Exception:
            pass

        # ── User-facing summary ───────────────────────────────────────────────
        alpha_note = " • Alpha Clip enabled (vegetation/foliage)" if self.use_alpha_clip else ""
        glow_note  = (
            f" • Emission Strength = {self.emission_strength:.1f}"
            " (install _g.dds to see glow in-game)"
            if self.emission_strength > 0.0 else
            " • Emission = 0 (install _g.dds then raise Emission Strength)"
        )
        msg = (
            f"HD material created on '{obj.name}': "
            f"Roughness={self.roughness:.2f}."
            f"{alpha_note}"
            f"{glow_note}"
            "  Next: install textures via the Texture Helpers panel, "
            "then Export BGSM."
        )
        self.report({'INFO'}, msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                f"HD material applied to '{obj.name}' (4K-ready)", 'INFO'
            )
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Smart Wind + FO4 Export Prep Operator
# ---------------------------------------------------------------------------

# Name-token sets used for wind-profile auto-detection (same heuristic as
# fo4_scene_diagnostics._GRASS_NAME_TOKENS, extended for shrubs and trees).
_WIND_GRASS_TOKENS = frozenset({
    'grass', 'blade', 'fern', 'straw', 'weed', 'groundcover', 'clover', 'moss',
})
_WIND_SHRUB_TOKENS = frozenset({
    'shrub', 'bush', 'hedge', 'ivy', 'vine', 'plant', 'flora', 'briar', 'thistle',
})
_WIND_TREE_TOKENS = frozenset({
    'tree', 'pine', 'oak', 'birch', 'maple', 'palm', 'trunk', 'branch', 'sapling',
    'willow', 'cedar', 'ash', 'elm', 'spruce',
})


def _detect_wind_profile(obj) -> str:
    """Return 'GRASS', 'SHRUB', 'TREE', or 'STATIC' for *obj*.

    Detection order
    ---------------
    1. ``fo4_collision_type == 'GRASS'``  → GRASS
    2. ``fo4_mesh_type`` in VEGETATION/FLORA + name tokens
    3. Bounding-box height heuristic (> 2 m → TREE, > 0.8 m → SHRUB)
    4. Name-token fallback (any of the three token sets)
    5. Default → STATIC
    """
    coll_type = getattr(obj, 'fo4_collision_type', None)
    if coll_type == 'GRASS':
        return 'GRASS'

    mesh_type = getattr(obj, 'fo4_mesh_type', None)
    name_lower = obj.name.lower()

    is_veg = mesh_type in ('VEGETATION', 'FLORA', None)

    # Explicit property set to a non-vegetation type → treat as static unless
    # name heuristic strongly indicates vegetation.
    if mesh_type and mesh_type not in ('VEGETATION', 'FLORA', 'AUTO'):
        is_veg = False

    if is_veg or mesh_type in ('AUTO', None):
        if any(t in name_lower for t in _WIND_GRASS_TOKENS):
            return 'GRASS'
        if any(t in name_lower for t in _WIND_TREE_TOKENS):
            return 'TREE'
        if any(t in name_lower for t in _WIND_SHRUB_TOKENS):
            return 'SHRUB'

    # Height heuristic using the object's bounding box
    if obj.type == 'MESH' and obj.data:
        try:
            from mathutils import Vector
            corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
            zs = [c.z for c in corners]
            height = max(zs) - min(zs)
            if height > 2.0:
                return 'TREE'
            if height > 0.8:
                return 'SHRUB'
        except Exception:
            pass

    return 'STATIC'


class FO4_OT_SmartPrepareWindMesh(Operator):
    """One-click wind setup and FO4 export preparation for vegetation meshes.

    Click on any mesh and this operator will:

    1. Auto-detect the wind profile (GRASS / SHRUB / TREE / STATIC) from the
       object's ``fo4_mesh_type``, ``fo4_collision_type``, name tokens, and
       bounding-box height.
    2. Apply the correct FO4 settings for that profile:

       **GRASS** (engine-side wind via GRAS record):
       - Sets ``fo4_collision_type = 'GRASS'`` and ``fo4_mesh_type = 'VEGETATION'``.
       - Removes any armature modifier (bones are forbidden on FO4 grass NIFs).
       - Sets up the vegetation material (Alpha Clip, two-sided).
       - Adds a ``Col`` vertex-color layer if none exists (white = full sway;
         paint darker areas to reduce per-vertex wind intensity).

       **SHRUB / TREE** (deformation-based wind):
       - Sets ``fo4_mesh_type = 'VEGETATION'``.
       - Sets up the vegetation material.
       - Generates a ``Wind`` vertex-weight group (Z-axis linear falloff,
         0 at the base, 1 at the tip).
       - Optionally applies an armature wind-bone animation using the matching
         preset (SHRUB or TREE amplitudes/periods).

       **STATIC** (no wind):
       - Leaves wind settings untouched; runs diagnostics only.

    3. Runs Scene Diagnostics and auto-fixes all fixable issues (UV map,
       scale, loose verts, normals, triangulation).
    4. Re-runs diagnostics and reports the final score.

    After this operator finishes, use **Export Vegetation NIF** or
    **Export Mesh (.nif)** to export, then **Export .bgsm** to write the
    material file.  Assign the NIF in the Creation Kit; for grass, tune the
    sway feel via the GRAS record parameters there.

    **Papyrus / F4SE note:** FO4 does not expose per-mesh wind parameters to
    Papyrus or F4SE at runtime.  Wind is authored entirely in the NIF/BGSM
    and in the GRAS record.  If you need gameplay-driven variation, author
    multiple mesh/material variants and swap them via script.
    """
    bl_idname = "fo4.smart_prepare_wind_mesh"
    bl_label  = "Smart Wind + FO4 Export Prep"
    bl_options = {'REGISTER', 'UNDO'}

    profile_override: bpy.props.EnumProperty(
        name="Wind Profile",
        description=(
            "Override the auto-detected profile.  "
            "Leave at 'Auto-detect' to let the add-on choose."
        ),
        items=[
            ('AUTO',   "Auto-detect", "Detect from mesh type, name, and height"),
            ('GRASS',  "Grass",       "Engine-side wind via GRAS record — no bones"),
            ('SHRUB',  "Shrub",       "Medium sway via wind-bone armature"),
            ('TREE',   "Tree",        "Slow/heavy sway via wind-bone armature"),
            ('STATIC', "Static",      "No wind — run diagnostics only"),
        ],
        default='AUTO',
    )
    apply_wind_armature: bpy.props.BoolProperty(
        name="Apply Wind Armature (Shrub/Tree)",
        description=(
            "Create a wind-bone armature and add a looping animation action.  "
            "Disable if you prefer to set up the armature manually."
        ),
        default=True,
    )
    add_vertex_colors: bpy.props.BoolProperty(
        name="Add Vertex Color Layer (Grass)",
        description=(
            "Add a 'Col' vertex-color layer set to white so you can paint "
            "darker areas to reduce wind intensity on those vertices.  "
            "Has no effect on non-grass profiles."
        ),
        default=True,
    )
    wind_tuning: bpy.props.EnumProperty(
        name="Shrub/Tree Wind Tuning",
        description=(
            "Fine-tune shrub/tree wind strength beyond the base profile presets"
        ),
        items=[
            ('AUTO', "Auto (Balanced)", "Use default balanced values"),
            ('CALM', "Calm", "Lower amplitude, longer period"),
            ('BALANCED', "Balanced", "Moderate amplitude and period"),
            ('STORM', "Storm", "Higher amplitude, shorter period"),
        ],
        default='AUTO',
    )

    def invoke(self, context, event):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Select a mesh object first")
            return {'CANCELLED'}
        return context.window_manager.invoke_props_dialog(self, width=380)

    def draw(self, context):
        layout = self.layout
        obj = context.active_object

        # Show the auto-detected profile so the user can review it before clicking OK.
        if obj and obj.type == 'MESH':
            detected = _detect_wind_profile(obj)
            info_col = layout.column(align=True)
            info_col.scale_y = 0.8
            info_col.label(text=f"Mesh: {obj.name}", icon='MESH_DATA')
            info_col.label(text=f"Auto-detected profile: {detected}", icon='FORCE_WIND')

        layout.separator(factor=0.5)
        layout.prop(self, "profile_override")
        layout.prop(self, "apply_wind_armature")
        layout.prop(self, "add_vertex_colors")
        layout.prop(self, "wind_tuning")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _ensure_veg_material(obj):
        """Set up (or reuse) a vegetation material on *obj*.

        Calls :func:`texture_helpers.TextureHelpers.setup_vegetation_material`
        which creates an Alpha-Clip, two-sided PBR material with the FO4
        texture node slots (Diffuse, Normal, Specular, Glow, Environment).
        """
        if texture_helpers:
            return texture_helpers.TextureHelpers.setup_vegetation_material(obj)
        return None

    @staticmethod
    def _remove_armature_modifiers(obj):
        """Remove all Armature modifiers from *obj* and clear its parent if
        the parent is an armature."""
        removed = []
        for mod in list(obj.modifiers):
            if mod.type == 'ARMATURE':
                obj.modifiers.remove(mod)
                removed.append(mod.name)
        if obj.parent and obj.parent.type == 'ARMATURE':
            # Clear parent but keep transform
            try:
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
            except Exception:
                pass
        return removed

    @staticmethod
    def _ensure_vertex_color_layer(obj):
        """Ensure *obj* has at least one vertex-color attribute layer.

        Uses ``color_attributes`` (Blender 3.3+) or the legacy
        ``vertex_colors`` API, initialising all colours to white.
        """
        mesh = obj.data
        if mesh.color_attributes:
            return mesh.color_attributes[0].name
        if mesh.vertex_colors:
            return mesh.vertex_colors[0].name
        # Create a new layer
        try:
            layer = mesh.color_attributes.new(
                name="Col", type='BYTE_COLOR', domain='CORNER'
            )
            # Initialise to white so every vertex has max wind intensity by default.
            for c in layer.data:
                c.color = (1.0, 1.0, 1.0, 1.0)
            return layer.name
        except Exception:
            # Blender < 3.3 fallback
            try:
                layer = mesh.vertex_colors.new(name="Col")
                for c in layer.data:
                    c.color = (1.0, 1.0, 1.0, 1.0)
                return layer.name
            except Exception:
                return None

    # ------------------------------------------------------------------
    # Main execute
    # ------------------------------------------------------------------

    def execute(self, context):  # noqa: C901 - intentionally long
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "No mesh object selected")
            return {'CANCELLED'}

        profile = (
            _detect_wind_profile(obj)
            if self.profile_override == 'AUTO'
            else self.profile_override
        )

        applied: list[str] = []      # things done automatically
        blockers: list[str] = []     # remaining issues needing user attention

        # ------------------------------------------------------------------
        # Profile: GRASS
        # ------------------------------------------------------------------
        if profile == 'GRASS':
            # Collision type must be GRASS (= no collision)
            try:
                obj.fo4_collision_type = 'GRASS'
                applied.append("fo4_collision_type = 'GRASS'")
            except Exception:
                pass

            # Mesh type must be VEGETATION
            try:
                obj.fo4_mesh_type = 'VEGETATION'
                applied.append("fo4_mesh_type = 'VEGETATION'")
            except Exception:
                pass

            # Remove armature — bones are forbidden on grass NIFs
            removed = self._remove_armature_modifiers(obj)
            if removed:
                applied.append(f"Removed armature modifier(s): {', '.join(removed)}")

            # Remove shape keys if present (not supported on grass)
            if obj.data.shape_keys and len(obj.data.shape_keys.key_blocks) > 1:
                blockers.append(
                    "Grass has shape keys — remove them manually "
                    "(Edit Mode → Shape Keys → delete all)"
                )

            # Vegetation material (Alpha Clip, two-sided)
            mat = self._ensure_veg_material(obj)
            if mat is not None:
                applied.append(f"Vegetation material applied: '{mat.name}'")
            else:
                blockers.append(
                    "Could not create vegetation material (texture_helpers unavailable)"
                )

            # Optional vertex-color layer for per-vertex wind intensity
            if self.add_vertex_colors:
                layer_name = self._ensure_vertex_color_layer(obj)
                if layer_name:
                    applied.append(
                        f"Vertex-color layer '{layer_name}' present "
                        "(white = max sway; paint darker to reduce intensity)"
                    )

        # ------------------------------------------------------------------
        # Profile: SHRUB or TREE
        # ------------------------------------------------------------------
        elif profile in ('SHRUB', 'TREE'):
            # Mesh type
            try:
                obj.fo4_mesh_type = 'VEGETATION'
                applied.append("fo4_mesh_type = 'VEGETATION'")
            except Exception:
                pass

            # Vegetation material
            mat = self._ensure_veg_material(obj)
            if mat is not None:
                applied.append(f"Vegetation material applied: '{mat.name}'")
            else:
                blockers.append("Could not create vegetation material")

            # Wind weights (Z-axis linear falloff)
            if animation_helpers:
                ok, msg = animation_helpers.AnimationHelpers.generate_wind_weights(obj)
                if ok:
                    applied.append(msg)
                else:
                    blockers.append(f"Wind weights failed: {msg}")
            else:
                blockers.append("animation_helpers unavailable — wind weights not generated")

            # Optional wind armature + animation action
            if self.apply_wind_armature and animation_helpers:
                preset = profile  # 'SHRUB' or 'TREE'
                tuning_key = self.wind_tuning if self.wind_tuning != 'AUTO' else 'BALANCED'
                tuning_bucket = _SMART_WIND_TUNING_PRESETS.get(
                    tuning_key, _SMART_WIND_TUNING_PRESETS['BALANCED']
                )
                amp, period, tuning_label = tuning_bucket.get(
                    preset, _SMART_WIND_TUNING_PRESETS['BALANCED'][preset]
                )
                ok, msg = animation_helpers.AnimationHelpers.apply_wind_animation(
                    obj, amplitude=amp, period=period, axis='X'
                )
                if ok:
                    applied.append(
                        f"Wind armature + animation applied ({preset} / {tuning_label})"
                    )
                else:
                    blockers.append(f"Wind animation setup failed: {msg}")

        # ------------------------------------------------------------------
        # Profile: STATIC — no wind modifications, diagnostics only
        # ------------------------------------------------------------------
        # (falls through to the diagnostics section below)

        # ------------------------------------------------------------------
        # Diagnostics: run → auto-fix → re-run
        # ------------------------------------------------------------------
        if fo4_scene_diagnostics:
            # First pass
            report = fo4_scene_diagnostics.SceneDiagnostics.run_full_check(context.scene)
            fo4_scene_diagnostics.store_report(report)

            # Auto-fix all fixable issues
            fix_count, fix_msgs = fo4_scene_diagnostics.SceneDiagnostics.auto_fix(
                context, report
            )
            if fix_count:
                applied.append(f"Auto-fixed {fix_count} diagnostic issue(s)")

            # Second pass for the final score
            report2 = fo4_scene_diagnostics.SceneDiagnostics.run_full_check(context.scene)
            fo4_scene_diagnostics.store_report(report2)

            # Update scene shortcut properties
            s = report2.get("summary", {})
            try:
                context.scene.fo4_diag_last_score    = s.get("score",         0)
                context.scene.fo4_diag_last_errors   = s.get("error_count",   0)
                context.scene.fo4_diag_last_warnings = s.get("warning_count", 0)
                context.scene.fo4_diag_export_ready  = s.get("export_ready",  False)
            except Exception:
                pass

            score = s.get("score", 0)
            errors = s.get("error_count", 0)
            warnings = s.get("warning_count", 0)
            export_ready = s.get("export_ready", False)

            # Collect per-object errors that are still open as blockers
            for obj_r in report2.get("objects", []):
                for check in obj_r.get("checks", []):
                    if check.get("severity") == "ERROR":
                        blockers.append(
                            f"[{obj_r['name']}] {check.get('message', '')}"
                        )
        else:
            score = 0
            errors = 0
            warnings = 0
            export_ready = False
            blockers.append("fo4_scene_diagnostics unavailable — run diagnostics manually")

        # ------------------------------------------------------------------
        # Build consolidated report message
        # ------------------------------------------------------------------
        lines_applied = "\n  • ".join(applied) if applied else "—"
        if blockers:
            lines_blockers = "\n  ✗ ".join(blockers)
            summary = (
                f"Smart Wind Prep ({profile}) — Score {score}/100  "
                f"({errors} error(s), {warnings} warning(s))  "
                f"{'✅ Export ready' if export_ready else '⚠ Fix remaining issues'}\n"
                f"Auto-applied:\n  • {lines_applied}\n"
                f"Needs attention:\n  ✗ {lines_blockers}"
            )
            self.report({'WARNING'}, summary)
        else:
            summary = (
                f"Smart Wind Prep ({profile}) — Score {score}/100  ✅ Export ready\n"
                f"Auto-applied:\n  • {lines_applied}"
            )
            self.report({'INFO'}, summary)

        if notification_system:
            status = 'INFO' if export_ready else 'WARNING'
            short = (
                f"Smart Wind Prep ({profile}): score {score}/100 "
                f"{'✅' if export_ready else '⚠'} "
                f"{len(applied)} applied, {len(blockers)} remaining"
            )
            notification_system.FO4_NotificationSystem.notify(short, status)

        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Reference Objects Operators
# ---------------------------------------------------------------------------

class FO4_OT_AddReferenceObject(Operator):
    """Add a scale reference object to the scene.

    Reference objects are non-selectable, non-renderable wire-frame meshes
    that show the correct FO4 proportions of common characters and props.
    They are tagged with ``fo4_reference = True`` so export operators skip
    them automatically.

    All reference objects are placed in the ``FO4_References`` collection.
    """
    bl_idname = "fo4.add_reference_object"
    bl_label  = "Add Reference Object"
    bl_options = {'REGISTER', 'UNDO'}

    ref_type: bpy.props.EnumProperty(
        name="Reference",
        description="Scale reference to add",
        items=_REF_ENUM_ITEMS,
        default="HUMAN_MALE",
    )

    def execute(self, context):
        ok, msg = fo4_reference_helpers.ReferenceHelpers.create_reference(self.ref_type)
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}

    def invoke(self, context, event):
        try:
            self.ref_type = context.scene.fo4_ref_type
        except Exception:
            pass
        return self.execute(context)


class FO4_OT_ClearReferenceObjects(Operator):
    """Remove all FO4_REF_* scale reference objects and the FO4_References collection."""
    bl_idname = "fo4.clear_reference_objects"
    bl_label  = "Clear All References"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        ok, msg = fo4_reference_helpers.ReferenceHelpers.clear_all_references()
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}


# ── Papyrus Script Generator operators ────────────────────────────────────────

class FO4_OT_GeneratePapyrusScript(Operator):
    """Generate a ready-to-compile Papyrus .psc script from a template."""
    bl_idname  = "fo4.generate_papyrus_script"
    bl_label   = "Generate Script"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            from . import papyrus_helpers
        except ImportError:
            self.report({'ERROR'}, "papyrus_helpers module not found")
            return {'CANCELLED'}

        scene  = context.scene
        tpl_id = getattr(scene, "fo4_papyrus_template", "OBJECT")
        name   = getattr(scene, "fo4_papyrus_script_name", "MyMod_MyScript").strip()

        ok, text = papyrus_helpers.PapyrusHelpers.generate(tpl_id, name)
        if not ok:
            self.report({'ERROR'}, text)
            return {'CANCELLED'}

        # Show in a Blender Text block so the user can read / copy / save
        text_block = bpy.data.texts.get(f"{name}.psc")
        if text_block is None:
            text_block = bpy.data.texts.new(f"{name}.psc")
        text_block.clear()
        text_block.write(text)

        self.report({'INFO'}, f"Script generated: {name}.psc  (open in Text Editor)")
        notification_system.FO4_NotificationSystem.notify(
            f"Papyrus script '{name}.psc' created in Text Editor", 'INFO')
        return {'FINISHED'}


class FO4_OT_ExportPapyrusScript(Operator):
    """Export the generated Papyrus script to the configured output folder."""
    bl_idname  = "fo4.export_papyrus_script"
    bl_label   = "Export .psc to Folder"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            from . import papyrus_helpers
        except ImportError:
            self.report({'ERROR'}, "papyrus_helpers module not found")
            return {'CANCELLED'}

        scene      = context.scene
        tpl_id     = getattr(scene, "fo4_papyrus_template", "OBJECT")
        name       = getattr(scene, "fo4_papyrus_script_name", "").strip()
        output_dir = getattr(scene, "fo4_papyrus_output_dir", "").strip()

        if not output_dir:
            self.report({'ERROR'}, "Set an output folder first")
            return {'CANCELLED'}

        ok, msg = papyrus_helpers.PapyrusHelpers.export(
            tpl_id, name, bpy.path.abspath(output_dir))
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}


class FO4_OT_ShowPapyrusCompileInstructions(Operator):
    """Show compile instructions for the current Papyrus script in the info bar."""
    bl_idname  = "fo4.papyrus_compile_instructions"
    bl_label   = "Show Compile Instructions"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            from . import papyrus_helpers
        except ImportError:
            self.report({'ERROR'}, "papyrus_helpers module not found")
            return {'CANCELLED'}

        scene    = context.scene
        name     = getattr(scene, "fo4_papyrus_script_name", "MyScript").strip()
        mod_name = getattr(scene, "fo4_papyrus_mod_name", "MyMod").strip()
        guide    = papyrus_helpers.PapyrusHelpers.get_compile_instructions(name, mod_name)

        block = bpy.data.texts.get("PapyrusCompile_Instructions.txt")
        if block is None:
            block = bpy.data.texts.new("PapyrusCompile_Instructions.txt")
        block.clear()
        block.write(guide)
        self.report({'INFO'}, "Compile instructions in Text Editor → PapyrusCompile_Instructions.txt")
        return {'FINISHED'}


# ── Havok Physics operators ────────────────────────────────────────────────────

class FO4_OT_ApplyPhysicsPreset(Operator):
    """Apply a Havok physics preset to the selected mesh object(s)."""
    bl_idname  = "fo4.apply_physics_preset"
    bl_label   = "Apply Physics Preset"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        try:
            from .animation_helper import havakphysics as fo4_physics_helpers
        except ImportError:
            self.report({'ERROR'}, "animation_helper.havakphysics module not found")
            return {'CANCELLED'}

        preset_id = getattr(context.scene, "fo4_physics_preset", "STATIC_METAL")
        ok, msg = fo4_physics_helpers.PhysicsHelpers.apply_to_selection(context, preset_id)
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}


class FO4_OT_ValidatePhysics(Operator):
    """Check the active object's Havok physics settings for common mistakes."""
    bl_idname  = "fo4.validate_physics"
    bl_label   = "Validate Physics Settings"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            from .animation_helper import havakphysics as fo4_physics_helpers
        except ImportError:
            self.report({'ERROR'}, "animation_helper.havakphysics module not found")
            return {'CANCELLED'}

        obj = context.active_object
        warnings = fo4_physics_helpers.PhysicsHelpers.validate_physics(obj)
        if not warnings:
            msg = f"Physics OK on {obj.name if obj else 'selection'}"
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        else:
            for w in warnings:
                self.report({'WARNING'}, w)
                notification_system.FO4_NotificationSystem.notify(w, 'WARNING')
        return {'FINISHED'}


# ── Mod Packaging operators ────────────────────────────────────────────────────

class FO4_OT_CreateModStructure(Operator):
    """Create the standard FO4 mod directory structure (Data/ + FOMOD)."""
    bl_idname  = "fo4.create_mod_structure"
    bl_label   = "Create Mod Structure"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            from . import mod_packaging_helpers
        except ImportError:
            self.report({'ERROR'}, "mod_packaging_helpers module not found")
            return {'CANCELLED'}

        scene    = context.scene
        mod_root = bpy.path.abspath(getattr(scene, "fo4_mod_root", "")).strip()
        mod_name = getattr(scene, "fo4_mod_name", "MyFO4Mod").strip()

        if not mod_root:
            self.report({'ERROR'}, "Set Mod Root Folder first")
            return {'CANCELLED'}

        ok, msg = mod_packaging_helpers.ModPackager.create_structure(mod_root, mod_name)
        if ok:
            self.report({'INFO'}, msg.split("\n")[0])
            notification_system.FO4_NotificationSystem.notify(
                f"Mod structure created: {mod_root}", 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}


class FO4_OT_GenerateFOMOD(Operator):
    """Generate FOMOD installer files (info.xml + ModuleConfig.xml)."""
    bl_idname  = "fo4.generate_fomod"
    bl_label   = "Generate FOMOD Installer"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            from . import mod_packaging_helpers
        except ImportError:
            self.report({'ERROR'}, "mod_packaging_helpers module not found")
            return {'CANCELLED'}

        scene = context.scene
        mod_root = bpy.path.abspath(getattr(scene, "fo4_mod_root", "")).strip()
        if not mod_root:
            self.report({'ERROR'}, "Set Mod Root Folder first")
            return {'CANCELLED'}

        info = {
            "name":        getattr(scene, "fo4_mod_name", "My FO4 Mod"),
            "author":      getattr(scene, "fo4_mod_author", ""),
            "version":     getattr(scene, "fo4_mod_version", "1.0.0"),
            "description": getattr(scene, "fo4_mod_description", ""),
            "fo4_version": getattr(scene, "fo4_mod_fo4_version", "1.10.163"),
            "website":     getattr(scene, "fo4_mod_website", ""),
            "plugin_name": getattr(scene, "fo4_mod_plugin_name", ""),
        }
        ok, msg = mod_packaging_helpers.ModPackager.generate_fomod(mod_root, info)
        if ok:
            self.report({'INFO'}, msg.split("\n")[0])
            notification_system.FO4_NotificationSystem.notify(
                "FOMOD installer generated", 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}


class FO4_OT_GenerateReadme(Operator):
    """Generate a professional Nexus-ready README.md for the mod."""
    bl_idname  = "fo4.generate_readme"
    bl_label   = "Generate README.md"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            from . import mod_packaging_helpers
        except ImportError:
            self.report({'ERROR'}, "mod_packaging_helpers module not found")
            return {'CANCELLED'}

        scene = context.scene
        mod_root = bpy.path.abspath(getattr(scene, "fo4_mod_root", "")).strip()
        if not mod_root:
            self.report({'ERROR'}, "Set Mod Root Folder first")
            return {'CANCELLED'}

        info = {
            "name":        getattr(scene, "fo4_mod_name", "My FO4 Mod"),
            "author":      getattr(scene, "fo4_mod_author", ""),
            "version":     getattr(scene, "fo4_mod_version", "1.0.0"),
            "description": getattr(scene, "fo4_mod_description", ""),
            "fo4_version": getattr(scene, "fo4_mod_fo4_version", "1.10.163"),
            "website":     getattr(scene, "fo4_mod_website", ""),
            "plugin_name": getattr(scene, "fo4_mod_plugin_name", ""),
        }
        ok, msg = mod_packaging_helpers.ModPackager.generate_readme(mod_root, info)
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}


class FO4_OT_ValidateModStructure(Operator):
    """Check the mod folder for missing required files and empty asset folders."""
    bl_idname  = "fo4.validate_mod_structure"
    bl_label   = "Validate Mod Structure"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            from . import mod_packaging_helpers
        except ImportError:
            self.report({'ERROR'}, "mod_packaging_helpers module not found")
            return {'CANCELLED'}

        scene    = context.scene
        mod_root = bpy.path.abspath(getattr(scene, "fo4_mod_root", "")).strip()
        mod_name = getattr(scene, "fo4_mod_name", "MyFO4Mod").strip()

        if not mod_root:
            self.report({'ERROR'}, "Set Mod Root Folder first")
            return {'CANCELLED'}

        ok, issues = mod_packaging_helpers.ModPackager.validate_structure(
            mod_root, mod_name)
        if ok and not issues:
            msg = "Mod structure is valid – ready to package"
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        else:
            for issue in issues:
                level = 'WARNING' if issue.startswith("Warning:") else 'ERROR'
                self.report({level}, issue)
                notification_system.FO4_NotificationSystem.notify(issue, level)
        return {'FINISHED'}


class FO4_OT_ExportModManifest(Operator):
    """Write a mod_manifest.json with metadata and file inventory."""
    bl_idname  = "fo4.export_mod_manifest"
    bl_label   = "Export Mod Manifest (JSON)"
    bl_options = {'REGISTER'}

    def execute(self, context):
        try:
            from . import mod_packaging_helpers
        except ImportError:
            self.report({'ERROR'}, "mod_packaging_helpers module not found")
            return {'CANCELLED'}

        scene    = context.scene
        mod_root = bpy.path.abspath(getattr(scene, "fo4_mod_root", "")).strip()
        if not mod_root:
            self.report({'ERROR'}, "Set Mod Root Folder first")
            return {'CANCELLED'}

        info = {
            "name":      getattr(scene, "fo4_mod_name", "My FO4 Mod"),
            "author":    getattr(scene, "fo4_mod_author", ""),
            "version":   getattr(scene, "fo4_mod_version", "1.0.0"),
            "fo4_version": getattr(scene, "fo4_mod_fo4_version", "1.10.163"),
        }
        ok, msg = mod_packaging_helpers.ModPackager.export_manifest(mod_root, info)
        if ok:
            self.report({'INFO'}, msg)
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}




# ── Mossy Link operators ───────────────────────────────────────────────────────

class WM_OT_MossyLinkToggle(Operator):
    """Start or stop the Mossy Link TCP server so Mossy can control Blender"""
    bl_idname = "wm.mossy_link_toggle"
    bl_label  = "Toggle Mossy Link Server"

    def execute(self, context):
        try:
            from . import mossy_link as _ml
        except Exception as exc:
            self.report({'ERROR'}, f"Could not import mossy_link: {exc}")
            return {'CANCELLED'}

        if _ml.is_server_running():
            ok, msg = _ml.stop_server()
            context.window_manager["mossy_link_active"] = False
        else:
            ok, msg = _ml.start_server()
            context.window_manager["mossy_link_active"] = _ml.is_server_running()

        level = 'INFO' if ok else 'WARNING'
        self.report({level}, msg)
        return {'FINISHED'}


class WM_OT_MossyCheckHttp(Operator):
    """Check whether the Mossy Bridge and Nemotron LLM are reachable"""
    bl_idname = "wm.mossy_check_http"
    bl_label  = "Check Mossy Connection"

    def execute(self, context):
        try:
            from . import mossy_link as _ml
        except Exception as exc:
            self.report({'ERROR'}, f"Could not import mossy_link: {exc}")
            return {'CANCELLED'}

        bridge_ok, bridge_msg = _ml.check_bridge()
        llm_ok,    llm_msg    = _ml.check_llm()

        # Store statuses on WindowManager for the panel to read.
        wm = context.window_manager
        wm["mossy_bridge_status"] = bridge_msg
        wm["mossy_llm_status"]    = llm_msg

        summary = f"Bridge: {'✓' if bridge_ok else '✗'}  |  LLM: {'✓' if llm_ok else '✗'}"
        level = 'INFO' if (bridge_ok or llm_ok) else 'WARNING'
        self.report({level}, summary)

        # Detailed results in the console so users can see the full messages.
        print(f"[Mossy Link] Bridge check: {bridge_msg}")
        print(f"[Mossy Link] LLM check:    {llm_msg}")
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# TRI Morph Export Operator
# ---------------------------------------------------------------------------

class FO4_OT_ExportTRIMorphs(Operator):
    """Export shape keys on the active mesh as a Fallout 4 .tri morph file.

    FO4 uses .tri files (FRTRI003 format) for head/face morphs — facial
    expressions, race sliders, and body morph presets.  Each shape key
    (excluding Basis) becomes one named morph in the exported file.

    The Basis key supplies the rest-pose vertex positions; all other keys
    are stored as per-vertex displacement deltas scaled to int16.
    """
    bl_idname = "fo4.export_tri_morphs"
    bl_label  = "Export .tri Morphs"
    bl_options = {'REGISTER'}

    filepath: StringProperty(
        name="File Path",
        description="Output .tri file path",
        subtype='FILE_PATH',
        default="",
    )
    filter_glob: StringProperty(
        default="*.tri",
        options={'HIDDEN'},
    )
    basis_name: StringProperty(
        name="Basis Key Name",
        description="Name of the basis/reference shape key (leave empty to use the first key)",
        default="",
    )

    def execute(self, context):
        if not tri_export_helpers:
            self.report({'ERROR'}, "tri_export_helpers module not available")
            return {'CANCELLED'}

        obj = context.active_object
        ok, msg = tri_export_helpers.TRIExportHelpers.export_tri(
            obj,
            bpy.path.abspath(self.filepath),
            basis_name=self.basis_name,
        )
        if ok:
            self.report({'INFO'}, msg)
            if notification_system:
                notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
            return {'FINISHED'}
        self.report({'ERROR'}, msg)
        return {'CANCELLED'}

    def invoke(self, context, event):
        if not tri_export_helpers:
            self.report({'ERROR'}, "tri_export_helpers module not available")
            return {'CANCELLED'}
        obj = context.active_object
        ok, msg = tri_export_helpers.TRIExportHelpers.can_export(obj)
        if not ok:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}
        # Pre-fill filename from object name
        if context.active_object:
            self.filepath = f"{context.active_object.name}.tri"
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


# ---------------------------------------------------------------------------
# Navmesh Validation Operator
# ---------------------------------------------------------------------------

class FO4_OT_ValidateNavMesh(Operator):
    """Validate the active mesh as a Fallout 4 navmesh.

    Checks for common issues that prevent the Creation Kit from importing
    navmesh objects:

    • All faces must be triangles
    • No non-manifold (open boundary) edges
    • Vertex and triangle count within CK limits
    • No zero-area (degenerate) triangles
    • Scale must be applied
    • No near-duplicate vertices
    • No isolated vertices

    Results are printed to the System Console and reported in the status bar.
    """
    bl_idname = "fo4.validate_navmesh"
    bl_label  = "Validate NavMesh"
    bl_options = {'REGISTER'}

    tag_on_pass: BoolProperty(
        name="Tag as NavMesh on Pass",
        description="Mark the object as a navmesh in the viewport when validation passes",
        default=True,
    )

    def execute(self, context):
        if not navmesh_helpers_mod:
            self.report({'ERROR'}, "navmesh_helpers module not available")
            return {'CANCELLED'}

        obj = context.active_object
        result = navmesh_helpers_mod.NavmeshHelpers.validate(obj)
        report_str = navmesh_helpers_mod.NavmeshHelpers.format_report(result)
        print(report_str)

        if result['ok']:
            msg = (
                f"NavMesh validation PASSED "
                f"({result['stats'].get('verts', 0)} verts, "
                f"{result['stats'].get('faces', 0)} tris)"
            )
            if result['warnings']:
                msg += f" — {len(result['warnings'])} warning(s); see console"
                self.report({'WARNING'}, msg)
            else:
                self.report({'INFO'}, msg)
            if self.tag_on_pass:
                navmesh_helpers_mod.NavmeshHelpers.tag_as_navmesh(obj)
        else:
            n_err = len(result['errors'])
            n_warn = len(result['warnings'])
            msg = (
                f"NavMesh validation FAILED — "
                f"{n_err} error(s), {n_warn} warning(s). "
                "See System Console for details."
            )
            self.report({'ERROR'}, msg)

        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Multi-Piece Convex Collision Operator (V-HACD-style decomposition)
# ---------------------------------------------------------------------------

def _build_convex_piece(source_mesh, vert_indices, piece_name):
    """Build one convex hull object from *vert_indices* of *source_mesh*.

    Returns the new ``bpy.types.Object`` or ``None`` on failure.
    """
    import bmesh as _bm

    bm2 = _bm.new()
    bm2.from_mesh(source_mesh)
    bm2.verts.ensure_lookup_table()

    # Keep only the vertices in this island/cell
    to_del = [v for v in bm2.verts if v.index not in vert_indices]
    if to_del:
        _bm.ops.delete(bm2, geom=to_del, context='VERTS')

    if not bm2.verts:
        bm2.free()
        return None

    _bm.ops.remove_doubles(bm2, verts=bm2.verts, dist=0.001)
    bm2.verts.ensure_lookup_table()

    if not bm2.verts:
        bm2.free()
        return None

    result = _bm.ops.convex_hull(bm2, input=bm2.verts)
    geom_del = result.get('geom_interior', []) + result.get('geom_unused', [])
    v_del = [g for g in geom_del if isinstance(g, _bm.types.BMVert)]
    if v_del:
        _bm.ops.delete(bm2, geom=v_del, context='VERTS')

    _bm.ops.triangulate(bm2, faces=bm2.faces[:])
    _bm.ops.recalc_face_normals(bm2, faces=bm2.faces[:])
    bm2.normal_update()

    # Enforce FO4 convex vertex limit (256)
    _FO4_LIMIT = 256
    if len(bm2.verts) > _FO4_LIMIT:
        # Apply a further convex hull after reducing the vert set
        target = max(4, _FO4_LIMIT)
        # Delete excess verts furthest from centroid
        centroid = sum((v.co for v in bm2.verts), bm2.verts[0].co.copy()) / len(bm2.verts)
        sorted_verts = sorted(bm2.verts, key=lambda v: (v.co - centroid).length, reverse=True)
        excess = sorted_verts[target:]
        if excess:
            _bm.ops.delete(bm2, geom=excess, context='VERTS')
        result2 = _bm.ops.convex_hull(bm2, input=bm2.verts)
        g2 = result2.get('geom_interior', []) + result2.get('geom_unused', [])
        v2 = [g for g in g2 if isinstance(g, _bm.types.BMVert)]
        if v2:
            _bm.ops.delete(bm2, geom=v2, context='VERTS')
        _bm.ops.triangulate(bm2, faces=bm2.faces[:])
        _bm.ops.recalc_face_normals(bm2, faces=bm2.faces[:])
        bm2.normal_update()

    new_mesh = bpy.data.meshes.new(f"{piece_name}_mesh")
    bm2.to_mesh(new_mesh)
    bm2.free()

    coll_obj = bpy.data.objects.new(piece_name, new_mesh)
    coll_obj["fo4_collision"] = True
    coll_obj.data.materials.clear()
    return coll_obj


def _find_islands(mesh_data) -> list:
    """Return a list of sets of vertex indices for each disconnected island."""
    import bmesh as _bm

    bm = _bm.new()
    bm.from_mesh(mesh_data)
    bm.verts.ensure_lookup_table()

    visited: set = set()
    islands: list = []
    for seed in bm.verts:
        if seed.index in visited:
            continue
        island: set = set()
        stack = [seed]
        while stack:
            v = stack.pop()
            if v.index in visited:
                continue
            visited.add(v.index)
            island.add(v.index)
            for edge in v.link_edges:
                other = edge.other_vert(v)
                if other.index not in visited:
                    stack.append(other)
        islands.append(island)
    bm.free()
    return islands


def _grid_decompose(obj, grid_res: int, max_pieces: int) -> list:
    """Decompose a single-island mesh into cells of a bounding-box grid.

    Divides the object's bounding box into ``grid_res × grid_res × grid_res``
    cells and returns up to ``max_pieces`` non-empty cell vertex sets.
    """
    import bmesh as _bm
    from mathutils import Vector as _V

    bm = _bm.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()

    if not bm.verts:
        bm.free()
        return []

    # Bounding box
    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    bb_min = _V((min(xs), min(ys), min(zs)))
    bb_max = _V((max(xs), max(ys), max(zs)))
    bb_size = bb_max - bb_min
    # Avoid division by zero on flat dimensions
    size_x = max(bb_size.x, 1e-6)
    size_y = max(bb_size.y, 1e-6)
    size_z = max(bb_size.z, 1e-6)

    cells: dict = {}
    for v in bm.verts:
        cx = min(grid_res - 1, int((v.co.x - bb_min.x) / size_x * grid_res))
        cy = min(grid_res - 1, int((v.co.y - bb_min.y) / size_y * grid_res))
        cz = min(grid_res - 1, int((v.co.z - bb_min.z) / size_z * grid_res))
        key = (cx, cy, cz)
        cells.setdefault(key, set()).add(v.index)

    bm.free()

    # Sort by size descending, keep top max_pieces
    sorted_cells = sorted(cells.values(), key=len, reverse=True)
    return sorted_cells[:max_pieces]


class FO4_OT_GenerateMultiConvexCollision(Operator):
    """Decompose the active mesh into multiple UCX_ convex collision pieces.

    Standard single-piece collision (``UCX_ObjectName``) generates one convex
    hull that encompasses the entire mesh.  For complex shapes — furniture with
    separate legs, machinery, architectural elements — this produces collision
    that is either too loose or blocks areas that should be walkable.

    This operator generates one convex-hull piece per disconnected mesh island.
    For single-island meshes it optionally sub-divides the bounding box into a
    grid and generates a hull per occupied cell, mimicking V-HACD decomposition
    using only Blender's built-in bmesh tools (no external libraries required).

    Each piece is named ``UCX_ObjectName_00``, ``UCX_ObjectName_01``, etc.,
    parented to the source object, and configured as a PASSIVE rigid body.
    """
    bl_idname = "fo4.generate_multi_convex_collision"
    bl_label  = "Multi-Piece Convex Collision"
    bl_options = {'REGISTER', 'UNDO'}

    max_pieces: IntProperty(
        name="Max Pieces",
        description=(
            "Maximum number of UCX_ pieces to generate. "
            "Each disconnected island produces one piece. "
            "For single-island meshes the bounding box is divided into a grid "
            "to produce multiple sub-hulls."
        ),
        default=4,
        min=1,
        max=32,
    )
    grid_resolution: IntProperty(
        name="Grid Resolution",
        description=(
            "Grid subdivisions used when the mesh is a single island. "
            "A resolution of 2 divides the bounding box into up to 8 cells (2×2×2)."
        ),
        default=2,
        min=1,
        max=8,
    )

    def execute(self, context):
        import bmesh as _bm

        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Active object must be a mesh")
            return {'CANCELLED'}

        # Remove any existing UCX_ children (single-piece and multi-piece)
        ucx_single = f"UCX_{obj.name}"
        ucx_prefix = f"UCX_{obj.name}_"
        for child in list(obj.children):
            if child.get("fo4_collision") or child.name == ucx_single or \
                    child.name.startswith(ucx_prefix):
                bpy.data.objects.remove(child, do_unlink=True)

        # Find disconnected islands
        islands = _find_islands(obj.data)

        # For single-island meshes use grid decomposition
        if len(islands) == 1 and self.max_pieces > 1:
            islands = _grid_decompose(obj, self.grid_resolution, self.max_pieces)

        # Cap at max_pieces (keep largest islands)
        if len(islands) > self.max_pieces:
            islands = sorted(islands, key=len, reverse=True)[:self.max_pieces]

        created = []
        collection = (
            obj.users_collection[0] if obj.users_collection
            else context.scene.collection
        )

        for idx, vert_indices in enumerate(islands):
            if not vert_indices:
                continue
            piece_name = f"UCX_{obj.name}_{idx:02d}"
            piece = _build_convex_piece(obj.data, vert_indices, piece_name)
            if piece is None:
                continue

            piece.parent = obj
            piece.matrix_parent_inverse = obj.matrix_world.inverted()
            collection.objects.link(piece)

            # Configure rigid body
            try:
                bpy.ops.object.select_all(action='DESELECT')
                piece.select_set(True)
                context.view_layer.objects.active = piece
                bpy.ops.rigidbody.object_add()
                piece.rigid_body.type = 'PASSIVE'
                piece.rigid_body.collision_shape = 'CONVEX_HULL'
                piece.rigid_body.mass = 0.0
                piece.rigid_body.friction = 0.8
                piece.rigid_body.restitution = 0.1
            except Exception:
                pass

            created.append(piece)

        # Restore selection
        bpy.ops.object.select_all(action='DESELECT')
        context.view_layer.objects.active = obj
        obj.select_set(True)

        if not created:
            self.report({'ERROR'}, f"Failed to generate any convex pieces for '{obj.name}'")
            return {'CANCELLED'}

        msg = (
            f"Generated {len(created)} UCX_ convex piece(s) for '{obj.name}' "
            f"(from {len(islands)} island(s))"
        )
        self.report({'INFO'}, msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(msg, 'INFO')
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# ---------------------------------------------------------------------------
# BGSM / BGEM material file export
# ---------------------------------------------------------------------------

class FO4_OT_ExportBGSM(Operator):
    """Export Blender material(s) on the active object as Fallout 4 .bgsm files.

    Each material slot is saved as a separate ``.bgsm`` binary file in the
    chosen output directory.  Texture node names "Diffuse", "Normal",
    "Specular", "Glow", and "EnvMap" are mapped to the corresponding BGSM
    texture slots.

    To generate valid in-game materials you must also set the NIF's
    BSLightingShaderProperty to reference the exported ``.bgsm`` path via the
    Creation Kit Material Editor (or Nifskope).
    """
    bl_idname = "fo4.export_bgsm"
    bl_label  = "Export .bgsm Material(s)"
    bl_options = {'REGISTER'}

    directory: StringProperty(
        name="Output Directory",
        description="Folder to write .bgsm files into (usually Data/Materials/...)",
        subtype='DIR_PATH',
        default="",
    )
    all_slots: BoolProperty(
        name="All Material Slots",
        description="Export every material slot; uncheck to export only the active slot",
        default=True,
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return (
            obj is not None
            and obj.type == 'MESH'
            and bool(obj.data.materials)
        )

    def execute(self, context):
        if not bgsm_helpers:
            self.report({'ERROR'}, "bgsm_helpers module not available")
            return {'CANCELLED'}

        obj = context.active_object
        results = bgsm_helpers.export_bgsm_for_object(
            obj,
            self.directory,
            all_slots=self.all_slots,
        )

        n_ok = sum(1 for ok, _ in results if ok)
        n_fail = len(results) - n_ok

        for ok, msg in results:
            level = 'INFO' if ok else 'WARNING'
            self.report({level}, msg)
            if notification_system:
                notification_system.FO4_NotificationSystem.notify(msg, level)

        if n_fail == 0:
            self.report({'INFO'}, f"Exported {n_ok} .bgsm file(s) to {self.directory}")
        else:
            self.report(
                {'WARNING'},
                f"Exported {n_ok} .bgsm file(s); {n_fail} failed — check console",
            )
        return {'FINISHED'}

    def invoke(self, context, event):
        obj = context.active_object
        if not obj or obj.type != 'MESH' or not obj.data.materials:
            self.report({'ERROR'}, "Active object must be a mesh with at least one material")
            return {'CANCELLED'}
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_BatchExportBGSM(Operator):
    """Export .bgsm files for all materials in the entire scene.

    Every unique material that is assigned to at least one mesh object is
    exported as a ``.bgsm`` file.  Materials with no image nodes are
    exported with empty texture paths (the material flags still apply).
    """
    bl_idname = "fo4.batch_export_bgsm"
    bl_label  = "Batch Export All .bgsm Materials"
    bl_options = {'REGISTER'}

    directory: StringProperty(
        name="Output Directory",
        description="Folder to write all .bgsm files into",
        subtype='DIR_PATH',
        default="",
    )

    @classmethod
    def poll(cls, context):
        return any(
            o.type == 'MESH' and o.data.materials
            for o in context.scene.objects
        )

    def execute(self, context):
        if not bgsm_helpers:
            self.report({'ERROR'}, "bgsm_helpers module not available")
            return {'CANCELLED'}

        import os
        os.makedirs(self.directory, exist_ok=True)

        seen = set()
        n_ok = 0
        n_fail = 0
        for obj in context.scene.objects:
            if obj.type != 'MESH':
                continue
            for mat in obj.data.materials:
                if mat is None or mat.name in seen:
                    continue
                seen.add(mat.name)
                try:
                    data = bgsm_helpers.blender_mat_to_bgsm(mat)
                    safe = "".join(
                        c if c.isalnum() or c in "._-" else "_"
                        for c in mat.name
                    )
                    path = os.path.join(self.directory, safe + ".bgsm")
                    with open(path, "wb") as fh:
                        fh.write(bgsm_helpers.write_bgsm(data))
                    n_ok += 1
                except Exception as exc:
                    self.report({'WARNING'}, f"Failed to export '{mat.name}': {exc}")
                    n_fail += 1

        msg = f"Batch BGSM export: {n_ok} written, {n_fail} failed"
        self.report({'INFO' if n_fail == 0 else 'WARNING'}, msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                msg, 'INFO' if n_fail == 0 else 'WARNING'
            )
        return {'FINISHED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


class FO4_OT_ImportBGSM(Operator):
    """Import a Fallout 4 .bgsm file and apply it to the active object's material.

    Creates or updates a Blender material that mirrors the BGSM fields:
    texture node connections, alpha mode, specular colour, emission, and
    two-sided flag.  If the object has no material slot a new one is added.
    """
    bl_idname = "fo4.import_bgsm"
    bl_label  = "Import .bgsm Material"
    bl_options = {'REGISTER', 'UNDO'}

    filepath: StringProperty(
        name="File Path",
        description="Path to the .bgsm file to import",
        subtype='FILE_PATH',
        default="",
    )
    filter_glob: StringProperty(
        default="*.bgsm;*.bgem",
        options={'HIDDEN'},
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        if not bgsm_helpers:
            self.report({'ERROR'}, "bgsm_helpers module not available")
            return {'CANCELLED'}

        obj = context.active_object
        ok, msg = bgsm_helpers.import_bgsm_for_object(
            obj,
            bpy.path.abspath(self.filepath),
        )
        level = 'INFO' if ok else 'ERROR'
        self.report({level}, msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(msg, level)
        return {'FINISHED'} if ok else {'CANCELLED'}

    def invoke(self, context, event):
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}


# ---------------------------------------------------------------------------
# Glowing Plant operators  (BGSM/BGEM glow, emittance pulse, multi-colour)
# ---------------------------------------------------------------------------

class FO4_OT_SetupGlowingPlantMaterial(Operator):
    """Set up a Fallout 4 glowing plant BGSM material.

    Applies the GLOW_PLANT_BGSM preset (alpha-clip + two-sided), sets the
    emittance colour and multiplier, enables the glow-map flag, and optionally
    marks the material for External Emittance so the Creation Kit can link its
    glow intensity to time-of-day or weather conditions.

    To get per-vein colour variation install a full-colour RGB _g.dds glow map
    and use the 'Multi-Color Glow Map' variant (GLOW_PLANT_MULTICOLOR preset).
    """
    bl_idname = "fo4.setup_glowing_plant_material"
    bl_label = "Setup Glowing Plant (BGSM)"
    bl_options = {'REGISTER', 'UNDO'}

    glow_color: FloatProperty(
        name="Glow R",
        description="Red channel of the emittance colour",
        min=0.0, max=1.0,
        default=0.1,
    )
    glow_color_g: FloatProperty(
        name="Glow G",
        description="Green channel of the emittance colour",
        min=0.0, max=1.0,
        default=0.9,
    )
    glow_color_b: FloatProperty(
        name="Glow B",
        description="Blue channel of the emittance colour",
        min=0.0, max=1.0,
        default=0.2,
    )
    emittance_mult: FloatProperty(
        name="Emittance Multiplier",
        description="Brightness of the glow (1.0 = normal, >1 = neon). "
                    "Maps directly to the BGSM emittanceMult field",
        min=0.0,
        soft_max=20.0,
        default=2.0,
    )
    use_external_emittance: BoolProperty(
        name="External Emittance",
        description="Link glow intensity to time-of-day / weather via the "
                    "Creation Kit External Emittance system. The CK will "
                    "override emittance colour/intensity at runtime",
        default=False,
    )
    multicolor_mode: BoolProperty(
        name="Multi-Color Glow Map",
        description="Set emittance colour to white so the engine reads actual "
                    "colour from the RGB _g.dds glow texture. Each vein glows "
                    "in its own colour",
        default=False,
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        if not fo4_material_browser:
            self.report({'ERROR'}, "fo4_material_browser module not available")
            return {'CANCELLED'}

        obj = context.active_object
        preset_id = "GLOW_PLANT_MULTICOLOR" if self.multicolor_mode else "GLOW_PLANT_BGSM"
        ok, msg = fo4_material_browser.MaterialBrowser.apply_preset(obj, preset_id)
        if not ok:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}

        mat = obj.data.materials[0] if obj.data.materials else None
        if mat and mat.use_nodes:
            pbsdf = next(
                (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'),
                None,
            )
            if pbsdf is not None:
                # Emission colour
                if self.multicolor_mode:
                    ec = (1.0, 1.0, 1.0, 1.0)  # white → engine reads from RGB glow map
                else:
                    ec = (self.glow_color, self.glow_color_g, self.glow_color_b, 1.0)
                em_col = pbsdf.inputs.get("Emission Color") or pbsdf.inputs.get("Emission")
                if em_col:
                    em_col.default_value = ec
                em_str = pbsdf.inputs.get("Emission Strength")
                if em_str:
                    em_str.default_value = self.emittance_mult

            # Store metadata for the BGSM exporter
            mat["fo4_shader_type"] = "glowmap_multicolor_foliage" if self.multicolor_mode else "glowmap_foliage"
            mat["fo4_emittance_mult"] = self.emittance_mult
            if self.use_external_emittance:
                mat["fo4_external_emittance"] = True

        mode_str = "multi-colour" if self.multicolor_mode else "standard"
        ext_str = " + External Emittance (CK link)" if self.use_external_emittance else ""
        full_msg = (
            f"Glowing plant material ({mode_str}{ext_str}) applied to '{obj.name}'. "
            "Install a _g.dds glow mask, then export BGSM to enable in-game glow. "
            "Use 'Apply Emittance Pulse' to add a pulsing animation."
        )
        self.report({'INFO'}, full_msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                f"Glowing plant material applied to '{obj.name}'", 'INFO'
            )
        return {'FINISHED'}

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "multicolor_mode")
        col = layout.column(align=True)
        col.enabled = not self.multicolor_mode
        col.label(text="Emittance Colour:")
        row = col.row(align=True)
        row.prop(self, "glow_color",   text="R")
        row.prop(self, "glow_color_g", text="G")
        row.prop(self, "glow_color_b", text="B")
        layout.prop(self, "emittance_mult")
        layout.prop(self, "use_external_emittance")
        hint = layout.box().column(align=True)
        hint.scale_y = 0.75
        if self.multicolor_mode:
            hint.label(text="White emittance → engine reads RGB from _g.dds.", icon='INFO')
            hint.label(text="Each coloured vein in the map glows independently.", icon='DOT')
        else:
            hint.label(text="Emittance Multiplier 1.0 = normal, >5 = neon glow.", icon='INFO')
        if self.use_external_emittance:
            hint.label(text="CK: link this form to an ExternalEmittance record.", icon='INFO')

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_SetupGlowingPlantBGEM(Operator):
    """Set up an additive-blend BGEM bloom halo for a glowing plant.

    In Fallout 4, a 'bloom' or 'light-bleed' halo around a glowing plant is
    achieved with a separate billboard quad mesh using an **additive** BGEM
    effect material (alpha_blend_mode = Additive, NOT standard).  Standard
    BGSM glow maps are flat; the BGEM additive approach lets light bleed into
    the surrounding air for a modern 'wet neon' look.

    Workflow:
    1. Model a simple billboard quad (or low-poly sphere shell) slightly larger
       than your plant mesh and place it around it.
    2. Run this operator on the billboard to apply the bloom BGEM material.
    3. Install your bloom sprite (_d.dds, premultiplied alpha) via Install Texture.
    4. Export both the plant mesh (BGSM) and the billboard (BGEM) to your mod.
    """
    bl_idname = "fo4.setup_glowing_plant_bgem"
    bl_label = "Setup Glowing Plant Bloom (BGEM)"
    bl_options = {'REGISTER', 'UNDO'}

    bloom_color: FloatProperty(
        name="Bloom R",
        description="Red channel of the bloom / base colour",
        min=0.0, max=1.0,
        default=0.1,
    )
    bloom_color_g: FloatProperty(
        name="Bloom G",
        description="Green channel of the bloom / base colour",
        min=0.0, max=1.0,
        default=0.9,
    )
    bloom_color_b: FloatProperty(
        name="Bloom B",
        description="Blue channel of the bloom / base colour",
        min=0.0, max=1.0,
        default=0.2,
    )
    emission_strength: FloatProperty(
        name="Emission Strength",
        description="Bloom brightness – higher = larger apparent halo radius",
        min=0.0,
        soft_max=20.0,
        default=4.0,
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        if not fo4_material_browser:
            self.report({'ERROR'}, "fo4_material_browser module not available")
            return {'CANCELLED'}

        obj = context.active_object
        ok, msg = fo4_material_browser.MaterialBrowser.apply_preset(obj, "GLOW_PLANT_BGEM")
        if not ok:
            self.report({'ERROR'}, msg)
            return {'CANCELLED'}

        mat = obj.data.materials[0] if obj.data.materials else None
        if mat and mat.use_nodes:
            pbsdf = next(
                (n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'),
                None,
            )
            if pbsdf is not None:
                bc = pbsdf.inputs.get("Base Color")
                if bc:
                    bc.default_value = (self.bloom_color, self.bloom_color_g,
                                        self.bloom_color_b, 1.0)
                em_col = pbsdf.inputs.get("Emission Color") or pbsdf.inputs.get("Emission")
                if em_col:
                    em_col.default_value = (self.bloom_color, self.bloom_color_g,
                                            self.bloom_color_b, 1.0)
                em_str = pbsdf.inputs.get("Emission Strength")
                if em_str:
                    em_str.default_value = self.emission_strength

            # Mark as BGEM so the exporter generates a .bgem file.
            mat["fo4_shader_type"] = "bgem_bloom"
            mat["fo4_is_bgem"] = True

        full_msg = (
            f"BGEM bloom material applied to '{obj.name}'. "
            "Install a bloom sprite (_d.dds, premultiplied alpha) and "
            "export this mesh alongside the plant NIF. "
            "Set alpha_blend_mode = Additive in the .bgem file for the halo effect."
        )
        self.report({'INFO'}, full_msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(
                f"BGEM bloom material applied to '{obj.name}'", 'INFO'
            )
        return {'FINISHED'}

    def draw(self, context):
        layout = self.layout
        layout.label(text="Bloom Colour:")
        row = layout.row(align=True)
        row.prop(self, "bloom_color",   text="R")
        row.prop(self, "bloom_color_g", text="G")
        row.prop(self, "bloom_color_b", text="B")
        layout.prop(self, "emission_strength")
        hint = layout.box().column(align=True)
        hint.scale_y = 0.75
        hint.label(text="Place this BGEM mesh as a shell around the plant.", icon='INFO')
        hint.label(text="Additive blend makes light 'bleed' into the air.", icon='DOT')
        hint.label(text="Use a soft circular/radial gradient _d.dds.", icon='DOT')

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_ApplyEmittancePulse(Operator):
    """Add a pulsing glow animation to the active material's Emission Strength.

    This simulates the ``BSLightingShaderPropertyFloatController`` animation
    that NifSkope uses to animate the Emittance Multiplier at runtime in FO4.

    In Blender the animation drives the Principled BSDF 'Emission Strength'
    socket with a NOISE modifier so the brightness changes organically.

    After export, open the NIF in NifSkope and manually add:
    • BSLightingShaderProperty → right-click → 'Attach Controller'
    • Controller: BSLightingShaderPropertyFloatController
    • Target: EMISSIVE_MULTIPLE
    • Interpolator: NiFloatInterpolator  (set keyframe data from this action)
    """
    bl_idname = "fo4.apply_emittance_pulse"
    bl_label = "Apply Emittance Pulse"
    bl_options = {'REGISTER', 'UNDO'}

    min_strength: FloatProperty(
        name="Min Brightness",
        description="Emission Strength at the darkest pulse point (plant dims to this)",
        min=0.0,
        soft_max=10.0,
        default=0.3,
    )
    max_strength: FloatProperty(
        name="Max Brightness",
        description="Emission Strength at the brightest pulse point (neon peak)",
        min=0.0,
        soft_max=30.0,
        default=4.0,
    )
    period: FloatProperty(
        name="Period (frames)",
        description="Length of one pulse cycle in frames (lower = faster flicker)",
        min=4.0,
        soft_max=300.0,
        default=60.0,
    )
    noise_scale: FloatProperty(
        name="Noise Scale",
        description="How quickly the noise changes (0.3–0.8 feels organic; "
                    "1.0 = one oscillation per period)",
        min=0.05,
        max=2.0,
        default=0.5,
    )

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        return obj is not None and obj.type == 'MESH'

    def execute(self, context):
        if not animation_helpers:
            self.report({'ERROR'}, "animation_helpers module not available")
            return {'CANCELLED'}

        obj = context.active_object
        ok, msg = animation_helpers.AnimationHelpers.apply_emittance_pulse(
            obj,
            min_strength=self.min_strength,
            max_strength=self.max_strength,
            period=self.period,
            noise_scale=self.noise_scale,
        )
        level = 'INFO' if ok else 'ERROR'
        self.report({level}, msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(msg, level)
        return {'FINISHED'} if ok else {'CANCELLED'}

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "min_strength")
        layout.prop(self, "max_strength")
        layout.prop(self, "period")
        layout.prop(self, "noise_scale")
        hint = layout.box().column(align=True)
        hint.scale_y = 0.75
        hint.label(text="In NifSkope: attach BSLightingShaderPropertyFloatController", icon='INFO')
        hint.label(text="to BSLightingShaderProperty → EMISSIVE_MULTIPLE.", icon='DOT')
        hint.label(text="Use NiFloatInterpolator with keyframe data from this action.", icon='DOT')

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class FO4_OT_RemoveEmittancePulse(Operator):
    """Remove the pulsing glow animation from the active material.

    Deletes the *_GlowPulse action and resets Emission Strength to the
    material's non-animated default.
    """
    bl_idname = "fo4.remove_emittance_pulse"
    bl_label = "Remove Emittance Pulse"
    bl_options = {'REGISTER', 'UNDO'}

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        if obj is None or obj.type != 'MESH':
            return False
        # Only show button when a GlowPulse action exists.
        mat = None
        if obj.data.materials:
            idx = getattr(obj, 'active_material_index', 0)
            mat = obj.data.materials[idx] if idx < len(obj.data.materials) else None
        if mat is None:
            return False
        return bool(mat.get("fo4_emittance_pulse"))

    def execute(self, context):
        if not animation_helpers:
            self.report({'ERROR'}, "animation_helpers module not available")
            return {'CANCELLED'}

        obj = context.active_object
        ok, msg = animation_helpers.AnimationHelpers.remove_emittance_pulse(obj)
        level = 'INFO' if ok else 'WARNING'
        self.report({level}, msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(msg, level)
        return {'FINISHED'} if ok else {'CANCELLED'}


# ---------------------------------------------------------------------------
# BA2 archive extraction
# ---------------------------------------------------------------------------

class FO4_OT_ExtractBA2Asset(Operator):
    """Extract an asset from a Fallout 4 BA2 archive into a loose-file directory.

    Locates the BA2 archive most likely to contain the requested asset and
    extracts it using Archive2.exe (part of the Fallout 4 Creation Kit).

    Archive2.exe must be reachable from the Creation Kit path configured in
    Add-on Preferences, or must be installed alongside Fallout 4 via Steam.
    """
    bl_idname = "fo4.extract_ba2_asset"
    bl_label  = "Extract BA2 Asset"
    bl_options = {'REGISTER'}

    nif_path: StringProperty(
        name="Asset Path",
        description=(
            "Data/-relative path to extract, e.g. "
            "'meshes/weapons/10mmpistol/10mmpistol.nif'"
        ),
        default="",
    )
    output_dir: StringProperty(
        name="Output Directory",
        description="Directory to extract the asset into (Data/ structure preserved)",
        subtype='DIR_PATH',
        default="",
    )

    @classmethod
    def poll(cls, context):
        return fo4_game_assets is not None

    def execute(self, context):
        if not fo4_game_assets:
            self.report({'ERROR'}, "fo4_game_assets module not available")
            return {'CANCELLED'}

        if not self.nif_path:
            self.report({'ERROR'}, "Asset path is required")
            return {'CANCELLED'}

        from pathlib import Path
        out = Path(bpy.path.abspath(self.output_dir)) if self.output_dir else Path(".")

        ok, msg = fo4_game_assets.FO4GameAssets.extract_asset(self.nif_path, out)
        level = 'INFO' if ok else 'ERROR'
        self.report({level}, msg)
        if notification_system:
            notification_system.FO4_NotificationSystem.notify(msg, level)
        return {'FINISHED'} if ok else {'CANCELLED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


classes = (
    FO4_OT_OpenShiagurPowerArmorRig,
    FO4_OT_OpenShiagurAnimRig,
    FO4_OT_OpenFBXImporter,
    FO4_OT_ShowShiagurWorkflow,
    FO4_OT_OpenFOMODCreationTool,
    FO4_OT_OpenCathedralAssetsOptimizer,
    FO4_OT_OpenFO4Edit,
    FO4_OT_ShowFOMODGuide,
    FO4_OT_OpenCollectiveModdingToolkit,
    FO4_OT_OpenStoryActionPoses,
    FO4_OT_OpenAAF,
    FO4_OT_OpenPoserHotkeys,
    FO4_OT_ShowStoryActionPosesGuide,
    FO4_OT_OpenBodySlideOutfitStudio,
    FO4_OT_OpenCBBE,
    FO4_OT_ShowArmorClothingWorkflow,
    FO4_OT_OpenFO4ArmorBlenderGuide,
    FO4_OT_SetArmorOrigin,
    FO4_OT_SplitUVSeamEdges,
    FO4_OT_TransferArmorWeights,
    FO4_OT_CleanImportedArmature,
    FO4_OT_NextTutorialStep,
    FO4_OT_PreviousTutorialStep,
    FO4_OT_ShowMessage,
    FO4_OT_CreateBaseMesh,
    FO4_OT_OptimizeMesh,
    FO4_OT_ValidateMesh,
    FO4_OT_SetupTextures,
    FO4_OT_InstallTexture,
    FO4_OT_ValidateTextures,
    FO4_OT_SetupArmature,
    FO4_OT_ValidateAnimation,
    FO4_OT_CreateIdleAnimation,
    FO4_OT_GenerateWindWeights,
    FO4_OT_AutoWeightPaint,
    FO4_OT_ApplyWindAnimation,
    FO4_OT_BatchGenerateWindWeights,
    FO4_OT_BatchApplyWindAnimation,
    FO4_OT_BatchAutoWeightPaint,
    FO4_OT_ToggleWindPreview,
    FO4_OT_CheckRigNetInstallation,
    FO4_OT_ShowRigNetInfo,
    FO4_OT_PrepareForRigNet,
    FO4_OT_AutoRigMesh,
    FO4_OT_ExportForRigNet,
    FO4_OT_CheckLibiglInstallation,
    FO4_OT_ComputeBBWSkinning,
    FO4_OT_ExportMesh,
    FO4_OT_SetCollisionType,
    FO4_OT_ExportMeshWithCollision,
    FO4_OT_ExportAll,
    FO4_OT_ExportCKAssetBundle,
    FO4_OT_ExportSceneAsNif,
    FO4_OT_ValidateExport,
    FO4_OT_ExportAnimationHavok2FBX,
    # FO4_OT_InstallPythonDeps - moved to setup_operators.py (registered before this module)
    # FO4_OT_SelfTest - moved to setup_operators.py (registered before this module)
    FO4_OT_AnalyzeMeshQuality,
    FO4_OT_AutoRepairMesh,
    FO4_OT_SmartDecimate,
    FO4_OT_DecimateToFO4,
    FO4_OT_SplitMeshPolyLimit,
    FO4_OT_GenerateLOD,
    FO4_OT_GenerateLODAndCollision,
    FO4_OT_CollisionFromLowestLOD,
    FO4_OT_BatchGenerateLOD,
    FO4_OT_BatchGenerateCollision,
    FO4_OT_OptimizeUVs,
    # New batch processing operators
    FO4_OT_BatchOptimizeMeshes,
    FO4_OT_BatchValidateMeshes,
    FO4_OT_BatchExportMeshes,
    # New smart preset operators
    FO4_OT_CreateWeaponPreset,
    FO4_OT_CreateArmorPreset,
    FO4_OT_CreatePropPreset,
    # New automation operators
    FO4_OT_QuickPrepareForExport,
    FO4_OT_ConvertToFallout4,
    FO4_OT_AutoFixCommonIssues,
    FO4_OT_GenerateCollisionMesh,
    FO4_OT_SmartMaterialSetup,
    # New vegetation/landscaping operators
    FO4_OT_CreateVegetationPreset,
    FO4_OT_CombineVegetationMeshes,
    FO4_OT_ScatterVegetation,
    FO4_OT_OptimizeVegetationForFPS,
    FO4_OT_CreateVegetationLODChain,
    FO4_OT_BakeVegetationAO,
    FO4_OT_SetupVegetationMaterial,
    FO4_OT_ExportVegetationAsNif,
    FO4_OT_ExportLODChainAsNif,
    # Quest and dialogue operators
    FO4_OT_CreateQuestTemplate,
    FO4_OT_ExportQuestData,
    FO4_OT_QuestGeneratePapyrusScript,
    # NPC and creature operators
    FO4_OT_CreateNPC,
    FO4_OT_CreateCreature,
    # World building operators
    FO4_OT_CreateInteriorCell,
    FO4_OT_CreateDoorFrame,
    FO4_OT_CreateNavMesh,
    FO4_OT_CreateWorkshopObject,
    FO4_OT_CreateLightingPreset,
    # Item creation operators
    FO4_OT_CreateWeaponItem,
    FO4_OT_CreateArmorItem,
    FO4_OT_CreatePowerArmorPiece,
    FO4_OT_CreateConsumable,
    FO4_OT_CreateMiscItem,
    FO4_OT_CreateClutterObject,
    # Preset library operators
    FO4_OT_SavePreset,
    FO4_OT_LoadPreset,
    FO4_OT_DeletePreset,
    FO4_OT_RefreshPresetLibrary,
    # Automation system operators
    FO4_OT_StartRecording,
    FO4_OT_StopRecording,
    FO4_OT_SaveMacro,
    FO4_OT_ExecuteMacro,
    FO4_OT_DeleteMacro,
    FO4_OT_ExecuteWorkflowTemplate,
    # Desktop tutorial app operators
    FO4_OT_ConnectDesktopApp,
    FO4_OT_DisconnectDesktopApp,
    FO4_OT_CheckDesktopConnection,
    FO4_OT_SyncDesktopStep,
    FO4_OT_DesktopNextStep,
    FO4_OT_DesktopPreviousStep,
    FO4_OT_SendEventToDesktop,
    FO4_OT_GetDesktopProgress,
    FO4_OT_PullOriginalToDesktop,
    # Shap-E AI generation operators
    # Point-E AI generation operators
    # Operation log
    FO4_OT_ClearOperationLog,
    # Add-on self-update / reload
    # FO4_OT_ReloadAddon - moved to setup_operators.py (registered before this module)
    # Mod folder import/export
    FO4_OT_ImportModFolder,
    FO4_OT_ExportModFolder,
    # Game asset browsers + direct path/import/conversion operators
    FO4_OT_SetFO4AssetsPath,
    FO4_OT_SetFO4SubPath,
    FO4_OT_SetUnityAssetsPath,
    FO4_OT_SetUnrealAssetsPath,
    FO4_OT_ImportFO4AssetFile,
    FO4_OT_PrepareThirdPartyMesh,
    FO4_OT_BrowseFO4Assets,
    FO4_OT_BrowseUnityAssets,
    FO4_OT_ImportUnityAsset,
    FO4_OT_BrowseUnrealAssets,
    FO4_OT_ImportUnrealAsset,
    # UV + Texture workflow
    FO4_OT_SetupUVWithTexture,
    FO4_OT_ReUnwrapUV,
    FO4_OT_OpenUVEditing,
    # Hybrid UV workflow (complex / organic meshes)
    FO4_OT_ScanUVComplexity,
    FO4_OT_SmartSeamMark,
    FO4_OT_HybridUnwrap,
    # Face-selective UV unwrap
    FO4_OT_PickFacesForUnwrap,
    FO4_OT_UnwrapSelectedFaces,
    # AI upscaler one-click installer
    # One-click installers for AI tools
    FO4_OT_ShowQuickReference,
    FO4_OT_ShowFoliageLODChecklist,
    # Mossy AI UV/texture advisor and auto-fix
    FO4_OT_AskMossyForUVAdvice,
    FO4_OT_MossyAutoFix,
    # Post-processing operators
    FO4_OT_SetupPostProcessingCompositor,
    FO4_OT_ApplyPostProcessingPreset,
    FO4_OT_ClearPostProcessing,
    FO4_OT_ExportImageSpaceData,
    FO4_OT_SyncPostProcessingProps,
    # Material browser operators
    FO4_OT_ApplyCoreMaterialProfile,
    FO4_OT_ApplyMaterialPreset,
    # Scene diagnostics operators
    FO4_OT_RunSceneDiagnostics,
    FO4_OT_AutoFixDiagnostics,
    FO4_OT_ExportDiagnosticsReport,
    # Smart wind + export prep (one-click vegetation pipeline)
    FO4_OT_SmartPrepareWindMesh,
    # HD material setup (4K textures + glow maps + PBR flags)
    FO4_OT_SetupHDMaterial,
    # Scale reference operators
    FO4_OT_AddReferenceObject,
    FO4_OT_ClearReferenceObjects,
    # Papyrus script template operators
    FO4_OT_GeneratePapyrusScript,
    FO4_OT_ExportPapyrusScript,
    FO4_OT_ShowPapyrusCompileInstructions,
    # Havok physics operators
    FO4_OT_ApplyPhysicsPreset,
    FO4_OT_ValidatePhysics,
    # Mod packaging operators
    FO4_OT_CreateModStructure,
    FO4_OT_GenerateFOMOD,
    FO4_OT_GenerateReadme,
    FO4_OT_ValidateModStructure,
    FO4_OT_ExportModManifest,
    # Mossy Link operators
    WM_OT_MossyLinkToggle,
    WM_OT_MossyCheckHttp,
    # TRI morph export
    FO4_OT_ExportTRIMorphs,
    # Navmesh validation
    FO4_OT_ValidateNavMesh,
    # Multi-piece convex collision (V-HACD-style decomposition)
    FO4_OT_GenerateMultiConvexCollision,
    # BGSM / BGEM material file export & import
    FO4_OT_ExportBGSM,
    FO4_OT_BatchExportBGSM,
    FO4_OT_ImportBGSM,
    # Glowing plant operators (BGSM/BGEM glow, emittance pulse, multi-colour)
    FO4_OT_SetupGlowingPlantMaterial,
    FO4_OT_SetupGlowingPlantBGEM,
    FO4_OT_ApplyEmittancePulse,
    FO4_OT_RemoveEmittancePulse,
    # BA2 archive extraction
    FO4_OT_ExtractBA2Asset,
)

def _make_scene_to_pref_sync(scene_attr, pref_attr):
    """Return a Blender property update callback that syncs a scene property to
    the corresponding addon preference and schedules a deferred preference save.

    This ensures that when a user types directly into a UI text field (rather
    than using a browse-button operator), the value is still persisted to disk
    and survives Blender restarts.
    """
    _MISSING = object()

    def _update(self, context):
        try:
            from . import preferences as _prefs
            prefs = _prefs.get_preferences()
            if prefs is not None and hasattr(prefs, pref_attr):
                val = getattr(self, scene_attr, _MISSING)
                if val is not _MISSING:
                    setattr(prefs, pref_attr, val)
                    _prefs.save_prefs_deferred()
        except Exception as exc:
            print(f"⚠ Could not sync scene.{scene_attr} → prefs.{pref_attr}: {exc}")
    return _update


def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            # A previous installation (e.g. blender_org/blender_game_tools) may have
            # already registered an older version of this class under the same
            # bl_idname.  Unregister the stale version and register ours so that
            # the current code is always what runs when the operator is invoked.
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
            except Exception as e2:
                print(f"⚠ Failed to register {cls.__name__}: {e2}")

    try:
        # Havok2FBX animation export settings stored per-scene
        bpy.types.Scene.fo4_havok_anim_type = bpy.props.EnumProperty(
            name="Animation Type",
            description="Type of Fallout 4 animation being exported",
            items=[
                ('CHARACTER',    "Character",     "Humanoid NPC / player character skeleton"),
                ('CREATURE',     "Creature",      "Non-humanoid creature skeleton"),
                ('OBJECT',       "Object / Prop", "Animated static prop or furniture"),
                ('WEAPON',       "Weapon",        "Third-person weapon animation"),
                ('FIRSTPERSON',  "First-Person",  "First-person arms / weapon animation"),
            ],
            default='CHARACTER',
            update=_make_scene_to_pref_sync("fo4_havok_anim_type", "havok_anim_type"),
        )
        bpy.types.Scene.fo4_havok_fps = bpy.props.IntProperty(
            name="FPS",
            description="Animation frame rate (Fallout 4 standard is 30)",
            default=30,
            min=1,
            max=120,
            update=_make_scene_to_pref_sync("fo4_havok_fps", "havok_fps"),
        )
        bpy.types.Scene.fo4_havok_loop = bpy.props.BoolProperty(
            name="Loop Animation",
            description="Mark animation as looping in the HKX output",
            default=False,
            update=_make_scene_to_pref_sync("fo4_havok_loop", "havok_loop"),
        )
        bpy.types.Scene.fo4_havok_root_motion = bpy.props.BoolProperty(
            name="Root Motion",
            description="Include root-bone motion (translation/rotation) in the export",
            default=False,
            update=_make_scene_to_pref_sync("fo4_havok_root_motion", "havok_root_motion"),
        )
        bpy.types.Scene.fo4_havok_bake_anim = bpy.props.BoolProperty(
            name="Bake Animation",
            description="Bake animation to keyframes on export (required for constraints and NLA strips to be captured)",
            default=True,
            update=_make_scene_to_pref_sync("fo4_havok_bake_anim", "havok_bake_anim"),
        )
        bpy.types.Scene.fo4_havok_key_all_bones = bpy.props.BoolProperty(
            name="Key All Bones",
            description="Insert keyframes on every bone even if they do not move",
            default=False,
            update=_make_scene_to_pref_sync("fo4_havok_key_all_bones", "havok_key_all_bones"),
        )
        bpy.types.Scene.fo4_havok_apply_transforms = bpy.props.BoolProperty(
            name="Apply Transforms",
            description="Apply object-level scale/rotation before export",
            default=True,
            update=_make_scene_to_pref_sync("fo4_havok_apply_transforms", "havok_apply_transforms"),
        )
        bpy.types.Scene.fo4_havok_scale = bpy.props.FloatProperty(
            name="Scale",
            description="Global scale correction (1.0 = no change; use 0.01 if rig is in cm)",
            default=1.0,
            min=0.001,
            max=100.0,
            precision=3,
            update=_make_scene_to_pref_sync("fo4_havok_scale", "havok_scale"),
        )
        bpy.types.Scene.fo4_havok_output_dir = bpy.props.StringProperty(
            name="Output Directory",
            description="Folder where the exported FBX (and converted HKX) will be saved. Leave blank to use the system temp folder.",
            subtype='DIR_PATH',
            default="",
            update=_make_scene_to_pref_sync("fo4_havok_output_dir", "havok_output_dir"),
        )
        bpy.types.Scene.fo4_havok_anim_name = bpy.props.StringProperty(
            name="Animation Name",
            description="Override the file/animation name. Leave blank to use the active action name.",
            default="",
            update=_make_scene_to_pref_sync("fo4_havok_anim_name", "havok_anim_name"),
        )
        bpy.types.Scene.fo4_havok_simplify_value = bpy.props.FloatProperty(
            name="Curve Simplify",
            description="Reduce keyframe count on export (0 = off, 1 = maximum simplification)",
            default=0.0,
            min=0.0,
            max=1.0,
            precision=2,
            update=_make_scene_to_pref_sync("fo4_havok_simplify_value", "havok_simplify_value"),
        )
        bpy.types.Scene.fo4_havok_force_frame_range = bpy.props.BoolProperty(
            name="Use Action Frame Range",
            description="Clamp export to the active action's frame range instead of the scene frame range",
            default=True,
            update=_make_scene_to_pref_sync("fo4_havok_force_frame_range", "havok_force_frame_range"),
        )
        bpy.types.Scene.fo4_havok_skeleton_path = bpy.props.StringProperty(
            name="Skeleton HKX",
            description=(
                "Path to the game's skeleton.hkx required by ck-cmd importanimation. "
                "Usually Data\\Meshes\\Actors\\Character\\CharacterAssets\\skeleton.hkx"
            ),
            default="",
            subtype='FILE_PATH',
            update=_make_scene_to_pref_sync("fo4_havok_skeleton_path", "ckcmd_skeleton_path"),
        )

    except Exception as _e:
        print(f"⚠ Failed to register Havok animation properties: {_e}")
    try:
        # ── Mesh optimisation settings (per-scene) ────────────────────────────────
        bpy.types.Scene.fo4_opt_apply_transforms = bpy.props.BoolProperty(
            name="Apply Transforms",
            description="Apply object transforms before mesh optimisation",
            default=True,
            update=_make_scene_to_pref_sync("fo4_opt_apply_transforms", "optimize_apply_transforms"),
        )
        bpy.types.Scene.fo4_opt_doubles = bpy.props.FloatProperty(
            name="Remove Doubles Threshold",
            description="Distance threshold for merging duplicate vertices (0 = off)",
            default=0.0001,
            min=0.0,
            max=1.0,
            precision=6,
            update=_make_scene_to_pref_sync("fo4_opt_doubles", "optimize_remove_doubles_threshold"),
        )
        bpy.types.Scene.fo4_opt_preserve_uvs = bpy.props.BoolProperty(
            name="Preserve UVs",
            description="Keep UV seams when removing doubles",
            default=True,
            update=_make_scene_to_pref_sync("fo4_opt_preserve_uvs", "optimize_preserve_uvs"),
        )

    except Exception as _e:
        print(f"⚠ Failed to register mesh optimisation properties: {_e}")
    try:
        # ── Game / tool paths stored per-scene (not in preferences) ──────────────
        bpy.types.Scene.fo4_tools_root = bpy.props.StringProperty(
            name="Tools Root",
            description="Root folder where FO4 modding CLI tools are installed",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_tools_root", "tools_root"),
        )
        bpy.types.Scene.fo4_torch_root = bpy.props.StringProperty(
            name="PyTorch Path",
            description="Custom PyTorch installation folder (leave blank for default)",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_torch_root", "torch_custom_path"),
        )
        _ngp_sync = _make_scene_to_pref_sync("fo4_instantngp_path", "instantngp_path")

        def _ngp_path_update(self, context):
            _ngp_sync(self, context)
            try:
                if instantngp_helpers:
                    instantngp_helpers.InstantNGPHelpers.clear_cache()
            except Exception:
                pass

        bpy.types.Scene.fo4_instantngp_path = bpy.props.StringProperty(
            name="InstantNGP Path",
            description="Path to InstantNGP installation",
            default="",
            subtype='DIR_PATH',
            update=_ngp_path_update,
        )
        bpy.types.Scene.fo4_havok2fbx_path = bpy.props.StringProperty(
            name="Havok2FBX Folder",
            description="Folder containing the Havok2FBX converter executable",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_havok2fbx_path", "havok2fbx_path"),
        )
        bpy.types.Scene.fo4_ckcmd_path = bpy.props.StringProperty(
            name="ck-cmd Folder",
            description="Folder containing ck-cmd.exe (aerisarn/ck-cmd — open-source FBX→HKX converter)",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_ckcmd_path", "ckcmd_path"),
        )

    except Exception as _e:
        print(f"⚠ Failed to register tool paths properties: {_e}")
    try:
        # ── Game asset paths stored per-scene (mirror of addon preferences) ───────
        bpy.types.Scene.fo4_assets_path = bpy.props.StringProperty(
            name="FO4 Data Folder",
            description=(
                "Path to your extracted Fallout 4 Data folder "
                "(e.g. D:\\FO4\\Data). Mirrors the addon preference so the panel "
                "always has an editable field even if preferences are unavailable."
            ),
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_assets_path", "fo4_assets_path"),
        )
        bpy.types.Scene.fo4_assets_mesh_path = bpy.props.StringProperty(
            name="Meshes Folder",
            description="Path to the Meshes sub-folder inside your FO4 Data folder",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_assets_mesh_path", "fo4_assets_mesh_path"),
        )
        bpy.types.Scene.fo4_assets_tex_path = bpy.props.StringProperty(
            name="Textures Folder",
            description="Path to the Textures sub-folder inside your FO4 Data folder",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_assets_tex_path", "fo4_assets_tex_path"),
        )
        bpy.types.Scene.fo4_assets_mat_path = bpy.props.StringProperty(
            name="Materials Folder",
            description="Path to the Materials sub-folder inside your FO4 Data folder",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_assets_mat_path", "fo4_assets_mat_path"),
        )
        bpy.types.Scene.fo4_unity_assets_path = bpy.props.StringProperty(
            name="Unity Assets Folder",
            description=(
                "Path to your Unity project assets or exported models folder. "
                "Mirrors the addon preference."
            ),
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_unity_assets_path", "unity_assets_path"),
        )
        bpy.types.Scene.fo4_unreal_assets_path = bpy.props.StringProperty(
            name="Unreal Assets Folder",
            description=(
                "Path to your Unreal Engine project content or exported assets folder. "
                "Mirrors the addon preference."
            ),
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_unreal_assets_path", "unreal_assets_path"),
        )

    except Exception as _e:
        print(f"⚠ Failed to register game asset paths properties: {_e}")
    try:
        # ── FO4 export version selector ───────────────────────────────────────────
        bpy.types.Scene.fo4_game_version = bpy.props.EnumProperty(
            name="Game Version",
            description="Target Fallout 4 game version (affects NIF flags and dependencies)",
            items=[
                ('FO4',   "Fallout 4 (OG)",                    "Original Fallout 4 (pre-Next-Gen patch) - NIF 20.2.0.7, bsver 130, BSTriShape, target_game=FO4"),
                ('FO4NG', "Fallout 4 Next-Gen",                 "Next-Gen / free update (May 2024 patch) - same NIF format as OG; requires updated F4SE and mods"),
                ('FO4AE', "Fallout 4 AE (Anniversary Edition)", "Anniversary Edition - same NIF 20.2.0.7 / bsver 130 / BSTriShape as OG & NG; supports ESL plugins; requires latest F4SE"),
            ],
            default='FO4',
        )

    except Exception as _e:
        print(f"⚠ Failed to register FO4 export version properties: {_e}")
    try:
        # ── Per-object Fallout 4 properties ───────────────────────────────────────
        _coll_items = (
            mesh_helpers.MeshHelpers.COLLISION_TYPES
            if mesh_helpers
            else [('DEFAULT', 'Default', 'Default'), ('NONE', 'None', 'No collision')]
        )
        bpy.types.Object.fo4_collision_type = bpy.props.EnumProperty(
            name="Collision Type",
            description="Fallout 4 collision category for this mesh",
            items=_coll_items,
            default='DEFAULT',
        )
        bpy.types.Object.fo4_mesh_type = bpy.props.EnumProperty(
            name="Mesh Type",
            description="Override how this mesh is classified for NIF export. "
                        "Controls root node, BSXFlags, shader flags, and skinning.",
            items=[
                ('AUTO',         "Auto-detect",    "Classify automatically from armature / name / material"),
                ('STATIC',       "Static",         "Non-animated world object - BSFadeNode root, BSTriShape, no skinning"),
                ('SKINNED',      "Skinned",        "Character / creature mesh - NiNode root, BSSubIndexTriShape, BSSkin::Instance"),
                ('ARMOR',        "Armor",          "Wearable armor - NiNode root, BSSubIndexTriShape, BSSkin::Instance, Skinned SF1"),
                ('ANIMATED',     "Animated",       "Animated prop - NiNode with NiKeyframeController"),
                ('LOD',          "LOD",            "Level-of-detail mesh - BSFadeNode root, reduced poly, same flags as Static"),
                ('VEGETATION',   "Vegetation",     "Tree / bush / plant - BSFadeNode root, Two_Sided SF2, Alpha Clip material"),
                ('FURNITURE',    "Furniture",      "Sit/activate furniture - NiNode root, BSXFlags Animated (1), CK markers"),
                ('WEAPON',       "Weapon",         "Held weapon - NiNode root, no vertex skinning, attach via named bone"),
                ('ARCHITECTURE', "Architecture",   "Building / wall - BSFadeNode root, BSXFlags Has-Havok (2), collision required"),
                ('FLORA',        "Flora",          "Harvestable flora - BSFadeNode root, Alpha Clip, harvest node required"),
                ('DEBRIS',       "Debris",         "Small physics debris - BSFadeNode root, BSXFlags Has-Havok (2)"),
            ],
            default='AUTO',
        )

    except Exception as _e:
        print(f"⚠ Failed to register per-object properties: {_e}")
    try:
        # ── Mossy Link scene properties ───────────────────────────────────────────
        bpy.types.Scene.fo4_mossy_port = bpy.props.IntProperty(
            name="Mossy TCP Port",
            description="TCP port Blender listens on for commands from Mossy (default 9999)",
            default=9999, min=1024, max=65535,
        )
        bpy.types.Scene.fo4_mossy_token = bpy.props.StringProperty(
            name="Mossy Auth Token",
            description="Optional auth token - must match the token set in Mossy",
            default="", subtype='PASSWORD',
        )
        bpy.types.Scene.fo4_mossy_autostart = bpy.props.BoolProperty(
            name="Auto-start on load",
            description="Start the Mossy Link TCP server automatically when Blender loads",
            default=True,
        )
        bpy.types.Scene.fo4_mossy_http_port = bpy.props.IntProperty(
            name="Mossy LLM Port",
            description="HTTP port for Mossy's Nemotron LLM (default 5000)",
            default=5000, min=1024, max=65535,
        )
        bpy.types.Scene.fo4_use_mossy_ai = bpy.props.BoolProperty(
            name="Use Mossy as AI Advisor",
            description="Route advisor AI queries through Mossy's local LLM instead of a remote endpoint",
            default=False,
        )

    except Exception as _e:
        print(f"⚠ Failed to register Mossy Link scene properties: {_e}")
    try:
        # ── Mossy Link WindowManager properties (live status) ─────────────────────
        bpy.types.WindowManager.mossy_link_active = bpy.props.BoolProperty(
            name="Mossy Link Active",
            description="True when the Mossy Link TCP server is running inside Blender",
            default=False,
        )
        bpy.types.WindowManager.mossy_bridge_status = bpy.props.StringProperty(
            name="Mossy Bridge Status",
            description="Last result of the Mossy Bridge health check",
            default="",
        )
        bpy.types.WindowManager.mossy_llm_status = bpy.props.StringProperty(
            name="Mossy LLM Status",
            description="Last result of the Mossy Nemotron LLM health check",
            default="",
        )

    except Exception as _e:
        print(f"⚠ Failed to register Mossy Link WindowManager properties: {_e}")
    try:
        # ── Image-to-3D mesh quality settings ────────────────────────────────────
        # These settings are shown in the Image to Mesh panel and read by all
        # AI generation operators so users can tune output quality before generating.
        bpy.types.Scene.fo4_imageto3d_quality = bpy.props.EnumProperty(
            name="Generation Quality",
            description="Trade-off between speed and mesh detail for AI generation",
            items=[
                ('DRAFT',    "Draft  (fastest)",   "Lowest resolution - use for quick previews"),
                ('BALANCED', "Balanced",            "Good quality / reasonable time - recommended starting point"),
                ('HIGH',     "High  (slower)",      "Best detail - use when the mesh looks too blobby"),
            ],
            default='BALANCED',
        )
        bpy.types.Scene.fo4_imageto3d_target_poly = bpy.props.IntProperty(
            name="FO4 Target Poly Count",
            description=(
                "Target triangle count after decimation.  "
                "Fallout 4 hard limit is 65,535; "
                "practical LOD0 budget is 10,000–20,000 for most props"
            ),
            default=16000,
            min=500,
            max=65535,
            step=500,
        )
        bpy.types.Scene.fo4_imageto3d_auto_decimate = bpy.props.BoolProperty(
            name="Auto-Decimate After Generation",
            description=(
                "Automatically run Smart Decimate to 'FO4 Target Poly Count' "
                "after each AI generation completes"
            ),
            default=True,
        )
        bpy.types.Scene.fo4_triposr_mc_resolution = bpy.props.IntProperty(
            name="Marching-Cubes Resolution",
            description=(
                "Grid resolution used by TripoSR's marching-cubes step. "
                "Lower = fewer polygons (try 128 or 64 for FO4); "
                "higher = more detail but extreme poly count (256+ often unusable for FO4)"
            ),
            default=128,
            min=32,
            max=512,
            step=32,
        )

    except Exception as _e:
        print(f"⚠ Failed to register Image-to-3D quality settings: {_e}")

    try:
        # ── Advisor / LLM / tool-path / UI-toggle scene properties ───────────
        # Fallback scene properties for the Settings panel when addon
        # preferences are unavailable.  Each mirrors a FO4AddonPreferences
        # attribute; the update= callback keeps them in sync so changes made
        # via the panel are persisted to preferences and survive Blender
        # restarts.  restore_scene_props_from_prefs() in preferences.py
        # copies these back from prefs on every load_post / startup.
        bpy.types.Scene.fo4_llm_enabled = bpy.props.BoolProperty(
            name="Enable LLM Advisor",
            description="Enable the AI LLM advisor feature",
            default=False,
            update=_make_scene_to_pref_sync("fo4_llm_enabled", "llm_enabled"),
        )
        bpy.types.Scene.fo4_advisor_monitor = bpy.props.BoolProperty(
            name="Enable Advisor Auto-Monitor",
            description="Run the advisor analysis automatically in the background",
            default=False,
            update=_make_scene_to_pref_sync(
                "fo4_advisor_monitor", "advisor_auto_monitor_enabled"
            ),
        )
        bpy.types.Scene.fo4_advisor_interval = bpy.props.IntProperty(
            name="Advisor Interval (seconds)",
            description="How often the background advisor check runs",
            default=300, min=10, max=3600,
            update=_make_scene_to_pref_sync(
                "fo4_advisor_interval", "advisor_auto_monitor_interval"
            ),
        )
        bpy.types.Scene.fo4_kb_enabled = bpy.props.BoolProperty(
            name="Use Knowledge Base",
            description="Include the bundled or custom knowledge base in advisor queries",
            default=True,
            update=_make_scene_to_pref_sync("fo4_kb_enabled", "knowledge_base_enabled"),
        )
        bpy.types.Scene.fo4_kb_path = bpy.props.StringProperty(
            name="Custom KB Folder",
            description="Path to a folder of .txt / .md files used as advisor knowledge",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_kb_path", "knowledge_base_path"),
        )
        bpy.types.Scene.fo4_ffmpeg_path = bpy.props.StringProperty(
            name="FFmpeg Path",
            description="Path to the ffmpeg executable or its containing folder",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_ffmpeg_path", "ffmpeg_path"),
        )
        bpy.types.Scene.fo4_nvtt_path = bpy.props.StringProperty(
            name="nvcompress / NVTT Path",
            description="Path to nvcompress executable or its containing folder",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_nvtt_path", "nvtt_path"),
        )
        bpy.types.Scene.fo4_texconv_path = bpy.props.StringProperty(
            name="texconv Path",
            description="Path to the Microsoft texconv executable or its folder",
            default="",
            subtype='DIR_PATH',
            update=_make_scene_to_pref_sync("fo4_texconv_path", "texconv_path"),
        )
        bpy.types.Scene.fo4_auto_install_tools = bpy.props.BoolProperty(
            name="Auto-install Missing CLI Tools",
            description="Automatically download missing CLI tools at startup",
            default=False,
            update=_make_scene_to_pref_sync("fo4_auto_install_tools", "auto_install_tools"),
        )
        bpy.types.Scene.fo4_auto_install_python = bpy.props.BoolProperty(
            name="Auto-install Python Packages",
            description="Automatically install required Python packages at startup",
            default=False,
            update=_make_scene_to_pref_sync("fo4_auto_install_python", "auto_install_python"),
        )
        bpy.types.Scene.fo4_auto_register_tools = bpy.props.BoolProperty(
            name="Auto-register Third-party Add-ons",
            description="Automatically register third-party add-ons found in the tools folder",
            default=False,
            update=_make_scene_to_pref_sync("fo4_auto_register_tools", "auto_register_tools"),
        )
        bpy.types.Scene.fo4_mesh_panel_unified = bpy.props.BoolProperty(
            name="Unified Mesh Panel",
            description="Show all mesh helpers in one combined panel",
            default=True,
            update=_make_scene_to_pref_sync("fo4_mesh_panel_unified", "mesh_panel_unified"),
        )
    except Exception as _e:
        print(f"⚠ Failed to register advisor/LLM/tool-path/UI properties: {_e}")


def unregister():
    for cls in reversed(classes):
        if not hasattr(bpy.types, cls.__name__):
            continue
        try:
            bpy.utils.unregister_class(cls)
        except Exception as e:
            print(f"⚠ Failed to unregister {cls.__name__}: {e}")

    # Remove Havok2FBX scene properties
    for prop in (
        "fo4_havok_anim_type",
        "fo4_havok_fps",
        "fo4_havok_loop",
        "fo4_havok_root_motion",
        "fo4_havok_bake_anim",
        "fo4_havok_key_all_bones",
        "fo4_havok_apply_transforms",
        "fo4_havok_scale",
        "fo4_havok_output_dir",
        "fo4_havok_anim_name",
        "fo4_havok_simplify_value",
        "fo4_havok_force_frame_range",
        # Mesh optimisation
        "fo4_opt_apply_transforms",
        "fo4_opt_doubles",
        "fo4_opt_preserve_uvs",
        # Tool / game paths
        "fo4_tools_root",
        "fo4_torch_root",
        "fo4_instantngp_path",
        "fo4_havok2fbx_path",
        "fo4_ckcmd_path",
        "fo4_havok_skeleton_path",
        "fo4_game_version",
        # Asset folder paths (per-scene mirrors of addon preferences)
        "fo4_assets_path",
        "fo4_assets_mesh_path",
        "fo4_assets_tex_path",
        "fo4_assets_mat_path",
        "fo4_unity_assets_path",
        "fo4_unreal_assets_path",
        # Mossy Link
        "fo4_mossy_port",
        "fo4_mossy_token",
        "fo4_mossy_autostart",
        "fo4_mossy_http_port",
        "fo4_use_mossy_ai",
        # Image-to-3D quality
        "fo4_imageto3d_quality",
        "fo4_imageto3d_target_poly",
        "fo4_imageto3d_auto_decimate",
        "fo4_triposr_mc_resolution",
        # Advisor / LLM / tool-path / UI-toggle scene mirrors
        "fo4_llm_enabled",
        "fo4_advisor_monitor",
        "fo4_advisor_interval",
        "fo4_kb_enabled",
        "fo4_kb_path",
        "fo4_ffmpeg_path",
        "fo4_nvtt_path",
        "fo4_texconv_path",
        "fo4_auto_install_tools",
        "fo4_auto_install_python",
        "fo4_auto_register_tools",
        "fo4_mesh_panel_unified",
    ):
        if hasattr(bpy.types.Scene, prop):
            try:
                delattr(bpy.types.Scene, prop)
            except Exception:
                pass
    for prop in ("fo4_collision_type", "fo4_mesh_type"):
        if hasattr(bpy.types.Object, prop):
            try:
                delattr(bpy.types.Object, prop)
            except Exception:
                pass
    for prop in ("mossy_link_active", "mossy_bridge_status", "mossy_llm_status"):
        if hasattr(bpy.types.WindowManager, prop):
            try:
                delattr(bpy.types.WindowManager, prop)
            except Exception:
                pass
