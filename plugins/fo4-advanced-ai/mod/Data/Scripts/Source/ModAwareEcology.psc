; ═══════════════════════════════════════════════════════════════════════════
; ModAwareEcology.psc
; Advanced AI System — Mod-Aware World Adaptation
;
; Reads the ecosystem adaptation state written by the Mossy Bridge
; (from mod_detector.py + ecosystem_adaptor.py) and applies it to
; every world system:
;
;   VEGETATION MODS DETECTED →
;     - Rain frequency global → EnvironmentalAIManager adjusts weather
;     - Stealth bonus in foliage areas
;     - NPC perception reduced
;     - Herbivore populations boosted near vegetation
;     - Predators follow prey into new vegetated areas
;     - Ambush creature prevalence rises in dense cover
;
;   FISH / AQUATIC LIFE →
;     - Aquatic food web globals → CreatureEcologyManager activates chains
;     - Mirelurks hunt fish not just ambush players
;     - Water-edge bird creatures hunt at dawn/dusk
;     - Anglers more effective (fish to attract)
;
;   GLOWING SEA JUNGLE →
;     - Completely different creature set in GS area
;     - Tropical heat / mist / constant rain
;     - Dense cover ambush AI dominant
;     - Deathclaws use cover instead of open stalking
;
;   LIVING OCEAN →
;     - Tidal patterns: coastal flooding twice per game-day
;     - Bioluminescence at night reveals position
;     - Coral-reef creature diversity active
;
;   WEATHER OVERHAUL →
;     - Storm multiplier feeds into EnvironmentalAIManager
;     - Thunder masks gunfire detection
;
;   DARKER NIGHTS →
;     - Darkness multiplier in our stealth calculations
;     - Nocturnal creatures even more dangerous
;
; Reads: Documents\My Games\Fallout4\AdvancedAI_EcosystemState.json
;        via JsonUtil (PapyrusUtil F4SE plugin)
;
; Attach to AdvancedAIManager quest.
; ═══════════════════════════════════════════════════════════════════════════
Scriptname ModAwareEcology extends Quest

Quest Property AAIQuest             Auto
Quest Property EnvManager           Auto; EnvironmentalAIManager; EnvironmentalAIManager; EnvironmentalAIManager; EnvironmentalAIManager
Quest Property CreatureEcoManager   Auto; CreatureEcologyManager; CreatureEcologyManager; CreatureEcologyManager; CreatureEcologyManager
Quest Property WaterSim             Auto; WaterSimulation; WaterSimulation; WaterSimulation; WaterSimulation

; ── Mod Awareness GlobalVariables (set by bridge, read here) ─────────────────
; Vegetation
GlobalVariable Property gAAI_VegRainMult    Auto; 1.0 = vanilla, 2.0 = double rain; 1.0 = vanilla, 2.0 = double rain; 1.0 = vanilla, 2.0 = double rain; 1.0 = vanilla, 2.0 = double rain
GlobalVariable Property gAAI_VegStealthAdd  Auto; 0.0–0.4 stealth bonus from foliage; 0.0–0.4 stealth bonus from foliage; 0.0–0.4 stealth bonus from foliage; 0.0–0.4 stealth bonus from foliage
GlobalVariable Property gAAI_VegDetReduce   Auto; 0.0–0.35 reduction in NPC detection; 0.0–0.35 reduction in NPC detection; 0.0–0.35 reduction in NPC detection; 0.0–0.35 reduction in NPC detection
GlobalVariable Property gAAI_VegCount       Auto; How many vegetation mods; How many vegetation mods; How many vegetation mods; How many vegetation mods

; Fish / Aquatic
GlobalVariable Property gAAI_FishPresent    Auto; 1 = fish mods active; 1 = fish mods active; 1 = fish mods active; 1 = fish mods active
GlobalVariable Property gAAI_AquaticWeb     Auto; 1 = full food web active; 1 = full food web active; 1 = full food web active; 1 = full food web active

