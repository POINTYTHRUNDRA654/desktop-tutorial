# Nexus Mods vs. Bethesda.net: Complete Modding Guide for Fallout 4

## Overview

Fallout 4 mods can be distributed through two primary platforms, each with **vastly different** requirements, limitations, and audiences:

1. **Nexus Mods** - Community-driven, PC-focused, feature-rich
2. **Bethesda.net** - Official platform, console-compatible, restricted

Understanding these differences is **critical** for mod developers to avoid wasted effort, rejection, or broken mods.

---

## Quick Comparison Table

| Feature | Nexus Mods | Bethesda.net |
|---------|------------|--------------|
| **File Size Limit** | Essentially unlimited (practical: ~50GB) | **2GB** (console), **5GB** (PC) |
| **External Dependencies** | ✅ Allowed (F4SE, MCM, etc.) | ❌ **Forbidden** |
| **Script Extender** | ✅ F4SE fully supported | ❌ **Not allowed** |
| **Adult Content** | ✅ Allowed (with warning) | ❌ **Forbidden** |
| **Asset Types** | ✅ All types supported | ⚠️ Limited by console hardware |
| **Mod Configuration Menu** | ✅ MCM fully supported | ❌ Not available |
| **External Executables** | ✅ Allowed (FNIS, BodySlide, etc.) | ❌ **Forbidden** |
| **Loose Files** | ✅ Allowed and common | ⚠️ Discouraged (use BA2 archives) |
| **Master File Dependencies** | ✅ Any mod can be a master | ⚠️ Only official DLCs + Bethesda.net mods |
| **Target Audience** | PC gamers (modding-savvy) | **Console + PC** (casual users) |
| **Update Frequency** | ✅ Unlimited, instant | ⚠️ Rate-limited by Bethesda review |
| **Quality Control** | ❌ None (community feedback) | ✅ **Bethesda review process** |
| **Revenue Sharing** | ❌ No built-in monetization | ⚠️ Creation Club only |
| **Load Order** | Manual + tools (LOOT, Vortex) | Automatic (limited control) |
| **Console Compatibility** | N/A (PC only) | **Must work on Xbox/PS4** |

---

## Platform-Specific Requirements

### Nexus Mods Requirements

#### What's Allowed:
- ✅ **F4SE (Fallout 4 Script Extender)** - Advanced scripting features
- ✅ **MCM (Mod Configuration Menu)** - In-game mod settings
- ✅ **External tools** - BodySlide, Outfit Studio, FNIS, etc.
- ✅ **Large texture sizes** - 4K, 8K textures common
- ✅ **Complex scripts** - No performance limits beyond common sense
- ✅ **Loose files** - Direct file installation in Data folder
- ✅ **Third-party masters** - Depend on other community mods
- ✅ **Adult content** - Allowed with proper tags/warnings
- ✅ **Replacers** - Total conversions, asset replacements
- ✅ **ENB integration** - Post-processing effects
- ✅ **Custom executables** - xEdit scripts, automation tools
- ✅ **DLL injection** - Memory editing, code patching

#### Best Practices:
- Use **Mod Organizer 2** or **Vortex** as reference
- Provide **detailed installation instructions**
- Include **compatibility patches** for popular mods
- Offer **FOMOD installer** for complex installations
- Document **load order requirements**
- Specify **F4SE version** if applicable
- List **all required masters** clearly
- Use **semantic versioning** (v1.2.3)

#### File Structure (Nexus):
```
MyMod/
├── Data/
│   ├── MyMod.esp (plugin file)
│   ├── MyMod - Main.ba2 (textures/meshes archive)
│   ├── MyMod - Textures.ba2 (texture archive)
│   ├── Scripts/ (loose Papyrus scripts)
│   │   ├── MyModScript.pex
│   │   └── MyModQuest.pex
│   ├── F4SE/
│   │   └── Plugins/
│   │       └── MyMod.dll (F4SE plugin)
│   ├── MCM/
│   │   └── Config/
│   │       └── MyMod/
│   │           └── settings.ini
│   └── Meshes/
│       └── MyMod/ (loose mesh files)
├── fomod/
│   ├── info.xml (FOMOD installer)
│   └── ModuleConfig.xml
├── Docs/
│   ├── README.txt
│   └── Changelog.txt
└── Tools/ (optional)
    └── BodySlide presets, etc.
```

---

### Bethesda.net Requirements

