import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, Sparkles, Check, X, ArrowRight, Loader, Map, Download, ExternalLink, Brain, FolderOpen, Zap, Volume2 } from 'lucide-react';
import { useI18n, resolveUiLanguage } from './i18n';
import packageJson from '../../../package.json';
import TutorialVideoPanel from './components/TutorialVideoPanel';
import { speakMossy } from './mossyTts';
import { getBrowserTtsVoices, loadBrowserTtsSettings, saveBrowserTtsSettings, pickBrowserTtsVoice, ensureBrowserTtsSettingsStored } from './browserTts';
import { openExternal } from './utils/openExternal';

interface OnboardingProps {
    onComplete: () => void;
}

// ─── Curated downloads shown after the scan ────────────────────────────────
// Each entry links to the official Nexus or GitHub page — never bundled.
// detectKeywords: match against detected app display names (case-insensitive).
interface RecommendedDownload {
    name: string;
    description: string;
    /** Words to match against detected app names to mark as already installed. */
    detectKeywords: string[];
    url: string;
    urlLabel: string;
    category: 'modding' | 'version-control' | 'creative' | 'runtime';
    required: boolean;
    /** One-line consequence shown when this tool is NOT installed, so the user
     *  knows exactly which Mossy features will be broken or unavailable. */
    ifMissing: string;
    /** Optional static note shown on the download card (can be overridden dynamically) */
    note?: string;
    /** Whether this item has a locatable executable (.exe) file.
     *  Set to false for mods/plugins that are installed via mod manager (e.g., Address Library, Addictol).
     *  When false, "I have it" browse button will not be shown. Defaults to true if omitted. */
    hasExecutable?: boolean;
}

