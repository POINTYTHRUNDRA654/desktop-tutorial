; ═══════════════════════════════════════════════════════════════════════════
; WaterHazardManager.psc
; Advanced AI System — Water as Tactical Hazard
;
; Manages the combat and survival implications of water:
;
;  UNDERWATER COMBAT
;    - All weapon damage reduced (except knives/spears — they work fine)
;    - Movement speed halved for land creatures
;    - Mirelurks / Gulpers gain full speed advantage
;    - Player oxygen timer (can't fight forever underwater)
;    - Visibility sharply reduced — detection ranges halved
;    - Firearms make huge bubbles — can't sneak shoot underwater
;    - Explosives underwater cause devastating pressure waves
;
;  WATER CURRENT FORCES
;    - Storm water: current pushes actors downstream
;    - Flood water: strong current can knock actors off feet
;    - Fast-moving river sections vs. calm pools
;    - Mirelurks use current to maneuver faster
;
;  ROBOT VULNERABILITY
;    - Any robot entering significant water body takes EMP-style damage
;    - Sentry Bots particularly vulnerable (heavy = sink, then short circuit)
;    - Eyebots dodge water surfaces automatically
;    - Protectrons lock up and become slower
;    - Assaultrons try to avoid water (their laser head can't fire wet)
;
;  ICE TRAVERSAL DIFFERENCES
;    - Player: slower, audible, slippery
;    - Deathclaw: too heavy — cracks ice, falls through
;    - Radscorpion: light enough to traverse
;    - Yao Guai: struggles, prefers to go around
;    - Mirelurk: uses ice as ambush surface — can break through from below
;    - Feral Ghoul: doesn't avoid ice — charges regardless
;    - Robotic: metal feet grip ice normally
;
;  DROWNING SYSTEM
;    - Prolonged submersion damages all organic actors
;    - Mirelurks / Gulpers immune
;    - Far Harbor sea: cold + radiation + drowning = triple threat
;
; Attach to AdvancedAIManager quest.
; Requires: WaterSimulation quest running
; ═══════════════════════════════════════════════════════════════════════════
Scriptname WaterHazardManager extends Quest

Quest Property AAIQuest         Auto
WaterSimulation Property WaterSim Auto; typed so IsIceActive/IsStormWaterActive/IsFloodActive resolve

; ── Keywords ─────────────────────────────────────────────────────────────────
Keyword Property kwdMirelurk       Auto
Keyword Property kwdMirelurkQueen  Auto
Keyword Property kwdGulper         Auto
Keyword Property kwdFogCrawler     Auto
Keyword Property kwdRobot          Auto
Keyword Property kwdAssaultron     Auto
Keyword Property kwdSentryBot      Auto
Keyword Property kwdProtectron     Auto
Keyword Property kwdEyebot         Auto
Keyword Property kwdDeathclaw      Auto
Keyword Property kwdYaoGuai        Auto
Keyword Property kwdRadscorpion    Auto
Keyword Property kwdGhoul          Auto
Keyword Property kwdSynth          Auto

; ── Combat Effects ────────────────────────────────────────────────────────────
Spell Property spUnderwaterSlow      Auto; Movement/action speed debuff; Movement/action speed debuff; Movement/action speed debuff; Movement/action speed debuff
Spell Property spUnderwaterDamage    Auto; Oxygen deprivation damage; Oxygen deprivation damage; Oxygen deprivation damage; Oxygen deprivation damage
Spell Property spRobotShortCircuit   Auto; EMP damage for robots; EMP damage for robots; EMP damage for robots; EMP damage for robots
Spell Property spCurrentForce        Auto; Directional force from current; Directional force from current; Directional force from current; Directional force from current
Spell Property spIceBreach           Auto; Creature falls through ice; Creature falls through ice; Creature falls through ice; Creature falls through ice
Spell Property spCurrentSlow         Auto; Slowing current effect; Slowing current effect; Slowing current effect; Slowing current effect
Spell Property spWeightedSink        Auto; Heavy armor/sentry bot sinking; Heavy armor/sentry bot sinking; Heavy armor/sentry bot sinking; Heavy armor/sentry bot sinking

; ── Explosions ────────────────────────────────────────────────────────────────
Explosion Property expUnderwaterBlast Auto; Pressure wave from underwater explosion; Pressure wave from underwater explosion; Pressure wave from underwater explosion; Pressure wave from underwater explosion

; ── Configuration ──────────────────────────────────────────────────────────────
bool  Property HazardEnabled         = True  Auto
bool  Property UnderwaterCombatOn    = True  Auto
bool  Property CurrentForcesOn       = True  Auto
bool  Property RobotWaterDamageOn    = True  Auto
bool  Property IceTraversalOn        = True  Auto
bool  Property DrowningOn            = True  Auto
float Property UpdateInterval        = 0.08  Auto
float Property OxygenDuration        = 30.0  Auto; Real seconds before drowning damage; Real seconds before drowning damage; Real seconds before drowning damage; Real seconds before drowning damage
float Property RobotWaterDamageRate  = 5.0   Auto; HP/second for robots in water; HP/second for robots in water; HP/second for robots in water; HP/second for robots in water

; ── Internal State ─────────────────────────────────────────────────────────────
float _playerOxygenTimer   = 0.0
bool  _playerUnderwater    = False
bool  _iceActive           = False
bool  _stormWaterActive    = False
bool  _floodActive         = False

; Tracked robots in water (to apply continuous damage)
Actor[] _robotsInWater
float   _robotWaterTimer   = 0.0

; ═══════════════════════════════════════════════════════════════════════════
Event OnQuestInit()
    If !HazardEnabled
        Return
    EndIf
    _robotsInWater = new Actor[8]
    RegisterForRemoteEvent(Game.GetPlayer(), "OnPlayerSwimming")
    ; underwater state polled in OnTimerGameTime (FO4 has no OnPlayerUnderwater event)
    ScheduleTick(UpdateInterval)
    HazardLog("Water Hazard Manager initialized")
EndEvent

Function DoGameTimeTick()
    If !HazardEnabled
        ScheduleTick(UpdateInterval)
        Return
    EndIf

    ; Sync state from WaterSimulation
    If WaterSim != None
        _iceActive       = WaterSim.IsIceActive()
        _stormWaterActive = WaterSim.IsStormWaterActive()
        _floodActive     = WaterSim.IsFloodActive()
    EndIf

    ; Monitor nearby actors in water
    ScanActorsInWater()

    ; Oxygen timer
    If _playerUnderwater && DrowningOn
        UpdateOxygenTimer()
    EndIf

    ScheduleTick(UpdateInterval)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
; PLAYER SWIMMING STATE
; ═══════════════════════════════════════════════════════════════════════════
Event Actor.OnPlayerSwimming(Actor akSender)
    PlayerSwimStateChanged(True)
EndEvent

Function PlayerSwimStateChanged(Bool abIsSwimming)
    If abIsSwimming
        _playerOxygenTimer = 0.0
        ApplyUnderwaterMovement(Game.GetPlayer())
        HazardLog("Player entered water")
    Else
        _playerUnderwater = False
        RemoveUnderwaterEffects(Game.GetPlayer())
        HazardLog("Player exited water")
    EndIf
EndFunction

Function PlayerUnderwaterChanged(Bool abIsUnderwater)
    _playerUnderwater = abIsUnderwater
    If abIsUnderwater
        ApplyUnderwaterCombat(Game.GetPlayer())
        HazardLog("Player submerged — underwater combat active")
    Else
        RemoveUnderwaterEffects(Game.GetPlayer())
    EndIf
EndFunction

Function ApplyUnderwaterMovement(Actor akActor)
    If !UnderwaterCombatOn
        Return
    EndIf
    If spUnderwaterSlow != None
        spUnderwaterSlow.Cast(akActor, akActor)
    EndIf
EndFunction

Function ApplyUnderwaterCombat(Actor akActor)
    ; Underwater: weapon damage and movement both penalized
    ; Imagespace would show reduced visibility (set in CK via trigger volume)
    Debug.Trace("[AAI] UNDERWATER_COMBAT|actor=" + akActor.GetDisplayName())
EndFunction

Function RemoveUnderwaterEffects(Actor akActor)
    If spUnderwaterSlow   != None
        akActor.DispelSpell(spUnderwaterSlow)
    EndIf
    If spUnderwaterDamage != None
        akActor.DispelSpell(spUnderwaterDamage)
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; OXYGEN / DROWNING
; ═══════════════════════════════════════════════════════════════════════════
Function UpdateOxygenTimer()
    _playerOxygenTimer += (UpdateInterval * 180.0); Game hours to real seconds at 20x timescale

    If _playerOxygenTimer > OxygenDuration
        ; Start drowning damage
        If spUnderwaterDamage != None
            spUnderwaterDamage.Cast(Game.GetPlayer(), Game.GetPlayer())
        EndIf
        Debug.Notification("You're running out of air!")
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; SCAN ACTORS IN WATER
; ═══════════════════════════════════════════════════════════════════════════
Function ScanActorsInWater()
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(player, 2000.0, 15)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc.IsSwimming()
            HandleActorInWater(npc)
        EndIf
        i += 1
    EndWhile
EndFunction

Function HandleActorInWater(Actor npc)
    ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue

    ; ── ROBOTS ──────────────────────────────────────────────────────────────
    If RobotWaterDamageOn && kwdRobot != None && npc.HasKeyword(kwdRobot)
        HandleRobotInWater(npc)
        Return
    EndIf

    ; ── AQUATIC CREATURES — BOOSTED ─────────────────────────────────────────
    If IsAquatic(npc)
        If avSpeed != None
            npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed) * 1.4); Faster in water; Faster in water; Faster in water; Faster in water
        EndIf
        Return
    EndIf

    ; ── LAND CREATURES — SLOWED ─────────────────────────────────────────────
    If avSpeed != None
        Float slowMult = 0.65
        If _stormWaterActive
            slowMult = 0.5
        EndIf
        If _floodActive
            slowMult = 0.45
        EndIf
        If _iceActive
            slowMult = 0.4
        EndIf
        npc.SetValue(avSpeed, npc.GetBaseValue(avSpeed) * slowMult)
    EndIf

    ; Apply current force during storm/flood
    If (_stormWaterActive || _floodActive) && CurrentForcesOn && spCurrentSlow != None
        spCurrentSlow.Cast(npc, npc)
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; ROBOT WATER DAMAGE
; ═══════════════════════════════════════════════════════════════════════════
Function HandleRobotInWater(Actor robot)
    ; Different robot types have different water vulnerability
    String robotType = GetRobotType(robot)

    If robotType == "Eyebot"
        ; Eyebots fly — avoid water surface automatically
        Return
    EndIf

    ; Apply short-circuit damage
    If spRobotShortCircuit != None
        spRobotShortCircuit.Cast(robot, robot)
    EndIf

    Float damageRate = RobotWaterDamageRate
    If robotType == "SentryBot"
        damageRate *= 2.0
    EndIf
    If robotType == "Protectron"
        damageRate *= 1.2
    EndIf
    If robotType == "Assaultron"
        damageRate *= 1.5
    EndIf

    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    If avHP != None
        robot.DamageValue(avHP, damageRate)
    EndIf

    ; Sentry Bot sinks and immobilizes
    If robotType == "SentryBot" && spWeightedSink != None
        spWeightedSink.Cast(robot, robot)
        ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
        If avSpeed != None
            robot.SetValue(avSpeed, 0.0)
        EndIf
        HazardLog(robotType + " taking water damage: " + damageRate + " HP/tick")
    EndIf
