# The Blender add-on ecosystem around this add-on

This add-on doesn't need to do everything itself. A lot of FO4 modding workflows
are genuinely "do a step in a specialist add-on, then come back to us to finish
the FO4-specific part" — export validation, collision generation, and NIF/DDS
handling are ours; general-purpose mesh/UV/rig work is often done better by a
tool built just for that one job. This doc catalogues the third-party add-ons
worth knowing about, **exactly where to find each one's tools in Blender's UI**,
and where each slots into our own pipelines.

`addon_integration.py`'s `AddonIntegrationSystem.scan_for_known_addons()` is
what actually detects these at runtime (installed + enabled status) so the UI
can point a user at the right tool. If you're adding a new add-on to that
catalogue, add a matching entry here too — with real "how to use it" detail,
not just what it's for — so Mossy can actually walk a user through it instead
of just naming it.

**Detection note:** Blender 4.2+ extensions register in
`bpy.context.preferences.addons` as `bl_ext.<repo>.<addon_id>` (repo is
`user_default` for a locally-installed zip, `blender_org` for one pulled from
an online repository) rather than the bare module name. `_check_addon_status`
matches on the suffix so both legacy and extension-style installs are found —
if a newly-added catalogue entry is showing as "not installed" when it clearly
is, this is the first thing to check.

## UV workflow

Unwrap → pack → validate is a three-tool relay:

### Auto UV Unwrap & Pack 2.0 (unwrap step)
Panel lives in the 3D viewport N-panel, "Auto UV" tab. Select the object(s),
optionally tweak the angle threshold and packing margin (defaults work for
most meshes), click **Unwrap & Pack** — one click does seam-marking, unwrap,
and an initial pack. It also has a baking panel built in (can bake Albedo/
Metalness even though Blender doesn't natively support those bake types) if
you want to bake textures right after unwrapping. If the mesh already has a
UV map it gets replaced unless you opt to preserve it.

### UVPackmaster 3 (pack step — the one that matters for texel density)
Panel is in the **UV Editor's N-panel** (its own vertical tab in that side
panel, not the 3D viewport N-panel) — open the UV Editor, go into Edit Mode
on the mesh with Face Select, select the UV islands you want packed, then
work from there. Its packing density beats Blender's built-in Pack Islands.

**Mode switcher first.** The "Packing" panel has a dropdown in its header
(click the current mode name next to the collapse-menu icon → "Modes") that
switches between five pack modes, each a genuinely different workflow, not
just a preset:
- **Single Tile** — everything packed into one 0-1 UV square. The default,
  and what you want for a normal FO4 mesh with one texture set.
- **Tiles** — spreads islands across a UDIM-style grid of tiles instead of
  one square. Not typical for FO4 work unless you're deliberately building a
  multi-tile texture setup.
- **Groups To Tiles** — packs each numbered group into its own separate
  tile. Needs groups defined first (see Grouping Editor below).
- **Groups Together** — packs multiple groups into one tile but keeps each
  group visually together rather than interleaving islands from different
  groups.
- **Groups Independently** — packs each group into its own region of the
  same tile, independently of the others.

For a typical FO4 prop/weapon/armor piece, Single Tile is what you want.
The group-based modes matter when you're deliberately controlling texel
density per material/UV-group (e.g. keeping a gun's receiver at higher
texel density than its stock) — that's what "per-group texel density" means
in practice, and it requires setting up groups first, not just picking the
mode.

**The pack buttons** (top of the Packing panel): **Pack** (the main one —
packs the selected islands fresh), **Pack To Others** (packs selected
islands into the empty space around islands that are already placed and
excluded from the operation), **Repack With Others** (repacks everything
together, selected and already-placed islands alike).

**Sub-panels worth knowing** (under Packing Options / Advanced Packing
Options, most collapsed by default — click to expand):
- **Tile Setup** — which UDIM tile(s) to pack into (only relevant outside
  Single Tile mode).
- **Normalize Scale** — equalizes texel density across selected islands
  before packing; toggle this on for texel-density-sensitive pieces.
