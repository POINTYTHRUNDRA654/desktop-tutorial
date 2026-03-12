"""
UI Panels for the Fallout 4 Tutorial Add-on
"""

import bpy
from bpy.types import Panel
import sys
import importlib

def _safe_import(name):
    try:
        return importlib.import_module(f".{name}", package=__package__)
    except Exception as exc:
        print(f"ui_panels: Skipped module {name} due to error: {exc}")
        return None

hunyuan3d_helpers = _safe_import("hunyuan3d_helpers")
gradio_helpers = _safe_import("gradio_helpers")
hymotion_helpers = _safe_import("hymotion_helpers")
nvtt_helpers = _safe_import("nvtt_helpers")
rignet_helpers = _safe_import("rignet_helpers")
preferences = _safe_import("preferences")
ue_importer_helpers = _safe_import("ue_importer_helpers")
umodel_tools_helpers = _safe_import("umodel_tools_helpers")
umodel_helpers = _safe_import("umodel_helpers")
unity_fbx_importer_helpers = _safe_import("unity_fbx_importer_helpers")
asset_studio_helpers = _safe_import("asset_studio_helpers")
asset_ripper_helpers = _safe_import("asset_ripper_helpers")
knowledge_helpers = _safe_import("knowledge_helpers")
export_helpers = _safe_import("export_helpers")
addon_updater = _safe_import("addon_updater")
realesrgan_helpers = _safe_import("realesrgan_helpers")
instantngp_helpers = _safe_import("instantngp_helpers")
imageto3d_helpers = _safe_import("imageto3d_helpers")
motion_generation_helpers = _safe_import("motion_generation_helpers")
fo4_material_browser  = _safe_import("fo4_material_browser")
fo4_scene_diagnostics = _safe_import("fo4_scene_diagnostics")
fo4_reference_helpers = _safe_import("fo4_reference_helpers")

class FO4_PT_MainPanel(Panel):
    """Main tutorial panel in the 3D View sidebar"""
    bl_label = "Fallout 4 Tutorial"
    bl_idname = "FO4_PT_main_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # ── Version compatibility banner ─────────────────────────────────────
        # Show users exactly what their Blender version supports so there are
        # no surprises when they try to export.
        bv = bpy.app.version
        compat_box = layout.box()
        compat_box.label(text=f"Blender {bv[0]}.{bv[1]}.{bv[2]}", icon='BLENDER')

        if bv < (2, 90, 0):
            compat_box.label(text="⚠ Blender 2.90+ required.", icon='ERROR')
            compat_box.label(text="Please upgrade to Blender 3.6 LTS or newer.")
        elif bv < (3, 0, 0):
            compat_box.label(text="✓ NIF export: supported (Niftools v0.1.1)", icon='CHECKMARK')
            compat_box.label(text="⚠ Recommend upgrading to Blender 3.6 LTS.")
        elif bv < (4, 0, 0):
            compat_box.label(text="✓ NIF export: fully supported (Blender 3.x)", icon='CHECKMARK')
            compat_box.label(text="  Install Niftools v0.1.1 add-on to export .nif directly.")
        elif bv < (4, 1, 0):
            compat_box.label(text="✓ NIF export: FBX fallback (Niftools needs Blender 3.6)", icon='INFO')
            compat_box.label(text="  Export .fbx and convert with Cathedral Assets Optimizer.")
        else:
            # 4.1+ — use_auto_smooth removed; FBX-only NIF path
            compat_box.label(text="✓ NIF export: FBX fallback (Niftools needs Blender 3.6)", icon='INFO')
            compat_box.label(text="  Shade-by-angle is automatic in Blender 4.1+.")

        # ── Tutorial section ─────────────────────────────────────────────────
        box = layout.box()
        box.label(text="Tutorial System", icon='HELP')
        box.operator("fo4.start_tutorial", text="Start Tutorial", icon='PLAY')
        box.operator("fo4.show_help", text="Show Help", icon='QUESTION')

        # New-user setup hints
        hint = layout.box()
        hint.label(text="Setup / First-time Use", icon='INFO')
        hint.label(text="1. Open the 'Setup & Status' tab below.")
        hint.label(text="2. Install missing Python packages if prompted.")
        hint.label(text="3. Install Niftools v0.1.1 (Blender 3.6 LTS only).")
        hint.label(text="   OR use FBX export + Cathedral Assets Optimizer.")
        hint.label(text="4. Restart Blender after installing add-ons/tools.")
        
        # Notifications
        if hasattr(scene, 'fo4_notifications') and scene.fo4_notifications:
            notif_box = layout.box()
            notif_box.label(text="Notifications", icon='INFO')
            for notif in scene.fo4_notifications[-3:]:  # Show last 3
                notif_box.label(text=notif.message, icon='DOT')

class FO4_PT_MeshPanel(Panel):
    """Mesh creation helpers panel"""
    bl_label = "Mesh Helpers"
    bl_idname = "FO4_PT_mesh_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout

        unified = getattr(context.scene, "fo4_mesh_panel_unified", False)

        obj = context.active_object
        has_mesh = obj and obj.type == 'MESH'

        if unified:
            # ── Mesh Helpers ────────────────────────────────────────────
            box = layout.box()
            box.label(text="Mesh Helpers", icon='MESH_CUBE')
            box.operator("fo4.create_base_mesh", text="Create Base Mesh", icon='MESH_DATA')
            box.operator("fo4.optimize_mesh", text="Optimize for FO4", icon='MOD_DECIM')
            if prefs:
                opt_sub = box.box()
                opt_sub.label(text="Optimize Settings:", icon='PREFERENCES')
                opt_sub.prop(prefs, "optimize_apply_transforms")
                opt_sub.prop(prefs, "optimize_remove_doubles_threshold")
                opt_sub.prop(prefs, "optimize_preserve_uvs")
            box.operator("fo4.validate_mesh", text="Validate Mesh", icon='CHECKMARK')
            box.separator()

            # ── Collision ───────────────────────────────────────────────
            box.label(text="Collision", icon='MESH_ICOSPHERE')
            if has_mesh:
                box.prop(obj, "fo4_collision_type", text="Type")
            row = box.row()
            row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
            row = box.row()
            row.enabled = has_mesh and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE', 'GRASS', 'MUSHROOM')
            row.operator("fo4.generate_collision_mesh", text="Generate Collision", icon='MESH_DATA')
            row = box.row()
            row.operator("fo4.export_mesh_with_collision", text="Generate + Export NIF", icon='EXPORT')
            box.separator()

            # ── Advanced Mesh Tools ─────────────────────────────────────
            box.label(text="Advanced Mesh Tools", icon='MODIFIER')
            box.operator("fo4.analyze_mesh_quality", text="Analyze Quality", icon='INFO')
            box.operator("fo4.auto_repair_mesh", text="Auto-Repair", icon='TOOL_SETTINGS')
            box.operator("fo4.antigravity_auto_fix", text="AI Auto-Fix (Antigravity)", icon='OUTLINER_OB_LIGHT')
            box.operator("fo4.smart_decimate", text="Smart Decimate", icon='MOD_DECIM')
            box.operator("fo4.split_mesh_poly_limit", text="Split at Poly Limit", icon='MOD_BOOLEAN')
            box.operator("fo4.generate_lod", text="Generate LOD Chain", icon='OUTLINER_OB_MESH')

            # ── UV & Texture Workflow ────────────────────────────────────
            uv_box = layout.box()
            uv_box.label(text="UV & Texture Workflow", icon='UV')

            # Step 1 — status
            if has_mesh:
                mesh = obj.data
                uv_ok = bool(mesh.uv_layers)
                mat_ok = bool(mesh.materials and mesh.materials[0])
                uv_icon = 'CHECKMARK' if uv_ok else 'ERROR'
                mat_icon = 'CHECKMARK' if mat_ok else 'ERROR'
                uv_box.label(
                    text=("UV Map: " + mesh.uv_layers[0].name) if uv_ok else "UV Map: None",
                    icon=uv_icon,
                )
                uv_box.label(
                    text=("Material: " + mesh.materials[0].name) if mat_ok else "Material: None",
                    icon=mat_icon,
                )
                uv_box.separator()

            # Step 1 — one-click setup (UV + texture + material in one go)
            uv_box.label(text="Step 1 — Setup UV + Bind Texture:", icon='FORWARD')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator(
                "fo4.setup_uv_with_texture",
                text="Setup UV + Texture (All-in-One)",
                icon='TEXTURE',
            )

            # Step 1b — Hybrid workflow for complex / organic meshes
            uv_box.separator()
            uv_box.label(
                text="Complex Mesh? (plants, foliage, armor) →",
                icon='QUESTION',
            )
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator(
                "fo4.scan_uv_complexity",
                text="Scan UV Complexity",
                icon='VIEWZOOM',
            )
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator(
                "fo4.smart_seam_mark",
                text="Scan & Mark Seams",
                icon='MOD_EDGESPLIT',
            )
            row.operator(
                "fo4.hybrid_unwrap",
                text="Hybrid Unwrap",
                icon='UV_SYNC_SELECT',
            )
            uv_box.separator()

            # Step 2 — face-picking for selective unwrap
            uv_box.label(text="Step 2 — Select faces to unwrap:", icon='FORWARD')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator(
                "fo4.pick_faces_for_unwrap",
                text="Pick Faces to Unwrap",
                icon='FACE_MAPS',
            )
            row.operator(
                "fo4.unwrap_selected_faces",
                text="Unwrap Selected",
                icon='UV_SYNC_SELECT',
            )
            uv_box.separator()

            # Step 3 — re-unwrap if needed
            uv_box.label(text="Step 3 — Adjust UV Map if needed:", icon='FORWARD')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.re_unwrap_uv", text="Re-Unwrap UV", icon='UV_SYNC_SELECT')
            row.operator("fo4.optimize_uvs",  text="Pack Islands", icon='UV_FACESEL')

            # Step 4 — interactive UV editing
            uv_box.label(text="Step 4 — Fine-tune in UV Editor:", icon='FORWARD')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.open_uv_editing", text="Edit UV Map", icon='UV_ISLANDSEL')

            # Ask Mossy / Antigravity
            uv_box.separator()
            uv_box.operator(
                "fo4.ask_mossy_uv_advice",
                text="Ask Mossy for Advice",
                icon='LIGHT_HEMI',
            )
            uv_box.operator(
                "fo4.ask_antigravity_uv_advice",
                text="Ask Antigravity for Advice",
                icon='OUTLINER_OB_LIGHT',
            )

            # Step 5 — export
            uv_box.separator()
            uv_box.label(text="Step 5 — Export as Fallout 4 NIF:", icon='FORWARD')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_mesh", text="Export Mesh (.nif)", icon='EXPORT')

        else:
            # ── original layout: separate boxes ─────────────────────────
            box = layout.box()
            box.label(text="Mesh Creation", icon='MESH_CUBE')
            box.operator("fo4.create_base_mesh", text="Create Base Mesh", icon='MESH_DATA')
            box.operator("fo4.optimize_mesh", text="Optimize for FO4", icon='MOD_DECIM')
            if prefs:
                opt_sub = box.box()
                opt_sub.label(text="Optimize Settings:", icon='PREFERENCES')
                opt_sub.prop(prefs, "optimize_apply_transforms")
                opt_sub.prop(prefs, "optimize_remove_doubles_threshold")
                opt_sub.prop(prefs, "optimize_preserve_uvs")
            box.operator("fo4.validate_mesh", text="Validate Mesh", icon='CHECKMARK')

            col_box = layout.box()
            col_box.label(text="Collision", icon='MESH_ICOSPHERE')
            if has_mesh:
                col_box.prop(obj, "fo4_collision_type", text="Type")
            row = col_box.row()
            row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
            row = col_box.row()
            row.enabled = has_mesh and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE', 'GRASS', 'MUSHROOM')
            row.operator("fo4.generate_collision_mesh", text="Generate Collision", icon='MESH_DATA')
            row = col_box.row()
            row.operator("fo4.export_mesh_with_collision", text="Generate + Export NIF", icon='EXPORT')

            adv_box = layout.box()
            adv_box.label(text="Advanced Mesh Tools", icon='MODIFIER')
            adv_box.operator("fo4.analyze_mesh_quality", text="Analyze Quality", icon='INFO')
            adv_box.operator("fo4.auto_repair_mesh", text="Auto-Repair", icon='TOOL_SETTINGS')
            adv_box.operator("fo4.antigravity_auto_fix", text="AI Auto-Fix (Antigravity)", icon='OUTLINER_OB_LIGHT')
            adv_box.operator("fo4.smart_decimate", text="Smart Decimate", icon='MOD_DECIM')
            adv_box.operator("fo4.split_mesh_poly_limit", text="Split at Poly Limit", icon='MOD_BOOLEAN')
            adv_box.operator("fo4.generate_lod", text="Generate LOD Chain", icon='OUTLINER_OB_MESH')

            uv_box = layout.box()
            uv_box.label(text="UV & Texture Workflow", icon='UV')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.setup_uv_with_texture", text="Setup UV + Texture", icon='TEXTURE')
            # Hybrid workflow for complex / organic meshes
            uv_box.label(text="Complex Mesh? (plants, foliage, armor) →", icon='QUESTION')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.scan_uv_complexity", text="Scan Complexity", icon='VIEWZOOM')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.smart_seam_mark", text="Mark Seams", icon='MOD_EDGESPLIT')
            row.operator("fo4.hybrid_unwrap",   text="Hybrid Unwrap", icon='UV_SYNC_SELECT')
            # Face-selective unwrap
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.pick_faces_for_unwrap", text="Pick Faces", icon='FACE_MAPS')
            row.operator("fo4.unwrap_selected_faces", text="Unwrap Selected", icon='UV_SYNC_SELECT')
            row = uv_box.row(align=True)
            row.enabled = has_mesh
            row.operator("fo4.re_unwrap_uv",  text="Re-Unwrap",     icon='UV_SYNC_SELECT')
            row.operator("fo4.optimize_uvs",  text="Pack Islands",  icon='UV_FACESEL')
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.open_uv_editing", text="Edit UV Map", icon='UV_ISLANDSEL')
            uv_box.operator("fo4.ask_mossy_uv_advice", text="Ask Mossy", icon='LIGHT_HEMI')
            uv_box.operator("fo4.ask_antigravity_uv_advice", text="Ask Antigravity", icon='OUTLINER_OB_LIGHT')
            uv_box.separator()
            row = uv_box.row()
            row.enabled = has_mesh
            row.operator("fo4.export_mesh", text="Export Mesh (.nif)", icon='EXPORT')

