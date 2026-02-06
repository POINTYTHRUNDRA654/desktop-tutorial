import React, { useRef, useState } from 'react';
import { BookOpen, ChevronDown, AlertTriangle, Zap, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWheelScrollProxy } from './components/useWheelScrollProxy';
import { openExternal } from './utils/openExternal';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string;
  subsections?: string[];
}

export const PrecombineAndPRPGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string>('overview');
  const navigate = useNavigate();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelProxy = useWheelScrollProxy(contentScrollRef);

  const openAndScrollTo = (id: string) => {
    setExpandedSection(id);
    requestAnimationFrame(() => {
      sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openUrl = (url: string) => {
    void openExternal(url);
  };

  const openNexusSearch = (keywords: string) => {
    const query = encodeURIComponent(keywords);
    openUrl(`https://www.nexusmods.com/fallout4/search/?BH=0&search%5Bsearch_keywords%5D=${query}`);
  };

  const sections: GuideSection[] = [
    {
      id: 'overview',
      title: 'What Are Precombines?',
      icon: <BookOpen className="w-5 h-5" />,
      content: `Precombines are pre-optimized mesh combinations created by Bethesda for Fallout 4. They combine multiple static objects into single large meshes for performance.

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
Rebuild precombines using Precombine & Previsibines (PRP) tool`,
      subsections: [
        'What precombines do',
        'Why they break',
        'How to detect breaks',
        'Rebuilding workflow',
      ],
    },
    {
      id: 'prp-intro',
      title: 'Precombine & Previsibines (PRP) Tool',
      icon: <Zap className="w-5 h-5" />,
      content: `**What is PRP?**
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
- If you move/delete vanilla objects`,
      subsections: [
        'PRP installation',
        'PRP configuration',
        'Running PRP',
        'Output verification',
      ],
    },
    {
      id: 'when-break',
      title: 'When Do Precombines Break?',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: `**You Break Precombines If You:**

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
- Texture override → no rebuild needed`,
      subsections: [
        'Object additions',
        'Object modifications',
        'Terrain changes',
        'Interior vs exterior',
      ],
    },
    {
      id: 'do-i-need-rebuild',
      title: 'Do I Need To Rebuild Precombines For My Mod?',
      icon: <CheckCircle className="w-5 h-5" />,
      content: `This is the most important question — and the easiest place to accidentally ship a broken mod.

**Quick Decision (90% accurate):**

1) Did you edit an existing EXTERIOR cell in a vanilla worldspace (Commonwealth, Far Harbor, Nuka-World)?
→ If YES: assume you need a rebuild.

2) Did you add/move/delete any placed objects in that exterior cell?
→ If YES: you need a rebuild.

3) Did you only edit quest/dialogue/AI/scripts, or only replace textures/meshes (no placement changes)?
→ If YES: you do NOT need a rebuild.

**What “counts” as a placement change:**
- Adding a new object (even one)
- Moving/rotating/scaling a vanilla object
- Deleting/disabling an object
- Changing flags that affect rendering/visibility
- Landscape/water edits in that cell

**When people get fooled:**
- “It looks fine in CK” → in-game still breaks because precombines are a runtime optimization.
- “I only changed a few rocks” → that can break the entire precombine group in that cell.
- “It’s a settlement mod” → settlement placement in vanilla cells is one of the most common sources of precombine breakage.

**How to be sure (verification-first):**
1) Identify the exact exterior cells your mod touches.
2) In-game, visit those cells and rotate the camera around your edits.
3) If anything pops in/out, flickers, or disappears → you need a rebuild.
4) If you want a faster, more reliable answer: run PRP analysis against your plugin(s) and review the report of affected cells.

**If you’re not sure:**
Treat it as “YES, rebuild” for any exterior placement edits. The cost is build time; the benefit is avoiding invisible objects, broken previs, and performance hits for your users.`,
      subsections: [
        'Quick decision checklist',
        'What counts as placement',
        'Common false negatives',
        'Verification steps',
      ],
    },
    {
      id: 'detecting-breaks',
      title: 'Detecting Broken Precombines',
      icon: <CheckCircle className="w-5 h-5" />,
      content: `**In-Game Symptoms:**

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
5. Rebuilds automatically`,
      subsections: [
        'Visual glitches to watch for',
        'In-game testing',
        'Creation Kit inspection',
        'PRP automated detection',
      ],
    },
    {
      id: 'rebuild-workflow',
      title: 'Step-by-Step: Rebuild Precombines With PRP',
      icon: <Zap className="w-5 h-5" />,
      content: `**Prerequisites:**
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
4. Output goes to precombines\ folder
5. Takes 5-30 minutes (depends on size)

**Step 5: Add to Your Mod**
1. PRP creates Data\Meshes\Precombined files
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
1. Include precombines\ folder in your mod
2. Document: "Rebuilt precombines with PRP"
3. Note compatible with other PRP mods
4. Users won't experience visual glitches`,
      subsections: [
        'ESP preparation',
        'PRP analysis',
        'PRP configuration',
        'Building precombines',
        'Verification',
      ],
    },
    {
      id: 'prp-conflicts',
      title: 'Handling PRP Conflicts (Multiple Precombine Mods)',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: `**The Problem:**
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
- Document your PRP patches in readme`,
      subsections: [
        'Multiple mod conflicts',
        'PRP merging strategy',
        'Conflict detection',
        'Merged output',
      ],
    },
    {
      id: 'prp-patch-for-your-mod',
      title: 'How To Make a PRP Patch For Your Mod',
      icon: <Zap className="w-5 h-5" />,
      content: `A “PRP patch” is NOT just an ESP that changes records — it usually includes **merged precombine meshes** for the specific cells where two mods collide.

**When you need a PRP patch:**
- Your mod touches exterior cells with placement edits (so it breaks/changes precombines)
- AND you want compatibility with:
  - PRP (base rebuild)
  - Another precombine rebuild mod
  - A big worldspace/settlement/landscape mod that also rebuilds

**Key idea:**
Precombines are delivered as files (precombined NIFs). If two mods ship different precombined meshes for the same cell, **last one wins** unless you merge.

---

## Recommended Patch Workflow (Safe + Repeatable)

**Step 0: Decide how you’ll ship**
- Option A: Your mod ships its own rebuilt precombines (you are a “precombine mod”).
- Option B: You ship an OPTIONAL compatibility patch (recommended if you want to keep your main mod lightweight).

**Step 1: Define the patch target**
Pick a specific combo you are supporting, for example:
- Base PRP + Your Mod
- PRP + Your Mod + (Other Mod)

Write it down as the patch name. Example: “PRP + MySettlementOverhaul Patch”.

**Step 2: Align load order for the build**
Your patch needs to be built against the same load order you expect users to run.
Typical pattern:
1) PRP
2) Your mod
3) Other mod(s) (if applicable)
4) Your *patch* (last)

**Step 3: Build merged precombines with PRP**
Run PRP in conflict/merge mode with ALL involved plugins present.
Output should include:
- A set of merged precombine files for the affected cells
- A patch plugin (ESP/ESL) that loads after the mods and points to the merged output

**Step 4: Package the patch correctly**
Your patch mod should contain:
1) Patch plugin (ESP/ESL)
2) The merged files under the correct paths (usually under Meshes\\Precombined\\...)

**Step 5: Verify**
Test in-game with EXACTLY the supported combo:
1) Clean profile
2) Load PRP + your mod + other mod + patch
3) Visit each touched cell, rotate camera, confirm nothing disappears
4) Confirm performance didn’t tank in the affected area

**Step 6: Document it (this is part of the patch)**
In the patch description/README:
- Required mods + exact versions (if you can)
- Required load order (“place patch after both”)
- What it fixes (cells/areas)
- What it does NOT cover

---

## Common PRP Patch Mistakes

❌ Shipping only a plugin with no merged precombine files
→ Users still get “last mod wins” behavior.

❌ Building a patch against a different load order than the one you tell users
→ The patch “works on your machine” and fails for users.

❌ Trying to support too many combos at once
→ Start with the most popular conflict combo, then add more patches as separate downloads.

If you tell Mossy your mod type (settlement overhaul / landscape / world edits) and the other mod you want compatibility with, she can help you define the exact patch target and verification path.`,
      subsections: [
        'When a PRP patch is needed',
        'Build order and merge concept',
        'Packaging patch assets',
        'Verification checklist',
        'Common mistakes',
      ],
    },
    {
      id: 'best-practices',
      title: 'Precombine Best Practices',
      icon: <CheckCircle className="w-5 h-5" />,
      content: `**Before You Start Modding:**

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
   - Meshes\Precombined\ folder
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
❌ Assuming precombines auto-rebuild`,
      subsections: [
        'Planning',
        'During development',
        'Testing',
        'Release checklist',
        'Documentation',
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting Precombine Issues',
      icon: <AlertTriangle className="w-5 h-5" />,
      content: `**Problem: Objects invisible in-game but visible in CK**

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
1. Verify precombine files in Meshes\Precombined\
2. Check PRP log for errors
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
1. Verify PRP created Meshes\Precombined\ folder
2. Check file paths are correct (case-sensitive on some systems)
3. Copy files to Data\Meshes\Precombined\
4. Reload ESP in Creation Kit
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
✓ Tested with other mods loaded`,
      subsections: [
        'Invisible objects',
        'Visual glitches',
        'Performance issues',
        'Tool errors',
        'Mod conflicts',
        'Testing checklist',
      ],
    },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col min-h-0" onWheel={wheelProxy}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Precombine & PRP Guide</h1>
            <p className="text-sm text-slate-400">How to rebuild precombines for Fallout 4 mods</p>
          </div>
        </div>

        <div className="mt-5 max-h-72 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-slate-950/50 border border-slate-700 rounded-lg p-4">
              <div className="text-sm font-bold text-purple-300 mb-2">🧰 Tools / Install / Verify (No Guesswork)</div>
              <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                <li><strong>Fallout 4 + DLC</strong> installed (use your own game files).</li>
                <li><strong>Creation Kit</strong> (for checking cells/placements and saving plugins).</li>
                <li><strong>PRP tool</strong> (Precombine &amp; Previsibines) to analyze + rebuild + merge.</li>
                <li><strong>FO4Edit (xEdit)</strong> helps inspect conflicts/load order quickly.</li>
                <li><strong>NifSkope</strong> is handy for sanity-checking generated assets.</li>
                <li><strong>A mod manager</strong> (MO2/Vortex) for clean-profile testing.</li>
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => openUrl('https://store.steampowered.com/search/?term=Fallout%204%20Creation%20Kit')}
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                >
                  Steam: Creation Kit (search)
                </button>
                <button
                  onClick={() => openNexusSearch('Precombine & Previsibines PRP')}
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                >
                  Nexus: PRP (search)
                </button>
                <button
                  onClick={() => openNexusSearch('FO4Edit')}
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                >
                  Nexus: FO4Edit (search)
                </button>
                <button
                  onClick={() => openUrl('https://github.com/niftools/nifskope/releases')}
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                >
                  GitHub: NifSkope releases
                </button>
                <button
                  onClick={() => openNexusSearch('Bethesda Archive Extractor')}
                  className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
                >
                  Nexus: BAE (search)
                </button>
              </div>
            </div>

            <div className="bg-black/40 border border-slate-700 rounded-lg p-4">
              <div className="text-sm font-bold text-emerald-300 mb-2">📦 Existing Install / Workflow (Legacy Section)</div>
              <div className="text-xs text-slate-300 mb-3">
                If the legacy “install / setup” details feel pushed to the bottom, use these quick-open buttons to jump straight to the relevant section.
              </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openAndScrollTo('prp-intro')}
                className="px-3 py-2 rounded bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold text-white"
              >
                Open: PRP Tool section
              </button>
              <button
                onClick={() => openAndScrollTo('do-i-need-rebuild')}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                Open: Do I need a rebuild?
              </button>
              <button
                onClick={() => openAndScrollTo('detecting-breaks')}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                Open: Detecting breaks
              </button>
            </div>

            <div className="mt-3 border-t border-slate-700 pt-3">
              <div className="text-xs font-bold text-slate-200 mb-1">First test loop (10–15 minutes)</div>
              <ol className="text-xs text-slate-300 list-decimal list-inside space-y-1">
                <li>In a clean mod-manager profile, enable ONLY your plugin (and DLC requirements).</li>
                <li>Run PRP in <strong>Analyze</strong> mode against your plugin; note affected exterior cells.</li>
                <li>Run PRP <strong>Build/Rebuild</strong>; confirm output includes <strong>Meshes\\Precombined\\</strong> files.</li>
                <li>Install the output as a mod, load in-game, visit one touched cell, rotate camera 360°.</li>
                <li>If you’re supporting compatibility: build a <strong>merged</strong> PRP patch for one specific combo.</li>
              </ol>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/install-wizard')}
                className="px-3 py-2 rounded bg-purple-700 hover:bg-purple-600 text-xs font-bold text-white"
              >
                Install Wizard
              </button>
              <button
                onClick={() => navigate('/settings/tools')}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                Tool Settings
              </button>
              <button
                onClick={() => navigate('/precombine-checker')}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                Precombine Checker
              </button>
              <button
                onClick={() => navigate('/prp-patch-builder')}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                PRP Patch Builder
              </button>
              <button
                onClick={() => navigate('/packaging-release')}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                Packaging & Release
              </button>
              <button
                onClick={() => navigate('/vault')}
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white"
              >
                The Vault
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Content */}
      <div ref={contentScrollRef} className="flex-1 min-h-0 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {sections.map((section) => (
            <div
              key={section.id}
              ref={(el) => {
                sectionRefs.current[section.id] = el;
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-purple-500/50 transition-colors"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? '' : section.id)}
                className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left"
              >
                <div className="text-purple-400 flex-shrink-0">{section.icon}</div>
                <div className="flex-1">
                  <h2 className="font-bold text-white text-lg">{section.title}</h2>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 transition-transform ${
                    expandedSection === section.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSection === section.id && (
                <div className="px-6 py-4 bg-slate-950/50 border-t border-slate-700">
                  <div className="text-sm text-slate-300 whitespace-pre-wrap mb-4 space-y-3">
                    {section.content.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>

                  {section.subsections && section.subsections.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <h4 className="font-semibold text-purple-400 mb-3">Topics Covered</h4>
                      <ul className="space-y-1">
                        {section.subsections.map((sub, idx) => (
                          <li key={idx} className="text-xs text-slate-400 flex items-center gap-2">
                            <span className="text-purple-400">•</span>
                            {sub}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-purple-900/20 border-t border-slate-700">
        <p className="text-xs text-purple-300">
          💡 Pro Tip: Always rebuild precombines BEFORE releasing your mod. It's the difference between happy players and bug reports.
        </p>
      </div>
    </div>
  );
};