- **Pixel Margin** — sets the gap between packed islands in actual pixel
  units at your target texture resolution, rather than the abstract 0-1
  margin Blender's own packer uses — more predictable for FO4's DDS export
  sizes.
- **Heuristic Search** — the option that actually earns UVPackmaster's
  reputation for density. Toggle it on, set a search time; it also has a
  "heuristic_allow_mixed_scales" toggle and an Advanced Heuristic toggle for
  going even further at the cost of more time. Worth the wait on a final
  hero-asset pack, overkill for a quick test pack.
- **Lock Overlapping** — keeps islands that are deliberately stacked
  on top of each other (mirrored halves sharing UV space, a common FO4
  trick to double texel density on symmetric parts) from being separated
  during packing.
- **Lock Groups** / **Track Groups** — keep numbered groups fixed in place
  (Lock) or matched to their previous position across repacks (Track) —
  needs groups assigned first via the Grouping Editor mode.
- **Non-Square Packing** — for non-square texture targets; has its own
  "Adjust Islands To Texture" operator plus an undo for it.
- **Custom Target Box** — pack into a sub-region of the tile instead of the
  full 0-1 square (needs "Enable" toggled on for the option to matter).
- **Island Rotation Step** — constrains how freely islands can rotate while
  packing (e.g. lock to 90° steps) instead of full heuristic rotation.
- **Scripting** — exposes the packing operation to Python for batch/pipeline
  use — not something to point a beginner at, but relevant if we ever want
  to drive UVPackmaster from Mossy's own batch tooling instead of walking a
  user through the UI by hand.

**Grouping Editor** is a separate mode in that same "Modes" dropdown (not a
sub-panel of Packing) — switch to it to assign UV islands to numbered
groups before using any of the group-based pack modes, Lock Groups, Track
Groups, or Stack Groups. Select islands, then use **Assign Islands To The
Group** for the group number you want; **Show Group Assignment** highlights
what's already assigned, **Select Islands Assigned To Group** re-selects a
given group later, and **Reset Groups** clears all assignments.

**Utilities panel** (its own section, separate from Packing) has two
standalone tools: **Overlap Check** flags overlapping islands that
shouldn't be (as opposed to deliberately-stacked ones covered by Lock
Overlapping above), and **Measure Area** reports total/merged UV area for
the current selection — useful for sanity-checking texel density between
two meshes that are supposed to match.

Reach for UVPackmaster 3 once texel density starts mattering — weapons,
armor, hero assets — rather than relying on the quick pack from Auto UV
Unwrap.

**Known Blender 5.x compatibility bug (fixed locally):** version 3.4.1's
`app_iface.py` does a bare `import bpy_types` at module load time. Blender
5.x removed `bpy_types` as a standalone importable module (everything moved
under `bpy.types`), so on Blender 5.1/5.2 the whole add-on fails to register
with `ModuleNotFoundError: No module named 'bpy_types'` — and because
Blender's newer unified Extensions UI doesn't show a per-item enable
checkbox for extension-format add-ons the way the old Add-ons list did, this
failure is silent: no error dialog, no visible "disabled" state, the add-on
just doesn't show its UV Editor panel and looks like it never activated.
Confirmed via `bpy.ops.preferences.addon_enable(module="bl_ext.user_default.uvpackmaster3")`
in the Scripting tab's Python console, which surfaces the real traceback that
the UI hides. Fixed by wrapping that import in a try/except (the name is
never actually used anywhere else in the add-on, so a dummy placeholder
module is a safe fallback) in both the Blender 5.1 and 5.2 install folders.
**This patch lives only in the locally-installed copy** — it is not an
upstream fix, so it needs reapplying if the add-on is ever reinstalled or
updated to a newer version that hasn't fixed this itself.

