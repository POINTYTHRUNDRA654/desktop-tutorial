"""fo4_weather_interior.py — Weather particles and interior cell helpers."""
import bpy, math, os

WEATHER_PRESETS = {
    "RAIN":      {"particles":800,  "velocity":(0,-2,-5), "size":0.02, "color":(0.7,0.8,1.0)},
    "HEAVY_RAIN":{"particles":2000, "velocity":(0,-3,-8), "size":0.025,"color":(0.6,0.7,0.9)},
    "SNOW":      {"particles":600,  "velocity":(0,-0.5,-1),"size":0.04,"color":(1,1,1)},
    "BLIZZARD":  {"particles":1500, "velocity":(2,-2,-3), "size":0.035,"color":(0.95,0.97,1)},
    "ASH":       {"particles":400,  "velocity":(0.5,0,-0.5),"size":0.03,"color":(0.4,0.35,0.3)},
    "RAD_STORM": {"particles":300,  "velocity":(1,0.5,-0.3),"size":0.05,"color":(0.5,0.8,0.2)},
    "FOG":       {"particles":100,  "velocity":(0.1,0,-0.05),"size":0.2,"color":(0.8,0.85,0.9)},
}

LIGHT_PRESETS = {
    "INTERIOR_WARM": {"energy":300, "color":(1.0,0.85,0.65), "radius":5.0},
    "INTERIOR_COOL": {"energy":200, "color":(0.7,0.8,1.0),   "radius":4.0},
    "NEON_RED":      {"energy":150, "color":(1.0,0.2,0.1),   "radius":2.5},
    "NEON_BLUE":     {"energy":150, "color":(0.2,0.5,1.0),   "radius":2.5},
    "VAULT_FLUORO":  {"energy":500, "color":(0.9,0.95,1.0),  "radius":6.0},
    "CANDLE":        {"energy":80,  "color":(1.0,0.6,0.2),   "radius":1.5},
    "RADIOACTIVE":   {"energy":200, "color":(0.4,1.0,0.2),   "radius":3.0},
}


