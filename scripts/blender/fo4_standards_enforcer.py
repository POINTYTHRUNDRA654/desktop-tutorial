"""
FO4 Standards Enforcer - Validates and fixes common Fallout 4 export standards
"""

import bpy
import math

bl_info = {
    "name": "FO4 Standards Enforcer",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Standards",
    "description": "Enforces Fallout 4 standards: 1.0 scale, proper naming, etc.",
    "category": "Object",
}

class FO4_OT_EnforceStandards(bpy.types.Operator):
    """Enforce FO4 Standards on Selected Objects"""
    bl_idname = "object.fo4_enforce_standards"
    bl_label = "Enforce FO4 Standards"
    bl_options = {'REGISTER', 'UNDO'}
    
    fix_scale: bpy.props.BoolProperty(
        name="Fix Scale to 1.0",
        description="Set all object scales to 1.0 (apply transforms first)",
        default=True
    )
    
    fix_naming: bpy.props.BoolProperty(
        name="Fix Naming Conventions",
        description="Ensure object names don't have special characters",
        default=True
    )
    
    check_poly_count: bpy.props.BoolProperty(
        name="Check Poly Count",
        description="Warn if poly count exceeds 50k triangles",
        default=True
    )
    
    max_poly_count: bpy.props.IntProperty(
        name="Max Poly Count",
        description="Maximum triangle count",
        default=50000,
        min=1000,
        max=1000000
    )
    
    def execute(self, context):
        issues_found = []
        issues_fixed = []
        
        selected = context.selected_objects
        if not selected:
            self.report({'WARNING'}, "No objects selected")
            return {'CANCELLED'}
        
        for obj in selected:
            # Check and fix scale
            if self.fix_scale:
                scale_issues = False
                for i in range(3):
                    if abs(obj.scale[i] - 1.0) > 0.001:
                        scale_issues = True
                        break
                
                if scale_issues:
                    issues_found.append(f"{obj.name}: Scale not 1.0")
                    # Apply scale
                    context.view_layer.objects.active = obj
                    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
                    issues_fixed.append(f"{obj.name}: Applied scale")
            
            # Check and fix naming
            if self.fix_naming:
                invalid_chars = [':', '/', '\\', '*', '?', '"', '<', '>', '|']
                if any(char in obj.name for char in invalid_chars):
                    issues_found.append(f"{obj.name}: Invalid characters in name")
                    # Remove invalid chars
                    new_name = obj.name
                    for char in invalid_chars:
                        new_name = new_name.replace(char, '_')
                    obj.name = new_name
                    issues_fixed.append(f"Renamed to: {new_name}")
            
            # Check poly count
            if self.check_poly_count and obj.type == 'MESH':
                bm_temp = None
                try:
                    import bmesh
                    bm_temp = bmesh.new()
                    bm_temp.from_mesh(obj.data)
                    bm_temp.faces.ensure_lookup_table()
                    tri_count = len(bm_temp.calc_loop_triangles())
                    bm_temp.free()
                    
                    if tri_count > self.max_poly_count:
                        issues_found.append(f"{obj.name}: {tri_count} triangles (max: {self.max_poly_count})")
                except Exception as e:
                    if bm_temp:
                        bm_temp.free()
        
        # Report results
        if issues_fixed:
            self.report({'INFO'}, f"Fixed {len(issues_fixed)} issues")
        if issues_found and not issues_fixed:
            self.report({'WARNING'}, f"Found {len(issues_found)} issues (check console)")
        elif not issues_found:
            self.report({'INFO'}, "All objects meet FO4 standards!")
        
        # Print details to console
        if issues_found:
            print("\n=== FO4 Standards Check ===")
            for issue in issues_found:
                print(f"  ⚠️ {issue}")
        if issues_fixed:
            print("\n=== Fixed Issues ===")
            for fix in issues_fixed:
                print(f"  ✅ {fix}")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_EnforceStandards.bl_idname, text="Enforce FO4 Standards")

def register():
    bpy.utils.register_class(FO4_OT_EnforceStandards)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_EnforceStandards)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