#### Critical Restrictions:
- ❌ **NO F4SE** - Mods using Script Extender will be rejected
- ❌ **NO MCM** - Requires F4SE, therefore forbidden
- ❌ **NO external dependencies** - Must be 100% self-contained
- ❌ **NO adult content** - Nudity, sexual content, extreme gore
- ❌ **NO copyrighted content** - Licensed music, trademarked assets
- ❌ **NO external tools** - Everything must work out-of-the-box
- ❌ **NO loose files** - Everything must be in BA2 archives
- ❌ **NO DLL files** - Code injection forbidden
- ❌ **NO offensive content** - Hate speech, extremism, etc.

#### What IS Allowed:
- ✅ **Vanilla scripts** - Base Papyrus only, no extensions
- ✅ **Official DLC dependencies** - Far Harbor, Nuka-World, etc.
- ✅ **Other Bethesda.net mods** - Can depend on approved mods
- ✅ **BA2 archives** - Required for textures, meshes, sounds
- ✅ **ESP/ESM plugins** - Standard Creation Kit formats
- ✅ **Holotapes** - In-game configuration via terminals
- ✅ **Settlement objects** - Workshop items, decorations
- ✅ **Weapons & armor** - New items, modifications
- ✅ **Quests** - Story content, radiant quests
- ✅ **World spaces** - Custom locations, interiors

#### File Size Limits (CRITICAL):
- **Xbox One:** 2GB maximum (combined mod space)
- **Xbox Series X/S:** 5GB maximum
- **PlayStation 4:** 2GB maximum + **NO EXTERNAL ASSETS**
- **PlayStation 5:** 2GB maximum + **NO EXTERNAL ASSETS**
- **PC (Bethesda.net):** 5GB per mod

**PS4/PS5 Special Restriction:**
- **NO new textures, meshes, or sounds**
- Can ONLY modify ESP/ESM files
- Must use only vanilla game assets
- Extremely limited compared to Xbox/PC

#### Best Practices:
- **Compress textures** aggressively (BC7/DXT5)
- **Optimize meshes** - Remove unnecessary vertices
- **Use BA2 archives** - Required, no loose files
- **Test on console** if possible (Xbox dev mode)
- **Avoid script-heavy mods** - Console performance limited
- **Minimize plugin size** - Reduce form IDs where possible
- **Use holotapes** for configuration instead of MCM
- **Self-contained assets** - Include everything in BA2
- **Clear descriptions** - Users may be new to modding
- **Conservative edits** - Don't touch vanilla records unnecessarily

#### File Structure (Bethesda.net):
```
MyMod/
├── MyMod.esp (plugin file only)
├── MyMod - Main.ba2 (ALL assets archived)
└── MyMod - Textures.ba2 (texture archive)

NO LOOSE FILES ALLOWED
NO F4SE FOLDER
NO EXTERNAL DEPENDENCIES
```

---

## Development Workflow Differences

### For Nexus Mods:

1. **Use F4SE freely** - Advanced features available
2. **Implement MCM** - User-friendly configuration
3. **Script freely** - Use all Papyrus features + F4SE extensions
4. **Provide installers** - FOMOD, manual options
5. **Iterate quickly** - Upload updates anytime
6. **Assume knowledge** - Users understand load order, mod managers
7. **Compatibility patches** - Common for complex mods
8. **Performance optional** - Users choose their own limits

```papyrus
; Nexus: F4SE script example (ALLOWED)
ScriptName MyF4SEScript extends Quest

import F4SE
import F4SE:UI

Function ShowNotification(string msg)
    Debug.Notification(msg)
    UI.OpenMenu("PipBoyMenu") ; F4SE function
EndFunction
```

### For Bethesda.net:

1. **Vanilla Papyrus only** - No F4SE functions
2. **Holotape config** - Terminals, buttons, messages
3. **Simplify scripts** - Minimize performance impact
4. **Archive everything** - Use BA2 creation tool
5. **Test thoroughly** - Bethesda review takes time
6. **Assume beginners** - Clear, simple instructions
7. **Self-contained** - No external mod dependencies
8. **Performance critical** - Must work on base Xbox One

```papyrus
; Bethesda.net: Vanilla script (REQUIRED)
ScriptName MyVanillaScript extends Quest

Function ShowNotification(string msg)
    Debug.Notification(msg)
    ; No F4SE functions allowed
EndFunction
```

---

## Common Pitfalls & Rejection Reasons

### Bethesda.net Rejections:

1. **F4SE dependency detected** - Most common rejection
   - Mod uses F4SE DLLs
   - Scripts call F4SE functions
   - MCM config files present

2. **File size exceeded** - Second most common
   - Uncompressed textures
   - Redundant assets
   - Poor BA2 compression

3. **External dependencies** - Auto-rejection
   - Requires Nexus-only mods
   - References non-existent masters
   - Needs external tools to function

4. **Adult content** - Immediate rejection + account warning
   - Nudity, sexual content
   - Extreme violence/gore
   - Drug glorification

5. **Copyrighted content** - Legal issues
   - Real-world brand names
   - Licensed music
   - Movie/TV characters

6. **Loose files** - Technical rejection
   - Files not archived in BA2
   - Scripts not compiled
   - Missing archive

7. **Poor performance** - Console testing failure
   - Excessive script load
   - Too many dynamic objects
   - Memory-intensive operations

8. **Broken functionality** - QA failure
   - Crashes on load
   - Quest breaks
   - Save corruption

### Nexus Mods Issues (Less Strict):

1. **Unclear instructions** - User complaints
2. **Missing masters** - Install failures
3. **Compatibility issues** - Mod conflicts
4. **Performance problems** - User hardware varies
5. **Update breaks saves** - Version control needed

---

## Technical Specifications

### BA2 Archive Creation

**For Nexus Mods (Optional but Recommended):**
```bash
# Use Archive2.exe (Creation Kit tool)
Archive2.exe MyMod-Main.ba2 -create=MyModFiles.txt -format=General -compress
Archive2.exe MyMod-Textures.ba2 -create=TextureFiles.txt -format=DDS -compress
```

**For Bethesda.net (REQUIRED):**
```bash
# Must use BA2 archives, highly compressed
Archive2.exe MyMod-Main.ba2 -create=AllAssets.txt -format=General -compress -shareData
Archive2.exe MyMod-Textures.ba2 -create=Textures.txt -format=DDS -compress

# Verify file size
# Xbox: Must be < 2GB total
# PC: Must be < 5GB per mod
```

### Texture Compression

**Nexus Mods:**
- 4K textures common (4096x4096)
- BC7 compression (best quality)
- DXT5 for alpha channels
- Normal maps: BC5/BC7

**Bethesda.net:**
- 2K textures maximum recommended (2048x2048)
- 1K for most assets (1024x1024)
- Aggressive BC7 compression
- Reduce mipmap levels
- Consider 512x512 for performance

### Script Performance

**Nexus Mods:**
```papyrus
; Complex operations acceptable
Event OnCellLoad()
    ; F4SE functions allowed
    Int i = 0
    While i < 1000
        ; Intensive operations OK for PC
        ProcessComplexLogic(i)
        i += 1
    EndWhile
EndEvent
```

**Bethesda.net:**
```papyrus
; Must be lightweight
Event OnCellLoad()
    ; Keep it simple for consoles
    If ShouldProcess()
        DoSimpleOperation()
    EndIf
    ; Avoid loops, heavy processing
EndEvent
```

---

## Platform-Specific Features

### Nexus Exclusive Features:

1. **Mod Configuration Menu (MCM)**
   - Sliders, toggles, keybinds
   - Real-time configuration
   - Save/load profiles

2. **F4SE Functions**
   - Memory manipulation
   - UI extensions
   - Engine hooks
   - Advanced inventory management

3. **Third-Party Dependencies**
   - Armor Keywords Community Resource (AWKCR)
   - Armor and Weapon Keywords Community Resource
   - Settlement Keywords Framework
   - Complex cross-mod integrations

4. **ENB/ReShade Integration**
   - Custom shaders
   - Post-processing effects
   - Weather synchronization

5. **xEdit Scripting**
   - Automated patching
   - Conflict resolution
   - Mass record editing

### Bethesda.net Features:

1. **Holotape Configuration**
   - In-game terminal menus
   - Button-based settings
   - Message prompts
   - Limited but functional

2. **Official Integration**
   - Automatic updates
   - Cloud save compatibility
   - Achievement support (if flagged)
   - Console accessibility

3. **Simplified Installation**
   - One-click install
   - Automatic load order
   - No external tools needed
   - User-friendly for beginners

---

## Testing Requirements

### Nexus Mods Testing:

- ✅ Test with Mod Organizer 2
- ✅ Test with Vortex
- ✅ Test with manual installation
- ✅ Test with common mod combinations
- ✅ Test F4SE functionality
- ✅ Test MCM integration
- ⚠️ Console testing not required