def add_weather_particles(weather_type: str = "RAIN",
                           emitter_size: float = 20.0) -> bpy.types.Object:
    """Add a weather particle emitter above the scene."""
    preset = WEATHER_PRESETS.get(weather_type, WEATHER_PRESETS["RAIN"])
    bpy.ops.mesh.primitive_plane_add(size=emitter_size, location=(0, 0, 15))
    emitter = bpy.context.active_object
    emitter.name = f"FO4_Weather_{weather_type}"
    emitter.display_type = 'WIRE'
    emitter["fo4_weather_type"] = weather_type

    ps_mod = emitter.modifiers.new(f"PS_{weather_type}", 'PARTICLE_SYSTEM')
    ps     = emitter.particle_systems[-1]
    s      = ps.settings

    s.count            = preset["particles"]
    s.lifetime         = 80
    s.emit_from        = 'FACE'
    s.distribution     = 'RAND'
    s.normal_factor    = 0
    s.object_align_factor[0] = preset["velocity"][0]
    s.object_align_factor[1] = preset["velocity"][1]
    s.object_align_factor[2] = preset["velocity"][2]
    s.particle_size    = preset["size"]
    s.size_random      = 0.3
    s.render_type      = 'SPHERE'
    s.physics_type     = 'NEWTON'
    s.drag_factor      = 0.1
    s.effector_weights.gravity = 0.8 if weather_type in ("RAIN","HEAVY_RAIN","SNOW","BLIZZARD") else 0.1

    # Emission material
    mat = bpy.data.materials.new(f"FO4_Weather_{weather_type}_mat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out  = nodes.new('ShaderNodeOutputMaterial')
    emit = nodes.new('ShaderNodeEmission')
    r,g,b = preset["color"]
    emit.inputs['Color'].default_value    = (r, g, b, 1.0)
    emit.inputs['Strength'].default_value = 2.0
    links.new(emit.outputs['Emission'], out.inputs['Surface'])
    emitter.data.materials.append(mat)

    print(f"[Weather] {weather_type} emitter added: {preset['particles']} particles")
    return emitter


def place_interior_lights(scene_objects: list,
                            preset: str = "INTERIOR_WARM",
                            auto_spacing: float = 4.0) -> list:
    """Auto-place lights above walkable surfaces in an interior cell."""
    lp     = LIGHT_PRESETS.get(preset, LIGHT_PRESETS["INTERIOR_WARM"])
    placed = []

    # Find horizontal surfaces (floor-like faces)
    import mathutils
    up = mathutils.Vector((0, 0, 1))
    for obj in scene_objects:
        if obj.type != 'MESH':
            continue
        mw = obj.matrix_world
        for poly in obj.data.polygons:
            world_normal = (mw.to_3x3() @ poly.normal).normalized()
            if world_normal.dot(up) > 0.7:   # roughly horizontal upward face
                center = mw @ poly.center
                # Place light above this face
                light_loc = (center.x, center.y, center.z + 2.2)
                light_data = bpy.data.lights.new(f"FO4_InteriorLight_{len(placed):03d}", 'POINT')
                light_data.energy            = lp["energy"]
                light_data.color             = lp["color"]
                light_data.shadow_soft_size  = lp["radius"]
                light_obj = bpy.data.objects.new(f"FO4_Light_{len(placed):03d}", light_data)
                bpy.context.collection.objects.link(light_obj)
                light_obj.location = light_loc
                light_obj["fo4_light_preset"] = preset
                placed.append(light_obj)
                if len(placed) >= 50:   # safety cap
                    break
        if len(placed) >= 50:
            break

    print(f"[Interior] Placed {len(placed)} lights (preset: {preset})")
    return placed


def add_room_snap_grid(cell_size: float = 256.0, grid_count: int = 3) -> list:
    """Add a snap grid for room piece alignment."""
    snaps = []
    step = cell_size / grid_count
    for xi in range(grid_count):
        for yi in range(grid_count):
            x = (xi - grid_count//2) * step
            y = (yi - grid_count//2) * step
            bpy.ops.object.empty_add(type='PLAIN_AXES', location=(x, y, 0))
            emp = bpy.context.active_object
            emp.name = f"FO4_RoomSnap_{xi}_{yi}"
            emp.display_size = step * 0.4
            emp["fo4_room_snap"] = True
            snaps.append(emp)
    return snaps


# Operators

class FO4_OT_AddWeatherParticles(bpy.types.Operator):
    """Add a weather particle system to the scene."""
    bl_idname  = "fo4.add_weather_particles"
    bl_label   = "Add Weather Particles"
    bl_options = {'REGISTER', 'UNDO'}

    weather_type: bpy.props.EnumProperty(
        name="Weather",
        items=[(k, k.replace("_"," ").title(), "") for k in WEATHER_PRESETS],
        default="RAIN",
    )
    emitter_size: bpy.props.FloatProperty(name="Emitter Size", default=20.0, min=5.0)

    def execute(self, context):
        obj = add_weather_particles(self.weather_type, self.emitter_size)
        self.report({'INFO'}, f"Weather system added: {obj.name}")
        return {'FINISHED'}


class FO4_OT_PlaceInteriorLights(bpy.types.Operator):
    """Auto-place lights above floor surfaces in selected objects."""
    bl_idname  = "fo4.place_interior_lights"
    bl_label   = "Auto-Place Interior Lights"
    bl_options = {'REGISTER', 'UNDO'}

    light_preset: bpy.props.EnumProperty(
        name="Light Type",
        items=[(k, k.replace("_"," ").title(), "") for k in LIGHT_PRESETS],
        default="INTERIOR_WARM",
    )

    def execute(self, context):
        objects = list(context.selected_objects) or list(context.scene.objects)
        lights  = place_interior_lights(objects, self.light_preset)
        self.report({'INFO'}, f"Placed {len(lights)} interior lights")
        return {'FINISHED'}


class FO4_OT_AddRoomSnapGrid(bpy.types.Operator):
    """Add snap grid empties for room piece alignment."""
    bl_idname  = "fo4.add_room_snap_grid"
    bl_label   = "Add Room Snap Grid"
    bl_options = {'REGISTER', 'UNDO'}

    cell_size: bpy.props.FloatProperty(name="Cell Size (game units)", default=256.0)

    def execute(self, context):
        snaps = add_room_snap_grid(self.cell_size)
        self.report({'INFO'}, f"Added {len(snaps)} room snap points")
        return {'FINISHED'}


_CLASSES = [FO4_OT_AddWeatherParticles, FO4_OT_PlaceInteriorLights, FO4_OT_AddRoomSnapGrid]


def register():
    for cls in _CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass


def unregister():
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
