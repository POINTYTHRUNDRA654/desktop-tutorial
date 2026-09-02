; ═══════════════════════════════════════════════════════════════════════════
; AdvancedCreatureAI.psc
; Advanced AI System — Creature Behavior Enhancement
; Attach to an ActorAlias filled with creature refs, or use ObjectReference
; Requires: AdvancedAIManager quest to be running
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AdvancedCreatureAI extends ReferenceAlias

; ── Manager Reference ────────────────────────────────────────────────────────
Quest        Property AAIQuest           Auto; The AdvancedAIManager quest; The AdvancedAIManager quest; The AdvancedAIManager quest; The AdvancedAIManager quest
Keyword      Property kwdPackBehavior    Auto; Custom keyword: AAI_PackBehavior; Custom keyword: AAI_PackBehavior; Custom keyword: AAI_PackBehavior; Custom keyword: AAI_PackBehavior
Keyword      Property kwdAmbushReady     Auto; Custom keyword: AAI_AmbushReady; Custom keyword: AAI_AmbushReady; Custom keyword: AAI_AmbushReady; Custom keyword: AAI_AmbushReady
Keyword      Property kwdApexPredator    Auto; Custom keyword: AAI_ApexPredator (Deathclaw etc.); Custom keyword: AAI_ApexPredator (Deathclaw etc.); Custom keyword: AAI_ApexPredator (Deathclaw etc.); Custom keyword: AAI_ApexPredator (Deathclaw etc.)
CombatStyle  Property csBerserker        Auto; Override for apex predators; Override for apex predators; Override for apex predators; Override for apex predators
CombatStyle  Property csPackHunter       Auto; Override for pack creatures; Override for pack creatures; Override for pack creatures; Override for pack creatures
CombatStyle  Property csAmbusher         Auto; Override for ambush creatures; Override for ambush creatures; Override for ambush creatures; Override for ambush creatures

; ── Behavior Properties ──────────────────────────────────────────────────────
float Property PackAlertRadius   = 1500.0 Auto; Alert pack within this radius; Alert pack within this radius; Alert pack within this radius; Alert pack within this radius
float Property AmbushTriggerDist = 600.0  Auto; Reveal ambush at this distance; Reveal ambush at this distance; Reveal ambush at this distance; Reveal ambush at this distance
bool  Property EnrageBelowHP     = True   Auto; Rage stateVal at low HP; Rage stateVal at low HP; Rage stateVal at low HP; Rage stateVal at low HP
float Property EnrageThreshold   = 0.25   Auto; HP fraction for enrage; HP fraction for enrage; HP fraction for enrage; HP fraction for enrage

; ── State ─────────────────────────────────────────────────────────────────────
bool _isEnraged
bool _ambushArmed
Actor _actor

; ════════════════════════════════════════════════════════════════════════════
; INIT
; ════════════════════════════════════════════════════════════════════════════
Event OnAliasInit()
    _actor = GetActorReference() as Actor
    If _actor == None
        Return
    EndIf

    ; Arm ambush if flagged
    If kwdAmbushReady != None && _actor.HasKeyword(kwdAmbushReady)
        ArmAmbush()
    EndIf

    _f4aiTickHours = 1.0

    RegisterForRemoteEvent(_actor, "OnCombatStateChanged")
    RegisterForHitEvent(_actor)
    RegisterForRemoteEvent(_actor, "OnDeath")
    RegisterForRemoteEvent(_actor, "OnLoad")

    ; Override combat style for apex predators
    If kwdApexPredator != None && _actor.HasKeyword(kwdApexPredator) && csBerserker != None
        _actor.SetCombatStyle(csBerserker)
    ElseIf kwdPackBehavior != None && _actor.HasKeyword(kwdPackBehavior) && csPackHunter != None
        _actor.SetCombatStyle(csPackHunter)
    EndIf
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; AMBUSH SYSTEM
; ════════════════════════════════════════════════════════════════════════════
Function ArmAmbush()
    _ambushArmed = True
    _actor.SetRestrained(True); Hold position until triggered; Hold position until triggered; Hold position until triggered; Hold position until triggered
    ScheduleTick(0.05); Check player distance every ~3 in-game minutes; Check player distance every ~3 in-game minutes; Check player distance every ~3 in-game minutes; Check player distance every ~3 in-game minutes
