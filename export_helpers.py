"""
Export helper functions for Fallout 4 mod creation
"""

import bpy
import os
import json

class ExportHelpers:
    """Helper functions for exporting to Fallout 4"""
    
    @staticmethod
    def validate_before_export(obj):
        """Validate object before export"""
        from . import mesh_helpers, texture_helpers, notification_system
        
        issues = []
        
        if obj.type == 'MESH':
            # Validate mesh
            success, mesh_issues = mesh_helpers.MeshHelpers.validate_mesh(obj)
            if not success:
                issues.extend(mesh_issues)
            
            # Validate textures
            if obj.data.materials:
                success, texture_issues = texture_helpers.TextureHelpers.validate_textures(obj)
                if not success:
                    issues.extend(texture_issues)
        
        elif obj.type == 'ARMATURE':
            # Validate armature
            from . import animation_helpers
            success, anim_issues = animation_helpers.AnimationHelpers.validate_animation(obj)
            if not success:
                issues.extend(anim_issues)
        
        return len(issues) == 0, issues

    @staticmethod
    def nif_exporter_available():
        """Check if the Niftools exporter operator is registered."""
        blender_version = bpy.app.version
        version_str = f"{blender_version[0]}.{blender_version[1]}"
        export_scene = getattr(bpy.ops, "export_scene", None)
        if not export_scene:
            return False, f"bpy.ops.export_scene missing (Blender {version_str})"

        if not hasattr(export_scene, "nif"):
            if blender_version >= (4, 0, 0):
                return False, "Niftools exporter not registered; official v0.1.1 targets Blender ≤3.6. Install a 4.x-compatible fork or use 3.6 for export."
            return False, "Niftools exporter not registered"

        if blender_version >= (4, 0, 0):
            return True, "Niftools exporter detected on Blender 4.x (ensure compatibility; experimental)"

        return True, "Niftools exporter available"

    @staticmethod
    def _build_nif_export_kwargs(filepath):
        """Assemble kwargs for the NIF exporter, adapting to available properties."""
        kwargs = {
            "filepath": filepath,
            "use_selection": True,
        }

        try:
            props = bpy.ops.export_scene.nif.get_rna_type().properties
            prop_keys = props.keys()

            # Prefer FO4 game profile when available
            if "game" in prop_keys:
                kwargs["game"] = "FALLOUT_4"

            # Keep smoothing consistent; fallback is exporter default
            if "smoothing" in prop_keys:
                kwargs["smoothing"] = "SMOOTH"

            # Avoid unintended scale changes
            if "scale_correction" in prop_keys:
                kwargs["scale_correction"] = 1.0

            # Some builds expose apply modifiers flag
            if "apply_modifiers" in prop_keys:
                kwargs["apply_modifiers"] = True
        except Exception:
            # If anything goes wrong, fall back to minimal args
            pass

        return kwargs
    
    @staticmethod
    def export_mesh_to_nif(obj, filepath):
        """Export mesh to NIF format using Niftools when available, else fall back to FBX."""
        
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Validate first
        success, issues = ExportHelpers.validate_before_export(obj)
        if not success:
            return False, f"Validation failed: {', '.join(issues)}"

        nif_available, nif_message = ExportHelpers.nif_exporter_available()

        # Try native NIF export first when available
        if nif_available:
            try:
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                bpy.context.view_layer.objects.active = obj

                kwargs = ExportHelpers._build_nif_export_kwargs(filepath)
                result = bpy.ops.export_scene.nif(**kwargs)

                if isinstance(result, set) and 'FINISHED' in result:
                    return True, f"Exported NIF: {filepath}"

                # If operator returns without FINISHED, fall back to FBX
                fallback_msg = f"NIF export did not finish ({result}); falling back to FBX."
            except Exception as e:
                # Fall back to FBX if NIF export fails
                fallback_msg = f"NIF export failed ({e}); falling back to FBX."
        else:
            fallback_msg = f"{nif_message}; exporting FBX for external conversion."

        # Export to FBX as a compatibility fallback
        try:
            base_path = os.path.splitext(filepath)[0]
            fbx_path = base_path + '.fbx'

            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj

            bpy.ops.export_scene.fbx(
                filepath=fbx_path,
                use_selection=True,
                apply_scale_options='FBX_SCALE_ALL',
                mesh_smooth_type='FACE'
            )

            return True, f"{fallback_msg} Exported FBX: {fbx_path}"
        except Exception as e:
            return False, f"Export failed: {str(e)}"
    
    @staticmethod
    def export_complete_mod(scene, output_dir):
        """Export complete mod with all assets"""
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        results = {
            'meshes': [],
            'textures': [],
            'animations': [],
            'errors': []
        }
        
        # Create directory structure
        mesh_dir = os.path.join(output_dir, "meshes")
        texture_dir = os.path.join(output_dir, "textures")
        
        os.makedirs(mesh_dir, exist_ok=True)
        os.makedirs(texture_dir, exist_ok=True)
        
        # Export all mesh objects
        for obj in scene.objects:
            if obj.type == 'MESH':
                mesh_path = os.path.join(mesh_dir, f"{obj.name}.nif")
                success, message = ExportHelpers.export_mesh_to_nif(obj, mesh_path)
                
                if success:
                    results['meshes'].append(obj.name)
                else:
                    results['errors'].append(f"{obj.name}: {message}")
            
            elif obj.type == 'ARMATURE':
                # Export armature animation
                if obj.animation_data and obj.animation_data.action:
                    anim_name = obj.animation_data.action.name
                    results['animations'].append(anim_name)
        
        # Create manifest file
        manifest_path = os.path.join(output_dir, "manifest.json")
        with open(manifest_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        return True, results
    
    @staticmethod
    def create_mod_structure(mod_name, output_dir):
        """Create basic Fallout 4 mod directory structure"""
        if not mod_name:
            return False, "Mod name cannot be empty"
        
        mod_dir = os.path.join(output_dir, mod_name)
        
        # Create directory structure
        directories = [
            mod_dir,
            os.path.join(mod_dir, "meshes"),
            os.path.join(mod_dir, "textures"),
            os.path.join(mod_dir, "materials"),
            os.path.join(mod_dir, "animations"),
        ]
        
        for directory in directories:
            os.makedirs(directory, exist_ok=True)
        
        # Create README
        readme_path = os.path.join(mod_dir, "README.txt")
        with open(readme_path, 'w') as f:
            f.write(f"Fallout 4 Mod: {mod_name}\n")
            f.write("=" * 50 + "\n\n")
            f.write("Created with Blender Fallout 4 Tutorial Add-on\n\n")
            f.write("Directory Structure:\n")
            f.write("- meshes/: 3D mesh files (.nif)\n")
            f.write("- textures/: Texture files (.dds)\n")
            f.write("- materials/: Material files (.bgsm, .bgem)\n")
            f.write("- animations/: Animation files (.hkx)\n")
        
        return True, f"Mod structure created at: {mod_dir}"

def register():
    """Register export helper functions"""
    pass

def unregister():
    """Unregister export helper functions"""
    pass
