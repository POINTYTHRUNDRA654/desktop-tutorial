"""
Core tutorial and welcome operators for the Fallout 4 Mod Assistant.

These operators are registered as a standalone module *before* the main
operators.py bundle so they are always available in the UI even if the
larger operators.py fails to import on a particular Blender build.

The four operators defined here are referenced unconditionally in
FO4_PT_MainPanel (ui_panels.py lines 234, 239, 242, 243); keeping them
in a separate, minimal module prevents the "rna_uiItemO: unknown operator"
console spam that appears when operators.py fails to load.
"""

import bpy
import importlib
import sys
from bpy.types import Operator
from bpy.props import EnumProperty


def _safe_import(name):
    """Import a submodule safely; returns None on failure."""
    try:
        return importlib.import_module(f".{name}", package=__package__)
    except Exception as exc:
        sys.modules.pop(f"{__package__}.{name}", None)
        print(f"tutorial_operators: Skipped {name}: {exc}")
        return None


# Lazy module references – resolved once on first use so that a missing
# tutorial_system or notification_system does not prevent registration.
_tutorial_system = None
_notification_system = None


def _get_tutorial_system():
    global _tutorial_system
    if _tutorial_system is None:
        _tutorial_system = _safe_import("tutorial_system")
    return _tutorial_system


def _get_notification_system():
    global _notification_system
    if _notification_system is None:
        _notification_system = _safe_import("notification_system")
    return _notification_system


# ---------------------------------------------------------------------------
# FO4_OT_ShowDetailedSetup
# ---------------------------------------------------------------------------

class FO4_OT_ShowDetailedSetup(Operator):
    """Show detailed setup guide for first-time users"""
    bl_idname = "fo4.show_detailed_setup"
    bl_label = "Detailed Setup Guide"
    bl_options = {'REGISTER'}

    def execute(self, context):
        print("\n" + "=" * 60)
        print("FALLOUT 4 ADD-ON - COMPLETE SETUP GUIDE")
        print("=" * 60)
        print("")
        print("STEP 1: CONNECT MOSSY AI (RECOMMENDED FIRST!)")
        print("  Why first? Mossy can guide you through the entire setup process!")
        print("  1. Download & launch Mossy desktop app")
        print("  2. Switch to 'Mossy' tab in Blender sidebar (press N)")
        print("  3. Click 'Start Server' in Mossy Link panel")
        print("  4. Mossy will auto-connect and help with remaining setup")
        print("  5. Go to Fallout 4 -> Advisor tab to ask Mossy questions")
        print("")
        print("STEP 2: INSTALL PYTHON DEPENDENCIES")
        print("  1. Open 'Setup & Status' tab below main panel")
        print("  2. Check for any red X marks next to packages")
        print("  3. Click 'Install Core Dependencies' if prompted")
        print("  4. Wait for installation to complete (check console)")
        print("  5. Click 'Restart Blender' button when done")
        print("")
        print("STEP 3: INSTALL NIFTOOLS")
        bv = bpy.app.version
        if bv >= (5, 0, 0):
            print("  For Blender 5.0+:")
            print("  1. In Setup tab, click 'Install Niftools Add-on'")
            print("  2. Edit -> Preferences -> Add-ons")
            print("  3. Enable 'Allow Legacy Add-ons' checkbox")
            print("  4. Enable 'NetImmerse/Gamebryo' add-on")
            print("  5. Restart Blender")
        else:
            print("  For Blender 3.6 LTS:")
            print("  1. Download Niftools v0.1.1 for Blender 3.6")
            print("  2. Edit -> Preferences -> Add-ons -> Install")
            print("  3. Select the .zip file and enable the add-on")
            print("  Alternative: Use FBX export + Cathedral Assets Optimizer")
        print("")
        print("STEP 4: VERIFY SETUP")
        print("  1. Open 'Setup & Status' tab")
        print("  2. Click 'Environment Check' button")
        print("  3. All items should show green checkmarks")
        print("  4. If anything fails, ask Mossy for help!")
        print("")
        print("STEP 5: START CREATING!")
        print("  1. Try the Tutorial System in main panel")
        print("  2. Explore Mesh Helpers for asset creation")
        print("  3. Use AI features like ZoeDepth, TripoSR")
        print("  4. Export to .nif and test in Creation Kit")
        print("")
        print("NEED HELP?")
        print("  -> Ask Mossy! (Fallout 4 -> Advisor -> Ask Mossy)")
        print("  -> Check tutorials (Main panel -> Start Tutorial)")
        print("  -> Read README.md in add-on directory")
        print("")
        print("=" * 60 + "\n")

        try:
            ns = _get_notification_system()
            if ns:
                ns.FO4_NotificationSystem.notify(
                    "Detailed setup guide displayed in system console "
                    "(Window -> Toggle System Console)",
                    'INFO'
                )
        except Exception:
            pass
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# FO4_OT_StartTutorial
# ---------------------------------------------------------------------------

