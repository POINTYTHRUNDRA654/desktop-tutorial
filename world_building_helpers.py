"""
World building helpers for Fallout 4 - interiors, exteriors, and props
"""

import bpy

class WorldBuildingHelpers:
    """Helper functions for world building"""
    
    @staticmethod
    def create_interior_cell_template(cell_type='ROOM'):
        """Create interior cell template"""
        if cell_type == 'ROOM':
            # Standard room
            size = (5, 5, 3)
        elif cell_type == 'CORRIDOR':
            # Hallway
            size = (10, 2, 3)
        elif cell_type == 'VAULT':
            # Vault room
            size = (8, 8, 4)
        elif cell_type == 'CAVE':
            # Cave interior
            size = (6, 6, 4)
        else:
            size = (5, 5, 3)
        
        # Create floor
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
        floor = bpy.context.active_object
        floor.name = f"Floor_{cell_type}"
        floor.scale = (size[0], size[1], 0.1)
        
        # Create walls
        wall_height = size[2] / 2
        
        # Wall North
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, size[1]/2, wall_height))
        wall_n = bpy.context.active_object
        wall_n.name = "Wall_North"
        wall_n.scale = (size[0], 0.1, size[2])
        
        # Wall South
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -size[1]/2, wall_height))
        wall_s = bpy.context.active_object
        wall_s.name = "Wall_South"
        wall_s.scale = (size[0], 0.1, size[2])
        
        # Wall East
        bpy.ops.mesh.primitive_cube_add(size=1, location=(size[0]/2, 0, wall_height))
        wall_e = bpy.context.active_object
        wall_e.name = "Wall_East"
        wall_e.scale = (0.1, size[1], size[2])
        
        # Wall West
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-size[0]/2, 0, wall_height))
        wall_w = bpy.context.active_object
        wall_w.name = "Wall_West"
        wall_w.scale = (0.1, size[1], size[2])
        
        # Create ceiling
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, size[2]))
        ceiling = bpy.context.active_object
        ceiling.name = "Ceiling"
        ceiling.scale = (size[0], size[1], 0.1)
        
        return floor
    
    @staticmethod
    def create_door_frame():
        """Create door frame marker"""
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1))
        door = bpy.context.active_object
        door.name = "DoorFrame"
        door.scale = (1.2, 0.1, 2.0)
        return door
    
    @staticmethod
    def create_window_frame():
        """Create window frame marker"""
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.5))
        window = bpy.context.active_object
        window.name = "WindowFrame"
        window.scale = (1.5, 0.1, 1.0)
        return window
    
    @staticmethod
    def create_navmesh_helper(bounds=(10, 10)):
        """Create navmesh plane helper"""
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.01))
        navmesh = bpy.context.active_object
        navmesh.name = "NavMesh_Helper"
        navmesh.scale = (bounds[0], bounds[1], 1)
        
        # Make it display as wireframe
        navmesh.display_type = 'WIRE'
        
        return navmesh
    
    @staticmethod
    def create_spawn_marker(spawn_type='NPC'):
        """Create spawn point marker"""
        bpy.ops.object.empty_add(type='SINGLE_ARROW', radius=1, location=(0, 0, 0))
        marker = bpy.context.active_object
        marker.name = f"SpawnMarker_{spawn_type}"
        marker.rotation_euler[0] = 1.5708  # Point upward
        return marker
    
    @staticmethod
    def create_trigger_volume(size=(2, 2, 2)):
        """Create trigger volume for quests/events"""
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, size[2]/2))
        trigger = bpy.context.active_object
        trigger.name = "TriggerVolume"
        trigger.scale = size
        trigger.display_type = 'WIRE'
        return trigger