**Separate from the above: the actual packing engine is not bundled in the
Blender add-on zip at all.** `register_specific()` in `register_utils.py`
looks for a native engine binary in three places, in order: a saved
`engine_path` preference, an `engine3` subfolder next to the add-on's own
Python files (not present in the zip we have), or a path read from the
Windows registry key `HKLM\Software\UVPackmaster\Engine3InstallPath` (written
by a separate standalone Engine installer from uvpackmaster.com). On this
machine that standalone installer was already run — the engine lives at
`C:\Program Files\UVPackmaster\engine3\`. So "engine not detected" is not
necessarily a "go buy/download it" problem; check that folder first.

**Second compatibility bug (also fixed locally): exact-version pinning.**
The add-on hardcodes the engine version it will accept to match its own
`bl_info` version (3.4.1) in two places — `check_engine()` in
`register_utils.py` requires a file named exactly `release-3.4.1.uvpmi`, and
`register_engine()` separately requires the running engine binary to report
the exact tuple `(3, 4, 1)`. The engine installed on this machine is 3.4.2
(a patch update the standalone installer had already applied), so both
checks failed with `RuntimeError('Engine version 3.4.1 required')` even
though the engine binary itself works fine and the wire protocol between
add-on and engine hasn't changed between 3.4.1 and 3.4.2. Fixed by patching
both checks in `register_utils.py` to accept any engine with the same
major.minor and a patch version >= the add-on's expected patch, instead of
requiring an exact match. Verified end-to-end in Blender's Python console:
`register_engine(r"C:\Program Files\UVPackmaster\engine3")` now returns
`UVPackmaster Engine: 3.4.1 PRO` and `engine_initialized = True`; re-running
`register_specific()` (the function Blender actually calls on every
startup) also succeeds on its own, confirming it will work on a normal
Blender launch, not just when poked from the console. Preferences were
saved (`bpy.ops.wm.save_userpref()`) so the working `engine_path` persists.
**Like the `bpy_types` fix above, this is a local-only patch to both the
Blender 5.1 and 5.2 copies of `register_utils.py` — not an upstream fix, so
it needs reapplying if the add-on is ever reinstalled/updated.** The add-on
also exposes `uvpackmaster3.set_engine_path` (a file browser expecting a
`.uvpmi` file) as a manual way to point at an engine folder through the UI.

### UV King (lighter alternative to the above two)
Works in **both** the 3D viewport N-panel and the UV Editor. One-click "Auto
UV Variations" (Smart UV presets: High/Med/Low angle threshold, or Cube
Projection), a mode toggle for Single Body vs. Loose Parts unwrapping, a
Smart Packing Engine (texture size / margin / padding, manual rotate buttons
at ±90°/±45°, optional island-scale lock), "Transfer UVs" to copy a UV layout
between two meshes with identical topology, "Orient 3D" to align UV islands
to their 3D orientation, and "Normalize" to equalize texel density across
selected islands. Good for quick prop work where UVPackmaster 3's extra power
isn't needed.

### UV Texture Selector (workflow helper, not a packer)
Adds a "Used Textures Gallery" panel in the UV/Image Editor — a visual
thumbnail picker for textures already used in the scene, instead of hunting
through Blender's plain dropdown. Useful when double-checking material/
texture assignments across a multi-material FO4 asset right before export.

**The relay:** Auto UV Unwrap (seam + unwrap) → UVPackmaster 3 or UV King
(pack) → back to our add-on to validate UV bounds/overlap before NIF export.

## Mesh cleanup / retopology

Do this *before* rigging, not after — bad topology is the single biggest cause
of the "Bone Heat Weighting: failed to find solution for one or more bones"
failure that `fo4_custom_creature_rig_pipeline.md` Step 3 already works around
by falling back to envelope weighting:

### Final Topology - Inverse Subdivide
**Corrected description — this is NOT a generic "dense mesh in, clean retopo
out" tool.** It's BlenderKit's own subdivision-surface *inverse* workflow:
you start from a low-poly base mesh with a Subdivision Surface modifier,
then sculpt/edit the mesh live (in Edit Mode, with the modifier's "Edit
Mode Display" on) and this add-on compensates the underlying low-poly cage's
vertex positions in real time so the base mesh stays roughly matched to
whatever shape you're pulling the subdivided surface into. It's for
*building* a clean low-poly cage while you sculpt on top of it, not for
retopologizing an already-messy scavenged mesh from scratch — for that, use
Autoremesher below instead.

Panel category is "Edit" in the N-panel, split across Object Mode and Edit
Mode sub-panels (both labeled "Final topology"). Key operators, found via
`mesh.final_topology_optimization_step` ("Inverse Subdivide Snapping Step",
a one-shot pass with adjustable Iterations/Neighbours) and
`mesh.inverse_subdivide_modal` ("Inverse Subdivide Snapping Modal", a live
running version toggled on/off while you sculpt) in `inverse_subdivide.py`:
**Freeze Shape** locks in the compensation so further edits use it as the
new baseline, **Final Unsubdivide** (`object.final_unsubdivide`, Object
Mode panel) bakes the subdivided result back down permanently. There's also
a "Draw Overlays" sub-panel for visualizing what the compensation is doing.
Genuinely useful for building a new low-poly base for a creature/character
piece while sculpting detail on top of it; not the tool for cleaning up a
scavenged high-poly reference mesh — that's Autoremesher's job.

### Autoremesher NOW!
Dedicated N-panel tab, panel labeled "AutoRemesher NOW!". This is genuinely
4 different operations under one Operation Type dropdown, not just a single
remesh button:
- **Tris → Quads** — the one you actually want for retopologizing a dense
  scavenged/sculpted mesh into clean, game-ready topology. Set **Target
  Triangle Count** (final density) and **Edge Scaling** (1.0 preserves
  scale, 2.0 = coarser, 0.5 = finer).
- **Tris → Tris** (Geogram remeshing) — re-triangulates without going to
  quads; has its own separate set of Geogram-specific parameters (points,
  Lloyd/Newton iteration counts, shape/size adaptation) — more of a power-
  user path, not needed for a normal FO4 asset pass.
- **Decimate** — straight triangle-count reduction, same idea as Blender's
  built-in Decimate modifier but running through the same CLI pipeline.
- **Repair** — fixes topology and fills holes (has its own hole-size/repair
  epsilon parameters) — useful on a scavenged mesh with actual geometry
  errors, separate from the fragmentation problem Zip Merge solves.

**Model Type** matters for FO4 work specifically: **Organic** (smooth
curvature flow — creatures, characters, anything sculpted) vs. **Hard
Surface** (preserves sharp edges — weapons, armor, mechanical props). Pick
the one matching what you're remeshing, not just the default.

Other toggles worth knowing: **Triangulate Input** (turn on if the mesh
still has quads/n-gons — leaving it off on a non-triangulated mesh makes
remeshing fail outright) and **Auto Cleanup** (removes degenerate geometry
automatically, on by default). Execution Mechanism defaults to "Mechanism I
(CLI)" — an external process, more stable — with a Python-binding mode
available if the CLI path ever gives trouble. Click **Remesh with
AutoRemesher** to run (there's a **Cancel AutoRemesher** button while it's
working, and a progress/status panel). Turns a dense sculpt or scavenged
mesh into a clean, game-ready poly count before it reaches our collision-
generation or NIF-export operators — this is the actual retopology step;
Final Topology above is a different, narrower workflow.

### Mesh Welder (teca3d)
N-panel tab "Welder" (panel labeled "Mesh Welder"). Has a **Welder Mode**
toggle with two real, opposite operations, not just one merge button:
- **Merge** — the join step. Use **Set First Mesh** and **Set Second Mesh**
  to explicitly pick the two source objects (rather than relying on
  whatever's selected/active), then **Merge Mesh**. Internally it welds
  vertices within a **Distance Threshold** of each other — expressed as a
  percentage of the combined bounding box's diagonal length, not an
  absolute distance, so the same threshold value behaves consistently
  whether you're welding two tiny bolts or two building-sized meshes. Too
  loose a threshold welds vertices that shouldn't be joined (visible
  pinching); too tight leaves a visible seam — check the result before
  moving on to weight painting.
- **Split** — the reverse operation. Pulls a previously-merged mesh back
  apart into its two original pieces, using a **Mapping File** that
  records which faces came from which source mesh (set via **Set Mapping
  File**; **Reset Mapping File** clears it). This is the real undo path if
  a weld turns out wrong after you've already moved on to other edits,
  rather than undoing your whole edit history.

**Set Merged Mesh** / **Reset Merged Mesh** manage the output object's
name. Useful for welding a custom attachment/prop onto a base body or
creature mesh before rigging, or for "cut in half, glue a replacement piece
on" destructible-object work like the plant-stump mesh from our own rig
session — and if a weld like that comes out wrong, Split plus the mapping
file is the way back, not starting over.

### Zip Merge (ZipWeld)
No dedicated panel — it lives in the **Mesh > Merge menu** in Edit Mode. In
Edit Mode, select at least 3 vertices spanning the mesh islands you want
joined (pick the vertex you want merging to start from), then run **ZipMerge**
from that Merge menu. This is the direct fix for exactly the kind of
fragmentation problem we hit on the carnivorous-plant mesh — it came back as
**194 separate loose islands** when checked, and reducing that count before
weight-painting or collision-generation avoids a lot of downstream pain.

## Rigging / weight painting

The part of the pipeline most likely to silently produce a rig that looks
right but doesn't actually deform (see "Verify deformation for real" in the
creature-rig tutorial):

### Weight Paint Tool for Blender
N-panel tab "Weight Paint" (visible while in Weight Paint mode). Instead of
brush-painting, it gives discrete, 3ds-Max-style operators: Shrink/Grow/Ring/
Loop (selection-style tools for vertex groups), Set Weight (type an exact
value), Increase/Decrease Weight (+/- buttons), and Scale/Blend Weight. Good
for the envelope-weighting cleanup pass (closing weight gaps, tightening
per-bone envelope radii) when you want an exact, repeatable value rather than
a brush stroke's falloff.

### Subdivide Selected
Registers under **View3D > Misc** in older Blender UI conventions (still
findable there) — workflow: in Weight Paint mode, paint a vertex group named
**exactly "Group"** over the area that needs more geometry (a joint, a
too-low-poly wheel, a spiky/pinched area), switch to Object Mode, press
**Subdivide and Decimate**. It subdivides and cleans topology only inside
that painted area without touching the rest of the mesh or breaking existing
UVs/textures. Do this before the pipeline's own "subdivide limbs meant to
whip or reach" step, and before weight-painting a whip/tentacle chain that
turned out too low-poly to deform smoothly.

### Shape Keys Batch Transfer
N-panel tab "Shape Keys Batch Transfer". Select source mesh (has the shape
keys) and target mesh (different topology, e.g. a modified head/creature
base), run **Batch Shape Key Transfer** — it uses a Surface Deform modifier
under the hood to carry every shape key across in one batch instead of
re-sculpting each one by hand.

## World placement (Glowing Sea / flora-scatter work)

### Down to Earth
**Corrected operator names below — the actual UI labels differ from what
was documented here before.** N-panel tab "Snap Tools" (panel labeled "Snap
Tools", must be in Object Mode). Select the object, run **Snap to Nearest
Surface** — it raycasts and moves the object so it lands flush on whatever
it hits, no intersection. Real options, all adjustable in the operator's
redo panel (F6) or the sidebar before running:
- **Direction** — not just straight down: choose Z (drop down), -Z (snap
  up), X/-X/Y/-Y (snap sideways), or **XYZ (Nearest)** to raycast in every
  direction at once and land on whichever surface is actually closest. For
  scattering flora/clutter on uneven Glowing Sea-style terrain, Z (drop
  down) is usually right; XYZ Nearest is useful for something that needs
  to snap onto a wall or ceiling instead.
- **Offset** — clearance after contact: 0 is flush, positive floats the
  object above the surface by that amount, negative embeds it into the
  surface (handy for partially burying debris/rubble).
- **Search Radius** — limits which objects count as valid snap targets to
  within this distance (0 = the whole scene) — keeps a large scene's snap
  from picking a distant unrelated mesh over the terrain right underneath.
- **Ignore Hidden** — skips viewport-hidden objects as targets (on by
  default).

**Toggle as Snap Target** (not "Toggle Ignore") is the operator that
excludes/re-includes a specific object from counting as a target — run it
on a reference plane or another prop so it doesn't catch the snap by
accident. Good for preview-placing scattered flora/clutter onto uneven
terrain in Blender before committing final transforms to the CK reference.

## Hard-surface modeling (weapons / armor / attachments)

### AnyHole Pro
N-panel tab "Hole Tools". **Object Mode:** click the big "Punch Hole" button,
then left-click anywhere on the mesh surface (works even inside cavities) —
it auto-calculates depth so the cut always goes all the way through, no
leftover uncut bottoms. Right-click cancels. **Edit Mode:** select a face
first, then punch — it centers and angles the cut to that face automatically.
Shape choices: circle, square, hexagon, octagon, or a custom shape you modeled
yourself (stars, keyholes, faction logos as a hole cutout). Inset/offset/
bevel/smoothness are all live-adjustable in the same N-panel. Cut here, then
bring the result back into our add-on for UV/collision/export.

### Advanced Extrude and Bevel Tool
**Correction: shares the "Edit" N-panel category with Final Topology
above, it does not get its own tab** — panel is labeled "Advanced
Extrusion and Bevel". Bundles **Extrude** (`mesh.selective_extrude`),
**Bevel** (`mesh.custom_bevel`), and **Subdivide** (`mesh.subdivide_edges`)
as one-click buttons for faster hard-surface detailing passes — a quicker
alternative to chaining Blender's stock Extrude/Bevel/Subdivide manually.
Good lead-in before AnyHole Pro's socket cuts.

### Quick Lattice
**Doesn't get its own N-panel tab** — it adds its "Quick Lattice" panel to
Blender's stock **Item** tab (the one that's always there showing an
object's transform), so it's easy to miss if you're looking for a branded
tab like every other add-on here. With the target mesh selected, click
**Quick Lattice** — it automates the normally-manual lattice workflow (add
a Lattice object, size/fit it to the mesh's bounds, parent + bind) into one
action, so reshaping a base mesh to fit a different body/armor silhouette
(BodySlide-adjacent conforming work) doesn't require hand-fitting the cage
first. Right after running it, the redo panel (bottom-left, or F6) exposes
the settings actually worth adjusting: **Resolution U/V/W** (how many
control points along each axis, 1-256 — more points = finer control but
more setup work per point, and can't be changed later once shape keys
exist on the lattice), **Interpolation** (Linear / Cardinal / Catmull-Rom /
BSpline — BSpline gives the smoothest deformation, Linear the most direct/
predictable one), and **Outside** (constrains the lattice to only affect
the mesh's outer vertices instead of the full volume — useful when you want
to reshape a silhouette without disturbing interior geometry). Do this
before final weight painting.

## Vertex color / texture-paint helpers

### Set Vertex Color Tool
N-panel tab "Vertex Color" (panel "Vertex Color v1.0.1", 3D viewport, works
in Edit Mode on a face/vertex selection). Lets you assign vertex colors
(**Set Vertex Color**, **Sample Color**, **Randomize Color**, **Save Color
to Palette**) **without switching into Vertex Paint mode** — works directly
on the current selection.

**The detail that actually matters for FO4 work:** each of the four R/G/B/A
channels has its own checkbox next to its slider, and only the checked
channels get written when you click Set Vertex Color — the unchecked ones
are left untouched on the mesh. That means you can update just the Alpha
channel (or just Red) on a mesh that already has other channels carrying
separate mask data, instead of overwriting everything with one flat color.
This is directly relevant to a real warning we've seen in the CK log:
`[MODELS] ... marked for flutter animation, but has no vertex colors` —
FO4's flora wind/flutter shader reads vertex colors, and a flora mesh
that's missing them still imports fine but won't animate correctly in-game.
If a mesh needs both a flutter mask AND a separate paint-blend mask packed
into different channels of the same vertex color layer, the per-channel
toggles are what make that possible without one operation clobbering the
other's data. The RGBA color picker itself only becomes usable once all
four channels are checked (a label says so if any are unchecked).

### Create Text Mask Texture
Start with an actual Blender **Text object** (Add > Text) with your desired
lettering typed into it — the tool only activates when a Text object is the
active object. With it selected, right-click in the 3D viewport → **Create
Text Mask Texture** (the operator behind it is literally named
`CreateTextStencilOperator`), pick a **ResolutionX** (64 / 128 / 256 / 512 /
1024 / 2k / 4k) in the redo panel, and it renders that text object to a
stencil-style image via a temporary camera. Meant as a texture-paint mask,
not a finished texture. Handy for stenciling unit numbers, faction markings,
or serials onto custom armor/weapon skins without hand-painting the
lettering — style/font the Text object first (Blender's normal font
properties), since whatever it looks like in the viewport is what gets
baked into the mask.

## Reference/asset sourcing (same tier as BlenderKit)

### ABO Connect
Own sidebar tab, "ABO Connect" (panel "ABO Connect", category "ABO
Connect"). Browse/search the Amazon Berkeley Objects dataset with real
filtering — **Type**, **Category**, and **Sort By** menus, plus pagination
(**Next/First/Previous/Last Page**) rather than one long scroll — **Fetch
Metadata** or **Download Metadata & Thumbs** to pull details for what's
visible, then **Import Selected Model**. **Toggle Favorite** on anything
worth keeping; **Export Favorites** / **Import Favorites** move that list
between machines, and the local thumbnail/model cache has its own
management (custom cache path, Clear Models Cache, Move Cache to New
Location) — worth knowing about since a reference-asset cache can grow
large fast.

**Surface Snap** (`abo.dynamic_placement`) is worth calling out specifically
— it's an interactive modal placement tool, not a one-click snap like Down
to Earth: after importing, run it and the object follows your mouse across
whatever surface is underneath it live; Shift+scroll wheel rotates it in
10° steps while you position it, and pressing **A** cycles which axis it's
aligned to. Better than Down to Earth for interactively finding a placement
by eye; Down to Earth is still the better choice for a single
programmatic/consistent drop (e.g. batch-placing a row of scatter props).

Reference only — these are real-world scanned objects, not game-ready
meshes, so anything pulled in still needs full retopo/UV/rigging (Autoremesher
→ our add-on's export pipeline) before it's usable in FO4.

## Lower-priority / not FO4-specific

Addons seen installed alongside these but not (yet) worth a dedicated catalogue
entry: general asset-browser add-ons like **CGHEVEN Asset Library** (same
category as BlenderKit/ABO Connect — reference/base meshes, not FO4-specific),
material/shading utilities like **MatShelf**, **Shader Ops**, **Material
Viewport Color from Nodes**, and **AI Material Generator** (PBR-from-text —
could be useful for quick placeholder textures, worth revisiting if texture
generation becomes a bigger part of the workflow), general modeling/UI
helpers like **Set to Wire V2**, **Object Mode Hierarchy Selection**, and
**Arrange Objects in a Circle**. **SplatGen Standard** and **404 3D
Generator** are both Gaussian-Splatting/photogrammetry tools (camera dataset
capture, .ply point clouds) — neither has any FO4 modding use case, they're
solving a completely different problem (novel-view synthesis, not game-ready
meshes).

## Adding a new one

1. Add an entry to `_KNOWN_ADDONS` in `addon_integration.py` with a concrete
   `fo4_use_cases` string that names the actual pipeline step it plugs into
   (not just a generic description restated).
2. Add a matching section here with **real usage steps** — panel/tab name,
   the actual button/operator to press, and what happens before and after in
   our own pipeline. Check the addon's own README first; if it doesn't have
   one, grep its source for `bl_label`/`bl_category`/panel class names rather
   than guessing.
3. If it changes the addon_id's install path assumptions, sanity-check the
   `bl_ext.<repo>.<addon_id>` detection note above still holds for it.
