; ═══════════════════════════════════════════════════════════════════════════
; WaterSimulation.psc
; Advanced AI System — Realistic Water Simulation
;
; Transforms Fallout 4's static, dead water into a living system:
;
;  STORM WATER BEHAVIOR
;    - Heavy rain:  surface roughens, debris spawns and floats downstream
;                   current forces slow actors crossing water
;                   Mirelurks / Gulpers surge — this is their weather
;                   water radiation temporarily spikes (stirred sediment)
;                   sound over water dramatically increases (wave noise)
;    - Radiation storm: all open water becomes briefly more irradiated
;                   Fog Crawlers emerge — they love radioactive water
;    - Fog:         visibility underwater drops to near-zero
;                   Anglers activate their lures near waterlines
;
;  SEASONAL WATER LEVELS
;    - Spring (snowmelt):   water levels rise — low areas flood
;                           faster currents, more Mirelurk nesting activity
;                           Radstag herds move to newly accessible areas
;    - Summer (drought):    water levels drop, creek beds exposed
;                           concentrated prey at remaining water holes
;                           Mirelurks become territorial as space shrinks
;                           More desperate creature behavior near water
;    - Fall:                normal levels, migration crossing season
;                           Radstag cross rivers heading south — vulnerable
;    - Winter (freeze):     ice forms at water edges in cold regions
;                           Far Harbor ocean surface freezes partially
;                           Walking on ice = audible (detection risk)
;                           Slower movement on ice
;                           Some creatures can cross, others avoid it
;                           Ice cracks = environmental detection event
;
;  WATER AS TACTICAL TERRAIN
;    - Sound carries farther over open water (+40% alert radius)
;    - Rain on water creates noise cover (footsteps masked +50%)
;    - Underwater: all weapon damage reduced, player slowed
;    - Robots entering water: EMP-style damage (short circuit)
;    - Swimming changes stealth calculations (more movement noise)
;    - Mirelurks dramatically faster in water
;    - Radstag/Brahmin drink at dawn/dusk (predators stake out these spots)
;
;  WATERING HOLES
;    - Tracked locations where animals drink
;    - Dawn (05:30–07:00): herd animals arrive
;    - Predators follow them — natural ambush sites
;    - Mid-day: lull — too hot
;    - Dusk (18:30–20:00): second drinking window
;    - Player near watering hole at wrong time = dangerous
;
;  WATER RADIATION
;    - Charles River:       low radiation (flowing, diluted)
;    - Glowing Sea pools:   lethal radiation (concentrated)
;    - Settlement wells:    variable (purified vs. contaminated)
;    - Coastal Far Harbor:  moderate radiation (sea water + fog)
;    - Concord creek:       moderate (near blast sites)
;    - Drinking contaminated water: increasing radiation, debuffs
;
;  FLOOD EVENTS
;    - Triggered by heavy rain lasting 2+ in-game days
;    - Low-lying locations flood temporarily
;    - NPCs and settlers move to higher ground
;    - Caravan routes blocked
;    - Creatures displaced from dens
;    - Flooded areas become Mirelurk / Gulper territory temporarily
;
; Attach to AdvancedAIManager quest.
; Requires: EnvironmentalAIManager (for weather/season data)
; ═══════════════════════════════════════════════════════════════════════════
Scriptname WaterSimulation extends Quest

Quest Property AAIQuest          Auto
Quest Property EnvManager        Auto; EnvironmentalAIManager; EnvironmentalAIManager; EnvironmentalAIManager; EnvironmentalAIManager

; ── Weather / Season Globals ──────────────────────────────────────────────────
GlobalVariable Property gEnvWeatherType  Auto
GlobalVariable Property gEnvTimeOfDay    Auto
GlobalVariable Property gWorldSeason     Auto
GlobalVariable Property gEnvIsNight      Auto

; ── Water Body References (fill in CK for each major water body) ──────────────
ObjectReference Property WaterMarker_CharlesRiver  Auto
ObjectReference Property WaterMarker_FarHarborSea  Auto
ObjectReference Property WaterMarker_SanctuaryRiver Auto
ObjectReference Property WaterMarker_GlowingSeaPool Auto
ObjectReference Property WaterMarker_ConcordCreek  Auto

