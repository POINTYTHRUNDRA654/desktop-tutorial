/**
 * Fallout 4 Modding Knowledge Base
 * Comprehensive reference data for Mossy AI Assistant
 */

export const FO4KnowledgeBase = {
  // === PAPYRUS SCRIPT TEMPLATES ===
  papyrusTemplates: {
    quest: `Scriptname MyQuestScript extends Quest

; Properties
Actor Property PlayerRef Auto
ObjectReference Property TargetObject Auto
GlobalVariable Property QuestStage Auto

; Events
Event OnInit()
    RegisterForRemoteEvent(PlayerRef, "OnLocationChange")
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    if akNewLoc == MyTargetLocation
        SetStage(10)
    endif
EndEvent

Event OnStageSet(int auiStageID, int auiItemID)
    if auiStageID == 10
        Debug.Notification("Quest objective updated!")
    endif
EndEvent`,

    objectReference: `Scriptname MyObjectScript extends ObjectReference

; Properties
Activator Property MyActivator Auto
Sound Property ActivateSound Auto

; Events
Event OnInit()
    BlockActivation(false)
EndEvent

Event OnActivate(ObjectReference akActionRef)
    if akActionRef == Game.GetPlayer()
        ActivateSound.Play(Self)
        ; Do something
    endif
EndEvent`,

    actor: `Scriptname MyActorScript extends Actor

; Properties
Faction Property MyFaction Auto
Keyword Property MyKeyword Auto

; Events
Event OnInit()
    AddToFaction(MyFaction)
    AddKeyword(MyKeyword)
EndEvent

Event OnDeath(Actor akKiller)
    if akKiller == Game.GetPlayer()
        Debug.Notification("Target eliminated!")
    endif
EndEvent`,

    mcmMenu: `Scriptname MyModMCM extends Quest

; MCM Properties
GlobalVariable Property Setting_EnableFeature Auto
GlobalVariable Property Setting_DamageMultiplier Auto

; Events
Event OnInit()
    Parent.OnInit()
    RegisterForMenu("PauseMenu")
EndEvent

Function SetSettingFloat(string setting, float value)
    if setting == "DamageMultiplier"
        Setting_DamageMultiplier.SetValue(value)
    endif
EndFunction`
  },

  // === EXTERNAL TOOL SCRIPTS ===
  toolScripts: {
    blenderStandardsFix: `
import bpy

# Mossy's Fallout 4 Standards Alignment Script
# Source: Modern Fallout 4 Modding Standards (2025)

def align_to_standards():
    # 1. Set Scene Units to Metric / 1.0 Unit Scale
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0
    
    # 2. Set Framerate to 30 FPS (Fallout 4 Standard)
    bpy.context.scene.render.fps = 30
    
    # 3. Inform the user
    print("Mossy: Alignment Complete.")
    print("- Scale: 1.0")
    print("- FPS: 30")
    print("- Physics: Ready for Havok 2010.2.0-r1 export")

if __name__ == "__main__":
    align_to_standards()
`
  },

  // === COMMON PAPYRUS PATTERNS ===
  papyrusPatterns: {
    eventRegistration: {
      description: "Register for remote events to listen to other objects",
      code: `RegisterForRemoteEvent(PlayerRef, "OnItemAdded")

Event ObjectReference.OnItemAdded(ObjectReference akSender, Form akBaseItem, int aiItemCount, ObjectReference akItemReference, ObjectReference akSourceContainer)
    ; Handle event
EndEvent`
    },

    propertyManagement: {
      description: "Define and use script properties",
      code: `; Auto property (filled in CK)
Actor Property PlayerRef Auto

; Conditional property
Actor Property MyActor Auto Conditional

; Const property (cannot change)
int Property MaxLevel = 50 Auto Const

; Accessing properties
PlayerRef.AddItem(MyItem, 1)`
    },

    loops: {
      description: "Proper loop usage to avoid stack overflow",
      code: `int i = 0
while i < 10
    ; Do something
    i += 1
    Utility.Wait(0.1) ; IMPORTANT: Prevent stack overflow
endWhile`
    }
  },

  // === CREATION KIT RECORD TYPES ===
  recordTypes: {
    WEAP: {
      name: "Weapon",
      description: "Weapon definitions including damage, animations, and modifications",
      requiredFields: ["Name", "Model", "WeaponType", "Damage", "AttackAnimation"],
      commonProperties: {
        BaseDamage: "Base damage value",
        CriticalMultiplier: "Critical hit damage multiplier",
        Speed: "Attack speed",
        Reach: "Melee reach distance",
        MinRange: "Minimum effective range",
        MaxRange: "Maximum effective range"
      }
    },
    ARMO: {
      name: "Armor",
      description: "Armor and clothing pieces",
      requiredFields: ["Name", "Model", "ArmorRating", "BodySlot"],
      commonProperties: {
        ArmorRating: "Damage resistance value",
        Weight: "Item weight",
        Value: "Base value in caps",
        BodyTemplate: "Which body slots it occupies"
      }
    },
    QUST: {
      name: "Quest",
      description: "Quest definitions with stages and objectives",
      requiredFields: ["Name", "EditorID"],
      commonProperties: {
        Priority: "Quest priority in journal",
        AllowRepeatedStages: "Can stages be set multiple times",
        QuestStages: "List of quest stages",
        QuestObjectives: "List of objectives",
        QuestAliases: "References to actors/objects"
      }
    },
    "NPC_": {
      name: "Non-Player Character",
      description: "NPC definitions including stats, inventory, and AI",
      requiredFields: ["Name", "Race", "Class", "FaceGen"],
      commonProperties: {
        Level: "NPC level or level multiplier",
        Health: "Base health",
        Stamina: "Base stamina",
        DefaultOutfit: "Outfit worn by default",
        CombatStyle: "Combat behavior template",
        AIPackages: "AI behavior packages"
      }
    },
    LVLI: {
      name: "Leveled List",
      description: "Lists of items/NPCs that scale with level",
      requiredFields: ["EditorID", "Entries"],
      commonProperties: {
        ChanceNone: "Chance to return nothing",
        UseAll: "Give all items in list",
        CalculateFromAllLevels: "Consider items below player level",
        CalculateForEachItem: "Roll separately for each item"
      }
    }
  },

  // === FORMID RANGES ===
  formIDRanges: {
    "Fallout4.esm": { start: "0x00000000", end: "0x00FFFFFF", description: "Base game records" },
    "DLCRobot.esm": { start: "0x01000000", end: "0x01FFFFFF", description: "Automatron DLC" },
    "DLCworkshop01.esm": { start: "0x02000000", end: "0x02FFFFFF", description: "Wasteland Workshop DLC" },
    "DLCCoast.esm": { start: "0x03000000", end: "0x03FFFFFF", description: "Far Harbor DLC" },
    "DLCworkshop02.esm": { start: "0x04000000", end: "0x04FFFFFF", description: "Contraptions Workshop DLC" },
    "DLCworkshop03.esm": { start: "0x05000000", end: "0x05FFFFFF", description: "Vault-Tec Workshop DLC" },
    "DLCNukaWorld.esm": { start: "0x06000000", end: "0x06FFFFFF", description: "Nuka-World DLC" },
    "FirstModPlugin.esp": { start: "0x01000000", end: "0x01FFFFFF", description: "First mod in load order (dynamic)" }
  },

  // === PREVIS/PRECOMBINE KNOWLEDGE ===
  previsSystem: {
    description: "PreVis (Pre-Visible) and PreCombined meshes improve performance by pre-calculating visibility and combining static meshes",

    whatBreaksPrevis: [
      "Moving or deleting static references in exterior cells",
      "Adding new static objects to cells with existing PreVis",
      "Modifying landscape in precombined cells",
      "Editing NavMesh in precombined areas"
    ],

    howToFixPrevis: [
      "Use Creation Kit's 'Generate PreVis Data' command",
      "Run PreCombine process after editing cells",
      "Alternative: Disable PreVis for your cell (performance impact)",
      "Alternative: Use PRP (PreVis Repair Pack) for common areas"
    ],

    bestPractices: [
      "Always generate PreVis before releasing worldspace edits",
      "Test in-game to verify no yellow precombined meshes",
      "Document which cells had PreVis regenerated",
      "Use Buffout 4 NG (Nexus #64880) to detect PreVis issues — run CLASSIC (Nexus #56255) to auto-scan crash logs",
      "Use PRP 81.5+ (Nexus #46403) — required for AE/NG content cells"
    ]
  },

  // === NAVMESH REPAIR (2025) ===
  navmeshRepair: {
    overview: "Deleted navmesh records (NAVM with flag 0x00000020) cause immediate CTD when NPCs try to pathfind through the affected area. Never delete vanilla NAVM records — always replace using the Change FormID method in xEdit.",

    xEditWorkflow: [
      "1. Load plugin in xEdit 4.0.3+ with all masters",
      "2. Find [D] NAVM records (deleted flag) — or run Check for Errors",
      "3. Copy the FormID of the deleted NAVM record",
      "4. Find the replacement NAVM your mod added",
      "5. Right-click replacement → Change FormID → paste copied FormID → accept 'Update all references'",
      "6. Remove the original [D] NAVM record",
      "7. Run Check for Errors again and save"
    ],

    ckWorkflow: [
      "Never use Delete on a navmesh triangle — cover it first",
      "Create a new triangle over the problem area, THEN delete the old one",
      "Always Finalize Cell Navmesh before saving",
      "Use Navmesh → Find Navmesh Errors to check cell borders"
    ],

    communityResources: {
      nexusArticle: "nexusmods.com/fallout4/articles/4209",
      afkmodsGuide: "afkmods.com → Knowledge Base → Navmesh Repair",
      youtubeGuide: "youtube.com/watch?v=yRBsmki8JHA (Real Jenn — Fixing and Preventing Deleted Navmeshes)",
      nexusForums: "forums.nexusmods.com/topic/13522083"
    },

    symptoms: [
      "NPCs frozen near a door or entrance",
      "CTD when approaching a specific location or fast-travelling to a settlement",
      "NPCs refusing to enter or leave a building",
      "Crash on cell load in an area edited by a mod"
    ]
  },

  // === COMMON ERRORS AND SOLUTIONS ===
  commonErrors: {
    "Stack Overflow": {
      cause: "Infinite loop or too many recursive function calls in Papyrus",
      solution: "Add Utility.Wait() calls in loops, check for infinite recursion, reduce update frequency"
    },

    "Cannot call X() on a None object": {
      cause: "Script property not filled or object doesn't exist",
      solution: "Check CK properties are filled, add None checks: if MyProperty != None"
    },

    "Yellow Precombined Meshes": {
      cause: "Broken PreVis/Precombines due to cell edits",
      solution: "Regenerate PreVis or disable PreVis for the cell"
    },

    "CTD on Cell Load": {
      cause: "Corrupt mesh, missing texture, bad NavMesh, or deleted NAVM record",
      solution: "Run CLASSIC (Nexus #56255) on your Buffout 4 NG crash log first. Then: check Papyrus log, validate assets with nif_validate, check for missing masters, scan ESP for deleted NAVM records in xEdit"
    },

    "ESP won't load in CK": {
      cause: "Missing master, corrupted ESP, or version mismatch",
      solution: "Check masters are loaded, verify ESP with xEdit, ensure CK version matches"
    },

    "Script Won't Compile": {
      cause: "Syntax error, missing parent script, or incorrect property type",
      solution: "Check syntax with papyrus_validate_syntax, ensure parent exists, verify property types"
    }
  },

  // === NIF MESH SPECIFICATIONS ===
  nifSpecs: {
    version: "Fallout 4 uses BSTriShape (version 20.2.0.7)",

    blockTypes: {
      BSTriShape: "Main mesh geometry block (FO4 format)",
      BSLightingShaderProperty: "Material and texture assignments",
      BSShaderTextureSet: "Texture file paths",
      bhkCollisionObject: "Collision data container",
      bhkRigidBody: "Physics properties",
      bhkBoxShape: "Simple box collision",
      bhkConvexVerticesShape: "Convex hull collision",
      bhkMoppBvTreeShape: "Complex mesh collision"
    },

    textureSlots: {
      0: "Diffuse (_d.dds)",
      1: "Normal (_n.dds)",
      2: "Glow/Emissive (_g.dds)",
      3: "Parallax/Height (_p.dds)",
      4: "Environment Mask (_e.dds)",
      5: "Environment Map (cubemap)",
      6: "Subsurface Tint (_sk.dds)",
      7: "Specular (_s.dds)"
    },

    bestPractices: [
      "Keep triangle count under 5000 for weapons, 10000 for armor",
      "Always use BSTriShape, never old NiTriShape",
      "Texture paths must be relative to Data folder",
      "Include collision for all physics objects",
      "Use BC1/BC3 compressed DDS textures",
      "Generate proper normals and tangents"
    ]
  },

  // === CONSOLE COMMANDS ===
  consoleCommands: {
    testing: {
      "coc [CellID]": "Teleport to cell (e.g., coc SanctuaryHillsExt)",
      "player.additem [FormID] [Count]": "Add item to inventory",
      "setstage [QuestID] [Stage]": "Set quest stage",
      "player.setlevel [Level]": "Set player level",
      "tgm": "Toggle god mode",
      "tcl": "Toggle collision (noclip)",
      "tm": "Toggle UI menus"
    },

    debugging: {
      "coc qasmoke": "Teleport to test cell with all items",
      "showlooksmenu player 1": "Open character customization",
      "resetquest [QuestID]": "Reset quest to beginning",
      "sqv [QuestID]": "Show quest variables",
      "prid [RefID]": "Select reference by ID",
      "zzz": "Kill all nearby NPCs (for testing)"
    },

    modding: {
      "help [ItemName] 4": "Search for items by name",
      "player.placeatme [FormID]": "Spawn object at player",
      "disable": "Disable selected reference (becomes invisible)",
      "markfordelete": "Delete selected reference permanently",
      "getpos x/y/z": "Get position coordinates",
      "setpos x/y/z [Value]": "Set position"
    }
  },

  // === LOAD ORDER BEST PRACTICES ===
  loadOrderRules: {
    masterFiles: [
      "Fallout4.esm (always first)",
      "DLCRobot.esm",
      "DLCworkshop01.esm",
      "DLCCoast.esm",
      "DLCworkshop02.esm",
      "DLCworkshop03.esm",
      "DLCNukaWorld.esm"
    ],

    priorities: {
      high: ["Unofficial Fallout 4 Patch", "F4SE + Address Library (Nexus #47327)", "Addictol (Nexus #84214, ALL-IN-ONE stability — do NOT also install Buffout 4 or X-Cell)", "Framework mods (MCM NG, etc)"],
      medium: ["Gameplay overhauls", "Quest mods", "New lands", "PRP 81.5+ (Nexus #46403)"],
      low: ["Texture replacers", "Sound replacers", "Minor tweaks"],
      last: ["Personal patches", "Bashed patches", "Load order patches", "PRP compatibility patches"]
    },

    rules: [
      "Masters always load before plugins",
      "Patches load after mods they patch",
      "Use LOOT for automatic sorting",
      "Manually adjust patches that LOOT doesn't know",
      "Keep merged patches at the end"
    ]
  },

  // === XEDIT SCRIPTING PATTERNS ===
  xEditScriptTemplates: {
    renameWeapons: `unit UserScript;

function Process(e: IInterface): integer;
var
  newName: string;
begin
  Result := 0;
  if Signature(e) <> 'WEAP' then Exit;
  
  newName := GetElementEditValues(e, 'FULL') + ' [RENAMED]';
  SetElementEditValues(e, 'FULL', newName);
  AddMessage('Renamed: ' + newName);
end;

end.`,

    findConflicts: `unit ConflictFinder;

function Process(e: IInterface): integer;
var
  conflictStatus: TConflictThis;
begin
  Result := 0;
  conflictStatus := ConflictThisForNode(e);
  
  if conflictStatus >= caConflict then begin
    AddMessage('CONFLICT: ' + Name(e));
  end;
end;

end.`
  },

  // === ASSET OPTIMIZATION GUIDELINES ===
  assetOptimization: {
    textures: {
      diffuse: "BC1 or BC7, power-of-2 dimensions, mipmaps required",
      normal: "BC5 (2-channel), critical for lighting",
      specular: "BC1, grayscale values for shininess",
      maxSizes: {
        weapons: "2048x2048",
        armor: "2048x2048 or 4096x4096 for hero",
        environment: "1024x1024 unless hero asset",
        ui: "512x512 typically"
      }
    },

    meshes: {
      weapons: "Under 5,000 triangles",
      armor: "Under 10,000 triangles per piece",
      environment: "Varies, use LODs for distant objects",
      optimization: [
        "Remove duplicate vertices",
        "Merge similar materials",
        "Use LOD models for distance",
        "Bake lighting where possible"
      ]
    }
  },

  // === BLENDER TO FALLOUT 4 WORKFLOW ===
  blenderToFO4: {
    requiredTools: [
      "Blender 4.1+ (Latest recommended)",
      "Havok Content Tools 2014 (64-bit)",
      "PyNifly (Import/Export NIFs directly)",
      "FBX Importer for Fallout 4",
      "F4AK_HKXPackUI (Animation packing)",
      "Autodesk FBX Converter (Archive builds)"
    ],

    sceneSetup: {
      units: "Meters",
      scale: 1.0,
      orientation: "Z Up, Y Forward",
      fps: 30,
      armatureTransform: "Must be applied (Scale 1.0, Rotation 0,0,0)"
    },

    meshWorkflow: [
      "Create geometry in Blender",
      "UV Map (ensure no overlapping unless intentional)",
      "Assign Material Names (will match BGSM names in NifSkope)",
      "Vertex Colors: Use for sub-material masking or transparency",
      "Export as NIF via PyNifly or FBX then import to NifSkope"
    ],

    riggingSkinning: {
      skeletonNames: {
        human: "Root -> COM -> Pelvis -> Spine01/02/03 -> Neck -> Head",
        weapon: "Root -> Trigger -> Slide -> Magazine -> Bolt",
        creature: "Follow extracted reference skeleton (HKX -> FBX)"
      },
      rules: [
        "Do NOT rename deform bones from vanilla skeletons",
        "Weight painting: Max 4 bones per vertex (engine limit)",
        "Normalization: Ensure weights sum to 1.0",
        "Bone Roll: Keep consistent with vanilla (usually Y down the bone)",
        "Root Bone: Keep at 0,0,0 coordinate"
      ]
    },

    animationWorkflow: {
      steps: [
        "Import vanilla skeleton (HKX -> FBX -> Blender)",
        "Create Action in Action Editor/NLA",
        "Add Pose Markers for annotations (Hit, Footstep, EventX)",
        "Export FBX with 'Only Deform Bones' and 'Bake Animation'",
        "Convert FBX to HKX using Havok Content Tools (2010.2.0-r1 build profile)",
        "Pack HKX with HKXPackUI for final game use"
      ],
      annotations: [
        "Hit: Trigger damage/impact",
        "FootstepL/R: SFX/VFX for feet",
        "SoundPlay: Trigger specific sound by ID",
        "GraphEvent: Send event to behavior graph"
      ]
    },

    nifSkopeCleanup: [
      "Verify BSTriShape block type",
      "Link BGSM/BGEM material files",
      "Sanitize -> Reorder Blocks",
      "Sanitize -> Update Tangents/Space",
      "Check bhkCollisionObject for physics"
    ]
  },

  // === TOOL DEFINITIONS (PREVENT HALLUCINATION) ===
  professionalTools: {
    nvidiaCanvas: {
      type: "Desktop Application",
      purpose: "AI-powered landscape and texture painting. Uses GauGAN to turn brushstrokes into photorealistic DDS textures for modding.",
      status: "Professional Content Creation Software"
    },
    nvidiaOmniverse: {
      type: "Desktop Application / Platform",
      purpose: "Real-time 3D design collaboration and simulation platform. Used for advanced lighting, RTX Remixing, and USD-based asset pipelines.",
      status: "Professional 3D Engine & Platform"
    },
    upscayl: {
      type: "Desktop Application",
      purpose: "AI Image Upscaler. Essential for upscaling 0.5k/1k vanilla Fallout 4 textures to 2k/4k using neural networks.",
      status: "Professional Image Utility"
    },
    shaderMap: {
      type: "Desktop Application",
      purpose: "Texture map generator. Converts diffuse images into normal, displacement, specular, and AO maps.",
      status: "Professional Material Authoring Tool"
    }
  },

  // === COMMUNITY EDUCATORS & RESOURCES ===
  communityEducators: {
    sheldonSeddon: {
      name: "Sheldon Seddon",
      channel: "YouTube: Sheldon Seddon",
      url: "https://www.youtube.com/user/seddon4494",
      focus: "Creation Kit (CK) and GECK comprehensive knowledge repository",
      description: "Dedicated to accumulating as much Creation Kit and GECK knowledge as possible. Big and small topics covering CK fundamentals, scripting, quest design, NPC creation, worldbuilding, and advanced modding techniques.",
      trustLevel: "official",
      topics: [
        "Creation Kit fundamentals",
        "GECK (Garden of Eden Creation Kit)",
        "Papyrus scripting and quest design",
        "NPC and actor configuration",
        "Dialogue setup and scripting",
        "Quest stages and objectives",
        "Environment and worldbuilding",
        "Precombine and previs optimization",
        "Custom spells and items",
        "Faction and leveled list manipulation"
      ],
      usage: "When answering Creation Kit or modding workflow questions, reference Sheldon's channel as a comprehensive free resource. Direct users to his YouTube channel for in-depth tutorials.",
      credit: "All CK knowledge references should credit Sheldon Seddon and direct users to his YouTube channel for full video tutorials."
    },

    darkfox127: {
      name: "Darkfox127 (Richard)",
      channel: "YouTube: @Darkfox127 | Twitch: darkfox127",
      url: "https://www.youtube.com/@Darkfox127",
      playlists: "https://www.youtube.com/@Darkfox127/playlists",
      twitch: "https://www.twitch.tv/darkfox127",
      website: "https://darkfox127.com",
      focus: "Creation Kit tutorial videos and live modding education",
      description: "Richard (Darkfox127) creates comprehensive tutorial videos teaching Creation Kit modding. In addition to structured YouTube tutorials, he livestreams live mod creation on Twitch, providing real-time problem-solving and interactive learning opportunities.",
      trustLevel: "official",
      topics: [
        "Creation Kit fundamentals",
        "Creation Kit workflows and interface",
        "Modding tutorials for Fallout",
        "Step-by-step creation guides",
        "World editing and design",
        "NPC and actor configuration",
        "Quest and dialogue creation",
        "Best practices for mod creation",
        "Live modding sessions",
        "Real-time problem-solving"
      ],
      contentTypes: ["Video Tutorials", "YouTube Playlists", "Twitch Live Streams", "Website Resources"],
      usage: "When answering Creation Kit questions, reference Darkfox127's tutorial library and livestreams. Direct users to his YouTube channel for structured tutorials or Twitch for live learning experiences.",
      credit: "All CK knowledge and tutorials referenced from Darkfox127 (Richard) should include proper credit and direct users to his YouTube channel, Twitch streams, or website."
    }
  },
  // === 2025–2026 ESSENTIAL TOOLS & STABILITY STACK ===
  communityTools2025: {
    stabilityStack: [
      { name: "F4SE 0.7.7", nexus: "f4se.silverlock.org", note: "Script extender — 0.7.7 for runtime 1.11.191; match version to your game" },
      { name: "Address Library for F4SE Plugins", nexus: "#47327", note: "All In One (Anniversary Edition) build — required by all DLL mods" },
      { name: "Addictol (ALL-IN-ONE stability tool)", nexus: "#84214", note: "Supersedes and includes Buffout 4 (all variants), X-Cell, BakaMaxPapyrusOps, Faster Workshop, Interior NavCut Fix, Escape Freeze, Long Save Bug Fix, Disk Cache Enabler, Drop 7FFF Fix, and more. Do NOT install Buffout 4, X-Cell, or those mods alongside it." },
      { name: "High FPS Physics Fix", nexus: "#44798", note: "v0.8.13+ — critical for >60 FPS" },
      { name: "Unofficial Fallout 4 Patch (UFO4P)", nexus: "latest", note: "Always latest version; load after all DLC" },
      { name: "PRP 81.5", nexus: "#46403", note: "March 2026 stable — required for NG/1.11.x cells; load late in order" },
      { name: "MCM NG", nexus: "search 'MCM NG'", note: "Use the NG build — legacy MCM Framework does not work on NG/1.11.x" },
      { name: "CLASSIC Crash Scanner", nexus: "#56255", note: "Run after every CTD — scans Addictol crash logs at %LOCALAPPDATA%\\Fallout4\\F4SE\\; covers 250+ error scenarios" },
      { name: "Canary Save Scummer", nexus: "search Nexus", note: "Save file health checker — warns of corruption before it becomes a full loss" }
    ],

    addictolConfig: {
      description: "Addictol (Nexus #84214) is the ALL-IN-ONE stability tool for OG/NG/1.11.x. It supersedes and includes Buffout 4, X-Cell, BakaMaxPapyrusOps, and many others. Do NOT install Buffout 4 or X-Cell alongside it.",
      replaces: [
        "Buffout 4 (all variants: OG, NG, AE)",
        "X-Cell",
        "BakaMaxPapyrusOps",
        "Faster Workshop / NG / AE",
        "Interior NavCut Fix",
        "Escape Freeze OG / NG",
        "Long Save Bug Fix",
        "Disk Cache Enabler",
        "Drop 7FFF Fix",
        "Baka ScrapHeap",
        "Fallout Priority",
        "Private Profile Redirector",
      ],
      requiredBy: [
        "Address Library AiO (Nexus #47327)",
        "F4SE (matching version to game runtime)",
      ],
    },

    deprecatedMods: [
      { name: "AWKCR", reason: "No longer actively maintained (2024+). Use standalone keywords or ECO instead." },
      { name: "Buffout 4 (all variants: OG, NG, AE)", reason: "Superseded by Addictol (#84214). Do NOT install alongside Addictol." },
      { name: "X-Cell", reason: "Superseded by Addictol (#84214). Do NOT install alongside Addictol." },
      { name: "BakaMaxPapyrusOps", reason: "Included in Addictol. Do NOT install separately." },
      { name: "Baka ScrapHeap", reason: "Superseded by Addictol." },
      { name: "Fallout Priority", reason: "Superseded by Addictol." },
      { name: "Private Profile Redirector", reason: "Superseded by Addictol." },
      { name: "Legacy MCM Framework", reason: "Does not work on NG or 1.11.x. Use MCM NG." }
    ],

    gameVersions: {
      OG: "1.10.163 — F4SE 0.6.23",
      NG: "1.10.980–1.10.984 — F4SE 0.7.x (April 2024 update)",
      "community-AE": "NG + 76 bundled free CC items (same EXE as NG: 1.10.984)",
      "official-AE / 1.11.x": "1.11.137–1.11.191 — F4SE 0.7.7 (Bethesda's official 'Anniversary Edition', November–December 2025)"
    },

    communityGuides: [
      { name: "The Midnight Ride", url: "themidnightride.moddinglinked.com", note: "Authoritative NG/1.11.x modding setup guide — kept updated after every patch" },
      { name: "Nexar's Curated 2026 Modlist", url: "nexarplays.co.za/fallout4", note: "NG-optimised list; no downgrade required" }
    ]
  }
};

export default FO4KnowledgeBase;