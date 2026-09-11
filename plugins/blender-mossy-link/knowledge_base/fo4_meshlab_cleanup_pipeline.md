# MeshLab: Cleaning Up a Mesh Before It Goes Into Blender

MeshLab (`G:\Program Files\VCG\MeshLab\meshlab.exe` on this machine) is a
free, open-source mesh-processing tool from CNR-ISTI-VCLab. It has **no
idea Fallout 4 or NIF files exist** — it doesn't read or write `.nif`, and
it isn't part of the FO4 pipeline in the way Blender, xEdit, or Creation
Kit are. What it's genuinely good for is fixing a mesh's *geometry* before
that mesh ever reaches Blender: a 3D scan, a sculpt export, or anything
assembled from multiple pieces almost always comes out with broken
geometry that Blender's auto-rigging (heat weighting) and NIF exporters
handle badly. `fo4_custom_creature_rig_pipeline.md` calls this out
directly — its worked example (`gsfunguscarnivorousplant05.nif`) is
described as "the hardest case for auto-rigging" specifically *because*
of "disjoint, non-manifold geometry," and heat weighting needs a
continuous manifold surface to work at all.

MeshLab is the tool for fixing that, before Blender ever sees the mesh.

## Where this fits in the pipeline

```
raw mesh (scan / sculpt export / multi-piece assembly)
        |
        v
   MeshLab: clean + repair geometry
        |
        v
   MeshLab: File > Export Mesh As... > OBJ   <-- OBJ, not FBX (see below)
        |
        v
   Blender: File > Import > Wavefront (.obj)
        |
        v
   Blender: rigging, weight painting, UVs, materials
   (this is where fo4_custom_creature_rig_pipeline.md picks up)
        |
        v
   Blender: Export FBX for conversion (Step 4 of that pipeline)
        |
        v
   NIF/HKX (via the existing conversion tooling)
```

MeshLab only ever touches the first two steps. Once the mesh is clean and
sitting in Blender as an imported OBJ, the rest of the pipeline is
unchanged from what's already documented.

## Why OBJ, not FBX

This is the one mistake that's easy to make and wastes real time: **MeshLab
can import FBX, but it cannot export FBX.** Its FBX support is one-way.
The same is true of glTF/GLB. Its full-round-trip formats (import AND
export) are OBJ, PLY, STL, 3DS, DAE, CTM, E57, OFF, WRL, X3D, and XYZ.

So the correct hand-off is:

- **Export from MeshLab as OBJ.**
- **Import that OBJ into Blender** (`File > Import > Wavefront (.obj)`).

If you go looking for an FBX export option in MeshLab to match Blender's
own FBX-based export step later in the pipeline, you won't find one — that
isn't a bug or a missing feature, it's just not something MeshLab does.
OBJ carries geometry, UVs, and vertex normals cleanly, which is all this
step needs; materials and rigging are set up in Blender afterward anyway.

## The actual cleanup workflow

Open the mesh in MeshLab (`File > Import Mesh...`), then work through the
filters below via `Filters > Cleaning and Repairing` and
`Filters > Remeshing, Simplification and Reconstruction` (or just type the
filter name into the filter search box — MeshLab has a lot of filters, and
searching is faster than digging through menus). These are the real,
current MeshLab filter names, not paraphrases:

**1. Start with cleanup that just removes junk (safe to run on anything):**

- **Remove Duplicate Vertices** — collapses exactly-overlapping verts left
  over from how the mesh was assembled or exported.
- **Remove Duplicate Faces** — same idea, for faces.
- **Remove Zero Area Faces** — degenerate triangles with no area; these
  cause divide-by-zero problems in normal computation and UV work
  downstream.
- **Remove Unreferenced Vertices** — vertices no face actually uses (common
  after deleting geometry).

**2. Fix the geometry that actually breaks rigging:**

- **Merge Close Vertices** — welds vertices that are *almost* but not
  exactly coincident (a very common cause of "this looks like one solid
  mesh but Blender treats it as disconnected pieces"). Set the merge
  threshold small relative to the mesh's scale — too large will weld
  vertices that were never meant to touch.
- **Repair non Manifold Edges** — an edge shared by more than two faces
  (or by faces with inconsistent winding) is non-manifold; this is
  specifically the class of problem that makes heat weighting fail.
- **Repair non Manifold Vertices by splitting** — a vertex where the mesh
  pinches to a point in a way that isn't a clean fan of faces around it;
  splits it into multiple vertices so the surface becomes locally
  manifold again.
- **Remove Isolated pieces (wrt Face Num.)** — deletes small disconnected
  fragments (a handful of stray faces left over from a bad boolean or a
  scan artifact) below a face-count threshold you set. Useful for
  scan-derived meshes especially; check the threshold isn't so high it
  eats a real small part of the model (a claw, a spike, a strap).

**3. Close gaps and fix orientation:**

- **Close Holes** — closes any hole whose boundary loop is smaller than a
  size threshold you set (in edge count). Scanned meshes almost always
  have holes where the scanner couldn't see a surface (undersides, tight
  gaps between parts).
- **Re-Orient all faces coherently** — makes face winding (and therefore
  normal direction) consistent across the whole mesh. If part of the mesh
  renders with inverted/black-looking normals in Blender, this is usually
  why, and it's much easier to fix here than after import.
- **Invert Faces Orientation** — flips every face's winding; use this
  (rather than trying to fix it by hand in Blender) if the *whole* mesh
  turns out to be inside-out after Re-Orient.

**4. Optional, only if the mesh is high-poly:**

- **Simplification: Quadric Edge Collapse Decimation** — reduces triangle
  count while trying to preserve shape; there's also a texture-preserving
  variant if the mesh already has UVs you need to keep. Fallout 4 has real
  poly-budget expectations for in-game meshes, so this is worth running
  on anything from a high-res scan or sculpt before it goes anywhere near
  Blender.
- **Compute normals for point sets** — only relevant if you're starting
  from a raw point cloud (e.g. straight off a 3D scanner) rather than a
  mesh with faces already — this is what actually builds a surface's
  normals from the points before you can do anything else to it.

After each filter runs, MeshLab shows a small log/report of what it did
(how many vertices merged, how many holes closed, etc.) — worth glancing
at, since "0 changes" on a filter you expected to matter usually means the
threshold needs adjusting, not that the mesh was already clean.

**5. Export:**

`File > Export Mesh As...` → choose **OBJ** → save it somewhere your
Blender project can find it.

Then in Blender: `File > Import > Wavefront (.obj)`, and continue from
wherever `fo4_custom_creature_rig_pipeline.md` covers rigging and weight
painting. Nothing about the rest of that pipeline changes — MeshLab's job
ends the moment the geometry is clean and sitting in an OBJ file.

## Where this shows up in Mossy

- MeshLab is now a recognized tool: it's added to the tools-availability
  scan (`meshlabPath`), to the auto-detect candidate paths
  (`detectPrograms.ts`, checked under `Program Files\VCG\MeshLab\` and the
  usual `(x86)`/`Modding`/`Tools` fallback locations), and to Screen
  Awareness's known-modding-tools list — so if MeshLab has window focus,
  Mossy watches it the same way she watches Blender, xEdit, and the rest.
- MeshLab itself doesn't touch FO4 or NIF data, so there's no "MeshLab
  mistake" detection in the same sense as, say, a Blender export setting —
  what Mossy actually knows is the geometry problems MeshLab is good for
  fixing (non-manifold edges/vertices, holes, disjoint pieces) and the
  OBJ-not-FBX export constraint above, since that's the part someone new
  to MeshLab is most likely to get wrong.