class FO4_PT_TexturePanel(Panel):
    """Texture installation helpers panel"""
    bl_label = "Texture Helpers"
    bl_idname = "FO4_PT_texture_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        box = layout.box()
        box.label(text="Texture Setup", icon='TEXTURE')
        box.operator("fo4.setup_textures", text="Setup FO4 Materials", icon='MATERIAL')

        install_box = box.box()
        install_box.label(text="Install Texture", icon='FILE_IMAGE')
        op = install_box.operator("fo4.install_texture", text="Install Diffuse", icon='FILE_IMAGE')
        op.texture_type = 'DIFFUSE'
        op = install_box.operator("fo4.install_texture", text="Install Normal Map", icon='NORMALS_FACE')
        op.texture_type = 'NORMAL'
        op = install_box.operator("fo4.install_texture", text="Install Specular Map", icon='SHADING_RENDERED')
        op.texture_type = 'SPECULAR'

        box.operator("fo4.validate_textures", text="Validate Textures", icon='CHECKMARK')

        # DDS conversion – required for Fallout 4 NIF export
        dds_box = layout.box()
        dds_box.label(text="DDS Conversion (FO4 NIF Export)", icon='DISK_DRIVE')
        dds_box.operator("fo4.convert_texture_to_dds", text="Convert Texture to DDS", icon='FILE_REFRESH')
        dds_box.operator("fo4.convert_object_textures_to_dds", text="Convert Object Textures to DDS", icon='OBJECT_DATA')

        # AI Upscaling (Real-ESRGAN)
        esrgan_available, esrgan_status = realesrgan_helpers.RealESRGANHelpers.get_install_status()
        ai_box = layout.box()
        ai_box.label(text="AI Upscaling (Real-ESRGAN)", icon='RENDER_RESULT')
        if esrgan_available:
            ai_box.label(text=f"Status: {esrgan_status}", icon='CHECKMARK')
        else:
            ai_box.label(text="Status: Not Installed", icon='ERROR')
        ai_box.operator("fo4.check_realesrgan_installation", text="Check Status", icon='SYSTEM')
        row = ai_box.row()
        row.enabled = esrgan_available
        row.operator("fo4.upscale_texture", text="Upscale Texture", icon='FULLSCREEN_ENTER')
        row = ai_box.row()
        row.enabled = esrgan_available
        row.operator("fo4.upscale_object_textures", text="Upscale Object Textures", icon='OBJECT_DATA')

        # KREA AI Legacy upscaling — own self-contained upscaler, no subscription
        krea_box = layout.box()
        krea_box.label(text="KREA AI Legacy Upscale", icon='SHADERFX')
        if esrgan_available:
            krea_box.label(text=f"Engine: {esrgan_status}", icon='CHECKMARK')
        else:
            krea_box.label(text="Engine: PIL fallback (install for best quality)", icon='INFO')
            krea_box.operator(
                "fo4.install_upscaler_deps",
                text="Install AI Upscaler (One-Click)",
                icon='IMPORT',
            )
        krea_box.operator("fo4.upscale_krea_legacy", text="Upscale Texture", icon='FULLSCREEN_ENTER')

class FO4_PT_ImageToMeshPanel(Panel):
    """Image to Mesh helpers panel"""
    bl_label = "Image to Mesh"
    bl_idname = "FO4_PT_image_to_mesh_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        box = layout.box()
        box.label(text="Create Mesh from Image", icon='IMAGE_DATA')
        box.operator("fo4.image_to_mesh", text="Image to Mesh (Height Map)", icon='MESH_GRID')
        
        box = layout.box()
        box.label(text="Displacement Map", icon='MOD_DISPLACE')
        box.operator("fo4.apply_displacement_map", text="Apply Displacement Map", icon='TEXTURE')
        
        # ZoeDepth section
        from . import zoedepth_helpers
        available, _ = zoedepth_helpers.check_zoedepth_availability()
        
        depth_box = layout.box()
        depth_box.label(text="Depth Estimation (ZoeDepth)", icon='CAMERA_DATA')
        
        if available:
            depth_box.label(text="Status: Available ✓", icon='CHECKMARK')
        else:
            depth_box.label(text="Status: Not Installed ✗", icon='ERROR')
        
        row = depth_box.row()
        row.enabled = available
        row.operator("fo4.estimate_depth", text="Estimate Depth & Create Mesh", icon='MESH_GRID')
        
        depth_box.operator("fo4.show_zoedepth_info", text="Installation Info", icon='INFO')

        # TripoSR section
        layout.separator()
        triposr_available = imageto3d_helpers.ImageTo3DHelpers.is_triposr_available()
        triposr_box = layout.box()
        triposr_box.label(text="TripoSR (Image to 3D)", icon='MESH_ICOSPHERE')
        if triposr_available:
            triposr_box.label(text="Status: Available ✓", icon='CHECKMARK')
        else:
            triposr_box.label(text="Status: Not Installed ✗", icon='ERROR')

        # Generation buttons (enabled when available)
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.generate_triposr_light", text="Quick Generate (Light)", icon='MESH_CUBE')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.generate_triposr_texture", text="Generate with Textures", icon='TEXTURE')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.bake_triposr_textures", text="Bake TripoSR Textures", icon='RENDER_STILL')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.use_pythonic_triposr", text="Use Pythonic TripoSR", icon='SCRIPT')
        row = triposr_box.row()
        row.enabled = triposr_available
        row.operator("fo4.generate_from_stereo", text="Generate from Stereo Images", icon='CAMERA_STEREO')

        # TripoSR variant checks
        checks_box = triposr_box.box()
        checks_box.label(text="Check Variants:", icon='SYSTEM')
        row = checks_box.row(align=True)
        row.operator("fo4.check_triposr_light", text="Light", icon='CHECKMARK')
        row.operator("fo4.check_triposr_bake", text="Bake", icon='CHECKMARK')
        row = checks_box.row(align=True)
        row.operator("fo4.check_triposr_texture_gen", text="Texture Gen", icon='CHECKMARK')
        row.operator("fo4.check_pythonic_triposr", text="Pythonic", icon='CHECKMARK')
        row = checks_box.row(align=True)
        row.operator("fo4.check_starxsky_triposr", text="StarxSky", icon='CHECKMARK')
        row.operator("fo4.check_stereo_triposr", text="Stereo", icon='CHECKMARK')

        # TripoSR info/workflow buttons
        triposr_box.operator("fo4.show_triposr_workflow", text="Workflow Guide", icon='INFO')
        triposr_box.operator("fo4.show_triposr_baking_workflow", text="Baking Workflow", icon='INFO')
        triposr_box.operator("fo4.show_triposr_comparison", text="Compare Variants", icon='LINENUMBERS_ON')
        triposr_box.operator("fo4.show_all_triposr_variants", text="All 14 Variants", icon='LINENUMBERS_ON')

        # Instant-NGP section
        layout.separator()
        ngp_available = instantngp_helpers.InstantNGPHelpers.is_instantngp_available()
        ngp_box = layout.box()
        ngp_box.label(text="Instant-NGP / NeRF", icon='CAMERA_DATA')
        if ngp_available:
            ngp_box.label(text="Status: Available ✓", icon='CHECKMARK')
        else:
            ngp_box.label(text="Status: Not Installed ✗", icon='ERROR')
        ngp_box.operator("fo4.check_instantngp_installation", text="Check Installation", icon='SYSTEM')
        row = ngp_box.row()
        row.enabled = ngp_available
        row.operator("fo4.reconstruct_from_images", text="Reconstruct from Images", icon='MESH_GRID')
        row = ngp_box.row()
        row.enabled = ngp_available
        row.operator("fo4.import_instantngp_mesh", text="Import Instant-NGP Mesh", icon='IMPORT')
        row = ngp_box.row()
        row.enabled = ngp_available
        row.operator("fo4.optimize_nerf_mesh", text="Optimize NeRF Mesh for FO4", icon='MOD_DECIM')
        ngp_box.operator("fo4.show_instantngp_info", text="About Instant-NGP", icon='INFO')

        # Info box
        info_box = layout.box()
        info_box.label(text="Quick Guide:", icon='INFO')
        info_box.label(text="• Height Map: Grayscale images")
        info_box.label(text="• ZoeDepth: RGB images (AI depth)")
        info_box.label(text="• TripoSR: Image → full 3D mesh")
        info_box.label(text="• Instant-NGP: Photos → NeRF mesh")
        info_box.label(text="• Formats: PNG, JPG, BMP, TIFF, TGA")
        info_box.label(text="• Requires: PIL/Pillow & NumPy")
        info_box.label(text="• See README for install instructions")

class FO4_PT_AIGenerationPanel(Panel):
    """AI-powered mesh generation panel (Hunyuan3D-2)"""
    bl_label = "AI Generation (Optional)"
    bl_idname = "FO4_PT_ai_generation_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Check if Hunyuan3D is available
        is_available = hunyuan3d_helpers.Hunyuan3DHelpers.is_available()
        
        # Status box
        status_box = layout.box()
        if is_available:
            status_box.label(text="Status: Available ✓", icon='CHECKMARK')
        else:
            status_box.label(text="Status: Not Installed ✗", icon='ERROR')
        
        status_box.operator("fo4.show_hunyuan3d_info", text="Installation Info", icon='INFO')
        
        # AI Generation operators (enabled only if available)
        box = layout.box()
        box.label(text="Text to 3D", icon='FILE_TEXT')
        row = box.row()
        row.enabled = is_available
        row.operator("fo4.generate_mesh_from_text", text="Generate from Text", icon='OUTLINER_OB_FONT')
        
        box = layout.box()
        box.label(text="Image to 3D (Full Model)", icon='IMAGE_DATA')
        row = box.row()
        row.enabled = is_available
        row.operator("fo4.generate_mesh_from_image_ai", text="Generate from Image (AI)", icon='MESH_ICOSPHERE')
        
        # Info box
        info_box = layout.box()
        info_box.label(text="About AI Generation:", icon='INFO')
        info_box.label(text="• Uses Hunyuan3D-2 AI model")
        info_box.label(text="• Generates full 3D meshes")
        info_box.label(text="• Requires GPU & model download")
        info_box.label(text="• Completely optional feature")
        
        # Gradio Web UI section
        gradio_available = gradio_helpers.GradioHelpers.is_available()
        server_running = gradio_helpers.GradioHelpers.is_server_running()
        
        layout.separator()
        web_box = layout.box()
        web_box.label(text="Web Interface (Gradio)", icon='URL')
        
        if gradio_available:
            if server_running:
                web_box.label(text="Server: Running ✓", icon='CHECKMARK')
                web_box.operator("fo4.stop_gradio_server", text="Stop Web UI", icon='CANCEL')
            else:
                web_box.label(text="Server: Stopped", icon='RADIOBUT_OFF')
                web_box.operator("fo4.start_gradio_server", text="Start Web UI", icon='PLAY')
        else:
            web_box.label(text="Gradio: Not Installed ✗", icon='ERROR')
        
        web_box.operator("fo4.show_gradio_info", text="Web UI Info", icon='INFO')
        
        if gradio_available:
            web_box.label(text="Open: http://localhost:7860")
        
        # HY-Motion-1.0 section
        hymotion_available = hymotion_helpers.HyMotionHelpers.is_available()
        
        layout.separator()
        motion_box = layout.box()
        motion_box.label(text="Motion Generation (HY-Motion)", icon='ANIM')
        
        if hymotion_available:
            motion_box.label(text="Status: Available ✓", icon='CHECKMARK')
            motion_box.operator("fo4.generate_motion_from_text", text="Generate Motion", icon='ANIM_DATA')
            motion_box.operator("fo4.import_motion_file", text="Import Motion File", icon='IMPORT')
        else:
            motion_box.label(text="Status: Not Installed ✗", icon='ERROR')
        
        motion_box.operator("fo4.show_hymotion_info", text="Motion Info", icon='INFO')
        
        # Shap-E section
        layout.separator()
        shap_e_box = layout.box()
        shap_e_box.label(text="Shap-E (Text/Image to 3D)", icon='MESH_ICOSPHERE')

        from . import shap_e_helpers
        shap_e_installed, shap_e_msg = shap_e_helpers.ShapEHelpers.is_shap_e_installed()

        if shap_e_installed:
            shap_e_box.label(text="Status: Installed ✓", icon='CHECKMARK')

            # Text-to-3D
            text_box = shap_e_box.box()
            text_box.label(text="Text to 3D:", icon='FILE_TEXT')
            text_box.prop(scene, "fo4_shap_e_prompt", text="")
            text_box.prop(scene, "fo4_shap_e_guidance_scale")
            text_box.prop(scene, "fo4_shap_e_inference_steps")
            text_box.operator("fo4.generate_shap_e_text", text="Generate from Text", icon='MESH_CUBE')

            # Image-to-3D
            image_box = shap_e_box.box()
            image_box.label(text="Image to 3D:", icon='IMAGE_DATA')
            image_box.prop(scene, "fo4_shap_e_image_path", text="")
            image_box.operator("fo4.generate_shap_e_image", text="Generate from Image", icon='TEXTURE')
        else:
            shap_e_box.label(text="Status: Not Installed ✗", icon='ERROR')

            # Check if it's a Windows path error
            if "Windows path length error" in shap_e_msg:
                shap_e_box.label(text="⚠ Windows path too long", icon='ERROR')
                shap_e_box.operator("torch.install_custom_path", text="Install PyTorch to D:/t", icon='IMPORT')
            else:
                shap_e_box.operator("fo4.show_shap_e_info", text="Installation Instructions", icon='INFO')

        shap_e_box.operator("fo4.check_shap_e_installation", text="Check Installation", icon='SYSTEM')

        # Point-E section
        layout.separator()
        point_e_box = layout.box()
        point_e_box.label(text="Point-E (Text/Image to Point Cloud)", icon='OUTLINER_OB_POINTCLOUD')

        from . import point_e_helpers
        point_e_installed, point_e_msg = point_e_helpers.PointEHelpers.is_point_e_installed()

        if point_e_installed:
            point_e_box.label(text="Status: Installed ✓", icon='CHECKMARK')

            # Text-to-3D
            text_box = point_e_box.box()
            text_box.label(text="Text to Point Cloud:", icon='FILE_TEXT')
            text_box.prop(scene, "fo4_point_e_prompt", text="")
            text_box.prop(scene, "fo4_point_e_num_samples")
            text_box.prop(scene, "fo4_point_e_grid_size")
            text_box.prop(scene, "fo4_point_e_reconstruction_method")
            text_box.operator("fo4.generate_point_e_text", text="Generate from Text", icon='MESH_CUBE')

            # Image-to-3D
            image_box = point_e_box.box()
            image_box.label(text="Image to Point Cloud:", icon='IMAGE_DATA')
            image_box.prop(scene, "fo4_point_e_image_path", text="")
            image_box.operator("fo4.generate_point_e_image", text="Generate from Image", icon='TEXTURE')
        else:
            point_e_box.label(text="Status: Not Installed ✗", icon='ERROR')

            # Check if it's a Windows path error
            if "Windows path length error" in point_e_msg:
                point_e_box.label(text="⚠ Windows path too long", icon='ERROR')
                point_e_box.operator("torch.install_custom_path", text="Install PyTorch to D:/t", icon='IMPORT')
            else:
                point_e_box.operator("fo4.show_point_e_info", text="Installation Instructions", icon='INFO')

        point_e_box.operator("fo4.check_point_e_installation", text="Check Installation", icon='SYSTEM')

        # Diffusers section
        layout.separator()
        diff_box = layout.box()
        diff_box.label(text="Diffusers / LayerDiffuse", icon='TEXTURE_DATA')
        diff_box.operator("fo4.check_diffusers", text="Check Diffusers", icon='SYSTEM')
        diff_box.operator("fo4.check_layerdiffuse", text="Check LayerDiffuse", icon='SYSTEM')
        diff_box.operator("fo4.show_diffusers_workflow", text="Diffusers Workflow Guide", icon='INFO')

        # Ecosystem info
        layout.separator()
        eco_box = layout.box()
        eco_box.label(text="Resources & Recommendations", icon='BOOKMARKS')
        eco_box.operator("fo4.show_complete_ecosystem", text="Complete Ecosystem (17 tools)", icon='WORLD')
        eco_box.operator("fo4.show_ml_resources", text="ML Resources Guide", icon='DOCUMENTS')
        eco_box.operator("fo4.show_strategic_recommendations", text="Strategic Recommendations", icon='LIGHT')


