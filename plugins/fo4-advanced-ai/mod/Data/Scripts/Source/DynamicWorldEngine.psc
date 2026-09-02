; ═══════════════════════════════════════════════════════════════════════════
; DynamicWorldEngine.psc
; Advanced AI System — The Living Commonwealth
;
; The world doesn't stand still while the player isn't looking.
; This engine runs on a game-time clock and makes the world change:
;
;  THREATS THAT GROW IF IGNORED
;    - Raider bosses build armies over time
;    - Feral ghoul hordes spread from dead zones
;    - Super Mutant warlords claim territory
;    - If left alone 30+ game days: threat becomes a major event
;
;  FACTION POWER SHIFTS
;    - Brotherhood / Railroad / Minutemen / Institute gain or lose
;      territory based on player involvement (and lack of it)
;    - Neutral settlements shift allegiance toward whoever helps them
;    - Caravan routes reflect faction control
;
;  RUMORS & REPUTATION SPREADING
;    - Player actions become known — bridge tracks and propagates
;    - 3 in-game days: local area knows
;    - 7 in-game days: regional settlements know
;    - 14 in-game days: the whole Commonwealth has heard
;    - Rumors decay, exaggerate, or twist over time
;
;  SEASONAL CREATURE PATTERNS
;    - Spring (day 60-150):   creature breeding — MORE aggressive, more encounters
;    - Summer (day 151-240):  peak activity, resource competition
;    - Fall (day 241-330):    preparation, migration, stockpiling
;    - Winter (day 331-365):  survival mode — desperate creatures, less food
;
;  MIGRATION EVENTS
;    - Radstag herds move south in winter
;    - Deathclaw pairs seek new territory when young reach maturity
;    - Ghoul hordes drift toward populated areas at night
;    - Mirelurk queens relocate to new coastal sites seasonally
;
;  WORLD CONSEQUENCES
;    - Cleared location: remains cleared 30 days, then threat returns
;    - Killed leader: faction weakens for 14 days, then new leader rises
;    - Helped faction: that faction expands nearby over next 7 days
;    - Ignored threat: threat grows until it triggers a world event
;
; Attach to AdvancedAIManager quest.
; ═══════════════════════════════════════════════════════════════════════════
Scriptname DynamicWorldEngine extends Quest

Quest Property AAIQuest Auto

; ── Settlement References (fill for each settlement in CK) ────────────────────
SettlementLifeSimulation[] Property AllSettlements Auto

; ── Faction References ────────────────────────────────────────────────────────
Faction Property factionMinutemen  Auto
Faction Property factionBoS        Auto
Faction Property factionRailroad   Auto
Faction Property factionInstitute  Auto
Faction Property factionRaiders    Auto
Faction Property factionGunners    Auto

; ── World Clock ───────────────────────────────────────────────────────────────
GlobalVariable Property gWorldDay         Auto; Current game day (0–365+); Current game day (0–365+); Current game day (0–365+); Current game day (0–365+)
GlobalVariable Property gWorldSeason      Auto; 0=Spring 1=Summer 2=Fall 3=Winter; 0=Spring 1=Summer 2=Fall 3=Winter; 0=Spring 1=Summer 2=Fall 3=Winter; 0=Spring 1=Summer 2=Fall 3=Winter
GlobalVariable Property gTotalGameDays    Auto; Cumulative days played; Cumulative days played; Cumulative days played; Cumulative days played

; ── Threat Tracking Globals ───────────────────────────────────────────────────
; For each major threat region — bridge tracks the actual data
; These globals are updated by the bridge via the log
GlobalVariable Property gThreat_NorthBoston  Auto; 0-100 threat level; 0-100 threat level; 0-100 threat level; 0-100 threat level
GlobalVariable Property gThreat_GlowingSea   Auto
GlobalVariable Property gThreat_Cambridge    Auto
GlobalVariable Property gThreat_Quincy       Auto

