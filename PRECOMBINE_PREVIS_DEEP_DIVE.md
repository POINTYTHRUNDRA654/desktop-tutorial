# Precombine Previs Deep Dive

**Total views: 12.3k**

## Terminology used in this guide

| Term | Definition |
|------|-----------|
| **Cell (CELL)** | A 4096x4096 square of an exterior Worldspace, or an entire Interior space |
| **Cell Reference (REFR)** | A placed object in that CELL |
| **Version Control Information (VCI1)** | Field on a Cell Reference specifying when that Reference was created/Modified |
| **Material Swap (MSWP)** | A record that specifies Textures to be swapped; can be applied to a Cell Reference to change appearance |
| **Precombineable Reference** | A Reference of base type Static (STAT) or Static Collection (SCOL) that can be included in a precombine |
| **Precombined Reference** | A Precombineable Reference included in a Precombine; no longer separately rendered |
| **Precombine Mesh** | Modified mesh file (.nif) composed of multiple meshes from precombined References; optimizes rendering |
| **Combined References (XCRI)** | Field on a Cell listing all Precombined References and Precombine Meshes; also called "Cell's Precombines" |
| **PCMB** | Field on a Cell specifying when Precombine meshes were created |
| **Physics Mesh** | One per Cell; contains Collision parts of Precombined References in that Cell's Precombine Meshes |
| **Previs** | Occlusion (PreCulling) mechanism reducing rendered objects by not rendering hidden objects; improves FPS |
| **Previs Cluster** | 9 Exterior Cells in a 3x3 pattern; a Cell can only be member of one Cluster |
| **RVIS** | Field on an Exterior Cell specifying the ID of the middle Cell of the Previs Cluster it is in |
| **Previs File** | Pre-generated file (.uvd) containing Occlusion information for a Previs Cluster or entire Interior Cell |
| **Previs Objects** | Cell references whose rendering is controlled by Previs system; in FO4 all Precombined references are "effectively" Previs Objects |
| **Landscape (LAND)** | One per Exterior Cell; defines shape and texture of landscape; used in Previs file |
| **XPRI** | Field on a Cell listing special non-precombineable references treated as Previs Objects |
| **VISI** | Field on a Cell specifying when Previs for that Interior cell (or Cell Cluster) was created |
| **Previsbines** | Unofficial term meaning Precombines and Previs for a Cell or the whole Mod |
| **Plugin** | Another term for a "Mod" |
| **Lowest Plugin** | Plugins get "lower" reaching the bottom of Load order (Mod# gets higher) |
| **Winning Object (Last Override)** | The override of that object in the Lowest Plugin |

---

## Precombine/Previs Basics

### Overview

Previsbines are pre-generated CELL information and files used by the game to reduce what needs to be rendered, increasing game FPS (especially on low-end Graphics systems).

**Key Points:**
- Previsbines are either On or Off for each Cell
- Determination occurs during Game startup (based on loaded plugins), not during play
- Not kept in save files
- A Cell can have Precombines without Previs, but game doesn't allow Previs without Precombines

### Enabling/Disabling Previsbines

Precombines and Previs can be deliberately disabled per Cell by:
- Removing the Cell's XCRI or PCMB Fields (disables Precombines and thus Previs)
- Removing the Cell VISI field or setting the "No Previs" flag (disables Previs only)

**Game-Level Control:**
- Game can disable Precombines during Game startup (see "Game Startup Previsbine checks")
- Whole-game disabling via `Fallout4.ini` setting: `General:bUseCombinedObjects=0`
  - Disables Previs of precombined objects (though Previs system still runs)
  - Results in significant FPS drop
  - Takes effect after fast travel if changed in-game via console

### File Storage

**Precombines:**
- Physical Precombines: `Data\Meshes\Precombined` (loose or in "- main.ba2")
- Associated files: `.csg` and `.cdx` in Data (if built 'clean')
- Matching information in CELL fields PCMB and XCRI
- All must be consistent for proper function

**Important Notes:**
- Game runs with disabled Previsbines, but FPS drops in rendered Cells
- Interior Cells may have other issues
- All Cells rendered within "uGridsToLoad" range; FPS drops from distant Cells with disabled Previsbines possible
- **Game does NOT support previsbines for new cells (mastered) in "ESL" flagged plugins (Game bug)**

### Precombined References

A Precombined reference is a reference on a Cell that:
- Is specified in the winning Cell override's XCRI field as included in a Precombine Mesh
- Is NOT rendered separately; Precombined mesh renders instead
- Subsequent changes ignored until precombine rebuilt
- **UP TO YOU** to rebuild Precombine meshes if you or a mod changes references

**VCI1 (Version Control Information):**
- Game checks if references changed but relies on VCI1 being updated
- FO4Edit manual editing normally sets VCI1 to 'None' (interpreted as far future date)
- Creation Kit editing sets VCI1 to today

### Precombine Meshes

A Precombine Mesh is:
- Single mesh built from multiple individual meshes of Precombined Objects
- Less GPU intensive (fewer Draw calls) than rendering multiple smaller meshes
- **Both the Precombine Mesh AND precombined References must be declared in XCRI**
- Stored in `Data/meshes/precombine` directory (or equivalent path in plugin's "- Main.ba2" archive)

### Previs Files

The Previs file functions as an 'index' into all Precombine meshes of a Cluster and:

**Contains:**
- 3D positional information of every object in Precombine Meshes
  - Cannot build Previs correctly until all Precombine Meshes are built first
- Landscape heightmap information for a cluster (hills occlude objects behind them)
- Occlusion information for some Static but non-precombineable objects (Furniture, etc.)

**Critical Note:**
- Previs file only works correctly with the Precombine meshes it was originally built with
- Mismatch causes incorrect object display based on Player view (flickering)
- Changing Landscape (LAND) record causes flickering until Previs rebuilt

**Dynamic Rendering:**
- Game uses Previs information to render only parts of Precombine meshes that are visible
- Objects in XPRI records only rendered if not occluded
- Moving non-precombineable objects without rebuilding Previs causes incorrect 'disappearance'

**Physical Storage:**
- Located in `Data\vis` path (or equivalent in plugin's "- Main.ba2" archive) as `.uvd` files
- Matching information in CELL fields VISI and XPRI
- All must be consistent for proper function

**Rebuilding Previs:**
- Can create new Previs for Cells/Cluster using existing precombines at any time
- Must overwrite VISI and XPRI information of ALL CELLs in same cluster with new versions generated by CK

### Previs Clusters

A Previs Cluster is:
- 9 Exterior Cells (3x3) sharing common Previs file (`<ClusterCenterID>.uvd`)
- Cluster Center Cell ID specified in RVIS of every cell in that Cluster (mostly)
- Center Cell has Grid (XCLC) X,Y coordinate that is multiple of 3 ("0,0", "-21,12" etc)
- Remaining cells at +1 or -1 (X and Y) from center
- A Cell cannot be part of more than one cluster
- Interior Cells not in a Cluster (effectively their own Cluster)

**Note:** Removing RVIS field on exterior cells does nothing (not recommended)

### Load Order and Winning Objects

The Game follows a **"Rule of 1"** for everything:
- Only the last override of a Cell matters (wins)
- Winning override specifies PCMB/XCRI/XPRI/etc Fields used by game
- Applies to Previs Files and Precombine Mesh files: lowest Plugin version is used
- Plugin archive can contain these files even with no relevant CELL records
- **Loose versions in Data/Meshes/Precombines and Data/vis ALWAYS used instead**

---

## Common Visual Faults (Summary)

**In-Game Symptoms:**

| Symptom | Cause |
|---------|-------|
| **Lower FPS in certain Exterior locations** | Mod's changes to precombined references caused game to disable precombines for that cell |
| **Voids in interior locations** | Previs mismatch (mismatched to Precombines) |
| **Workshop items cannot be placed on floor (Interior Settlements)** | Precombines are disabled |
| **Changes by a Mod not taking effect** | Cell's precombine meshes not rebuilt |
| **Deleted/disabled objects still appearing** | Precombine meshes not rebuilt |
| **Changes visible in-game until moved higher in Load order** | Only 'working' because broken (disabled) precombines |
| **Invisible objects/walls** | Objects in XCRI or XPRI but not in Precombine meshes/occlusion files |
| **Objects moved appear in old AND new position** | Precombined object moved to different exterior cell by override |
| **Large thin walls of colour at certain angles** | Precombined mesh built from incompatible object mesh (high precision) |
| **Parts of buildings flicker on/off during movement** | Precombines not matching those used to create Previs (.uvd) |
| **Objects flicker crossing 'invisible line' (Cluster boundary)** | Objects in both clusters but only one cluster .uvd knows this |
| **Flickering of objects in distance** | LOD issue, NOT previsbines |
| **Transparent objects only correct with Precombines disabled** | XALP value ignored when Precombined |

---

## Previs in Interior Cells (Voids, Roombounds, etc)

### Roombounds and Portals

Interior Cells can use older "Roombounds & Portals" system if standard Previs not enabled:
- **Roombounds:** Determine boundaries of a room
- **Portals:** Gaps in roombounds for line-of-sight to other rooms
- Used to limit rendering (don't render past roombounds unless line-of-sight through Portal)

### Previs Issues in Interiors

If Interior Cell was meant to use Previs but mod broke it:
- **Voids in walls/doors:** "Interior" version of flickering
- **Floor issues:** Workshop objects cannot be placed or Player falls through
  - Precombined ground considered floor even if base object isn't

### Interior Cell Previsbines Status

- Many interior cells don't benefit from optimization; normal if lacking Previsbines
- Issues occur when they DO have previsbines but mod override disabled/broken them

---

## How Game Determines Precombines/Previs State During Startup

### Process Overview

The following process occurs when EACH cell override is read (precomb/previs state changes after each):
- Game maintains internal 'NoPrecomb' and 'NoPrevis' state during process
- Game DOES NOT just look at winning override to determine state
- First Plugin declaring cell is considered Master (must not be set Partial)
- Subsequent overrides are processed in FO4Edit load order

### Processing Steps for Each Cell Override

1. **Record Flags:** If override NOT flagged PartialForm, its Record Header flags become current
   - 'No Previs' flag sets internal 'NoPrevis' state

2. **PCMB Field:** If override NOT flagged PartialForm, its PCMB becomes current (even if blank)
   - Blank PCMB sets internal 'NoPrecomb' state (otherwise cleared)

3. **XCRI Field:** If override NOT flagged PartialForm AND XCRI not blank, XCRI becomes current

4. **XPRI Field:** If override NOT flagged PartialForm AND XPRI not blank, XPRI becomes current

5. **VISI Field:** If override NOT flagged PartialForm, VISI becomes current (even if blank)
   - Blank VISI sets internal 'NoPrevis' state

6. **LAND Record Check:** If Cell is Exterior with LAND override having:
   - VCI1 date of 'none', OR
   - VCI1 > current PCMB
   - Then internal 'NoPrecomb' state is set

7. **Reference Checks:** If Cell is NOT Persistent Exterior Cell, check latest override of each XCRI Reference
   - Only check overrides matching:
     - Are an override
     - X,Y coordinate places them in this Cell
     - Same Worldspace/Interior cell (or Master in same plugin as Cell's Master)
     - Not set as 'Persistent' (exterior references only)
   - Check VCI1 date like LAND record above
   - Override in same plugin as Cell's override OR
   - Override is Interior reference in ESM flagged plugin

8. **Cascade:** If resulting 'NoPrecomb' state is set, then 'NoPrevis' state also Set

### Global Disabling

- All Precombines in entire game disabled via `bUseCombinedObjects=0` ini setting
- Disables most Previs optimization

### Console Commands

- `tpc` - toggle Previs off and on (if disabled by game, cannot turn on)
- `tb` - toggle borders (Yellow borders visible if Previs disabled; appears even if enabled when flying)

---

## How Game Renders References in a Cell (In-Game)

### When Precombines Enabled

- **NO references** in Cell's resulting XPRI or XCRI lists are rendered
- All remaining objects (except LANDscape) rendered normally
- All Collision enabled; collision of Precombined objects from precombine meshes/physics files, not references
- Current state of precombined objects (REFR) ignored (even if deleted/moved); rendered from precombine meshes

### When Previs Also Enabled

- System dynamically renders parts of precombined meshes NOT occluded
- Dynamically renders XPRI references if NOT occluded
- Dynamically renders LANDscape parts NOT occluded

### When Previs Disabled (but Precombines Enabled)

- All LANDscape and Precombine meshes/XPRI objects fully rendered

---

## Altered Precombined Object References

### Reference Changes via Override

**Nothing.** Precombined references ALWAYS rendered in original location (snapshot in precombine mesh).

**However,** reference ALSO rendered in new location (duplicated) if winning override:
- Has NOT deleted/disabled it AND
- Changes coordinates moving it to different cell OR
- Moves it to cell in different Worldspace OR
- Changes from interior to exterior (or Vice-Versa)

**Important Notes:**
- Persistence changes ignored; above still applies
- Changing Persistent REFR to Temporary NOT supported by game (will probably stay persistent)
- VCI1 no longer checked during game startup if move to different Cell (including Persistent Cell)

---

## XPRI References, Invisibility, and Other Issues

### XPRI Function

References in Cell's XPRI are:
- Non-precombineable, non-moveable, non-scrapable objects
- Have occlusion information in .uvd file
- Only rendered if NOT 100% occluded by another object
- Reduces cell rendering load and improves FPS

**Used Base Object Types:** STAT, SCOL, FURN, CONT, MSTT, ACTI, TACT, FLOR, HAZD, PROJ, TERM

**Reference Status:**
- Both Persistent and Temporary references can be in XPRI
- Regardless of interior or exterior cell
- Deleted or Initially Disabled references NOT included by CK

### Visibility and Occlusion

- XPRI references only rendered if .uvd says NOT occluded
- Adding objects to XPRI that .uvd knows nothing about causes NEVER rendered (invisible)
- Invisible objects can still be interacted with (sat on, Activated, collided with)

### Game and CK XPRI Bugs

#### Bug 1: Blank XPRI Field Ignored

**Issue:** CELL override with blank (empty) XPRI field is IGNORED
- Cell's current XPRI from previous override used
- If empty XPRI meant 'no XPRI references', previous override's non-empty XPRI used
- XPRI entries won't be in winning .uvd and thus be invisible

#### Bug 2: XPRI Local FormID Mapping

**Issue:** Game bug where XPRI (and RVIS) local formIDs NOT mapped to Load Order ID
- If internal 'local' FormID of XPRI reference differs from Load Order ID, basically ignored
- Treated as object not in that cell (may not be valid)
- All CELL overrides with XPRI need same Masters list (same order) as Load order for XPRI references

**Practical Impact (TLDR):**
- Easy to manage with Base Game and DLCs (include all)
- Almost impossible with Mod-supplied new Cells/references
- **In practice: XPRI only benefits Base Game/DLC references, NOT user-added content**

---

## Static Object Meshes That Crash the CK

If any of following found in Static's mesh (.nif), CK will crash trying to precombine it:

- **Any *Trishape node with Full Precision Vertexes** (VertexDesc flag "Full Precision")
- **Any *Trishape node without "Shader Property" linked to valid BSEffectShaderProperty node** (or is corrupt)

---

## Previsbine Visual Faults (Detailed)

### Overview

Different Plugins can "win" different parts of Cell's Precombine (CELL information, files, etc) - mismatches occur.

### Precombine Faults

**Fault 1: Reference Change Without Mesh Change**
- Plugin "changes" (deleted/moved/disabled) a Precombined Reference
- No corresponding change to Precombine Mesh
- Change ignored in-game

**Fault 2: Reference in XCRI But Not in Winning Precombine Mesh**
- Cell Reference in XCRI not in Winning Precombine Mesh
- Object not seen in-game (invisible)

**Fault 3: Invisible But Interactive Objects (Previs Issue)**
- Object listed in XPRI but Previs (.uvd) mismatched (built without object)
- Object invisible but still interactive
- Can occur if winning CELL override's XPRI is empty (blank XPRI ignored; game uses last non-blank XPRI override)

**Core Rule:** Winning XCRI must match winning Precombine meshes and their composed Precombined References
- Blank XCRI fields ignored; 'winning' XCRI from last override with actual XCRI field

**Fault 4: Collision Issues (Rare)**
- Misplaced Collision; some precombined objects have collision in separate "Physics" file (per cell)
- Improper override/replacement causes weird collision issues

**Fault 5: Duplicated Objects**
- Override moves precombined object to different Cell (changes X,Y coordinates)
- Still rendered in original location (precombines & XCRI)
- Also rendered in new Cell (normal)
- Results in duplication

**Fault 6: Texture Smearing**
- Sky-high black or colored walls
- Caused by malformed mesh on precombineable Static Object
- When included in precombine mesh by CK, causes 'wall/smear' effect
- Solution: Fix mesh (run through 'Elric') or exclude from precombines before building
- FO4FindPCStatics.pas script finds Bad meshes for exclusion

### Previs (Occlusion) Faults

Previs generated from 9 Cells (Cluster) worth of Precombine Meshes = 9x more mismatch opportunities (Previs faults very common)

**Previs Faults Display as:** Flickering (parts of structures disappear/reappear as you move)
- Previs (Occlusion) information points to wrong Precombined Objects
- Hides/Shows wrong things

**Common Situation:**
- Plugin changes Precombines in one Cell of Cluster
- Previs File built without knowledge of change
- Now Previs faults (flickering) in that cell

**Adjacent Cluster Effect:**
- Plugin supplies updated Previs file (fix one Cell)
- Other 8 Cells could have Previs faults

**Less Annoying Category:**
- Objects apparently occluded by "nothing" from certain angles
- Happens if Landscape for Cell changed (say removing hill) but Previs not rebuilt
- Previs still encodes old landscaped hill - would hide objects
- Worse: Objects in XPRI not known to Previs system invisible; original objects 'hidden' behind

**Another Common Issue: Previs Build Failure**
- CK times-out while building Previs (gets into loop)
- Common with too many objects in same location
- Very common with 'object sink' locations near 0,0 Cell (deleted objects placed here)
- Example: Cell 0,-1 had 286 objects at 1128.798340,-1837.827637,-938.216370 (failed Previs generation)

---

## Which Cell References are Precombineable

### Base Requirements

Only Cell references with base type **Static (STAT)** or **Static Collection (SCOL)** can be precombined, but excluded if REFR:

- Is Disabled or Deleted
- Has any of: XLRT, XESP, XATR, or XEMI fields
- Has Linked References (XKLR) with keyword other than MultirefLOD
- Linked to by another linked ref (on another object's linked reference)

### Base Object Exclusions

Reference also excluded if its base type has:

- **Workshop recipe** (only for Cells in Settlement)
- **"Forced Location Type" (FTYP)** set with ANY value (useful exclusion method)
- **Mesh (MODL) with certain configurations** (visible in NifScope):
  - BSXFlags with "Animated", "External Emit", or "Havok"
  - Nodes with Block types: NiBillboardNode, NiSwitchNode, or NiParticleSystem

### Special Case

- **All Persistent Exterior Refs** (in "Worldspace Persistent Cell") will be precombined into Cell if coordinates place them in it

---

## Using CreationKit to Generate Previsbines

### Overview

Only 2 ways to generate Precombines and Previs:
1. Creation Kit GUI
2. Creation Kit command line

**These are 2 separate operations either way**

### GUI vs Command Line

- **GUI:** Can only create "Filtered" Precombines
- **Command Line:** Can create "Clean" or "Filtered" Precombines
- Same options exist for Previs (mostly meaningless; Previs files basically "Filtered" only)

### Clean vs Filtered

**"Clean" Precombines:**
- De-duped; common object meshes in separate "Plugin - Geometry.csg" file
- Reduces overall Cell Precombines size
- Only possible via Command Line options
- **XBOX does NOT support** (Bethesda.net won't allow .csg/.cdx upload)

**"Filtered" Precombines:**
- Not de-duped
- Generally 5-10x bigger than Clean
- Generated via GUI or Command Line

### CK Precombine Generation Bugs

**Bug 1: Material Swaps on Base Object Ignored**
- Material Swaps only on Base Object of Precombineable reference are ignored
- References revert to default (Mesh-specified) textures
- Solution: Scripts add Base material swaps to Precombineable references (Seed Builder does automatically)

**Bug 2: Alpha Channel (XALP) Ignored**
- Precombineable references' XALP ignored
- Example: Paintings using alpha for 'moth eaten' look become 'pristine'
- Solution: Exclude from precombining (Seed Builder does automatically)

**Bug 3: Faulty Static Meshes Crash**
- Static Meshes from SCOLs or "kitbashed" objects can crash Precombine Process
- Need collision rebuilt and changed from 'high precision'

### CK Command Line Notes

- Cannot have spaces in mod name (CK doesn't support spaces in .cdx filename) for Clean method
- **Won't build precombines for Exterior CELLS outside Border Region(s)**
  - If Border Region covers only half of Worldspace, can't build precombines for Cells outside region

### CK Previs Generation Issues

**Building Requirements:**
- CK must see all Precombine meshes (.nif) of all 9 Cells in Cluster
- Meshes can be in BA2 archives (speeds up) or loose files
- Previs operation does NOT use textures; remove for reduced CK memory usage
- **Previs operation requires A LOT of memory** (may be critical)

**Hanging Issues:**
- Some unknown conditions cause CK to hang when building some clusters
- Eventually timeout with error in log

**Critical Issue: CK Handle Array Limit**
- **IMPORTANT:** Unpatched CK has limit on unique references loaded (2,097,152)
- Base game + DLC = 86% of limit; adding new content easily exceeds
- **Recommended solution:** Set "BSPointerHandleExtremly=true" (in CKPE) vastly increases limit

**General Notes:**
- CK is delicate; DO NOT do anything else while running previsbine tasks
- Running out of memory (browser windows, etc.) sure way to corrupt Previs
- Original Bethesda CK extensively tested for previsbines
- New Steam version can be used; must ensure it determines steam 'appid' or will fail
  - File `steam_appid.txt` in same CK directory containing single line: `1946160`
  - If running via MO2, specify appid in external CK settings

### Recommended CreationKit Environment

- Original Bethesda version of CK extensively tested
- **Steam version:** Requires `steam_appid.txt` with `1946160`
- **Recommended:** Use Creation Kit Platform Extended (CKPE)
  - Fixes great number of Precombine/Previs issues ("Must Have")
  - Edit `CreationKitPlatformExtended.ini` and set `bBSPointerHandleExtremly=true`
  - Optional file download provided with config
  - **NOTE:** As of Oct 2025, CKPE V0.4/0.5 does NOT work with OG CK version
    - CKPE V0.3 does, but can't handle V7/8 BA2 Archives (must downgrade and set `bOwnArchiveLoader=false`)

---

## Generating Previsbines Manually via CreationKit GUI

### Process

Best to do in Clusters to reduce build time:

1. **Group Cells** into Clusters they're part of
2. **For each Cluster:**
   - Find Cell in "Cell View" list
   - Select 'view' and wait for render
   - Select "Precombine Geometry for Current Cell" from "World" Menu
   - Wait for Cell Preview window to become active
   - Repeat with next Cell in Cluster
   - **Regularly save** (CK prone to crashing)

3. **After all Cells in Cluster done:**
   - Select "Generate Precombined Visibility for Current Cell" from "Visibility" menu
   - **Will take a long time**
   - Finishes with confirmation box
   - Save again

4. **Repeat for next Cluster until done**

### Known Issue

Due to current bug: Archives of currently "active" Plugin NOT used by CK
- Need to extract them as loose files

---

## Generating Previsbines via CreationKit Command Line

### Overview

CreationKit.exe has 2 options:
- `-GeneratePrecombined`
- `-GeneratePreVisData`

**This process has many more steps** involving merging results back into Previsbines Plugin

### Process Documentation

Not detailed here (author and others created procedures); check separate article

For manual/old scripts:
- **Know how Command Line determines Cells to build:**
  - Plugin (seed mod) must contain Cell record (override or Master) for EVERY Cell you want Precombines for
  - Cells must each contain AT LEAST one Cell reference (doesn't need precombineable)
  - Triggers CK to build Precombines for it
  - Cluster AND any adjacent Clusters also get Previs built (-GeneratePrevisData)
  - Corner Cell potentially causes 4 Clusters to have Previs generated; middle cell only generates own Cluster

### Command Line Results

**Note1: -GeneratePrecombined**
- Creates mod "CombinedObjects.esp" containing ONLY Cells with new Precombines
- Only PCMB, XCRI, and Cell VCI1 are valid; rest is rubbish

**Note2: -GeneratePrevisData**
- REQUIRES cells to have new PCMB and XCRI values BEFORE running
- Creates "Previs.esp" for every Cluster with Previs
- Only VISI, RVIS, and XPRI fields important

**Note3: Previs Memory**
- Takes A LOT of memory
- Running out causes corrupted Visibility or crash
- Reduce risk by removing `<mod> - Textures.ba2` files temporarily
- Previs doesn't require textures; CK loads them and wastes memory

---

## Common CreationKit Failures

### Access violation 0xc000005 (or similar) During Precombine Building

**Cause:** Corrupt/incompatible Mesh on Precombineable Reference (REFR base type STAT or SCOL)

**Common Sources:**
- New mesh/object from Mod
- Using SCOL mesh as STAT
- Mesh with 'high precision' set (SCOL meshes; always cause crash)
- Rare: Bad Texture on Precombineable object (texture replacer Mod)

### Error -1073740771 (STATUS_FATAL_USER_CALLBACK_EXCEPTION or 0xC000041D) End of CK Phase

- If CK saved successfully beforehand, probably can ignore

### Hundreds of "DEFAULT: OUT OF HANDLE ARRAY ENTRIES" Errors During Precombine Building

**Cause:** Total of more than 2 million (2,097,152) Cell references
- Base game + DLC = 1.8 million; easy to exceed with new content Plugins

**Solution:** Use CKPE and set `bBSPointerHandleExtremly=true`

### "ERROR: visibility task did not complete." During Previs Building

**Meaning:** Cluster Previs file couldn't be built (CK hung)
- Doesn't crash CK or stop other Clusters' Previs
- That Cluster has no Previs file (as if set to 'no Previs')

**Cause:** Some NON-PRECOMBINED, enabled reference(s) in 9 Cells has Occlusion build problem
- Common: Too many objects in exact same location (usually underground - unused reference dump)
- **Solution:** Visually examine every Cell in Cluster using CK; find and disable unwanted Refs

### Running Out of Memory During Previs Building

**Issue:** Previs at least 2x longer than Precombine phase; huge memory consumption (48GB not unknown)

**Solutions:**
- Have as little as possible running
- Possibly disable Antivirus
- Remove Texture archives before building Previs
- Stops CK loading them and wasting memory

### Too Many Masters

**Issue:** CK includes ALL loaded Masters into Precombine/Previs Plugin's Masters list
- Example: Your Mod has Fallout4.esm and UFO4P; UFO4P has NukaWorld.esm etc as Masters
- Result: All become Masters of updated Plugin
- **FO4 Masters limit: 255**
- CK CANNOT build if resulting Plugin has more than 255

---

## Possible Faults in Generated Previsbines

### Flickering Despite Correct Build

If 100% sure:
- No errors during build
- Left computer alone
- Followed all guides

May still not be your fault

**Solution:** Some objects just don't work well with preculling (thin objects, see-through railings)
- Give Precombineable References Location Ref Type (XLRT) of BlockPreVis (exclude from Previs)
- Rebuild that Previs file
- OR exclude Base object from all Previs by setting Base Object's "non-occluder" Flag

### Large Objects Straddling Two Cluster Boundaries

**Severe Flickering Cause:**
- Large precombineable objects span two adjacent clusters (buildings in Town)
- Object in precombines of Cell in one cluster (A); precombine mesh extends into neighboring Cell in different cluster (B)
- Cluster B's Previs includes information from Cluster A's precombines
- Rebuilding Cluster A's precombines makes Cluster B's Previs mismatch; classic Previs faults result

**Example:** Cliff Edge Hotel (example shown in original guide)

**When This Occurs:**
- Rebuild Precombines for whole Cluster
- Adjacent cluster from different Mod (say PRP)
- Building, road section, etc. with parts from adjacent cluster in rebuilt cluster

**Solution:** Rebuild Previs for cell while other cluster/mod also loaded
- If say PRP: Make PRP-specific version of Previsbines
- If only one reference overlaps (road chunk): Exclude from precombines entirely
  - Only works if reference declared outside cluster
  - If in your Cluster extending into another: Rebuild that Cluster and include in mod

### Transparent Windows

**Issue:** As you walk past, some may not accurately render view (or render no view)
- Also happens when windows close together

**Solution:** Exclude problem window from Previs via BlockPrevis method (or other Previs removal method)

### Smeared Textures (Sky-High Black or Colored Walls)

**Cause:** Faulty Reference (Static Mesh) included in Precombines
- Breaks resulting Precombined mesh; causes smear error
- High Precision meshes always do this
- Common if using SCOL mesh as STAT ('High Precision' causing issue)

**Solution:** Find and remove reference from precombines; rebuild precombines

---

## Renaming a Plugin with Precombines/Previs

### Overview

Possible but requires extra work; NOT recommended if precombines generated 'Clean'

### Clean Precombines Issue

- 'Clean' precombine meshes contain "BSPackedCombinedSharedGeomExtraData" nodes
- Contain "hash" of filename of shared Geometry (.csg) file used
- Cannot rename `<plugin> - geometry.csg` when renaming `<plugin>.esp`
- Still need `<plugin>.esp` in load order (game loads csg file) making renaming pointless

- Unclear what renaming `<plugin>.cdx` does
- Any attempt pointless/causes issues due to above

### Filtered Precombines Renaming

**CAN rename plugin if using "Filtered" precombines (no shared Geometry)**

**HOWEVER:** If plugin 'mastered' any cells (new interior Cells or exterior Worldspaces):
- Must rename subdirectory all Precombined meshes (.nif) stored under
- Must rename subdirectory all Previs (.uvd) files stored under
- Whether loose or in ba2 archives
- Game looks for paths: `Meshes/Precombined/<MasterModname>/` and `vis/<MasterModname/`
- If renamed MasterModname plugin, MUST rename these subdirectories too

**Path Storage Note:**
- These paths NOT stored in Plugin; determined at runtime
- xEdit displays paths for convenience (XCRI "Combined Mesh" field)
- Actually stored: Only 'Hex ID' in mesh filename `<CellFormID>_<HexID>_OC.nif`

**Previs Filenames:**
- `<PrevisCellFormID>.uvd` where <PrevisCellID> is Interior Cell ID or Exterior Cell ID of Cluster Center
- (Strangely) Game does NOT use RVIS field as <PrevisCellID>; works it out at runtime (RVIS ignored)

---

## Advanced: Partial Form (flag14) on CELLs

### Context

To add any Object into Cell, need:
- Cell Reference creation
- Associated CELL record override in Plugin

Plugin could have winning Cell override in Load Order - then would override Cell's PCMB etc and possibly cause Previsbine mismatches/visual faults

### Partial Form Flag Solution

Adding "Partial Form" flag to Cell override tells game to ignore that override - prevents Previsbine issues

### Important Caveat

**NOT good idea unless 100% certain** the Cell's override before yours was from "esp" type plugin (such as PRP.esp)

**Why:** Using "Partial Form" has problems if:
- Plugin has the only override for Cell
- Cell was created in "esm" type plugin (like fallout4.esm)

### Recommendation

**NOT recommended using "Partial Form" on cells** unless making Patch requiring PRP.esp

- Some odd effects with persistence allow Partial Form to work otherwise
- Would not rely on it

---

## Acknowledgements

- PJM: Author of Previs/Precombines guidance and tooling.
- ElminsterAU and the xEdit team: FO4Edit/xEdit platform and scripting.
- CKPE maintainers: Creation Kit Platform Extended improvements for stability and scale.
- Bethesda Game Studios: Fallout 4 and the Creation Kit.

