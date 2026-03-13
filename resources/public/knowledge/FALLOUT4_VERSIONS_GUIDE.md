# Fallout 4 Versions Guide — OG, NG, and AE

> **This is Mossy's authoritative reference for all three Fallout 4 release states.**
> Always ask which version a user is running before giving version-sensitive advice.

---

## The Three Versions at a Glance

| Feature | OG (Old Gen / Legacy) | NG (Next Gen) | AE (Anniversary Edition) |
|---|---|---|---|
| **Game EXE version** | 1.10.163.0 (and earlier) | 1.10.980.0 – 1.10.984.0+ | Same EXE as NG (1.10.980+) |
| **Release date** | Nov 2015 → before Apr 2024 | April 25, 2024 | April 25, 2024 (bundled with NG) |
| **F4SE version** | 0.6.x | 0.7.x | 0.7.x |
| **BA2 archive format** | Version 1 (V1) | Version 1–8 (game ships V7/V8 for new assets) | Same as NG |
| **Creation Kit (CK)** | OG CK (1.10.163 era) | NG CK (1.10.982+) | Same as NG CK |
| **CKPE version** | V0.3 for OG CK | V0.5+ for NG CK | V0.5+ |
| **Creation Club content** | Optional (paid) | Optional OR bundled (76 items free with NG) | 76 CC items **included** |
| **Mods compatibility** | Most pre-2024 mods work | Many mods need NG updates | Same as NG + CC-aware mods |
| **Downgrade possible?** | N/A (is the base) | Yes — via Downgrade Patcher | Yes — downgrades to OG |

---

## Version 1: OG (Old Gen / Pre-NG / Legacy)

**Game version:** 1.10.163.0 and all earlier Steam/GOG versions.

### Who is still on OG?
- Modders who deliberately downgraded after the April 2024 NG update.
- Users on GOG (GOG sells 1.10.163 by default).
- Anyone who manually blocked Steam auto-updates.
- Users running large curated mod lists built for pre-2024 setups (many Wabbajack lists still target OG).

### What works on OG
- **F4SE 0.6.23** — the final stable OG build.
- **All mods published before April 2024** — the vast majority of the Nexus library was built for OG.
- **CKPE 0.3.x** — use `bOwnArchiveLoader=false` and `bBSPointerHandleExtremly=true` in INI.
- **BA2 V1 archives** — the standard format. CMT (Cathedral Assets Optimizer / Archive Tool) creates V1 by default.
- **PRP 74** (Previs Repair Pack) — the last version that targets OG. Not actively updated.

### OG Pitfalls
- Installing the NG CK on an OG game breaks precombine workflows — keep CK version matched to game version.
- The OG BA2 shader archive (`Fallout4 - Shaders.ba2`) is incompatible with NG. If you have both installed, the wrong one will cause visual glitches.

---

## Version 2: NG (Next Gen Update)

**Game version:** 1.10.980.0, 1.10.982.0, 1.10.984.0, 1.10.984.0.1 (and any future patches).

Released **April 25, 2024** as a free update to all owners via Steam/Xbox. It updated the engine for native Xbox Series X|S / PS5 performance and added upscaling support (FSR2, TAA) on PC.

### What changed in NG
- New EXE: the F4SE Address Library had to be completely rebuilt.
- **BA2 V7/V8**: new texture archive formats for some of the bundled Creation Club assets. Your existing V1 mods still load fine; you only need the new format if you're packing assets to match the new bundled content.
- **CK NG (1.10.982+)**: This is a new, 64-bit enhanced version of the Creation Kit. It is faster and more stable than OG CK. Most precombine workflows now target this version. Use **CKPE 0.5+** with it.
- **SKSE / xSE plugins (`.dll` mods)**: These all broke on release day because they are compiled against specific EXE offsets. Every one needed a NG-specific build. Most major plugins now have NG versions.

### What mods need updating for NG
- Any mod that ships a `.dll` (F4SE plugin / Engine Fixes / MCM Framework, etc.) needs a NG build.
- AWKCR, ECO, and similar framework mods needed updates — check their Nexus pages for NG compatibility tags.
- **Most ESP/ESM mods with no DLL component still work** on NG without changes. If a mod is pure scripts + meshes + textures, it generally doesn't care about game version.
- **Load order tools**: LOOT 0.21+ supports NG. xEdit 4.1.5f+ supports NG.

### NG Tools versions
| Tool | Minimum version for NG | Notes |
|---|---|---|
| F4SE | 0.7.2+ | Download from f4se.silverlock.org — use the NG build |
| xEdit / FO4Edit | 4.1.5f+ | Required for all BA2 work on NG |
| CKPE | 0.5+ | Use latest from GitHub, not Nexus |
| PRP | 81+ | 81 is the minimum; 100+ recommended |
| UFO4P | 2.1.5+ | Latest always preferred |
| LOOT | 0.21+ | Earlier versions don't understand NG masters |
| MCM Framework | Must be NG build | Critical dependency for many mods |
| Buffout 4 | Must be NG build | Crash logs show game version — verify it matches |

