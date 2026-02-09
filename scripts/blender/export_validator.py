"""
Export Validator - Final validation before exporting to Fallout 4
"""

import bpy
import bmesh

bl_info = {
    "name": "Export Validator",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Export Validate",
    "description": "Complete validation before exporting to Fallout 4",
    "category": "Object",
}

class FO4_OT_ValidateExport(bpy.types.Operator):
    """Validate Before Export"""
    bl_idname = "object.fo4_validate_export"
    bl_label": "Validate Export"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        issues = []
        warnings = []
        info = []
        
        # Check scene settings
        scene = context.scene
        if scene.render.fps != 30:
            issues.append(f"Animation FPS is {scene.render.fps}, should be 30")
        else:
            info.append("✅ FPS correct (30)")
        
        # Check selected objects
        selected = context.selected_objects
        if not selected:
            issues.append("No objects selected")
            self.report({'WARNING'}, "No objects selected")
            return {'CANCELLED'}
        
        # Check each object
        for obj in selected:
            # Scale check
            for i, s in enumerate(obj.scale):
                if abs(s - 1.0) > 0.001:
                    issues.append(f"{obj.name}: Scale not 1.0 (apply transforms)")
                    break
            
            # Mesh checks
            if obj.type == 'MESH':
                # UV check
                if not obj.data.uv_layers:
                    issues.append(f"{obj.name}: No UV maps")
                
                # Material check
                if not obj.data.materials:
                    warnings.append(f"{obj.name}: No materials assigned")
                
                # Poly count
                bm = bmesh.new()
                bm.from_mesh(obj.data)
                tri_count = len(bm.calc_loop_triangles())
                bm.free()
                
                if tri_count > 50000:
                    warnings.append(f"{obj.name}: High poly count ({tri_count} tris)")
                else:
                    info.append(f"✅ {obj.name}: {tri_count} tris")
                
                # Check for non-manifold geometry
                bm = bmesh.new()
                bm.from_mesh(obj.data)
                non_manifold = []
                for edge in bm.edges:
                    if not edge.is_manifold:
                        non_manifold.append(edge)
                bm.free()
                
                if non_manifold:
                    warnings.append(f"{obj.name}: {len(non_manifold)} non-manifold edges")
            
            # Armature checks
            elif obj.type == 'ARMATURE':
                bone_count = len(obj.data.bones)
                if bone_count > 256:
                    warnings.append(f"{obj.name}: {bone_count} bones (exceeds recommended 256)")
                else:
                    info.append(f"✅ {obj.name}: {bone_count} bones")
        
        # Check textures
        for img in bpy.data.images:
            if img.filepath:
                import os
                abs_path = bpy.path.abspath(img.filepath)
                if os.path.isabs(abs_path) and abs_path.startswith(('C:', 'D:', 'E:')):
                    issues.append(f"{img.name}: Absolute texture path")
                
                if not img.packed_file and not os.path.exists(abs_path):
                    issues.append(f"{img.name}: Texture file missing")
        
        # Report results
        print(f"\n{'='*50}")
        print(f"FO4 EXPORT VALIDATION")
        print(f"{'='*50}")
        
        if issues:
            print(f"\n❌ CRITICAL ISSUES ({len(issues)}):")
            for issue in issues:
                print(f"  • {issue}")
        
        if warnings:
            print(f"\n⚠️  WARNINGS ({len(warnings)}):")
            for warning in warnings:
                print(f"  • {warning}")
        
        if info:
            print(f"\n✅ PASSED CHECKS:")
            for i in info[:10]:  # Limit output
                print(f"  {i}")
            if len(info) > 10:
                print(f"  ... and {len(info) - 10} more")
        
        print(f"\n{'='*50}")
        
        # Final verdict
        if issues:
            self.report({'ERROR'}, f"{len(issues)} critical issues found - DO NOT EXPORT")
            print(f"VERDICT: ❌ DO NOT EXPORT - Fix {len(issues)} critical issues first")
        elif warnings:
            self.report({'WARNING'}, f"{len(warnings)} warnings - export with caution")
            print(f"VERDICT: ⚠️  EXPORT WITH CAUTION - {len(warnings)} warnings")
        else:
            self.report({'INFO'}, "✅ All checks passed - ready to export!")
            print(f"VERDICT: ✅ READY TO EXPORT")
        
        print(f"{'='*50}\n")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_ValidateExport.bl_idname, text="Validate Export")

def register():
    bpy.utils.register_class(FO4_OT_ValidateExport)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_ValidateExport)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
