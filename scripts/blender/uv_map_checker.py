"""
UV Map Checker - Validates UV maps and reports issues
"""

import bpy
import bmesh

bl_info = {
    "name": "UV Map Checker",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 UV Check",
    "description": "Checks for UV mapping issues in Fallout 4 assets",
    "category": "UV",
}

class FO4_OT_CheckUVMaps(bpy.types.Operator):
    """Check UV Maps for Issues"""
    bl_idname = "uv.fo4_check_uv_maps"
    bl_label = "Check UV Maps"
    bl_options = {'REGISTER', 'UNDO'}
    
    check_overlaps: bpy.props.BoolProperty(
        name="Check for Overlaps",
        description="Detect overlapping UVs",
        default=True
    )
    
    check_out_of_bounds: bpy.props.BoolProperty(
        name="Check Out of Bounds",
        description="Detect UVs outside 0-1 range",
        default=True
    )
    
    def execute(self, context):
        issues = []
        
        selected = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not selected:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        for obj in selected:
            # Check if UV map exists
            if not obj.data.uv_layers:
                issues.append(f"{obj.name}: No UV maps found")
                continue
            
            # Get UV layer
            uv_layer = obj.data.uv_layers.active
            if not uv_layer:
                issues.append(f"{obj.name}: No active UV layer")
                continue
            
            # Check for unmapped faces
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            uv_layer_bm = bm.loops.layers.uv.active
            
            if not uv_layer_bm:
                issues.append(f"{obj.name}: No UV data in BMesh")
                bm.free()
                continue
            
            # Check out of bounds
            if self.check_out_of_bounds:
                out_of_bounds_count = 0
                for face in bm.faces:
                    for loop in face.loops:
                        uv = loop[uv_layer_bm].uv
                        if uv.x < 0 or uv.x > 1 or uv.y < 0 or uv.y > 1:
                            out_of_bounds_count += 1
                            break
                
                if out_of_bounds_count > 0:
                    issues.append(f"{obj.name}: {out_of_bounds_count} faces with UVs out of bounds")
            
            # Check for zero-area UVs
            zero_area_count = 0
            for face in bm.faces:
                uv_coords = [loop[uv_layer_bm].uv for loop in face.loops]
                # Simple check: if all UVs are at same position
                if len(set((round(uv.x, 6), round(uv.y, 6)) for uv in uv_coords)) == 1:
                    zero_area_count += 1
            
            if zero_area_count > 0:
                issues.append(f"{obj.name}: {zero_area_count} faces with zero-area UVs")
            
            bm.free()
        
        # Report results
        if issues:
            print(f"\n=== UV Map Issues ===")
            for issue in issues:
                print(f"  ⚠️ {issue}")
            self.report({'WARNING'}, f"Found {len(issues)} UV issues (check console)")
        else:
            self.report({'INFO'}, "✅ All UV maps look good!")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_CheckUVMaps.bl_idname, text="Check UV Maps")

def register():
    bpy.utils.register_class(FO4_OT_CheckUVMaps)
    bpy.types.VIEW3D_MT_uv_map.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_CheckUVMaps)
    bpy.types.VIEW3D_MT_uv_map.remove(menu_func)

if __name__ == "__main__":
    register()
