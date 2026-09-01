# Load Order, ESL Flagging & Plugin Management Guide — Fallout 4 (2026)

This guide covers the Fallout 4 plugin system: ESP/ESM/ESL formats, FormID address space, ESL flagging rules, LOOT metadata, Wrye Bash bashed patches, and practical load order management.

---

## 1. Plugin File Types

| Extension | Full name | FormID space | Plugin limit |
|---|---|---|---|
| `.esm` | Elder Scrolls Master | 0x00–0xFE (full 16M FormIDs) | Counts toward 255 limit |
| `.esp` | Elder Scrolls Plugin | 0x00–0xFE (full 16M FormIDs) | Counts toward 255 limit |
| `.esl` | Elder Scrolls Light | 0x000–0xFFF (4096 FormIDs max) | Does NOT count toward 255 limit |

### The 255 Plugin Limit

Fallout 4 supports a maximum of **255 active plugins** (indices 0x00–0xFE). Index 0xFF is reserved. When this limit is reached, the game refuses to launch. ESL-flagged plugins bypass this limit by sharing index space.

---

## 2. ESM vs ESP vs ESL — When to Use Each

### ESM (Master)
- Use for **framework mods**, **DLC-scale content**, **patch masters** that other mods depend on
- ESMs load before all ESPs automatically (regardless of position in load order)
- Can be a master for other plugins
- **Never ESL a public ESM** unless you are 100% certain it will never exceed 4096 new FormIDs

### ESP (Plugin)
- Standard mod file — use for most content mods, patches, overhauls
- Loads in position order
- Can reference ESM masters
- Can be ESL-flagged or converted to ESL

### ESL (Light Plugin)
- Full ESL plugins (`.esl` extension): always ESM-flagged, load as master
- ESL-flagged ESP (`esp` with ESL header flag): loads as ESP in position order, but doesn't count toward 255 limit
- **FormID limit: 0x800 to 0xFFF** = exactly 2048 new FormIDs (some sources say 4096 — the usable new-record range is 0x800–0xFFF = 2048)
- Used for small patches, bug fixes, cosmetic tweaks with few or no new records

---

## 3. FormID Structure and Address Space

Every record in Fallout 4 has a FormID — a 32-bit integer split into:
- **High byte (bits 24–31)**: plugin index (0x00–0xFE for regular plugins, 0xFE for ESL)
- **Low 3 bytes (bits 0–23)**: record ID within the plugin

**Vanilla FormIDs** start with `0x00` (Fallout4.esm is always index 00).

**ESL FormID range**: the first 0x800 addresses (0x000–0x7FF) are reserved for references to masters. New records must use 0x800–0xFFF. This gives **2048 new FormIDs**.

If your plugin exceeds 2048 new FormIDs, it **cannot safely be ESL-flagged**.

---

## 4. ESL Flagging Rules

### Safe to ESL-flag
- Patches that only edit existing records (0 new FormIDs)
- Small mods with fewer than 2000 new records
- Texture/mesh replacers (no new FormIDs — records live in other plugins)
- Bug fixes, balance tweaks
- FOMOD component plugins where each component is small

### NOT safe to ESL-flag
- Mods adding hundreds or thousands of new references, NPCs, or crafting recipes
- Any plugin that might grow over time (adding DLC patches later could push it over the limit)
- Framework mods that other plugins use as masters (risk: if limit is reached mid-development)
- Plugins with scripts that use FormID arithmetic

### How to Check FormID Count in xEdit

1. Load your plugin in xEdit
2. Right-click plugin → `Apply Script` → run `Compact FormIDs for ESL`
3. xEdit reports how many new FormIDs exist and whether compaction is safe
4. If safe, the script renumbers IDs to the 0x800–0xFFF range
5. Save; then in xEdit header editor, enable the ESL flag

---

## 5. Converting ESP to ESL-Flagged ESP

1. Open plugin in xEdit
2. Select plugin header record
3. Record Flags → enable `Light` flag (the ESL bit)
4. Confirm FormIDs are in 0x800–0xFFF range (use Compact script if not)
5. Save plugin

The file keeps `.esp` extension but no longer counts toward the 255 limit at runtime.

---

## 6. LOOT — Load Order Optimization

LOOT (Load Order Optimization Tool) automatically sorts your load order using a masterlist of mod metadata and dependency rules.

### What LOOT Does
- Sorts plugins so masters always load before dependents
- Applies community-defined ordering rules (e.g., "UFO4P always loads after Unofficial Fallout 4 Patch")
- Flags dirty edits, missing masters, and incompatibilities
- Generates a LOOT report with warnings

### Running LOOT

```
1. Launch LOOT from MO2 (adds your mods to the VFS LOOT sees)
2. Click "Sort Plugins"
3. Review the report — address any red/yellow warnings
4. Click "Apply Sort"
```

### LOOT Metadata Files

