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
      "Consider using Buffout 4 to detect PreVis issues"
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
      cause: "Corrupt mesh, missing texture, or bad NavMesh",
      solution: "Check Papyrus log, validate all assets with nif_validate, check for missing masters"
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
      high: ["Unofficial Fallout 4 Patch", "F4SE plugins", "Framework mods (MCM, etc)"],
      medium: ["Gameplay overhauls", "Quest mods", "New lands"],
      low: ["Texture replacers", "Sound replacers", "Minor tweaks"],
      last: ["Personal patches", "Bashed patches", "Load order patches"]
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
  }
};

export default FO4KnowledgeBase;
