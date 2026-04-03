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
from bpy.props import EnumProperty, IntProperty


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
# FO4_OT_ShowDetailedSetup  (paged popup wizard)
# ---------------------------------------------------------------------------

# One entry per setup step shown in the popup.
# Each tuple: (icon, heading, [lines])
_SETUP_STEPS = [
    ('LIGHT_HEMI', "Step 1 – Connect Mossy AI (Recommended First!)", [
        "Why first? Mossy can guide you through the entire setup process!",
        "",
        "1. Download & launch the Mossy desktop app.",
        "2. Press N in the 3D Viewport to open the sidebar.",
        "3. Switch to the 'Mossy' tab and click 'Start Server'.",
        "4. Mossy will auto-connect and help with the remaining steps.",
        "5. Go to Fallout 4 → Advisor tab to ask Mossy questions.",
    ]),
    ('PACKAGE', "Step 2 – Install Python Dependencies", [
        "1. Open the 'Setup & Status' tab below the main panel.",
        "2. Check for any red ✗ marks next to packages.",
        "3. Click 'Install Core Dependencies' if prompted.",
        "4. Wait for installation to finish (watch the system console).",
        "5. Click the 'Restart Blender' button when done.",
    ]),
    ('PLUGIN', "Step 3 – Install Niftools", [
        "For Blender 5.0+:",
        "  1. In the Setup tab, click 'Install Niftools Add-on'.",
        "  2. Open Edit → Preferences → Add-ons.",
        "  3. Enable the 'Allow Legacy Add-ons' checkbox.",
        "  4. Enable the 'NetImmerse/Gamebryo' add-on.",
        "  5. Restart Blender.",
        "",
        "For Blender 3.6 LTS:",
        "  1. Download Niftools v0.1.1 for Blender 3.6.",
        "  2. Edit → Preferences → Add-ons → Install → select .zip.",
        "  Alternative: Use the FBX export + Cathedral Assets Optimizer.",
    ]),
    ('CHECKMARK', "Step 4 – Verify Your Setup", [
        "1. Open the 'Setup & Status' tab.",
        "2. Click the 'Environment Check' button.",
        "3. All items should show green checkmarks.",
        "4. If anything fails, ask Mossy for help!",
    ]),
    ('PLAY', "Step 5 – Start Creating!", [
        "1. Try the Tutorial System in the main panel.",
        "2. Explore Mesh Helpers for quick asset creation.",
        "3. Use AI features: ZoeDepth, TripoSR, Hunyuan3D-2, …",
        "4. Export to .nif and test in the Creation Kit.",
        "",
        "Need help?",
        "  → Ask Mossy (Fallout 4 → Advisor → Ask Mossy)",
        "  → Start a Tutorial (Main panel → Start Tutorial)",
        "  → Read README.md in the add-on directory",
    ]),
]


