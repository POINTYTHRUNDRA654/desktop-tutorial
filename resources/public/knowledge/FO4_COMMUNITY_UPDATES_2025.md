# Fallout 4 Community Updates — 2024–2026

> **Mossy authoritative reference for everything that changed post-April 2024 (Next Gen) through early 2026.**
> Always consult this document alongside `FALLOUT4_VERSIONS_GUIDE.md` when advising users on tool versions and compatibility.

---

## The Major Updates at a Glance

| Date | Event | Modding Impact |
|---|---|---|
| April 25, 2024 | **NG Update (1.10.980 → 1.10.984)** | Broke all F4SE DLL mods; BA2 V7/V8 introduced |
| Late 2024 | **F4SE 0.7.x stabilises for NG** | Most F4SE mods updated; Address Library AiO required |
| March 2025 | **Buffout 4 NG v1.37.0** | Unified DLL for OG + NG; PDB support (now superseded by Addictol) |
| Mid 2025 | **X-Cell evolved → Addictol** | All-in-one engine patch; supersedes Buffout 4 (all variants), X-Cell, BakaMaxPapyrusOps, Faster Workshop, and more |
| November 10, 2025 | **v1.11.x "Anniversary Edition" update** | Bethesda's official "Anniversary Edition" branding; F4SE broken again; Creations Menu + Verified Creator Program; 150+ bundled CC items |
| December 2025 | **F4SE 0.7.7 for runtime 1.11.191** | Restores F4SE compatibility with latest game executable |
| March 2026 | **PRP 81.3 / 81.5** | Latest stable Previsibines Repair Pack releases |

---

## Version 4: v1.11.x — The "Anniversary Edition" Update (November 2025)

> **⚠️ AE Naming Disambiguation**: Bethesda officially branded the November 2025 / 1.11.x update as **"Fallout 4: Anniversary Edition"**. However, in community usage (Nexus, Reddit, Discord) "AE" has historically referred to the April 2024 NG update with the 76 bundled free CC items (EXE 1.10.984). When someone says "AE" always clarify which they mean — **community AE = NG + 76 CC items (1.10.984)**, **official Bethesda AE = 1.11.x (November 2025)**. This guide uses "1.11.x" to refer to the official Anniversary Edition to avoid confusion.

**Game version:** 1.11.137 (November 10, 2025) → 1.11.191 (December 2025, current)

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
| Addictol | **Latest** | **ALL-IN-ONE stability tool** — supersedes Buffout 4 (all variants). Do NOT also install Buffout 4. |
| High FPS Physics Fix | **0.8.13+** | Nexus #44798 |
| PRP | **81.5** | Nexus #46403; March 2026 release |
| UFO4P | Latest | Always use latest |
| xEdit / FO4Edit | **4.0.4+** | Supports NG + 1.11.x records |
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
- Required by Addictol, High FPS Physics Fix, MCM NG, and almost every `.dll` mod.
- Latest version: **1.11.191** (matches the runtime).

### xEdit / FO4Edit
- **Version: 4.0.4+** (check TES5Edit GitHub for latest)
- Now supports all NG and 1.11.x records.
- Use **4.0.4+** for all cleaning and conflict resolution.
- Required for navmesh repair workflows (see `NAVMESH_FIX_GUIDE.md`).