const RECOMMENDED_DOWNLOADS: RecommendedDownload[] = [
    // ── Runtime prerequisites ─────────────────────────────────────────────────
    // These must be installed first; many Mossy features silently fail without them.
    {
        name: '.NET SDK (latest)',
        description: 'Required by Spriggit and other .NET-based modding tools. The SDK (not just the Runtime) is needed so Spriggit can download its translation packages via "dotnet tool install" at first serialize run. Restart your PC after installing. 💡 Tip: if your C: drive is short on space, click "Change" during setup and install to D:\\Program Files\\dotnet — the installer supports any drive.',
        detectKeywords: ['microsoft .net', '.net desktop runtime', '.net runtime', '.net sdk', 'dotnet sdk'],
        url: 'https://dotnet.microsoft.com/download/dotnet',
        urlLabel: 'dotnet.microsoft.com',
        category: 'runtime',
        required: true,
        ifMissing: 'Spriggit serialize will crash with exit 0xFFFFFFFF. The SDK is required so Spriggit can fetch its Fallout4 translation package on first run. Mossy cannot run any .NET-based tools.',
    },
    {
        name: 'Git for Windows',
        description: 'Version control system required for the Spriggit collaborative modding workflow and for pushing serialized plugin YAML to GitHub. Also lets Mossy give git-based advice.',
        detectKeywords: ['git', 'git bash', 'git for windows'],
        url: 'https://git-scm.com/download/win',
        urlLabel: 'git-scm.com',
        category: 'runtime',
        required: false,
        ifMissing: 'Spriggit YAML cannot be pushed to GitHub. Mossy cannot give git commit/branch/merge advice or help set up version control for your mods.',
    },
    {
        name: 'Visual C++ Redistributables',
        description: 'Microsoft runtime libraries required by xEdit, Buffout 4, F4SE, and most compiled Fallout 4 mods and tools. Install both the x64 and x86 versions.',
        detectKeywords: ['visual c++', 'microsoft visual c++', 'vcredist'],
        url: 'https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist',
        urlLabel: 'microsoft.com',
        category: 'runtime',
        required: true,
        ifMissing: 'xEdit, F4SE, Buffout 4, and most compiled modding tools will refuse to launch or crash on startup.',
        hasExecutable: false, // Installed via system installer, not a locatable .exe
    },
    // ── Modding tools ─────────────────────────────────────────────────────────
    {
        name: 'Spriggit',
        description: `Converts ESP/ESM plugin files to plain text (YAML/JSON) so you can track changes in Git and collaborate on mods. Used by Mossy's onboarding brain-boost step to ingest the vanilla ESMs.`,
        detectKeywords: ['spriggit'],
        url: 'https://github.com/Mutagen-Modding/Spriggit/releases',
        note: `💡 Download SpriggitCLI.zip from the latest release (NOT the green "Code→Download ZIP" button — that's source code with no .exe). Requires Spriggit v0.34.0+ for FO4 1.11.x (AE) support. If you already have it, click "I have it" to browse to Spriggit.CLI.exe.`,
        urlLabel: 'GitHub Releases',
        category: 'version-control',
        required: false,
        ifMissing: `Mossy cannot digest vanilla ESMs into her Knowledge Vault. The brain-boost onboarding step will be unavailable.`,
    },
    {
        name: 'xEdit / FO4Edit',
        description: "Advanced graphical module viewer, conflict detector, and editor for Fallout 4, created by ElminsterAU and the xEdit Team (Hlp, Zilav, Sharlikran). Lets you inspect every record in your entire load order, detect and resolve conflicts between plugins, clean masters (remove ITMs and UDRs), run Pascal scripts to batch-edit records, and create compatibility patches. The current release is xEdit 4.1.5. Full documentation is available in the bundled 'Tome of xEdit' (converted from the Fallout 3 training manual). ⚠️ Unpack with 7-Zip. Licensed under Mozilla Public License 1.1. Community contributors include: AndalayBay, Divstator, fireundubh, Jonathan Ostrus, jonwd7, shad0wshayd3.",
        detectKeywords: ['xedit', 'fo4edit', 'tes5edit'],
        url: 'https://www.nexusmods.com/fallout4/mods/2737',
        urlLabel: 'Nexus Mods #2737',
        category: 'modding',
        required: true,
        ifMissing: 'Mossy cannot open plugins in xEdit from the Auditor. Conflict resolution, cleaning masters, and record editing will require manual setup outside Mossy.',
    },
    {
        name: "Pra's xEdit Scripts (Nexus #28898)",
        description: "Collection of FO4Edit autopatch and utility scripts by Pra. Key scripts include: VISifier / VIS-G-ifier (adds VIS/VIS-G inventory sorting tags to item names), Horizonifier (adds Horizon sorting tags and recipe changes), AWKCRifier (moves crafting recipes into AWKCR workbenches), WorkbenchOrganizer / Update OWM-Master (reorganises workbenches into Organized Workbench Menu submenus), AutoDoorifier (patches doors with Auto Doors cross-mod support keyword), Restore Precombines (repairs precombine/previs-breaking cell overrides — restores XCRI, previs timestamps, navmeshes, landscape, and physical references), RecompileScripts / AddNamespaceToFragments (script compilation helpers), Collect Assets (scans a plugin and packs its assets into a BA2), Replace Placed Objects (batch-replaces object references via a text config), and Apply Material Swap (applies base-object material swaps to placed references). ⚠️ Extract the 'Edit Scripts' folder into your FO4Edit directory. Run via right-click → Apply Script inside FO4Edit. Credit Pra when releasing patches created with these scripts.",
        detectKeywords: ["pra's xedit scripts", 'pra xedit', 'visifier', 'vis-g-ifier', 'horizonifier', 'awkcr-ifier', 'awkcrifier', 'workbench organizer', 'restore precombines script', 'autodoorifier'],
        url: 'https://www.nexusmods.com/fallout4/mods/28898',
        urlLabel: 'Nexus Mods #28898',
        category: 'modding',
        required: false,
        ifMissing: 'Batch auto-patching workflows (VIS sorting, AWKCR recipe moves, precombine restoration, workbench reorganisation) will need to be done manually in FO4Edit, which is significantly more time-consuming.',
        hasExecutable: false,
    },
    {
        name: "Pra's zEdit Patchers (Nexus #33858)",
        description: "zEdit-native ports of Pra's xEdit patch generators, written in JavaScript and running inside zEdit's Unified Patching Framework. Processes your entire load order in a single pass without crashing, merges patcher outputs into one conflict-free patch file, and only generates overrides that are actually required. Modules included: Tagifier (adds VIS, VIS-G, Horizon, or custom inventory sorting tags via the Item Type Service library), Horizonifier (removes food healing effects, replaces purified-water dispensers with irradiated water, adjusts water purifier power/happiness, rebalances Vendor Stall recipes, and optionally copies Horizon recipes to AWKCR benches), AWKCRifier (moves recipes to AWKCR workbenches; requires AWKCR ≥ 5), WorkbenchOrganizer (moves workbenches into Organized Workbench Menu groups; ESL version only), AutoDoors-Ifier (adds Auto Doors cross-mod compatibility keyword to doors), Make Items Weightless (zeroes weights by item type), and Make Mods Scrappable (adds scrap components to loose object modifications). ⚠️ Requires zEdit (off-site). Unpack module archives into zEdit's 'modules' folder alongside 'unifiedPatchingFramework'. zEdit does not fully support ESLs — if you have more than 254 plugins, merge mods or uncheck some before running. Use Manage Patchers → Build All to generate patches.",
        detectKeywords: ["pra's zedit", 'pra zedit patchers', 'zedit patchers', 'tagifier', 'item type service', 'make mods scrappable', 'make items weightless'],
        url: 'https://www.nexusmods.com/fallout4/mods/33858',
        urlLabel: 'Nexus Mods #33858',
        category: 'modding',
        required: false,
        ifMissing: 'Automated load-order patching (sorting tags, AWKCR recipe moves, Horizon rebalancing, workbench organisation) will need to be done manually in FO4Edit or via the xEdit script equivalents.',
        hasExecutable: false,
    },
    {
        name: 'Fallout 4 Creation Kit',
        description: 'Bethesda\'s official editor for Fallout 4. Required for CK Crash Prevention monitoring, Papyrus script compilation, worldspace editing, and quest creation. Free on Steam.',
        detectKeywords: ['creation kit', 'creationkit', 'ck2'],
        url: 'https://store.steampowered.com/app/1946160/Fallout_4_Creation_Kit/',
        urlLabel: 'Steam (free)',
        category: 'modding',
        required: false,
        ifMissing: 'CK Crash Prevention live monitoring will be unavailable. Papyrus compilation, navmesh editing, and worldspace tools inside Mossy will not function.',
    },
    {
        name: 'Papyrus Compiler Patched — NoDox (Nexus #44959)',
        description: 'Patched replacement for the stock Fallout 4 Papyrus Compiler that unlocks features Bethesda intentionally disabled: arrays inside structs, var types, and structs inside structs. "NoDox" edition also strips your computer name, Windows username, and full source file path from compiled .pex output. v1.50 (Nov 2025) adds performance defaults: in-memory compile cache and 2-thread limit, making large project recompiles dramatically faster — full FO4 base tree (7 800 files) drops from 3+ hours to ~5 minutes. Supports -threads=n and -enablecache command-line arguments, and equivalent settings in .ppj project files. ⚠️ Drop the patched files into your Creation Kit folder. Requires .NET 4.0 and the included .config file; the DLL (PCompile.dll) must also be replaced alongside the exe.',
        detectKeywords: ['papyrus compiler patched', 'papyrus compiler patch', 'nodox', 'pcompile'],
        url: 'https://www.nexusmods.com/fallout4/mods/44959',
        urlLabel: 'Nexus Mods #44959',
        category: 'modding',
        required: false,
        ifMissing: 'The stock BGS Papyrus Compiler will be used. Advanced script features (arrays in structs, structs in structs) will not compile, and your computer name/username will be embedded in compiled .pex files. Large project compiles will be significantly slower.',
        hasExecutable: false,
    },
    {
        name: 'FallrimTools — ReSaver (Nexus #22633)',
        description: 'Free, open-source (Apache 2.0) savegame editor and cleaner for Fallout 4 (and Skyrim). ReSaver reads and writes FO4 save files, displays the full tree of script instances and active scripts, and lets you clean broken or orphaned data without corrupting your save. Key features: remove Unattached Script Instances (orphaned scripts no longer tied to any form), delete Undefined Elements (data referencing plugins no longer in your load order), clean FormLists, delete plugin-specific data, terminate stuck active script threads (right-click → Terminate), and filter the tree by regex or by plugin/mod. Mod Parsing mode reads your ESM/ESP/PEX/BSA files to help identify what each save entry belongs to — works best with Mod Organizer 2. ⚠️ NOTE: in Fallout 4, Unattached Instances are a normal part of how FO4 operates — the author recommends NOT cleaning them unless you know they are genuinely orphaned. Always save to a new file, never overwrite your original. Requires Java 8 or newer (64-bit recommended; OpenJDK works). Credit: ReSaver by MarkDFSoftware; based loosely on SaveTool UI; special thanks to Flex Creator (Savegame Script Scalpel) for sharing source code.',
        detectKeywords: ['fallrimtools', 'resaver', 'reSaver', 'save cleaner', 'savegame cleaner', 'save editor fallout'],
        url: 'https://www.nexusmods.com/fallout4/mods/22633',
        urlLabel: 'Nexus Mods #22633',
        category: 'modding',
        required: false,
        ifMissing: 'Cleaning orphaned script instances and broken save data from Fallout 4 saves will require using Save Game Script Cleaner (SaveTool) or Savegame Script Scalpel instead, neither of which supports all FO4 save formats.',
        hasExecutable: false,
    },
    {
        name: 'Universal Patch Installer (GitHub)',
        description: "Community-driven centralised installer and database for compatibility patches across popular Fallout 4 mods, created by RageYT. Rather than hunting down individual compatibility patches yourself, Universal Patch Installer provides a single location to find and apply the patches needed when running multiple mods together. The maintained source is now hosted on GitHub (Rage-GitHub/Universal-Patch-Installer), where releases and community contributions are published. ⚠️ This is a volunteer project that relies entirely on community support to stay maintained and up to date — if you find it useful, consider donating or helping on the Discord (discord.gg/8tps9Hc).",
        detectKeywords: ['universal patch installer', 'universal patcher', 'rageyt patch'],
        url: 'https://github.com/Rage-GitHub/Universal-Patch-Installer/releases',
        urlLabel: 'GitHub Releases',
        category: 'modding',
        required: false,
        ifMissing: 'You will need to manually locate and install compatibility patches between your mods individually, which requires knowing which mod combinations need patches and where to find them.',
        hasExecutable: false,
    },
    {
        name: 'Mod Organizer 2',
        description: 'The recommended mod manager for Fallout 4. Keeps your game folder clean with a virtual file system and supports profiles.',
        detectKeywords: ['mod organizer', 'modorganizer'],
        url: 'https://github.com/ModOrganizer2/modorganizer/releases',
        urlLabel: 'GitHub Releases',
        category: 'modding',
        required: false,
        ifMissing: 'Mossy cannot detect your MO2 profile or load order. Load Order tools and MO2-specific advice will not be available.',
    },
    {
        name: 'Vortex Mod Manager',
        description: 'Nexus Mods\' official mod manager. Deploys mods directly to the Data folder and integrates with NexusMods.com for one-click installs.',
        detectKeywords: ['vortex'],
        url: 'https://www.nexusmods.com/about/vortex/',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: false,
        ifMissing: 'Mossy cannot read your Vortex profile or load order. Vortex-specific integration features will be unavailable.',
    },
    {
        name: 'LOOT',
        description: 'Automatically sorts your load order to reduce conflicts and provides warnings about problematic mods.',
        detectKeywords: ['loot'],
        url: 'https://github.com/loot/loot/releases',
        urlLabel: 'GitHub Releases',
        category: 'modding',
        required: false,
        ifMissing: 'Load order sorting assistance will require manual effort. Mossy cannot trigger LOOT runs or interpret its sort results.',
    },
    {
        name: 'NifSkope Next-Gen Fork',
        description: 'Experimental NifSkope fork for current Fallout 4 that adds many fixes and improvements, including next-gen FO4 support, glTF import/export, archive/resource extraction, improved material and texture browsing, better UV/lighting tools, and upgraded FO4 material editing. Credits: fork by hexabit, based on NifSkope from the Niftools team and other contributors.',
        detectKeywords: ['nifskope'],
        url: 'https://www.nexusmods.com/fallout4/mods/91780',
        urlLabel: 'Nexus Mods #91780',
        category: 'modding',
        required: false,
        ifMissing: 'Mossy cannot open NIF files in NifSkope from the Auditor. Mesh inspection and BSX flag editing will require manual tool launch.',
    },
    {
        name: 'BodySlide & Outfit Studio',
        description: "GUI tool suite for customising bodies and outfits, creating new shapes, and converting outfits between body types for Fallout 4 (and Skyrim). BodySlide lets you adjust body and outfit sliders and batch-build meshes without editing NIF files directly — check 'Build Morphs' to also generate TRI files for in-game morphing via LooksMenu. Outfit Studio lets you convert outfits between body types, create new BodySlide sliders, correct animation weights, and edit or import/export FBX/OBJ/NIF meshes. ⚠️ Requires OpenGL 3.3+. Install to Data/Tools/BodySlide and launch through your mod manager (MO2: add as executable; Vortex: add as dashboard tool). After BatchBuilding in MO2, move output files from Overwrite into a dedicated 'BodySlide Output' mod. Add bInvalidateOlderFiles=1 and sResourceDataDirsFinal= under [Archive] in Fallout4Custom.ini. Preset XML files you create are free to share; built meshes require author permission. Source: GPLv3+ (GitHub: ousnius/BodySlide-and-Outfit-Studio). Credits: Caliente, ousnius, NifTools team; Chinese translation by xuniana & silentdark; CBBE Uniboob reference by SQr17.",
        detectKeywords: ['bodyslide', 'outfit studio'],
        url: 'https://www.nexusmods.com/fallout4/mods/25',
        urlLabel: 'Nexus Mods #25',
        category: 'modding',
        required: false,
        ifMissing: 'Outfit mesh conversion and body preset building will not be available through Mossy.',
        hasExecutable: false,
    },
    {
        name: 'F4SE (Fallout 4 Script Extender)',
        description: 'Extends the scripting capabilities of Fallout 4. Required by many mods and by Mossy\'s deeper game integrations. ⚠️ Extract to game folder and launch via f4se_loader.exe (NOT via Steam).',
        detectKeywords: ['f4se', 'script extender'],
        url: 'https://f4se.silverlock.org/',
        urlLabel: 'Official Site',
        category: 'modding',
        required: true,
        ifMissing: 'MCM Framework, Address Library, Addictol, and most advanced mods will not load. Many Mossy-guided workflows require F4SE to be active.',
        hasExecutable: false, // Installed by extracting to game folder, not a standalone program
    },
    {
        name: 'Address Library for F4SE',
        description: 'Required by virtually every F4SE plugin (Buffout 4, MCM Framework, etc.). Without it most SKSE/F4SE-dependent mods will fail to load. ⚠️ Install via mod manager (MO2/Vortex), NOT a standalone program.',
        detectKeywords: ['address library'],
        url: 'https://www.nexusmods.com/fallout4/mods/47327',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: true,
        ifMissing: 'Addictol, MCM Framework, and virtually every F4SE plugin will fail to load. This is a hard dependency for the entire F4SE ecosystem.',
        hasExecutable: false, // Mod installed via mod manager, not a standalone program
    },
    {
        name: 'Addictol (Stability Suite)',
        description: 'All-in-one stability fix for Fallout 4 (OG/NG/AE/1.11.x). Replaces Buffout 4, X-Cell, BakaMaxPapyrusOps, Faster Workshop, and more. ⚠️ Install via mod manager (MO2/Vortex), NOT a standalone program.',
        detectKeywords: ['addictol'],
        url: 'https://www.nexusmods.com/fallout4/mods/84214',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: false,
        ifMissing: 'Game stability may be reduced. Memory management, stutter fixes, and script heap optimisations will be absent. Crash logs may also be missing.',
        hasExecutable: false, // Mod installed via mod manager, not a standalone program
    },
    {
        name: 'CLASSIC Crash Log Scanner',
        description: 'Automatically scans Buffout 4 crash logs and produces a human-readable diagnosis. ⚠️ Install via mod manager (MO2/Vortex), NOT a standalone program. Pair with Addictol for complete crash-debugging.',
        detectKeywords: ['classic'],
        url: 'https://www.nexusmods.com/fallout4/mods/56255',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: false,
        ifMissing: 'Mossy cannot auto-scan crash logs. Post-crash analysis in the CK Crash Prevention panel will require manual log reading.',
        hasExecutable: false, // Mod installed via mod manager, not a standalone program
    },
    {
        name: 'B.A.E. (Bethesda Archive Extractor)',
        description: 'Extracts the contents of Bethesda .ba2 archive files so you can inspect and modify base-game assets.',
        detectKeywords: ['bae', 'bethesda archive extractor', 'b.a.e'],
        url: 'https://www.nexusmods.com/fallout4/mods/78',
        urlLabel: 'Nexus Mods',
        category: 'modding',
        required: false,
        ifMissing: 'Vanilla .ba2 archives cannot be inspected or extracted. Asset comparison and base-game texture/mesh work will require an alternative tool.',
    },
    {
        name: 'HkxTools (created by Bingle, uploaded by jarari)',
        description: 'Standalone C++ utilities for quick HKX animation edits. Includes HkxConverter for hkx↔xml conversion so animations can be edited as text, plus HkxSpeed for fast playback-speed tweaks (for example 2.0 = 2× faster). Supports simple drag-and-drop workflows for hkx/xml files. Credit: Dexesttp for hkx class structures.',
        detectKeywords: ['hkxtools', 'hkxconverter', 'hkxspeed'],
        url: 'https://www.nexusmods.com/fallout4/mods/103687',
        urlLabel: 'Nexus Mods #103687',
        category: 'modding',
        required: false,
        ifMissing: 'Quick hkx/xml conversion and animation playback-speed iteration will require manual Havok tooling outside Mossy.',
    },
    {
        name: 'HaBCR Patcher (created by Bingle, uploaded by jarari)',
        description: 'Drag-and-drop utility that converts BCR-compatible reload animations into HaBCR loop-style animations. It cleans BCR annotations, detects and preserves a single loop, then rewrites timing and adds HaBCR loop start/end annotations. Designed to reduce manual animation patching work for Havok Aware Bullet Counted Reload (HaBCR). Credit: Dexesttp for hkx class structures.',
        detectKeywords: ['habcr', 'habcr patcher', 'habcrpatcher'],
        url: 'https://www.nexusmods.com/fallout4/mods/103682',
        urlLabel: 'Nexus Mods #103682',
        category: 'modding',
        required: false,
        ifMissing: 'Converting BCR-compatible reload animations to HaBCR will require manual HKX patching workflows and extra toolchain steps.',
    },
    {
        name: 'Fallout 4 Animation Kit — F4AK (Nexus #16694)',
        description: "Comprehensive toolkit and guide for creating brand-new animations for Fallout 4, created by ShadeAnimator. Includes a detailed PDF guide covering both animation import and export workflows, preset files for Havok Content Tools (HCT) including rig.txt and .hko settings files, 3ds Max scenes and CAT/Biped rigs for the human character skeleton, HKXPack GUI for hkx↔XML conversion, and a skeleton.hkx-to-rig.txt converter. The workflow guide is universal and applies to Maya and other 3D tools, not just 3ds max. ⚠️ This kit is no longer actively maintained (last updated 2020) — some tools or steps may need adjustment for current game versions. Update HKXPack to v0.1.5-beta from the Dexesttp GitHub separately. HavokContentTools 2014 (64-bit) is required but not included (ask other modders). Use the main rig file 'F4AK_Rig_Final.max' (3ds Max 2015+); the 2013 version is outdated. Credits: ShadeAnimator (author, guide, rigs); DexesTTP (HKXPack, HKXAnim); MaikCG (F4Biped rig, research); CPU (research); NifTools team; JoshNZ (research).",
        detectKeywords: ['f4ak', 'fallout 4 animation kit', 'fo4 animation kit', 'shadeanimator', 'hkxpack', 'fo4 animation rig'],
        url: 'https://www.nexusmods.com/fallout4/mods/16694',
        urlLabel: 'Nexus Mods #16694',
        category: 'modding',
        required: false,
        ifMissing: 'Creating custom animations for Fallout 4 will require sourcing rigs, HCT presets, and HKXPack individually and assembling your own workflow from scratch.',
        hasExecutable: false,
    },
    {
        name: 'FO4 Batch Material Editor (Nexus #103044)',
        description: 'Batch-processing GUI editor for Fallout 4 BGSM/BGEM materials with single-file editing, folder-wide batch edits, template-based BGSM generation from DDS folders, and NIF generation from a NIF template plus BGSM folder. Supports English, Japanese, and Korean. Credits: author notes indicate processing logic is based on Material Editor by ousnius.',
        detectKeywords: ['bgsm', 'bgem', 'material editor', 'material swap'],
        url: 'https://www.nexusmods.com/fallout4/mods/103044',
        urlLabel: 'Nexus Mods #103044',
        category: 'modding',
        required: false,
        ifMissing: 'Bulk BGSM/BGEM editing and automated material-generation workflows will require manual per-file setup and additional external tooling.',
    },
    {
        name: 'AutoVideo (by TheDestroyerOfWorlds)',
        description: 'Standalone program that automatically builds complete Videos of the Wasteland video addons from source videos, generating ESPs, textures, sounds, and meshes. Supports UI and CLI workflows. Requires ffmpeg to be installed separately (the mod page recommends trying "winget install ffmpeg" first).',
        detectKeywords: ['autovideo'],
        url: 'https://www.nexusmods.com/fallout4/mods/91587',
        urlLabel: 'Nexus Mods #91587',
        category: 'modding',
        required: false,
        ifMissing: 'Creating VotW video packs will require the slower manual Razorwire/xEdit-style workflow or other external tooling.',
    },
    {
        name: 'Fallout 4 Music Replacer (Nexus #6095)',
        description: "GUI utility that automates replacing songs on any of Fallout 4's three main radio stations — Diamond City Radio (38 songs), Classical Radio / The Institute (29 songs), and Radio Freedom / The Minutemen (11 songs) — and packages the result as an installable mod archive. Choose to replace an entire station or only individual songs you want to swap out. Accepts MP3, M4A, OGG, WAV, FLAC, WMA, MP4, FLV, and AVI input files. Internally uses ffmpeg to convert audio to WAV, then Microsoft's xWMAEncode.exe to produce the XWM format Fallout 4 uses. Output is a 7-Zip archive compatible with Vortex, MO2, and NMM. ⚠️ Requires .NET Framework 4.8+ and Visual C++ Redistributable for Visual Studio 2010 SP1 (x86) — the VC++ 2010 x86 redist is needed by xWMAEncode and is NOT included in Windows 10/11 by default; install it if you get 1KB output files or silent audio. ⚠️ Do NOT upload music mods containing copyrighted material to Nexus — only use public-domain or original audio. Credits: author for the application; Microsoft for xWMAEncode; ffmpeg team; 7-Zip (GNU LGPL).",
        detectKeywords: ['music replacer', 'fo4 music replacer', 'fallout 4 music replacer', 'radio replacer', 'xwmaencode'],
        url: 'https://www.nexusmods.com/fallout4/mods/6095',
        urlLabel: 'Nexus Mods #6095',
        category: 'modding',
        required: false,
        ifMissing: 'Replacing in-game radio station music will require manually converting audio to XWM format with xWMAEncode and hand-building the mod file structure.',
        hasExecutable: false,
    },
    {
        name: 'Commonwealth Cartography (by AHeroicLlama)',
        description: 'Standalone Windows mapping tool for generating and exporting complex maps of Fallout 4 world entities. Useful for worldbuilding, documentation, research, and visualizing large datasets pulled from the Commonwealth. Credit requirements from the official project: keep Commonwealth Cartography, AHeroicLlama, and the GitHub repository noted when reusing generated maps. ⚠️ Standalone external tool — not installed through a mod manager. See the official GitHub repo for tutorials, source code, thanks, and license details.',
        detectKeywords: ['commonwealth cartography'],
        url: 'https://www.nexusmods.com/fallout4/mods/73559',
        urlLabel: 'Nexus Mods #73559',
        category: 'modding',
        required: false,
        ifMissing: 'Generating detailed exportable maps of Fallout 4 entities will require manual xEdit/data extraction workflows or other external mapping tools.',
    },
    // ── Visual enhancement ────────────────────────────────────────────────────
    {
        name: 'ENB Series (by Boris Vorontsov)',
        description: 'Post-processing graphics injector that adds ambient occlusion, screen-space reflections, depth of field, physically-based bloom, subsurface scattering, and full tone-mapping to Fallout 4. Widely considered the most impactful single visual upgrade available. ⚠️ Install the two DLL files (d3d11.dll + d3dcompiler_46e.dll) directly into your Fallout 4 root folder, then add a preset from Nexus. Does NOT go in your mod manager — it is not a plugin.',
        detectKeywords: ['enb', 'enbseries'],
        url: 'http://enbdev.com/download_mod_fallout4.htm',
        urlLabel: 'enbdev.com (Official)',
        category: 'modding',
        required: false,
        ifMissing: 'Fallout 4 will use the base Creation Engine lighting with no advanced post-processing. Ambient occlusion, realistic depth-of-field, and physically-correct tone-mapping will all be absent.',
        hasExecutable: false,
    },
    // ── Gameplay frameworks ───────────────────────────────────────────────────
    {
        name: 'Creation Club ESL Stubs (Nexus #38029)',
        description: 'A set of completely empty ESL-flagged plugin files whose filenames exactly match every Creation Club mod. Installing these into your Data folder satisfies any mod\'s hard CC dependency without requiring you to own or install the actual CC content — the stubs contain nothing and add no records. Essential for running mods that list CC files as masters when you do not have the corresponding CC content installed.',
        detectKeywords: ['creation club esl', 'cc esl stubs', 'cc stubs', 'creation club stubs'],
        url: 'https://www.nexusmods.com/fallout4/mods/38029',
        urlLabel: 'Nexus Mods #38029',
        category: 'modding',
        required: false,
        ifMissing: 'Mods with hard Creation Club master dependencies will fail to load if you do not own the relevant CC content. You would need to manually acquire or stub each CC plugin yourself.',
        hasExecutable: false,
    },
    {
        name: 'PLOPTOP / ProtoLLOverridePatchNPCs (by LeafTongue)',
        description: 'Modding utility and leveled-list (LL) framework for FO4Edit power users. Provides the PLOPTOP master (ESM-flagged, no overrides — safe patch master for any load order), and ProtoLLOverridePatchNPCs (a full override of all vanilla leveled NPC records with fixes forwarded), so modders can add custom LLs to reconfigured vanilla lists and control spawn rarity without touching scripts. Also functions as a mod disinjector — quest injection scripts can be disabled by deleting data blocks in the override, and mod LLs can be manually edited and patched without script edits. ⚠️ Do not clean these files; the redundant overrides are intentional. Credit: LeafTongue (free to use; credit appreciated).',
        detectKeywords: ['ploptop', 'protolloverridepatchnpcs'],
        url: 'https://www.nexusmods.com/fallout4/mods/84615',
        urlLabel: 'Nexus Mods #84615',
        category: 'modding',
        required: false,
        ifMissing: 'Mods that use PLOPTOP as a patch master will fail to load. Custom LL control and mod disinjection workflows relying on this framework will not function.',
        hasExecutable: false,
    },
    {
        name: 'RobCo Patcher (by Zzyxzz)',
        description: 'Runtime record-patching framework for Fallout 4. Applies changes to weapons, NPCs, armor, ammo, and leveled lists at launch via simple .ini files — without adding a single plugin to your load order. Required by mods that ship RobCo patch files for compatibility. ⚠️ Install via mod manager (MO2/Vortex). Requires F4SE, CommonLibF4, and Address Library.',
        detectKeywords: ['robco patcher'],
        url: 'https://www.nexusmods.com/fallout4/mods/69798',
        urlLabel: 'Nexus Mods #69798',
        category: 'modding',
        required: false,
        ifMissing: 'Mods that ship RobCo Patcher .ini files will not apply their patches. Runtime weapon/NPC compatibility fixes will be silently skipped.',
        hasExecutable: false,
    },
    {
        name: 'Scourge (by Geluxrum)',
        description: 'F4SE plugin that replaces Bethesda\'s flat level-scalar NPC stat system with a Gaussian (bell-curve) distribution. Eliminates bullet-sponge enemies, delevels the wasteland so encounters feel dangerous from level 1, and lets you fine-tune every enemy category live via MCM. ⚠️ Install via mod manager (MO2/Vortex). Requires F4SE, Address Library, and MCM NG.',
        detectKeywords: ['scourge'],
        url: 'https://www.nexusmods.com/fallout4/mods/60917',
        urlLabel: 'Nexus Mods #60917',
        category: 'modding',
        required: false,
        ifMissing: 'NPC stats will continue to scale linearly with player level, producing the vanilla bullet-sponge effect at high levels.',
        hasExecutable: false,
    },
    {
        name: 'Bullet Counted Reload System — BCR (by Shavkacagarikia)',
        description: 'F4SE engine-level fix that makes tube-fed and rotary weapons (lever-action rifles, pump shotguns, revolvers) reload only the exact number of rounds fired instead of always playing a full-cycle animation. Also adds an interruptible-reload window so you can fire mid-reload. ⚠️ Install via mod manager (MO2/Vortex). Requires F4SE and Address Library. Install weapon-specific BCR patches for full coverage.',
        detectKeywords: ['bullet counted reload', 'bcr', 'bcrs'],
        url: 'https://www.nexusmods.com/fallout4/mods/42676',
        urlLabel: 'Nexus Mods #42676',
        category: 'modding',
        required: false,
        ifMissing: 'Lever-action rifles, shotguns, and revolvers will always animate a full reload regardless of rounds remaining, breaking immersion during combat.',
        hasExecutable: false,
    },
    {
        name: 'Base Object Swapper — BOS (by powerofthree)',
        description: 'Framework that swaps base game objects (static meshes, flora, fauna, trees) game-wide at runtime using .ini rule files — no ESP slot required. Conditions include weather FormID, worldspace, cell coordinate range, time of day, and season. Essential for dynamic environment overhauls (e.g. Glowing Sea mutation, seasonal foliage changes). ⚠️ Install via mod manager (MO2/Vortex). Requires F4SE and Address Library.',
        detectKeywords: ['base object swapper'],
        url: 'https://www.nexusmods.com/fallout4/mods/64943',
        urlLabel: 'Nexus Mods #64943',
        category: 'modding',
        required: false,
        ifMissing: 'Mods that ship BOS .ini swap rules will not apply their object replacements. Dynamic flora/fauna overhauls and weather-conditional mesh swaps will be inactive.',
        hasExecutable: false,
    },
    {
        name: 'Base Object Swapper v2 — BOS v2 (Nexus #67528)',
        description: 'Updated F4SE port of Base Object Swapper. Swaps both base objects and specific world-space references via _SWAP.ini config files placed in the Data folder — no ESP slot required. Supports form swaps, reference swaps, locational filters (location/cell/keyword/region EditorID), random multi-target swaps with per-session or per-load-order seed, transform overrides (position, rotation, random scale), and record-flag set/clear operations. ⚠️ Due to Fallout 4\'s precombine system, swapping statics and static collections is not recommended. Credit: Ryan (SniffleMan) for CommonLibF4. Requires F4SE, Address Library, Visual C++ Redistributables 2019, and Baka Framework.',
        detectKeywords: ['base object swapper', 'bos v2', 'base object swapper v2', 'swap ini'],
        url: 'https://www.nexusmods.com/fallout4/mods/67528',
        urlLabel: 'Nexus Mods #67528',
        category: 'modding',
        required: false,
        ifMissing: 'Mods that ship _SWAP.ini rules (v2 format) will not apply their object or reference replacements. Random mesh-variant systems and locational swap overhauls will be inactive.',
        hasExecutable: false,
    },
    // ── Papyrus extenders ────────────────────────────────────────────────────
    {
        name: 'Lighthouse Papyrus Extender (by GELUXRUM)',
        description: 'F4SE plugin that adds 180+ new native Papyrus functions unavailable in vanilla F4SE. Functions are organized in Lighthouse2.psc (second file required due to engine script-size limits). Enables: GetFormByEditorID/GetFormEditorID lookups, improved AI destination queries, robust hostile-faction checks, array-format inventory functions, and PDB debug support for Buffout 4 NG stack traces. Required by many advanced environment and AI mods. ⚠️ Install via mod manager (MO2/Vortex). Requires F4SE and Address Library.',
        detectKeywords: ['lighthouse papyrus extender', 'lighthouse papyrus'],
        url: 'https://www.nexusmods.com/fallout4/mods/71420',
        urlLabel: 'Nexus Mods #71420',
        category: 'modding',
        required: false,
        ifMissing: 'Mods that depend on Lighthouse Papyrus Extender functions (GetFormByEditorID, AI destination queries, etc.) will fail to compile or throw script errors at runtime.',
        hasExecutable: false,
    },
    {
        name: 'Garden of Eden Papyrus Script Extender (by LarannKiar)',
        description: 'F4SE plugin adding 1,150+ new native Papyrus functions — the most comprehensive Papyrus expansion available for Fallout 4. Adds: per-item inventory manipulation, AI travel package injection from script, Havok physics queries (collision, velocity), raycasting and line-of-sight detection, quest/terminal data access, array sort/merge/filter, silent console command execution, and dialogue control from Papyrus. MIT licensed. ⚠️ Install via mod manager (MO2/Vortex). Requires F4SE and Address Library.',
        detectKeywords: ['garden of eden papyrus', 'garden of eden script extender'],
        url: 'https://www.nexusmods.com/fallout4/mods/74160',
        urlLabel: 'Nexus Mods #74160',
        category: 'modding',
        required: false,
        ifMissing: 'Mods requiring raycasting, physics queries, advanced inventory manipulation, or silent console commands from Papyrus will fail. Complex environmental scripting (e.g. Glowing Sea mutation logic) will be limited.',
        hasExecutable: false,
    },
    {
        name: 'Papyrus Condition Functions (by LarannKiar)',
        description: 'Exports 300+ Creation Kit editor condition functions to Papyrus via Garden of Eden\'s condition runner, giving scripts access to functions that have no vanilla Papyrus counterpart. Runs fully multi-threaded — over 100× faster than equivalent Papyrus workarounds. Includes conditions like GetDistance, GetDetected, GetCombatState, GetHealthPercentage, IsSneaking, IsInInterior, GetRelationshipRank, IsBlocking, and many more. Credits: LarannKiar (author); requires Garden of Eden Papyrus Script Extender. ⚠️ Install via mod manager (MO2/Vortex). Requires F4SE, Address Library, and Garden of Eden.',
        detectKeywords: ['papyrus condition functions'],
        url: 'https://www.nexusmods.com/fallout4/mods/88104',
        urlLabel: 'Nexus Mods #88104',
        category: 'modding',
        required: false,
        ifMissing: 'Scripts relying on exported CK condition functions (GetDetected, GetCombatState, IsSneaking, etc.) will fail to compile or throw script errors at runtime.',
        hasExecutable: false,
    },
    {
        name: 'Papyrus Common Library (by SkyHorizon3)',
        description: 'Comprehensive Papyrus utility library offering 1,000+ common functions under the System namespace: form/formlist/projectile/cell/worldspace queries, filesystem management (read/write files and directories in the game root), EditorID restoration (used by Base Object Swapper & SPID), in-game global/persistent variables (MemVar/SaveVar), function runner (trigger Papyrus functions on OnGameStart/OnGameLoad events), command runner (execute console commands on menu load), and translation runner (load .json translation files before the splash screen). Supports Old-Gen and Next-Gen. ⚠️ Marked deprecated by its author — new projects should prefer Hydra instead. Requires F4SE and Address Library.',
        detectKeywords: ['papyrus common library', 'pcl papyrus'],
        url: 'https://www.nexusmods.com/fallout4/mods/86222',
        urlLabel: 'Nexus Mods #86222',
        category: 'modding',
        required: false,
        ifMissing: 'Older mods that depend on Papyrus Common Library functions (System.* namespace) will fail to compile or throw script errors. New projects should use Hydra instead.',
        hasExecutable: false,
    },
    {
        name: 'Hydra (by SoleVaultBoy)',
        description: 'Papyrus framework and extender built from scratch as a modern alternative to Papyrus Common Library. Supports Old-Gen, Next-Gen, and Anniversary Edition; adds 2,800+ Papyrus functions; introduces advanced script types like hash maps, hash sets, mutexes, and 64-bit numeric types; restores Editor IDs; and ships runners/utilities for console commands, menus, misc stats, requirements, file caches, script functions/objects/reflections, and translations. Also includes experimental Papyrus performance patches. ⚠️ Install via mod manager (MO2/Vortex) and follow the mod page documentation.',
        detectKeywords: ['hydra', 'papyrus common library', 'hydra papyrus'],
        url: 'https://www.nexusmods.com/fallout4/mods/104159',
        urlLabel: 'Nexus Mods #104159',
        category: 'modding',
        required: false,
        ifMissing: 'Mods built around Hydra\'s extended Papyrus APIs, runner system, restored Editor IDs, or experimental Papyrus performance patches will not function correctly.',
        hasExecutable: false,
    },
    // ── C++ / F4SE plugin development ─────────────────────────────────────────
    {
        name: 'F4SE Plugin Template (Ryan-rsm-McKenzie / Expired6978)',
        description: 'Pre-configured CMake + vcpkg GitHub starter kit for building F4SE DLL plugins. Provides: F4SE_PLUGIN_VERSION boilerplate, F4SEPlugin_Load entry point, CommonLibF4 as a git submodule, spdlog file logging, vcpkg.json for dependency management, and a post-build copy step to deploy directly to Data\\F4SE\\Plugins\\. Clone with --recurse-submodules, run cmake + vcpkg, build Release. ⚠️ Development tool — not installed via mod manager. Requires Visual Studio 2022 + CMake + vcpkg.',
        detectKeywords: ['f4se plugin template'],
        url: 'https://github.com/Ryan-rsm-McKenzie/f4se_plugin_template',
        urlLabel: 'GitHub (f4se_plugin_template)',
        category: 'modding',
        required: false,
        ifMissing: 'Starting a new F4SE DLL plugin project will require manually writing all CMake configuration, version boilerplate, and logging setup from scratch.',
        hasExecutable: false,
    },
    {
        name: 'CommonLibF4 + vcpkg (C++ plugin dev)',
        description: 'The community reverse-engineered C++ header library for Fallout 4 F4SE plugin development. Provides RE:: namespace class definitions (TESWeather, Actor, Sky, ActorValueOwner, etc.) for hooking engine functions. Paired with vcpkg for dependency management and CMake for build automation. Required if you are writing your own F4SE DLL plugins. ⚠️ Development tool — clone as a git submodule into your project. Not installed via mod manager.',
        detectKeywords: ['commonlibf4', 'vcpkg'],
        url: 'https://github.com/Ryan-rsm-McKenzie/CommonLibF4',
        urlLabel: 'GitHub (CommonLibF4)',
        category: 'modding',
        required: false,
        ifMissing: 'C++ F4SE plugin projects will lack engine class definitions. Hooking TESWeather, radiation, lighting, or any other engine subsystem will require manual reverse-engineering without this library.',
        hasExecutable: false,
    },
    // ── Creative tools ────────────────────────────────────────────────────────
    {
        name: 'Blender',
        description: 'Free open-source 3D creation suite. Mossy has a direct Neural Link integration (Mossy Link addon) for Blender 4.0+ — enabling live script execution, mesh automation, and FO4 asset export from within Mossy.',
        detectKeywords: ['blender'],
        url: 'https://www.blender.org/download/',
        urlLabel: 'blender.org',
        category: 'creative',
        required: false,
        ifMissing: 'Mossy Neural Link (Blender live scripting, mesh automation, FO4 export) will be completely unavailable. 3D asset workflows cannot be run from within Mossy.',
    },
    {
        name: 'Upscayl',
        description: 'AI-powered image upscaler (2×, 3×, 4×) for texture and asset enhancement. Required by Mossy\'s Upscayl Extension. Supports PNG, JPG, and WebP with multiple AI model options and batch processing.',
        detectKeywords: ['upscayl'],
        url: 'https://github.com/upscayl/upscayl/releases',
        urlLabel: 'GitHub Releases',
        category: 'creative',
        required: false,
        ifMissing: 'Mossy\'s Upscayl Extension will not function. AI texture upscaling (2×/4×) will be unavailable.',
    },
    // ── GPU & system diagnostics (free tools) ────────────────────────────────
    {
        name: 'GPU-Z (by TechPowerUp)',
        description: 'Free GPU information and monitoring utility. Shows VRAM usage, clock speeds, temperature, power draw, and shader stats in real-time. Essential for diagnosing VRAM overflow (a common cause of texture stutter in heavily modded FO4). Download the plain version (no Asus ROG branding).',
        detectKeywords: ['gpu-z', 'gpuz', 'techpowerup'],
        url: 'https://www.techpowerup.com/gpuz/',
        urlLabel: 'TechPowerUp (freeware)',
        category: 'creative',
        required: false,
        ifMissing: 'You will have no reliable way to monitor VRAM usage while troubleshooting texture stutter, CTDs, or VRAM overflow issues.',
        hasExecutable: false,
    },
    {
        name: 'HWiNFO64 (by Martin Malik)',
        description: 'Comprehensive free hardware monitoring tool. Shows CPU/GPU temperatures, VRAM allocation (Dedicated vs Shared), fan speeds, and power draw. Supports logging to CSV for post-session analysis. Critical for identifying thermal throttling that causes FPS drops in modded FO4.',
        detectKeywords: ['hwinfo', 'hwinfo64'],
        url: 'https://www.hwinfo.com/download/',
        urlLabel: 'hwinfo.com (freeware)',
        category: 'creative',
        required: false,
        ifMissing: 'Thermal throttling and VRAM issues will be difficult to diagnose without real-time hardware monitoring.',
        hasExecutable: false,
    },
    {
        name: 'Display Driver Uninstaller — DDU (by Wagnardsoft)',
        description: 'Free utility to completely remove GPU drivers before a fresh install, including all registry entries that the standard uninstaller misses. Use in Safe Mode before installing any new NVIDIA or AMD driver to prevent driver conflicts, black screens, and ENB incompatibility. Free download from wagnardsoft.com.',
        detectKeywords: ['ddu', 'display driver uninstaller', 'wagnardsoft'],
        url: 'https://www.wagnardsoft.com/display-driver-uninstaller-ddu',
        urlLabel: 'wagnardsoft.com (freeware)',
        category: 'creative',
        required: false,
        ifMissing: 'Driver conflicts and leftover registry entries from old GPU drivers may cause CTDs, ENB black screens, and unstable performance after driver updates.',
        hasExecutable: false,
    },
    {
        name: 'RivaTuner Statistics Server — RTSS (by Alexey Nicolaychuk)',
        description: 'Free frame-rate limiter and OSD overlay, bundled with MSI Afterburner. Use RTSS to cap FO4 framerate to (monitor Hz − 3), e.g. 141 for a 144Hz display. This is required when using ENB — in-game VSync with ENB causes stutter. RTSS provides much lower-latency frame capping than in-game VSync.',
        detectKeywords: ['rivatuner', 'rtss', 'msi afterburner'],
        url: 'https://www.msi.com/Landing/afterburner/graphics-cards',
        urlLabel: 'MSI Afterburner (includes RTSS) — freeware',
        category: 'creative',
        required: false,
        ifMissing: 'Without a frame cap from RTSS, ENB+FO4 at uncapped framerates causes physics issues (requires HighFPSPhysicsFix) and screen-tear stutter instead of smooth vsync.',
        hasExecutable: false,
    },
    {
        name: 'FOMOD Creator (by Wenderer)',
        description: 'Free GUI editor for building FOMOD installer packages (ModuleConfig.xml). Drag-and-drop interface to configure mod options, file mappings, and conditions — generates correct FOMOD XML without hand-coding. Required if you want to release mods with a proper installer that works in MO2 and Vortex.',
        detectKeywords: ['fomod creator', 'fomod'],
        url: 'https://www.nexusmods.com/fallout4/mods/6821',
        urlLabel: 'Nexus Mods #6821 (freeware)',
        category: 'modding',
        required: false,
        ifMissing: 'You will need to hand-write ModuleConfig.xml to package mods with installer options, which is error-prone and time-consuming.',
        hasExecutable: false,
    },
    {
        name: 'SpreadSheetInator (Sim Settlements 2 addon tool)',
        description: 'Java GUI utility for Sim Settlements 2 addon developers. Takes the stage item .txt files exported from the Creation Kit and automatically combines them into a properly formatted CSV with correct level information for each stage. Also supports optional auto-tagging of common item types (lights, clutter, etc.) to reduce manual data-entry work. Supports single-stage and multi-stage (1–3) workflows. ⚠️ Requires a Java Runtime Environment — double-click the .jar to launch. Drop it in the same folder as your exported .txt files; the output CSV will be written to that same folder.',
        detectKeywords: ['spreadsheetinator', 'spreadsheet inator', 'ss2 stage items', 'sim settlements stage'],
        url: 'https://www.nexusmods.com/fallout4/mods/67616',
        urlLabel: 'Nexus Mods #67616',
        category: 'modding',
        required: false,
        ifMissing: 'Combining and formatting stage item exports for Sim Settlements 2 addons will require manually building the CSV from scratch, which is tedious and error-prone.',
        hasExecutable: false,
    },
    {
        name: "Sim Settlements 2 Add-On Maker's Toolkit (Nexus #48521)",
        description: "Official SS2 learning toolkit for addon authors. Includes beginner-friendly PDF guides and helper resources for creating SS2 content such as buildings, city plans, leaders, holidays, paper articles, brewery recipes, pet store entries, unlocks, and industrial economy integrations. Designed for first-time modders with step-by-step instructions and companion wiki coverage. Credit: Sim Settlements 2 team resource for addon creators.",
        detectKeywords: ['sim settlements 2 addon makers toolkit', 'add-on makers toolkit', 'addon makers toolkit ss2', 'ss2 toolkit'],
        url: 'https://www.nexusmods.com/fallout4/mods/48521',
        urlLabel: 'Nexus Mods #48521',
        category: 'modding',
        required: false,
        ifMissing: 'You will miss the official SS2 addon-authoring starter guides and helper files, making first-time addon workflows significantly harder.',
        hasExecutable: false,
    },
    {
        name: 'Wasteland Reconstruction Kit (Nexus #48960)',
        description: 'Massive SS2-aligned settlement building kit with 10,000+ buildable items, prefab structures, and special scripted workshop objects (markers, spawners, ladders, tours, holiday swaps, effects, sounds, and more). Built to support shareable layouts/city plans with minimal extra requirements. Requires Sim Settlements 2, Workshop Framework, and Fallout 4 DLC for authoring. Credit: Strong Swanson and contributors from the Sim Settlements community.',
        detectKeywords: ['wasteland reconstruction kit', 'wrk', 'ss2 wrk', 'sim settlements reconstruction kit'],
        url: 'https://www.nexusmods.com/fallout4/mods/48960',
        urlLabel: 'Nexus Mods #48960',
        category: 'modding',
        required: false,
        ifMissing: 'Advanced SS2-focused prefab/build-kit workflows and many SS2 contest-friendly build assets will be unavailable in your settlement design pipeline.',
        hasExecutable: false,
    },
    {
        name: 'City Plan Contest Assistant (Nexus #50366)',
        description: 'Utility mod that streamlines Sim Settlements 2 City Plan Contest participation. Adds automation for contest setup/unlocks, settlement prep, export safety checks, and a holotape toolbox for contest-specific actions (build limit setup, settler spawn, highlighting checks, upgrades, and takeover helpers). Updated monthly for current contest settlements. Requires Sim Settlements 2 and Workshop Framework.',
        detectKeywords: ['city plan contest assistant', 'ss2 contest assistant', 'sim settlements contest assistant'],
        url: 'https://www.nexusmods.com/fallout4/mods/50366',
        urlLabel: 'Nexus Mods #50366',
        category: 'modding',
        required: false,
        ifMissing: 'Entering SS2 City Plan contests will require fully manual setup and validation instead of the contest automation and helper tools this mod provides.',
        hasExecutable: false,
    },
];
// ─────────────────────────────────────────────────────────────────────────────

