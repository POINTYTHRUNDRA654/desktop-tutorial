import{r as m,j as e,N as n,Z as a}from"./index-CEqdjNqX.js";import{C as b}from"./chevron-down-HPljEmI-.js";import{T as r}from"./triangle-alert-zWUHrt1_.js";import{C as l}from"./circle-check-big-Cwj_A10u.js";const f=()=>{const[i,c]=m.useState("overview"),d=[{id:"overview",title:"What Are Precombines?",icon:e.jsx(n,{className:"w-5 h-5"}),content:`Precombines are pre-optimized mesh combinations created by Bethesda for Fallout 4. They combine multiple static objects into single large meshes for performance.

**Why They Matter:**
- Performance boost: Fewer draw calls, better FPS
- Already optimized: Bethesda's team pre-combined them
- Work across entire worldspace

**The Problem:**
When you add/move/delete objects in a worldspace, you BREAK precombines:
- Missing meshes appear (invisible objects)
- Z-fighting and clipping glitches
- Performance drops in affected areas
- Players report visual bugs

**Example:**
- Vanilla precombine includes: Trees 1-10, rocks 5-8, shrubs 3-6
- You move Tree 2 → Precombine broken
- Tree 2 no longer renders (invisible)
- All other objects in precombine fail too

**The Solution:**
Rebuild precombines using Precombine & Previsibines (PRP) tool`,subsections:["What precombines do","Why they break","How to detect breaks","Rebuilding workflow"]},{id:"prp-intro",title:"Precombine & Previsibines (PRP) Tool",icon:e.jsx(a,{className:"w-5 h-5"}),content:`**What is PRP?**
A community tool (Niftools) that helps modders:
1. Detect broken precombines
2. Rebuild precombines correctly
3. Maintain compatibility with PRP-generated precombines
4. Work alongside other precombine mods

**Where to Get It:**
- Download: Nexus Mods (search "Precombine & Previsibines")
- Part of Niftools suite
- Free, open-source

**What It Does:**
1. Reads your modified ESM/ESP
2. Detects which precombines you've broken
3. Rebuilds affected precombines
4. Outputs new precombine data
5. Handles PRP conflict resolution

**Key Feature: PRP-Patching**
- If another mod also modified precombines
- PRP can merge both modifications
- No need to choose one mod over the other
- Both sets of changes work together

**When to Use:**
- After modifying any worldspace objects
- Before releasing any landscape/exterior mods
- If your mod places objects in vanilla areas
- If you move/delete vanilla objects`,subsections:["PRP installation","PRP configuration","Running PRP","Output verification"]},{id:"when-break",title:"When Do Precombines Break?",icon:e.jsx(r,{className:"w-5 h-5"}),content:`**You Break Precombines If You:**

✗ Add objects to existing cells
Example: Place a settlement building in Commonwealth

✗ Move existing objects
Example: Reposition trees in Diamond City exterior

✗ Delete objects
Example: Remove rocks blocking a path

✗ Edit object properties
Example: Change scale, rotation, or rendering flags of vanilla objects

✗ Add water or terrain changes
Example: Modify land heights or water levels

✗ Change object visibility
Example: Disable a tree using Hide From Local Map

**You DON'T Break Precombines If:**

✓ Create new cells (interior cells)
✓ Modify interior cells only (Vault 111, etc.)
✓ Only add new objects to new worldspaces
✓ Only modify static meshes/textures (not placement)
✓ Use non-placement edits (dialog, quests, AI)

**Key Rule:**
If you modify ANY object placement in an existing exterior cell → you break precombines

**Solution For Each Case:**
- Settlement mod + precombines → rebuild with PRP
- Landscape mod + precombines → rebuild with PRP
- Object repositioning → rebuild with PRP
- New interior cell → no rebuild needed
- Texture override → no rebuild needed`,subsections:["Object additions","Object modifications","Terrain changes","Interior vs exterior"]},{id:"detecting-breaks",title:"Detecting Broken Precombines",icon:e.jsx(l,{className:"w-5 h-5"}),content:`**In-Game Symptoms:**

🚨 Visual glitches:
- Objects appear/disappear based on angle
- Floating objects (detached from precombine)
- Z-fighting (flickering overlapping meshes)
- Objects look "cut off" or partially rendered
- Invisible barriers where objects should be

🚨 Performance issues:
- FPS drops in specific areas
- Stuttering in precombine regions
- Memory spikes when precombine loads

🚨 Collision problems:
- Can't walk through expected paths
- Invisible walls where no objects are
- Physics breaking (objects fall through terrain)

**How to Test:**

1. Load your mod in-game
2. Visit cells you modified
3. Rotate camera around objects
4. Look for missing meshes or glitches
5. Check Creation Kit: View > Precombine > Show
6. Missing meshes = broken precombines

**Creation Kit Check:**

1. Open Creation Kit
2. Load your ESP
3. View > Precombines > Show Precombine Bounds (purple boxes)
4. Look for objects OUTSIDE bounds
5. Objects outside bounds will disappear
6. Fix: Rebuild precombines with PRP

**Automated Check With PRP:**

1. Run PRP tool with your ESP
2. PRP identifies all broken precombines
3. Generates report of affected cells
4. Shows which objects caused breaks
5. Rebuilds automatically`,subsections:["Visual glitches to watch for","In-game testing","Creation Kit inspection","PRP automated detection"]},{id:"rebuild-workflow",title:"Step-by-Step: Rebuild Precombines With PRP",icon:e.jsx(a,{className:"w-5 h-5"}),content:`**Prerequisites:**
✓ PRP tool installed
✓ Your ESP file created and saved
✓ Fallout 4 Data directory accessible
✓ NifSkope installed (for verification)

**Step 1: Prepare Your ESP**
1. Open Creation Kit
2. Load your ESP
3. Verify your object changes (add/move/delete)
4. Save your ESP
5. Close Creation Kit

**Step 2: Run PRP Analysis**
1. Open PRP tool
2. Select your ESP file
3. Run "Analyze Precombines"
4. PRP scans which precombines you broke
5. Generates report (shows affected cells)

**Step 3: Configure PRP**
1. In PRP settings:
   - ESM/ESP: Your file
   - Output folder: Create precombines folder
   - Worldspace: Commonwealth (or your target)
   - Handle PRP conflicts: YES (if other mods modified precombines)
2. Save settings

**Step 4: Build Precombines**
1. Click "Build Precombines"
2. PRP generates new precombine meshes
3. Creates .nif files for affected cells
4. Output goes to precombines folder
5. Takes 5-30 minutes (depends on size)

**Step 5: Add to Your Mod**
1. PRP creates DataMeshesPrecombined files
2. Copy these files to your mod folder
3. Update your ESP to reference new precombines
4. Your mod now includes precombine fixes

**Step 6: Test In-Game**
1. Load your ESP in-game
2. Visit cells you modified
3. Rotate camera, look for glitches
4. Check performance (FPS stable?)
5. No visible mesh breaks = success!

**Step 7: Release**
1. Include precombines folder in your mod
2. Document: "Rebuilt precombines with PRP"
3. Note compatible with other PRP mods
4. Users won't experience visual glitches`,subsections:["ESP preparation","PRP analysis","PRP configuration","Building precombines","Verification"]},{id:"prp-conflicts",title:"Handling PRP Conflicts (Multiple Precombine Mods)",icon:e.jsx(r,{className:"w-5 h-5"}),content:`**The Problem:**
Multiple mods modify precombines in same worldspace
- Mod A adds trees to Commonwealth
- Mod B adds settlement in Commonwealth
- Both modify precombines
- Without PRP: Only one mod's precombines load
- Result: One mod breaks OR objects disappear

**The Solution: PRP Patching**
PRP can MERGE multiple precombine modifications:
1. Detect which precombines need merging
2. Combine both sets of changes
3. Output single precombine that satisfies both
4. No conflicts, both mods work together

**How PRP Handles It:**

Load Order:
1. Mod A (Commonwealth trees) - precombines 1, 5, 8
2. Mod B (Settlement) - precombines 2, 5, 9

Precombine 5 is in BOTH mods.

**Without PRP:**
- Last mod wins (Mod B precombines 5 load)
- Mod A's trees disappear
- Conflict

**With PRP:**
1. Run PRP with both ESPs loaded
2. PRP detects precombine 5 overlap
3. Merges both tree placements + settlement objects
4. Outputs combined precombine 5
5. Both mods' objects appear correctly

**Workflow for PRP Patching:**

1. Identify conflicting mods
2. Load ALL affected ESPs in Creation Kit
3. Run PRP with all files
4. Enable "Resolve Precombine Conflicts"
5. PRP generates merged precombines
6. Create patch ESP (or update main)
7. Include merged precombines in your mod

**Important:**
- PRP only handles object placement conflicts
- Other ESP conflicts still need manual patches
- PRP precombines work with other mods using PRP
- Document your PRP patches in readme`,subsections:["Multiple mod conflicts","PRP merging strategy","Conflict detection","Merged output"]},{id:"best-practices",title:"Precombine Best Practices",icon:e.jsx(l,{className:"w-5 h-5"}),content:`**Before You Start Modding:**

1. Plan your object changes
   - List which cells you'll modify
   - Estimate precombine impact
   - Plan PRP rebuild time

2. Minimize object changes
   - Only add what's necessary
   - Avoid unnecessary repositioning
   - Group changes to same cells (more efficient rebuild)

3. Know your precombines
   - Open Creation Kit: View > Precombines > Show
   - See which objects are pre-combined
   - Plan around existing precombine boundaries

**While Modding:**

1. Save frequently
   - Backup before major changes
   - Save ESP every 30 minutes
   - Keep version history

2. Test as you go
   - Don't wait until end to test
   - Load in-game every 10 object changes
   - Catch visual glitches early

3. Document changes
   - Note which cells modified
   - List objects added/moved/deleted
   - Track precombine impact

**Before Release:**

1. Run PRP rebuild
   - Analyze precombine breaks
   - Rebuild with PRP tool
   - Verify output files created

2. Test in-game thoroughly
   - Visit all modified cells
   - Check from multiple angles
   - Verify performance
   - Test with other mods loaded

3. Include precombines in package
   - MeshesPrecombined folder
   - Document in README
   - Note PRP version used

**Documentation:**

Include in your README:
✓ "Rebuilt precombines with PRP v[version]"
✓ "Compatible with other PRP-rebuilt mods"
✓ "Do not load with non-PRP precombine patches"
✓ Load order position (usually after landscape mods)

**Common Mistakes:**

❌ Releasing without rebuilding precombines
❌ Moving objects and ignoring visual glitches
❌ Not testing in-game thoroughly
❌ Mixing precombines from different versions
❌ Releasing with old/corrupted precombine files
❌ Not documenting PRP usage
❌ Assuming precombines auto-rebuild`,subsections:["Planning","During development","Testing","Release checklist","Documentation"]},{id:"troubleshooting",title:"Troubleshooting Precombine Issues",icon:e.jsx(r,{className:"w-5 h-5"}),content:`**Problem: Objects invisible in-game but visible in CK**

Cause: Precombines broken, objects outside precombine bounds
Fix:
1. Run PRP rebuild
2. Verify objects are inside precombine bounds
3. If objects still invisible, reposition them BEFORE PRP
4. Rebuild and test again

**Problem: Z-fighting (flickering meshes) in game**

Cause: Overlapping precombine geometry, conflicting meshes
Fix:
1. Check Creation Kit: View > Precombines
2. Look for overlapping boxes (different colors = conflict)
3. Move conflicting objects apart
4. Rebuild precombines with PRP
5. Test without overlaps

**Problem: FPS drops in specific areas**

Cause: Precombines not rebuilding correctly, fallback to non-optimized rendering
Fix:
1. Verify precombine files in MeshesPrecombined2. Check PRP log for errors
3. Rerun PRP build
4. If persists: Move objects to different cells (less congestion)
5. Test performance after rebuild

**Problem: PRP tool crashes or hangs**

Cause: Large precombine rebuild, corrupted ESP, missing files
Fix:
1. Close all other programs (free RAM)
2. Verify ESP has no errors (Creation Kit check)
3. Reduce scope: Run PRP on single worldspace at a time
4. Check PRP log for specific errors
5. Reinstall PRP if corruption suspected
6. Try older/newer PRP version

**Problem: Precombines conflict with other mod**

Cause: Two mods modified same precombines, only one loads
Fix:
1. Identify conflicting mods
2. Use PRP to merge precombines (see PRP Conflicts section)
3. Create patch ESP loading after both mods
4. Include merged precombines in patch
5. Document compatibility in README

**Problem: "Precombine data not found" error in CK**

Cause: PRP output files not in correct location
Fix:
1. Verify PRP created MeshesPrecombined folder
2. Check file paths are correct (case-sensitive on some systems)
3. Copy files to DataMeshesPrecombined4. Reload ESP in Creation Kit
5. Error should resolve

**Problem: My interior cells look broken too**

Cause: Interior cells don't use precombines
Fix:
1. Interior cells are independent, no precombines
2. If objects look wrong: check lighting, collision, placement
3. Not a precombine issue - likely object placement problem
4. Visual glitches in interiors: check mesh files, NIF corruption

**Testing Checklist:**

After PRP rebuild:
✓ Objects visible from all angles
✓ No floating or detached geometry
✓ No Z-fighting (flickering)
✓ Performance stable (60 FPS target)
✓ No invisible barriers
✓ Load times normal
✓ No Creation Kit errors
✓ Tested with other mods loaded`,subsections:["Invisible objects","Visual glitches","Performance issues","Tool errors","Mod conflicts","Testing checklist"]}];return e.jsxs("div",{className:"h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col",children:[e.jsx("div",{className:"p-6 border-b border-slate-700 bg-slate-800/50",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(n,{className:"w-8 h-8 text-purple-400"}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-white",children:"Precombine & PRP Guide"}),e.jsx("p",{className:"text-sm text-slate-400",children:"How to rebuild precombines for Fallout 4 mods"})]})]})}),e.jsx("div",{className:"flex-1 overflow-y-auto p-6",children:e.jsx("div",{className:"max-w-4xl mx-auto space-y-3",children:d.map(o=>e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-purple-500/50 transition-colors",children:[e.jsxs("button",{onClick:()=>c(i===o.id?"":o.id),className:"w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left",children:[e.jsx("div",{className:"text-purple-400 flex-shrink-0",children:o.icon}),e.jsx("div",{className:"flex-1",children:e.jsx("h2",{className:"font-bold text-white text-lg",children:o.title})}),e.jsx(b,{className:`w-5 h-5 text-slate-500 transition-transform ${i===o.id?"rotate-180":""}`})]}),i===o.id&&e.jsxs("div",{className:"px-6 py-4 bg-slate-950/50 border-t border-slate-700",children:[e.jsx("div",{className:"text-sm text-slate-300 whitespace-pre-wrap mb-4 space-y-3",children:o.content.split(`

`).map((s,t)=>e.jsx("p",{children:s},t))}),o.subsections&&o.subsections.length>0&&e.jsxs("div",{className:"mt-4 pt-4 border-t border-slate-700",children:[e.jsx("h4",{className:"font-semibold text-purple-400 mb-3",children:"Topics Covered"}),e.jsx("ul",{className:"space-y-1",children:o.subsections.map((s,t)=>e.jsxs("li",{className:"text-xs text-slate-400 flex items-center gap-2",children:[e.jsx("span",{className:"text-purple-400",children:"•"}),s]},t))})]})]})]},o.id))})}),e.jsx("div",{className:"p-4 bg-purple-900/20 border-t border-slate-700",children:e.jsx("p",{className:"text-xs text-purple-300",children:"💡 Pro Tip: Always rebuild precombines BEFORE releasing your mod. It's the difference between happy players and bug reports."})})]})};export{f as PrecombineAndPRPGuide};
