# PRP - The Unofficial Fallout 4 Precombines Patch

## Complete Guide and Reference

---

## Table of Contents

1. [Introduction](#introduction)
2. [What is PRP?](#what-is-prp)
3. [Technical Background](#technical-background)
4. [Requirements and Versions](#requirements-and-versions)
5. [Installation Guide](#installation-guide)
6. [FOMOD Options Explained](#fomod-options-explained)
7. [Load Order and Compatibility](#load-order-and-compatibility)
8. [Patch System](#patch-system)
9. [Known Incompatibilities](#known-incompatibilities)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Performance and Expectations](#performance-and-expectations)
12. [Advanced Topics](#advanced-topics)
13. [FAQ](#faq)
14. [Building Custom Patches](#building-custom-patches)
15. [Alternatives and Comparisons](#alternatives-and-comparisons)

---

## Introduction

The **Unofficial Fallout 4 Precombines Patch (PRP)** is one of the most important and largest mods for Fallout 4, addressing fundamental issues with the game's precombined mesh and occlusion systems. It represents the culmination of years of research and development by the Fallout modding community.

**Key Facts:**
- File size: 2.28GB + patches
- Primary support: Collective Modding Discord
- Lead developer: Starhammer
- Completely free
- Dramatically improves performance in CPU-limited areas
- Required dependency for most modern mod lists

### Why This Guide?

PRP is complex and can be intimidating for new modders. This guide explains:
- What PRP does and why it's needed
- How to install it correctly
- How patches work and why you need them
- Common problems and solutions
- Technical background for understanding conflicts

---

## What is PRP?

### Simple Explanation

PRP is a complete rebuild of Fallout 4's precombined meshes and occlusion (visibility) data. Think of it as replacing the game's foundation that all buildings rest on.

### What Are Precombines?

**Precombines** are pre-combined meshes - groups of individual objects merged into single larger meshes. For example:
- Instead of rendering 50 individual brick objects, precombines merge them into 1 mesh
- This reduces the number of "draw calls" the GPU has to make
- Fewer draw calls = better performance

**How They Work:**
```
Original Game:
Building = 50 individual brick meshes
GPU must process: 50 separate draw calls
Performance cost: High

With Precombines:
Building = 1 merged brick mesh + 1 merged mortar mesh + 1 merged window mesh
GPU must process: 3 draw calls
Performance cost: Low
```

### What Are Previs (Precombined Visibility)?

**Previs** is occlusion data - information about what can and cannot be seen from different locations. For example:
- From inside a building, external structures are marked "not visible"
- Game doesn't render invisible objects
- Fewer rendered objects = better performance

### What Does PRP Fix?

1. **Recreates Broken Precombines**
   - Original game has placement errors
   - PRP rebuilds them correctly
   - Fixes flickering, missing pieces, clipping objects

2. **Improves Visibility Data**
   - Original previs is incomplete
   - PRP recalculates visibility for all areas
   - More objects properly culled, better performance

3. **Removes Duplicates**
   - Some objects are rendered twice
   - PRP identifies and fixes these
   - Performance improvement from reduced redundancy

4. **Optimizes Mesh Sizes**
   - Modern tools can compress better than Bethesda's
   - Original: ~24GB uncompressed
   - PRP: ~2GB + ~1.5GB visibility = ~3.5GB total
   - 85% size reduction while improving quality!

### Performance Improvements

**Typical FPS Gains:**
- Boston Commons: 5-15 FPS increase (CPU limited)
- Downtown Boston: 3-10 FPS increase
- Most areas: 0-5 FPS improvement
- Interior cells: Usually minimal impact
- Exterior non-Boston: ~5% variance depending on cell changes

**What You'll Notice:**
- Smoother gameplay in downtown areas
- Reduced stuttering in busy zones
- More consistent frame times
- Reduced CPU load in precombine-heavy areas

**What You Won't See:**
- Dramatic FPS increase everywhere (game is GPU limited in many areas)
- Fixes for other performance issues (physics, AI, etc.)
- Improvement in your FPS counter if you're already GPU limited

---

## Technical Background

### Understanding Precombine Records

**Precombine records** are stored in cell headers. They're part of the "cell data" structure that defines everything in a cell.

**Structure:**
```
CELL Record
├── Basic cell properties (location, water level, etc.)
├── Precombine data
│   ├── Mesh reference (which precombine mesh to use)
│   ├── Visibility reference (which previs file to use)
│   └── Transform data (position, rotation, scale)
└── Reference data (NPCs, items, etc.)
```

### Why Precombines Are Compatibility Nightmares

When you modify precombine data, you're changing the "foundation" everything else sits on.

**Example Scenario:**

```
Base Game (Bethesda):
- Cell contains Precombine Mesh v1
- All mods were designed against v1
- Everything works together

Install PRP:
- Cell now has Precombine Mesh v2 (improved)
- But Mesh v1 and v2 are completely different
- Mods that added objects expecting v1 placement break
- Need patches that rebuild against v2

Install Mod A after PRP:
- Mod A was built against original mesh
- Mod A's objects now clip/float because foundation changed
- Need patch rebuilding Mod A's changes on PRP foundation
```

### The Spanning Tree Problem

This is why PRP requires so many patches. It's a cascading dependency issue:

```
Base Game Precombines
        ↓
      PRP
     ↙   ↘
  Mod A   Mod B
   ↓ ↘    ↙ ↓
   PRP+A  PRP+B
    ↘ ↙
   PRP+A+B (Needs separate patch!)
```

Each combination of mods + PRP potentially needs its own patch because:
1. PRP changes the foundation
2. Each mod changes objects on that foundation
3. When mods interact with each other on the new foundation, results may conflict
4. Each unique combination needs verification/patching

---

## Requirements and Versions

### Game Version Requirements

**Current Support Status:**

| Version | Status | Notes |
|---------|--------|-------|
| Anniversary Edition (AE) | ✅ Supported | PRP 81+ required, recommended 100+ |
| NG (Steam Downgrade) | ⚠️ Deprecated | PRP 74, no longer updated |
| OG (GOG/Steam Downgrade) | ⚠️ Deprecated | PRP 74, no longer updated |

**Patch Level Support:**

```
Minimum supported EXE: 1.10.163
(EXE preference doesn't matter much above this)

PRP 81 or newer: Anniversary Edition (2023)
PRP 74: NG/OG versions (2021 and earlier)
```

### Required Mods

**Must Have (Before Installing PRP):**
1. **Fallout 4 Anniversary Edition**
   - Minimum: Season pass + free Creation Club from 2023
   - Not required but supported: Full Creation Club bundle

2. **The Unofficial Fallout 4 Patch (UFO4P)**
   - Latest version recommended
   - PRP builds on top of UFO4P fixes
   - Install UFO4P before PRP
   - Load order: UFO4P → PRP

### Optional Recommended

- **Mod Organizer 2** - For managing complex load orders
- **LOOT** - For automatic load order sorting
- **xEdit** - For patch creation and troubleshooting

### Minimum System Requirements

No additional requirements beyond Fallout 4, but:

- **Storage:** 2.28GB+ for main mod
- **RAM:** 4GB+ (more if using other large mods)
- **For patch generation:** 64GB RAM (if using Creation Kit)

---

## Installation Guide

### Pre-Installation Checklist

Before installing PRP:

- [ ] Have Fallout 4 Anniversary Edition installed
- [ ] Have The Unofficial Fallout 4 Patch installed
- [ ] Have 3-4GB free disk space
- [ ] Know your game version (AE, NG, or OG)
- [ ] Disable any precombine-related mods (like Boston FPS Fix)

### Installation Steps

#### Method 1: Mod Organizer 2 (Recommended)

**Step 1: Download Files**
1. Go to Nexus Mods - Precombines Repair Pack
2. Download main file for your game version (AE, NG, or OG)
3. Optionally download latest plugins update package
4. Optionally download translation files

**Step 2: Create Mod in MO2**
```
In Mod Organizer 2:
1. Click "Create a new mod..."
2. Select folder for mod (creates new folder)
3. Extract downloaded archive to this folder
4. Enable mod in left panel
```

**Step 3: Install FOMOD Options**
```
When mod is enabled, FOMOD installer should launch:
1. Select your game version (AE, NG, OG)
2. Choose optional patches/add-ons
3. Select language
4. Install
```

**Step 4: Load Order**
```
Typical load order:
- Fallout4.esm
- DLCRobot.esm
- DLCCoast.esm
- DLCNukaWorld.esm
- Fallout4.esl (if Anniversary Edition)
- UFO4P.esp
- PRP.esp  ← Near or at the end
- PRP_Patches.esp  ← If using patches
- Your other mods
```

#### Method 2: Vortex

**Step 1: Download**
1. Same as above - download from Nexus

**Step 2: Install**
```
In Vortex:
1. Click "Install" on downloaded file
2. FOMOD window appears
3. Select options (see below)
4. Install completes
```

**Step 3: Enable and Sort**
```
1. Enable PRP in mod list
2. Let LOOT sort load order
3. PRP.esp should be near end of load order
```

#### Method 3: Manual Installation

**Step 1: Extract**
1. Extract downloaded archive to `Fallout 4\Data` folder
2. Should create: `Data\PRP.esp`, `Data\Meshes\Precombine\...`, etc.

**Step 2: FOMOD Options**
Unfortunately, manual installation doesn't run FOMOD installer. You'll need to:
1. Delete unwanted optional ESP files manually
2. Select translations manually
3. Requires more work

**⚠️ Not Recommended** - Use MO2 or Vortex for automatic FOMOD handling

### Verifying Installation

**Check in Mod Organizer:**
```
PRP folder should contain:
- PRP.esp
- Meshes/ folder (large, 2GB+)
- Misc/ folder
- Textures/ folder
- Optional: Translations/ folder
```

**Check in Game Launcher:**
1. Open Fallout 4 launcher
2. Click "Data Files"
3. Check that PRP.esp is listed and enabled
4. If not listed: Installation failed
5. If disabled: Enable it

**Check in Load Order:**
1. Open xEdit
2. Look for PRP.esp in the list
3. Should be loaded without errors
4. No red text or warning messages

---

## FOMOD Options Explained

When installing PRP, you'll see an FOMOD installer with several choices. Here's what each does:

### Step 1: Game Version

```
Select one:
☐ Anniversary Edition (AE)
☐ Steam/GOG Downgrade (NG)
☐ Steam/GOG Downgrade (OG)
```

**Choose Based On:**
- Anniversary Edition: If you own the 2023 AE version with Creation Club content
- NG: If you downgraded Steam to pre-2023 version
- OG: If using GOG version or very old Steam version

**If Unsure:** Check Fallout 4 launcher - it shows your version

### Step 2: Core Meshes

Usually not optional, but available:
```
☑ PRP Stable (Default - Use this)
☐ PRP Unstable (Experimental - Not recommended)
```

**Stable:** Thoroughly tested, reliable, recommended for everyone

**Unstable:** New fixes being tested, may have unknown issues, only for advanced users helping with development

### Step 3: Optional Patches

```
☐ PRP-SS2 (Sim Settlements 2 support)
☐ PRP-Patches (Additional compatibility patches)
☐ Misc patches (Various mod patches)
```

**Select Based on Your Mods:**
- **PRP-SS2:** If using Sim Settlements 2 mod
- **PRP-Patches:** If using mods that have dedicated patches included
- Individual mod patches: Only if using those specific mods

### Step 4: Language

```
Select:
☐ English (Default)
☐ Spanish (Spain)
☐ Italian
☐ Portuguese (Brazil)
☐ French
☐ Japanese
☐ Polish
☐ Simplified Chinese
☐ Russian
☐ German
```

**Choose Your Language:** Interface will display in this language (if available)

### Step 5: Confirmation

Review your selections:
```
You selected:
- Game Version: Anniversary Edition
- Meshes: PRP Stable
- Optional Patches: PRP-SS2
- Language: English

OK to proceed?
```

Click **Install** to complete

---

## Load Order and Compatibility

### Optimal Load Order

PRP must be positioned carefully to work correctly.

**General Structure:**

```
MASTERS (game files)
├── Fallout4.esm
├── DLCRobot.esm
├── DLCCoast.esm
├── DLCNukaWorld.esm
└── Fallout4.esl (AE only)

ESSENTIAL PATCHES
├── Unofficial Fallout 4 Patch.esp
└── PRP.esp  ← Important: Usually here

CONTENT MODS
├── (Your settlement mods)
├── (Your quest mods)
├── (Your gameplay mods)
└── (Other mods)

PATCHES (AFTER PRP-dependent mods)
├── PRP_Patches.esp
├── [ModName]_PRP_Patch.esp
└── [OtherMod]_PRP_Patch.esp

FINAL OVERRIDES
└── (Any mods that should load last)
```

### Where Should PRP.esp Go?

**Short Answer:** Near or at the end of your plugin load order

**Why:**
- Precombines are baked into cell data
- If another mod modifies cells after PRP, it overwrites PRP's precombine data
- PRP should be the last to touch each cell
- Exceptions: mods with dedicated PRP patches (they go after PRP)

**Using LOOT:**
```
LOOT has built-in rules for PRP placement:
1. Run LOOT
2. Click "Sort"
3. LOOT will place PRP correctly
4. Review placement (usually correct)
5. Apply sort
```

**Manual Placement:**
```
If LOOT doesn't exist or you're not using it:

Count your plugins:
- Master files (ESM): Usually 4-5
- Unofficial Fallout 4 Patch: Usually plugin #6-7
- PRP.esp: Should be plugin #7-15 typically
- PRP-dependent patches: After PRP
- Everything else: Can be anywhere

Exact position depends on your mod list
```

### Load Order Troubleshooting

**Problem: Flickering or missing pieces**

```
Solution 1: Move PRP.esp later in load order
- Some mods might be modifying cells after PRP
- Moving PRP.esp later ensures it's last
- Use LOOT to determine correct position

Solution 2: Check for cell-modifying mods
- Settlement mods often modify cells
- These should load AFTER PRP.esp
- Then use patches if available

Solution 3: Check for precombine conflicts
- See "Known Incompatibilities" section
- Some mods inherently conflict with PRP
- May need specific patches or alternate mods
```

**Problem: Mods not working as intended**

```
Solution 1: Verify PRP.esp is loaded
- Open xEdit
- Look for PRP.esp in the list
- If not there: Not loading
- If there but red: Loading error

Solution 2: Check plugin order
- Plugin order must match ESP load order
- If PRP.esp is plugin #12, it should load 12th
- Use xEdit or MO2 to check

Solution 3: Rebuild Bashed Patch or Merged Patch
- Some mods require bashed patches
- Need to rebuild after adding PRP
- See your mod list guide for specifics
```

---

## Patch System

### What Are PRP Patches?

**PRP Patches** are plugins that rebuild mod compatibility against the new PRP foundation.

**Why Needed:**
```
Original Mod:
- Built against vanilla precombines
- Objects placed relative to vanilla foundation
- Works fine with vanilla

Install PRP:
- Foundation changes completely
- Objects now misaligned
- Patch required

PRP Patch:
- Reads original mod's changes
- Rebuilds them for PRP foundation
- Objects properly aligned again
```

### Types of Patches

#### 1. Official PRP Patches

Included in PRP installer or separately maintained:

**Common Official Patches:**
- **PRP-SS2** - Sim Settlements 2
- **PRP-Patches** - Bundle of included patches
- **Expansion patches** - For major mods

**How to Install:**
```
Included in FOMOD:
- Select during installation
- Automatically enabled

Separate download:
- Download patch file separately
- Install like any other mod
- Enable and load after PRP.esp
```

#### 2. External Patches

Maintained by other modders or modding groups:

**Available At:**
- CannibalToast's PRP Patch Compendium (Nexus)
- Individual mod pages (as separate files)
- Collective Modding Discord
- Modding community Discord servers

**How to Install:**
```
1. Find patch for your mod
2. Download patch file
3. Extract to Data folder
4. Enable in mod manager
5. Load order: PRP.esp → [Mod] → [Patch]
```

#### 3. Community Patches

Created by players and shared in Discord/forums:

**Finding Them:**
- Ask in Collective Modding Discord #help
- Search Nexus patch mod pages
- Check mod pages' compatibility section

**Quality varies:** Some tested thoroughly, others experimental

### Load Order for Patches

**Correct Order:**

```
PRP.esp
    ↓
[Original Mod].esp
    ↓
[Original Mod]_PRP_Patch.esp
```

**Why This Order:**
1. PRP sets the new foundation
2. Original mod loads its changes
3. Patch fixes those changes for PRP foundation

**Wrong Order Example:**

```
PRP.esp
    ↓
[Patch].esp  ← Patch applies before original mod!
    ↓
[Original Mod].esp  ← Original mod overwrites patch!
```

### Creating Custom Patches

See "Building Custom Patches" section for advanced users

---

## Known Incompatibilities

### Completely Incompatible Mods

These mods **cannot** be used with PRP at all:

#### 1. Boston FPS Fix

**Why Incompatible:**
- BFF is the ancestor of PRP
- Both try to replace precombines
- Using both = corrupted precombine data

**Symptoms:**
- Crashes on load
- Flickering/missing objects everywhere
- Severe performance issues

**Solution:**
- Remove Boston FPS Fix
- Use PRP instead (better version)

**Note:** Partial backport of BFF exists for older mod lists (if you absolutely need it)

#### 2. Equivalent Precombine Mods

Any mod that claims to replace precombines:

**Examples:**
- Custom precombine packs
- "Performance patch" mods with precombine changes
- Boston-specific precombine mods

**Solution:**
- Use PRP instead
- Remove other precombine mods
- Keep PRP as your only precombine replacement

### Mods Needing Patches

These mods work with PRP **only if you use a patch**:

#### Major Settlement Mods

**Mod Name** | **Patch Available** | **Patch Location**
---|---|---
Sim Settlements 2 | ✅ Yes | Included as PRP-SS2
Nuka World Expansion | ✅ Yes | PRP-Patches
Cambridge Police Station | ✅ Yes | Mod page
Homemaker | ✅ Yes | Mod page
Expanded Settlements | ⚠️ Lite Only | See troubleshooting

#### Quest Mods

**Mod Name** | **Patch Available** | **Notes**
---|---|---
Nuka World Addon Mods | ✅ Yes | Usually included in PRP-Patches
Horizon | ⚠️ Lite Only | Enhanced Settlements incompatible

#### Worldspace Mods

**Mod Name** | **Patch Available** | **Notes**
---|---|---
Commonwealth Restoration Project | ✅ Yes | v7.0+ has auto-compatibility
Overgrowth (The Black Pearl) | ✅ Yes | Needs dedicated patch
Desperados Overhaul | ✅ Yes | v0.3+ maintained by Starhammer

### Partially Incompatible Mods

Some mods have issues that don't completely break PRP:

#### Horizon Mod

**Issue:** Enhanced Settlements addon causes mesh problems

**Solution:**
- Use Lite builds of PRP instead
- OR remove Enhanced Settlements
- OR wait for fix (in development)

#### Commonwealth Restoration Project (CRP)

**Issue:** v6.1 and earlier have conflicting precombine meshes

**Status:**
- v6.1 and earlier: Full incompatibility
- v7.0+: Built with PRP as base
- v7.0+ still needs patches for interactions

**Solution:**
- Upgrade to v7.0 or newer
- Use patches from mod page

#### Desperados Overhaul

**Issue:** v0.2 incompatible, v0.3+ requires patches

**Status:**
- v0.2: Not compatible
- v0.3+: Maintained by Starhammer
- Patches on mod page

**Solution:**
- Update to v0.3 or newer
- Install patches from mod page

### Mods That Don't Conflict

**Safe to Use With PRP:**

- **Texture replacements** - 100% compatible
- **Model replacements** (non-precombine) - Compatible
- **Quest mods** (most) - Check for patch
- **Gameplay mods** - Usually compatible
- **UI mods** - Always compatible
- **Animation mods** - Always compatible
- **Sound mods** - Always compatible

### Known Texture Replacements (Safe)

These texture mods are confirmed to work fine with PRP:

- **HD Texture Pack DLC** - Fully compatible
- **Cathedral Series textures** - Fully compatible
- **RUSTIC textures** - Fully compatible
- **NOBLE textures** - Fully compatible
- **Project Reality textures** - Fully compatible
- Most popular texture mods - Compatible

**Note:** Texture mods modify visual appearance, not precombine data, so they never conflict with PRP

### Avoiding Incompatibilities

**Best Practices:**

1. **Check Mod Pages**
   - Most popular mods list PRP compatibility
   - Read comments for compatibility reports
   - Check requirements section

2. **Use The Midnight Ride or Similar Guides**
   - Modding guides list tested compatible mods
   - They include PRP from the start
   - Curated mod lists designed around PRP

3. **Consult Community Resources**
   - CannibalToast's PRP Patch Compendium
   - Collective Modding Discord
   - Modding community wikis

4. **When in Doubt:**
   - Ask in Collective Modding Discord
   - Include mod list screenshot
   - Ask before installing problematic mods

---

## Troubleshooting Guide

### Flickering and Missing Pieces

**Symptom:** Buildings or areas flicker, textures disappear, pieces appear/disappear

**Possible Causes:**

#### Cause 1: Load Order Issue

**Check:**
1. Is PRP.esp loaded?
   - Open xEdit
   - Look for PRP.esp in plugin list
   - Should be visible without errors

2. Is PRP.esp positioned correctly?
   - Should be near end of load order
   - Should load before most other plugins
   - (Except patches, which load after)

**Fix:**
```
Step 1: Run LOOT
Step 2: Let LOOT sort
Step 3: Review placement
Step 4: Apply sort
```

#### Cause 2: Missing Resources

**Check:**
1. Is PRP folder complete?
   - Should have: Meshes/, Textures/, Misc/
   - Meshes/ should be 2GB+ in size
   - Missing large folders = incomplete install

2. Are DLC files present?
   - Fallout4.esm, DLCRobot.esm, DLCCoast.esm, DLCNukaWorld.esm
   - All should be in Data folder
   - If DLC uninstalled: Will cause issues

**Fix:**
```
Step 1: Verify Fallout 4 files
  - In Steam: Right-click game → Properties → Verify files
  - Wait for completion

Step 2: Reinstall PRP completely
  - Remove current PRP mod
  - Delete PRP folder
  - Download fresh from Nexus
  - Install with all options selected
```

#### Cause 3: Precombine Conflict

**Check:**
1. Do you have Boston FPS Fix enabled?
   - Search mod list for BFF
   - Should not be present

2. Do you have multiple precombine mods?
   - Search for "precombine" in mod list
   - Should only have PRP
   - Remove other precombine mods

3. Do you have patches for conflicting mods?
   - If mod requires patch (see compatibility list)
   - Do you have patch installed?
   - Is patch loading after original mod?

**Fix:**
```
Step 1: Remove conflicting mods
Step 2: Keep only PRP for precombines
Step 3: Verify patches are installed
Step 4: Check load order
Step 5: Reload game
```

#### Cause 4: Cell Modification Conflict

**Check:**
1. Do you have settlement mods?
   - These modify cell precombine data
   - Need patches to work with PRP

2. Do you have worldspace mods?
   - These add new areas
   - Should have PRP patches

3. Are patches loading after PRP?
   - Original mod → Patch order important
   - Patch must load after original mod

**Fix:**
```
Step 1: Install patches for settlement mods
Step 2: Verify load order:
   - PRP.esp
   - [Settlement Mod].esp
   - [Settlement Mod]_PRP_Patch.esp

Step 3: Reload game
```

### Missing Objects or Clipping Issues

**Symptom:** Objects inside buildings, floating structures, misaligned pieces

**Possible Causes:**

#### Cause 1: Mod Placed Objects Against Old Foundation

**Explanation:**
- Mod was built before PRP
- Objects placed relative to old precombine positions
- PRP changes foundation
- Objects now misaligned

**Check:**
1. What mods might modify the affected area?
2. Do those mods have PRP patches available?

**Fix:**
```
Solution 1: Install PRP patch for the mod
  - Find patch for the mod
  - Install it
  - Load order: Mod → Patch

Solution 2: Move PRP in load order
  - Try loading PRP before the conflicting mod
  - Usually worse, but might reduce clipping

Solution 3: Remove conflicting mod
  - Use alternative mod
  - Find version with PRP support
  - Check compatibility lists
```

#### Cause 2: Wrong Game Version

**Check:**
1. Did you select correct version in FOMOD?
   - Anniversary Edition
   - NG (Steam downgrade)
   - OG (GOG/old Steam)

2. Is your game actually that version?
   - Check Fallout 4 launcher

**Fix:**
```
Step 1: Verify game version
Step 2: Check FOMOD selection
Step 3: If wrong version selected:
   - Remove PRP
   - Download correct version
   - Reinstall with correct FOMOD option
```

### Mods Not Working Correctly

**Symptom:** Mod features don't work, items don't appear, quests break

**Possible Causes:**

#### Cause 1: PRP Not Loaded

**Check:**
1. Is PRP enabled in mod manager?
   - Look for checkmark next to PRP
   - Should be checked

2. Is PRP.esp showing in game?
   - Open Fallout 4 launcher
   - Click "Data Files"
   - PRP.esp should be in list and checked

**Fix:**
```
Step 1: Enable PRP in mod manager
Step 2: Restart game launcher
Step 3: Verify PRP.esp appears in Data Files
```

#### Cause 2: Load Order Wrong

**Check:**
1. Is PRP loading before conflicting mod?
   - Some mods conflict with PRP
   - These usually need patches
   - Patches must load after PRP

2. Is the conflicting mod loading before PRP?
   - Check compatibility list
   - Load order might be wrong

**Fix:**
```
Step 1: Use LOOT to sort
Step 2: Review placement:
   - UFO4P → PRP → Other mods
Step 3: Apply sort
```

#### Cause 3: Missing Patch

**Check:**
1. Does the mod have a PRP patch?
   - Check mod page
   - Search Nexus for "[ModName] PRP Patch"
   - Ask in Discord

2. Is the patch installed?
   - Look in mod list
   - Search for "Patch"
   - Should see [ModName]_PRP_Patch

3. Is patch loading in correct order?
   - Mod → Patch order required
   - Patch must load after original

**Fix:**
```
Step 1: Find patch for mod
Step 2: Download patch
Step 3: Install patch
Step 4: Set load order:
   - Original mod
   - Patch
Step 5: Reload game
```

### Crashes or CTDs

**Symptom:** Game crashes on load or in-game

**Possible Causes:**

#### Cause 1: Incompatible Precombine Mod

**Check:**
1. Do you have Boston FPS Fix?
   - Confirmed incompatible with PRP
   - Will cause CTD

2. Do you have other precombine mods?
   - Search mod list for precombine
   - Remove any found

**Fix:**
```
Step 1: Remove Boston FPS Fix
Step 2: Remove any other precombine mods
Step 3: Keep only PRP
Step 4: Delete plugins.txt in Fallout4 folder
Step 5: Restart game launcher
```

#### Cause 2: Missing Masters

**Check:**
1. Is UFO4P installed?
   - PRP requires UFO4P
   - If missing: PRP will fail to load

2. Are DLC files present?
   - All 4 DLC ESMs needed
   - If DLC uninstalled: Causes CTD

**Fix:**
```
Step 1: Install UFO4P
Step 2: Verify DLC installed
   - Check in launcher under Data Files
Step 3: Verify in Load Order:
   - UFO4P.esp present
   - All DLC ESMs present
Step 4: Start game fresh
```

#### Cause 3: Corrupted Plugin

**Check:**
1. Open xEdit
2. Load PRP.esp
3. Look for red error messages
4. If errors: PRP might be corrupted

**Fix:**
```
Step 1: Remove PRP mod
Step 2: Delete PRP folder completely
Step 3: Delete PRP.esp if in Data folder
Step 4: Download PRP again fresh
Step 5: Reinstall clean
```

### Performance Still Bad

**Symptom:** FPS not improved after installing PRP

**Note:** PRP doesn't guarantee FPS improvements everywhere. It typically helps in Boston-area and CPU-limited zones only.

**Possible Causes:**

#### Cause 1: Already GPU Limited

**Explanation:**
- PRP helps with CPU bottlenecks
- If your GPU is the limit, PRP won't help
- Reduce graphics settings instead

**Check:**
1. Monitor CPU/GPU usage in downtown Boston
2. If GPU at 100% and CPU <100%: GPU limited
3. PRP won't help much in this case

**Solution:**
- Reduce resolution
- Lower graphics settings
- Upgrade GPU

#### Cause 2: PRP Not Loaded

**Check:**
1. Is PRP visible in xEdit load order?
2. Are the 2GB+ meshes in your PRP folder?
3. Are there error messages?

**Fix:**
- See "Mods Not Working Correctly" section

#### Cause 3: PRP Disabled or Broken

**Check:**
1. Is PRP checked in Data Files?
2. Is PRP.esp appearing in game?
3. Any red errors in xEdit?

**Fix:**
- Re-enable PRP
- Verify complete installation
- Reinstall if necessary

#### Cause 4: Different Game Areas

**Explanation:**
- PRP helps most in Boston Commons, Downtown Boston, Financial District
- Other areas see 0-5% variance
- If playing elsewhere, might not see improvement

**Note:**
- PRP still helps even if not noticeable
- Consistent frame times improve (smoother gameplay)
- Even small improvements add up

---

## Performance and Expectations

### Realistic Performance Improvements

**Boston Downtown Area:**
- Before PRP: 35-60 FPS (CPU limited)
- After PRP: 40-75 FPS (30-40% improvement)
- Gain: 5-15 FPS improvement

**Boston Commons:**
- Before PRP: 30-50 FPS (CPU limited)
- After PRP: 35-65 FPS (20-30% improvement)
- Gain: 5-15 FPS improvement

**Financial District:**
- Before PRP: 25-45 FPS (CPU limited)
- After PRP: 30-55 FPS (20-30% improvement)
- Gain: 5-15 FPS improvement

**Most Other Areas:**
- Before PRP: 45-90 FPS
- After PRP: 46-92 FPS (2-5% improvement)
- Gain: 0-5 FPS improvement

**Interior Cells (Vaults, Dungeons, Buildings):**
- Before PRP: Usually 60+ FPS
- After PRP: Usually 60+ FPS (minimal change)
- Gain: Usually 0-2 FPS improvement

### Why Not More Improvement?

**Reason 1: Different Bottlenecks**

```
Boston Downtown (CPU Limited):
- PRP reduces draw calls
- CPU work decreases
- Performance improves

Green areas (GPU Limited):
- GPU already at full usage
- CPU improvement doesn't help
- GPU must improve instead
```

**Reason 2: Only Precombines Affected**

```
PRP optimizes:
- Precombined mesh rendering
- Visibility culling
- Draw call reduction

PRP doesn't optimize:
- Physics calculations (still same)
- NPC AI (still same)
- Lighting calculations (mostly same)
- Dialogue/quests (not affected)
```

**Reason 3: Game Design**

```
Fallout 4's performance is limited by:
1. Physics engine (heavy)
2. AI system (expensive)
3. Draw calls (what PRP helps)
4. Dialogue system (heavy)

PRP addresses #3, but #1, #2, and #4 still limit FPS
```

### Frame Time Consistency

Even if FPS doesn't increase dramatically, PRP improves **frame time consistency**.

**Example:**
```
Before PRP:
- Average FPS: 50
- Range: 30-65 FPS (highly variable)
- Feels: Stuttery, inconsistent

After PRP:
- Average FPS: 52
- Range: 48-56 FPS (very consistent)
- Feels: Smooth, consistent
```

Consistent frame times feel smoother than higher but variable FPS.

### File Size Explanation

Many players ask why PRP is 2.3GB when the original precombines were larger.

**Why So Large?**

Original game precombines:
- Full uncompressed: ~24GB
- Compressed in game: ~1.5GB

PRP precombines:
- Full uncompressed: ~2GB (better compression)
- Compressed in mod: ~2.3GB (loose files)
- Visibility data: ~1.5GB

**Why Loose Files Larger Than Compressed?**

```
Game Archive:
- Compressed: 1.5GB
- Decompressed in memory: 24GB

Mod Files:
- Loose files: 2.3GB (uncompressed)
- Use in game: 2.3GB (already uncompressed)

Loose files are larger because:
1. No compression applied to loose files
2. But smaller than original uncompressed
3. Better compression algorithm than Bethesda's
4. Visibility files add additional size
```

### CPU Requirements

PRP slightly increases CPU requirements at load time:

**Loading Game:**
- Additional processing needed to load PRP data
- Usually adds 5-10 seconds to load time
- One-time cost per game start

**In-Game:**
- CPU load reduced (fewer draw calls)
- Usually offsetting the initial load cost
- Net benefit once in-game

**Stuttering on Load:**
- First time entering Boston areas: slight stutter
- Precombine data being loaded
- Normal, not a problem
- Only happens once per game session

---

## Advanced Topics

### Understanding Precombine Architecture

**Precombine Creation Process:**

```
Step 1: Identify Object Clusters
- Find groups of nearby objects
- Typically 30-100 objects per cluster
- Objects within proximity grouped

Step 2: Merge Meshes
- Combine individual meshes
- Create single merged mesh
- Maintain material separation

Step 3: Optimize Geometry
- Remove internal faces (not visible)
- Reduce polygon count where possible
- Balance quality with size

Step 4: Create Collision Data
- Generate collision mesh
- Allow player interaction
- Test clipping/physics
```

**Why It's Complex:**

Every object in a cell has properties:
```
Object Properties:
- Position (X, Y, Z)
- Rotation (X, Y, Z)
- Scale (X, Y, Z)
- Visibility flags
- Collision settings
- Reference data
- Enabled/disabled state
- Parent relationships
```

Changing one property affects precombines because precombines bake object positions into merged meshes.

### Previs Explanation

**Previs (Precombined Visibility) Data:**

Stored information about object visibility from different cell vantage points.

**Example:**
```
From point X in cell (standing at door):
- Building outside: Not visible (blocked by wall)
- Room interior: Visible (can see it)
- Far exterior: Not visible (too far, occluded)

Previs file contains thousands of these calculations
Game uses previs to skip rendering non-visible objects
```

**Why It Matters:**

Without previs:
```
GPU renders: All 50,000 objects in region
- Even if most are blocked from view
- Result: Terrible performance
```

With previs:
```
GPU renders: 3,000 visible objects
- Occluded objects skipped
- Result: Good performance
```

**Why PRP Recreates It:**

```
Original game previs:
- Created with early tools
- Incomplete in many areas
- Many objects shouldn't be visible but are

PRP previs:
- Created with modern tools
- Complete recalculation
- Accurately reflects visibility
```

### Mesh Format Details

**NIF Format (Nif Interchange Format):**

Fallout 4 meshes use Nif format with specific structure:

```
Mesh File (.NIF):
├── Header (version, data info)
├── Block 1: NiNode (object hierarchy)
├── Block 2: NiTriShape (mesh geometry)
├── Block 3: NiBSShaderProperty (material)
├── Block 4: BSLightingShaderProperty (lighting)
└── Block 5-N: Additional data
```

**Precombine Specific Blocks:**

```
Precombine Mesh:
├── Root NiNode (container)
├── Material Groups (organized by texture)
│  ├── Material A (collection of meshes)
│  └── Material B (collection of meshes)
├── Collision data
└── Extra metadata
```

**Why Precombines Are Large:**

```
Example Building (50 objects):
- Individual: 50 small mesh files = 500KB total
- Precombine: 1 merged mesh = 2-5MB

Multiplied across game:
- 50,000 individual objects = ~500MB
- Precombine merged: 2GB (includes extras)
  
But saves on rendering:
- Rendering 50 meshes: Expensive
- Rendering 1 mesh: Cheap
- Savings in GPU time make up for file size
```

### Cell Record Structure

**How Precombines Stored:**

Precombine data embedded in CELL record:

```
CELL Record:
├── Cell Info
│  ├── Location (X, Y grid)
│  ├── Water level
│  ├── Ambient light
│  └── [Other cell properties]
├── Precombine Data
│  ├── Precombine FormID (mesh reference)
│  ├── Transform data
│  ├── Visibility file reference
│  └── Additional flags
└── References
   ├── NPC (FormID, position, rotation)
   ├── Item (FormID, position)
   └── [Other references]
```

**Why It's in Cell Header:**

```
Performance Reason:
- Precombine applies to entire cell
- Cell header loaded first
- Precombine immediately available
- Game doesn't wait to find it

Compatibility Issue:
- Any mod changing cell header affects precombine
- Any precombine change affects cell compatibility
- Mods built before change break
- Patches required to rebuild
```

### Conflict Resolution Process

**When Two Mods Conflict:**

```
Original Game (Bethesda):
- Precombine Mesh v1
- All objects positioned for v1
- Works perfectly

PRP (New Precombines):
- Precombine Mesh v2 (improved)
- Foundation completely different

Mod A (Built for original):
- Adds objects expecting v1
- Objects positioned for v1 foundation

Conflict:
- Mod A objects positioned for v1
- But foundation is now v2
- Objects are misaligned

PRP Patch for Mod A:
- Takes Mod A's changes
- Repositions for v2 foundation
- Objects now aligned correctly
```

### Advanced Load Order Considerations

**Cascade Effect:**

```
When multiple mods modify same cells:

Mod A → Precombine A
Mod B → Precombine B
Mod A + B → Precombine ???

The game doesn't know how to combine them
Each patch must be separate:

Load Order Options:

Option 1: Separate cells
- Mod A affects cells 1-10
- Mod B affects cells 11-20
- No conflict, no patch needed

Option 2: Same cells, different objects
- Mod A modifies object X
- Mod B modifies object Y
- Might need patch for interaction

Option 3: Same cells, same objects
- Both mods modify object X
- Whichever loads last wins
- Other mod's changes ignored
```

---

## FAQ

### General Questions

**Q: Do I need PRP?**

A: If you're playing Fallout 4, yes. PRP is essentially required for modern modding. Almost every mod list includes it, and it's required for proper precombine function.

**Q: Will PRP work with my mod list?**

A: Probably yes, but you might need patches for certain mods. Check:
1. Your mod pages for PRP patches
2. CannibalToast's patch compendium
3. Collective Modding Discord

**Q: How much FPS will I gain?**

A: Realistic expectations:
- Boston areas: 5-15 FPS improvement
- Most other areas: 0-5 FPS improvement
- Interior cells: Usually 0-2 FPS improvement
- Not guaranteed in GPU-limited scenarios

**Q: Is PRP compatible with Survival Mode?**

A: Yes, completely compatible. PRP doesn't affect gameplay, only precombines.

**Q: Do I need to clean PRP.esp?**

A: No, never clean PRP.esp. It's built correctly and cleaning breaks it. Clean other plugins only.

**Q: Should I clean the DLC files?**

A: No. PRP was built with uncleaned DLC files. Cleaning them can cause unexpected behavior with PRP's precombines.

### Installation Questions

**Q: Where do I download PRP?**

A: Nexus Mods - search "Precombines Repair Pack" by Starhammer

**Q: Which version do I download?**

A: Select your game version:
- Anniversary Edition (AE) - If you own 2023+ version
- NG - If you downgraded Steam
- OG - If using GOG or very old Steam

**Q: Do I need the plugins update package?**

A: Optional. Main package includes everything. Update package has:
- Latest patches
- Translations
- Optional plugins
- Gets updated faster than main

**Q: Can I install PRP manually without FOMOD?**

A: Technically yes, but you'll need to manually select which optional files to keep. Use mod manager instead - much easier.

**Q: How long does installation take?**

A: About 5-10 minutes depending on drive speed. PRP is 2.3GB, so expect time for extraction.

### Compatibility Questions

**Q: Is PRP compatible with [specific mod]?**

A: Check these resources:
1. Mod page - Usually lists PRP compatibility
2. CannibalToast's Patch Compendium - Huge list of patches
3. Collective Modding Discord - Ask in #help
4. LOOT - Has rules for many PRP-conflicting mods

**Q: Why does my mod not work with PRP?**

A: Usually needs a patch. Solutions:
1. Find official patch (check mod page)
2. Find community patch (Nexus search)
3. Get from Compendium (CannibalToast's)
4. Ask community for patch
5. Create patch yourself (see advanced section)

**Q: Can I use Boston FPS Fix with PRP?**

A: No, absolutely not. Boston FPS Fix is incompatible with PRP. Use PRP instead - it's the improved version.

**Q: Are texture mods compatible?**

A: Yes, 100% compatible. Texture mods replace textures, not precombines. They never conflict with PRP.

**Q: Are animation mods compatible?**

A: Yes, 100% compatible. Animation mods don't affect precombines.

**Q: Are gameplay mods compatible?**

A: Usually yes, unless they modify precombine-related objects. Check mod page for PRP compatibility notes.

### Troubleshooting Questions

**Q: Why am I seeing flickering textures?**

A: Usually a load order issue. See "Troubleshooting Guide" section. Quick fix:
1. Run LOOT
2. Let LOOT sort your load order
3. Verify PRP.esp loads
4. Reload game

**Q: Why are objects clipping into each other?**

A: Likely a mod needs a PRP patch. The mod was built for the old foundation. Solutions:
1. Find and install patch for mod
2. Remove conflicting mod
3. Move PRP later in load order (sometimes helps)

**Q: Why isn't PRP loaded?**

A: Several possibilities:
1. Not enabled in mod manager - Enable it
2. Installation incomplete - Reinstall
3. UFO4P missing - Install UFO4P first
4. Load order issue - Run LOOT to sort

**Q: Why do I have performance issues with PRP?**

A: PRP doesn't guarantee FPS everywhere. Verify:
1. PRP is actually loaded - Check xEdit
2. PRP is in correct load order - Run LOOT
3. You're in a CPU-limited area - Boston downtown
4. GPU isn't already maxed - Monitor usage

**Q: The game crashes when I try to load**

A: Check for incompatible mods:
1. Boston FPS Fix - Remove this
2. Other precombine mods - Remove these
3. Missing masters - Install UFO4P, verify DLC
4. Corrupted PRP - Reinstall fresh

### Advanced Questions

**Q: Can I build custom patches?**

A: Yes! See "Building Custom Patches" section. Requires:
- PJM's script package
- Understanding of precombines
- xEdit knowledge
- Testing capability

**Q: What tools are used to create PRP?**

A: Combination of:
1. xEdit (for plugin/record editing)
2. Creation Kit (for precombine generation)
3. PJM's scripts (for automation)
4. Custom tools (for mesh optimization)
5. Previs generation tools (proprietary)

**Q: Why are there so many patches needed?**

A: It's a spanning tree problem. Every combination of mods potentially needs verification. See "Technical Background" section for details.

**Q: Can the file size be reduced?**

A: Unlikely. Modern compression already at limits:
- Original: 24GB uncompressed
- Compressed by game: 1.5GB
- Better compression: 2GB
- But precombines + visibility: 3.5GB total

Further reduction would require:
- Sacrificing quality
- Runtime generation (needs 64GB RAM)
- Proprietary compression (not feasible)

**Q: How often is PRP updated?**

A: Varies by version:
- PRP Stable: Monthly-ish (when significant fixes accumulated)
- PRP Unstable: More frequently (experimental fixes)
- Patches: As needed (when new mods added)

**Q: Do I need to rebuild my save if I update PRP?**

A: No, PRP doesn't affect save games. Safe to update anytime. Just:
1. Update PRP
2. Load game
3. Play normally

---

## Building Custom Patches

### Requirements

**Tools Needed:**
1. **PJM's Precombine Script Package** - Get from PJM's mod page
2. **xEdit** - Latest version
3. **Fallout 4 Creation Kit** - Installation required
4. **Precombine knowledge** - Understanding from this guide

**System Requirements:**
- RAM: 8GB minimum (16GB recommended)
- Disk space: 10GB free (for generation)
- CPU: Multi-core (generation is multi-threaded)
- Time: 2-8 hours per patch (depending on scope)

### Basic Patch Creation Process

**Step 1: Analyze Conflicts**

```
1. Identify which cells are modified by both mods
2. Find precombine conflicts
3. Determine scope of patch needed
```

**Step 2: Create Patch Plugin**

```
1. Create new ESP file
2. Make it depend on both mods
3. Load original mod + PRP in CK
4. Rebuild precombines for affected cells
```

**Step 3: Export Precombine Data**

```
1. Use PJM's scripts to export precombine info
2. Document changes made
3. Verify data integrity
```

**Step 4: Test Patch**

```
1. Install patch in test load order:
   - PRP.esp
   - Original Mod.esp
   - Patch.esp

2. Load game in affected cells
3. Check for:
   - Clipping
   - Flickering
   - Missing objects
   - Performance issues

4. Iterate if problems found
```

### Advanced: Runtime Generation

**What It Is:**
Using Creation Kit to generate precombines on-the-fly when patching.

**Advantages:**
- Exact compatibility
- No pre-computed files needed
- Automatic updates

**Disadvantages:**
- Requires 64GB+ RAM
- Takes 4-8 hours per patch
- Needs powerful CPU
- Not practical for most users

**How It Works:**

```
1. Load original plugin in CK
2. Load PRP modifications
3. Load mod to patch
4. Select cells to regenerate
5. Run generation script
6. Generation creates new precombines
7. CK packages results as ESP
8. Export as patch
```

### Sharing Patches

**Once Created:**

1. **Test thoroughly** - Play for hours, test all areas
2. **Document changes** - List what you modified
3. **Create mod page** - Post on Nexus with clear instructions
4. **Get feedback** - Collect reports, fix issues
5. **Maintain patch** - Update as mods are updated

**Mod Page Info:**
```
Title: [ModName] PRP Patch
Description: Compatibility patch for [ModName] with PRP

Requirements:
- PRP.esp
- [ModName].esp
- Load order: PRP → [ModName] → Patch

Installation:
1. Download patch
2. Extract to Data folder
3. Enable in mod manager
4. Load after original mod

Version: 1.0
Compatibility: PRP 100+
```

---

## Alternatives and Comparisons

### Boston FPS Fix (Boston FPS Fix)

**What It Is:** Ancestor of PRP, precombine optimization for Boston area

**Comparison:**

| Feature | Boston FPS Fix | PRP |
|---------|---|---|
| Coverage | Boston only | Entire game |
| Quality | Good (2017) | Excellent (2024) |
| Compatibility | Some | Extensive patches |
| File Size | 600MB | 2.3GB |
| Performance | +5-10 FPS | +5-15 FPS |
| Status | Deprecated | Active |
| Recommendation | ❌ Don't use | ✅ Use PRP |

**Note:** Partial backport of Boston FPS Fix exists for compatibility with old mod lists, but PRP is superior.

### No Precombine Replacement

**What If I Don't Use PRP?**

```
Fallout 4 still uses original precombines:
- Less optimized
- Placement errors remain
- Missing objects in some areas
- Lower FPS in Boston downtown
- More mod conflicts

Essentially playing with original precombine issues.
```

**Not Recommended Because:**
- Performance suffers in key areas
- Many mods don't work without patches for original precombines
- Modern mod lists assume PRP
- Fixes problems you'll notice

### Other Optimization Mods (Complementary)

These don't replace PRP but complement it:

**ENB/ReShade Optimizations:**
- Reduces draw calls from effects
- Complements PRP nicely
- Recommended for further optimization

**Occlusion Culling Mods:**
- Some focus on additional culling
- Beyond what PRP provides
- Can stack with PRP

**Physics Optimization:**
- Reduces physics calculations
- Separate from precombine optimization
- Often used alongside PRP

### The Midnight Ride Comparison

**The Midnight Ride** is a modding guide that includes PRP from the start.

**Comparison:**

| Aspect | PRP Standalone | Midnight Ride |
|--------|---|---|
| PRP Included | Yes | Yes |
| Additional mods | Your choice | Curated list |
| Setup time | Quick | Medium |
| Learning curve | Steep | Gentle |
| Customization | Full | Limited |
| Result | Depends on choices | Balanced, tested |

**When to Use Each:**
- **PRP Standalone:** Existing mod list, adding PRP
- **Midnight Ride:** Starting fresh, need guidance

---

## Quick Start Guide

### For Impatient Users

**Minimal Instructions:**

1. **Download:** Nexus Mods - Precombines Repair Pack (your game version)
2. **Install:** Add to mod manager
3. **FOMOD:** Select game version, click Install
4. **Load Order:** Move PRP.esp near end (LOOT handles this)
5. **Verify:** Open xEdit, PRP.esp should load without errors
6. **Play:** Launch game normally

**If Flickering Appears:**
1. Run LOOT
2. Let it sort
3. Reload game

**If Mods Break:**
1. Search for "[ModName] PRP Patch"
2. Install if found
3. Load after original mod

---

## Resources and Links

### Essential Resources

- **Nexus Mods** - Precombines Repair Pack - Download
- **CannibalToast's PRP Patch Compendium** - 100+ patches
- **Collective Modding Discord** - Official support
- **The Midnight Ride** - Full modding guide

### Script Resources

- **PJM's Script Package** - Precombine generation scripts
- **PJM Article** - Patch creation guide

### Community Locations

- **Collective Modding Discord** - #help channel
- **Nexus Forums** - Discussion and reports
- **Modding Community Discords** - Various support channels

---

## Glossary

**Precombine:** Pre-combined mesh; multiple objects merged into single mesh

**Previs:** Precombined visibility data; occlusion information

**Draw Call:** GPU instruction to render objects; fewer = better performance

**Occlude/Occlusion:** Hide/hiding (objects not visible are occluded)

**Cell:** Region of game world (both interior and exterior)

**Master File:** ESM file (Fallout4.esm, DLC files)

**Plugin:** ESP file (mod file)

**FormID:** Unique identifier for game object

**ESL Flag:** Flag making plugin not count toward 255 limit

**Load Order:** Order plugins are loaded into memory

**Patch:** Plugin that fixes compatibility between mods

**Spanning Tree Problem:** Cascading dependency issue with multiple mods

**NIF:** Nif Interchange Format; mesh file format

**FOMOD:** Fallout Mod Organizer; installer system

---

## Conclusion

PRP is essential for modern Fallout 4 modding. This guide covers:

✅ What PRP does and why it's needed
✅ How to install it properly
✅ How to ensure compatibility
✅ Troubleshooting common issues
✅ Understanding precombines and previs
✅ Creating custom patches (advanced)

**Remember:**
- Install PRP before most other mods
- Load it near end of plugin order
- Install patches for incompatible mods
- Run LOOT to verify load order
- Expect 5-15 FPS improvement in Boston downtown
- Enjoy smooth, optimized gameplay!

---

## Changelog

**Version 1.0** - January 2026
- Complete initial guide
- All sections documented
- 50+ FAQ answers
- Troubleshooting for common issues
- Advanced topics covered

**Future Updates:**
- PRP 110+ updates
- New patch compendium entries
- Community feedback integration
- Extended compatibility database

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Compatible with:** PRP 81+, Anniversary Edition  
**Maintained by:** Community Documentation