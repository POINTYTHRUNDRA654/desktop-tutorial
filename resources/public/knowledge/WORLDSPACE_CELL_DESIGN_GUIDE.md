# Worldspace & Cell Design — Performance, Occlusion & Best Practices (Fallout 4, 2026)

This guide covers interior and exterior cell design: room bounds, portal systems, occlusion planes, cell layout best practices, lighting optimisation, and the precombine workflow for custom worldspaces.

---

## 1. Cell Types in Fallout 4

| Cell type | Used for | Key flag |
|---|---|---|
| **Interior cell** | Vaults, buildings, dungeons | `Is Interior Space` checked |
| **Exterior cell** | Open-world regions, worldspaces | Part of a worldspace grid |
| **Worldspace** | Defines the world container | WRLD record |

Interior cells are isolated rendering units — nothing outside the cell is rendered. Exterior cells form a grid; adjacent cells are loaded as the player moves.

---

## 2. Interior Cell Performance Architecture

### Room Bounds and the Visibility System

Room bounds (also called "Room Bounds Markers" or `RMBV`) are axis-aligned boxes placed in the CK that tell the renderer which areas of a cell are visible from a given portal opening. Without room bounds, the engine renders the entire cell at once.

**Without room bounds:** Every mesh in the entire interior cell is tested for visibility → expensive for large interiors.  
**With room bounds:** Only meshes inside the player's current room (and rooms visible through portals) are rendered.

### How to Set Up Room Bounds

1. In the CK, open your interior cell
2. Place **Room Bound Markers** (type `RoomBounds`) around each logical area
3. Each room bound is a box — position and scale it to tightly enclose the room
4. Connect rooms with **Portal Markers** (type `Portal`) placed at doorways
5. Set portal ownership: each portal knows which two room bounds it connects
6. Test: use `tdt` (toggle debug display) in-game to verify room bounds are active

### Portal Markers

A portal is a rectangular plane placed in a doorway or archway. It acts as a visibility gate:
- If the player can "see through" the portal rectangle from their position, the connected room is rendered
- If the portal is completely off-screen or behind the player, the connected room is culled entirely

**Portal placement rules:**
- Place portals flush with the wall opening (not floating in the room)
- Size the portal to exactly match the doorway
- Do not use portals for tiny windows — the overhead outweighs the benefit; only use for walk-through openings
- One portal per opening connecting exactly two rooms

---

## 3. Exterior Cell Performance Architecture

### The Exterior Cell Grid

Fallout 4's Commonwealth is a grid of exterior cells, each 4096×4096 game units. Cells are identified by `(X, Y)` coordinates from the world center.

### Precombines — Critical for Exterior Performance

Exterior cells use **precombined meshes** (precombines) to dramatically reduce draw calls. A group of 50 separate static objects in a cell is combined into 1–3 draw calls. Without precombines, that cell may cost 10–30× more GPU time.

**Rules for exterior cell design:**
1. Never directly edit vanilla static records in exterior cells — this breaks precombines
2. Use Base Object Swapper (BOS) for visual replacements — it bypasses the precombine break
3. If you must add new objects to an exterior cell, regenerate precombines for that cell
4. New worldspaces have no precombines by default — generate them before release

See `PRECOMBINE_PREVIS_DEEP_DIVE.md` and `PRP_COMPREHENSIVE_GUIDE.md` for the full precombine pipeline.

---

## 4. Lighting Design

### Interior Lighting Rules

| Light type | Use case | Cost |
|---|---|---|
| **Static baked ambient** | Room fill light | Free (pre-baked) |
| **Non-shadow-casting light** | Accent fills | Low |
| **Shadow-casting light** | Key dramatic lights | High — limit to 1–2 per room |

The `iMaxShadowLights` INI setting (default 4) caps how many shadow-casting lights can be active simultaneously. Exceeding this causes lights to pop on/off as the player moves.

**Key lighting INI settings (`Fallout4.ini [Display]`):**
```ini
iMaxShadowLights=4          ; max simultaneous shadow casters
fShadowBiasScale=0.5        ; reduces shadow acne on uneven surfaces
fShadowDistance=3500        ; max shadow draw distance (lower = faster)
```

### Cell Ambient Color

Each cell has an ambient light color set in the CK → Cell Properties → Lighting. For atmospheric interiors:
- Post-apocalyptic ruins: `R=80 G=75 B=70` (warm dust)
- Vault: `R=70 G=85 B=90` (cold fluorescent)
- Overgrown/fungal: `R=60 G=90 B=65` (green-tint bioluminescence)
- Underground cave: `R=30 G=30 B=40` (near-black)

### ImageSpaceModifier (IMOD)