class FO4_OT_ShowDetailedSetup(Operator):
    """Show the step-by-step setup guide for first-time users"""
    bl_idname = "fo4.show_detailed_setup"
    bl_label = "Detailed Setup Guide"
    bl_options = {'INTERNAL'}

    page: IntProperty(name="Page", default=0, min=0)

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        # Also print the full guide to the system console as a bonus.
        if self.page == 0:
            self._print_to_console()
        return context.window_manager.invoke_popup(self, width=480)

    def draw(self, context):
        layout = self.layout
        num_pages = len(_SETUP_STEPS)
        page = max(0, min(self.page, num_pages - 1))

        title_row = layout.row()
        title_row.label(text="Fallout 4 Add-on – Setup Guide", icon='TEXT')
        layout.separator()

        icon, heading, lines = _SETUP_STEPS[page]
        box = layout.box()
        box.label(text=heading, icon=icon)
        col = box.column(align=True)
        col.scale_y = 0.85
        for line in lines:
            col.label(text=line)

        layout.separator()

        nav_row = layout.row(align=True)
        if page > 0:
            prev_op = nav_row.operator("fo4.show_detailed_setup", text="< Prev", icon='TRIA_LEFT')
            prev_op.page = page - 1
        else:
            nav_row.label(text="")
        nav_row.label(text=f"Step {page + 1} / {num_pages}")
        if page < num_pages - 1:
            next_op = nav_row.operator("fo4.show_detailed_setup", text="Next >", icon='TRIA_RIGHT')
            next_op.page = page + 1
        else:
            nav_row.label(text="")

    @staticmethod
    def _print_to_console():
        bv = bpy.app.version
        print("\n" + "=" * 60)
        print("FALLOUT 4 ADD-ON - COMPLETE SETUP GUIDE")
        print("=" * 60)
        for _icon, heading, lines in _SETUP_STEPS:
            print("")
            print(heading.upper())
            for line in lines:
                if line:
                    print(f"  {line}")
        if bv >= (5, 0, 0):
            print("")
            print("  (Blender 5.0+ detected – use 'Install Niftools Add-on')")
        print("")
        print("=" * 60 + "\n")


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

