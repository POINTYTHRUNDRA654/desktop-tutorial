"""
Poly Count Optimizer - Reduces polygon count while preserving shape
"""

import bpy

bl_info = {
    "name": "Poly Count Optimizer",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 Optimize",
    "description": "Optimizes polygon count for Fallout 4 performance",
    "category": "Mesh",
}

class FO4_OT_OptimizePolyCount(bpy.types.Operator):
    """Optimize Polygon Count"""
    bl_idname = "mesh.fo4_optimize_poly_count"
    bl_label = "Optimize Poly Count"
    bl_options = {'REGISTER', 'UNDO'}
    
    target_poly_count: bpy.props.IntProperty(
        name="Target Triangle Count",
        description="Target number of triangles",
        default=50000,
        min=100,
        max=1000000
    )
    
    ratio: bpy.props.FloatProperty(
        name="Decimate Ratio",
        description="Ratio of faces to keep (1.0 = keep all)",
        default=0.5,
        min=0.01,
        max=1.0
    )
    
    preserve_uvs: bpy.props.BoolProperty(
        name="Preserve UVs",
        description="Try to preserve UV mapping",
        default=True
    )
    
    def execute(self, context):
        import bmesh
        
        selected = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not selected:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        optimized = []
        
        for obj in selected:
            # Get current poly count
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            current_tris = len(bm.calc_loop_triangles())
            bm.free()
            
            if current_tris <= self.target_poly_count:
                print(f"{obj.name}: Already optimized ({current_tris} tris)")
                continue
            
            # Add decimate modifier
            mod = obj.modifiers.new(name="FO4_Decimate", type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = self.ratio
            
            if self.preserve_uvs:
                mod.delimit = {'UV'}
            
            # Apply modifier
            context.view_layer.objects.active = obj
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
                
                # Get new poly count
                bm = bmesh.new()
                bm.from_mesh(obj.data)
                new_tris = len(bm.calc_loop_triangles())
                bm.free()
                
                reduction = ((current_tris - new_tris) / current_tris) * 100
                optimized.append((obj.name, current_tris, new_tris, reduction))
                
            except Exception as e:
                obj.modifiers.remove(mod)
                self.report({'WARNING'}, f"Could not optimize {obj.name}: {e}")
        
        # Report results
        if optimized:
            print(f"\n=== Poly Count Optimization ===")
            for obj_name, before, after, reduction in optimized:
                print(f"  ✅ {obj_name}: {before} → {after} tris ({reduction:.1f}% reduction)")
            self.report({'INFO'}, f"Optimized {len(optimized)} objects")
        else:
            self.report({'INFO'}, "All objects already meet target poly count")
        
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_OptimizePolyCount.bl_idname, text="Optimize Poly Count")

def register():
    bpy.utils.register_class(FO4_OT_OptimizePolyCount)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_OptimizePolyCount)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
