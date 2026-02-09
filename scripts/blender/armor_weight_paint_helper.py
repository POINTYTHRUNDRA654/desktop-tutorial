"""
Armor Weight Paint Helper - Tools for armor weight painting
"""

import bpy

bl_info = {
    "name": "Armor Weight Paint Helper",
    "author": "Mossy AI Assistant",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "View3D > Paint > FO4 Weight Paint",
    "description": "Helper tools for armor weight painting",
    "category": "Paint",
}

class FO4_OT_AutoWeightPaint(bpy.types.Operator):
    """Auto Weight Paint"""
    bl_idname = "paint.fo4_auto_weight"
    bl_label = "Auto Weight Paint"
    bl_options = {'REGISTER', 'UNDO'}
    
    normalize_weights: bpy.props.BoolProperty(
        name="Normalize Weights",
        description="Ensure all weights sum to 1.0",
        default=True
    )
    
    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'WARNING'}, "Active object must be a mesh")
            return {'CANCELLED'}
        
        # Find armature modifier
        arm_mod = None
        for mod in obj.modifiers:
            if mod.type == 'ARMATURE':
                arm_mod = mod
                break
        
        if not arm_mod or not arm_mod.object:
            self.report({'WARNING'}, "No armature modifier found")
            return {'CANCELLED'}
        
        armature = arm_mod.object
        
        # Use automatic weights
        context.view_layer.objects.active = armature
        armature.select_set(True)
        obj.select_set(True)
        
        try:
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')
            
            if self.normalize_weights:
                # Normalize weights
                context.view_layer.objects.active = obj
                bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
                bpy.ops.object.vertex_group_normalize_all()
                bpy.ops.object.mode_set(mode='OBJECT')
            
            self.report({'INFO'}, "Auto weight painting complete")
            
        except Exception as e:
            self.report({'ERROR'}, f"Auto weight failed: {e}")
            return {'CANCELLED'}
        
        return {'FINISHED'}

class FO4_OT_CleanWeights(bpy.types.Operator):
    """Clean Weight Groups"""
    bl_idname = "paint.fo4_clean_weights"
    bl_label = "Clean Weights"
    bl_options = {'REGISTER', 'UNDO'}
    
    threshold: bpy.props.FloatProperty(
        name="Threshold",
        description="Remove weights below this value",
        default=0.01,
        min=0.0,
        max=1.0
    )
    
    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'WARNING'}, "Active object must be a mesh")
            return {'CANCELLED'}
        
        removed = 0
        for vg in obj.vertex_groups:
            # Remove low weights
            for v in obj.data.vertices:
                try:
                    weight = vg.weight(v.index)
                    if weight < self.threshold:
                        vg.remove([v.index])
                        removed += 1
                except:
                    pass
        
        print(f"\n=== Weight Cleanup ===")
        print(f"  Removed {removed} low-weight assignments")
        print(f"  Threshold: {self.threshold}")
        
        self.report({'INFO'}, f"Removed {removed} low weights")
        return {'FINISHED'}

def menu_func(self, context):
    self.layout.operator(FO4_OT_AutoWeightPaint.bl_idname, text="Auto Weight Paint")
    self.layout.operator(FO4_OT_CleanWeights.bl_idname, text="Clean Weights")

def register():
    bpy.utils.register_class(FO4_OT_AutoWeightPaint)
    bpy.utils.register_class(FO4_OT_CleanWeights)
    bpy.types.VIEW3D_MT_paint_weight.append(menu_func)

def unregister():
    bpy.utils.unregister_class(FO4_OT_AutoWeightPaint)
    bpy.utils.unregister_class(FO4_OT_CleanWeights)
    bpy.types.VIEW3D_MT_paint_weight.remove(menu_func)

if __name__ == "__main__":
    register()