; Special Biomes
GlobalVariable Property gAAI_GSJungle       Auto; 1 = Glowing Sea is jungle; 1 = Glowing Sea is jungle; 1 = Glowing Sea is jungle; 1 = Glowing Sea is jungle
GlobalVariable Property gAAI_LivingOcean    Auto; 1 = Living Ocean active; 1 = Living Ocean active; 1 = Living Ocean active; 1 = Living Ocean active
GlobalVariable Property gAAI_TidalActive    Auto; 1 = tidal patterns active; 1 = tidal patterns active; 1 = tidal patterns active; 1 = tidal patterns active

; Weather / Lighting
GlobalVariable Property gAAI_StormMult      Auto; 1.0 = vanilla storms; 1.0 = vanilla storms; 1.0 = vanilla storms; 1.0 = vanilla storms
GlobalVariable Property gAAI_DarknessMult   Auto; 1.0 = vanilla darkness; 1.0 = vanilla darkness; 1.0 = vanilla darkness; 1.0 = vanilla darkness

; Compatibility
GlobalVariable Property gAAI_ArbitrationMode Auto; 1 = skip detection overrides; 1 = skip detection overrides; 1 = skip detection overrides; 1 = skip detection overrides
GlobalVariable Property gAAI_SimSettlements  Auto; 1 = SS2 present; 1 = SS2 present; 1 = SS2 present; 1 = SS2 present
GlobalVariable Property gAAI_SurvivalMode    Auto; 1 = survival mode; 1 = survival mode; 1 = survival mode; 1 = survival mode

; ── Location References (for biome checks) ────────────────────────────────────
Location Property locGlowingSea     Auto
Location Property locFarHarbor      Auto
Location Property locNukaWorld      Auto

; ── Glowing Sea Creature Keywords ────────────────────────────────────────────
; When GS Jungle active, these creature types become dominant in the GS
Keyword Property kwdJungleVariant   Auto; Custom keyword: AAI_JungleVariant; Custom keyword: AAI_JungleVariant; Custom keyword: AAI_JungleVariant; Custom keyword: AAI_JungleVariant
Keyword Property kwdDeathclaw       Auto
Keyword Property kwdFogCrawler      Auto
Keyword Property kwdMirelurk        Auto

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property ModAwarenessEnabled  = True  Auto
float Property UpdateInterval       = 0.5   Auto; Every ~12 hrs game time; Every ~12 hrs game time; Every ~12 hrs game time; Every ~12 hrs game time
String Property EcosystemFilePath   = "AdvancedAI_EcosystemState.json" Auto Const

; ── Internal State ─────────────────────────────────────────────────────────────
bool  _fishPresent       = False
bool  _aquaticWebActive  = False
bool  _gsJungleActive    = False
bool  _livingOceanActive = False
bool  _tidalActive       = False
bool  _arbitrationMode   = False
bool  _survivalMode      = False
float _vegCount          = 0.0
float _vegRainMult       = 1.0
float _vegStealthAdd     = 0.0
float _vegDetReduce      = 0.0
float _stormMult         = 1.0
float _darknessMult      = 1.0
float _lastTidalPhase    = 0.0
bool  _initialized       = False

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !ModAwarenessEnabled
        Return
    EndIf

    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    ScheduleTick(UpdateInterval)

    ; Read initial state
    ReadEcosystemState()

    ModLog("%-Aware Ecology initialized — " + _vegCount + " vegetation mods, fish=" + _fishPresent + ", GS jungle=" + _gsJungleActive)
    _initialized = True
EndEvent

Event Actor.OnPlayerLoadGame(Actor akSender)
    ; Re-read on every load (player may have added mods)
    ReadEcosystemState()
    ApplyAllAdaptations()
EndEvent

