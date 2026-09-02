; ═══════════════════════════════════════════════════════════════════════════
; AdvancedWorldMemory.psc
; Advanced AI System — World State Tracker
;
; Monitors player actions and logs world events to the Mossy Bridge.
; Also handles personality drift, combat pattern tracking, and reputation.
;
; The bridge reads these tagged log lines and stores them in the external DB.
; Attach to the AdvancedAIManager quest.
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AdvancedWorldMemory extends Quest

Quest Property AAIQuest Auto

; ── Faction References (fill in CK) ───────────────────────────────────────────
Faction Property factionMinutemen Auto
Faction Property factionBoS       Auto
Faction Property factionRailroad  Auto
Faction Property factionInstitute Auto
Faction Property factionRaiders   Auto
Faction Property factionGunners   Auto

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property TrackCombatPatterns  = True  Auto
bool  Property TrackReputation      = True  Auto
bool  Property TrackPersonalityDrift = True Auto
bool  Property GenerateLore         = True  Auto
bool Property _debugMode                = False Auto

; ── Playthrough ID ─────────────────────────────────────────────────────────────
; A unique string per save. Set on first load, persists via GlobalVariable
GlobalVariable Property gPlaythroughID Auto

; ── State ─────────────────────────────────────────────────────────────────────
String _playthroughID
int    _combatCount
int    _killCount
int    _locationCount
float  _lastCombatTime

; Combat tracking (reset each fight)
bool   _usedStealth
bool   _usedVATS
bool   _usedCover
String _weaponCategory