### Bethesda.net Testing (CRITICAL):

- ✅ Test on PC **without F4SE**
- ✅ Test load time (should be fast)
- ✅ Test with only vanilla game + DLCs
- ✅ Verify BA2 archives load correctly
- ✅ Test holotape configuration
- ✅ Check file size (must be under limit)
- ✅ **Ideally test on actual Xbox console**
- ✅ Test script performance (no lag)
- ✅ Verify no loose files
- ✅ Test with achievement tracking

---

## Porting Between Platforms

### Nexus → Bethesda.net (Difficult):

**Major Changes Required:**

1. **Remove F4SE completely**
   - Delete F4SE scripts
   - Remove F4SE DLL files
   - Rewrite scripts using vanilla Papyrus only
   - Remove MCM integration

2. **Replace MCM with Holotapes**
   ```papyrus
   ; OLD (Nexus - MCM):
   MCM.SetModSettingInt("MyMod", "iDamage", 50)
   
   ; NEW (Bethesda.net - Holotape):
   MyModQuest.DamageSetting = 50
   Debug.Notification("Damage set to 50")
   ```

3. **Archive all assets**
   - Create BA2 archives
   - Remove loose files
   - Compress textures
   - Verify file size

4. **Remove external dependencies**
   - Include all assets directly
   - Remove master requirements (except official DLCs)
   - Self-contain everything

5. **Simplify scripts**
   - Remove complex loops
   - Reduce processing
   - Optimize for console performance

6. **Content audit**
   - Remove adult content
   - Check for copyrighted material
   - Ensure family-friendly

**Feasibility Check:**
- ✅ Simple mods (items, settlements): Easy to port
- ⚠️ Medium complexity (quests, scripts): Moderate difficulty
- ❌ F4SE-dependent mods: **Cannot be ported** (must rewrite)

### Bethesda.net → Nexus (Easy):

**Minimal Changes:**

1. **Unpack BA2 archives** (optional)
   - Extract to loose files if desired
   - Users prefer loose files for conflict resolution

2. **Add optional features**
   - Create MCM integration (recommended)
   - Add F4SE enhancements (optional)
   - Provide FOMOD installer

3. **Expand capabilities**
   - Remove self-imposed limitations
   - Increase texture quality
   - Add advanced scripting

**Feasibility:** Almost always possible, mainly additive work.

---

## Recommended Approach by Mod Type

### Simple Mods (Items, Weapons, Armor):

**Recommended:** Both platforms simultaneously
- Easy to make cross-platform
- No F4SE needed
- Just archive for Bethesda.net
- Loose files for Nexus

### Quest Mods:

**Recommended:** Nexus first, port to Bethesda.net if simple
- Nexus: Full creative freedom
- Bethesda.net: Remove complex scripts if porting

### Settlement Mods:

**Recommended:** Both platforms simultaneously
- No F4SE typically needed
- Optimize assets for Bethesda.net
- Use same files for Nexus

### Script-Heavy Mods:

**Recommended:** Nexus only
- F4SE likely required
- MCM essential for configuration
- Console performance concerns

### Total Conversions:

**Recommended:** Nexus only
- Too large for Bethesda.net limits
- Requires external assets
- Complex dependencies

### Texture Replacers:

**Recommended:** Both platforms (with different quality)
- Nexus: 4K/8K textures
- Bethesda.net: 2K/1K compressed versions

---

## Configuration Methods

### Nexus: Mod Configuration Menu (MCM)

```papyrus
; MCM config script (F4SE required)
ScriptName MyModMCMScript extends Quest

; MCM is user-friendly, powerful, and flexible
Function OnMCMOpen()
    ; Sliders, toggles, text input, keybinds
    ; Real-time updates
    ; Profile save/load
EndFunction
```

**Advantages:**
- ✅ User-friendly GUI
- ✅ Real-time changes
- ✅ Extensive options
- ✅ Keybind support
- ✅ Profile management

**Disadvantages:**
- ❌ Requires F4SE
- ❌ Not available on Bethesda.net

### Bethesda.net: Holotape Configuration

```papyrus
; Holotape config script (vanilla)
ScriptName MyModConfigScript extends Terminal

Event OnMenuItemRun(int auiMenuItemID, ObjectReference akTerminalRef)
    If auiMenuItemID == 1
        ; Increase damage
        MyModQuest.DamageSetting += 10
        Debug.Notification("Damage increased to " + MyModQuest.DamageSetting)
    ElseIf auiMenuItemID == 2
        ; Decrease damage
        MyModQuest.DamageSetting -= 10
        Debug.Notification("Damage decreased to " + MyModQuest.DamageSetting)
    EndIf
EndEvent
```