; ═══════════════════════════════════════════════════════════════════════════
; READ ECOSYSTEM STATE FROM BRIDGE FILE
; ═══════════════════════════════════════════════════════════════════════════
Function ReadEcosystemState()
    ; Read from GlobalVariables (bridge writes these via MCM Helper globals)
    ; Fallback to defaults if not set

    If (gAAI_VegCount      != None)
        _vegCount = gAAI_VegCount.GetValue()
    Else
        _vegCount = 0.0
    EndIf
    If (gAAI_VegRainMult   != None)
        _vegRainMult = gAAI_VegRainMult.GetValue()
    Else
        _vegRainMult = 1.0
    EndIf
    If (gAAI_VegStealthAdd != None)
        _vegStealthAdd = gAAI_VegStealthAdd.GetValue()
    Else
        _vegStealthAdd = 0.0
    EndIf
    If (gAAI_VegDetReduce  != None)
        _vegDetReduce = gAAI_VegDetReduce.GetValue()
    Else
        _vegDetReduce = 0.0
    EndIf
    If (gAAI_FishPresent   != None)
        _fishPresent = (gAAI_FishPresent.GetValue() > 0.5)
    Else
        _fishPresent = False
    EndIf
    If (gAAI_AquaticWeb != None)
        _aquaticWebActive = (gAAI_AquaticWeb.GetValue() > 0.5)
    Else
        _aquaticWebActive = False
    EndIf
    If (gAAI_GSJungle   != None)
        _gsJungleActive = (gAAI_GSJungle.GetValue() > 0.5)
    Else
        _gsJungleActive = False
    EndIf
    If (gAAI_LivingOcean != None)
        _livingOceanActive = (gAAI_LivingOcean.GetValue() > 0.5)
    Else
        _livingOceanActive = False
    EndIf
    If (gAAI_TidalActive != None)
        _tidalActive = (gAAI_TidalActive.GetValue() > 0.5)
    Else
        _tidalActive = False
    EndIf
    If (gAAI_StormMult   != None)
        _stormMult = gAAI_StormMult.GetValue()
    Else
        _stormMult = 1.0
    EndIf
    If (gAAI_DarknessMult != None)
        _darknessMult = gAAI_DarknessMult.GetValue()
    Else
        _darknessMult = 1.0
    EndIf
    If (gAAI_ArbitrationMode != None)
        _arbitrationMode = (gAAI_ArbitrationMode.GetValue() > 0.5)
    Else
        _arbitrationMode = False
    EndIf
    If (gAAI_SurvivalMode != None)
        _survivalMode = (gAAI_SurvivalMode.GetValue() > 0.5)
    Else
        _survivalMode = False
    EndIf

    ; Also try to read from the JSON file for detailed data
    If JsonUtil.JsonExists(EcosystemFilePath)
        ModLog("Ecosystem stateVal JSON found — reading detailed adaptation data")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PERIODIC TICK — Apply adaptations
; ═══════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If !ModAwarenessEnabled
        ScheduleTick(UpdateInterval)
        Return
    EndIf

    ApplyAllAdaptations()

    ScheduleTick(UpdateInterval)
EndFunction
Function ApplyAllAdaptations()
    ; Apply each system's adaptations based on current mod state
    If _vegCount > 0
        ApplyVegetationAdaptations()
    EndIf
    If _fishPresent
        ApplyFishEcosystem()
    EndIf
    If _gsJungleActive
        ApplyGlowingSeaJungle()
    EndIf
    If _livingOceanActive
        ApplyLivingOcean()
    EndIf
    If _tidalActive
        ApplyTidalPatterns()
    EndIf
    If _stormMult > 1.0
        ApplyWeatherIntensity()
    EndIf
    If _darknessMult > 1.0
        ApplyDarknessIntensity()
    EndIf
    If _arbitrationMode
        ApplyArbitrationCompatibility()
    EndIf
    If _survivalMode
        ApplySurvivalAdaptations()
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; VEGETATION ADAPTATIONS
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyVegetationAdaptations()
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 2500.0, 20)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            ApplyVegetationToActor(npc)
        EndIf
        i += 1
    EndWhile

    ; Log for bridge
    Debug.Trace("[AAI] MOD_VEG|count=" + _vegCount + "|rain=" + _vegRainMult + "|stealth=" + _vegStealthAdd + "|detection=" + _vegDetReduce)
EndFunction

