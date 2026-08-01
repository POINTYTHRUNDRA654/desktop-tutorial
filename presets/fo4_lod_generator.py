"""
FO4 LOD Generator Script
Run inside Blender's Scripting tab with your main mesh selected.
Creates LOD0 (original), LOD1 (medium), LOD2 (far -- collision candidate).

Ratios verified against the real vanilla+DLC reference library
(BlastedForestBurntTreeUpright01): real FO4 LOD meshes are in the TENS of
triangles, not hundreds -- there are only two real reduced-mesh levels, then
a baked billboard (not a further-decimated copy) for the farthest distance.
These ratios match that; see advanced_mesh_helpers.generate_lod_chain for
the addon's full generator, which also builds the billboard automatically.
"""
import bpy

obj = bpy.context.active_object
if obj is None or obj.type != 'MESH':
    raise RuntimeError("Select a mesh object first")

base_name = obj.name.removesuffix("_LOD0")

# Duplicate for LODs (data copy so modifiers are independent)
lod0 = obj
lod1 = obj.copy(); lod1.data = obj.data.copy()
lod2 = obj.copy(); lod2.data = obj.data.copy()

for lod in (lod1, lod2):
    bpy.context.collection.objects.link(lod)

lod0.name = base_name + "_LOD0"
lod1.name = base_name + "_LOD1"
lod2.name = base_name + "_LOD2"

def decimate(obj, ratio):
    mod = obj.modifiers.new("Decimate", 'DECIMATE')
    mod.ratio = ratio
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)

decimate(lod1, 0.15)  # medium distance
decimate(lod2, 0.04)  # far distance -- collision candidate

# Mark LOD2 as collision candidate — remove materials
lod2.data.materials.clear()

print(f"Created: {lod0.name}, {lod1.name}, {lod2.name}")
print("Next: rename LOD2 to Mesh_Collision, set as bhkConvexShape in pyNIF export")
print("For the farthest LOD, generate a baked billboard instead of a 3rd decimated "
      "level (see fo4_billboard.py, or the addon's own Generate LOD Chain + Collision button).")