; ── Faction Power Globals ─────────────────────────────────────────────────────
GlobalVariable Property gPower_Minutemen Auto; 0-100; 0-100; 0-100; 0-100
GlobalVariable Property gPower_BoS      Auto
GlobalVariable Property gPower_Railroad Auto
GlobalVariable Property gPower_Institute Auto

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property WorldEnabled         = True  Auto
bool  Property ThreatGrowthEnabled  = True  Auto
bool  Property FactionShiftEnabled  = True  Auto
bool  Property RumorSpreadEnabled   = True  Auto
bool  Property SeasonalEnabled      = True  Auto
bool  Property MigrationEnabled     = True  Auto
float Property WorldUpdateInterval  = 1.0   Auto; Every 24 hrs game time; Every 24 hrs game time; Every 24 hrs game time; Every 24 hrs game time

; ── Internal State ─────────────────────────────────────────────────────────────
float _lastWorldUpdate   = 0.0
int   _currentSeason     = 0; 0=Spring 1=Summer 2=Fall 3=Winter; 0=Spring 1=Summer 2=Fall 3=Winter; 0=Spring 1=Summer 2=Fall 3=Winter; 0=Spring 1=Summer 2=Fall 3=Winter
float _currentDayOfYear  = 0.0
int   _worldDayCount     = 0

; Active threats array (up to 8 simultaneous tracked threats)
String[] _activeThreatNames
float[]  _activeThreatLevels
float[]  _activeThreatDays; How long this threat has existed; How long this threat has existed; How long this threat has existed; How long this threat has existed
String[] _activeThreatLocations

; Pending rumors
String[] _pendingRumors
float[]  _rumorBirthTimes
String[] _rumorOriginLocations

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !WorldEnabled
        Return
    EndIf

    _activeThreatNames     = new String[8]
    _activeThreatLevels    = new float[8]
    _activeThreatDays      = new float[8]
    _activeThreatLocations = new String[8]
    _pendingRumors         = new String[16]
    _rumorBirthTimes       = new float[16]
    _rumorOriginLocations  = new String[16]

    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    ScheduleTick(WorldUpdateInterval)

    ; Restore world day from global
    If gWorldDay != None
        _worldDayCount = gWorldDay.GetValue() as Int
    EndIf
    If gWorldSeason != None
        _currentSeason = gWorldSeason.GetValue() as Int
    EndIf

    WorldLog("Dynamic World Engine initialized | Day: " + _worldDayCount + " Season: " + GetCurrentSeason())
EndEvent

Function DoGameTimeTick()
    If !WorldEnabled
        ScheduleTick(WorldUpdateInterval)
        Return
    EndIf

    Float gameTime = Utility.GetCurrentGameTime()
    _worldDayCount += 1
    _currentDayOfYear = (_worldDayCount % 365) as Float

    ; Update globals
    If gWorldDay   != None
        gWorldDay.SetValue(_worldDayCount as Float)
    EndIf
    If gTotalGameDays != None
        gTotalGameDays.SetValue(gTotalGameDays.GetValue() + 1.0)
    EndIf

    ; Update season
    UpdateSeason()

    ; Run world systems
    If ThreatGrowthEnabled
        UpdateThreatGrowth(gameTime)
    EndIf
    If FactionShiftEnabled
        UpdateFactionPower(gameTime)
    EndIf
    If RumorSpreadEnabled
        UpdateRumorSpread(gameTime)
    EndIf
    If SeasonalEnabled
        ApplySeasonalEffects()
    EndIf
    If MigrationEnabled && (_worldDayCount % 7 == 0)
        TriggerMigrationCheck()
    EndIf

    ; Daily world log for bridge
    Debug.Trace("[AAI] WORLD_TICK|day=" + _worldDayCount + "|season=" + GetCurrentSeason() + "|day_of_year=" + _currentDayOfYear + "|game_time=" + gameTime)

    ScheduleTick(WorldUpdateInterval)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; SEASONS
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateSeason()
    int newSeason = 0
    If _currentDayOfYear >= 60.0 && _currentDayOfYear < 151.0
        newSeason = 0
    ElseIf _currentDayOfYear >= 151.0 && _currentDayOfYear < 241.0
        newSeason = 1
    ElseIf _currentDayOfYear >= 241.0 && _currentDayOfYear < 331.0
        newSeason = 2
    Else
        newSeason = 3
    EndIf

    If newSeason != _currentSeason
        OnSeasonChange(_currentSeason, newSeason)
        _currentSeason = newSeason
        If gWorldSeason != None
            gWorldSeason.SetValue(_currentSeason as Float)
        EndIf
    EndIf
