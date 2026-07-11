"""
FO4 LOD Generator Script
Run inside Blender's Scripting tab with your main mesh selected.
Creates LOD0 (original), LOD1 (medium), LOD2 (low), LOD3 (collision candidate).
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
lod3 = obj.copy(); lod3.data = obj.data.copy()

for lod in (lod1, lod2, lod3):
    bpy.context.collection.objects.link(lod)

lod0.name = base_name + "_LOD0"
lod1.name = base_name + "_LOD1"
lod2.name = base_name + "_LOD2"
lod3.name = base_name + "_LOD3"

def decimate(obj, ratio):
    mod = obj.modifiers.new("Decimate", 'DECIMATE')
    mod.ratio = ratio
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)

decimate(lod1, 0.6)  # Medium detail
decimate(lod2, 0.3)  # Low detail
decimate(lod3, 0.1)  # Collision candidate

# Mark LOD3 as collision candidate — remove materials
lod3.data.materials.clear()

print(f"Created: {lod0.name}, {lod1.name}, {lod2.name}, {lod3.name}")
print("Next: rename LOD3 to Mesh_Collision, set as bhkConvexShape in pyNIF export")