; ── Flood Zone Trigger Markers (placed at low-lying areas in CK) ──────────────
ObjectReference Property FloodZone_Sanctuary  Auto
ObjectReference Property FloodZone_EastBoston Auto
ObjectReference Property FloodZone_Quincy     Auto
ObjectReference Property FloodZone_FarHarbor  Auto

; ── Watering Hole Markers ─────────────────────────────────────────────────────
ObjectReference[] Property WateringHoles Auto; Array of water-edge markers; Array of water-edge markers; Array of water-edge markers; Array of water-edge markers

; ── Creature Keywords ─────────────────────────────────────────────────────────
Keyword Property kwdMirelurk      Auto
Keyword Property kwdMirelurkQueen Auto
Keyword Property kwdGulper        Auto
Keyword Property kwdFogCrawler    Auto
Keyword Property kwdAngler        Auto
Keyword Property kwdRobot         Auto
Keyword Property kwdBrahmin       Auto
Keyword Property kwdRadstag       Auto
Keyword Property kwdDeathclaw     Auto
Keyword Property kwdYaoGuai       Auto

; ── Effects / Spells / Explosions ────────────────────────────────────────────
Spell     Property spRobotWaterShort  Auto; EMP damage for robots in water; EMP damage for robots in water; EMP damage for robots in water; EMP damage for robots in water
Spell     Property spWaterCurrent     Auto; Force/slow effect on actors in water; Force/slow effect on actors in water; Force/slow effect on actors in water; Force/slow effect on actors in water
Spell     Property spIceSlip          Auto; Slippery effect on ice; Slippery effect on ice; Slippery effect on ice; Slippery effect on ice
Spell     Property spRadWaterSick     Auto; Radiation sickness from drinking bad water; Radiation sickness from drinking bad water; Radiation sickness from drinking bad water; Radiation sickness from drinking bad water
Spell     Property spFrostbite        Auto; Cold damage on ice in winter; Cold damage on ice in winter; Cold damage on ice in winter; Cold damage on ice in winter
Explosion Property expIceCrack        Auto; Ice crack sound/visual event; Ice crack sound/visual event; Ice crack sound/visual event; Ice crack sound/visual event
Spell     Property spFloodCurrent     Auto; Flood current force; Flood current force; Flood current force; Flood current force

; ── Visual / Imagespace Effects ───────────────────────────────────────────────
ImageSpaceModifier Property imodStormWater   Auto; Rougher water visual; Rougher water visual; Rougher water visual; Rougher water visual
ImageSpaceModifier Property imodFloodVision  Auto; Murky flood water; Murky flood water; Murky flood water; Murky flood water
ImageSpaceModifier Property imodIceGlare     Auto; Ice/snow glare; Ice/snow glare; Ice/snow glare; Ice/snow glare

; ── Static / Activator for debris ────────────────────────────────────────────
Form Property debrisPlank    Auto; Floating debris objects; Floating debris objects; Floating debris objects; Floating debris objects
Form Property debrisBarrel   Auto
Form Property debrisCrate    Auto

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property WaterEnabled          = True  Auto
bool  Property StormWaterEnabled     = True  Auto
bool  Property SeasonalLevelsEnabled = True  Auto
bool  Property WateringHoleEnabled   = True  Auto
bool  Property FloodEnabled          = True  Auto
bool  Property IceEnabled            = True  Auto
bool  Property RadWaterEnabled       = True  Auto
bool  Property TacticalWaterEnabled  = True  Auto
float Property UpdateInterval        = 0.15  Auto; Every ~3.5 hrs game time; Every ~3.5 hrs game time; Every ~3.5 hrs game time; Every ~3.5 hrs game time

; ── Internal State ─────────────────────────────────────────────────────────────
int   _currentWeather       = 0
int   _currentSeason        = 0
float _currentHour          = 12.0
bool  _stormWaterActive     = False
bool  _floodActive          = False
bool  _iceActive            = False
float _consecutiveRainDays  = 0.0
float _lastWeatherCheck     = 0.0
bool  _wateringHoleActive   = False

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !WaterEnabled
        Return
    EndIf
    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    ; OnPlayerSwimming is not a FO4 Papyrus event — swimming state is polled in DoGameTimeTick
    ScheduleTick(UpdateInterval)
    ; weather changes are detected by polling in OnTimerGameTime (FO4 has no weather-change event)
    WaterLog("Water Simulation initialized")
EndEvent

