# Fallout 4 Versions Guide — OG, NG, and AE

> **This is Mossy's authoritative reference for all three Fallout 4 release states.**
> Always ask which version a user is running before giving version-sensitive advice.

---

## The Four Versions at a Glance

| Feature | OG (Old Gen / Legacy) | NG (Next Gen) | AE (community label: NG + 76 CC items) | v1.11.x (official "Anniversary Edition", Nov 2025) |
|---|---|---|---|---|
| **Game EXE version** | 1.10.163.0 (and earlier) | 1.10.980.0 – 1.10.984.0+ | Same EXE as NG (1.10.980+) | 1.11.169 – 1.11.191+ |
| **Release date** | Nov 2015 → before Apr 2024 | April 25, 2024 | April 25, 2024 (bundled with NG) | November 10, 2025 |
| **F4SE version** | 0.6.23 | 0.7.2–0.7.x | 0.7.x | **0.7.7** |
| **BA2 archive format** | Version 1 (V1) | Version 1–8 (game ships V7/V8 for new assets) | Same as NG | Same as NG |
| **Creation Kit (CK)** | OG CK (1.10.163 era) | NG CK (1.10.982+) | Same as NG CK | NG CK (updated) |
| **CKPE version** | V0.3 for OG CK | V0.5+ for NG CK | V0.5+ | V0.5+ (latest GitHub) |
| **Creation Club / Creations** | Optional (paid) | Optional OR bundled (76 items free) | 76 CC items **included** | Unified **Creations Menu** in-game |
| **Mods compatibility** | Most pre-2024 mods work | Many mods need NG updates | Same as NG + CC-aware mods | DLL mods need 1.11.x rebuild |
| **Downgrade possible?** | N/A (is the base) | Yes — via Downgrade Patcher | Yes — downgrades to OG | Yes — roll back to 1.10.984 |

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
- **Load order tools**: LOOT 0.21+ supports NG. xEdit 4.0.4+ supports NG and 1.11.x.

