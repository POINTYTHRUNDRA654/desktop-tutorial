"""
NPC and creature creation helpers for Fallout 4
"""

import bpy

class NPCHelpers:
    """Helper functions for NPC creation"""
    
    @staticmethod
    def create_npc_base_mesh(npc_type='HUMAN'):
        """Create base mesh for NPC based on type"""
        if npc_type in ('HUMAN', 'NPC_HUMAN'):
            # Human proportions
            bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0.9))
            body = bpy.context.active_object
            body.name = "NPC_Body"
            body.scale = (0.4, 0.2, 0.9)

            # Head
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(0, 0, 1.7))
            head = bpy.context.active_object
            head.name = "NPC_Head"

        elif npc_type in ('GHOUL', 'NPC_GHOUL'):
            # Hunched posture
            bpy.ops.mesh.primitive_cube_add(size=1.6, location=(0, 0.2, 0.8))
            body = bpy.context.active_object
            body.name = "Ghoul_Body"
            body.scale = (0.4, 0.25, 0.8)
            body.rotation_euler[0] = 0.3  # Hunch forward

        elif npc_type in ('SUPERMUTANT', 'NPC_SUPERMUTANT'):
            # Larger, bulkier
            bpy.ops.mesh.primitive_cube_add(size=2.5, location=(0, 0, 1.25))
            body = bpy.context.active_object
            body.name = "SuperMutant_Body"
            body.scale = (0.8, 0.5, 1.25)

        elif npc_type in ('ROBOT', 'NPC_PROTECTRON'):
            # Boxy robot / Protectron shape
            bpy.ops.mesh.primitive_cylinder_add(radius=0.4, depth=1.4, location=(0, 0, 0.7))
            body = bpy.context.active_object
            body.name = "Protectron_Body"
            body.scale = (1.0, 0.8, 1.0)

        elif npc_type == 'NPC_SYNTH':
            # Humanoid synth — slim proportions
            bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0.9))
            body = bpy.context.active_object
            body.name = "Synth_Body"
            body.scale = (0.35, 0.18, 0.9)

        else:
            # Generic human-proportioned fallback — ensures body is always assigned
            bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0.9))
            body = bpy.context.active_object
            body.name = f"NPC_Body_{npc_type}"
            body.scale = (0.4, 0.2, 0.9)

        return body
    
    @staticmethod
    def setup_npc_armature():
        """Create a basic FO4-compatible armature for NPC meshes.

        Bone names follow the FO4 vanilla convention ("NPC X [Abbrev]") so
        that clothing and armour pieces created by the add-on will deform
        correctly when the skeleton is used with vanilla equipment in-game.
        """
        bpy.ops.object.armature_add(location=(0, 0, 0))
        armature = bpy.context.active_object
        armature.name = "NPC_Armature"

        # Switch to edit mode to add bones
        bpy.ops.object.mode_set(mode='EDIT')

        edit_bones = armature.data.edit_bones

        # Root bone
        root = edit_bones[0]
        root.name = "Root"
        root.head = (0, 0, 0)
        root.tail = (0, 0, 0.1)

        # COM (centre of mass) — driven by locomotion animations
        com = edit_bones.new("COM [COM]")
        com.head = (0, 0, 0.9)
        com.tail = (0, 0, 1.0)
        com.parent = root

        # Pelvis — root of the biped hierarchy
        pelvis = edit_bones.new("NPC Pelvis [Pelvis]")
        pelvis.head = (0, 0, 1.0)
        pelvis.tail = (0, 0, 1.1)
        pelvis.parent = com

        # Spine chain
        spine = edit_bones.new("NPC Spine [Spine]")
        spine.head = (0, 0, 1.1)
        spine.tail = (0, 0, 1.25)
        spine.parent = pelvis

        spine1 = edit_bones.new("NPC Spine1 [Spine1]")
        spine1.head = (0, 0, 1.25)
        spine1.tail = (0, 0, 1.4)
        spine1.parent = spine

        spine2 = edit_bones.new("NPC Spine2 [Spine2]")
        spine2.head = (0, 0, 1.4)
        spine2.tail = (0, 0, 1.55)
        spine2.parent = spine1

        # Neck and Head
        neck = edit_bones.new("NPC Neck [Neck]")
        neck.head = (0, 0, 1.55)
        neck.tail = (0, 0, 1.65)
        neck.parent = spine2

        head = edit_bones.new("NPC Head [Head]")
        head.head = (0, 0, 1.65)
        head.tail = (0, 0, 1.8)
        head.parent = neck

        bpy.ops.object.mode_set(mode='OBJECT')

        return armature
    
    @staticmethod
    def add_npc_inventory_slot(obj, slot_name):
        """Add inventory slot marker to NPC mesh"""
        # Create empty for inventory slot
        bpy.ops.object.empty_add(type='CUBE', radius=0.1, location=obj.location)
        slot = bpy.context.active_object
        slot.name = f"INV_{slot_name}"
        slot.parent = obj
        return slot

class CreatureHelpers:
    """Helper functions for creature creation"""
    
    @staticmethod
    def create_creature_base(creature_type='RADROACH'):
        """Create base mesh for creatures"""
        if creature_type in ('RADROACH', 'CR_RADROACH'):
            # Small insect-like
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, 0, 0.15))
            body = bpy.context.active_object
            body.name = "RadRoach_Body"
            body.scale = (1.2, 0.8, 0.4)

        elif creature_type in ('MOLERAT', 'CR_MOLERAT'):
            # Medium mammal
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 0.3))
            body = bpy.context.active_object
            body.name = "MoleRat_Body"
            body.scale = (1.5, 1.0, 0.7)

        elif creature_type in ('DEATHCLAW', 'CR_DEATHCLAW'):
            # Large bipedal
            bpy.ops.mesh.primitive_cube_add(size=2.5, location=(0, 0, 1.5))
            body = bpy.context.active_object
            body.name = "Deathclaw_Body"
            body.scale = (1.2, 0.8, 1.5)

        elif creature_type in ('MIRELURK', 'CR_MIRELURK'):
            # Crab-like
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.8, location=(0, 0, 0.5))
            body = bpy.context.active_object
            body.name = "Mirelurk_Body"
            body.scale = (1.5, 1.2, 0.6)

        elif creature_type == 'CR_RADSCORPION':
            # Segmented scorpion body
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.6, location=(0, 0, 0.3))
            body = bpy.context.active_object
            body.name = "RadScorpion_Body"
            body.scale = (1.4, 1.0, 0.5)

        elif creature_type == 'CR_BRAHMIN':
            # Two-headed cow — elongated body
            bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0.9))
            body = bpy.context.active_object
            body.name = "Brahmin_Body"
            body.scale = (0.6, 1.4, 0.7)

        else:
            # Generic creature fallback — ensures body is always assigned
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 0.3))
            body = bpy.context.active_object
            body.name = f"Creature_Body_{creature_type}"
            body.scale = (1.0, 1.0, 1.0)

        return body
    
    @staticmethod
    def add_creature_behavior_marker(obj, behavior='AGGRESSIVE'):
        """Add behavior marker for creature AI"""
        bpy.ops.object.empty_add(type='PLAIN_AXES', radius=0.5, location=obj.location)
        marker = bpy.context.active_object
        marker.name = f"AI_{behavior}"
        marker.parent = obj
        return marker

def register():
    """Register NPC/creature helpers"""
    pass

def unregister():
    """Unregister NPC/creature helpers"""
    pass