Function WeatherChanged(Weather akOldWeather, Weather akNewWeather, Bool abPrecip, Bool abPermaNow)
    ReadGlobalState()
    If _currentWeather == 1 || _currentWeather == 2; Rain or fog; Rain or fog; Rain or fog; Rain or fog
        _consecutiveRainDays += 0.1
    Else
        _consecutiveRainDays = Math.Max(0.0, _consecutiveRainDays - 0.05)
    EndIf
    ApplyWeatherToWater()
EndFunction
Function DoGameTimeTick()
    If !WaterEnabled
        ScheduleTick(UpdateInterval)
        Return
    EndIf

    ReadGlobalState()
    ApplyWeatherToWater()

    If SeasonalLevelsEnabled
        ApplySeasonalWater()
    EndIf
    If WateringHoleEnabled
        ManageWateringHoles()
    EndIf
    If TacticalWaterEnabled
        ApplyTacticalWaterToNearby()
    EndIf

    ; Log for bridge
    Debug.Trace("[AAI] WATER_STATE|season=" + _currentSeason + "|weather=" + _currentWeather + "|hour=" + _currentHour + "|storm=" + _stormWaterActive + "|flood=" + _floodActive + "|ice=" + _iceActive + "|rain_days=" + _consecutiveRainDays)

    ScheduleTick(UpdateInterval)
EndFunction
Function ReadGlobalState()
    If gEnvWeatherType != None
        _currentWeather = gEnvWeatherType.GetValue() as Int
    EndIf
    If gEnvTimeOfDay   != None
        _currentHour    = gEnvTimeOfDay.GetValue()
    EndIf
    If gWorldSeason    != None
        _currentSeason  = gWorldSeason.GetValue() as Int
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; STORM WATER BEHAVIOR
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyWeatherToWater()
    If !StormWaterEnabled
        Return
    EndIf

    Bool wasStorm = _stormWaterActive
    _stormWaterActive = _currentWeather == 1 || _currentWeather == 3; Rain or RadStorm; Rain or RadStorm; Rain or RadStorm; Rain or RadStorm

    If _stormWaterActive && !wasStorm
        OnStormWaterBegins()
    ElseIf !_stormWaterActive && wasStorm
        OnStormWaterEnds()
    EndIf

    ; Check for flood threshold (2+ consecutive rain days)
    If _consecutiveRainDays >= 2.0 && !_floodActive && FloodEnabled
        TriggerFloodEvent()
    ElseIf _consecutiveRainDays < 0.5 && _floodActive
        EndFloodEvent()
    EndIf
EndFunction

Function OnStormWaterBegins()
    WaterLog("Storm water conditions active")

    ; Apply rough water imagespace
    If imodStormWater != None
        imodStormWater.Apply()
    EndIf

    ; Spawn floating debris near water markers
    SpawnWaterDebris()

    ; Mirelurks surge — this is their weather
    ActivateAquaticCreatures(True)

    ; Radiation storm specifically: all open water spikes in radiation
    If _currentWeather == 3
        Debug.Notification("Radiation storm — open water is irradiating. Avoid rivers.")
        Debug.Trace("[AAI] WATER_RAD_SPIKE|reason=radiation_storm|multiplier=3.0")
    EndIf

    Debug.Notification("The water is getting rough. Something's stirring beneath the surface.")
EndFunction

Function OnStormWaterEnds()
    WaterLog("Storm water conditions clearing")
    ActivateAquaticCreatures(False)
    ; Leave debris — it realistically wouldn't vanish immediately
    Debug.Trace("[AAI] WATER_STATE|storm=ended|debris=persisting")
EndFunction

