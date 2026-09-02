; ═══════════════════════════════════════════════════════════════════════════
; AdvancedDLCCreatures.psc
; Advanced AI System — DLC Creature Behavior Extensions
;
; Covers all DLC-exclusive creatures not in the base game:
;
; AUTOMATRON:
;   - Eyebot Drones (aerial scouts, signal relay)
;   - Robobrain (psychic prediction, barrel roll charge)
;
; FAR HARBOR:
;   - Fog Crawler (ambush from water, tentacle sweep)
;   - Angler (bioluminescent lure, ambush sit-and-wait)
;   - Hermit Crab (shell phase, exposed berserk)
;   - Gulper (swallow attack, stomach acid)
;   - NovaDoves / FogGulls (ambient birds — flee behavior)
;   - Shipwreck Mirelurks (fog-adapted, reduced sight, enhanced smell)
;   - Trappers (human faction — Far Harbor specific tactics)
;
; NUKA-WORLD:
;   - Gatorclaw (Deathclaw variant — alligator hybrid, swamp ambush)
;   - Pack Mongrel (Nuka-World raider animal — trained attack dogs)
;   - Nukalurk (Nuka-Cola irradiated mirelurk — glowing, extra acid)
;   - Cave Cricket (jumping ambush, silent approach)
;   - Bloodworm (burrowing, paralyze)
;
; Attach to creature alias refs for each DLC creature type.
; Requires: AdvancedAIManager, AdvancedCreatureBehavior
; ═══════════════════════════════════════════════════════════════════════════
Scriptname AdvancedDLCCreatures extends ReferenceAlias

Quest Property AAIQuest Auto

; ── DLC Creature Keywords ─────────────────────────────────────────────────────
; AUTOMATRON
Keyword Property kwdEyebotDrone     Auto
Keyword Property kwdRobobrain       Auto

; FAR HARBOR
Keyword Property kwdFogCrawler      Auto
Keyword Property kwdAngler          Auto
Keyword Property kwdHermitCrab      Auto
Keyword Property kwdGulper          Auto
Keyword Property kwdFogMirelurk     Auto; Fog-adapted Mirelurk variant; Fog-adapted Mirelurk variant; Fog-adapted Mirelurk variant; Fog-adapted Mirelurk variant
Keyword Property kwdTrilobite        Auto; Aquatic Far Harbor creature; Aquatic Far Harbor creature; Aquatic Far Harbor creature; Aquatic Far Harbor creature

; NUKA-WORLD
Keyword Property kwdGatorclaw       Auto; Deathclaw/gator hybrid; Deathclaw/gator hybrid; Deathclaw/gator hybrid; Deathclaw/gator hybrid
Keyword Property kwdNukalurk        Auto; Nuka-Cola Mirelurk; Nuka-Cola Mirelurk; Nuka-Cola Mirelurk; Nuka-Cola Mirelurk
Keyword Property kwdCaveCricket     Auto; Silent jumping ambush; Silent jumping ambush; Silent jumping ambush; Silent jumping ambush
Keyword Property kwdBloodworm       Auto; Burrowing paralyze worm; Burrowing paralyze worm; Burrowing paralyze worm; Burrowing paralyze worm
Keyword Property kwdPackMongrel     Auto; Trained raider dog; Trained raider dog; Trained raider dog; Trained raider dog

; ── Abilities ─────────────────────────────────────────────────────────────────
Spell   Property spFogCrawlerTentacle  Auto; AoE sweep; AoE sweep; AoE sweep; AoE sweep
Spell   Property spAnglerLure          Auto; Lure attraction field; Lure attraction field; Lure attraction field; Lure attraction field
Spell   Property spGulperSwallow       Auto; Swallow effect; Swallow effect; Swallow effect; Swallow effect
Spell   Property spNukalurk            Auto; Nuka-Cola radiation burst; Nuka-Cola radiation burst; Nuka-Cola radiation burst; Nuka-Cola radiation burst
Spell   Property spCaveCricketJump     Auto; Leap attack; Leap attack; Leap attack; Leap attack
Spell   Property spBloodwormParalyze   Auto; Paralytic toxin; Paralytic toxin; Paralytic toxin; Paralytic toxin
Spell   Property spGatorclawTailSweep  Auto; Tail whip knockdown; Tail whip knockdown; Tail whip knockdown; Tail whip knockdown
Spell   Property spRobobrainPsychic    Auto; Prediction field (enemy misses more); Prediction field (enemy misses more); Prediction field (enemy misses more); Prediction field (enemy misses more)
Explosion Property expNukalurk         Auto; Nuka-Cola explosion on death; Nuka-Cola explosion on death; Nuka-Cola explosion on death; Nuka-Cola explosion on death

