"""
FO4 Collision Mesh Setup from LOD3
Run after fo4_lod_generator.py.
Takes the LOD3 duplicate, strips materials, triangulates, renames to *_LOD3_COL.
In pyNIF: set Collision Source = <mesh name ending in _LOD3_COL>
"""
import bpy

obj = bpy.context.active_object
if obj is None:
    raise RuntimeError("Select the LOD0 (main) mesh first")

lod3_name = obj.name.replace("_LOD0", "_LOD3")
lod3 = bpy.data.objects.get(lod3_name)
if lod3 is None:
    raise RuntimeError(f"LOD3 not found: {lod3_name} — run fo4_lod_generator.py first")

# Remove all materials (collision mesh doesn't render)
lod3.data.materials.clear()

# Triangulate
bpy.context.view_layer.objects.active = lod3
lod3.select_set(True)
mod = lod3.modifiers.new("Triangulate", 'TRIANGULATE')
mod.quad_method = 'BEAUTY'
bpy.ops.object.modifier_apply(modifier=mod.name)
lod3.select_set(False)

# Rename: MyAsset_LOD3 → MyAsset_LOD3_COL
col_name = lod3.name + "_COL"
lod3.name = col_name
lod3.display_type = 'WIRE'  # Visual cue — not rendered

print(f"Collision mesh ready: {col_name}")
print(f"In pyNIF: set Collision Source = {col_name}")
print("Use bhkConvexShape (complex) or bhkBoxShape (simple) / MO_SYS_STATIC / Mass=0")
