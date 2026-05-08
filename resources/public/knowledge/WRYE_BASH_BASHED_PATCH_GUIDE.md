# Wrye Bash & Bashed Patch Guide for Fallout 4

Wrye Bash is a mod manager and patching tool that solves one of Fallout 4's core modding problems: when multiple mods edit the same leveled lists (enemy spawns, loot tables, vendor inventories), only the last mod in load order wins — all others are overwritten. The Bashed Patch merges these lists so every mod's additions coexist. This guide covers installation, the interface, bash tags, building patches, and integration with MO2/Vortex.

---

## Installation

### Standalone vs Python Version

| Version | Requires | Best for |
|---|---|---|
| Standalone (.exe) | Nothing extra | Most users |
| Python source | Python 3.11+ | Developers/contributors |

**Download**: GitHub Releases — https://github.com/wrye-bash/wrye-bash/releases

Always download the latest release. As of 2025, Wrye Bash 320+ supports Fallout 4 including NG (1.10.984+).

### Installation with MO2

1. Install Wrye Bash as a regular executable (not through MO2's installer).
2. In MO2: Settings → Executables → Add (+) → Browse to `Wrye Bash.exe`.
3. In the Arguments field, add: `-o "C:\Path\To\MO2\profiles\ProfileName\"`
4. Launch Wrye Bash through MO2 so it sees the MO2 virtual file system.

> **⚠️ WARNING**: Running Wrye Bash outside MO2 makes it see your real Data folder, not MO2's virtual one. Always launch via MO2.

### Installation with Vortex

1. Install Wrye Bash standalone.
2. In Vortex: Settings → Workarounds → add Wrye Bash as a tool.
3. Wrye Bash reads the staging folder directly when Vortex's deployment is active.
4. Run Vortex deployment before opening Wrye Bash.

### Game Detection

On first launch, Wrye Bash auto-detects installed games. If Fallout 4 is not found:
- File → Settings → Games tab → manually set path to `Fallout4.exe`

---

## Interface Tour

### Mods Tab

The primary working area. Lists all plugins in load order with color-coded status:

| Color | Meaning |
|---|---|
| White | Active, no issues |
| Yellow | Has bash tags; will be processed by Bashed Patch |
| Green | Master file (.esm or ESM-flagged) |
| Red | Missing master — will cause CTD if loaded |
| Purple | Merged into Bashed Patch (ESL/small plugins) |
| Grey | Inactive (unchecked) |

Right-click any plugin for options: List Bash Tags, Open in xEdit, Copy Load Order, etc.

**Column headers**: Click to sort. The "File" column shows plugin name; "Modified" shows last edit time; "Author" shows plugin header author field.

### Saves Tab

Lists save files with associated load orders. Use to:
- Identify which saves used which mods
- Detect missing masters in a save (red entries)
- Remove scripts from saves (advanced; use with caution)

### Installers Tab

BAIN (Bash Installer) format mod management. An alternative to FOMOD. See "Installers Tab" section below.

---

## The Bashed Patch: What It Does

The Bashed Patch (`Bashed Patch, 0.esp`) is a generated plugin placed at the very end of your load order. It:

✅ **Merges leveled lists** — combines additions from multiple mods into single unified lists  
✅ **Imports NPC stats** — merges actor value changes from multiple mods  
✅ **Imports race records** — merges race edits  
✅ **Can merge small ESPs** — absorbs ESL-capable plugins to save load order slots  

### What the Bashed Patch Does NOT Do

❌ Does **not** resolve conflicts between mods that edit the same non-list record (e.g., two mods editing the same NPC's appearance — that still requires a manual patch in xEdit)  
❌ Does **not** replace LOOT sorting  
❌ Does **not** fix navmesh conflicts  
❌ Does **not** handle script conflicts  
❌ Is **not** a substitute for compatibility patches  

---

## Bash Tags

Bash tags tell Wrye Bash how to process a plugin's records when building the Bashed Patch. Tags are stored in the plugin's description field (File Header → SNAM in xEdit) or in Wrye Bash's internal masterlist.

### Viewing Tags on a Plugin

In Wrye Bash Mods tab: right-click plugin → "List Bash Tags". Shows both auto-detected and manually set tags.

### Adding Tags Manually via xEdit

1. Open plugin in xEdit (FO4Edit).
2. Expand the plugin → File Header → SNAM - Description.
3. Add tags in the description using format: `{{BASH:Tag1,Tag2}}`
4. Example: `My weapon mod. {{BASH:Delev,Relev}}`
5. Save and close xEdit.

### Complete Bash Tag Reference for Fallout 4

| Tag | Effect | Use When |
|---|---|---|
| `Delev` | De-levels the list: removes Relev entries from vanilla so your list's levels apply | Your mod rebalances spawn levels |
| `Relev` | Re-levels entries: updates existing list entries with your changes | Your mod changes item chances/counts in a list |
| `Actors.ACBS` | Imports actor base stats (health, level mult, etc.) | Your mod tweaks NPC base stats |
| `Actors.AIData` | Imports AI aggression, confidence, mood, assistance | Your mod changes NPC combat behavior |
| `Actors.AIPackages` | Imports AI package lists | Your mod adds/removes NPC routines |
| `Actors.AIPackagesForceAdd` | Force-adds AI packages without removing vanilla ones | Adding packages without replacing existing |
| `Actors.Anims` | Imports animation lists | Custom animations on NPCs |
| `Actors.CombatStyle` | Imports combat style record links | Your mod changes how NPCs fight |
| `Actors.DeathItem` | Imports death item lists | Your mod gives NPCs custom loot on death |
| `Actors.Factions` | Imports faction membership | Your mod adds NPCs to factions |
| `Actors.Skeleton` | Imports skeleton NIF paths | Custom skeleton mods |
| `Actors.Stats` | Imports SPECIAL stats | Your mod changes NPC SPECIAL values |
| `C.Acoustic` | Imports cell acoustic space | Audio environment edits |
| `C.Climate` | Imports cell climate | Weather changes to specific cells |
| `C.Encounter` | Imports cell encounter zone | Scaling/level zone edits |
| `C.ImageSpace` | Imports cell image space | Visual filter changes per cell |
| `C.Light` | Imports cell lighting template | Lighting overhaul mods |
| `C.Location` | Imports location record link | Location edits |
| `C.Music` | Imports cell music type | Music overhaul per cell |
| `C.Name` | Imports cell name | Renamed cells |
| `C.Owner` | Imports cell ownership | Ownership changes |
| `C.RecordFlags` | Imports cell record flags | Flag-level cell changes |
| `C.Regions` | Imports cell region list | Region edits |
| `C.SkyLighting` | Imports cell sky lighting flag | Exterior lighting |
| `C.Water` | Imports cell water level/type | Water edits in cells |
| `Invent` | Imports NPC/container inventory (non-leveled) | Adding default items to NPCs |
| `NPC.AIPackageOverrides` | Imports NPC-level AI package override | Per-NPC package override |
| `NPC.Class` | Imports NPC class record | Class changes |
| `NPC.DefaultOutfits` | Imports NPC default and sleep outfits | Outfit overhaul mods |
| `NPC.FaceGen` | Imports NPC FaceGen data (face morph) | NPC appearance mods — avoids overwriting faces |
| `NPC.Hair` | Imports NPC hair color/style | Hair overhauls |
| `NPC.HeadParts` | Imports NPC head part list | Head part replacers |
| `NPC.Perks` | Imports NPC perk list | Adds perks to NPCs |
| `NPC.Race` | Imports NPC race | Race changes |
| `R.AddSpells` | Adds spells to race without replacing | Race spell additions |
| `R.Attributes-F/R.Attributes-M` | Imports race male/female attributes | Race stat edits |
| `R.Body-F/R.Body-M` | Imports race body model paths | Body replacers |
| `R.ChangeSpells` | Replaces race spell list | Race spell overhauls |
| `R.Description` | Imports race description | |
| `R.Ears` | Imports race ear head parts | |
| `R.Eyes` | Imports race eye options | Eye texture mods |
| `R.Hair` | Imports race hair options | Hair overhauls |
| `R.Head` | Imports race head model | Head mesh replacers |
| `R.Mouth` | Imports race mouth parts | |
| `R.Relations` | Imports race faction relations | |
| `R.Skills` | Imports race skill bonuses | |
| `R.Teeth` | Imports race tooth parts | |
| `R.Voice-F/R.Voice-M` | Imports race voice type | |
| `Scripts` | Imports script attachments | |
| `SpellStats` | Imports spell magnitude/duration/cost | Spell balance mods |

---

## Building the Bashed Patch

### Step-by-Step

1. **Sort load order first**: Run LOOT, apply sort, then open Wrye Bash.
2. **In Mods tab**: Ensure all active plugins are checked.
3. **Right-click "Bashed Patch, 0.esp"** at the bottom of the load order → "Rebuild Patch".
4. **Patch dialog opens** with options:

### Bashed Patch Options

| Option | What it does | Enable when |
|---|---|---|
| **Merge Patches** | Merges ESL-capable plugins into the patch | Always; saves load order slots |
| **Import Names** | Imports translated names from name-overhaul mods | Using a name translation mod |
| **Import Cells** | Imports cell record changes (uses C.* tags) | Mods edit cell lighting/audio/water |
| **Import Graphics** | Imports model/texture path overrides | Some replacer mods need this |
| **Import Inventory** | Imports NPC inventory (Invent tag) | NPC inventory mods |
| **Import Actors** | Imports actor stats/AI (Actors.* tags) | NPC overhaul mods |
| **Import NPC Faces** | Imports NPC face data (NPC.FaceGen tag) | Critical for NPC appearance mods |
| **Tweak Actors** | Engine behavior tweaks (NPC stat scaling) | Optional; read each tweak before enabling |
| **Tweak Settings** | Game setting tweaks (GMST) | Optional; advanced users only |
| **Leveled Lists** | Merges leveled lists (Delev/Relev tags) | **Always enable** — this is the core feature |

5. Click **Build Patch**. Wrye Bash processes all tagged plugins.
6. **Activate the Bashed Patch** — it should be the **last plugin** in your load order.

### After Building

- The patch is now `Bashed Patch, 0.esp` in your Data folder (or MO2 overwrite folder).
- Do not manually edit it — it's regenerated on each rebuild.
- Check the build log for warnings about missing tags or unresolved conflicts.

---

## Leveled List Merging In Depth

### The Problem Without a Bashed Patch

Suppose three mods all edit the vanilla raider leveled list `LLRaiderBandits`:

- **Mod A**: Adds a new raider type at level 5
- **Mod B**: Adds a legendary raider variant at level 25
- **Mod C**: Adds a raider dog companion entry

With no patch, only **Mod C** (last in load order) takes effect. Mods A and B's additions are invisible.

### With a Bashed Patch (Delev + Relev Tags)

The patch creates a new version of `LLRaiderBandits` containing all entries from vanilla + Mod A + Mod B + Mod C. All three additions coexist.

### Deleveled Lists

`Delev` tag: When a mod adds entries to a list, it often copies the vanilla list and inserts new entries. The copied vanilla entries retain their vanilla level requirements. `Delev` strips those vanilla entries and lets the Bashed Patch reconstruct the list from scratch using only the mod's actual additions + vanilla base.

Without `Delev`: The merged list might contain duplicate vanilla entries (one from vanilla, one copied by the mod).

### Releveled Lists

`Relev` tag: When a mod changes the level requirements or chance of existing list entries (not adding new ones), `Relev` tells Wrye Bash to use the mod's version of those entries rather than vanilla.

**Practical example**: A mod that makes deathclaws appear at level 20 instead of level 30 needs `Relev` so the Bashed Patch uses the new level value.

---

## Installers Tab (BAIN)

BAIN (Bash Archive INstaller) is Wrye Bash's built-in mod installer, supporting structured archives.

### BAIN Archive Format

```
ModName-12345.7z
  00 Core/
    Data/
      Meshes/...
      Textures/...
      ModName.esp
  10 Optional 2K Textures/
    Data/
      Textures/...
  20 Optional Plugin/
    Data/
      OptionalAddon.esp
```

Numbered prefixes (`00`, `10`, `20`) determine install order. The Installers tab lets you check/uncheck sub-packages.

### BAIN Wizard Scripts

Some BAIN archives include a `wizard.txt` file — a scripted installer (similar to FOMOD) that asks questions and selects sub-packages based on answers:

```
; wizard.txt example
SelectOne "Choose texture resolution",\
  "2K Textures", "2048x2048", "10 2K Textures",\
  "4K Textures", "4096x4096", "20 4K Textures"

SelectSubPackage kwAnyOf.getHint()
```

BAIN is less common than FOMOD in the FO4 community, but some older and some Skyrim-ported mods use it.

---

## Conflict Detection

### Wrye Bash vs LOOT vs Manual xEdit

| Tool | Best at |
|---|---|
| **Wrye Bash** | Leveled list conflicts; detecting which mods need tags |
| **LOOT** | Load order sorting; known incompatibility warnings |
| **xEdit** | Precise record-level conflict inspection; manual resolution |

Use all three together:
1. LOOT → sort load order
2. Wrye Bash → build Bashed Patch (handles list conflicts)
3. xEdit → resolve remaining record conflicts manually

### Identifying Untagged Mods

In the Mods tab, mods with leveled list edits that have NO bash tags show as white (not yellow). Right-click → "List Bash Tags" → if it says "No tags" but the mod adds NPCs or loot, it likely needs `Delev`/`Relev`.

Check the mod's Nexus posts tab — often the author or other users have documented required tags.

---

## Troubleshooting

### "Bashed Patch causes CTD on load"
- Likely a corrupted merge. Rebuild the patch.
- Disable "Merge Patches" option and rebuild — an ESL plugin may be incompatible with merging.
- Check that no merged plugin has an esm master that isn't active.

### "Leveled list changes from ModX aren't appearing in game"
- ModX is not tagged with `Delev`/`Relev`.
- Add tags manually in xEdit (plugin description → `{{BASH:Delev,Relev}}`).
- Rebuild the Bashed Patch.

### "Wrye Bash doesn't see my MO2 mods"
- You're not launching Wrye Bash through MO2. Always launch via MO2's executable list.

### "Bashed Patch is not last in load order"
- Move it manually to last position, or let LOOT sort it (it has a rule to place Bashed Patch last).
- In MO2: drag to bottom of load order in the right panel.

### "NPC face looks wrong / grey face bug after Bashed Patch"
- The patch imported incorrect FaceGen data.
- In Patch dialog: uncheck "Import NPC Faces" and rebuild.
- Or: ensure the NPC overhaul mod has `NPC.FaceGen` tag and is correctly structured.

---

## When to Rebuild the Bashed Patch

**Always rebuild after:**
- Adding or removing any mod that touches leveled lists, NPCs, or races
- Changing load order of mods that affect the above
- Updating a mod that had leveled list changes
- Adding or removing bash tags to any plugin

**You do NOT need to rebuild for:**
- Texture-only mods
- Sound-only mods
- Weather mods (unless they edit leveled lists)
- ESP-FE/ESL patches that only forward existing records

**Rule of thumb**: Any time you modify your load order, rebuild the Bashed Patch before playing.

---

## Integration Quick Reference

### MO2 Workflow
```
1. Sort plugins with LOOT (via MO2)
2. Launch Wrye Bash through MO2
3. Rebuild Bashed Patch
4. Close Wrye Bash
5. In MO2 right panel: refresh, ensure Bashed Patch is last
6. Launch game through MO2
```

### Vortex Workflow
```
1. Sort plugins with LOOT (Vortex uses LOOT internally)
2. Deploy mods in Vortex
3. Launch Wrye Bash (as external tool in Vortex)
4. Rebuild Bashed Patch
5. Close Wrye Bash
6. Ensure Bashed Patch is active in Vortex plugin list
7. Launch game
```