_CREDITS_SECTIONS = [
    # Page 0 – Core tools
    ('BLENDER', "Blender (3D platform)", [
        "Blender Foundation - https://www.blender.org",
        "GNU GPL v2+ license",
    ]),
    ('PLUGIN', "Niftools Blender Plugin (NIF export)", [
        "NifTools Team - https://github.com/niftools/blender_nif_plugin",
        "Enables direct .nif export for Fallout 4 / Skyrim (Blender 3.6 LTS)",
    ]),
    ('FUND', "PyNifly  \u2605  PRIMARY NIF EXPORTER", [
        "BadDog (BadDogSkyrim) - https://github.com/BadDogSkyrim/PyNifly",
        "The recommended NIF exporter for Blender 4.x and 5.x.",
        "Supports Fallout 4, Skyrim SE, and Starfield with full",
        "body-morph and material path support.",
        "Huge thanks to BadDog for maintaining this essential tool!",
    ]),
    ('IMPORT', "UModel / UE Viewer (Unreal asset extraction)", [
        "Konstantin Nosov (Gildor) - https://www.gildor.org/en/projects/umodel",
        "Extracts meshes, textures, and animations from UE games",
    ]),
    ('IMAGE_DATA', "NVIDIA Texture Tools (NVTT / nvcompress)", [
        "NVIDIA Corporation - https://github.com/castano/nvidia-texture-tools",
        "GPU-accelerated DDS texture compression",
    ]),
    ('IMAGE_DATA', "texconv (DirectXTex)", [
        "Microsoft - https://github.com/microsoft/DirectXTex",
        "Windows DDS / BC1-BC7 texture conversion",
    ]),
    ('LIGHT_HEMI', "PyTorch (AI / ML runtime)", [
        "Meta AI (PyTorch team) - https://pytorch.org",
        "Deep-learning framework powering all AI features",
    ]),
    ('RENDER_RESULT', "Real-ESRGAN (AI texture upscaling)", [
        "Xintao Wang et al. - https://github.com/xinntao/Real-ESRGAN",
        "Upscales and enhances textures using GAN models",
    ]),
    # Page 1 – 3-D generation
    ('MESH_DATA', "TripoSR (image-to-3D)", [
        "VAST AI Research - https://github.com/VAST-AI-Research/TripoSR",
        "Single-image 3D mesh reconstruction",
    ]),
    ('MESH_DATA', "Shap-E (text / image-to-3D)", [
        "OpenAI - https://github.com/openai/shap-e",
        "Text and image conditioned 3D shape generation",
    ]),
    ('MESH_DATA', "Point-E (text-to-3D point cloud)", [
        "OpenAI - https://github.com/openai/point-e",
        "Text-guided 3D point cloud and mesh generation",
    ]),
    ('MESH_DATA', "Hunyuan3D-2 (text / image-to-3D)", [
        "Tencent - https://github.com/Tencent-Hunyuan/Hunyuan3D-2",
        "High-quality text and image conditioned 3D generation",
    ]),
    ('MESH_DATA', "GET3D (text-to-3D)", [
        "NVIDIA Research - https://github.com/nVlabs/GET3D",
        "Generative model for high-quality 3D shapes",
    ]),
    ('MESH_DATA', "Instant-NGP (neural radiance field)", [
        "NVIDIA Research - https://github.com/NVlabs/instant-ngp",
        "Real-time NeRF reconstruction from photos",
    ]),
    ('MESH_DATA', "DreamGaussian (image / text-to-3D)", [
        "dreamgaussian - https://github.com/dreamgaussian/dreamgaussian",
        "Generative Gaussian splatting for efficient 3D content creation",
    ]),
    ('IMAGE_DATA', "StyleGAN2 (AI texture / image generation)", [
        "NVIDIA Research - https://github.com/NVlabs/stylegan2",
        "GAN-based texture and image synthesis for game assets",
    ]),
    # Page 2 – Rigging & motion
    ('ARMATURE_DATA', "RigNet (auto-rigging)", [
        "Zhan Xu et al. - https://github.com/zhan-xu/RigNet",
        "Automatic skeleton prediction for 3D meshes",
    ]),
    ('ANIM_DATA', "HY-Motion-1.0 (motion generation)", [
        "Tencent Hunyuan - https://github.com/Tencent-Hunyuan/HY-Motion-1.0",
        "AI-powered human motion sequence generation",
    ]),
    ('ANIM_DATA', "MotionDiffuse (text-driven motion generation)", [
        "MotrixLab - https://github.com/MotrixLab/MotionDiffuse",
        "Text-driven human motion with diffusion models",
        "SMPL-X extension: https://github.com/ellemcfarlane/MotionDiffuse",
    ]),
    ('ARMATURE_DATA', "MediaPipe (motion tracking / pose estimation)", [
        "Google - https://github.com/google/mediapipe",
        "Real-time hand, face, and body pose tracking for motion capture",
    ]),
    ('ARMATURE_DATA', "BlendArMocap (Blender motion capture add-on)", [
        "cgtinker - https://github.com/cgtinker/BlendArMocap",
        "Blender add-on for real-time MediaPipe motion capture retargeting",
    ]),
    ('IMAGE_RGB', "ZoeDepth (depth estimation)", [
        "Intel ISL - https://github.com/isl-org/ZoeDepth",
        "Monocular depth estimation from a single image",
    ]),
    ('FILE_MOVIE', "FFmpeg (video & audio processing)", [
        "FFmpeg Team - https://ffmpeg.org",
        "GNU LGPL v2.1+ / GPL v2+ license",
    ]),
    ('ARMATURE_DATA', "Shiagur - Blender Power Armor Animation Rig v2.6.0", [
        "Shiagur - https://www.nexusmods.com/fallout4/mods/81279",
        "Blender rig + guide for Fallout 4 Power Armor animations.",
        "Includes skeleton, Havok settings, and full workflow documentation.",
    ]),
    # Page 3 – FO4 animation pipeline
    ('ARMATURE_DATA', "Shiagur - Blender Animation Rig (1st & 3rd Person) v2.6.0", [
        "Shiagur - https://www.nexusmods.com/fallout4/mods/82537",
        "Blender rig for 1st and 3rd person weapon, pose, and interaction",
        "animations. Includes IK/FK, skeletons, Havok settings, and guide.",
    ]),
    ('EXPORT', "ck-cmd  \u2605  PRIMARY FBX \u2192 HKX CONVERTER", [
        "aerisarn - https://github.com/aerisarn/ck-cmd",
        "Open-source FBX \u2192 HKX converter (no commercial SDK required).",
        "Recommended replacement for Havok2FBX in the FO4 animation pipeline.",
    ]),
    ('EXPORT', "havok2fbx (Havok \u2194 FBX fallback converter)", [
        "dfm - https://github.com/dfm/havok2fbx",
        "Converts Havok HKX/HKT files to/from FBX. Fallback when ck-cmd",
        "is unavailable. Requires Havok SDK 2014-1-0 + Autodesk FBX SDK to build.",
    ]),
    ('EXPORT', "FBXImporter (FBX \u2192 HKT conversion)", [
        "andrelo1 - https://www.nexusmods.com/fallout4/mods/59849",
        "GitHub: https://github.com/andrelo1/fbximporter",
        "Converts Blender FBX exports to Havok HKT files for FO4 pipeline.",
    ]),
    ('TOOL_SETTINGS', "hkxcmd (Havok HKX command-line tools)", [
        "figment - https://github.com/figment/hkxcmd",
        "Command-line conversion for Havok HKX / KF animation files.",
    ]),
    ('TOOL_SETTINGS', "HKXPack (HKX binary \u2194 XML converter)", [
        "dexesttp - https://dexesttp.github.io/hkxpack/",
        "Converts binary Havok HKX files to/from XML for editing.",
    ]),
    ('TOOL_SETTINGS', "NifSkope (NIF file editor)", [
        "NifTools Team - https://github.com/niftools/nifskope",
        "View, edit, and inspect Bethesda .nif files.",
    ]),
    ('TOOL_SETTINGS', "FO4Edit / xEdit (plugin & record editor)", [
        "Zilav et al. - https://github.com/TES5Edit/TES5Edit",
        "Edit Fallout 4 plugins (.esp/.esm/.esl) and import animations.",
    ]),
    # Page 4 – Modding tools & body mods
    ('PACKAGE', "FOMOD Creation Tool (mod installer builder)", [
        "Wenderer - https://www.nexusmods.com/fallout4/mods/6821",
        "GUI for creating info.xml + ModuleConfig.xml FOMOD installers.",
        "Supports conditions, flags, images, plugin detection, file priorities.",
    ]),
    ('IMAGE_DATA', "Cathedral Assets Optimizer (asset optimization)", [
        "Arthmoor / G_k - https://www.nexusmods.com/skyrimspecialedition/mods/23316",
        "Optimizes textures (DDS BC7/BC1), meshes, and BSA/BA2 archives for FO4.",
    ]),
    ('TOOL_SETTINGS', "Collective Modding Toolkit (mod setup verification)", [
        "wxMichael - https://www.nexusmods.com/fallout4/mods/87441",
        "GitHub: https://github.com/wxMichael/Collective-Modding-Toolkit",
        "Upgrades/downgrades FO4 OG \u2194 NG \u00b7 patches BA2 v1/v8 \u00b7 scans F4SE DLLs",
        "Counts plugins (Full/Light) and BA2s \u00b7 scans for mod conflicts",
    ]),
    ('ANIM', "Story Action Poses  (1,700+ poses for storytelling/screenshots)", [
        "EngineGaming - https://www.nexusmods.com/fallout4/mods/58448",
        "ESL-flagged. Covers standard characters, power armor, and creatures.",
        "Requires: F4SE, AAF (Advanced Animation Framework), Poser Hotkeys.",
        "NEXT-GEN v4.0: https://nexusmods.com/fallout4/mods/68000",
    ]),
    ('ANIM', "AAF - Advanced Animation Framework (pose/animation manager)", [
        "dagobaking - https://www.nexusmods.com/fallout4/mods/31304",
        "Required by Story Action Poses and most pose packs. Needs F4SE.",
    ]),
    ('ANIM', "Poser Hotkeys (in-game pose trigger via hotkeys)", [
        "opparco - https://www.nexusmods.com/fallout4/mods/45967",
        "Arrow keys cycle poses. Compatible with Story Action Poses.",
    ]),
    ('MODIFIER', "BodySlide and Outfit Studio (body/armor conforming)", [
        "ousnius / Caliente - https://www.nexusmods.com/fallout4/mods/25",
        "GitHub: https://github.com/ousnius/BodySlide-and-Outfit-Studio",
        "Conforms armor meshes to CBBE body, creates morph sliders for users.",
    ]),
    ('MESH_DATA', "CBBE - Caliente's Beautiful Bodies Enhancer (body mesh)", [
        "Caliente - https://www.nexusmods.com/fallout4/mods/15",
        "Standard body reference mesh for armor/clothing creation in FO4.",
    ]),
    # Page 5 – Unity / UE tools & Python libs
    ('INFO', "Creating Armor & Clothing with Blender (Nexus 17785)", [
        "Vugluscris - https://www.nexusmods.com/fallout4/mods/17785",
        "Complete free-tools workflow: Blender + Outfit Studio + CBBE.",
        "Includes skeleton fo4.blend, FBX import/export settings,",
        "UV seam edge-split fix, weight transfer, and NIF export steps.",
    ]),
    ('IMPORT', "AssetRipper (Unity asset extraction)", [
        "AssetRipper Team - https://github.com/AssetRipper/AssetRipper",
        "Extracts assets (meshes, textures, audio) from Unity .assets files",
        "and AssetBundle files for use in modding pipelines.",
    ]),
    ('IMPORT', "AssetStudio (Unity asset viewer & extractor)", [
        "Perfare - https://github.com/Perfare/AssetStudio",
        "GUI tool for browsing and exporting Unity game assets",
    ]),
    ('PLUGIN', "umodel_tools (UModel Blender integration)", [
        "skarndev - https://github.com/skarndev/umodel_tools",
        "Blender add-on companion for UModel; imports UE assets directly",
        "into Blender scenes. Must be installed as a separate add-on",
    ]),
    ('PLUGIN', "TexTools for Blender (UV & texture tools)", [
        "SavMartin - https://github.com/SavMartin/TexTools-Blender",
        "Comprehensive UV mapping and texture baking tools for Blender",
    ]),
    ('PLUGIN', "UnityFBX-To-Blender-Importer", [
        "Varneon - https://github.com/Varneon/UnityFBX-To-Blender-Importer",
        "Imports Unity-exported FBX files into Blender with correct settings",
    ]),
    ('PLUGIN', "Blender-UE4-Importer", [
        "Waffle1434 - https://github.com/Waffle1434/Blender-UE4-Importer",
        "Imports Unreal Engine 4 assets (meshes, materials) into Blender",
    ]),
    ('FUND', "ComfyUI-BlenderAI-node  \u2605  RECOMMENDED AI WORKFLOW", [
        "AIGODLIKE - https://github.com/AIGODLIKE/ComfyUI-BlenderAI-node",
        "Integrates ComfyUI AI nodes directly into the Blender interface.",
        "Enables Stable Diffusion, ControlNet, and other AI workflows in Blender.",
    ]),
    ('ANIM_DATA', "ComfyUI-MotionDiff (motion diffusion in ComfyUI)", [
        "Fannovel16 - https://github.com/Fannovel16/ComfyUI-MotionDiff",
        "ComfyUI nodes for MDM, MotionGPT, MotionDiffuse, and related models.",
    ]),
    ('ANIM_DATA', "comfyui_controlnet_aux (ControlNet preprocessors)", [
        "Fannovel16 - https://github.com/Fannovel16/comfyui_controlnet_aux",
        "ControlNet auxiliary preprocessors (pose, depth, canny, etc.)",
        "for ComfyUI image generation pipelines.",
    ]),
    ('MESH_DATA', "libigl (geometry processing library)", [
        "libigl Team - https://github.com/libigl/libigl",
        "C++ library for geometry processing algorithms",
        "Python bindings: https://github.com/libigl/libigl-python-bindings",
    ]),
    ('MESH_DATA', "BBW (Bounded Biharmonic Weights for skinning)", [
        "azer89 - https://github.com/azer89/BBW",
        "shanmukhabharat - https://github.com/shanmukhabharat/BBW",
        "Automatic skin weight computation based on bounded biharmonic weights",
    ]),
    ('SCRIPT', "trimesh (Python 3D mesh library)", [
        "mikedh - https://github.com/mikedh/trimesh",
        "Pure Python library for loading, processing, and analyzing 3D meshes",
    ]),
    ('SCRIPT', "pypdf (Python PDF library)", [
        "py-pdf Team - https://github.com/py-pdf/pypdf",
        "Pure Python library for reading, writing, and merging PDF files",
    ]),
]

