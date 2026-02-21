"""
UI Panels for the Fallout 4 Tutorial Add-on
"""

import bpy
from bpy.types import Panel
from . import hunyuan3d_helpers, gradio_helpers, hymotion_helpers, nvtt_helpers, rignet_helpers, preferences, ue_importer_helpers, umodel_tools_helpers, unity_fbx_importer_helpers, knowledge_helpers

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
        
        # Tutorial section
        box = layout.box()
        box.label(text="Tutorial System", icon='HELP')
        box.operator("fo4.start_tutorial", text="Start Tutorial", icon='PLAY')
        box.operator("fo4.show_help", text="Show Help", icon='QUESTION')

        # New-user setup hints
        hint = layout.box()
        hint.label(text="Setup / First-time Use", icon='INFO')
        hint.label(text="1. Open the 'External Tools' tab below.")
        hint.label(text="2. Click 'Check/Install' buttons to fetch required tools.")
        hint.label(text="3. Use 'Install Python Requirements' if prompted.")
        hint.label(text="4. Restart Blender after installing add‑ons/tools.")
        
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
        
        box = layout.box()
        box.label(text="Mesh Creation", icon='MESH_CUBE')
        box.operator("fo4.create_base_mesh", text="Create Base Mesh", icon='MESH_DATA')
        box.operator("fo4.optimize_mesh", text="Optimize for FO4", icon='MOD_DECIM')
        box.operator("fo4.validate_mesh", text="Validate Mesh", icon='CHECKMARK')
        
        # Advanced mesh tools
        adv_box = layout.box()
        adv_box.label(text="Advanced Mesh Tools", icon='MODIFIER')
        adv_box.operator("fo4.analyze_mesh_quality", text="Analyze Quality", icon='INFO')
        adv_box.operator("fo4.auto_repair_mesh", text="Auto-Repair", icon='TOOL_SETTINGS')
        adv_box.operator("fo4.smart_decimate", text="Smart Decimate", icon='MOD_DECIM')
        adv_box.operator("fo4.generate_lod", text="Generate LOD Chain", icon='OUTLINER_OB_MESH')
        adv_box.operator("fo4.optimize_uvs", text="Optimize UVs", icon='UV')

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
        box.operator("fo4.install_texture", text="Install Texture", icon='FILE_IMAGE')
        box.operator("fo4.validate_textures", text="Validate Textures", icon='CHECKMARK')

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
        
        # Info box
        info_box = layout.box()
        info_box.label(text="Quick Guide:", icon='INFO')
        info_box.label(text="• Height Map: Grayscale images")
        info_box.label(text="• ZoeDepth: RGB images (AI depth)")
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
        shap_e_installed, _ = shap_e_helpers.ShapEHelpers.is_shap_e_installed()
        
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
            shap_e_box.operator("fo4.show_shap_e_info", text="Installation Instructions", icon='INFO')
        
        shap_e_box.operator("fo4.check_shap_e_installation", text="Check Installation", icon='SYSTEM')
        
        # Point-E section
        layout.separator()
        point_e_box = layout.box()
        point_e_box.label(text="Point-E (Text/Image to Point Cloud)", icon='OUTLINER_OB_POINTCLOUD')
        
        from . import point_e_helpers
        point_e_installed, _ = point_e_helpers.PointEHelpers.is_point_e_installed()
        
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
            point_e_box.operator("fo4.show_point_e_info", text="Installation Instructions", icon='INFO')
        
        point_e_box.operator("fo4.check_point_e_installation", text="Check Installation", icon='SYSTEM')


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
        box.operator("fo4.validate_animation", text="Validate Animation", icon='CHECKMARK')

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
        prefs = context.preferences.addons.get(__package__.split('.')[0]).preferences if context.preferences else None
        llm_enabled = prefs.llm_enabled if prefs else False

        box = layout.box()
        box.label(text="Analyze", icon='INFO')
        row = box.row(align=True)
        op = row.operator("fo4.advisor_analyze", text="Analyze (Local)", icon='SHADERFX')
        op.use_llm = False
        row = box.row(align=True)
        row.enabled = llm_enabled
        op = row.operator("fo4.advisor_analyze", text="Analyze (LLM)", icon='LIGHT_HEMI')
        op.use_llm = True
        if not llm_enabled:
            box.label(text="LLM disabled (set in Preferences)", icon='ERROR')

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

        info = layout.box()
        info.label(text="Advisor focuses on:", icon='HELP')
        info.label(text="• Export readiness (scale, transforms, normals)")
        info.label(text="• Texture prep (DDS BC1/3/5/7)")
        info.label(text="• Unity/UE imports: scale/material hints")

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
            sum_box.label(text=f"{label}: {'Available' if ok else 'Missing'}", icon='CHECKMARK' if ok else 'ERROR')

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

        ub_ready, ub_message = unity_fbx_importer_helpers.status()
        ub_icon = 'CHECKMARK' if ub_ready else 'ERROR'
        box.label(text=ub_message, icon=ub_icon)
        box.label(text=f"Repo: {unity_fbx_importer_helpers.repo_path()}", icon='FILE_FOLDER')
        box.label(text=f"Pkg: {unity_fbx_importer_helpers.package_path()}", icon='PACKAGE')
        box.operator("fo4.check_unity_fbx_importer", text="Check/Install Unity FBX Importer", icon='FILE_REFRESH')

        box = layout.box()
        box.label(text="Unreal extraction", icon='URL')
        op = box.operator("wm.url_open", text="UModel (UE Viewer)")
        op.url = "https://www.gildor.org/en/projects/umodel"
        op = box.operator("wm.url_open", text="Unreal CLI exporters")
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
        box.operator("fo4.install_python_deps", text="Install Python Requirements", icon='FILE_REFRESH').optional = False
        op = box.operator("fo4.install_python_deps", text="Install Python Req (optional)", icon='FILE_REFRESH')
        op.optional = True
        box.operator("fo4.install_all_tools", text="Install All Tools", icon='PACKAGE')
        box.operator("fo4.self_test", text="Run Environment Self-Test", icon='CHECKMARK')

        # Manual path override — use existing installations when auto-install fails
        prefs = preferences.get_preferences()
        man_box = layout.box()
        man_box.label(text="Manual Path Override", icon='FILE_FOLDER')
        man_box.label(text="Already have a tool? Point to it here.", icon='INFO')
        if prefs:
            man_box.prop(prefs, "ffmpeg_path", text="FFmpeg")
            ffmpeg_ok = preferences.get_configured_ffmpeg_path()
            man_box.label(
                text=f"FFmpeg: {'OK \u2714' if ffmpeg_ok else 'not found'}",
                icon='CHECKMARK' if ffmpeg_ok else 'ERROR',
            )
            man_box.prop(prefs, "nvtt_path", text="nvcompress")
            nvcompress_ok = preferences.get_configured_nvcompress_path()
            man_box.label(
                text=f"nvcompress: {'OK \u2714' if nvcompress_ok else 'not found'}",
                icon='CHECKMARK' if nvcompress_ok else 'ERROR',
            )
            man_box.prop(prefs, "texconv_path", text="texconv")
            texconv_ok = preferences.get_configured_texconv_path()
            man_box.label(
                text=f"texconv: {'OK \u2714' if texconv_ok else 'not found'}",
                icon='CHECKMARK' if texconv_ok else 'ERROR',
            )
        else:
            man_box.label(text="Enable the add-on to set paths.", icon='ERROR')

