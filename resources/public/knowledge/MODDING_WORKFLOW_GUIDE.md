# Fallout 4 Modding Workflow Guide: Concept to Nexus Release

Creating a Fallout 4 mod is a multi-phase process that spans initial concept through long-term maintenance. This guide covers the complete lifecycle: planning and compatibility research, CK development, asset creation, testing with crash analysis tools, FOMOD packaging, Nexus release, and post-release maintenance using modern version-control workflows.

---

## Phase 1: Planning

### Defining Scope

The most common reason mods fail to release is scope creep. Define exactly what your mod does in a single sentence before touching the Creation Kit.

Good scope definitions:
- "Adds a craftable suppressor to the Combat Rifle that uses a new mesh and has a unique sound."
- "Retextures all Diamond City walls to use brick-and-corrugated-metal at 2K resolution."
- "New fully voiced companion NPC with 40+ lines of dialogue and a home base in Concord."

Avoid: "A huge overhaul with new weapons, companions, quests, settlements, and new worldspace" as a first mod. Scope it down to one of those.

### Compatibility Research

Before writing a line of script or placing a single object, research what your mod will touch.

**Questions to answer:**
1. Does any existing popular mod already do this? (Search Nexus before building.)
2. Which vanilla records will I edit? (Checked with xEdit — any edits create conflict potential.)
3. Am I adding new records only, or editing vanilla? (New = safer; edits = requires compatibility patches.)
4. Does my mod depend on F4SE, MCM Helper, Sim Settlements 2, or other frameworks?

**Tools for compatibility research:**
- **xEdit**: Load your target ESPs and check which records overlap with top-downloaded mods in the same category.
- **Nexus "Similar Mods"**: Check what already exists.
- **LOOT masterlist**: See if popular mods in your niche have known conflicts documented.

### Dependency Mapping

Create a dependency list before you start:

```
Required:
  - Fallout4.esm (always)
  - DLCRobot.esm (if touching Automatron content)
  - F4SE 0.7.7+ (if using any script extender features)

Optional (soft dependencies):
  - MCM Helper (if providing a config menu)
  - Workshop Framework (if adding settlement objects)

Incompatibilities (known):
  - ConflictingModX.esp (both edit Record XXXXXXXX)
```

Document this now. You'll need it for your Nexus requirements page later.

### Plugin Type Decision

| Plugin Type | Max Records | ESL-Flagged | Notes |
|---|---|---|---|
| `.esp` | 2,048 master + unlimited local | No | Standard; use for mods with many records |
| `.esm` | Unlimited | No | For large mods intended as master files |
| `.esl` | 2,048 total | Auto | Doesn't use a load order slot; ideal for small patches |
| `.esp` ESL-flagged | 2,048 total | Yes | Best of both; can be converted in xEdit |

**Rule of thumb**: If your mod has fewer than 2,000 new records and doesn't edit vanilla records extensively, flag it as ESL. This preserves load order slots for the user.

---

## Phase 2: Development

### Creation Kit Setup

1. Install CK via Steam (search "Fallout 4 Creation Kit" in your library).
2. Run once to generate `CreationKit.ini` and `CreationKitCustom.ini` in `Documents\My Games\Fallout4\`.
3. Add to `CreationKitCustom.ini`:
   ```ini
   [Archive]
   bInvalidateOlderFiles=1
   sResourceDataDirsFinal=STRINGS\
   
   [General]
   bEnableMessageBoxes=0
   
   [MESSAGES]
   bBlockMessageBoxes=1
   ```
4. Never run the CK through MO2 directly — launch it from its install directory or via a correctly configured MO2 executable entry that passes the correct data path.

> **⚠️ WARNING**: The CK frequently crashes on large worldspace loads. Save your plugin after every significant change. Enable CK autosave via the Preferences dialog if available.

### ESP Structure Best Practices

- **One ESP per mod concept.** Don't bundle unrelated features.
- **Use a unique prefix for all editor IDs** to avoid collisions. Example: if your mod is "Rusty Workshop", use `RW_` prefix: `RW_WorkbenchSteel01`, `RW_QuestIntro`, etc.
- **Name your plugin clearly**: `RustyWorkshop.esp` not `mod.esp` or `test2final.esp`.
- **Set author name and description** in the plugin header (File > Plugin Info in CK).
- **Never edit a vanilla record unless absolutely necessary.** Add new records, use Inject records, or use script-driven changes instead.

### Asset Creation Pipeline

Assets flow from creation software into the game through a standardized pipeline:

```
3D Model (Blender/3DS Max)
    → Export as FBX or NIF (via NifTools or Havok Content Tools)
    → NifSkope for final NIF adjustments (collision, BSLightingShaderProperty)
    → Place in: Data\Meshes\<YourModFolder>\