; ── State ─────────────────────────────────────────────────────────────────────
Actor _actor
bool   _shellPhase; Hermit Crab starts shelled
bool   _lureActive; Angler lure state
bool   _isSwallowing
float  _lastAbilityTime
float  _initMaxHP

; ═══════════════════════════════════════════════════════════════════════════
Event OnAliasInit()
    _actor = GetActorReference() as Actor
    If _actor == None
        Return
    EndIf

    _shellPhase    = True
    _f4aiTickHours = 1.0

    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    If avHP != None
        _initMaxHP = _actor.GetBaseValue(avHP)
    EndIf

    ApplyDLCProfile()

    RegisterForRemoteEvent(_actor, "OnCombatStateChanged")
    RegisterForHitEvent(_actor)
    RegisterForRemoteEvent(_actor, "OnDeath")
    ScheduleTick(0.08)
EndEvent

; ═══════════════════════════════════════════════════════════════════════════
; DLC SPECIES PROFILES
; ═══════════════════════════════════════════════════════════════════════════
Function ApplyDLCProfile()
    ; ── GATORCLAW (Nuka-World) ───────────────────────────────────────────────
    ; Deathclaw crossed with alligator radiation — slow on land, devastating in water
    If kwdGatorclaw != None && _actor.HasKeyword(kwdGatorclaw)
        ; Extra aggression, slightly slower, brutal AoE tail sweep
        ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
        ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
        If avAggr != None
            _actor.SetValue(avAggr, 100.0)
        EndIf
        If avConf != None
            _actor.SetValue(avConf, 100.0)
        EndIf
        Debug.Notification("Gatorclaw detected — tail sweep danger!")

    ; ── CAVE CRICKET (Nuka-World) ────────────────────────────────────────────
    ; Silent jumping ambush predator — player hears nothing until impact
    ElseIf kwdCaveCricket != None && _actor.HasKeyword(kwdCaveCricket)
        ; Start hidden/still; detect via vibration
        _actor.SetRestrained(True); Wait for player to walk past; Wait for player to walk past; Wait for player to walk past; Wait for player to walk past

    ; ── NUKALURK (Nuka-World) ────────────────────────────────────────────────
    ; Nuka-Cola soaked Mirelurk — glowing, radioactive, explosive death
    ElseIf kwdNukalurk != None && _actor.HasKeyword(kwdNukalurk)
        If spNukalurk != None
            spNukalurk.Cast(_actor, _actor); Persistent Nuka radiation aura; Persistent Nuka radiation aura; Persistent Nuka radiation aura; Persistent Nuka radiation aura
        EndIf

    ; ── BLOODWORM (Nuka-World) ───────────────────────────────────────────────
    ; Subterranean — burrows and ambushes from below
    ElseIf kwdBloodworm != None && _actor.HasKeyword(kwdBloodworm)
        _actor.SetRestrained(True); Burrowed — wait for player above; Burrowed — wait for player above; Burrowed — wait for player above; Burrowed — wait for player above

    ; ── FOG CRAWLER (Far Harbor) ─────────────────────────────────────────────
    ; Large crustacean ambush predator — uses fog as cover
    ElseIf kwdFogCrawler != None && _actor.HasKeyword(kwdFogCrawler)
        ActorValue avConf = Game.GetFormFromFile(0x000002E8, "Fallout4.esm") as ActorValue
        If avConf != None
            _actor.SetValue(avConf, 85.0)

    ; ── ANGLER (Far Harbor) ──────────────────────────────────────────────────
    ; Sit-and-wait predator — bioluminescent lure attracts prey
        EndIf
    ElseIf kwdAngler != None && _actor.HasKeyword(kwdAngler)
        _lureActive = True
        _actor.SetRestrained(True); Completely still until prey close enough; Completely still until prey close enough; Completely still until prey close enough; Completely still until prey close enough
        If spAnglerLure != None
            spAnglerLure.Cast(_actor, _actor); Activate lure aura; Activate lure aura; Activate lure aura; Activate lure aura
        EndIf
        Debug.Notification("Warning: Something is glowing in the distance...")

    ; ── HERMIT CRAB (Far Harbor) ─────────────────────────────────────────────
    ; Massive crustacean using a building as a shell — nearly invulnerable frontal
    ElseIf kwdHermitCrab != None && _actor.HasKeyword(kwdHermitCrab)
        _shellPhase = True; Shell up at start; Shell up at start; Shell up at start; Shell up at start
        Debug.Notification("Is that... a building moving?!")

    ; ── GULPER (Far Harbor) ──────────────────────────────────────────────────
    ; Amphibious predator — attempts to swallow player/NPCs whole
    ElseIf kwdGulper != None && _actor.HasKeyword(kwdGulper)
        ActorValue avAggr = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
        If avAggr != None
            _actor.SetValue(avAggr, 85.0)

    ; ── ROBOBRAIN (Automatron) ───────────────────────────────────────────────
    ; Human brain in a robot — predicts player movement, flanks intelligently
        EndIf
    ElseIf kwdRobobrain != None && _actor.HasKeyword(kwdRobobrain)
        If spRobobrainPsychic != None
            spRobobrainPsychic.Cast(_actor, _actor); Prediction field; Prediction field; Prediction field; Prediction field
        EndIf
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
Function DoGameTimeTick()
    If _actor == None || _actor.IsDead()
        Return
    EndIf

    ; Cave Cricket — release from burrow when player walks overhead
    If kwdCaveCricket != None && _actor.HasKeyword(kwdCaveCricket)
        Actor player = Game.GetPlayer()
        Float dist = _actor.GetDistance(player)
        If dist < 400.0 && !_actor.IsInCombat()
            ; Player is directly above/near — LEAP
            _actor.SetRestrained(False)
            _actor.StartCombat(player)
            If spCaveCricketJump != None
                spCaveCricketJump.Cast(_actor, player)
            EndIf
            Debug.Notification("CAVE CRICKET — ambush from below!")
        EndIf

    ; Bloodworm — rise from ground when player close
    ElseIf kwdBloodworm != None && _actor.HasKeyword(kwdBloodworm)
        Actor player = Game.GetPlayer()
        Float dist = _actor.GetDistance(player)
        If dist < 300.0 && !_actor.IsInCombat()
            _actor.SetRestrained(False)
            _actor.StartCombat(player)
            Debug.Notification("The ground erupts — Bloodworms!")
        EndIf
    EndIf

    ScheduleTick(0.08)