class WorkshopHelpers:
    """Helper functions for workshop/settlement objects"""
    
    @staticmethod
    def create_workshop_object(object_type='FURNITURE'):
        """Create workshop object template"""
        if object_type == 'FURNITURE':
            # Chair
            bpy.ops.mesh.primitive_cube_add(size=0.5, location=(0, 0, 0.25))
            obj = bpy.context.active_object
            obj.name = "Workshop_Chair"
            
        elif object_type == 'BED':
            # Bed
            bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.3))
            obj = bpy.context.active_object
            obj.name = "Workshop_Bed"
            obj.scale = (1.0, 2.0, 0.3)
            
        elif object_type == 'WORKBENCH':
            # Workbench
            bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.4))
            obj = bpy.context.active_object
            obj.name = "Workshop_Workbench"
            obj.scale = (1.5, 0.8, 0.8)
            
        elif object_type == 'TURRET':
            # Defense turret
            bpy.ops.mesh.primitive_cylinder_add(radius=0.3, depth=0.8, location=(0, 0, 0.4))
            obj = bpy.context.active_object
            obj.name = "Workshop_Turret"
            
        elif object_type == 'GENERATOR':
            # Power generator
            bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))
            obj = bpy.context.active_object
            obj.name = "Workshop_Generator"
            obj.scale = (1.2, 0.8, 1.0)
        
        return obj
    
    @staticmethod
    def add_workshop_snap_points(obj):
        """Add snap points for workshop building"""
        # Create snap point empties
        snap_points = []
        
        # Top snap point
        bpy.ops.object.empty_add(type='CUBE', radius=0.1, location=(0, 0, obj.dimensions.z))
        snap_top = bpy.context.active_object
        snap_top.name = f"{obj.name}_Snap_Top"
        snap_top.parent = obj
        snap_points.append(snap_top)
        
        # Bottom snap point
        bpy.ops.object.empty_add(type='CUBE', radius=0.1, location=(0, 0, 0))
        snap_bottom = bpy.context.active_object
        snap_bottom.name = f"{obj.name}_Snap_Bottom"
        snap_bottom.parent = obj
        snap_points.append(snap_bottom)
        
        return snap_points

class LightingHelpers:
    """Helper functions for lighting setup"""
    
    @staticmethod
    def create_fo4_light(light_type='POINT'):
        """Create FO4-style light"""
        if light_type == 'POINT':
            bpy.ops.object.light_add(type='POINT', radius=1, location=(0, 0, 2))
            light = bpy.context.active_object
            light.name = "FO4_PointLight"
            light.data.energy = 100
            
        elif light_type == 'SPOT':
            bpy.ops.object.light_add(type='SPOT', radius=1, location=(0, 0, 3))
            light = bpy.context.active_object
            light.name = "FO4_SpotLight"
            light.data.energy = 150
            light.data.spot_size = 1.0
            
        elif light_type == 'SUN':
            bpy.ops.object.light_add(type='SUN', location=(0, 0, 10))
            light = bpy.context.active_object
            light.name = "FO4_Sunlight"
            light.data.energy = 2.0
            
        elif light_type == 'AREA':
            bpy.ops.object.light_add(type='AREA', location=(0, 0, 2.5))
            light = bpy.context.active_object
            light.name = "FO4_AreaLight"
            light.data.energy = 100
            light.data.size = 2.0
        
        return light
    
    @staticmethod
    def create_light_preset(preset='INTERIOR'):
        """Create lighting preset for scenes"""
        lights = []
        
        if preset == 'INTERIOR':
            # Standard interior lighting
            # Key light
            key = LightingHelpers.create_fo4_light('AREA')
            key.location = (3, 3, 3)
            key.data.energy = 80
            lights.append(key)
            
            # Fill light
            fill = LightingHelpers.create_fo4_light('POINT')
            fill.location = (-2, -2, 2.5)
            fill.data.energy = 40
            lights.append(fill)
            
        elif preset == 'VAULT':
            # Cold vault lighting
            light1 = LightingHelpers.create_fo4_light('AREA')
            light1.location = (0, 0, 2.8)
            light1.data.energy = 60
            light1.data.color = (0.8, 0.9, 1.0)  # Slightly blue
            lights.append(light1)
            
        elif preset == 'WASTELAND':
            # Harsh outdoor lighting
            sun = LightingHelpers.create_fo4_light('SUN')
            sun.rotation_euler = (0.5, 0, 0.5)
            sun.data.energy = 2.5
            sun.data.color = (1.0, 0.95, 0.85)  # Warm
            lights.append(sun)
        
        return lights

def register():
    """Register world building helpers"""
    pass

def unregister():
    """Unregister world building helpers"""
    pass