interface ToolRecommendation {
    name: string;
    path: string;
    category: 'nvidia' | 'ai' | 'modding' | 'creative';
    benefit: string;
    boostsMossy: boolean;
}

const loadStoredToolChoices = (): Record<string, boolean> => {
    try {
        const parseJson = (raw: string | null) => {
            try {
                return JSON.parse(raw || 'null');
            } catch {
                return null;
            }
        };
        const isRecord = (value: unknown): value is Record<string, unknown> => (
            typeof value === 'object' && value !== null && !Array.isArray(value)
        );

        const storedPrefsRaw = parseJson(localStorage.getItem('mossy_tool_preferences'));
        const storedPrefs = isRecord(storedPrefsRaw) ? storedPrefsRaw : {};
        const fromPrefs = Object.fromEntries(
            Object.entries(storedPrefs).filter(([, value]) => typeof value === 'boolean')
        ) as Record<string, boolean>;

        const integratedToolsRaw = parseJson(localStorage.getItem('mossy_integrated_tools'));
        const integratedTools = Array.isArray(integratedToolsRaw) ? integratedToolsRaw : [];
        const fromIntegrated = Array.isArray(integratedTools)
            ? Object.fromEntries(
                integratedTools
                    .map((tool: any) => tool?.name)
                    .filter((name: unknown): name is string => typeof name === 'string' && name.length > 0)
                    .map((name: string) => [name, true])
            )
            : {};

        const approvedAppsRaw = parseJson(localStorage.getItem('mossy_apps'));
        const approvedApps = Array.isArray(approvedAppsRaw) ? approvedAppsRaw : [];
        const fromApprovedApps = Array.isArray(approvedApps)
            ? Object.fromEntries(
                approvedApps
                    .filter((app: any) => app?.checked === true && typeof app?.name === 'string' && app.name.length > 0)
                    .map((app: any) => [app.name, true])
            )
            : {};

        return {
            ...fromPrefs,
            ...fromIntegrated,
            ...fromApprovedApps,
        };
    } catch {
        return {};
    }
};

/** Delay (ms) before calling onComplete after the "complete" screen appears. */
const COMPLETE_TRANSITION_DELAY_MS = 2000;
/** Shorter delay when Spriggit digest already ran — the user just clicked Continue. */
const SPRIGGIT_DONE_TRANSITION_DELAY_MS = 500;
/** Maximum characters of error text shown in the Spriggit status message box. */
const MAX_SPRIGGIT_ERROR_DISPLAY_LENGTH = 4000;
/** Maximum characters of the DLC failure details shown in the partial-success message. */
const MAX_SPRIGGIT_PARTIAL_ERROR_PREVIEW = 300;
/** How long (ms) the .NET recheck result badge stays visible before auto-dismissing. */
const DOTNET_RECHECK_BADGE_DURATION_MS = 6000;
/** Message shown when a manual .NET recheck still cannot find the runtime. */
const DOTNET_STILL_NOT_DETECTED_MSG = '⚠️ Still not detected — try restarting Mossy after install. To confirm .NET is present, open a Command Prompt and run: Spriggit.CLI.exe --version';
/** While detectPrograms runs, keep progress visibly moving up to this ceiling before handoff to stage milestones. */
const SCAN_DETECTION_PROGRESS_CAP = 68;
/** Convert elapsed milliseconds into faux progress steps so users see steady movement during long detection calls. */
const SCAN_DETECTION_MS_PER_PROGRESS_POINT = 300;
/** UI refresh cadence for interim detection progress updates. */
const SCAN_DETECTION_PROGRESS_TICK_MS = 150;