EndFunction
; ═══════════════════════════════════════════════════════════════════════════
Event Actor.OnCombatStateChanged(Actor akSender, Actor akTarget, Int aeCombatState)
    If aeCombatState == 1
        HandleDLCCombatEntry()
    ElseIf aeCombatState == 0
        HandleDLCCombatEnd()
    EndIf
EndEvent

Function HandleDLCCombatEntry()
    ; Angler drops lure, becomes aggressive
    If kwdAngler != None && _actor.HasKeyword(kwdAngler)
        _lureActive = False
        _actor.SetRestrained(False)
        Debug.Notification("The Angler drops its lure — it's attacking!")

    ; Hermit Crab: stay shelled briefly, then smash
    ElseIf kwdHermitCrab != None && _actor.HasKeyword(kwdHermitCrab)
        Debug.Notification("The Hermit Crab retreats into its shell — its SHELL IS A BUILDING!")
        Utility.Wait(2.0)
        _shellPhase = False
        Debug.Notification("The Hermit Crab emerges — MOVE!")

    ; Fog Crawler: tentacle sweep on entry
    ElseIf kwdFogCrawler != None && _actor.HasKeyword(kwdFogCrawler)
        If spFogCrawlerTentacle != None
            spFogCrawlerTentacle.Cast(_actor, Game.GetPlayer())
        EndIf

    ; Gatorclaw: tail sweep warning
    ElseIf kwdGatorclaw != None && _actor.HasKeyword(kwdGatorclaw)
        Debug.Notification("GATORCLAW — watch the tail sweep!")
    EndIf
EndFunction

Function HandleDLCCombatEnd()
    ; Angler: re-arm lure after combat
    If kwdAngler != None && _actor.HasKeyword(kwdAngler)
        _lureActive = True
        If spAnglerLure != None
            spAnglerLure.Cast(_actor, _actor)
        EndIf
        _actor.SetRestrained(True)
    EndIf
EndFunction