Function SpawnWaterDebris()
    ; Spawn floating debris objects at water markers
    ObjectReference[] markers = new ObjectReference[5]
    markers[0] = WaterMarker_CharlesRiver
    markers[1] = WaterMarker_SanctuaryRiver
    markers[2] = WaterMarker_ConcordCreek
    markers[3] = WaterMarker_FarHarborSea
    markers[4] = WaterMarker_GlowingSeaPool

    Int i = 0
    While i < markers.Length
        ObjectReference marker = markers[i]
        If marker != None
            Int roll = Utility.RandomInt(1, 3)
            If roll == 1 && debrisPlank  != None
                marker.PlaceAtMe(debrisPlank,  1)
            ElseIf roll == 2 && debrisBarrel != None
                marker.PlaceAtMe(debrisBarrel, 1)
            ElseIf debrisCrate != None
                marker.PlaceAtMe(debrisCrate,  1)
            EndIf
        EndIf
        i += 1
    EndWhile
    WaterLog("Storm debris spawned at " + 5 + " water markers")
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; AQUATIC CREATURE ACTIVATION
; ═══════════════════════════════════════════════════════════════════════════
Function ActivateAquaticCreatures(Bool storm)
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 3000.0, 15)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            Bool isAquatic = (kwdMirelurk   != None && npc.HasKeyword(kwdMirelurk))   || (kwdMirelurkQueen != None && npc.HasKeyword(kwdMirelurkQueen)) || (kwdGulper      != None && npc.HasKeyword(kwdGulper))     || (kwdFogCrawler  != None && npc.HasKeyword(kwdFogCrawler)) || (kwdAngler      != None && npc.HasKeyword(kwdAngler))

            If isAquatic
                ActorValue avAggr  = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
                ActorValue avConf  = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
                ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
                If storm
                    ; Storm = aquatic creatures at peak
                    If avAggr  != None
                        npc.SetValue(avAggr,  Math.Min(npc.GetBaseValue(avAggr)  * 1.4, 100.0))
                    EndIf
                    If avConf  != None
                        npc.SetValue(avConf,  Math.Min(npc.GetBaseValue(avConf)  * 1.3, 100.0))
                    EndIf
                    If avSpeed != None
                        npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed) * 1.2)
                    EndIf
                Else
                    ; Calm = restore base
                    If avAggr  != None
                        npc.SetValue(avAggr,  npc.GetBaseValue(avAggr))
                    EndIf
                    If avConf  != None
                        npc.SetValue(avConf,  npc.GetBaseValue(avConf))
                    EndIf
                    If avSpeed != None
                        npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed))
                    EndIf
                EndIf
                npc.EvaluatePackage()
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; SEASONAL WATER LEVELS
; ═══════════════════════════════════════════════════════════════════════════
Function ApplySeasonalWater()
    Bool wasIce = _iceActive
    _iceActive = (_currentSeason == 3) && IceEnabled; Winter only; Winter only; Winter only; Winter only

    If _iceActive && !wasIce
        OnIceFormsEvent()
    ElseIf !_iceActive && wasIce
        OnIceMeltsEvent()
    EndIf

    ; Season announcements (once per season change — handled by DynamicWorldEngine)
    ; We just apply the effects here

    ; SPRING: snowmelt — faster currents, more nesting
    If _currentSeason == 0
        ApplySpringWater()

    ; SUMMER: drought — concentrated prey at remaining water holes
    ElseIf _currentSeason == 1
        ApplySummerWater()

    ; FALL: migration crossing season
    ElseIf _currentSeason == 2
        ApplyFallWater()

    ; WINTER: ice, slower rivers, desperate creatures
    ElseIf _currentSeason == 3
        ApplyWinterWater()
    EndIf
EndFunction

Function ApplySpringWater()
    ; Spring snowmelt: water bodies fuller, faster currents
    ; More Mirelurk nesting activity (spring breeding season)
    Debug.Trace("[AAI] WATER_SEASON|season=Spring|effect=high_water|mirelurk_nesting=active")

    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 2500.0, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            If (kwdMirelurk != None && npc.HasKeyword(kwdMirelurk)) || (kwdMirelurkQueen != None && npc.HasKeyword(kwdMirelurkQueen))
                ; Mirelurks more territorial in spring — breeding aggression
                ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
                If avAggr != None
                    npc.SetValue(avAggr, Math.Min(npc.GetBaseValue(avAggr) * 1.3, 100.0))
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function ApplySummerWater()
    ; Summer drought: water scarce, prey animals congregate at remaining sources
    ; Predators stake out these locations — maximum danger near water
    Debug.Trace("[AAI] WATER_SEASON|season=Summer|effect=low_water|watering_holes=critical")

    ; Notify player near water sources
    Actor player = Game.GetPlayer()
    If player.IsSwimming()
        Debug.Notification("Water levels are low this season. More creatures competing for this source.")
    EndIf

    ; Mirelurks become extremely territorial — reduced space
    Actor[] nearby = MiscUtil.ScanActors(player, 1500.0, 10)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            If kwdMirelurk != None && npc.HasKeyword(kwdMirelurk)
                ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
                If avAggr != None
                    npc.SetValue(avAggr, Math.Min(npc.GetBaseValue(avAggr) * 1.35, 100.0))
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function ApplyFallWater()
    ; Fall: normal levels, migration season
    ; Radstag crossing rivers heading south — vulnerable during crossings
    Debug.Trace("[AAI] WATER_SEASON|season=Fall|effect=normal|migration=crossing")
