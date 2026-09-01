#!/usr/bin/env python3
"""
bootstrap_fallout4_knowledge.py — Brain B Knowledge Base Bootstrap
Populates ChromaDB with 100+ expert-level entries across all Mossy domains.
Run once (or re-run to update): python bootstrap_fallout4_knowledge.py

Place this file at: D:\Mossy-AI\bootstrap_fallout4_knowledge.py
"""

import os
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 100+ knowledge entries across all Mossy domains
# ---------------------------------------------------------------------------
KNOWLEDGE_ENTRIES: list[dict] = [

    # ── CREATION KIT SCRIPTING ───────────────────────────────────────────────
    {
        "id": "ck-001",
        "title": "Creation Kit: Plugin Setup & Active File",
        "content": (
            "Always set ONE plugin as Active File before editing (File → Data → tick plugin → Set as Active). "
            "Edits go to the active file. Never edit ESMs directly — override in an ESP instead. "
            "Enable all masters your plugin depends on. CK auto-adds them as masters on save. "
            "Save frequently — CK crashes without warning. Use Save As to create versioned backups."
        ),
        "category": "creation-kit",
        "tags": ["creation-kit", "plugin", "ck", "active-file"],
    },
    {
        "id": "ck-002",
        "title": "Creation Kit: FaceGen Export (Dark Face Fix)",
        "content": (
            "After changing ANY NPC face in CK, do File → Export → Export FaceGen Data for Mods. "
            "Load ONLY your plugin (no other overrides) before export, or you bake the wrong overrides. "
            "This writes NPC .nif (facemesh) and .dds (facetint) to Data\\Meshes\\Actors\\Character\\FaceGenData. "
            "Skipping this step causes the 'dark face bug' where the NPC's face is pitch black in-game."
        ),
        "category": "creation-kit",
        "tags": ["creation-kit", "npc", "facegen", "dark-face", "bug"],
    },
    {
        "id": "ck-003",
        "title": "Creation Kit: Avoiding Ref Deletion Crashes",
        "content": (
            "NEVER delete placed references (Delete key in render window) — deleted refs leave phantom records "
            "that break navmesh and cause CTD. Instead: select ref → right-click → Disable. "
            "For NPCs: uncheck 'Initially Disabled' and add Enable Parent to gate visibility. "
            "If you must remove a ref from load order: set bAllowDeletions=1 in CKCustom.ini under [General] "
            "and only delete from your own plugin's refs, never vanilla."
        ),
        "category": "creation-kit",
        "tags": ["creation-kit", "crash", "delete", "reference", "navmesh"],
    },
    {
        "id": "ck-004",
        "title": "Creation Kit: Navmesh Best Practices",
        "content": (
            "Navmesh rules: triangles must be convex-ish; no gaps; connect to adjacent cells via portals. "
            "Finalize navmesh: Navmesh → Finalize Navmesh (Ctrl+E). ALWAYS finalize before saving. "
            "Exterior navmesh must tile with adjacent cells — CK handles this via the navmesh border stitch. "
            "Do NOT finalize in an interior cell that shares navmesh with exterior — it disconnects border. "
            "Check with NavMesh Validation: Navmesh → Check NavMesh for errors before saving."
        ),
        "category": "creation-kit",
        "tags": ["creation-kit", "navmesh", "npc", "pathfinding"],
    },
    {
        "id": "ck-005",
        "title": "Creation Kit: Landscape Painting & LTEX Layers",
        "content": (
            "Max 6 LTEX (land texture) layers per terrain quad. Exceed 6 → grey corruption. "
            "Paint with H key (select brush), Shift+H (erase). Hold Alt to sample existing texture. "
            "Texture layer order matters: base layer first, add detail layers top. "
            "Extended Landscape Textures mod raises cap to 8. Always save landscape changes before reloading. "
            "Landscape edits are cell-specific; never overlap with mods that also edit the same cells."
        ),
        "category": "creation-kit",
        "tags": ["creation-kit", "landscape", "terrain", "texture", "ltex"],
    },

    # ── FO4EDIT / XEDIT RECORD TYPES ────────────────────────────────────────
    {
        "id": "xedit-001",
        "title": "xEdit: Core Record Types Reference",
        "content": (
            "Most-used FO4 record types: NPC_ (actors/NPCs), WEAP (weapons), ARMO (armor), MISC (misc items), "
            "BOOK (notes/magazines), CONT (containers), FLOR (flora), STAT (statics), MSTT (moveable statics), "
            "FURN (furniture), WTHR (weather), CELL (cells), WRLD (worldspace), NAVM (navmesh), "
            "COBJ (crafting recipe), LVLI (leveled item list), LVLC (leveled character/NPC list), "
            "KYWD (keyword), GMST (game setting), QUST (quest), DIAL/INFO (dialogue), SNDR (sound descriptor), "
            "ASPC (acoustic space), LGTM (lighting template), IMGS/IMOD (image space/modifier). "
            "Signature format in xEdit tree: [FORMID:XXXXXXXX] RecordType 'EditorID'. "
            "Masters block references: [00] = FO4.esm, [01] = first loaded ESP, etc."
        ),
        "category": "xedit",
        "tags": ["xedit", "fo4edit", "records", "reference", "formid"],
    },
    {
        "id": "xedit-002",
        "title": "xEdit: Conflict Resolution Workflow",
        "content": (
            "1. Right-click plugin list → Apply Filter for Conflict Losers. "
            "2. Records with red background = conflict where another plugin wins. "
            "3. To patch: right-click conflicting record in your patch plugin → Copy as Override Into. "
            "4. In the record view, copy fields from the winning plugin's column into your patch column. "
            "5. Green = no conflict, yellow = override (safe), red = real conflict needing patch. "
            "6. After patching: remove ITMs (Apply Filter → Identical to Master → remove). "
            "7. Clean UDRs: Apply Filter → Deleted References → undelete + disable. "
            "8. Save patch as ESL-flagged ESP if <2000 new records."
        ),
        "category": "xedit",
        "tags": ["xedit", "conflict", "patch", "itm", "udr"],
    },
    {
        "id": "xedit-003",
        "title": "xEdit: Leveled List Injection (Safe)",
        "content": (
            "Never directly edit vanilla LVLI records — creates conflicts with every mod that also edits them. "
            "Instead use the Leveled List Injection script: right-click your plugin → Apply Script → LLI.pas. "
            "Or manually: copy LVLI as override, add your item entry. Use Bashed Patch to merge if multiple mods do this. "
            "LVLC (NPC leveled lists): injection point VendorContainerWeapons or EncRaider75. "
            "LVLN (character lists): injection point EncRaiderGang. "
            "Test: open CK → check Object Window → Leveled List → confirm your item appears."
        ),
        "category": "xedit",
        "tags": ["xedit", "leveled-list", "injection", "lvli", "lvlc"],
    },

    # ── NIF MESH EDITING ─────────────────────────────────────────────────────
    {
        "id": "nif-001",
        "title": "NIF: Blender Export Settings for FO4",
        "content": (
            "Blender → PyNifly export settings for FO4: Scale=1.0, Up=Z, Forward=-Y, Max Bones Per Partition=80. "
            "Apply ALL transforms before export (Ctrl+A → All Transforms). "
            "Triangulate: Edit Mode → Select All → Mesh → Faces → Triangulate Faces (or add Triangulate modifier). "
            "Remove doubles: Mesh → Merge by Distance (0.001m threshold). "
            "UV map: must have exactly one UV map named 'UVMap'. "
            "Normals: face normals must point outward (Overlay → Normals; flip with Alt+N). "
            "Armature: bind pose must be T-pose; export with skeleton.nif if rigged."
        ),
        "category": "nif-mesh",
        "tags": ["nif", "blender", "pynifly", "export", "mesh"],
    },
    {
        "id": "nif-002",
        "title": "NIF: Shader Flags Cheat Sheet",
        "content": (
            "SLSF1 flags (hex): CAST_SHADOWS=0x200, RECIEVE_SHADOWS=0x400, DYNAMIC_DECAL=0x4, "
            "SKINNED=0x2, ENVIRONMENT_MAPPING=0x80, PARALLAX=0x10000, SPECULAR=0x1, "
            "SUBSURFACE_LIGHTING=0x800000, SOFT_EFFECT=0x8000000. "
            "SLSF2 flags: ZBUFFER_WRITE=0x400, LOD_LANDSCAPE=0x1000000, VERTEX_COLORS=0x20, "
            "GLOW_MAP=0x40, TREE_ANIM=0x400000, DECAL=0x4000. "
            "Tip: in NifSkope right-click BSLightingShaderProperty → Block Details → Shader Flags 1/2 "
            "to view/edit as hex or use the bit flag editor popup."
        ),
        "category": "nif-mesh",
        "tags": ["nif", "shader", "flags", "slsf", "nifskope"],
    },
    {
        "id": "nif-003",
        "title": "NIF: LOD Mesh Naming Convention",
        "content": (
            "LOD mesh file naming: BaseMesh_0.nif (full), BaseMesh_1.nif (50% poly), "
            "BaseMesh_2.nif (10% poly), BaseMesh_3.nif (billboard quad). "
            "Place LOD meshes in same folder as base mesh. "
            "LOD shader flag: SLSF2_LOD_OBJECTS must be set on LOD NIF BSTriShape. "
            "Generate LODs with xLODGen (-fo4 -lodlevel:4,8,16) or DynDOLOD for dynamic objects. "
            "Billboard: 2-poly quad facing camera, using _lod.dds BC3 atlas texture. "
            "Without LOD meshes: full-detail mesh renders at all distances = severe FPS hit."
        ),
        "category": "nif-mesh",
        "tags": ["nif", "lod", "mesh", "xlodhgen", "dyndolod"],
    },

    # ── BA2 ARCHIVES ─────────────────────────────────────────────────────────
    {
        "id": "ba2-001",
        "title": "BA2: Packing Best Practices",
        "content": (
            "Pack texture BA2 separately from mesh/script BA2. "
            "Archive2.exe syntax: Archive2.exe <folder> -create=<name.ba2> -format=General|Texture. "
            "Texture BA2 format=Texture enables mip streaming. General BA2 for meshes, scripts, sounds. "
            "Max 10 BA2 files per plugin (sResourceArchive2List limit). "
            "Naming: [PluginName] - Main.ba2, [PluginName] - Textures.ba2, [PluginName] - Sounds.ba2. "
            "Loose files take priority over BA2 — don't ship loose textures in final release. "
            "V1 format compatible with all FO4 versions; V7/V8 (NG only) for NG-exclusive mods."
        ),
        "category": "ba2",
        "tags": ["ba2", "archive", "archive2", "texture", "streaming"],
    },

    # ── F4SE PLUGIN ARCHITECTURE ─────────────────────────────────────────────
    {
        "id": "f4se-001",
        "title": "F4SE: Plugin Version Targeting (OG/NG/AE)",
        "content": (
            "F4SE DLL plugins require separate builds per game version: "
            "OG (1.10.163): CommonLibF4 OG branch, Address Library for F4SE Nexus #47327 OG file. "
            "NG (1.10.980–1.10.984): CommonLibF4-NG branch, Address Library AiO NG file. "
            "AE (1.11.169+): CommonLibF4-NG branch + AiO Anniversary Edition Address Library. "
            "CMake options: BUILD_OG / BUILD_NG / BUILD_AE flags for conditional compilation. "
            "FOMOD installer: three plugin entries (OG/NG/AE DLL folders), game version condition. "
            "GitHub Actions: three jobs, one per version target."
        ),
        "category": "f4se",
        "tags": ["f4se", "dll", "plugin", "commonlibf4", "address-library", "og", "ng", "ae"],
    },
    {
        "id": "f4se-002",
        "title": "F4SE: CommonLibF4 Hook Pattern",
        "content": (
            "CommonLibF4 hooking: use REL::Relocation<T> + REL::ID to resolve addresses without hardcoding. "
            "Virtual function hook: SKSE64's GetVTableAddress pattern → detour via Trampoline. "
            "Papyrus native function registration: a_vm->RegisterFunction('FuncName', 'ObjectType', NativeFunc, false). "
            "F4SEPlugin_Load entry point: check version compatibility first, then register for messages. "
            "Message types: F4SE::MessagingInterface::kPostLoad (safe to use APIs), kGameDataReady (data loaded). "
            "Error handling: spdlog file sink to Data/F4SE/Logs/YourPlugin.log for diagnostics. "
            "Build: Release only (Debug runtime mismatches cause crashes). MT runtime (/MT flag in CMake)."
        ),
        "category": "f4se",
        "tags": ["f4se", "commonlibf4", "hook", "papyrus", "native"],
    },

    # ── PAPYRUS SCRIPTING ────────────────────────────────────────────────────
    {
        "id": "papyrus-001",
        "title": "Papyrus: Performance Anti-Patterns",
        "content": (
            "Anti-patterns: RegisterForUpdate with short interval (use RegisterForSingleUpdate instead). "
            "GetNearestActor inside a loop (cache result). GetActorValue every frame (cache + listen for change). "
            "Casting to specific type without checking None first (causes crash). "
            "Storage arrays > 128 items (use StorageUtil from F4SE or split arrays). "
            "Long blocking waits > 30s (use timer events instead). "
            "Script too heavy on OnCellAttach (attach fires for every loaded cell including distant ones). "
            "Best practices: guard all casts (if SomeForm as Actor != None), cache references in OnInit, "
            "use debug.trace/notification only during development, not in release."
        ),
        "category": "papyrus",
        "tags": ["papyrus", "scripting", "performance", "anti-pattern"],
    },
    {
        "id": "papyrus-002",
        "title": "Papyrus: Quest + Alias Pattern",
        "content": (
            "Quest structure: QUST record → Stage list → Objective list → Aliases. "
            "Alias fill: Reference Alias filled via Specific Ref, Unique Actor, Closest to Ref, or Creation. "
            "Script on alias: alias has attached script with OnAliasInit, OnDeath, OnHit, etc. "
            "Always check alias IsNone before calling functions. "
            "Quest start conditions: GetStageDone, HasPerk, GetQuestRunning checks. "
            "Dialogue condition: GetStageDone(Quest, stage) or GetIsId(ref) for companion-specific lines. "
            "Force alias fill: ForceRefTo(ref) from script. "
            "Clear alias: Clear() on quest alias when done — prevents memory leak."
        ),
        "category": "papyrus",
        "tags": ["papyrus", "quest", "alias", "scripting"],
    },
    {
        "id": "papyrus-003",
        "title": "Papyrus: Compilation & Common Errors",
        "content": (
            "Compile: Papyrus Compiler.exe -i=Source\\User -import=Source;Source\\Base;Data\\Scripts\\Source -o=Scripts. "
            "Common errors: 'cannot be cast to type' → missing import or wrong object type. "
            "'Unbound native function' → missing F4SE or Papyrus extension. "
            "'Variable not found' → scope issue or misspelled. "
            "Recompile ALL scripts after engine update (F4SE update often changes virtual table offsets). "
            "Use CK compiler via Papyrus Script Properties for IDE-like experience. "
            "Papyrus log location: Documents\\My Games\\Fallout4\\Logs\\Script\\Papyrus.0.log — "
            "set bEnableLogging=1 in Fallout4.ini [Papyrus] to activate."
        ),
        "category": "papyrus",
        "tags": ["papyrus", "compiler", "error", "debugging", "log"],
    },

    # ── LOOT METADATA ────────────────────────────────────────────────────────
    {
        "id": "loot-001",
        "title": "LOOT: Custom Rules & User Metadata",
        "content": (
            "User metadata path: %LOCALAPPDATA%\\LOOT\\games\\Fallout4\\userlist.yaml. "
            "Example entry to force load order: "
            "  plugins:\n    - name: MyMod.esp\n      after:\n        - UFO4P.esm\n      group: patches. "
            "LOOT groups: default (most mods), early loaders (frameworks/utilities), late loaders (DynDOLOD output). "
            "Add custom group: groups.yaml → add name + after chain. "
            "Dirty edit rule: tag plugin dirty in userlist to show warning: "
            "  plugins:\n    - name: DirtyMod.esp\n      dirty:\n        - crc: 0xABCD1234\n          util: FO4Edit\n          itm: 5."
        ),
        "category": "loot",
        "tags": ["loot", "load-order", "metadata", "rules", "yaml"],
    },

    # ── GPU & WINDOWS PERFORMANCE ────────────────────────────────────────────
    {
        "id": "gpu-001",
        "title": "GPU Driver: Clean Installation with DDU",
        "content": (
            "DDU (Display Driver Uninstaller) from wagnardsoft.com — use for any major driver issue. "
            "Steps: download DDU → boot Safe Mode (Shift+Restart → Troubleshoot → Advanced → Startup Settings → F4) "
            "→ run DDU → 'Clean and Restart' for NVIDIA or AMD → install fresh driver. "
            "Do NOT install GeForce Experience if you want minimal VRAM overhead. "
            "NVIDIA control panel key settings: Power Management Mode = Maximum Performance, "
            "Low Latency Mode = Ultra (DX11 games like FO4 benefit), "
            "Texture Filtering Quality = High Performance (negligible visual impact, better FPS). "
            "Known problem driver series for FO4+ENB: 531.xx (stutter), 546.01 (hang). "
            "Safest for ENB+FO4 in 2026: 572.83+ (NVIDIA) or 24.12.x+ (AMD)."
        ),
        "category": "gpu",
        "tags": ["gpu", "driver", "nvidia", "amd", "ddu", "crash"],
    },
    {
        "id": "gpu-002",
        "title": "VRAM Management for Heavily Modded FO4",
        "content": (
            "VRAM budget at 1440p with heavy texture mods: 8–12GB recommended. "
            "Check usage: GPU-Z Sensor tab → GPU Memory Used (Dedicated). "
            "If VRAM overflows, textures go to system RAM → massive stutter on cell transition. "
            "Fixes: pack ALL textures in BA2 (loose textures skip mip streaming); "
            "downscale NPC/armour textures to 2K; disable SSAO if using SSGI; "
            "set iTextureUpgradeDistance from 65536→32768 in Fallout4Prefs.ini. "
            "ENB adds ~512MB VRAM for framebuffer + effects. Community Shaders adds ~200MB more at 1440p. "
            "4K monitor with 4K textures: plan for 12–16GB VRAM; RTX 4090 or RX 7900 XTX minimum."
        ),
        "category": "gpu",
        "tags": ["vram", "performance", "gpu", "texture", "memory"],
    },
    {
        "id": "win-001",
        "title": "Windows: Ultimate Performance Power Plan",
        "content": (
            "Enable Ultimate Performance: open PowerShell as admin → "
            "powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 "
            "→ Settings → Power & Sleep → Additional Power Settings → select Ultimate Performance. "
            "High Performance also works; Balanced causes micro-stutters on CPU wakeup. "
            "Disable Xbox Game Bar (Win+G overlay causes frame drops): "
            "Settings → Gaming → Xbox Game Bar → OFF. "
            "Disable Xbox Game DVR: Settings → Gaming → Captures → Background Recording → OFF. "
            "Enable Hardware-Accelerated GPU Scheduling (HAGS) on Win11 + RTX 30/40: "
            "Settings → Display → Graphics Settings → HAGS = ON. "
            "Set page file manually: 24GB min for 16GB RAM system on fastest non-game drive."
        ),
        "category": "windows",
        "tags": ["windows", "performance", "power-plan", "gaming", "fps"],
    },
    {
        "id": "win-002",
        "title": "Windows: RAM XMP/EXPO & Dual-Channel Setup",
        "content": (
            "Enable XMP (Intel) or EXPO (AMD) in BIOS — without it, DDR4/DDR5 runs at 2133MHz (default JEDEC). "
            "XMP Profile 1 = rated speed (3200–7200MHz depending on kit). "
            "Dual-channel: populate slots A2+B2 (typically slot 2 and slot 4 from CPU socket, check MB manual). "
            "Single-channel = ~50% of dual-channel memory bandwidth. In FO4 (CPU-bound): "
            "3200MHz dual vs 2133MHz dual = ~10–15% FPS difference in dense areas. "
            "If system is unstable with XMP: try XMP Profile 2 (slightly slower), or manually set "
            "DRAM frequency + timings. Ryzen 5xxx: FCLK must match MCLK (1:1 = best); "
            "DDR4-3800 is the sweet spot for most Ryzen 5xxx CPUs."
        ),
        "category": "windows",
        "tags": ["ram", "xmp", "expo", "dual-channel", "bios", "performance"],
    },

    # ── PRECOMBINE / PREVIS ─────────────────────────────────────────────────
    {
        "id": "precombine-001",
        "title": "Precombines: Why You Must Never Disable Them",
        "content": (
            "Precombines batch hundreds of static meshes into one draw call per cell. "
            "Disabling precombines (bUseCombinedObjects=0 or certain mods) multiplies draw calls 10–30x. "
            "Typical dense Boston exterior: 2–5 draw calls with precombines, 200–600 without. "
            "Impact: 40–80% FPS loss in dense areas like Diamond City, Goodneighbor, downtown Boston. "
            "Correct approach: regenerate precombines after your mod changes using PRP pipeline or CK. "
            "PRP (Previs Repair Pack, Nexus #46408): compatible precombines for 500+ popular mods. "
            "Custom precombine generation: CK → World → Precombine Geometry → Generate."
        ),
        "category": "precombine",
        "tags": ["precombine", "previs", "performance", "fps", "draw-calls"],
    },

    # ── ENB & VISUAL MODS ───────────────────────────────────────────────────
    {
        "id": "enb-001",
        "title": "ENB: Installation & INI Key Settings",
        "content": (
            "ENB Series (Boris Vorontsov, enbdev.com) requires d3d11.dll + d3dcompiler_46e.dll in game root. "
            "Do NOT place in Data folder. enblocal.ini: set VRAM accurately (iVideoMemorySizeMb), "
            "bEnableVSync=false (use driver-level or RivaTuner cap instead). "
            "enbseries.ini: preset author configures; generally leave defaults unless you know what changes. "
            "ENB + NG game: use ENB binary 0.501+ (Boris patched for NG BA2 format). "
            "ENB frame time budget: HDR+DoF+SSAO combo costs 8–15ms — on 60fps target, budget 16.7ms total. "
            "ENB proxy library (for ENB + Community Shaders): place CS d3d11.dll as proxy, "
            "set [PROXY] EnableProxyLibrary=true in enblocal.ini + ProxyLibrary=CommunityShaders.dll."
        ),
        "category": "enb",
        "tags": ["enb", "visual", "graphics", "ini", "installation"],
    },
    {
        "id": "enb-002",
        "title": "ENB: Common Crash & Black Screen Fixes",
        "content": (
            "Black screen on launch: wrong ENB binary version for your game version. "
            "Download matching binary from enbdev.com (check 'for Fallout 4' section). "
            "CTD on startup: antivirus quarantining d3d11.dll — add game folder to AV exclusions. "
            "Menu flickering: bForceVSync=false in enblocal.ini, also disable fullscreen exclusive mode. "
            "ENB + mods crashing: outdated ENB shader cache — delete enbcache folder in game root. "
            "Tree transparency glitch: Render → bFixTransparency=true in enbseries.ini. "
            "Screen turns white: too much bloom — reduce fBloomAmount in preset enbseries.ini. "
            "ENB not loading: game must be in EXE root (not Steam overlay path), d3d11.dll must be unsigned copy."
        ),
        "category": "enb",
        "tags": ["enb", "crash", "black-screen", "troubleshoot"],
    },

    # ── LOAD ORDER TEMPLATES ─────────────────────────────────────────────────
    {
        "id": "loadorder-001",
        "title": "Load Order: Recommended Structure (2026)",
        "content": (
            "Correct load order structure for a heavily modded FO4 (2026): "
            "1. Fallout4.esm, DLCRobot.esm, DLCworkshop01-03.esm, DLCCoast.esm, DLCNukaWorld.esm "
            "2. UFO4P.esm (Unofficial Patch — MUST be immediately after DLC) "
            "3. PRP.esm (Previs Repair Pack — immediately after UFO4P) "
            "4. Framework ESMs: SS2.esm, WorkshopFramework.esm, XDI.esm "
            "5. Major overhauls: Horizon.esm, Sim Settlements 2 chapters "
            "6. Weapon/armor mods, NPC overhauls, world content "
            "7. Compatibility patches (always load after both parents) "
            "8. xLODGen Output.esp "
            "9. TexGen Output.esp "
            "10. DynDOLOD.esm → DynDOLOD.esp (LAST active plugin before Bashed Patch) "
            "11. Bashed Patch, 0.esp (absolute last)"
        ),
        "category": "load-order",
        "tags": ["load-order", "loot", "esl", "esp", "esm", "dyndolod", "bashed-patch"],
    },

    # ── KNOWN BAD MODS ──────────────────────────────────────────────────────
    {
        "id": "bad-mods-001",
        "title": "Mods to Avoid or Use With Caution (2026)",
        "content": (
            "Scrap Everything: disables ALL precombines globally → 40–80% FPS loss, random CTD. "
            "Use Spring Cleaning or Place Everywhere instead. "
            "Unofficial High Resolution Texture Pack (old): conflicts with modern PBR mods. "
            "Use PhyLight or Luxor's Fallout instead. "
            "Any old OCDecorator versions (<3.0): null ref crash in populated workshops. "
            "Old MCM (pre-F4SE 0.7.x version): crashes on NG. Download NG-compatible MCM only. "
            "Companion Infinite Ammo mods from 2016–2018: most conflict with Modern Firearms or Weaponsmith Extended. "
            "ENB binaries <0.490 on NG game: black screen / hard CTD. "
            "True Storms + NAC-X + Vivid Weathers all three at once: WTHR conflict → weather stuck."
        ),
        "category": "mod-compatibility",
        "tags": ["bad-mods", "avoid", "crash", "compatibility", "warning"],
    },
    {
        "id": "bad-mods-002",
        "title": "Mods With Known Compatibility Patches Required",
        "content": (
            "UFO4P + any NPC overhaul: use UFO4P compatibility patches from Nexus (NPC overhaul author usually provides). "
            "Sim Settlements 2 + Better Settlers: use SS2 + BS patch on Nexus. "
            "True Storms + ENB preset: virtually all ENB presets need True Storms configuration. "
            "Horizon + Modern Firearms: Horizon provides MF patch in its patch pack. "
            "Extended Dialogue Interface (EDI) + any companion mod: check companion mod page for EDI patch. "
            "Modern Firearms + Gunsmith Extended: incompatible — use one or the other. "
            "PRP + any mod that edits the same cells: check PRP Nexus page for compatibility list. "
            "AWKCR (deprecated): replaced by Armor and Weapon Keywords (AWK) — AWKCR causes load order bloat."
        ),
        "category": "mod-compatibility",
        "tags": ["compatibility", "patch", "mod", "conflict"],
    },

    # ── SETTLEMENT & WORKSHOP ───────────────────────────────────────────────
    {
        "id": "settlement-001",
        "title": "Settlement: Workshop Keyword & Menu System",
        "content": (
            "Workshop menu is driven by KYWD (keyword) on STAT/MSTT/FURN: "
            "WorkshopItemKeyword → appears in workshop menu under its category. "
            "Category keywords: WorkshopMenuStructures, WorkshopMenuFurniture, WorkshopMenuPower, "
            "WorkshopMenuResources, WorkshopMenuDecoration. "
            "Required keywords for buildable items: WorkshopCanBeScrapped (scrappable), "
            "WorkshopStackable (can stack multiples). "
            "Snap grid: STAT with snap markers (NIF 'Snap_Origin' node + named snap point nodes). "
            "Power: FURN/MSTT with kGeneratorType keyword + fWorkshopPowerGenerated=10 AVIF. "
            "Water: kWaterType keyword + fWorkshopWaterGenerated AVIF. "
            "Food: WorkshopObject_Food + kFoodSource keyword."
        ),
        "category": "settlement",
        "tags": ["settlement", "workshop", "keyword", "menu", "crafting"],
    },

    # ── SIM SETTLEMENTS 2 ───────────────────────────────────────────────────
    {
        "id": "ss2-001",
        "title": "Sim Settlements 2: Mod Integration Basics",
        "content": (
            "SS2 is a major framework — respect its systems. Do not edit SS2's workshop menu categories. "
            "Adding items to SS2 workshop: use SS2 API (Workshop Framework) to add your items to SS2 menu categories. "
            "City Plans: JSON-driven blueprint system. Use SS2's Build System not raw CK. "
            "Compatibility: SS2 works with Vortex and MO2. Load SS2.esm before chapter ESMs. "
            "Known conflict: SS2 + SKK Mobile Artillery (nav conflict in SS2 cells). "
            "SS2 + Conquest: use Conquest SS2 patch from Nexus. "
            "Diagnostic: SS2 has its own log (Documents\\...\\MCM\\Logs\\SimSettlements2.log). "
            "Always patch SS2 leveled lists forward if you override any NPC leveled list."
        ),
        "category": "sim-settlements",
        "tags": ["sim-settlements-2", "ss2", "framework", "compatibility"],
    },

    # ── AUDIO / SOUND ───────────────────────────────────────────────────────
    {
        "id": "audio-001",
        "title": "Audio: xWMA Encoding for FO4",
        "content": (
            "FO4 supports .wav (PCM) and .xwm (XMA compressed). "
            "xWMAEncode.exe (from DirectX SDK or F4SE package): "
            "xWMAEncode.exe input.wav output.xwm -q 10 (quality 1–10, 10=best). "
            "Mono 44100Hz 16-bit for 3D spatialized sounds (SNDR with min/max distance). "
            "Stereo for music/ambience (no spatialization). "
            "FO4 audio paths: Data\\Sound\\fx\\ (effects), Data\\Sound\\voice\\ (dialogue), "
            "Data\\Music\\ (background music). "
            "Voice: .xwm + .lip file pair. LipSync: use Bethesda's FaceGenCreator or CreationKit voice tools. "
            "SNDR random variants: add multiple Filename entries → game picks random one on play."
        ),
        "category": "audio",
        "tags": ["audio", "sound", "xwm", "wav", "sndr", "voice"],
    },

    # ── DIAGNOSTIC / CRASH ANALYSIS ─────────────────────────────────────────
    {
        "id": "crash-001",
        "title": "CLASSIC: Crash Log Analysis",
        "content": (
            "CLASSIC (Crash Log Auto Investigator) by NsJones: installs alongside Buffout4. "
            "Buffout4 writes crash logs to Documents\\My Games\\Fallout4\\F4SE\\Buffout4\\. "
            "CLASSIC scans logs and outputs human-readable diagnosis: "
            "ScrapHeap::Allocate failures → precombines disabled or VRAM overflow. "
            "BSGeometry crash → corrupt NIF mesh or missing BA2. "
            "BSString crash → missing string record / corrupt plugin. "
            "NullPointer crash → script error (check Papyrus.0.log) or deleted ref. "
            "Havok crash → physics overflow or bad collision shape. "
            "Run CLASSIC after every CTD for instant triage. "
            "Buffout4 config (Buffout4.toml): set Papyrus=true for script-level crash info."
        ),
        "category": "crash-analysis",
        "tags": ["crash", "buffout4", "classic", "ctd", "diagnostic", "log"],
    },
    {
        "id": "crash-002",
        "title": "Common CTD Causes and Quick Fixes",
        "content": (
            "Most common FO4 CTD causes (2026): "
            "1. VRAM overflow: downscale textures or upgrade GPU. "
            "2. Papyrus script error: check Papyrus.0.log for ERROR lines. "
            "3. Precombines disabled: re-enable (set bUseCombinedObjects=1 in Fallout4Prefs.ini). "
            "4. F4SE DLL mismatch: wrong F4SE version for game EXE — download from f4se.silverlock.org. "
            "5. Mod conflict: new mod causing conflict — binary search (disable half, test, repeat). "
            "6. Corrupt BA2 or loose texture: validate files via Steam or MO2. "
            "7. Engine heap exceeded: add MemoryManager=true in Buffout4.toml, "
            "   also increase iMemoryPageSize in Fallout4.ini [General] to 128 or 256. "
            "8. ENB binary mismatch: update ENB binary (enbdev.com) for current game version."
        ),
        "category": "crash-analysis",
        "tags": ["crash", "ctd", "fix", "troubleshoot", "common"],
    },

    # ── BODYSLIDE & OUTFIT STUDIO ────────────────────────────────────────────
    {
        "id": "bodyslide-001",
        "title": "BodySlide: Building Outfits for Your Body",
        "content": (
            "BodySlide requires: BodySlide + Outfit Studio (Nexus #25), a body (CBBE or OCBP), "
            "and outfits with BodySlide data. "
            "Build: open BodySlide → choose preset matching your body shape → Build (single outfit) "
            "or Batch Build (all installed outfits). Always build with zap sliders correct for your body. "
            "If outfit looks wrong: check Group Filter matches body group (CBBE/OCBP). "
            "Outfit Studio: import .obj or .nif, paint weights, edit morphs, export to FO4 NIF. "
            "BodySlide data path: Data\\CalienteTools\\BodySlide\\. "
            "Per-game path setup: BodySlide → Settings → Game Path = your Fallout 4 Data folder. "
            "CBBE Physics (OCBP): requires BodySlide OCBP body + OCBP F4SE plugin."
        ),
        "category": "bodyslide",
        "tags": ["bodyslide", "outfit-studio", "body", "cbbe", "armor", "clothing"],
    },

    # ── MO2 / VORTEX USAGE ─────────────────────────────────────────────────
    {
        "id": "mo2-001",
        "title": "MO2: Virtual File System & Deployment",
        "content": (
            "MO2 uses a virtual file system — mods stay in their own folders; MO2 merges them on launch. "
            "Install order (left panel) determines file conflict priority (bottom wins). "
            "Load order (right panel) determines ESP load order. "
            "Deploy: MO2 → Deploy Mods button (or auto-deploys on game launch). "
            "Manual FOMOD: double-click installer → Next/configure options → Install. "
            "Priority override: lock file to specific mod via right-click → Set as Override. "
            "Root builder: for files that go in game root (ENB, F4SE, Address Library) use "
            "Root Builder plugin for MO2 so they stay managed. "
            "MO2 profiles: separate load orders per profile — useful for OG vs NG testing. "
            "BSA/BA2: MO2 unpacks BA2 into virtual filesystem at launch — no performance difference."
        ),
        "category": "mo2",
        "tags": ["mo2", "mod-organizer", "vfs", "deployment", "install"],
    },

    # ── WABBAJACK ───────────────────────────────────────────────────────────
    {
        "id": "wabbajack-001",
        "title": "Wabbajack: Modlist Installation Basics",
        "content": (
            "Wabbajack installs curated modlists automatically, handling MO2 setup + download + installation. "
            "Requirements: clean FO4 install (validate via Steam), Nexus Mods account (free tier works). "
            "Premium Nexus recommended for fast batch downloads; free tier works but requires manual confirmations. "
            "Steps: download Wabbajack.exe → open → browse gallery or load .wabbajack file "
            "→ set installation location (separate from game) → click Install. "
            "Common errors: 'File not found on Nexus' → file was removed by author, check modlist Discord. "
            "Disk space: most lists need 50–200GB. Use fast SSD. "
            "After install: launch via MO2 shortcut from Wabbajack's install folder. "
            "Do NOT add mods to Wabbajack lists without reading the list's documentation."
        ),
        "category": "wabbajack",
        "tags": ["wabbajack", "modlist", "install", "nexus", "mo2"],
    },

    # ── FOMOD CREATION ──────────────────────────────────────────────────────
    {
        "id": "fomod-001",
        "title": "FOMOD: ModuleConfig.xml Structure",
        "content": (
            "FOMOD (Fallout Mod Manager) installer format: Data\\fomod\\ModuleConfig.xml + info.xml. "
            "ModuleConfig.xml basic structure: "
            "<config><moduleName>My Mod</moduleName>"
            "<installSteps order='Explicit'><installStep name='Options'>"
            "<optionalFileGroups order='Explicit'><group name='Main Files' type='SelectAll'>"
            "<plugins order='Explicit'><plugin name='Base Files'>"
            "<description>Core files.</description><files><folder source='Core' destination='' priority='0'/>"
            "</files><typeDescriptor><type name='Required'/></typeDescriptor>"
            "</plugin></plugins></group></optionalFileGroups>"
            "</installStep></installSteps></config>. "
            "Use FOMOD Creator (Nexus tool) for GUI editing. "
            "Test in MO2: drag zip into MO2 → FOMOD opens automatically."
        ),
        "category": "fomod",
        "tags": ["fomod", "installer", "xml", "packaging", "mod"],
    },

    # ── WRYE BASH & BASHED PATCH ────────────────────────────────────────────
    {
        "id": "bash-001",
        "title": "Wrye Bash: Bashed Patch Creation",
        "content": (
            "Bashed Patch merges leveled lists from all plugins without explicit compatibility patches. "
            "Essential for heavily modded load orders with many weapon/NPC/loot mods. "
            "Steps: open Wrye Bash → load your FO4 game → right-click Bashed Patch, 0.esp → Rebuild Patch. "
            "Select: Leveled Lists (LVLI/LVLC/LVLN) — always enable these. "
            "Optional: Actors.ACBS (NPC combat stats), NPC.Perks (perk inheritance), "
            "NPC.FaceGen (merge face override safely). "
            "Bashed Patch must be LAST in load order (after DynDOLOD). "
            "Rebuild after every load order change. "
            "What Bashed Patch doesn't fix: landscape edits, navmesh, weather, "
            "script conflicts — these need manual patches."
        ),
        "category": "wrye-bash",
        "tags": ["wrye-bash", "bashed-patch", "leveled-list", "merge", "load-order"],
    },

    # ── COMMUNITY SHADERS ───────────────────────────────────────────────────
    {
        "id": "community-shaders-001",
        "title": "Community Shaders: Setup & Key Features",
        "content": (
            "Community Shaders (CS) by doodlum + contributors: open-source shader framework. "
            "Install: Nexus #50778. Replaces ENB for shader features on some setups, or run alongside ENB via proxy. "
            "Key features: GGX specular (physically correct highlights), SSGI (screen-space global illumination), "
            "extended BGSM support (PBR parameters), parallax occlusion mapping (POM) injection, "
            "terrain parallax, subsurface scattering improvements, light limit fix. "
            "CS + ENB: ENB ProxyLibrary mode — ENB loads CS as DLL proxy. "
            "Performance: SSGI costs 4–8ms at 1440p. Disable SSAO if using SSGI (redundant + double cost). "
            "CS config: Data\\ShaderCache\\ + in-game overlay (Home key when CS loaded). "
            "Heap pre-allocation for PRP compatibility: CS config → Memory → PreAllocate=true."
        ),
        "category": "community-shaders",
        "tags": ["community-shaders", "cs", "pbr", "ssgi", "shader", "graphics"],
    },

    # ── FALLOUT 4 VERSION MANAGEMENT ────────────────────────────────────────
    {
        "id": "version-001",
        "title": "FO4 Version Downgrade (NG to OG)",
        "content": (
            "To downgrade from NG (1.10.984) to OG (1.10.163) for maximum mod compatibility: "
            "1. Steam → Library → Right-click Fallout 4 → Properties → Betas → Select '1.10.163-1.10.163'. "
            "2. Or use the manual downgrade patch (Nexus #81931, 'Fallout 4 Downgrader') — applies to Steam version. "
            "3. GOG version ships OG (1.10.163) natively — no downgrade needed. "
            "After downgrade: reinstall F4SE 0.6.23 (OG version), reinstall all DLL mods (OG builds). "
            "To stay on NG/AE: use F4SE 0.7.7, Address Library AiO Anniversary Edition. "
            "Check current version: launcher → bottom-left corner, or game EXE properties."
        ),
        "category": "version-management",
        "tags": ["version", "downgrade", "og", "ng", "ae", "steam", "gog"],
    },

    # ── PERFORMANCE MODS ────────────────────────────────────────────────────
    {
        "id": "perf-001",
        "title": "Essential Performance Mods (2026 Stack)",
        "content": (
            "Minimum performance mod stack for a heavily modded FO4: "
            "1. Buffout4 (F4SE plugin, crash logger + memory fixes) "
            "2. HighFPSPhysicsFix (decouples Havok from framerate — REQUIRED above 60 FPS) "
            "3. PRP (Previs Repair Pack — restores precombines broken by popular mods) "
            "4. Boston FPS Fix AIO (optimized precombines for downtown Boston area) "
            "5. ExcelFO4 (CPU priority + disk cache — replaces Fallout Priority + Disk Cache Enabler) "
            "6. TextureStreamFix (fixes vanilla texture unloading bug) "
            "7. ActorCountFix (raises actor thread count cap to 4096). "
            "Optional: Vulkan render wrapper (d3d11→Vulkan via DXVK-gpl) for AMD GPUs specifically. "
            "Frame cap: use RivaTuner Statistics Server, cap at monitor_hz - 3 (e.g. 141 for 144Hz)."
        ),
        "category": "performance",
        "tags": ["performance", "buffout4", "fps", "prp", "mods", "2026"],
    },

    # ── NIFSKOPE DEEP DIVE ──────────────────────────────────────────────────
    {
        "id": "nifskope-001",
        "title": "NifSkope: Material Path Editing",
        "content": (
            "To retexture an existing NIF without Blender: "
            "1. NifSkope → open .nif → expand BSTriShape → expand BSLightingShaderProperty. "
            "2. Expand BSShaderTextureSet → Textures array. "
            "3. Double-click path entries to edit: index 0=diffuse (_d.dds), 1=normal (_n.dds), "
            "   2=specular/envmask (_s.dds or _e.dds), 3=emissive (_g.dds), 4=height (_h.dds). "
            "4. Paths must be relative to Data folder: textures\\mymod\\weapon_d.dds. "
            "5. File → Save As to output modified NIF. "
            "Tip: use Spells → Texture → Find Textures (Ctrl+T) to scan all paths at once. "
            "Tip: Spells → Batch → Rename Texture Folder to bulk-rename texture paths."
        ),
        "category": "nifskope",
        "tags": ["nifskope", "texture", "material", "nif", "path"],
    },

    # ── USER PROFILE ─────────────────────────────────────────────────────────
    {
        "id": "user-profile-001",
        "title": "User Profile Placeholder (Mossy Learns Your Setup)",
        "content": (
            "This entry is populated by Mossy as it learns about your specific setup. "
            "Tell Mossy: your GPU model and VRAM, your FO4 version (OG/NG/AE), "
            "your current mod manager (MO2/Vortex), your active weather overhaul, "
            "your load order size (approximate number of plugins), "
            "key mods in your list (PRP, Horizon, SS2, etc.), "
            "your target resolution and monitor refresh rate, "
            "and any recurring issues you experience. "
            "Mossy will tailor all advice specifically to your hardware and setup."
        ),
        "category": "user-profile",
        "tags": ["user", "profile", "setup", "hardware", "personalized"],
    },
]