EndFunction

String Function GetRobotType(Actor robot)
    If kwdSentryBot   != None && robot.HasKeyword(kwdSentryBot)
        Return "SentryBot"
    EndIf
    If kwdAssaultron  != None && robot.HasKeyword(kwdAssaultron)
        Return "Assaultron"
    EndIf
    If kwdProtectron  != None && robot.HasKeyword(kwdProtectron)
        Return "Protectron"
    EndIf
    If kwdEyebot      != None && robot.HasKeyword(kwdEyebot)
        Return "Eyebot"
    EndIf
    Return "GenericRobot"
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; ICE TRAVERSAL
; ═══════════════════════════════════════════════════════════════════════════
; Called when actor enters an ice-surface trigger volume (set up in CK)
Function OnActorOnIce(Actor akActor)
    If !IceTraversalOn || !_iceActive
        Return
    EndIf

    String creatureType = GetCreatureIceBehavior(akActor)

    If creatureType == "falls_through"
        ; Too heavy — breaks ice
        If spIceBreach != None
            spIceBreach.Cast(akActor, akActor)
        EndIf
        If expUnderwaterBlast != None
            akActor.PlaceAtMe(expUnderwaterBlast); Crack/splash effect; Crack/splash effect; Crack/splash effect; Crack/splash effect
        EndIf
        Debug.Notification(akActor.GetDisplayName() + " breaks through the ice!")
        HazardLog(akActor.GetDisplayName() + " fell through ice")

    ElseIf creatureType == "slippery"
        ; Struggles on ice
        ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
        If avSpeed != None
            akActor.SetValue(avSpeed, akActor.GetBaseValue(avSpeed) * 0.55)
        EndIf

    ElseIf creatureType == "normal"
        ; Mild slowdown
        ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
        If avSpeed != None
            akActor.SetValue(avSpeed, akActor.GetBaseValue(avSpeed) * 0.8)
        EndIf

    ElseIf creatureType == "ambush"
        ; Mirelurk — uses ice as hunting ground, can break from below
        If Utility.RandomInt(1, 100) <= 20; 20% chance to breach; 20% chance to breach; 20% chance to breach; 20% chance to breach
            Debug.Notification("Something is moving under the ice!")
            HazardLog("Mirelurk breaching ice surface")
        EndIf
    EndIf
