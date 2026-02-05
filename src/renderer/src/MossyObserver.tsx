import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X } from 'lucide-react';
import { useLive } from './LiveContext';

const QUIPS: Record<string, string[]> = {
    '/': [
        "System nominal. I'm ready when you are.",
        "Analyzing background processes... efficiency is at 98%.",
        "It's quiet in the Nexus today."
    ],
    '/chat': [
        "I'm listening.",
        "Need a second opinion? I have several.",
        "Input received. Waiting for query."
    ],
    '/monitor': [
        "Watching the heartbeat of the machine.",
        "CPU spikes detected... just kidding, mostly.",
        "Your RAM usage is... ambitious."
    ],
    '/crucible': [
        "Load your crash logs from Buffout or Crash Logger using the file input.",
        "I analyze stack traces for common culprits - null pointers, bad references, corrupted meshes.",
        "Look for EXCEPTION_ACCESS_VIOLATION and check which registers are null (RAX/RCX = 0x0).",
        "TESObjectREFR crashes often mean deleted references or bad object calls.",
        "BSLightingShaderProperty issues? Check your NIF files for corrupted materials.",
        "The 'File:' lines in the stack tell you which plugin caused the crash.",
        "FormIDs starting with FF are temporary - they can't be saved and often cause issues.",
        "If multiple plugins appear in the stack, the lowest one is usually the culprit.",
        "Update Buffout 4 regularly - new crash detection gets added all the time."
    ],
    '/reverie': [
        "Ideas Bank is your brainstorm vault - capture quest concepts, settlement designs, NPC backstories before you forget them.",
        "The Inspiration tab pulls from real Fallout 4 lore and game mechanics - use it when you're stuck for ideas.",
        "Before you start debugging, check the Problem Solver - your issue might have a known solution.",
        "Workflow Tips are proven optimization strategies from professional modders - apply them to speed up your work.",
        "Use Flashcards to review modding concepts - spaced repetition helps long-term learning.",
        "Star your best ideas to keep them visible - the Favorites filter helps you focus on the most promising concepts.",
        "Tag your ideas consistently - 'settlement-defense' vs 'defense-settlement' matters for search.",
        "The Inspiration DB covers both lore (what the Commonwealth is about) and mechanics (how settlements actually work).",
        "Problem solutions are based on real Fallout 4 modding - they've solved these issues before.",
        "Flashcard difficulty ranges from beginner (basic concepts) to advanced (complex systems understanding).",
        "Combine ideas across categories - a great NPC concept might fit into multiple quest lines.",
        "Export your complete idea bank regularly as a safety backup of your creative process.",
        "The lore database helps you stay consistent with established Fallout 4 world-building.",
        "Review game mechanics tips when designing settlements - resource balance is the key to stability."
    ],
    '/splicer': [
        "The Splicer validates NIF and texture assets before importing them - catch problems early to avoid runtime crashes.",
        "Duplicate vertices waste memory and geometry. Use Blender's Merge by Distance (tolerance 0.001) to remove them.",
        "Degenerate triangles (zero-area faces) break physics and rendering. Check the Statistics panel in Blender to find them.",
        "Inverted normals cause incorrect lighting and backface culling. Always use 'Recalculate Outside' after mesh modifications.",
        "Missing normals mean flat or incorrect lighting in-game. Blender: Recalculate Outside > Shade Smooth to fix.",
        "Bad UVs (outside 0-1 range) cause texture wrapping issues. Use Pack Islands in Blender's UV Editor.",
        "Extreme scale (>100 units) causes floating-point errors. Verify your mesh scale matches base game objects (usually 1:1).",
        "Too many bone influences (>4 per vertex) exceeds Fallout 4 shader limits. Use Blender's Limit Bones function.",
        "Physics mismatch happens when the collision shape doesn't match visible geometry. Regenerate physics in Outfit Studio.",
        "Missing normal maps make surfaces look flat. Generate them in Substance Painter, xNormal, or Marmoset.",
        "Texture resolution must be power of 2 (1024, 2048, 4096). Inconsistent sizes waste memory and cause performance problems.",
        "Use DXT1 for opaque textures, DXT5 for transparency. Wrong compression formats impact both quality and file size.",
        "Alpha channels add memory cost - remove if not needed, add if transparency is needed. Be deliberate about inclusion.",
        "Missing material assignments mean geometry appears invisible or black in-game. Assign materials in Blender before export.",
        "Deprecated shaders (BS_Default) look outdated. Update to MLO_SkinShader, BS_LegacyShader, or current PBR shaders in xEdit."
    ],
    '/genome': [
        "The Genome stores three types of modding resources: Code Snippets, Custom Functions, and Mod Templates.",
        "Code Snippets are short, reusable pieces of Papyrus, xEdit, or Python code for common modding tasks.",
        "Custom Functions are pre-built functions with documented parameters and return values - use them to save coding time.",
        "Mod Templates provide starter project structures for quest mods, settlements, dungeons, characters, and locations.",
        "Copy any snippet or function directly to your clipboard using the copy button - ready to paste into your scripts.",
        "Filter by language (Papyrus, xEdit, Python) to find code for your specific tool.",
        "Search for keywords like 'settlement', 'quest', 'mesh' to quickly find relevant code.",
        "All snippets are tagged with categories - use tags to discover similar code patterns.",
        "Download templates to get started on new mod projects with boilerplate structure already in place.",
        "Save your custom snippets locally - they persist between sessions in your browser storage.",
        "The snippet library includes real Fallout 4 modding code: settlement resource calculations, quest stage setup, NIF imports.",
        "Functions show you parameters (what they take) and return values (what they give back) so you know how to use them.",
        "Mod templates include all files you need - just download and customize for your specific mod concept."
    ],
    '/hive': [
        "The Hive manages all your mod projects in one central workspace - track development, builds, and releases.",
        "Create a new project to start organizing your mod files, dependencies, and version history.",
        "Each project tracks its type (quest, settlement, dungeon, NPC, location, overhaul), version, and current status.",
        "Dependencies list what your mod needs to work - F4SE, other mods, patches - mark required vs optional.",
        "The Build Pipeline automates your compilation workflow - compile scripts, validate meshes, test, and package.",
        "Start a build to run all pipeline steps in sequence and see success/failure status for each step.",
        "Build history logs all your past builds so you can track what changed between versions.",
        "Deployment Manager helps you create release packages with version control and pre-release checklists.",
        "Use the version history to compare releases and manage which version is currently live.",
        "Pre-release checklist ensures scripts compile, meshes validate, and documentation is updated before release.",
        "Download your release package to share with the modding community.",
        "All projects save automatically to your local storage so you never lose your project data.",
        "The Hive is your mod production control center - from development through final release."
    ],
    '/lens': [
        "The Lens is your bridge to the desktop - see your system resources, recent files, and active projects in one place.",
        "System Status shows your computer name, OS version, available memory, and CPU model for quick reference.",
        "Recent Modding Files tracks ESP files, textures, meshes, scripts, and configs you've recently worked on.",
        "Copy file paths directly to clipboard using the copy button - ready to paste into terminal or file browser.",
        "The Files tab shows all recent modding assets organized by category (mod, texture, mesh, script, config, other).",
        "Projects tab displays your active mod projects with file count and last modification time.",
        "Color-coded categories help you quickly identify file types: purple (mods), blue (textures), cyan (meshes), yellow (scripts), green (configs).",
        "Quick Stats section shows total active projects, number of mod files, and disk usage at a glance.",
        "System Information tab provides detailed computer specs for troubleshooting hardware compatibility issues.",
        "Bridge Status indicates whether the desktop connection is active and system info is current.",
        "Use the Refresh button to update file lists and system information from your desktop.",
        "Hover over file entries to see additional details like file size and modification time.",
        "Check available memory before starting builds or large asset imports - Fallout 4 modding is RAM-intensive.",
        "Recent Projects list helps you quickly navigate between multiple mod projects without file browser navigation.",
        "Track your disk usage to ensure you have enough space for textures, meshes, and compiled plugins."
    ],
    '/conduit': [
        "The Conduit connects all your modding tools and plugins into one integrated system - the central hub for your workflow.",
        "Plugin tab shows your entire load order with dependencies, conflicts, and FormIDs clearly displayed.",
        "Load order matters - plugins depend on their dependencies loading first. Check the 'Requires' field to verify dependencies.",
        "Master files (ESM) always load first. ESP plugins load after, and ESL plugins can load in any free slot after master files.",
        "Conflicts occur when two plugins claim the same FormID - watch for the red conflict indicator in the plugin list.",
        "Copy any FormID to clipboard quickly for reference in xEdit, scripts, or notes.",
        "Sync Channels bridge your tools together - xEdit syncs with your load order, Outfit Studio syncs with assets, scripts compile to data.",
        "Bidirectional channels sync both ways (changes in either system sync back to the other). Read-only/write-only are one-direction only.",
        "Active sync channels are constantly watching for changes. Paused channels won't sync until you re-enable them.",
        "Tools tab shows which modding applications are installed and connected - green = installed, grey = not installed yet.",
        "xEdit, Outfit Studio, and Papyrus Compiler are critical integrations - they form the backbone of plugin and asset creation.",
        "Blender and Substance Painter are optional but recommended for professional-grade asset creation.",
        "Sync errors (red status) usually mean a tool crashed or disconnected. Check the tool and re-sync to recover.",
        "Fallout 4 FormIDs starting with FF are temporary - they can't be saved and indicate an error in your mod setup.",
        "Keep plugin load order stable during development to avoid breaking saves and dependencies."
    ],
    '/live': [
        "Voice circuits primed.",
        "I can hear you.",
        "Face-to-face, so to speak."
    ],
    '/prism': [
        "Ready to design your settlement layout.",
        "Use Building mode to place structures. Switch to Plot mode to create zones.",
        "Try the city templates - Fortress for defense, Agrarian for food, Trade Hub for commerce.",
        "Click and drag in Plot mode to define residential, industrial, or agriculture zones.",
        "Each building has resource costs - generators provide power, turrets need power for defense.",
        "Water pumps and crops need power too. Balance your resources carefully.",
        "Create multiple settlements and switch between them in the header dropdown.",
        "Export your layout as JSON to save it. Import to load previous designs.",
        "Plots define zones - buildings go inside them. Plan your city infrastructure first.",
        "Red buildings drain power, yellow ones generate it. Keep an eye on your net power.",
        "Food and water need to match your population count - aim for green numbers in the stats.",
        "Defense perimeter plots work great along settlement borders.",
        "Remember: houses don't produce resources, but they increase settler capacity.",
        "The grid is 20x15 - plenty of space for a full city plan."
    ],
    '/analyzer': [
        "The Cortex analyzes your entire modding setup and recommends solutions to prevent crashes, improve performance, and resolve conflicts.",
        "Decisions tab shows actionable recommendations sorted by severity - critical issues affect stability, warnings affect functionality, info is educational.",
        "Pay attention to load order recommendations - plugins depend on their dependencies loading first. Wrong order breaks quests and causes CTDs.",
        "FormID conflicts happen when two mods claim the same ID number. The Cortex highlights these and recommends load order changes or mod renaming.",
        "Master file dependencies are critical - if AdvancedArmor.esp requires DLCRobot.esm, DLCRobot must load before AdvancedArmor in your order.",
        "Script compilation warnings mean your F4SE or Papyrus setup has issues. Without proper compilation, quest systems fail silently at runtime.",
        "Texture resolution analysis helps prevent out-of-memory crashes - 4K textures on 2GB GPU will cause CTD. Downscale using the Splicer.",
        "Physics mismatches mean players can clip through meshes (doors, walls, ground). The Cortex recommends regenerating collisions in Outfit Studio.",
        "Conflicts tab details specific interactions between mods - even 'none' conflicts should be reviewed because the list could be incomplete.",
        "Mesh conflicts occur when two mods try to use the same NIF file path. Rename one to settlement_door_01 vs settlement_door_02 to resolve.",
        "Keyword conflicts affect recipes, enchantments, and leveled lists. Two mods assigning the same keyword to different items causes unintended interactions.",
        "Script conflicts happen when two mods run code in the same quest stage. Load order determines which script runs first (read documentation carefully).",
        "Compatibility reports show which mods are tested together to work without issues. Use these as a starting point for your safe load order.",
        "Always check master dependencies - a mod claiming Fallout4.esm + DLCRobot.esm means both must be present in your Data folder.",
        "Performance impact estimates help you decide if a recommendation is worth implementing - +15% FPS gain might justify a texture downscale."
    ],
    '/catalyst': [
        "Toggle between Local and Live mode to test prompts differently.",
        "Local mode gives you deterministic output - same input, same result every time.",
        "Live mode hits your configured LLM endpoint with real API calls.",
        "Configure your API endpoint, key, and model in Settings before using Live mode.",
        "Test cases run in sequence - watch the temperature parameter affect creativity.",
        "Variables use {{double_braces}} syntax for interpolation.",
        "The diff view shows you exactly what changed between test runs.",
        "A/B testing helps you find which prompt structure works best.",
        "Start in Local mode to iterate fast, then validate with Live mode.",
        "Temperature between 0.0-0.3 is deterministic, 0.7-1.0 is creative."
    ],
    '/theScribe': [
        "I validate Papyrus, xEdit scripts, and Blender Python in real-time.",
        "For Papyrus: check that Event/Function/If/While blocks are properly paired.",
        "ScriptName must match your filename, and extends must be a valid base type.",
        "F4SE events need 'import F4SE' at the top - I'll catch that for you.",
        "For xEdit: every script needs Initialize, Process, and Finalize functions.",
        "Pascal syntax requires 'begin' and 'end.' pairs - don't forget the dot on end.",
        "Blender scripts should import bpy and check context before operating.",
        "Avoid deprecated ops like bpy.ops.object.select_all() - use context.selected_objects instead.",
        "Use the Launch button to open your external tools after configuring paths in Settings.",
        "I'll show you the tool version when paths are configured correctly.",
        "Syntax errors appear instantly as you type - no need to save and test.",
        "Each tab (Papyrus/xEdit/Blender) has its own validation rules based on real syntax."
    ],
    '/vault': [
        "The Vault tracks both authoring paths and staging paths (Data/) so you never publish the wrong file.",
        "Mark assets as Local to keep them private; switch to Shared only when they are cleared for a release build.",
        "Stage items to build the BA2 manifest automatically — copy the list straight into Archive2.",
        "Meshes should enter as NIF with collision rebuilt; keep the source FBX listed so you can regenerate collisions later.",
        "Textures are stored as DDS targets with compression noted; if you see BC mismatch, fix before staging.",
        "Audio entries expect WAV sources and XWM targets; normalize to -16 LUFS before encoding to avoid clipping.",
        "Scripts must compile cleanly via PapyrusCompiler before staging.",
        "UI (SWF) imports expect Flash source files; verify exports are complete before packaging.",
        "Use texture presets to auto-assign target paths per type — saves time on large imports.",
        "4K texture guard prevents staging oversized assets — disable only if you have specific reason and VRAM.",
        "Tool paths with version detection help you verify you're running supported tool versions.",
        "Custom CLI args per tool let advanced users fine-tune texconv compression, xWMAEncode bitrate, etc.",
        "Expected BC format selector auto-infers from asset type: normals→BC5, albedo→BC1, alpha→BC3.",
        "Auto-convert toggle on PNG/TGA/JPG→DDS keeps source flexibility while ensuring DDS output when needed."
    ],
    '/neural-link': [
        "Neural Link established. I'm monitoring your active modding tools.",
        "Blender is open? Remember: 1.0 scale and 30 FPS.",
        "Creation Kit detected. Don't forget to save frequently—and watch for deleted references.",
        "xEdit link is active. I can help resolve record conflicts in real-time.",
        "I'm pulse-checking your system resources to ensure stability during asset heavy loads."
    ],
    '/lorekeeper': [
        "The Lorekeeper manages LOD generation and precombine optimization for large worldspace performance.",
        "LOD assets track source NIF, target directory, LOD pass (lod0-4), texture reduction %, and billboard settings.",
        "LODGEN generates lower-detail mesh versions of complex geometry for distance rendering — essential for open worldspaces.",
        "Set texture reduction per LOD: high % (75%) for lod3+, low % (25%) for lod0-1 where detail is visible.",
        "Billboard mode on lod2+ swaps complex geometry for flat textured planes at distance — massive performance boost.",
        "Merge chance (0-100%) tells LODGEN to combine smaller meshes into one for lod1+ — reduces drawcalls.",
        "After LODGEN runs, check the Metrics panel: mesh reduction %, memory saved (MB), triangle count reduction.",
        "Generated NIF files are listed in the Details panel — verify the output files match your expected target directory.",
        "Full CLI logs are captured and parsed for metrics — use Details view to debug failed runs.",
        "PJM (Precombined Object Manager) creates and optimizes precombined static meshes to reduce cell complexity.",
        "PRP (Previsibly Rendered Patches) renders shadow and lighting to textures for static geometry — frees GPU for gameplay.",
        "Precombine presets speed up common scenarios: Interior Dungeon (interior + statics + PRP), Dense Exterior (statics + dynamic + PRP + billboards), Settlement (allow dynamics).",
        "Apply a preset to auto-populate job settings — then customize cell ranges and other parameters as needed.",
        "Cell ranges let you target specific interior cell blocks — especially useful for repeating dungeon architecture.",
        "Include Statics vs Dynamic: statics combine; dynamics stay separate for runtime modification.",
        "After PJM runs, check Metrics: output NIFs, meshes processed, compression ratio, and BA2 filename.",
        "Output BA2 path is parsed from STDOUT — copy it directly into your Archive2 list after completion.",
        "View full PJM logs in Details to verify cell processing, compression progress, and output structure.",
        "Custom preset names let you save frequently-used configurations — add your own by entering a name and clicking Add.",
        "Monitor Last Run timestamps to track when each job completed — helps with debugging long-running optimizations.",
        "LOD generation typically takes minutes per asset depending on source complexity — be patient with large files."
    ],
    '/scribe': [
        "Scripts list PSC sources and PEX targets; make sure your Papyrus compile path is set before marking Ready.",
        "UI assets track PSD/AI sources and SWF targets — export to SWF before staging or you will ship a broken HUD.",
        "Use tags consistently: weapon, armor, quest, ui, voice. Search uses tags as well as filenames.",
        "Toggle \"Show only staged\" when you are prepping a release so only Archive-ready items remain visible.",
        "The Verify action removes one issue at a time; rerun until the card shows Ready for archive.",
        "Local items never leave your machine; keep anything with licensed or personal data in Local until scrubbed.",
        "Keep Data/ paths clean: Data/Meshes, Data/Textures, Data/Sound/Voice, Data/Scripts, Data/Interface.",
        "Ready items have zero issues; anything with issues stays out of the manifest to avoid broken BA2 packs.",
        "Use the size readout to spot oversized textures before they bloat your archive — downscale in the Splicer first."
    ],
    '/cortex': [
        "Asset staging hub - make decisions here.",
        "Pattern matching across your entire modding workflow.",
        "I can suggest optimizations based on your patterns."
    ],
    '/lensOptical': [
        "Visual analysis tools at your disposal.",
        "Inspect textures, meshes, and material properties.",
        "Compare before and after modifications."
    ],
    '/nexus': [
        "Your central connection point.",
        "All integrations route through here.",
        "API connections to external services."
    ],
    '/cartographer': [
        "The Cartographer is your dungeon layout designer - plan room layouts, encounters, and loot placement.",
        "Create dungeons from templates (Draugr Tomb, Dwemer Ruin, Raider Hideout, Vampire Lair) or start custom.",
        "Room types define purpose: Entrance, Main Chamber, Treasure Room, Boss, Trap, Spawner, Shrine, Hallway.",
        "Connect rooms together to show how they link - the canvas displays connections as lines between chambers.",
        "Set difficulty for each room: Easy, Medium, Hard, Legendary - impacts encounter design and rewards.",
        "Add enemies to rooms with quantity and level - design challenging progressions leading to the boss.",
        "Plan loot carefully - treasure rooms get best items, boss chambers get unique/legendary rewards.",
        "Traps add danger and flavor: Pressure Plate Darts, Spikes, Flame Throwers, Swinging Blades, Poison Gas.",
        "The grid system helps visualize dungeon size and layout - zoom in/out to see the full picture.",
        "Click rooms on the canvas to view and edit their contents - enemies, loot, traps, difficulty.",
        "Total enemies and loot count appear on each dungeon card - track your encounter complexity.",
        "Export your dungeon layout as JSON to save and share dungeon designs with other modders.",
        "Use templates as starting points - they include proper room sizing and connections ready to customize.",
        "Balance difficulty: easy entrance → medium main → hard treasure → legendary boss for good progression."
    ],
    '/registry': [
        "The Load Order Manager shows your plugin load order with indices, author, type (ESM/ESP/ESL) and dependencies.",
        "Dependency tracking prevents crashes - ESM masters must load before ESP plugins that reference them.",
        "Conflict highlighting shows which plugins clash - red indicators on conflicting entries.",
        "Plugin type matters: ESM files are masters, ESP files override them, ESL files light-master (FO4SE feature).",
        "The Form ID Database tracks every FormID and shows which plugin owns each record.",
        "FormIDs are displayed in Hex format - 00024E5E means plugin 00 with ID 24E5E within that plugin.",
        "Conflict detection marks FormIDs that have multiple plugins modifying the same record.",
        "Copy FormIDs to clipboard for quick reference when building xEdit filters or mod dependencies.",
        "The Dependency Graph visualizes how plugins relate to each other - spot circular dependencies immediately.",
        "Green dependency lines show what plugins require, red lines show what conflicts with what.",
        "Author information helps identify plugin sources - know who created each mod for reference.",
        "Track both required and optional dependencies - required mods must load first.",
        "Conflict warnings help prevent CTDs - resolve critical conflicts before testing.",
        "Test load order changes incrementally - disable one plugin at a time to isolate problems."
    ],
    '/blueprint': [
        "The Blueprint is your mod architecture planner - choose a template before you start coding.",
        "Five main mod types: Quest Mods, Settlement Expansions, NPC Companions, Weapon/Armor Packs, World Expansions.",
        "Each template shows the exact folder structure you need to create - use this as your project scaffold.",
        "Folder structure matters for xEdit and asset loading - plugins look in Data/Meshes, Data/Textures, etc.",
        "Components list shows required vs optional parts - REQUIRED items will crash mods if missing.",
        "Quest mods need Quest records (QUST), Aliases, Stages, and Scripts to control flow and logic.",
        "Settlement expansions must have Workbench (FURN) and Workshop Markers (WTST) - these are the core.",
        "NPC Companions require Dialogue topics (DIAL) and AI Packages (PACK) - without them, followers just stand there.",
        "Weapon/Armor packs need NIFs (meshes) and DDS textures - the plugin alone won't display anything.",
        "Dependencies show which master files your mod needs - Fallout4.esm is always required, DLCs are optional.",
        "Copy folder paths to quickly create your directory structure - consistency prevents asset loading failures.",
        "ArmorKeywords.esm (community mod) adds shared armor keywords - reference it to make armor work with other mods.",
        "Script sources go in Data/Scripts/Source, compiled bytecode in Data/Seq Files - Papyrus needs both.",
        "Navmesh (NAVM) is critical for world/settlement expansions - without it, NPCs can't pathfind and get stuck."
    ],
    '/synapse': [
        "The Synapse is an event reactor - mods and tools generate events, Synapse automates responses.",
        "Game events include: Plugin Load Complete, Quest Stage Change, Cell Enter, Save Created, Script Events.",
        "Plugin Load Complete fires when F4SE finishes loading all plugins on game start - check for specific mods.",
        "Quest Stage Change triggers when any quest reaches a specific stage - use for quest testing automation.",
        "Cell Enter triggers when player enters a specific location (by FormID or coordinate bounds).",
        "Script Event Fire is for custom Papyrus events sent via SendModEvent - allows mod-to-mod communication.",
        "Conflict Detected fires when The Registry finds overlapping FormIDs during load - prevents CTD surprises.",
        "Asset File Changed triggers when meshes, textures, or scripts are modified in Data folder - auto-revalidate.",
        "Build Pipeline Complete fires after mod compilation, validation, and packaging finishes.",
        "Reactions are the actions taken when events trigger: Run xEdit, validate meshes, log events, backup files.",
        "Log Event to File creates JSON records of quest stages, NPC encounters, or item changes - track gameplay.",
        "Validate All Meshes runs Nifskope checks on all .nif files to catch corrupted references early.",
        "Screenshot Save auto-captures scenes at quest completion or location entry - document playtest moments.",
        "Combine multiple reactions: detect conflict → alert user → suggest load order → block game launch."
    ],
    '/workshop': [
        "Assemble your modding pipeline here.",
        "Combine tools into custom workflows.",
        "Automation sequences for repetitive tasks."
    ],
    '/orchestrator': [
        "The Orchestrator is your single asset-processing pipeline to avoid duplicate work across mods.",
        "Pick an asset once and run the matching pipeline: meshes, textures, audio, or scripts — no parallel tool hopping.",
        "Mesh pipeline order matters: validate NIF → regenerate physics → generate LOD → stage to Data/ for BA2 packing.",
        "Texture pipeline enforces correct formats: BC1 for albedo, BC5 for normals, BC3 for alpha. No mixed compression.",
        "Resolution audit catches 8K/4K excess and downscales to 2K when you target performance builds.",
        "Audio pipeline normalizes LUFS, converts WAV to XWM, and stages to Data/Sound/Voice with BA2 readiness.",
        "Script pipeline lint+compile ensures PSC to PEX with proper import paths before staging to Data/Scripts.",
        "Storage panel shows total, processed, and pending MB so you know what still needs conversion.",
        "Asset cards show issues like missing bhkCollision or wrong DDS compression — fix before running the pipeline.",
        "Copy Path button gives the final destination for your asset; use it in xEdit or archive lists directly.",
        "Pipeline log documents every tool step (Splicer, texconv, Outfit Studio, PapyrusCompiler) for reproducibility.",
        "Deduplication note: overlapping steps run once; Orchestrator keeps a single source of truth for conversions.",
        "Use consistent target paths (Data/Meshes, Data/Textures, Data/Sound, Data/Scripts) to keep archives clean.",
        "After pipeline runs, stage assets for Archive2/BA2 packing — no manual drag-and-drop required.",
        "Re-run the pipeline after fixes to confirm issues are cleared; the log history will confirm successful stages."
    ],
    '/hyperterminal': [
        "HyperTerminal provides pre-built command templates for all major Fallout 4 modding tools - xEdit, Papyrus, meshes, textures, and utilities.",
        "xEdit commands handle plugin maintenance: cleaning masters, rebuilding leveled lists, exporting FormID references.",
        "The 'Clean Masters' command removes unused records and orphaned references - safe to run on any plugin, saves file size.",
        "Use 'Rebuild Levelists' after adding new weapons/armor to your mod - ensures items appear in auto-leveled lists.",
        "Papyrus Compiler commands compile your PSC source files to PEX bytecode - required before testing scripts in-game.",
        "Check Script Syntax without full compilation for fast feedback during iterative development.",
        "Batch NIF Validation runs your mesh files through Splicer checks automatically - catch issues before importing to game.",
        "Use Regenerate NIF Physics when your collision shapes don't match visual geometry - prevents player clipping through objects.",
        "Texture Resize commands downscale 4K textures to 2K for 75% VRAM reduction - prevents out-of-memory crashes on lower-end GPUs.",
        "DDS Compression conversion ensures proper format: DXT1 for opaque, DXT5 for transparency, BC5 for normal maps.",
        "All commands show risk level (Low/Medium/High) - high-risk commands should only run after backing up your mod folder.",
        "Copy any command directly to clipboard using the 'Copy Command' button - ready to paste into PowerShell or command prompt.",
        "Each command includes Purpose description explaining what it does and why you need it - read before executing.",
        "Backup commands create timestamped copies of your entire mod folder - enables rollback if something breaks.",
        "Load Order Reports generate text documentation of your plugins, dependencies, and potential conflicts for troubleshooting."
    ],
    '/holodeck': [
        "The Holodeck is your mod testing simulator - run pre-built test scenarios that verify your mod works as intended before release.",
        "Test scenarios cover five critical areas: Quest progression, Combat balance, Settlement objects, NPC behavior, and Load order integrity.",
        "Quest Stage Progression testing verifies dialogue triggers fire at the right quest stage, quest markers update, and scripts fire in sequence.",
        "Each test step has 'Risk Areas' that highlight what can go wrong - read these carefully to understand what to look for when testing.",
        "Combat balance testing checks weapon damage output, attack speed, animation smoothness, and how enemy AI responds to your weapon.",
        "Settlement testing verifies objects snap to grid, use pathfinding correctly, navmesh is complete, and settlers interact with furniture.",
        "NPC dialogue testing checks for lip-sync files (.lip), dialogue branch logic, condition functions, and proper FormID references.",
        "AI package testing verifies NPCs follow their schedules correctly, pathfind without getting stuck, and sleep/eat/work on schedule.",
        "Load order testing finds circular dependencies, orphaned FormIDs, missing masters, and conflicts that cause CTDs at startup.",
        "The 'Expected Result' field tells you exactly what should happen if the test step passes - use this as your success criteria.",
        "Copy any test command directly using the 'Copy Command' button and paste into your game console to run the exact test scenario.",
        "Run Test simulates the scenario and generates a report showing which steps passed and which failed, with specific issue logs.",
        "Test Results show pass/fail status, duration, and detailed issues found - use this to debug problems in your mod.",
        "Critical severity tests prevent CTDs and data loss - run these before any release. Major severity tests affect functionality.",
        "Re-run tests after fixing issues to confirm your changes worked - the Holodeck tracks all test runs for comparison."
    ],
    '/paperscript': [
        "PaperScript is a modern scripting language for Fallout 4 - a cleaner, more powerful alternative to Papyrus.",
        "Get started in 15 minutes with the Quick Start Guide - covers setup, syntax, and your first script.",
        "PaperScript compiles to Papyrus bytecode (PEX), so it's fully compatible with Fallout 4 and F4SE.",
        "Key features: cleaner syntax, better error messages, modern language features, powerful preprocessor system.",
        "Property groups organize your script properties - like classes within a script for better code organization.",
        "Namespaces prevent naming conflicts when multiple mods define the same function or class names.",
        "The 'is' operator (is SomeType) is powerful for type checking in conditions and script logic.",
        "Structs let you bundle related properties together - define structured data that behaves like a blueprint.",
        "The 'var' type handles any value type - useful for dynamic scripting when you don't know the exact type upfront.",
        "Flags are boolean properties that save space - use them for simple true/false state instead of multiple properties.",
        "Installation takes 5 minutes on Windows/Linux/macOS - check the FO4 Features guide for step-by-step instructions.",
        "Use the CLI tool for batch compilation - compile entire project folders or watch for changes automatically.",
        "Complete examples in the documentation show quest scripts, property group usage, struct implementations, and more.",
        "Performance optimization tips explain best practices - PaperScript compiles efficiently to bytecode.",
        "Read the syntax reference when you need to refresh on operators, functions, or language constructs.",
        "Explore the 4 complete example scripts - quest setups, companion systems, settlement expansions, event handlers.",
        "The preprocessor system handles conditional compilation - support multiple game versions from one codebase.",
        "Modern patterns like lambda functions and enhanced loops make scripting more expressive and readable.",
        "Ask me to 'walk you through PaperScript' and I can guide you step-by-step through any feature or concept."
    ],
    '/havok': [
        "Havok is the physics and animation engine deeply integrated into Fallout 4's Creation Engine.",
        "Every NPC animation uses Havok skeletons - understanding it is crucial for animation modding.",
        "HavokMax is the 3DS Max plugin that makes animation creation seamless.",
        "Havok provides physics shapes (capsules, spheres, boxes) for realistic character ragdoll.",
        "Behavior graphs are state machines that control when and how animations play.",
        "Animation events trigger game logic at specific frames - damage, sounds, effects, at exact timing.",
        "The standard FO4 skeleton has specialized bones for control, weapons, and finger detail.",
        "Physics-based character control allows realistic movement and interaction with environment.",
        "Animation blending creates smooth transitions between states without popping or jittering.",
        "Start with the Quick Start guide to install Havok and create your first animation in 30 minutes."
    ],
    '/havok-quick-start': [
        "You're in the Havok Quick Start - get installed and animating in under 1 hour.",
        "Step 1: Download Havok SDK from Autodesk (gamedev/academic license) - 10 minutes.",
        "Step 2: Clone and build HavokMax from PredatorCZ's GitHub repository - 10 minutes.",
        "Step 3: Copy HavokMax.dlu to 3DS Max plugins folder and restart - 5 minutes.",
        "Step 4: Import a base Fallout 4 skeleton NIF as reference - 3 minutes.",
        "Step 5: Verify HavokMax loaded in 3DS Max (check menu bar) - 2 minutes.",
        "Create your first animation: simple idle with weight shift - 30 minutes total.",
        "Use keyboard shortcuts: K = keyframe, Delete = remove keyframe, < > = frame navigation.",
        "Blend times (0.1-0.2 sec) create smooth transitions between animation states.",
        "Export to .hkx format for use in Fallout 4 - ready to embed in NIF files."
    ],
    '/havok-fo4': [
        "Advanced Fallout 4 animation integration - building professional character animations.",
        "The Creation Engine integrates Havok at three levels: physics, animation, and behavior.",
        "Fallout 4's character skeleton is highly specialized - pelvis is the primary control bone.",
        "Animation events like AttackImpact trigger damage calculation at exact frame timing.",
        "Behavior graphs define state machines - transitions between idle, combat, movement states.",
        "Ragdoll physics require balanced mass (realistic proportions) and properly tuned constraints.",
        "Common issues: animation pop (pose mismatch), floating/sinking (root bone), unstable ragdoll.",
        "Physics shapes (capsule, sphere, box) must match actual character dimensions and mass.",
        "Performance: monitor FPS, keep total mod under 50MB, compress animations appropriately.",
        "Test in Creation Kit and in-game to verify physics, transitions, and event timing."
    ]
};