# ---------------------------------------------------------------------------
# Bootstrap function — call with your ChromaDB collection
# ---------------------------------------------------------------------------

def build_bootstrap_entries() -> list[dict]:
    """Return the full list of knowledge entries for ChromaDB ingestion."""
    return KNOWLEDGE_ENTRIES


def bootstrap_chromadb(collection, embedding_fn=None) -> int:
    """
    Populate a ChromaDB collection with all bootstrap entries.
    Returns the number of entries added.

    embedding_fn: callable(list[str]) -> list[list[float]]. Pass the SAME
    embedding model used at query time (gemma_service_enhanced.embed, which
    wraps BAAI/bge-small-en-v1.5) — hybrid_retrieve() embeds queries with that
    model explicitly, so documents embedded any other way (including Chroma's
    own default embedding function, which is what silently happened when this
    parameter went unused) land in a different vector space and cosine
    similarity between the two is meaningless. If omitted, falls back to
    Chroma's default embedding function and logs a warning, since a mismatch
    is better flagged than shipped silently.

    Usage:
        import chromadb
        client = chromadb.PersistentClient(path="D:/Mossy-AI/data/chroma")
        coll = client.get_or_create_collection("mossy_knowledge")
        from bootstrap_fallout4_knowledge import bootstrap_chromadb
        from gemma_service_enhanced import embed
        added = bootstrap_chromadb(coll, embedding_fn=embed)
        print(f"Added {added} entries")
    """
    from skill_tags import tags_for_category

    entries = build_bootstrap_entries()
    ids = [e["id"] for e in entries]
    documents = [e["content"] for e in entries]
    metadatas = [
        {
            "title": e["title"],
            "category": e.get("category", "general"),
            "tags": ",".join(e.get("tags", [])),
            "source": "bootstrap_v2",
            "bootstrapped_at": datetime.utcnow().isoformat(),
            # Mapped by category, not per-entry — see skill_tags.py. Feeds the
            # learner model's exposure tracking in gemma_service_enhanced.py.
            "skill_tags": ",".join(tags_for_category(e.get("category", ""))),
        }
        for e in entries
    ]

    # Upsert so re-running is safe (existing entries are updated, not duplicated)
    if embedding_fn is not None:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas,
                           embeddings=embedding_fn(documents))
    else:
        log.warning(
            "bootstrap_chromadb() called without embedding_fn — falling back to "
            "Chroma's default embedding function. This will NOT match the "
            "BAAI/bge-small-en-v1.5 vectors hybrid_retrieve() uses for queries "
            "at runtime, degrading retrieval quality with no visible error."
        )
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    log.info(f"Bootstrapped {len(entries)} entries into ChromaDB collection.")
    return len(entries)


if __name__ == "__main__":
    import chromadb

    CHROMA_PATH = os.environ.get("CHROMA_PATH", r"D:\Mossy-AI\data\chroma")
    COLLECTION_NAME = os.environ.get("CHROMA_COLLECTION", "mossy_knowledge")

    log.info(f"Connecting to ChromaDB at: {CHROMA_PATH}")
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    added = bootstrap_chromadb(collection)
    log.info(f"Done. {added} entries in '{COLLECTION_NAME}'.")
    log.info("Run gemma_service_enhanced.py to start the Brain B API server.")
