# Fallout 4 – Precombine, PreVis, LOD & Navmesh Reference

Practical knowledge for anyone editing exterior cells, generating LODs, or
placing navmesh from a Blender-authored asset. Sourced and fact-checked via
the Mossy Bridge knowledge base (2025–2026 verified corrections included).

---

## Precombine vs. PreVis — two different systems

- **Precombine** merges static geometry in a cell into fewer draw calls.
  It does **not** bake lighting — FO4 has no lightmap system; all lighting
  stays fully dynamic regardless of precombine state. Vertex-color-baked
  AO/cavity shading is a separate art technique, not "baked lighting."
- **PreVis** (separately) precomputes *visibility* — which geometry can be
  seen from which points, for occlusion culling. No lighting component.

**What breaks either one:**
- Moving or deleting static references in exterior cells
- Adding new static objects to cells with existing PreVis/precombine
- Modifying landscape or editing NavMesh in a precombined cell

**Fix:** regenerate both after any exterior edit — Creation Kit's own
precombine/PreVis tooling (or community tooling built around it), using
your final, optimized meshes. Avoid loose/ungrouped objects in a
precombine-covered area. This is required correctness, not optional polish
— skipping it after a mesh replacer causes visible seams/z-fighting, not
just a performance loss.

**Known real symptom:** "missing/invisible ground" in a new custom
worldspace is frequently a broken/missing PreVis pass (previs governs
occlusion culling — a bad pass can cause the engine to treat ground
geometry as culled), not a terrain-texture or landscape-mesh bug.
Regenerate PreVis for the cell first before assuming a terrain problem.

**`bUseCombinedObjects`** (hidden, add under `[General]` in
Fallout4.ini/Fallout4Custom.ini) — `1` (the real default) keeps precombine
checking active game-wide; `0` disables it globally (not per-cell). Real
measured cost: 20–30 FPS lost in dense areas like downtown Boston. This is
the practical (if costly) escape hatch a *global* vegetation/forest overhaul
needs when it touches too many vanilla cells to regenerate precombine for
each one individually — a settlement-scrapping mod does NOT need this, since
it disables precombine only for its own specific cells via its own plugin
mechanism.

**PRP (PreVis Repair Pack)** fixes vanilla's broken precombine/previs
globally, but that global regeneration is exactly why "PRP compatibility
patches" exist as their own category: PRP's regenerated data assumes a
specific set of objects per cell, so any other mod editing objects in that
same cell now conflicts with PRP the same way it would with any other
precombine data. A worldspace-editing mod should check PRP's cell coverage
and ship a compatibility patch if needed, not assume it's a blind fix.

---

## LOD pipeline

- **Terrain LOD:** xLODGen with high-res diffuse/normal maps (and a custom
  heightmap if changed). 2K–4K terrain LOD textures are a reasonable target.
- **Object LOD:** separate low-poly meshes with their own lightweight
  LOD-tier material — LOD materials only need a baked diffuse, not the full
  texture set a hero asset needs.
- **LODClipVolume** — a real, distinct CK object type: a bounding volume
  defining where a cell's object LOD generates/culls. **Production-proven
  failure mode:** if a cell has large static collections (SCOL) or big
  custom geometry and the LODClipVolume covering it wasn't sized to match,
  the mismatch causes CTDs and can **corrupt saves** made in the affected
  area — this exact issue hit one of the largest DLC-sized community
  total-conversion mods post-release. When building a worldspace with
  unusually large geometry in a cell (cathedrals, big industrial structures,
  etc.), explicitly verify that cell's LODClipVolume actually contains the
  geometry — don't assume the default is sufficient just because smaller
  worldspaces never surfaced the problem.

---

## Navmesh repair

Deleted NAVM records (flag `0x00000020`) cause immediate CTD when NPCs try
to pathfind through the affected area. **Never delete a vanilla NAVM
record** — always replace via xEdit's Change FormID method instead:

1. Load the plugin in xEdit with all masters.
2. Find `[D]` (deleted-flag) NAVM records, or run Check for Errors.
3. Copy the deleted record's FormID.
4. Find the replacement NAVM your mod added.
5. Right-click the replacement → Change FormID → paste the copied FormID →
   accept "Update all references."
6. Remove the original `[D]` record, re-run Check for Errors, save.

In the CK itself: never Delete a navmesh triangle directly — cover it with
a new triangle first, THEN delete the old one. Always **Finalize Cell
Navmesh** before saving, and use Navmesh → Find Navmesh Errors at cell
borders.

**Symptoms of a bad navmesh:** NPCs frozen near a door/entrance, CTD when
approaching a specific location or fast-traveling to a settlement, NPCs
refusing to enter/leave a building, crash on cell load in an area a mod
edited.

---

## Common precombine/previs-adjacent errors

| Symptom | Likely cause |
|---|---|
| Yellow precombined meshes in-game | Broken precombine/PreVis from a cell edit — regenerate or disable PreVis for that cell |
| `0xc000005` access violation during precombine generation | Usually a corrupt or CK-incompatible mesh on a precombineable reference in that cell — bisect by disabling references until generation succeeds, then inspect the last-removed mesh in NifSkope |
| CTD on cell load | Corrupt mesh, missing texture, bad navmesh, or a deleted NAVM record — check the Papyrus log, validate assets, check for missing masters, scan for deleted NAVM in xEdit |
