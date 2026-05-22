# Precombine Previs Deep Dive

**Source:** PJM's Precombine - Previs Patching Scripts, Nexus #69978  
**Author:** PJMail  
**Total views:** 14.2k  
**Last updated:** Mar 2026

---

## Terminology Used in This Guide

| Term | Definition |
|---|---|
| **Cell (CELL)** | A 4096×4096 square of an exterior Worldspace, or an entire Interior space |
| **Cell Reference (REFR)** | A placed object in that CELL |
| **Version Control Information (VCI1)** | Field on a Cell Reference specifying when that Reference was created/modified |
| **Material Swap (MSWP)** | A record specifying Textures to be swapped; can be applied to a Cell Reference to give an object a different look |
| **Precombineable Reference** | A Reference of base type Static (STAT) or Static Collection (SCOL) that can be included in a precombine |
| **Precombined Reference** | A Precombineable Reference that has been included in a Precombine and is no longer separately rendered |
| **Precombine Mesh** | A modified mesh file (.nif) composed of multiple meshes from Precombined References, pre-created to optimise rendering |
| **Combined References (XCRI)** | Field on a Cell listing all Precombined References and Precombine Meshes in that Cell (the Cell's Precombines) |
| **PCMB** | Field on a Cell specifying when the Precombine meshes for that Cell were created |
| **Physics Mesh** | One per Cell; contains the Collision parts of Precombined References in that Cell's Precombine Meshes |
| **Previs** | The Occlusion (PreCulling) mechanism used to improve FPS by not rendering objects hidden behind other objects |
| **Previs Cluster** | 9 Exterior Cells in a 3×3 pattern; a Cell can only be a member of one Cluster |
| **RVIS** | Field on an Exterior Cell specifying the ID of the middle Cell of the Previs Cluster it belongs to |
| **Previs File** | Pre-generated file (.uvd) containing Occlusion information for a Previs Cluster or an entire Interior Cell |
| **Previs Objects** | Cell references whose rendering is controlled by the Previs system; in FO4 all Precombined references are effectively Previs Objects |
| **Landscape (LAND)** | One per Exterior Cell; defines the shape and texture of the landscape; also used in the Previs file |
| **XPRI** | Field on a Cell listing special non-precombineable references treated as Previs Objects |
| **VISI** | Field on a Cell specifying when the Previs for that Interior Cell (or Cell Cluster) was created |
| **Previsbines** | Unofficial term meaning the Precombines and Previs for a Cell or the whole Mod |
| **Plugin** | Another term for a "Mod" |
| **Lowest Plugin** | Plugins get "lower" as they reach the bottom of the Load Order (their Mod# gets higher) |
| **Winning Object / Last Override** | The override of that object in the Lowest Plugin |

---

## Precombine/Previs Basics

- Previsbines are pre-generated CELL information and files used by the game to reduce what it needs to render, increasing FPS — especially on low-end graphics systems.
- Previsbines are either **On or Off** for each Cell, determined during **Game startup** (based on loaded plugins), not during play. They are **not** stored in saves.
- A Cell can have Precombines without Previs, but the game does not allow Previs without Precombines enabled (even if there are none).
- Precombines (and thus Previs) can be deliberately disabled per Cell by removing either the Cell's XCRI or PCMB fields.
- Previs can be disabled alone by removing the Cell VISI field or setting the Cell flag **"No Previs"**.
- The game can also decide to disable Precombines during startup — see *Game Startup Previsbine Checks* below.
- Precombines can be disabled game-wide via `Fallout4.ini` setting `General:bUseCombinedObjects=0`. This also disables Previs of precombined objects (though the Previs system still runs). FPS will drop significantly. This setting only takes effect after a fast travel if changed via the console `Setini`.

**Physical storage:**
- Precombine meshes: `Data\Meshes\Precombined\` (loose or in a `- main.ba2`)
- Associated `.csg` and `.cdx` files: in `Data\` if built "clean"
- Previs files: `Data\vis\` (loose or in a `- main.ba2`) as `.uvd` files
- Matching CELL fields PCMB/XCRI and VISI/XPRI must all be consistent for everything to work correctly

The game will run with Previsbines disabled for a Cell — your FPS will drop when that Cell is rendered. Remember: all Cells within `uGridsToLoad` range are rendered, so you can get FPS drops from Cells with disabled Previsbines that are some distance away.

> **Note:** The game does not support Previsbines for new cells created (mastered) in an ESL-flagged plugin. Do not create new worldspaces or interiors in `.esl` or ESL-flagged `.esp` plugins and expect to build Previsbines for them. This is a game bug.

---

## How a Precombined Reference Works

A Precombined reference is a reference on a Cell (master or override) that:
- Places a precombineable object into the Cell
- Is specified in the XCRI field of the winning Cell override as being included in a Precombine Mesh
- Is **NOT** rendered directly — the Precombined mesh it is included in is rendered instead (it contains a snapshot of the reference)
- This means **subsequent changes to this reference are ignored** until the Precombine containing it is rebuilt

**Important:** VCI1 of the reference is checked during startup. Manual editing via FO4Edit normally sets VCI1 to 'None' (interpreted as a far future date). Editing via the CK sets VCI1 to today.

---

## How a Precombine Mesh Works

- A Precombine Mesh is a single mesh built from all the individual meshes of the Precombined Objects it contains. Displaying one big mesh is less GPU-intensive (fewer draw calls) than many smaller ones.
- Both the Precombine Mesh **and** the Precombined References they are built from **must** be declared in the Cell's XCRI field for the game to use them.
- Files are stored in `Data/meshes/precombine/` (or in the plugin's `- Main.ba2` archive).

---

## How the Previs File Works

The Previs file is essentially an index into all the Precombine meshes of a Cluster:
- Contains **3D positional information** of every object in those Precombine Meshes — Previs cannot be correctly built until all Precombine Meshes are built first.
- The game uses this information to render only the parts of Precombine meshes visible to the player.
- A Previs file only works correctly with the **exact Precombine meshes it was built from**. A mismatch causes flickering.
- The Previs file also includes all **Landscape heightmap** information for the cluster — changing a Cell's LAND record causes flickering until Previs is rebuilt.
- Previs also contains occlusion information for some Static but non-precombineable objects (like Furniture), listed in XPRI records. Moving such objects without rebuilding Previs makes them disappear at certain angles.

---

## Previs Clusters

A Previs Cluster is 9 Exterior Cells (3×3) sharing a common Previs file (`<ClusterCenterID>.uvd`):
- The Cluster Center Cell ID is specified in the RVIS of every Cell in that Cluster.
- The Center Cell has a Grid (XCLC) X,Y coordinate that is a multiple of 3 (e.g. `0,0`, `-21,12`), with the remaining cells at ±1 in X and Y.
- A Cell cannot be part of more than one cluster. Interior Cells are not in a Cluster (they are effectively their own Cluster).

> **Note:** Removing the RVIS field on exterior cells does nothing (but is not recommended).

---

## The Rule of 1 — Winning Overrides

The game follows a **"Rule of 1"** — only the **last override** of a Cell matters. This applies to:
- PCMB/XCRI/XPRI fields
- Previs Files and Precombine Mesh files (the file in the archive of the **lowest** Plugin with that file is used)
- A Plugin's archive can contain these files even if it has no relevant CELL records in its .esp file — but this makes tracking difficult and is ill-advised.

> **Important:** A **loose** version of these files (in `Data/Meshes/Precombines` or `Data/vis`) will **always** be used instead of any archived version.

---

## Common Visual Faults (Summary)

| Symptom | Likely Cause |
|---|---|
| Lower FPS in exterior locations | Mod changes to precombined references disabled precombines for that cell |
| Voids in interior locations | Previs is wrong (mismatched to Precombines) |
| Workshop items cannot be placed on floor (interior settlements) | Precombines are disabled |
| Mod changes not taking effect | Changes to precombined objects are ignored until the Precombine mesh is rebuilt |
| Deleted/disabled objects still appearing | Same as above |
| Mod changes only visible until you move it higher in load order | It was only "working" because it broke (disabled) precombines |
| Invisible objects/walls | Objects in XCRI or XPRI but not in Precombine meshes/uvd files |
| Object in both old and new position | Precombined object was overridden to move to a new exterior cell |
| Large thin walls of colour at certain angles | Precombined mesh built from an incompatible object mesh (e.g. high precision) |
| Parts of buildings flicker on/off as you move | Cell's Precombines are not the ones used to create the Previs (uvd) |
| Objects flicker as you cross an invisible line (cluster boundary) | Objects are in both clusters but only one cluster uvd knows this |
| Distant object flickering | LOD issue, not Previsbines |
| Partially transparent objects (tattered pictures) only correct with Precombines disabled | XALP value is ignored when Precombined |

---

## Previs in Interior Cells (Voids, Roombounds, etc.)

Interior Cells can use an older system of **Roombounds & Portals** if standard Previs is not enabled:
- Roombounds determine the boundaries of a room; Portals are gaps through which you can see other rooms.
- If an Interior Cell was meant to use Previs but a mod broke it, you may see "voids" in walls/doors.
- Disabled precombines in interior cells can cause issues with floors: inability to place workshop objects or the player falling through.

Note: Lack of Previsbines in an interior cell is normal — many interior cells do not benefit from optimisation and Bethesda didn't add them.

---

## How the Game Determines Precombine/Previs State During Startup

The following process occurs when **each Cell override** (in a Plugin) is read — the precomb/previs state changes after each override. The game does **not** just look at the winning override.

For each subsequent Cell override in load order:
1. If the override is not flagged PartialForm, its Record Header flags become current (the "No Previs" flag sets the internal NoPrevis state).
2. If the override is not flagged PartialForm, its PCMB becomes current (even if blank). A blank PCMB sets the internal NoPrecomb state.
3. If the override is not flagged PartialForm and its XCRI is not blank, its XCRI becomes current.
4. If the override is not flagged PartialForm and its XPRI is not blank, its XPRI becomes current.
5. If the override is not flagged PartialForm, its VISI becomes current (even if blank). A blank VISI sets the NoPrevis state.
6. If the Cell is Exterior and has a LAND override with a VCI1 of 'none' OR newer than the current PCMB, the NoPrecomb state is set.
7. For non-persistent exterior Cells, each XCRI reference override is checked. A reference sets NoPrecomb if its VCI1 is 'none' or newer than PCMB, and it meets all these conditions:
   - Is an override
   - Does not have X,Y coordinates placing it outside this Cell or in a different Worldspace/Interior
   - Is not set as Persistent (for exterior references)
   - Its Master is in the same plugin as the Cell's Master
   - Its override is in the same plugin as the Cell's non-partial override, OR is an interior reference in an ESM-flagged plugin
8. If the final NoPrecomb state is set, the NoPrevis state is also set.

> **Tip:** The console command `tpc` toggles Previs off/on (if the game has not disabled it — you'll get a message). The command `tb` (toggle borders) shows yellow borders on cells where Previs is disabled.

---

## How the Optimisation System Renders References In-Game

**If Precombines are enabled:**
- References in the Cell's XPRI or XCRI lists are **not** rendered directly.
- All remaining objects (except Landscape) are rendered normally.
- Collision of Precombined objects comes from the Precombine meshes/physics files, not the references themselves.
- The current state of precombined objects (REFR) is ignored — even if deleted or moved.

**If Previs is also enabled:**
- The system dynamically renders only those parts of Precombined meshes not occluded.
- XPRI references are rendered only if not occluded.
- Landscape is rendered with occlusion applied.

**If Previs is disabled (but Precombines still on):**
- All Landscape and Precombine meshes/XPRI objects are fully rendered.

---

## What Happens If a Precombined Reference Is Altered by a Later Override

**Nothing** — precombined references are always rendered at their original location (snapshotted into the precombine mesh). Overrides — including deletions or moves — are ignored.

**Exception — duplication:** The object reference will **also** be rendered in its new location if the winning override:
- Has not deleted/disabled it, AND
- Changes its coordinates so it moves into a different Cell, OR
- Moves it to a different Worldspace, OR
- Changes it from interior to exterior (or vice versa)

> Note: Changing a Ref's persistence is ignored for this purpose. Changing a Persistent REFR to Temporary is not supported by the game.

---

## XPRI References, Invisible Objects, and Bugs

References in XPRI are non-precombineable, non-moveable, non-scrappable objects that also have occlusion data in the uvd file. They are only rendered if not 100% occluded, reducing rendering load.

Base object types used in XPRI: STAT, SCOL, FURN, CONT, MSTT, ACTI, TACT, FLOR, HAZD, PROJ, TERM. Both Persistent and Temporary references can be in XPRI. Deleted or Initially Disabled references are not included by the CK.

**Invisible XPRI objects:** Adding objects to XPRI that the uvd knows nothing about causes those references to **never be rendered** — though they can still be interacted with (sat on, activated, collided with).

### Game (and CK) XPRI Bugs

**Bug 1:** A CELL override with a **blank (empty) XPRI field is ignored** — the game uses the last override with a non-empty XPRI. This means those XPRI entries won't be in the winning uvd and will be invisible.

**Bug 2:** XPRI (and RVIS) local FormIDs are **not mapped to Load Order IDs**. If the internal local FormID of an XPRI reference differs from its Load Order ID, it is effectively ignored. In practice: XPRI only gives a performance benefit for references defined in the **Base Game/DLCs**, not user-added content.

---

## Static Object Meshes That Crash the CK

The CK will crash trying to precombine any mesh (nif) with:
- Any `*Trishape` node with **Full Precision Vertices** (VertexDesc flag "Full Precision")
- Any `*Trishape` node without the "Shader Property" linked to a valid `BSEffectShaderProperty` node
- Any corrupt node

---

## Previsbine Visual Faults (Detailed)

Since different plugins can "win" different parts of a Cell's Precombine (the CELL record, the mesh files, etc.), mismatches are common.

### Precombine Faults

1. A plugin changes (deletes/moves/disables) a Precombined Reference with no corresponding change to the Precombine Mesh → the change is ignored.
2. A Cell Reference is in XCRI but not in the winning Precombine Mesh → the object is invisible in-game.
3. An object is in XPRI but the Previs uvd was built without it → the object is invisible but still interactable. (Note: blank XPRI is ignored, so the last non-blank XPRI override is used.)
4. Misplaced collision (invisible walls) — occurs when a mod improperly overrides/replaces the Physics file for a Cell.
5. Duplicated objects — a precombined object's override moves it to a different Cell, so it appears in both the original and new location.
6. **Texture "Smearing"** (sky-high wall of colour) — a malformed mesh (often a high-precision SCOL used as a STAT) was included in a Precombine. Run `FO4FindPCStatics.pas` to find and exclude it, then rebuild.

### Previs (Occlusion) Faults

Previs is generated from 9 Cells (a Cluster) of Precombine Meshes — 9× more mismatch opportunities.

- **Flickering** — Previs information points to the wrong Precombined objects, hiding/showing wrong things.
- **Occluded by "nothing"** — Landscape was changed (e.g. a hill removed) but Previs not rebuilt; the old hill still occludes objects.
- **Adjacent cluster overlap** — a large building straddles two clusters; Cluster B's Previs includes geometry from Cluster A's Precombines. Rebuilding Cluster A's Precombines without also rebuilding Cluster B's Previs causes flickering along the boundary. The solution is to rebuild Previs for your cell while the other cluster/mod is also loaded. If only one reference overlaps, excluding it from Precombines may suffice.
- **Transparent windows** — windows close to each other or to the player may not render correctly. Exclude problem windows via `BlockPreVis` (XLRT).
- **CK timeout during Previs** — too many objects in the same location (often an object "dumping ground" near cell 0,0). Examine the Cell in the CK and disable unwanted refs.

---

## Which Cell References Are Precombineable

Only Cell references with a base type of **STAT** or **SCOL** can be precombined. Even then, a reference is **excluded** if the REFR has:
- Disabled or Deleted flag
- Any of these fields: XLRT, XESP, XATR, or XEMI (`NoObjectCombinationRefType` or `BlockPreVis` in XLRT is the standard exclusion method)
- Linked References (XKLR) with a keyword other than `MultirefLOD`
- Is linked by another linked ref

A reference is also excluded if its **base object** (STAT/SCOL) has:
- A Workshop recipe (for cells in a settlement)
- The "Forced Location Type" (FTYP) set to any value (a reliable way to exclude all references using that base mesh)
- A mesh with any of: BSXFlags with "Animated", or "Havok" AND "Dynamic"; node block types of NiBillboardNode, NiSwitchNode, NiParticleSystem, NiParticles, or BSBehaviorGraphExtraData

> **Note:** All Persistent Exterior Refs in the Worldspace Persistent Cell will be precombined into a Cell if their coordinates place them in it.

---

## Using the Creation Kit to Generate Previsbines

### Methods
There are only two ways to generate Precombines and Previs — via the **CK GUI** or via the **CK command line**. Generating Precombines and Previs are two separate operations either way.

| Method | Precombine Type | Notes |
|---|---|---|
| CK GUI | "Filtered" only | Simpler but generates larger files |
| CK Command Line | "Clean" or "Filtered" | Required for production builds |

**"Clean" Precombines** (command line only): Meshes are de-duplicated; common object meshes go into a separate `Plugin - Geometry.csg` file, reducing overall size. Not supported on XBOX (Bethesda.net won't allow uploading `.csg`/`.cdx` files).

**"Filtered" Precombines**: Not de-duplicated; generally 5–10× larger than Clean.

### CK Precombine Generation Bugs

- **Material Swaps** on the Base Object of a Precombineable reference are ignored — references revert to default textures. PJM's seed builder adds these swaps to the references automatically.
- The **Alpha channel field (XALP)** of Precombineable references is ignored — e.g. "moth-eaten" paintings become pristine. The only solution is to exclude these from precombining. PJM's seed builder does this automatically.
- **SCOLs / kitbashed objects**: Static meshes created from SCOLs or kitbashing can crash the Precombine process — rebuild their collision and change it away from "high precision".
- If using "Clean" method: **no spaces** in the mod name (CK cannot create `.cdx` files with spaces).
- CK command line **will not** build Precombines for Exterior CELLS outside the Border Region(s) of a Worldspace.

### CK Previs Generation Issues

- The CK must be able to see all Precombine mesh (.nif) files for all 9 Cells in a Cluster during Previs building (in BA2 archives or as loose files).
- Previs does **not** use textures — removing texture archives before Previs generation reduces CK memory usage (critical, as Previs requires a lot of memory; 48 GB usage is not unknown).
- Some conditions cause the CK to hang when building certain clusters — these time out with an error in the log.
- **IMPORTANT:** The unpatched CK has a limit of **2,097,152** unique references. The base game and DLCs consume ~86% of this limit. The only recommended solution is `bBSPointerHandleExtremly=true` in CKPE, which vastly increases the limit.
- **Do not use your computer for anything else while building Previsbines.** Running out of memory (e.g. from browser windows) will corrupt Previs.

---

## Recommended Creation Kit Environment

- Use the **Steam version of the CK** with `steam_appid.txt` (containing `1946160`) in the same directory as `CreationKit.exe`.
- If running the CK via MO2, also specify the AppID in that executable's settings.
- **Use CKPE (Creation Kit Platform Extended)** — it fixes a large number of Precombine generation issues and is a must-have.
- In CKPE's config (`CreationKitPlatformExtended.ini`): set `bBSPointerHandleExtremly=true`.
- As of Oct 2025: CKPE V0.4/0.5 does **not** work properly with the OG CK. Use CKPE V0.3 for OG CK (but it cannot handle V7/V8 BA2 archives — downgrade them with CMT and set `bOwnArchiveLoader=false`).

---

## Generating Previsbines Manually via the Creation Kit GUI

1. Group Cells you plan to build Precombines for by the Clusters they belong to.
2. For each Cell in a Cluster: open it in the Cell View list, wait for it to render, then select **World → Precombine Geometry for Current Cell**. Wait for the Cell Preview to become active again before proceeding to the next Cell.
3. Save regularly — the CK is prone to crashing.
4. Once all Cells in a Cluster are done, select **Visibility → Generate Precombined Visibility for Current Cell**. This takes a long time and finishes with a confirmation box.
5. Save again and repeat for each Cluster.

> **Note:** Due to a current bug, archives of the currently "active" Plugin are not used by the CK during Previs — extract them as loose files first.

---

## Generating Previsbines via the Creation Kit Command Line

The CK has two command-line options: `-GeneratePrecombined` and `-GeneratePreVisData`. This process has many additional steps (merging results back into your plugin) and is handled automatically by PJM's `GeneratePrevisibines.bat`.

**How the command line determines which Cells to build Previsbines for:**
- The "seed" plugin must contain a Cell record (override or master) for **every** Cell you want Precombines for.
- Those Cells must each contain **at least one** Cell reference (need not be precombineable).
- For Previs (`-GeneratePreVisData`): the Cluster of that Cell **and all adjacent Clusters** will also have Previs generated.
  - A Cluster "corner" Cell potentially generates Previs for 4 Clusters; a "middle" Cell generates Previs for only its own Cluster.

**Output files:**
- `-GeneratePrecombined` creates `CombinedObjects.esp` containing only Cells the CK generated new Precombines for (only PCMB, XCRI, and Cell VCI1 are valid in this file).
- `-GeneratePreVisData` **requires** that seed Cells already have the new PCMB and XCRI values before it runs. It creates `Previs.esp` with Cells for every Cluster it processes (only VISI, RVIS, and XPRI fields are important).

---

## Common CK Failures

| Failure | Cause | Fix |
|---|---|---|
| Access violation 0xC0000005 during Precombine building | Corrupt/incompatible mesh on a Precombineable Reference (STAT/SCOL); high-precision mesh; bad texture from a replacer mod | Run `FO4FindNewPCStatics.pas`; fix or exclude the mesh |
| Error -1073740771 / 0xC000041D at end of a CK phase | If CK saved successfully beforehand: can be ignored. If it prevents completion: resource issue (memory or file handles) | Close other applications; remove texture archives |
| Hundreds of "DEFAULT: OUT OF HANDLE ARRAY ENTRIES" during Precombine building | Total references exceed 2,097,152 (base game + DLCs is ~86% of limit) | Set `bBSPointerHandleExtremly=true` in CKPE |
| "ERROR: visibility task did not complete." during Previs building | CK hung during Previs for a Cluster; too many objects in the same location | Use CK to examine every Cell in the Cluster; disable unwanted refs at the problem location |
| Running out of memory during Previs building | 48 GB usage is possible | Remove texture archives; close other applications; disable antivirus |
| Too Many Masters | CK includes all loaded Masters into the resulting Precombine/Previs plugin; FO4 has a 255-Master limit | Reduce loaded masters; break the patch into smaller pieces |

---

## Possible Faults in Newly Generated Previsbines

If Previsbines are built correctly but an area still flickers, some objects don't work well with preculling (thin objects, see-through railings):
- Give the problematic Reference an XLRT of `BlockPreVis` to exclude it from Previs, then rebuild.
- Alternatively, set the **"non-occluder" flag** on the Base Object to exclude all references using it.

**Adjacent Cluster Overlap (Severe Flickering):**
Large precombineable objects straddling two Clusters (e.g. buildings in a town) cause mismatch between the Clusters' Previs files. The solution is to rebuild Previs for your Cell while the adjacent mod/cluster is also loaded, producing a version of your Previsbines that is compatible with it (e.g. a PRP-specific version). If only one overlapping reference is the issue, excluding it from Precombines may be enough.

**Transparent Windows:** Windows close together or near the player may not render correctly. Exclude them via `BlockPreVis`.

**Smeared Textures (sky-high walls):** A high-precision mesh (e.g. an SCOL used as a STAT) was included in a Precombine. Find and exclude the reference, then rebuild.

---

## Renaming a Plugin with Precombines/Previs

Renaming is **not recommended** if Precombines were generated "Clean" (with a `.csg` file), because:
- Clean Precombine meshes contain `BSPackedCombinedSharedGeomExtraData` nodes with the **hash of the `.csg` filename**.
- Renaming `<plugin> - geometry.csg` breaks this — you would still need the original `.esp` in your load order, making renaming pointless.

**For "Filtered" Precombines (no shared Geometry):**
- Renaming the plugin is possible, but if the plugin **mastered** any cells (new interior cells or exterior Worldspaces), you must also rename the subdirectory all its Precombine mesh (.nif) and Previs (.uvd) files are stored under.
- The game looks for these under `Meshes/Precombined/<MasterModname>/` and `vis/<MasterModname>/`.
- **These paths are not stored in the plugin** — they are determined at runtime. The XCRI "Combined Mesh" field only stores the Hex ID used in the mesh filename (`<CellFormID>_<HexID>_OC.nif`). Do not try to edit these paths in xEdit.
- The Previs filename is `<PrevisCellFormID>.uvd` where PrevisCellFormID is the Interior Cell ID or the center Exterior Cell ID of the Cluster. The game does **not** use the RVIS field for this — it works it out at runtime.

---

## (Advanced) Partial Form (Flag 14) on CELLs

Adding the "Partial Form" flag to a Cell override tells the game to ignore that override, which prevents it from overriding the Cell's PCMB etc. fields.

**Only use this if:**
- You are 100% certain the Cell override before yours is from an **esp-type** plugin (such as PRP.esp), AND
- The Cell was mastered in an **esm-type** plugin (like Fallout4.esm).

Due to a FormID processing bug, only use Partial Forms on Cells mastered in `Fallout4.esm`. This approach is only recommended when making a patch that requires PRP.esp and the Cell comes from Fallout4.esm.

---

*Credit: All content by PJMail — PJM's Precombine - Previs Patching Scripts, Nexus #69978. Last updated Mar 2026.*