class FO4_PT_AnimationPanel(Panel):
    """Animation helpers panel"""
    bl_label = "Animation Helpers"
    bl_idname = "FO4_PT_animation_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        box = layout.box()
        box.label(text="Animation Setup", icon='ANIM')
        box.operator("fo4.setup_armature", text="Setup FO4 Armature", icon='ARMATURE_DATA')
        box.operator("fo4.auto_weight_paint", text="Auto Weight Paint", icon='AUTO')
        box.operator("fo4.validate_animation", text="Validate Animation", icon='CHECKMARK')
        box.operator("fo4.generate_wind_weights", text="Generate Wind Weights", icon='FORCE_WIND')
        box.operator("fo4.apply_wind_animation", text="Apply Wind Animation", icon='ANIM')
        box.separator()
        box.label(text="Batch Operations", icon='SEQ_SEQUENCER')
        row = box.row()
        row.operator("fo4.batch_generate_wind_weights", text="Batch Wind Weights")
        row.operator("fo4.batch_apply_wind_animation", text="Batch Wind Anim")
        box.operator("fo4.batch_auto_weight_paint", text="Batch Auto‑Weight")
        box.operator("fo4.toggle_wind_preview", text="Toggle Wind Preview", icon='PLAY')

        # Motion Generation section
        layout.separator()
        motion_box = layout.box()
        motion_box.label(text="Motion Generation", icon='ANIM_DATA')
        motion_box.operator("fo4.check_all_motion_systems", text="Check All Motion Systems", icon='SYSTEM')
        motion_box.operator("fo4.generate_motion_auto", text="Generate Motion (Auto)", icon='PLAY')
        motion_box.operator("fo4.show_motion_generation_info", text="Installation Info", icon='INFO')

class FO4_PT_RigNetPanel(Panel):
    """RigNet auto-rigging panel"""
    bl_label = "Auto-Rigging (RigNet)"
    bl_idname = "FO4_PT_rignet_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Check if RigNet is available
        is_available, message = rignet_helpers.RigNetHelpers.check_rignet_available()
        
        # Check if libigl is available
        libigl_available, libigl_message = rignet_helpers.RigNetHelpers.check_libigl_available()
        
        # Status box for RigNet
        status_box = layout.box()
        status_box.label(text="RigNet Status:", icon='INFO')
        if is_available:
            status_box.label(text="✓ RigNet Available", icon='CHECKMARK')
            # Show just the directory name
            import os
            rignet_dir = os.path.basename(message)
            status_box.label(text=f"  {rignet_dir}", icon='FILE_FOLDER')
        else:
            status_box.label(text="✗ RigNet Not Installed", icon='ERROR')
        
        status_box.operator("fo4.check_rignet", text="Check RigNet", icon='INFO')
        
        # Status box for libigl
        libigl_box = layout.box()
        libigl_box.label(text="libigl Status:", icon='INFO')
        if libigl_available:
            libigl_box.label(text="✓ libigl Available", icon='CHECKMARK')
            if "pip" in libigl_message:
                libigl_box.label(text="  Installed via pip", icon='PACKAGE')
            else:
                import os
                libigl_dir = os.path.basename(libigl_message.split("at ")[-1]) if "at " in libigl_message else "libigl"
                libigl_box.label(text=f"  {libigl_dir}", icon='FILE_FOLDER')
        else:
            libigl_box.label(text="✗ libigl Not Installed", icon='ERROR')
        
        libigl_box.operator("fo4.check_libigl", text="Check libigl", icon='INFO')
        
        layout.operator("fo4.show_rignet_info", text="Installation Guide", icon='QUESTION')
        
        # Auto-rigging operators (RigNet)
        rignet_box = layout.box()
        rignet_box.label(text="RigNet (Full Auto-Rigging)", icon='ARMATURE_DATA')
        
        row = rignet_box.row()
        row.operator("fo4.prepare_for_rignet", text="1. Prepare Mesh", icon='MODIFIER')
        
        row = rignet_box.row()
        row.enabled = is_available
        row.operator("fo4.auto_rig_mesh", text="2. Auto-Rig", icon='ARMATURE_DATA')
        
        row = rignet_box.row()
        row.operator("fo4.export_for_rignet", text="Export for External RigNet", icon='EXPORT')
        
        # BBW skinning operators (libigl)
        libigl_op_box = layout.box()
        libigl_op_box.label(text="libigl (BBW Skinning)", icon='MOD_SKIN')
        
        row = libigl_op_box.row()
        row.enabled = libigl_available
        row.operator("fo4.compute_bbw_skinning", text="Compute BBW Weights", icon='WPAINT_HLT')
        
        libigl_op_box.label(text="(Requires existing armature)", icon='INFO')
        
        # Info box
        info_box = layout.box()
        info_box.label(text="About Auto-Rigging:", icon='INFO')
        info_box.label(text="• RigNet: Full auto-rigging")
        info_box.label(text="  - AI predicts skeleton")
        info_box.label(text="  - Best for humanoid/animals")
        info_box.label(text="• libigl: BBW skinning only")
        info_box.label(text="  - Needs existing skeleton")
        info_box.label(text="  - Fast & reliable weights")
        
        if not is_available and not libigl_available:
            info_box.separator()
            info_box.label(text="Quick Install:", icon='DOWNLOAD')
            info_box.label(text="RigNet:")
            info_box.label(text="  gh repo clone govindjoshi12/")
            info_box.label(text="    rignet-gj")
            info_box.label(text="libigl:")
            info_box.label(text="  pip install libigl")
            info_box.label(text="OR gh repo clone libigl/")
            info_box.label(text="  libigl-python-bindings")

class FO4_PT_NVTTPanel(Panel):
    """NVIDIA Texture Tools panel"""
    bl_label = "Texture Conversion (NVTT)"
    bl_idname = "FO4_PT_nvtt_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Check converters
        nvtt_available = nvtt_helpers.NVTTHelpers.is_nvtt_available()
        texconv_available = nvtt_helpers.NVTTHelpers.is_texconv_available()
        nvtt_path = nvtt_helpers.NVTTHelpers.get_nvtt_path()
        texconv_path = nvtt_helpers.NVTTHelpers.get_texconv_path()
        
        # Status box
        status_box = layout.box()
        status_box.label(text="Converters", icon='INFO')
        if nvtt_available:
            status_box.label(text="NVTT: Available", icon='CHECKMARK')
            if nvtt_path:
                status_box.label(text=f"nvcompress: {nvtt_path}", icon='FILE')
        else:
            status_box.label(text="NVTT: Not found", icon='ERROR')

        if texconv_available:
            status_box.label(text="texconv: Available", icon='CHECKMARK')
            if texconv_path:
                status_box.label(text=f"texconv: {texconv_path}", icon='FILE')
        else:
            status_box.label(text="texconv: Not found", icon='ERROR')

        status_box.operator("fo4.check_nvtt_installation", text="Check NVTT", icon='INFO')
        status_box.operator("fo4.test_dds_converters", text="Self-Test Converters", icon='CHECKMARK')
        
        # Conversion operators
        box = layout.box()
        box.label(text="Convert to DDS for FO4", icon='FILE_IMAGE')
        
        row = box.row()
        row.enabled = nvtt_available or texconv_available
        row.operator("fo4.convert_texture_to_dds", text="Convert Single Texture", icon='IMAGE_DATA')
        
        row = box.row()
        row.enabled = nvtt_available or texconv_available
        row.operator("fo4.convert_object_textures_to_dds", text="Convert Object Textures", icon='MATERIAL')
        
        # Info box
        info_box = layout.box()
        info_box.label(text="About DDS Conversion:", icon='INFO')
        info_box.label(text="• DDS is required for FO4")
        info_box.label(text="• BC1 (DXT1): Diffuse textures")
        info_box.label(text="• BC5 (ATI2): Normal maps")
        info_box.label(text="• BC3 (DXT5): Alpha textures")
        info_box.label(text="• BC7: optional high quality", icon='BLANK1')
        
        if not (nvtt_available or texconv_available):
            info_box.separator()
            info_box.label(text="Install converters:", icon='IMPORT')
            info_box.label(text="NVTT (nvcompress) or texconv")


class FO4_PT_AdvisorPanel(Panel):
    """AI/Advisor panel for export readiness."""
    bl_label = "Advisor"
    bl_idname = "FO4_PT_advisor_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        llm_enabled = getattr(scene, "fo4_llm_enabled", False)
        use_mossy   = getattr(scene, "fo4_use_mossy_ai", False)

        # ── Mossy AI status ──────────────────────────────────────────────
        mossy_box = layout.box()
        mossy_box.label(text="Mossy AI Tutor", icon='LINKED')

        wm = context.window_manager
        mossy_tcp_active = getattr(wm, 'mossy_link_active', False)

        if mossy_tcp_active:
            mossy_box.label(text="✓ Mossy Link server running", icon='CHECKMARK')
        else:
            mossy_box.label(text="Mossy Link server stopped", icon='RADIOBUT_OFF')
            mossy_box.operator("wm.mossy_link_toggle",
                               text="Start Mossy Link Server", icon='PLAY')

        if use_mossy:
            mossy_box.label(text="✓ Using Mossy as AI Advisor", icon='CHECKMARK')
            row = mossy_box.row(align=True)
            # use_llm=True triggers AI analysis; analyze_scene() routes to
            # Mossy first (local), then falls back to remote LLM if needed.
            op = row.operator("fo4.advisor_analyze", text="Ask Mossy for Advice", icon='LIGHT_HEMI')
            op.use_llm = True
            mossy_box.operator("wm.mossy_check_http", text="Check Mossy HTTP", icon='QUESTION')
        else:
            mossy_box.label(text="Mossy AI not active", icon='INFO')
            mossy_box.label(text="Enable 'Use Mossy as AI Advisor' in")
            mossy_box.label(text="N panel → Fallout 4 → Settings → Mossy Link")

        # ── Local analysis ───────────────────────────────────────────────
        box = layout.box()
        box.label(text="Scene Analysis", icon='INFO')
        row = box.row(align=True)
        op = row.operator("fo4.advisor_analyze", text="Analyze (Local)", icon='SHADERFX')
        op.use_llm = False
        row = box.row(align=True)
        row.enabled = llm_enabled and not use_mossy
        op = row.operator("fo4.advisor_analyze", text="Analyze (Remote LLM)", icon='LIGHT_HEMI')
        op.use_llm = True
        if not llm_enabled and not use_mossy:
            box.label(text="No AI configured – enable Mossy or set LLM in N-panel Settings", icon='ERROR')

        # ── Quick Fixes ──────────────────────────────────────────────────
        fixes = layout.box()
        fixes.label(text="Quick Fixes", icon='MODIFIER')
        row = fixes.row()
        op = row.operator("fo4.advisor_quick_fix", text="Apply Transforms", icon='ORIENTATION_VIEW')
        op.action = 'APPLY_TRANSFORMS'
        row = fixes.row()
        op = row.operator("fo4.advisor_quick_fix", text="Auto Smooth + Shade", icon='SHADING_RENDERED')
        op.action = 'SHADE_SMOOTH_AUTOSMOOTH'
        row = fixes.row()
        op = row.operator("fo4.advisor_quick_fix", text="Validate Export", icon='CHECKMARK')
        op.action = 'VALIDATE_EXPORT'

        # ── Info / KB ────────────────────────────────────────────────────
        info = layout.box()
        info.label(text="Advisor focuses on:", icon='HELP')
        info.label(text="• Export readiness (scale, transforms, normals)")
        info.label(text="• Texture prep (DDS BC1/3/5/7)")
        info.label(text="• Mesh limits (65,535 tris/verts)")

        kb_status = knowledge_helpers.describe_kb()
        info.label(text=kb_status, icon='BOOKMARKS')

        tools = layout.box()
        tools.label(text="KB Tools", icon='CONSOLE')
        tools.operator("fo4.check_kb_tools", text="Check KB Tools", icon='INFO')


