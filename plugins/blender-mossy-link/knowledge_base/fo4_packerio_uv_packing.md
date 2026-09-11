# Packer-IO: Repacking UVs Before Baking or Exporting Textures

Packer-IO (`D:\Program Files\Packer-IO\Packer-IO.exe`) is a free, standalone
UV-packing application from 3d-io. Like MeshLab, it has no idea Fallout 4
or NIF files exist — it isn't a modding tool in the xEdit/Creation Kit
sense. What it does is take a model that's already been UV-unwrapped and
rearrange (pack) the UV islands so they use texture space efficiently:
minimal wasted padding, consistent scale across islands, and no
overlapping charts unless you want tiled overlap on purpose.

It reads and writes OBJ, FBX, glTF, Collada (DAE), PLY, and STL — a wider
round-trip format list than MeshLab (which can't export FBX or glTF).
That matters for where it slots into the pipeline below.

## Why this matters for FO4 specifically

Fallout 4 has real texture-budget constraints, and a badly packed UV
layout wastes resolution: islands with inconsistent texel density mean
some parts of a mesh look crisp and others blurry at the same texture
size, and unused UV space is resolution you paid for and didn't use. This
is the same texel-density concern that shows up anywhere texture size is
a budget question in this pipeline — it's also the reason
`fo4_custom_creature_rig_pipeline.md`'s custom-creature workflow and the
existing DDS/mipmap tooling (`shadermap4_mipmap_bug_report.md`'s subject)
both care about getting texture output right the first time. A well-packed
UV layout is what makes baked normal maps, ambient occlusion, and diffuse
textures actually use the resolution you give them.

## Where this fits in the pipeline

```
MeshLab: clean + repair geometry (see fo4_meshlab_cleanup_pipeline.md)
        |
        v
Blender: import OBJ, rig, weight paint, UV unwrap
        |
        v
Packer-IO: import the unwrapped mesh, repack UVs, export
        |
        v
Blender: re-import the repacked mesh (UVs now optimized), bake textures,
         finish materials
        |
        v
Export FBX for conversion (existing pipeline, unchanged)
```

Packer-IO sits *after* unwrapping, not before — it needs UV seams to
already exist; it optimizes the layout, it doesn't create the unwrap.

## Basic workflow

1. **Unwrap the mesh in Blender first.** Packer-IO repacks existing UV
   islands; it doesn't do the unwrapping itself. Get your seams and
   initial unwrap (`U > Unwrap`, or Smart UV Project) done in Blender the
   normal way.
2. **Export from Blender** as FBX or OBJ (either works — Packer-IO reads
   both).
3. **Open the file in Packer-IO.** The viewport shows the model with its
   current UV layout; the object manager panel lets you hide/unhide
   pieces if you're packing a multi-part mesh.
4. **Use the checkermap shader** (one of Packer-IO's built-in MatCap/shader
   options) to visually check for UV stretching before and after packing —
   even stretching in the checker pattern means a distorted island that
   will show up as warped detail on the baked texture.
5. **Run the pack.** Packer-IO's packing algorithm arranges all UV islands
   to minimize wasted space and keep scale consistent between them —
   this is the actual point of the tool, and it handles meshes with
   thousands of UV islands without the manual island-by-island arranging
   that would take in Blender by hand.
6. **Export back out** (OBJ or FBX) and re-import into Blender to continue
   with baking and material work.

## When to reach for this vs. Blender's own UV packing

Blender has its own built-in UV packing (`UV Editor > UV > Pack Islands`).
Packer-IO is worth the extra round-trip specifically when: the mesh has a
large number of UV islands (Packer-IO is built to handle thousands of
charts fast, where Blender's packer can bog down or produce a less
efficient layout at that scale), the model uses tiled UDIM-style UV
layouts (Packer-IO has explicit support for this, matching the kind of
layout used in ZBrush), or you specifically want the checkermap
stretch-visualization workflow before committing to a bake. For a simple
single-mesh unwrap, Blender's own packer is often enough and skips the
export/import round-trip entirely.

## Where this shows up in Mossy

- Packer-IO is now a recognized tool: added to the tools-availability scan
  (`packerIoPath`), the auto-detect candidate paths (checked under
  `Program Files\Packer-IO\` and the usual fallback locations), and
  Screen Awareness's known-modding-tools list, so Mossy watches for it
  the same way she watches Blender, MeshLab, and the rest.
- As with MeshLab, Packer-IO doesn't touch FO4/NIF data directly, so what
  Mossy actually knows about it is the workflow above: when repacking UVs
  is worth the round-trip, and the practical checkermap-based way to
  verify the pack didn't introduce new stretching before a texture bake
  gets built on top of it.
