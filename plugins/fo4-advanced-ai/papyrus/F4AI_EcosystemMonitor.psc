Scriptname F4AI:F4AI_EcosystemMonitor extends ReferenceAlias
; Timer uses Utility.Wait loop with generation counter (RegisterForUpdate not on ReferenceAlias in FO4)
; Bound to PlayerRef via Data/Hydra/ScriptObjects/F4AI_Monitors.json
; No CK quest attachment needed — Hydra Script Object Runner handles binding.
;
; Responsibilities:
;   - Scan nearby creatures and classify as predator or prey
;   - Track territory ownership per ecoRegion using Hydra:SaveMap
;   - Count live population per species in the player's current ecoRegion
;   - Send ecosystem snapshot to Mossy bridge for population/behavior decisions
;   - Receive ecosystem directives: migrate, hunt, flee_territory, reproduce_pressure
;   - React to seasonal world state (winter = scarce prey, summer = abundant)

; ── Properties ────────────────────────────────────────────────────────────────

String Property EcoInputPath  = "Data/F4AI/ecosystem_event.json"    Auto Const
String Property EcoOutputPath = "Data/F4AI/ecosystem_directive.json" Auto Const
Float  Property ScanRadius    = 5000.0 Auto
Float  Property ScanInterval  = 120.0  Auto
Bool   Property EnableEcoAI   = false  Auto
Int    Property _loopGen      = 0      Auto Hidden  ; incremented each InitMonitor to kill stale loops
; Race cache — resolved once per session in InitMonitor, eliminating per-actor Game.GetForm() latent calls
Race   Property _rHuman      = None  Auto Hidden
Race   Property _rGhoul      = None  Auto Hidden
Race   Property _rSynth      = None  Auto Hidden
Race   Property _rCompanion  = None  Auto Hidden
Race   Property _rDeathclaw  = None  Auto Hidden
Race   Property _rMirelurk1  = None  Auto Hidden
Race   Property _rMirelurk2  = None  Auto Hidden
Race   Property _rRadscorp   = None  Auto Hidden
Race   Property _rYaoGuai    = None  Auto Hidden
Race   Property _rBrahmin    = None  Auto Hidden
Race   Property _rDog        = None  Auto Hidden
Race   Property _rBloatfly   = None  Auto Hidden
Race   Property _rRadroach   = None  Auto Hidden
Race   Property _rStingwing  = None  Auto Hidden
Race   Property _rBloodbug   = None  Auto Hidden

; ── Lifecycle ─────────────────────────────────────────────────────────────────

Event OnInit()
    InitMonitor()
EndEvent

Event OnPlayerLoadGame()
    _loopGen += 1000
    Utility.Wait(3.0)
    InitMonitor()
EndEvent

Function InitMonitor()
    _loopGen += 1
    Int myGen = _loopGen
    Utility.Wait(1.0)
    if (myGen != _loopGen)
        return
    endif
    ; Resolve all race forms once per session — done here so scan loop never calls Game.GetForm()
    _rHuman     = Game.GetForm(0x00013746) as Race
    _rGhoul     = Game.GetForm(0x0001D4B5) as Race
    _rSynth     = Game.GetForm(0x000EAFDF) as Race
    _rCompanion = Game.GetForm(0x0002C4C6) as Race
    _rDeathclaw = Game.GetForm(0x000F81ED) as Race
    _rMirelurk1 = Game.GetForm(0x000B2BF2) as Race
    _rMirelurk2 = Game.GetForm(0x000B2BF5) as Race
    _rRadscorp  = Game.GetForm(0x0017B2A0) as Race
    _rYaoGuai   = Game.GetForm(0x000B2BF4) as Race
    _rBrahmin   = Game.GetForm(0x00020198) as Race
    _rDog       = Game.GetForm(0x000A82AB) as Race
    _rBloatfly  = Game.GetForm(0x00109473) as Race
    _rRadroach  = Game.GetForm(0x0001CF74) as Race
    _rStingwing = Game.GetForm(0x001092C3) as Race
    _rBloodbug  = Game.GetForm(0x00109476) as Race
    if (myGen != _loopGen)
        return
    endif
    if (EnableEcoAI)
        WriteWorldStateToSaveMap()
        MonitorLoop(myGen)
    endif
