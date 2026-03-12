# Fallout 4 Havok Physics – Blender / Niftools Reference

## Overview
Every solid mesh in FO4 needs a `bhkRigidBody` node in its NIF.
The Niftools exporter reads Blender's rigid-body settings plus a set of
`fo4_*` custom object properties written by the FO4 Mod Assistant.

## Key concepts

### Collision layers
The layer determines which other objects this mesh collides with.

| ID  | Name                  | Typical use                            |
|-----|-----------------------|----------------------------------------|
| 1   | L_STATIC              | Immoveable world geometry              |
| 2   | L_ANIMSTATIC          | Doors, lifts, animated statics         |
| 5   | L_BIPED               | Player / NPC bodies                    |
| 7   | L_PROPS               | Moveable physics props                 |
| 8   | L_DEBRIS_SMALL        | Gibs, small debris from explosions     |
| 9   | L_HAVOK_LANDSCAPE     | Terrain / landscape collision mesh     |
| 32  | L_WEAPON              | Weapon projectiles                     |
| 35  | L_TREES               | Trees and foliage                      |

### Motion types
| Type          | Mass  | Usage                                        |
|---------------|-------|----------------------------------------------|
| FIXED         | 0     | Permanently static, never moves              |
| KEYFRAMED     | 0     | Moved only by animation / scripts            |
| DYNAMIC       | > 0   | Full physics simulation                      |
| SPHERE_INERTIA| > 0   | Simplified inertia tensor (round objects)    |

### Quality types
| Quality   | Used with            |
|-----------|----------------------|
| FIXED     | FIXED motion         |
| KEYFRAMED | KEYFRAMED motion     |
| DEBRIS    | Small flying debris  |
| MOVING    | General dynamic prop |

## Niftools custom properties
Set these on the mesh object (Properties panel → Custom Properties, or via
the FO4 Mod Assistant Physics panel):

| Property name           | Type   | Example      |
|-------------------------|--------|--------------|
| `fo4_collision_layer`   | int    | 7            |
| `fo4_motion_type`       | string | "DYNAMIC"    |
| `fo4_havok_mass`        | float  | 15.0         |
| `fo4_havok_friction`    | float  | 0.7          |
| `fo4_havok_restitution` | float  | 0.15         |
| `fo4_havok_quality`     | string | "MOVING"     |
| `fo4_collision_preset`  | string | "DYNAMIC_PROP_MEDIUM" |

## Collision mesh naming
The FO4 NIF format expects a separate low-poly collision mesh:
- Name it `UCX_<VisualMeshName>` (e.g. `UCX_Fridge_01`)
- Must be a convex hull (or compound of convex hulls)
- Keep poly count ≤ 32 faces for best performance
- The visual mesh and collision mesh export as separate NIF nodes

## Common mistakes

### FIXED/KEYFRAMED with mass > 0
- Havok will silently ignore the mass and treat it as 0
- The FO4 Mod Assistant warns about this

### DYNAMIC with mass = 0
- Object will be treated as static – physics won't simulate
- Always set a realistic mass in kg

### Missing UCX_ mesh
- The visual mesh is used as the collision shape (expensive)
- Always provide a simplified UCX_ mesh for anything > 100 tris

### Wrong layer
- Using L_STATIC for a door causes it to not open for NPCs
- Using L_BIPED for a prop causes NPCs to walk through it

## Physics presets available
| Preset ID              | Label                     | Layer  | Mass   |
|------------------------|---------------------------|--------|--------|
| STATIC_METAL           | Static Metal              | 1      | 0      |
| STATIC_STONE           | Static Stone/Concrete     | 1      | 0      |
| STATIC_WOOD            | Static Wood               | 1      | 0      |
| ANIMSTATIC_DOOR        | Animated Static Door      | 2      | 0      |
| DYNAMIC_PROP_LIGHT     | Dynamic Prop Light (<5kg) | 7      | 1.0    |
| DYNAMIC_PROP_MEDIUM    | Dynamic Prop Medium       | 7      | 15.0   |
| DYNAMIC_PROP_HEAVY     | Dynamic Prop Heavy (>50kg)| 7      | 80.0   |
| DYNAMIC_DEBRIS         | Dynamic Debris            | 8      | 0.5    |
| STATIC_GLASS           | Static Glass              | 1      | 0      |
| DYNAMIC_GLASS          | Dynamic Glass/Bottle      | 7      | 0.8    |
| STATIC_TREE            | Static Tree/Large Plant   | 35     | 0      |
| STATIC_VEHICLE         | Static Vehicle            | 1      | 0      |

## Workflow
1. Model your mesh in Blender
2. Create a `UCX_<name>` low-poly collision duplicate
3. Open N panel → Fallout 4 → Havok Physics
4. Select a preset and click **Apply to Selected**
5. Verify the custom properties in Object Properties → Custom Properties
6. Export with Niftools – the rigid body is auto-generated from these settings