class FO4_OT_StartTutorial(Operator):
    """Start a tutorial"""
    bl_idname = "fo4.start_tutorial"
    bl_label = "Start Tutorial"
    bl_options = {'REGISTER'}

    tutorial_type: EnumProperty(
        name="Tutorial",
        items=[
            ('basic_mesh',     "Basic Mesh",         "Learn to create basic meshes"),
            ('textures',       "Textures",            "Learn to setup textures"),
            ('animation',      "Animation",           "Learn to create animations"),
            ('weapon',         "Weapon Creation",     "Complete weapon creation workflow"),
            ('armor',          "Armor Creation",      "Complete armor creation workflow"),
            ('batch_workflow', "Batch Processing",    "Process multiple objects efficiently"),
            ('troubleshooting',"Troubleshooting",     "Diagnose and fix common issues"),
            ('vegetation',     "Vegetation & Landscaping",
             "Create optimized vegetation for FO4"),
        ]
    )

    def execute(self, context):
        ts = _get_tutorial_system()
        if not ts:
            self.report({'WARNING'}, "Tutorial system not available")
            return {'CANCELLED'}
        try:
            if not ts.TUTORIALS:
                ts.initialize_tutorials()
            context.scene.fo4_current_tutorial = self.tutorial_type
            context.scene.fo4_tutorial_step = 0
            tutorial = ts.get_current_tutorial(context)
            if tutorial:
                step = tutorial.get_current_step()
                self.report({'INFO'}, f"Tutorial started: {tutorial.name}")
                if step:
                    self.report({'INFO'}, f"Step 1: {step.title}")
        except Exception as e:
            self.report({'ERROR'}, f"Could not start tutorial: {e}")
            return {'CANCELLED'}
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


# ---------------------------------------------------------------------------
# FO4_OT_ShowHelp
# ---------------------------------------------------------------------------

class FO4_OT_ShowHelp(Operator):
    """Show help information"""
    bl_idname = "fo4.show_help"
    bl_label = "Show Help"
    bl_options = {'REGISTER'}

    def execute(self, context):
        ts = _get_tutorial_system()
        try:
            if ts and not ts.TUTORIALS:
                ts.initialize_tutorials()
        except Exception:
            pass

        print("\n" + "=" * 70)
        print("FALLOUT 4 ADD-ON - HELP & TUTORIALS")
        print("=" * 70)
        print("How to use the tutorial system:")
        print(" 1) Click 'Start Tutorial' and pick a workflow.")
        print(" 2) Follow the step description shown in the sidebar.")
        print(" 3) Use the arrow buttons to move between steps.")
        print(" 4) Run 'Show Detailed Setup Guide' if you are new.")
        print("")

        try:
            if ts:
                active = ts.get_current_tutorial(context)
                if active:
                    step = active.get_current_step()
                    print(f"Active tutorial: {active.name}")
                    print(
                        f"Step {active.current_step + 1}/{len(active.steps)}: "
                        f"{step.title}"
                    )
                    if step and step.description:
                        for line in step.description.splitlines():
                            print(f"  - {line}")
                else:
                    print("No active tutorial. Click 'Start Tutorial' to begin.")

                if getattr(ts, "TUTORIALS", None):
                    print("")
                    print("Available tutorials:")
                    for tut in ts.TUTORIALS.values():
                        print(
                            f" - {tut.name}: {tut.description} "
                            f"({len(tut.steps)} steps)"
                        )
        except Exception as e:
            print(f"Could not retrieve tutorial info: {e}")

        print("")
        print("More resources: README.md, TUTORIALS.md, HELP_SYSTEM.md")
        print("=" * 70 + "\n")

        msg = "Help printed to the system console (Window -> Toggle System Console)"
        self.report({'INFO'}, msg)
        try:
            ns = _get_notification_system()
            if ns:
                ns.FO4_NotificationSystem.notify(msg, 'INFO')
        except Exception:
            pass
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# FO4_OT_ShowCredits
# ---------------------------------------------------------------------------