EndFunction

Function OnSeasonChange(Int oldSeason, Int newSeason)
    String msg = ""
    If newSeason == 0
        msg = "Spring arrives. Creature breeding season begins — they're more aggressive."
    ElseIf newSeason == 1
        msg = "The Commonwealth summer. Competition for resources peaks."
    ElseIf newSeason == 2
        msg = "Fall. Creatures are stocking up. Migrations will begin soon."
    ElseIf newSeason == 3
        msg = "Winter. Survival mode. Desperate creatures, scarce food."
    EndIf
    Debug.Notification(msg)

    Debug.Trace("[AAI] SEASON_CHANGE|from=" + GetSeasonName(oldSeason) + "|to=" + GetSeasonName(newSeason) + "|day=" + _worldDayCount)
    WorldLog("Season changed: " + GetSeasonName(oldSeason) + " → " + GetSeasonName(newSeason))
EndFunction

Function ApplySeasonalEffects()
    ; Apply season-specific modifiers to all nearby actors
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 3000.0, 20)
    Float aggrMod  = 1.0
    Float speedMod = 1.0

    If _currentSeason == 0; Spring — breeding aggression; Spring — breeding aggression; Spring — breeding aggression; Spring — breeding aggression
        aggrMod = 1.25
    ElseIf _currentSeason == 1; Summer — peak activity; Summer — peak activity; Summer — peak activity; Summer — peak activity
        aggrMod = 1.1
        speedMod = 1.05
    ElseIf _currentSeason == 2; Fall — cautious; Fall — cautious; Fall — cautious; Fall — cautious
        aggrMod = 0.95
    ElseIf _currentSeason == 3; Winter — desperate; Winter — desperate; Winter — desperate; Winter — desperate
        aggrMod = 1.3; Hunger drives aggression; Hunger drives aggression; Hunger drives aggression; Hunger drives aggression
        speedMod = 0.9; Cold slows movement; Cold slows movement; Cold slows movement; Cold slows movement
    EndIf

    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead()
            ActorValue avAggr  = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
            ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
            If avAggr  != None
                npc.SetValue(avAggr,  Math.Clamp(npc.GetBaseValue(avAggr) * aggrMod, 0.0, 100.0))
            EndIf
            If avSpeed != None && speedMod != 1.0
                npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed) * speedMod)
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

String Function GetSeasonName(Int season)
    If season == 0
        Return "Spring"
    ElseIf season == 1
        Return "Summer"
    ElseIf season == 2
        Return "Fall"
    EndIf
    Return "Winter"
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; THREAT GROWTH SYSTEM
; ═══════════════════════════════════════════════════════════════════════════
Function RegisterThreat(String threatName, String locationArg, Float initialLevel)
    ; Find an empty slot
    Int i = 0
    While i < 8
        If _activeThreatNames[i] == ""
            _activeThreatNames[i]     = threatName
            _activeThreatLocations[i] = locationArg
            _activeThreatLevels[i]    = initialLevel
            _activeThreatDays[i]      = 0.0
            WorldLog("Threat registered: " + threatName + " at " + locationArg)
            Debug.Trace("[AAI] THREAT_REGISTERED|name=" + threatName + "|locationArg=" + locationArg + "|level=" + initialLevel)
            Return
        EndIf
        i += 1
    EndWhile
EndFunction

Function ResolveThreat(String threatName)
    Int i = 0
    While i < 8
        If _activeThreatNames[i] == threatName
            Float finalLevel    = _activeThreatLevels[i]
            Float daysExisted   = _activeThreatDays[i]
            String threatLocation = _activeThreatLocations[i]
            WorldLog("Threat resolved: " + threatName + " (existed " + daysExisted + " days)")
            Debug.Trace("[AAI] THREAT_RESOLVED|name=" + threatName + "|days_existed=" + daysExisted + "|final_level=" + finalLevel)

            ; Notify connected settlements to celebrate
            Int j = 0
            While j < AllSettlements.Length
                If AllSettlements[j] != None
                    AllSettlements[j].TriggerCelebration(threatName + " has been dealt with")
                EndIf
                j += 1
            EndWhile

            ; Clear slot
            _activeThreatNames[i]     = ""
            _activeThreatLevels[i]    = 0.0
            _activeThreatDays[i]      = 0.0
            _activeThreatLocations[i] = ""

            ; Add world event for rumor engine
            RegisterWorldRumor("Wanderer defeated " + threatName + " at " + threatLocation, threatLocation)
            Return
        EndIf
        i += 1
    EndWhile