class FO4_PT_ToolsLinks(Panel):
    """Quick links to external tools"""
    bl_label = "External Tools"
    bl_idname = "FO4_PT_tools_links"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout

        # quick tool availability summary
        status = knowledge_helpers.tool_status()
        sum_box = layout.box()
        sum_box.label(text="Tool Status", icon='INFO')
        for key, label in (
            ("ffmpeg", "ffmpeg"),
            ("whisper", "whisper CLI"),
            ("nvcompress", "nvcompress"),
            ("texconv", "texconv"),
        ):
            ok = status.get(key, False)
            tool_status = "Available" if ok else "Missing"
            sum_box.label(text=f"{label}: {tool_status}", icon='CHECKMARK' if ok else 'ERROR')

        box = layout.box()
        box.label(text="Core", icon='URL')
        op = box.operator("wm.url_open", text="Blender Niftools Add-on")
        op.url = "https://github.com/niftools/blender_niftools_addon/releases"
        op = box.operator("wm.url_open", text="Quick Reference")
        op.url = "file://" + bpy.path.abspath('//QUICK_REFERENCE.txt')

        op = box.operator("wm.url_open", text="DirectXTex texconv")
        op.url = "https://github.com/microsoft/DirectXTex/releases"

        op = box.operator("wm.url_open", text="NVIDIA Texture Tools")
        op.url = "https://github.com/castano/nvidia-texture-tools"

        box = layout.box()
        box.label(text="Unity extraction", icon='URL')
        op = box.operator("wm.url_open", text="AssetRipper")
        op.url = "https://github.com/AssetRipper/AssetRipper"
        op = box.operator("wm.url_open", text="AssetStudio")
        op.url = "https://github.com/Perfare/AssetStudio"
        op = box.operator("wm.url_open", text="UnityFBX-To-Blender-Importer")
        op.url = "https://github.com/Varneon/UnityFBX-To-Blender-Importer"

        # Unity FBX Importer with prominent install button
        unity_box = box.box()
        unity_box.label(text="Unity FBX Importer (Editor Extension)", icon='IMPORT')

        ub_ready, ub_message = unity_fbx_importer_helpers.status()
        ub_icon = 'CHECKMARK' if ub_ready else 'ERROR'

        info_col = unity_box.column(align=True)
        info_col.scale_y = 0.75
        info_col.label(text=ub_message, icon=ub_icon)
        info_col.label(text=f"Location: {unity_fbx_importer_helpers.repo_path()}", icon='FILE_FOLDER')

        if not ub_ready:
            install_row = unity_box.row()
            install_row.scale_y = 1.4
            install_row.operator("fo4.check_unity_fbx_importer", text="Auto-Download to D:/blender_tools/", icon='IMPORT')
        else:
            unity_box.operator("fo4.check_unity_fbx_importer", text="Verify Installation", icon='CHECKMARK')

        help_col = unity_box.column(align=True)
        help_col.scale_y = 0.7
        help_col.label(text="Use in Unity: Assets > Import Package > Custom Package", icon='INFO')

        # Asset Studio with prominent install button
        as_box = box.box()
        as_box.label(text="AssetStudio (Unity Asset Extractor)", icon='IMPORT')

        as_ready, as_message = asset_studio_helpers.status()
        as_icon = 'CHECKMARK' if as_ready else 'ERROR'

        as_info_col = as_box.column(align=True)
        as_info_col.scale_y = 0.75
        as_info_col.label(text=as_message, icon=as_icon)
        as_info_col.label(text=f"Location: {asset_studio_helpers.repo_path()}", icon='FILE_FOLDER')

        if not as_ready:
            as_install_row = as_box.row()
            as_install_row.scale_y = 1.4
            as_install_row.operator("fo4.check_asset_studio", text="Auto-Download to D:/blender_tools/", icon='IMPORT')
        else:
            as_box.operator("fo4.check_asset_studio", text="Verify Installation", icon='CHECKMARK')

        as_help_col = as_box.column(align=True)
        as_help_col.scale_y = 0.7
        as_help_col.label(text="Extract Unity assets to usable formats", icon='INFO')

        # Asset Ripper with prominent install button
        ar_box = box.box()
        ar_box.label(text="AssetRipper (Unity Asset Extractor)", icon='IMPORT')

        ar_ready, ar_message = asset_ripper_helpers.status()
        ar_icon = 'CHECKMARK' if ar_ready else 'ERROR'

        ar_info_col = ar_box.column(align=True)
        ar_info_col.scale_y = 0.75
        ar_info_col.label(text=ar_message, icon=ar_icon)
        ar_info_col.label(text=f"Location: {asset_ripper_helpers.repo_path()}", icon='FILE_FOLDER')

        if not ar_ready:
            ar_install_row = ar_box.row()
            ar_install_row.scale_y = 1.4
            ar_install_row.operator("fo4.check_asset_ripper", text="Auto-Download to D:/blender_tools/", icon='IMPORT')
        else:
            ar_box.operator("fo4.check_asset_ripper", text="Verify Installation", icon='CHECKMARK')

        ar_help_col = ar_box.column(align=True)
        ar_help_col.scale_y = 0.7
        ar_help_col.label(text="Advanced Unity asset extraction and conversion", icon='INFO')

        box = layout.box()
        box.label(text="Unreal Extraction Tools", icon='EXPORT')

        # UModel (UE Viewer) - Standalone tool
        box.label(text="UModel (UE Viewer)", icon='IMPORT')
        umodel_ready, umodel_message = umodel_helpers.status()
        umodel_icon = 'CHECKMARK' if umodel_ready else 'ERROR'
        box.label(text=umodel_message, icon=umodel_icon)
        box.label(text=f"Path: {umodel_helpers.tool_path()}", icon='FILE_FOLDER')

        # Installation button
        install_row = box.row()
        install_row.scale_y = 1.2
        install_row.operator("fo4.check_umodel", text="Auto-Download to D:/blender_tools/", icon='IMPORT')

        # Help text
        help_col = box.column(align=True)
        help_col.scale_y = 0.7
        help_col.label(text="UModel by Konstantin Nosov (Gildor)", icon='INFO')
        help_col.label(text="Tool for viewing/extracting Unreal Engine assets", icon='DOT')

        # Verify installation button
        box.operator("fo4.check_umodel", text="Verify Installation", icon='CHECKMARK')

        # Documentation link for Unreal CLI exporters
        doc_box = box.box()
        doc_box.label(text="Documentation", icon='URL')
        op = doc_box.operator("wm.url_open", text="Unreal CLI Exporters (Epic Docs)")
        op.url = "https://docs.unrealengine.com/5.0/en-US/command-line-arguments-in-unreal-engine/"

        box = layout.box()
        box.label(text="UE Importer", icon='IMPORT')
        ready, message = ue_importer_helpers.status()
        status_icon = 'CHECKMARK' if ready else 'ERROR'
        box.label(text=message, icon=status_icon)
        box.label(text=f"Path: {ue_importer_helpers.importer_path()}", icon='FILE_FOLDER')
        box.operator("fo4.check_ue_importer", text="Check/Install UE Importer", icon='FILE_REFRESH')

        box = layout.box()
        box.label(text="UModel Tools", icon='IMPORT')
        ut_ready, ut_message = umodel_tools_helpers.status()
        ut_icon = 'CHECKMARK' if ut_ready else 'ERROR'
        box.label(text=ut_message, icon=ut_icon)
        box.label(text=f"Path: {umodel_tools_helpers.addon_path()}", icon='FILE_FOLDER')
        box.operator("fo4.check_umodel_tools", text="Check/Install UModel Tools", icon='FILE_REFRESH')

        # Automated installers for external utilities
        box = layout.box()
        box.label(text="Install External Tools", icon='TOOL_SETTINGS')
        box.operator("fo4.install_ffmpeg", text="Install FFmpeg", icon='FILE_REFRESH')
        box.operator("fo4.install_nvtt", text="Install NVTT (nvcompress)", icon='FILE_REFRESH')
        box.operator("fo4.install_texconv", text="Install texconv", icon='FILE_REFRESH')
        box.operator("fo4.install_whisper", text="Install Whisper CLI", icon='FILE_REFRESH')
        box.operator("fo4.install_niftools", text="Install Niftools Add-on", icon='FILE_REFRESH')
        # Python requirements
        op = box.operator("fo4.install_python_deps", text="Install Python Requirements", icon='FILE_REFRESH')
        if op is not None:
            op.optional = False
        op = box.operator("fo4.install_python_deps", text="Install Python Req (optional)", icon='FILE_REFRESH')
        if op is not None:
            op.optional = True
        box.operator("fo4.install_all_tools", text="Install All Tools", icon='PACKAGE')
        box.operator("fo4.self_test", text="Run Environment Self-Test", icon='CHECKMARK')

        # Fallout 4 configuration button
        config_box = layout.box()
        config_box.label(text="Fallout 4 Configuration", icon='SETTINGS')
        config_row = config_box.row()
        config_row.scale_y = 1.5
        config_row.operator("fo4.configure_fallout4_settings", text="Configure for Fallout 4", icon='CHECKMARK')

        config_help = config_box.column(align=True)
        config_help.scale_y = 0.7
        config_help.label(text="Verify and configure optimal settings for FO4 modding", icon='INFO')
        config_help.label(text="Checks: Niftools, DDS tools, export settings", icon='INFO')

        # Manual path override — use existing installations when auto-install fails
        scene = context.scene
        man_box = layout.box()
        man_box.label(text="Manual Path Override", icon='FILE_FOLDER')
        man_box.label(text="Already have a tool? Point to it here.", icon='INFO')
        man_box.prop(scene, "fo4_ffmpeg_path", text="FFmpeg")
        ffmpeg_ok = preferences.get_configured_ffmpeg_path()
        man_box.label(
            text=f"FFmpeg: {'OK ✔' if ffmpeg_ok else 'not found'}",
            icon='CHECKMARK' if ffmpeg_ok else 'ERROR',
        )
        man_box.prop(scene, "fo4_nvtt_path", text="nvcompress")
        nvcompress_ok = preferences.get_configured_nvcompress_path()
        man_box.label(
            text=f"nvcompress: {'OK ✔' if nvcompress_ok else 'not found'}",
            icon='CHECKMARK' if nvcompress_ok else 'ERROR',
        )
        man_box.prop(scene, "fo4_texconv_path", text="texconv")
        texconv_ok = preferences.get_configured_texconv_path()
        man_box.label(
            text=f"texconv: {'OK ✔' if texconv_ok else 'not found'}",
            icon='CHECKMARK' if texconv_ok else 'ERROR',
        )


class FO4_PT_GameAssetsPanel(Panel):
    """Import and convert game assets from Unity, Unreal, and Fallout 4"""
    bl_label = "Game Asset Import"
    bl_idname = "FO4_PT_game_assets_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        obj = context.active_object

        # Convert to Fallout 4 Button (prominent)
        if obj and obj.type == 'MESH':
            convert_box = layout.box()
            convert_box.label(text="Quick Convert", icon='MODIFIER')

            convert_row = convert_box.row()
            convert_row.scale_y = 1.5
            convert_row.operator(
                "fo4.convert_to_fallout4",
                text="Convert to Fallout 4",
                icon='ARROW_LEFTRIGHT'
            )

            help_col = convert_box.column(align=True)
            help_col.scale_y = 0.7
            help_col.label(text="One-click: Mesh prep + Materials + Textures", icon='INFO')
            help_col.label(text="Works on any imported Unity/Unreal/FO4 asset", icon='DOT')
        else:
            layout.label(text="Select a mesh to convert", icon='INFO')

        layout.separator()

        # Fallout 4 Assets
        fo4_box = layout.box()
        fo4_box.label(text="Fallout 4 Assets", icon='GAME')

        from . import fo4_game_assets
        ready, message = fo4_game_assets.FO4GameAssets.get_status()
        status_icon = 'CHECKMARK' if ready else 'ERROR'

        info_col = fo4_box.column(align=True)
        info_col.scale_y = 0.8
        info_col.label(text=message, icon=status_icon)

        if ready:
            fo4_box.operator("fo4.browse_fo4_assets", text="Browse FO4 Assets", icon='VIEWZOOM')
        else:
            fo4_box.label(text="Set path in preferences", icon='PREFERENCES')

        # Unity Assets
        unity_box = layout.box()
        unity_box.label(text="Unity Assets", icon='SNAP_FACE_CENTER')

        from . import unity_game_assets
        ready, message = unity_game_assets.UnityAssets.get_status()
        status_icon = 'CHECKMARK' if ready else 'ERROR'

        info_col = unity_box.column(align=True)
        info_col.scale_y = 0.8
        info_col.label(text=message, icon=status_icon)

        if ready:
            unity_box.operator("fo4.browse_unity_assets", text="Browse Unity Assets", icon='VIEWZOOM')
        else:
            unity_box.label(text="Set path in preferences", icon='PREFERENCES')

        # Unreal Engine Assets
        unreal_box = layout.box()
        unreal_box.label(text="Unreal Engine Assets", icon='MESH_CUBE')

        from . import unreal_game_assets
        ready, message = unreal_game_assets.UnrealAssets.get_status()
        status_icon = 'CHECKMARK' if ready else 'ERROR'

        info_col = unreal_box.column(align=True)
        info_col.scale_y = 0.8
        info_col.label(text=message, icon=status_icon)

        if ready:
            unreal_box.operator("fo4.browse_unreal_assets", text="Browse Unreal Assets", icon='VIEWZOOM')
        else:
            unreal_box.label(text="Set path in preferences", icon='PREFERENCES')

        layout.separator()

        # Quick instructions
        help_box = layout.box()
        help_box.label(text="How to Use", icon='QUESTION')
        help_col = help_box.column(align=True)
        help_col.scale_y = 0.7
        help_col.label(text="1. Set asset paths in addon preferences", icon='DOT')
        help_col.label(text="2. Import asset (FBX/OBJ from browser)", icon='DOT')
        help_col.label(text="3. Click 'Convert to Fallout 4'", icon='DOT')
        help_col.label(text="4. Export as NIF", icon='DOT')


class FO4_PT_ExportPanel(Panel):
    """Export panel for Fallout 4 – NIF/FBX output with full FO4 settings"""
    bl_label = "Export to Fallout 4"
    bl_idname = "FO4_PT_export_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        obj = context.active_object

        # ── Fallout 4 game version ────────────────────────────────────────────
        ver_box = layout.box()
        ver_row = ver_box.row(align=True)
        ver_row.label(text="Game Version:", icon='GAME')
        ver_row.prop(context.scene, "fo4_game_version", text="")
        ver_hint = ver_box.column(align=True)
        ver_hint.scale_y = 0.75
        ver_hint.label(
            text="OG / NG / AE all use NIF 20.2.0.7 · bsver 130 · BSTriShape",
            icon='INFO',
        )

        # ── Niftools exporter status ─────────────────────────────────────────
        nif_box = layout.box()
        available, nif_msg = export_helpers.ExportHelpers.nif_exporter_available()
        if available:
            row = nif_box.row()
            row.label(text="Niftools v0.1.1  ✓ Ready", icon='CHECKMARK')
            sub = nif_box.column(align=True)
            sub.scale_y = 0.75
            sub.label(text="NIF 20.2.0.7 · user ver 12 · uv2 130", icon='INFO')
            sub.label(text="Geometry: BSTriShape  |  Shader: BSLightingShaderProperty", icon='INFO')
            sub.label(text="Tangent space: ON  |  Scale correction: 1.0", icon='INFO')
        else:
            row = nif_box.row()
            row.label(text="Niftools NOT installed", icon='ERROR')
            sub = nif_box.column(align=True)
            sub.scale_y = 0.75
            sub.label(text=nif_msg)
            sub.label(text="Fallback: FBX export (convert with NifSkope)", icon='EXPORT')
            sub.label(text="Install: Blender 3.6 LTS + Niftools v0.1.1 ZIP", icon='URL')

        # ── Active object status ─────────────────────────────────────────────
        obj_box = layout.box()
        if obj and obj.type == 'MESH':
            col = obj_box.column(align=True)
            col.scale_y = 0.8
            mesh = obj.data
            poly_count = len(mesh.polygons)
            uv_ok = bool(mesh.uv_layers)
            scale_ok = obj.scale[:] == (1.0, 1.0, 1.0)
            coll_name = f"UCX_{obj.name}"
            has_coll = any(
                c.name == coll_name or c.get("fo4_collision")
                for c in obj.children
            )

            # Mesh name + poly count with FO4 budget indicator
            budget_icon = 'CHECKMARK' if poly_count <= 65535 else 'ERROR'
            col.label(
                text=f"Mesh: {obj.name}  ({poly_count:,} tris)",
                icon=budget_icon,
            )
            col.label(
                text=f"UV map: {'✓' if uv_ok else '✗ (will be auto-created)'}   "
                     f"Scale applied: {'✓' if scale_ok else '✗ (will be auto-applied)'}",
                icon='INFO',
            )
            col.label(
                text=f"Collision mesh (UCX_): {'✓ ' + coll_name if has_coll else '✗ none – generate below'}",
                icon='INFO',
            )
        elif obj and obj.type != 'MESH':
            obj_box.label(text=f"Active object is not a mesh ({obj.type})", icon='ERROR')
        else:
            obj_box.label(text="No active object selected", icon='ERROR')

        # ── Auto-prep notice ─────────────────────────────────────────────────
        prep_box = layout.box()
        prep_col = prep_box.column(align=True)
        prep_col.scale_y = 0.75
        prep_col.label(text="Auto-preparation before every NIF export:", icon='MODIFIER')
        prep_col.label(text="  • Apply scale & rotation transforms")
        prep_col.label(text="  • Create UV map if missing (smart-unwrap)")
        prep_col.label(text="  • Add Triangulate modifier (removed after export)")
        prep_col.label(text="  • Enable Auto Smooth for tangent vectors")

        # ── Export actions ───────────────────────────────────────────────────
        act_box = layout.box()
        act_box.label(text="Export", icon='EXPORT')

        row = act_box.row(align=True)
        row.scale_y = 1.4
        row.operator("fo4.export_mesh", text="Export Mesh  (.nif)", icon='MESH_DATA')

        row2 = act_box.row(align=True)
        row2.scale_y = 1.2
        row2.operator(
            "fo4.export_mesh_with_collision",
            text="Export Mesh + Collision  (.nif)",
            icon='OBJECT_DATA',
        )

        act_box.separator(factor=0.5)
        act_box.operator("fo4.validate_export", text="Validate Mesh Before Export", icon='CHECKMARK')

        row3 = act_box.row(align=True)
        row3.scale_y = 1.4
        row3.operator(
            "fo4.export_scene_as_nif",
            text="Export Entire Scene as NIF",
            icon='SCENE_DATA',
        )

        act_box.operator("fo4.export_all", text="Export Complete Mod Folder", icon='PACKAGE')

        # ── Mod Folder Import/Export ─────────────────────────────────────────
        mod_box = layout.box()
        mod_box.label(text="Mod Folder Workflow", icon='FILE_FOLDER')

        col = mod_box.column(align=True)
        col.scale_y = 0.75
        col.label(text="Import entire mod folder with structure")
        col.label(text="Export all meshes back to original locations")

        mod_row1 = mod_box.row(align=True)
        mod_row1.scale_y = 1.3
        mod_row1.operator("fo4.import_mod_folder", text="Import Mod Folder", icon='IMPORT')

        mod_row2 = mod_box.row(align=True)
        mod_row2.scale_y = 1.3
        mod_row2.operator("fo4.export_mod_folder", text="Export Mod Folder", icon='EXPORT')


