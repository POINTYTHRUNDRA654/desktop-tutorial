"""
FO4 Creature Rigging Automation Script
Run in Blender's Scripting tab.
Usage: Select your custom creature mesh (active), Shift-select vanilla creature mesh.
"""
import bpy

armor = bpy.context.active_object
sel = [o for o in bpy.context.selected_objects if o != armor and o.type == 'MESH']
if not sel:
    raise RuntimeError("Shift-select the vanilla creature mesh first, then make your creature active")
body = sel[0]

if armor is None or armor.type != 'MESH':
    raise RuntimeError("Active object must be your custom creature mesh")

# Find creature armature
armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
if not armatures:
    raise RuntimeError("No armature found — import creature skeleton NIF first")
armature = armatures[0]
print(f"Using armature: {armature.name}")

# Add Armature modifier
if "Armature" not in armor.modifiers:
    mod = armor.modifiers.new("Armature", 'ARMATURE')
    mod.object = armature
    print(f"Armature modifier added → {armature.name}")

# Transfer weights via Data Transfer modifier
dt = armor.modifiers.new("CreatureWeightTransfer", 'DATA_TRANSFER')
dt.object = body
dt.use_vert_data = True
dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'
dt.layers_vgroup_select_src = 'ALL'
dt.layers_vgroup_select_dst = 'NAME'
bpy.ops.object.modifier_apply(modifier="CreatureWeightTransfer")
print(f"Weights transferred: {body.name} → {armor.name}")

# Clean weights
bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.001, keep_single=False)
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.mode_set(mode='OBJECT')

print("Creature rigging complete.")
print("Next: Add SBP_32 partition if gore needed, then export with pyNIF (Skinning=ON)")
print("For animations: create Actions → export FBX → convert to HKX with hkxcmd")