**Advantages:**
- ✅ Works on all platforms
- ✅ No F4SE required
- ✅ Immersive (in-universe)
- ✅ Console-compatible

**Disadvantages:**
- ❌ Less user-friendly
- ❌ Limited UI options
- ❌ No real-time preview
- ❌ More development work

---

## File Size Optimization for Bethesda.net

### Texture Compression Techniques:

1. **Downscale Aggressively:**
   ```
   Original: 4096x4096 (4K) → 1024x1024 (1K)
   Reduction: ~93% file size reduction
   ```

2. **Use BC7 Compression:**
   - Better quality than DXT1/DXT5
   - Smaller file sizes
   - Use Intel Texture Works plugin

3. **Reduce Mipmaps:**
   ```
   Full mipmaps: 1.33x file size
   Half mipmaps: ~60% reduction
   ```

4. **Share Textures:**
   - Reuse vanilla textures where possible
   - Use tileable patterns
   - Avoid unique textures for every item

### Mesh Optimization:

1. **Reduce Polygon Count:**
   ```
   High-poly: 10,000 triangles → 2,000 triangles
   Use Blender's Decimate modifier
   ```

2. **Merge Meshes:**
   - Combine static objects
   - Reduce draw calls
   - Single collision mesh

3. **Remove Unused Vertices:**
   - Clean up in NifSkope
   - Remove hidden geometry
   - Optimize UV maps

### Sound Compression:

1. **Lower Sample Rate:**
   ```
   Original: 44.1kHz → 22.05kHz
   Reduction: ~50% file size
   ```

2. **Reduce Bit Depth:**
   ```
   16-bit → 8-bit (voices acceptable)
   Stereo → Mono (for ambient sounds)
   ```

3. **Use XWM Format:**
   - Bethesda's compressed format
   - Better than WAV
   - Use AME (Audio Modification Engine)

---

## Publishing Checklist

### Nexus Mods Checklist:

- [ ] Clear mod title and description
- [ ] List all requirements (F4SE, DLCs, other mods)
- [ ] Provide installation instructions
- [ ] Include FOMOD installer (if complex)
- [ ] Upload screenshots/videos
- [ ] Write detailed changelog
- [ ] Choose appropriate categories
- [ ] Set adult content flag (if applicable)
- [ ] Add permissions (derivatives, redistribution)
- [ ] Test with common mod managers

### Bethesda.net Checklist:

- [ ] **Remove all F4SE content**
- [ ] **Archive all files in BA2**
- [ ] **Verify file size under limit**
- [ ] Test without any external dependencies
- [ ] Remove adult/copyrighted content
- [ ] Clear, simple description (for beginners)
- [ ] Test holotape configuration
- [ ] Verify no loose files
- [ ] Check official DLC dependencies only
- [ ] Test on PC without F4SE
- [ ] Optimize for console performance
- [ ] Include clear instructions
- [ ] Submit for Bethesda review
- [ ] Wait for approval (can take days/weeks)

---

## Community Expectations

### Nexus Mods Users Expect:

- Advanced features (F4SE, MCM)
- High-quality textures (4K)
- Complex functionality
- Regular updates
- Compatibility patches
- Detailed documentation
- Manual control over installation

### Bethesda.net Users Expect:

