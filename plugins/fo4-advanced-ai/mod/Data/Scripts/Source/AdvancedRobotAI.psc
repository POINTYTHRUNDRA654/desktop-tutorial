; ═══════════════════════════════════════════════════════════════════════════
; AdvancedRobotAI.psc
; Advanced AI System — Robot & Synth Behavior Enhancement
; Handles: Assaultrons, Protectrons, Sentry Bots, Eyebots, Gen1/2 Synths
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AdvancedRobotAI extends ReferenceAlias

Quest Property AAIQuest Auto

; ── Robot-Specific Properties ─────────────────────────────────────────────
Keyword  Property kwdAssaultron   Auto
Keyword  Property kwdSentryBot    Auto
Keyword  Property kwdProtectron   Auto
Keyword  Property kwdEyebot       Auto
Keyword  Property kwdSynthGen1    Auto
Keyword  Property kwdSynthGen2    Auto
Keyword  Property kwdSynthCourser Auto

; Abilities
Spell    Property spLaserCharge     Auto; Assaultron head laser; Assaultron head laser; Assaultron head laser; Assaultron head laser
Spell    Property spEMPBlast        Auto; EMP burst (Protectron); EMP burst (Protectron); EMP burst (Protectron); EMP burst (Protectron)
Spell    Property spRocketBarrage   Auto; Sentry Bot missiles; Sentry Bot missiles; Sentry Bot missiles; Sentry Bot missiles
Explosion Property expSelfDestruct  Auto; Self-destruct explosion; Self-destruct explosion; Self-destruct explosion; Self-destruct explosion

CombatStyle Property csRobotPrecision  Auto
CombatStyle Property csCourserTactics  Auto

; ── Self-Repair ───────────────────────────────────────────────────────────
bool  Property CanSelfRepair      = True  Auto
float Property SelfRepairAmount   = 25.0  Auto; HP restored per repair trigger; HP restored per repair trigger; HP restored per repair trigger; HP restored per repair trigger
float Property SelfRepairCooldown = 30.0  Auto; Real seconds between repairs; Real seconds between repairs; Real seconds between repairs; Real seconds between repairs
float Property SelfRepairThreshold = 0.40 Auto; Trigger at 40% HP; Trigger at 40% HP; Trigger at 40% HP; Trigger at 40% HP

; ── Targeting ─────────────────────────────────────────────────────────────
bool  Property PrioritizeArmor    = False Auto; Aim for armor pieces; Aim for armor pieces; Aim for armor pieces; Aim for armor pieces
bool  Property PrioritizeStealth  = False Auto; Hunt stealthed targets; Hunt stealthed targets; Hunt stealthed targets; Hunt stealthed targets

; ── State ─────────────────────────────────────────────────────────────────
bool  _repairOnCooldown
bool  _laserCharging
float _lastRepairTime
Actor _actor

