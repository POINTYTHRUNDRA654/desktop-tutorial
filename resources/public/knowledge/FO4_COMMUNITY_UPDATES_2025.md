# Fallout 4 Community Updates — 2024–2026

> **Mossy authoritative reference for everything that changed post-April 2024 (Next Gen) through early 2026.**
> Always consult this document alongside `FALLOUT4_VERSIONS_GUIDE.md` when advising users on tool versions and compatibility.

---

## The Major Updates at a Glance

| Date | Event | Modding Impact |
|---|---|---|
| April 25, 2024 | **NG Update (1.10.980 → 1.10.984)** | Broke all F4SE DLL mods; BA2 V7/V8 introduced |
| Late 2024 | **F4SE 0.7.x stabilises for NG** | Most F4SE mods updated; Address Library AiO required |
| March 2025 | **Buffout 4 NG v1.37.0** | Unified DLL for OG + NG; PDB support |
| Mid 2025 | **X-Cell rebranded → Addictol** | Replaces several older stability shims |
| November 10, 2025 | **v1.11.169 "Creations Menu" patch** | F4SE broken again; new Creations Menu + Verified Creator Program |
| December 2025 | **F4SE 0.7.7 for runtime 1.11.191** | Restores F4SE compatibility with latest game executable |
| March 2026 | **PRP 81.3 / 81.5** | Latest stable Previsibines Repair Pack releases |

---

## Version 4: v1.11.x — The "Creations Menu" Update (November 2025)

**Game version:** 1.11.169 → 1.11.191 (and later patches)

Bethesda released this update on **November 10, 2025**. It is the largest change since the April 2024 NG patch and has significant modding implications.

### What changed in v1.11.x

- **Creations Menu**: A new unified in-game browser replaces the old Creation Club tab. Players can browse, download, and manage both Bethesda "Creations" (formerly CC) and verified community mods from inside the game.
- **Verified Creator Program**: Replaces the old Creation Club monetisation model. Community mod authors can apply to become "Verified Creators" and distribute paid or free content through the Creations system.
- **VATS accuracy bug fixed**: Long-standing VATS targeting issue resolved.
- **UI/bundle pricing changes**: Mod bundle pricing UI updated.
- **Ultrawide support expanded**: Continued improvements to 21:9 and wider display layouts.
- **Crash/stability fixes**: Several crash-on-save and crash-on-mod-load bugs addressed.
- **Console mod load order reset**: Console players' load orders were reset; they must restore them manually.

### Modding implications of v1.11.x

- **F4SE broke again** on release day. Any mod shipping a `.dll` (F4SE plugin) stopped working until updated for runtime 1.11.x.
- **Bethesda's own warning**: Bethesda specifically warned users to **disable or remove main-menu-modifying mods before updating**, as the new Creations Menu replaces the main menu structure.
- Large fan expansion mods (Fallout: London, Sim Settlements 2, America Rising 2) lost compatibility until their authors updated them.
- Console players were advised to **back up their load order via Bethesda.net before updating**.
- **Workaround**: Use Steam's depot rollback trick to stay on 1.10.984 while waiting for tool/mod updates. The Downgrade Patcher (Nexus #81463) also supports rollback.

### Required tool versions for v1.11.x

| Tool | Version for 1.11.x | Notes |
|---|---|---|
| F4SE | **0.7.7** | For runtime 1.11.191; download from f4se.silverlock.org |
| Address Library | **1.11.191** | "All In One (Anniversary Edition)" build; Nexus #47327 |
| Buffout 4 NG | **1.37.0+** | Check GitHub for newer builds |
| Addictol (X-Cell) | Latest | See below |
| High FPS Physics Fix | **0.8.13+** | Nexus #44798 |
| PRP | **81.5** | Nexus #46403; March 2026 release |
| UFO4P | Latest | Always use latest |
| xEdit / FO4Edit | **4.0.3+** | Supports NG + 1.11.x records |
| LOOT | **0.21+** | Understands NG/AE masters |
| MCM Framework (MCM NG) | NG build required | Check mod page for 1.11.x note |

---

## Key Tool Updates (2024–2026)

### F4SE — Fallout 4 Script Extender
- OG final: **0.6.23** (for 1.10.163)
- NG builds: **0.7.0 → 0.7.7** (for 1.10.980 → 1.11.191)
- Always download from **f4se.silverlock.org** — do not use old Nexus mirrors.
- After every Bethesda patch, check silverlock.org before launching with mods.
- Test in console with `GetF4SEVersion()`.

### Address Library for F4SE Plugins
- **Nexus mod ID: 47327**
- Install the **"All In One (Anniversary Edition)"** option for all NG/1.11.x versions.
- Required by Buffout 4 NG, Addictol, High FPS Physics Fix, MCM NG, and almost every `.dll` mod.
- Latest version: **1.11.191** (matches the runtime).