- **Simple installation** (one-click)
- **Stability** (no crashes)
- **Performance** (works on base consoles)
- **Self-contained** (no external requirements)
- **Clear descriptions** (beginner-friendly)
- **Conservative updates** (don't break saves)
- **Plug-and-play** (works immediately)

---

## Revenue & Recognition

### Nexus Mods:

- **Donation Points** - Users can donate to authors
- **Nexus Premium** - Revenue share for popular mods
- **Patreon/Ko-fi** - External donation links allowed
- **Community recognition** - Endorsements, comments
- **Download tracking** - Detailed statistics

### Bethesda.net:

- **No direct monetization** - Free mods only
- **Creation Club** - Paid content (requires Bethesda partnership)
- **No external links** - Cannot link to Patreon, etc.
- **Recognition** - Ratings, downloads
- **Limited stats** - Basic analytics only

---

## Summary: Which Platform Should You Choose?

### Choose **Nexus Mods** if:

- ✅ Your mod uses F4SE
- ✅ You want MCM integration
- ✅ You need external dependencies
- ✅ Your mod is large (>2GB)
- ✅ You want creative freedom
- ✅ You target experienced modders
- ✅ You want rapid iteration
- ✅ You need advanced scripting

### Choose **Bethesda.net** if:

- ✅ You want to reach console players
- ✅ Your mod is simple/vanilla-friendly
- ✅ File size is under 2GB
- ✅ No F4SE required
- ✅ You target casual users
- ✅ You want official platform support
- ✅ Your mod is self-contained
- ✅ You can use holotapes for config

### Choose **BOTH** if:

- ✅ Your mod is cross-platform compatible
- ✅ You can maintain two versions
- ✅ File size is manageable
- ✅ No F4SE dependency
- ✅ Scripts are vanilla Papyrus
- ✅ You want maximum reach

---

## Platform-Specific Tools

### Nexus Mods Tools:

- **Mod Organizer 2** - Best mod manager for testing
- **Vortex** - Official Nexus mod manager
- **FO4Edit (xEdit)** - Conflict resolution, cleaning
- **Creation Kit** - Official modding tool
- **F4SE** - Script extender
- **LOOT** - Load order optimization
- **Wrye Bash** - Bashed patch creation
- **NifSkope** - Mesh editing
- **Paint.NET/GIMP** - Texture editing
- **BAE (Bethesda Archive Extractor)** - BA2 extraction

### Bethesda.net Tools:

- **Creation Kit** - Official modding tool
- **Archive2.exe** - BA2 creation (required)
- **FO4Edit** - Plugin cleaning
- **Paint.NET/GIMP** - Texture compression
- **NifSkope** - Mesh optimization
- **Xbox Dev Mode** - Console testing (optional)

---

## Real-World Examples

### Successful Nexus-Only Mods:

1. **Sim Settlements 2** - F4SE, complex scripts, MCM
2. **Horizon** - Massive overhaul, external dependencies
3. **Looksmenu** - F4SE required, character customization
4. **Place Everywhere** - F4SE, UI modifications

*These mods CANNOT be ported to Bethesda.net due to F4SE.*

### Successful Bethesda.net-Only Mods:

1. **UCO (Unified Clothing Overhaul)** - Started on console
2. **SimpleGreen** - Simplified Sim Settlements for console
3. **Cheat Terminal** - Holotape configuration

*These prioritized console compatibility from the start.*

### Successful Cross-Platform Mods:

1. **AWKCR (Armor and Weapon Keywords)** - Nexus has F4SE version, Bethesda.net has vanilla version
2. **Armorsmith Extended** - Stripped F4SE for console version
3. **Settlement Objects** - Works on all platforms

*These maintain two separate versions.*

---

## Final Recommendations for Mossy

When a user asks about publishing their mod:

1. **Ask about F4SE usage** - Immediate disqualifier for Bethesda.net
2. **Check file size** - Critical for Bethesda.net
3. **Assess script complexity** - Console performance matters
4. **Evaluate target audience** - PC enthusiasts vs. console casuals
5. **Consider maintenance effort** - Two versions = double work

**Default recommendation:** 
- Start with Nexus for testing and feedback
- Port to Bethesda.net if feasible and demand exists
- Don't compromise Nexus version to make Bethesda.net version work

---

## Quick Decision Tree

```
Does your mod use F4SE?
├─ YES → Nexus Mods only
└─ NO → Continue

Is your mod larger than 2GB?
├─ YES → Nexus Mods only (or compress for Bethesda.net)
└─ NO → Continue

Does your mod have adult content?
├─ YES → Nexus Mods only
└─ NO → Continue

Does your mod require other Nexus-only mods?
├─ YES → Nexus Mods only
└─ NO → Continue

Is your mod script-heavy or performance-intensive?
├─ YES → Nexus Mods recommended (test on console if Bethesda.net)
└─ NO → Continue

Do you want to reach console players?
├─ YES → Both platforms (maintain two versions)
└─ NO → Nexus Mods (easier, more features)
```

---

**End of Guide**

This document should be referenced whenever a user asks about:
- "Should I publish to Nexus or Bethesda.net?"
- "Can I port my Nexus mod to Bethesda.net?"
- "Why was my mod rejected from Bethesda.net?"
- "What's the difference between Nexus and console mods?"
- "How do I make my mod console-compatible?"
