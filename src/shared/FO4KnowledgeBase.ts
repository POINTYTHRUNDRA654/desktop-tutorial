/**
 * Fallout 4 Modding Knowledge Base
 * Comprehensive reference data for Mossy AI Assistant
 */

export const FO4KnowledgeBase = {
  // === CRITICAL COMMUNITY POLICIES — READ FIRST, SURFACE PROACTIVELY ===
  criticalCommunityPolicies: {
    simSettlements2NoAiContent: "IMPORTANT, must be surfaced proactively whenever a user discusses creating a Sim Settlements 2 (SS2) addon, city plan, building, unit/loadout, HQ content, or anything intended for submission to the SS2 team or community: the SS2 team does NOT allow addons or content created with AI tools, including Mossy, for submission. This is a real policy the user must respect — do not help someone plan to submit AI-assisted SS2 content as if that were a viable path, and always mention this restriction the moment SS2 addon creation comes up, even if the user hasn't asked about policy. General Fallout 4 modding knowledge (Papyrus, Creation Kit, xEdit workflows) can still be discussed for the user's own learning/private use — the restriction is specifically about submitting/distributing AI-assisted content as an official SS2 addon. Policies can change — tell the user to verify the current rule directly with the SS2 team/Discord before publishing anything.",
  },

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

    mcmMenu: "CORRECTED — the previous version of this template was fabricated and used a non-existent function (`RegisterForMenu`; the real, verified native function is `RegisterForMenuOpenCloseEvent(string asMenuName)`, confirmed in ScriptObject.psc) describing a mechanism MCM doesn't actually use. See mcmIntegration above for the real pattern: MCM's config.json defines the UI and which GlobalVariable each control reads/writes — there is no special 'MCM script' a mod needs to extend or register on the Papyrus side for the basic case. A mod's own scripts just read the same GlobalVariables the config.json references directly (e.g. `if Setting_DamageMultiplier.GetValue() > 1.0`), with no MCM-specific Event/Function boilerplate required.",
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
    print("- Physics: Ready for Havok 2014.1.0-r1 export")  # CORRECTED: 2010.2.0-r1 is the Skyrim Havok version; FO4 uses Havok Content Tools 2014 (see hkxAnimationPipeline above) — this contradicted that already-verified section

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

  // === PAPYRUS THREADING/TIMING GOTCHAS — found and verified against a real script ===
  papyrusThreadingGotchas: {
    utilityWaitInsideEventHandlersQueuesRatherThanDrops: {
      overview: "Utility.Wait() inside an event like OnTriggerEnter does not make a second call to that same event get dropped or ignored while the first is suspended — Papyrus locks the script INSTANCE for the duration of the Wait(), and a second thread trying to enter a locked instance queues up and blocks until the first call finishes, rather than being skipped. Found in a real proximity-trap script (companion/second-actor walks through the trigger volume while it's mid-Wait() in a cooldown sequence): the second OnTriggerEnter call didn't get ignored, it queued, and once the first call's Wait() chain finished, the ENTIRE effect sequence (animation, burst, damage, screen blur) fired against that second actor — even though they may have already walked away by then. With multiple actors clipping through during the busy window, this produces a growing backlog of delayed, seemingly-random hits with no obvious connection to what triggered them.",
      relatedRisk: "A second, related failure mode: a script sitting suspended inside Wait() can be cut short if the cell containing the reference unloads, or the game saves/loads mid-wait. If the code's 'reset to ready' logic is the very last line after the Wait() chain, a cut-short wait means that line never runs and a manually-tracked ready flag (e.g. a bool) gets stuck false forever — the object is then permanently disarmed with no error, no crash, nothing to point at the cause.",
      fix: "Don't hold the script locked in Wait() at all. Have the event handler do its immediate work and return right away, then hand the reset/cooldown off to RegisterForSingleUpdate() / RegisterForSingleUpdateGameTime() combined with a GoToState(\"Busy\") pattern where the busy state deliberately does NOT implement the triggering event — so re-entry during the busy window is a real no-op (found and ignored) instead of a queued replay. RegisterForSingleUpdate registrations are stored in the save and correctly reschedule after a save/load, which also structurally eliminates the stuck-forever risk above (a suspended Wait() stack does not have that guarantee). Add an OnReset() handler (in every state the object can be in) that force-clears state back to ready as a second, independent safety net — cheap insurance against the engine resetting the reference while it happens to be mid-cycle.",
      verifiedAgainst: "Papyrus Threading Notes on the real Creation Kit wiki (falloutck.uesp.net) confirm the queue-not-drop behavior for a locked script instance; the fix pattern was implemented and read back from a real corrected .psc file (MossySporeTrap.psc) rather than described in the abstract.",
      alsoAGeneratorBug: "This wasn't only a hand-written-script bug — the Mossy Fallout 4 Blender Add-on's own template generator (papyrus_helpers.py, _t_spore_trap_proximity) baked the identical buggy pattern into its source, so every future trap exported through the add-on would have shipped the same bug again regardless of this one file being fixed. Ported the exact verified fix into the generator itself (not re-derived from the bug description) and proved it with a real diff: a freshly generated script from the patched template is line-for-line identical to the hand-fixed .psc except for a few doc-comment wording differences appropriate to a generic reusable template vs. a fix write-up for one specific conversation. Worth remembering as a category, not just this one instance: a template/generator is a single point of failure for every future output — fixing one generated artifact without checking whether it came from a generator is only half the fix."
    },
    imageSpaceModifierApplyVsRemoveCrossFadeAreNotSymmetricScope: {
      overview: "ApplyCrossFade(float afFadeDuration) on ImageSpaceModifier is a real, plain member function (native, no 'global') — it applies THIS specific IMOD instance to the crossfade chain. RemoveCrossFade(float afFadeDuration) looks like its natural pair but is NOT symmetric: it's declared native global (called as ImageSpaceModifier.RemoveCrossFade(...), not myIMOD.RemoveCrossFade(...)), and it removes whichever IMOD is currently LAST on the crossfade chain — not necessarily the specific one a given script applied.",
      failureScenario: "Script A applies its own screen-blur IMOD via ApplyCrossFade() (e.g. a trap's disorient effect) and, several seconds later on its own timer, calls the global RemoveCrossFade() expecting to clear its own effect. If anything else in the game — combat, another trap, an unrelated script — crossfades in a DIFFERENT IMOD in between those two calls, Script A's RemoveCrossFade() removes that other, unrelated modifier instead (it's now 'last on the chain'), and Script A's own blur is left stuck applied with no error and no obvious link back to Script A.",
      whenThisMatters: "Low-frequency, hard-to-reproduce bug reports along the lines of 'the screen blur/vision effect got stuck and won't go away' with no consistent repro steps — the collision window is often small in practice, but real. Worth a code comment at the RemoveCrossFade call site flagging this as a known, accepted limitation rather than leaving a future editor to think it was an oversight. A real fix means tracking whether this script's own IMOD is still actually the active/last one on the chain before calling RemoveCrossFade — genuine extra engineering, proportional only if the collision is actually observed in practice, not worth pre-emptively building for a rare case.",
      alsoNote: "A related but separate cosmetic bug: clearing a blur/fade effect with the plain instance .Remove() instead of .RemoveCrossFade() cuts it out instantly even if it was faded IN smoothly via ApplyCrossFade() — visually asymmetric (smooth fade in, hard cut out). Use RemoveCrossFade() with a matching duration for a symmetric fade in both directions.",
      verifiedAgainst: "Real function signatures fetched directly from the Creation Kit wiki: ApplyCrossFade(float afFadeDuration = 1.0) native [instance-scoped]; RemoveCrossFade(float afFadeDuration = 1.0) native global [chain-scoped, not instance-scoped] — confirmed before writing this entry, not assumed from the similar-looking names."
    },
    playAnimationDoesNotBlockUntilTheAnimationPlays: {
      overview: "Self.PlayAnimation(eventName) (or akActor.PlayAnimation(...)) queues the animation-graph event and returns immediately — it does not wait for the animation to actually reach the relevant visual moment. Code placed directly after a PlayAnimation() call (spawning an explosion, dealing damage, playing a hit sound) fires at the instant the animation STARTS, not when it visually lands (e.g. a trap's jaws closing, a creature's bite connecting).",
      fix: "If the effect needs to be synced to a specific moment in the animation, register for the actual animation event instead of assuming a fixed delay: RegisterForAnimationEvent(Self, eventName) before calling PlayAnimation(), then do the real work inside Event OnAnimationEvent(ObjectReference akSource, String asEventName) (checking asEventName matches), and UnregisterForAnimationEvent() once handled so a looping/duplicate event in the behavior graph can't double-fire the effect.",
      criticalGotchaWhenCombiningWithTheThreadingFixAbove: "If this pattern is combined with a GoToState(\"Busy\")-based reset timer, do NOT make the reset timer depend on OnAnimationEvent firing. Keep the reset timer's RegisterForSingleUpdate() call unconditional and immediate (right after PlayAnimation(), not inside the animation-event handler) — a missing or renamed animation-event name in the behavior graph (a real, plausible authoring mistake, e.g. after re-exporting an .hkx from Blender with a different event name) should mean the effect silently fails to fire that one cycle, NOT that the object gets stuck in the busy state forever with no path back to ready. Also remember to UnregisterForAnimationEvent() in that same fallback/timeout path, not just in the success path — otherwise a permanently-mismatched event name leaks a stale registration into every future trigger cycle instead of just failing cleanly each time."
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
    "FirstModPlugin.esp": { start: "0x01000000", end: "0x01FFFFFF", description: "First mod in load order (dynamic)" },
    _note: "These ranges reflect the FIXED relative load-order position of the 6 official DLC masters (the game engine always loads them in this order relative to each other and to Fallout4.esm) — the prefix (01, 02, 03...) is actually determined by a file's INDEX in the current load order, not by which specific file it is. This table is accurate for a vanilla+official-DLC-only load order; any additional master (.esm/.esm-flagged .esp) loaded between these will shift every subsequent prefix. When in doubt for a specific mod list, check the actual load order in xEdit rather than assuming these fixed offsets."
  },

  // === ESL FLAGGING — exact rules, verified (a prior version of this app's
  // own notes had these numbers wrong/imprecise; corrected here) ===
  eslFlagging: {
    formIdLimitsByHeaderVersion: {
      "1.0+": "Max 4,095 new records, usable FormID range 0x001–0xFFF",
      "0.95": "Max 2,048 new records, usable FormID range 0x800–0xFFF (upper half of the range only)"
    },
    cellAndWorldspaceCaveat: "A plugin containing new CELL or WRLD records CAN be ESL-flagged — this does not crash and is not disallowed outright. The real cost: cells originating in a light plugin cannot use the PreVis/Precombine system, so ESL-flagging a plugin with new exterior cells trades away that performance optimization for those specific cells. For anything beyond a couple of small new cells, weigh that trade-off deliberately rather than ESL-flagging by default.",
    practicalCheck: "Use xEdit's FormID compacting/ESL-check tooling (or a dedicated checker mod) to get the real new-record count and highest FormID for your specific plugin before assuming it qualifies — don't estimate from record count alone, since some record types may be masters-only overrides that don't count as 'new'.",
    fallout4CccCreationClubMechanism: "Verified real, distinct activation mechanism specific to official Creation Club content: Fallout4.ccc (same folder as Fallout4.exe) is a SEPARATE activation list from the normal plugins.txt load order — official Bethesda/Creation-Club-released Light Master (.esl) files are flagged as masters and always load immediately after the official Bethesda masters, in the exact order the .ccc file specifies, and (important, real gotcha) these CC .esl files CANNOT be deactivated once listed there the normal way a regular plugin can. CC content is auto-added to Fallout4.ccc when purchased/installed; manually appending a line to this file is only needed for a custom (non-CC) ESL a user wants force-activated outside their mod manager's normal handling. This is worth knowing distinctly from the general ESL FormID-limit rules above — it's a different mechanism (activation/load-order) rather than another FormID-range fact."
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

    missingGroundSymptomRealCase: "Real, documented, specific symptom-to-cause pairing worth knowing for new-worldspace mods: 'missing/invisible ground' in a new custom worldspace (verified from a real, large DLC-port worldspace project that specifically had to regenerate previs to fix this exact problem) is frequently a PREVIS issue, not a terrain/landscape-mesh problem — since previs governs visibility/occlusion culling, a broken or missing previs pass for a cell can cause the engine to treat ground geometry as occluded/culled from certain viewpoints, reading to the player as literally missing floor. Before assuming a missing-ground report means broken terrain textures or a landscape-generation mistake, regenerate previs for the affected cells first and re-check — this is a real, previously-seen root cause for exactly this symptom in a large shipped worldspace project, not a hypothetical edge case.",
    anotherRealDLCScaleConfirmation: "Yet another independent, real confirmation of the recurring theme throughout this knowledge base: a separate, large, real DLC-sized quest mod (built around a huge multilevel vault/mall/village complex) is documented as needing dedicated community optimization packs providing fully-regenerated precombine/previs data specifically because the mod 'stretches the limits of the game engine' — with textures/meshes occasionally blanking out as the real, reported symptom without that regeneration. This is now the case across multiple, completely independent large FO4 total-conversion projects — precombine/previs regeneration isn't an occasional nice-to-have for DLC-scale content, it is a near-universal, structural requirement.",

    bestPractices: [
      "Always generate PreVis before releasing worldspace edits",
      "Test in-game to verify no yellow precombined meshes",
      "Document which cells had PreVis regenerated",
      "Use Addictol (Nexus #84214 — see communityTools2025 below; supersedes standalone Buffout 4 NG, do not install both) to detect PreVis-related crashes — run CLASSIC (Nexus #56255) to auto-scan the resulting crash logs",
      "Use PRP 81.5+ (Nexus #46403) — required for AE/NG content cells"
    ],

    dummyActivePluginWorkflow: "Standard practice (from the PJM Scripts GeneratePrevisibines workflow) is to run precombine/previs generation with a BLANK dummy plugin set as the active/last-loaded file in xEdit/CK rather than your real mod ESP — the generated PrecombineObjects/Previs data then writes into that dummy plugin instead of getting baked directly into your mod, so you can inspect it, merge it in deliberately, or ship it as a separate previs patch. Mossy's CK Tools Hub → Previsbines & PRP tab has a 'Create a blank dummy plugin…' button (Step 3) that saves a fresh copy of a minimal blank .esp (Fallout4.esm master, zero records) to a path you choose — it always writes a new copy, never the bundled template itself, so the template stays reusable.",

    prpIsAFixButAlsoANewConflictSurface: "IMPORTANT nuance verified from PRP's own real documentation: PRP fixes vanilla's broken precombine/previs by regenerating it GLOBALLY across the whole game's cells — real, measured performance impact is significant (a similar targeted tool for just downtown Boston alone recovers roughly 10-20 FPS on average, giving a concrete sense of scale for why this matters). But that global regeneration is exactly WHY 'PRP compatibility patches' exist as their own real, common category on Nexus (see loadOrderRules above) — PRP's regenerated precombined mesh for a cell assumes a SPECIFIC set of objects in that cell; ANY other mod that also edits objects in that same cell (adds/removes/moves anything) now conflicts with PRP's own regenerated data, the identical mechanism as any precombine conflict, just with PRP itself as one side of it. This means PRP isn't a 'fire and forget' fix a mod author can just recommend blindly — a worldspace-editing mod (settlement overhauls, new NPCs placed in existing cells, cleaning mods, etc.) needs to actively check whether it conflicts with PRP's specific cell coverage and, if so, either ship its own PRP-compatible patch or clearly document the incompatibility, exactly the same 'is my mod actually compatible with the current stability-stack default' discipline documented elsewhere in this knowledge base.",
    bUseCombinedObjectsGlobalEscapeHatch: "Verified real, specific, previously-undocumented INI setting directly relevant to everything above: bUseCombinedObjects (hidden by default, must be added under [General] in Fallout4.ini/Fallout4Custom.ini) — 1 (the real default even though hidden) keeps precombine active game-wide, 0 disables precombine CHECKING GLOBALLY across every cell in the game at once, not per-cell. Real, measured cost: 20-30 FPS lost in dense areas like downtown Boston, confirmed directly from player reports — this is a genuinely severe, blunt-instrument tradeoff, not a minor setting. WHY a mod would need this: dense vegetation/forest overhaul mods (a real, documented example: Commonwealth Conifers Redux) add new static tree/plant objects scattered across a huge number of vanilla cells throughout the ENTIRE game world — regenerating precombine individually for every single affected cell is impractical at that scale, so bUseCombinedObjects=0 is the practical (if costly) alternative to a full precombine regen pass. IMPORTANT distinction from Scrap Everything/settlement-scrapping mods above: those do NOT need this INI setting — they disable precombine through their OWN in-plugin mechanism scoped to specific settlement cells only, which is why a settlement-scrapping mod and a global vegetation overhaul solve structurally the same underlying problem (new/changed objects breaking precombine) via two different techniques suited to their different scope (few specific cells vs. the whole world)."
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
      nexusArticle: "nexusmods.com/fallout4/articles/4209 (verified real — 'Navmesh resource links and videos,' includes timestamped tutorial links covering triangle selection, view modes, precuts, water navmesh, and xEdit cleaning)",
      afkmodsGuide: "afkmods.com → Knowledge Base → Navmesh Repair",
      nexusForums: "forums.nexusmods.com/topic/13522083 (verified real — 'How do I fix deleted navmesh in xEdit?')",
      // A specific YouTube video/channel ("Real Jenn", video ID yRBsmki8JHA) was previously cited here
      // and could not be verified via search — removed rather than risk citing a fabricated resource.
      // Point users to the nexusArticle above, which itself links to real timestamped video tutorials.
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
      solution: "Run CLASSIC (Nexus #56255) on your Addictol/Buffout 4 crash log first (see communityTools2025 below for the current recommended stability stack). Then: check Papyrus log, validate assets with nif_validate, check for missing masters, scan ESP for deleted NAVM records in xEdit"
    },

    "ESP won't load in CK": {
      cause: "Missing master, corrupted ESP, or version mismatch",
      solution: "Check masters are loaded, verify ESP with xEdit, ensure CK version matches"
    },

    "Script Won't Compile": {
      cause: "Syntax error, missing parent script, or incorrect property type",
      solution: "Check syntax with papyrus_validate_syntax, ensure parent exists, verify property types"
    },

    "Access violation 0xc000005 during precombine generation": {
      cause: "Most commonly a corrupt or CK-incompatible mesh on a precombineable reference in the cell being processed",
      solution: "Bisect by temporarily disabling/removing references in the cell until precombine generation succeeds, then inspect the last-removed mesh in NifSkope for corruption or an unsupported block"
    },

    "CK freezes loading a specific cell with Creation Kit Platform Extended active": {
      cause: "A known CKPE interaction issue, not a vanilla CK bug — reported specifically with Vault 81 as of mid-2026",
      solution: "Try loading without CKPE first to confirm it's the interaction (not your own edits) before reporting/searching for a CKPE-specific fix"
    },

    "CK preview window renders squished/distorted": {
      cause: "A known display/viewport bug in current Creation Kit builds, unrelated to your plugin or assets",
      solution: "Resize or undock/redock the preview window; this is a CK display bug, not a sign your mesh or scene is broken"
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
      "killall": "Kill all nearby NPCs/creatures except companions and essential actors — CORRECTED: this entry previously said 'zzz', which is not a real FO4 console command",
      "kah": "Kill all HOSTILE actors nearby only, leaving non-hostiles untouched — a safer alternative to killall for testing combat without wiping out friendly/neutral NPCs in the same cell"
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
        "Use LOD models for distance"
        // NOTE: "Bake lighting" was removed from this list — FO4 has no lightmap/baked-lighting
        // system to leverage (see previsSystem/lodPipeline above, verified via CK wiki: precombine
        // only merges geometry, previs only handles visibility culling, all lighting stays dynamic).
        // Vertex-color-baked AO/cavity shading exists as an art technique on some meshes but is not
        // a general "optimization" step and shouldn't be conflated with lightmap baking.
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
        "Convert FBX to HKX using Havok Content Tools (2014.1.0-r1 build profile — CORRECTED: this previously said 2010.2.0-r1, which is the Skyrim build profile, contradicting requiredTools above in this same section which correctly lists Havok Content Tools 2014)",
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
    },
    sniff: {
      type: "Desktop Application (portable, no installer)",
      author: "zilav (MIT License) — same developer ecosystem as xEdit/FO4Edit; commonly distributed alongside xEdit builds.",
      purpose: "Batch NIF (mesh) patcher for Fallout 4/FO3/FNV/Oblivion. Applies one configured operation across many .nif files at once instead of hand-editing each in NifSkope.",
      keyOperations: [
        "Update Tangents and Binormals — recomputes missing/stale tangent-space data (fixes broken normal-map lighting after a mesh edit)",
        "Search and Replace Assets — batch-rewrites texture/asset paths referenced inside NIFs (e.g. retargeting 'textures\\old\\' to 'textures\\new\\' across an entire mesh folder after a texture reorganization)",
        "Convert to/from JSON — round-trips a NIF's block structure to JSON and back, useful for scripted/programmatic edits or diffing two NIFs' data",
        "Universal Tweaker — walks every block of a chosen type (e.g. NiMaterialProperty) and sets a specific property path (e.g. Alpha) to a value across all matching files",
        "Universal Fixer — applies a saved fix (sourced from a reference/log file) across a batch of NIFs",
        "Adjust Transformation — bulk position/rotation/scale adjustment by node name",
        "Rename Strings — batch find-and-replace of string data embedded in NIFs",
        "Add NiLODNode (Proc plugin) — moves NiTriStrips/NiTriShape geometry under a NiLODNode (adding one if missing), for TES4/FO3/FNV LOD setups",
      ],
      whenToUse: "Reach for Sniff instead of NifSkope when the same fix needs to be applied to dozens or hundreds of meshes at once (e.g. a texture path rename after reorganizing a mod's folder structure, or regenerating tangents after a batch mesh export) — NifSkope remains the right tool for one-off, interactive single-file edits.",
      status: "Community Utility — NIF Batch Processing Tool",
      credit: "Created by zilav, released under the MIT License. Credit zilav when referencing or recommending Sniff."
    },

    cathedralAssetsOptimizer: {
      type: "Desktop Application (Qt-based GUI, per-game profile system)",
      author: "G.E.C.K. Team",
      purpose: "Batch BSA/BA2 packing plus texture, mesh, and animation optimization, driven by per-game profiles (FO4/SSE/TES5) that bundle the underlying Archive2/BSArch, texture-compression, and mesh-optimization steps into one pass.",
      keyOperations: [
        "BSA/BA2 creation — packs a mod's loose files into an archive, with real handling for cases raw Archive2 chokes on",
        "Texture compression/resizing — batch-converts and downsizes textures against a configured target format/resolution",
        "Mesh optimization/resave — batch NIF resave and optional headpart handling",
        "Animation optimization",
      ],
      knownRealAdvantageOverRawArchive2: "Verified directly in this session: raw Archive2 aborts an entire pack job with 'Skipped duplicate file' errors when a mod has multiple same-named files (e.g. two different subfolders each containing a file named the same .bgsm) — a common, easy-to-hit situation in any mod with more than a handful of asset folders. CAO's packing pipeline is the community-standard workaround and is what most mod authors reach for once a mod outgrows a trivial folder structure.",
      whenToUse: "Use CAO instead of Mossy's built-in BA2 packer (which currently shells out to raw Archive2) whenever a full-mod pack fails with duplicate-filename errors, or as the default packer for any mod past a small/simple scale. Mossy's Packaging & Release → BA2 Archive Manager can still be used for quick single-folder packs or for extract/list operations.",
      status: "Community Utility — Batch Asset Optimization & Packing Tool",
      credit: "Developed and maintained by the G.E.C.K. Team. Credit the G.E.C.K. Team when referencing or recommending Cathedral Assets Optimizer."
    },

    // === MOD MANAGERS ===
    modOrganizer2: {
      type: "Desktop Application",
      purpose: "The standard FO4 mod manager. Installs each mod into its own isolated folder and merges them at runtime through a virtual file system (VFS) — the real Data folder stays untouched.",
      howToUse: [
        "Left pane lists installed mods top-to-bottom — order here is the install/override priority (lower entries win file conflicts), separate from plugin load order in the right pane",
        "Drag-and-drop an archive onto MO2, or use 'Install Mod' — FOMOD-packaged mods launch their installer wizard automatically",
        "Always launch Fallout 4/F4SE/xEdit/other tools THROUGH MO2's 'Run' dropdown (or its executables list), not directly — launching outside MO2 bypasses the VFS and the tool sees an empty/vanilla Data folder",
        "The 'Conflicts' tab on a mod's properties shows exactly which other mods it overwrites or is overwritten by, at the file level",
        "Create separate profiles (top toolbar) to maintain independent mod lists/load orders for different playthroughs without reinstalling anything"
      ],
      vfsCaveat: "See modManagerDeploymentModels below — any external tool that scans the Data folder directly (not launched through MO2) will not see MO2-managed mods at all.",
      status: "Industry-Standard Mod Manager"
    },
    vortex: {
      type: "Desktop Application",
      purpose: "Nexus Mods' official mod manager. Deploys mods by hard-linking (or copying) files directly into the real Data folder rather than a virtual file system.",
      howToUse: [
        "Install mods from the Nexus 'Vortex' download button (one-click) or drag-and-drop an archive into the Mods tab",
        "The Rules system lets you set 'load after/before' relationships between mods, which Vortex uses to resolve file conflicts automatically",
        "Deploy/Purge buttons (bottom right) apply or fully remove the current mod set from the Data folder — purge before big load-order changes if something looks stuck",
        "Because Vortex writes into the real Data folder, external tools work on it without needing to be launched through Vortex specifically — unlike MO2's VFS requirement"
      ],
      status: "Official Nexus Mod Manager"
    },

    // === LOAD ORDER & PATCHING ===
    loot: {
      type: "Desktop Application",
      purpose: "Load Order Optimisation Tool — automatically sorts plugins using a community-maintained masterlist of known dependency/compatibility rules, then flags problems.",
      howToUse: [
        "Select Fallout 4 from the game dropdown, click 'Sort Plugins' — review the proposed order, then Apply",
        "Pay attention to its warning/error messages per plugin (missing masters, cyclic dependencies, a plugin known to need cleaning) rather than only looking at the reordering",
        "Add your own 'User Rules' to pin a specific mod relative to another when the masterlist doesn't cover a mod-specific compatibility need — this is expected and normal, not a sign LOOT is broken",
        "LOOT's sort is a strong baseline, not an infallible final answer — a mod-specific compatibility patch requirement (e.g. two overhauls editing the same worldspace) still needs a manual xEdit patch or a known patch mod"
      ],
      status: "Community-Standard Load Order Tool"
    },
    wryeBash: {
      type: "Desktop Application",
      purpose: "Multi-purpose mod management tool (Mods/Saves/INI Edits/Installers tabs) whose standout FO4 feature is the Bashed Patch — auto-merging leveled lists and other mergeable record types across many mods into one patch.",
      howToUse: [
        "Build a Bashed Patch after your load order is otherwise finalized: right-click the empty Bashed Patch entry in the Mods tab → Rebuild Patch, then tick which import options (leveled lists, etc.) to include",
        "Bash Installers (its own package-manager tab) can install BAIN-structured archives directly into the real Data folder, similar in spirit to Vortex's deployment model",
        "Bashed Patch merging is a NARROWER, more automatic alternative to a full xEdit conflict-resolution patch — see conflictResolutionPatches below for when a hand-built xEdit patch is still required instead"
      ],
      status: "Community Utility — Patch Merging & Mod Management"
    },
    bethini: {
      type: "Desktop Application",
      purpose: "GUI editor for Fallout4.ini / Fallout4Prefs.ini / Fallout4Custom.ini, applying vetted preset tweaks (Safe/Recommended/high-FPS-Physics-aware, etc.) instead of hand-editing INI keys.",
      howToUse: [
        "Point it at your Fallout 4 install/documents INI folder, pick a preset tier appropriate for your hardware, apply",
        "Prefer it (or a mod manager's own INI-editing feature) over hand-editing where possible — see iniTweaking below on duplicate/conflicting keys silently overriding a manual edit"
      ],
      status: "Community Utility — INI Configuration Tool"
    },

    // === ARCHIVE / PACKAGING ===
    bae: {
      type: "Desktop Application",
      purpose: "Bethesda Archive Extractor — extracts BA2 (and older BSA) archives so you can inspect or pull individual assets out of a packed mod or the vanilla game archives. Extraction only; it does not create archives (use Archive2 for that — see ba2Packaging below).",
      howToUse: "Drag a .ba2/.bsa file onto BAE, or use File > Open, pick an output folder, extract. Useful for pulling a single vanilla mesh/texture as a reference without unpacking the entire game archive by hand.",
      status: "Community Utility — Archive Extraction"
    },

    // === IMAGE / TEXTURE EDITING ===
    gimp: {
      type: "Desktop Application",
      purpose: "Free, open-source image editor. For FO4 texture work, its main relevance is DDS export via the 'file-dds' plugin (bundled in modern GIMP builds).",
      howToUse: "Edit the texture as a normal raster image, then File > Export As > .dds — the export dialog lets you pick the compression format (BC1 for opaque albedo, BC3 for albedo with alpha, BC5 for normal maps, BC7 for higher-fidelity/PBR maps) and whether to generate mipmaps.",
      status: "Professional-Grade Free Image Editor"
    },
    photopea: {
      type: "Browser-based Application (photopea.com) — usually run as a pinned tab or installed PWA rather than a traditional .exe",
      purpose: "Free Photoshop-alike that runs entirely in the browser, with native .psd and .dds support — useful for texture edits on a machine without Photoshop or GIMP installed.",
      status: "Free Browser-Based Image Editor"
    },
    photoDemon: {
      type: "Desktop Application (portable, single .exe)",
      purpose: "Lightweight, free Windows image editor. Useful for quick texture edits or batch-processing many textures identically via its macro/batch feature when a full GIMP/Photoshop session is overkill.",
      status: "Community Utility — Lightweight Image Editor"
    },
    nvidiaTextureTools: {
      type: "Desktop Application / CLI / DCC Plugin",
      purpose: "NVIDIA's DDS compression toolkit (BC1–BC7, mipmap generation) — one of the standard texture compressors alongside Microsoft's texconv, and the same class of compressor Mossy's own DDS Converter shells out to.",
      status: "Professional Texture Compression Toolkit"
    },

    // === MESH / UV / FORMAT CONVERSION ===
    nifSkope: {
      type: "Desktop Application",
      purpose: "The standard NIF viewer/editor — shows a mesh's block tree (NiNode hierarchy, shader properties, texture set, collision) alongside a 3D render window, and lets you edit block properties directly.",
      howToUse: [
        "Block tree (left/top) mirrors the NIF's actual internal structure — select a block to see/edit its fields in the panel below, and to highlight the corresponding geometry in the render view",
        "Texture paths live on the BSShaderTextureSet block under each shape's BSLightingShaderProperty — this is the most common thing modders fix here (a mesh pointing at a moved/renamed texture)",
        "Collision, LOD data, and shader flags (e.g. specular/environment-map toggles) are all edited the same way: find the relevant block, edit its field values",
        "Modern forks include a Spells menu with batch/sanity operations (e.g. sanitizing block order) for a single open file — for the SAME fix applied across many files at once, see Sniff above instead"
      ],
      status: "Industry-Standard NIF Editor"
    },
    unWrap3: {
      type: "Desktop Application",
      purpose: "Standalone UV-unwrapping tool for meshes, used when a custom mesh needs new or cleaner UVs independent of a full DCC suite like Blender or 3ds Max.",
      status: "Community Utility — UV Mapping Tool"
    },
    nifUtilsSuite: {
      type: "Desktop Application",
      purpose: "Older community NIF utility bundle historically associated with the NifTools/NifSkope ecosystem, offering batch mesh-optimization style operations on NIF files.",
      confidence: "Lower confidence than other entries in this list — verify its currently-supported operation set directly in the tool before advising specific steps; older NifTools-era utilities sometimes target earlier NIF versions than FO4's.",
      status: "Community Utility — NIF Processing (verify current feature set before relying on specifics)"
    },
    spin3d: {
      type: "Desktop Application",
      purpose: "General-purpose 3D model format converter (e.g. between OBJ/3DS/FBX and similar formats) — useful as a conversion step in a mesh pipeline rather than an FO4-specific tool.",
      status: "Community Utility — 3D Format Converter"
    },
    umodel: {
      type: "Desktop Application / CLI",
      purpose: "Primarily an Unreal Engine asset viewer/exporter (by Konstantin Nosov) — not natively an FO4/Creation-Engine tool. Its inclusion in Mossy's tool roster is likely for a specific cross-engine asset-reference workflow rather than general FO4 mesh/texture work.",
      confidence: "Do not assume a direct FO4 use case without confirming with the user what they're using it for.",
      status: "Utility of Uncertain FO4 Relevance — clarify intended use before advising"
    },
    autodeskFbxConverter: {
      type: "Desktop Application",
      purpose: "Legacy Autodesk utility for converting FBX files between format versions — used in Bethesda modding pipelines when a downstream tool requires an older FBX version than a modern DCC (Blender, Maya, etc.) exports by default.",
      status: "Community Utility — FBX Version Converter"
    },
    iclone: {
      type: "Desktop Application (Reallusion)",
      purpose: "Full character animation suite. In the FO4 modding pipeline it's typically used to author or retarget custom animations, exported to FBX and brought into Blender for FO4-skeleton conforming before the normal Havok/HKX export step.",
      status: "Professional Animation Software"
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
  // Verified current as of 2026-07: Bethesda shipped 1.11.221 on 2026-05-27
  // (F4SE updated to 0.7.8 in response) — a Creation Club/storage stability
  // patch, not a major engine change. If you're reading this well after
  // mid-2026, verify no newer patch has landed since (check f4se.silverlock.org
  // and steamdb.info/app/377160/patchnotes for the current numbers).
  communityTools2025: {
    stabilityStack: [
      { name: "F4SE 0.7.8", nexus: "f4se.silverlock.org", note: "Script extender — 0.7.8 for runtime 1.11.221 (released 2026-05-27); match version to your exact game exe or F4SE plugins silently fail to load" },
      { name: "Address Library for F4SE Plugins", nexus: "#47327", note: "All In One (Anniversary Edition) build — required by all DLL mods" },
      { name: "Addictol (ALL-IN-ONE stability tool)", nexus: "#84214", note: "Supersedes and includes Buffout 4 (all variants), X-Cell, BakaMaxPapyrusOps, Faster Workshop, Interior NavCut Fix, Escape Freeze, Long Save Bug Fix, Disk Cache Enabler, Drop 7FFF Fix, and more. Do NOT install Buffout 4, X-Cell, or those mods alongside it." },
      { name: "High FPS Physics Fix", nexus: "#44798", note: "v0.8.13+ — critical for >60 FPS" },
      { name: "Unofficial Fallout 4 Patch (UFO4P)", nexus: "latest", note: "Always latest version; load after all DLC" },
      { name: "PRP 81.5", nexus: "#46403", note: "March 2026 stable — required for NG/1.11.x cells; load late in order" },
      { name: "MCM NG", nexus: "search 'MCM NG'", note: "Use the NG build — legacy MCM Framework does not work on NG/1.11.x" },
      { name: "CLASSIC Crash Scanner", nexus: "#56255", note: "Run after every CTD — scans Addictol/Buffout 4 crash logs at %USERPROFILE%\\Documents\\My Games\\Fallout4\\F4SE\\ (NOT %LOCALAPPDATA%); covers 250+ error scenarios" },
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
        "Achievements Mods Enabler / Achievements Enabler AE (verified: Addictol's source includes an AdModuleAchievements module) — Addictol alone restores achievements on a modded (.esp/.esl/.esm-containing) save without a separate enabler mod",
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
      "official-AE / 1.11.x": "1.11.137–1.11.221 — F4SE 0.7.7/0.7.8 (Bethesda's official 'Anniversary Edition' line, Nov 2025 onward). Latest as of this writing: 1.11.221 (2026-05-27, F4SE 0.7.8) — primarily a Creation Club/Creations-menu storage stability patch, not a major engine change. A universal downgrader exists community-side for modders who need an earlier 1.11.x build for compatibility; check current Nexus listings before assuming which exact build a mod targets."
    },

    communityGuides: [
      { name: "The Midnight Ride", url: "themidnightride.moddinglinked.com", note: "Authoritative NG/1.11.x modding setup guide — kept updated after every patch" },
      { name: "Nexar's Curated 2026 Modlist", url: "nexarplays.co.za/fallout4", note: "NG-optimised list; no downgrade required" }
    ],

    newFrameworks2026: [
      { name: "Prisma UI (PrismaUI_F4)", note: "Real, verified F4SE-powered web UI framework (Ultralight/WebKit-based) — HTML5/CSS3/JS custom panels as a genuine alternative to Scaleform/AS3 for NEW UI, not for editing vanilla menus. See prismaUIWebFramework above for full detail." },
      { name: "F4SE Menu Framework", note: "Released 2026-07-21 — Dear ImGui/DirectX 11 shared mod-menu overlay for F4SE plugin authors, backward-compatible with existing MCM config.json packages. See mcmIntegration above." },
      { name: "Condition System Framework", note: "Released June 2026 — F4SE-powered weapon/armor durability framework: item card injection, maintenance systems, configurable condition tracking. Relevant to anyone building a durability/degradation-focused overhaul." },
      { name: "Weapon Requirements Framework", note: "Released February 2026 — F4SE-powered framework that natively calculates dynamic Strength/Skill requirements per weapon based on type, mods, keywords, and caliber, rather than requiring hand-authored per-weapon requirement data." }
    ]
  },

  // === HOW SYSTEMS ACTUALLY WORK (engine mechanics — not data catalogs) ===
  // This section documents behavior that lives in compiled game logic, not
  // parseable record data — sourced from the Creation Kit wiki and established
  // community modding documentation, not invented. Where a mechanic's precise
  // internal numbers aren't publicly documented (e.g. exact detection cone
  // angles), that's stated honestly rather than guessed.

  combatAISystem: {
    overview: "NPC combat behavior is driven by three layered systems: AI Packages (what an actor is doing right now — sandbox, patrol, combat), Combat Style (a reusable data record defining HOW an actor fights once combat starts), and Aggression (WHEN an actor decides to start fighting).",

    aggression: {
      description: "Set on the Actor's AI Data tab, 0-3 scale, combined with Faction Relationships to decide whether an NPC attacks on sight.",
      levels: [
        "0 Unaggressive — never attacks first, even hostile factions",
        "1 Aggressive — attacks enemies matching faction relationship, won't attack neutrals",
        "2 Very Aggressive — attacks anything not friendly/allied",
        "3 Frenzied — attacks everyone including allies (used for feral ghouls, etc.)"
      ]
    },

    combatStyle: {
      description: "A CSTY record shared across many actors, defining combat multipliers rather than a fixed script — this is why changing one Combat Style (e.g. 'cstyRaider') changes behavior for every actor that references it.",
      keyMultipliers: [
        "Offensive/Defensive Mult — overall aggression balance in a fight",
        "Attack Staggered/Recoiled Mult — likelihood of attacking a staggered target",
        "Power Attack Staggered/Recoiled/Blocking Mult — likelihood of power-attacking (including to break a block)",
        "Bash Mult — likelihood of a bash/shove attack",
        "Ranged distances (Close/Mid/Long Range Max) — governs when an actor switches between melee and ranged behavior"
      ]
    },

    aiPackages: {
      description: "PACK records are the actual behavior instructions an actor runs moment-to-moment (Sandbox, Patrol, Travel, Guard, Use Item/Furniture). They're evaluated top-to-bottom on the actor's package stack; the first one whose conditions (CTDA) pass wins. Combat itself is handled by the engine's internal combat controller, not a package — but packages can be built to support combat behavior (e.g. a 'cast spell in combat' package with a condition requiring the actor be in combat).",
      practicalImplication: "If an NPC isn't doing what you expect, check package conditions and stack order before assuming it's a script bug — most 'broken NPC behavior' mod issues are a package evaluating in the wrong order or a condition that's subtly wrong (e.g. GetIsID vs GetIsCurrentPackage confusion)."
    },

    detection: "Detection uses line-of-sight plus a distance/lighting-based sneak detection value (the same system exposed to the player as the sneak meter) — the engine does not publicly document exact cone angles or falloff curves, so treat any specific numeric claim about detection radius as an approximation, not a verified constant.",
    hardcodedActiveActorCap: "Real, verified, hardcoded engine limit worth knowing for any large-battle/horde-style mod: by default only 20 actors can be 'active' (actually simulated/doing anything) at once, with a stricter 'high performance' combatant sub-limit of just 4 actors getting the full-fidelity AI treatment in a fight — real community mods ('More Active AI', 'MORE AI MORE NPCs at once') exist specifically to raise these caps: verified real range, the general active cap can be pushed as far as 128/255 (not just the more modest 40/60/80/100 some mods offer), and the high-performance combatant limit to 6/8/10/12. A quest/encounter mod designing a large simultaneous battle should know this hardcoded ceiling exists BEFORE assuming a large fight will look/perform as designed — beyond the default caps, excess actors are present but not meaningfully 'AI-active,' which reads as enemies standing idle rather than fighting, not a scripting bug in the encounter itself.",
    interiorChaseCombatantCap: "A real, DISTINCT hardcoded limit from the active-actor cap above, worth knowing separately: only a default of 2 pursuing NPCs can follow the player into an interior cell while chasing in combat (verified real, raisable via the same class of mod to 4/6/8/16). This specifically affects any encounter/quest design where the player might flee from a large group into a building/interior — even with the general active-actor cap raised, this SEPARATE interior-transition limit still caps how many of those active pursuers actually follow through the door, which is why a horde encounter can look correctly large in the exterior but suddenly thin out the moment the player retreats indoors unless this second limit is also addressed.",
    crippledLimbConsequencesRealFlag: "Real, specific, previously undocumented mechanic and Actor flag: crippled-limb behavior (dropping a weapon when an arm is crippled, falling/going prone when a leg's condition hits zero) is a distinct system from the general combat-damage documentation above, and is gated per-actor by a real, specific flag confirmed via real mod compatibility instructions: 'Can Use Crippled Limbs.' Two mods both implementing crippled-limb consequences will conflict on the SAME actors, and the documented real fix is exactly the same class of technique as elsewhere in this knowledge base — load one after the other and, in xEdit, clear the 'Can Use Crippled Limbs' flag on the actors handled by the mod that should defer to the other, rather than trying to run both systems on the same actor simultaneously."
  },

  dialogueSystem: {
    overview: "Fallout 4 dialogue is organized as Quest → DIAL (topic) → INFO (individual response). Which INFO plays is decided by evaluating each INFO's Conditions (CTDA) top-down within its topic; the first one whose conditions all pass is spoken. This is exactly why two mods adding a response to the same vanilla topic can conflict — whichever response's conditions are checked first (governed by load order and Priority) wins, and an unconditional line ahead of a conditional one will always steal the topic.",

    keyConditionFunctions: [
      "GetIsID — restricts a response to one specific actor (most common condition in vanilla content)",
      "GetIsVoiceType — restricts to a voice type instead of one NPC (used for generic barks)",
      "GetRandomPercent — used for randomized idle chatter variation",
      "GetStage / GetQuestVariable — gates a response to a specific point in a quest",
      "GetGlobalValue — gates on a global variable (settings toggles, story-flag checks)"
    ],

    responseUI: "The player-facing 'four-direction' response wheel shows a short paraphrase (e.g. 'Sarcastic', 'Help her') rather than the full line — the full voiced text is the INFO's actual NAM1 response text (this is exactly what the ESP Mining / world-strings scan now extracts verbatim).",

    fourOptionEngineLimit: "The 4-response layout is a genuine hardcoded engine limit, not just a UI convention — vanilla FO4 cannot display more than 4 simultaneous player dialogue options in a single topic. XDI/EDI (Extended Dialogue Interface, an F4SE-based framework, verified real via its own GitHub — reg2k/xdi) exists specifically to remove this hardcoded limit and add native support for any number of options, and is a real, common dependency for large quest mods with complex branching conversations. A quest mod planning dialogue with more than 4 simultaneous choices at any point needs to either design around the limit (paginate across multiple linked topics) or take an XDI/EDI dependency — this isn't optional polish once a conversation genuinely needs a 5th+ option shown at once.",
    twoDistinctDialogueUIProblemsNotToConflate: "IMPORTANT clarification, verified via the real, long-standing Full Dialogue Interface (FDI) mod: XDI/EDI above and FDI solve TWO DIFFERENT vanilla dialogue problems, not the same one. XDI/EDI removes the hardcoded 4-OPTION-COUNT ceiling (fourOptionEngineLimit above). FDI addresses a completely separate issue — vanilla only shows a short PARAPHRASE per option (see responseUI above) rather than the actual full line the player character will voice; FDI replaces those paraphrases with the real subtitle/NAM1 text and reformats the (still up to 4) options into a numbered/scrollable list instead of the radial wheel. A quest mod author asking 'how do I show full dialogue text instead of a vague paraphrase' needs FDI-style presentation, NOT XDI — and a mod needing more than 4 simultaneous choices needs XDI, NOT FDI. They address independent problems and can be used together, but recommending one when the actual need is the other is a real, easy mistake to make given how similar the two mod names/purposes sound.",

    modding: [
      "New topics need a DIAL (topic) plus at least one INFO (response) — an INFO with no conditions plays for anyone, so almost always add a condition (commonly GetIsID or a quest-stage check) to avoid stealing dialogue from vanilla NPCs.",
      "Quest-attached dialogue needs the quest running/started for its INFOs to be eligible at all.",
      "Use xEdit to check for duplicate/conflicting INFO records before publishing — this is one of the most common real conflict types found by the ESP Mining conflict scan in this app."
    ]
  },

  weatherSystem: {
    overview: "Exterior weather comes from the current Worldspace's assigned Climate (CLMT record), which lists candidate Weather (WTHR) records with relative chances. The engine periodically re-rolls against that weighted list, so weather feels random but is actually a weighted draw from a fixed climate-specific pool — this is why every 'weather mod' works by editing or replacing climate weather lists rather than writing new selection logic.",

    whatWeatherControls: [
      "Sky/cloud textures and fog color/density (visual only)",
      "Ambient and directional lighting color (affects overall scene brightness/tone)",
      "Precipitation type and particle effects (rain, radstorm particles)",
      "Sound — many weather records link an ambient weather sound descriptor",
      "Gameplay hazard — radiation storms specifically apply real periodic damage, unlike purely cosmetic weather"
    ],

    honestGap: "The exact numeric chance-weighting and re-roll interval per climate isn't reliably documented publicly (community reports vary, informally citing roughly every several in-game minutes) — this app does not fabricate a precise formula for it. If you need exact values for a specific climate, read that CLMT/WTHR record directly in xEdit rather than trusting a general rule.",
    dynamicSeasonalWeatherRealTechnique: "Real, verified technique for building a SEASONAL weather system on top of everything documented above (from a real, ambitious 'functional dynamic seasons' mod): rather than a new engine feature, this is achieved by a script that periodically ADJUSTS the same GlobalVariable-driven weather chance weights already described in this overview — e.g. increasing the relative chance of snowy weather and decreasing rainy weather specifically while the script considers it 'winter,' then reversing that bias in other seasons. This confirms weather-chance globals are genuinely script-writable at runtime, not just CK-authoring-time constants, which is the real foundation any 'seasons' or 'dynamic climate shift' mod needs.",

    foglineArtifactRealAndDocumented: "A real, well-documented rendering quirk from mature weather-overhaul mods: WTHR records have a 'Near Fog' field (under the FNAM subrecord group in xEdit) which, when set above 0, produces a visible circular fog boundary ('fog line') that follows the player around as they move — an immersion-breaking artifact in heavy-fog weather types specifically. The community-standard fix is setting Near Fog to 0 across the affected weather records, but this fix has its OWN documented side effect: distant landscape can render too brightly/glowing in foggy conditions once Near Fog no longer masks it. A new weather type with dense fog should budget time to tune Near Fog deliberately (test at multiple view distances) rather than copying a default value and assuming it's fine — this exact trade-off has needed supplementary patches even in mature, widely-used weather overhaul mods."
  },

  progressionSystem: {
    overview: "Fallout 4 replaced the skill system from earlier Fallout games with SPECIAL (Strength, Perception, Endurance, Charisma, Intelligence, Agility, Luck) plus a perk chart keyed directly off SPECIAL ranks — there is no separate skill system in FO4 to model perks against (this app's mining engines were corrected during this session specifically because an earlier version incorrectly modeled FO4 perks using Skyrim's skill list).",

    howLevelingWorks: [
      "Every level grants exactly one perk point",
      "A perk point can either take a rank of a perk OR raise one SPECIAL stat by one point",
      "Each perk rank requires both a minimum SPECIAL stat rank AND a minimum character level — the first rank of an available perk has no level requirement beyond the SPECIAL minimum, but higher ranks add level gates",
      "There is no level cap in FO4 (unlike FO3's cap of 20) — by level 50 every perk rank in the game is reachable given enough SPECIAL investment"
    ],

    realFormulaSource: "The actual numeric curves (XP required per level, carry weight per Strength point, damage-per-Strength-point, etc.) are stored as GMST (Game Setting) records and are now part of this app's real game-data scan (see the 'game_settings' catalog) — e.g. real extracted values include fDamageStrengthBase/fDamageStrengthMult (melee damage scaling) and fJumpHeightMin. Prefer reading the actual scanned value over restating a remembered number, since these have been tuned across patches."
  },

  aiPackageSystemDeep: {
    overview: "AI Packages are Bethesda's 'Radiant AI' technology — the system that lets NPCs choose contextual behavior instead of following a fixed script. Fallout 4 ships package templates for Sandbox, Travel, Patrol (path of markers), Eat, Escort, and Forcegreet (trigger dialogue on approach).",

    sandboxProcedure: "The most-used package type. On startup it builds a list of nearby interactable objects (furniture, idle markers, other NPCs) within its allowed radius, scores each one based on object-specific suitability, zeroes out the score for anything invalid or just-used, and picks the highest-scoring one — this is why sandboxing NPCs look 'purposeful' without anyone scripting each action individually.",

    radiantAI: "The umbrella term for this whole choice-driven behavior system (inherited from Oblivion/Skyrim, refined for FO4). It's also what powers Radiant Quests — procedurally-selected quest targets/locations (e.g. Minutemen settlement-defense quests, faction fetch quests) built from quest aliases that resolve to different actors/locations each time, rather than one hand-placed instance per quest.",

    randomEncounterSystemReal: "Verified real, specific mechanism for wilderness 'random encounters' (a wandering trader, a fight between two other factions, etc. that isn't a Radiant Quest): a GlobalVariable named REGlobalCooldown tracks WHEN the next random encounter is allowed to trigger, checked against GameDaysPassed (both readable live via console getglobalvalue) — and this cooldown is GLOBAL, not per-location: once any random encounter fires anywhere in the Commonwealth/Far Harbor/Nuka-World, no other random encounter can trigger anywhere else until the cooldown expires. The actual encounter selection lives in the Story Manager as a family of 'RE'-prefixed nodes/branches, and — real, important modding limitation — this branch processes SEQUENTIALLY and stops at the first compatible match, which is specifically why it's difficult for a new mod to cleanly inject additional random encounters alongside vanilla ones without a dedicated compatibility framework (a real reason 'Random Encounter Framework'-style mods exist specifically to reorganize this tree for extensibility, rather than modders just adding new nodes directly).",
    practicalNote: "Package priority is stack order, evaluated top-down with conditions (CTDA) gating eligibility — the first eligible package wins. This is the same mechanism noted in the Combat AI section above; debugging 'NPC won't do what I scripted' almost always means checking package order and conditions before touching Papyrus.",

    realRepeatableFactionBattleArchitecture: "Real, professional, verified architecture for a REPEATABLE 'two factions fight each other, player can help either side' encounter (Improved AR2 Enclave, imp_AR_REAssault*.psc family — multiple near-identical quest instances like FactionEncvsBoS, FactionEncvsInst, DLC04-specific variants). Confirms a shared-base-script design: every specific assault quest's Fragment code calls the SAME small set of functions — InitAssault(), StartAssault(), CompleteAssault(), CleanupAssault() — on a shared custom quest script (REAssaultQuestScript) that all the specific instances extend, so only per-instance DATA (which factions, which actor aliases) differs between them, not logic. Real stage flow: stage 10 initializes and resolves actors, stage 11 starts the fight once the player is in range, stages 40/50 fire depending on which side actually won (checked via GetStageDone on the OTHER side's stage — e.g. 'if GetStageDone(20) && GetStageDone(40)' — to decide whether the winning side thanks the player), and a cleanup stage (1000) calls CleanupAssault() then re-arms the encounter's own trigger volume directly: '(Alias_Trigger.GetRef() as RETriggerScript).ReArmTrigger()' — the real, concrete script-side mechanism for making a random/radiant-style encounter repeatable rather than one-shot, complementing the REGlobalCooldown/Story-Manager mechanism documented above. Slot design uses plain NUMBERED ReferenceAlias properties (Alias_Attacker01Links through Attacker05Links, Alias_Defender01Links through Defender05Links) rather than a true alias collection — a real, simple, verified way to support 'up to N combatants per side' without needing dynamic alias arrays.",
    directCastAlternativeToAutocast: "Real, verified SECOND way (besides the CK-generated AUTOCAST block documented in questCreationWorkflow) for a Fragment to call functions on its own quest's custom script: a plain double-cast written directly in the fragment code, '((self as Quest) as REAssaultQuestScript).InitAssault()' — no special CK-generated comment block needed, just cast self (typed as the Fragment's own hidden script) to Quest first, then to the actual custom quest script type, then call the function. Both techniques are real and compile; the AUTOCAST block is what CK itself generates automatically when you reference the owning quest's members through its Property Helper UI, while this direct double-cast is what a modder writes by hand editing the .psc directly.",

    dailySchedulesHowTheyActuallyWork: "A vanilla-style NPC 'daily routine' (sleeps at night, works during the day, eats at noon) is NOT a separate scheduling system — it's just multiple packages stacked on the same actor, each gated by a GetCurrentTime condition covering the hours that package should be active (e.g. a Sleep package conditioned to GetCurrentTime >= 22 or <= 6, a Work package for the daytime hours), evaluated with the same top-down/first-eligible-wins logic as everything else in this section. There is no dedicated 'schedule' record or UI — it's condition authoring on ordinary packages.",
    moddingWorkflowForASchedule: [
      "Decide the actual time blocks first (e.g. Sleep 22:00-06:00, Work 08:00-17:00, Sandbox/eat the remaining hours) — overlapping or gapped time windows are the most common cause of an NPC 'freezing' or doing nothing at a given hour",
      "Create one package per time block, each with a GetCurrentTime condition matching its window, and stack them on the actor in a sensible priority order (more specific/important packages above general Sandbox fallback)",
      "Always include a catch-all Sandbox package with NO time condition at the BOTTOM of the stack — this is what the actor falls back to during any hour not explicitly covered, preventing the 'idle NPC does nothing' bug from an accidental scheduling gap",
      "Test by fast-forwarding time in-game (console `set gamehour to X` or simply waiting) across a full 24-hour cycle rather than only checking the hour you're actively developing — schedule bugs are almost always in the hours you didn't manually check"
    ]
  },

  settlementSystem: {
    overview: "Workshop settlements run on three pillars: settlers, resources, and happiness. Max settler population is 10 + Charisma, so a build-focused playthrough benefits directly from Charisma investment.",

    powerAndWiring: "Power itself doesn't affect happiness directly — it's required to operate higher-tier machinery (defenses, certain shop upgrades, lighting). Wiring is built in Workshop mode by connecting generators to connectors/switches/powered objects; each connection consumes Copper as a resource.",
    turretTargetingViaLinkedTerminal: "Real, specific, verified mechanic worth knowing when building settlement-defense objects: a turret's targeting behavior (e.g. whether it will target the player character, useful for a settlement PVP/testing setup, or normal hostile-only targeting) is configurable via a Terminal LINKED to that turret — the same Terminal/OnMenuItemRun mechanism documented under terminalSystem above, applied to a defense object rather than a lore terminal. A new custom turret-type object should follow this same linked-terminal convention for configurability rather than inventing a separate settings mechanism, since it's the established pattern players already expect from vanilla turrets.",

    happiness: [
      "Food and water: needs roughly 1 unit of water per settler as a baseline requirement",
      "Shops boost happiness directly — food-related shops (bar/restaurant/food stall) give the largest bonus; higher-tier shop upgrades give more",
      "Pets (Wasteland Workshop DLC cages) provide a small happiness bonus",
      "Defense and bed count matter for the settlement's overall 'needs met' status, which feeds into happiness alongside food/water"
    ],

    supplyLines: "The Local Leader perk unlocks supply lines between settlements, sharing workshop resources (building materials) across the network — but food/water still must be produced locally at each settlement; supply lines don't ship those.",

    moddingNote: "Settlement objects are WorkshopScript-driven and use the workshop keyword/snap-point system (linked via keywords on STAT/FURN/CONT records) — a new buildable object needs the right keyword and a script-recognized workshop category to show up correctly in the menu, not just a mesh and a form.",

    precombineInteraction: "Placing/scrapping objects through the in-game Workshop mode at a settlement dynamically breaks that cell's precombined meshes and previs data for anything affected — this is a real engine limitation (not a bug), which is exactly why precombine/previs-rebuilding tools like PRP (Previsibines Repair Pack) exist as a required companion to any serious settlement-overhaul mod. A mod that adds large numbers of new buildable objects or scraps vanilla clutter without shipping (or requiring) a matching previs rebuild will cause invisible/z-fighting geometry and FPS drops for users, especially noticeable in dense settlements like Sanctuary or Starlight Drive-In.",

    heavyScriptingBacklogRealPhenomenon: "Documented real behavior in large settlement-automation frameworks with many concurrent per-settler/per-plot scripts: script processing can fall behind real-time under load (weak CPU, many script-heavy mods stacked, or simply a very large/complex settlement), producing a genuine backlog rather than a bug — a settlement that 'isn't updating' is frequently just queued and catching up. The documented practical fix from a real large framework's own troubleshooting guide is literally to stand in/near the settlement doing nothing for 10-15 minutes and let the Papyrus queue drain, rather than assuming something is broken and reinstalling/debugging. This is the practical, player-facing symptom of the same iMaxAllocatedMemoryBytes/script-timing constraints documented in papyrusDebuggingPerformance above — a mod author building anything with heavy per-object settlement scripting should expect and document this behavior for users rather than treating every 'stuck' report as a unique bug.",

    settlerPathingIsARealDesignConstraint: "Widely documented, real limitation (not a fixable bug, an actual engine/navmesh constraint): settler AI pathing genuinely struggles in complex multi-story buildings and tight/cluttered layouts — settlers need meaningful open pathing radius around their assigned work/bed/idle objects to navigate reliably, and dense or vertically-complex settlement layouts are a common, real cause of settlers standing still, clustering, or failing to reach their assignment. This directly matters for anyone designing NEW buildable settlement structures: a tall, narrow, multi-floor building kit will produce real settler-pathing complaints even with perfectly correct navmeshing, simply because of this AI limitation, not because of a modding mistake. A further real, documented gotcha: mods that remove safety limits (e.g. a 'No Building Limits'-style mod removing the vanilla object-count/size caps) can indirectly CAUSE new settler pathing failures, since those limits partly exist to keep settlements within a complexity range the AI can actually navigate — removing a limit for more creative freedom has this real, secondary AI cost worth documenting for users rather than treating any resulting pathing complaint as unrelated.",
    workshopFrameworkRealDataArchitecture: "Real, precise architecture detail for the Workshop Framework mentioned elsewhere in this knowledge base (verified from its own real source/documentation) — this is the actual pattern behind managing MANY settlements without bloating memory/save data, worth knowing as a general technique beyond just settlements: WorkshopParentScript.Workshops is the master ARRAY of every workshop in the game, but most workshop data is deliberately NOT kept in that master array — full data (actor/object arrays) is only materialized for the CURRENTLY LOADED workshop; for every UNLOADED workshop, its state is instead stored compactly on that workshop's Location via KEYWORD data rather than as live in-memory arrays. A real, named DailyWorkshopUpdate() function, driven by a 24-hour timer, loops through every workshop in the array to process production/consumption/happiness/repair regardless of load state. Real, honest complexity warning directly from the framework's own documentation: this master system is genuinely complex and fragile, easily broken by careless object/keyword/registration configuration — a caution worth taking seriously for anyone building deeply on top of it rather than just using its public extension points documented elsewhere in this knowledge base. The general lesson for ANY mod managing many instances of something (not just settlements): keep full live data only for the currently-relevant/loaded instance, and represent everything else compactly (e.g. via keywords/flags on a lighter-weight object) rather than holding full data for every instance simultaneously.",

    realWorkshopScriptingAPI: "Real, verified, extensive workshop/building scripting API pulled from a complete, real, shipped blueprint-import script (4estGimp's Blueprint Installer utilities — ImportBlueprint:WorkshopScript.psc) — this is the actual mechanism behind 'restore power/assign settlers after mass-placing objects', filling what was previously only conceptual coverage in this knowledge base:\n" +
      "- Event OnWorkshopMode(Bool aStart) on a ReferenceAlias — the REAL event that fires when the player enters/exits Workshop (build) mode at that settlement; this is the actual hook point for 'run code when the player opens the workshop menu here', not something documented elsewhere in this system.\n" +
      "- ObjectReference.StartWorkshop(bool abLeaveMenu = true) — programmatically opens/closes workshop mode on a workshop reference (used here as a trick to force a game auto-save mid-process: StartWorkshop(false), Game.RequestSave(), then StartWorkshop() again).\n" +
      "- ObjectReference.CreateWire(ObjectReference akOther) — the real function that creates a power CABLE connection between two references (the actual 'wiring' mechanic previously only described conceptually elsewhere in this knowledge base); ObjectReference.TransmitConnectedPower() is the companion call for a direct (non-cable) power-transmitting connection.\n" +
      "- ObjectReference.FindAllReferencesOfType(Form akType, float afRadius) and FindAllReferencesWithKeyword(Keyword akKeyword, float afRadius) — real, verified area-search functions distinct from a workshop's own actor/object arrays.\n" +
      "- ObjectReference.GetLinkedRefChildren(Keyword akKeyword) — real function returning every reference linked to this one via that keyword (used here to enumerate every buildable item/build-area linked to the workshop reference itself).\n" +
      "- ObjectReference.CallFunction(String asFunctionName, Var[] akArgs) — a real, verified dynamic/reflective call mechanism: invokes a function BY STRING NAME on that reference's attached script with a Var[] argument array, used here to broadcast a custom 'OnWorkshopObjectPlaced' notification to both a moved object and the workshop itself without either script needing a direct Property reference to the other.\n" +
      "- WorkshopParentScript real functions (previously only ONE function on this type was documented in this knowledge base): AddActorToWorkshopPUBLIC(WorkshopNPCScript, WorkshopScript), TryToAutoAssignActor(WorkshopScript, WorkshopNPCScript), AssignActorToObjectPUBLIC(WorkshopNPCScript, WorkshopObjectScript), GetWorkshopActors(WorkshopScript) returning that workshop's actor array, plus WorkshopNPC/WorkshopNPCGuard (real ActorBase Properties used as the template when spawning a brand-new generic settler) and WorkshopItemKeyword (the real Keyword every buildable workshop item shares).\n" +
      "- WorkshopObjectScript real per-object properties: bAllowPlayerAssignment, IsBed(), RequiresActor(), IsActorAssigned(), HasMultiResource(), and a WorkshopParent Property linking back to the owning WorkshopParentScript — the real per-buildable-object API a mod would check before trying to assign a settler to it.\n" +
      "- GlobalVariable.Mod(float) — a real increment/modify function (previously only GetValue/SetValue were documented) — 'PTSB_CounterGlobal.Mod(1)' increments a progress-counter global by 1.\n" +
      "- Quest.UpdateCurrentInstanceGlobal(GlobalVariable) — real, verified mechanism for a quest that gets INSTANCED multiple times (each settlement/blueprint-import run reusing the same quest template) to give each running instance its own separate copy of a shared template GlobalVariable, rather than every instance stomping the same single global.\n" +
      "- Message.ShowAsHelpMessage(asEvent, afDuration, afInterval, aiMaxTimes, asContext, aiPriority) / UnshowAsHelpMessage() — the real on-screen HELP-MESSAGE overlay mechanism (the tutorial-popup-style UI), distinct and more advanced than the simple modal Message.Show() (which just returns a button index) documented elsewhere in this knowledge base.\n" +
      "- Real, useful Papyrus language gotcha confirmed directly in this shipped script's own comment: there is no 'break' statement in Papyrus — the idiomatic workaround inside a While loop is to set the loop counter equal to the array's Length so the loop condition fails on its next check ('i = BuildAreas.Length' instead of break).\n" +
      "- Real vanilla FormIDs worth knowing for any settlement-scripting mod (all resolved via Game.GetFormFromFile(id, \"Fallout4.esm\")): WorkshopParentScript's own quest = 0x0002058E, the WorkshopLinkedPrimitive keyword = 0x000B91E6, the EnableMarker static = 0x000E4610, and the five actor-type keywords Robot=0x0002CB73, Creature=0x00013795, NPC=0x00013794, SuperMutant=0x0006D7B6, Synth=0x0010C3CE.",
    realPapyrusStateMachinePattern: "Real, verified Papyrus STATE feature in production use (same blueprint-import script) — a language feature not otherwise documented in this knowledge base: 'Auto State Init / Event OnWorkshopMode(Bool aStart) ... EndEvent / EndState' followed by a second named 'State Done / Event OnWorkshopMode(Bool aStart) EndEvent EndState' with an EMPTY body. 'Auto State X' marks which state the script starts in; calling 'GotoState(\"Done\")' from inside the Init state's event permanently switches which version of OnWorkshopMode will run for all FUTURE firings of that event on this same script instance — the real, idiomatic way to make an event 'only ever meaningfully fire once' (a data-driven alternative to a manual bool flag checked at the top of every handler), used here specifically so a one-time blueprint-import cleanup pass never re-triggers on later visits to workshop mode at the same settlement.",
  },

  vatsSystem: {
    overview: "V.A.T.S. (Vault-Tec Assisted Targeting System) pauses combat into slow-motion and lets the player queue targeted attacks against an enemy's body parts, spending Action Points (AP) per attack.",

    hitChance: "Displayed per-body-part, and varies with distance, cover, target's exposed condition, weapon accuracy, and the player's own stats (Perception raises hit chance). VATS attacks always aim center-of-mass in melee/unarmed — limb targeting is a ranged-weapon-only feature.",

    mechanics: [
      "Number of queued attacks is limited by available AP and the AP cost of the equipped weapon",
      "VATS grants roughly a 15% critical-hit chance bonus",
      "Equipped weapons degrade (condition loss) about 4x faster while used in VATS versus real-time fire",
      "Cannot target eyes or groin specifically — targeting is limited to the major body parts the game exposes (head, torso, arms, legs)"
    ],

    criticalBanking: "The Critical Banker perk (Luck) lets a filled crit meter be 'banked' as a star icon instead of only being usable immediately — Rank 1 adds one bankable star, each further rank (up to Rank 4) adds another, for a maximum of 4 banked stars plus the currently-filling meter (5 total crits available at once). A banked crit is a guaranteed hit-and-crit regardless of the displayed hit chance, which is why it's specifically valuable for very-low-percentage called shots (e.g. a Sentry Bot's fusion core)."
  },

  companionSystem: {
    overview: "Companions track a hidden Affinity stat (console-visible via `getav ca_affinity` on the selected companion) that rises or falls based on player actions/dialogue choices the companion's personality approves or disapproves of.",

    howRecruitmentActuallyWorks: "Verified directly from the shipped FollowersScript.psc (the script on the vanilla 'Followers' quest) — becoming a companion is NOT a flag on the NPC's record, it's a runtime function call chain: FollowersScript.SetCompanion(Actor) fills the quest's single Companion ReferenceAlias (there is only ONE human-companion slot at a time — Dogmeat has his own separate DogmeatCompanion alias), which internally calls Actor.SetPlayerTeammate(abTeammate=true, abCanDoFavor, abGivePlayerXP) — THIS is the actual native call that makes an NPC follow/fight-alongside/trade with the player, not any keyword or 'CanBeFollower' flag. SetCompanion also adds the actor to a CurrentCompanionFaction and a permanent HasBeenCompanionFaction (used to conditionalize dialogue for 'ever been a companion'), and a DisallowedCompanionFaction exists specifically to block certain actors from ever becoming companions (checked before SetCompanion is allowed to succeed).",

    theOneCompanionLimitIsAVanillaChoiceNotAnEngineLimit: "IMPORTANT clarification, verified from real multi-companion mods (e.g. Unlimited Companion Framework supporting up to 15 simultaneous companions, Multiple Followers Overhaul's 20+10+5 slot system): the 'only one human companion at a time' restriction above is a CHOICE made by vanilla FollowersScript specifically (it only ever fills ONE Companion alias) — it is NOT a limitation of the underlying Actor.SetPlayerTeammate() function itself, which has no such restriction and can be called on as many different actors as a mod wants. Real multi-companion mods don't 'trick' or hack around a hard engine limit; they simply bypass FollowersScript.SetCompanion() entirely and call SetPlayerTeammate() directly on each desired companion via their OWN parallel tracking system (their own alias/array/quest structure analogous to FollowersScript's Companion alias, just with multiple slots instead of one). A mod wanting more than one simultaneous companion should design its own tracking framework around the SetPlayerTeammate primitive rather than trying to extend or reuse the vanilla single-slot FollowersScript machinery. Separately, console-command testing of this (setrelationshiprank player 4 + setplayerteammate 1) confirms a Relationship Rank dimension also matters alongside the Faction membership already documented above — both contribute to full companion-equivalent behavior, not SetPlayerTeammate alone in isolation.",
    alternativeMultiAxisAffinityArchitecture: "Real, verified ALTERNATIVE to the vanilla single-scalar Affinity model documented above (MinAffinity -1100 to MaxAffinity 1100, one float) — a real, popular, fully-voiced custom companion mod (Kit, from 'The Machine and Her') implements her affinity as movement along an X/Y AXIS instead of one number, explicitly built to weigh BOTH her own story's choices AND the player's actions in the wider vanilla game (factions joined, dialogue choices, actions toward vanilla NPCs) as separate contributing inputs rather than one blended scalar. This is a real, more sophisticated custom-companion architecture choice worth knowing exists — a mod author wanting a companion whose opinion of the player can't be fully captured by a single 'likes you more/less' number (e.g. tracking something like trust and morality as independent axes) has a real precedent for building exactly that, rather than being limited to replicating the vanilla CompanionActorScript's single-float model.",
    companionSkillProgressionForCommandedActions: "Real, verified extension to the command-mode lockpick/hack mechanism already documented above (Followers_Command_LockPick_Allowed / Command_LockPick_Scene): the same real custom companion mod gives her lockpicking/hacking a genuine SKILL PROGRESSION — she needs 'practice' to become capable of cracking higher-security locks/terminals, rather than either always succeeding or using a flat, unchanging success chance. This confirms the vanilla command-lockpick/hack scene mechanism can be extended with a persisted skill-level variable that gates which difficulty tiers a companion can attempt, rather than being limited to the binary 'can she attempt this or not' vanilla-style behavior.",

    companionActorScriptRequired: "A real companion NPC has a CompanionActorScript (verified: 1700+ lines, extends the base actor script) attached — this is where the actual personality-reaction system lives: an EventData_Array of (event keyword → Dislikes/Hates/Likes/Loves reaction keyword) pairs unique to that companion (this is literally what makes Piper react differently than Cait to the same player action), plus properties like ShouldGivePlayerItems (periodic companion-gives-player-loot behavior), HomeLocation (where they go when dismissed), and KeywordsToAddWhileCurrentCompanion (non-const specifically so a companion like Curie can change these when her form changes).",

    affinityMechanicsReal: "Verified real numeric range: Affinity runs from MinAffinity -1100.0 to MaxAffinity 1100.0. A ThresholdData_Array defines named tiers (crossing one plays a scene, queued via AddThresholdToQueueAndSetSceneToPlay so multiple simultaneous threshold-crossings don't stack/collide) — StartingThreshold and InfatuationThreshold are specific globals marking the neutral starting point and the max 'romance available' tier, and reaching Infatuation grants InfatuationPerk. IsRomantic()/IsInfatuated() are the actual functions gating romance-specific content. A companion also independently tracks murder-witnessing (ConsideredMurderFactionList + BodyCountAllowedBeforeMurderSession) — killing too many members of factions a companion cares about triggers its own reaction path separate from ordinary affinity gain/loss.",

    commandMode: "Verified real command-type enum from FollowersScript's OnCommandModeGiveCommand event: 0 None, 1 Call, 2 Follow, 3 Move, 4 Attack, 5 Inspect, 6 Retrieve, 7 Stay, 8 Release, 9 Heal — issued by holding the interact button on a companion or a target. This is independent of affinity and works at any affinity level. Follow distance (Near/Medium/Far) and Stance (Aggressive/Defensive) are separate GlobalVariable-driven settings read by the same 'FollowPlayer' AI Package template every companion shares.",

    realVerifiedDialogueDrivenRecruitDismiss: "Real, minimal, complete recruit/dismiss pair verified from a shipped companion mod's own dialogue-response scripts (Depravity, DP_CompanionFollow.psc / DP_CompanionDismiss.psc) — confirms SetPlayerTeammate directly from a hand-written (non-Fragment-generated) TopicInfo script, the simplest possible real implementation: 'Scriptname DP_CompanionFollow extends TopicInfo' with 'Event OnEnd(ObjectReference akSpeakerRef, bool abHasBeenSaid)' calling 'ActorName.SetPlayerTeammate(true,false,false)' then 'CompanionQuest.SetStage(20)'; dismiss is the exact mirror — 'CompanionQuest.Reset()' then 'ActorName.SetPlayerTeammate(false)'. Note 'extends TopicInfo' with a plain 'Event OnEnd(...)' is a real, valid ALTERNATIVE to the CK-generated 'Fragments:TopicInfos:...' namespaced Fragment_End convention documented elsewhere in this knowledge base — a modder hand-writing a response script directly (rather than typing code into CK's Response script box, which is what generates the Fragment version) uses this simpler non-namespaced form instead; both are real and compile.",
    realVerifiedSettlementAssignment: "Real function name for 'make this companion/NPC a settler at a workshop' — verified from the same shipped mod (DP_CompanionAssignSettlement.psc), previously only documented conceptually in this knowledge base's settlementSystem section: 'CompanionActorName.SetFactionRank(WorkshopNPCFaction, 0)' (adds the actor to the settlement's NPC faction at rank 0) followed by 'WorkshopParent.AddPermanentActorToWorkshopPlayerChoice(CompanionActorObjectRef as Actor)' where WorkshopParent is a Property of the real type WorkshopParentScript. This is the actual, real, callable function that performs what the Workshop menu's own 'Assign' UI does internally — useful for any mod that wants to programmatically turn a specific Actor into a settler without going through the manual Workshop-mode assignment UI.",

    moddingWorkflow: [
      "Create the NPC: a new ActorBase (Race, stats, inventory, AI Data, FaceGen export, Voice Type assignment — see voiceAndLipSync above for the FUZ/lip-sync side of giving them unique lines)",
      "Attach a CompanionActorScript (or a script extending it) with its own EventData_Array/ThresholdData_Array authored for this character's personality — copying a vanilla companion's script as a starting template is the standard approach, not writing this from scratch",
      "Add the actor to whatever factions your recruitment quest logic checks, and ensure it's NOT in DisallowedCompanionFaction",
      "Build a recruitment quest/dialogue path that calls (directly or via the same pattern as) FollowersScript.SetCompanion on this actor once the player has met your recruitment condition — this is the step that actually activates SetPlayerTeammate and everything else",
      "Wire Affinity Events for actions this companion should react to (see dialogueSystem/questAliasSystem above for the underlying alias/condition mechanisms) using the same Dislikes/Hates/Likes/Loves keyword pattern",
      "Test recruit → follow → command-mode → affinity-threshold scene → dismiss end-to-end before considering the companion complete — a companion that recruits but never fires a threshold scene almost always means EventData_Array/ThresholdData_Array wasn't actually populated, not a deeper bug"
    ]
  },

  sceneSystem: {
    overview: "Scenes coordinate multiple actors through synchronized dialogue and actions — everything from a two-NPC ambient conversation to a fully staged quest set-piece. This is the tool for 'more than one NPC needs to do something together,' which a single AI Package can't express.",

    structure: "A Scene is a sequential list of Phases. Each Phase bundles a set of per-actor Actions that all fire simultaneously; when every action in the current Phase completes, the Scene advances to the next Phase.",

    actorLocking: "An actor can only be in one active Scene at a time. If a Scene tries to start with an actor who's already in another Scene, the new Scene waits until that actor frees up — a common cause of a scripted conversation 'not triggering' is actually this silent queue-wait, not a broken trigger.",

    moddingNote: "Scenes are the correct tool for multi-NPC quest dialogue moments; for a single NPC just delivering one line, a Forcegreet package or a simple INFO condition is simpler and less fragile."
  },

  engineInternalSystems: {
    overview: "These systems are compiled into the Creation Engine itself (Fallout4.exe / its DLLs) rather than expressed as editable Creation Kit data. Modding can configure their INPUTS (values, assets, triggers) but cannot rewrite the underlying algorithm without engine-level tools (F4SE plugins written in C++, or Bethesda's own engine updates).",

    listedByArea: [
      "Havok Physics Engine — you set collision shapes/masses/constraints on your object, but the actual rigid-body solver, collision resolution, and cloth simulation math is compiled physics middleware",
      "Havok Behavior animation state machines — you can author new animation clips and hook them into existing state-machine transitions via Creation Kit, but the state-machine engine itself (blending, IK solving, procedural head-tracking) is compiled",
      "Rendering pipeline (lighting/shadows/PBR-style shading, LOD transitions) — you set material properties (BGSM) and place lights, but the shader/rasterization pipeline itself is compiled",
      "Save/Load serialization — the format and process for what gets written to a save file is fixed engine behavior, not moddable data (this is also why heavily-scripted mods can bloat/corrupt saves if uninstalled carelessly — the save's script-data layout is engine-owned)",
      "Steam/Creation Club backend integration — achievements, cloud saves, and CC content delivery are platform-level services outside the Creation Kit entirely"
    ],

    whyThisMatters: "When teaching or planning a mod, the useful question is never 'can I change how physics works' — it's 'what data can I feed the existing physics/animation/rendering system to get the effect I want.' F4SE plugins (real C++ code loaded into the game process) are the only way to change engine-internal behavior itself, and that's a different (and much higher-effort) discipline than Creation Kit/Papyrus modding."
  },

  f4sePluginNativeEvents: {
    overview: "Real, verified example of exactly how an F4SE plugin extends Papyrus beyond what vanilla scripting can ever do on its own: 'Garden of Eden Papyrus Script Extender' (by LarannKiar) ships a real header script (Scripts/Source/User/GardenOfEdenEvents.psc, 'ScriptName GardenOfEdenEvents Native Hidden') declaring native global functions that expose low-level ENGINE events to Papyrus that have no vanilla equivalent at all — this is the concrete answer to 'what does an F4SE plugin actually let me do that Papyrus alone can't.'",
    realNativeEventsExposed: [
      "OnHitEvent — fires with the FULL real combat hit-data struct broken out as individual parameters: attacker/source/projectile/target FormIDs, ammo FormID, exact base/blocked/reduced/critical/sneak-attack-multiplied/total damage floats, body part type, block/stagger multipliers, weapon/attack-spell/attack-type-keyword FormIDs, material type — none of this granularity (e.g. 'was this specific hit a sneak attack, and by what multiplier') is obtainable from vanilla Papyrus OnHit at all",
      "TESObjectLoadedEvent(int akRefID, bool bLoaded) — real per-reference load/unload notification, filterable to a SPECIFIC reference's FormID so a script only reacts when e.g. one particular NPC's cell loads, instead of polling",
      "TESContainerChangedEvent(int akOldContainerRefID, int akNewContainerRefID, int akItemBaseFormID, int akItemRefID, int akItemUniqueID, int aiItemCount) — a real 'item moved between containers' event (covers player looting, NPC inventory transfers, etc.) with no vanilla equivalent",
      "OnActorValueChangedEvent(ObjectReference akActorValueOwner, ActorValue akChangedAV) — real per-ActorValue change notification, optionally filtered to one specific ActorValue (or all, if the filter is None) — lets a script react the instant a specific stat changes rather than polling GetValue() on a timer",
      "OnCombatStateChanged, OnEquipUnequip, PlayerAmmoCountEvent(int aiClipAmmo, int aiReservedAmmo), MenuOpenCloseEvent(String asMenuName, bool abOpening), OnCellAttachDetachEvent, OnPipBoyLightChange, OnColorUpdateApply (HUD color change), OnPerkPointIncrease, PlayerActivatePickRefEvent, PlayerCrosshairModeEvent, HUDModeEvent — all real, all native-only, all documented with their exact real callback signatures in the shipped header script"
    ],
    realGenericFilterRegistrationPattern: "The genuinely reusable DESIGN PATTERN worth learning from this (applicable to anyone building their own F4SE plugin that needs to notify Papyrus of native engine events): a small, generic string-based registration API — 'RegisterForNativeEvent(String asScriptName, String asEventName)' / 'UnregisterForNativeEvent(...)' / 'AddNativeEventFilter(String asScriptName, String asEventName, int aiParameterIndex, String asFilter)' — instead of one bespoke Register/Unregister function pair PER event (which is what this same plugin's own 'Legacy' functions did before v18.0, e.g. RegisterForOnHitEvent/UnregisterForOnHitEvent/IsRegisteredForOnHitEvent/GetOnHitEventRegistrations, kept only for backward compatibility). The generic form scales to dozens of native events without the API surface growing linearly, and the filter mechanism (aiParameterIndex + asFilter, matched against a specific parameter of the event callback by index) lets a script subscribe to a NARROW slice of a high-frequency event (e.g. only OnHitEvent where the target is one specific FormID) rather than firing on every occurrence game-wide and filtering in Papyrus after the fact — real callbacks are dispatched as 'Function <EventName>(...) global' with no 'Extends' clause (a bare global function on a Native Hidden script), called directly by the plugin's C++ code rather than through the normal Quest/Alias/Fragment event system.",
    realSaveGameHygieneDesignChoice: "A real, deliberate design decision worth noting for anyone building a similar F4SE-plugin-facing Papyrus API: event registrations are kept only in game memory, NOT written into the save file, and are automatically cleared right before the vanilla 'OnPlayerLoadGame' event fires — any script that needs a native event must re-register inside its own 'Event Actor.OnPlayerLoadGame(Actor akSender)' handler. This avoids ever storing plugin-specific registration state inside a save (a real, common source of save-bloat and orphaned-script-instance bugs in heavily-scripted mods), at the cost of every consumer needing to remember to re-register on load — a real, considered tradeoff, not an oversight."
  },

  // === PACKAGING & PUBLISHING (BA2 / FOMOD / Nexus) ===
  // Verified against Bethesda's own BA2 documentation and the authoritative
  // FOMOD schema (github.com/GandaG/fomod-schema, tag 5.0) — not guessed.
  ba2Packaging: {
    overview: "BA2 has exactly two archive types: General (any file type — meshes, scripts, sounds, misc) and Texture (a specialized DDS-mipmap-streaming layout, textures only). Packing loose files into BA2 is strongly recommended: the engine reads one large archive far faster than thousands of tiny loose files, which measurably reduces stutter and load times.",

    whyTextureArchivesAreSpecial: "A texture BA2 does not store plain DDS files — it reorganizes each texture's mipmap chain so the streamer can seek directly to whichever mip level it needs (e.g. a lower-res mip for a distant object) without decompressing the whole file first. This is why you must use Archive2's Texture archive type for textures rather than dropping them in a General archive — a DDS file packed as 'General' loses this streaming benefit even though it technically still works.",

    archive2Tool: "Archive2.exe ships with the game at <FO4 install>/Tools/Archive2/. Command-line and GUI both work; the GUI is simplest for one-off packing (select folder → set archive type General or Textures → Create Archive).",

    practicalRules: [
      "Never mix loose files and a BA2 covering the same paths for the same mod — the engine's load order between loose/BA2 can behave unexpectedly; pick one per mod",
      "Keep a mod's main content in one General BA2 and textures in a separate Texture BA2 — this is Bethesda's own convention (see Fallout4 - Main.ba2 vs Fallout4 - Textures1.ba2 etc.)",
      "BA2 filenames must follow <PluginName> - <Suffix>.ba2 exactly (matching your ESP/ESM/ESL's name) for the game to auto-load them — a mismatched name means the archive is silently ignored",
      "Test the packed BA2 in-game before uploading — a broken archive (wrong type, bad path casing) fails silently rather than erroring loudly"
    ]
  },

  fomodPackaging: {
    overview: "FOMOD (Fallout Mod) is the installer format read by Mod Organizer 2 and Vortex — an archive containing a fomod/ subfolder with two XML files: info.xml (metadata: name, author, version, description) and ModuleConfig.xml (the actual install logic: steps, choices, conditional file installs).",

    moduleConfigStructure: {
      topLevelOrder: "config → moduleName, moduleImage (optional), moduleDependencies (optional), requiredInstallFiles (optional — always-installed files), installSteps (optional), conditionalFileInstalls (optional) — verified against the real ModuleConfig.xsd schema, elements must appear in exactly this order.",
      installStepsNesting: "installSteps → installStep (name, optional visible-condition) → optionalFileGroups → group (name, type) → plugins → plugin (name, description, image, conditionFlags, files) — each plugin is one selectable choice the user sees on that install page.",
      groupTypes: [
        "SelectExactlyOne — radio buttons, exactly one choice required",
        "SelectAtMostOne — radio buttons, choice is optional (or a built-in 'none' option)",
        "SelectAtLeastOne — checkboxes, at least one must be checked",
        "SelectAny — checkboxes, any number including zero",
        "SelectAll — every plugin in the group is force-installed (used to just show information, not really a choice)"
      ],
      pluginTypeValues: "Required | Optional | Recommended | NotUsable | CouldBeUsable — a plugin's type can also be computed dynamically via dependencyType (a defaultType plus a list of dependency patterns evaluated in order against the user's existing installed files/flags)."
    },

    commonMistakes: [
      "Forgetting requiredInstallFiles for assets every install path needs (textures/meshes shared across all options) — these silently never install if only referenced inside optional groups the user didn't pick",
      "Using SelectExactlyOne when the real intent is SelectAtMostOne (forcing a choice when 'none of these' should be valid)",
      "Case-sensitive path mismatches between the FOMOD's internal file paths and the actual archive folder structure — Windows is forgiving about case, but MO2/Vortex's FOMOD installer is not always"
    ]
  },

  nexusPublishing: {
    checklistBeforeUpload: [
      "Run 'Check for Errors' in xEdit — flag and fix any ITM (Identical To Master) or UDR (undeleted/disabled reference) issues",
      "Confirm the plugin is flagged the correct type — see eslFlagging above for the exact record/FormID limits and the CELL/WRLD precombine trade-off, don't estimate",
      "Pack assets into BA2 (see ba2Packaging above) rather than shipping loose files, unless the mod is specifically meant to be user-editable loose (e.g. a simple INI tweak)",
      "Include a real, tested FOMOD if the mod has install options — an untested FOMOD that silently fails to install required files is one of the most common 'mod doesn't work' bug reports",
      "Write clear requirements and load-order notes in the mod page description — most compatibility support requests are preventable with an upfront requirements list",
      "Set explicit permissions (can others reupload/patch/translate your mod) rather than leaving Nexus defaults ambiguous"
    ],
    versioningNote: "Bump the mod's version on every meaningful re-upload and note what changed — MO2/Vortex both track installed version, and users troubleshooting an issue need to know if they're on the latest build before you can rule out 'already fixed in a newer version.'"
  },

  bodyslideOutfitStudio: {
    overview: "BodySlide generates the actual in-game mesh from a base body/outfit shape blended by user-adjustable sliders. Outfit Studio is the companion editor for building/conforming NEW outfit projects (fitting a custom mesh to a body shape) rather than just building existing ones.",

    workflow: [
      "In BodySlide: pick the outfit/body from the Group/Outfit filter dropdown, adjust sliders, hit Build (single outfit) or Batch Build (apply current preset to every BodySlide-compatible outfit installed) — Batch Build is what most users run after installing a new body preset so all their armor mods match",
      "In Outfit Studio: load a reference shape (the base body the outfit should conform to) and the new outfit mesh, use the brush/mask tools to conform the outfit to the body's sliders, then save as a new BodySlide project (.osp)"
    ],

    zapSliders: "Zaps show as checkboxes in BodySlide and as sliders in Outfit Studio. A zap removes a predefined mesh part during Build — this is how one outfit project offers 'toggle the hood off,' 'remove the left glove,' etc. as user choices, and is also how a mod hides body-mesh parts under armor to prevent clipping.",

    morphsForInGameSliders: "Building 'morphs' (a BodySlide output option) is required if you want in-game body sliders via LooksMenu or similar — without building morphs, BodySlide only produces the one static mesh for the currently-set slider values, not a live-adjustable in-game body.",

    moddingNote: "A new outfit needs a working BodySlide project (referencing your ARMA's NIF as the output path) for end users to rebuild it against their own body preset — shipping a single pre-built mesh without a BodySlide project means the outfit won't match whatever custom body shape the user has installed."
  },

  questPerkFragments: {
    overview: "Fragments are Creation Kit's auto-generated Papyrus scripts attached directly to a specific quest stage, perk entry, scene action, or dialogue response — Bethesda's own docs describe them as Papyrus's equivalent of the older 'Result Script' concept from earlier engine versions. You write the fragment's body inline in the CK's script editor; the CK compiles it into a hidden auto-named script (pattern: QF_<questEditorID>_<formID> for quests, similarly for perks/scenes/topics) attached via VMAD.",

    fragmentTypes: [
      "Quest Stage Fragments — run when a specific quest stage is set; use Script kmyQuest for quest-scoped access",
      "Perk Entry Fragments — run when a perk's entry point fires; exposes Actor akActor (the actor who has the perk) and ObjectReference akTargetRef (the activated object, empty for pure value/stat perk entries)",
      "Scene Action Fragments — run at a specific point in a Scene's phase/action (see the Scene System section above)",
      "Topic Info Fragments — run when a specific dialogue INFO plays, for one-off scripted reactions to a single line without needing a full separate quest script"
    ],

    criticalRule: "Never store a reference to a fragment script in a property or variable on another script. Fragment script instances are not kept alive by the engine for memory reasons — holding a reference to one and using it later produces undefined/broken behavior. The compiler marks fragment-derived scripts const specifically to help catch this, but casting to a base class can bypass that protection, so treat it as a hard rule, not just a compiler suggestion.",

    practicalNote: "Fragments are the right tool for small, one-off reactive logic tied to a specific stage/entry/line. For anything reused across multiple stages or that needs to persist state, write a real named script and attach it normally instead — fragments existing 'automatically' doesn't mean they're the right tool for everything."
  },

  // === VISUAL FIDELITY UPGRADE ROADMAP ===
  // What real, named community tools/techniques can actually push FO4's look
  // forward, phased by effort/impact. Cross-references engineInternalSystems
  // above for the hard boundary — this section is deliberately "what you CAN
  // do with real tools," not a wishlist of engine features FO4 doesn't have.
  visualFidelityRoadmap: {
    overview: "Fallout 4's Creation Engine cannot get true hardware ray tracing, Nanite-style mesh streaming, or Lumen-style GI (see engineInternalSystems above — that's compiled renderer code). Every technique below approximates the *look* of a modern renderer using real, well-established community tools, not by changing the engine itself.",

    phase1_renderingStack: [
      "A modern ENB preset (post-processing binary that hooks the DX11 renderer) — adds pseudo-GI via ambient/directional light tricks, SSAO, bloom, filmic tonemapping, depth of field",
      "ReShade RTGI (Pascal Gilcher's shader, often paired with an ENB like RUDY ENB) — a screen-space approximation of ray-traced bounce lighting; genuinely improves indirect lighting feel but is NOT hardware ray tracing and has real screen-space limitations (can't reason about geometry off-screen)",
      "Custom color grading / LUTs — cheap, high-impact for matching a specific cinematic tone"
    ],

    phase2_assetReplacement: [
      "4K/8K texture replacers for hero assets (diffuse/normal/specular) — biggest visible win per hour invested, but budget VRAM: FO4's engine has real per-cell texture-memory limits, so blanket 8K on every asset in a busy exterior cell can cause streaming stutter",
      "Higher-poly mesh replacers with better topology/UVs improve shading response (better normal-map results) even without raising the polycount ceiling most players will notice",
      "Parallax/POM-capable materials (real, supported via BGSM shader flags) approximate displacement without needing tessellation hardware support",
      "Higher-res landscape textures + better heightmap blending for terrain"
    ],

    phase3_lodAndPrecombine: [
      "Regenerating precombines/previs after any exterior mesh swap is not optional polish — it's required correctness (see previsSystem section above); skipping it after a mesh replacer causes visible seams/z-fighting, not just a performance loss",
      "xLODGen for object + terrain LOD regeneration — this plus precombine/previs is the closest FO4 gets to a UE5 World Partition-style 'everything renders efficiently at distance' result, but it's an offline bake step per-worldspace, not a runtime streaming system"
    ],

    phase4_lightingWeather: [
      "A weather/climate overhaul (e.g. NAC-style, True Storms-style — real, well-known community categories of mod) edits CLMT/WTHR data and adds volumetric-looking fog/god-ray effects via particle systems and ENB weather-specific parameters",
      "Interior lighting template replacers for more contrast/bounce-like fill — this is real light placement and IMAD (image space adjustment) tuning, not a new lighting model"
    ],

    phase5_animationCreatures: [
      "New/expanded creature skeletons (more bones) genuinely improve motion quality — this is real, supported modding (see nifSpecs above for the skeleton/rigging pipeline)",
      "New HKX animations for locomotion/attack chains — real Havok-compiled animation data you can author and swap in; the underlying Havok Behavior state-machine engine itself stays fixed (see engineInternalSystems), but the clips it plays are fully moddable",
      "Tuning existing behavior-graph parameters (transition blending, response time) can make AI feel more responsive without touching the compiled state machine itself"
    ],

    phase6_audio: [
      "Region-based ambient soundscape replacement (real SNDR/region-linked audio, see weatherSystem/sound catalog above) — genuinely as impactful as visuals for perceived 'next-gen' feel and often underinvested in by visual-focused overhaul mods",
      "Reverb zones (real ASPC acoustic-space records, now part of this app's scan) make interiors feel physically real",
      "Weapon/explosion sound replacement — real SNDR/SOUN data, straightforward to mod"
    ],

    phase7_aiDialogue: "AI-generated companion/NPC voice, dynamic dialogue, and improved lip-sync/facial animation is the newest and least standardized category — treat any specific claimed pipeline here skeptically and verify against the actual tool's current documentation rather than assuming a technique that worked a year ago still matches the tool's current version."
  },

  // === HIGH-POLY → GAME-READY MESH PIPELINE ===
  // Full asset pipeline from sculpt to in-game. Two claims from an earlier
  // draft of this section were verified WRONG and corrected here rather than
  // silently accepted: (1) FO4 requires BSTriShape, NOT the legacy NiTriShape
  // block some older guides reference — NiTriShape/NiTriShapeData were
  // replaced starting with FO4's NIF version (matches nifSpecs above).
  // (2) "UCX_" collision naming is an Unreal Engine convention that does not
  // apply to FO4 — FO4 collision is defined via bhkCollisionObject/bhkRigidBody
  // blocks inside the NIF itself (via NifSkope or a BGS-exporter-aware DCC
  // tool), not through a filename prefix.
  meshPipeline: {
    sculptModel: {
      tools: "Blender (primary), ZBrush (optional, mainly for creature/organic sculpting), Substance Painter or ArmorPaint for texturing.",
      topologyRules: [
        "Keep quads through the modeling stage; only triangulate at final export",
        "Avoid long thin triangles — they shade poorly and can cause skinning artifacts",
        "Keep smoothing groups/shading consistent across a surface",
        "Only add hard edges where the material actually changes or the silhouette needs it"
      ]
    },

    retopology: {
      targetPolycounts: {
        creatures: "20,000–45,000 tris",
        weapons: "8,000–25,000 tris",
        props: "500–5,000 tris",
        architecture: "1,000–15,000 tris"
      },
      note: "These are practical budgets, not hard engine limits — treat them as 'stay near this unless you have a specific reason' guidance for a hero/mid-tier asset, not a wall you can never cross."
    },

    uvUnwrap: [
      "Single UV set for standard game objects",
      "No overlapping UVs unless deliberately mirrored (e.g. symmetric armor halves)",
      "Stay within 0–1 UV space",
      "Target texel density roughly 512–1024 px/meter for a typical world object — hero/close-up items can go higher"
    ],

    textureBakingAndMaterial: {
      bakeMaps: "Normal, AO, curvature, height, and roughness (roughness must be converted to FO4's spec/gloss convention — FO4 materials are NOT a modern glTF-style metal/roughness workflow)",
      bgsmConversion: "Convert baked maps into a real BGSM: Diffuse, Normal, Specular/Gloss, optional Parallax, optional Environment Mask. Use Bethesda's Material Editor or Cathedral Assets Optimizer to build the actual binary BGSM (this app also has a real binary BGSM writer built during this session's audit — see BGSMEditor.tsx)."
    },

    collisionPipeline: {
      overview: "FO4 collision is Havok-based and lives INSIDE the NIF as bhkCollisionObject → bhkRigidBody → a shape block (bhkBoxShape for simple primitives, bhkConvexVerticesShape for a convex hull, bhkMoppBvTreeShape for complex/concave geometry) — there is no special filename-prefix convention like Unreal's UCX_.",
      rules: [
        "Prefer simple convex shapes over complex ones — cheaper at runtime and less prone to physics glitches",
        "A concave collision requirement should be split into multiple convex hulls rather than one complex concave shape",
        "Collision authored as a separate mesh object during modeling should be triangulated, have no modifiers, and doesn't need UVs before being converted to a Havok shape"
      ]
    },

    nifExport: {
      requiredBlocks: "BSFadeNode (root) → BSTriShape (mesh geometry — NOT the legacy NiTriShape) → BSLightingShaderProperty (material) → BSShaderTextureSet (texture paths) → bhkCollisionObject (if the object needs collision).",
      pipelines: [
        "Blender with a current Niftools/PyNifly FO4-aware export branch, directly to .nif",
        "Blender → FBX → Outfit Studio → NIF (common for outfit/armor work specifically, since Outfit Studio's conforming tools expect this path)"
      ],
      skeletonRequirements: {
        creatures: "FO4 skeleton.nif with exact vanilla bone names — extra bones require also patching the relevant behavior graph, they don't 'just work'",
        weapons: "WeaponRoot, the weapon's own bone, muzzle node(s) for muzzle-flash/projectile-origin alignment, and a scope node if the weapon supports scope attachments (aligns the scope-view camera/reticle)",
        armor: "FO4 human skeleton, with correct body-slot partitions AND the correct numeric slot assignment so the armor occupies the right equip slot and doesn't z-fight or silently fail to equip alongside other worn items"
      }
    }
  },

  lodPipeline: {
    terrainLOD: "Use xLODGen with high-res diffuse/normal maps and (if changed) a custom heightmap. 2K–4K terrain LOD textures are a reasonable target for a modern-looking distant landscape without excessive VRAM cost.",
    objectLOD: "Separate low-poly LOD meshes, LOD textures (typically baked diffuse only — LOD materials don't need the full BGSM texture set), and their own lightweight LOD-tier BGSM.",
    precombines: "Regenerate with the Creation Kit's own precombine tooling (or community tooling built around it) using your final, optimized meshes — avoid loose/ungrouped objects in a precombine-covered area, and see previsSystem above for why this is required correctness, not optional polish. Precombine ONLY merges static geometry into fewer draw calls — it does not bake lighting; FO4 has no lightmap system, all lighting stays fully dynamic regardless of precombine state.",
    previs: "A separate system from precombine: previs precomputes VISIBILITY (which geometry can be seen from which points, for occlusion culling), again with no lighting component. Regenerate previs (previsibines) after any precombine-affecting change, respecting existing cell boundaries, and avoid placing transparent objects inside precombined groups (transparency + precombine occlusion has known visual-glitch interactions).",

    lodClipVolumes: "LODClipVolume is a real CK object type distinct from LOD meshes themselves — a bounding volume that defines the boundary within which a cell's object LOD gets generated/culled. Verified from real, documented production failures (this exact issue caused save corruption in one of the largest DLC-sized community total-conversion mods, requiring a full LOD rework + previs/precombine regeneration to fix post-release): if a cell contains large static collections (SCOL) or big custom geometry and the LODClipVolume covering that cell WASN'T sized/extended to match, the mismatch causes CTDs and — worse than a simple visual bug — can corrupt saves made in the affected area. This is a real, production-proven failure mode specifically for LARGE custom worldspaces with big set-piece geometry (cathedrals, large industrial structures, etc.), not a theoretical edge case.",
    lodClipVolumeModdingImplication: "When building a new worldspace with unusually large static objects/collections in a cell, explicitly check that cell's LODClipVolume extends to actually contain that geometry — don't assume the default/inherited volume is sufficient just because smaller-scale worldspaces never surfaced the problem. This is exactly the kind of issue that survives testing on a small team (per the real case above, a mod tested by ~20 people missed this before a public release with a much larger, more varied player base found it) — treat 'large geometry in one cell' as a specific trigger to double-check LODClipVolume sizing, not just object/terrain LOD regeneration in general."
  },

  // === VEGETATION / FOLIAGE-SPECIFIC MODDING (verified — forest/grass overhauls hit precombine differently than any other asset type) ===
  vegetationAndFoliageSystem: {
    windAnimationVanillaBug: "CORRECTED with the precise real mechanism (verified directly from Flutter Flicker Fixer For Foliage's own technical description — this refines an earlier, vaguer 'wind data error' description): the actual root cause is that the Creation Kit's own SCOL (static collection)/precombine mesh-baking process does NOT preserve BSLeafAnimNode (the NIF block type driving procedural wind sway on a tree/plant) as the TOP NODE of the resulting combined mesh when a wind-animated object is included in a static collection. With that node no longer at the top of the structure, the engine's TAA (Temporal Anti-Aliasing) tries to smooth what it reads as sudden, erratic branch movement, producing the visible blur/flutter artifact. The real fix is restoring BSLeafAnimNode to the top of the affected SCOL meshes — this is YET ANOTHER concrete, real, CK-tooling-level bug tied directly to precombine/SCOL generation specifically (not a general rendering issue), reinforcing the recurring theme elsewhere in this knowledge base that precombine's mesh-combining step introduces its own class of subtle bugs beyond the more commonly-known 'breaks when you move an object' failure mode. Anyone building new foliage assets destined for a precombined/SCOL-heavy area should check final combined meshes in NifSkope for BSLeafAnimNode's position in the block hierarchy if flutter/blur artifacts appear, rather than assuming it's a texture or animation-authoring mistake.",
    grassDensityControlReal: "Grass density is genuinely tunable via a dedicated performance-focused ini (verified real pattern from a mature grass-overhaul mod: a separate, plain-text ini specifically for foliage density, distinct from Fallout4.ini/Fallout4Custom.ini) — this is the standard way a vegetation mod lets users trade visual density for performance without needing to touch the CK or recompile anything, matching the same 'ship a tunable config file' philosophy documented for MCM/config-holotapes elsewhere in this knowledge base, just foliage-specific.",
    seasonalGrassAppearanceRealTechnique: "Real, verified technique for making grass visually CYCLE through seasons (from the same real 'functional dynamic seasons' mod referenced under weatherSystem's dynamicSeasonalWeatherRealTechnique above): a landscape texture's grass list is ordered by index, with progressively DEADER grass placed at lower indexes and progressively GREENER grass at higher indexes — the mod then limits how many of those indexed grass types are actually allowed to display (via an MCM-exposed setting), so raising/lowering that limit shifts the visible mix from mostly-dead to mostly-green. This is a genuinely clever, real technique for season-like grass variation using only ordinary landscape-texture-record authoring plus one runtime-tunable count, not a bespoke new rendering feature.",
    denseVegetationVsPrecombine: "A dense forest/vegetation overhaul (adding new static tree/plant objects across many vanilla cells world-wide) hits precombine differently than a settlement-scrapping mod: see bUseCombinedObjectsGlobalEscapeHatch under previsSystem above for the real INI-level global escape hatch this class of mod specifically needs (and its real, severe FPS cost), as distinct from Scrap Everything-style mods that disable precombine only for specific settlement cells via their own plugin."
  },

  hkxAnimationPipeline: {
    rigging: "Use the real FO4 skeleton; Blender's Rigify can help build the control rig for animating, but exported bone names must exactly match FO4's skeleton — the game does not fuzzy-match bone names. Weight paint cleanly — no stray near-zero weights on unintended bones; they're a common source of subtle mesh-warping bugs that only show up during certain animation poses.",
    animating: "Standard animation set for a creature/NPC: idle, walk, run, sprint, attack (often multiple variants), hit reactions, death, and any special/unique behaviors (roar, leap, burrow, etc. for creatures). Weapons additionally need a reload animation. Keep root motion minimal unless you're specifically building a root-motion-driven behavior, and avoid scale keyframes entirely — the engine does not handle animated scale reliably.",
    export: "Bake transforms and export to FBX (the FO4 pipeline standardized on the FBX 2015 format), exporting ONLY deform bones — no IK control bones or constraints baked into the export, since those aren't part of the game's runtime skeleton and can introduce drift.",
    fbxToHkx: "Havok Content Tools (the 2014 build is the one the FO4 modding community standardized on) or the hkxcmd command-line tool convert FBX animation to the HKX format the engine actually loads. Name outputs to match their behavior-graph role (e.g. idle.hkx, walk.hkx, run.hkx, attackA.hkx, attackB.hkx, death.hkx) so they're easy to wire up in the next step.",
    behaviorGraphIntegration: "New animations still need behavior-graph wiring in the FO4 Behavior Editor (new states, transitions, animation events, blend trees) before the engine will ever play them in response to gameplay — an HKX file sitting in the Data folder unused by any graph does nothing. Creatures typically need separate locomotion, attack, idle, and death graphs.",
    testing: "In Creation Kit: preview the animation, collision, and lighting on the actual asset, then spawn the actor in a test cell and validate its AI packages actually select the new behavior correctly (a new animation with no package routing to it will simply never play in normal gameplay). In-game: coc <cell>, tfc 1 (free camera), tai (toggle AI), tcai (toggle combat AI), sucsm 1 (free camera movement speed) are the standard console commands for isolating and inspecting a new animation without other actors/AI interfering."
  },

  // === NEW CREATURE CREATION WORKFLOW (verified: Race.psc is a bare native Form — confirms creature setup is pure CK data-authoring, no scripting required for the basics) ===
  // hkxAnimationPipeline above covers the ANIMATION half; this covers the RECORD half — Race,
  // Subgraph Data, and combat eligibility — that a new hostile creature actually needs.
  creatureCreationWorkflow: {
    raceRecordIsTheHub: "A creature's Race record (verified bare/native — Race.psc declares no functions, confirming this is pure data authoring, not scripting) is where its Subgraph Data lives — this is the field that assigns which behavior graph (.hkx) an actor of this race/sex actually uses. An ActorBase's Race determines its whole behavioral/animation foundation; you cannot mix-and-match a behavior graph onto an unrelated race at the ActorBase level.",
    additiveRaceConvention: "Standard practice (verified) is to create a NEW Race marked 'additive' to an existing one rather than editing a vanilla Race directly — this is the same non-destructive-addition philosophy as leveled lists/keyword injection elsewhere in this knowledge base, and exists specifically so multiple creature mods extending the same base race don't conflict by each overwriting the same vanilla Race record.",
    lightweightRaceReuseAlternative: "A real, lighter-weight alternative to the full creature-creation workflow below, used by real shipped mods: rather than building a brand-new Race + Subgraph Data + Combat Style + Attack Data from scratch, an ActorBase can simply be RECLASSIFIED onto an EXISTING vanilla Race/behavior-graph combination (verified real example: a mod converting various small creatures/insects to use the Feral Ghoul race so they inherit its entire combat AI, animation set, and Attack Data for free). This trades creative uniqueness (the reclassified creature now moves/attacks exactly like whatever race it borrowed) for a massive reduction in effort — genuinely appropriate when the goal is 'make this existing creature type tougher/more numerous/reskinned' rather than 'build something that behaves in a genuinely new way,' and a much smaller project than the full workflow below when full uniqueness isn't the actual goal.",
    combatEligibility: "The 'Non-Hostile' flag on an actor determines whether it can enter combat at all — a new creature that never fights no matter what Combat Style/AI packages it has almost always means this flag, not a deeper AI bug. Actor Attack Data (tied to specific animation attack EVENTS, not just any animation) is what actually connects a creature's attack animations to real combat damage — an attack animation with no matching Attack Data plays but deals no damage. This is a REAL, confirmed failure mode even in Bethesda's own shipped content, not just a theoretical modder mistake: documented vanilla examples include Deathclaw melee attacks defined in the Creation Kit that never actually trigger in-game, and a Deathclaw dirt-throwing attack where the animation and visual effect play but no actual projectile is generated — both are exactly the 'animation event with no correctly-linked Attack Data/projectile spawn' gap described above, present in the base game itself. If a new creature's attack animation plays but deals no damage, checking Attack Data linkage first (before assuming a scripting or AI bug) is standard practice precisely because this happens to official content too.",
    moddingWorkflow: [
      "Model/rig/animate the creature (see meshPipeline/hkxAnimationPipeline above) — creatures typically need their own locomotion, attack, idle, and death behavior graphs rather than reusing a humanoid one",
      "Create an additive Race (not an edit of a vanilla one) and assign its Subgraph Data to the new behavior graph",
      "Create the ActorBase: assign the new Race, a Combat Style (see combatAISystem above for what this actually controls), AI Packages (or a schedule — see aiPackageSystemDeep above), and confirm 'Non-Hostile' is NOT set if this creature should fight",
      "Set up Actor Attack Data linking attack animation events to actual damage/effects — this is a separate step from the animation existing at all",
      "Add the creature to an Encounter Zone (see encounterZoneSystem above) and/or leveled actor list if it should spawn as part of normal world population rather than only via hand-placed instances",
      "Test in a controlled cell first (coc <testcell>, tcai/tai to isolate behavior) before placing in the open world — a creature with a subtly wrong Subgraph/Combat Style assignment tends to look fine standing still and only reveals problems once combat actually starts"
    ]
  },

  // === QUEST CREATION WORKFLOW (verified: real Quest.psc API list, ~30 native functions confirmed from source) ===
  // This is the foundational layer questAliasSystem/questPerkFragments build on top of — how a
  // brand-new quest's stage/objective/log-entry structure actually works, not just the alias/fragment
  // mechanisms that plug into it.
  questCreationWorkflow: {
    stageNumberingConvention: "Quest Stages are numbered integers, conventionally spaced by 10 (10, 20, 30...) — NOT because the engine requires it, but because it leaves room to insert 15, 25, etc. later for a bugfix/branch without renumbering every later stage. Each stage can carry one or more Log Entries (the journal text shown in the Pip-Boy quest log when that stage is set) and can be linked to an Objective Index (the short on-screen tracker text, e.g. 'Find the missing settler') — setting a stage automatically shows the log entry and can automatically display the linked objective, or a script can call SetObjectiveDisplayed independently if the same objective should appear from more than one stage.",
    realVerifiedQuestAPI: [
      "bool Function SetStage(int aiStage) — advances the quest to a stage, runs that stage's Log Entry/Objective display, and fires OnStageSet(auiStageID, auiItemID) plus any attached Stage Fragment in parallel",
      "int Function GetStage() / int Function GetCurrentStageID() / bool Function GetStageDone(int) / bool Function IsStageDone(int) native — reading current/past progress, used constantly in condition checks (CTDA GetStageDone) elsewhere in the game's dialogue/perk/package conditions",
      "Function SetObjectiveDisplayed(int aiObjective, bool abDisplayed = true, bool abForce = false) native / SetObjectiveCompleted(int, bool) native / SetObjectiveFailed(int, bool) native / bool Function IsObjectiveCompleted(int) native — independent objective-state control beyond what stage-linkage alone gives you",
      "Function CompleteAllObjectives() native / Function CompleteQuest() native / Function FailAllObjectives() native — end-of-quest bulk operations",
      "bool Function Start() native / Function Stop() native / Function SetActive(bool) native / bool Function IsRunning() / IsStarting() / IsStopping() / IsStopped() native — the quest's own run-state, distinct from stage progress (a quest can be Active/Running with no stage set yet, or Stopped while still 'completed')",
      "Event OnQuestInit() — fires once aliases are filled and the quest is about to run its startup stage; Event OnStageSet(int auiStageID, int auiItemID) — fires in parallel with a stage's fragment, useful for a non-fragment script that still needs to react to stage changes"
    ],
    storyManagerEventsNote: "Quest.psc also declares a large family of OnStory* events (OnStoryActivateActor, OnStoryAssaultActor, OnStoryCraftItem, OnStoryChangeLocation, etc.) — these are how Radiant/Story-Manager-driven quests react to broad categories of player action without polling, the same underlying mechanism referenced by the companion system's Affinity Events and Automatron's robot-related quest hooks documented elsewhere in this knowledge base.",

    eventDrivenCrossModQuestCoordination: "Real, verified, more sophisticated alternative to polling GetStageDone() for cross-mod compatibility (found in a real production patch bridging two large, independently-developed mods — a Sim Settlements 2 chapter quest and a companion mod): a script extending Quest can subscribe to ANOTHER quest's stage changes directly via 'RegisterForRemoteEvent(OtherQuest, \"OnStageSet\")', then handle 'Event Quest.OnStageSet(Quest akSender, int aiStage, int aiItem)' (note the real remote-handler signature: the sending Quest is passed as the first parameter, unlike the local/non-remote OnStageSet(int auiStageID, int auiItemID) form documented elsewhere in this knowledge base) — call 'UnregisterForRemoteEvent(akSender, \"OnStageSet\")' once no longer needed. The real verified pattern combines BOTH approaches for robustness: register for the event as the primary trigger, but ALSO check 'OtherQuest.GetStageDone(N)' once in OnInit to catch the case where the target quest already finished before this script ever loaded, and fall back to a StartTimer-based retry loop if the target quest isn't in the right state yet (checking 'TargetQuest.IsRunning()' before assuming it's safe to act on) — this three-layer approach (event + already-done check + timed retry) is why professional cross-mod compatibility patches feel instant rather than laggy/polling-based.",
    realVerifiedSelfCleaningTriggerPattern: "Real, minimal pattern for a one-shot compatibility/story trigger, verified from two independent shipped compatibility patches: a script extending ObjectReference on a placed trigger box, 'Event OnTriggerEnter(ObjectReference akActionRef)' checking another quest's real stage/state (e.g. 'HijackedQuest.GetStage() == HijackedStage'), optionally showing a player choice via a real Message Property's 'Show()' function (returns the int index of whichever button the player picked, so 'If eXoHijackCheckMessage.Show() == 0' branches on the first button), then calling 'Delete()' on itself at the end of the event regardless of which branch ran — a real, simple self-cleanup idiom for a trigger that should only ever fire once, avoiding needing a separate 'already triggered' bool property.",
    vanillaQuestStagesAreADeFactoPublicAPI: "Real, verified lesson from mature alternate-start mods (which need to skip or bypass the vanilla Vault 111 intro sequence): vanilla main-quest stages (e.g. MQ102 'Out of Time') aren't just internal bookkeeping for that one quest — OTHER mods commonly gate their own compatibility logic on GetStageDone(MQ102, X)-style condition checks (e.g. 'give the player a starting item once the player has left the vault,' checked via that exact vanilla stage). A mod that skips the intro by simply teleporting the player into the world WITHOUT explicitly setting every relevant vanilla quest stage the normal playthrough would have set breaks compatibility with any OTHER mod relying on those stages as a signal — even though the skipping mod's own quest logic works perfectly fine. Real alternate-start mods explicitly force-set the full relevant MQ101/MQ102 stage sequence (not just jump to a single 'done' stage) specifically for this reason, and some (documented real example) deliberately wait ~20 seconds before doing so to avoid overloading systems that expect the normal, slower intro pacing rather than everything initializing at once. The general lesson: treat any vanilla quest stage other content might reasonably condition on as a de facto public API — bypassing the quest that sets it without replicating its side effects is a real, non-obvious compatibility risk, not just an internal implementation detail of the quest you're skipping.",
    moddingWorkflow: [
      "Sketch the stage outline FIRST on paper/notes (10=start, 20=first objective found, 30=complicating event, ...90=fail state, 100=success) before opening the CK — retrofitting stage numbers after scripting/dialogue is already wired to them is far more error-prone than planning the skeleton up front",
      "Add a Log Entry to every stage a player could realistically reach, even 'dead end'/failure stages — a stage with no log entry silently shows nothing in the journal, which reads as a bug to players even when the quest logic is working correctly",
      "Use Objective linkage for the 2-5 stages that represent real player-facing goals, not every single stage — over-using objectives clutters the quest tracker; use SetStage alone (no objective) for internal bookkeeping stages",
      "Attach Quest Aliases (see questAliasSystem below) for anything the quest needs to reference — an NPC, a location, an item — rather than hardcoding a FormID reference in a fragment, so the same quest logic can be reused/instanced correctly",
      "Test by using the console's own setstage/getstage (see consoleCommands above) to jump directly to specific stages during development, rather than always replaying from the start"
    ],

    realFragmentScriptFormats: {
      overview: "Verified directly against a shipped, popular DLC-scale quest mod's own real source (Fusion City Rising, which ships full .psc for every CK-generated fragment under Scripts/Source/User/Fragments/) — this is exactly what Creation Kit itself writes when you type fragment code into the Stage Wizard, Terminal menu-item editor, or a dialogue Response's script box, not an approximation.",
      namingAndStructure: "Every fragment script uses a NAMESPACED Scriptname matching its folder — Fragments:Quests:QF_<QuestEditorID>_<FormIDHex>, Fragments:Terminals:TERM_<TerminalEditorID>_<FormIDHex>, Fragments:TopicInfos:TIF_<QuestEditorID>_<InfoFormIDHex> — extends the relevant type with 'Hidden Const' (not just Hidden), and wraps the whole auto-generated region in literal ';BEGIN FRAGMENT CODE - Do not edit anything between this and the end comment' / ';END FRAGMENT CODE...' comments, with each individual function further wrapped in its own ';BEGIN FRAGMENT <name>' / ';END FRAGMENT' pair. Properties are declared AFTER the fragment functions, not before. The FormIDHex suffix is only known once xEdit/CK has actually created the record — a modder (or an AI generating scripts before the ESP exists) cannot predict it, which is why hand-written scripts commonly skip the namespaced convention and just use a plain Scriptname on a script extending Quest directly with OnStageSet instead — both are real, valid; the namespaced form is what CK itself produces once you've opened the finished ESP and wired stages through its own wizards.",
      realQuestStageFragmentExample: "Function Fragment_Stage_0010_Item_00() { ClubFusionArrivalScene.Start(); ClubFusionMapMarkerREF.Enable(); } — properties Scene Property ClubFusionArrivalScene Auto Const and ObjectReference Property ClubFusionMapMarkerREF Auto Const declared below it. Confirms Scenes and plain ObjectReferences are the two most common things a stage fragment manipulates, not just quest-internal state.",
      terminalMenuItemScripting: "The REAL mechanism for 'run code when a specific terminal menu option is selected' is a script extending Terminal (not ObjectReference) with one Function Fragment_Terminal_NN(ObjectReference akTerminalRef) per menu item that has code attached, all inside one Fragments:Terminals:TERM_... file for that terminal. A real verified example toggles two other placed references' open/closed state and adjusts their radio volume: Fragment_Terminal_01 through Fragment_Terminal_05, each taking the same akTerminalRef parameter and operating on ObjectReference Properties declared once at the bottom of the file.",
      dialogueResponseScripting: "An INFO (dialogue response) with script content compiles to Fragments:TopicInfos:TIF_<QuestEditorID>_<InfoFormIDHex> extends TopicInfo Hidden Const, with a Function Fragment_End(ObjectReference akSpeakerRef) — cast to Actor via 'Actor akSpeaker = akSpeakerRef as Actor' if actor-specific calls are needed. Real verified example calls SetStage on TWO different quests via two separate Quest Properties from inside one Fragment_End — confirming a single dialogue line's script can freely advance any quest it holds a property reference to, not just its own parent quest.",
      crossScriptStageAdvance: "The simplest real, verified way for ANY script (a trigger, a dialogue fragment, an unrelated quest) to advance a DIFFERENT quest is to declare a plain 'Quest Property TargetQuest Auto Const' and call 'TargetQuest.SetStage(N)' directly — SetStage is already public on Quest, no custom wrapper Function is needed. Real, complete, minimal example from the same mod (Scripts/Source/User/IT_SetStage.psc): a script extending ObjectReference, attached to an activator, that waits 40 seconds after the player activates it and then sets a completely different quest to stage 280 — nothing more than an OnActivate event, a Quest Property, and one SetStage call. Even a fragment referencing its OWN parent quest by Property (not just other quests) is real and common — verified in a second, independently-authored mod (Outcasts and Remnants) where a quest's own fragment holds a Quest Property pointing back to itself purely to call SetStage on itself to advance; the terminal stage of that same quest cleans up with CompleteQuest() then Reset() then Stop() called together.",
      crossValidatedAcrossTwoMods: "The namespaced Fragments:Quests: format above was independently confirmed in a SECOND, unrelated quest mod (Outcasts and Remnants — 909 shipped .psc files, a completely different author/team than Fusion City Rising) using the identical convention — this is universal Creation Kit behavior, not one author's personal style. That second mod also revealed two further real fragment types: Scene fragments (Extends Scene Hidden Const, functions named Fragment_Phase_NN_Begin()) and Package fragments (Extends Package Hidden Const, fires when that AI Package runs — though a Package fragment is commonly just Property references used in the Package's own Conditions, with no actual code body at all, since a Package doesn't require scripted logic to be useful).",
      autocastMechanism: "Real, verified CK mechanism (found in a Scene fragment) for letting fragment code read/write the OWNING quest's own custom script members, not just its base Quest-level API: 'GetOwningQuest()' returns the generic Quest type, so CK auto-generates a cast to the actual custom quest script class, wrapped in literal ';BEGIN AUTOCAST TYPE <CustomQuestScriptName>' / '<CustomQuestScriptName> localVar = GetOwningQuest() as <CustomQuestScriptName>' / ';END AUTOCAST' comments immediately before the fragment's real ';BEGIN CODE' block. This is how a Scene phase can flip a custom boolean/int the quest script itself declared (e.g. a real verified example sets 'kmyQuest.ArmReady = 1' from inside a Scene fragment) without that variable needing to be a full Quest Property.",
      realActorOnDeathExample: "Real, verified example of Event OnDeath(Actor akKiller) on a script extending Actor (Outcasts and Remnants, OAR_NZ_Death_Script.psc) driving an entire scripted sequence, not just cleanup: advances an unrelated quest via a Quest Property + SetStage, plays narration via a MusicType Property's Add() function, PlaceAtMe's an Explosion, MoveTo's the player to a destination ObjectReference, then Enables/Disables other placed references — confirms OnDeath is a legitimate hook for triggering a whole scripted moment (a companion's death triggering a cutscene-like beat), not merely loot/ragdoll handling.",
      authorOwnedNamespaces: "The Fragments: namespace isn't the only real reason a Papyrus Scriptname contains colons — mod authors also namespace their OWN (non-CK-generated) scripts this way to avoid collisions when patching or depending on other mods, verified in a real compatibility patch (Fourville Patch, Scripts/Source/User/eXo/Tales/MoveBobbleheadScript.psc): 'Scriptname eXo:Tales:MoveBobbleheadScript extends ObjectReference Const' — 'eXo' is the patch author's own personal namespace, 'Tales' names which mod (Tales from the Commonwealth) this specific compatibility script targets, matching the folder path Scripts/Source/User/eXo/Tales/. The script itself is a real, minimal, complete pattern for 'move object A to wherever object B currently is, but only if they're already in the same loaded cell': Event OnTriggerEnter(ObjectReference akActionRef) checking 'ObjectA.GetParentCell() == ObjectB.GetParentCell()' before calling MoveTo — a genuinely common cross-mod-compatibility technique (repositioning one mod's placed object to line up with another mod's, without needing to know the other mod's cell coordinates ahead of time). Note: two large, well-known finished mods checked for this same purpose (Point Lookout — 17,494 packed files; Fourville — 8,870 packed files) shipped ZERO loose .psc source, only compiled/archived scripts — not every popular mod is a useful reverse-engineering source, and that's fine; smaller compatibility patches and mods that deliberately ship editable source (like Fusion City Rising, Outcasts and Remnants) are the better targets.",
      reusableObjectiveGatedQuestStarter: "Real, verified, genuinely reusable 'quest launcher' utility script (Project Valkyrie, Scripts/Source/User/PV_QuestStartup.psc) — a small, generic script meant to be attached to ANY new quest to make it start only once a DIFFERENT prerequisite quest reaches a specific objective, without writing bespoke gating code per quest: 'Scriptname PV_QuestStartup extends Quest' with exactly three Properties (Quest Property QuestToWatch, Int Property RequiredQuestObjective, Int Property StageToSet). Function Startup() registers 'RegisterForRemoteEvent(Game.GetPlayer(), \"OnLocationChange\")' only if the gate isn't already satisfied; a StartupCheck() function checks 'QuestToWatch.IsObjectiveCompleted(RequiredQuestObjective)' and calls SetStage(StageToSet) on ITSELF once true. The real trick: it uses 'Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)' on the PLAYER as its recheck trigger instead of a timer — location changes fire naturally and frequently as the player moves between cells during normal play, making this a free, event-driven alternative to StartTimer-based polling for 'keep checking until some other quest's objective completes.' This complements the existing eventDrivenCrossModQuestCoordination pattern above (which watches a STAGE via OnStageSet) by watching an OBJECTIVE via IsObjectiveCompleted instead — useful when the exact stage number of the watched quest isn't known/stable but its objective index is.",
      realTripleModCrossQuestBridging: "Real, verified example of a SINGLE fragment script coordinating THREE independently-developed mods at once (Project Valkyrie, Scripts/Source/User/eXo/AR2/Fragments/Quests/QF_ValkyrieInstituteQu_040020A8.psc — the 'eXo' namespace here is the SAME real compatibility-patch author identity already confirmed elsewhere in this knowledge base via Fourville Patch's eXo:Tales:MoveBobbleheadScript, now cross-validated as a recurring, prolific real patch author whose naming convention shows up across multiple unrelated mods). This one fragment bridges Outcasts and Remnants (read via 'OAR_SinstituteLocation', 'AR_RQ03' Quest Property), America Rising 2 (written via 'AR_EnclaveFaction', 'AR_FuryCompanyFaction'), and Project Valkyrie's own companion (X7). Real functions confirmed in production use: 'Actor.RemoveFromFaction(Faction)' / 'Actor.AddToFaction(Faction)' to defect an NPC from one mod's faction to another mod's faction at runtime; 'Actor.SetGhost(bool)' to toggle invincibility on a specific NPC mid-questline; 'Faction.SetEnemy(Faction)' to declare two factions hostile to each other programmatically (a real, useful cross-mod-compatibility tool for 'make these two mods' factions fight' without CK-editing either mod's FACT record directly); gating a cross-mod SetStage call behind 'OtherModQuest.IsRunning()' so nothing happens if the target mod isn't even installed/active; and 'LocationAlias.ForceLocationTo(Location)' + 'ReferenceAlias.ForceRefTo(ObjectReference)' to redirect a quest's OWN aliases to point at a location/marker that belongs to a completely different mod — the real mechanism for making one mod's quest alias 'become' content defined in another mod's ESP, achieving deep integration without a hard master-file dependency beyond the quest itself. This is the single richest real example of cross-mod compatibility scripting found this session — a genuine template for how professional patch authors bridge three unrelated quest mods together with one fragment."
    }
  },

  // === QUEST ALIAS SYSTEM ===
  // The actual mechanism that makes quests reusable/radiant instead of
  // hand-wired to one specific NPC/location — foundational for any quest mod
  // beyond the simplest linear fetch-quest.
  questAliasSystem: {
    overview: "An Alias is a placeholder slot on a quest that gets filled with an actual reference, location, or object at runtime — this indirection is what lets one quest script work against 'whoever/wherever this quest currently points to' rather than a hardcoded FormID, and is the entire mechanism behind Radiant Quests (see aiPackageSystemDeep above).",

    referenceAlias: {
      description: "Fills with an actual object reference (an NPC, a container, an activator, etc.). Scripts attached to a Reference Alias must extend ReferenceAlias (not Quest) to get alias-specific functions.",
      keyFunctions: [
        "ForceRefIfEmpty(ref) — fills the alias with the given reference, but only if it's currently empty (safe to call repeatedly without stomping an existing fill)",
        "ForceRefTo(ref) — fills the alias with the given reference unconditionally",
        "GetActorReference() — returns the alias's current reference cast to Actor, for NPC-specific alias handling"
      ],
      factionMembership: "While filled, the aliased reference is treated as a member of whatever factions are configured on that alias — this is how a radiant quest can grant temporary faction membership (e.g. 'ally' status) to whichever NPC currently fills the alias, without editing that NPC's own FACT list directly."
    },

    locationAlias: {
      description: "Fills with a Location (not a specific reference) — used for radiant quest targets like 'go to a random settlement' rather than one hardcoded place.",
      fourWaysToFill: [
        "A specific Location assigned directly on the alias",
        "Inherited from a Reference Alias earlier in this same quest's alias list — fills with that reference's current location, optionally filtered to a parent location matching a given keyword",
        "Inherited from a Location Alias on a different quest — copies whatever that other quest's alias currently resolves to when this quest starts",
        "(A location-finder condition pattern, matching the quest's own alias-fill conditions against candidate locations in the world)"
      ]
    },

    practicalNote: "If a quest 'doesn't find' an NPC/location a script expects, the alias simply never filled — check the alias's fill conditions and fill order (aliases fill top-to-bottom, so a Reference Alias an inheriting Location Alias depends on must be listed ABOVE it) before assuming the script itself is broken."
  },

  // === PERK ENTRY POINT SYSTEM ===
  perkEntryPoints: {
    overview: "A Perk Entry doesn't run Papyrus code by default — most perk effects are configured declaratively via Entry Points, which hook into specific game-engine calculation points (e.g. 'modify melee damage', 'modify AP cost') and apply a function to whatever value passes through that hook. This is why many vanilla perks need zero scripting at all.",

    commonEntryFunctions: [
      "Set Value To — replaces the value with a constant",
      "Add Value — adds a constant (positive or negative) to the value",
      "Multiply Value — scales the value by a constant",
      "Add Range To Value — adds a random value within a specified range",
      "Add/Set/Multiply Value, [Actor Value] × Constant — the three variants above, but scaled by one of the actor's own Actor Values (e.g. a perk that scales its bonus with the actor's own Strength) instead of a flat constant"
    ],

    rankAndPriority: {
      rank: "Verified directly from the record's real field structure (each Effect entry has its own Rank + Priority header, and the perk's DATA struct separately declares a Num Ranks field): a SINGLE perk record CAN hold multiple ranks' worth of effects, each Effect tagged with the Rank it applies at — this is a genuinely valid, real mechanism, not a simplification. See perkCreationWorkflow below for the other, equally real mechanism (chained separate perk records via Next Perk) and exactly why both exist.",
      priority: "0–255, LOWER value = higher priority. When multiple perks/entries could apply to the same calculation, priority decides which one actually wins/applies first — critical to check when two perk mods interact unexpectedly."
    },

    beyondNumericModifiers: "Entry points aren't limited to number-tweaking — a perk entry can also carry a Quest+Stage pair (start/advance a quest when the perk condition fires) or an Ability (grant a spell-like passive ability), which is how perks trigger scripted behavior without the perk record itself containing Papyrus.",

    practicalNote: "Real, verified entry-point behavior specifics (e.g. Entry Point #133 = Show Grenade Arc) are captured directly from the game's own form data by this app's form-graph scan (see the 'FO4 Game Systems' / fo4-form-graph brain neuron) — prefer that real per-perk data over a remembered general description when working on a specific vanilla perk."
  },

  // === PERK CREATION WORKFLOW (verified directly against xEdit's actual PERK record field definitions — resolves an
  // apparent contradiction between two real, coexisting rank mechanisms rather than picking one and discarding the other) ===
  perkCreationWorkflow: {
    theKeyInsight: "A perk's Requirements/Level-Up Menu Conditions (the SPECIAL/Level gate deciding when it's offered) is ONE field on the perk record — there is no per-rank Conditions field. This single fact is why BOTH rank mechanisms exist and when to use each: if every rank of your perk should unlock at the SAME SPECIAL/Level requirement, one perk record with multiple ranked Effects (Num Ranks + per-Effect Rank field) works fine. If each rank needs a DIFFERENT (typically higher) SPECIAL/Level requirement — which is how almost every vanilla SPECIAL-tree perk behaves — you MUST chain separate perk records via Next Perk, because that's the only way to give each rank its own independent Conditions.",
    realVerifiedFieldStructure: [
      "DATA struct (on the top-level perk record): Trait (bool), Level (u8, minimum character level), Num Ranks (u8, default 1), Playable (bool, default True — a Non-Playable perk exists as data/a hook but never appears in the level-up menu), Hidden (bool)",
      "Conditions (the Level-Up Menu Conditions) — the actual CTDA-style requirement list (commonly GetBaseActorValue for a SPECIAL minimum, HasPerk for prerequisite perks, GetIsSex for gender-locked perks) gating whether this perk is offered at all",
      "NNAM (Next Perk) — FormID of another PERK record (or NULL) — the chain-to-the-next-rank mechanism; each Effect's own header still separately carries Rank + Priority regardless of which mechanism you use",
      "FNAM (SWF) — an optional Scaleform file reference for a perk with fully custom level-up-menu visuals, distinct from the standard ICON image field"
    ],
    chainedRankRequirement: "When using the Next Perk chain (the vanilla-standard approach for anything with escalating SPECIAL/Level gates): Num Ranks must be set to the SAME total value on every perk record in the chain, and the FINAL rank's Next Perk must point back to the FIRST rank's perk record — both are real, verified authoring rules; getting either wrong is a documented, common cause of a multi-rank perk mod breaking or not offering later ranks correctly.",
    moddingWorkflow: [
      "Decide first whether every rank shares one SPECIAL/Level requirement (single-record path) or escalates (chained-record path, the vanilla-typical case) — this determines your whole authoring approach, not something to decide after building the effects",
      "Author the Conditions (Level-Up Menu Conditions) for rank 1 — GetBaseActorValue for the SPECIAL minimum, plus Level if needed",
      "Add Entry Point(s) or a Quest+Stage or an Ability to the Effects array for what rank 1 actually does",
      "For a chained multi-rank perk: create the rank 2+ records, each with its OWN (typically higher) Conditions, set Num Ranks identically across the whole chain, and link each record's Next Perk forward — remembering the final rank loops back to rank 1",
      "Set Playable=true (the default) unless this is an internal/hook-only perk never meant to appear in the level-up menu, in which case Non-Playable/Hidden apply instead",
      "Test by taking every rank in sequence via the in-game level-up menu (not just console-granting the final rank) to confirm the chain and requirements actually gate correctly one rank at a time"
    ],
    overhaulModsRepurposingVanillaPerksNuance: "IMPORTANT nuance to the 'always create new/additive, never edit vanilla directly' guidance emphasized elsewhere in this knowledge base (additive races, leveled-list injection, LegendaryModRule injection): that guidance is for ADDING new content alongside vanilla. A gameplay-OVERHAUL mod's actual goal is often to genuinely CHANGE what an existing vanilla perk does (e.g. repurposing a rarely-used vanilla perk's slot for a completely different new mechanic) — verified as a real, deliberately-used technique in mature overhaul mods: edit the vanilla perk record's OWN fields (Entry Points, Requirements, description) directly in your plugin, keeping its EXACT EditorID/FormID unchanged, rather than creating a new perk and trying to remove/replace the old one. Preserving the FormID is what keeps existing player saves (and any other mod's HasPerk/GetPerkRank checks against that same vanilla perk) from breaking — creating a brand-new perk record to replace a vanilla one's role is the actual mistake here, not editing vanilla data. Choose the technique based on INTENT: adding new content → additive pattern; overhauling/repurposing existing content → direct edit with FormID preserved."
  },

  // === MCM (MOD CONFIGURATION MENU) ===
  mcmIntegration: {
    overview: "MCM is a community framework (not a Bethesda system) that provides a standardized in-game settings menu, built by reading a JSON config rather than requiring custom Scaleform/SWF work per mod. Requires F4SE.",

    folderStructure: {
      required: "Data/MCM/Config/<YourModName>/config.json — defines the menu layout (pages, controls, and which Papyrus GlobalVariables/properties each control reads/writes)",
      optional: [
        "lib.swf — an image library if your menu needs custom icons/art",
        "keybinds.json — keybind definitions if the mod exposes rebindable hotkeys",
        "settings.ini — default values for the mod's settings"
      ]
    },

    availableControls: "Checkbox, stepper, dropdown, slider, button, text display, and keybind — covers the vast majority of settings-menu needs without writing any custom UI code.",

    practicalNote: "MCM handles the UI entirely from config.json — your Papyrus side just needs to read/write the same GlobalVariables or properties the config references. This means MCM integration is almost pure data/config work, not a scripting-heavy feature, once the underlying settings are already represented as GlobalVariables.",

    consoleCompatibleAlternative_ConfigHolotape: "Real, commonly-used pattern (verified: several popular mods ship a 'config holotape' as an alternative or companion to their MCM menu) that needs NO F4SE at all — meaning it works on console, unlike MCM (see consolePlatformConstraints above: F4SE-dependent mods are PC-only by definition). It's simply the terminalSystem and holotapeSystem mechanisms already documented above, combined for this specific purpose: a Holotape item that, when played, opens a Terminal-style menu (or a chained sequence of Message boxes) whose menu items each carry a Papyrus Fragment (the same OnMenuItemRun mechanism documented under terminalSystem) that sets the SAME GlobalVariables an MCM config.json would also read/write. A mod that ships BOTH gets F4SE users the polished MCM UI while still giving console/no-F4SE users a working settings path via the holotape — this is the standard way a mod stays fully configurable across all platforms rather than treating console users as unable to adjust settings at all.",

    f4seMenuFrameworkNewerAlternative_2026: "Verified real, newer (2026) alternative specifically for F4SE PLUGIN authors (distinct from the Papyrus/config.json-driven MCM documented above): F4SE Menu Framework is a port of 'SKSE Menu Framework 3' to Fallout 4, providing a shared in-game Mod Control Panel rendered with Dear ImGui via a DirectX 11 overlay — confirming the ImGui-based UI possibility already noted under f4sePluginDevelopment above is a real, shipped thing, not just a theoretical option. Any F4SE plugin can register menu sections, popout windows, HUD overlays, and input callbacks WITHOUT shipping its own rendering infrastructure — integration is a single header file (F4SEMenuFramework.h) copied into the plugin project, resolved at runtime via GetProcAddress, no linking step required. Critically, this is backward-compatible rather than a fork in the ecosystem: a plugin can keep shipping an ordinary MCM package (config.json/settings.ini/keybinds.json) and players using the framework see those existing pages listed under 'MCM Mod Configs (Legacy)' — so adopting this doesn't require abandoning existing MCM-based settings. For a NEW F4SE plugin's settings UI specifically (as opposed to a pure-Papyrus mod, which has no reason to need this over ordinary MCM), F4SE Menu Framework is now a real, lower-overhead alternative to writing a full config.json from scratch.",
    mergeCompilationMCMStrippingTechnique: "Real, verified technique from a real, popular fix-compilation mod (Necessity - Nexus Essentials Merged, which bundles many small independent bug-fix/QoL mods into one plugin): when MERGING several small mods into one compiled plugin, deliberately STRIPPING any MCM menu each original mod had (since settings become fixed/pre-decided in a merge, an MCM page for them serves no purpose) has two real, concrete benefits beyond just 'removing clutter' — it eliminates the F4SE dependency for whichever specific merged components only needed F4SE for their MCM, and it avoids a real compatibility trap: third-party patches built against the ORIGINAL small mod (as their xEdit master) would break against a compiled merge that isn't that original plugin at all. This is a genuinely useful technique specifically for anyone building a merge/compilation mod, distinct from the guidance elsewhere in this knowledge base about building a NEW mod's own MCM from scratch."
  },

  // === VOICE & LIP-SYNC PIPELINE ===
  voiceAndLipSync: {
    overview: "Fallout 4 voiced dialogue is packaged as .FUZ files — a container bundling an .XWM audio file with a .LIP lip-sync file (this FUZ format originated in Skyrim and carried over unchanged to FO4).",

    lipGeneration: {
      technology: "FaceFX (OC3 Entertainment's facial-animation middleware) is what Bethesda's own tools use to generate .LIP data from voice audio — it recognizes ~42 phonemes, applies co-articulation smoothing between them, and synthesizes secondary facial motion (head movement, blinks, eyebrow raises) from emphasis points it detects in the audio.",
      communityTool: "FaceFXWrapper (open-source, GitHub: Nukem9/FaceFXWrapper) is the standard community tool for generating real .LIP files without needing Bethesda's internal tools. It expects a 16kHz, 16-bit, single-channel (mono) WAV as input — feeding it audio in a different format is a common cause of a garbled or flat lip-sync result.",
      packaging: "Unfuzer (community tool) merges a .lip + .wav pair into a single .fuz for deployment, and can also do the reverse (extract .fuz back into .lip + .wav) for editing an existing voiced line."
    },

    practicalWorkflow: [
      "Record/obtain clean mono voice audio (16kHz/16-bit is the safe target format for FaceFXWrapper)",
      "Run FaceFXWrapper to generate the matching .LIP file",
      "Use Unfuzer to package the audio + LIP into the final .FUZ",
      "Place the .FUZ at the correct Sound/Voice/<YourPlugin.esp>/<VoiceType>/ path matching the INFO record's expected filename (derived from the response's FormID) — a mismatched path/filename is the most common reason a voiced line plays as silent/text-only in-game"
    ],

    voiceTypeMatching: "An NPC's assigned Voice Type (VTYP record) must match the voice files/folder you're providing — this is also what the GetIsVoiceType dialogue condition (see dialogueSystem above) filters against, so generic barks and unique dialogue both depend on this being set correctly.",

    scalingToLargeLineCountsRealTool: "Verified real community tool for the actual production bottleneck at scale (a full companion or quest mod with hundreds of voiced lines, not a handful of test lines): manually running FaceFXWrapper per-line doesn't scale. The real, documented workflow — 'Batch Basher' / 'Lip Sync .LIP Generator Batch Tool' (Nexus #71357) — uses the Creation Kit's own 'Export Dialog' feature (Data tab → Export Dialog, which dumps every dialogue line to a matching .txt) as its input list, then matches and batch-generates .LIP files against every corresponding WAV file at once rather than one CLI invocation per line. For anyone planning a large voiced mod, factor in this batch step from the start rather than assuming the single-file FaceFXWrapper workflow documented above scales linearly to hundreds of lines without tooling."
  },

  // === CHARACTER CUSTOMIZATION (LooksMenu) ===
  looksMenuCustomization: {
    overview: "LooksMenu (F4SE-dependent, community-built — not a native CK system) is the standard tool for both player and NPC appearance editing/preset application, and is also what exposes in-game body morphing (via a BodySlide integration) rather than requiring a pre-baked mesh per body shape.",

    usingPresets: "In-game: open LooksMenu on the player via the console (slm player 1), or on an NPC by clicking them in console first, then slm <their reference ID> 1. Apply a preset from the Preset tab.",

    presetFileLocation: "Preset files install to Data/F4SE/Plugins/F4EE/Presets/ — a mod distributing NPC or player presets needs to ship files at that path, matching what LooksMenu itself expects to scan.",

    bodyMorphing: "In-game body sliders require BodySlide to be installed AND its output built with 'Build Morphs' checked (see bodyslideOutfitStudio above) — LooksMenu provides the in-game slider UI, but the actual mesh deformation data comes from BodySlide's morph output, not from LooksMenu itself.",
    bodyGenMassNPCVariation: "A real, distinct LooksMenu feature — BodyGen — solves a different problem from hand-applying a preset via slm: automatically varying body shape across a whole NPC POPULATION (random or rule-targeted), computed the first time a given actor is seen/loaded rather than needing to be hand-set per-NPC. Verified real file format: templates.ini parses BodySlide preset XML slider values into named templates (one line per preset, slider names/values separated by '@'), and morphs.ini assigns which template(s) apply to which NPCs via filter syntax — a scope filter like All|Female|HumanRace (any NPC | gender filter | race filter) for population-wide random variation, or a specific Fallout4.esm|2F1E=Random-style plugin|FormID entry to target one exact NPC. This is the real mechanism behind 'diverse random NPC bodies' mods, distinct from both the per-character slm console workflow and from a universal body replacer (see sharedVsUniquePlayerBodyPath above) — it's population-level variation driven by rules, not a single shared mesh or a one-off manual edit.",
    bodyGenPerPluginScoping: "Verified real, specific path convention extending BodyGen above: config files actually live at Data/F4SE/Plugins/F4EE/BodyGen/%PLUGINNAME%/templates.ini and .../morphs.ini — the folder is named after a SPECIFIC target plugin's exact filename (e.g. BodyGen/SomeOtherMod.esp/). This lets a mod scope its own BodyGen variation to affect ONLY the NPCs added by one specific OTHER mod/plugin, without touching that other mod's own files at all — genuinely useful for a 'add body diversity to mod X's NPCs specifically' add-on rather than only being able to apply variation globally or to one hand-picked FormID at a time.",

    moddingNote: "A custom race/NPC that should support LooksMenu editing needs to be built compatible with LooksMenu's expected data (correct race flags, morph-compatible body). Simply being a valid Actor doesn't automatically make an NPC LooksMenu-editable if the underlying race/body setup doesn't match what LooksMenu expects.",

    sharedVsUniquePlayerBodyPath: "Real, verified path-based distinction relevant to any body-replacer or character-customization work: the standard body/texture path (Data\\Meshes\\Actors\\Character\\CharacterAssets\\ and the matching Textures\\actors\\character\\basehumanfemale/basehumanmale folders) is SHARED — the player character and every generic NPC of that race/gender all read from this same location, which is exactly why a universal body replacer (e.g. CBBE) affects the player AND every NPC simultaneously with no extra configuration. A separate mechanism exists specifically to give ONLY the player character a different body/texture from all NPCs: redirecting via a PlayerCharacterAssets mesh folder and a Textures\\actors\\Unique\\Character texture path — content placed there overrides ONLY the player, leaving NPCs on the standard shared path untouched. Anyone wanting the player to look meaningfully different from generic NPCs (not just via LooksMenu sliders, but a genuinely different base mesh/texture) needs this unique-path redirect, not a universal body replacement."
  },

  // === UI / HUD / PIP-BOY MODDING (Scaleform) ===
  scaleformUIModding: {
    overview: "FO4's NATIVE UI (Pip-Boy, HUD, menus) runs on Scaleform — compiled Flash (SWF) files, not a data-driven UI system. This is real, genuinely moddable territory (unlike the rendering/physics internals in engineInternalSystems above), but it's ActionScript 3 development, a fundamentally different skillset from Papyrus/CK modding. IMPORTANT 2026 update: this is no longer the ONLY path to custom UI — see prismaUIWebFramework below for a genuine modern alternative that bypasses Scaleform/AS3 entirely via an embedded web renderer. Scaleform/AS3 remains the only way to modify the game's OWN native menus (HUD, Pip-Boy, etc. themselves); the web-framework alternative is for NEW custom panels/overlays a mod adds, not for editing vanilla menus in place.",

    howItsActuallyModded: [
      "Direct SWF editing/recompiling via RABCDASM — a real toolchain for nondestructive SWF disassembly and reassembly, used when a mod needs to change the compiled UI itself",
      "HUDFramework — the standard framework for ADDING new HUD widgets without directly editing Bethesda's HUDMenu.swf, specifically built to let multiple UI mods coexist without each one clobbering the same file. Exposes a Papyrus interface, including a real, named Eval() function that runs arbitrary AS3 expressions directly on HUDMenu from Papyrus — verified this is the actual mechanism for both building a new widget (via the separate HUDFramework Development Kit, which packages the Papyrus API plus an AS3 widget-interface file for use with SWF authoring tools) AND for lighter-weight modification of EXISTING UI elements without building a full widget at all.",
      "Established comprehensive UI overhauls (DEF_UI, FallUI, and similar) replace/extend HUDMenu.swf and related interface files wholesale — these are large, maintained community projects, not something to casually reinvent from scratch"
    ],

    compatibilityWarning: "Any two mods that both directly replace HUDMenu.swf (or the same other core UI SWF) WILL conflict — this is why HUDFramework exists as an injection layer instead of a direct-replacement pattern. If a mod needs to coexist with an existing UI overhaul, patch/merge via HUDFramework's auto-patcher pattern rather than shipping a second full SWF replacement.",

    practicalNote: "This is real, if niche: if a user wants a new HUD element, a modified Pip-Boy layout, or a custom menu, the honest answer is 'yes, but it's AS3/Scaleform work via RABCDASM or HUDFramework, not Papyrus' — don't imply it's CK-only work, and don't imply it's impossible either (unlike the truly hardcoded rendering/physics engine internals).",

    f4seScaleformBridgeAndDebugging: "Verified real, specific F4SE support for AS3/Scaleform development, distinct from everything else documented about F4SE elsewhere in this knowledge base: (1) F4SE has its OWN separate ini file — Data/F4SE/F4SE.ini (create it if it doesn't exist) — NOT the same file as Fallout4Custom.ini; setting bEnableGFXLog=1 under its [Interface] section enables Scaleform-specific debug logging. (2) F4SE installs a genuine AS3-callable bridge object at the root of every registered menu, accessible in ActionScript as (stage.getChildAt(0) as MovieClip).f4se or MovieClip(root).f4se — this is the actual mechanism that lets Scaleform/AS3 UI code call back into F4SE/game functionality rather than being a one-way, display-only rendering layer. Anyone doing real custom Scaleform UI work (not just applying an existing HUDFramework widget) needs to know this bridge object exists and where F4SE's own debug logging lives, separate from the Papyrus [Papyrus] ini settings and separate from ordinary F4SE plugin logs.",
    hydraAndRealEngineScaleformConstants: "Hydra (verified real, distinct F4SE UI plugin, accessed via the same root-level bridge as root1.f4se.plugins.hydra) provides a JSON-config-driven way to add entirely custom menus or load new assets into existing ones — mapping files with a .json extension go under Data/Hydra/Menus/ to define the menu/asset structure, a similar config-file philosophy to SPID/Base Object Swapper above but applied to UI instead of NPC content. Researching Hydra also surfaced real, previously-undocumented engine constants directly relevant to ANY Scaleform/AS3 work in this knowledge base: FO4's UI runs on Flash Player 11.2 targeting SWF version 15 specifically (a real constraint on which AS3/Flash authoring tool versions are actually compatible), at a hardcoded default frame rate of 30fps, and — genuinely important for any custom UI layout work — the game's INTERNAL UI coordinate space is always 1280x720 regardless of the player's actual display resolution/aspect ratio (the engine scales this internal canvas up, rather than menus being authored against the real screen resolution) — positioning/sizing math for a new widget or Hydra-loaded asset should be done against this 1280x720 reference space, not the user's actual resolution."
  },

  // === PRISMA UI — MODERN WEB-BASED UI FRAMEWORK (verified real, released 2026 — genuinely changes the "how do I build custom FO4 UI" answer) ===
  // This is NOT a replacement for the vanilla Scaleform/AS3 system above (that's still how you modify
  // the game's OWN native menus) — it's an entirely new, parallel path specifically for NEW custom
  // panels/HUDs/overlays a mod wants to add, bypassing Flash/ActionScript 3 entirely.
  prismaUIWebFramework: {
    overview: "PrismaUI_F4 is a real, verified, F4SE-powered UI framework (2026) that embeds a full WebKit-class HTML renderer directly into the game — built on Ultralight (a real, lightweight embeddable web-rendering engine) — letting mod authors build UI panels with actual HTML5, CSS3, and modern JavaScript (including frameworks like React/Svelte and utility CSS like Tailwind) instead of ActionScript 3/Flash. This is a genuine architectural alternative to the Scaleform pipeline documented above, not an incremental tool improvement.",
    realCapabilities: [
      "CSS Grid, Flexbox, animations, and modern JS syntax — ordinary front-end web development skills transfer directly, unlike AS3's fundamentally different skillset",
      "WebGL and GPU-accelerated 3D (Three.js, Babylon.js) inside a game UI panel, plus WebAssembly (WASM) support for performance-sensitive UI logic",
      "JSON data exchange between the C++/F4SE side and JavaScript — the actual mechanism for getting real game state (inventory, quest data, stats) into a web-rendered panel and sending user actions back",
      "Hot-Reload (F9 in-game) plus a full WebKit DevTools inspector — edit HTML/CSS/JS and see the change instantly in-game with no recompile and no game restart, a fundamentally faster iteration loop than the Scaleform/SWF recompile-and-reload cycle"
    ],
    pluginStructure: "A real PrismaUI-based plugin is a standard CommonLibF4/F4SE C++ project (main.cpp/PCH.h, xmake build config — the same XMake+CommonLibF4 toolchain already documented under f4sePluginDevelopment above) plus a separate folder of HTML/CSS/JS view files that get rendered through F4SE via the embedded Ultralight engine. This means a PrismaUI mod is still fundamentally an F4SE plugin (same Address Library dependency, same distribution-as-DLL mechanics documented above) — the web-rendering piece is additive, not a replacement for the C++/F4SE foundation.",
    whenToUseThisVsScaleform: "Use Scaleform/AS3 (documented above) when the goal is modifying the game's OWN existing native menus (HUD elements, Pip-Boy screens) in place. Use PrismaUI when building an entirely NEW custom panel/overlay/HUD element from scratch and modern web development skills are available (or preferred over learning AS3) — a custom quest-tracker overlay, an in-game wiki/codex panel, or a complex custom crafting UI are exactly the kind of new-panel use case this framework targets, while it is not the tool for restyling the vanilla Pip-Boy itself."
  },

  // === INI TWEAKING ===
  iniTweaking: {
    overview: "Three INI files govern FO4's settings: Fallout4.ini and Fallout4Prefs.ini (both at Documents/My Games/Fallout4/, auto-generated by the game) plus Fallout4Custom.ini (NOT auto-generated — create it yourself in the same folder). Fallout4Custom.ini is the correct place for manual/mod-related tweaks since it's never overwritten by the game's own settings menu, unlike Prefs.ini.",

    archiveInvalidation: {
      why: "Required for the game to actually load loose (unpacked) mod files placed directly in Data/ rather than only reading from BA2 archives — without it, loose-file mods silently fail to apply even though they're 'installed.'",
      howToSet: "In Fallout4Custom.ini under an [Archive] section, add bInvalidateOlderFiles=1 and sResourceDataDirsFinal= (left blank). Most mod managers (MO2/Vortex) can also toggle this for you rather than editing the file by hand — check your manager's own archive-invalidation setting before assuming a manual edit is needed.",
      whyThisMattersForTextureReplacers: "This IS the entire mechanism behind the single most common first mod type — a pure texture replacer. It needs NO plugin (.esp/.esm), NO Creation Kit, and NO scripting: a DDS file placed at the EXACT same relative path/filename as the vanilla texture it's replacing (e.g. Data/Textures/Armor/Vault/Vault_d.dds) simply overrides the packed BA2 version once archive invalidation is enabled, purely by matching path. Getting the path/filename wrong (even a case mismatch on some setups) is the single most common 'my retexture isn't showing up' report — there is no other configuration step to debug once the path is confirmed correct."
    },

    practicalNote: "Prefer letting a mod manager (MO2/Vortex) manage INI edits where possible — hand-editing risks a duplicate/conflicting key elsewhere in the same file silently overriding your change, which is a common source of 'I set this but it didn't work' reports."
  },

  // === SAVE-SAFE SCRIPTING PRACTICES ===
  saveSafePractices: {
    overview: "Fallout 4 (like Skyrim) has no clean 'uninstall' path for a scripted mod mid-save — removing a mod's plugin does not remove its script instances from the save file. Those orphaned instances keep running, keep polling for content that no longer exists, and are a major real source of save-file lag/corruption over a long playthrough, not merely a cosmetic issue.",

    coreRules: [
      "Test heavily-scripted mods on a save made BEFORE installing them where possible — reverting a save from after installation, rather than removing the mod, is the only fully supported path if something goes wrong",
      "The engine can write a save at literally any point, including mid-line inside a running script — never assume 'my script will finish before the user saves,' since it structurally cannot be guaranteed",
      "When a save needs cleaning, removing UNATTACHED script instances is considered safe; removing undefined elements/records from a save is NOT safe in FO4 specifically and risks corrupting it further — don't treat FO4 save-cleaning advice from other Bethesda games as automatically transferable",
      "Real, documented, severe example of this risk class: saves made with AWKCR (Armor and Weapon Keywords Community Resource) installed are genuinely INCOMPATIBLE with ECO (Equipment and Crafting Overhaul, AWKCR's modern replacement) — simply removing AWKCR and installing ECO on an existing save can corrupt it, not just cause minor bugs, because both frameworks rework the same underlying armor/weapon keyword system in incompatible ways. The real mitigation technique when two frameworks must coexist or transition is a dedicated compatibility patch that forwards one framework's keywords to the other's expected scheme — the same 'keyword-forwarding patch' pattern documented for settlement-building frameworks elsewhere in this knowledge base, confirming it's a general technique for any two frameworks reworking the same base-game system, not settlement-specific."
    ],

    tools: "FallrimTools (Resaver) is the standard community save-inspection/cleaning tool — lets you see attached vs. orphaned script instances, inspect/edit variable values, and terminate stuck script threads without the guesswork of editing a save blind. Verified real, precise terminology and lineage: FallrimTools merges two earlier open-source tools (ReSaver and Script Scalpel); the orphaned-script objects it finds are precisely called 'Unattached Instances' (not just a general term), and 'Remove Unattached Instances' is described by the tool's own documentation as the single most important cleaning action — some unattached instances just quietly fail and slow the game, others actively cause crashes, which is why this is the one cleaning step worth prioritizing over more exotic edits.",

    designImplication: "This is why heavily-scripted mods should minimize persistent OnUpdate polling loops (see papyrusPatterns above) and favor event-driven logic — every polling script instance is both a performance cost while active AND a permanent save-bloat/orphan risk if the mod is ever removed."
  },

  // === COMPATIBILITY PATCHING (xEdit) ===
  compatibilityPatching: {
    overview: "When two mods edit the same record, FO4 resolves it with 'last loaded wins' (see loadOrderRules above) — a compatibility patch exists to combine what SHOULD be taken from each mod rather than accepting whichever one happens to load last discarding the other's changes entirely.",

    xEditWorkflow: [
      "Load both conflicting plugins (plus masters) in xEdit",
      "Create a new empty plugin with both conflicting mods set as masters",
      "For each record shown with a red-background conflict indicator, decide which mod's version (or a manual merge of both) is correct, then drag/copy that version as an override into your new patch plugin",
      "After building the patch, right-click it → Clean Masters to strip any master reference you didn't actually end up using — an uncleaned patch listing unused masters is a common, avoidable 'missing master' report from users who don't have every listed master installed"
    ],

    relatedButDifferentTools: "Wrye Bash's Bashed Patch automates a specific subset of this (mainly leveled lists and keyword-bearing records merging cleanly across many mods at once) rather than requiring a hand-built xEdit patch for every conflict — use a Bashed Patch for the leveled-list/keyword case it's designed for, and a manual xEdit patch for anything more specific/unusual.",

    practicalNote: "Compatibility patching requires actually understanding what each conflicting record change is supposed to accomplish — mechanically taking 'whichever mod's version looks more complete' without understanding the conflict can silently drop a needed change from the other mod. Encourage inspecting both changes' intent before merging, not just diffing bytes.",
    neverDependOnUndocumentedEngineQuirksRealCaseStudy: "A complete, real, fully-verified cautionary case study worth internalizing: a real, popular quest mod's shower/spa scenes made NPCs undress and redress by deliberately exploiting an undocumented ENGINE BUG — removing an NPC's currently-equipped outfit causes the engine to auto-restore their DEFAULT outfit, and the mod's script relied on this quirk instead of tracking the NPC's actual current outfit itself. A separate, unrelated stability-fix mod ('Outfit ReDress Fix') later patched that exact engine bug (since it caused other, real problems elsewhere) — which broke the quest mod's shower script entirely, since removing an outfit no longer auto-restored anything, leaving NPCs permanently nude. The eventual real fix (a dedicated compatibility patch) rewrote the shower script to EXPLICITLY remember the NPC's current outfit in a variable/property and restore THAT specific outfit on exit — which fixed the compatibility break AND was a genuine improvement, since custom/modified outfits now correctly persist instead of resetting to the default every time. The general, durable lesson: never build mod functionality that depends on an undocumented engine bug/quirk behaving a certain way — track the actual state you need explicitly (a property, a variable) instead of relying on incidental behavior, because any other mod fixing that quirk elsewhere (for its own unrelated reasons) will silently break yours with no warning and no obvious connection between cause and symptom."
  },

  // === LEVELED LIST SYSTEM (verified against falloutck.uesp.net LeveledItem/LeveledCharacter) ===
  leveledListSystem: {
    overview: "LVLI (item) and LVLC (actor/NPC) leveled lists are the game's loot/spawn randomization mechanism — a list of entries, each tagged with a minimum level, that resolves to a subset of its contents at runtime based on the calling actor's/container's level and three list-level flags.",
    entryFields: "Each entry is a (Level, Reference, Count) triple — Level is the MINIMUM character level required for that entry to be eligible, Reference is the item/NPC/nested leveled list, Count is how many copies are added if that entry is chosen.",
    listFlags: [
      "Calculate from all levels <= Actor's level — without this flag, only entries whose Level exactly matches (or the single closest match) are eligible; with it, every entry at or below the calling level is eligible, then the other two flags decide how many/which are actually picked",
      "Calculate for each item in Count — re-rolls the list selection independently for each unit of Count instead of picking one entry and multiplying it by Count",
      "Use All — bypasses random selection entirely and adds every eligible entry at once (commonly used for guaranteed outfit pieces, e.g. always adding both a headwear and a body entry rather than randomly picking one)"
    ],
    chanceNone: "A list-level percentage chance that this list resolves to NOTHING at all — the remaining probability is split across the eligible entries. Can be driven by a Global Variable instead of a fixed number, which is how the game scales loot presence with difficulty settings.",
    moddingImplications: [
      "Adding entries to a vanilla leveled list (rather than replacing the list outright) is the standard non-destructive way to inject new loot — Wrye Bash's Bashed Patch and xEdit's leveled-list merging exist specifically because many mods add to the SAME vanilla lists and naive load order would let only the last-loaded mod's additions survive",
      "Nested leveled lists (a LVLI referencing another LVLI as an entry) are common and let Bethesda/modders reuse a themed sub-list (e.g. 'all 10mm ammo variants') across many parent lists",
      "A leveled list with Use All and mixed-level entries is how vanilla handles level-gated outfit variation (e.g. an NPC outfit list that adds a base outfit at level 1 and an upgraded piece at a higher level, both applied together when Use All is set)"
    ],
    runtimeScriptedInjectionAlternative: "A completely different, real, verified alternative to static/xEdit-based leveled-list editing above: LeveledItem.AddForm(Form apForm, int aiLevel, int aiCount) and LeveledActor.AddForm(Form apForm, int aiLevel) are real native Papyrus functions (confirmed directly from LeveledItem.psc/LeveledActor.psc — both bare native Form scripts with exactly these two functions plus a matching Revert(), which removes ALL script-added forms from that list). Calling AddForm() from a quest's OnInit (a real, documented technique used by mature large-scale content mods, e.g. a 65+ creature ecosystem overhaul injecting its new creatures into vanilla leveled lists this way) modifies the list IN MEMORY at runtime — nothing is written to the LVLI/LVLC record itself, which means this approach has NO merge-conflict surface at all between multiple mods each calling AddForm() on the same list, unlike the static xEdit-edit approach that needs Bashed Patch/manual merging. Revert() is the matching cleanup function, useful for an uninstall path or to avoid duplicate entries if an injection script could plausibly run more than once. Choose static xEdit-level editing for straightforward, simple additions; choose scripted AddForm() injection when you want zero merge-conflict risk with other mods touching the same list, or when the injection needs to be conditional (e.g. only add this entry if a certain DLC/mod is detected present at runtime).",
    thirdOption_HandPlacedStaticReferences: "A THIRD real, verified, genuinely simplest option (used by a real, extremely popular world-population mod that adds ~400 hand-placed feral ghoul references across the Commonwealth): skip leveled-list injection entirely and just hand-place static Actor references pointing at existing LEVELED actor forms — 'no scripts, no conflicts, no edits to anything in the base game besides placing NPCs.' The clever, real density-tuning technique this uses: rather than editing the shared vanilla leveled list's own legendary-drop-chance value (which would affect EVERY spawn of that creature type game-wide, including vanilla ones), the mod places MOST of its new NPCs pointing at a lower-legendary-chance leveled actor variant, and only a smaller subset pointing at the standard higher-chance variant — tuning overall legendary density across a much larger total population without touching any shared list at all. This is the right choice specifically for 'scatter more of an EXISTING creature type around the world' — it has zero interaction with leveled-list merge conflicts or AddForm() scripting because it doesn't touch the leveled list mechanism at all, just placed references."
  },

  // === SPID — SPELL PERK ITEM DISTRIBUTOR (real, widely-used F4SE utility — a FOURTH, entirely distinct content-distribution mechanism) ===
  // Verified real: GitHub (ohois/SPID-F4), Nexus, and cross-confirmed filter syntax. This is NOT a
  // leveled-list technique at all — it distributes directly to matching ActorBases via config file,
  // no CK edits, no leveled lists, no scripting. Extremely commonly required as a dependency by real
  // outfit-variety/raider-overhaul mods rather than each one reinventing keyword-based distribution.
  // === GARDEN OF EDEN PAPYRUS EXTENDER (real, major F4SE utility — a general-purpose Papyrus capability-expansion library) ===
  // Distinct in KIND from SPID/Base Object Swapper/SUP-F4SE below and above: those are narrow,
  // single-purpose distribution/swap/file-IO tools. Garden of Eden is a broad, general infrastructure
  // library — genuinely one of the largest single additions to what Papyrus can do at all.
  gardenOfEdenPapyrusExtender: {
    overview: "Garden of Eden (Papyrus Script Extender) is a real, verified, major F4SE plugin that adds over 1,150 new native Papyrus functions plus several engine patches — genuinely broad in scope compared to every other F4SE utility documented in this knowledge base, which are each narrowly focused on one problem (distribution, object-swapping, file I/O). This is closer to 'a large standard-library expansion for Papyrus itself' than a single-purpose tool, and is a real, common dependency for mods needing scripting capability vanilla Papyrus simply doesn't expose.",
    realVerifiedExampleFunctions: "Confirmed real function examples spanning multiple domains: GetModelName (introspect an object's model path from a script), GetCameraPosition (read camera state), SendAnimationEvent (fire an arbitrary animation event on an actor from Papyrus, beyond the fixed set of native Play*/animation functions elsewhere in this knowledge base), SetFullLOD (force an object to its highest LOD tier from script), SetAmmoProjectile (change a weapon's ammo/projectile pairing at runtime), and — a standout capability — GetConditionResults, which returns the evaluated result of each of a form's vanilla Condition (CTDA) functions as a Float array, directly from Papyrus. Vanilla Papyrus has NO native way to introspect/debug CTDA condition evaluation programmatically; this is a genuinely powerful capability for building tools that need to reason about WHY a condition passed/failed rather than just observing pass/fail.",
    moddingImplication: "When a mod idea needs a specific low-level engine read/write that isn't covered by any Papyrus native function documented elsewhere in this knowledge base (camera state, forced LOD control, runtime ammo/projectile changes, animation-event triggering beyond the standard set, or CTDA introspection), checking whether Garden of Eden already exposes it is worth doing before concluding a brand-new dedicated F4SE plugin (see f4sePluginDevelopment above) is required — with 1,150+ functions already covering a huge surface area, a bespoke plugin is often unnecessary duplication of an already-solved, widely-installed dependency."
  },

  spellPerkItemDistributorSPID: {
    overview: "SPID (Spell Perk Item Distributor) is a real, widely-relied-upon F4SE plugin that adds spells/perks/items/outfits/keywords/factions/packages/death-items to ANY NPC ActorBase matching a filter, at game startup — entirely from a plain-text config file. This is a genuinely different mechanism from every leveled-list technique documented above: it doesn't touch LVLI/LVLC records at all, and doesn't require the target content to be tied to a leveled spawn — SPID can filter and distribute based on Race, Faction, Class, CombatStyle, Outfit, VoiceType, or specific NPC records directly.",
    configFileConvention: "Distribution rules go in a plain ini file ending in the suffix _DISTR, placed in the Data folder (e.g. MyMod_DISTR.ini) — no plugin/ESP editing required for the distribution logic itself, only for the actual spell/perk/item/outfit records being distributed. A real distribution log (po3_SpellPerkItemDistributorF4.log, under Documents/My Games/Fallout4/F4SE/) records exactly how many NPCs each rule matched, which is the real way to debug 'why didn't my item get distributed' rather than guessing.",
    realVerifiedFilterSyntax: "Confirmed real general syntax: FormType = FormOrEditorID|StringFilters|FormFilters|LevelFilters|TraitFilters|CountOrPackageIndex|Chance — most sections after the form itself are optional. StringFilters match by keyword; FormFilters match specific FormIDs (e.g. a specific Faction/Race/Outfit); LevelFilters filter by NPC level; TraitFilters filter by gender/uniqueness/summonability; Chance is a percentage (100 = always distributed, 1 = 1% chance per matching NPC, defaulting to 100 if left blank).",
    advancedRealFeatures: "Three real, verified advanced details worth knowing beyond the basic syntax above: (1) LevelFilters support comma-separated NUMERIC RANGE expressions (not just a single level value), letting a rule target a band of NPC levels or specific actor-value thresholds rather than one exact number. (2) For Package-type distributions specifically, the final CountOrPackageIndex field means something DIFFERENT from its meaning elsewhere — it's a DISTRIBUTION POINT: an insertion INDEX into the target NPC's package priority stack (see aiPackageSystemDeep above for how that stack evaluates top-down), not a count or chance — an easy field to misread if assuming it always means 'how many' or 'what % chance.' (3) Filters check the FINAL, fully-merged NPC (after FO4's Leveled/Template Actor inheritance combines a base NPC record with whatever templates it draws from), and String/Form filters can target an NPC via the EditorID/FormID of a TEMPLATE it inherits from, not only its own direct record — meaning a single SPID rule can reach every NPC built from a shared template without needing to enumerate each individual NPC record.",
    whyRealModsDependOnThisInsteadOfHardEdits: "Verified real, practical reason mature outfit-variety/raider-overhaul mods specifically prefer SPID over hard-editing vanilla leveled lists: a hard edit to a shared leveled list conflicts with every other mod editing that same list (the same merge-conflict problem documented under leveledListSystem above), while SPID's config-file distribution runs independently per-mod at startup with no shared record being edited at all — multiple SPID-dependent mods can each add their own outfit variety to the same NPC population with zero conflict between them, which is exactly why it's become a common shared dependency rather than something each mod reimplements.",
    relatedEcosystemTools: "SPID is part of a small family of similar F4SE config-driven distribution/patching utilities (real, verified as existing: 'NPC Patcher' and 'RobCo Patcher' are cited alongside it in the same ecosystem) — the common thread across all of them is 'distribute/patch content via a plain config file matched against NPC/object criteria, no CK editing or leveled-list merge-conflict exposure.' If a user's goal is 'apply this to many NPCs/objects based on a filter rather than a fixed list,' this class of tool is the real, current answer, not a from-scratch Papyrus script."
  },

  // === BASE OBJECT SWAPPER — A FIFTH DISTINCT CONTENT-MODIFICATION TECHNIQUE (real, widely-used F4SE utility, same author/log-naming convention as SPID) ===
  baseObjectSwapper: {
    overview: "Base Object Swapper (verified real — a port of the original Skyrim SE utility, same author convention as SPID per its log filename po3_BaseObjectSwapper.log) solves a DIFFERENT problem from every technique documented above: it swaps WHAT BASE OBJECT a placed reference or NPC actually resolves to, at runtime, via config file — not adding content (SPID), not injecting leveled-list entries, just substituting one existing form for another wherever the config's filter matches.",
    realVerifiedConfigFormat: "Config files use the suffix _SWAP (e.g. MyMod_SWAP.ini) in the Data folder. Real, verified entry format: origBaseID|swapBaseID|transformOverrides|chance (single replacement) or origBaseID|swapBaseID,swapBase2ID,swapBase3ID|transformOverrides|chance (random choice among several swap targets) — origBase targets EVERY reference of that base object, while a [References] section targets one SPECIFIC placed reference instead of every instance of its type. Scoping sections like [Forms|LocationEDID,CellEDID,KeywordEDID,RegionEDID] let a swap rule apply only within a specific location/cell/keyword-tagged area/region rather than globally.",
    criticalPrecombineLimitation: "IMPORTANT, verified real limitation directly reinforcing everything documented about precombine elsewhere in this knowledge base: swapping STATICS and static collections (SCOL) is explicitly NOT recommended with this tool, because precombine bakes a specific mesh reference into the cell's combined data at the CK-authoring stage — swapping the base object at runtime doesn't retroactively update that baked precombined mesh, producing the same class of visual/performance breakage as any other precombine-invalidating edit documented above. This tool is genuinely powerful for swapping NPCs, items, and non-precombined objects, but is not a safe general-purpose 'replace any static in the world' solution — yet another real, concrete confirmation that precombine constrains far more of FO4's moddable surface than just settlement building or new worldspaces.",
    moddingImplication: "Use Base Object Swapper for conditional/contextual substitution that doesn't need a full new leveled list or a hand-authored patch — e.g. swapping a specific NPC's weapon based on location, or offering a random cosmetic variant of a non-precombined object — but reach for the precombine-safe techniques documented elsewhere (leveled-list injection, SPID distribution, hand-placed references) when the target is a precombined static."
  },

  // === ROBCO PATCHER — THE FOURTH DISTINCT NICHE IN THE CONFIG-DRIVEN PATCHING ECOSYSTEM (real, F4SE/CommonLibF4-based) ===
  // This completes a coherent four-part picture alongside SPID (distribute new content TO matching
  // NPCs) and Base Object Swapper (swap WHAT an object/NPC actually IS): RobCo Patcher's distinct
  // niche is patching EXISTING record ATTRIBUTES/fields on matching records, without touching a
  // plugin at all — a third genuinely different operation on the same general 'filter + config file'
  // philosophy.
  robCoPatcher: {
    overview: "RobCo Patcher (real, verified — F4SE/CommonLibF4-based, confirmed via its own GitHub repo) lets mod authors and END USERS modify existing record ATTRIBUTES (ammo, NPCs, races, weapons, and more) at runtime via filter-matched config, without creating a plugin — this is a genuinely distinct operation from SPID (which distributes/adds content to matching NPCs) and Base Object Swapper (which substitutes what object a reference resolves to): RobCo Patcher edits FIELDS on records that already exist, based on filter matches, entirely soft (no ESP/ESL at all for the patch itself).",
    realVerifiedMechanism: "Configuration lives in a plain ini file next to the plugin DLL, with patcher options individually toggleable. The real, verified filter mechanism for something like race patching: filterByRaces targets specific races directly, filterByKeywords broadens the match to any race carrying a given keyword — once matched, the config can set specific Attribute Values on those records directly, or even add spells from OTHER mods onto matching records, entirely at runtime.",
    moddingImplication: "This is the real answer to 'I want to tweak an existing record's stat/attribute across many matching NPCs/objects without a hand-authored xEdit patch and without a plugin at all' — the fourth real, distinct tool completing this ecosystem: SPID to distribute new content, Base Object Swapper to substitute object identity, RobCo Patcher to adjust existing attributes on matching records, and SUP F4SE (see externalFileIOADistinctPersistenceMechanism above) for arbitrary external JSON file I/O. A mod author facing a compatibility/patching problem should identify which of these four operations is actually needed before assuming a bespoke Papyrus script or a hand-authored xEdit patch is the only path."
  },

  // === CRAFTING / CONSTRUCTIBLE OBJECT SYSTEM (verified against falloutck.uesp.net Constructible_Object) ===
  // === VENDOR / MERCHANT NPC CREATION (verified via ck.uesp.net Faction docs — the Vendor tab mechanism) ===
  vendorMerchantWorkflow: {
    overview: "A merchant NPC is not a special Actor type — 'being a vendor' is a property of the FACTION an actor belongs to, not the actor itself. The Faction record has a dedicated Vendor tab; any actor who is a member of a vendor-enabled Faction automatically gets buy/sell dialogue and behavior.",
    vendorFactionFields: [
      "Vendor Buy/Sell List — typically a FormList of keywords defining what item CATEGORIES this vendor deals in (e.g. only buys/sells items tagged with weapon-related keywords for a weapons vendor); this is what actually gates which items show up in their sell inventory and which items they'll buy from the player",
      "Merchant Container — the actual container object the vendor's stock lives in and gets restocked into; the container is owned by the Faction, not by the individual NPC, which is why multiple vendor NPCs in the same Faction can share one stock/container if that's the intended design",
      "Vendor open/close hours — the Faction's vendor data can restrict what hours the shop is actually open for business"
    ],
    moddingWorkflow: [
      "Create the Merchant Container (or reuse an existing vendor container if adding this NPC to an existing shop) and stock it with sellable items",
      "Create (or reuse) a vendor-enabled Faction: set its Vendor Buy/Sell List (the keyword FormList) and link the Merchant Container to it",
      "Add the NPC's ActorBase to that Faction — this is the step that actually makes them behave as a merchant; nothing else on the NPC record itself needs to change",
      "On the NPC's own AI Data tab, confirm it's set to allow the relevant buy/sell item types — a vendor Faction with the right keyword list but an NPC whose own AI Data doesn't permit trading in those types is a common 'vendor won't buy my item' mistake",
      "Test both directions (buying FROM and selling TO the vendor) — a common oversight is confirming the sell side works while never testing whether the vendor actually restocks/refreshes correctly over time"
    ]
  },

  craftingRecipeSystem: {
    overview: "Every craftable item in FO4 — weapon mods, armor mods, chems, food, settlement objects — is defined by a COBJ (Constructible Object) record, not a script. COBJ is a pure data/recipe record; Papyrus is only involved if a mod wants to react to something being crafted.",
    coreFields: [
      "Created Object — the item this recipe produces, and Created Object Count — how many copies per craft",
      "Workbench Keyword — which crafting station this recipe appears at (e.g. WorkbenchChemLab for the chemistry station, WorkbenchWeapons for the weapons bench); a recipe with no workbench keyword won't show up anywhere",
      "Required Item List — the consumed ingredients; the game draws these from the workbench's linked container/workshop stock FIRST, then the player's own inventory, if a workbench provides that sharing",
      "Recipe Filters (Keywords, e.g. RecipeUtility, RecipeFood) — controls which category tab the recipe is sorted into inside a given workbench's menu",
      "Conditions (CTDA) — same condition system as dialogue/perks; used to gate a recipe behind a quest stage, a perk rank, or a global variable (e.g. requiring a specific perk rank before an item mod becomes craftable)",
      "Priority — lower number sorts first; same-priority recipes fall back to alphabetical order in the menu"
    ],
    moddingWorkflow: "New craftable items need: (1) the item itself (Weapon/Armor/MiscObject/etc. record with its model), (2) a COBJ record pointing to it with the correct Workbench Keyword, and (3) usually a condition or perk requirement so it isn't craftable from level 1 with no context. Missing step 2 is the most common 'I made an item but it's not craftable' mistake.",
    weaponArmorMods: "Weapon and Armor 'mods' (the attachable upgrades, not to be confused with a Nexus 'mod') are OMOD (Object Modification) records, each still driven by its own COBJ recipe at the appropriate bench, with the OMOD defining the actual stat/keyword/model changes applied to the base item.",
    innrInstanceNamingRules: "Real, specific, previously undocumented record type completing the OMOD picture above: INNR (Instance Naming Rules, found under Miscellaneous in the Object Window) is what generates the DISPLAY NAME update when a weapon/armor gets mods attached — it uses keyword-driven prefix/suffix rules that combine based on which OMODs are currently equipped, which is why a modified weapon's name changes to reflect its current configuration (e.g. reflecting an attached caliber/receiver mod) rather than always showing the base item's plain name. A new weapon/armor mod that adds custom OMODs but wants the item's displayed name to actually update to reflect them needs its own INNR ruleset wired to the relevant OMOD keywords — without it, new OMODs will change stats/model correctly but the displayed name will stay static, which is a common, easy-to-miss gap for a new equipment-mod system."
  },

  // === NEW WEAPON CREATION WORKFLOW (verified — animation-keyword mechanism, projectile types, NPC-usability requirements) ===
  // craftingRecipeSystem above covers how to make a NEW weapon craftABLE; this covers the separate
  // question of making the WEAP record itself function correctly — the piece most new-weapon tutorials
  // skip, which is exactly why "my custom weapon T-poses / plays the wrong reload animation" is one
  // of the most common new-weapon-modder complaints.
  weaponCreationWorkflow: {
    animationKeywordMechanism: "A weapon's held/aim/reload/fire animation set is selected by KEYWORD, not by a dropdown 'animation type' field — verified naming convention: keywords like AnimsGripPistolMOD (pistol grip-style animations) or Anims1hmWeaponMOD (one-handed melee) are what the engine actually reads to pick the correct animation set for a weapon. Forgetting to add the correct Anims* keyword (or copying the wrong one from a mismatched template weapon) is the single most common cause of a new weapon T-posing, using the wrong reload animation, or not animating at all when equipped — check this BEFORE assuming a rigging/mesh problem.",
    projectileTypes: "The Projectile record attached to a weapon's Ammo determines actual flight behavior, not the weapon itself: Missile (straight-line hitscan-like travel), Lobber (arcing, for grenades/thrown mines), Beam (instant-travel, for lasers/plasma/electricity weapons), Flame (sprayed/cone-pattern, for flamer-type weapons), and Arrow. Picking the wrong Projectile type for a new weapon's concept (e.g. using Missile for something meant to arc like a grenade launcher) is a distinct mistake from animation keyword problems — a weapon can animate perfectly and still fire completely wrong because of this.",
    npcUsabilityRequirements: "A new weapon appearing correctly on NPCs (not just the player) needs it added to the relevant leveled item list(s) (see leveledListSystem above — this is the standard non-destructive injection point) AND an NPC Add Ammo List field set on the weapon itself, which controls how much ammunition an NPC using that weapon actually carries when the game spawns it on them — a weapon with no NPC Ammo List entry can end up on an NPC with no ammo to fire it.",
    moddingWorkflow: [
      "Model/rig the weapon (see meshPipeline above) with the correct node structure: WeaponRoot, the weapon's own bone, muzzle node(s) for muzzle-flash/projectile origin alignment, and a scope node if it supports scope attachments",
      "Create the WEAP record: link the model, set damage/fire-rate/reload-time stats, and — critically — add the correct Anims* animation keyword matching the weapon's intended grip/handling style (copy from the closest vanilla weapon of the same handling type as a safe starting point)",
      "Create or reuse an Ammo record and a matching Projectile record with the flight-behavior type that actually matches the weapon's concept",
      "Set the NPC Add Ammo List so NPCs who spawn with this weapon also spawn with ammo for it",
      "Add the weapon to the appropriate leveled item list(s) if it should appear in vanilla loot/NPC spawns rather than only via a craftable recipe or hand-placed instances",
      "If the weapon should be craftable, follow craftingRecipeSystem above (COBJ + Workbench Keyword) — this is a separate, additional step from making the base WEAP record function correctly"
    ]
  },

  // === NEW ARMOR/OUTFIT CREATION WORKFLOW (verified — Armor/ArmorAddon relationship, biped slots, race/gender compatibility) ===
  // This is the ordinary-clothing/armor counterpart to weaponCreationWorkflow above — same "record
  // catalog only lists field names" gap, closed here with the actual Armor↔ArmorAddon mechanism.
  armorOutfitCreationWorkflow: {
    armorVsArmorAddonRelationship: "An Armor record is the wearable ITEM (what shows up in inventory, what a COBJ recipe produces, what carries the actual armor-rating/keyword stats); an ArmorAddon (ARMA) record is what defines how that item actually LOOKS on a body when worn. One Armor can reference multiple ArmorAddons — this is how a single 'item' covers multiple body parts at once, or how the same conceptual outfit supports multiple races/species with different body shapes.",
    bipedSlotsAndLayering: "Body coverage is defined by Biped Object slot flags shared between Armor and ArmorAddon — verified naming convention: slots marked [U] (Under) are worn beneath slots marked [A] (Over/Armor), which render on top and are what's actually visible in third person. This is why a vanilla outfit + armor piece layer correctly (the outfit occupies [U] slots, the armor piece occupies the corresponding [A] slots) rather than one replacing the other — a new outfit that's supposed to layer under armor needs to occupy the matching [U] slot, not the [A] slot the armor itself uses.",
    raceAndGenderCompatibility: "The Race field on an ArmorAddon determines which Biped Object nodes are even available to assign meshes to, and which races can equip it at all — supporting an additional race (e.g. a non-default body type) means adding that race to the ArmorAddon with matching biped nodes, not just re-exporting the same mesh. Separately, each ArmorAddon has independent Male and Female mesh/texture slots — a new outfit needs both filled (even if one is a mirrored/adjusted version of the other) or one gender will show the wrong/missing mesh in-game.",
    moddingWorkflow: [
      "Model/texture the outfit (see meshPipeline/blenderToFO4 above) — for a body-conforming outfit, this typically means starting from the vanilla body/outfit mesh as a base rather than an unrelated custom body shape, unless specifically building for a body-replacer ecosystem (e.g. CBBE) where the outfit must be compatible with that replacer's base shape instead",
      "Create the ArmorAddon(s): assign the Male and Female meshes, set the Race(s) it supports, and set the Biped Object slots it occupies ([U]/[A] as appropriate for how it should layer with other equipment)",
      "Create the Armor record referencing the ArmorAddon(s), set its armor-rating/keyword/value stats, and add it to a leveled list and/or a COBJ recipe depending on how players should acquire it (see leveledListSystem / craftingRecipeSystem above)",
      "Test on both genders and any additional supported races, and test layering with common vanilla pieces (e.g. does it clip with a vanilla armor piece meant to layer over it) before considering it complete — slot/race mismatches are the single most common 'invisible body part' or 'wrong mesh shows on one gender' bug report for new armor mods"
    ]
  },

  // === POWER ARMOR SYSTEM (verified via Actor.psc / PowerArmorBatteryInsertScript.psc / ArmorAddon docs) ===
  powerArmorSystem: {
    overview: "Power Armor is built from a Frame (an Armor record with a dedicated biped slot, functioning as furniture the player enters/exits) plus separate piece Armor records (torso/arms/legs/helmet) that attach to the frame via ArmorAddon biped-slot matching — mechanically similar to normal armor layering, but gated by the frame's own enter/exit state and fusion-core power.",
    enteringExiting: "Entering/exiting a frame is handled as furniture activation, not equipment-swap — Actor.psc exposes native `IsInPowerArmor()` and `SwitchToPowerArmor(ObjectReference aArmorFurniture)` for scripts that need to check or force this state (e.g. quest scenes that place the player directly into a suit).",
    fusionCoreMechanism: "Fusion core insertion is keyword- and state-driven, not a simple inventory check: PowerArmorBatteryInsertScript listens for OnItemAdded filtered to a battery keyword, plays the insert animation via a dedicated animation keyword, disables player input during the animation (InputEnableLayer), and only re-enables normal furniture behavior in a completion callback — a mod that tries to 'give the player a fusion core' via script without going through this furniture flow will not visually insert it or start power drain.",
    hardcodedSettlerAutoArmorBehavior: "Real, documented, hardcoded settlement-defense AI behavior worth knowing when designing any settlement with power armor present: settlers under attack will automatically path to and enter a NEARBY power armor frame during combat — and this is PRIORITIZED over picking up an available superior weapon (e.g. a settler will run for power armor instead of grabbing a Gatling laser sitting right next to them). If the frame has no fusion core, the settler will grab a nearby one to power it. The fusion core STAYS in the frame after the settler ejects (it is not returned to storage), which is a real, common source of players finding their carefully-stockpiled fusion cores mysteriously missing. The only real prevention is architectural: store power armor frames (and any spare fusion cores) somewhere settlers cannot path to during combat, not a settings toggle — this connects directly to the settlerPathingIsARealDesignConstraint note under settlementSystem above.",
    moddingImplications: [
      "Adding a new power armor set means new Frame + new piece Armor/ArmorAddon records with matching biped slots, plus (usually) a PowerArmorWorkbench-compatible OMOD paint-job/mod chain if you want it upgradeable at the armor bench",
      "The bare Frame (no pieces attached) cannot be crafted from scratch by the player in vanilla — frames are placed in the world or given via console/script; mods that let players build frames from the workshop menu (e.g. 'Manufacturing Extended'-style mods) add this as new functionality rather than exposing a hidden vanilla feature",
      "Because entering a frame is a furniture activation, PA-specific quest scenes/animations need to account for the player being in 'power armor furniture' state, not just checking equipped armor slots"
    ]
  },

  // === TERMINAL SYSTEM (verified via Terminal.psc — real signatures, not guessed) ===
  terminalSystem: {
    overview: "TERM records define hackable/usable in-world terminals: a tree of menu items (text options, possibly gated by a hacking minigame) that can display text logs, launch a sub-menu, or run a Papyrus fragment.",
    realVerifiedAPI: [
      "Event OnMenuItemRun(int auiMenuItemID, ObjectReference akTerminalRef) — fires when a menu item with an attached Papyrus fragment is selected, alongside (not instead of) the item's non-scripted behavior (e.g. unlocking a door)",
      "Function ShowOnPipboy() native — pushes the terminal's content to the player's Pip-Boy display path"
    ],
    moddingWorkflow: "In the Creation Kit's Terminal menu editor, each menu item can carry a Papyrus Fragment (compiled inline, similar to quest stage fragments) that runs via OnMenuItemRun when selected — this is how vanilla terminals trigger quest stages, unlock doors, or spawn effects from a text menu choice, without a separate always-running script on the terminal itself.",
    hackingMinigame: "Terminal hacking difficulty (Novice/Advanced/Expert/Master) is a property on the TERM record read by the game's built-in hacking minigame UI — modders set the difficulty, not the minigame logic itself, which is hardcoded engine behavior."
  },

  // === HOLOTAPE SYSTEM (verified: Holotape.psc is a bare native Form — confirms data-only base type) ===
  holotapeSystem: {
    overview: "Holotape is a native Form type with no exposed Papyrus functions of its own (verified: Data/Scripts/Source/Base/Holotape.psc declares no functions/events) — holotapes are data containers whose actual behavior (playing a recorded voice log, running a mini-game like Zork/Automatron, or unlocking a Perk/quest stage) is implemented by attaching a script to the specific holotape's ObjectReference/quest-alias, not by the Holotape type itself.",
    commonPatterns: [
      "Voice-log holotapes: script on OnEquipped (or a MiscObject 'Play' setup) triggers Sound/Message playback",
      "Quest-trigger holotapes: picking up or playing the tape advances a quest stage via a script referencing the owning Quest",
      "Terminal-readable holotapes (found and inserted into a terminal in-world) surface as unlockable TERM menu content rather than being played directly by the player"
    ],
    moddingImplication: "A new holotape needs the MiscObject/Holotape record itself plus a purpose-built script (or terminal wiring) — there is no built-in 'play this audio when equipped' behavior to rely on without a script, unlike vanilla's Note/Book text-display path."
  },

  // === RADIO / MUSIC SYSTEM (verified via community CK tutorials — MUSC + radio quest structure) ===
  radioMusicSystem: {
    overview: "A custom radio station is built from four pieces: a Quest (owns the station's runtime state), a Radio Transmitter reference in the world (the in-world broadcast source), Sound Descriptors for each track (16-bit WAV, placed under Data/Sound/FX/Radio/<StationName>/), and a Message record controlling the station's Pip-Boy list entry (name, icon).",
    questAliases: "The station quest typically uses Reference Aliases (prefixed like Alias_NRadio by convention) to bind to the transmitter and manage playback state/order rather than hardcoding references, matching the general Quest Alias pattern used elsewhere in FO4 questing.",
    playbackBehavior: "CORRECTED — verified more precisely from a real, current (2026) build tutorial: playback is NOT just an ad-hoc Papyrus shuffle script, it's built on the same Scene/Phase system documented under sceneSystem above — a real Scene is created on the radio quest with the Radio Transmitter added as an ALIAS ACTOR, and each Phase in that scene plays a song plus its host intro/outro lines, with the whole scene looping. Many stations add extra filler Scenes/Phases between songs specifically for banter, ads, or news delivered 'by' the host — this is standard practice, not an advanced technique. There is still no built-in 'shuffle my folder of files' engine feature — track ORDER (as opposed to per-song playback) is what a station's own script logic controls, layered on top of this Scene-driven playback structure.",
    realFileConventions: "Verified real, specific conventions from current tutorials: audio files are named numerically (01.wav/01.xwm through up to 40.wav/40.xwm — 40 tracks is the commonly-documented practical ceiling for a single station) and placed at Data/Sound/FX/Radio/<StationName>/. The Radio Transmitter reference needs its 'Ignores Distance Checks' flag set specifically so the Pip-Boy can pick up the broadcast regardless of the player's actual distance from the transmitter object in the world — without this flag, the station would only be audible/selectable near the physical transmitter, which is almost never the intended design for a Pip-Boy radio station.",
    moddingImplication: "Custom radio stations are entirely content-driven (no hardcoded engine limitation blocks them) but require the full quest+transmitter+sound-descriptor chain to be wired correctly — a station missing its Message record will play audio but never appear as a selectable option on the Pip-Boy radio menu."
  },

  // === ENCOUNTER ZONE SYSTEM (verified via EncounterZone.psc — real native signatures) ===
  encounterZoneSystem: {
    overview: "EZN (Encounter Zone) records control level-scaling and NPC-never-reset behavior for the cells/worldspace regions linked to them — this is why walking into a notionally 'low level' area that's linked to a high-level Encounter Zone spawns tough enemies, independent of the cell's own data.",
    keyFlags: "Never Resets (spawns in this zone don't respawn on cell reset — used for unique/boss encounters so they don't reappear), Location Can't Be Reset From Automation, and a Min/Max level range that clamps the scaling applied to leveled actors/items spawned within the zone.",
    realVerifiedAPI: [
      "int Function CountActors(Keyword apRequiredLinkedRefKeyword = None, Keyword apExcludeLinkedRefKeyword = None) native — counts instantiated actors currently belonging to this zone, across all process levels",
      "Actor[] Function GetActors(Keyword apRequiredLinkedRefKeyword = None, Keyword apExcludeLinkedRefKeyword = None) native — returns those actors as an array; prefer this over CountActors if you're going to inspect the actors anyway rather than calling both",
      "Function Reset() native — forces the zone's spawns to reset the next time the player re-enters, regardless of the normal 3-in-game-day respawn timer"
    ],
    moddingImplication: "A new worldspace/cell region needs its own Encounter Zone (or an explicit link to an existing one) to get sensible level scaling — cells with no EZN assigned fall back to default/unscaled spawn behavior, which is a common cause of 'enemies here are always the same weak/strong level regardless of player level' bug reports in new worldspace mods."
  },

  // === LEGENDARY ITEM SYSTEM (verified from LegendaryItemQuestScript.psc — the actual shipped quest script) ===
  legendaryItemSystem: {
    overview: "Legendary drops are generated at runtime, not pre-placed: LegendaryItemQuestScript.GenerateLegendaryItem() spawns a random item from a leveled list, then picks ONE compatible legendary Object Mod (OMOD, filtered to 'mod_Legendary') and attaches it via AttachMod() — the star icon and effect text are just that OMOD's normal name/effect display.",
    legendaryModRuleStruct: "Each possible legendary effect is registered as a LegendaryModRule entry on the quest: a reference to its ObjectMod, an AllowedKeywords formlist (item must have at least one to be eligible), a DisallowedKeywords formlist (any match excludes it, and this overrides AllowedKeywords), and an AllowGrenades bool (most legendary mods are excluded from grenades by default).",
    antiRepeatLogic: "The quest script tracks a PreviouslySpawnedMods array and prefers picking from effects NOT in that list, only resetting/clearing it once every currently-eligible mod has been exhausted — this is why the same legendary effect rarely drops twice in a row, without it being a hard 'no duplicates' rule.",
    doOnceGuard: "Each spawn container/actor is flagged via a 'SpawnedLegendaryItem' ActorValue set to 1 after generating an item, checked at the top of GenerateLegendaryItem() to prevent the same enemy/container from ever generating a second legendary item.",
    moddingWorkflow: "Adding a new legendary effect requires: (1) an ObjectMod record with the 'mod_Legendary' filter keyword implementing the actual stat/effect change, (2) a new LegendaryModRule entry added to LegendaryItemQuestScript's LegendaryModRules array (via a script-property edit or an xEdit-level array append) referencing that OMOD and whatever keyword gating it needs. Skipping step 2 is the most common reason a new 'legendary mod' record exists in a plugin but never actually drops in-game — the OMOD alone is inert without a rule entry pointing to it."
  },

  // === EXTENSIBLE CUSTOM SYSTEM ARCHITECTURE (Controller Quest + Injection Quest + keyword-tagged Formlist pattern) ===
  // A general, reusable design pattern — not vanilla-specific — for building a mod's OWN custom
  // system (equipment sets, effect pools, spawn tables, anything with 'many interchangeable entries')
  // such that OTHER mod authors can safely extend it without editing your core files. Verified as a
  // real, independently-converged pattern: Bethesda's own legendaryItemSystem above uses this exact
  // shape (a central quest holding a rule/array property that other content registers into), and
  // America Rising 2's real, documented Equipment Control System (its own official modder-resources
  // wiki) converged on the identical architecture completely independently, years later.
  // === MULTI-CHARACTER ANIMATION FRAMEWORK LANDSCAPE (real, evolving — verify current recommendation rather than assuming one is "the" standard) ===
  animationFrameworkLandscape: {
    overview: "There are multiple real, F4SE-based frameworks solving the same problem — playing custom multi-character/pose animations from a scalable pack system — and which one is current-best has genuinely changed over time, making this a category worth re-checking rather than assuming a single long-standing answer still holds.",
    aafAdvancedAnimationFramework: "AAF (Advanced Animation Framework) is the older, longer-established framework: F4SE-dependent, XML-configured, with its own custom UI for arranging/triggering animation packs.",
    nafNativeAnimationFrameworkNewer: "NAF (Native Animation Framework) is a real, verified NEWER alternative built specifically for performance/reliability improvements over AAF: it can dynamically play HKX animations WITHOUT needing an ESP at all (freeing a load-order slot AAF-based content typically consumes), it uses the actual player character directly in multi-character scenes instead of a stand-in 'doppelganger' body (letting scenes start seamlessly without a fade-to-black transition AAF needs), and its XML mapping/caching system is reported to load configuration up to 80x faster than AAF's. CRITICAL real compatibility fact: AAF and NAF cannot run together — a mod/user must choose one, not both, so recommending 'just install both' is actively wrong here, unlike most framework pairs in this knowledge base.",
    smallerScopedExample: "Immersive Animation Framework (IAF) is a real, narrower example in the same space — adds animations specifically to ingestible items (food/chems/drinks) and serves as a template other mod authors build similar item-animation content on top of, illustrating the same 'framework + content built on top of it by others' pattern documented elsewhere in this knowledge base at a smaller, more focused scope than AAF/NAF's full multi-character scene systems.",
    moddingImplication: "Before recommending an animation-framework dependency for a new mod, confirm which of AAF/NAF is currently the more actively maintained/recommended choice rather than defaulting to whichever is more historically well-known — this specific category has a documented, real technical successor (NAF) that didn't exist when AAF became the original standard, and the two are mutually exclusive so the choice actually matters rather than being a minor preference."
  },

  extensibleCustomSystemArchitecture: {
    theProblem: "A naive 'central list' design (one quest/script holding a hardcoded array of every possible entry) forces every mod that wants to add to it to either edit your plugin directly (creating a master-dependency and guaranteeing conflicts between multiple add-on mods) or maintain a separate patch that breaks the moment you update your own array.",
    theProvenPattern: "Split the system into two pieces: (1) a CONTROLLER (a quest/script holding the actual master arrays and the runtime logic that consumes them — e.g. LegendaryItemQuestScript's LegendaryModRules, or a real community example's 'ECS Controller' holding equipment arrays tagged by an identifying keyword), and (2) INJECTION points — separate, independent quests (each with a small OnInit-style script) whose only job is to register new entries into the controller's array/formlist at load time. Bethesda's own base-game content and a completely independent, real, documented community mod (America Rising 2's Equipment Control System, per its own official modder-resources documentation) both converged on this exact shape without either copying the other.",
    whyItWorks: "New content mods each ship their OWN small injection quest (their own Start()/OnInit() trigger, their own formlist of new entries, tagged with whatever identifying keyword the controller expects) — multiple add-on mods can all inject into the same controller simultaneously with zero master-dependency conflicts between the add-ons themselves, since none of them touch the controller's own file, only its data at runtime.",
    moddingImplication: "If you're building a mod with a system you want THIRD PARTIES to be able to extend (a custom loot-effect pool, a custom equipment/loadout system, a custom spawn table), design it this way from day one: controller quest + array/formlist property + a documented keyword/tagging convention + your own default content shipped as just another injection quest (not special-cased into the controller). Retrofitting this after release, once other mods have already resorted to directly editing your controller as their only option, is far more painful than designing for extension upfront.",

    realDataDrivenInjectorViaStructProperty: "Real, complete, verified alternative shape for the SAME extensibility problem, applied to Leveled Items specifically (Leveled Item Fixes / Dank_LeveledItemInject.psc) — instead of a formlist controller, this uses a Papyrus Struct as the config schema: 'Struct InjectorStruct / LeveledItem targetLVLI / Form sourceFORM / int levelOverride / int countOverride / EndStruct', then a single Property 'InjectorStruct[] Property injectData Auto Const Mandatory' that a modder fills entirely from the CK Properties window — NO scripting required from whoever uses it, just populate the struct array with (target list, item to inject, optional per-entry level/count override) and the script's own OnQuestInit() loops the array calling the real, already-documented 'targetLVLI.AddForm(sourceFORM, level, count)' for each entry, falling back to global default level/count properties when an entry's override is left at 0. Two real Papyrus language features worth knowing from this example: (1) 'Group UserData ... EndGroup' visually organizes related Properties together in the CK Properties window (purely organizational, no behavior difference) — useful once a script has many Properties; (2) a Struct member can carry an inline '{curly-brace comment}' immediately after its declaration, which CK displays as that field's tooltip in the Properties/Struct editor UI, worth using on any Property meant for a non-scripting modder to fill in.",
    realCrossPluginDynamicFormArray: "Real, verified pattern (Optimization and Tweaks for Thuggysmurf's Quest Mods, THUGGOPT_DynamicEnablerRefScript.psc) for referencing an arbitrary, configurable LIST of objects that might live in ANY plugin — including ones this script's own plugin doesn't master — without needing one ObjectReference Property per object: three parallel arrays, 'Int[] Property FormIDs', 'String[] Property Filenames', 'Bool[] Property Enables', resolved at runtime via 'Game.GetFormFromFile(FormIDs[i], Filenames[i]) as ObjectReference' inside Event OnLoad()/OnUnload() on the placed reference this script is attached to (a real, verified alternative to ReferenceAlias arrays for this specific need). This avoids the normal FO4Edit master-dependency requirement for referencing another plugin's records directly as a Form Property, at the cost of losing compile-time/CK-time validation that the FormID+filename pair actually resolves to something real — a real, honest tradeoff worth stating when recommending this technique over a plain Property."
  },

  // === CRIME / FACTION REPUTATION SYSTEM (verified from Faction.psc — real native signatures) ===
  crimeFactionReputationSystem: {
    overview: "Crime tracking (trespassing, assault, theft, murder) is per-Faction, not global — each Faction record accumulates its own 'CrimeGold' (bounty) value, separately tracked for violent vs non-violent offenses, and NPCs belonging to that faction react based on it.",
    realVerifiedAPI: [
      "int Function GetCrimeGold() / GetCrimeGoldNonViolent() / GetCrimeGoldViolent() native — current bounty owed to this faction, split by offense category",
      "Function ModCrimeGold(int aiAmount, bool abViolent = false) / SetCrimeGold(int aiGold) / SetCrimeGoldViolent(int aiGold) native — the actual mechanism scripts use to add a bounty when the player commits a crime witnessed by a faction member",
      "bool Function CanPayCrimeGold() native and Function PlayerPayCrimeGold(bool abRemoveStolenItems = true, bool abGoToJail = true) native — the pay-off-your-bounty flow used by guard/law-enforcement dialogue",
      "int Function GetInfamy() / GetInfamyNonViolent() / GetInfamyViolent() native — a separate reputation-damage tally distinct from CrimeGold, read by faction disposition logic",
      "Function SendAssaultAlarm() native — the function that actually triggers nearby faction members to go hostile in response to a witnessed attack",
      "Function SendPlayerToJail(bool abRemoveInventory = true, bool abRealJail = true) native, bool Function IsPlayerExpelled() / Function SetPlayerExpelled(bool abIsExpelled = true) native — jail and settlement-expulsion consequences",
      "Function SetEnemy(...) / SetAlly(...) native — the actual mechanism that flips two factions hostile/friendly toward each other, each with independent self→other and other→self relationship flags (relationships are NOT automatically symmetric unless both flags are set)"
    ],
    moddingImplication: "A custom crime faction (e.g. a new settlement's guards) needs its own Faction record with crime-gold tracking enabled and a witness/detection script calling ModCrimeGold/SendAssaultAlarm on the right triggers — there is no single global 'crime system,' each faction's reaction is only as good as the scripting wired to detect and report the crime to it."
  },

  // === LOCKPICKING & PICKPOCKETING (verified: no dedicated native Papyrus object exists for either) ===
  lockpickingPickpocketing: {
    overview: "Unlike Terminals (which expose a scriptable Terminal Form) or Encounter Zones, lockpicking and pickpocketing have NO dedicated native Papyrus script object in the shipped source — confirmed by searching Scripts/Source/Base for Lockpick/Pickpocket-named scripts, which only turn up quest-specific FRAGMENT scripts (e.g. QF_PlayerLockpickSuccess, QF_CA_PickPocket) reacting to specific quest events, not a general reusable API.",
    lockpicking: "Difficulty (Novice/Advanced/Expert/Master, matching the terminal-hacking tiers) is set per-container/door on the LOCK subrecord; the bobby-pin minigame itself is hardcoded engine UI with no CK-exposed tuning beyond that difficulty tier and the player's Perception-derived success rate from the Locksmith perk ranks.",
    pickpocketing: "Success chance is an internal formula driven by the player's Agility/Sneak-related stats plus item weight relative to the target's inventory (heavier/more-valuable items are harder to lift unnoticed) and the Pickpocket-related perks (e.g. Pick Pocket-, Trigger Discipline-style rank bonuses) — none of this is exposed as a moddable formula in the CK; only the perks that modify its inputs are.",
    moddingImplication: "You cannot rewire how the lockpicking/pickpocketing minigames themselves function (that's hardcoded engine behavior, same class of limitation as VATS' core targeting); modding options are limited to (a) changing a lock/container's difficulty tier, (b) adding new Perks that hook the existing bonus multipliers, or (c) reacting to the quest-fragment success/fail events for scripted consequences (e.g. an NPC noticing a failed pickpocket)."
  },

  // === DLC-SPECIFIC SYSTEMS (verified directly from each DLC's shipped Scripts/Source/<DLC0N>.zip source) ===
  // Confirms these DLC mechanics are built ON TOP OF existing engine systems (Object Mods, Workshop framework,
  // furniture scripts) rather than being separate bespoke engines — important for modders assuming they need
  // to reverse-engineer a whole new system when they actually just need to extend a familiar one.
  dlcSpecificSystems: {
    automatronRobotCrafting: {
      overview: "Robot customization at the Robot Workbench (Automatron) uses the SAME core Object Mod (OMOD)/AttachMod() mechanism as ordinary weapon and armor crafting — DLC01BotModQuestScript drives the workbench UI and orchestrates attaching player-chosen OMODs to the robot actor, gated by DLC01CompanionModdableBotKeywordMgr's keyword restrictions (which parts a given chassis/torso can accept).",
      unstableModsClarified: "The 'unstable mod' restriction system (DLC01_UnstableModRestrictionScript, verified from source) is NOT a robot-malfunction/berserk mechanic — it's a combat-balance guard that conditionally enables an attached mod's bonus effects only when the current combat target is within a configured range/distance band and at or above a level threshold relative to the player (e.g. preventing an explosive mod's full effect from trivializing a weak, point-blank enemy). It runs on a repeating timer only during active combat.",
      moddingImplication: "New robot parts are added the same way new weapon/armor mods are: a new OMOD plus whatever keyword tags gate which chassis can equip it. No separate 'robot part system' needs to be reverse-engineered. Note this only covers the CHASSIS/appearance/stat-modding side — a custom robot COMPANION (like Ada) still becomes an actual follower through the exact same general mechanism documented under companionSystem above (FollowersScript.SetCompanion → Actor.SetPlayerTeammate, plus its own CompanionActorScript for personality/affinity) — Robot-race actors aren't a special case of the companion system, just a special case of the crafting/appearance system layered on top of it."
    },
    farHarborFogCondensers: {
      overview: "Fog condensers (Far Harbor) are settlement-adjacent furniture objects, not a resource-system extension — verified via FogCondenserFurnitureScript: each is an ObjectReference tracking its own bRepaired state, blocking/unblocking player activation and switching a simple 'Stage1'/'Stage2NoTransition' animation based on that state, with an optional GetLinkedRef'd flora object that becomes harvestable once the condenser is in its broken/unrepaired state.",
      moddingImplication: "A custom 'condenser-style' harvestable/repairable object can reuse this exact pattern: a bool repair-state property, BlockActivation tied to that state, and a linked flora/resource reference — no new engine feature is needed, just the same furniture-script shape."
    },
    nukaWorldGangTerritory: {
      overview: "Nuka-World's gang-territory assignment (the Overseer's Desk) is implemented as a specialized WorkshopObjectScript subclass (DLC06WorkshopOverseerDeskScript, verified from source) layered on the ordinary Workshop/settlement-NPC-assignment framework, not a separate gang-simulation engine — its AssignActorCustom() override specifically clears normal actor ownership because the desk itself should never be 'owned' the way a regular settler assignment is.",
      moddingImplication: "A custom faction-territory-assignment object for a new settlement system can follow the same approach: subclass WorkshopObjectScript and override the relevant Workshop assignment hooks rather than building parallel infrastructure.",
      addingANewGangHonestLimitation: "Checked the FULL DLC06 script archive (99 files — DLC06OverseerHandlerScript, DLC06WorkshopParent, every quest/fragment script) specifically for how the three named gangs (Disciples/Operators/Pack) get assigned to individual park zones: no script anywhere is named for gangs/territory/park-assignment, and DLC06OverseerHandlerScript turned out to be the generic settlement-worker-job system (farmer/scavenger/vendor/guard counts), not gang-specific. The actual per-park gang ownership almost certainly lives in simple Location-Faction ownership tracking driven by quest-stage scripts (the same general pattern as regular settlement ownership), not a dedicated 'gang system' with its own API. Be honest with users that 'add a new gang' has no established community modding workflow and no clean single system this knowledge base (or the wider community, per web search) can point to — it would require reverse-engineering the specific quest/location wiring from the vanilla ESM directly, not following a documented recipe."
    },
    wastelandWorkshopCreatureCages: {
      overview: "Creature capture cages (Wasteland Workshop) are WorkshopObjectScript-derived furniture, verified from WorkshopCageScript: capture is a time-rolled process, not instant — a cage needs power, then rolls for capture on a periodic check (default every 0.25 in-game days) with the odds reaching 100% once 5 full in-game days have passed since it was built. The captured actor is drawn from a leveled-list/formlist property (myCapturedActorFormList) with a small (default 5%) chance of a rarer 'special' catch (myCapturedActorBaseSpecial) instead, and successfully holding a captured creature grants a configurable resource ActorValue to the settlement.",
      moddingImplication: "A new tameable-creature type just needs its own cage OMOD-equivalent data (capture actor/list, special-catch actor, resource ActorValue) wired to WorkshopCageScript's existing properties — the capture-timing and power-gating logic is already generic and doesn't need to be reimplemented."
    },
    contraptionsWorkshop: {
      overview: "Contraptions Workshop's conveyors, elevators, and switches are comparatively thin scripts (e.g. DLC04KKConveyorScript, DLC04MQ05PowerSwitchScript are each under 100 lines) — most of the DLC's 'logistics' feel (item sorters, ball-and-cup launchers) comes from keyword-filtered container linking and animation/physics on the asset side rather than a dedicated scripted logic-gate system; there is no general-purpose scriptable 'logic gate' object exposed to modders here.",
      moddingImplication: "Don't expect a reusable 'automation/logic' scripting framework from this DLC to build on — item sorters are just keyword-filtered containers, and most other Contraptions pieces are closer to decorative/physics objects than a programmable system."
    },
    vaultTecWorkshopBuilding: {
      overview: "Vault-Tec Workshop's dynamic vault-room/elevator construction (verified from DLC05WorkshopElevatorScript) manages per-floor build state via indexed floor-animation strings and a ButtonData struct array (one entry per placed call-button, each tied to a construction node name), and — notably — dynamically places/removes dedicated NavCut objects (NavCutData struct array, referencing pre-baked 'NavCutterNode01-04' points) as rooms are built or removed, rather than editing navmesh data directly.",
      moddingImplication: "This is the ENGINE-SANCTIONED way runtime geometry changes stay navmesh-safe — a dynamic-construction mod modeled on this DLC should use the same node-based NavCut placement pattern instead of trying to edit/delete NAVM records at runtime, which is exactly the unsafe practice warned about in the navmeshRepair section above.",
      newRoomTypesUseTheStandardWorkshopSystem: "Confirmed by scanning the FULL DLC05 script archive (45 files, including WorkshopBuilderScript, DLC05InitScript, and every other DLC05 workshop script) for any dedicated 'room'/'prefab'/'snap' system: none exists. WorkshopBuilderScript (despite the name) is actually the manufacturing-machine/crafting-junk-into-resources system, a separate feature. This means a new buildable VAULT ROOM is authored the exact same way as any other settlement object (see settlementSystem/craftingRecipeSystem above) — a Workshop-keyword-tagged static/furniture piece with vault-corridor-specific snap points — with the elevator/NavCut system above being the ONLY genuinely vault-specific addition. There is no separate 'room system' to reverse-engineer beyond that."
    }
  },

  // === SURVIVAL MODE (internally "Hardcore" — verified from Hardcore/HC_ManagerScript.psc, real shipped source) ===
  survivalModeSystem: {
    overview: "Survival difficulty is internally named 'Hardcore' throughout the shipped source (namespace Hardcore:, script prefix HC_) — it's a single Quest-based manager (HC_ManagerScript) that turns on a bundle of independent needs-tracking timers when difficulty is set to Survival, rather than the engine having a hardcoded 'survival mode' switch baked in elsewhere.",
    tunableTimers: [
      "GameTimerInterval_Sustenance = 0.1 hours — hunger/thirst tick rate",
      "GameTimerInterval_Disease = 0.333333 hours (~20 min), with a faster GameTimerInterval_DiseasePostRiskEvent = 0.033 hours used right after a 'high risk' event (e.g. being in dirty water)",
      "GameTimerInterval_SleepDeprivation = 14.0 hours and GameTimerInterval_Encumbrance = 24.0 hours — the longer-cycle checks",
      "HoursToRespawnCellMult / HoursToRespawnCellClearedMult (default 5.0 / 4.0) — Survival's slower respawn-timer multipliers, each also mirrored to a GlobalVariable (HC_HoursToRespawnCellMult/Cleared) so they can be tuned without touching the script"
    ],
    rulesAndModding: "Hardcore rules are largely driven by a Formlist property (HC_Rules) and individual GlobalVariable toggles (e.g. HC_Rule_NoFastTravel) checked by HC_ManagerScript rather than hardcoded conditionals — meaning a Survival-focused overhaul mod can retune pacing (disease/hunger/thirst rates, respawn timers, which rules are active) by editing these exposed Global Variables and the rules formlist, without needing to touch or recompile HC_ManagerScript itself. The Adrenaline perk (bonus damage per kill, reduced by long sleep) and per-tutorial popups (ImmunodeficiencyTutorial, HungerTutorial, etc.) are also just properties on this same manager."
  },

  // === CONSOLE / CROSS-PLATFORM MODDING CONSTRAINTS (verified current as of 2026-07) ===
  consolePlatformConstraints: {
    overview: "Console mod storage limits changed materially on 2026-05-27: Xbox Series X|S (and Xbox One) moved from a 2GB cap to 100GB, while PlayStation 4/5 remain capped at 15GB — the PlayStation ceiling is NOT primarily a technical limit but a Sony platform policy restricting external assets (custom scripts/new meshes/textures beyond what's packaged in-plugin), which is why PS mods have historically skewed toward data-only tweaks and reused vanilla assets.",
    practicalImplications: [
      "A mod built with custom meshes/textures/sound (the norm for anything using this app's asset pipeline) will work on PC and, since the 2026-05-27 update, comfortably on Xbox — but may be rejected or need a separate 'PS-compatible' variant stripped of new assets to fit Sony's external-asset policy and 15GB ceiling",
      "Script-heavy mods generally work across all platforms (Papyrus scripts are plugin-embedded, not an 'external asset' in Sony's sense) — the platform risk is specifically new binary assets (meshes, textures, sounds), not scripting itself",
      "F4SE-dependent mods are PC-only by definition — F4SE cannot run on console, so any mod requiring it (which includes much of the 2025-2026 stability stack referenced above) has no console equivalent",
      "Users who modded before 2025-11-10 should be warned that Bethesda's storage-limit update could reset an existing console load order — worth flagging to anyone asking about updating an existing console mod list"
    ],
    vrIsASeparatePlatformHonestScope: "Fallout 4 VR is a genuinely separate product (its own Steam app/executable, Fallout4VR.exe) with its own parallel script extender, F4SEVR — NOT the same binary as regular F4SE, and regular F4SE plugins are not automatically compatible with it. Everything in this knowledge base is scoped to standard flatscreen Fallout 4 unless stated otherwise; VR-specific modding (F4SEVR plugin compatibility, VR-specific UI/comfort considerations) is real but a distinct enough platform that it's out of scope here rather than something to guess at by analogy to standard F4SE."
  },

  // === PAPYRUS DEBUGGING & PERFORMANCE (verified via falloutck.uesp.net Enable_Debug_Logging + Papyrus_Runtime_Errors) ===
  papyrusDebuggingPerformance: {
    enableLogging: "Add to Fallout4Custom.ini under [Papyrus]: bEnableLogging=1, bEnableTrace=1, bLoadDebugInformation=1, bEnableProfiling=1 — without bEnableLogging=1 specifically, NOTHING is written to disk regardless of the other flags. Output lands in Documents\\My Games\\Fallout4\\Logs\\Script\\Papyrus.0.log (or Logs\\Script\\User\\ if a per-quest sTraceStatusOfQuest is configured).",
    readingCannotCallErrors: "The single most common Papyrus log line modders ask about is 'Cannot call FunctionName() on a None object' — this fires when a non-global function is invoked on a variable that's None, and it is virtually always a SYMPTOM, not the root cause: the actual failure is typically the line immediately ABOVE it in the log, where an earlier call silently returned None (e.g. GetLinkedRef finding nothing, a cast failing) and the script kept using that result without a null-check.",
    commonRootCauses: [
      "ActiveMagicEffect scripts referencing their target/caster after the effect has already been removed/finished — the most frequent source of 'Cannot call' spam according to the CK wiki's own Runtime Errors page",
      "Calling a function on an object fetched from a container/inventory after that object has been removed or consumed in the same frame",
      "A None property that was simply never filled in in the CK (the classic 'forgot to set the Auto property' mistake) — check the property panel before assuming a scripting logic bug"
    ],
    performanceNote: "bEnableProfiling=1 adds per-call timing to the log and is useful for finding which specific function is slow, but meaningfully slows the game while active — enable it only for a targeted debugging session, never leave it on for normal play or in a released mod's recommended settings.",

    memoryTuningForHeavyScriptLoads: "Verified real [Papyrus] settings (Fallout4Custom.ini) for genuinely heavily-scripted setups (e.g. large settlement-building frameworks running many concurrent scripts) — vanilla defaults are iMinMemoryPageSize=128, iMaxMemoryPageSize=512, iMaxAllocatedMemoryBytes=153600; commonly-recommended increased values for heavy script loads are iMinMemoryPageSize=256, iMaxMemoryPageSize=1024, iMaxAllocatedMemoryBytes=307200. iMaxAllocatedMemoryBytes specifically caps TOTAL memory the Papyrus VM will allocate for all stack frames combined — if a mod's scripts hit this ceiling, the VM stalls waiting for memory to free rather than crashing outright, which is what real, documented 'script lag' in large settlement/quest-heavy mods often traces back to. This is a genuine alternative/complement to relying solely on a stability-stack F4SE plugin (the OLD standalone Baka MaxPapyrusOps addressed the same class of problem at the F4SE level; Addictol now includes that functionality per communityTools2025 above) — the ini settings and the F4SE-level fix are not mutually exclusive.",

    frameworkScriptOverrideConflict: "A real, documented compatibility failure class — verified to apply far more broadly than just large 'framework' mods: ANY two mods that both edit/replace the SAME compiled vanilla script (.pex) conflict, last-loaded-wins, with no error dialog telling you which mod broke which. Confirmed at large scale (a settlement-building framework replacing WorkshopParentScript and friends) AND at tiny scale — a real, simple 3-file mod (Everyone's Best Friend, which edits FollowersScript to remove the artificial Dogmeat/companion mutual-exclusivity restriction) and the Unofficial Fallout 4 Patch (which independently also edits FollowersScript and HC_ManagerScript for unrelated bugfixes) silently reintroduce roughly 10 of each other's fixes/changes depending on load order, requiring a dedicated third-party compatibility patch to merge both sets of edits into one script. This is NOT a framework-specific quirk — it's a general FO4 modding reality any time two plugins happen to touch the same underlying script, however small either mod is. The documented mitigation pattern (from large frameworks specifically) is a dedicated 'Script Override' file placed at the very bottom of load order to re-force correct script versions; for smaller mods, the realistic mitigation is simply DOCUMENTING which vanilla scripts you edit prominently, so users/other authors know a compatibility patch may be needed, and checking (via a simple search of other installed mods' loose Scripts folders) whether anything else already touches the same script before assuming your edit is conflict-free."
  },

  // === WORLDSPACE / LANDSCAPE EDITING (verified via falloutck.uesp.net Landscape_Edit + WorldSpace docs) ===
  worldspaceLandscapeEditing: {
    overview: "A new WorldSpace record with its Parent Worldspace set to NONE gets its own independent, editable landscape — set a Parent Worldspace instead and the new worldspace reuses the parent's terrain (used for e.g. a worldspace that's conceptually 'part of' the Commonwealth rather than fully separate).",
    workflow: [
      "World → Landscape Editing opens the terrain tools against the currently active worldspace",
      "Drawing Mode + left-click sculpts height wherever the cursor moves (raise/lower/flatten/smooth brush variants); right-click applies the currently selected landscape texture layer instead of changing height",
      "Edit Colors mode switches to vertex color-tinting instead of height/texture, used for large-scale color variation (e.g. scorched vs. lush ground) without needing a separate texture layer",
      "Importing an external heightmap (e.g. authored in World Machine or from real-world elevation data) is the standard starting point for a large custom worldspace rather than hand-sculpting from flat terrain"
    ],
    moddingImplication: "Landscape edits interact directly with the LOD and precombine/previs pipelines documented above — a large new worldspace needs its own terrain LOD (xLODGen) generation pass and, once object placement is finalized, its own precombine/previs regeneration; skipping either is why some custom-worldspace mods report distant terrain 'popping' or z-fighting that a vanilla cell wouldn't show.",

    connectingToTheRestOfTheGame: "A new worldspace/interior cell is unreachable until it's connected via a LINKED DOOR pair, verified from the CK wiki's own Door documentation: place a Door reference on EACH side of the connection (one in the new space, one in the existing world/cell you want it reachable from) and link the two references to each other — this linkage is what actually performs the teleport, not anything on the Cell or WorldSpace record itself. A 'Load Door' is mechanically identical to a normal door except it renders a solid black/white backing so the player can't see through to the destination cell before it's loaded (masking the load). One easy-to-miss naming quirk: a load door's in-game NAME is inherited from the CELL it leads to, not the door reference's own name — rename the destination cell, not the door, if the display name looks wrong.",

    mapMarkerAndFastTravel: "A linked door alone doesn't make a location fast-travelable or visible on the Pip-Boy map — that needs a separate MapMarker reference placed in the exterior worldspace at the location, with its own icon Type set (Settlement/Vault/POI/etc). Verified real mechanism for a DISCOVERABLE marker (not visible until the player finds it): the MapMarker reference itself is placed 'Initially Disabled' in the CK, and a small trigger-volume script calls `.Enable()`/`.EnableNoWait()` on it when the player walks close — verified directly from a real shipped example (DN143MapMarkerSwapScript: `Event OnTriggerEnter(ObjectReference akActionRef) ... if akActionRef == Game.GetPlayer() ... Vault75MapMarker.EnableNoWait()`). There is no separate 'reveal/discover' API — discovery IS just enabling the reference, confirmed by ObjectReference's own native `IsMapMarkerVisible()` function reading that same enabled/visible state. A marker meant to be visible from the start of the game simply isn't Initially Disabled at all, skipping the trigger step entirely.",
    dynamicQuestFactionGatedMarkers: "Real, verified extension beyond simple proximity-triggered discovery above: a real, popular mod (Fast Travel From Quest Hubs) adds INTERIOR fast-travel markers (e.g. for a faction headquarters interior cell, not just exterior locations) and — the genuinely valuable technique — gates them dynamically on BOTH quest progress AND faction relationship: the marker only enables once the player has progressed far enough in that faction's questline, and gets explicitly DISABLED again if the player becomes hostile with that faction. This confirms Enable()/Disable() on a MapMarker reference isn't limited to a one-way 'discover once' pattern — it can be called repeatedly, conditioned on quest-stage checks (GetStageDone) and faction-relationship checks (see crimeFactionReputationSystem above for the real IsPlayerEnemy-style functions), to reflect a location's CURRENT accessibility rather than a permanent, one-time reveal. It also confirms interior cells can have their own map markers exactly like exteriors, not just worldspace-level locations."
  },

  // === MOD MANAGER DEPLOYMENT MODELS (verified — the mechanism, not just tool names) ===
  modManagerDeploymentModels: {
    overview: "MO2 (Mod Organizer 2) and Vortex handle installed mods fundamentally differently, and 'why doesn't my mod show up / why does xEdit see different files than the game' troubleshooting almost always traces back to this difference.",
    mo2VirtualFileSystem: "MO2 never touches the real Data folder — mods live in MO2's own mods/ directory, and a virtual file system composites them together (by profile-specific load order/priority) only for the moment the game or a tool actually launches through MO2. A file 'installed' in MO2 genuinely does not exist in Data\\ if you look with plain Windows Explorer or a tool launched outside MO2.",
    vortexHardlinks: "Vortex deploys by hard-linking (or, in some configurations, copying) mod files directly into the real Data folder — closer to 'actually there' than MO2's VFS, but this means external tools and the real Data folder are already in sync without needing to be launched through Vortex specifically, at the cost of the Data folder no longer being 'clean' the way MO2 keeps it.",
    practicalImplication: "This is exactly why tool-integration advice differs by manager: a script/tool that scans the Data folder directly will see Vortex-deployed mods fine, but will see NOTHING from MO2-managed mods unless it's launched from inside MO2 (via its 'Add tool' integration) so it runs inside the same virtual file system the game sees. Any Mossy guidance involving 'point this tool at your Data folder' should flag this MO2 caveat rather than assuming a Vortex-style setup."
  },

  // === COLLECTIBLE PERK SYSTEM: BOBBLEHEADS & MAGAZINES ===
  collectiblePerkSystem: {
    overview: "Bobbleheads and Perk Magazines are both 'read/pick-up once, keep a permanent perk forever' collectibles, structurally similar to a MiscObject with a perk-granting script attached, distinct from the general crafting/leveled-list systems documented above.",
    bobbleheads: "One bobblehead exists per SPECIAL stat plus several skill-adjacent categories (e.g. Melee, Sneak, Explosives, Barter, Repair equivalents in FO4's terms), each a unique, non-leveled, hand-placed MiscObject; picking one up grants a small permanent bonus tied to that category, once, permanently — there's no rank system like magazines have.",
    perkMagazines: "Unlike bobbleheads, a magazine's perk is rank-based: finding additional COPIES of the SAME magazine issue increases that perk's rank further (up to that perk's max rank) — this is why players are advised to hang onto extra copies rather than sell/scrap them immediately, unlike most other collectibles. Modders extending this system typically duplicate an existing magazine/perk/script trio as their starting template rather than building the grant mechanism from scratch.",
    moddingImplication: "A new collectible-grants-permanent-perk item follows the same shape either way: a unique MiscObject, a Perk record with the actual bonus, and a small script (or a Perk Entry Point on the perk itself) that adds the perk when the item is picked up/read — the 'permanent, doesn't need to stay in inventory' behavior comes from the perk being added directly, not from the item persisting.",

    magazinesAsCraftingRecipeUnlocks: "Verified real technique from a large, mature overhaul mod: the magazine rank-tracking mechanism above can double as a crafting-recipe unlock gate, not just a stat-bonus perk. A 'Recipe: X' perk (using the exact same rank-per-copy-found mechanism as a real collectible magazine) is checked as a COBJ recipe's Condition (see craftingRecipeSystem above — HasPerk/GetPerkRank-style checks), so finding more copies of a themed magazine progressively unlocks more advanced recipes in that category, with a real vanilla-style perk from the normal perk tree offered as an ALTERNATE unlock path for the same recipe. This is a genuinely reusable pattern for any mod wanting multiple, parallel progression paths (find collectibles OR invest perk points) toward the same crafting content, rather than a single hard-gated path."
  },

  // === ACHIEVEMENTS & MODDING (verified: Addictol's AdModuleAchievements source module + community consensus) ===
  achievementsSystem: {
    overview: "Fallout 4 disables Steam/platform achievements the moment it detects a plugin file (.esp/.esl/.esm) is loaded — this is a blanket, load-order-based check, not something tied to what a specific plugin actually changes. A save made with any plugin active shows an [M] marker next to its name in the load menu, and achievements stay disabled for that session.",
    reEnabling: "Dedicated 'Achievements Enabler' F4SE plugins patch this check out at runtime — Addictol (the stability-stack tool documented above under communityTools2025) already bundles this functionality via its own achievements module, so a user running Addictol does not need a separate achievements-enabler mod, and installing one alongside Addictol would be redundant rather than necessary.",
    verificationMethod: "The practical way a user confirms an enabler is working is watching for the [M] marker to stop appearing on newly-made saves — if it's still present, the enabler either isn't loaded (check it's launched via f4se_loader) or isn't compatible with the current game/F4SE version.",
    moddingImplication: "This is purely a player-facing runtime patch, not something a plugin author needs to account for when building a mod — a mod doesn't need any special flag or design accommodation to remain achievement-compatible; the disabling is blanket and platform-side, and re-enabling is entirely the end user's tooling choice."
  },

  // === DIFFICULTY DAMAGE SCALING (verified GMST names — real, moddable settings) ===
  difficultyDamageScaling: {
    overview: "Difficulty in FO4 is implemented almost entirely as damage multipliers stored in GMST (Game Setting) records, not hidden engine logic — one pair of settings per difficulty tier, so a difficulty-rebalance mod is usually just a GMST-editing plugin.",
    realGMSTNames: [
      "fDiffMultHPToPCVE / ...E / ...N / ...H / ...VH / ...SV — damage dealt TO the player, one per tier (Very Easy through Very Hard, plus Survival's own SV variant)",
      "fDiffMultHPByPCVE / ...E / ...N (and the corresponding higher tiers) — damage dealt BY the player, same tier structure",
      "In Survival specifically, TWO multipliers stack: the base fDiffMultHPtoPCTSV/fDiffMultHPbyPCTSV GMSTs AND separate HC_IncomingDamageMult/HC_OutgoingDamageMult values from the Hardcore (Survival) system documented above — a Survival-focused balance mod needs to account for both layers, not just the GMSTs."
    ],
    editingMethod: "Editable directly in the Creation Kit's Gameplay Settings (Game Settings tab) or via xEdit on the GMST records; also readable/settable live in-game via the console with getgs/setgs for quick testing, though console changes don't persist without also being saved into a plugin.",
    moddingImplication: "A 'make combat harder/easier' mod is typically nothing more than a small plugin overriding these GMSTs — no scripting needed — which is also why several such mods conflict with each other (last-loaded GMST override wins) and why checking for GMST conflicts in a compatibility patch (see compatibilityPatching above) matters for anyone running more than one difficulty-affecting mod."
  },

  // === F4SE PLUGIN DEVELOPMENT (C++/CommonLibF4 — verified directly from CommonLibF4 + template repo source, 2026) ===
  // This is the "build any TOOL you want for Fallout 4" discipline, distinct from everything
  // above: Papyrus/Creation Kit modding configures the existing engine's data and behavior hooks;
  // F4SE plugins are compiled C++ code loaded into the game process itself, able to read/write
  // engine memory directly (via address-library offsets) rather than through exposed Papyrus calls.
  f4sePluginDevelopment: {
    whatItIsFor: "Reach for an F4SE plugin (not Papyrus) when the goal needs something the Papyrus API structurally cannot do: reading/writing engine internals with no exposed native function, hooking a function before the engine's own code runs, adding genuinely new UI (Scaleform is limited; some tool UIs are native ImGui/DirectX overlays instead), running native-speed code for something too slow in interpreted Papyrus, or — verified concretely from a real, popular weapon-animation mod (Tactical Reload) — RAW KEYBOARD INPUT DETECTION (which specific key was pressed/released as a real-time event). Confirmed directly from the base game's own Input-related script (InputEnableLayer.psc): the only native Papyrus input control is enabling/disabling pre-defined control CATEGORIES (movement, fighting, VATS, sneaking, etc.) — there is no vanilla Papyrus function to detect which specific key is currently pressed or to receive a press/release event; that capability is entirely F4SE-provided. Any mod idea that hinges on 'do X while holding key Y' or 'detect a specific keybind' needs an F4SE plugin for that piece, even if everything else about the mod is ordinary Papyrus/CK content. Everything else documented elsewhere in this knowledge base (crafting, quests, dialogue, settlements, etc.) is achievable WITHOUT this — F4SE plugin dev is specifically for the class of tool/mod that needs engine-level access (the stability-stack tools like Addictol, memory/UI frameworks, etc. are exactly this category).",
    toolchain: "CommonLibF4 (Ryan-rsm-McKenzie/CommonLibF4 on GitHub) is the de facto standard reverse-engineered library modders build against instead of raw F4SE — it exposes typed wrappers (RE:: namespace) around engine classes/functions so you're not hand-writing raw offsets everywhere. Two build-tooling paths exist in the ecosystem: the original CMake + vcpkg setup (Visual Studio 2019+, C++ dev workload), and a newer XMake-based template (libxse/commonlibf4-template, verified from its real source) that wraps dependency fetching and plugin-manifest generation more simply — prefer the XMake template for a new project unless you have a specific reason to need CMake/vcpkg.",
    verifiedEntryPoint: "The actual plugin entry point (verified straight from the XMake template's src/main.cpp) is genuinely just: `F4SE_PLUGIN_LOAD(const F4SE::LoadInterface* a_f4se) { F4SE::Init(a_f4se); /* your code */ return true; }` — plugin metadata (name/author/description) is declared separately in the build config (xmake.lua's `commonlibf4.plugin` rule in the modern template), NOT via an in-code F4SEPlugin_Query struct the way older tutorials describe; check which toolchain a tutorial/template targets before assuming its entry-point shape matches another one.",
    addressLibraryDependency: "Every CommonLibF4-based plugin requires the end user to have Address Library for F4SE Plugins (Nexus #47327) installed — CommonLibF4's REL::Relocation system resolves function/data addresses by ID rather than hardcoded memory offsets, and those IDs are only meaningful with the matching Address Library database for the user's exact game version. This is why an F4SE plugin 'silently fails to load' (see communityTools2025 above) far more often than a Papyrus mod does when versions drift.",
    versionDetectionModernization2026: "Real, verified update to the loader/version-fragility picture above: F4SE modernized its plugin-loading approach to use a single loader executable plus a declarative version-detection system (adopted from the SKSE64/SFSE convention), reducing per-patch loader churn and virus-scanner false-positive issues that came from constantly-changing loader binaries. IMPORTANT caveat — this modernization is NOT the same thing as eliminating Address Library's version-coupling: Address Library itself still requires a new build for each major game-version series (confirmed: the 1.11+ 'Anniversary Edition' line required a new Address Library version, meaning existing plugins still needed the matching updated Address Library, and in some cases recompilation). Read this as 'the loader mechanics got smoother' rather than 'the fundamental version-fragility problem of Address-Library-based plugins is now solved' — the core guidance above (match Address Library to the exact game version) still applies.",
    vcRedistDependencyRealAndDistinct: "Verified from a real, substantial CommonLibF4-based plugin's own build documentation: end users also need the matching Microsoft Visual C++ Redistributable (for whichever Visual Studio version the plugin was compiled with, e.g. VS2019) installed — this is a SEPARATE failure mode from the Address Library version-mismatch above. A plugin missing its required VC++ Redistributable typically fails with a generic Windows 'missing DLL'/module-load error rather than F4SE's own load-failure messaging, which can mislead a user into troubleshooting the wrong thing (assuming an Address Library/game-version issue when it's actually a completely unrelated missing runtime dependency).",
    commonRealBuildDependencies: "A real, mature CommonLibF4 plugin's dependency list (verified from its own build docs) typically includes, beyond CommonLibF4 itself: a config-parsing library for the plugin's own settings file — often TOML format specifically (distinct from MCM's JSON-based config, see mcmIntegration above — a plugin's own internal settings file and its MCM-exposed settings are not necessarily the same file/format), a stack-trace/crash-diagnostics library (for producing readable crash logs, the actual mechanism behind tools like CLASSIC being able to parse a meaningful log at all), a structured logging library, and a JIT x86 assembly library used specifically for advanced runtime function hooking beyond what simple address-relocation covers. A new plugin doesn't need all of these on day one, but expect to reach for a config/logging/hooking library stack like this once the plugin grows beyond a handful of exposed native functions.",
    endUserDistribution: "Ships as a compiled .dll placed in Data/F4SE/Plugins/ (not a .esp/.esm plugin) — it's loaded by f4se_loader.exe, not by the normal plugin/load-order system, though a plugin frequently ships an accompanying .esp for any actual game-content it adds (keywords, MCM menu, etc.) alongside its .dll.",
    moddingImplication: "This is a fundamentally different discipline from everything else in this knowledge base: real C++ toolchain, real reverse-engineering awareness (APIs can and do change between game patches, unlike stable Papyrus natives), and real version-coupling risk via Address Library. Recommend it only when the user's goal genuinely needs engine-level access — for anything achievable via Papyrus/Creation Kit data, that remains the lower-effort, more stable, and more portable (including to console, which F4SE plugins can never reach) choice."
  },

  // === F4SE ↔ PAPYRUS INTEROP & PLUGIN INTERFACES (verified directly from ianpatt/f4se PluginAPI.h + a real example plugin) ===
  // This is the bridge between the two disciplines above: how a C++ plugin exposes functions TO
  // Papyrus scripts, reacts to game lifecycle events, and persists its own data into the save file.
  // This is the actual shape of most real-world F4SE plugins (PapyrusUtil, UIExtensions, etc.) —
  // a thin native-function library backing ordinary Papyrus mods — not a standalone engine hack.
  f4sePapyrusInteropAndMessaging: {
    nativeFunctionRegistration: "Verified from a real F4SEPlugin_Load implementation: a plugin gets the Papyrus interface via `(F4SEPapyrusInterface*)f4se->QueryInterface(kInterface_Papyrus)`, then calls `g_papyrus->Register(RegisterFuncs)` where RegisterFuncs is a function that calls `vm->RegisterFunction(new NativeFunction0<StaticFunctionTag, void>(\"Test\", \"TestClass\", MyNamespace::Test, vm))` for each function exposed — the string arguments are the exact function/class NAMES a Papyrus script will call (e.g. `TestClass.Test()` becomes callable from any .psc once this is registered), and NativeFunction0/1/2... is templated by argument count.",
    theOtherHalfPapyrusStub: "C++ registration alone is NOT enough to call the function from a mod's own scripts — a matching Papyrus STUB script must also exist so the Papyrus compiler recognizes the call, verified directly from the real example plugin's companion .psc: `scriptName TestClass native Hidden` followed by `Function Test() global native` (empty body — no EndFunction content, since the real implementation lives entirely in the C++ DLL, not in Papyrus). This stub .psc gets compiled to a .pex and shipped in Data/Scripts/ alongside the plugin's .dll — a mod author who registers a native function C++-side but forgets to ship this matching stub .pex will get a compile error ('function TestClass.Test not found') in any OTHER script that tries to call it.",
    oldVsNewQueryPattern: "The classic raw-F4SE entry point pair is `F4SEPlugin_Query(const F4SEInterface* f4se, PluginInfo* info)` (fills out name/version, checks `f4se->isEditor` and `f4se->runtimeVersion` to bail out on unsupported versions, and must do NOTHING ELSE per F4SE's own documented contract) followed by `F4SEPlugin_Load(const F4SEInterface* f4se)` (does the actual interface-querying and registration) — this is DIFFERENT from the modern CommonLibF4/XMake template's single `F4SE_PLUGIN_LOAD` macro documented above; a plugin author needs to know which API generation a given tutorial/template is written against rather than mixing patterns.",
    messagingInterfaceRealEvents: "Verified from F4SE's actual PluginAPI.h enum — the real event list a plugin can register for via the Messaging interface (kInterface_Messaging) is: kMessage_PostLoad / kMessage_PostPostLoad (all plugins loaded), kMessage_PreLoadGame / kMessage_PostLoadGame (savegame read, with a bool success flag on Post), kMessage_PreSaveGame / kMessage_PostSaveGame, kMessage_DeleteGame, kMessage_InputLoaded, kMessage_NewGame, kMessage_GameLoaded (fires once), and kMessage_GameDataReady. 'Wait for game data before doing X' — a near-universal plugin need — means registering for kMessage_GameDataReady, not assuming data is ready inside F4SEPlugin_Load itself (the game may not have finished initializing yet at that point).",
    serializationInterfaceForCosaves: "Plugins that need to persist their OWN data into the save file (not just Papyrus-visible state) use the Serialization interface (kInterface_Serialization): SetUniqueID (a 4-byte tag identifying this plugin's data block), SetSaveCallback/SetLoadCallback/SetRevertCallback (fired at the matching lifecycle moments), and WriteRecord/OpenRecord (chunk-based read/write within the plugin's own reserved space in the .f4se co-save file that rides alongside the normal .ess save). This is how a plugin's C++-side state survives a save/reload without needing a Papyrus-side GlobalVariable/property to shadow it.",
    externalFileIOADistinctPersistenceMechanism: "IMPORTANT distinction from the Serialization interface above: reading/writing ARBITRARY external files (JSON, blueprint data, config files that need to exist OUTSIDE any specific save/cosave and be shareable between players/saves) is a completely different mechanism — an F4SE plugin is just native code running in the game process, so it already has full OS-level file access; no special F4SE interface is needed, only ordinary C++ file I/O exposed to Papyrus via ordinary native function registration (see nativeFunctionRegistration above). Verified real example: SUP F4SE is a real, dedicated plugin whose entire purpose is exposing JSON read/write to Papyrus (a JSONValue struct with JSONSuccess/JSONkey/JSONfValue/JSONsValue fields, documented error codes for cases like unparseable JSON or write failures) — this is the actual mechanism behind real, popular mods like Transfer Settlements that export/import shareable settlement 'blueprint' files as JSON completely independent of any specific save file. Choose Serialization (cosave) when data belongs to ONE save and should travel with it; choose plain file I/O via native functions when data needs to be shareable/external/independent of any single save (config, blueprints, cross-save data).",
    thirdPattern_PapyrusLogAsExportPlusWebToolConversion: "A THIRD, genuinely distinct real content-pipeline pattern (verified from Sim Settlements 2's own real, documented City Plan creation workflow) — clever specifically because it needs NO dedicated F4SE file-I/O plugin at all: (1) the in-game 'export' step (Workshop Framework's MCM/holotape Manage → Settlement Layout → Export Layout) is implemented by writing structured data through the EXISTING Papyrus per-quest USER LOG mechanism (see papyrusDebuggingPerformance's enableLogging above — the exported file lands in Documents\\My Games\\Fallout4\\Logs\\Script\\User\\, the same directory a sTraceStatusOfQuest user log would use) rather than a custom file-write native function; (2) the resulting file is then uploaded to a BROWSER-BASED web tool (a real, live example: simsettlements.com/tools/cpV2maker.php) that parses it and generates an actual importable plugin/asset; (3) the generated result is imported back in-game via the framework's own import function. This is a real, distinct alternative to SUP-F4SE-style native file I/O above — repurposing Papyrus's own logging output as a structured data-export vector, with the actual DATA PROCESSING happening entirely OUTSIDE the game in a web tool rather than in a companion desktop app (contrast with DEF_UI's downloadable Settings.exe config generator documented under scaleformUIModding above) — three genuinely different real patterns for the same general 'get structured data out of the game, transform it, bring it back' problem, each with different tradeoffs (native F4SE plugin capability vs. no-plugin-needed log-file trick vs. requiring the user's own upload-to-a-website step).",
    moddingImplication: "The realistic '80% use case' for a new F4SE plugin isn't a deep engine hack — it's exposing a handful of native functions to Papyrus (native function registration above) so a normal, otherwise-ordinary mod can do the one thing Papyrus alone can't (fast math, file I/O, a UI element, reading an engine value with no exposed getter). Design the plugin as a thin native-function library first; only reach for messaging/serialization once the plugin needs to react to game lifecycle events or persist its own state independent of Papyrus."
  }
};

/**
 * Serializes the entire knowledge base into one readable text block for
 * injection into an AI system prompt. Generic/recursive so every section stays
 * included automatically as the knowledge base grows — no hand-maintained
 * summary that can silently drift out of sync with the real data.
 */
function serializeKnowledge(value: unknown, depth: number): string {
  const indent = '  '.repeat(depth);
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(item => {
      const rendered = serializeKnowledge(item, depth + 1);
      return typeof item === 'object' && item !== null ? rendered : `${indent}- ${rendered}`;
    }).join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const rendered = serializeKnowledge(val, depth + 1);
        const isBlock = typeof val === 'object' && val !== null;
        return `${indent}${key}:${isBlock ? '\n' : ' '}${rendered}`;
      })
      .join('\n');
  }
  return String(value);
}

let _cachedKnowledgeBlock: string | null = null;

export function formatFO4KnowledgeBaseForAI(): string {
  if (_cachedKnowledgeBlock) return _cachedKnowledgeBlock;
  _cachedKnowledgeBlock = [
    '╔════════════════════════════════════════════════════════════╗',
    '║  MOSSY MODDING KNOWLEDGE BASE — how FO4 systems actually work',
    '║  (curated + verified process knowledge, not raw game data)',
    '╚════════════════════════════════════════════════════════════╝',
    serializeKnowledge(FO4KnowledgeBase, 0),
    '╔════════════════════════════════════════════════════════════╗',
    '║  END MODDING KNOWLEDGE BASE',
    '╚════════════════════════════════════════════════════════════╝',
  ].join('\n');
  return _cachedKnowledgeBlock;
}

export default FO4KnowledgeBase;