Assign an IMOD to a cell for custom color grading without ENB:
- CK → Cell Properties → Image Space: assign IMGS record
- Or use Papyrus `ApplyImageSpaceModifier(imodRef, fStrength)` on `OnLocationChange`

---

## 5. Cell Flags and Properties

### Important Cell Flags (in xEdit `DATA` field)

| Flag | Effect |
|---|---|
| `Is Interior Space` | Marks as interior — no sky, separate lighting system |
| `Has Water` | Enables water level rendering; set water type and water height |
| `No LOD Water` | Disables LOD-distance water rendering (use for small pools) |
| `Show Sky` | Show sky even in a technically interior cell (greenhouse effect) |
| `Publicans Are Forbidden` | NPCs won't wander here |
| `Off Limits` | Used for DLC activation areas |

### Cell Lighting Template

Cells can inherit lighting from a **Lighting Template** (LGTM record) rather than specifying all values individually. The LGTM record contains:
- Ambient color and directional sunlight
- Shadow settings
- Fog parameters

Using a LGTM ensures visual consistency across multiple cells in the same location. Create one LGTM per environment type (vault, forest interior, ruins, underground).

---

## 6. Water in Cells

For cells with water:
1. In CK Cell Properties → Lighting: check `Has Water`
2. Set **Water Type** (WATR record FormID)
3. Set **Water Height** — Z coordinate where the water surface sits
4. The Navmesh must have triangles flagged as `Water` so NPCs wade rather than walk through

For flood cells (Glowing Sea acid pools, Far Harbor tidal areas):
- Water type: `IrradWater` or `MurkyWater`
- Consider adding an ASPC with underwater ambient SNDR for submersion audio
- Add an IPDS override for the cell's terrain to use water impact data

---

## 7. New Worldspace Setup

Creating a completely new worldspace (custom map area) requires:

### WRLD Record Creation

1. In xEdit, duplicate a small vanilla worldspace (e.g., `GlowingSeaWorldspace`)
2. Set new EditorID, Name
3. Set Parent Worldspace to `CommonwealthWorld` if you want the same climate/weather system, or leave blank for isolated worldspace
4. Set cell size (default 4096 matches Commonwealth)
5. Set map image (blank .dds initially; fill in after building the area)

### Required Records for a Functional Worldspace

| Record | Purpose |
|---|---|
| WRLD | The worldspace container |
| CELL (exterior, 0,0) | The center cell — must exist |
| LAND | Heightmap and terrain texture for each cell |
| NAVM | Navigation mesh — required for NPC pathing |
| LCTN | Location record — used by quests and map markers |
| REFR | Reference records for all placed objects |

### Worldspace Performance Checklist

- [ ] LOD generated for all new cells (xLODGen terrain + DynDOLOD objects)
- [ ] Precombines generated for all exterior cells
- [ ] Room bounds and portals set up for all interior areas
- [ ] `iMaxShadowLights` respected — max 2 shadow casters per room
- [ ] Water cells: Has Water flag + navmesh water triangles
- [ ] LGTM lighting template applied per zone type

---

## 8. Occlusion Planes

For large open areas that don't benefit from room bounds/portals, **Occlusion Planes** can be placed behind major solid walls or hills. The engine uses these to cull geometry on the far side.

**When to use occlusion planes:**
- Large exterior vaults where the hillside blocks city view
- Massive interior halls with a solid dividing wall
- Long corridors where a bend occludes the far end

**Placement rules:**
- Place flush against the interior face of a solid wall or hill
- Size to completely cover the blocking surface
- Occlusion planes only work well for flat, large, solid obstacles — don't use for complex shapes

---

## 9. Load Distance and LOD Transition

Every exterior cell has a **LOD Transition Distance** controlled by:

```ini
[Display]
fBlockLevel0Distance=20000
fBlockLevel1Distance=40000
fBlockLevel2Distance=80000
```

Custom worldspaces can override these in a `WorldSpace.ini`. Lower values improve performance; higher values show more detail at distance (requires good LOD data from xLODGen/DynDOLOD).

---

## 10. Common Pitfalls

| Problem | Cause | Fix |
|---|---|---|
| FPS drops in interior | No room bounds / portals | Add room bounds and portals to all rooms |
| Floating objects at world seams | Cell boundary offset | Snap references to world grid |
| NPCs fall through floor | Missing navmesh | Generate navmesh for all walkable areas |
| Black/missing terrain | LAND record missing for new worldspace cells | Create LAND records for all cells |
| Water at wrong height | Water height Z value incorrect | Measure correct Z in CK with `tlv` coordinate display |
| Shadow pop-in | Too many shadow lights | Reduce to max 2 shadow casters per room |

*Last updated: May 2026.*