### Downgrading from NG to OG
Users sometimes downgrade to run mod lists that haven't been updated for NG.

**Method**: Use the "Downgrade Patcher" by Hador-sCZ (on Nexus, mod ID 81463).
- This restores EXE 1.10.163.0.
- After downgrading: also downgrade the CK (if you use it), and run CMT to convert any V7/V8 BA2 files back to V1.
- Replace `Fallout4 - Shaders.ba2` with the OG version (found inside `CreationKitPlatformExtended_FO4_Resources.pak` from the CKPE 0.5 kit — extract `CreationKit - Shaders - OG.ba2` and rename).

---

## Version 3: AE (Anniversary Edition)

**"AE" in the Fallout 4 community specifically means**: the NG update package that included **76 free Creation Club (CC) items** bundled in for all owners. This is the "Anniversary" content.

> **Important:** Unlike Skyrim AE (which is a paid upgrade), Fallout 4's AE content was given free to all owners with the NG update. If you have NG, you have AE content.

### What AE adds (the 76 Creation Club items)

Bethesda bundled 76 Creation Club pieces. Key ones modders care about:

| CC Item | Why it matters for modding |
|---|---|
| **Enclave Remnants** | Adds Enclave armour/weapons; many mods patch against it |
| **Tunnel Snakes Rule** | New faction outfits; patched in some overhauls |
| **Nuka-World on Tour** | Adds Nuka-World NPC presence in Commonwealth; navmesh matters |
| **Slocum Joe's** | New interior cell; precombine-relevant |
| **Settlement Ambush Kit** | Adds settlement items; SS2 / settlements mods interact |
| **Capital Wasteland Mercenaries** | New vendor NPCs; levelled list patches needed |
| **Modular Military Backpack** | Popular — many outfit mods patch against it |

**Full list**: Check the Fallout 4 Nexus or Bethesda.net for the complete 76-item manifest.

### AE and mod compatibility
- Mods that have **AE variants** on Nexus typically add patches for the CC items (new keywords, levelled list entries, patched navmeshes, etc.).
- **PRP 81+** is required to cover the AE content cells. Earlier PRP versions don't know about the new cells.
- Conflict-resolution tools like **xEdit** will show the CC ESL files in your load order — they are real masters and can conflict like any other mod.
- If a user says "I have AE but X mod is broken", check if the mod has an AE patch and whether the load order puts CC ESLs in the correct position.

### AE ESL masters (always loaded)
The 76 CC items are loaded as `.esl` flagged files. Key files to know:
```
ccBGSFO4001-PipBoy(Black).esl
ccBGSFO4002-PipBoy(Blue).esl
… (many pip-boy cosmetics)
ccFSVFO4001-ModularMilitaryBackpack.esl
ccFRSFO4001-HandmadeRailroad.esl
ccEEJFO4001-DecorationPack.esl
ccBGSFO4116-HeavyFlamer.esl
ccBGSFO4115-X02.esl          ← X-02 Power Armour (popular)
ccOTMFO4001-Remnants.esl     ← Enclave Remnants
ccSZBFO4001-BaaBaaSheep.esl
ccRZRFO4001-TunnelSnakes.esl ← Tunnel Snakes
```

---

## How to Determine a User's Version

Ask the user to open Fallout 4 and go to **Main Menu → the version number in the lower right**:

| Number shown | Version |
|---|---|
| 1.10.163 | OG |
| 1.10.980 – 1.10.984.x | NG |
| 1.10.163 + says "Special Edition" or "AE" anywhere | Downgraded |

Alternatively, ask them to right-click `Fallout4.exe` → Properties → Details → File version.

---

## Version-Specific F4SE Setup

### For OG (1.10.163)
1. Download **F4SE 0.6.23** from f4se.silverlock.org.
2. Copy `f4se_1_10_163.exe`, `f4se_loader.exe`, `f4se_steam_loader.dll` into the **game root** folder.
3. Launch via `f4se_loader.exe` (or through MO2/Vortex with the F4SE launcher set).
4. Test in console: `GetF4SEVersion()` should return `0.06.23`.

### For NG (1.10.980+)
1. Download **F4SE 0.7.2+** from f4se.silverlock.org — use the **NG** download (not the OG build).
2. Copy `f4se_1_10_980.exe` (or matching version), `f4se_loader.exe`, `f4se_steam_loader.dll` into game root.
3. Address Library for F4SE — install the **"All In One (Anniversary Edition)"** version from Nexus (mod ID 47327). This is required for all F4SE plugins to work on NG.
4. Launch via `f4se_loader.exe`.
5. Test in console: `GetF4SEVersion()` should return `0.07.xx`.

### F4SE Plugin Compatibility Check
Before installing any F4SE plugin (`.dll`), check:
- Does the mod page say "NG compatible" or list version `1.10.980`?
- Check the FOMOD installer — many now include OG and NG DLL variants and auto-select.
- If no NG build exists: the plugin will crash the game on startup. Check the mod's "Bugs" or "Posts" section on Nexus.

---

## Papyrus Scripting Differences by Version

