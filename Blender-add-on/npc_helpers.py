"""
NPC and creature creation helpers for Fallout 4
"""

import bpy

class NPCHelpers:
    """Helper functions for NPC creation"""
    
    @staticmethod
    def create_npc_base_mesh(npc_type='HUMAN'):
        """Create base mesh for NPC based on type"""
        if npc_type == 'HUMAN':
            # Human proportions
            bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0.9))
            body = bpy.context.active_object
            body.name = "NPC_Body"
            body.scale = (0.4, 0.2, 0.9)
            
            # Head
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(0, 0, 1.7))
            head = bpy.context.active_object
            head.name = "NPC_Head"
            
        elif npc_type == 'GHOUL':
            # Hunched posture
            bpy.ops.mesh.primitive_cube_add(size=1.6, location=(0, 0.2, 0.8))
            body = bpy.context.active_object
            body.name = "Ghoul_Body"
            body.scale = (0.4, 0.25, 0.8)
            body.rotation_euler[0] = 0.3  # Hunch forward
            
        elif npc_type == 'SUPERMUTANT':
            # Larger, bulkier
            bpy.ops.mesh.primitive_cube_add(size=2.5, location=(0, 0, 1.25))
            body = bpy.context.active_object
            body.name = "SuperMutant_Body"
            body.scale = (0.8, 0.5, 1.25)
            
        elif npc_type == 'ROBOT':
            # Boxy robot shape
            bpy.ops.mesh.primitive_cube_add(size=1.5, location=(0, 0, 0.75))
            body = bpy.context.active_object
            body.name = "Robot_Body"
            body.scale = (0.5, 0.4, 0.75)
        
        return body
    
    @staticmethod
    def setup_npc_armature():
        """Create basic armature for NPC"""
        bpy.ops.object.armature_add(location=(0, 0, 0))
        armature = bpy.context.active_object
        armature.name = "NPC_Armature"
        
        # Switch to edit mode to add bones
        bpy.ops.object.mode_set(mode='EDIT')
        
        # Add basic bones (simplified)
        edit_bones = armature.data.edit_bones
        
        # Root bone
        root = edit_bones[0]
        root.name = "Root"
        root.head = (0, 0, 0)
        root.tail = (0, 0, 0.1)
        
        # Spine bones
        spine = edit_bones.new("Spine")
        spine.head = (0, 0, 0.1)
        spine.tail = (0, 0, 0.9)
        spine.parent = root
        
        # Head bone
        head = edit_bones.new("Head")
        head.head = (0, 0, 0.9)
        head.tail = (0, 0, 1.7)
        head.parent = spine
        
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
        if creature_type == 'RADROACH':
            # Small insect-like
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.3, location=(0, 0, 0.15))
            body = bpy.context.active_object
            body.name = "RadRoach_Body"
            body.scale = (1.2, 0.8, 0.4)
            
        elif creature_type == 'MOLERAT':
            # Medium mammal
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 0.3))
            body = bpy.context.active_object
            body.name = "MoleRat_Body"
            body.scale = (1.5, 1.0, 0.7)
            
        elif creature_type == 'DEATHCLAW':
            # Large bipedal
            bpy.ops.mesh.primitive_cube_add(size=2.5, location=(0, 0, 1.5))
            body = bpy.context.active_object
            body.name = "Deathclaw_Body"
            body.scale = (1.2, 0.8, 1.5)
            
        elif creature_type == 'MIRELURK':
            # Crab-like
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.8, location=(0, 0, 0.5))
            body = bpy.context.active_object
            body.name = "Mirelurk_Body"
            body.scale = (1.5, 1.2, 0.6)
            
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