class FO4_PT_BatchProcessingPanel(Panel):
    """Batch processing panel for multiple objects"""
    bl_label = "Batch Processing"
    bl_idname = "FO4_PT_batch_processing_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Info box
        info_box = layout.box()
        info_box.label(text="Select multiple meshes", icon='INFO')
        selected_meshes = [obj for obj in context.selected_objects if obj.type == 'MESH']
        info_box.label(text=f"Selected: {len(selected_meshes)} meshes")
        
        # Batch operations
        box = layout.box()
        box.label(text="Batch Operations", icon='MODIFIER')
        
        row = box.row()
        row.enabled = len(selected_meshes) > 0
        row.operator("fo4.batch_optimize_meshes", text="Batch Optimize", icon='MOD_DECIM')
        
        row = box.row()
        row.enabled = len(selected_meshes) > 0
        row.operator("fo4.batch_validate_meshes", text="Batch Validate", icon='CHECKMARK')
        
        row = box.row()
        row.enabled = len(selected_meshes) > 0
        row.operator("fo4.batch_export_meshes", text="Batch Export", icon='EXPORT')
        
        # Tips
        tips_box = layout.box()
        tips_box.label(text="Tips:", icon='HELP')
        tips_box.label(text="• Select meshes with Shift+Click")
        tips_box.label(text="• Use Box Select (B key)")
        tips_box.label(text="• Processing is sequential")


class FO4_PT_PresetsPanel(Panel):
    """Smart presets panel for quick object creation"""
    bl_label = "Smart Presets"
    bl_idname = "FO4_PT_presets_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Weapon presets
        box = layout.box()
        box.label(text="Weapon Presets", icon='MOD_ARMATURE')
        box.operator("fo4.create_weapon_preset", text="Create Weapon", icon='MESH_CUBE')
        
        # Armor presets
        box = layout.box()
        box.label(text="Armor Presets", icon='MESH_UVSPHERE')
        box.operator("fo4.create_armor_preset", text="Create Armor", icon='MESH_CUBE')
        
        # Prop presets
        box = layout.box()
        box.label(text="Prop Presets", icon='OBJECT_DATA')
        box.operator("fo4.create_prop_preset", text="Create Prop", icon='MESH_CUBE')
        
        # Info
        info_box = layout.box()
        info_box.label(text="About Presets:", icon='INFO')
        info_box.label(text="• Pre-configured for FO4")
        info_box.label(text="• Optimal scale & settings")
        info_box.label(text="• Materials already setup")
        info_box.label(text="• Ready to customize")


class FO4_PT_AutomationQuickPanel(Panel):
    """Automation and quick tools panel"""
    bl_label = "Automation & Quick Tools"
    bl_idname = "FO4_PT_automation_quick_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        
        # Quick prepare
        box = layout.box()
        box.label(text="One-Click Preparation", icon='TOOL_SETTINGS')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.quick_prepare_export", text="Quick Prepare for Export", icon='CHECKMARK')
        row.scale_y = 1.5
        
        # Auto-fix
        box = layout.box()
        box.label(text="Auto-Fix Issues", icon='MODIFIER')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.auto_fix_issues", text="Auto-Fix Common Issues", icon='TOOL_SETTINGS')
        
        # Collision mesh
        box = layout.box()
        box.label(text="Collision Mesh", icon='MESH_ICOSPHERE')
        if obj and obj.type == 'MESH':
            box.prop(obj, "fo4_collision_type", text="Type")
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.set_collision_type", text="Change Type", icon='PRESET')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        op = row.operator("fo4.set_collision_type", text="Change Type (Selected)", icon='PRESET')
        if op is not None:
            op.apply_to_all = True
        row = box.row()
        row.enabled = obj and obj.type == 'MESH' and getattr(obj, 'fo4_collision_type', 'DEFAULT') not in ('NONE','GRASS','MUSHROOM')
        row.operator("fo4.generate_collision_mesh", text="Generate Collision", icon='MESH_DATA')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.export_mesh_with_collision", text="Generate + Export NIF", icon='EXPORT')
        
        # Smart material
        box = layout.box()
        box.label(text="Smart Material", icon='MATERIAL')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.smart_material_setup", text="Auto-Load Textures", icon='FILE_FOLDER')
        
        # What it does
        info_box = layout.box()
        info_box.label(text="Quick Prepare includes:", icon='INFO')
        info_box.label(text="1. Mesh optimization")
        info_box.label(text="2. Material setup")
        info_box.label(text="3. Validation checks")
        info_box.label(text="4. Texture validation")



class FO4_PT_Havok2FBXPanel(Panel):
    """Havok2FBX configuration and animation export settings."""
    bl_label = "Havok2FBX"
    bl_idname = "FO4_PT_havok2fbx_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        prefs = preferences.get_preferences()
        path = preferences.get_havok2fbx_path()
        obj = context.active_object

        # ── Tool path ──────────────────────────────────────────────────────
        path_box = layout.box()
        path_box.label(text="Configure Havok2FBX", icon='FILE_FOLDER')
        if prefs:
            path_box.prop(prefs, "havok2fbx_path", text="Folder")
            row = path_box.row()
            row.operator("fo4.install_havok2fbx", text="Get Havok2FBX", icon='URL')
            row.operator("fo4.check_tool_paths", text="Check Paths", icon='INFO')
        else:
            path_box.label(text="Preferences not available (addon not registered)", icon='ERROR')

        status_row = path_box.row()
        if path:
            status_row.label(text=f"Configured: {path}", icon='CHECKMARK')
        else:
            status_row.label(text="Path not found — set folder above.", icon='ERROR')

        # ── Animation type ─────────────────────────────────────────────────
        type_box = layout.box()
        type_box.label(text="Animation Type", icon='ARMATURE_DATA')
        type_box.prop(scene, "fo4_havok_anim_type", text="")

        # ── Output settings ────────────────────────────────────────────────
        out_box = layout.box()
        out_box.label(text="Output", icon='FILE_FOLDER')
        out_box.prop(scene, "fo4_havok_output_dir", text="Directory")
        out_box.prop(scene, "fo4_havok_anim_name", text="Name Override")

        # ── Playback settings ──────────────────────────────────────────────
        pb_box = layout.box()
        pb_box.label(text="Playback", icon='TIME')
        row = pb_box.row()
        row.prop(scene, "fo4_havok_fps")
        row = pb_box.row()
        row.prop(scene, "fo4_havok_loop")
        row.prop(scene, "fo4_havok_root_motion")
        pb_box.prop(scene, "fo4_havok_force_frame_range")

        # ── FBX export options ─────────────────────────────────────────────
        fbx_box = layout.box()
        fbx_box.label(text="FBX Export Options", icon='EXPORT')
        fbx_box.prop(scene, "fo4_havok_bake_anim")
        fbx_box.prop(scene, "fo4_havok_key_all_bones")
        fbx_box.prop(scene, "fo4_havok_apply_transforms")
        row = fbx_box.row()
        row.prop(scene, "fo4_havok_scale")
        fbx_box.prop(scene, "fo4_havok_simplify_value", slider=True)

        # ── Export button ──────────────────────────────────────────────────
        export_box = layout.box()
        armature_ok = obj is not None and obj.type == 'ARMATURE'
        has_anim = armature_ok and obj.animation_data and obj.animation_data.action
        if not armature_ok:
            export_box.label(text="Select an armature to export.", icon='INFO')
        elif not has_anim:
            export_box.label(text="No active action on armature.", icon='ERROR')
        else:
            action_name = obj.animation_data.action.name
            export_box.label(text=f"Action: {action_name}", icon='ACTION')
        col = export_box.column()
        col.enabled = armature_ok
        col.scale_y = 1.4
        col.operator(
            "fo4.export_animation_havok2fbx",
            text="Export Animation" + (" → HKX" if path else " → FBX"),
            icon='EXPORT',
        )


class FO4_PT_VegetationPanel(Panel):
    """Vegetation and landscaping panel"""
    bl_label = "Vegetation & Landscaping"
    bl_idname = "FO4_PT_vegetation_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        obj = context.active_object
        selected_meshes = [o for o in context.selected_objects if o.type == 'MESH']
        
        # Create vegetation
        box = layout.box()
        box.label(text="Create Vegetation", icon='OUTLINER_OB_FORCE_FIELD')
        box.operator("fo4.create_vegetation_preset", text="Create Vegetation", icon='ADD')
        
        # Scatter vegetation
        box = layout.box()
        box.label(text="Scatter & Distribute", icon='PARTICLE_DATA')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.scatter_vegetation", text="Scatter Vegetation", icon='PARTICLES')
        
        # Combine meshes
        box = layout.box()
        box.label(text="Combine for Performance", icon='MESH_DATA')
        box.label(text=f"Selected: {len(selected_meshes)} meshes")
        row = box.row()
        row.enabled = len(selected_meshes) >= 2
        row.operator("fo4.combine_vegetation_meshes", text="Combine Selected", icon='AUTOMERGE_ON')
        
        # Optimization
        box = layout.box()
        box.label(text="FPS Optimization", icon='SORTTIME')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.optimize_vegetation_fps", text="Optimize for FPS", icon='TIME')
        
        # LOD generation
        box = layout.box()
        box.label(text="LOD System", icon='OUTLINER_OB_MESH')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.create_vegetation_lod_chain", text="Create LOD Chain", icon='MESH_GRID')
        row2 = box.row()
        row2.enabled = obj and obj.type == 'MESH'
        row2.operator("fo4.export_lod_chain_as_nif", text="Export LOD Chain as NIF", icon='EXPORT')
        
        # Wind animation
        box = layout.box()
        box.label(text="Wind Animation", icon='FORCE_WIND')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.generate_wind_weights", text="Generate Wind Weights", icon='MOD_VERTEX_WEIGHT')
        row2 = box.row()
        row2.enabled = obj and obj.type == 'MESH'
        row2.operator("fo4.apply_wind_animation", text="Apply Wind Animation", icon='ANIM')
        row3 = box.row()
        row3.enabled = bool([o for o in context.selected_objects if o.type == 'MESH'])
        row3.operator("fo4.batch_apply_wind_animation", text="Batch: Wind (Selected)", icon='PARTICLES')
        
        # Material setup
        box = layout.box()
        box.label(text="Vegetation Material", icon='MATERIAL')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.setup_vegetation_material",
                     text="Setup Vegetation Material", icon='NODE_MATERIAL')
        sub = box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="Alpha Clip + Two-Sided (for leaves/grass)", icon='INFO')
        sub.label(text="Requires BC3 (DXT5) diffuse texture with alpha", icon='INFO')
        
        # Export
        box = layout.box()
        box.label(text="Export", icon='EXPORT')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.export_vegetation_as_nif",
                     text="Export Vegetation NIF", icon='FILE_BLEND')
        
        # Baking
        box = layout.box()
        box.label(text="Baking", icon='RENDER_STILL')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.bake_vegetation_ao", text="Bake Ambient Occlusion", icon='SHADING_RENDERED')
        
        # Tips
        tips_box = layout.box()
        tips_box.label(text="Workflow Tips:", icon='INFO')
        tips_box.label(text="1. Create vegetation types")
        tips_box.label(text="2. Scatter across area")
        tips_box.label(text="3. Combine for FPS boost")
        tips_box.label(text="4. Generate LODs")
        tips_box.label(text="5. Export as single mesh")


class FO4_PT_QuestPanel(Panel):
    """Quest creation panel"""
    bl_label = "Quest Creation"
    bl_idname = "FO4_PT_quest_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Quest template
        box = layout.box()
        box.label(text="Quest Setup", icon='BOOKMARKS')
        box.operator("fo4.create_quest_template", text="Create Quest Template", icon='ADD')
        box.operator("fo4.export_quest_data", text="Export Quest Data", icon='EXPORT')
        
        # Papyrus script
        box = layout.box()
        box.label(text="Scripting", icon='SCRIPT')
        box.operator("fo4.quest_generate_papyrus_script", text="Generate Papyrus Script", icon='FILE_SCRIPT')
        
        # Info
        info_box = layout.box()
        info_box.label(text="Quest Workflow:", icon='INFO')
        info_box.label(text="1. Create quest template")
        info_box.label(text="2. Define stages & objectives")
        info_box.label(text="3. Generate Papyrus script")
        info_box.label(text="4. Export for Creation Kit")


class FO4_PT_NPCPanel(Panel):
    """NPC and creature creation panel"""
    bl_label = "NPCs & Creatures"
    bl_idname = "FO4_PT_npc_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # NPC creation
        box = layout.box()
        box.label(text="Create NPC", icon='ARMATURE_DATA')
        box.operator("fo4.create_npc", text="Create NPC", icon='ADD')
        
        # Creature creation
        box = layout.box()
        box.label(text="Create Creature", icon='MOD_ARMATURE')
        box.operator("fo4.create_creature", text="Create Creature", icon='ADD')
        
        # Tips
        tips_box = layout.box()
        tips_box.label(text="Tips:", icon='INFO')
        tips_box.label(text="• Customize base mesh")
        tips_box.label(text="• Add armature for animation")
        tips_box.label(text="• Setup materials & textures")
        tips_box.label(text="• Export as FBX for import")


class FO4_PT_WorldBuildingPanel(Panel):
    """World building and cells panel"""
    bl_label = "World Building"
    bl_idname = "FO4_PT_world_building_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Interior cells
        box = layout.box()
        box.label(text="Interior Cells", icon='HOME')
        box.operator("fo4.create_interior_cell", text="Create Interior Cell", icon='ADD')
        box.operator("fo4.create_door_frame", text="Add Door Frame", icon='MESH_PLANE')
        
        # Workshop objects
        box = layout.box()
        box.label(text="Workshop/Settlement", icon='TOOL_SETTINGS')
        box.operator("fo4.create_workshop_object", text="Create Workshop Object", icon='ADD')
        
        # Navigation
        box = layout.box()
        box.label(text="Navigation", icon='ORIENTATION_NORMAL')
        box.operator("fo4.create_navmesh", text="Create NavMesh Helper", icon='MESH_GRID')
        
        # Lighting
        box = layout.box()
        box.label(text="Lighting Presets", icon='LIGHT')
        box.operator("fo4.create_lighting_preset", text="Create Lighting Preset", icon='ADD')
        
        # Info
        info_box = layout.box()
        info_box.label(text="World Building:", icon='INFO')
        info_box.label(text="• Start with cell template")
        info_box.label(text="• Add doors & windows")
        info_box.label(text="• Place workshop objects")
        info_box.label(text="• Setup lighting")
        info_box.label(text="• Create navmesh last")


