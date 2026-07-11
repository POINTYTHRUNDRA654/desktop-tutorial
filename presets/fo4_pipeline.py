"""
Fallout 4 Asset Pipeline Script
Run inside Blender's Scripting tab after importing your GLB from KREA.
Handles: scale, normals, auto smooth, triangulation, cleanup.
You still need to do retopology + UV manually (or use fo4_post_process() operator).
"""
import bpy
import math

obj = bpy.context.active_object
if obj is None or obj.type != 'MESH':
    raise RuntimeError("Select a mesh object first")

bpy.context.view_layer.objects.active = obj
obj.select_set(True)

# 1. Scale to FO4 units (1 Blender unit = 10 FO4 units, so scale 0.1)
obj.scale = (0.1, 0.1, 0.1)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# 2. Mesh cleanup
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0001)   # Merge by Distance
bpy.ops.mesh.normals_make_consistent(inside=False)  # Recalculate Outside
bpy.ops.object.mode_set(mode='OBJECT')

# 3. Shade Smooth + Auto Smooth 30°
bpy.ops.object.shade_smooth()
obj.data.use_auto_smooth = True
obj.data.auto_smooth_angle = math.radians(30)  # 0.523599 rad

# 4. Triangulate
mod = obj.modifiers.new("Triangulate", 'TRIANGULATE')
mod.quad_method = 'BEAUTY'
mod.ngon_method = 'BEAUTY'
bpy.ops.object.modifier_apply(modifier=mod.name)

# 5. Apply all transforms
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

print(f"Fallout 4 pipeline prep complete: {obj.name}")
print("Next steps: Retopology → UV unwrap → Bake textures → pyNIF export")
