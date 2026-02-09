"""
LOD Generator - Generates Level of Detail meshes for Fallout 4
"""

import bpy

bl_info = {
    "name": "LOD Generator",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Object > FO4 LOD",
    "description": "Generates LOD (Level of Detail) meshes for Fallout 4",
    "category": "Mesh",
}

class FO4_OT_GenerateLOD(bpy.types.Operator):
    """Generate LOD Meshes"""
    bl_idname = "mesh.fo4_generate_lod"
    bl_label = "Generate LOD"
    bl_options = {'REGISTER', 'UNDO'}
    
    lod_levels: bpy.props.IntProperty(
        name="LOD Levels",
        description="Number of LOD levels to generate",
        default=3,
        min=1,
        max=5
    )
    
    lod0_ratio: bpy.props.FloatProperty(
        name="LOD0 Ratio",
        description="Decimate ratio for LOD0 (closest)",
        default=0.75,
        min=0.1,
        max=1.0
    )
    
    lod1_ratio: bpy.props.FloatProperty(
        name="LOD1 Ratio",
        description="Decimate ratio for LOD1",
        default=0.5,
        min=0.1,
        max=1.0
    )
    
    lod2_ratio: bpy.props.FloatProperty(
        name="LOD2 Ratio",
        description="Decimate ratio for LOD2 (farthest)",
        default=0.25,
        min=0.1,
        max=1.0
    )
    
    def execute(self, context):
        import bmesh
        
        selected = [obj for obj in context.selected_objects if obj.type == 'MESH']
        if not selected:
            self.report({'WARNING'}, "No mesh objects selected")
            return {'CANCELLED'}
        
        lod_ratios = [self.lod0_ratio, self.lod1_ratio, self.lod2_ratio]
        lod_objects = []
        
        for obj in selected:
            # Get original poly count
            bm = bmesh.new()
            bm.from_mesh(obj.data)
            original_tris = len(bm.calc_loop_triangles())
            bm.free()
            
            for lod_level in range(min(self.lod_levels, len(lod_ratios))):
                # Duplicate for LOD
                obj.select_set(True)
                context.view_layer.objects.active = obj
                bpy.ops.object.duplicate()
                lod_obj = context.active_object
                lod_obj.name = f"{obj.name}_LOD{lod_level}"
                
                # Add decimate modifier
                ratio = lod_ratios[lod_level]
                mod = lod_obj.modifiers.new(name=f"LOD{lod_level}_Decimate", type='DECIMATE')
                mod.ratio = ratio
                mod.decimate_type = 'COLLAPSE'
                
                # Apply modifier
                try:
                    bpy.ops.object.modifier_apply(modifier=mod.name)
                    
                    # Get new poly count
                    bm = bmesh.new()
                    bm.from_mesh(lod_obj.data)
                    new_tris = len(bm.calc_loop_triangles())
                    bm.free()
                    
                    lod_objects.append((lod_obj.name, lod_level, original_tris, new_tris))
                    
                except Exception as e:
                    lod_obj.modifiers.remove(mod)
                    self.report({'WARNING'}, f"Could not generate LOD for {obj.name}: {e}")
            
            # Move LODs to collection
            collection_name = "LOD_Meshes"
            if collection_name not in bpy.data.collections:
                coll = bpy.data.collections.new(collection_name)
                context.scene.collection.children.link(coll)
            else:
                coll = bpy.data.collections[collection_name]
            
            for lod_name, _, _, _ in lod_objects:
                if lod_name in bpy.data.objects:
                    lod = bpy.data.objects[lod_name]
                    for c in lod.users_collection:
                        c.objects.unlink(lod)
                    coll.objects.link(lod)
        
        # Report results
        print(f"\n=== LOD Meshes Generated ===")
        for name, level, original, new in lod_objects:
            reduction = ((original - new) / original) * 100
            print(f"  ✅ {name}: {original} → {new} tris ({reduction:.1f}% reduction)")
        
        self.report({'INFO'}, f"Generated {len(lod_objects)} LOD meshes")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_GenerateLOD.bl_idname, text="Generate LOD")

def register():
    bpy.utils.register_class(FO4_OT_GenerateLOD)
    bpy.types.VIEW3D_MT_object.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_GenerateLOD)
    bpy.types.VIEW3D_MT_object.remove(menu_func)

if __name__ == "__main__":
    register()