EndFunction

Function UpdateThreatGrowth(Float gameTime)
    Int i = 0
    While i < 8
        If _activeThreatNames[i] != ""
            _activeThreatDays[i] += 1.0

            ; Threats grow over time if not addressed
            Float growthRate = 1.5; Level per day; Level per day; Level per day; Level per day
            _activeThreatLevels[i] = Math.Min(_activeThreatLevels[i] + growthRate, 100.0)

            ; Escalation warnings
            Float level = _activeThreatLevels[i]
            Float days  = _activeThreatDays[i]

            If level >= 50.0 && days >= 7.0 && (days as Int) % 7 == 0
                Debug.Notification("[WARNING] " + _activeThreatNames[i] + " is growing stronger. " + "They've had " + (days as Int) + " days to prepare.")

            ElseIf level >= 80.0 && days >= 20.0
                Debug.Notification("[CRITICAL] " + _activeThreatNames[i] + " has become a major threat! " + "Nearby settlements are in danger.")
                TriggerMajorThreatEvent(i)
            EndIf

            Debug.Trace("[AAI] THREAT_UPDATE|name=" + _activeThreatNames[i] + "|level=" + level + "|days=" + days + "|location=" + _activeThreatLocations[i])
        EndIf
        i += 1
    EndWhile
EndFunction

Function TriggerMajorThreatEvent(Int threatIndex)
    ; A threat that's been ignored too long launches an attack on nearest settlement
    String threatName = _activeThreatNames[threatIndex]
    String locationArg = _activeThreatLocations[threatIndex]

    Debug.Notification("[ATTACK] " + threatName + " is moving on nearby settlements!")
    Debug.Trace("[AAI] MAJOR_THREAT_EVENT|name=" + threatName + "|locationArg=" + locationArg + "|game_time=" + Utility.GetCurrentGameTime())

    ; Alert connected settlements
    Int j = 0
    While j < AllSettlements.Length
        If AllSettlements[j] != None
            ; Reduce settlement morale — they're under threat
            ; (Settlement script handles the actual morale reduction)
            Debug.Trace("[AAI] SETTLEMENT_ALERT|settlement=" + AllSettlements[j].GetName() + "|threat=" + threatName)
        EndIf
        j += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; FACTION POWER SHIFTS
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateFactionPower(Float gameTime)
    ; Factions gain/lose influence based on logged player actions
    ; The actual values come from the bridge via log parsing
    ; This function reads the globals and applies local effects

    Float minutemenPower
    If (gPower_Minutemen != None)
        minutemenPower = gPower_Minutemen.GetValue()
    Else
        minutemenPower = 50.0
    EndIf
    Float bosPower
    If (gPower_BoS       != None)
        bosPower = gPower_BoS.GetValue()
    Else
        bosPower = 50.0
    EndIf

    ; Minutemen losing power: settlements get less help, morale drops
    If minutemenPower < 30.0
        Int j = 0
        While j < AllSettlements.Length
            If AllSettlements[j] != None && AllSettlements[j].IsInScarcity()
                Debug.Trace("[AAI] FACTION_EFFECT|faction=Minutemen|power=" + minutemenPower + "|effect=settlement_neglect|settlement=" + AllSettlements[j].GetName())
            EndIf
            j += 1
        EndWhile
    EndIf

    ; Log for bridge
    Debug.Trace("[AAI] FACTION_STATE|minutemen=" + minutemenPower + "|bos=" + bosPower + "|game_time=" + gameTime)
EndFunction