class FO4_PT_ItemCreationPanel(Panel):
    """Item creation panel"""
    bl_label = "Item Creation"
    bl_idname = "FO4_PT_item_creation_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Weapons
        box = layout.box()
        box.label(text="Weapons", icon='MOD_ARMATURE')
        box.operator("fo4.create_weapon_item", text="Create Weapon", icon='ADD')
        
        # Armor
        box = layout.box()
        box.label(text="Armor", icon='MESH_UVSPHERE')
        box.operator("fo4.create_armor_item", text="Create Armor", icon='ADD')
        box.operator("fo4.create_power_armor_piece", text="Create Power Armor", icon='ADD')
        
        # Consumables
        box = layout.box()
        box.label(text="Consumables", icon='FORCE_LENNARDJONES')
        box.operator("fo4.create_consumable", text="Create Consumable", icon='ADD')
        
        # Misc items
        box = layout.box()
        box.label(text="Misc Items", icon='OBJECT_DATA')
        box.operator("fo4.create_misc_item", text="Create Misc Item", icon='ADD')
        
        # Clutter
        box = layout.box()
        box.label(text="Clutter/Decoration", icon='PROP_OFF')
        box.operator("fo4.create_clutter_object", text="Create Clutter", icon='ADD')
        
        # Info
        info_box = layout.box()
        info_box.label(text="Item Workflow:", icon='INFO')
        info_box.label(text="1. Create item base")
        info_box.label(text="2. Model details")
        info_box.label(text="3. Setup textures")
        info_box.label(text="4. Optimize & validate")
        info_box.label(text="5. Export as FBX")


class FO4_PT_PresetLibraryPanel(Panel):
    """Preset library panel for saving and loading creations"""
    bl_label = "Preset Library"
    bl_idname = "FO4_PT_preset_library_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene
        
        # Save preset section
        box = layout.box()
        box.label(text="Save Preset", icon='FILE_NEW')
        box.operator("fo4.save_preset", text="Save Current Objects", icon='ADD')
        
        # Category filter
        box = layout.box()
        box.label(text="Browse Library", icon='BOOKMARKS')
        box.prop(scene, "fo4_preset_filter_category", text="Category")
        box.prop(scene, "fo4_preset_search", text="", icon='VIEWZOOM')
        box.operator("fo4.refresh_preset_library", text="Refresh", icon='FILE_REFRESH')
        
        # Recent presets
        from . import preset_library
        recent = preset_library.PresetLibrary.get_recent_presets(5)
        
        if recent:
            recent_box = layout.box()
            recent_box.label(text="Recent Presets", icon='TIME')
            for preset in recent:
                row = recent_box.row()
                row.label(text=preset['name'], icon='FILE')
                op = row.operator("fo4.load_preset", text="", icon='IMPORT')
                op.filepath = preset['filepath']
                op = row.operator("fo4.delete_preset", text="", icon='TRASH')
                op.filepath = preset['filepath']
        
        # Popular presets
        popular = preset_library.PresetLibrary.get_popular_presets(5)
        if popular:
            pop_box = layout.box()
            pop_box.label(text="Most Used", icon='SOLO_ON')
            for preset in popular:
                row = pop_box.row()
                uses = preset.get('use_count', 0)
                row.label(text=f"{preset['name']} ({uses}x)", icon='FILE')
                op = row.operator("fo4.load_preset", text="", icon='IMPORT')
                op.filepath = preset['filepath']
        
        # Info
        info_box = layout.box()
        info_box.label(text="Preset Library:", icon='INFO')
        info_box.label(text="• Save any creation for reuse")
        info_box.label(text="• Load presets instantly")
        info_box.label(text="• Search by name/tags")
        info_box.label(text="• Track usage statistics")


class FO4_PT_AutomationMacrosPanel(Panel):
    """Automation and macro system panel"""
    bl_label = "Automation & Macros"
    bl_idname = "FO4_PT_automation_macros_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene
        
        # Recording controls
        box = layout.box()
        box.label(text="Macro Recording", icon='REC')
        
        if scene.fo4_is_recording:
            box.label(text="● RECORDING", icon='RADIOBUT_ON')
            from . import automation_system
            action_count = len(automation_system.AutomationSystem.recorded_actions)
            box.label(text=f"Actions recorded: {action_count}")
            box.operator("fo4.stop_recording", text="Stop Recording", icon='SNAP_FACE')
        else:
            box.operator("fo4.start_recording", text="Start Recording", icon='REC')
            box.label(text="Record your actions to create macros")
        
        # Save macro
        if not scene.fo4_is_recording:
            from . import automation_system
            if automation_system.AutomationSystem.recorded_actions:
                save_box = layout.box()
                save_box.label(text="Save Recorded Macro", icon='FILE_NEW')
                save_box.operator("fo4.save_macro", text="Save as Macro", icon='FILE_TICK')
        
        # Workflow templates
        template_box = layout.box()
        template_box.label(text="Workflow Templates", icon='SCRIPT')
        template_box.operator("fo4.execute_workflow_template", text="Execute Template", icon='PLAY')
        
        # Saved macros
        from . import automation_system
        macros = automation_system.AutomationSystem.get_all_macros()
        
        if macros:
            macro_box = layout.box()
            macro_box.label(text="Saved Macros", icon='BOOKMARKS')
            for macro in macros[:10]:  # Show first 10
                row = macro_box.row()
                action_count = macro.get('action_count', 0)
                row.label(text=f"{macro['name']} ({action_count} steps)", icon='SCRIPT')
                op = row.operator("fo4.execute_macro", text="", icon='PLAY')
                op.filepath = macro['filepath']
                op = row.operator("fo4.delete_macro", text="", icon='TRASH')
                op.filepath = macro['filepath']
        
        # Info
        info_box = layout.box()
        info_box.label(text="Automation Features:", icon='INFO')
        info_box.label(text="• Record repetitive tasks")
        info_box.label(text="• Replay macros instantly")
        info_box.label(text="• Use workflow templates")
        info_box.label(text="• Boost productivity 10x")


class FO4_PT_PostProcessingPanel(Panel):
    """Fallout 4 post-processing compositor preview and ImageSpace export"""
    bl_label = "Post-Processing (FO4)"
    bl_idname = "FO4_PT_post_processing_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # ── Setup & Presets ──────────────────────────────────────────────────
        setup_box = layout.box()
        setup_box.label(text="Compositor Setup", icon='NODE_COMPOSITING')
        row = setup_box.row(align=True)
        row.operator("fo4.setup_post_processing",
                     text="Setup Compositor", icon='NODETREE')
        row.operator("fo4.clear_post_processing",
                     text="Clear", icon='X')

        preset_box = layout.box()
        preset_box.label(text="Quick Presets", icon='PRESET')
        preset_box.prop(scene, "fo4_pp_preset", text="")
        op = preset_box.operator("fo4.apply_pp_preset",
                                 text="Apply Preset", icon='CHECKMARK')
        op.preset = getattr(scene, "fo4_pp_preset", "VANILLA")

        # ── Bloom ────────────────────────────────────────────────────────────
        bloom_box = layout.box()
        bloom_box.label(text="Bloom (CK: BloomScale / BloomBlurRadius)",
                        icon='LIGHT_SUN')
        col = bloom_box.column(align=True)
        col.prop(scene, "fo4_pp_bloom_strength",  text="Strength")
        col.prop(scene, "fo4_pp_bloom_threshold", text="Threshold")
        col.prop(scene, "fo4_pp_bloom_radius",    text="Radius")

        # ── Colour Grading ───────────────────────────────────────────────────
        color_box = layout.box()
        color_box.label(text="Colour Grading (CK: Saturation / Contrast)",
                        icon='COLOR')
        col = color_box.column(align=True)
        col.prop(scene, "fo4_pp_saturation",  text="Saturation")
        col.prop(scene, "fo4_pp_contrast",    text="Contrast")
        col.prop(scene, "fo4_pp_brightness",  text="Brightness")

        # ── Tint ─────────────────────────────────────────────────────────────
        tint_box = layout.box()
        tint_box.label(text="Screen Tint (CK: TintColor R/G/B/A)", icon='RESTRICT_COLOR_OFF')
        row = tint_box.row(align=True)
        row.prop(scene, "fo4_pp_tint_r", text="R")
        row.prop(scene, "fo4_pp_tint_g", text="G")
        row.prop(scene, "fo4_pp_tint_b", text="B")
        tint_box.prop(scene, "fo4_pp_tint_strength", text="Strength")

        # ── Vignette & Cinematic ─────────────────────────────────────────────
        vfx_box = layout.box()
        vfx_box.label(text="Vignette & Cinematic", icon='ZOOM_OUT')
        vfx_box.prop(scene, "fo4_pp_vignette",        text="Vignette")
        vfx_box.prop(scene, "fo4_pp_cinematic_bars",  text="Cinematic Bars")

        # ── Depth of Field ───────────────────────────────────────────────────
        dof_box = layout.box()
        dof_box.label(text="Depth of Field", icon='CAMERA_DATA')
        dof_box.prop(scene, "fo4_pp_dof_enabled", text="Enable DoF")
        row = dof_box.row()
        row.enabled = getattr(scene, "fo4_pp_dof_enabled", False)
        row.prop(scene, "fo4_pp_dof_fstop", text="f-stop")

        # ── CK-Only Fields ───────────────────────────────────────────────────
        ck_box = layout.box()
        ck_box.label(text="Creation Kit Only (no compositor preview)",
                     icon='EXPORT')
        col = ck_box.column(align=True)
        col.prop(scene, "fo4_pp_eye_adapt_speed",    text="Eye Adapt Speed")
        col.prop(scene, "fo4_pp_eye_adapt_strength", text="Eye Adapt Strength")
        col.prop(scene, "fo4_pp_white",              text="White Level")

        # ── Export ───────────────────────────────────────────────────────────
        export_box = layout.box()
        export_box.label(text="Export for Creation Kit", icon='EXPORT')
        export_box.operator("fo4.export_imagespace_data",
                            text="Export ImageSpace JSON", icon='FILE_TEXT')
        export_box.operator("fo4.sync_pp_props",
                            text="Sync to Compositor", icon='FILE_REFRESH')

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Workflow:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="1. Click 'Setup Compositor'")
        sub.label(text="2. Set viewport to Rendered mode")
        sub.label(text="3. Adjust sliders for real-time preview")
        sub.label(text="4. Export JSON → enter values in CK IMGS record")


class FO4_PT_MaterialBrowserPanel(Panel):
    """FO4 material preset browser – apply pre-built surface materials"""
    bl_label = "Material Browser (FO4)"
    bl_idname = "FO4_PT_material_browser_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene = context.scene

        # ── Preset selector ──────────────────────────────────────────────────
        sel_box = layout.box()
        sel_box.label(text="Surface Material Preset", icon='MATERIAL')
        sel_box.prop(scene, "fo4_mat_preset", text="")
        sel_box.prop(scene, "fo4_mat_apply_all", text="Apply to All Selected")
        op = sel_box.operator("fo4.apply_material_preset",
                              text="Apply to Selection", icon='CHECKMARK')
        op.preset      = getattr(scene, "fo4_mat_preset", "RUSTY_METAL")
        op.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

        # ── Quick-apply buttons by category ─────────────────────────────────
        if fo4_material_browser:
            # Metals
            m_box = layout.box()
            m_box.label(text="Metals", icon='MATERIAL_DATA')
            row = m_box.row(align=True)
            for pid in ("RUSTY_METAL", "CLEAN_METAL", "GALVANIZED_METAL", "VAULT_METAL"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

            # Stone & Ground
            s_box = layout.box()
            s_box.label(text="Stone & Ground", icon='MESH_CUBE')
            row = s_box.row(align=True)
            for pid in ("CRACKED_CONCRETE", "SMOOTH_CONCRETE", "STONE", "ASPHALT"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

            # Organic & Fabric
            o_box = layout.box()
            o_box.label(text="Organic & Fabric", icon='MESH_UVSPHERE')
            row = o_box.row(align=True)
            for pid in ("WOOD_PLANK", "LEATHER", "FABRIC_CLOTH", "HUMAN_SKIN"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

            # Special / Emissive
            e_box = layout.box()
            e_box.label(text="Special / Emissive", icon='LIGHT_SUN')
            row = e_box.row(align=True)
            for pid in ("NEON_LIGHT", "TERMINAL_SCREEN", "POWER_ARMOR_PAINT", "GLASS_CLEAR"):
                label = fo4_material_browser.PRESETS[pid]["label"].split()[0]
                r = row.operator("fo4.apply_material_preset", text=label)
                r.preset = pid
                r.apply_all_selected = getattr(scene, "fo4_mat_apply_all", True)

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Workflow:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="1. Select your mesh object(s)")
        sub.label(text="2. Pick a surface type")
        sub.label(text="3. Click 'Apply to Selection'")
        sub.label(text="4. Connect your texture images to the")
        sub.label(text="   Diffuse/Normal/Specular nodes")
        sub.label(text="5. Convert textures to DDS in NVTT panel")


class FO4_PT_SceneDiagnosticsPanel(Panel):
    """Comprehensive FO4 scene health / export-readiness dashboard"""
    bl_label = "Scene Diagnostics"
    bl_idname = "FO4_PT_scene_diagnostics_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Score header ────────────────────────────────────────────────────
        score   = getattr(scene, "fo4_diag_last_score",    -1)
        errors  = getattr(scene, "fo4_diag_last_errors",    0)
        warns   = getattr(scene, "fo4_diag_last_warnings",  0)
        ready   = getattr(scene, "fo4_diag_export_ready",   False)

        score_box = layout.box()
        if score < 0:
            score_box.label(text="No diagnostics run yet", icon='QUESTION')
        else:
            icon = 'CHECKMARK' if ready else ('ERROR' if errors > 0 else 'INFO')
            score_box.label(
                text=f"Score: {score}/100  |  {errors} error(s)  {warns} warning(s)",
                icon=icon,
            )
            if ready:
                score_box.label(text="✅ Scene is export-ready", icon='CHECKMARK')
            elif errors > 0:
                score_box.label(text="❌ Fix errors before exporting", icon='ERROR')

        # ── Action buttons ───────────────────────────────────────────────────
        btn_row = layout.row(align=True)
        btn_row.operator("fo4.run_scene_diagnostics",
                         text="Run Diagnostics", icon='VIEWZOOM')
        btn_row.operator("fo4.auto_fix_diagnostics",
                         text="Auto-Fix", icon='TOOL_SETTINGS')

        # ── Per-object results (from stored report) ──────────────────────────
        if fo4_scene_diagnostics:
            report = fo4_scene_diagnostics.load_report()
            if report and report.get("objects"):
                results_box = layout.box()
                results_box.label(text="Per-Object Results:", icon='OBJECT_DATA')
                for obj_r in report["objects"]:
                    obj_name = obj_r.get("name", "?")
                    obj_err  = obj_r.get("error_count",   0)
                    obj_warn = obj_r.get("warning_count", 0)
                    obj_poly = obj_r.get("poly_count",    0)

                    if obj_err > 0:
                        icon = 'ERROR'
                    elif obj_warn > 0:
                        icon = 'INFO'
                    else:
                        icon = 'CHECKMARK'

                    row = results_box.row(align=True)
                    row.label(
                        text=f"{obj_name} ({obj_poly:,} polys)",
                        icon=icon,
                    )
                    if obj_err > 0 or obj_warn > 0:
                        row.label(text=f"E:{obj_err} W:{obj_warn}")

        # ── Export report ────────────────────────────────────────────────────
        exp_box = layout.box()
        exp_box.label(text="Export Report", icon='FILE_TEXT')
        exp_box.prop(scene, "fo4_diag_report_path", text="")
        exp_box.operator("fo4.export_diagnostics_report",
                         text="Save Diagnostics Report", icon='EXPORT')

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Checks performed:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="• Polygon count (≤ 65,535)")
        sub.label(text="• UV map, scale applied")
        sub.label(text="• Triangulation, loose verts")
        sub.label(text="• Material / texture nodes")
        sub.label(text="• Collision mesh (UCX_)")
        sub.label(text="• Rigging: bones, root, VGs")
        sub.label(text="• Naming (no spaces/non-ASCII)")


class FO4_PT_ReferenceObjectsPanel(Panel):
    """FO4 scale reference objects panel"""
    bl_label = "Scale References"
    bl_idname = "FO4_PT_reference_objects_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Add reference ────────────────────────────────────────────────────
        add_box = layout.box()
        add_box.label(text="Add Scale Reference", icon='EMPTY_AXIS')
        add_box.prop(scene, "fo4_ref_type", text="")
        op = add_box.operator("fo4.add_reference_object",
                              text="Add to Scene", icon='ADD')
        op.ref_type = getattr(scene, "fo4_ref_type", "HUMAN_MALE")

        # ── Quick-add buttons ────────────────────────────────────────────────
        quick_box = layout.box()
        quick_box.label(text="Quick Add:", icon='OBJECT_DATA')

        row = quick_box.row(align=True)
        for rid in ("HUMAN_MALE", "HUMAN_FEMALE", "POWER_ARMOR"):
            r = row.operator("fo4.add_reference_object",
                             text=fo4_reference_helpers.REFERENCES[rid]["label"].split('(')[0].strip()
                             if fo4_reference_helpers else rid)
            r.ref_type = rid

        row2 = quick_box.row(align=True)
        for rid in ("PRE_WAR_CAR", "DOOR_FRAME", "CUBE_1M"):
            r = row2.operator("fo4.add_reference_object",
                              text=fo4_reference_helpers.REFERENCES[rid]["label"].split('(')[0].strip()
                              if fo4_reference_helpers else rid)
            r.ref_type = rid

        # ── Clear ────────────────────────────────────────────────────────────
        layout.operator("fo4.clear_reference_objects",
                        text="Remove All References", icon='X')

        # ── Info ─────────────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="FO4 Scale Guide:", icon='INFO')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="• Human male:   1.28 BU tall")
        sub.label(text="• Power Armor:  1.72 BU tall")
        sub.label(text="• Deathclaw:    2.20 BU tall")
        sub.label(text="• Door frame:   1.80 BU tall")
        sub.label(text="• 1 m cube:     0.70 BU")
        sub.label(text="(1 BU ≈ 100 NIF units ≈ 1.4375 cm)")
        sub.label(text="References are wire-only, non-renderable,")
        sub.label(text="non-selectable and export-skipped.")


# ── Papyrus Script Templates Panel ────────────────────────────────────────────

class FO4_PT_PapyrusPanel(Panel):
    """Generate Papyrus scripts for Fallout 4 mods"""
    bl_label    = "Papyrus Scripts"
    bl_idname   = "FO4_PT_papyrus_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id   = "FO4_PT_main_panel"
    bl_options  = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Script metadata ───────────────────────────────────────────────────
        meta_box = layout.box()
        meta_box.label(text="Script Settings", icon='SCRIPT')
        meta_box.prop(scene, "fo4_papyrus_template",    text="Type")
        meta_box.prop(scene, "fo4_papyrus_script_name", text="Script Name")
        meta_box.prop(scene, "fo4_papyrus_mod_name",    text="Mod Prefix")

        # ── Generate / preview ────────────────────────────────────────────────
        gen_box = layout.box()
        gen_box.label(text="Generate", icon='FILE_SCRIPT')
        gen_box.operator("fo4.generate_papyrus_script",
                         text="Preview in Text Editor", icon='SCRIPT')
        gen_box.label(text="→ Opens in Blender Text Editor", icon='BLANK1')

        # ── Export ────────────────────────────────────────────────────────────
        exp_box = layout.box()
        exp_box.label(text="Export to Disk", icon='EXPORT')
        exp_box.prop(scene, "fo4_papyrus_output_dir", text="Output Folder")
        exp_box.operator("fo4.export_papyrus_script",
                         text="Export .psc File", icon='FILE_TICK')

        # ── Compile guide ─────────────────────────────────────────────────────
        info_box = layout.box()
        info_box.label(text="Compilation", icon='INFO')
        info_box.operator("fo4.papyrus_compile_instructions",
                          text="Show Compile Instructions", icon='HELP')
        sub = info_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="1. Place .psc in Data/Scripts/Source/User/")
        sub.label(text="2. Compile in Creation Kit (Gameplay → Papyrus)")
        sub.label(text="   or with PapyrusCompiler.exe from command line")
        sub.label(text="3. Attach compiled .pex to your form in the CK")
        sub.label(text="   (form → Scripts tab → Add → script name)")