Texture (GIMP/Photoshop/Substance)
    → Export as DDS (BC1 for diffuse no-alpha, BC3 for diffuse+alpha, BC5 for normals)
    → Generate mip maps
    → Place in: Data\Textures\<YourModFolder>\

Audio (Audacity/REAPER)
    → Export as XWM (via xWMAEncode.exe) or WAV (16-bit, 44100Hz)
    → Place in: Data\Sound\<YourModFolder>\

Papyrus Scripts (.psc source)
    → Compile with Papyrus Compiler (bundled with CK)
    → Compiled .pex goes in: Data\Scripts\
    → Source .psc goes in: Data\Scripts\Source\User\
```

### Script Development Workflow

1. Write `.psc` script source in a text editor (VS Code with Papyrus extension recommended).
2. Compile from CK (Gameplay > Compile Papyrus Script) or via command line:
   ```batch
   PapyrusCompiler.exe "path\to\script.psc" -f="Fallout4\Flags.flg" -i="Data\Scripts\Source\User\" -o="Data\Scripts\"
   ```
3. Attach compiled `.pex` to objects via CK (Script property on the form).
4. Test in-game with console: `cgf "Debug.Notification" "Script attached"` or custom debug notifications.

---

## Phase 3: Testing

### Solo Testing Protocol

Before sharing with anyone, run through this checklist:

**Basic functionality:**
- [ ] Mod loads without errors in xEdit (no missing masters, no dirty records)
- [ ] Game starts and reaches main menu with mod active
- [ ] No obvious CTD on new game start
- [ ] Core feature works as documented
- [ ] Mod can be safely disabled mid-playthrough (if applicable)

**Edge cases:**
- [ ] Tested in-game areas affected by mod (not just from main menu)
- [ ] Tested after saving and reloading
- [ ] Tested with 5+ other common mods active simultaneously
- [ ] No Papyrus errors in log (enable logging, play 10 min, check log)

### Setting Up Buffout 4 / Addictol for Crash Testing

As of 2025, **Addictol** supersedes Buffout 4, X-Cell, and BakaMaxPapyrusOps as the unified crash prevention suite.

**Installation:**
1. Install Addictol (requires F4SE 0.7.7+).
2. Addictol generates crash logs at: `Documents\My Games\Fallout4\F4SE\addictol_crash*.log`

**Using CLASSIC (Crash Log Auto Scan & Identification in CLASSIC):**
1. Download CLASSIC from Nexus.
2. Point it at your crash log directory.
3. Run scan — it identifies the likely culprit plugin/record from the crash log's stack trace.
4. Fix the identified record and retest.

**Reading a crash log manually:**
```
Unhandled exception "EXCEPTION_ACCESS_VIOLATION" at 0x7FF601234567
    [RSP+0] = ...

Probable callstack:
    Fallout4.exe+1234567   <- game engine code
    Fallout4.exe+789ABCD
    tbbmalloc.dll+...

Registered modules:
    [FE:000] ConflictingMod.esp