; ═══════════════════════════════════════════════════════════════════════════
Event OnHit(ObjectReference akTarget, ObjectReference akAggressor, Form akSource, Projectile akProjectile, Bool abPowerAttack, Bool abSneakAttack, Bool abBashAttack, Bool abHitBlocked, String apMaterial)
    RegisterForHitEvent(_actor); hit events are single-shot in FO4 — re-arm immediately
    ActorValue avHP = Game.GetFormFromFile(0x00000015, "Fallout4.esm") as ActorValue
    Float maxHP = _initMaxHP
    Float curHP
    If (avHP != None)
        curHP = _actor.GetValue(avHP)
    Else
        curHP = maxHP
    EndIf
    Float hpPct
    If (maxHP > 0)
        hpPct = (curHP / maxHP)
    Else
        hpPct = 1.0
    EndIf

    ; Hermit Crab shell break
    If kwdHermitCrab != None && _actor.HasKeyword(kwdHermitCrab)
        If _shellPhase && hpPct <= 0.5
            _shellPhase = False
            ; Boost speed and aggression — exposed!
            ActorValue avAggr  = Game.GetFormFromFile(0x000002E7, "Fallout4.esm") as ActorValue
            ActorValue avSpeed = Game.GetFormFromFile(0x00000036, "Fallout4.esm") as ActorValue
            If avAggr  != None
                _actor.SetValue(avAggr,  100.0)
            EndIf
            If avSpeed != None
                _actor.SetValue(avSpeed, _actor.GetBaseValue(avSpeed) * 1.4)
            EndIf
            Debug.Notification("HERMIT CRAB SHELL BROKEN — it's EXPOSED and ENRAGED!")
        EndIf

    ; Gulper: attempt swallow when player is close
    ElseIf kwdGulper != None && _actor.HasKeyword(kwdGulper)
        Actor aggressor = akAggressor as Actor
        If aggressor != None && !_isSwallowing && spGulperSwallow != None
            Float dist = _actor.GetDistance(aggressor)
            If dist < 180.0 && Utility.RandomInt(1, 100) <= 30
                _isSwallowing = True
                spGulperSwallow.Cast(_actor, aggressor)
                Debug.Notification("The Gulper tries to SWALLOW you whole!")
                Utility.Wait(3.0)
                _isSwallowing = False
            EndIf
        EndIf

    ; Nukalurk: spray on hit
    ElseIf kwdNukalurk != None && _actor.HasKeyword(kwdNukalurk)
        Actor aggressor = akAggressor as Actor
        If aggressor != None && spNukalurk != None
            Float now = Utility.GetCurrentRealTime()
            If (now - _lastAbilityTime) > 8.0
                _lastAbilityTime = now
                spNukalurk.Cast(_actor, aggressor)
            EndIf
        EndIf

    ; Gatorclaw: tail sweep on hit (AoE knockdown)
    ElseIf kwdGatorclaw != None && _actor.HasKeyword(kwdGatorclaw)
        If spGatorclawTailSweep != None
            Float now = Utility.GetCurrentRealTime()
            If (now - _lastAbilityTime) > 10.0
                _lastAbilityTime = now
                spGatorclawTailSweep.Cast(_actor, Game.GetPlayer())
            EndIf
        EndIf

    ; Bloodworm: paralyze on hit
    ElseIf kwdBloodworm != None && _actor.HasKeyword(kwdBloodworm)
        Actor aggressor = akAggressor as Actor
        If aggressor != None && spBloodwormParalyze != None
            Float now = Utility.GetCurrentRealTime()
            If (now - _lastAbilityTime) > 15.0
                _lastAbilityTime = now
                spBloodwormParalyze.Cast(_actor, aggressor)
                Debug.Notification("Bloodworm venom — PARALYZED!")
            EndIf
        EndIf
    EndIf
EndEvent

; ═══════════════════════════════════════════════════════════════════════════
Event Actor.OnDeath(Actor akSender, Actor akKiller)
    ; Nukalurk explosion on death
    If kwdNukalurk != None && _actor.HasKeyword(kwdNukalurk) && expNukalurk != None
        _actor.PlaceAtMe(expNukalurk)
        Debug.Notification("NUKALURK — NUKA-COLA EXPLOSION!")
    EndIf

    ; Gatorclaw death roar
    If kwdGatorclaw != None && _actor.HasKeyword(kwdGatorclaw)
        Debug.Notification("The Gatorclaw falls silent.")
    EndIf

    ; Log DLC creature death for bridge
    String species = GetDLCSpeciesName()
    Debug.Trace("[AAI] CREATURE_DEATH|species=" + species + "|location=" + _actor.GetCurrentLocation().GetName() + "|game_time=" + Utility.GetCurrentGameTime())
EndEvent

String Function GetDLCSpeciesName()
    If kwdGatorclaw   != None && _actor.HasKeyword(kwdGatorclaw)
        Return "Gatorclaw"
    ElseIf kwdNukalurk    != None && _actor.HasKeyword(kwdNukalurk)
        Return "Nukalurk"
    ElseIf kwdCaveCricket != None && _actor.HasKeyword(kwdCaveCricket)
        Return "CaveCricket"
    ElseIf kwdBloodworm   != None && _actor.HasKeyword(kwdBloodworm)
        Return "Bloodworm"
    ElseIf kwdFogCrawler  != None && _actor.HasKeyword(kwdFogCrawler)
        Return "FogCrawler"
    ElseIf kwdAngler      != None && _actor.HasKeyword(kwdAngler)
        Return "Angler"
    ElseIf kwdHermitCrab  != None && _actor.HasKeyword(kwdHermitCrab)
        Return "HermitCrab"
    ElseIf kwdGulper      != None && _actor.HasKeyword(kwdGulper)
        Return "Gulper"
    ElseIf kwdRobobrain   != None && _actor.HasKeyword(kwdRobobrain)
        Return "Robobrain"
    ElseIf kwdEyebotDrone != None && _actor.HasKeyword(kwdEyebotDrone)
        Return "EyebotDrone"
    EndIf
    Return "DLCCreature"
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