EndFunction

Function MonitorLoop(Int myGen)
    While (myGen == _loopGen)
        if (EnableEcoAI)
            ScanEcosystem(myGen)
            if (Hydra:IO:File.Exists(EcoOutputPath))
                ProcessEcosystemDirective()
            endif
        endif
        Utility.Wait(ScanInterval)
        if (myGen != _loopGen)
            return
        endif
    EndWhile
EndFunction

; ── Ecosystem Scan ────────────────────────────────────────────────────────────

Function ScanEcosystem(Int myGen)
    if (Hydra:TempMap.GetValue("F4AI_T", "eco_scanning") as Bool)
        return
    endif
    Bool bTrue = true
    Hydra:TempMap.SetValue("F4AI_T", "eco_scanning", bTrue as Var)

    Actor player = Game.GetPlayer()
    String ecoRegion = Hydra:SaveMap.GetValue("F4AI_S", "world_ecoRegion") as String
    String season = Hydra:SaveMap.GetValue("F4AI_S", "world_season") as String

    Keyword kActorTypeNPC = Game.GetCommonProperties().ActorTypeNPC
    ObjectReference[] refs = player.FindAllReferencesWithKeyword(kActorTypeNPC, ScanRadius)
    ; stale stack returning after a load/new-game — drop results silently
    if (myGen != _loopGen)
        Bool bFalse = false
        Hydra:TempMap.SetValue("F4AI_T", "eco_scanning", bFalse as Var)
        return
    endif
    if (refs == None)
        Bool bFalse = false
        Hydra:TempMap.SetValue("F4AI_T", "eco_scanning", bFalse as Var)
        return
    endif

    Int predatorCount = 0
    Int preyCount     = 0
    Int deathclawCount = 0
    Int mirelurKCount  = 0
    Int radscorpCount  = 0
    Int yaogualCount   = 0
    Int bloatflyCount  = 0
    Int brahmInCount   = 0
    Int dogCount       = 0
    Int radroachCount  = 0

    Int i = 0
    While (i < refs.Length)
        Actor creature = refs[i] as Actor
        if (creature != None && !creature.IsDead() && !IsHumanoid(creature))
            String species = GetSpeciesTag(creature)
            if (species != "")
                if (IsPredator(species))
                    predatorCount += 1
                else
                    preyCount += 1
                endif

                if (species == "Deathclaw")
                    deathclawCount += 1
                elseif (species == "Mirelurk")
                    mirelurKCount += 1
                elseif (species == "Radscorpion")
                    radscorpCount += 1
                elseif (species == "Yao Guai")
                    yaogualCount += 1
                elseif (species == "Bloatfly")
                    bloatflyCount += 1
                elseif (species == "Brahmin")
                    brahmInCount += 1
                elseif (species == "Dog")
                    dogCount += 1
                elseif (species == "Radroach")
                    radroachCount += 1
                endif

                UpdateTerritoryOwner(ecoRegion, species, creature)
            endif
        endif
        i += 1
    EndWhile

    Hydra:TempMap.SetValue("F4AI_T", "eco_pred_count", predatorCount as Var)
    Hydra:TempMap.SetValue("F4AI_T", "eco_prey_count", preyCount as Var)

    String ecoState      = GetEcosystemState(predatorCount, preyCount, season)
    String territoryOwner = Hydra:SaveMap.GetValue("F4AI_S", "eco_territory_" + ecoRegion) as String

    SendEcosystemEvent(ecoRegion, season, predatorCount, preyCount, deathclawCount, mirelurKCount, radscorpCount, yaogualCount, bloatflyCount, brahmInCount, dogCount, radroachCount, ecoState, territoryOwner)

    Bool bFalse = false
    Hydra:TempMap.SetValue("F4AI_T", "eco_scanning", bFalse as Var)
EndFunction

; ── Territory ─────────────────────────────────────────────────────────────────