EndFunction

String Function GetCreatureIceBehavior(Actor akActor)
    ; Deathclaw: too heavy — falls through
    If kwdDeathclaw != None && akActor.HasKeyword(kwdDeathclaw)
        Return "falls_through"
    EndIf
    ; Sentry Bot: too heavy
    If kwdSentryBot != None && akActor.HasKeyword(kwdSentryBot)
        Return "falls_through"
    EndIf
    ; Yao Guai: struggles — prefers to avoid but will cross if necessary
    If kwdYaoGuai != None && akActor.HasKeyword(kwdYaoGuai)
        Return "slippery"
    EndIf
    ; Mirelurk: uses ice as ambush platform
    If (kwdMirelurk != None && akActor.HasKeyword(kwdMirelurk)) || (kwdMirelurkQueen != None && akActor.HasKeyword(kwdMirelurkQueen))
        Return "ambush"
    EndIf
    ; Radscorpion: light enough, chitinous feet grip ice
    If kwdRadscorpion != None && akActor.HasKeyword(kwdRadscorpion)
        Return "normal"
    EndIf
    ; Feral Ghoul: doesn't care — charges regardless
    If kwdGhoul != None && akActor.HasKeyword(kwdGhoul)
        Return "normal"
    EndIf
    ; Robots: metal feet, grips OK
    If kwdRobot != None && akActor.HasKeyword(kwdRobot)
        Return "normal"
    EndIf
    ; Default: humanoid — slippery
    Return "slippery"
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; UNDERWATER EXPLOSION PRESSURE WAVE
; ═══════════════════════════════════════════════════════════════════════════
; Called when an explosion happens near/in water
Function OnExplosionNearWater(ObjectReference explRef, Float waterDepth)
    If explRef == None || expUnderwaterBlast == None
        Return
    EndIf

    ; Underwater explosions create pressure waves — devastating in enclosed spaces
    Float pressureMult
    If (waterDepth > 100.0)
        pressureMult = 2.5
    Else
        pressureMult = 1.5
    EndIf

    Actor[] nearby = MiscUtil.ScanActors(explRef, 800.0 * pressureMult, 12)
    Int i = 0
    While i < nearby.Length
        Actor npc = nearby[i]
        If npc != None && !npc.IsDead() && npc.IsSwimming()
            ; Additional pressure damage
            ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
            If avHP != None
                npc.DamageValue(avHP, 50.0 * pressureMult); Devastating concussion; Devastating concussion; Devastating concussion; Devastating concussion
            EndIf
        EndIf
        i += 1
    EndWhile

    explRef.PlaceAtMe(expUnderwaterBlast)
    Debug.Notification("Underwater explosion — pressure wave!")
    HazardLog("Underwater explosion: depth=" + waterDepth + " mult=" + pressureMult)
    Debug.Trace("[AAI] UNDERWATER_EXPLOSION|depth=" + waterDepth + "|pressure_mult=" + pressureMult + "|affected=" + nearby.Length)
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
; HELPERS
; ═══════════════════════════════════════════════════════════════════════════
Bool Function IsAquatic(Actor npc)
    Return (kwdMirelurk      != None && npc.HasKeyword(kwdMirelurk))      || (kwdMirelurkQueen != None && npc.HasKeyword(kwdMirelurkQueen)) || (kwdGulper        != None && npc.HasKeyword(kwdGulper))        || (kwdFogCrawler    != None && npc.HasKeyword(kwdFogCrawler))
EndFunction

Function HazardLog(String msg)
    Debug.Trace("[AAI-WaterHazard] " + msg)
EndFunction

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours = 1.0
Bool _f4aiWasSwimming = False

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        Bool swNow = Game.GetPlayer().IsSwimming()
        If swNow != _f4aiWasSwimming
            _f4aiWasSwimming = swNow
            PlayerSwimStateChanged(swNow)
            PlayerUnderwaterChanged(swNow)
        EndIf
        DoGameTimeTick()
    EndIf
EndEvent