class FO4_PT_ExportPanel(Panel):
    """Export panel for Fallout 4"""
    bl_label = "Export to FO4"
    bl_idname = "FO4_PT_export_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}
    
    def draw(self, context):
        layout = self.layout
        
        status_box = layout.box()
        available, message = export_helpers.ExportHelpers.nif_exporter_available()
        icon = 'CHECKMARK' if available else 'ERROR'
        status_box.label(text=f"NIF Exporter: {'Available' if available else 'Not detected'}", icon=icon)
        status_box.label(text=message, icon='INFO')
        if not available:
            status_box.label(text="Fallback: FBX export enabled", icon='EXPORT')
        
        box = layout.box()
        box.label(text="Export Options", icon='EXPORT')
        box.operator("fo4.export_mesh", text="Export Mesh (.nif)", icon='MESH_DATA')
        box.operator("fo4.export_all", text="Export Complete Mod", icon='PACKAGE')
        box.operator("fo4.validate_export", text="Validate Before Export", icon='CHECKMARK')


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
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.generate_collision_mesh", text="Generate Collision", icon='MESH_DATA')
        
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
    """Expose Havok2FBX path from add-on preferences."""
    bl_label = "Havok2FBX"
    bl_idname = "FO4_PT_havok2fbx_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Fallout 4'
    bl_parent_id = "FO4_PT_main_panel"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        layout = self.layout
        prefs = preferences.get_preferences()
        path = preferences.get_havok2fbx_path()

        box = layout.box()
        box.label(text="Configure Havok2FBX", icon='FILE_FOLDER')

        if prefs:
            box.prop(prefs, "havok2fbx_path", text="Folder")
        else:
            box.label(text="Preferences not available (addon not registered)", icon='ERROR')

        status_box = layout.box()
        if path:
            status_box.label(text=f"Configured: {path}", icon='CHECKMARK')
        else:
            status_box.label(text="Path not found. Set the folder above.", icon='ERROR')


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
        
        # Baking
        box = layout.box()
        box.label(text="Baking", icon='RENDER_STILL')
        row = box.row()
        row.enabled = obj and obj.type == 'MESH'
        row.operator("fo4.bake_vegetation_ao", text="Setup AO Bake", icon='SHADING_RENDERED')
        
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
        box.operator("fo4.generate_papyrus_script", text="Generate Papyrus Script", icon='FILE_SCRIPT')
        
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
        layout = self.layout

        # ── Core Python dependencies ──────────────────────────────────────
        box = layout.box()
        box.label(text="Core Python Dependencies", icon='SCRIPT')
        core_deps = [
            ("PIL", "Pillow (image processing)"),
            ("numpy", "NumPy (math / 3D data)"),
            ("requests", "Requests (HTTP / downloads)"),
        ]
        all_ok = True
        for mod, label in core_deps:
            ok = False
            try:
                __import__(mod)
                ok = True
            except ImportError:
                pass
            icon = 'CHECKMARK' if ok else 'ERROR'
            prefix = "✓" if ok else "✗"
            box.label(text=f"{prefix}  {label}", icon=icon)
            if not ok:
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
    FO4_PT_AddonIntegrationPanel,
    FO4_PT_DesktopTutorialPanel,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