For your own mods, you can add LOOT metadata:
```yaml
# masterlist.yaml addition
  - name: 'YourMod.esp'
    after:
      - 'OtherMod.esp'
    say:
      - text: 'Load after PRP for compatibility'
        type: warn
```

Submit your mod's metadata to the LOOT Fallout 4 masterlist on GitHub.

---

## 7. Wrye Bash — Bashed Patch

A Bashed Patch merges certain record types from multiple conflicting plugins into a single patch plugin, resolving conflicts without requiring explicit patch ESPs.

### What Wrye Bash Can Merge
- **Leveled Lists (LVLI, LVLN, LVLC)** — combines additions from multiple mods
- **Inventory Changes** — vendor list merges
- **NPC Face/Body** — limited support (prefer explicit patches for NPCs)

### Creating a Bashed Patch

1. Install Wrye Bash, run from MO2
2. Enable all plugins you want in the Installers tab
3. Right-click `Bashed Patch, 0.esp` → `Rebuild Patch`
4. In the Bashed Patch settings, enable **Leveled Lists** (most important for compatibility)
5. Build — Wrye Bash creates a merged patch at the bottom of your load order

### When to Use a Bashed Patch
- You have multiple mods that edit the same leveled lists (vendors, enemy drops)
- Without the bashed patch, only the last plugin's list changes would apply
- Essential for large mod lists

---

## 8. Load Order Principles

### The Basic Rule
Load order determines which plugin "wins" when multiple plugins edit the same record. **Last plugin wins** for any record it overwrites.

### Recommended Load Order Structure

```
[DLC / Masters]
DLCRobot.esm
DLCCoast.esm
DLCworkshop01.esm
...

[Bug Fixes / Foundations]
Unofficial Fallout 4 Patch.esp        ← always early
PRP.esp                                ← Previs Repair Pack

[Framework Mods]
Workshop Framework.esp
Sim Settlements 2.esm
MCM_Framework.esp

[Major Overhauls]
YourFloraOverhaul.esp
WeatherMod.esp
LightingMod.esp

[Content Mods]
New quest mods
New weapon/armor mods
NPC overhauls

[Patches]
Compatibility patches (load after both mods they patch)

[LOD / Visuals Last]
DynDOLOD_Output.esp                   ← ALWAYS last or near-last
Bashed Patch, 0.esp                   ← LAST
```

### Critical Load Order Rules

1. **UFO4P always early** — it fixes base records; everything else should load after
2. **PRP directly after UFO4P** — precombine repair must override vanilla precombines
3. **Patches load after both parents** — a patch for Mod A + Mod B must load after both
4. **DynDOLOD output is always last** — it bakes your entire load order into LOD
5. **Bashed Patch is the last ESP** — it merges leveled lists from everything above it
6. **Never manually sort past what LOOT suggests** unless you have a specific reason

---

## 9. Diagnosing Load Order Issues

### Using xEdit for Conflict Detection

1. Load all your plugins in xEdit
2. Use **View → Filter for Conflicts** to see all records with multiple overrides
3. Green = no conflict, Yellow = override (possibly intentional), Red = conflict (likely problem)
4. Look specifically for leveled list conflicts — these are the most common issue

### Missing Master Errors

If the game refuses to launch with a "missing master" error:
1. Open xEdit → load your plugins
2. The plugin with the error will show its master list in the header
3. Install the missing master OR remove the plugin

### Plugin Count Overflow

If you're near the 255 limit:
1. Identify small patches (0–5 new FormIDs) and ESL-flag them
2. Merge compatible small mods using xEdit's `Merge Plugins` script (for ESP mods you control)
3. Remove redundant or outdated compatibility patches

---

## 10. OG / NG / AE Considerations

Plugin files (`.esp`, `.esm`, `.esl`) are **format-compatible across OG, NG, and AE** — the ESP format did not change between versions. The same plugin loads on all three.

However:
- **DLL mods** (F4SE plugins) require separate OG/NG/AE builds
- **BA2 V7/V8 archives** (NG/AE) are not readable by OG — keep textures in BA2 V1 for cross-version compatibility
- **LOOT and xEdit 4.0.4+** are required for NG/AE — older versions do not understand NG masters
- **Address Library AiO Anniversary** (Nexus #47327) covers all three versions for DLL mods

---

## 11. Quick-Reference Checklist

- [ ] Plugin type chosen correctly: ESM/ESP/ESL appropriate to mod size and dependencies
- [ ] ESL candidates identified and FormID compaction checked via xEdit
- [ ] LOOT run after every mod install or removal
- [ ] LOOT warnings addressed (missing masters, dirty edits)
- [ ] Load order follows the layered structure (fixes → frameworks → content → patches → LOD)
- [ ] DynDOLOD output is last (before Bashed Patch only)
- [ ] Bashed Patch rebuilt after any load order change
- [ ] Leveled list conflicts identified via xEdit conflict filter

*Last updated: May 2026.*