const MossyObserver: React.FC = () => {
    const location = useLocation();
    const [message, setMessage] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [isAlert, setIsAlert] = useState(false);
    
    // Hook must be called unconditionally
    const liveContext = useLive();
    const { customAvatar } = liveContext;

    useEffect(() => {
        // Clear previous unless alert
        if (!isAlert) {
            setVisible(false);
            const timeout = setTimeout(() => setMessage(null), 500);
            return () => clearTimeout(timeout);
        }
    }, [location.pathname]);

    // Handle Route-based Quips
    useEffect(() => {
        const chance = Math.random();
        if (chance > 0.3 && !isAlert) {
            const path = location.pathname;
            const options = QUIPS[path] || ["Standing by.", "I am here.", "Awaiting input."];
            const text = options[Math.floor(Math.random() * options.length)];
            
            setTimeout(() => {
                setMessage(text);
                setVisible(true);
                setTimeout(() => { setVisible(false); setIsAlert(false); }, 5000);
            }, 1500); 
        }
    }, [location.pathname]);

    // Handle Blender Command Alerts (Cross-Component Communication)
    useEffect(() => {
        const handleBlenderCommand = (e: CustomEvent<{code: string, description: string}>) => {
            const { description } = e.detail;
            setIsAlert(true);
            setMessage(`Executing Blender Script: ${description}`);
            setVisible(true);
            
            // Stay visible a bit longer for alerts
            setTimeout(() => {
                setVisible(false);
                setIsAlert(false);
            }, 6000);
        };

        const handleShortcut = (e: CustomEvent<{keys: string, description: string}>) => {
            const { keys, description } = e.detail;
            setIsAlert(true);
            setMessage(`Blender Input: [ ${keys} ] - ${description}`);
            setVisible(true);
            
            setTimeout(() => {
                setVisible(false);
                setIsAlert(false);
            }, 3000);
        };

        window.addEventListener('mossy-blender-command', handleBlenderCommand as EventListener);
        window.addEventListener('mossy-blender-shortcut', handleShortcut as EventListener);
        
        return () => {
            window.removeEventListener('mossy-blender-command', handleBlenderCommand as EventListener);
            window.removeEventListener('mossy-blender-shortcut', handleShortcut as EventListener);
        };
    }, []);

    // Handle Proactive Observer notifications from Main
    useEffect(() => {
        if (window.electron && window.electron.api && window.electron.api.on) {
            const unsubscribe = window.electron.api.on('observer-notify', (payload: any) => {
                console.log('[Observer] Received notification:', payload);
                if (payload.event === 'file-detected') {
                    const { filename, type } = payload.data;
                    setIsAlert(true);
                    setMessage(`I see you exported ${filename}. I'm analyzing your ${type.toUpperCase()} asset now...`);
                    setVisible(true);
                    
                    // After a delay, show the "Auditor" analysis simulation
                    setTimeout(() => {
                        if (type === 'nif') {
                            setMessage(`Analysis complete: ${filename} vertex count is within limits. Ensure the collision layer is set to 'L_STATIC'!`);
                        } else if (type === 'dds') {
                            setMessage(`Texture check: ${filename} is 2048x2048 BC7. High quality, efficient choice!`);
                        } else {
                            setMessage(`Analysis complete for ${filename}. Standard Fallout 4 headers detected.`);
                        }
                    }, 4000);

                    // Fade out after 10s
                    setTimeout(() => {
                        setVisible(false);
                        setIsAlert(false);
                    }, 10000);
                }
            });
            return () => {
                if (typeof unsubscribe === 'function') unsubscribe();
            };
        }
        return undefined;
    }, []);

    if (!message && !visible) return null;

    return (
        <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 transform ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
            <div className="flex items-end gap-3">
                <div className={`backdrop-blur-md border p-4 rounded-2xl rounded-br-none shadow-[0_0_30px_rgba(16,185,129,0.15)] max-w-xs relative animate-slide-up ${
                    isAlert 
                    ? 'bg-emerald-900/90 border-emerald-500/50' 
                    : 'bg-slate-900/90 border-emerald-500/30'
                }`}>
                    <button 
                        onClick={() => setVisible(false)}
                        className="absolute top-2 right-2 text-slate-500 hover:text-white"
                    >
                        <X className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full animate-pulse ${isAlert ? 'bg-white' : 'bg-emerald-500'}`}></span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${isAlert ? 'text-white' : 'text-emerald-400'}`}>
                            {isAlert ? 'SYSTEM ACTION' : 'Mossy'}
                        </span>
                    </div>
                    <p className={`text-sm leading-relaxed font-medium ${isAlert ? 'text-white' : 'text-slate-200'}`}>
                        "{message}"
                    </p>
                </div>
                
                {/* Mini Avatar Bubble */}
                <div className={`w-12 h-12 rounded-full bg-black border-2 flex items-center justify-center overflow-hidden relative shadow-lg ${isAlert ? 'border-emerald-400 shadow-[0_0_15px_#10b981]' : 'border-slate-800'}`}>
                    {customAvatar ? (
                        <>
                            <div className="absolute inset-0 bg-emerald-500/20 animate-pulse"></div>
                            <img
                                src={customAvatar}
                                alt="Mossy"
                                className="w-full h-full object-cover opacity-90"
                                style={{ pointerEvents: 'none' }}
                                draggable={false}
                            />
                        </>
                    ) : (
                        <>
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-emerald-900/20"></div>
                            {/* Core */}
                            <div className="w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_15px_#10b981] animate-pulse"></div>
                            {/* Rings */}
                            <div className="absolute inset-1 border border-emerald-500/30 rounded-full animate-spin-slow"></div>
                            <div className="absolute inset-2 border border-emerald-500/20 rounded-full animate-reverse-spin"></div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MossyObserver;