Papyrus itself is **identical** across OG, NG, and AE — the scripting language did not change. However:

- **NG CK compiles Papyrus faster** and has fewer crashes mid-compile.
- **F4SE scripts** (`F4SELib.ppj`, etc.) must match your F4SE version. If you're on NG F4SE 0.7.x, use the 0.7.x script sources.
- **CC scripts** (AE): The 76 CC items add new scripts and keywords. If your mod extends something from a CC ESL, ensure that ESL is in your masters.

### New CC Papyrus keywords (AE)
```papyrus
; Checking for CC content availability at runtime
; Example: check if Enclave Remnants CC is loaded
Bool Function IsCCLoaded(String asPluginName)
    Return (Game.GetFormFromFile(0x800, asPluginName) != None)
EndFunction

; Usage in your script:
If IsCCLoaded("ccOTMFO4001-Remnants.esl")
    ; Add Enclave Remnants patch logic
EndIf
```

---

## BA2 Archive Format by Version

| Format | Version | Used by | Pack with |
|---|---|---|---|
| V1 (General) | OG + NG | Most mod assets | Archive2, BAE, CMT/CAO |
| V1 (Textures) | OG + NG | Texture-specific BA2 | Archive2, BAE |
| V7/V8 | NG only | Some bundled CC content | Archive2 (NG version only) |

**Modders: always use V1** unless specifically targeting NG-exclusive bundled content. V1 works on both OG and NG.

If a user gets an error opening a BA2, check:
- Is it a V7/V8 archive from the NG bundled CC? If so, they need the NG version of BAE or Archive2.
- Is it a V1 archive and they're on OG? Should work — if not, archive may be corrupt.

---

## Creation Kit Setup by Version

### OG CK (for pre-NG game)
- Install via Steam (Fallout 4 Creation Kit, free in library).
- The version installed post-NG update is the **NG CK** — to get the OG CK, you must use a downgraded depot or backup.
- Use **CKPE 0.3.x** with OG CK. Set `bOwnArchiveLoader=false` if BA2 issues occur.

### NG CK (for NG/AE game)
- Install via Steam — the current CK is the NG version.
- Use **CKPE 0.5+** (latest from GitHub — do NOT use old Nexus versions).
- The NG CK natively understands V7/V8 BA2 archives and all 76 CC ESLs.
- AE note: All 76 CC ESLs are automatically available as masters in NG CK without extra steps.

---

## Common User Questions by Version

### "My mod worked before the update, now it crashes"
→ Check if the mod has F4SE plugins (`.dll` files). If yes, it needs a NG update. Search Nexus for "[Mod Name] NG" or check the mod's bugs/changelog. If no NG version exists, downgrade the game.

### "Do I need to downgrade?"
→ Only if a mod you need doesn't have an NG build. Most mods have been updated since April 2024. Guide them through the Downgrade Patcher if necessary.

### "Do I need to buy AE?"
→ No. AE content was given free to all owners with the NG update. If they have NG, they have AE.

### "Is my old mod list still valid?"
→ If built for OG (pre-April 2024), many mods likely need NG updates. Check the list curator's page — most Wabbajack lists now have NG-specific releases.

### "Which version should I mod for?"
→ **Mod for NG/AE if starting fresh.** The community has largely moved to NG. Use NG CK, F4SE 0.7.x, and PRP 81+. AE content patches are optional unless you want to cover the CC items.

### "How do I check if my mods are NG-compatible?"
→ Load your full list in xEdit 4.1.5f+. Any mod with F4SE plugins — check the plugin `.dll` file version. Go to **Buffout 4**'s log after a crash: it shows exact DLL file versions that need updating.

---

## Quick Version Checklist for Mossy

When a user reports a problem, ask:
1. **"Which version of Fallout 4 are you on?"** — OG (1.10.163), NG (1.10.980+), or unsure?
2. **"Are you using F4SE?"** — If yes, which version?
3. **"What mod manager?"** — MO2 or Vortex — and is the F4SE launcher set as the executable?
4. **"Do you have Creation Club content (AE)?"** — Relevant for PRP, UFO4P, and CC-patching mods.

Never assume OG or NG — always confirm. The same symptom can have completely different solutions on each version.

---

## Reference: Key Version-Specific Nexus IDs

| Resource | OG version | NG/AE version |
|---|---|---|
| F4SE | silverlock.org (0.6.23) | silverlock.org (0.7.x) |
| Address Library | Nexus #47327 (OG) | Nexus #47327 (choose AiO Anniversary) |
| Buffout 4 | Nexus #47359 | Nexus #47359 (check NG build) |
| PRP | Nexus #17183 (≤74) | Nexus #17183 (81+) |
| Downgrade Patcher | N/A | Nexus #81463 |
| MCM Framework | Nexus #21497 | Nexus #21497 (NG variant) |
| CKPE | Nexus (0.3.x) | GitHub latest (0.5+) |

---

*Last verified: April 2025. Fallout 4 version history: 1.10.163 (OG final) → 1.10.980 / 1.10.984 (NG, April 2024).*
