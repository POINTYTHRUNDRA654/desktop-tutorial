"""
FO4 Rigging Automation Script
Run inside Blender's Scripting tab.
Usage: Select armor first, then Shift-select FO4 body mesh, then Run Script.
"""
import bpy

# Active = armor (last selected), other = FO4 body
armor = bpy.context.active_object
sel = [o for o in bpy.context.selected_objects if o != armor and o.type == 'MESH']
if not sel:
    raise RuntimeError("Shift-select the FO4 body mesh first, then make your armor active")
body = sel[0]

if armor is None or armor.type != 'MESH':
    raise RuntimeError("Active object must be your armor mesh")

# Find armature
armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
if not armatures:
    raise RuntimeError("No armature found — import FO4 skeleton NIF first")
armature = armatures[0]

# Add Armature modifier
if "Armature" not in armor.modifiers:
    mod = armor.modifiers.new("Armature", 'ARMATURE')
    mod.object = armature
    print(f"Armature modifier added → {armature.name}")
else:
    print("Armature modifier already present")

# Transfer weights via Data Transfer modifier
dt = armor.modifiers.new("FO4_WeightTransfer", 'DATA_TRANSFER')
dt.object = body
dt.use_vert_data = True
dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'
dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier="FO4_WeightTransfer")
print(f"Weights transferred: {body.name} → {armor.name}")

# Clean weights
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.001, keep_single=False)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.mode_set(mode='OBJECT')

print("FO4 rigging complete.")
print("Next: Add SBP partition vertex groups, then export with pyNIF (Skinning ON, BSDismember ON)")