; ════════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    ; Generate or restore playthrough ID
    If gPlaythroughID != None && gPlaythroughID.GetValue() > 0
        _playthroughID = "PT_" + (gPlaythroughID.GetValue() as Int)
    Else
        _playthroughID = "PT_" + (Utility.GetCurrentGameTime() as Int)
        If gPlaythroughID != None
            gPlaythroughID.SetValue(Utility.GetCurrentGameTime())
        EndIf
    EndIf

    _weaponCategory = "rifle"
    _f4aiTickHours  = 1.0

    Actor player = Game.GetPlayer()
    RegisterForRemoteEvent(player, "OnPlayerLoadGame")
    RegisterForRemoteEvent(player, "OnCombatStateChanged")
    RegisterForRemoteEvent(player, "OnLocationChange")
    ; player level-ups detected by polling in OnTimerGameTime (FO4 has no OnLevelUp event)
    RegisterForRemoteEvent(player, "OnItemEquipped")
    RegisterForRemoteEvent(player, "OnEnterSneaking")
    RegisterForCameraState(); F4SE — VATS detected via camera state 2
    ScheduleTick(6.0); Periodic reputation decay notification; Periodic reputation decay notification; Periodic reputation decay notification; Periodic reputation decay notification

    WorldLog("World Memory initialized | playthrough=" + _playthroughID)
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; PLAYER EVENTS
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnCombatStateChanged(Actor akSender, Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
        ; Combat started
        _usedStealth   = False
        _usedVATS      = False
        _usedCover     = False
        _lastCombatTime = Utility.GetCurrentGameTime()
    ElseIf aeCombatState == 0
        ; Combat ended — record pattern
        If TrackCombatPatterns
            RecordCombatPattern()
        EndIf
    EndIf
EndEvent

Event Actor.OnEnterSneaking(Actor akSender)
    _usedStealth = True
EndEvent

Event OnPlayerCameraState(Int aiOldState, Int aiNewState)
    If aiNewState == 2; VATS camera
        _usedVATS = True
    EndIf
EndEvent

Event Actor.OnItemEquipped(Actor akSender, Form akBaseObject, ObjectReference akReference)
    If akSender == Game.GetPlayer()
        _weaponCategory = ClassifyWeapon(akBaseObject)
    EndIf
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    If akNewLoc == None
        Return
    EndIf

    String locName = akNewLoc.GetName()
    _locationCount += 1

    ; Log world event — player entered location
    WorldLog("WORLD_EVENT|type=entered_location|subject=Player|location=" + locName + "|game_time=" + Utility.GetCurrentGameTime())

    ; Check if this is a notable location worth archiving as lore
    If GenerateLore && IsNotableLocation(akNewLoc)
        WorldLog("LORE_EVENT|playthrough=" + _playthroughID + "|type=location_visit|location=" + locName + "|significance=0.4")
    EndIf
EndEvent

Function PlayerLeveledUp(Int aiNewLevel)
    Int level = aiNewLevel
    WorldLog("WORLD_EVENT|type=player_level_up|subject=Player|level=" + level + "|game_time=" + Utility.GetCurrentGameTime())

    ; Reputation boost with nearby friendly faction on level-up
    ; (Shows the player is growing in capability — factions notice)
    If TrackReputation
        Location lvlLoc = Game.GetPlayer().GetCurrentLocation()
        String lvlLocName = ""
        If lvlLoc != None
            lvlLocName = lvlLoc.GetName()
        EndIf
        LogReputationEvent("Minutemen", 10.0, "PlayerLevelUp", lvlLocName)
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; COMBAT PATTERN RECORDING
; ════════════════════════════════════════════════════════════════════════════
Function RecordCombatPattern()
    String approach = "balanced"
    If _usedStealth
        approach = "stealth"
    ElseIf _usedVATS
        approach = "vats"
    ElseIf _usedCover
        approach = "cover"
    EndIf

    ; Classify location type
    Location curLoc = Game.GetPlayer().GetCurrentLocation()
    String locType = "outdoor"
    If curLoc != None
        String locName = curLoc.GetName()
        If StringUtil.Find(locName, "Building") >= 0 || StringUtil.Find(locName, "Vault") >= 0 || StringUtil.Find(locName, "Factory") >= 0 || StringUtil.Find(locName, "Station") >= 0
            locType = "indoor"
        ElseIf StringUtil.Find(locName, "City") >= 0 || StringUtil.Find(locName, "Settlement") >= 0
            locType = "settlement"
        EndIf
    EndIf

    WorldLog("COMBAT_PATTERN|weapon=" + _weaponCategory + "|approach=" + approach + "|vats=" + _usedVATS + "|stealth=" + _usedStealth + "|cover=" + _usedCover + "|loc_type=" + locType + "|game_time=" + Utility.GetCurrentGameTime())

    _combatCount += 1

    ; Reset combat flags
    _usedStealth = False
    _usedVATS    = False
    _usedCover   = False
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; REPUTATION LOGGING
; ════════════════════════════════════════════════════════════════════════════
Function LogReputationEvent(String factionArg, Float delta, String reason, String locationArg)
    If !TrackReputation
        Return
    EndIf
    WorldLog("REP_EVENT|factionArg=" + factionArg + "|delta=" + delta + "|reason=" + reason + "|locationArg=" + locationArg + "|game_time=" + Utility.GetCurrentGameTime())
EndFunction

; Call these from other scripts when the player does faction-affecting things
Function PlayerHelpedFaction(String factionName, Float amount, String reason)
    Location fhLoc = Game.GetPlayer().GetCurrentLocation()
    String fhLocName = ""
    If fhLoc != None
        fhLocName = fhLoc.GetName()
    EndIf
    LogReputationEvent(factionName, amount, reason, fhLocName)
EndFunction

Function PlayerHarmedFaction(String factionName, Float amount, String reason)
    Location hmLoc = Game.GetPlayer().GetCurrentLocation()
    String hmLocName = ""
    If hmLoc != None
        hmLocName = hmLoc.GetName()
    EndIf
    LogReputationEvent(factionName, -amount, reason, hmLocName)
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; PERSONALITY DRIFT LOGGING
; ════════════════════════════════════════════════════════════════════════════
Function LogPersonalityDrift(String npcId, String npcName, Float aggrDelta, Float moralDelta, Float loyalDelta, Float trustDelta, String reason)
    If !TrackPersonalityDrift
        Return
    EndIf
    WorldLog("PERSONALITY_DRIFT|npc_id=" + npcId + "|npc_name=" + npcName + "|aggr=" + aggrDelta + "|moral=" + moralDelta + "|loyal=" + loyalDelta + "|trust=" + trustDelta + "|reason=" + reason)
EndFunction

; Example: companion drift when player does something immoral
Function CompanionWitnessedImmoral(Actor companion, String eventDesc)
    LogPersonalityDrift( ("" + companion.GetActorBase().GetFormID()), companion.GetDisplayName(), 0.02, -0.05, -0.03, -0.08, "witnessed_immoral_act: " + eventDesc )
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; WORLD EVENT LOGGING
; ════════════════════════════════════════════════════════════════════════════
Function LogWorldEvent(String eventType, String subject, String locationArg, String factionArg)
    WorldLog("WORLD_EVENT|type=" + eventType + "|subject=" + subject + "|locationArg=" + locationArg + "|factionArg=" + factionArg + "|game_time=" + Utility.GetCurrentGameTime())

    ; Lore generation for significant events
    If GenerateLore && IsSignificantEvent(eventType)
        WorldLog("LORE_EVENT|playthrough=" + _playthroughID + "|type=" + eventType + "|subject=" + subject + "|locationArg=" + locationArg + "|significance=0.75")
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; PERIODIC — Reputation decay notification
; ════════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    ; Tell the bridge that time has passed so it can apply rep decay
    WorldLog("TIME_TICK|game_time=" + Utility.GetCurrentGameTime())
    ScheduleTick(6.0)
EndFunction
; ════════════════════════════════════════════════════════════════════════════
; HELPERS
; ════════════════════════════════════════════════════════════════════════════
String Function ClassifyWeapon(Form item)
    If item == None
        Return "unarmed"
    EndIf
    String name = item.GetName()
    If StringUtil.Find(name, "Rifle") >= 0 || StringUtil.Find(name, "Laser") >= 0 || StringUtil.Find(name, "Plasma") >= 0
        Return "rifle"
    ElseIf StringUtil.Find(name, "Pistol") >= 0 || StringUtil.Find(name, "10mm") >= 0
        Return "pistol"
    ElseIf StringUtil.Find(name, "Shotgun") >= 0
        Return "shotgun"
    ElseIf StringUtil.Find(name, "Sniper") >= 0 || StringUtil.Find(name, ".50") >= 0
        Return "sniper"
    ElseIf StringUtil.Find(name, "Pipe") >= 0 || StringUtil.Find(name, "Minigun") >= 0
        Return "heavy"
    ElseIf StringUtil.Find(name, "Grenade") >= 0 || StringUtil.Find(name, "Mine") >= 0 || StringUtil.Find(name, "Fatman") >= 0
        Return "explosives"
    ElseIf StringUtil.Find(name, "Knife") >= 0 || StringUtil.Find(name, "Bat") >= 0 || StringUtil.Find(name, "Machete") >= 0
        Return "melee"
    EndIf
    Return "rifle"
EndFunction

Bool Function IsNotableLocation(Location loc)
    If loc == None
        Return False
    EndIf
    String name = loc.GetName()
    Return StringUtil.Find(name, "Diamond City") >= 0 || StringUtil.Find(name, "Vault") >= 0 || StringUtil.Find(name, "Prydwen") >= 0 || StringUtil.Find(name, "Institute") >= 0 || StringUtil.Find(name, "Goodneighbor") >= 0 || StringUtil.Find(name, "Castle") >= 0
EndFunction

Bool Function IsSignificantEvent(String eventType)
    Return eventType == "cleared_location" || eventType == "killed_boss" || eventType == "joined_faction"   || eventType == "completed_quest" || eventType == "found_artifact"   || eventType == "defeated_legend"
EndFunction

Function WorldLog(String msg)
    Debug.Trace("[AAI] " + msg)
    If _debugMode
        Debug.Notification("[AAI-World] " + msg)
    EndIf
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours
Int _f4aiLastPlayerLevel

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        Int lvlNow = Game.GetPlayer().GetLevel()
        If _f4aiLastPlayerLevel > 0 && lvlNow > _f4aiLastPlayerLevel
            PlayerLeveledUp(lvlNow)
        EndIf
        _f4aiLastPlayerLevel = lvlNow
        DoGameTimeTick()
    EndIf
EndEvent