Function UpdateTerritoryOwner(String ecoRegion, String species, Actor creature)
    String currentOwner = Hydra:SaveMap.GetValue("F4AI_S", "eco_territory_" + ecoRegion) as String
    Int currentPriority = GetApexPriority(currentOwner)
    Int newPriority     = GetApexPriority(species)

    if (newPriority > currentPriority)
        Hydra:SaveMap.SetValue("F4AI_S", "eco_territory_" + ecoRegion, species as Var)
        Int formID = creature.GetActorBase().GetFormID()
        Hydra:SaveMap.SetValue("F4AI_S", "eco_territory_" + ecoRegion + "_formid", formID as Var)
        Debug.Trace("[F4AI_Eco] Territory " + ecoRegion + " claimed by " + species)
    endif
EndFunction

Int Function GetApexPriority(String species)
    if (species == "Deathclaw")
        return 5
    elseif (species == "Yao Guai")
        return 4
    elseif (species == "Fog Crawler")
        return 4
    elseif (species == "Radscorpion")
        return 3
    elseif (species == "Gulper")
        return 3
    elseif (species == "Mirelurk")
        return 2
    endif
    return 1
EndFunction

; ── Ecosystem State ───────────────────────────────────────────────────────────

String Function GetEcosystemState(Int predators, Int prey, String season)
    if (predators == 0 && prey == 0)
        return "empty"
    endif
    if (predators == 0)
        return "prey_dominant"
    endif
    if (prey == 0)
        return "predator_starving"
    endif

    Float ratio = predators as Float / prey as Float

    if (season == "Winter")
        if (ratio > 0.5)
            return "overhunted"
        elseif (ratio < 0.1)
            return "prey_abundant"
        endif
        return "winter_balanced"
    elseif (season == "Spring")
        if (ratio > 1.0)
            return "overhunted"
        elseif (ratio < 0.05)
            return "prey_boom"
        endif
        return "balanced"
    endif

    if (ratio > 0.8)
        return "overhunted"
    elseif (ratio < 0.05)
        return "prey_abundant"
    endif
    return "balanced"
EndFunction

; ── Bridge I/O ────────────────────────────────────────────────────────────────

Function SendEcosystemEvent(String ecoRegion, String season, Int predators, Int prey, Int deathclaws, Int mirelurks, Int radscorps, Int yaoguals, Int bloatflies, Int brahmin, Int dogs, Int radroaches, String ecoState, String territoryOwner)

    String json = "{"
    json += "\"event_type\": \"ecosystem\","
    json += "\"ecoRegion\": \"" + ecoRegion + "\","
    json += "\"season\": \"" + season + "\","
    json += "\"ecosystem_state\": \"" + ecoState + "\","
    json += "\"territory_owner\": \"" + territoryOwner + "\","
    json += "\"predator_count\": " + predators + ","
    json += "\"prey_count\": " + prey + ","
    json += "\"species\": {"
    json +=   "\"Deathclaw\": " + deathclaws + ","
    json +=   "\"Mirelurk\": " + mirelurks + ","
    json +=   "\"Radscorpion\": " + radscorps + ","
    json +=   "\"Yao Guai\": " + yaoguals + ","
    json +=   "\"Bloatfly\": " + bloatflies + ","
    json +=   "\"Brahmin\": " + brahmin + ","
    json +=   "\"Dog\": " + dogs + ","
    json +=   "\"Radroach\": " + radroaches
    json += "}"
    json += "}"

    Hydra:Mutex.LockGlobal("F4AI", "Bridge")
    Hydra:IO:File.WriteAllText(EcoInputPath, json)
    Hydra:Mutex.UnlockGlobal("F4AI", "Bridge")
EndFunction