```
Look for your mod's ESP in "Registered modules" and correlate with the callstack addresses using Address Library + a disassembler.

### Beta Testing

**Finding beta testers:**
- Post in the appropriate Nexus mod forum thread ("Looking for Beta Testers")
- r/FO4mods or r/Fallout4Mods with a [Beta] flair request
- FO4 Modding Community Discord (see Phase 5 for links)

**What to send testers:**
- The ESP + all required assets in a zip
- A list of tested mods for compatibility context
- A clear description of how to trigger the mod's features
- A bug report template (load order, Papyrus log excerpt, steps to reproduce)

### Cleaning Dirty Records

Before release, always clean your plugin:

1. Open xEdit (FO4Edit).
2. Load your ESP alone (just it + its masters).
3. Right-click → Apply Filter for Cleaning.
4. Right-click → Remove Identical to Master records.
5. Right-click → Undelete and Disable References.
6. Save.

> **⚠️ WARNING**: Do not run "Remove Identical to Master" on intentional edits. Review each flagged record. Some "identical to master" records are intentional overrides.

---

## Phase 4: Packaging

### FOMOD Creation

FOMOD is the standard installer format for Nexus Mods. It allows users to choose options during installation.

**FOMOD structure:**
```
YourMod\
  fomod\
    info.xml
    ModuleConfig.xml
  Data\           ← OR separate option folders
    Meshes\...
    Textures\...
    YourMod.esp
```

**Minimal `info.xml`:**
```xml
<fomod>
  <Name>Rusty Workshop</Name>
  <Author>YourName</Author>
  <Version>1.0.0</Version>
  <Description>Adds rusty settlement objects.</Description>
  <Website>https://www.nexusmods.com/fallout4/mods/XXXXX</Website>
</fomod>
```

**Minimal `ModuleConfig.xml` (no options, simple install):**
```xml
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="http://qconsulting.ca/fo3/ModConfig5.0.xsd">
  <moduleName>Rusty Workshop</moduleName>
  <installSteps order="Explicit">
    <installStep name="Install">
      <fileList>
        <folder source="Data" destination="" priority="0"/>
      </fileList>
    </installStep>
  </installSteps>
</config>
```

**FOMOD with options (e.g., 2K vs 4K textures):**
```xml
<optionalFileGroups order="Explicit">
  <group name="Texture Resolution" type="SelectExactlyOne">
    <plugins order="Explicit">
      <plugin name="2K Textures">
        <description>2048x2048 textures. Recommended for most systems.</description>
        <files>
          <folder source="Textures2K" destination="Data\Textures\RustyWorkshop" priority="0"/>
        </files>
        <typeDescriptor><type name="Optional"/></typeDescriptor>
      </plugin>
      <plugin name="4K Textures">
        <description>4096x4096 textures. Requires 6GB+ VRAM.</description>
        <files>
          <folder source="Textures4K" destination="Data\Textures\RustyWorkshop" priority="0"/>
        </files>
        <typeDescriptor><type name="Optional"/></typeDescriptor>
      </plugin>
    </plugins>
  </group>
