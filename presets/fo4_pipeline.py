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

# 1. Scale correction for KREA's output.
#    NOTE: this is NOT the FO4-NIF-native-unit conversion (that factor,
#    ~69.99125, is applied automatically by this addon's own NIF import/
#    export pipeline and must never be hand-applied to a GLB/FBX/OBJ import
#    -- doing so was a real, already-fixed bug elsewhere in this addon that
#    shrank correctly-scaled GLB/FBX/OBJ imports ~70x too small). The 0.1
#    factor below is purely a KREA-specific empirical correction for that
#    tool's own oversized output and has nothing to do with FO4's unit
#    scale -- check the result against a reference FO4 asset/skeleton in
#    the viewport and adjust this value if KREA's output size changes.
KREA_OUTPUT_SCALE_CORRECTION = 0.1
obj.scale = (KREA_OUTPUT_SCALE_CORRECTION,) * 3
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# 2. Mesh cleanup
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.remove_doubles(threshold=0.0001)   # Merge by Distance
bpy.ops.mesh.normals_make_consistent(inside=False)  # Recalculate Outside
bpy.ops.object.mode_set(mode='OBJECT')

# 3. Shade Smooth + Auto Smooth 30°
bpy.ops.object.shade_smooth()
# use_auto_smooth/auto_smooth_angle were removed in Blender 4.1+
# (shade_smooth_by_angle is the modern equivalent) -- try both paths.
if hasattr(obj.data, 'use_auto_smooth'):
    try:
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(30)  # 0.523599 rad
    except AttributeError:
        pass
else:
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(30))
    except Exception:
        pass

# 4. Triangulate
mod = obj.modifiers.new("Triangulate", 'TRIANGULATE')
mod.quad_method = 'BEAUTY'
mod.ngon_method = 'BEAUTY'
bpy.ops.object.modifier_apply(modifier=mod.name)

# 5. Apply all transforms
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

print(f"Fallout 4 pipeline prep complete: {obj.name}")
print("Next steps: Retopology → UV unwrap → Bake textures → pyNIF export")
