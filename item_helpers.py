"""
Item creation helpers for Fallout 4 - weapons, armor, consumables, misc items
"""

import bpy

class ItemHelpers:
    """Helper functions for item creation"""
    
    @staticmethod
    def create_weapon_base(weapon_category='PISTOL'):
        """Create weapon base mesh"""
        if weapon_category == 'PISTOL':
            # Pistol grip + barrel
            bpy.ops.mesh.primitive_cube_add(size=0.15, location=(0, 0, 0))
            grip = bpy.context.active_object
            grip.name = "Weapon_Grip"
            grip.scale = (0.5, 1.0, 1.5)
            
            bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.3, location=(0, 0, 0.15))
            barrel = bpy.context.active_object
            barrel.name = "Weapon_Barrel"
            barrel.rotation_euler[1] = 1.5708  # Rotate horizontal
            
        elif weapon_category == 'RIFLE':
            # Longer barrel + stock
            bpy.ops.mesh.primitive_cube_add(size=0.15, location=(0, -0.2, 0))
            stock = bpy.context.active_object
            stock.name = "Weapon_Stock"
            stock.scale = (0.5, 2.0, 1.0)
            
            bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.6, location=(0, 0.4, 0))
            barrel = bpy.context.active_object
            barrel.name = "Weapon_Barrel"
            barrel.rotation_euler[1] = 1.5708
            
        elif weapon_category == 'MELEE':
            # Handle + blade
            bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.3, location=(0, 0, 0))
            handle = bpy.context.active_object
            handle.name = "Weapon_Handle"
            
            bpy.ops.mesh.primitive_cube_add(size=0.5, location=(0, 0, 0.4))
            blade = bpy.context.active_object
            blade.name = "Weapon_Blade"
            blade.scale = (0.1, 0.3, 1.0)
            
        elif weapon_category == 'HEAVY':
            # Large weapon base
            bpy.ops.mesh.primitive_cube_add(size=0.3, location=(0, 0, 0))
            body = bpy.context.active_object
            body.name = "Weapon_Body"
            body.scale = (1.0, 2.0, 1.2)
        
        return bpy.context.active_object
    
    @staticmethod
    def add_weapon_mod_slot(weapon, slot_type='RECEIVER'):
        """Add modification slot marker to weapon"""
        bpy.ops.object.empty_add(type='CIRCLE', radius=0.05, location=weapon.location)
        slot = bpy.context.active_object
        slot.name = f"ModSlot_{slot_type}"
        slot.parent = weapon
        
        # Position based on slot type
        if slot_type == 'RECEIVER':
            slot.location.z += 0.05
        elif slot_type == 'BARREL':
            slot.location.y += 0.2
        elif slot_type == 'GRIP':
            slot.location.z -= 0.1
        elif slot_type == 'SIGHTS':
            slot.location.z += 0.15
        
        return slot
    
    @staticmethod
    def create_armor_piece(armor_slot='CHEST'):
        """Create armor piece base"""
        if armor_slot == 'HELMET':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(0, 0, 1.7))
            armor = bpy.context.active_object
            armor.name = "Armor_Helmet"
            
        elif armor_slot == 'CHEST':
            bpy.ops.mesh.primitive_cube_add(size=0.8, location=(0, 0, 1.2))
            armor = bpy.context.active_object
            armor.name = "Armor_Chest"
            armor.scale = (1.2, 0.6, 1.0)
            
        elif armor_slot == 'ARMS':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.6, location=(0, 0, 1.2))
            armor = bpy.context.active_object
            armor.name = "Armor_Arms"
            
        elif armor_slot == 'LEGS':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.8, location=(0, 0, 0.5))
            armor = bpy.context.active_object
            armor.name = "Armor_Legs"
            
        elif armor_slot == 'OUTFIT':
            # Full body outfit
            bpy.ops.mesh.primitive_cube_add(size=1.8, location=(0, 0, 0.9))
            armor = bpy.context.active_object
            armor.name = "Armor_Outfit"
            armor.scale = (0.5, 0.3, 1.0)
        
        return armor
    
    @staticmethod
    def create_power_armor_piece(piece='TORSO'):
        """Create power armor piece"""
        if piece == 'TORSO':
            bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.3))
            pa = bpy.context.active_object
            pa.name = "PowerArmor_Torso"
            pa.scale = (1.5, 0.8, 1.2)
            
        elif piece == 'HELMET':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.25, location=(0, 0, 1.9))
            pa = bpy.context.active_object
            pa.name = "PowerArmor_Helmet"
            
        elif piece == 'ARM_LEFT':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.8, location=(-0.5, 0, 1.2))
            pa = bpy.context.active_object
            pa.name = "PowerArmor_ArmL"
            
        elif piece == 'ARM_RIGHT':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.8, location=(0.5, 0, 1.2))
            pa = bpy.context.active_object
            pa.name = "PowerArmor_ArmR"
            
        elif piece == 'LEG_LEFT':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=1.0, location=(-0.3, 0, 0.5))
            pa = bpy.context.active_object
            pa.name = "PowerArmor_LegL"
            
        elif piece == 'LEG_RIGHT':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=1.0, location=(0.3, 0, 0.5))
            pa = bpy.context.active_object
            pa.name = "PowerArmor_LegR"
        
        return pa
    
    @staticmethod
    def create_consumable(item_type='STIMPAK'):
        """Create consumable item"""
        if item_type == 'STIMPAK':
            # Syringe shape
            bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.15, location=(0, 0, 0.075))
            item = bpy.context.active_object
            item.name = "Consumable_Stimpak"
            
        elif item_type == 'BOTTLE':
            # Bottle shape
            bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.2, location=(0, 0, 0.1))
            item = bpy.context.active_object
            item.name = "Consumable_Bottle"
            
        elif item_type == 'FOOD':
            # Box/package
            bpy.ops.mesh.primitive_cube_add(size=0.08, location=(0, 0, 0.04))
            item = bpy.context.active_object
            item.name = "Consumable_Food"
            item.scale = (1.2, 0.8, 0.6)
            
        elif item_type == 'CHEM':
            # Inhaler/injector
            bpy.ops.mesh.primitive_cube_add(size=0.06, location=(0, 0, 0.03))
            item = bpy.context.active_object
            item.name = "Consumable_Chem"
            item.scale = (0.8, 1.2, 0.6)
        
        return item
    
    @staticmethod
    def create_misc_item(item_type='TOOL'):
        """Create miscellaneous item"""
        if item_type == 'TOOL':
            # Wrench/tool
            bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.25, location=(0, 0, 0.125))
            item = bpy.context.active_object
            item.name = "Misc_Tool"
            
        elif item_type == 'COMPONENT':
            # Generic component
            bpy.ops.mesh.primitive_cube_add(size=0.05, location=(0, 0, 0.025))
            item = bpy.context.active_object
            item.name = "Misc_Component"
            
        elif item_type == 'JUNK':
            # Random junk
            bpy.ops.mesh.primitive_ico_sphere_add(radius=0.06, location=(0, 0, 0.06))
            item = bpy.context.active_object
            item.name = "Misc_Junk"
            
        elif item_type == 'KEY':
            # Key item
            bpy.ops.mesh.primitive_cube_add(size=0.08, location=(0, 0, 0.04))
            item = bpy.context.active_object
            item.name = "Misc_Key"
            item.scale = (0.3, 1.5, 0.2)
            
        elif item_type == 'HOLOTAPE':
            # Holotape
            bpy.ops.mesh.primitive_cube_add(size=0.08, location=(0, 0, 0.04))
            item = bpy.context.active_object
            item.name = "Misc_Holotape"
            item.scale = (1.5, 1.0, 0.15)
        
        return item
    
    @staticmethod
    def create_ammo(ammo_type='BULLET'):
        """Create ammunition"""
        if ammo_type == 'BULLET':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.005, depth=0.02, location=(0, 0, 0.01))
            ammo = bpy.context.active_object
            ammo.name = "Ammo_Bullet"
            
        elif ammo_type == 'SHELL':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.008, depth=0.03, location=(0, 0, 0.015))
            ammo = bpy.context.active_object
            ammo.name = "Ammo_Shell"
            
        elif ammo_type == 'CELL':
            # Energy cell
            bpy.ops.mesh.primitive_cube_add(size=0.02, location=(0, 0, 0.01))
            ammo = bpy.context.active_object
            ammo.name = "Ammo_Cell"
            ammo.scale = (0.8, 1.2, 0.6)
            
        elif ammo_type == 'MINI_NUKE':
            # Mini nuke
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(0, 0, 0.08))
            ammo = bpy.context.active_object
            ammo.name = "Ammo_MiniNuke"
        
        return ammo
    
    @staticmethod
    def add_item_value(obj, value=10):
        """Add value metadata to item"""
        obj["FO4_Value"] = value
        return obj
    
    @staticmethod
    def add_item_weight(obj, weight=1.0):
        """Add weight metadata to item"""
        obj["FO4_Weight"] = weight
        return obj
    
    @staticmethod
    def setup_item_pickup_marker(obj):
        """Add pickup point marker for item"""
        bpy.ops.object.empty_add(type='SPHERE', radius=0.05, location=obj.location)
        marker = bpy.context.active_object
        marker.name = f"{obj.name}_PickupMarker"
        marker.parent = obj
        return marker