</optionalFileGroups>
```

**Tools for FOMOD creation:**
- **FOMOD Creation Tool** (Nexus) — GUI builder, generates XML for you
- **Notepad++** — for hand-editing XML
- **Vortex FOMOD editor** — available if you use Vortex

### BA2 Packing

Pack your assets into BA2 archives for faster load times and cleaner distribution.

**Using Archive2 (bundled with CK):**
1. Open Archive2 (`Tools\Archive2\Archive2.exe` in your FO4 directory).
2. File > New Archive.
3. Add your files (maintain the `Meshes\`, `Textures\` folder structure inside the archive).
4. Format:
   - General assets (meshes, scripts, sounds): `General` format
   - Textures: `DDS` format (separate archive, named `ModName - Textures.ba2`)
5. Save as `ModName.ba2` and `ModName - Textures.ba2`.
6. Reference them in `Fallout4Custom.ini` under `sResourceArchive2List` (or instruct users to do so), or pack them in the FOMOD installer so they land in the Data folder.

> **⚠️ Note**: BA2 archives are automatically loaded if they match the plugin name exactly. `RustyWorkshop.ba2` and `RustyWorkshop - Textures.ba2` are auto-loaded when `RustyWorkshop.esp` is active — no INI entry needed.

### Load Order Notes Documentation

Include a `README.txt` or Nexus page section with:
- Where in the load order your ESP should go (e.g., "after all DLC, before patch ESPs")
- Known compatible mods (tested together)
- Known incompatible mods (and why)
- Whether a Bashed Patch is recommended
- Whether users should run DynDOLOD after installing (if you add exterior objects)

---

## Phase 5: Release

### Writing Your Nexus Page

A good Nexus mod page has:

**Description tab:**
- One-paragraph "what does this mod do" at the very top (above any images)
- Requirements section with direct links to each required mod
- Feature list with screenshots for each feature
- Installation instructions (for both manual and mod manager)
- Compatibility notes
- Known issues / FAQ

**Formatting tips:**
- Use `[size=5][b]Section Header[/b][/size]` for major sections in BBCode
- Use `[list]` for feature lists
- Use `[color=#FF6A00]` for warnings (orange)
- Nexus BBCode reference: https://help.nexusmods.com/article/72-how-do-i-use-bbcode-on-nexus-mods

### Screenshots

Good screenshots are the single biggest factor in download counts:

- **Resolution**: 1920×1080 minimum; 2560×1440 preferred
- **No UI**: Disable HUD (`tm` in console) before screenshots
- **Lighting**: Shoot at golden hour (in-game time ~8:00 or ~18:00) or in well-lit interior
- **Comparison shots**: Side-by-side or slider images for retextures (use NexusMods image slider feature)
- **Action shots**: Show the mod doing what it does (NPC talking, weapon firing, settlement active)
- Use ReShade or an ENB for screenshots even if the mod doesn't require one — it elevates perceived quality

### Version Numbering

Use semantic versioning: `MAJOR.MINOR.PATCH`

| Increment | When |
|---|---|
| MAJOR (1.x.x → 2.x.x) | Breaking change; users must start new save |
| MINOR (x.1.x → x.2.x) | New feature added; safe to update mid-save |
| PATCH (x.x.1 → x.x.2) | Bug fix; always safe to update |

Start at `1.0.0` for initial release, not `0.1.0` (users trust 1.x more).

### Changelogs

Write a changelog for every update:

```
Version 1.2.0 (2025-06-15)
- Added: 3 new rusty pipe variants for settlers
- Added: FOMOD option for high-poly meshes
- Fixed: Workbench activator not working after cell reset
- Fixed: Missing texture on RustyFence01 (reported by Username)
- Improved: Performance optimization — reduced draw calls by 15%

Version 1.1.1 (2025-05-20)
- Fixed: CTD when fast-traveling to Sanctuary with mod active (Buffout log showed NavMesh conflict with WSMods.esp)
```

---

## Phase 6: Maintenance

### Handling Bug Reports

When a user reports a bug, ask for:
1. **Load order** (full list, preferably from MO2/Vortex export or `plugins.txt`)
2. **Crash log** (Addictol/Buffout log, or CLASSIC scan output)
3. **Papyrus log** (if script-related: `Documents\My Games\Fallout4\Logs\Script\Papyrus.0.log`)
4. **Steps to reproduce** (what they were doing when it happened)
5. **Mod version** (what version of your mod + what version of requirements)

Use a bug report template in your Nexus description:
```
**Mod version:**
**F4SE version:**
**Load order:** (attach as file or pastebin link)
**Steps to reproduce:**
**Crash/Papyrus log:** (attach or pastebin)
```

### Using Spriggit + Git for Version Control

**Spriggit** (by Mutagen author Noggog) converts Bethesda plugin files to text-based YAML/JSON for Git version control.

**Setup:**
```bash
# Install Spriggit CLI
dotnet tool install -g Spriggit.CLI

# Convert ESP to YAML for Git
spriggit serialize --InputPath "RustyWorkshop.esp" --OutputPath "git-repo/RustyWorkshop" --GameRelease Fallout4 --PackageName Spriggit.Yaml.Fallout4

# Convert YAML back to ESP (after Git pull)
spriggit deserialize --InputPath "git-repo/RustyWorkshop" --OutputPath "RustyWorkshop.esp"
```

**Git workflow:**
```bash
git init
git add .
git commit -m "v1.0.0 initial release"

# After a patch
spriggit serialize ...
git add .
git commit -m "v1.0.1 fix activator not working after cell reset"
git tag v1.0.1
git push origin main
```

Host on GitHub. This gives you:
- Full history of every plugin change
- Easy diff of what changed between versions
- Issue tracker for public bug reports
- Ability for collaborators to fork and contribute

### Update Workflow

When releasing an update:
1. Make changes in CK
2. Clean dirty records (xEdit)
3. Run a test playthrough on an existing save
4. Run CLASSIC on any crash logs from testing
5. Bump version number in `info.xml` (FOMOD) and plugin header
6. Write changelog entry
7. Pack new BA2 if assets changed
8. Upload to Nexus (new main file for major changes, update file for patches)
9. Run `spriggit serialize` and commit to Git with version tag

---

## Mod Type: New Worldspace

- Plan navmesh **first** — it takes 80% of the time and is the #1 source of CTDs in new worldspaces
- Use Cell grid coordinates that don't overlap vanilla Commonwealth (use the Worldspace Browser in CK)
- Generate Precombines and Previs before release (see `PJM_PRECOMBINE_PREVIS_GUIDE.md`)
- Generate LOD with xLODGen + DynDOLOD (see `DYNDOLOD_XLODGEN_GUIDE.md`)
- Test door teleport markers extensively — the most common new worldspace bug

## Mod Type: New NPC / Companion

- Use a **unique** face preset. Don't use vanilla preset 1 — it's what every new modder uses and causes duplicate faces.
- Export FaceGen data (Ctrl+F4 on the NPC in CK) to generate facetint/facegeom files in `Data\Meshes\Actors\Character\FaceGenData\`
- Voice acting: Record WAV → convert to XWM with `xWMAEncode.exe` → place in `Data\Sound\Voice\ModName.esp\NPCEditorID\`
- Lip sync: Use the CK's lip sync tool or LipSyncer for batch `.lip` file generation
- If giving a home base: Test the sandbox package behavior, patrol routes, and that the NPC can pathfind to every location

## Mod Type: Weapon Mod

- Model in correct scale: Fallout 4 units are approximately 1 unit = 1 inch
- Test all attachment combinations (barrel + grip + stock + sight) — there can be hundreds of combinations
- Check that reload animations don't clip through new geometry (custom animations may be needed)
- Add proper impact data sets (IPDS record) — don't inherit from incorrect weapon types
- Test with and without the Weapon Debris particle setting (some meshes break with debris enabled)

## Mod Type: Settlement Mod

- Use Workshop Framework (or vanilla WorkshopParent) — don't reinvent the settlement system
- Test: budget limits (triangle and draw call budgets), snapping, object persistence after save/load
- Use `bAllowPlayerEditingOfWorkshopCategory` flag correctly or items won't appear in the build menu
- NavMesh all interior spaces and run Finalize NavMesh from CK before release
- Test with a fresh settlement and one with existing buildings

## Mod Type: Texture Replacer

- Match vanilla UV mapping exactly — no geometry changes means textures must fit existing UVs
- Provide the correct texture set variants (`_d`, `_n`, `_s`) — missing normals/spec cause plastic-looking surfaces
- Always generate mip maps — textures without mip maps cause memory thrashing and distant shimmer
- Test at multiple distances (close-up and from across a street)
- Document VRAM requirements (4K = ~12MB per texture uncompressed; multiple 4K sets add up fast)