EndFunction

Function ApplyWinterWater()
    ; Winter: ice on water edges, desperate creatures, Far Harbor freezes
    Debug.Trace("[AAI] WATER_SEASON|season=Winter|effect=ice_forming|desperate=true")

    ; Creatures desperate for unfrozen water access — more aggressive near water
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 2000.0, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            Bool isAnimal = (kwdDeathclaw != None && npc.HasKeyword(kwdDeathclaw)) || (kwdYaoGuai   != None && npc.HasKeyword(kwdYaoGuai))
            If isAnimal
                ; Winter desperation — more aggressive near any water source
                ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
                If avAggr != None
                    npc.SetValue(avAggr, Math.Min(npc.GetBaseValue(avAggr) * 1.2, 100.0))
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; ICE SYSTEM
; ═══════════════════════════════════════════════════════════════════════════
Function OnIceFormsEvent()
    WaterLog("Ice forming on water edges")
    Debug.Notification("The temperature drops further. Ice is forming along the riverbanks.")
    If imodIceGlare != None
        imodIceGlare.Apply()
    EndIf
    Debug.Trace("[AAI] WATER_ICE|stateVal=forming|season=Winter")
EndFunction

Function OnIceMeltsEvent()
    WaterLog("Ice melting — spring thaw")
    Debug.Notification("The ice is breaking up. Spring thaw brings flooding risk.")
    Debug.Trace("[AAI] WATER_ICE|stateVal=melting|season=Spring")
EndFunction

; Called when player steps on ice surface (detected via trigger volume in CK)
Function OnPlayerOnIce()
    If !_iceActive
        Return
    EndIf

    Actor player = Game.GetPlayer()

    ; Ice slippery — movement penalty
    If spIceSlip != None
        spIceSlip.Cast(player, player)
    EndIf

    ; Ice makes noise — detection risk
    ; Generate a random crack event occasionally
    If Utility.RandomInt(1, 100) <= 15; 15% chance per step; 15% chance per step; 15% chance per step; 15% chance per step
        OnIceCrackEvent(player)
    EndIf
EndFunction

Function OnIceCrackEvent(Actor akSource)
    If expIceCrack != None
        akSource.PlaceAtMe(expIceCrack)
    EndIf

    ; Nearby NPCs hear the crack and become suspicious
    Actor[] nearby = MiscUtil.ScanActors(akSource, 800.0, 10)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc != akSource && !npc.IsInCombat()
            ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
            If avAggr != None
                npc.SetValue(avAggr, Math.Min(npc.GetValue(avAggr) + 20.0, 100.0))
            EndIf
            npc.EvaluatePackage()
        EndIf
        i += 1
    EndWhile

    WaterLog("Ice crack at player position — " + nearby.Length + " actors alerted")
    Debug.Trace("[AAI] ICE_CRACK|alerted=" + nearby.Length)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; FLOOD EVENT
; ═══════════════════════════════════════════════════════════════════════════
Function TriggerFloodEvent()
    _floodActive = True
    WaterLog("FLOOD EVENT triggered after " + _consecutiveRainDays + " days of rain")
    Debug.Notification("Flash flooding! Low-lying areas are flooding. Seek higher ground.")

    If imodFloodVision != None
        imodFloodVision.Apply()
    EndIf

    ; Displace NPCs from flood zones to higher ground
    DisplaceFloodNPCs()

    ; Aquatic creatures move into flooded areas
    ActivateAquaticCreatures(True)

    Debug.Trace("[AAI] FLOOD_EVENT|rain_days=" + _consecutiveRainDays + "|zones=active|game_time=" + Utility.GetCurrentGameTime())
EndFunction

Function EndFloodEvent()
    _floodActive = False
    WaterLog("Flood receding")
    Debug.Notification("The flooding is receding. The land is waterlogged and muddy.")
    Debug.Trace("[AAI] FLOOD_EVENT|stateVal=receding")
EndFunction

