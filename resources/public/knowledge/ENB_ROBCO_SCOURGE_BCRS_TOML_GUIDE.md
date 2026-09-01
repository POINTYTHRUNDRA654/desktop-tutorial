# ENB Series, RobCo Patcher, Scourge, Bullet Counted Reload System & F4SE TOML Files

A reference guide for five important Fallout 4 modding tools and systems.

---

## 1. ENB Series — Visual Realism Enhancement

### What Is ENB Series?

ENB Series (by Boris Vorontsov) is a post-processing injection layer that hooks into DirectX 11 and adds advanced shader effects far beyond what the base Creation Engine provides. It is the single most impactful visual enhancement available for Fallout 4.

**Official download:** http://enbdev.com/download_mod_fallout4.htm  
**Documentation:** http://enbdev.com/documentation_en.htm

### What ENB Adds

| Feature | Description |
|---|---|
| Ambient Occlusion | Deep, contact-correct shadows in crevices and corners |
| Screen-Space Reflections | Wet roads, puddles, metallic surfaces |
| Depth of Field | Cinematic background blur (bokeh or Gaussian) |
| Bloom & God Rays | Physically-motivated sun scatter |
| Subsurface Scattering | Skin/flesh light transmission for NPCs |
| Tone Mapping | HDR-to-LDR curve control (replaces Bethesda's flat LUT) |
| Color Correction | Full color grading via curves and lookup textures |
| Shadow Resolution | Overrides engine shadow map limits |
| Anti-Aliasing | SMAA / temporal options on top of base game TAA |
| Lens FX | Chromatic aberration, dirt, lens flares |

### Installation

1. Download ENB Series binary from enbdev.com (latest version for FO4).
2. From the ZIP, copy **only** these two files to `Fallout 4\` (next to Fallout4.exe):
   - `d3d11.dll`
   - `d3dcompiler_46e.dll`
3. Download an ENB preset from Nexus (category: ENB & ReShade Presets).
4. Copy all preset files (`.ini`, `enbseries\` folder, optional `.bmp` palette) to the same `Fallout 4\` folder.
5. Launch the game — ENB displays a build number in the top-left corner on load.

**Do NOT use the `WrapperVersion` folder** inside the ENB ZIP — use the injection DLLs directly.

### Key Config Files

#### `enblocal.ini` — Hardware / Performance Settings

```ini
[MEMORY]
; Set to your GPU VRAM in MB minus ~500 MB headroom
VideoMemorySizeMb=6144

[ENGINE]
ForceVSync=false
VSyncSkipNumFrames=0

[PERFORMANCE]
EnableOcclusionCulling=true

[ANTIALIASING]
EnableEdgeAA=true
```

#### `enbseries.ini` — Visual Effects Settings

```ini
[GLOBAL]
UseEffect=true            ; Master ENB enable/disable

[EFFECT]
EnableBloom=true
EnableLens=false          ; Lens dirt/flares (expensive)
EnableDepthOfField=true
EnableAmbientOcclusion=true
EnableReflection=true

[BLOOM]
BloomAmount=0.30          ; Lower = subtler bloom

[DEPTHOFFIELD]
FocusMode=1               ; 0=manual, 1=auto-focus
```

### In-Game ENB GUI

- **Shift+Enter** opens the ENB shader editor overlay.
- Tweak values live and see results immediately.
- Click **Save Configuration** to write changes to disk.
- Toggle ENB on/off with **Shift+F12** (default).

### Popular FO4 ENB Presets

- **NAC X (Nuclear Autumn)** — Atmospheric, photorealistic
- **Visceral ENB** — High contrast, cinematic
- **Everlasting Fallout** — Balanced performance/visuals
- **Rudy ENB** — Warm, natural lighting
- **PRC (Photo Realistic Commonwealth)** — True-to-life color grading

### ENB with ReShade

ENB and ReShade can coexist if the preset is designed for it. Do not use a generic ReShade preset on top of an ENB that already handles the same effects (double bloom, double AO), or you will crush the image.

### Compatibility Notes

- ENB works with Fallout 4 OG (1.10.163) and NG (1.10.984+/1.11.x). Boris releases separate builds — check enbdev.com and use the build labelled for your game version.
- Some ENB presets require **ENB Helper** (Nexus #57574) for weather-adaptive effects.
- ENB is **incompatible** with AMD Radeon ReLive's in-game overlay — disable it.
- Do not use ENB alongside the `bFullSceneBlur=1` Creation Engine setting — conflicts with ENB DoF.

---

## 2. RobCo Patcher — Runtime Record Patching Without ESP/ESL

### What Is RobCo Patcher?

RobCo Patcher (by Zzyxzz, Nexus #69798) is an F4SE plugin that patches Fallout 4 game records at runtime using simple `.ini` files. It modifies weapons, NPCs, armor, leveled lists, and more **without adding any plugin to your load order** — eliminating ESP/ESL conflicts.

**Nexus:** https://www.nexusmods.com/fallout4/mods/69798  
**Requirements:** F4SE, CommonLibF4, Address Library (All-in-One for NG/1.11.x)

### Why RobCo Patcher Is Valuable

- **Zero plugin slots used** — patches execute at runtime, not at load time.
- **Load-order aware** — can target records from any mod in the load order by FormID, EditorID, keyword, or name.
- **Conflict resolution** — makes incompatible mods work together via runtime override.
- **Automation** — mod authors ship `.ini` patch files so users get compatibility for free.

### INI File Placement

```
Data\RobCo Patcher\MyPatch.ini
```

Any `.ini` file in that folder is automatically loaded.

### Patch Syntax Reference

#### Modify a Weapon

```ini
[ModifyWeapon]
Signature=WEAP
EditorID=LaserGun
AddKeyword=WeaponTypePlasma
SetValue=Damage,60
```

#### Modify an NPC

```ini
[ModifyNpc]
Signature=NPC_
Name=Raider
AddPerk=SneakAttack
SetValue=Health,300
```

#### Keyword Filters (AND / OR / NOT)

```ini
[ModifyWeapon]
Signature=WEAP
AllKeyword=WeaponTypeRifle;CustomTag      ; ALL must be present
AnyKeyword=WeaponTypeEnergy;WeaponTypeLaser ; at least ONE must be present
ExcludeKeyword=NoUpgrade                  ; must NOT be present
AddMod=mod_custom_suppressor
```

#### FormID Targeting

```ini
[ModifyNpc]
Signature=NPC_
FormID=00012AB3                           ; Hex FormID (plugin load-order index prefix auto-resolved)
SetValue=Health,500
```

#### Common Patch Parameters

| Parameter | Description |
|---|---|
| `Signature=` | Record type: WEAP, NPC_, ARMO, AMMO, MISC, etc. |
| `FormID=` | Target by FormID (hex) |
| `EditorID=` | Target by Editor ID string |
| `Name=` | Target by in-game display name |
| `AllKeyword=` | All listed keywords must be present (semicolon-separated) |
| `AnyKeyword=` | At least one keyword must be present |
| `ExcludeKeyword=` | Keyword must NOT be present |
| `Race=` | Filter by race EditorID |
| `AddKeyword=` | Add a keyword to the record |
| `RemoveKeyword=` | Remove a keyword |
| `AddPerk=` | Add a perk |
| `RemovePerk=` | Remove a perk |
| `SetValue=Property,Value` | Set a numeric property |
| `AddMod=` | Add a weapon mod (OMOD EditorID) |

### Common Use Cases

- **Ammo patching** — force all weapons of a given type to use a custom ammo form.
- **Leveled list injection** — insert items into loot/vendor tables from any mod.
- **Compatibility patches** — make two otherwise-conflicting mods work together.
- **Stat normalization** — cap NPC health/damage across an entire mod list.
- **Keyword propagation** — tag items from legacy mods with newer system keywords.

---

## 3. Scourge — NPC Stat Overhaul and Deleveling

### What Is Scourge?

Scourge (Nexus #60917, by Geluxrum) is an F4SE plugin that completely reworks how enemy stats are calculated in Fallout 4. It eliminates the bullet-sponge problem inherent in Bethesda's level-scaling system by applying Gaussian (bell-curve) distribution to NPC stats instead of a flat level multiplier.

**Nexus:** https://www.nexusmods.com/fallout4/mods/60917  
**Requirements:** F4SE, Address Library (All-in-One), MCM (for in-game tuning)

### What Scourge Changes

| Vanilla Behavior | Scourge Behavior |
|---|---|
| Enemy health scales linearly with player level | Stats distributed on Gaussian curve — same enemy type varies |
| High-level enemies are pure damage/HP sponges | Enemies feel believably dangerous without artificial inflation |
| Leveled lists drive all NPC spawns | Many spawns deleveled — enemies exist regardless of player level |
| Uniform, predictable difficulty | Varied, unpredictable — same location can feel different each run |

### Key Features

- **Gaussian stat distribution** — Most enemies cluster near a base value; some are weak, some are exceptional. Creates natural variance.
- **Deleveling** — Enemies no longer wait for you to be high level to appear. You can encounter a Legendary Deathclaw at level 5, making the wasteland feel dangerous from the start.
- **MCM control** — Adjust the mean and variance for every enemy category live in-game.
- **No weapon obsolescence** — Because enemies aren't scaled to always match your damage, all weapons remain viable throughout the playthrough.
- **Patch repository** — Community patches cover hundreds of creature mods (Sim Settlements 2, America Rising, etc.).

### Compatibility

- Scourge is an F4SE **DLL plugin**, not an ESP, so it has no record conflicts with other mods.
- It works by hooking into the NPC stat calculation function at runtime.
- Requires the correct version for your game build (OG 1.10.163 vs NG 1.10.984+/1.11.x — check mod page).
- Works well alongside **RobCo Patcher** (no overlap in function).
- Does **not** conflict with Addictol.

---

## 4. Bullet Counted Reload System (BCRS / BCR)

### What Is BCRS?

Bullet Counted Reload (by Shavkacagarikia, also known as BCR) is an F4SE plugin that makes weapon reload animations count the actual number of rounds remaining in the firearm. In vanilla Fallout 4, tube-fed weapons (lever-action rifles, shotguns, revolvers) always play a full reload animation regardless of how many shots were fired. BCR fixes this at the engine level.

**Nexus:** https://www.nexusmods.com/fallout4/mods/42676

### What BCRS Changes

| Vanilla Behavior | BCRS Behavior |
|---|---|
| Lever-action: always plays 10-round reload cycle | Only loads the exact number of rounds needed |
| Shotgun: always reloads all shells | Reloads only missing shells |
| Revolver: full cylinder animation every time | Loads individual rounds as needed |
| Cannot interrupt reload to fire | Reload can be interrupted mid-animation to fire |

### How It Works

BCRS hooks into the animation graph and ammo system via F4SE. It:
1. Reads the current ammo count in the magazine.
2. Calculates rounds needed to reach capacity.
3. Replaces the full-reload animation sequence with a shortened version looped exactly N times.
4. Exposes an interrupt window so the player can stop reloading early and fire.

### Requirements

- F4SE (match your game version)
- Address Library for F4SE Plugins (All-in-One)

### Mod Author Integration

Weapon mod authors can add BCRS support to custom weapons by including animation events in the NIF graph. The BCRS Nexus page documents the required animation event names. Without a patch, new guns will fall back to the vanilla full-reload behavior — they won't break, they just won't have counted reload.

### Compatibility

- Works in first-person and third-person.
- Compatible with Addictol (BakaMaxPapyrusOps integration is unneeded — BCRS is native code).
- Check the BCRS Nexus page for compatibility patches for popular weapon packs (Fallout London weapons, Wasteland Melody Chinese weapons, etc.).

---

## 5. F4SE Plugin TOML Files — Address Library Configuration

### What Is a TOML File in F4SE Context?

`.toml` (Tom's Obvious Minimal Language) is a human-readable configuration format. In the context of F4SE plugins, a `.toml` file accompanies a DLL plugin and tells the **Address Library for F4SE Plugins** how to locate game functions across different Fallout 4 runtime versions — without hardcoding memory addresses.

### Why TOML Files Matter

Fallout 4 has had multiple binary versions (1.10.163, 1.10.984, 1.11.x). Every time Bethesda patches the EXE, function addresses change. Without the Address Library and a TOML file, a DLL plugin would need to ship separate builds for every game version. With a TOML file + Address Library, a single DLL can support all versions by resolving addresses at runtime.

### TOML File Structure

TOML files for Address Library live alongside the DLL in:
```
Data\F4SE\Plugins\MyPlugin.toml
```

#### Minimal TOML Example

```toml
version = 1

[plugin]
name    = "MyPlugin"
author  = "YourName"
version = "1.0.0"
```

#### Full TOML with Addresses

```toml
version = 1

[plugin]
name    = "MyPlugin"
author  = "YourName"
version = "1.0.0"

[addresses]
# Map Address Library ID → RVA for each game version
# Format: AddressLibID = { "game.version.string" = RVA_int, ... }
# Example: ProcessHits function
ProcessHitsFunc = { "1.10.163.0" = 0x1A2B3C, "1.10.984.0" = 0x1C3D4E, "1.11.191.0" = 0x1E5F60 }

[signatures]
# Alternative: define by byte signature (resolves at startup via pattern scan)
# Signature string: "F4:" prefix + hex bytes, ?? = wildcard
MyDataPtr = "F4:48 8B 05 ?? ?? ?? ?? 48 8B 18"
```

### Address Library ID vs Direct Address

The recommended modern pattern (CommonLibF4 approach) uses **Address Library IDs** instead of raw addresses:

```cpp
// In C++ code — resolve using ID, not hardcoded offset
static auto ProcessHits = REL::Relocation<uintptr_t>{ REL::ID(12345) };
```

The ID `12345` is looked up in the Address Library database (`versionlib-*.bin` files in `Data\F4SE\Plugins\`). The `.toml` file provides the RVA mapping for IDs that are custom to your plugin (not already in the main Address Library database).

### TOML Field Reference

| Field | Type | Description |
|---|---|---|
| `version` | Integer | File format version (use `1`) |
| `[plugin].name` | String | Plugin display name |
| `[plugin].author` | String | Author name |
| `[plugin].version` | String | Plugin version string |
| `[addresses]` | Table | Address Library ID → per-game-version RVA mappings |
| `[signatures]` | Table | Symbol name → byte signature string (`"F4:..."`) |

### F4SE Plugin Version Declaration (C++ side)

The `.toml` works alongside the version data declared in C++:

```cpp
F4SE_PLUGIN_VERSION = []()
{
    SFSE::PluginVersionData ver{};
    ver.PluginVersion(REL::Version{ 1, 0, 0 });
    ver.PluginName("MyPlugin");
    ver.AuthorName("YourName");
    // List every game version your plugin supports:
    ver.CompatibleVersions({
        REL::Version{ 1, 10, 163, 0 },   // OG
        REL::Version{ 1, 10, 984, 0 },   // NG
        REL::Version{ 1, 11, 191, 0 },   // Creations Menu
    });
    return ver;
}();
```

If `CompatibleVersions` does not include the running game version, F4SE will refuse to load the plugin and log a version mismatch error.

### TOML vs Hardcoded Addresses — Decision Guide

| Scenario | Recommendation |
|---|---|
| Plugin targets only OG 1.10.163 forever | Hardcoded addresses acceptable (but fragile) |
| Plugin must survive game updates | Use Address Library IDs + TOML |
| Function already in Address Library database | Use `REL::ID(n)` directly, no TOML entry needed |
| Custom function not in Address Library | Add entry to your `.toml` under `[signatures]` |
| Maximum compatibility | Combine ID lookups + byte signature fallback |

### Common TOML Errors

- `version = 1` missing → Address Library ignores the file
- Wrong RVA for a game version → crash on startup for that version
- Byte signature too short or too unique → pattern scan fails silently
- File encoding not UTF-8 → TOML parser rejects the file
- Placed in wrong directory → Address Library never loads it (must be `Data\F4SE\Plugins\`)

---

## Summary Quick Reference

| Tool | Type | Nexus # | Requires | What It Does |
|---|---|---|---|---|
| ENB Series | Graphics injector | n/a (enbdev.com) | DX11 GPU | Post-processing: AO, DoF, bloom, tone-mapping |
| RobCo Patcher | F4SE plugin | 69798 | F4SE, Address Library | Runtime record patching via .ini — no ESP needed |
| Scourge | F4SE plugin | 60917 | F4SE, Address Library, MCM | Gaussian NPC stat distribution, deleveling |
| BCRS (BCR) | F4SE plugin | 42676 | F4SE, Address Library | Counted reload animations, interruptible reloads |
| TOML files | Config format | — | Address Library installed | Maps F4SE plugin DLL function IDs to per-version RVAs |