class FO4_OT_ShowCredits(Operator):
    """Show credits for all third-party tools used by this add-on"""
    bl_idname = "fo4.show_credits"
    bl_label = "Credits"
    bl_options = {'REGISTER'}

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_popup(self, width=480)

    def draw(self, context):
        layout = self.layout

        title_row = layout.row()
        title_row.label(text="Third-Party Tools & Credits", icon='FUND')
        layout.separator()

        def _section(icon, heading, lines):
            box = layout.box()
            box.label(text=heading, icon=icon)
            col = box.column(align=True)
            col.scale_y = 0.85
            for line in lines:
                col.label(text=line)

        _section('BLENDER', "Blender (3D platform)", [
            "Blender Foundation — https://www.blender.org",
            "GNU GPL v2+ license",
        ])
        _section('PLUGIN', "Niftools Blender Plugin (NIF export)", [
            "NifTools Team — https://github.com/niftools/blender_nif_plugin",
            "Enables direct .nif export for Fallout 4 / Skyrim (Blender 3.6 LTS)",
        ])
        _section('STAR', "PyNifly v25 PRIMARY NIF EXPORTER", [
            "BadDog (BadDogSkyrim) — https://github.com/BadDogSkyrim/PyNifly",
            "The recommended NIF exporter for Blender 4.x and 5.x.",
            "Supports Fallout 4, Skyrim SE, and Starfield.",
        ])
        _section('IMPORT', "UModel / UE Viewer (Unreal asset extraction)", [
            "Konstantin Nosov (Gildor) — https://www.gildor.org/en/projects/umodel",
            "Extracts meshes, textures, and animations from UE games",
        ])
        _section('IMAGE_DATA', "NVIDIA Texture Tools (NVTT / nvcompress)", [
            "NVIDIA Corporation — https://github.com/castano/nvidia-texture-tools",
            "GPU-accelerated DDS texture compression",
        ])
        _section('IMAGE_DATA', "texconv (DirectXTex)", [
            "Microsoft — https://github.com/microsoft/DirectXTex",
            "Windows DDS / BC1-BC7 texture conversion",
        ])
        _section('MESH_DATA', "TripoSR (image-to-3D)", [
            "VAST AI Research — https://github.com/VAST-AI-Research/TripoSR",
            "Single-image 3D mesh reconstruction",
        ])
        _section('MESH_DATA', "Shap-E & Point-E (AI 3D generation)", [
            "OpenAI — https://github.com/openai/shap-e",
            "Text and image conditioned 3D shape generation",
        ])
        _section('MESH_DATA', "Hunyuan3D-2 (text / image-to-3D)", [
            "Tencent — https://github.com/Tencent-Hunyuan/Hunyuan3D-2",
            "High-quality text and image conditioned 3D generation",
        ])
        _section('ARMATURE_DATA', "RigNet (auto-rigging)", [
            "Zhan Xu et al. — https://github.com/zhan-xu/RigNet",
            "Automatic skeleton prediction for 3D meshes",
        ])
        _section('TOOL_SETTINGS', "NifSkope (NIF file editor)", [
            "NifTools Team — https://github.com/niftools/nifskope",
            "View, edit, and inspect Bethesda .nif files.",
        ])
        _section('TOOL_SETTINGS', "FO4Edit / xEdit (plugin & record editor)", [
            "Zilav et al. — https://github.com/TES5Edit/TES5Edit",
            "Edit Fallout 4 plugins (.esp/.esm/.esl) and import animations.",
        ])
        _section('PACKAGE', "FOMOD Creation Tool (mod installer builder)", [
            "Wenderer — https://www.nexusmods.com/fallout4/mods/6821",
            "GUI for creating FOMOD installers.",
        ])
        _section('IMAGE_DATA', "Cathedral Assets Optimizer (asset optimization)", [
            "Arthmoor / G_k — https://www.nexusmods.com/skyrimspecialedition/mods/23316",
            "Optimizes textures, meshes, and BSA/BA2 archives for FO4.",
        ])


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

classes = (
    FO4_OT_ShowDetailedSetup,
    FO4_OT_StartTutorial,
    FO4_OT_ShowHelp,
    FO4_OT_ShowCredits,
)


def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
            print(f"tutorial_operators: Registered {cls.bl_idname}")
        except Exception as e:
            print(f"tutorial_operators: Could not register {cls.__name__}: {e}")


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception as e:
            print(f"tutorial_operators: Could not unregister {cls.__name__}: {e}")