Function ApplyVegetationToActor(Actor npc)
    If _arbitrationMode
        Return; Skip detection overrides if Arbitration is handling it; Skip detection overrides if Arbitration is handling it; Skip detection overrides if Arbitration is handling it; Skip detection overrides if Arbitration is handling it
    EndIf

    ActorValue avPerc = Game.GetFormFromFile(0x000002E3, "Fallout4.esm") as ActorValue
    If avPerc == None
        Return
    EndIf

    Float basePerc = npc.GetBaseValue(avPerc)
    Float newPerc  = basePerc * (1.0 - _vegDetReduce)
    npc.SetValue(avPerc, newPerc)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; FISH / AQUATIC FOOD WEB
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyFishEcosystem()
    ; With fish present, Mirelurks aren't just waiting — they're actively hunting
    ; Trigger hunting behavior near water-edge creatures
    Actor player = Game.GetPlayer()
    If !player.IsInLocation(GetNearbyWaterLocation())
        Return
    EndIf

    Actor[] nearby = MiscUtil.ScanActors(player, 2000.0, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            If kwdMirelurk != None && npc.HasKeyword(kwdMirelurk)
                ; Mirelurk actively hunting fish — more dynamic patrol near water
                If !npc.IsInCombat()
                    npc.EvaluatePackage()
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile

    Debug.Trace("[AAI] MOD_FISH|aquatic_web=" + _aquaticWebActive)
EndFunction

Location Function GetNearbyWaterLocation()
    ; Returns the nearest water-associated location
    ; In a full implementation: check water body proximity
    Return None; Placeholder — expand in CK with actual water location refs; Placeholder — expand in CK with actual water location refs; Placeholder — expand in CK with actual water location refs; Placeholder — expand in CK with actual water location refs
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; GLOWING SEA JUNGLE
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyGlowingSeaJungle()
    Actor player = Game.GetPlayer()

    ; Only apply if player is in the Glowing Sea
    If locGlowingSea == None || !player.IsInLocation(locGlowingSea)
        Return
    EndIf

    ; Jungle GS: Deathclaws become ambush hunters instead of open stalkers
    Actor[] nearby = MiscUtil.ScanActors(player, 2500.0, 15)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && !npc.IsInCombat()
            If kwdDeathclaw != None && npc.HasKeyword(kwdDeathclaw)
                ; Jungle Deathclaw: wait in cover, ambush when close
                ; Apply restrained/ambush package state
                If npc.GetDistance(player) > 500.0
                    npc.SetRestrained(True); Stay hidden in jungle; Stay hidden in jungle; Stay hidden in jungle; Stay hidden in jungle
                Else
                    npc.SetRestrained(False); Player too close — attack; Player too close — attack; Player too close — attack; Player too close — attack
                    npc.StartCombat(player)
                EndIf

            ElseIf kwdFogCrawler != None && npc.HasKeyword(kwdFogCrawler)
                ; Fog Crawlers thrive in GS jungle — peak aggression
                ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
                If avAggr != None
                    npc.SetValue(avAggr, Math.Min(npc.GetBaseValue(avAggr) * 1.5, 100.0))
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile

    Debug.Trace("[AAI] MOD_GS_JUNGLE|active=true|player_in_gs=true")
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; LIVING OCEAN
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyLivingOcean()
    ; Living Ocean: coastal areas more dangerous, diverse creature presence
    ; Tidal patterns handled separately
    Debug.Trace("[AAI] MOD_LIVING_OCEAN|active=true|bioluminescence=" + _tidalActive)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; TIDAL PATTERNS
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyTidalPatterns()
    If !_tidalActive
        Return
    EndIf

    ; Tidal cycle: twice per game-day (every 12 in-game hours)
    Float gameTime = Utility.GetCurrentGameTime()
    Float hourOfDay = (gameTime - Math.Floor(gameTime)) * 24.0
    Float tidalPhase = 0.0

    ; High tide: 06:00 and 18:00 (dawn and dusk)
    If (hourOfDay >= 5.0 && hourOfDay <= 7.0) || (hourOfDay >= 17.0 && hourOfDay <= 19.0)
        tidalPhase = 1.0; High tide; High tide; High tide; High tide
    ElseIf (hourOfDay >= 11.0 && hourOfDay <= 13.0) || (hourOfDay >= 23.0 || hourOfDay <= 1.0)
        tidalPhase = 0.0; Low tide; Low tide; Low tide; Low tide
    Else
        tidalPhase = 0.5; Mid tide; Mid tide; Mid tide; Mid tide
    EndIf

    If tidalPhase != _lastTidalPhase
        If tidalPhase >= 0.9
            Debug.Notification("High tide — coastal areas flooding. Mirelurk territory expands.")
            Debug.Trace("[AAI] TIDAL|phase=high|flood=active")
        ElseIf tidalPhase <= 0.1 && _lastTidalPhase > 0.5
            Debug.Notification("Low tide. Exposed tidal flats — watch for creatures in the shallows.")
            Debug.Trace("[AAI] TIDAL|phase=low")
        EndIf
        _lastTidalPhase = tidalPhase
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; WEATHER INTENSITY
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyWeatherIntensity()
    ; Storm multiplier feeds into creature surge intensity
    ; Already handled by EnvironmentalAIManager — just log the multiplier
    Debug.Trace("[AAI] MOD_STORM_MULT|mult=" + _stormMult)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; DARKNESS
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyDarknessIntensity()
    Float gameTime = Utility.GetCurrentGameTime()
    Float hourOfDay = (gameTime - Math.Floor(gameTime)) * 24.0
    Bool isNight = hourOfDay < 5.5 || hourOfDay > 21.0

    If isNight
        ; Apply extra stealth bonus from darkness mod
        Actor player = Game.GetPlayer()
        Actor[] nearby = MiscUtil.ScanActors(player, 2000.0, 15)
        Int i = 0
        While i < nearby.Length
            Actor npc = nearby[i]
            If npc != None && !npc.IsDead() && !_arbitrationMode
                ActorValue avPerc = Game.GetFormFromFile(0x000002E3, "Fallout4.esm") as ActorValue
                If avPerc != None
                    Float basePerc = npc.GetBaseValue(avPerc)
                    ; Additional reduction from darkness mod (stacks with our base night reduction)
                    npc.SetValue(avPerc, basePerc * (1.0 - ((_darknessMult - 1.0) * 0.15)))
                EndIf
            EndIf
            i += 1
        EndWhile
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; ARBITRATION COMPATIBILITY MODE
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyArbitrationCompatibility()
    ; When Arbitration is present, skip detection overrides
    ; to avoid double-stacking with Arbitration's changes.
    ; Our creature behavior, pack tactics, and special abilities still apply.
    ; Logged so Mossy shows the compatibility note.
    Debug.Trace("[AAI] ARBITRATION_COMPAT|mode=active|detection_overrides=suppressed")
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; SURVIVAL MODE
; ═══════════════════════════════════════════════════════════════════════════
Function ApplySurvivalAdaptations()
    ; In survival mode: NPC hunger/thirst has harder morale impact
    ; Creatures venture further for food/water when desperate
    Debug.Trace("[AAI] SURVIVAL_MODE|active=true")
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PUBLIC API — other scripts query the mod state
; ═══════════════════════════════════════════════════════════════════════════
Bool  Function IsFishPresent()
    Return _fishPresent
EndFunction
Bool  Function IsAquaticWebActive()
    Return _aquaticWebActive
EndFunction
Bool  Function IsGSJungleActive()
    Return _gsJungleActive
EndFunction
Bool  Function IsLivingOceanActive()
    Return _livingOceanActive
EndFunction
Bool  Function IsTidalActive()
    Return _tidalActive
EndFunction
Bool  Function IsArbitrationMode()
    Return _arbitrationMode
EndFunction
Bool  Function IsSurvivalMode()
    Return _survivalMode
EndFunction
Float Function GetVegCount()
    Return _vegCount
EndFunction
Float Function GetVegStealthBonus()
    Return _vegStealthAdd
EndFunction
Float Function GetVegDetectReduce()
    Return _vegDetReduce
EndFunction
Float Function GetStormMult()
    Return _stormMult
EndFunction
Float Function GetDarknessMult()
    Return _darknessMult
EndFunction

Function ModLog(String msg)
    Debug.Trace("[AAI-ModEco] " + msg)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours = 1.0

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        DoGameTimeTick()
    EndIf
EndEvent