; External call: player helped a faction
Function PlayerHelpedFaction(String factionName, Float amount, String locationArg, String reason)
    Debug.Trace("[AAI] FACTION_BOOST|faction=" + factionName + "|amount=" + amount + "|locationArg=" + locationArg + "|reason=" + reason + "|game_time=" + Utility.GetCurrentGameTime())
    ; Bridge updates the global power values, which we read next tick
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; RUMOR SPREADING
; ═══════════════════════════════════════════════════════════════════════════
Function RegisterWorldRumor(String rumorText, String originLocation)
    ; Find empty slot
    Int i = 0
    While i < 16
        If _pendingRumors[i] == "" || _pendingRumors[i] == ""
            _pendingRumors[i]         = rumorText
            _rumorBirthTimes[i]       = Utility.GetCurrentGameTime()
            _rumorOriginLocations[i]  = originLocation
            WorldLog("Rumor registered: " + rumorText)
            Debug.Trace("[AAI] RUMOR_BORN|text=" + rumorText + "|origin=" + originLocation + "|game_time=" + Utility.GetCurrentGameTime())
            Return
        EndIf
        i += 1
    EndWhile
EndFunction

Function UpdateRumorSpread(Float gameTime)
    Int i = 0
    While i < 16
        If _pendingRumors[i] != "" && _pendingRumors[i] != ""
            Float daysOld = (gameTime - _rumorBirthTimes[i]) * 24.0

            ; Spread phases: local → regional → Commonwealth-wide → fade
            String spreadState = "unknown"
            If daysOld < 3.0
                spreadState = "local"
            ElseIf daysOld < 7.0
                spreadState = "regional"
            ElseIf daysOld < 14.0
                spreadState = "commonwealth"
            ElseIf daysOld < 30.0
                spreadState = "fading"
            Else
                ; Rumor has faded — clear it
                _pendingRumors[i]        = ""
                _rumorBirthTimes[i]      = 0.0
                _rumorOriginLocations[i] = ""
            EndIf

            If spreadState != "unknown"
                Debug.Trace("[AAI] RUMOR_STATE|text=" + _pendingRumors[i] + "|days_old=" + daysOld + "|spread=" + spreadState + "|origin=" + _rumorOriginLocations[i])
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; MIGRATION EVENTS
; ═══════════════════════════════════════════════════════════════════════════
Function TriggerMigrationCheck()
    ; Seasonal migration events logged for bridge + Mossy display
    String migrationDesc = ""

    If _currentSeason == 2; Fall; Fall; Fall; Fall
        migrationDesc = "Radstag herds moving south. Predator activity near their routes."
    ElseIf _currentSeason == 3; Winter; Winter; Winter; Winter
        migrationDesc = "Deathclaw pairs seeking new territory. Extreme caution near their path."
    ElseIf _currentSeason == 0; Spring; Spring; Spring; Spring
        migrationDesc = "Mirelurk queens relocating to new nesting sites. Coastal areas dangerous."
    EndIf

    If migrationDesc != ""
        Debug.Notification("[Migration] " + migrationDesc)
        Debug.Trace("[AAI] MIGRATION_EVENT|season=" + GetCurrentSeason() + "|description=" + migrationDesc + "|game_time=" + Utility.GetCurrentGameTime())
        RegisterWorldRumor(migrationDesc, "Wasteland")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; PUBLIC API
; ═══════════════════════════════════════════════════════════════════════════
Int    Function GetWorldDay()
    Return _worldDayCount
EndFunction
Int    Function GetSeason()
    Return _currentSeason
EndFunction
String Function GetCurrentSeason()
    Return GetSeasonName(_currentSeason)
EndFunction

; Called by AdvancedWorldMemory when player clears a location
Function OnPlayerClearedLocation(String locationName)
    ResolveThreat(locationName)
    RegisterWorldRumor("The Sole Survivor cleared " + locationName, locationName)
EndFunction

; Called by AdvancedWorldMemory when player kills a named enemy
Function OnPlayerKilledLeader(String leaderName, String locationArg, String factionArg)
    ResolveThreat(leaderName)
    RegisterWorldRumor(leaderName + " of " + factionArg + " was killed near " + locationArg, locationArg)
    PlayerHelpedFaction("Minutemen", 15.0, locationArg, "enemy_leader_killed")
EndFunction

Function WorldLog(String msg)
    Debug.Trace("[AAI-World] " + msg)
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
