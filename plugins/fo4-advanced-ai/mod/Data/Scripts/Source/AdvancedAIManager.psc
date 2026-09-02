; ═══════════════════════════════════════════════════════════════════════════
; AdvancedAIManager.psc
; Fallout 4 Advanced AI System — Core Quest Controller
; Author: POINTYTHRUNDRA654 | Mossy AI Assistant
; Version: 1.0.0
; Nexus: https://www.nexusmods.com/fallout4
;
; Attach this to a Quest (type: General, start game enabled: YES)
; The quest alias "PlayerAlias" must be filled with the player ref.
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AdvancedAIManager extends Quest

; ── MCM / Configuration Properties ─────────────────────────────────────────
bool   Property AAI_Enabled              = True  Auto; Master toggle; Master toggle; Master toggle; Master toggle
bool   Property AAI_CreatureAI           = True  Auto; Enhanced creature behavior; Enhanced creature behavior; Enhanced creature behavior; Enhanced creature behavior
bool   Property AAI_NPCAI               = True  Auto; Enhanced humanoid AI; Enhanced humanoid AI; Enhanced humanoid AI; Enhanced humanoid AI
bool   Property AAI_CompanionAI         = True  Auto; Enhanced companion system; Enhanced companion system; Enhanced companion system; Enhanced companion system
bool   Property AAI_RobotAI             = True  Auto; Enhanced robot behavior; Enhanced robot behavior; Enhanced robot behavior; Enhanced robot behavior
bool   Property AAI_GroupTactics        = True  Auto; Pack / squad coordination; Pack / squad coordination; Pack / squad coordination; Pack / squad coordination
bool   Property AAI_DynamicDifficulty   = True  Auto; Scale AI to player level; Scale AI to player level; Scale AI to player level; Scale AI to player level
bool   Property AAI_DetectionOverhaul   = True  Auto; Enhanced detection radii; Enhanced detection radii; Enhanced detection radii; Enhanced detection radii
bool   Property AAI_CombatStyleOverride = True  Auto; Override vanilla combat styles; Override vanilla combat styles; Override vanilla combat styles; Override vanilla combat styles
bool   Property AAI_Debug               = False Auto; Papyrus log output; Papyrus log output; Papyrus log output; Papyrus log output

; Difficulty scalars (set via MCM)
float Property AAI_AggressionMult  = 1.0 Auto
float Property AAI_ConfidenceMult  = 1.0 Auto
float Property AAI_DetectionMult   = 1.0 Auto
float Property AAI_HealthMult      = 1.0 Auto

; Update interval (seconds of game time)
float Property AAI_UpdateInterval  = 15.0 Auto

; ── ActorValue References (resolved at runtime) ─────────────────────────────
ActorValue Property avAggression   Auto
ActorValue Property avConfidence   Auto
ActorValue Property avEnergy       Auto
ActorValue Property avMorality     Auto
ActorValue Property avMood         Auto
ActorValue Property avAssistance   Auto
ActorValue Property avHealth       Auto

; ── Keyword References ───────────────────────────────────────────────────────
Keyword Property kwdCreature       Auto; ActorTypeCreature; ActorTypeCreature; ActorTypeCreature; ActorTypeCreature
Keyword Property kwdRobot          Auto; ActorTypeRobot; ActorTypeRobot; ActorTypeRobot; ActorTypeRobot
Keyword Property kwdSynth          Auto; ActorTypeSynth; ActorTypeSynth; ActorTypeSynth; ActorTypeSynth
Keyword Property kwdGhoul          Auto; ActorTypeGhoul; ActorTypeGhoul; ActorTypeGhoul; ActorTypeGhoul
Keyword Property kwdSuperMutant    Auto; ActorTypeSuperMutant; ActorTypeSuperMutant; ActorTypeSuperMutant; ActorTypeSuperMutant
Keyword Property kwdCompanionAff   Auto; CompanionAffinity keyword; CompanionAffinity keyword; CompanionAffinity keyword; CompanionAffinity keyword

; ── Internal State ───────────────────────────────────────────────────────────
float _lastUpdateTime
int   _totalOverridden
int   _sessionErrors
bool  _initialized

; ════════════════════════════════════════════════════════════════════════════
; INITIALIZATION
; ════════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    _f4aiTickHours = 1.0
    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerLoadGame")
    ScheduleTick(AAI_UpdateInterval)
    StartTimer(2.0, 1)
EndEvent

Event OnTimer(Int aiTimerID)
    If aiTimerID == 1
        InitializeSystem()
    EndIf
EndEvent

Event Actor.OnPlayerLoadGame(Actor akSender)
    If !_initialized
        InitializeSystem()
    Else
        RefreshActiveActors()
    EndIf
EndEvent