EndFunction

Function DoGameTimeTick()
    If _ambushArmed && Self != None && !_actor.IsDead()
        Actor player = Game.GetPlayer()
        If player != None && _actor.GetDistance(player) <= AmbushTriggerDist
            TriggerAmbush(player)
        EndIf
        ScheduleTick(0.05)
    EndIf
EndFunction
Function TriggerAmbush(Actor akTarget)
    _ambushArmed = False
    _actor.SetRestrained(False)
    _actor.StartCombat(akTarget)

    ; Alert nearby pack members
    If kwdPackBehavior != None && _actor.HasKeyword(kwdPackBehavior)
        AlertPack(akTarget)
    EndIf

    Debug.Trace("[AAI-Creature] Ambush triggered: " + _actor.GetDisplayName())
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; COMBAT EVENTS
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnCombatStateChanged(Actor akSender, Actor akTarget, Int aeCombatState)
    If aeCombatState == 1; Combat entered; Combat entered; Combat entered; Combat entered
        ; Alert pack members
        If kwdPackBehavior != None && _actor.HasKeyword(kwdPackBehavior)
            AlertPack(akSender.GetCombatTarget() as Actor)
        EndIf
    ElseIf aeCombatState == 0; Combat exited; Combat exited; Combat exited; Combat exited
        _isEnraged = False
    EndIf
EndEvent

Event OnHit(ObjectReference akTarget, ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked, String apMaterial)
    RegisterForHitEvent(_actor); hit events are single-shot in FO4 — re-arm immediately
    If EnrageBelowHP && !_isEnraged && Self != None
        CheckEnrageCondition()
    EndIf
EndEvent

Function CheckEnrageCondition()
    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    If avHP == None
        Return
    EndIf
    Float maxHP = _actor.GetBaseValue(avHP)
    Float curHP = _actor.GetValue(avHP)
    If maxHP > 0 && (curHP / maxHP) <= EnrageThreshold
        TriggerEnrage()
    EndIf
EndFunction

Function TriggerEnrage()
    _isEnraged = True

    ; Boost aggression and speed for the enrage state
    ActorValue avAggr  = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
    ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue

    If avAggr != None
        _actor.SetValue(avAggr, 100.0)
    EndIf
    If avSpeed != None
        Float baseSpeed = _actor.GetBaseValue(avSpeed)
        _actor.SetValue(avSpeed, baseSpeed * 1.25); 25% speed boost when enraged; 25% speed boost when enraged; 25% speed boost when enraged; 25% speed boost when enraged
    EndIf

    _actor.EvaluatePackage()
    Debug.Trace("[AAI-Creature] ENRAGE: " + _actor.GetDisplayName())

    ; If this is an apex predator, play a berserk behavior
    If kwdApexPredator != None && _actor.HasKeyword(kwdApexPredator) && csBerserker != None
        _actor.SetCombatStyle(csBerserker)
    EndIf

    Debug.Notification(_actor.GetDisplayName() + " is ENRAGED!")
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; PACK BEHAVIOR
; ════════════════════════════════════════════════════════════════════════════
Function AlertPack(Actor akTarget)
    If akTarget == None
        Return
    EndIf

    Actor[] nearbyActors = MiscUtil.ScanActors(_actor, PackAlertRadius, 15)
    Int i = 0
    Int alerted = 0
    While i < nearbyActors.Length
        Actor packMember = nearbyActors[i]
        If packMember != None && packMember != _actor && !packMember.IsDead()
            If kwdPackBehavior == None || packMember.HasKeyword(kwdPackBehavior)
                If !packMember.IsInCombat()
                    packMember.StartCombat(akTarget)
                    alerted += 1
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile

    If alerted > 0
        Debug.Trace("[AAI-Creature] Pack alerted: " + alerted + " members by " + _actor.GetDisplayName())
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; DEATH
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnDeath(Actor akSender, Actor akKiller)
    ; Death cry — alert remaining pack
    If kwdPackBehavior != None && _actor.HasKeyword(kwdPackBehavior) && akKiller != None
        AlertPack(akKiller as Actor)
    EndIf
    _isEnraged   = False
    _ambushArmed = False
EndEvent

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