_CREDITS_PAGE_SIZE = 8


class FO4_OT_ShowCredits(Operator):
    """Show credits for all third-party tools used by this add-on"""
    bl_idname = "fo4.show_credits"
    bl_label = "Credits"
    bl_options = {'INTERNAL'}

    page: IntProperty(name="Page", default=0, min=0)

    def execute(self, context):
        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_popup(self, width=480)

    def draw(self, context):
        layout = self.layout

        total = len(_CREDITS_SECTIONS)
        num_pages = max(1, (total + _CREDITS_PAGE_SIZE - 1) // _CREDITS_PAGE_SIZE)
        page = max(0, min(self.page, num_pages - 1))

        # ── Title ──────────────────────────────────────────────────────────
        title_row = layout.row()
        title_row.label(text="Third-Party Tools & Credits", icon='FUND')
        layout.separator()

        # ── Navigation at TOP so buttons are always visible ────────────────
        nav_row = layout.row(align=True)
        if page > 0:
            prev_op = nav_row.operator("fo4.show_credits", text="< Prev", icon='TRIA_LEFT')
            prev_op.page = page - 1
        else:
            nav_row.label(text="")
        nav_row.label(text=f"Page {page + 1} / {num_pages}  ({total} tools total)")
        if page < num_pages - 1:
            next_op = nav_row.operator("fo4.show_credits", text="Next >", icon='TRIA_RIGHT')
            next_op.page = page + 1
        else:
            nav_row.label(text="")
        layout.separator()

        # ── Credit entries for this page ────────────────────────────────────
        start = page * _CREDITS_PAGE_SIZE
        end = min(start + _CREDITS_PAGE_SIZE, total)
        for icon, heading, lines in _CREDITS_SECTIONS[start:end]:
            box = layout.box()
            box.label(text=heading, icon=icon)
            col = box.column(align=True)
            col.scale_y = 0.85
            for line in lines:
                col.label(text=line)

        layout.separator()
        layout.label(text="All trademarks belong to their respective owners.", icon='INFO')


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
            # A stale class object (from a previous load or dual-install) may
            # already occupy this type name.  Unregister the old object first
            # then register the fresh one so the UI always runs current code.
            # This mirrors the pattern used in operators.py register().
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
                bpy.utils.register_class(cls)
                print(
                    f"tutorial_operators: Registered {cls.bl_idname} "
                    f"(replaced stale class)"
                )
            except Exception as e2:
                print(
                    f"tutorial_operators: ⚠ Failed to register "
                    f"{cls.__name__}: {e2}"
                )


def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception as e:
            # If the class object here is the reloaded (new) version but
            # Blender still holds the old version, fall back to unregistering
            # by type name so bpy.types is cleaned up regardless.
            print(
                f"tutorial_operators: Unregister by object failed for "
                f"{cls.__name__}: {e}; trying by type name"
            )
            try:
                existing = getattr(bpy.types, cls.__name__, None)
                if existing is not None:
                    bpy.utils.unregister_class(existing)
            except Exception as e2:
                print(
                    f"tutorial_operators: Could not unregister "
                    f"{cls.__name__}: {e2}"
                )