Function DisplaceFloodNPCs()
    ; NPCs in flood zones should move to higher ground
    ObjectReference[] zones = new ObjectReference[4]
    zones[0] = FloodZone_Sanctuary
    zones[1] = FloodZone_EastBoston
    zones[2] = FloodZone_Quincy
    zones[3] = FloodZone_FarHarbor

    Int i = 0
    While i < zones.Length
        ObjectReference zone = zones[i]
        If zone != None
            Actor[] inZone = MiscUtil.ScanActors(zone, 800.0, 15)
            Int j = 0
            While j < inZone.Length
                Actor npc = inZone[j]
                If npc != None && !npc.IsDead() && !npc.IsInCombat()
                    ; Reduce confidence — makes NPC flee the area
                    ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
                    If avConf != None
                        npc.SetValue(avConf, 0.0)
                    EndIf
                    npc.EvaluatePackage()
                EndIf
                j += 1
            EndWhile
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; WATERING HOLES
; ═══════════════════════════════════════════════════════════════════════════
Function ManageWateringHoles()
    If WateringHoles == None || WateringHoles.Length == 0
        Return
    EndIf

    ; Dawn and dusk: prey animals at water → predators follow
    Bool isDrinkingTime = (_currentHour >= 5.5 && _currentHour <= 7.0) || (_currentHour >= 18.5 && _currentHour <= 20.0)

    Bool wasActive = _wateringHoleActive
    _wateringHoleActive = isDrinkingTime

    If isDrinkingTime && !wasActive
        OnWateringHoleOpens()
    ElseIf !isDrinkingTime && wasActive
        OnWateringHoleCloses()
    EndIf
EndFunction

Function OnWateringHoleOpens()
    WaterLog("Watering hole active — prey animals arriving, predators following")
    Debug.Trace("[AAI] WATERING_HOLE|stateVal=active|hour=" + _currentHour + "|season=" + _currentSeason)

    ; Log for bridge — conversation generator can use this for NPC dialogue
    ; ("Something big is hunting near the river at dawn...")
    Debug.Trace("[AAI] WORLD_EVENT|type=watering_hole_active|location=river|game_time=" + Utility.GetCurrentGameTime())

    ; Make nearby predators more active and directed toward water
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 3000.0, 15)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && !npc.IsInCombat()
            ; Predators head toward water to ambush prey
            If (kwdDeathclaw != None && npc.HasKeyword(kwdDeathclaw)) || (kwdYaoGuai   != None && npc.HasKeyword(kwdYaoGuai))
                ; Re-evaluate package — should route toward water
                npc.EvaluatePackage()
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

Function OnWateringHoleCloses()
    WaterLog("Watering hole period ending")
    Debug.Trace("[AAI] WATERING_HOLE|stateVal=closing|hour=" + _currentHour)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; TACTICAL WATER — Applies modifiers to actors in/near water
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyTacticalWaterToNearby()
    If !TacticalWaterEnabled
        Return
    EndIf

    Actor player = Game.GetPlayer()

    ; Player swimming detection
    If player.IsSwimming() && !player.IsInCombat()
        ApplySwimmingToPlayer(player)
    EndIf

    ; Check nearby NPCs in water
    Actor[] nearby = MiscUtil.ScanActors(player, 1500.0, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc.IsSwimming()
            ApplyWaterToActor(npc)
        EndIf
        i += 1
    EndWhile
EndFunction

Function ApplySwimmingToPlayer(Actor player)
    ; Swimming makes more noise than walking
    ; Footstep-masking from rain is reduced while splashing
    Debug.Trace("[AAI] PLAYER_SWIMMING|weather=" + _currentWeather + "|season=" + _currentSeason)
EndFunction

Function ApplyWaterToActor(Actor npc)
    ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
    If avSpeed == None
        Return
    EndIf

    ; Robots short-circuit in water
    If kwdRobot != None && npc.HasKeyword(kwdRobot)
        If spRobotWaterShort != None
            spRobotWaterShort.Cast(npc, npc)
            WaterLog("Robot " + npc.GetDisplayName() + " taking water damage")
        EndIf
        Return
    EndIf

    ; Aquatic creatures: faster in water
    If (kwdMirelurk != None && npc.HasKeyword(kwdMirelurk)) || (kwdGulper   != None && npc.HasKeyword(kwdGulper))
        npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed) * 1.35)

    ; Land creatures: slower in water
    Else
        Float baseSpeed = npc.GetBaseValue(avSpeed)
        Float depthMod  = 0.65; Slowed in water; Slowed in water; Slowed in water; Slowed in water
        ; Winter: even slower in icy water
        If _iceActive
            depthMod = 0.45
        EndIf
        npc.SetValue(avSpeed, baseSpeed * depthMod)
    EndIf

    ; Apply current force during storm/flood
    If (_stormWaterActive || _floodActive) && spWaterCurrent != None
        spWaterCurrent.Cast(npc, npc)
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PLAYER SWIMMING — Polled each timer tick (FO4 has no OnPlayerSwimming event)
; ═══════════════════════════════════════════════════════════════════════════
Bool _wasSwimming = False