# ── Havok Physics Panel ───────────────────────────────────────────────────────

class FO4_PT_HavokPhysicsPanel(Panel):
    """Havok rigid-body physics setup for FO4 NIF export"""
    bl_label    = "Havok Physics"
    bl_idname   = "FO4_PT_havok_physics_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id   = "FO4_PT_main_panel"
    bl_options  = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        obj    = context.active_object

        # ── Preset selector ───────────────────────────────────────────────────
        preset_box = layout.box()
        preset_box.label(text="Physics Preset", icon='RIGID_BODY')
        preset_box.prop(scene, "fo4_physics_preset", text="")
        preset_box.operator("fo4.apply_physics_preset",
                            text="Apply to Selected", icon='PHYSICS')

        # ── Active object summary ─────────────────────────────────────────────
        if obj and obj.type == 'MESH':
            status_box = layout.box()
            status_box.label(
                text=f"Active: {obj.name}", icon='OBJECT_DATA')
            rb = obj.rigid_body
            if rb:
                col = status_box.column(align=True)
                col.scale_y = 0.85
                layer  = obj.get("fo4_collision_layer", "–")
                motion = obj.get("fo4_motion_type",     "–")
                mass   = obj.get("fo4_havok_mass",      rb.mass)
                fric   = obj.get("fo4_havok_friction",  rb.friction)
                rest   = obj.get("fo4_havok_restitution", rb.restitution)
                qual   = obj.get("fo4_havok_quality",   "–")
                col.label(text=f"Layer:       {layer}")
                col.label(text=f"Motion:      {motion}")
                col.label(text=f"Quality:     {qual}")
                col.label(text=f"Mass:        {mass:.2f} kg")
                col.label(text=f"Friction:    {fric:.2f}")
                col.label(text=f"Restitution: {rest:.2f}")
            else:
                status_box.label(text="No rigid body (no physics)", icon='ERROR')

            # ── Validate ─────────────────────────────────────────────────────
            status_box.operator("fo4.validate_physics",
                                text="Validate Physics", icon='CHECKMARK')

            # ── Live warnings ─────────────────────────────────────────────────
            if getattr(scene, "fo4_physics_show_warnings", True):
                try:
                    from . import fo4_physics_helpers
                    warns = fo4_physics_helpers.PhysicsHelpers.validate_physics(obj)
                    if warns:
                        warn_box = layout.box()
                        warn_box.label(text="Warnings:", icon='ERROR')
                        for w in warns:
                            warn_box.label(text=w, icon='DOT')
                except Exception:
                    pass
        else:
            layout.label(text="Select a mesh object", icon='INFO')

        # ── Reference table ───────────────────────────────────────────────────
        ref_box = layout.box()
        ref_box.label(text="Common FO4 Layer Guide:", icon='INFO')
        ref_box.prop(scene, "fo4_physics_show_warnings",
                     text="Show live warnings")
        sub = ref_box.column(align=True)
        sub.scale_y = 0.75
        sub.label(text="L_STATIC (1)        – immoveable world geo")
        sub.label(text="L_ANIMSTATIC (2)    – doors, animated statics")
        sub.label(text="L_PROPS (7)         – moveable physics props")
        sub.label(text="L_DEBRIS_SMALL (8)  – gibs / small debris")
        sub.label(text="L_TREES (35)        – trees / foliage")
        sub.label(text="FIXED: mass = 0  |  DYNAMIC: mass > 0")


# ── Mod Packaging Panel ───────────────────────────────────────────────────────

class FO4_PT_ModPackagingPanel(Panel):
    """Create, document, and validate a complete FO4 mod package"""
    bl_label    = "Mod Packaging"
    bl_idname   = "FO4_PT_mod_packaging_panel"
    bl_space_type  = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id   = "FO4_PT_main_panel"
    bl_options  = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene

        # ── Mod identity ──────────────────────────────────────────────────────
        id_box = layout.box()
        id_box.label(text="Mod Identity", icon='INFO')
        id_box.prop(scene, "fo4_mod_name",        text="Name")
        id_box.prop(scene, "fo4_mod_author",       text="Author")
        id_box.prop(scene, "fo4_mod_version",      text="Version")
        id_box.prop(scene, "fo4_mod_fo4_version",  text="Min FO4 Ver.")
        id_box.prop(scene, "fo4_mod_plugin_name",  text="Plugin (.esp)")
        id_box.prop(scene, "fo4_mod_description",  text="Description")
        id_box.prop(scene, "fo4_mod_website",      text="Nexus URL")

        # ── Root folder ───────────────────────────────────────────────────────
        root_box = layout.box()
        root_box.label(text="Mod Root Folder", icon='FILE_FOLDER')
        root_box.prop(scene, "fo4_mod_root", text="")

        # ── Structure ─────────────────────────────────────────────────────────
        struct_box = layout.box()
        struct_box.label(text="1 · Create Directory Structure", icon='FILEBROWSER')
        struct_box.operator("fo4.create_mod_structure",
                            text="Create Data/ + FOMOD Folders", icon='ADD')
        struct_box.label(
            text="Creates: Data/meshes/, textures/, scripts/, fomod/, …",
            icon='BLANK1')

        # ── FOMOD ─────────────────────────────────────────────────────────────
        fomod_box = layout.box()
        fomod_box.label(text="2 · FOMOD Installer", icon='PACKAGE')
        fomod_box.operator("fo4.generate_fomod",
                           text="Generate info.xml + ModuleConfig.xml", icon='FILE_TICK')
        fomod_box.label(text="Compatible with Vortex, MO2, NMM", icon='BLANK1')

        # ── README ────────────────────────────────────────────────────────────
        readme_box = layout.box()
        readme_box.label(text="3 · README", icon='TEXT')
        readme_box.operator("fo4.generate_readme",
                            text="Generate README.md", icon='FILE_TICK')
        readme_box.label(text="Nexus-ready with all standard sections",
                         icon='BLANK1')

        # ── Validate + manifest ───────────────────────────────────────────────
        val_box = layout.box()
        val_box.label(text="4 · Validate & Manifest", icon='CHECKMARK')
        val_box.operator("fo4.validate_mod_structure",
                         text="Validate Mod Structure", icon='ZOOM_ALL')
        val_box.operator("fo4.export_mod_manifest",
                         text="Export mod_manifest.json", icon='EXPORT')

        # ── BA2 packing guide ─────────────────────────────────────────────────
        ba2_box = layout.box()
        ba2_box.label(text="5 · Pack into BA2 Archive", icon='PACKAGE')
        ba2_box.label(text="pack_ba2.bat / pack_ba2.sh are written to the",
                      icon='BLANK1')
        ba2_box.label(text="mod root by 'Create Structure'. Edit paths and",
                      icon='BLANK1')
        ba2_box.label(text="run to call Archive2.exe automatically.",
                      icon='BLANK1')


class FO4_PT_AddonIntegrationPanel(Panel):
    """Third-party add-on integration panel"""
    bl_label = "Add-on Integrations"
    bl_idname = "FO4_PT_addon_integration_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        # Scan for add-ons
        box = layout.box()
        box.label(text="Useful Add-ons for FO4", icon='PLUGIN')
        
        from . import addon_integration
        detected = addon_integration.AddonIntegrationSystem.scan_for_known_addons()
        
        for addon in detected:
            addon_box = layout.box()
            
            # Status indicator
            if addon['is_enabled']:
                status_icon = 'CHECKMARK'
                status_text = "Enabled"
            elif addon['is_installed']:
                status_icon = 'DOT'
                status_text = "Installed (not enabled)"
            else:
                status_icon = 'X'
                status_text = "Not installed"
            
            row = addon_box.row()
            row.label(text=addon['name'], icon=status_icon)
            row.label(text=status_text)
            
            addon_box.label(text=addon['description'])
            
            # FO4 use case
            use_box = addon_box.box()
            use_box.label(text="FO4 Use:", icon='INFO')
            use_box.label(text=addon['fo4_use_cases'])
            
            # Download link if not installed
            if not addon['is_installed']:
                addon_box.label(text=f"Get it: {addon.get('download_url', 'Search online')}")
        
        # Integration tutorials
        integrations_box = layout.box()
        integrations_box.label(text="Integration Tutorials", icon='HELP')
        integrations_box.label(text="Tutorials show how to use these")
        integrations_box.label(text="add-ons with FO4 modding")
        
        # Info
        info_box = layout.box()
        info_box.label(text="Add-on Integration:", icon='INFO')
        info_box.label(text="• Detects useful add-ons")
        info_box.label(text="• Provides FO4-specific tutorials")
        info_box.label(text="• Seamless workflow integration")
        info_box.label(text="• Community integration packs")


class FO4_PT_DesktopTutorialPanel(Panel):
    """Desktop tutorial app connection panel"""
    bl_label = "Desktop Tutorial App"
    bl_idname = "FO4_PT_desktop_tutorial_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        scene = context.scene
        
        # Connection status
        status_box = layout.box()
        status_box.label(text="Connection Status", icon='LINKED')
        
        if scene.fo4_desktop_connected:
            status_box.label(text="✓ Connected", icon='CHECKMARK')
            
            # Server info
            from . import desktop_tutorial_client
            status = desktop_tutorial_client.DesktopTutorialClient.get_connection_status()
            status_box.label(text=f"Server: {status['server_url']}")
            
            # Disconnect button
            status_box.operator("fo4.disconnect_desktop_app", text="Disconnect", icon='UNLINKED')
        else:
            status_box.label(text="✗ Not Connected", icon='X')
            
            # Connection settings
            status_box.prop(scene, "fo4_desktop_server_host", text="Host")
            status_box.prop(scene, "fo4_desktop_server_port", text="Port")
            
            # Connect button
            status_box.operator("fo4.connect_desktop_app", text="Connect", icon='LINKED')

        # Check connection (always visible)
        status_box.operator("fo4.check_desktop_connection", text="Check Connection", icon='QUESTION')
        
        # Tutorial sync controls (only when connected)
        if scene.fo4_desktop_connected:
            layout.separator()
            
            sync_box = layout.box()
            sync_box.label(text="Tutorial Synchronization", icon='FILE_REFRESH')
            
            # Current step info
            if scene.fo4_desktop_current_step_title:
                sync_box.label(text=f"Step: {scene.fo4_desktop_current_step_title}")
                if scene.fo4_desktop_last_sync:
                    sync_box.label(text=f"Synced: {scene.fo4_desktop_last_sync}")
            
            # Navigation buttons
            row = sync_box.row(align=True)
            row.operator("fo4.desktop_previous_step", text="", icon='TRIA_LEFT')
            row.operator("fo4.sync_desktop_step", text="Sync Step", icon='FILE_REFRESH')
            row.operator("fo4.desktop_next_step", text="", icon='TRIA_RIGHT')
            
            # Progress button
            sync_box.operator("fo4.get_desktop_progress", text="Get Progress", icon='INFO')
            sync_box.operator("fo4.send_event_to_desktop", text="Send Event", icon='EXPORT')
        
        # Info
        info_box = layout.box()
        info_box.label(text="Desktop Tutorial App:", icon='INFO')
        info_box.label(text="• Connect to external tutorial app")
        info_box.label(text="• Synchronize tutorial steps")
        info_box.label(text="• Bi-directional communication")
        info_box.label(text="• Track tutorial progress")
        
        if not scene.fo4_desktop_connected:
            info_box.separator()
            info_box.label(text="Start the desktop server first:")
            info_box.label(text="python example_tutorial_server.py")