Function ProcessEcosystemDirective()
    Hydra:IO:Json.Cache_TempMap(EcoOutputPath)
    String directive    = Hydra:MemMap.GetValue(EcoOutputPath, "/directive") as String
    String species      = Hydra:MemMap.GetValue(EcoOutputPath, "/species") as String
    String ecoRegion       = Hydra:MemMap.GetValue(EcoOutputPath, "/ecoRegion") as String
    String targetRegion = Hydra:MemMap.GetValue(EcoOutputPath, "/target_ecoRegion") as String
    String newOwner     = Hydra:MemMap.GetValue(EcoOutputPath, "/new_owner") as String
    Hydra:IO:Json.Uncache_TempMap(EcoOutputPath)
    Hydra:IO:File.Delete(EcoOutputPath)

    if (directive == "migrate")
        Hydra:TempMap.SetValue("F4AI_T", "eco_migrate_species", species as Var)
        Hydra:TempMap.SetValue("F4AI_T", "eco_migrate_to", targetRegion as Var)
        Debug.Trace("[F4AI_Eco] Migration directive: " + species + " → " + targetRegion)

    elseif (directive == "territorial_pressure")
        Bool bTrue = true
        Hydra:TempMap.SetValue("F4AI_T", "eco_hunting_pressure_" + species, bTrue as Var)
        Debug.Trace("[F4AI_Eco] Hunting pressure on: " + species)

    elseif (directive == "prey_boom")
        Bool bTrue = true
        Hydra:TempMap.SetValue("F4AI_T", "eco_prey_boom", bTrue as Var)
        Debug.Trace("[F4AI_Eco] Prey boom detected in " + ecoRegion)

    elseif (directive == "reset_territory")
        Hydra:SaveMap.SetValue("F4AI_S", "eco_territory_" + ecoRegion, newOwner as Var)
        Debug.Trace("[F4AI_Eco] Territory " + ecoRegion + " reset to " + newOwner)
    endif
EndFunction

; ── Classification ────────────────────────────────────────────────────────────

Bool Function IsPredator(String species)
    if (species == "Deathclaw" || species == "Yao Guai" || species == "Radscorpion")
        return true
    elseif (species == "Mirelurk" || species == "Fog Crawler" || species == "Gulper")
        return true
    elseif (species == "Angler" || species == "Stingwing" || species == "Bloatfly")
        return true
    endif
    return false
EndFunction

Bool Function IsHumanoid(Actor a)
    Race r = a.GetRace()
    return (r == _rHuman || r == _rGhoul || r == _rSynth || r == _rCompanion)
EndFunction

String Function GetSpeciesTag(Actor creature)
    Race r = creature.GetRace()
    if (r == _rDeathclaw)
        return "Deathclaw"
    elseif (r == _rMirelurk1 || r == _rMirelurk2)
        return "Mirelurk"
    elseif (r == _rRadscorp)
        return "Radscorpion"
    elseif (r == _rYaoGuai)
        return "Yao Guai"
    elseif (r == _rBrahmin)
        return "Brahmin"
    elseif (r == _rDog)
        return "Dog"
    elseif (r == _rBloatfly)
        return "Bloatfly"
    elseif (r == _rRadroach)
        return "Radroach"
    elseif (r == _rStingwing)
        return "Stingwing"
    elseif (r == _rBloodbug)
        return "Bloodbug"
    endif
    return ""
EndFunction

; ── Helpers ───────────────────────────────────────────────────────────────────

Function WriteWorldStateToSaveMap()
    ; Read world_state.json written by WorldMonitor and propagate to SaveMap so
    ; ScanEcosystem() can read world_ecoRegion + world_season without re-parsing the file.
    if (!Hydra:IO:File.Exists("Data/F4AI/world_state.json"))
        return
    endif
    Hydra:IO:Json.Cache_TempMap("Data/F4AI/world_state.json")
    String season    = Hydra:MemMap.GetValue("Data/F4AI/world_state.json", "/season") as String
    String ecoRegion = Hydra:MemMap.GetValue("Data/F4AI/world_state.json", "/player_region") as String
    Hydra:IO:Json.Uncache_TempMap("Data/F4AI/world_state.json")
    ; NOTE: do NOT delete world_state.json — WorldMonitor owns it.
    ; Propagate values to SaveMap so ScanEcosystem reads them without re-parsing each tick.
    if (season != "")
        Hydra:SaveMap.SetValue("F4AI_S", "world_season", season as Var)
    endif
    if (ecoRegion != "")
        Hydra:SaveMap.SetValue("F4AI_S", "world_ecoRegion", ecoRegion as Var)
    endif
EndFunction