### NG Tools versions
| Tool | Minimum version for NG | Notes |
|---|---|---|
| F4SE | 0.7.2+ | Download from f4se.silverlock.org — use the NG build |
| xEdit / FO4Edit | 4.0.4+ | Required for all BA2 work on NG |
| CKPE | 0.5+ | Use latest from GitHub, not Nexus |
| PRP | 81+ | 81 is the minimum; 81.5 (March 2026) is current stable |
| UFO4P | 2.1.5+ | Latest always preferred |
| LOOT | 0.21+ | Earlier versions don't understand NG masters |
| MCM NG | Must be NG build | Use "MCM NG" — legacy MCM Framework does not work on NG |
| Addictol | Latest | **ALL-IN-ONE stability tool** — supersedes Buffout 4 (all variants). Do NOT also install Buffout 4. Nexus #84214 |
| High FPS Physics Fix | 0.8.13+ (Nexus #44798) | Critical for play above 60 FPS |
| Address Library | AiO Anniversary build | Nexus #47327 — required by all DLL mods on NG |
| CLASSIC | Latest (Nexus #56255) | Crash log auto-scanner; run after every CTD |

### Downgrading from NG to OG
Users sometimes downgrade to run mod lists that haven't been updated for NG.

**Method**: Use the "Downgrade Patcher" by Hador-sCZ (on Nexus, mod ID 81463).

---

## Version 4: v1.11.x — The Official "Anniversary Edition" Update (November 2025)

> **⚠️ AE Naming Disambiguation**: Bethesda officially branded the November 2025 / 1.11.x release as **"Fallout 4: Anniversary Edition"** (the same name used for the Switch 2 port). However, the Fallout 4 modding community has long used "AE" informally to mean the April 2024 NG update + the 76 bundled CC items (EXE 1.10.984). When a user says "AE", always confirm: **community AE = NG + 76 CC items (1.10.984)** vs **official Bethesda AE = 1.11.x (November 2025)**. This guide uses "1.11.x" for the November 2025 release to minimise confusion.

**Game version:** 1.11.169 → 1.11.191 (and later patches). Released **November 10, 2025**.

### What changed in v1.11.x
- **Creations Menu**: A new unified in-game browser replaces the old Creation Club tab. Browse, download, and manage both Bethesda content and verified community mods from inside the game.
- **Verified Creator Program**: Community authors can distribute paid or free mods through Bethesda's official pipeline.
- **VATS accuracy bug fixed**; ultrawide display improvements; crash-on-save fixes.
- **Console mod load order reset**: Console players' load orders were wiped; back up via Bethesda.net before updating.

### Modding implications of v1.11.x
- **F4SE broke again** on release day. Every `.dll` mod stopped working until updated for runtime 1.11.x.
- **Bethesda warning**: Disable or remove main-menu-modifying mods before updating — the new Creations Menu replaces the main menu structure.
- Large mods (Fallout: London, Sim Settlements 2, America Rising 2) lost compatibility until authors updated them.
- **Rollback**: Use Steam depot rollback or the Downgrade Patcher to stay on 1.10.984 while waiting for updates.

### Required tool versions for v1.11.x
| Tool | Version for 1.11.x | Notes |
|---|---|---|
| F4SE | **0.7.7** | For runtime 1.11.191; from f4se.silverlock.org |
| Address Library | **1.11.191 build** | AiO Anniversary option; Nexus #47327 |
| Addictol | **Latest** | Nexus #84214; ALL-IN-ONE stability tool; supersedes Buffout 4 (all variants) — do NOT also install Buffout 4 |
| High FPS Physics Fix | **0.8.13+** | Nexus #44798 |
| PRP | **81.5** | Nexus #46403; March 2026 release |
| xEdit / FO4Edit | **4.0.4+** | Supports 1.11.x records |
| MCM NG | NG/1.11.x build | Check mod page for 1.11.x note |
- This restores EXE 1.10.163.0.
- After downgrading: also downgrade the CK (if you use it), and run CMT to convert any V7/V8 BA2 files back to V1.
- Replace `Fallout4 - Shaders.ba2` with the OG version (found inside `CreationKitPlatformExtended_FO4_Resources.pak` from the CKPE 0.5 kit — extract `CreationKit - Shaders - OG.ba2` and rename).

---

## Version 3: AE (Community Label — NG + 76 CC Items)

**"AE" in the Fallout 4 community specifically means**: the NG update package that included **76 free Creation Club (CC) items** bundled in for all owners. This is the "Anniversary" content. Note: Bethesda later officially named the November 2025 / 1.11.x release "Anniversary Edition" — see the Version 4 disambiguation box above.

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
| 1.11.169 – 1.11.191+ | v1.11.x (Creations Menu update) |
| 1.10.163 + says "Special Edition" or "AE" anywhere | Downgraded |

Alternatively, ask them to right-click `Fallout4.exe` → Properties → Details → File version.

---

## Version-Specific F4SE Setup

### For OG (1.10.163)
1. Download **F4SE 0.6.23** from f4se.silverlock.org.
2. Copy `f4se_1_10_163.exe`, `f4se_loader.exe`, `f4se_steam_loader.dll` into the **game root** folder.
3. Launch via `f4se_loader.exe` (or through MO2/Vortex with the F4SE launcher set).
4. Test in console: `GetF4SEVersion()` should return `0.06.23`.

### For NG (1.10.980+) and v1.11.x (1.11.169+)
1. Download **F4SE 0.7.7** (for 1.11.x) or **F4SE 0.7.2+** (for 1.10.980) from f4se.silverlock.org — always use the build that matches your exact runtime.
2. Copy the matching `.exe`, `f4se_loader.exe`, and `f4se_steam_loader.dll` into game root.
3. Address Library for F4SE — install the **"All In One (Anniversary Edition)"** version from Nexus (mod ID 47327). This is required for all F4SE plugins to work on NG and 1.11.x.
4. Launch via `f4se_loader.exe`.
5. Test in console: `GetF4SEVersion()` should return `0.07.xx`.

### F4SE Plugin Compatibility Check
Before installing any F4SE plugin (`.dll`), check:
- Does the mod page say "NG compatible", "1.11.x compatible", or list the exact runtime version?
- Check the FOMOD installer — many now include OG, NG, and 1.11.x DLL variants and auto-select.
- If no matching build exists: the plugin will crash the game on startup. Check the mod's "Bugs" or "Posts" section on Nexus.
- After any Bethesda patch, check f4se.silverlock.org and mod pages before launching with mods.

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
→ Check if the mod has F4SE plugins (`.dll` files). If yes, it needs a build for your runtime. Search Nexus for "[Mod Name] NG" or "[Mod Name] 1.11" or check the mod's bugs/changelog. If no matching build exists, downgrade the game.

### "My mods broke after the November 2025 update"
→ Runtime 1.11.x broke F4SE again. Install F4SE 0.7.7 and Address Library 1.11.191 build, then replace all DLL mods with their 1.11.x-compatible builds.

### "Do I need to downgrade?"
→ Only if a mod you need doesn't have a build for your runtime. Most major mods were updated for NG; 1.11.x builds are catching up. Guide them through the Downgrade Patcher if necessary.

### "Do I need to buy AE?"
→ No. AE content was given free to all owners with the NG update. v1.11.x included additional Creations Menu integration; also free.

### "Is my old mod list still valid?"
→ If built for OG (pre-April 2024), many mods need NG updates. If built for NG (pre-November 2025), DLL mods may need 1.11.x updates. Check the list curator's page.

### "Which version should I mod for?"
→ **Mod for 1.11.x if starting fresh in 2026.** The community has moved to NG/1.11.x. Use NG CK, F4SE 0.7.7, PRP 81.5, and Addictol. AE content patches are optional unless you want to cover the CC items.

### "How do I check if my mods are NG/1.11.x-compatible?"
→ Load your full list in xEdit 4.0.4+. For any mod with F4SE plugins — check the `.dll` file version. Run **CLASSIC** (Nexus #56255) after any CTD to identify which DLLs need updating.

---

## Quick Version Checklist for Mossy

When a user reports a problem, ask:
1. **"Which version of Fallout 4 are you on?"** — OG (1.10.163), NG (1.10.980–1.10.984), 1.11.x (1.11.169+), or unsure?
2. **"Are you using F4SE?"** — If yes, which version? (0.6.23 for OG / 0.7.7 for 1.11.x)
3. **"What mod manager?"** — MO2 or Vortex — and is the F4SE launcher set as the executable?
4. **"Do you have Creation Club content (AE)?"** — Relevant for PRP, UFO4P, and CC-patching mods.
5. **"Did you update the game recently?"** — The November 2025 patch (1.11.x) broke all DLL mods.

Never assume OG, NG, or 1.11.x — always confirm. The same symptom can have completely different solutions on each version.

---

## Reference: Key Version-Specific Nexus IDs

| Resource | OG version | NG/AE version | 1.11.x version |
|---|---|---|---|
| F4SE | silverlock.org (0.6.23) | silverlock.org (0.7.x) | silverlock.org (0.7.7) |
| Address Library | Nexus #47327 (OG) | Nexus #47327 (AiO Anniversary) | Nexus #47327 (1.11.191 build) |
| Addictol | N/A | Nexus #84214 (ALL-IN-ONE; supersedes Buffout 4) | Nexus #84214 |
| PRP | Nexus #46403 (≤74) | Nexus #46403 (81+) | Nexus #46403 (81.5) |
| Downgrade Patcher | N/A | Nexus #81463 (to OG) | Nexus #81463 (to 1.10.984) |
| MCM NG | Nexus #21497 | Nexus #21497 (NG variant) | Nexus #21497 (1.11.x build) |
| CKPE | Nexus (0.3.x) | GitHub latest (0.5+) | GitHub latest (0.5+) |
| CLASSIC | N/A | Nexus #56255 | Nexus #56255 |
| High FPS Physics Fix | N/A | Nexus #44798 | Nexus #44798 (0.8.13+) |
| Canary Save Scummer | N/A | Nexus (latest) | Nexus (latest) |

---

*Last updated: April 2026. Fallout 4 version history: 1.10.163 (OG final) → 1.10.980/984 (NG, April 2024) → 1.11.137/191 (official Anniversary Edition, November–December 2025).*
