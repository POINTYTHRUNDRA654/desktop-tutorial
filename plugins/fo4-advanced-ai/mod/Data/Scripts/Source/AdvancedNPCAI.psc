; ═══════════════════════════════════════════════════════════════════════════
; AdvancedNPCAI.psc
; Advanced AI System — Humanoid NPC Behavior (Raiders, Settlers, BoS, etc.)
; Also handles Super Mutants and Synths
; Attach to ActorAlias or NPC ObjectReference
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AdvancedNPCAI extends ReferenceAlias

; ── Properties ───────────────────────────────────────────────────────────────
Quest       Property AAIQuest           Auto
Keyword     Property kwdSquadLeader     Auto; AAI_SquadLeader; AAI_SquadLeader; AAI_SquadLeader; AAI_SquadLeader
Keyword     Property kwdCoverUser       Auto; AAI_UsesCover; AAI_UsesCover; AAI_UsesCover; AAI_UsesCover
Keyword     Property kwdFlanker         Auto; AAI_Flanker; AAI_Flanker; AAI_Flanker; AAI_Flanker
Keyword     Property kwdMedic           Auto; AAI_Medic (heals nearby allies); AAI_Medic (heals nearby allies); AAI_Medic (heals nearby allies); AAI_Medic (heals nearby allies)
CombatStyle Property csTactical         Auto; AAI_TacticalCombatStyle; AAI_TacticalCombatStyle; AAI_TacticalCombatStyle; AAI_TacticalCombatStyle
CombatStyle Property csAggressive       Auto; AAI_AggressiveCombatStyle; AAI_AggressiveCombatStyle; AAI_AggressiveCombatStyle; AAI_AggressiveCombatStyle
Spell       Property spHealAlly         Auto; Healing spell for Medic NPCs; Healing spell for Medic NPCs; Healing spell for Medic NPCs; Healing spell for Medic NPCs

; ── Squad Properties ──────────────────────────────────────────────────────────
float Property SquadAlertRadius    = 2000.0 Auto
float Property MoraleBreakHP       = 0.20   Auto; Flee at this HP fraction; Flee at this HP fraction; Flee at this HP fraction; Flee at this HP fraction
bool  Property CanSurrender        = False  Auto; Future: surrender system; Future: surrender system; Future: surrender system; Future: surrender system

; ── Drug / Stim use ───────────────────────────────────────────────────────────
bool  Property UsesCombatDrugs     = False  Auto; Raiders can pop Psycho; Raiders can pop Psycho; Raiders can pop Psycho; Raiders can pop Psycho
MiscObject Property itemPsycho     Auto
MiscObject Property itemMedX       Auto
MiscObject Property itemJet        Auto

