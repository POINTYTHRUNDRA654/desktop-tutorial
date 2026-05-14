# Jungle Navmesh and Precombines/Previs Optimization Guide

> **Note:** This is a Mossy-authored overview guide for dense-worldspace modding. For authoritative precombine/previs details, file formats, and workflow refer to PJM's documentation: see `PRECOMBINE_PREVIS_DEEP_DIVE.md`, `PJM_FO4CHECK_SCRIPT_GUIDE.md`, and `PJM_GENERATING_PREVISBINES_FOR_MOD.md` (all sourced from PJMail, Nexus #69978).

To maintain high frame rates in a dense fungus jungle, mastering Navmesh and Precombines/Previs is non-negotiable. Fallout 4's Creation Engine relies heavily on these systems to prevent CPU and GPU bottlenecks.

---

## Part 1: Navmesh (Navigation Mesh)

Navmesh tells non-player characters (NPCs) and companions where they can walk, jump, or find cover. Poorly optimized navmesh causes extreme CPU spikes and game crashes.

### Key Concepts

- **Triangle Budget:** Keep navmesh triangles large in open spaces and small only around obstacles.
- **Edge Connectivity:** Green lines mean triangles are connected; red lines mean broken paths where NPCs get stuck.
- **Navmesh Layers:** The engine uses specific layers for humanoids, large creatures, and water paths.

### Optimization Workflow

1. **Generate Automatically:** Use the Creation Kit's **Navmesh → Advanced → Generation** tool for a baseline.
2. **Manual Clean-up:** Delete tiny, unnecessary triangles under large mushrooms or terrain.
3. **Simplify Geometry:** Use fewer, larger triangles to span flat jungle floors.
4. **Vertex Snapping:** Press **G** to snap vertices together to prevent micro-gaps that break NPC AI.
5. **Cover Nodes:** Manually place cover nodes near giant fungal stalks so NPCs use them realistically.

---

## Part 2: Precombines and Previs

This is the most critical step for an environmental mod. Without this, your jungle will drop to single-digit frame rates.

### Definitions

- **Precombines (`.nif` meshes + XCRI/PCMB cell fields):** Merges hundreds of individual 3D static meshes (trees, rocks, fungi) in a cell into one single mesh. This drastically reduces Draw Calls sent to the GPU.
- **Previs (`.uvd` files + VISI/XPRI cell fields):** A visibility system that determines exactly which geometry is hidden behind walls or terrain, preventing the engine from rendering what the player cannot see.

### Breaking the System

- Moving, scaling, or deleting any vanilla object breaks the precombine system for that cell.
- Disabling precombines (`bUseCombinedObjects=0` in INI files) ruins performance game-wide and **must never be used as a mod requirement**.

### Reconstruction Workflow

1. **Finalize Asset Placement:** Do not generate precombines until every mushroom, vine, and spore pod is permanently placed.
2. **Select Cells:** In the Creation Kit Cell View window, highlight all modified Glowing Sea cells.
3. **Generate Precombines:** In the CK go to **World → Precombine Geometry for Current Cell** (one cell at a time). See `PJM_FO4CHECK_SCRIPT_GUIDE.md` for the recommended automated approach using `GeneratePrevisibines.bat`.
4. **Generate Previs:** Go to **World → Generate Previs for Current Cells**.
5. **Pack Files:** Ensure the generated `.nif` (precombine meshes) under `Meshes/Precombined/` and `.uvd` (previs) files under `Vis/` are packed into your mod's main BA2 archive.

---

## Part 3: Jungle-Specific Performance Hacks

### Mesh Optimization

- **LOD (Level of Detail):** Create low-polygon versions of giant mushrooms for distant viewing.
- **Collision Hulls:** Ensure your custom fungus models use simplified primitives (boxes/cylinders) for collision, not complex polygon-accurate hulls.

### Material and Lighting Optimization

- **Glow Maps:** Bioluminescent fungi should use emissive textures, not dynamic lights. Dynamic lights cast shadows and destroy FPS.
- **Alpha Blending:** Minimize overlapping transparent textures (like hanging moss or spore clouds), as they cause severe overdraw penalties.