### xEdit / FO4Edit
- **Version: 4.0.3+** (check TES5Edit GitHub for latest)
- Now supports all NG and 1.11.x records.
- Use **4.0.3+** for all cleaning and conflict resolution — older guides referencing 3.x cleaning procedures are no longer valid with xEdit 4.x.
- Required for navmesh repair workflows (see `NAVMESH_FIX_GUIDE.md`).

### Buffout 4 NG
- **Nexus mod ID: 64880** | **GitHub: alandtse/Buffout4**
- Version **1.37.0** (March 2025) — unified DLL for OG + NG, PDB support for readable crash logs.
- Requires: Address Library, F4SE, Microsoft Visual C++ Redistributables (2022 x64).
- Crash logs written to `%LOCALAPPDATA%\Fallout4\F4SE\` — share logs in the Collective Modding Discord for help.
- **Pair with CLASSIC** for automated crash log scanning.

### Addictol (formerly X-Cell)
- X-Cell was rebranded as **Addictol** in mid-2025.
- Handles threading, IO limits, and many subtle engine bugs that Buffout 4 NG does not address.
- Recommended to use **both** Buffout 4 NG (crash logging) **and** Addictol (engine fixes) for maximum stability.
- See The Midnight Ride guide (themidnightride.moddinglinked.com) for latest installation order.

### High FPS Physics Fix
- **Nexus mod ID: 44798**
- Version **0.8.13+** (early 2026)
- **Critical for anyone playing above 60 FPS.** Without it, physics bugs, script misfires, and broken game mechanics occur at high framerates.
- Install even if you cap at 60 FPS — it resolves subtle timing edge cases.
- Requires F4SE and Address Library.

### BakaMaxPapyrusOps (BakaFramework)
- Advanced F4SE script function expansions — widely required by NG-era script-heavy mods and frameworks.
- Required by several settlement mods, FallUI, and MCM NG.
- Always use the version matching your F4SE build.

### PRP — Previsibines Repair Pack
- **Nexus mod ID: 46403**
- **v81.5** (March 2026) — latest stable release.
- v81+ is required for AE/NG (covers the 76 CC ESLs introduced with NG).
- v74 is the last OG-compatible version.
- Load PRP **late in load order** (after all worldspace-editing mods).
- Requires UFO4P. Use compatibility patches for settlement/weather mods.

---

## New Must-Have Mods (2024–2026 Era)

### CLASSIC — Crash Log Auto Scanner & Setup Integrity Checker
- **Nexus mod ID: 56255** | **GitHub: GuidanceOfGrace/CLASSIC-Fallout4**
- Scans Buffout 4 crash logs and checks game/mod integrity.
- Supports 250+ error scenarios with recommended fixes.
- Validates that F4SE, Buffout 4, Address Library, and dependencies are correctly installed.
- Detects mod file corruption and missing assets.
- Open-source, actively maintained. Run it **every time you have a crash**.

### Canary Save Scummer
- Save file health checker — detects save corruption early.
- Essential for heavily-modded setups where save bloat and corruption are common risks.
- Warns when save data contains references to removed/changed mods.

### FallUI Suite
- **FallUI HUD** (Nexus #51813): Fully configurable HUD with in-game layout manager. Every widget is independently movable.
- **FallUI Inventory**: Overhauls inventory management and sorting.
- **FallUI Map**: Overhauled Pip-Boy map with high-res support and improved navigation.
- Requires F4SE and MCM NG.

### MCM NG (Mod Configuration Menu — Next Gen)
- The current standard in-game mod settings menu.
- Required by FallUI, many gameplay mods, and quality-of-life tools.
- **Use the NG build** — the legacy MCM Framework does not work on NG/1.11.x.
- Allows in-game configuration without editing `.ini` files.

### LooksMenu
- Advanced character customisation overlay (face sculpting, overlays, etc.).
- Required by many follower and appearance mods.
- Must use NG-compatible build.

---

## Curated Modlists for NG/AE (2025)

### Nexar's Curated Fallout 4 Modlist — 2025 Edition
- Handpicked collection optimised for Next-Gen/Anniversary Edition — **no downgrade required**.
- Includes: Modern community textures, refined Previs/Precombines, LODs, FaceGen fixes, Sim Settlements 2.
- See: nexarplays.co.za/fallout4 and the associated YouTube playlist.

### The Midnight Ride
- Community modding guide at **themidnightride.moddinglinked.com**.
- Considered the authoritative NG modding setup guide.
- Covers Addictol, Buffout 4 NG, High FPS Physics Fix, FallUI, MCM NG, and full load order guidance.
- Changelog kept up to date with every new Bethesda patch.

### Wabbajack NG-Ready Lists
- Automated modlist installers for curated, tested setups.
- Several lists now specifically target NG (1.10.980+) or 1.11.x.
- Use a **Virtual File System (VFS)** profile to isolate the modded game from the clean install.

---

## The Creations Platform (November 2025+)

### What it is
- Bethesda's new unified mod distribution system, replacing the old Creation Club tab.
- Accessible from the game's main menu → Creations.
- Supports both **free** and **paid** mods from Verified Creators.
- All 76 original CC items (bundled with AE) remain available as always.

### Verified Creator Program
- Mod authors can apply to become Verified Creators and distribute mods (free or paid) through Bethesda's official pipeline.
- Nexus Mods added a "Works with Anniversary Edition (Creations)" compatibility tag so users can identify compatible mods.

### Modding implications
- Mods distributed through the Creations system load as `.esl` or `.esp` files — treat them like any other mod in your load order.
- **Console players**: Back up your load order via Bethesda.net before any Bethesda patch.
- PC players can continue using Nexus/MO2/Vortex as normal — the Creations platform is additive, not replacing existing workflows.

---

## Notable Community Mods / Total Conversions (2024–2026)

### Fallout: London
- Massive total conversion mod transporting players to post-apocalyptic London.
- Initially had compatibility issues post-NG update; check for the latest hotfix/update.
- Play on a dedicated MO2 profile to avoid conflicts with other setups.
- Requires a specific game version — check the mod page for current requirements.

### Project Mojave
- Brings Fallout: New Vegas locations to Fallout 4's engine.
- Showcases the community's ambition for cross-game recreation projects.

### Atomic World 2.0
- Updated land expansion mod compatible with NG.

### Transfer Settlements Blueprints
- Updated for NG; allows sharing and importing full settlement builds.

---

## Legacy Mod Status (2025+)

### AWKCR — Armor and Weapon Keywords Community Resource
- **AWKCR is no longer actively maintained** (as of 2024–2025).
- Many framework mods that previously required it have moved away or provide standalone versions.
- If a mod requires AWKCR, check for an updated "AWKCR-free" version on its Nexus page.
- New mods should **not** depend on AWKCR — use standalone keywords or ECO instead.

### Old Buffout 4 (pre-NG)
- The original Buffout 4 (pre-alandtse fork) is **not fully compatible with NG or 1.11.x**.
- Always use **Buffout 4 NG** (Nexus #64880) — this is the maintained fork.

### Pre-2024 F4SE Plugins
- Any `.dll` mod compiled for 1.10.163 will crash the game on NG or 1.11.x.
- Check the mod's Nexus page for an NG-compatible build before installing.

---

## Quick Stability Stack for 2026

Install these in order for a stable foundation before adding any content mods:

```
1. F4SE 0.7.7+ (from f4se.silverlock.org)
2. Address Library for F4SE — All In One (Nexus #47327)
3. Buffout 4 NG v1.37.0+ (Nexus #64880)
4. Addictol / X-Cell (latest — see The Midnight Ride)
5. High FPS Physics Fix 0.8.13+ (Nexus #44798)
6. BakaMaxPapyrusOps (matching F4SE version)
7. Unofficial Fallout 4 Patch (UFO4P) — latest
8. PRP 81.5 (Nexus #46403)
9. MCM NG (NG build)
10. CLASSIC crash scanner (Nexus #56255)
11. Canary Save Scummer
```

Load order for stability mods: **Buffout 4 / Addictol** load via F4SE automatically; **PRP loads late** (after worldspace mods); **UFO4P loads after all DLC**.

---

## Common 2025/2026 User Problems

### "My mods broke after the November 2025 update"
→ Runtime 1.11.x broke F4SE. Check if F4SE 0.7.7 and Address Library 1.11.191 are installed. Replace any DLL mods with their 1.11.x-compatible builds.

### "Creation Kit won't load after updating"
→ Ensure you have the NG CK from Steam and CKPE 0.5+ (from GitHub, not old Nexus versions). The CK is matched to the game runtime.

### "Fallout: London crashes on startup"
→ Check the mod page for the latest hotfix. Use a dedicated MO2 profile and match your F4SE version to the game version listed in the mod's requirements.

### "PRP is causing flickering in settlements"
→ You have a worldspace-editing mod without a PRP compatibility patch. Identify the conflicting plugin with xEdit and install the corresponding PRP patch.

### "AWKCR is missing — mods fail to load"
→ The mod requiring AWKCR is old or unmaintained. Look for an AWKCR-free version or an updated fork. Consider switching to ECO (Equipment and Crafting Overhaul) as a modern alternative.

---

*Last updated: March 2026. Game runtime history: 1.10.163 (OG) → 1.10.980/984 (NG, April 2024) → 1.11.169/191 (Creations Menu, November 2025).*