Function InitializeSystem()
    If !AAI_Enabled
        AAI_Log("System disabled via MCM — skipping init")
        Return
    EndIf

    AAI_Log("=== Advanced AI System v1.0.0 Initializing ===")
    _initialized = True
    _totalOverridden = 0
    _sessionErrors = 0

    ; Apply to all currently loaded actors
    RefreshActiveActors()

    AAI_Log("Init complete. Overrode " + _totalOverridden + " actors.")
    Debug.Notification("[Advanced AI] System active — " + _totalOverridden + " actors enhanced")
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; PERIODIC UPDATE
; ════════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If !AAI_Enabled || !_initialized
        ScheduleTick(AAI_UpdateInterval)
        Return
    EndIf

    RefreshActiveActors()
    ScheduleTick(AAI_UpdateInterval)
EndFunction
Function RefreshActiveActors()
    Actor akPlayer = Game.GetPlayer()
    ; Get all actors in a large radius around the player
    Actor[] nearbyActors = MiscUtil.ScanActors(akPlayer, 10000.0, 50)

    Int i = 0
    While i < nearbyActors.Length
        Actor akTarget = nearbyActors[i]
        If akTarget != None && akTarget != akPlayer && !akTarget.IsDead()
            ProcessActor(akTarget)
        EndIf
        i += 1
    EndWhile
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; ACTOR CLASSIFICATION & DISPATCH
; ════════════════════════════════════════════════════════════════════════════
Function ProcessActor(Actor akTarget)
    ; Classify and route to appropriate AI module
    If AAI_CreatureAI && IsCreature(akTarget)
        ApplyCreatureAI(akTarget)
    ElseIf AAI_RobotAI && IsRobot(akTarget)
        ApplyRobotAI(akTarget)
    ElseIf AAI_CompanionAI && IsCompanion(akTarget)
        ApplyCompanionAI(akTarget)
    ElseIf AAI_NPCAI && IsHumanoid(akTarget)
        ApplyHumanoidAI(akTarget)
    EndIf

    ; Dynamic difficulty scaling
    If AAI_DynamicDifficulty
        ScaleActorToPlayer(akTarget)
    EndIf

    _totalOverridden += 1
EndFunction

Function ApplyCreatureAI(Actor akTarget)
    ; Route to creature-specific handler based on race
    If akTarget.HasKeyword(kwdGhoul)
        ApplyGhoulEnhancements(akTarget)
    Else
        ApplyGenericCreatureEnhancements(akTarget)
    EndIf
EndFunction

Function ApplyRobotAI(Actor akTarget)
    ; Robots: Never flee, max confidence, but EMP-aware
    If avConfidence != None
        akTarget.SetValue(avConfidence, 100.0)
    EndIf
    If avAggression != None
        akTarget.SetValue(avAggression, (akTarget.GetBaseValue(avAggression) * AAI_AggressionMult))
    EndIf
    AAI_Log("Robot AI applied: " + akTarget.GetDisplayName())
EndFunction

Function ApplyCompanionAI(Actor akTarget)
    ; Companions: boost assistance and energy, moderate aggression
    If avAssistance != None
        akTarget.SetValue(avAssistance, Math.Min(akTarget.GetBaseValue(avAssistance) * 1.2, 100.0))
    EndIf
    If avEnergy != None
        akTarget.SetValue(avEnergy, Math.Min(akTarget.GetBaseValue(avEnergy) * 1.15, 100.0))
    EndIf
    AAI_Log("Companion AI applied: " + akTarget.GetDisplayName())
EndFunction

Function ApplyHumanoidAI(Actor akTarget)
    ; Humanoids: smarter combat, morale, group coordination
    ApplyDetectionOverhaul(akTarget)
    If AAI_CombatStyleOverride
        ApplyCombatEnhancements(akTarget)
    EndIf
    If AAI_GroupTactics
        RegisterGroupTactics(akTarget)
    EndIf
    AAI_Log("Humanoid AI applied: " + akTarget.GetDisplayName())
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; CREATURE ENHANCEMENTS
; ════════════════════════════════════════════════════════════════════════════
Function ApplyGenericCreatureEnhancements(Actor akTarget)
    ; Creatures: heightened senses, pack aggression, primal confidence
    If avConfidence != None
        Float baseConf = akTarget.GetBaseValue(avConfidence)
        akTarget.SetValue(avConfidence, Math.Min(baseConf * AAI_ConfidenceMult * 1.2, 100.0))
    EndIf
    If avAggression != None
        Float baseAggr = akTarget.GetBaseValue(avAggression)
        akTarget.SetValue(avAggression, Math.Min(baseAggr * AAI_AggressionMult, 100.0))
    EndIf
    If AAI_DetectionOverhaul
        ApplyDetectionOverhaul(akTarget)
    EndIf
EndFunction