class ClutterHelpers:
    """Helper functions for world clutter objects"""
    
    @staticmethod
    def create_clutter_object(clutter_type='BOTTLE'):
        """Create clutter object for world decoration"""
        if clutter_type == 'BOTTLE':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.15, location=(0, 0, 0.075))
            obj = bpy.context.active_object
            obj.name = "Clutter_Bottle"
            
        elif clutter_type == 'CAN':
            bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.1, location=(0, 0, 0.05))
            obj = bpy.context.active_object
            obj.name = "Clutter_Can"
            
        elif clutter_type == 'PAPER':
            bpy.ops.mesh.primitive_plane_add(size=0.1, location=(0, 0, 0.01))
            obj = bpy.context.active_object
            obj.name = "Clutter_Paper"
            
        elif clutter_type == 'BOX':
            bpy.ops.mesh.primitive_cube_add(size=0.2, location=(0, 0, 0.1))
            obj = bpy.context.active_object
            obj.name = "Clutter_Box"
            
        elif clutter_type == 'TIRE':
            bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.08, location=(0, 0, 0.3))
            obj = bpy.context.active_object
            obj.name = "Clutter_Tire"
            obj.rotation_euler[0] = 1.5708  # Lay flat
        
        return obj

def register():
    """Register item helpers"""
    pass

def unregister():
    """Unregister item helpers"""
    pass