class FO4_PT_SetupPanel(Panel):
    """First-run setup panel: shows dependency status and one-click install."""
    bl_label = "Setup & Status"
    bl_idname = "FO4_PT_setup_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"

    def draw(self, context):
        import sys as _sys
        import importlib.util
        layout = self.layout

        # ── Blender / Python version ──────────────────────────────────────
        ver_box = layout.box()
        ver_box.label(text="Environment", icon='INFO')
        blender_ver = ".".join(str(v) for v in bpy.app.version)
        py_ver = f"{_sys.version_info.major}.{_sys.version_info.minor}.{_sys.version_info.micro}"
        ver_box.label(text=f"Blender {blender_ver}  |  Python {py_ver}")

        py = (_sys.version_info.major, _sys.version_info.minor)
        if py < (3, 8):
            ver_box.label(text="⚠ Python 3.7: using Pillow<10, numpy<2", icon='ERROR')
        elif py >= (3, 11):
            ver_box.label(text="✓ Python 3.11+ — all packages supported", icon='CHECKMARK')

        # ── Core Python dependencies ──────────────────────────────────────
        box = layout.box()
        box.label(text="Core Python Dependencies", icon='SCRIPT')
        core_deps = [
            ("PIL",      "Pillow (image processing)"),
            ("numpy",    "NumPy (math / 3D data)"),
            ("requests", "Requests (HTTP / downloads)"),
            ("trimesh",  "trimesh (3D mesh processing)"),
            ("PyPDF2",   "PyPDF2 (PDF parsing)"),
        ]
        all_ok = True
        for mod, label in core_deps:
            found = importlib.util.find_spec(mod) is not None
            icon = 'CHECKMARK' if found else 'ERROR'
            prefix = "✓" if found else "✗"
            box.label(text=f"{prefix}  {label}", icon=icon)
            if not found:
                all_ok = False

        if not all_ok:
            box.separator()
            box.label(text="Click below to install missing packages:", icon='INFO')
            box.operator("fo4.install_python_deps", text="Install Core Dependencies",
                         icon='PACKAGE')
            box.separator()
            box.label(text="Restart Blender after installing.", icon='ERROR')
        else:
            box.separator()
            box.label(text="All core dependencies ready!", icon='CHECKMARK')

        # ── Quick actions ─────────────────────────────────────────────────
        row = layout.row(align=True)
        row.operator("fo4.self_test", text="Environment Check", icon='CHECKMARK')
        row.operator("fo4.install_python_deps", text="Re-install Deps", icon='FILE_REFRESH')
        # Reload button removed - causes crashes in Blender 4.5+
        # Users should restart Blender to reload the addon
        # layout.operator("fo4.reload_addon", text="Reload Add-on", icon='FILE_REFRESH')



class FO4_PT_SettingsPanel(Panel):
    """Add-on settings – all in the 3D Viewport (no Blender Preferences needed)"""
    bl_label = "Settings"
    bl_idname = "FO4_PT_settings_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        scene  = context.scene
        import os

        # ── User Interface ────────────────────────────────────────────────────
        ui_box = layout.box()
        ui_box.label(text="User Interface", icon="PREFERENCES")
        ui_box.prop(scene, "fo4_mesh_panel_unified",
                    text="Unified Mesh Panel")
        ui_box.label(
            text="Show all mesh helpers in one box (vs split basic/advanced)",
            icon='BLANK1',
        )

        # ── Asset Paths ───────────────────────────────────────────────────────
        paths_box = layout.box()
        paths_box.label(text="Asset Paths", icon="FILE_FOLDER")
        paths_box.prop(scene, "fo4_assets_path",         text="Fallout 4 Assets")
        paths_box.prop(scene, "fo4_unity_assets_path",   text="Unity Assets")
        paths_box.prop(scene, "fo4_unreal_assets_path",  text="Unreal Assets")

        # ── Tool Paths ────────────────────────────────────────────────────────
        tools_box = layout.box()
        tools_box.label(text="Tool Paths", icon="TOOL_SETTINGS")

        tools_box.prop(scene, "fo4_havok2fbx_path", text="Havok2FBX Folder")
        h_path = bpy.path.abspath(scene.fo4_havok2fbx_path) if scene.fo4_havok2fbx_path else ""
        if h_path and os.path.isdir(h_path):
            tools_box.label(text=f"✓ {h_path}", icon="CHECKMARK")
        else:
            tools_box.label(text="Path not found – set to your Havok2FBX folder",
                            icon="ERROR")

        tools_box.separator()
        tools_box.label(text="Texture Converters:", icon="IMAGE_DATA")
        tools_box.prop(scene, "fo4_nvtt_path",    text="nvcompress / NVTT folder")
        tools_box.prop(scene, "fo4_texconv_path", text="texconv / DirectXTex folder")

        nvcompress = preferences.get_configured_nvcompress_path()
        texconv    = preferences.get_configured_texconv_path()
        if nvcompress:
            tools_box.label(text=f"✓ nvcompress: {nvcompress}", icon="CHECKMARK")
        else:
            tools_box.label(text="nvcompress not configured", icon="ERROR")
        if texconv:
            tools_box.label(text=f"✓ texconv: {texconv}", icon="CHECKMARK")
        else:
            tools_box.label(text="texconv not configured", icon="ERROR")

        tools_box.separator()
        tools_box.label(text="Video & Audio:", icon="SOUND")
        tools_box.prop(scene, "fo4_ffmpeg_path", text="ffmpeg / folder")

        # ── Auto-installation ─────────────────────────────────────────────────
        auto_box = layout.box()
        auto_box.label(text="Automatic Installation", icon="FILE_REFRESH")
        auto_box.prop(scene, "fo4_auto_install_tools",
                      text="Auto-install missing CLI tools at startup")
        auto_box.prop(scene, "fo4_auto_install_python",
                      text="Auto-install Python packages at startup")
        auto_box.prop(scene, "fo4_auto_register_tools",
                      text="Auto-register third-party add-ons")
        auto_box.operator("fo4.check_tool_paths",
                          text="Check Tool Paths Now", icon='INFO')
        auto_box.label(
            text="Disable auto-register to avoid Blender policy warnings",
            icon='INFO',
        )

        # ── PyTorch ───────────────────────────────────────────────────────────
        torch_box = layout.box()
        torch_box.label(text="PyTorch / AI Features", icon="PLUGIN")
        try:
            from . import torch_path_manager
            success, msg, _ = torch_path_manager.TorchPathManager.try_import_torch()
            if success:
                torch_box.label(text=f"✓ PyTorch loaded: {msg}", icon="CHECKMARK")
            else:
                if msg == "windows_path_error":
                    torch_box.label(
                        text="⚠ Windows path-length error detected", icon="ERROR")
                    torch_box.operator(
                        "torch.install_custom_path",
                        text="Install PyTorch to D:/t", icon="IMPORT")
                else:
                    torch_box.label(text=f"⚠ {msg}", icon="INFO")
        except Exception as e:
            torch_box.label(text=f"PyTorch status unknown: {e}", icon="ERROR")

        # ── Mesh Optimisation ─────────────────────────────────────────────────
        opt_box = layout.box()
        opt_box.label(text="Mesh Optimisation Defaults", icon="MOD_DECIM")
        opt_box.prop(scene, "fo4_opt_apply_transforms",
                     text="Apply transforms before optimise")
        opt_box.prop(scene, "fo4_opt_doubles",
                     text="Remove Doubles threshold")
        opt_box.prop(scene, "fo4_opt_preserve_uvs",
                     text="Preserve UVs when removing doubles")

        # ── LLM Advisor ───────────────────────────────────────────────────────
        llm_box = layout.box()
        llm_box.label(text="AI Advisor – LLM (optional, opt-in)", icon="INFO")
        llm_box.prop(scene, "fo4_llm_enabled",       text="Enable LLM Advisor")
        col = llm_box.column(align=True)
        col.enabled = scene.fo4_llm_enabled
        col.prop(scene, "fo4_llm_endpoint",      text="Endpoint URL")
        col.prop(scene, "fo4_llm_model",         text="Model")
        col.prop(scene, "fo4_llm_api_key",       text="API Key")
        col.prop(scene, "fo4_llm_allow_actions", text="Allow action suggestions")
        col.prop(scene, "fo4_llm_send_stats",    text="Send summary counts only")

        # ── Advisor auto-monitor ──────────────────────────────────────────────
        mon_box = layout.box()
        mon_box.label(text="Advisor Auto-Monitor", icon="FILE_REFRESH")
        mon_box.prop(scene, "fo4_advisor_monitor",  text="Enable background checks")
        row = mon_box.row()
        row.enabled = scene.fo4_advisor_monitor
        row.prop(scene, "fo4_advisor_interval", text="Interval (seconds)")

        # ── Knowledge Base ────────────────────────────────────────────────────
        kb_box = layout.box()
        kb_box.label(text="Advisor Knowledge Base", icon="BOOKMARKS")
        kb_box.prop(scene, "fo4_kb_enabled", text="Use bundled / user KB")
        kb_box.prop(scene, "fo4_kb_path",    text="Custom KB folder (txt/md)")

        # ── Mossy Link ────────────────────────────────────────────────────────
        ml_box = layout.box()
        ml_box.label(text="Mossy Link", icon="LINKED")

        tcp_sub = ml_box.box()
        tcp_sub.label(text="TCP Server  (Mossy → Blender control)",
                      icon="NETWORK_DRIVE")
        tcp_sub.prop(scene, "fo4_mossy_port",     text="Listen Port")
        tcp_sub.prop(scene, "fo4_mossy_token",    text="Auth Token")
        tcp_sub.prop(scene, "fo4_mossy_autostart",text="Auto-start on load")

        http_sub = ml_box.box()
        http_sub.label(text="AI Queries  (Blender → Mossy)", icon="URL")
        http_sub.prop(scene, "fo4_mossy_http_port", text="Mossy HTTP Port")
        http_sub.prop(scene, "fo4_use_mossy_ai",    text="Use Mossy as AI Advisor")
        if scene.fo4_use_mossy_ai:
            http_sub.label(
                text="✓ Advisor will ask Mossy instead of remote LLM",
                icon="CHECKMARK")
        else:
            http_sub.label(text="Enable to route AI through Mossy", icon="INFO")

        ml_box.operator("wm.mossy_check_http",
                        text="Check Mossy HTTP", icon="QUESTION")

        # ── Antigravity ───────────────────────────────────────────────────────
        ag_box = layout.box()
        ag_box.label(text="Antigravity / Gemini AI", icon="OUTLINER_OB_LIGHT")
        ag_box.prop(scene, "fo4_use_antigravity",
                    text="Use Antigravity as AI Advisor")
        if scene.fo4_use_antigravity:
            ag_box.prop(scene, "fo4_antigravity_key", text="API Key")
            ag_box.label(
                text="✓ Advisor will use Antigravity (Gemini backend)",
                icon="CHECKMARK")
        else:
            ag_box.label(
                text="Enable to route AI through Antigravity", icon="INFO")

        # ── Add-on Update ─────────────────────────────────────────────────────
        if addon_updater:
            addon_updater.draw_update_ui(layout)
        else:
            update_box = layout.box()
            update_box.label(text="Add-on Update", icon="FILE_REFRESH")
            update_box.label(
                text="Install a new zip via Edit → Preferences → Add-ons → Install",
                icon='INFO',
            )
            update_box.label(
                text="Then restart Blender to apply changes.", icon='BLANK1')


class FO4_PT_OperationLogPanel(Panel):
    """Panel that shows every operation recorded by the add-on"""
    bl_label = "Operation Log"
    bl_idname = "FO4_PT_operation_log_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        import textwrap
        layout = self.layout
        from . import notification_system

        entries = notification_system.OperationLog.get_entries(limit=50)

        if not entries:
            layout.label(text="No operations recorded yet.", icon='INFO')
        else:
            # Show newest first
            for entry in reversed(entries):
                box = layout.box()
                ts = entry.get('timestamp', '')
                msg = entry.get('message', '')
                etype = entry.get('type', 'INFO')
                icon = 'ERROR' if etype == 'ERROR' else ('CANCEL' if etype == 'WARNING' else 'CHECKMARK')
                box.label(text=f"[{ts}]", icon=icon)
                # Wrap long messages at word boundaries (~60 chars per line)
                for line in textwrap.wrap(msg, width=60) or [msg]:
                    box.label(text=line)

        layout.separator()
        layout.operator("fo4.clear_operation_log", text="Clear Log", icon='TRASH')


classes = (
    FO4_PT_MainPanel,
    FO4_PT_SetupPanel,
    FO4_PT_MeshPanel,
    FO4_PT_TexturePanel,
    FO4_PT_ImageToMeshPanel,
    FO4_PT_AIGenerationPanel,
    FO4_PT_AnimationPanel,
    FO4_PT_RigNetPanel,
    FO4_PT_NVTTPanel,
    FO4_PT_AdvisorPanel,
    FO4_PT_ToolsLinks,
    FO4_PT_GameAssetsPanel,
    FO4_PT_ExportPanel,
    # New panels for enhancements
    FO4_PT_BatchProcessingPanel,
    FO4_PT_PresetsPanel,
    FO4_PT_AutomationQuickPanel,
    FO4_PT_Havok2FBXPanel,
    FO4_PT_VegetationPanel,
    # New panels for comprehensive mod creation
    FO4_PT_QuestPanel,
    FO4_PT_NPCPanel,
    FO4_PT_WorldBuildingPanel,
    FO4_PT_ItemCreationPanel,
    # New panels for productivity
    FO4_PT_PresetLibraryPanel,
    FO4_PT_AutomationMacrosPanel,
    FO4_PT_PostProcessingPanel,
    FO4_PT_MaterialBrowserPanel,
    FO4_PT_SceneDiagnosticsPanel,
    FO4_PT_ReferenceObjectsPanel,
    FO4_PT_PapyrusPanel,
    FO4_PT_HavokPhysicsPanel,
    FO4_PT_ModPackagingPanel,
    FO4_PT_AddonIntegrationPanel,
    FO4_PT_DesktopTutorialPanel,
    # Settings / Config panel moved from preferences
    FO4_PT_SettingsPanel,
    # Operation log — records every process for reference
    FO4_PT_OperationLogPanel,
)

def register():
    for cls in classes:
        try:
            bpy.utils.register_class(cls)
        except Exception as e:
            print(f"⚠ Failed to register {cls.__name__}: {e}")

def unregister():
    for cls in reversed(classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception as e:
            print(f"⚠ Failed to unregister {cls.__name__}: {e}")