Function ApplyGhoulEnhancements(Actor akTarget)
    ; Feral ghouls: frenzied, zero confidence (never flee), maximize energy
    If avConfidence != None
        akTarget.SetValue(avConfidence, 100.0); Never flee; Never flee; Never flee; Never flee
    EndIf
    If avAggression != None
        akTarget.SetValue(avAggression, 100.0); Always attack; Always attack; Always attack; Always attack
    EndIf
    If avEnergy != None
        akTarget.SetValue(avEnergy, Math.Min(akTarget.GetBaseValue(avEnergy) * 1.3, 100.0))
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; DETECTION OVERHAUL
; ════════════════════════════════════════════════════════════════════════════
Function ApplyDetectionOverhaul(Actor akTarget)
    ; Scale detection by AAI_DetectionMult — makes NPCs more/less perceptive
    ; (Sight/Hearing modifiers are applied via ActorValue multipliers)
    ; Note: FO4 uses the Perception stat to scale detection — we boost it slightly
    ActorValue avPerception = Game.GetFormFromFile(0x000002E3, "Fallout4.esm") as ActorValue
    If avPerception != None
        Float curPerc = akTarget.GetBaseValue(avPerception)
        If curPerc > 0
            akTarget.SetValue(avPerception, curPerc * AAI_DetectionMult)
        EndIf
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; COMBAT ENHANCEMENTS
; ════════════════════════════════════════════════════════════════════════════
Function ApplyCombatEnhancements(Actor akTarget)
    ; EvaluatePackage forces the NPC to re-select its best AI package
    akTarget.EvaluatePackage()
    ; Additional combat style overrides would be applied via .esp FormID references
    ; Modders: add CombatStyle property overrides here per actor race/faction
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; GROUP TACTICS
; ════════════════════════════════════════════════════════════════════════════
Function RegisterGroupTactics(Actor akTarget)
    ; When this actor enters combat, nearby allies of the same faction join
    ; This is handled by AdvancedNPCAI.psc attached per-actor
    ; The manager simply ensures EvaluatePackage is called to pick up squad packages
    If akTarget.IsInCombat()
        akTarget.EvaluatePackage()
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; DYNAMIC DIFFICULTY
; ════════════════════════════════════════════════════════════════════════════
Function ScaleActorToPlayer(Actor akTarget)
    Actor akPlayer = Game.GetPlayer()
    Int playerLevel = akPlayer.GetLevel()
    Int actorLevel  = akTarget.GetLevel()

    ; Buff actors that are weaker than the player
    If actorLevel < playerLevel && AAI_HealthMult > 1.0
        ActorValue avHPAV = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
        If avHPAV != None
            Float currentMax = akTarget.GetBaseValue(avHPAV)
            Float scaledMax  = currentMax * AAI_HealthMult * (playerLevel as Float / Math.Max(actorLevel as Float, 1.0))
            akTarget.SetValue(avHPAV, Math.Min(scaledMax, currentMax * 3.0)); cap at 3x; cap at 3x; cap at 3x; cap at 3x
        EndIf
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; CLASSIFICATION HELPERS
; ════════════════════════════════════════════════════════════════════════════
Bool Function IsCreature(Actor akTarget)
    Return kwdCreature != None && akTarget.HasKeyword(kwdCreature) && !akTarget.HasKeyword(kwdRobot) && !akTarget.HasKeyword(kwdSynth)
EndFunction

Bool Function IsRobot(Actor akTarget)
    Return (kwdRobot != None && akTarget.HasKeyword(kwdRobot)) || (kwdSynth != None && akTarget.HasKeyword(kwdSynth))
EndFunction

Bool Function IsCompanion(Actor akTarget)
    Return akTarget.IsPlayerTeammate()
EndFunction

Bool Function IsHumanoid(Actor akTarget)
    Return !IsCreature(akTarget) && !IsRobot(akTarget)
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; MCM CALLBACKS (called by AIConfigMCM.psc)
; ════════════════════════════════════════════════════════════════════════════
Function MCM_SetEnabled(Bool value)
    AAI_Enabled = value
    If value
        InitializeSystem()
        Debug.Notification("[Advanced AI] System enabled")
    Else
        Debug.Notification("[Advanced AI] System disabled")
    EndIf
EndFunction

Function MCM_SetDifficulty(Float aggrMult, Float confMult, Float detMult, Float hpMult)
    AAI_AggressionMult = aggrMult
    AAI_ConfidenceMult = confMult
    AAI_DetectionMult  = detMult
    AAI_HealthMult     = hpMult
    AAI_Log("Difficulty updated — Aggr:" + aggrMult + " Conf:" + confMult + " Det:" + detMult)
    RefreshActiveActors()
EndFunction

Function MCM_ForceRefresh()
    AAI_Log("[Advanced AI] Manual refresh triggered")
    RefreshActiveActors()
    Debug.Notification("[Advanced AI] AI refreshed on " + _totalOverridden + " actors")
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; LOGGING (Mossy Bridge reads these via Papyrus.0.log)
; ════════════════════════════════════════════════════════════════════════════
Function AAI_Log(String msg)
    If AAI_Debug
        Debug.Trace("[AAI] " + msg)
    EndIf
EndFunction

; Public status query — called by Mossy Bridge API
String Function GetStatusReport()
    Return "AAI_STATUS|enabled=" + AAI_Enabled + "|overridden=" + _totalOverridden + "|errors=" + _sessionErrors + "|creatures=" + AAI_CreatureAI + "|npcs=" + AAI_NPCAI + "|robots=" + AAI_RobotAI + "|companions=" + AAI_CompanionAI + "|groupTactics=" + AAI_GroupTactics
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours

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