### Addictol — ALL-IN-ONE Stability Tool (supersedes Buffout 4)
- **Nexus mod ID: 84214** | Evolved from X-Cell; now a complete engine-patch suite
- **Addictol supersedes and includes Buffout 4 (OG / NG / AE).** Do NOT install any flavour of Buffout 4 alongside Addictol — they will conflict.
- **What it handles**: memory manager (vmm allocator), small-block/scaleform allocators, FaceGen bugs, micro-stutter, BakaMaxPapyrusOps, Interior NavCut Fix, Faster Workshop, Long Save Bug Fix, Disk Cache Enabler, Drop 7FFF Fix, Escape Freeze fix, and many engine crash fixes. See the full `[Patches]` / `[Fixes]` / `[Additional]` config for the complete list.
- **Do NOT install alongside Addictol** (superseded/included): Buffout 4 (all variants), X-Cell, Mentats, Baka ScrapHeap, Fallout Priority, Private Profile Redirector, Escape Freeze, BakaMaxPapyrusOps, Interior NavCut Fix, Persistent Volume Sliders, Long Save Bug Fix, Disk Cache Enabler, Drop 7FFF Fix, Faster Workshop.
- Great for Fallout: London, Sim Settlements 2, and any overhaul with large settlement builds.
- Required: F4SE + Address Library AiO (Nexus #47327).

### Buffout 4 NG — ⚠️ Superseded by Addictol
- **Nexus mod ID: 64880** | **GitHub: alandtse/Buffout4**
- **⚠️ If you are using Addictol, do NOT install Buffout 4 (any variant: OG / NG / AE).** Addictol includes all of Buffout 4's functionality. Installing both will cause conflicts.
- Buffout 4 NG remains relevant **only** if you specifically need it without Addictol (uncommon), or for historical reference in older guides.
- **Pair with CLASSIC** for crash log scanning if not using Addictol.

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

### Sim Settlements 2
- **Current version: 3.5.3** (March 2026) — covers Chapters 1, 2, and 3.
- Compatible with 1.10.163 (OG) through 1.11.x; built and tested against OG but forward-compatible.
- **Warning**: Avoid using the in-game Creations menu if you rely on SS2 — enabling/disabling mods through the in-game menu can cause instability with large mods. Always manage your load order through MO2 or Vortex.
- SS2 and Fallout: London are not officially compatible — both are massive overhauls; expect conflicts without a dedicated patch.

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
- Covers Addictol, High FPS Physics Fix, FallUI, MCM NG, and full load order guidance.
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

### Buffout 4 (all variants) / X-Cell / BakaMaxPapyrusOps / Baka ScrapHeap / Fallout Priority / Private Profile Redirector
- **All superseded by Addictol** — do NOT install any of them alongside Addictol.
- If you have any installed, remove them before adding Addictol. This includes Buffout 4 OG, Buffout 4 NG, and X-Cell.

### Pre-2024 F4SE Plugins
- Any `.dll` mod compiled for 1.10.163 will crash the game on NG or 1.11.x.
- Check the mod's Nexus page for an NG-compatible build before installing.

---

## Quick Stability Stack for 2026

Install these in order for a stable foundation before adding any content mods:

```
1. F4SE 0.7.7+ (from f4se.silverlock.org)
2. Address Library for F4SE — All In One (Nexus #47327)
3. Addictol (Nexus #84214) — ALL-IN-ONE stability tool (memory, crashes, script perf, workshop, and more)
   ⚠️ Do NOT also install Buffout 4, X-Cell, BakaMaxPapyrusOps, Faster Workshop, or any other superseded mod (see Addictol mod page for full list)
4. High FPS Physics Fix 0.8.13+ (Nexus #44798)
5. Unofficial Fallout 4 Patch (UFO4P) — latest
6. PRP 81.5 (Nexus #46403)
7. MCM NG (NG build)
8. CLASSIC crash scanner (Nexus #56255)
9. Canary Save Scummer
```

Load order for stability mods: **Addictol** loads via F4SE automatically; **PRP loads late** (after worldspace mods); **UFO4P loads after all DLC**.

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

## Platform Notes (2026)

### Nintendo Switch 2
- Fallout 4: Anniversary Edition launched on Switch 2 in 2026 with all 6 DLCs and 150+ curated CC items.
- **PC modding is unaffected** — Switch 2 does not support open community modding (no F4SE, no Nexus, no MO2). Only curated Creations content via Bethesda's in-game menu is available.
- If a user mentions "Switch 2", confirm they are asking about official CC content, not traditional PC mod workflows.

---

*Last updated: April 2026. Game runtime history: 1.10.163 (OG) → 1.10.980/984 (NG, April 2024) → 1.11.137/191 (Anniversary Edition, November–December 2025).*