; ════════════════════════════════════════════════════════════════════════════
Event OnAliasInit()
    _actor = GetActorReference() as Actor
    If _actor == None
        Return
    EndIf

    ; Robots never flee — max confidence
    ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
    If avConf != None
        _actor.SetValue(avConf, 100.0)
    EndIf

    ; Apply robot-specific combat style
    If kwdSynthCourser != None && _actor.HasKeyword(kwdSynthCourser) && csCourserTactics != None
        _actor.SetCombatStyle(csCourserTactics)
    ElseIf csRobotPrecision != None
        _actor.SetCombatStyle(csRobotPrecision)
    EndIf

    _f4aiTickHours = 1.0

    RegisterForRemoteEvent(_actor, "OnCombatStateChanged")
    RegisterForHitEvent(_actor)
    RegisterForRemoteEvent(_actor, "OnDeath")
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; COMBAT
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnCombatStateChanged(Actor akSender, Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
        ActivateRobotProtocols()
    EndIf
EndEvent

Function ActivateRobotProtocols()
    ; Assaultron: begin laser charge cycle
    If kwdAssaultron != None && _actor.HasKeyword(kwdAssaultron)
        _laserCharging = True
        ScheduleTick(0.01); ~15s game time; ~15s game time; ~15s game time; ~15s game time
    EndIf

    ; Eyebot: activate alarm — call nearby hostiles
    If kwdEyebot != None && _actor.HasKeyword(kwdEyebot)
        AlertNearbyRobots()
    EndIf

    ; Courser: teleport to optimal position
    If kwdSynthCourser != None && _actor.HasKeyword(kwdSynthCourser)
        ScheduleTick(0.03); Teleport reposition; Teleport reposition; Teleport reposition; Teleport reposition
    EndIf

    _actor.EvaluatePackage()
EndFunction

Function DoGameTimeTick()
    If _actor == None || _actor.IsDead()
        Return
    EndIf

    ; Assaultron laser charge
    If _laserCharging && spLaserCharge != None && _actor.IsInCombat()
        Actor target = _actor.GetCombatTarget() as Actor
        If target != None
            spLaserCharge.Cast(_actor, target)
            Debug.Trace("[AAI-Robot] Assaultron laser fired: " + _actor.GetDisplayName())
        EndIf
        ScheduleTick(0.05); Fire again after cooldown; Fire again after cooldown; Fire again after cooldown; Fire again after cooldown
    EndIf

    ; Courser reposition (teleport-like movement)
    If kwdSynthCourser != None && _actor.HasKeyword(kwdSynthCourser) && _actor.IsInCombat()
        Actor target = _actor.GetCombatTarget() as Actor
        If target != None
            ; Move to a position flanking the target
            _actor.EvaluatePackage()
        EndIf
        ScheduleTick(0.08)
    EndIf
EndFunction
Event OnHit(ObjectReference akTarget, ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked, String apMaterial)
    RegisterForHitEvent(_actor); hit events are single-shot in FO4 — re-arm immediately
    ; Self-repair check
    If CanSelfRepair && !_repairOnCooldown
        CheckSelfRepair()
    EndIf

    ; Sentry Bot: if critically hit, activate missile barrage
    If kwdSentryBot != None && _actor.HasKeyword(kwdSentryBot) && spRocketBarrage != None
        Actor aggressor = akAggressor as Actor
        If aggressor != None
            spRocketBarrage.Cast(_actor, aggressor)
        EndIf
    EndIf
EndEvent

; ════════════════════════════════════════════════════════════════════════════
; SELF-REPAIR
; ════════════════════════════════════════════════════════════════════════════
Function CheckSelfRepair()
    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    If avHP == None
        Return
    EndIf
    Float maxHP = _actor.GetBaseValue(avHP)
    Float curHP = _actor.GetValue(avHP)
    If maxHP <= 0
        Return
    EndIf

    If (curHP / maxHP) <= SelfRepairThreshold && !_repairOnCooldown
        _actor.RestoreValue(avHP, SelfRepairAmount)
        _repairOnCooldown = True
        StartTimer(SelfRepairCooldown, 99)
        Debug.Trace("[AAI-Robot] Self-repaired: " + _actor.GetDisplayName() + " +" + SelfRepairAmount + "HP")
    EndIf
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; EYEBOT ALARM — Alert nearby robots
; ════════════════════════════════════════════════════════════════════════════
Function AlertNearbyRobots()
    Actor player = Game.GetPlayer()
    Actor[] nearby = MiscUtil.ScanActors(_actor, 3000.0, 10)
    Int i = 0
    While i < nearby.Length
        Actor bot = nearby[i]
        If bot != None && bot != _actor && !bot.IsDead()
            If (kwdAssaultron != None && bot.HasKeyword(kwdAssaultron)) || (kwdSentryBot  != None && bot.HasKeyword(kwdSentryBot))  || (kwdSynthGen2  != None && bot.HasKeyword(kwdSynthGen2))
                If !bot.IsInCombat()
                    bot.StartCombat(player)
                EndIf
            EndIf
        EndIf
        i += 1
    EndWhile
    Debug.Trace("[AAI-Robot] Eyebot alarm triggered nearby robots")
EndFunction

; ════════════════════════════════════════════════════════════════════════════
; DEATH — Self-Destruct
; ════════════════════════════════════════════════════════════════════════════
Event Actor.OnDeath(Actor akSender, Actor akKiller)
    _laserCharging = False

    ; Sentry Bot: explode on death
    If kwdSentryBot != None && _actor.HasKeyword(kwdSentryBot) && expSelfDestruct != None
        _actor.PlaceAtMe(expSelfDestruct)
        Debug.Notification("SENTRY BOT SELF-DESTRUCT!")
    EndIf

EndEvent

; ═══ F4AI FO4 compat ═══════════════════════════════════════════════════════
; FO4 has no RegisterForUpdateGameTime — game-time ticks run on StartTimerGameTime.
Float _f4aiTickHours

Function ScheduleTick(Float afHours)
    _f4aiTickHours = afHours
    StartTimerGameTime(afHours, 900)
EndFunction

Event OnTimer(Int aiTimerID)
    If aiTimerID == 99
        _repairOnCooldown = False
    EndIf
EndEvent

Event OnTimerGameTime(Int aiTimerID)
    If aiTimerID == 900
        StartTimerGameTime(_f4aiTickHours, 900)
        DoGameTimeTick()
    EndIf
EndEvent