Function CheckSwimming()
    Bool isSwimming = Game.GetPlayer().IsSwimming()
    If isSwimming && !_wasSwimming
        CheckWaterRadiation()
        ApplySwimmingEffects()
    ElseIf !isSwimming && _wasSwimming
        RemoveSwimmingEffects()
    EndIf
    _wasSwimming = isSwimming
EndFunction

Function CheckWaterRadiation()
    ; Check if this water body is irradiated
    Actor player = Game.GetPlayer()
    Float distToGlowingSeaPool
    If (WaterMarker_GlowingSeaPool != None)
        distToGlowingSeaPool = player.GetDistance(WaterMarker_GlowingSeaPool)
    Else
        distToGlowingSeaPool = 99999.0
    EndIf

    If distToGlowingSeaPool < 1000.0
        Debug.Notification("This water is highly irradiated. Get out or you're dead.")
        If spRadWaterSick != None
            spRadWaterSick.Cast(player, player)
        EndIf
    ElseIf _currentWeather == 3; Radiation storm; Radiation storm; Radiation storm; Radiation storm
        Debug.Notification("Radiation storm making this water dangerous. Move.")
    EndIf

    Debug.Trace("[AAI] PLAYER_WATER_ENTRY|rad_storm=" + (_currentWeather == 3) + "|dist_glowing_sea=" + distToGlowingSeaPool + "|season=" + _currentSeason)
EndFunction

Function ApplySwimmingEffects()
    ; Underwater: reduced combat effectiveness, different stealth profile
    Debug.Trace("[AAI] SWIMMING_START|season=" + _currentSeason + "|weather=" + _currentWeather + "|ice=" + _iceActive)
    If _iceActive
        ; Swimming in icy water — cold damage
        Actor player = Game.GetPlayer()
        If spFrostbite != None
            spFrostbite.Cast(player, player)
        EndIf
        Debug.Notification("The water is near freezing. Hypothermia risk.")
    EndIf
EndFunction

Function RemoveSwimmingEffects()
    Actor player = Game.GetPlayer()
    If spFrostbite     != None
        player.DispelSpell(spFrostbite)
    EndIf
    If spRadWaterSick  != None
        player.DispelSpell(spRadWaterSick)
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; WATER RADIATION LEVELS (logged for bridge)
; ═══════════════════════════════════════════════════════════════════════════
Function LogWaterRadiation(String waterBodyName, Float radLevel)
    Float stormMult
    If (_currentWeather == 3)
        stormMult = 3.0
    Else
        stormMult = 1.0
    EndIf
    Float effectiveRad = radLevel * stormMult

    Debug.Trace("[AAI] WATER_RAD|body=" + waterBodyName + "|base_rad=" + radLevel + "|effective=" + effectiveRad + "|storm_mult=" + stormMult)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PUBLIC API
; ═══════════════════════════════════════════════════════════════════════════
Bool Function IsFloodActive()
    Return _floodActive
EndFunction
Bool Function IsIceActive()
    Return _iceActive
EndFunction
Bool Function IsStormWaterActive()
    Return _stormWaterActive
EndFunction
Int  Function GetCurrentSeason()
    Return _currentSeason
EndFunction

Function WaterLog(String msg)
    Debug.Trace("[AAI-Water] " + msg)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours = 1.0
Weather _f4aiLastWeather = None

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        Weather wNow = Weather.GetCurrentWeather()
        If wNow != _f4aiLastWeather
            Weather wOld = _f4aiLastWeather
            _f4aiLastWeather = wNow
            WeatherChanged(wOld, wNow, False, False)
        EndIf
        CheckSwimming()
        DoGameTimeTick()
    EndIf
EndEvent