export const FirstRunOnboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const { t, setUiLanguagePref } = useI18n();
    const [step, setStep] = useState<'edition' | 'welcome' | 'version' | 'scanning' | 'credits' | 'lists' | 'recommendations' | 'downloads' | 'spriggit-digest' | 'identity' | 'complete'>('edition');
    const [fo4Version, setFo4Version] = useState<string>(() => {
        try { return localStorage.getItem('mossy_fo4_version') || ''; } catch { return ''; }
    });
    const [mossyEdition, setMossyEdition] = useState<'nvidia' | 'universal' | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [recommendations, setRecommendations] = useState<ToolRecommendation[]>([]);
    const [filteredRecommendations, setFilteredRecommendations] = useState<ToolRecommendation[]>([]);
    const [allApps, setAllApps] = useState<any[]>([]);
    const [userChoices, setUserChoices] = useState<Record<string, boolean>>(() => loadStoredToolChoices());
    const [showAllPrograms, setShowAllPrograms] = useState(false);
    const [showTutorialVideo, setShowTutorialVideo] = useState(false);
    const hasSpokenIntro = useRef(false);
    const hasSpokenVersion = useRef(false);
    const hasSpokenEdition = useRef(false);
    const hasSpokenLists = useRef(false);
    const [voiceTestPlaying, setVoiceTestPlaying] = useState(false);
    const scanTutorialStartedRef = useRef(false);
    const [languageReady, setLanguageReady] = useState(false);
    const [scanTutorialRequested, setScanTutorialRequested] = useState(false);
    const [scanTutorialOpenedAt, setScanTutorialOpenedAt] = useState<string | null>(null);
    const detectionProgressTimerRef = useRef<number | null>(null);
    /** Timer used to auto-dismiss the .NET recheck result badge. */
    const dotnetRecheckTimerRef = useRef<number | null>(null);

    const [uiLanguage, setUiLanguage] = useState<string>('auto');

    // Scan error state
    const [scanError, setScanError] = useState<string | null>(null);
    const [scanRetryCount, setScanRetryCount] = useState(0);
    const [preferredName, setPreferredName] = useState<string>('Vault Dweller');
    const [memoryStorageMode, setMemoryStorageMode] = useState<'userData' | 'custom'>('userData');
    const [memoryStoragePath, setMemoryStoragePath] = useState<string>('');
    const [identityError, setIdentityError] = useState<string | null>(null);

    // Spriggit digest step state
    const [spriggitCliPath, setSpriggitCliPath] = useState('');
    const [spriggitDataPath, setSpriggitDataPath] = useState('');
    const [spriggitPackageName, setSpriggitPackageName] = useState('Spriggit.Yaml.Fallout4');
    const [spriggitNugetSource, setSpriggitNugetSource] = useState('');
    const [spriggitStatus, setSpriggitStatus] = useState<'idle' | 'running' | 'done' | 'partial' | 'error' | 'noMods'>('idle');
    const [spriggitMessage, setSpriggitMessage] = useState('');
    const [spriggitFileCount, setSpriggitFileCount] = useState(0);
    const [cacheClearInProgress, setCacheClearInProgress] = useState(false);
    const [cacheClearResult, setCacheClearResult] = useState<'ok' | 'error' | null>(null);
    const [unblockInProgress, setUnblockInProgress] = useState(false);
    const [unblockResult, setUnblockResult] = useState<{ ok: boolean; unblocked?: number; folderPath?: string; error?: string } | null>(null);
    /**
     * Tracks the automatic "unblock freshly extracted assemblies → retry" step that runs
     * after a "Clear Cache & Retry" still fails with 0xFFFFFFFF.  Clearing the cache causes
     * Spriggit to re-extract its .NET assemblies from scratch; those new files are not
     * covered by any previous Unblock-File run and must be unblocked before SAC will allow
     * them to load.
     */
    const [autoUnblockRetryState, setAutoUnblockRetryState] = useState<'idle' | 'unblocking' | 'retrying' | 'failed'>('idle');
    /**
     * Tracks state of the "Add Defender Exclusion" action shown when persistent
     * 0xFFFFFFFF failures suggest SAC is in "On" mode (Unblock-File not enough).
     */
    const [defenderExclusionState, setDefenderExclusionState] = useState<'idle' | 'running' | 'ok' | 'needs-elevation' | 'error'>('idle');
    const [defenderExclusionPath, setDefenderExclusionPath] = useState<string | null>(null);
    /** Verification state — tracks whether the Defender exclusion was successfully added. */
    const [verificationState, setVerificationState] = useState<'idle' | 'checking' | 'verified' | 'not-excluded' | 'error'>('idle');
    const [verificationMessage, setVerificationMessage] = useState<string>('');
    /** FO4 version detected from Fallout4.exe, e.g. "1.11.191.0". Empty if not detected. */
    const [detectedFo4Version, setDetectedFo4Version] = useState('');
    /** Human-readable FO4 version label, e.g. "Fallout 4 v1.11.191 — 1.11.x (Creations Menu…)". */
    const [detectedFo4Label, setDetectedFo4Label] = useState('');
    /** Spriggit version detected from `--version`, e.g. "0.40.0". Empty if not detected. */
    const [detectedSpriggitVersion, setDetectedSpriggitVersion] = useState('');
    /**
     * True only when main.ts confirmed the detected Spriggit version is below the
     * minimum required for FO4 1.11.x support (i.e. a genuine version mismatch).
     * False when version is current — a different root cause (Smart App Control, disk
     * space) is responsible.  Null before the first serialize attempt.
     */
    const [spriggitVersionTooOld, setSpriggitVersionTooOld] = useState<boolean | null>(null);

    // .NET Runtime availability (detected during the startup scan)
    const [dotnetOk, setDotnetOk] = useState<boolean | null>(() => {
        try {
            const v = localStorage.getItem('mossy_dotnet_ok');
            return v === null ? null : v === 'true';
        } catch { return null; }
    });
    /** True when the user manually asserts .NET is installed (overrides failed auto-detection). */
    const [dotnetOverride, setDotnetOverride] = useState<boolean>(() => {
        try { return localStorage.getItem('mossy_dotnet_override') === 'true'; } catch { return false; }
    });
    const [dotnetRecheckInProgress, setDotnetRecheckInProgress] = useState(false);
    // 'found' | 'not-found' | null — shown briefly after a manual recheck
    const [dotnetRecheckResult, setDotnetRecheckResult] = useState<'found' | 'not-found' | null>(null);
    /** True while the automatic .NET check runs on entering the spriggit-digest step. */
    const [dotnetCheckingOnEntry, setDotnetCheckingOnEntry] = useState(false);

    /** Version mismatch modal control */
    const [showVersionMismatchModal, setShowVersionMismatchModal] = useState(false);
    const [versionMismatchAcknowledged, setVersionMismatchAcknowledged] = useState(false);

    /** Tools the user has manually located via the "Browse to locate" button.
     *  Key = dl.name, value = the .exe path they picked. */
    const [manuallyLocated, setManuallyLocated] = useState<Record<string, string>>({});

    /**
     * Shared helper — persist the result of any checkDotnet() call to state and
     * localStorage.  Returns the ok boolean so callers can branch on it.
     */
    const applyDotnetResult = (result: { ok: boolean; version?: string | null } | null) => {
        const ok = !!result?.ok;
        setDotnetOk(ok);
        try {
            localStorage.setItem('mossy_dotnet_ok', String(ok));
            if (result?.version) localStorage.setItem('mossy_dotnet_version', result.version);
        } catch { /* ignore */ }
        return ok;
    };

    const recheckDotnet = async () => {
        const api = getElectronApi();
        if (!api?.checkDotnet) return;
        setDotnetRecheckInProgress(true);
        setDotnetRecheckResult(null);
        if (dotnetRecheckTimerRef.current !== null) {
            window.clearTimeout(dotnetRecheckTimerRef.current);
            dotnetRecheckTimerRef.current = null;
        }
        try {
            const result = await api.checkDotnet();
            const ok = applyDotnetResult(result);
            setDotnetRecheckResult(ok ? 'found' : 'not-found');
            // Auto-clear the inline result badge after the configured duration
            dotnetRecheckTimerRef.current = window.setTimeout(() => {
                dotnetRecheckTimerRef.current = null;
                setDotnetRecheckResult(null);
            }, DOTNET_RECHECK_BADGE_DURATION_MS);
            // If .NET was just found, clear any previous Spriggit 0xFFFFFFFF error
            // so the user gets a clean slate and can retry the digest immediately.
            if (ok && spriggitStatus === 'error' && spriggitMessage.includes('0xFFFFFFFF')) {
                setSpriggitStatus('idle');
                setSpriggitMessage('');
            }
            // If .NET is now properly detected, clear the manual override so we
            // don't leave a stale flag in localStorage.
            if (ok && dotnetOverride) {
                setDotnetOverride(false);
                try { localStorage.removeItem('mossy_dotnet_override'); } catch { /* ignore */ }
            }
        } catch { /* non-fatal */ } finally {
            setDotnetRecheckInProgress(false);
        }
    };

    const getElectronApi = () => {
        return (window as any)?.electron?.api ?? (window as any)?.electronAPI;
    };

    const shouldSpeak = () => {
        try {
            // Returns true when the key is missing (null) or set to anything other than 'false'.
            return localStorage.getItem('mossy_voice_enabled') !== 'false';
        } catch {
            return true;
        }
    };

    /** Force-enable voice and ensure browser TTS settings are initialised. */
    const enableVoice = () => {
        try {
            localStorage.setItem('mossy_voice_enabled', 'true');
        } catch { /* ignore */ }
        const settings = loadBrowserTtsSettings();
        if (!settings.enabled) {
            saveBrowserTtsSettings({ ...settings, enabled: true });
        }
        ensureBrowserTtsSettingsStored();
    };

    // Clean up the .NET recheck auto-dismiss timer when the component unmounts.
    useEffect(() => {
        return () => {
            if (dotnetRecheckTimerRef.current !== null) {
                window.clearTimeout(dotnetRecheckTimerRef.current);
            }
        };
    }, []);

    // Load version mismatch acknowledgment from localStorage on mount (Phase 4)
    useEffect(() => {
        try {
            const ack = localStorage.getItem('mossy_spriggit_version_mismatch_ack');
            if (ack === 'true') {
                setVersionMismatchAcknowledged(true);
            }
        } catch { /* ignore */ }
    }, []);

    // Whenever the user reaches the spriggit-digest step, run a fresh .NET check.
    // This ensures dotnetOk is accurate even if the scan step was skipped or
    // if the cached localStorage value is stale.
    useEffect(() => {
        if (step !== 'spriggit-digest') return;
        const api = getElectronApi();
        if (!api?.checkDotnet) return;
        setDotnetCheckingOnEntry(true);
        void (async () => {
            try {
                const result = await api.checkDotnet();
                applyDotnetResult(result);
            } catch { /* non-fatal */ } finally {
                setDotnetCheckingOnEntry(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    useEffect(() => {
        // If onboarding was already completed, skip straight through.
        const hasOnboarded = localStorage.getItem('mossy_onboarding_complete');
        if (hasOnboarded) {
            console.log('[FirstRunOnboarding] User already completed onboarding. Skipping wizard.');
            onComplete();
            return;
        }

        // Check if user explicitly wants to redo onboarding (from Tutorial Reset in Settings)
        // If so, ignore any leftover scan data and let them go through the full flow again.
        const forceOnboarding = localStorage.getItem('mossy_force_onboarding') === 'true';
        if (forceOnboarding) {
            console.log('[FirstRunOnboarding] Force onboarding flag detected. Running full onboarding flow.');
            localStorage.removeItem('mossy_force_onboarding'); // Clear the flag
            return; // Don't skip - let the user go through onboarding
        }

        // If scan data already exists from a previous run (preserved during reinstall),
        // skip the scan step entirely and complete onboarding silently. User data is
        // preserved so they don't lose program selections or downloaded tool paths.
        // BUT: Only do this if they haven't explicitly reset onboarding via Settings.
        const hasScanData =
            !!localStorage.getItem('mossy_scan_summary') &&
            !!localStorage.getItem('mossy_all_detected_apps');
        if (hasScanData && !forceOnboarding) {
            console.log('[FirstRunOnboarding] Scan data already exists from previous install. Preserving and completing onboarding.');
            localStorage.setItem('mossy_onboarding_complete', 'true');
            localStorage.setItem('mossy_onboarding_completed', 'true');
            onComplete();
            return;
        }

        console.log('[FirstRunOnboarding] Starting fresh onboarding wizard.');
    }, [onComplete]);

    // Speak greeting on the edition picker (very first screen).
    useEffect(() => {
        if (step !== 'edition') return;
        if (hasSpokenEdition.current) return;
        hasSpokenEdition.current = true;

        // Ensure voice is on and TTS settings are ready before speaking.
        enableVoice();

        const speakSequence = async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            await speakMossy("Hello, I'm Mossy, your Fallout 4 modding assistant.");
            await speakMossy('Press Continue to begin setup.');
        };
        void speakSequence();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    useEffect(() => {
        if (step !== 'welcome') return;
        if (hasSpokenIntro.current) return;
        if (!shouldSpeak()) return;
        hasSpokenIntro.current = true;

        // Delay first TTS to let Electron/Chromium finish loading speech synthesis voices.
        const speakSequence = async () => {
            await new Promise(resolve => setTimeout(resolve, 800));
            await speakMossy("Hello, I'm Mossy.");
            await speakMossy('Pick your language to begin.');
            await speakMossy('Important note: I am not affiliated with, endorsed by, or officially connected to third-party tools or add-ons shown in this app.');
            await speakMossy('When you are ready, press Next.');
        };

        void speakSequence();
    }, [step]);

    // Speak a brief intro when arriving at the game-version picker.
    useEffect(() => {
        if (step !== 'version') return;
        if (hasSpokenVersion.current) return;
        if (!shouldSpeak()) return;
        hasSpokenVersion.current = true;

        const speakSequence = async () => {
            await speakMossy('Which Fallout 4 version do you have? Pick the one that matches your install, then press Start System Scan.');
        };

        void speakSequence();
    }, [step]);

    useEffect(() => {
        return () => {
            if (detectionProgressTimerRef.current !== null) {
                window.clearInterval(detectionProgressTimerRef.current);
                detectionProgressTimerRef.current = null;
            }
        };
    }, []);

    // Speak an explanation of whitelist and blacklist when arriving at the lists step.
    useEffect(() => {
        if (step !== 'lists') return;
        if (hasSpokenLists.current) return;
        hasSpokenLists.current = true;

        // Ensure voice is enabled for this explanation
        enableVoice();

        const speakSequence = async () => {
            await speakMossy('I have two content control systems to protect your privacy and safety.');
            await speakMossy('The Mod Content Whitelist is a privacy tool. Any mods you add here will be completely invisible to me—I will never mention them, recommend them, or interact with them in any way.');
            await speakMossy('The Mod Blacklist is a safety warning system. Add mods you know are problematic or broken, and I will warn about them and suggest safer alternatives.');
            await speakMossy('You can manage both lists anytime in Settings under Privacy. You do not need to set anything up now.');
        };

        void speakSequence();
    }, [step]);

    // Fetch the Mossy edition (Universal or Nvidia) once on mount.
    useEffect(() => {
        const api = getElectronApi();
        if (!api?.getMossyEdition) return;
        api.getMossyEdition()
            .then((ed: 'nvidia' | 'universal') => setMossyEdition(ed))
            .catch(() => { /* ignore — not critical */ });
    }, []);

    // Load persisted UI language (if available) so the first screen reflects it.
    useEffect(() => {
        const api = getElectronApi();
        if (!api?.getSettings) return;

        let disposed = false;
        const load = async () => {
            try {
                const s = await api.getSettings();
                if (disposed) return;
                const pref = String(s?.uiLanguage || 'auto');
                setUiLanguage(pref);
                if (pref === 'auto') setUiLanguagePref('auto');
                else {
                    setUiLanguagePref(resolveUiLanguage(pref));
                    setLanguageReady(true);
                }
            } catch {
                // ignore
            }
        };

        void load();
        return () => {
            disposed = true;
        };
    }, [setUiLanguagePref]);

    useEffect(() => {
        const api = getElectronApi();
        if (!api?.getSettings) return;
        void api.getSettings().then((s: any) => {
            setPreferredName(String(s?.userPreferredName || 'Vault Dweller').trim() || 'Vault Dweller');
            const mode = String(s?.memoryStorageMode || 'userData').toLowerCase() === 'custom' ? 'custom' : 'userData';
            setMemoryStorageMode(mode);
            setMemoryStoragePath(String(s?.memoryStoragePath || '').trim());
        }).catch(() => { /* ignore */ });
    }, []);

    const applyLanguage = async (value: string) => {
        setUiLanguage(value);

        if (value === 'auto') {
            setUiLanguagePref('auto');
        } else {
            setUiLanguagePref(resolveUiLanguage(value));
        }

        const api = getElectronApi();
        if (!api?.setSettings) return;
        try {
            await api.setSettings({ uiLanguage: value });
        } catch {
            // ignore
        }

        if (value !== 'auto') {
            const voices = getBrowserTtsVoices();
            // Use pickBrowserTtsVoice to intelligently select a female voice for the language
            const langBase = value.split('-')[0].toLowerCase();
            const match = pickBrowserTtsVoice(voices, undefined, langBase);
            if (match) {
                // Only auto-select the voice if it's actually for the requested language
                // Otherwise, keep the current voice (likely English Zira)
                if (match.lang && match.lang.toLowerCase().startsWith(langBase)) {
                    const settings = loadBrowserTtsSettings();
                    saveBrowserTtsSettings({ ...settings, preferredVoiceName: match.name, enabled: true });
                    localStorage.setItem('mossy_voice_enabled', 'true');
                } else {
                    console.log(`[FirstRunOnboarding] No ${value} voice available (found ${match.lang} instead), keeping current voice`);
                }
            }
        }

        setLanguageReady(true);
    };

    const triggerScanTutorial = useCallback((forceRetry = false) => {
        if (scanTutorialStartedRef.current && !forceRetry) return;
        scanTutorialStartedRef.current = true;
        try {
            localStorage.setItem('mossy_force_scan_tutorial', 'true');
        } catch {
            // ignore
        }
        setScanTutorialRequested(true);
        const directOpen = (window as any).mossyOpenScanTutorial as undefined | (() => void);
        if (directOpen) {
            directOpen();
        }
        window.dispatchEvent(new CustomEvent('start-scan-tutorial'));
        document.dispatchEvent(new CustomEvent('start-scan-tutorial'));
        window.setTimeout(() => {
            try {
                const openedAt = localStorage.getItem('mossy_scan_tutorial_opened_at');
                if (openedAt) {
                    const ts = Number(openedAt);
                    if (Number.isFinite(ts)) {
                        setScanTutorialOpenedAt(new Date(ts).toLocaleTimeString());
                    }
                } else {
                    // Allow manual retries if auto-launch did not succeed.
                    scanTutorialStartedRef.current = false;
                }
            } catch {
                // ignore
                scanTutorialStartedRef.current = false;
            }
        }, 200);
    }, []);

    const startScan = async () => {
        setStep('scanning');
        setScanProgress(10);
        setScanError(null); // Clear any previous error
        setScanTutorialRequested(false);
        setScanTutorialOpenedAt(null);
        scanTutorialStartedRef.current = false;
        try {
            localStorage.removeItem('mossy_scan_tutorial_opened_at');
        } catch {
            // ignore
        }

        if (shouldSpeak()) {
            void speakMossy('Starting system scan. While I scan, I will walk you through the tutorial so you can get oriented.', { cancelExisting: true });
        }
        window.setTimeout(() => {
            triggerScanTutorial();
        }, 250);

        try {
            const api = getElectronApi();
            console.log('[FirstRunOnboarding] Electron API check:', {
                hasApi: !!api,
                hasGetSystemInfo: !!api?.getSystemInfo,
                hasDetectPrograms: !!api?.detectPrograms,
                hasCheckDotnet: !!api?.checkDotnet
            });

            if (!api?.getSystemInfo || !api?.detectPrograms) {
                throw new Error('Electron API not available. The required system scan functions are missing. This may indicate that the app was not started correctly or there is an issue with the Electron bridge.');
            }

            // Get system info
            console.log('[FirstRunOnboarding] Calling getSystemInfo...');
            const systemInfo = await api.getSystemInfo();
            console.log('[FirstRunOnboarding] System info received:', systemInfo);
            setScanProgress(25);

            // Keep visible progress moving while program detection runs.
            const detectStartedAt = Date.now();
            if (detectionProgressTimerRef.current !== null) {
                window.clearInterval(detectionProgressTimerRef.current);
            }
            detectionProgressTimerRef.current = window.setInterval(() => {
                setScanProgress(prev => {
                    if (prev >= SCAN_DETECTION_PROGRESS_CAP) return prev;
                    const elapsedMs = Date.now() - detectStartedAt;
                    const elapsedProgress = 25 + Math.floor(elapsedMs / SCAN_DETECTION_MS_PER_PROGRESS_POINT);
                    return Math.max(prev, Math.min(SCAN_DETECTION_PROGRESS_CAP, elapsedProgress));
                });
            }, SCAN_DETECTION_PROGRESS_TICK_MS);

            // Detect all programs
            console.log('[FirstRunOnboarding] Calling detectPrograms...');
            const allDetectedApps = await api.detectPrograms();
            console.log('[FirstRunOnboarding] Detected programs:', allDetectedApps?.length || 0);
            setAllApps(allDetectedApps);
            if (detectionProgressTimerRef.current !== null) {
                window.clearInterval(detectionProgressTimerRef.current);
                detectionProgressTimerRef.current = null;
            }
            setScanProgress(70);

            // Check .NET Runtime — required by Spriggit and other .NET tools.
            // Do this during the scan so the Spriggit step can warn upfront.
            let dotnetAvailable = false;
            try {
                if (api.checkDotnet) {
                    console.log('[FirstRunOnboarding] Checking .NET Runtime...');
                    const dotnetResult = await api.checkDotnet();
                    console.log('[FirstRunOnboarding] .NET check result:', dotnetResult);
                    dotnetAvailable = applyDotnetResult(dotnetResult);
                }
            } catch (dotnetError) {
                console.warn('[FirstRunOnboarding] .NET check failed (non-fatal):', dotnetError);
            }
            if (!api.checkDotnet) {
                console.warn('[FirstRunOnboarding] checkDotnet API not available');
                setDotnetOk(false);
            }
            setScanProgress(80);

            // Analyze and categorize
            const nvidia = allDetectedApps.filter((a: any) =>
                (a.displayName || a.name || '').toLowerCase().match(/nvidia|geforce|cuda|rtx|canvas|nsight|omniverse/)
            );

            const ai = allDetectedApps.filter((a: any) =>
                (a.displayName || a.name || '').toLowerCase().match(/ollama|luma|comfy|stable|gpt|kobold|automatic1111/)
            );

            const creative = allDetectedApps.filter((a: any) =>
                (a.displayName || a.name || '').toLowerCase().match(/gimp|photoshop|blender|substance|marmoset/)
            );

            const modding = allDetectedApps.filter((a: any) =>
                (a.displayName || a.name || '').toLowerCase().match(/xedit|fo4edit|creation kit|nifskope|outfit studio|bodyslide|wrye bash|loot|vortex|mod organizer/)
            );

            // Build recommendations - prioritize tools that boost Mossy
            const recs: ToolRecommendation[] = [];

            // NVIDIA tools - highest priority
            nvidia.forEach((app: any) => {
                const name = app.displayName || app.name;
                if (name.match(/canvas/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'nvidia',
                        benefit: 'AI texture generation - Mossy can guide workflows',
                        boostsMossy: true
                    });
                } else if (name.match(/nsight/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'nvidia',
                        benefit: 'Performance profiling for games',
                        boostsMossy: false
                    });
                }
            });

            // AI tools - highest priority (boost Mossy significantly)
            ai.forEach((app: any) => {
                const name = app.displayName || app.name;
                if (name.match(/ollama/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'ai',
                        benefit: '⭐ Run local AI models - GREATLY enhances Mossy\'s capabilities',
                        boostsMossy: true
                    });
                } else if (name.match(/luma/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'ai',
                        benefit: '⭐ Generate 3D assets from photos - Mossy can guide',
                        boostsMossy: true
                    });
                } else if (name.match(/comfy|stable/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'ai',
                        benefit: '⭐ Image generation for texture creation',
                        boostsMossy: true
                    });
                }
            });

            // Creative tools
            creative.forEach((app: any) => {
                const name = app.displayName || app.name;
                if (name.match(/gimp|photoshop|krita|affinity/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'creative',
                        benefit: 'Edit textures and images - Mossy has integration workflows',
                        boostsMossy: false
                    });
                } else if (name.match(/blender/i)) {
                    recs.push({
                        name,
                        path: app.path,
                        category: 'creative',
                        benefit: '⭐ 3D modeling - Mossy has direct Blender script integration',
                        boostsMossy: true
                    });
                }
            });

            // Modding tools
            modding.forEach((app: any) => {
                const name = app.displayName || app.name;
                recs.push({
                    name,
                    path: app.path,
                    category: 'modding',
                    benefit: 'Essential for Fallout 4 modding workflows',
                    boostsMossy: false
                });
            });

            // .NET SDK — inject a warning card if missing
            if (!dotnetAvailable) {
                recs.unshift({
                    name: '.NET SDK (missing)',
                    path: 'https://dotnet.microsoft.com/download/dotnet',
                    category: 'modding',
                    benefit: '⚠️ Required by Spriggit (SDK, not just Runtime — needed for dotnet tool install of translation packages). Install then restart your PC. 💡 Tip: if C: is short on space, click "Change" during setup and install to D:\\Program Files\\dotnet.',
                    boostsMossy: true,
                });
            }

            // Save scan results
            localStorage.setItem('mossy_all_detected_apps', JSON.stringify(allDetectedApps));
            // Use a numeric timestamp so all modules can compare it safely
            localStorage.setItem('mossy_last_scan', Date.now().toString());
            const previousSummary = localStorage.getItem('mossy_scan_summary');
            if (previousSummary) {
                localStorage.setItem('mossy_scan_summary_prev', previousSummary);
            }
            localStorage.setItem('mossy_scan_summary', JSON.stringify({
                totalPrograms: allDetectedApps.length,
                nvidiaTools: nvidia.length,
                aiTools: ai.length,
                systemInfo
            }));

            setScanProgress(100);
            setRecommendations(recs);
            setFilteredRecommendations(recs);
            setUserChoices(prev => ({
                // Stored choices are the baseline; preserve in-session toggles on top.
                ...loadStoredToolChoices(),
                ...prev
            }));
            setScanRetryCount(0); // Reset retry count on success
            setStep('credits');

        } catch (error) {
            if (detectionProgressTimerRef.current !== null) {
                window.clearInterval(detectionProgressTimerRef.current);
                detectionProgressTimerRef.current = null;
            }
            console.error('[FirstRunOnboarding] Scan failed:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setScanError(errorMessage);

            // Log detailed error information for debugging
            console.error('[FirstRunOnboarding] Detailed error:', {
                error,
                message: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
                retryCount: scanRetryCount
            });

            // Don't automatically skip to complete - stay on scanning step to show error
            // User can retry or continue manually
        }
    };

    useEffect(() => {
        if (step !== 'scanning') return;
        if (scanTutorialStartedRef.current) return;
        const timer = window.setTimeout(() => {
            triggerScanTutorial();
        }, 350);
        return () => window.clearTimeout(timer);
    }, [step, triggerScanTutorial]);

    const handleChoice = (toolName: string, accepted: boolean) => {
        setUserChoices(prev => ({ ...prev, [toolName]: accepted }));
    };

    const finishOnboarding = () => {
        // Save user preferences
        localStorage.setItem('mossy_tool_preferences', JSON.stringify(userChoices));
        localStorage.setItem('mossy_onboarding_complete', 'true');

        // Build integrated tools list for Mossy
        const integratedTools = recommendations
            .filter(r => userChoices[r.name] === true)
            .map(r => ({ name: r.name, path: r.path, category: r.category }));

        localStorage.setItem('mossy_integrated_tools', JSON.stringify(integratedTools));

        // Promote to the unified scan/permissions store used across the app.
        // These are the tools the user explicitly approved for Mossy to know about and interact with.
        const promotedApps = integratedTools.map((t, idx) => ({
            id: `onboard-${idx}-${Math.random().toString(36).slice(2, 7)}`,
            name: t.name,
            category: t.category,
            checked: true,
            path: t.path
        }));
        localStorage.setItem('mossy_apps', JSON.stringify(promotedApps));

        // Offer the Spriggit digest step before showing "complete".
        setStep('spriggit-digest');
    };

    /**
     * Run Spriggit serialize on the user's Fallout 4 Data folder, then
     * ingest all produced YAML files into the Knowledge Vault so Mossy
     * can reason over the user's specific plugin data.
     *
     * Returns `{ failed0xFFFF: true }` when the serialize crashed with
     * exit code 0xFFFFFFFF so the "Clear Cache & Retry" handler can
     * detect this specific failure mode and auto-unblock the freshly
     * extracted assemblies before retrying.
     */
    const runSpriggitDigest = async (): Promise<{ failed0xFFFF: boolean }> => {
        const api = getElectronApi();
        if (!api?.spriggitSerialize || !api?.saveKnowledgeVault) {
            setSpriggitMessage('Spriggit integration is not available in this build.');
            setSpriggitStatus('error');
            return { failed0xFFFF: false };
        }
        if (!spriggitCliPath || !spriggitDataPath) {
            setSpriggitMessage('Please select both Spriggit.CLI.exe and your Fallout 4 Data folder.');
            return { failed0xFFFF: false };
        }
        setSpriggitStatus('running');
        setSpriggitMessage('Running Spriggit — converting vanilla ESMs to YAML. This may take several minutes…');
        try {
            // Pre-flight: verify .NET 8.0+ is present before spawning Spriggit for every plugin.
            // This avoids spawning dozens of instantly-crashing processes when .NET is missing.
            // Wrapped in try/catch: if checkDotnet rejects (e.g. IPC handler not registered), we
            // log the warning and proceed — Spriggit may still work if .NET is already installed.
            if (api.checkDotnet) {
                try {
                    const dotnetResult = await api.checkDotnet();
                    const ok = applyDotnetResult(dotnetResult);
                    if (!ok) {
                        setSpriggitStatus('error');
                        setSpriggitMessage(
                            '.NET SDK is required to run Spriggit (exit code 4294967295 / 0xFFFFFFFF).\n' +
                            'The SDK (not just the Runtime) is needed so Spriggit can download its\n' +
                            'Fallout4 translation package via "dotnet tool install" on first serialize run.\n' +
                            'After installing, restart your PC, then try again.\n' +
                            'Download: https://dotnet.microsoft.com/download/dotnet\n' +
                            '💡 Tip: if your C: drive is low on space, click "Change" during setup\n' +
                            '   and install to D:\\Program Files\\dotnet — any drive works.'
                        );
                        return { failed0xFFFF: false };
                    }
                } catch (dotnetErr) {
                    console.warn('[Spriggit] checkDotnet pre-flight threw — proceeding anyway:', dotnetErr);
                }
            }
            // vanillaOnly: scan the base-game ESMs (Fallout4.esm + DLCs) so Mossy learns
            // exact FormIDs, record structures, and script data from the live game files.
            const result = await api.spriggitSerialize({
                cliPath: spriggitCliPath,
                dataPath: spriggitDataPath,
                outputPath: '',
                vanillaOnly: true,
                packageName: spriggitPackageName.trim() || 'Spriggit.Yaml.Fallout4',
                nugetSource: spriggitNugetSource.trim() || undefined,
            });
            // Persist detected version info so the error UI can display them immediately.
            if (result.fo4Version) setDetectedFo4Version(result.fo4Version as string);
            if (result.fo4Label) setDetectedFo4Label(result.fo4Label as string);
            if (result.spriggitVersion) setDetectedSpriggitVersion(result.spriggitVersion as string);
            // spriggitVersionTooOld is set by main.ts using an actual semver comparison, so use it
            // directly rather than re-deriving it from the version string in the renderer.
            if (typeof result.spriggitVersionTooOld === 'boolean') {
                setSpriggitVersionTooOld(result.spriggitVersionTooOld as boolean);
            }

            // PRE-FLIGHT VERSION MISMATCH CHECK (Phase 3)
            // Show blocking modal if FO4 1.11.x + Spriggit < 0.34.0 and user hasn't acknowledged
            if (result.spriggitVersionTooOld && !versionMismatchAcknowledged) {
                setSpriggitStatus('error');
                setSpriggitMessage('Version mismatch detected — see modal for details');
                setShowVersionMismatchModal(true);
                return { failed0xFFFF: false };
            }

            if (!result.ok || !result.files?.length) {
                const errText = result.error || 'No YAML files were produced.';
                // Cap display length to avoid rendering a massive wall of text.
                const displayErr = errText.length > MAX_SPRIGGIT_ERROR_DISPLAY_LENGTH
                    ? errText.slice(0, MAX_SPRIGGIT_ERROR_DISPLAY_LENGTH) + '\n…(truncated)'
                    : errText;
                if (result.noVanillaPlugins) {
                    // Not a real failure — no vanilla ESMs found in the folder.
                    setSpriggitStatus('noMods');
                    setSpriggitMessage(displayErr);
                } else {
                    setSpriggitStatus('error');
                    setSpriggitMessage(`Spriggit failed:\n${displayErr}`);
                }
                // If every plugin crashed with the .NET-missing signature, run a fresh
                // checkDotnet() to confirm whether .NET is genuinely absent.  An AV block or
                // x86/x64 architecture mismatch produces the same exit code even when .NET IS
                // installed — in that case we must not disable the button so the user can retry
                // after fixing AV / downloading the correct Spriggit build.
                if (errText.includes('0xFFFFFFFF')) {
                    // PHASE 4: If version mismatch detected and not acknowledged, show modal
                    if (result.spriggitVersionTooOld && !versionMismatchAcknowledged) {
                        setShowVersionMismatchModal(true);
                        return { failed0xFFFF: true };
                    }

                    try {
                        const freshCheck = await api.checkDotnet!();
                        applyDotnetResult(freshCheck);
                    } catch {
                        // Re-check threw (IPC unavailable) — leave dotnet status unchanged.
                    }
                    return { failed0xFFFF: true };
                }
                return { failed0xFFFF: false };
            }
            // Build Knowledge Vault entries from the YAML files, tagged as vanilla base records
            const getExistingVault = (): any[] => {
                try { return JSON.parse(localStorage.getItem('mossy_knowledge_vault') || '[]') as any[]; } catch { return []; }
            };
            const existing: any[] = Array.isArray(getExistingVault()) ? getExistingVault() : [];
            const now = new Date().toISOString();
            const newEntries = (result.files as Array<{ name: string; content: string }>).map((f) => ({
                id: `spriggit-vanilla-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: `Vanilla ESM: ${f.name}`,
                content: f.content,
                source: 'Spriggit serialize — vanilla ESMs (onboarding)',
                trustLevel: 'personal',
                date: now,
                tags: ['spriggit', 'fallout4', 'vanilla-base-records'],
                status: 'learned',
            }));
            const merged = [...existing, ...newEntries];
            localStorage.setItem('mossy_knowledge_vault', JSON.stringify(merged));
            try { await api.saveKnowledgeVault(merged); } catch { /* fire-and-forget */ }

            // PHASE 5: Save detected versions to settings for future comparison
            if (api.setSettings && (detectedFo4Version || detectedSpriggitVersion)) {
                try {
                    await api.setSettings({
                        lastDetectedFo4Version: detectedFo4Version || undefined,
                        lastDetectedSpriggitVersion: detectedSpriggitVersion || undefined,
                        spriggitVersionMismatchAcknowledged: versionMismatchAcknowledged || undefined,
                    });
                } catch (settingsErr) {
                    console.warn('[Spriggit] Failed to save version info to settings:', settingsErr);
                }
            }

            // Queue the vanilla ESMs into the Auditor so the user can run a full
            // asset/plugin audit immediately after onboarding without re-picking files.
            // We derive the plugin names from the serialized output paths — the first
            // path component before the first slash is the plugin base-name.
            const VANILLA_ESM_NAMES = [
                'Fallout4.esm', 'DLCCoast.esm', 'DLCNukaWorld.esm',
                'DLCRobot.esm', 'DLCWorkshop01.esm', 'DLCWorkshop02.esm', 'DLCWorkshop03.esm',
            ];
            const serializedBases = new Set(
                (result.files as Array<{ name: string; content: string }>)
                    .map(f => f.name.split(/[/\\]/)[0])
                    .filter(Boolean)
            );
            const auditorEntries = VANILLA_ESM_NAMES
                .filter(esm => serializedBases.has(esm.replace(/\.esm$/i, '')))
                .map(esm => ({
                    id: `vanilla-audit-${Date.now()}-${esm}`,
                    name: esm,
                    type: 'plugin' as const,
                    path: `${spriggitDataPath.replace(/[/\\]$/, '')}/${esm}`,
                    size: 'Pending',
                    issues: [] as any[],
                    status: 'pending' as const,
                }));
            if (auditorEntries.length > 0) {
                // Merge with any pre-existing Auditor entries (don't wipe custom mods the
                // user may have queued manually before onboarding completed).
                const existingAudit: any[] = (() => {
                    try { return JSON.parse(localStorage.getItem('mossy_scan_auditor') || '[]'); } catch { return []; }
                })();
                // Deduplicate: don't add an entry if a plugin with the same name already exists
                const existingNames = new Set(existingAudit.map((e: any) => e.name?.toLowerCase()));
                const newAuditEntries = auditorEntries.filter(e => !existingNames.has(e.name.toLowerCase()));
                if (newAuditEntries.length > 0) {
                    localStorage.setItem('mossy_scan_auditor', JSON.stringify([...existingAudit, ...newAuditEntries]));
                    localStorage.setItem('mossy_auditor_auto_scan', 'true');
                }
            }
            setSpriggitFileCount(newEntries.length);
            // Partial success: some plugins produced YAML but others hard-crashed (0xFFFFFFFF).
            // Show an amber warning rather than green success so the user understands DLC data
            // is missing and knows what to investigate.
            const isPartial = !!(result.partialSuccess && result.error);
            if (isPartial) {
                setSpriggitStatus('partial');
                const skipNote = (result.skippedCustomCount ?? 0) > 0
                    ? ` (${result.skippedCustomCount} custom mod${result.skippedCustomCount === 1 ? '' : 's'} skipped)`
                    : '';
                // Cap the error block to avoid a wall of text — DLC crash errors are already
                // truncated to MAX_SHOWN=3 in main.ts; 300 chars is enough for all of them.
                const errPreview = result.error!.length > MAX_SPRIGGIT_PARTIAL_ERROR_PREVIEW
                    ? result.error!.slice(0, MAX_SPRIGGIT_PARTIAL_ERROR_PREVIEW) + '\n…(see below for full details)'
                    : result.error!;
                setSpriggitMessage(
                    `⚠️ Partial success — ${newEntries.length} YAML files digested${skipNote}.\n` +
                    `Fallout4.esm converted successfully, but some DLC ESMs failed:\n\n${errPreview}`
                );
            } else {
                setSpriggitStatus('done');
                const skipNote = (result.skippedCustomCount ?? 0) > 0
                    ? ` (${result.skippedCustomCount} custom mod${result.skippedCustomCount === 1 ? '' : 's'} skipped — use the Auditor to analyse those)`
                    : '';
                setSpriggitMessage(`✅ Digested ${newEntries.length} vanilla ESM YAML files into my Knowledge Vault.${skipNote}`);
            }
            if (shouldSpeak()) {
                void speakMossy(isPartial
                    ? `I've digested ${newEntries.length} files from Fallout4.esm into my knowledge base. Some DLC files failed — check the status message for details.`
                    : `I've finished converting the vanilla ESMs with Spriggit and digested ${newEntries.length} files into my knowledge. I now have direct access to the base game records.`
                );
            }
            return { failed0xFFFF: false };
        } catch (err: any) {
            setSpriggitStatus('error');
            setSpriggitMessage(`Error: ${String(err?.message || err)}`);
            return { failed0xFFFF: false };
        }
    };

    const saveIdentitySettings = async () => {
        const name = preferredName.trim() || 'Vault Dweller';
        if (memoryStorageMode === 'custom' && !memoryStoragePath.trim()) {
            setIdentityError('Please specify a custom storage path.');
            return false;
        }
        setIdentityError(null);
        const api = getElectronApi();
        if (api?.setSettings) {
            try {
                const current = await api.getSettings?.();
                await api.setSettings({
                    ...(current || {}),
                    userPreferredName: name,
                    memoryStorageMode,
                    memoryStoragePath: memoryStorageMode === 'custom' ? memoryStoragePath.trim() : '',
                });
            } catch (e) {
                console.warn('[FirstRunOnboarding] Failed to save identity settings:', e);
            }
        }
        return true;
    };

    /** Advance from the spriggit-digest step to identity prompt. */
    const handleSpriggitContinue = () => {
        setStep('identity');
    };

    const handleIdentityContinue = async () => {
        const ok = await saveIdentitySettings();
        if (!ok) return;
        setStep('complete');
        setTimeout(onComplete, (spriggitFileCount > 0 || spriggitStatus === 'partial') ? SPRIGGIT_DONE_TRANSITION_DELAY_MS : COMPLETE_TRANSITION_DELAY_MS);
    };

    return (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8">
            <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">

                {/* ── Edition picker — very first screen ───────────────────────── */}
                {step === 'edition' && (
                    <div className="text-center animate-fade-in">
                        <Sparkles className="w-20 h-20 mx-auto mb-6 text-amber-400" />
                        <h1 className="text-4xl font-bold text-white mb-3">Welcome to Mossy v{packageJson.version}</h1>
                        <p className="text-lg text-slate-300 mb-2">Your AI-powered Fallout 4 modding assistant</p>
                        <p className="text-slate-400 mb-8">
                            Your AI-powered Fallout 4 modding assistant
                        </p>

                        <div className="max-w-sm mx-auto mb-8">
                            {/* Single edition display — determined by which build you installed */}
                            {mossyEdition === 'nvidia' ? (
                                <div className="relative text-left rounded-2xl border-2 p-6 bg-green-900/60 border-green-400 shadow-lg shadow-green-900/40">
                                    <Zap className="w-10 h-10 text-green-400 mb-3" />
                                    <div className="text-lg font-bold text-white mb-1">NVIDIA Edition</div>
                                    <div className="text-xs text-slate-300 mb-3">CUDA 12.4 · GPU-accelerated AI</div>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li>✓ AI assistant &amp; mod tools</li>
                                        <li>✓ Full modding workflow</li>
                                        <li>✓ Local AI fine-tuning (Unsloth)</li>
                                        <li>✓ Faster local inference</li>
                                        <li>⚠ Requires NVIDIA RTX / GTX GPU</li>
                                    </ul>
                                    <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-green-300 bg-green-900/70 px-2 py-0.5 rounded-full border border-green-500">
                                        <Check className="w-3 h-3" /> NVIDIA Edition
                                    </span>
                                </div>
                            ) : (
                                <div className="relative text-left rounded-2xl border-2 p-6 bg-blue-900/60 border-blue-400 shadow-lg shadow-blue-900/40">
                                    <Cpu className="w-10 h-10 text-blue-400 mb-3" />
                                    <div className="text-lg font-bold text-white mb-1">Universal Edition</div>
                                    <div className="text-xs text-slate-300 mb-3">CPU-based · Works on any hardware</div>
                                    <ul className="text-xs text-slate-400 space-y-1">
                                        <li>✓ AI assistant &amp; mod tools</li>
                                        <li>✓ Full modding workflow</li>
                                        <li>✓ No GPU required</li>
                                        <li className="text-slate-500">– Local AI fine-tuning not available</li>
                                    </ul>
                                    <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-blue-300 bg-blue-900/70 px-2 py-0.5 rounded-full border border-blue-500">
                                        <Check className="w-3 h-3" /> Universal Edition
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Voice test */}
                        <div className="max-w-md mx-auto mb-6 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-left">
                            <div className="flex items-center gap-2 text-white font-semibold text-sm mb-1">
                                <Volume2 className="w-4 h-4 text-amber-400" />
                                Voice Check
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                                Mossy speaks to you during onboarding and in the chat. Click below to confirm your audio is working.
                            </p>
                            <button
                                type="button"
                                disabled={voiceTestPlaying}
                                onClick={async () => {
                                    enableVoice();
                                    setVoiceTestPlaying(true);
                                    await speakMossy("Voice check. I'm Mossy. Your audio is working!", { cancelExisting: true });
                                    setVoiceTestPlaying(false);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-700/60 hover:bg-amber-600/60 border border-amber-500/60 text-amber-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                <Volume2 className="w-4 h-4" />
                                {voiceTestPlaying ? 'Speaking…' : 'Test Voice'}
                            </button>
                            <p className="mt-2 text-[10px] text-slate-500">
                                No audio? Go to Settings → Voice after setup to configure your voices.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep('welcome')}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            Continue <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {step === 'welcome' && (
                    <div className="text-center animate-fade-in">
                        <Sparkles className="w-20 h-20 mx-auto mb-6 text-amber-400" />
                        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Mossy v{packageJson.version}</h1>
                        <p className="text-xl text-slate-300 mb-8">
                            Your AI-powered Fallout 4 modding assistant with next-gen voice conversation
                        </p>
                        <p className="text-slate-400 mb-6">
                            <strong className="text-emerald-400">✨ New in v{packageJson.version}:</strong> Pick your UI language on first launch (or later in Settings), plus a smoother Install Wizard experience.
                        </p>
                        <p className="text-slate-400 mb-8">
                            Let me scan your system to discover tools I can integrate with.
                            This will help me provide personalized recommendations and boost my capabilities.
                        </p>
                        <p className="text-slate-500 text-sm max-w-3xl mx-auto mb-8">
                            <strong className="text-amber-300">Important:</strong> Mossy is not affiliated with, endorsed by, or officially connected to third-party tools or add-ons shown in this app. Always download tools from official sources.
                        </p>

                        <div className="max-w-md mx-auto mb-8 text-left bg-slate-900/40 border border-slate-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Map className="w-4 h-4 text-emerald-400" />
                                {t('onboarding.language.label', 'Language')}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {t('onboarding.language.help', 'Choose your interface language. You can change this later in Settings.')}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-2">
                                {[
                                    { value: 'auto', label: t('onboarding.language.auto', 'Auto (system)') },
                                    { value: 'en', label: 'English' },
                                    { value: 'es', label: 'Español' },
                                    { value: 'fr', label: 'Français' },
                                    { value: 'de', label: 'Deutsch' },
                                    { value: 'ru', label: 'Русский' },
                                    { value: 'zh-Hans', label: '中文（简体）' },
                                    { value: 'pt-BR', label: 'Português (Brasil)' },
                                    { value: 'ja', label: '日本語' },
                                    { value: 'ko', label: '한국어' },
                                    { value: 'it', label: 'Italiano' },
                                    { value: 'pl', label: 'Polski' },
                                    { value: 'tr', label: 'Türkçe' },
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={uiLanguage === value}
                                        onClick={() => void applyLanguage(value)}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${uiLanguage === value
                                            ? 'bg-emerald-600 border-emerald-500 text-white'
                                            : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:border-slate-500'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-700 text-[10px] text-emerald-400">
                                ✅ <strong>12 languages supported.</strong> UI language will update immediately. For voice support in your language, install the corresponding Windows voice pack.
                            </div>
                        </div>

                        <button
                            onClick={() => setStep('version')}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            Next <ArrowRight className="w-5 h-5" />
                        </button>

                        <div className="mt-6">
                            <button
                                type="button"
                                onClick={() => setShowTutorialVideo((prev) => !prev)}
                                className="text-sm text-amber-300 hover:text-amber-200 underline"
                            >
                                {showTutorialVideo ? 'Hide' : 'Watch'} full onboarding tutorial
                            </button>
                        </div>

                        {showTutorialVideo && (
                            <div className="mt-6 text-left">
                                <TutorialVideoPanel
                                    title="First-Run Video Guide"
                                    description="A full walkthrough of setup, scanning, and the core pages you will use most often."
                                />
                            </div>
                        )}
                    </div>
                )}

                {step === 'version' && (
                    <div className="text-center animate-fade-in">
                        <Download className="w-16 h-16 mx-auto mb-6 text-emerald-400" />
                        <h2 className="text-3xl font-bold text-white mb-3">Which Fallout 4 version do you have?</h2>
                        <p className="text-slate-400 mb-6 max-w-xl mx-auto">
                            Mossy tailors its advice based on your game version — mod compatibility, F4SE version, and stability tools all depend on this. You can change it later in Settings.
                        </p>

                        {/* Mossy Edition badge — clarifies Universal vs Nvidia up front */}
                        {mossyEdition && (
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 ${mossyEdition === 'nvidia'
                                ? 'bg-green-900/70 border border-green-500 text-green-300'
                                : 'bg-blue-900/70 border border-blue-500 text-blue-300'
                                }`}>
                                {mossyEdition === 'nvidia' ? <Zap className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                                You have <strong className="ml-1">Mossy {mossyEdition === 'nvidia' ? 'NVIDIA Edition' : 'Universal Edition'}</strong>
                                <span className="ml-1 font-normal opacity-80">
                                    {mossyEdition === 'nvidia'
                                        ? '— CUDA 12.4 · local AI fine-tuning enabled'
                                        : '— CPU PyTorch · works on all hardware'}
                                </span>
                            </div>
                        )}

                        <div className="max-w-lg mx-auto space-y-3 mb-8 text-left">
                            {[
                                {
                                    value: 'og',
                                    label: 'OG — Original Game (1.10.163)',
                                    detail: 'The classic pre-update version. F4SE 0.6.23. Best mod compatibility.',
                                    selectedClass: 'bg-emerald-800 border-emerald-400 text-white',
                                },
                                {
                                    value: 'ng',
                                    label: 'NG — Next-Gen Update (1.10.984)',
                                    detail: 'April 2024 update. F4SE 0.7.x. Requires NG patches for many mods.',
                                    selectedClass: 'bg-blue-800 border-blue-400 text-white',
                                },
                                {
                                    value: 'ae',
                                    label: 'AE / Creations Menu (1.11.x)',
                                    detail: 'November 2025 Bethesda "Anniversary Edition" update. F4SE 0.7.7.',
                                    selectedClass: 'bg-purple-800 border-purple-400 text-white',
                                },
                                {
                                    value: 'unknown',
                                    label: "Not sure — I'll set this later",
                                    detail: 'You can check your game version in Steam or in the Fallout 4 launcher.',
                                    selectedClass: 'bg-slate-600 border-slate-400 text-white',
                                },
                            ].map(({ value, label, detail, selectedClass }) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={fo4Version === value}
                                    onClick={() => {
                                        setFo4Version(value);
                                        try { localStorage.setItem('mossy_fo4_version', value); } catch { /* ignore */ }
                                        // Auto-advance after a brief pause so the user sees the selection highlighted
                                        window.setTimeout(() => startScan(), 500);
                                    }}
                                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-colors ${fo4Version === value
                                        ? selectedClass
                                        : 'bg-slate-800/60 border-slate-600 text-slate-200 hover:border-slate-400'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-sm">{label}</div>
                                        {fo4Version === value && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-500">
                                                <Check className="w-3 h-3" /> Selected
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">{detail}</div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                if (!fo4Version) {
                                    try { localStorage.setItem('mossy_fo4_version', 'unknown'); } catch { /* ignore */ }
                                    setFo4Version('unknown');
                                }
                                startScan();
                            }}
                            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 mx-auto transition-colors"
                        >
                            Start System Scan <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep('welcome')}
                            className="mt-4 text-sm text-slate-400 hover:text-slate-200 underline block mx-auto"
                        >
                            ← Back
                        </button>
                    </div>
                )}

                {step === 'scanning' && (
                    <div className="animate-fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
                            <div className="text-center">
                                {!scanError ? (
                                    <>
                                        <Loader className="w-16 h-16 mx-auto mb-6 text-amber-400 animate-spin" />
                                        <h2 className="text-2xl font-bold text-white mb-4">Scanning Your System</h2>
                                        <p className="text-slate-400 mb-6">
                                            Detecting installed programs and tools...
                                        </p>
                                        <div className="w-full bg-slate-800 rounded-full h-3 mb-4">
                                            <div
                                                className="bg-amber-500 h-3 rounded-full transition-all duration-300"
                                                style={{ width: `${scanProgress}%` }}
                                            />
                                        </div>
                                        <p className="text-sm text-slate-500">{scanProgress}%</p>
                                    </>
                                ) : (
                                    <>
                                        <X className="w-16 h-16 mx-auto mb-6 text-red-400" />
                                        <h2 className="text-2xl font-bold text-white mb-4">Scan Failed</h2>
                                        <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-4 mb-6 text-left">
                                            <p className="text-red-300 text-sm font-semibold mb-2">Error Details:</p>
                                            <p className="text-red-200/80 text-xs leading-relaxed break-words">
                                                {scanError}
                                            </p>
                                        </div>
                                        <div className="flex gap-3 justify-center">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setScanRetryCount(prev => prev + 1);
                                                    void startScan();
                                                }}
                                                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                                Retry Scan {scanRetryCount > 0 && `(Attempt ${scanRetryCount + 1})`}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    console.log('[FirstRunOnboarding] User chose to skip scan after error');
                                                    setStep('credits');
                                                }}
                                                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                                            >
                                                Skip Scan &amp; Continue
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-4">
                                            If the scan keeps failing, you can skip it and manually configure tools later.
                                        </p>
                                    </>
                                )}
                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => triggerScanTutorial(true)}
                                        className="px-5 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-100 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        Start walkthrough
                                    </button>
                                    <div className="text-[11px] text-slate-500 mt-2">
                                        If the tutorial did not auto-start, use this button to launch it.
                                    </div>
                                    {scanTutorialRequested && (
                                        <div className="text-[11px] text-emerald-400 mt-2">
                                            Launch requested...
                                        </div>
                                    )}
                                    {scanTutorialOpenedAt && (
                                        <div className="text-[11px] text-emerald-300 mt-1">
                                            Tutorial opened at {scanTutorialOpenedAt}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <TutorialVideoPanel
                                compact
                                title="Watch While We Scan"
                                description="Quick orientation while your system scan runs."
                                className="lg:mt-2"
                            />
                        </div>
                    </div>
                )}

                {step === 'credits' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <Sparkles className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                            <h2 className="text-3xl font-bold text-white mb-3">Credits &amp; Acknowledgments</h2>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto">
                                Mossy is built on the shoulders of giants. Here are the key projects and communities that make it possible.
                            </p>
                        </div>

                        <div className="max-w-2xl mx-auto space-y-3 mb-8">
                            {[
                                { label: 'Core', color: 'amber', items: ['Electron v35', 'React v18', 'TypeScript v5', 'Vite v7'] },
                                { label: 'AI', color: 'emerald', items: ['OpenAI SDK', 'Groq SDK', 'Anthropic Claude', 'PyTorch (CPU & CUDA)'] },
                                { label: 'Modding Tools', color: 'blue', items: ["xEdit / FO4Edit by ElminsterAU & xEdit Team (Nexus #2737; MPL 1.1; team: Hlp, Zilav, Sharlikran)", "Pra's xEdit Scripts by Pra (Nexus #28898)", "Pra's zEdit Patchers by Pra (Nexus #33858)", 'Creation Kit by Bethesda', 'Papyrus Compiler Patched — NoDox (Nexus #44959)', 'Creation Club ESL Stubs (Nexus #38029)', 'FallrimTools — ReSaver by MarkDFSoftware (Nexus #22633; Apache 2.0)', 'Universal Patch Installer by RageYT (GitHub: Rage-GitHub/Universal-Patch-Installer)', 'LOOT by WrinklyNinja', 'Mod Organizer 2 by Tannin42', 'PLOPTOP / ProtoLLOverridePatchNPCs by LeafTongue (Nexus #84615)', 'RobCo Patcher by Zzyxzz', 'Scourge by Geluxrum', 'BCR (Bullet Counted Reload) by Shavkacagarikia', 'Base Object Swapper by powerofthree (Nexus #64943)', 'Base Object Swapper v2 by powerofthree (Nexus #67528; credit: SniffleMan for CommonLibF4)', 'Addictol / Buffout 4 by Perchik71', 'CLASSIC by evildarkarchon', 'Address Library by meh321', 'Lighthouse Papyrus Extender by GELUXRUM', 'Garden of Eden Papyrus Extender by LarannKiar', 'Papyrus Condition Functions by LarannKiar (Nexus #88104; requires Garden of Eden)', 'Papyrus Common Library by SkyHorizon3 (Nexus #86222; deprecated — prefer Hydra)', 'Hydra by SoleVaultBoy'] },
                                { label: 'Asset Tools', color: 'purple', items: ['Blender by Blender Foundation', 'NifSkope Next-Gen Fork by hexabit (credit: Niftools team & contributors)', 'BodySlide & Outfit Studio by Caliente &amp; ousnius (Nexus #25; GPLv3+; credit: NifTools team)', 'B.A.E. by jonwd7', 'HkxTools by Bingle / jarari (credit: Dexesttp)', 'HaBCR Patcher by Bingle / jarari (credit: Dexesttp)', 'Fallout 4 Animation Kit — F4AK by ShadeAnimator (Nexus #16694; credits: DexesTTP, MaikCG, NifTools team)', 'FO4 Batch Material Editor (Nexus #103044; based on Material Editor by ousnius)', 'AutoVideo by TheDestroyerOfWorlds (requires ffmpeg)', 'Fallout 4 Music Replacer (Nexus #6095; credit: ffmpeg team, Microsoft xWMAEncode, 7-Zip)', 'Commonwealth Cartography by AHeroicLlama (Nexus #73559; GitHub repo: Mappalachia/Commonwealth_Cartography)', 'SpreadSheetInator (Nexus #67616) — SS2 stage item CSV tool', 'ENB Series by Boris Vorontsov', 'CommonLibF4 by Ryan-rsm-McKenzie &amp; contributors', 'F4SE Plugin Template by Ryan-rsm-McKenzie', 'vcpkg by Microsoft', 'FOMOD Creator by Wenderer'] },
                                { label: 'Diagnostics & Monitoring', color: 'amber', items: ['GPU-Z by TechPowerUp (freeware)', 'HWiNFO64 by Martin Malik (freeware)', 'Display Driver Uninstaller (DDU) by Wagnardsoft (freeware)', 'RivaTuner Statistics Server (RTSS) by Alexey Nicolaychuk — bundled with MSI Afterburner (freeware)'] },
                                { label: 'Community', color: 'rose', items: ['Nexus Mods community', 'Fallout 4 modding community', 'GitHub contributors', 'Everyone who tests &amp; supports Mossy'] },
                            ].map(({ label, color, items }) => (
                                <div key={label} className={`bg-slate-800/60 border border-${color}-500/30 rounded-xl p-4`}>
                                    <div className={`text-xs font-bold text-${color}-400 uppercase tracking-wide mb-2`}>{label}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {items.map((item) => (
                                            <span key={item} className="text-xs text-slate-300 bg-slate-700/60 px-2 py-1 rounded-md"
                                                dangerouslySetInnerHTML={{ __html: item }} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-center text-xs text-slate-500 mb-6">
                            Full credits and license information: <strong className="text-slate-400">CREDITS.md</strong> in the Mossy installation folder.
                        </p>

                        <div className="flex flex-col items-center gap-3">
                            <button
                                data-testid="onboarding-credits-cta"
                                onClick={() => setStep('lists')}
                                className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 transition-colors"
                            >
                                Next <ArrowRight className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('scanning')}
                                className="text-sm text-slate-400 hover:text-slate-200 underline"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                )}

                {step === 'lists' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <Brain className="w-16 h-16 mx-auto mb-4 text-emerald-400" />
                            <h2 className="text-3xl font-bold text-white mb-3">Whitelist &amp; Blacklist</h2>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto">
                                Mossy has two built-in content control systems you can configure any time in <strong className="text-slate-300">Settings → Privacy</strong>.
                            </p>
                        </div>

                        <div className="max-w-2xl mx-auto space-y-5 mb-8">
                            {/* Whitelist */}
                            <div className="bg-slate-800/60 border border-amber-500/40 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-amber-300">Mod Content Whitelist</h3>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                                    The whitelist is a <strong className="text-white">privacy protection</strong> tool — primarily for mod authors. Any mod you add here will be <strong className="text-amber-200">completely invisible to Mossy</strong>: she will never mention it, recommend it, reference it, or interact with it in any way, no matter what.
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
                                    <li>Use it to keep your unreleased or private mods out of Mossy's responses</li>
                                    <li>Stored entirely on your local machine — nothing is sent anywhere</li>
                                    <li>Takes effect immediately on your next message to Mossy</li>
                                </ul>
                            </div>

                            {/* Mod Blacklist */}
                            <div className="bg-slate-800/60 border border-orange-500/40 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center">
                                        <X className="w-4 h-4 text-orange-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-orange-300">Mod Blacklist</h3>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                                    The mod blacklist is a <strong className="text-white">safety warning</strong> system. Add mods you know are problematic, broken, or incompatible. When anyone asks Mossy about a blacklisted mod, she will warn about the known issues and suggest safer alternatives.
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
                                    <li>Great for flagging mods that cause crashes, conflicts, or save corruption</li>
                                    <li>Mossy will still respect the user's choice if they insist — but she'll document her warning</li>
                                    <li>Separate from the Program Blacklist (which covers outdated tools and utilities)</li>
                                </ul>
                            </div>

                            {/* Program Blacklist */}
                            <div className="bg-slate-800/60 border border-red-500/40 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center">
                                        <X className="w-4 h-4 text-red-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-red-300">Program Blacklist</h3>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                                    The program blacklist works like the mod blacklist, but for <strong className="text-white">tools and utilities</strong>. Add programs you know are outdated, incompatible, or harmful — Mossy will actively steer users away from them and recommend better alternatives.
                                </p>
                                <ul className="text-xs text-slate-400 space-y-1 pl-4 list-disc">
                                    <li>Useful for flagging superseded tools (e.g. old script extenders, broken managers)</li>
                                    <li>Configured in Settings → Privacy alongside the mod blacklist</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-center text-xs text-slate-500 mb-6">
                            You don't need to set anything up now — you can manage all three lists at any time in <strong className="text-slate-400">Settings → Privacy</strong>.
                        </p>

                        <div className="flex flex-col items-center gap-3">
                            <button
                                data-testid="onboarding-lists-cta"
                                onClick={() => setStep('recommendations')}
                                className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-lg flex items-center gap-3 transition-colors"
                            >
                                Next: See Discovered Tools <ArrowRight className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep('credits')}
                                className="text-sm text-slate-400 hover:text-slate-200 underline"
                            >
                                ← Back to Credits
                            </button>
                        </div>
                    </div>
                )}

                {step === 'recommendations' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-8">
                            <Cpu className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                            <h2 className="text-2xl font-bold text-white mb-2">Tools Discovered</h2>
                            <p className="text-slate-400">
                                I found {recommendations.length} recommended tools out of {allApps?.length || 'many'} total programs installed.
                                <br />
                                <span className="text-xs mt-1 block">Select tools you want me to know about and use:</span>
                            </p>
                        </div>

                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder={`Search all ${allApps.length} programs...`}
                                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                                onChange={(e) => {
                                    const search = e.target.value.toLowerCase();
                                    if (search.length > 0) {
                                        // Filter recommendations by search term
                                        setFilteredRecommendations(
                                            recommendations.filter(r =>
                                                r.name.toLowerCase().includes(search) ||
                                                r.benefit.toLowerCase().includes(search)
                                            )
                                        );
                                    } else {
                                        setFilteredRecommendations(recommendations);
                                    }
                                }}
                            />
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto space-y-2 mb-6">
                            {filteredRecommendations.map((rec, i) => (
                                <div
                                    key={i}
                                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${userChoices[rec.name] === true
                                        ? 'bg-emerald-900/20 border-emerald-500'
                                        : userChoices[rec.name] === false
                                            ? 'bg-slate-900/50 border-slate-700 opacity-50'
                                            : 'bg-slate-800 border-slate-700 hover:border-amber-500'
                                        }`}
                                    onClick={() => {
                                        const current = userChoices[rec.name];
                                        handleChoice(rec.name, current !== true);
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-bold text-sm">{rec.name}</h3>
                                                {rec.boostsMossy && (
                                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full border border-amber-500/50">
                                                        Boosts Mossy
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400">{rec.benefit}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            {userChoices[rec.name] === true ? (
                                                <Check className="w-5 h-5 text-emerald-400" />
                                            ) : userChoices[rec.name] === false ? (
                                                <X className="w-5 h-5 text-slate-500" />
                                            ) : (
                                                <div className="w-5 h-5 border-2 border-slate-500 rounded" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mb-4">
                            <button
                                onClick={() => setShowAllPrograms(!showAllPrograms)}
                                className="text-sm text-amber-400 hover:text-amber-300 underline"
                            >
                                {showAllPrograms ? 'Hide' : 'View'} all {allApps.length} programs →
                            </button>
                        </div>

                        {showAllPrograms && (
                            <div className="mb-6 p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                                <h4 className="text-white font-bold text-sm mb-3">All Detected Programs</h4>
                                <div className="max-h-64 overflow-y-auto space-y-1">
                                    {allApps.slice(0, 100).map((app: any, i: number) => (
                                        <div key={i} className="text-xs text-slate-400 flex items-center justify-between py-1 px-2 hover:bg-slate-800/50 rounded cursor-pointer"
                                            onClick={() => {
                                                const appName = app.displayName || app.name;
                                                handleChoice(appName, userChoices[appName] !== true);
                                            }}
                                        >
                                            <span>{app.displayName || app.name}</span>
                                            {userChoices[app.displayName || app.name] && (
                                                <Check className="w-3 h-3 text-emerald-400" />
                                            )}
                                        </div>
                                    ))}
                                    {allApps.length > 100 && (
                                        <div className="text-xs text-slate-500 py-1 px-2">
                                            ... and {allApps.length - 100} more programs
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    Click any program to toggle selection. You can always adjust your choices later in Settings.
                                </p>
                            </div>
                        )}

                        <button
                            data-testid="onboarding-recommendations-cta"
                            onClick={() => setStep('downloads')}
                            className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            Next: Download Recommended Tools <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {step === 'downloads' && (
                    <div className="animate-fade-in">
                        <div className="text-center mb-6">
                            <Download className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                            <h2 className="text-2xl font-bold text-white mb-2">Install Dependencies & Tools</h2>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto">
                                Everything Mossy depends on is listed here — runtime prerequisites first, then modding tools.
                                Items already found on your system show <span className="text-emerald-400 font-semibold">Installed</span>.
                                Most downloads here are <span className="text-amber-300 font-semibold">optional</span>; only items explicitly marked <span className="text-red-300 font-semibold">Required</span> are hard dependencies.
                                Each missing item shows exactly <span className="text-amber-300 font-semibold">what won't work</span> without it.
                            </p>
                        </div>

                        <div className="space-y-3 mb-6 max-h-[52vh] overflow-y-auto pr-1">
                            {RECOMMENDED_DOWNLOADS.map((dl) => {
                                const alreadyInstalled = allApps && allApps.length > 0 && allApps.some((app: { displayName?: string; name?: string }) => {
                                    const n = (app.displayName || app.name || '').toLowerCase();
                                    return dl.detectKeywords.some((kw) => n.includes(kw));
                                });
                                const manualPath = manuallyLocated[dl.name];
                                const confirmed = alreadyInstalled || !!manualPath;

                                const categoryColor: Record<RecommendedDownload['category'], string> = {
                                    'modding': 'text-emerald-400',
                                    'version-control': 'text-blue-400',
                                    'creative': 'text-purple-400',
                                    'runtime': 'text-amber-400',
                                };

                                const categoryLabel: Record<RecommendedDownload['category'], string> = {
                                    'modding': 'Modding Tool',
                                    'version-control': 'Version Control',
                                    'creative': 'Creative',
                                    'runtime': 'Runtime / Prerequisite',
                                };

                                return (
                                    <div
                                        key={dl.name}
                                        className={`p-4 rounded-lg border transition-all ${confirmed
                                            ? 'border-emerald-700/50 bg-emerald-900/10'
                                            : dl.required
                                                ? 'border-red-600/60 bg-red-900/10'
                                                : 'border-slate-700 bg-slate-800/40'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className="text-white font-bold text-sm">{dl.name}</span>
                                                    {alreadyInstalled && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/40">
                                                            <Check className="w-3 h-3" /> Installed
                                                        </span>
                                                    )}
                                                    {!alreadyInstalled && manualPath && (
                                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/40">
                                                            <Check className="w-3 h-3" /> Located
                                                        </span>
                                                    )}
                                                    {dl.required && !confirmed && (
                                                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/40 font-semibold">
                                                            Required
                                                        </span>
                                                    )}
                                                    {!dl.required && (
                                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full border border-amber-500/40 font-semibold">
                                                            Optional
                                                        </span>
                                                    )}
                                                    <span className={`text-xs font-medium ${categoryColor[dl.category]}`}>
                                                        {categoryLabel[dl.category]}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 leading-relaxed">{dl.description}</p>
                                                {/* Dynamic version-aware note for Spriggit */}
                                                {dl.name === 'Spriggit' && fo4Version && fo4Version !== 'unknown' && (
                                                    <div className={`mt-2 p-2 rounded-md border text-xs leading-relaxed ${fo4Version === 'ae'
                                                        ? 'bg-red-900/30 border-red-600/50 text-red-200'
                                                        : 'bg-blue-900/20 border-blue-600/40 text-blue-200'
                                                        }`}>
                                                        {fo4Version === 'ae' ? (
                                                            <>
                                                                <strong className="text-blue-100">💡 FO4 1.11.x (AE) Detected:</strong> Download <code className="bg-blue-900/40 px-1 rounded">SpriggitCLI.zip</code> from the latest release (v0.34.0+ required).
                                                                <br />
                                                                <strong className="text-red-100">DO NOT</strong> click the green "Code" button or "Download ZIP" — that downloads <em>source code</em> with no .exe file!
                                                                <br />
                                                                Instead: Go to <strong>Releases</strong> → expand <strong>"Assets"</strong> → download <code className="bg-blue-900/40 px-1 rounded">SpriggitCLI.zip</code>.
                                                            </>
                                                        ) : (
                                                            <>
                                                                <strong className="text-blue-100">💡 FO4 {fo4Version.toUpperCase()} Detected:</strong> Download <code className="bg-blue-900/40 px-1 rounded">SpriggitCLI.zip</code> from the latest release.
                                                                <br />
                                                                <strong className="text-blue-100">DO NOT</strong> click the green "Code" button! Instead: Go to releases → expand "Assets" → download <code className="bg-blue-900/40 px-1 rounded">SpriggitCLI.zip</code>.
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Static note fallback when FO4 version unknown */}
                                                {dl.note && (!fo4Version || fo4Version === 'unknown') && dl.name === 'Spriggit' && (
                                                    <div className="mt-2 p-2 rounded-md border bg-amber-900/20 border-amber-600/40 text-amber-200 text-xs leading-relaxed">
                                                        {dl.note}
                                                    </div>
                                                )}
                                                {manualPath && (
                                                    <p className="text-xs mt-1 text-emerald-600/80 truncate" title={manualPath}>
                                                        📂 {manualPath}
                                                    </p>
                                                )}
                                                {!confirmed && (
                                                    <p className={`text-xs mt-1.5 leading-snug flex items-start gap-1 ${dl.required ? 'text-red-300' : 'text-amber-400/80'}`}>
                                                        <span className="flex-shrink-0 mt-0.5">⚠️</span>
                                                        <span><strong>Without this:</strong> {dl.ifMissing}</span>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                                                {confirmed ? (
                                                    <>
                                                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 text-xs font-semibold">
                                                            <Check className="w-3.5 h-3.5" /> Done
                                                        </div>
                                                        {/* Still allow opening the download page even when confirmed */}
                                                        <button
                                                            type="button"
                                                            onClick={() => void openExternal(dl.url)}
                                                            className="flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 text-xs transition-colors"
                                                            title={`Open ${dl.urlLabel}`}
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            {dl.urlLabel}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => void openExternal(dl.url)}
                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white text-xs font-semibold transition-colors ${dl.required ? 'bg-red-700 hover:bg-red-600' : 'bg-amber-600 hover:bg-amber-500'}`}
                                                            title={`Open ${dl.urlLabel}`}
                                                        >
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            {dl.urlLabel}
                                                        </button>
                                                        {/* For items with a locatable executable, open a file picker */}
                                                        {dl.hasExecutable !== false && (
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    try {
                                                                        console.log(`[FirstRunOnboarding] Opening file picker for ${dl.name}...`);
                                                                        const picked = await window.electron.api.pickToolPath(dl.name);
                                                                        console.log(`[FirstRunOnboarding] File picker result:`, picked);
                                                                        if (picked) {
                                                                            setManuallyLocated((prev) => ({ ...prev, [dl.name]: picked }));
                                                                            console.log(`[FirstRunOnboarding] ${dl.name} located at:`, picked);
                                                                        } else {
                                                                            console.log(`[FirstRunOnboarding] File picker cancelled or no file selected`);
                                                                        }
                                                                    } catch (error) {
                                                                        console.error(`[FirstRunOnboarding] Error picking tool path for ${dl.name}:`, error);
                                                                        alert(`Error opening file picker: ${error instanceof Error ? error.message : String(error)}`);
                                                                    }
                                                                }}
                                                                className="flex items-center gap-1 px-2 py-1 rounded border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                                                                title="Already have it? Browse to locate the executable"
                                                            >
                                                                <FolderOpen className="w-3 h-3" />
                                                                I have it
                                                            </button>
                                                        )}
                                                        {/* For system-level installs with no locatable .exe (e.g. VC++ Redistributable),
                                                            show a simple "Add" toggle so users can manually confirm installation */}
                                                        {dl.hasExecutable === false && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setManuallyLocated((prev) => ({ ...prev, [dl.name]: '__confirmed__' }));
                                                                }}
                                                                className="flex items-center gap-1 px-2 py-1 rounded border border-slate-600 hover:border-slate-400 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                                                                title="Already have it installed? Click to mark as installed"
                                                            >
                                                                <Check className="w-3 h-3" />
                                                                Add
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="rounded-md border border-blue-700/30 bg-blue-900/10 p-3 text-xs text-blue-200 mb-5">
                            <strong>Note:</strong> Mossy never auto-downloads or bundles third-party tools.
                            Each button opens the official download page in your browser so you are always in control.
                            All tools listed here are free and open source (or freeware).
                        </div>

                        <button
                            onClick={finishOnboarding}
                            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" /> Finish Setup
                        </button>
                    </div>
                )}

                {step === 'spriggit-digest' && (
                    <div className="flex flex-col animate-fade-in">
                        {/* Scrollable content area */}
                        <div className="overflow-y-auto max-h-[calc(90vh-200px)] text-center pr-2">
                            <Brain className="w-16 h-16 mx-auto mb-6 text-emerald-400" />
                            <div className="flex items-center justify-center gap-3 mb-3">
                                <h2 className="text-3xl font-bold text-white">Feed Me the Base Game</h2>
                                <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg text-amber-300 text-xs font-bold uppercase tracking-wide">
                                    🚧 Work in Progress
                                </span>
                            </div>
                            <p className="text-slate-400 mb-2 max-w-xl mx-auto">
                                I can use <strong className="text-emerald-300">Spriggit</strong> to convert the <strong className="text-white">vanilla Fallout 4 ESMs</strong> (Fallout4.esm and all DLCs) into YAML and digest them directly into my brain — giving me exact access to the base-game records, FormIDs, and script structures from the start.
                            </p>
                            <p className="text-slate-500 text-sm mb-2 max-w-xl mx-auto">
                                Custom mods can be analysed any time in <strong className="text-slate-300">The Auditor</strong> panel.
                            </p>
                            <div className="max-w-xl mx-auto mb-6 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
                                <p className="text-blue-300 text-sm font-semibold flex items-center gap-2">
                                    <span>ℹ️</span>
                                    <span>This feature is <strong className="text-blue-200">experimental and optional</strong> — you can skip it now and do it later from the Memory Vault panel.</span>
                                </p>
                            </div>

                            {/* .NET SDK warning — shown when .NET is confirmed missing or status is unknown.
                            Kept visible for dotnetOk === null so new users always see the install button
                            even before the auto-check finishes or when it is inconclusive. */}
                            {dotnetOk !== true && !dotnetCheckingOnEntry && (
                                <div className="max-w-lg mx-auto mb-6 rounded-lg px-4 py-3 text-sm text-left bg-amber-900/30 border border-amber-600/50 text-amber-200">
                                    <strong>{dotnetOk === false ? '⚠️ .NET SDK not detected.' : '⚠️ .NET SDK status unknown.'}</strong>
                                    <br />
                                    Spriggit requires the <strong>.NET SDK</strong> (not just the Runtime) — it uses{' '}
                                    <code className="bg-amber-900/50 px-1 rounded">dotnet tool install</code> to download
                                    its Fallout4 translation package on first serialize run.{' '}
                                    <strong>Restart your PC after installing.</strong>
                                    <br />
                                    <div className="mt-2 p-2 rounded bg-amber-800/40 border border-amber-500/40 text-amber-100 text-xs">
                                        💡 <strong>Tip — short on C: drive space?</strong> Click <strong>&ldquo;Change&rdquo;</strong> during the .NET installer to install to a different drive,
                                        e.g. <code className="bg-amber-900/50 px-1 rounded">D:\Program Files\dotnet</code>.
                                        Mossy detects .NET on any drive automatically.
                                    </div>
                                    <div className="mt-2 p-2 rounded bg-blue-800/30 border border-blue-500/40 text-blue-100 text-xs">
                                        <strong>✨ Download Spriggit:</strong> Get the latest <code className="bg-blue-900/50 px-1 rounded">SpriggitCLI.zip</code> from the GitHub releases page. It's self-contained and bundles .NET (v0.34.0+ required for FO4 1.11.x).
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            className="underline text-amber-300 hover:text-amber-100 transition-colors font-semibold"
                                            onClick={() => {
                                                const api = getElectronApi();
                                                if (api?.openExternal) {
                                                    void api.openExternal('https://github.com/Mutagen-Modding/Spriggit/releases');
                                                } else {
                                                    window.open('https://github.com/Mutagen-Modding/Spriggit/releases', '_blank');
                                                }
                                            }}
                                        >
                                            Download self-contained Spriggit →
                                        </button>
                                        <button
                                            type="button"
                                            className="underline text-amber-400 hover:text-amber-200 transition-colors text-xs"
                                            onClick={() => {
                                                const api = getElectronApi();
                                                if (api?.openExternal) {
                                                    void api.openExternal('https://dotnet.microsoft.com/download/dotnet');
                                                } else {
                                                    window.open('https://dotnet.microsoft.com/download/dotnet', '_blank');
                                                }
                                            }}
                                        >
                                            Or install .NET SDK →
                                        </button>
                                        <button
                                            type="button"
                                            disabled={dotnetRecheckInProgress}
                                            className="px-3 py-1 rounded bg-amber-700/60 hover:bg-amber-600/60 disabled:opacity-50 text-amber-100 text-xs font-semibold transition-colors"
                                            onClick={() => void recheckDotnet()}
                                        >
                                            {dotnetRecheckInProgress ? '🔄 Checking…' : '🔄 Re-check .NET'}
                                        </button>
                                        {dotnetRecheckResult === 'not-found' && (
                                            <span className="text-xs text-amber-300 font-semibold">{DOTNET_STILL_NOT_DETECTED_MSG}</span>
                                        )}
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-amber-700/40 flex flex-wrap items-center gap-3">
                                        <span className="text-xs text-amber-400">Already have .NET installed but detection is wrong?</span>
                                        {dotnetOverride ? (
                                            <span className="px-3 py-1 rounded bg-emerald-800/60 border border-emerald-600/50 text-emerald-200 text-xs font-semibold">
                                                ✅ Override active — button unlocked
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="px-3 py-1 rounded bg-amber-600/70 hover:bg-amber-500/70 text-white text-xs font-semibold transition-colors"
                                                onClick={() => {
                                                    setDotnetOverride(true);
                                                    try { localStorage.setItem('mossy_dotnet_override', 'true'); } catch (e) { console.warn('[Spriggit] Could not persist dotnetOverride to localStorage:', e); }
                                                }}
                                            >
                                                I have .NET installed — proceed anyway
                                            </button>
                                        )}
                                    </div>
                                    <p className="mt-1 text-amber-400 text-xs">Installed .NET after opening this page? Click <em>Re-check .NET</em> to scan again and unlock the button automatically.</p>
                                </div>
                            )}
                            {dotnetCheckingOnEntry && (
                                <div className="max-w-lg mx-auto mb-4 text-xs text-slate-400 flex items-center gap-2">
                                    <span className="animate-spin inline-block">🔄</span> Checking for .NET SDK…
                                </div>
                            )}

                            {/* FO4 Version + Build Requirements badge */}
                            {detectedFo4Label && (
                                <div className="max-w-lg mx-auto mb-6 rounded-lg px-4 py-3 text-sm text-left bg-blue-900/20 border border-blue-600/40 text-blue-300">
                                    <strong className="text-blue-100">📋 Your Setup:</strong>
                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-blue-400">🎮</span>
                                            <span><strong>Game:</strong> {detectedFo4Label}</span>
                                        </div>
                                        {detectedFo4Version.startsWith('1.11.') ? (
                                            <div className="flex items-center gap-2 text-xs text-amber-300">
                                                <span>⚠️</span>
                                                <span><strong>Required:</strong> Spriggit v0.34.0+ for FO4 1.11.x (AE/Creations Menu) support</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs text-emerald-300">
                                                <span>✓</span>
                                                <span><strong>Spriggit:</strong> Any recent build works fine</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* AE-specific Spriggit download instructions - shown prominently for 1.11.x users */}
                            {detectedFo4Version.startsWith('1.11.') && !spriggitCliPath && (
                                <div className="max-w-lg mx-auto mb-6 rounded-lg px-4 py-4 text-sm text-left bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border-2 border-blue-500/60 shadow-lg">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="text-3xl">💡</span>
                                        <div className="flex-1">
                                            <h3 className="text-blue-100 font-bold text-base mb-2">
                                                Download Spriggit for Anniversary Edition
                                            </h3>
                                            <p className="text-blue-200 text-sm mb-3 leading-relaxed">
                                                Your Fallout 4 version ({detectedFo4Version}) requires <strong className="text-blue-50">Spriggit v0.34.0 or newer</strong> (latest stable: v0.40.0).
                                            </p>
                                            <div className="bg-blue-950/60 border border-blue-600/40 rounded-lg p-3 mb-3">
                                                <p className="text-blue-100 font-semibold text-xs mb-2">📥 Download Instructions:</p>
                                                <ol className="text-blue-200 text-xs space-y-2 list-decimal list-inside">
                                                    <li>Click the button below to open the Spriggit releases page</li>
                                                    <li>Download <code className="bg-blue-900/60 px-1.5 py-0.5 rounded text-emerald-300">SpriggitCLI.zip</code> from the latest release (NOT the green "Code" button!)</li>
                                                    <li>Extract the <strong className="text-blue-50">entire zip</strong> to a permanent folder (e.g., <code className="bg-blue-900/60 px-1.5 py-0.5 rounded">C:\Tools\Spriggit\</code>)</li>
                                                    <li>Come back here and click Browse below to select <code className="bg-blue-900/60 px-1.5 py-0.5 rounded text-emerald-300">Spriggit.CLI.exe</code></li>
                                                </ol>
                                            </div>
                                            <button
                                                type="button"
                                                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-md"
                                                onClick={() => void openExternal('https://github.com/Mutagen-Modding/Spriggit/releases')}
                                            >
                                                <ExternalLink className="w-4 h-4" /> Open Spriggit Releases Page (GitHub)
                                            </button>
                                            <p className="text-blue-300 text-xs mt-2 italic">
                                                💡 Tip: SpriggitCLI.zip is self-contained and bundles .NET, so you don't need to install .NET separately.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Readiness Checklist */}
                            {(spriggitCliPath || spriggitDataPath) && (
                                <div className="max-w-lg mx-auto mb-6 rounded-lg px-4 py-3 bg-slate-800/40 border border-slate-600/50">
                                    <div className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                        <span>📍 Readiness Checklist</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className={`flex items-center gap-2 text-xs ${spriggitCliPath ? 'text-emerald-300' : 'text-slate-400'}`}>
                                            {spriggitCliPath ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 border border-slate-500 rounded" />}
                                            <span>Spriggit.CLI.exe selected</span>
                                        </div>
                                        <div className={`flex items-center gap-2 text-xs ${spriggitDataPath ? 'text-emerald-300' : 'text-slate-400'}`}>
                                            {spriggitDataPath ? <Check className="w-4 h-4" /> : <div className="w-4 h-4 border border-slate-500 rounded" />}
                                            <span>Fallout 4 Data folder picked</span>
                                        </div>
                                        {spriggitCliPath && spriggitDataPath && (
                                            <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mt-2 pt-2 border-t border-slate-600">
                                                <span>✨</span>
                                                <span>Ready to digest! Scroll down to start.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="max-w-lg mx-auto space-y-4 mb-6 text-left">
                                {/* Spriggit CLI path */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Spriggit.CLI.exe
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={spriggitCliPath}
                                            placeholder="Not selected"
                                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const api = getElectronApi();
                                                if (!api?.spriggitPickCli) return;
                                                const p = await api.spriggitPickCli();
                                                if (p) {
                                                    setSpriggitCliPath(p);
                                                    // Try to auto-detect Data folder: assume Spriggit is extracted in a folder
                                                    // adjacent to or inside the Steam Fallout 4 directory.
                                                    // Try progressively higher parent directories looking for a "Data" sibling.
                                                    try {
                                                        const path = require('path');
                                                        let candidate = path.dirname(p); // folder containing Spriggit.CLI.exe
                                                        const fs = require('fs');
                                                        for (let i = 0; i < 4; i++) {
                                                            const parentDir = path.dirname(candidate);
                                                            const dataPath = path.join(parentDir, 'Data');
                                                            if (fs.existsSync(dataPath)) {
                                                                setSpriggitDataPath(dataPath);
                                                                break;
                                                            }
                                                            candidate = parentDir;
                                                        }
                                                    } catch {
                                                        // Auto-detection failed silently — user must pick manually
                                                    }
                                                }
                                            }}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-sm text-slate-200 flex items-center gap-1.5 transition-colors"
                                        >
                                            <FolderOpen className="w-4 h-4" /> Browse
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Download from{' '}
                                        <button type="button" onClick={() => void openExternal('https://github.com/Mutagen-Modding/Spriggit/releases')} className="text-emerald-400 hover:underline">
                                            github.com/Mutagen-Modding/Spriggit
                                        </button>
                                        {' '}— on the releases page, download{' '}
                                        <code className="bg-slate-700 px-1 rounded text-emerald-300">SpriggitCLI.zip</code>
                                        {' '}(not <code className="bg-slate-700 px-1 rounded text-slate-400">Spriggit.zip</code>).
                                        Extract the full zip, then browse to{' '}
                                        <code className="bg-slate-700 px-1 rounded text-emerald-300">Spriggit.CLI.exe</code>.{' '}
                                        <span className="text-slate-400">
                                            Windows hides the <code className="bg-slate-700 px-1 rounded">.exe</code> extension by default,
                                            so the folder will show two entries both named{' '}
                                            <code className="bg-slate-700 px-1 rounded">Spriggit.CLI</code> — pick the one with the{' '}
                                            <strong className="text-slate-300">application icon</strong> (looks like a small window), not the{' '}
                                            <code className="bg-slate-700 px-1 rounded">.pdb</code> or{' '}
                                            <code className="bg-slate-700 px-1 rounded">.Lib</code> files.
                                        </span>
                                    </p>
                                </div>

                                {/* Fallout 4 Data folder */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Fallout 4 Data Folder
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            readOnly
                                            value={spriggitDataPath}
                                            placeholder="Not selected (e.g. C:\Steam\steamapps\common\Fallout 4\Data)"
                                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const api = getElectronApi();
                                                if (!api?.pickDirectory) return;
                                                const p = await api.pickDirectory('Select Fallout 4 Data Folder');
                                                if (p) setSpriggitDataPath(p);
                                            }}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-sm text-slate-200 flex items-center gap-1.5 transition-colors"
                                        >
                                            <FolderOpen className="w-4 h-4" /> Browse
                                        </button>
                                    </div>
                                </div>

                                {/* Package Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Package Name <span className="text-slate-500 text-xs font-normal">(--PackageName)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={spriggitPackageName}
                                        onChange={e => setSpriggitPackageName(e.target.value)}
                                        placeholder="Spriggit.Yaml.Fallout4"
                                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Built-in:{' '}
                                        <code className="bg-slate-700 px-1 rounded text-emerald-300">Spriggit.Yaml.Fallout4</code>
                                        {' '}or{' '}
                                        <code className="bg-slate-700 px-1 rounded text-emerald-300">Spriggit.Json.Fallout4</code>.
                                        {' '}Custom packages must be published to NuGet.org first.
                                    </p>
                                </div>

                                {/* Local NuGet Source */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Local NuGet Source <span className="text-slate-500 text-xs font-normal">(--Source, Spriggit &lt; v0.40.0 only)</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={spriggitNugetSource}
                                            onChange={e => setSpriggitNugetSource(e.target.value)}
                                            placeholder='e.g. D:\Tools\Spriggit-dev\Translation Packages'
                                            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const api = getElectronApi();
                                                if (!api?.pickDirectory) return;
                                                const p = await api.pickDirectory('Select Local NuGet Source Folder');
                                                if (p) setSpriggitNugetSource(p);
                                            }}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg text-sm text-slate-200 flex items-center gap-1.5 transition-colors"
                                        >
                                            <FolderOpen className="w-4 h-4" /> Browse
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Point to the folder containing your local translation packages
                                        (e.g.{' '}
                                        <code className="bg-slate-700 px-1 rounded text-slate-400">D:\Tools\Spriggit-dev\Translation Packages</code>
                                        {' '}holding{' '}
                                        <code className="bg-slate-700 px-1 rounded text-emerald-300">Spriggit.Yaml.Fallout4</code>
                                        {' '}and{' '}
                                        <code className="bg-slate-700 px-1 rounded text-emerald-300">Spriggit.Json.Fallout4</code>
                                        ) to skip the nuget.org download entirely.{' '}
                                        <span className="text-amber-400">⚠ Only supported by Spriggit &lt; v0.40.0 — ignored on newer builds.</span>
                                    </p>
                                </div>
                            </div>

                            {/* Status message */}
                            {spriggitMessage && (
                                <div className={`max-w-lg mx-auto mb-5 rounded-lg px-4 py-3 text-sm text-left whitespace-pre-line break-words max-h-64 overflow-y-auto ${spriggitStatus === 'error'
                                    ? 'bg-red-900/30 border border-red-700/50 text-red-200'
                                    : spriggitStatus === 'noMods' || spriggitStatus === 'partial'
                                        ? 'bg-amber-900/30 border border-amber-600/50 text-amber-200'
                                        : spriggitStatus === 'done'
                                            ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-200'
                                            : 'bg-slate-800/60 border border-slate-600 text-slate-300'
                                    }`}>
                                    {spriggitStatus === 'running' && <Loader className="w-4 h-4 inline-block animate-spin mr-2" />}
                                    {spriggitStatus === 'noMods' && <span className="font-bold">ℹ️ Vanilla ESMs not found:{'\n'}</span>}
                                    {/* Version badge — shown for error or partial status when versions are known */}
                                    {(spriggitStatus === 'error' || spriggitStatus === 'partial') && (detectedFo4Label || detectedSpriggitVersion) && (
                                        <div className="mb-2 p-2 bg-slate-800/80 rounded border border-slate-600 text-xs font-mono text-slate-300 space-y-0.5">
                                            {detectedFo4Label && (
                                                <div>🎮 <strong>Game:</strong> {detectedFo4Label}</div>
                                            )}
                                            {detectedSpriggitVersion && (
                                                <div>🔧 <strong>Spriggit:</strong> v{detectedSpriggitVersion}
                                                    {spriggitVersionTooOld === true && (
                                                        <span className="ml-1 text-amber-400 font-bold">⚠️ too old for FO4 1.11.x — download v0.34.0+</span>
                                                    )}
                                                    {spriggitVersionTooOld === false && detectedFo4Version.startsWith('1.11.') && (
                                                        <span className="ml-1 text-emerald-400 font-semibold">✓ version is current</span>
                                                    )}
                                                </div>
                                            )}
                                            {detectedFo4Version.startsWith('1.11.') && !detectedSpriggitVersion && (
                                                <div className="text-amber-400">⚠️ FO4 1.11.x detected — Spriggit v0.34.0+ required</div>
                                            )}
                                        </div>
                                    )}
                                    {spriggitMessage}
                                    {(spriggitStatus === 'error' || spriggitStatus === 'partial') && spriggitMessage.includes('0xFFFFFFFF') && (
                                        <div className="mt-3 flex flex-wrap items-center gap-3">
                                            {/* Only offer the .NET download when .NET is confirmed absent.
                                            When dotnetOk is true the crash is more likely AV or arch mismatch. */}
                                            {dotnetOk !== true && (
                                                <button
                                                    type="button"
                                                    className="underline text-red-300 hover:text-red-100 transition-colors"
                                                    onClick={() => {
                                                        const api = getElectronApi();
                                                        if (api?.openExternal) {
                                                            void api.openExternal('https://dotnet.microsoft.com/download/dotnet');
                                                        } else {
                                                            window.open('https://dotnet.microsoft.com/download/dotnet', '_blank');
                                                        }
                                                    }}
                                                >
                                                    Download .NET SDK →
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                disabled={dotnetRecheckInProgress}
                                                className="px-3 py-1 rounded bg-red-800/60 hover:bg-red-700/60 disabled:opacity-50 text-red-100 text-xs font-semibold transition-colors"
                                                onClick={() => void recheckDotnet()}
                                            >
                                                {dotnetRecheckInProgress ? '🔄 Checking…' : '🔄 Re-check .NET'}
                                            </button>
                                            {/* "Open Spriggit folder" — lets the user verify that all DLLs
                                            from SpriggitCLI.zip are present beside the exe, which is the
                                            most common cause of 0xFFFFFFFF when .NET IS installed. */}
                                            {spriggitCliPath && (
                                                <button
                                                    type="button"
                                                    className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors"
                                                    onClick={async () => {
                                                        const api = getElectronApi();
                                                        if (api?.spriggitOpenFolder) {
                                                            await api.spriggitOpenFolder(spriggitCliPath);
                                                        }
                                                    }}
                                                >
                                                    📂 Open Spriggit folder
                                                </button>
                                            )}
                                            {/* "Open Windows Security" — shown when version is current and
                                            SAC is the #1 suspect.  Opens Settings → Windows Security
                                            directly so the user can navigate to Smart App Control
                                            without hunting through multiple menus. */}
                                            {spriggitVersionTooOld === false && (
                                                <button
                                                    type="button"
                                                    className="px-3 py-1 rounded bg-sky-800/60 hover:bg-sky-700/60 text-sky-100 text-xs font-semibold transition-colors"
                                                    onClick={() => {
                                                        const api = getElectronApi();
                                                        const windowsSecurityUrl = 'ms-settings:windowsdefender';
                                                        if (api?.openExternal) {
                                                            void api.openExternal(windowsSecurityUrl);
                                                        } else {
                                                            window.open(windowsSecurityUrl, '_blank');
                                                        }
                                                    }}
                                                >
                                                    🔒 Open Windows Security →
                                                </button>
                                            )}
                                            {/* "Add Defender Exclusion" — shown IMMEDIATELY when 0xFFFFFFFF
                                            detected on FO4 1.11.x, making it the PRIMARY fix recommendation.
                                            On Windows 11 with Smart App Control in "On" or "Evaluation" mode,
                                            adding a Defender exclusion for the Spriggit folder is the ONLY
                                            reliable permanent fix. Unblock-File is temporary and gets undone
                                            when the cache is cleared (which forces re-extraction of assemblies).
                                            This button appears BEFORE the Unblock Files button to guide users
                                            to the correct solution first. */}
                                            {spriggitVersionTooOld === false && detectedFo4Version.startsWith('1.11.') && defenderExclusionState !== 'ok' && (
                                                <button
                                                    type="button"
                                                    disabled={defenderExclusionState === 'running'}
                                                    className="px-3 py-1 rounded border-2 border-yellow-400 bg-yellow-700/70 hover:bg-yellow-600/80 disabled:opacity-50 text-yellow-100 text-xs font-bold transition-colors"
                                                    onClick={async () => {
                                                        const api = getElectronApi();
                                                        if (!api?.spriggitAddDefenderExclusion) return;
                                                        setDefenderExclusionState('running');
                                                        try {
                                                            const res = await api.spriggitAddDefenderExclusion();
                                                            if (res?.excludedPath) setDefenderExclusionPath(res.excludedPath);
                                                            if (res?.ok) {
                                                                setDefenderExclusionState('ok');
                                                            } else if (res?.error?.includes('Administrator rights')) {
                                                                setDefenderExclusionState('needs-elevation');
                                                            } else {
                                                                setDefenderExclusionState('error');
                                                            }
                                                        } catch {
                                                            setDefenderExclusionState('error');
                                                        }
                                                    }}
                                                >
                                                    {defenderExclusionState === 'running' ? '🔄 Adding exclusion…' : '⭐ Add Defender Exclusion (Recommended)'}
                                                </button>
                                            )}
                                            {defenderExclusionState === 'ok' && (
                                                <span className="text-xs text-emerald-300 font-semibold">
                                                    ✅ Defender exclusion added for {defenderExclusionPath ?? 'Spriggit folder'} — now click <strong>🗑️ Clear Cache &amp; Retry</strong>.
                                                </span>
                                            )}
                                            {(defenderExclusionState === 'needs-elevation' || defenderExclusionState === 'error') && defenderExclusionPath && (
                                                <div className="w-full mt-4 p-4 rounded-lg bg-gradient-to-br from-yellow-900/40 to-amber-900/40 border-2 border-yellow-500/70 shadow-lg">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <span className="text-2xl">🛡️</span>
                                                        <div className="flex-1">
                                                            <h3 className="text-yellow-100 font-bold text-base mb-1">
                                                                ⚠️ Administrator Rights Required
                                                            </h3>
                                                            <p className="text-yellow-200 text-sm mb-2">
                                                                Mossy tried to add a Windows Defender exclusion automatically, but it requires Administrator privileges.
                                                                <strong className="text-yellow-100"> Follow these steps to add the exclusion manually:</strong>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-slate-900/60 rounded-lg p-4 border border-yellow-600/30 mb-3">
                                                        <ol className="text-yellow-100 text-sm space-y-3 list-decimal list-inside">
                                                            <li className="pl-2">
                                                                <strong>Click the Windows Start button</strong> and type <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">PowerShell</code>
                                                            </li>
                                                            <li className="pl-2">
                                                                <strong>Right-click on "Windows PowerShell"</strong> in the search results
                                                            </li>
                                                            <li className="pl-2">
                                                                Select <strong className="text-yellow-200">"Run as administrator"</strong> (you may be prompted for permission)
                                                            </li>
                                                            <li className="pl-2">
                                                                When PowerShell opens, <strong>paste and run this command</strong> (click 📋 Copy below):
                                                            </li>
                                                        </ol>
                                                    </div>

                                                    <div className="bg-slate-950/80 rounded-lg p-3 border border-emerald-500/50 mb-3">
                                                        <div className="flex items-start gap-2 mb-1">
                                                            <code className="flex-1 bg-slate-900 text-emerald-300 px-3 py-2 rounded font-mono text-sm select-all break-all">
                                                                Add-MpPreference -ExclusionPath "{defenderExclusionPath}"
                                                            </code>
                                                            <button
                                                                type="button"
                                                                className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold transition-colors shadow-md"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(
                                                                        `Add-MpPreference -ExclusionPath "${defenderExclusionPath}"`
                                                                    ).catch(() => {
                                                                        // Clipboard API may be unavailable; the command is selectable
                                                                    });
                                                                }}
                                                            >
                                                                📋 Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-slate-400 text-xs ml-1">
                                                            💡 Tip: Right-click in PowerShell to paste. Press Enter to run.
                                                        </p>
                                                    </div>

                                                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-600/50">
                                                        <p className="text-yellow-100 text-sm mb-2">
                                                            <strong>5. After running the command:</strong>
                                                        </p>
                                                        <ul className="text-yellow-200 text-sm space-y-1 list-disc list-inside ml-4">
                                                            <li>If it succeeds, you'll see no output (that's normal!)</li>
                                                            <li>Close PowerShell</li>
                                                            <li className="font-bold text-yellow-100">
                                                                Click the <strong className="text-emerald-300">"🗑️ Clear Cache & Retry"</strong> button below
                                                            </li>
                                                            <li>Spriggit should now work without being blocked</li>
                                                        </ul>
                                                    </div>

                                                    <div className="mt-3 pt-3 border-t border-yellow-600/30 text-xs text-yellow-300/80">
                                                        <strong>What this does:</strong> Tells Windows Defender to trust all files in your Spriggit folder, preventing Smart App Control from blocking the .NET assemblies that Spriggit extracts at runtime.
                                                    </div>

                                                    {/* Verification button — shown after manual command instructions */}
                                                    <div className="mt-4 pt-4 border-t border-yellow-600/30">
                                                        <p className="text-yellow-100 text-sm font-semibold mb-2">
                                                            ✅ After running the PowerShell command, click here to verify it worked:
                                                        </p>
                                                        <button
                                                            type="button"
                                                            disabled={verificationState === 'checking'}
                                                            className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold transition-colors shadow-md"
                                                            onClick={async () => {
                                                                const api = getElectronApi();
                                                                if (!api?.spriggitVerifyDefenderExclusion) return;
                                                                setVerificationState('checking');
                                                                setVerificationMessage('');
                                                                try {
                                                                    const res = await api.spriggitVerifyDefenderExclusion();
                                                                    if (res.ok && res.excluded) {
                                                                        setVerificationState('verified');
                                                                        setVerificationMessage(`✅ Confirmed! ${res.targetPath ?? 'Your Spriggit folder'} is excluded from Defender.`);
                                                                    } else if (res.ok && !res.excluded) {
                                                                        setVerificationState('not-excluded');
                                                                        setVerificationMessage(`⚠️ Not found. ${res.targetPath ?? 'Your Spriggit folder'} is NOT in the Defender exclusion list. Make sure you ran the PowerShell command as Administrator.`);
                                                                    } else {
                                                                        setVerificationState('error');
                                                                        setVerificationMessage(`❌ ${res.error || 'Verification failed.'}`);
                                                                    }
                                                                } catch (e: unknown) {
                                                                    setVerificationState('error');
                                                                    setVerificationMessage(`❌ ${e instanceof Error ? e.message : String(e)}`);
                                                                }
                                                            }}
                                                        >
                                                            {verificationState === 'checking' ? '🔄 Checking…' : '🔍 Verify Defender Exclusion'}
                                                        </button>
                                                        {verificationMessage && (
                                                            <div className={`mt-2 p-3 rounded-lg text-sm font-medium ${verificationState === 'verified'
                                                                ? 'bg-emerald-800/60 border border-emerald-600/50 text-emerald-100'
                                                                : verificationState === 'not-excluded'
                                                                    ? 'bg-amber-800/60 border border-amber-600/50 text-amber-100'
                                                                    : 'bg-red-800/60 border border-red-600/50 text-red-100'
                                                                }`}>
                                                                {verificationMessage}
                                                            </div>
                                                        )}
                                                        {verificationState === 'verified' && (
                                                            <div className="mt-3 p-3 rounded-lg bg-emerald-900/40 border border-emerald-500/50 text-emerald-100 text-sm">
                                                                <strong>✨ Great! Now:</strong>
                                                                <ol className="mt-2 space-y-1 list-decimal list-inside ml-2">
                                                                    <li>Click <strong className="text-white">"🗑️ Clear Cache & Retry"</strong> below to wipe the old blocked assemblies</li>
                                                                    <li>Spriggit will re-extract fresh assemblies that won't be blocked</li>
                                                                    <li>The digest should complete successfully!</li>
                                                                </ol>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {/* "Re-download Spriggit" — shown whenever a 0xFFFFFFFF crash or
                                            silent-failure occurs.  When a genuine version mismatch is
                                            confirmed (spriggitVersionTooOld=true), this is the ONLY real
                                            fix so we style it prominently (yellow border + bold label).
                                            When version is current (spriggitVersionTooOld=false), Smart
                                            App Control is the #1 suspect — re-download is still offered
                                            as a fallback but uses the standard styling. */}
                                            {/* "Unblock Files" — shown when version is current (SAC is suspect).
                                            If SAC is locked/greyed-out (common on Win 11 "On"/"Evaluation"),
                                            Unblock-File removes the Zone.Identifier web-download flag from
                                            every file in the Spriggit folder, making them appear local so
                                            SAC no longer blocks them.  Follow up with Clear Cache & Retry. */}
                                            {spriggitVersionTooOld === false && (
                                                <button
                                                    type="button"
                                                    disabled={unblockInProgress}
                                                    className="px-3 py-1 rounded bg-violet-800/60 hover:bg-violet-700/60 disabled:opacity-50 text-violet-100 text-xs font-semibold transition-colors"
                                                    onClick={async () => {
                                                        const api = getElectronApi();
                                                        if (!api?.spriggitUnblockFiles) return;
                                                        setUnblockInProgress(true);
                                                        setUnblockResult(null);
                                                        try {
                                                            const res = await api.spriggitUnblockFiles();
                                                            setUnblockResult(res);
                                                        } catch (e: unknown) {
                                                            const msg = e instanceof Error ? e.message : String(e);
                                                            setUnblockResult({ ok: false, error: msg || 'Unblock-File failed unexpectedly.' });
                                                        } finally {
                                                            setUnblockInProgress(false);
                                                        }
                                                    }}
                                                >
                                                    {unblockInProgress ? '🔄 Unblocking…' : '🔓 Unblock Files'}
                                                </button>
                                            )}
                                            {unblockResult?.ok && (
                                                <span className="text-xs text-violet-300 font-semibold">
                                                    ✅ Unblocked {unblockResult.unblocked ?? 0} file(s) in …{(unblockResult.folderPath ?? '').split(/[\\/]/).slice(-2).join('/')}
                                                    {detectedFo4Version.startsWith('1.11.') ? (
                                                        <> — ⚠️ <strong>Unblock is temporary!</strong> Clearing cache will delete these files and extract NEW ones that will NOT be unblocked. <strong>Add a Windows Defender exclusion below instead</strong> for a permanent fix, then click Clear Cache.</>
                                                    ) : (
                                                        <> — now click <strong>🗑️ Clear Cache &amp; Retry</strong> to finish.</>
                                                    )}
                                                </span>
                                            )}
                                            {unblockResult && !unblockResult.ok && (
                                                <span className="text-xs text-red-300 font-semibold">⚠️ Unblock-File failed: {unblockResult.error}</span>
                                            )}
                                            {(() => {
                                                const isMismatch = spriggitVersionTooOld === true;
                                                const redownloadLabel = isMismatch
                                                    ? '⭐ Re-download Spriggit — v0.34.0+ required →'
                                                    : '⬇️ Re-download Spriggit (latest) →';
                                                const baseClasses = 'px-3 py-1 rounded text-xs transition-colors';
                                                const mismatchClasses = 'border-2 border-yellow-400 bg-yellow-700/60 hover:bg-yellow-600/70 text-yellow-100 font-bold';
                                                const normalClasses = 'bg-emerald-800/60 hover:bg-emerald-700/60 text-emerald-100 font-semibold';
                                                return (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={`${baseClasses} ${isMismatch ? mismatchClasses : normalClasses}`}
                                                            onClick={() => {
                                                                const api = getElectronApi();
                                                                if (api?.openExternal) {
                                                                    void api.openExternal('https://github.com/Mutagen-Modding/Spriggit/releases');
                                                                } else {
                                                                    window.open('https://github.com/Mutagen-Modding/Spriggit/releases', '_blank');
                                                                }
                                                            }}
                                                        >
                                                            {redownloadLabel}
                                                        </button>
                                                        {/* "Clear Cache & Retry" — useful when --version passes but
                                                        serialize crashes due to a stale .NET assembly cache.
                                                        IMPORTANT: skip auto-retry when a version mismatch is
                                                        confirmed (spriggitVersionTooOld=true) — retrying will
                                                        fail again; re-downloading Spriggit is the only real fix.
                                                        When version is current, auto-retry after cache clear is
                                                        helpful.  If the first retry still fails with 0xFFFFFFFF
                                                        we also auto-run Unblock-File on the freshly extracted
                                                        assemblies and retry once more, breaking the SAC loop
                                                        where: unblock → clear cache → retry → NEW assemblies
                                                        (never unblocked) → fail → repeat. */}
                                                        <button
                                                            type="button"
                                                            disabled={cacheClearInProgress || (spriggitStatus as string) === 'running' || autoUnblockRetryState === 'unblocking' || autoUnblockRetryState === 'retrying'}
                                                            className="px-3 py-1 rounded bg-amber-800/60 hover:bg-amber-700/60 disabled:opacity-50 text-amber-100 text-xs font-semibold transition-colors"
                                                            onClick={async () => {
                                                                const api = getElectronApi();
                                                                if (!api?.spriggitClearCache) return;
                                                                setCacheClearInProgress(true);
                                                                setCacheClearResult(null);
                                                                setAutoUnblockRetryState('idle');
                                                                let clearOk = false;
                                                                try {
                                                                    const res = await api.spriggitClearCache();
                                                                    clearOk = res.ok;
                                                                    setCacheClearResult(res.ok ? 'ok' : 'error');
                                                                } catch {
                                                                    setCacheClearResult('error');
                                                                } finally {
                                                                    setCacheClearInProgress(false);
                                                                }
                                                                // Skip the auto-retry sequence when main.ts confirmed a
                                                                // version mismatch — it will fail for the same reason.
                                                                if (!isMismatch && clearOk) {
                                                                    // First pass: Spriggit re-extracts fresh assemblies to
                                                                    // the now-empty cache.  This may fail with 0xFFFFFFFF
                                                                    // if SAC blocks the new files, but critically it
                                                                    // populates the cache with the fresh assembly set.
                                                                    const firstResult = await runSpriggitDigest();

                                                                    // If the first pass crashed with 0xFFFFFFFF, auto-run
                                                                    // Unblock-File on the Spriggit folder (which now
                                                                    // contains the freshly extracted assemblies that were
                                                                    // NOT covered by any previous manual unblock run).
                                                                    // Then retry once more — these newly unblocked files
                                                                    // will load successfully if SAC is in Evaluation mode.
                                                                    if (firstResult.failed0xFFFF && api.spriggitUnblockFiles) {
                                                                        setAutoUnblockRetryState('unblocking');
                                                                        try {
                                                                            const unblockRes = await api.spriggitUnblockFiles();
                                                                            if (unblockRes?.ok) {
                                                                                setUnblockResult(unblockRes);
                                                                                setAutoUnblockRetryState('retrying');
                                                                                const secondResult = await runSpriggitDigest();
                                                                                // Reset state so the button re-enables after this retry
                                                                                // completes.  Without this reset the button stays stuck on
                                                                                // "🔄 Retrying…" and is permanently disabled, trapping the
                                                                                // user until they restart the app.
                                                                                setAutoUnblockRetryState(secondResult.failed0xFFFF ? 'failed' : 'idle');
                                                                            } else {
                                                                                setAutoUnblockRetryState('failed');
                                                                            }
                                                                        } catch {
                                                                            setAutoUnblockRetryState('failed');
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            {(cacheClearInProgress || autoUnblockRetryState === 'unblocking' || autoUnblockRetryState === 'retrying')
                                                                ? (cacheClearInProgress ? '🔄 Clearing…' : autoUnblockRetryState === 'unblocking' ? '🔓 Unblocking…' : '🔄 Retrying…')
                                                                : '🗑️ Clear Cache & Retry'}
                                                        </button>
                                                        {/* Auto-unblock progress feedback */}
                                                        {autoUnblockRetryState === 'unblocking' && (
                                                            <span className="text-xs text-violet-300 font-semibold">🔓 Auto-unblocking freshly extracted assemblies…</span>
                                                        )}
                                                        {autoUnblockRetryState === 'retrying' && (
                                                            <span className="text-xs text-emerald-300 font-semibold">🔄 Retrying with unblocked assemblies…</span>
                                                        )}
                                                        {cacheClearResult === 'ok' && spriggitStatus !== 'error' && (spriggitStatus as string) !== 'running' && !isMismatch && autoUnblockRetryState === 'idle' && (
                                                            <span className="text-xs text-emerald-300 font-semibold">✅ Cache cleared — retrying…</span>
                                                        )}
                                                        {cacheClearResult === 'ok' && isMismatch && (
                                                            <span className="text-xs text-yellow-300 font-semibold">
                                                                🗑️ Cache cleared — but <strong>downloading Spriggit v0.34.0+ is still required</strong> to fix the version mismatch.{' '}
                                                                Click <strong>{redownloadLabel}</strong> above to get the latest version from GitHub releases.
                                                            </span>
                                                        )}
                                                        {cacheClearResult === 'ok' && spriggitStatus === 'error' && !isMismatch && autoUnblockRetryState !== 'unblocking' && autoUnblockRetryState !== 'retrying' && (
                                                            <span className="text-xs text-amber-300 font-semibold">
                                                                {autoUnblockRetryState === 'idle'
                                                                    ? <>
                                                                        ⚠️ Cache cleared but still failing.{' '}
                                                                        <strong>Clearing the cache caused Spriggit to extract a fresh set of
                                                                            .NET assemblies — those new files were never unblocked.</strong>{' '}
                                                                        Click <strong>🔓 Unblock Files</strong> above (to unblock the newly
                                                                        extracted assemblies), then click{' '}
                                                                        <strong>🗑️ Clear Cache &amp; Retry</strong> once more.{' '}
                                                                        {detectedFo4Version.startsWith('1.11.') && <>
                                                                            Alternatively, add a <strong>Windows Defender exclusion</strong> for your
                                                                            Spriggit folder (Windows Security → Virus &amp; threat protection →
                                                                            Exclusions) so SAC cannot block any future extractions.
                                                                        </>}
                                                                    </>
                                                                    : <>
                                                                        ⚠️ Auto-unblock ran but Spriggit is still crashing.{' '}
                                                                        {detectedFo4Version.startsWith('1.11.')
                                                                            ? <>Smart App Control may be set to <strong>&ldquo;On&rdquo;</strong> (not Evaluation) — in
                                                                                that mode, Unblock-File alone is not enough.  <strong>Use the "⭐ Add Defender Exclusion" button at the top</strong>
                                                                                so SAC skips reputation checks on the extracted .NET assemblies.{' '}
                                                                                After adding the exclusion, click <strong>🗑️ Clear Cache &amp; Retry</strong> one more time.</>
                                                                            : <>Check Smart App Control (Windows Security → App &amp; browser control)
                                                                                or use the <strong>Add Defender Exclusion button above</strong> for your Spriggit folder.</>
                                                                        }
                                                                    </>
                                                                }
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                            {cacheClearResult === 'error' && (
                                                <span className="text-xs text-amber-300 font-semibold">⚠️ Could not delete cache — try manually: %LOCALAPPDATA%\Temp\.net\SpriggitCLI\ or %TEMP%\.net\SpriggitCLI\</span>
                                            )}
                                            {dotnetRecheckResult === 'not-found' && (
                                                <span className="text-xs text-red-300 font-semibold">{DOTNET_STILL_NOT_DETECTED_MSG}</span>
                                            )}
                                            {dotnetRecheckResult === 'found' && (
                                                <span className="text-xs text-emerald-300 font-semibold">✅ .NET detected! This error is cleared — click <em>Convert &amp; Digest</em> to try again.</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Sticky buttons footer - always visible at bottom, with explicit z-index to ensure clickability */}
                        <div className="flex-shrink-0 flex flex-col gap-3 max-w-lg mx-auto border-t border-slate-700 pt-4 pb-2 bg-slate-900 relative z-10 mt-4">
                            {spriggitStatus !== 'done' && spriggitStatus !== 'partial' && (
                                <button
                                    type="button"
                                    disabled={spriggitStatus === 'running' || !spriggitCliPath || !spriggitDataPath || (dotnetOk !== true && !dotnetOverride) || dotnetCheckingOnEntry}
                                    onClick={() => void runSpriggitDigest()}
                                    className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    {spriggitStatus === 'running'
                                        ? <><Loader className="w-5 h-5 animate-spin" /> Converting &amp; digesting…</>
                                        : <><Brain className="w-5 h-5" /> Convert &amp; Digest into My Brain</>
                                    }
                                </button>
                            )}

                            {(spriggitStatus === 'done' || spriggitStatus === 'partial') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Signal App to navigate to the Auditor after onboarding dismisses
                                        try { localStorage.setItem('mossy_post_onboarding_nav', '#/ck-crash-prevention?tab=audit'); } catch { /* ignore */ }
                                        handleSpriggitContinue();
                                    }}
                                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Zap className="w-5 h-5" /> Open in Auditor &amp; Run Analysis
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={handleSpriggitContinue}
                                disabled={spriggitStatus === 'running'}
                                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 rounded-lg font-semibold transition-colors"
                            >
                                {(spriggitStatus === 'done' || spriggitStatus === 'partial') ? <><Check className="w-5 h-5 inline-block mr-1" /> Continue to Mossy</> : 'Skip for now'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'identity' && (
                    <div className="animate-fade-in max-w-2xl mx-auto">
                        <div className="text-center mb-6">
                            <Brain className="w-14 h-14 mx-auto mb-3 text-emerald-400" />
                            <h2 className="text-2xl font-bold text-white mb-2">Before we finish</h2>
                            <p className="text-slate-400 text-sm">
                                Tell me how you want to be addressed and where to store your persistent memory files.
                            </p>
                        </div>

                        <div className="space-y-5 bg-slate-800/60 border border-slate-700 rounded-xl p-5">
                            <div>
                                <label className="block text-sm text-slate-300 mb-2">How should I call you?</label>
                                <input
                                    type="text"
                                    value={preferredName}
                                    onChange={(e) => setPreferredName(e.target.value)}
                                    placeholder="e.g. Alex, Captain, Vault Dweller"
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-300 mb-2">Memory storage location</label>
                                <div className="space-y-2 text-sm text-slate-300">
                                    <label className="flex items-center gap-2">
                                        <input type="radio" checked={memoryStorageMode === 'userData'} onChange={() => setMemoryStorageMode('userData')} />
                                        Use default app storage (recommended)
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="radio" checked={memoryStorageMode === 'custom'} onChange={() => setMemoryStorageMode('custom')} />
                                        Use a custom folder path
                                    </label>
                                </div>
                                {memoryStorageMode === 'custom' && (
                                    <input
                                        type="text"
                                        value={memoryStoragePath}
                                        onChange={(e) => setMemoryStoragePath(e.target.value)}
                                        placeholder="Absolute folder path"
                                        className="mt-3 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-100 text-sm"
                                    />
                                )}
                            </div>

                            <div className="rounded-lg border border-emerald-600/30 bg-emerald-900/20 p-3 text-xs text-emerald-200">
                                Mossy stores chat history, Knowledge Vault items, and work-memory events locally so she can remember your conversations and cross-platform work.
                            </div>
                            {identityError && <div className="text-sm text-red-400">{identityError}</div>}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={() => void handleIdentityContinue()}
                                className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold"
                            >
                                Save & Continue
                            </button>
                        </div>
                    </div>
                )}

                {step === 'complete' && (
                    <div className="text-center animate-fade-in">
                        <Check className="w-20 h-20 mx-auto mb-6 text-emerald-400" />
                        <h2 className="text-3xl font-bold text-white mb-4">Setup Complete!</h2>
                        <p className="text-xl text-slate-300 mb-6">
                            I'm ready to help you create amazing mods.
                        </p>
                        <div className="bg-slate-900/50 border border-emerald-500/30 rounded-lg p-6 mb-6 text-left max-w-lg mx-auto">
                            <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5" /> Try Live Voice Now!
                            </h3>
                            <ul className="space-y-2 text-sm text-slate-300">
                                <li>• Click <strong>"Live Voice"</strong> in the sidebar to start an always-on voice conversation</li>
                                <li>• Just speak naturally—I'll detect when you're done (~1 second of silence)</li>
                                <li>• I remember everything we discuss, so no need to repeat yourself</li>
                                <li>• Optional: configure STT in settings (OpenAI) for faster recognition</li>
                                <li>• Live Voice is experimental; check Settings if you need to tune permissions or providers</li>
                                <li>• Use <strong>"Mute"</strong> when you need me to stop listening temporarily</li>
                            </ul>
                        </div>
                        <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 mb-6 text-left max-w-lg mx-auto">
                            <h3 className="text-amber-400 font-bold mb-2 text-sm">⏱️ Response Time — What to Expect</h3>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                After you finish speaking there is typically a <strong className="text-amber-300">30 to 60 second</strong> wait
                                before I start responding. This is normal — I'm processing your speech, thinking through
                                your request, and preparing a thorough answer. Please be patient and don't repeat
                                yourself during this window; I've heard you and I'm working on it!
                            </p>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Ready to experience the future of AI modding assistance?
                        </p>
                    </div>
                )}

                {/* Version Mismatch Warning Modal */}
                {showVersionMismatchModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-900 border-2 border-red-600 rounded-xl p-6 max-w-lg mx-4 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-900/50 border-2 border-red-500 flex items-center justify-center flex-shrink-0">
                                    <X className="w-7 h-7 text-red-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">⚠️ Version Mismatch Detected</h3>
                            </div>
                            <div className="space-y-3 mb-6 text-sm">
                                <p className="text-slate-200">
                                    <strong className="text-red-400">Your Fallout 4 version:</strong> {detectedFo4Label || detectedFo4Version || 'Unknown'}
                                </p>
                                <p className="text-slate-200">
                                    <strong className="text-red-400">Your Spriggit version:</strong> {detectedSpriggitVersion || 'Unknown'}
                                </p>
                                <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3 text-red-200">
                                    <p className="font-semibold mb-1">This combination will crash with exit code 0xFFFFFFFF.</p>
                                    <p className="text-xs">
                                        Fallout 4 version 1.11.x (Anniversary Edition / Creations Menu) requires Spriggit v0.34.0 or newer.
                                        Your current Spriggit build is too old and cannot parse the new record types added in the November 2025 update.
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowVersionMismatchModal(false);
                                        void openExternal('https://github.com/Mutagen-Modding/Spriggit/releases');
                                    }}
                                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                >
                                    <ExternalLink className="w-4 h-4" /> Download Latest Spriggit (v0.34.0+)
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setShowVersionMismatchModal(false);
                                        const api = getElectronApi();
                                        if (!api?.spriggitPickCli) return;
                                        const p = await api.spriggitPickCli();
                                        if (p) setSpriggitCliPath(p);
                                    }}
                                    className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <FolderOpen className="w-4 h-4" /> Select Different Spriggit.exe
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setShowVersionMismatchModal(false);
                                        setVersionMismatchAcknowledged(true);
                                        // Persist acknowledgment to localStorage and settings
                                        try {
                                            localStorage.setItem('mossy_spriggit_version_mismatch_ack', 'true');
                                        } catch { /* ignore */ }
                                        const api = getElectronApi();
                                        if (api?.setSettings) {
                                            try {
                                                await api.setSettings({ spriggitVersionMismatchAcknowledged: true });
                                            } catch { /* ignore */ }
                                        }
                                        // Reset status so user can retry
                                        setSpriggitStatus('idle');
                                        setSpriggitMessage('');
                                    }}
                                    className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-sm transition-colors"
                                >
                                    I Know What I'm Doing (Continue Anyway)
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