; ── Fire discipline ───────────────────────────────────────────────────────────
; Rotates which squad members are actively engaging so the whole squad doesn't
; dump mags simultaneously — conserves ammo and doesn't reveal full squad size
; on first contact. Approximated via the Aggression AV (Unaggressive members
; still track the target, take cover, and react to being hit via the vanilla
; combat AI — they just don't press the attack) since Papyrus has no per-shot
; control over burst timing; real rate-of-fire tuning lives in CombatStyle
; records in the CK. All squad members compute their rotation slot from the
; shared game clock, so no leader coordination is needed.
bool  Property UsesFireDiscipline   = False  Auto; Gunners rotate who's actively firing; Gunners rotate who's actively firing; Gunners rotate who's actively firing; Gunners rotate who's actively firing
Int   Property FireDisciplineGroups = 3      Auto; rotating "who's shooting right now" groups
Float Property FireWindowSeconds    = 4.0    Auto; seconds each group holds the floor
Float Property FireCheckInterval    = 1.0    Auto; how often to re-check whose turn it is

; ── Urgent aid ────────────────────────────────────────────────────────────────
; Regular (non-Essential) actors just die at 0 HP — Fallout 4 has no
; downed-but-alive state to "revive" rank-and-file Gunners into. This
; approximates "immediate medical attention" as preventative: the moment a
; squad member drops below CriticalHealthThreshold, they immediately call the
; nearest medic-tagged ally to heal them — not the medic's own ~30s ambient
; sweep below, which could arrive too late.
Float Property CriticalHealthThreshold = 0.3    Auto
Float Property MedicCallRadius         = 1200.0 Auto

; ── State ─────────────────────────────────────────────────────────────────────
bool  _moraleBroken
bool  _tacticsApplied
bool  _calledForMedic
Actor _actor
float _lastMedicCheck
Int   _fireGen; incremented each combat start to kill stale fire-discipline loops

; ════════════════════════════════════════════════════════════════════════════
Event OnAliasInit()
    _actor = GetActorReference() as Actor
    If _actor == None
        Return
    EndIf

    ; Apply combat style override
    If kwdFlanker != None && _actor.HasKeyword(kwdFlanker) && csTactical != None
        _actor.SetCombatStyle(csTactical)
    ElseIf csAggressive != None
        _actor.SetCombatStyle(csAggressive)
    EndIf

    RegisterForRemoteEvent(_actor, "OnCombatStateChanged")
    RegisterForHitEvent(_actor)
    RegisterForRemoteEvent(_actor, "OnDeath")
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; COMBAT
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnCombatStateChanged(Actor akSender, Actor akTarget, Int aeCombatState)
    If aeCombatState == 1; Entering combat; Entering combat; Entering combat; Entering combat
        _moraleBroken   = False
        _tacticsApplied = False
        _calledForMedic = False
        OnCombatStart(akSender.GetCombatTarget() as Actor)
    ElseIf aeCombatState == 0
        OnCombatEnd()
    EndIf
EndEvent

Function OnCombatStart(Actor akTarget)
    ; Squad leader calls backup
    If kwdSquadLeader != None && _actor.HasKeyword(kwdSquadLeader)
        AlertSquad(akTarget)
    EndIf

    ; Drug usage (Raiders with Psycho etc.)
    If UsesCombatDrugs
        ConsiderDrugs()
    EndIf

    If UsesFireDiscipline
        _fireGen += 1
        ApplyFireDiscipline(_fireGen); runs (and Utility.Waits) for the rest of this combat, same pattern as the monitor loops elsewhere in this codebase
    EndIf

    _actor.EvaluatePackage()
    Debug.Trace("[AAI-NPC] Combat started: " + _actor.GetDisplayName())
EndFunction

Function OnCombatEnd()
    _moraleBroken   = False
    _tacticsApplied = False
    _calledForMedic = False
    _fireGen += 1; signal any running fire-discipline loop to stop and restore normal aggression
    Debug.Trace("[AAI-NPC] Combat ended: " + _actor.GetDisplayName())
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; FIRE DISCIPLINE
; ════════════════════════════════════════════════════════════════════════════
Function ApplyFireDiscipline(Int myGen)
    ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
    If avAggr == None
        Return
    EndIf

    ; FormID as Int can be negative (top bit set for high load-order indices) —
    ; normalize manually since Math.Abs is float-only in Papyrus.
    Int mySlot = _actor.GetFormID() % FireDisciplineGroups
    If mySlot < 0
        mySlot += FireDisciplineGroups
    EndIf
    Float baseline = _actor.GetValue(avAggr)

    While myGen == _fireGen && _actor.IsInCombat()
        Int currentWindow = (Utility.GetCurrentGameTime() * 86400.0 / FireWindowSeconds) as Int % FireDisciplineGroups
        If mySlot == currentWindow
            _actor.SetValue(avAggr, baseline)
        Else
            _actor.SetValue(avAggr, 0.0); Unaggressive while holding — still tracks the target, takes cover, and fights back if directly threatened; just doesn't press the attack
        EndIf
        Utility.Wait(FireCheckInterval)
        If myGen != _fireGen
            Return
        EndIf
    EndWhile

    _actor.SetValue(avAggr, baseline)
EndFunction

Event OnHit(ObjectReference akTarget, ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked, String apMaterial)
    RegisterForHitEvent(_actor); hit events are single-shot in FO4 — re-arm immediately
    ; Morale check
    If !_moraleBroken
        CheckMorale()
    EndIf

    ; Urgent aid — the moment THIS actor drops below critical HP, not the
    ; medic's own throttled ambient sweep below, so help is called before
    ; they're at risk of dying outright.
    If !_calledForMedic
        CheckCriticalHealth()
    EndIf

    ; Medic: check if allies need healing
    If kwdMedic != None && _actor.HasKeyword(kwdMedic) && spHealAlly != None
        Float gameTime = Utility.GetCurrentGameTime()
        If gameTime - _lastMedicCheck > 0.02; ~30 seconds game time; ~30 seconds game time; ~30 seconds game time; ~30 seconds game time
            _lastMedicCheck = gameTime
            HealNearbyAllies()
        EndIf
    EndIf
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; SQUAD TACTICS
; ════════════════════════════════════════════════════════════════════════════
Function AlertSquad(Actor akTarget)
    If akTarget == None
        Return
    EndIf

    Actor[] squad = MiscUtil.ScanActors(_actor, SquadAlertRadius, 10)
    Int i = 0
    While i < squad.Length
        Actor member = squad[i]
        If member != None && member != _actor && !member.IsDead()
            ; Only alert allied/friendly actors (FO4 has no GetFactions — use faction reaction)
            Int reaction = member.GetFactionReaction(_actor)
            If reaction == 2 || reaction == 3; 2 = Ally, 3 = Friend
                If !member.IsInCombat()
                    member.StartCombat(akTarget)
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; MORALE SYSTEM
; ════════════════════════════════════════════════════════════════════════════
Function CheckMorale()
    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    If avHP == None
        Return
    EndIf
    Float maxHP = _actor.GetBaseValue(avHP)
    Float curHP = _actor.GetValue(avHP)
    If maxHP <= 0
        Return
    EndIf

    Float hpFraction = curHP / maxHP
    If hpFraction <= MoraleBreakHP && !CanSurrender
        _moraleBroken = True
        ; Boost flee chance by temporarily lowering confidence
        ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
        If avConf != None
            _actor.SetValue(avConf, 0.0)
        EndIf
        _actor.EvaluatePackage()
        Debug.Trace("[AAI-NPC] Morale broken: " + _actor.GetDisplayName() + " fleeing")
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; MEDIC BEHAVIOR
; ════════════════════════════════════════════════════════════════════════════
Function HealNearbyAllies()
    Actor[] nearby = MiscUtil.ScanActors(_actor, 800.0, 5)
    Int i = 0
    While i < nearby.Length
        Actor ally = nearby[i]
        If ally != None && ally != _actor && !ally.IsDead()
            ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
            If avHP != None
                Float maxHP = ally.GetBaseValue(avHP)
                Float curHP = ally.GetValue(avHP)
                If curHP / maxHP < 0.5 && spHealAlly != None
                    spHealAlly.Cast(_actor, ally)
                    Debug.Trace("[AAI-NPC] Medic healed: " + ally.GetDisplayName())
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; URGENT AID
; ════════════════════════════════════════════════════════════════════════════
Function CheckCriticalHealth()
    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    If avHP == None
        Return
    EndIf
    Float maxHP = _actor.GetBaseValue(avHP)
    If maxHP <= 0.0
        Return
    EndIf
    Float hpFraction = _actor.GetValue(avHP) / maxHP
    If hpFraction > CriticalHealthThreshold
        Return
    EndIf

    _calledForMedic = True; at most one call per combat — avoids spamming the cast every subsequent hit while still below threshold
    If spHealAlly == None
        Return
    EndIf

    Actor medic = FindNearestMedic()
    If medic == None
        Return
    EndIf

    ; spHealAlly must be filled in on every squad member's alias, not just the
    ; medic's — it's the wounded actor's own script that triggers the cast
    ; here, with the medic passed in only as the spell's source actor.
    spHealAlly.Cast(medic, _actor)
    medic.EvaluatePackage()
    Debug.Trace("[AAI-NPC] " + _actor.GetDisplayName() + " called for a medic — " + medic.GetDisplayName() + " responding")
EndFunction

Actor Function FindNearestMedic()
    If kwdMedic == None
        Return None
    EndIf
    Actor[] nearby = MiscUtil.ScanActors(_actor, MedicCallRadius, 8)
    Actor best = None
    Float bestDist = 999999.0
    Int i = 0
    While i < nearby.Length
        Actor candidate = nearby[i]
        If candidate != None && candidate != _actor && !candidate.IsDead() && candidate.HasKeyword(kwdMedic)
            Float d = _actor.GetDistance(candidate)
            If d < bestDist
                bestDist = d
                best = candidate
            EndIf
        EndIf
        i += 1
    EndWhile
    Return best
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; DRUG USAGE (Raiders / Gunners)
; ════════════════════════════════════════════════════════════════════════════
Function ConsiderDrugs()
    ; Randomly use a combat stim at the start of combat
    Int roll = Utility.RandomInt(1, 100)
    If roll <= 30 && itemPsycho != None
        If _actor.GetItemCount(itemPsycho) > 0
            _actor.EquipItem(itemPsycho as Form, false, true)
            Debug.Trace("[AAI-NPC] " + _actor.GetDisplayName() + " used Psycho")
        EndIf
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnDeath(Actor akSender, Actor akKiller)
    ; Trigger squad death response
    If kwdSquadLeader != None && _actor.HasKeyword(kwdSquadLeader) && akKiller != None
        ; Leader died — demoralize squad
        Actor[] squad = MiscUtil.ScanActors(_actor, SquadAlertRadius, 8)
        Int i = 0
        While i < squad.Length
            Actor member = squad[i]
            If member != None && !member.IsDead() && member.IsInCombat()
                ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
                If avConf != None
                    Float curConf = member.GetValue(avConf)
                    member.SetValue(avConf, Math.Max(curConf - 30.0, 0.0))
                EndIf
                member.EvaluatePackage()
            EndIf
            i += 1
        EndWhile
        Debug.Trace("[AAI-NPC] Squad leader died — squad demoralized")
    EndIf
EndEvent
